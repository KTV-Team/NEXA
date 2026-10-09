import { HttpException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { QueryRunner } from 'typeorm';
import { RecipientPolicyService } from './recipient-policy.service';

export interface PersistDeliveryPayload {
  occurrenceId: string;
  notificationId: string;
  senderId: string;
  recipientId: string;
  title: string;
  body: string;
}

function deliveryError(status: number, code: string, message: string): HttpException {
  return new HttpException({ code, message }, status);
}

async function lockActiveUsers(queryRunner: QueryRunner, userIds: string[]): Promise<boolean> {
  const ids = [...new Set(userIds)].sort();
  const rows = await queryRunner.query(
    'SELECT id FROM users WHERE id=ANY($1::uuid[]) AND deleted_at IS NULL ORDER BY id FOR UPDATE',
    [ids],
  );
  return rows.length === ids.length;
}

@Injectable()
export class NotificationDeliveryService {
  constructor(
    private readonly db: DataSource,
    private readonly recipientPolicy: RecipientPolicyService,
  ) {}

  async persistDelivery(payload: PersistDeliveryPayload): Promise<{ itemId: string }> {
    const queryRunner = this.db.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();
      const [candidate] = await queryRunner.query(
        `SELECT n.sender_id,n.recipient_id,o.payload_title,o.payload_body
         FROM notification_occurrences o
         JOIN personal_notifications n ON n.id=o.notification_id
         WHERE o.id=$1 AND n.id=$2`,
        [payload.occurrenceId, payload.notificationId],
      );
      if (!candidate) throw deliveryError(404, 'DELIVERY_NOT_FOUND', 'Delivery was not found.');

      const matches =
        candidate.sender_id === payload.senderId &&
        candidate.recipient_id === payload.recipientId &&
        candidate.payload_title === payload.title &&
        candidate.payload_body === payload.body;
      if (!matches)
        throw deliveryError(409, 'DELIVERY_PAYLOAD_MISMATCH', 'Delivery payload does not match its saved occurrence.');

      const activeUsers = await lockActiveUsers(queryRunner, [candidate.sender_id, candidate.recipient_id]);
      const [existing] = await queryRunner.query(
        `SELECT id,title,body,sender_id,recipient_id FROM inbox_items WHERE occurrence_id=$1`,
        [payload.occurrenceId],
      );
      if (existing) {
        const existingMatches =
          existing.title === payload.title &&
          existing.body === payload.body &&
          existing.sender_id === payload.senderId &&
          existing.recipient_id === payload.recipientId;
        if (!existingMatches)
          throw deliveryError(409, 'DELIVERY_PAYLOAD_MISMATCH', 'Saved inbox item does not match its occurrence.');
        await queryRunner.commitTransaction();
        return { itemId: existing.id };
      }

      if (!activeUsers)
        throw deliveryError(403, 'RECIPIENT_NOT_ALLOWED', 'A notification participant is no longer active.');

      const [notification] = await queryRunner.query(
        `SELECT n.status,o.status AS occurrence_status
         FROM personal_notifications n
         JOIN notification_occurrences o ON o.notification_id=n.id
         WHERE n.id=$1 AND o.id=$2
         FOR UPDATE OF n,o`,
        [payload.notificationId, payload.occurrenceId],
      );
      if (
        !notification ||
        !['QUEUED', 'SCHEDULED', 'ACTIVE'].includes(notification.status) ||
        !['pending', 'processing'].includes(notification.occurrence_status)
      ) {
        throw deliveryError(409, 'DELIVERY_STATE_CONFLICT', 'Delivery is no longer pending.');
      }

      if (!(await this.recipientPolicy.isEligible(queryRunner, payload.senderId, payload.recipientId)))
        throw deliveryError(403, 'RECIPIENT_NOT_ALLOWED', 'Recipient is no longer eligible.');

      const [sender] = await queryRunner.query(
        'SELECT name,avatar_url FROM users WHERE id=$1 AND deleted_at IS NULL',
        [payload.senderId],
      );
      if (!sender) throw deliveryError(403, 'RECIPIENT_NOT_ALLOWED', 'Sender is no longer active.');

      const [item] = await queryRunner.query(
        `INSERT INTO inbox_items(occurrence_id,recipient_id,sender_id,sender_name,sender_avatar_url,title,body)
         VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (occurrence_id,recipient_id) DO NOTHING RETURNING id`,
        [payload.occurrenceId, payload.recipientId, payload.senderId, sender.name, sender.avatar_url, payload.title, payload.body],
      );
      let itemId = item?.id as string | undefined;
      if (!itemId) {
        const [persisted] = await queryRunner.query(
          'SELECT id FROM inbox_items WHERE occurrence_id=$1 AND recipient_id=$2',
          [payload.occurrenceId, payload.recipientId],
        );
        itemId = persisted?.id;
      }
      if (!itemId) throw new Error('Inbox item was not persisted.');

      await queryRunner.query(
        `INSERT INTO inbox_event_outbox(occurrence_id,item_id,recipient_id,kind)
         VALUES($1,$2,$3,'created')
         ON CONFLICT (occurrence_id) WHERE occurrence_id IS NOT NULL DO NOTHING`,
        [payload.occurrenceId, itemId, payload.recipientId],
      );
      await queryRunner.commitTransaction();
      return { itemId };
    } catch (failure) {
      if (queryRunner.isTransactionActive) await queryRunner.rollbackTransaction();
      throw failure;
    } finally {
      await queryRunner.release();
    }
  }
}
