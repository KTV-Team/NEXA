import { HttpException, Injectable, Logger } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { createHash } from 'node:crypto';
import { Temporal } from '@js-temporal/polyfill';
import type {
  Delivery,
  FriendRequest,
  Friendship,
  InboxItem,
  PersonalNotification,
  PaginatedResponse,
  RecurrenceRule,
  UpdateNotificationDto,
} from '@nexa/types';

// TypeORM returns untyped driver rows for parameterized SQL operations below.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
const error = (status: number, code: string, message: string, details?: Record<string, unknown>) =>
  new HttpException({ code, message, ...(details ? { details } : {}) }, status);
function requiredStamp(value: unknown): string {
  if (!(value instanceof Date) && typeof value !== 'string' && typeof value !== 'number') {
    throw new Error('A persisted timestamp is missing.');
  }
  return new Date(value).toISOString();
}
const stamp = (value: unknown) => (value == null ? null : requiredStamp(value));
const pageResult = <T>(data: T[], page: number, limit: number, total: number) => ({
  data,
  meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
});

export async function calculateNextOccurrence(
  rule: RecurrenceRule,
  after: Date,
): Promise<Date | null> {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: rule.timeZone }).format(after);
  } catch {
    throw error(400, 'INVALID_SCHEDULE', 'The time zone is invalid.');
  }
  if (rule.endsOn && rule.endsOn < rule.startsOn)
    throw error(400, 'INVALID_SCHEDULE', 'endsOn must not be before startsOn.');
  try {
    Temporal.PlainDate.from(rule.startsOn);
    if (rule.endsOn) Temporal.PlainDate.from(rule.endsOn);
  } catch {
    throw error(400, 'INVALID_SCHEDULE', 'The recurrence date is invalid.');
  }
  if (rule.frequency === 'weekly' && new Set(rule.weekdays).size !== rule.weekdays.length)
    throw error(400, 'INVALID_SCHEDULE', 'Weekdays must be unique.');
  const localToday = Temporal.Instant.from(after.toISOString())
    .toZonedDateTimeISO(rule.timeZone)
    .toPlainDate()
    .toString();
  const cursor = localToday > rule.startsOn ? localToday : rule.startsOn;
  const [year, month, day] = cursor.split('-').map(Number) as [number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day));
  for (let i = 0; i < 366 * 200; i++) {
    const dateString = date.toISOString().slice(0, 10);
    if (rule.endsOn && dateString > rule.endsOn) return null;
    const isoWeekday = ((date.getUTCDay() + 6) % 7) + 1;
    if (rule.frequency === 'daily' || rule.weekdays.includes(isoWeekday)) {
      const [hour, minute] = rule.localTime.split(':').map(Number);
      const scheduled = Temporal.ZonedDateTime.from(
        {
          timeZone: rule.timeZone,
          year: date.getUTCFullYear(),
          month: date.getUTCMonth() + 1,
          day: date.getUTCDate(),
          hour,
          minute,
        },
        { disambiguation: 'compatible' },
      );
      const instant = new Date(Number(scheduled.epochMilliseconds));
      if (dateString >= rule.startsOn && instant > after) return instant;
    }
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return null;
}

@Injectable()
export class SocialService {
  private readonly logger = new Logger(SocialService.name);
  constructor(private readonly db: DataSource) {}

  private async lockUsers(q: QueryRunner, ids: string[]) {
    const unique = [...new Set(ids)].sort();
    const rows = await q.query(
      'SELECT id FROM users WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL ORDER BY id FOR UPDATE',
      [unique],
    );
    if (rows.length !== unique.length) throw error(404, 'USER_NOT_FOUND', 'User was not found.');
  }
  private async lockExistingUsers(q: QueryRunner, ids: string[]) {
    const unique = [...new Set(ids)].sort();
    const rows = await q.query(
      'SELECT id FROM users WHERE id = ANY($1::uuid[]) ORDER BY id FOR UPDATE',
      [unique],
    );
    if (rows.length !== unique.length) throw error(404, 'USER_NOT_FOUND', 'User was not found.');
  }
  private async isFriends(q: QueryRunner, a: string, b: string) {
    if (a === b) return true;
    const [low, high] = [a, b].sort();
    return (
      (
        await q.query(
          'SELECT 1 FROM friendships WHERE low_user_id=$1 AND high_user_id=$2 AND removed_at IS NULL',
          [low, high],
        )
      ).length > 0
    );
  }
  private readonly friendRequestSelect = `SELECT r.*, s.name AS sender_name,s.avatar_url AS sender_avatar_url,d.name AS recipient_name,d.avatar_url AS recipient_avatar_url
      FROM friend_requests r JOIN users s ON s.id=r.sender_id JOIN users d ON d.id=r.recipient_id
      WHERE s.deleted_at IS NULL AND d.deleted_at IS NULL`;
  private serializeFriendRequest(r: Row): FriendRequest {
    return {
      id: r.id,
      sender: {
        id: r.sender_id,
        name: r.sender_name,
        ...(r.sender_avatar_url ? { avatarUrl: r.sender_avatar_url } : {}),
      },
      recipient: {
        id: r.recipient_id,
        name: r.recipient_name,
        ...(r.recipient_avatar_url ? { avatarUrl: r.recipient_avatar_url } : {}),
      },
      status: r.status,
      friendshipId: r.friendship_id,
      createdAt: requiredStamp(r.created_at),
      updatedAt: requiredStamp(r.updated_at),
    };
  }
  private async friendRequestDto(
    id: string,
    executor: DataSource | QueryRunner = this.db,
  ): Promise<FriendRequest> {
    const rows = await executor.query(`${this.friendRequestSelect} AND r.id=$1`, [id]);
    if (!rows[0]) throw error(404, 'FRIEND_REQUEST_NOT_FOUND', 'Friend request was not found.');
    return this.serializeFriendRequest(rows[0]);
  }
  async sendRequest(userId: string, recipientId: string) {
    if (userId === recipientId)
      throw error(400, 'SELF_FRIEND_REQUEST', 'You cannot send a friend request to yourself.');
    const q = this.db.createQueryRunner();
    try {
      await q.connect();
      await q.startTransaction();
      await this.lockUsers(q, [userId, recipientId]);
      if (await this.isFriends(q, userId, recipientId))
        throw error(409, 'ALREADY_FRIENDS', 'These users are already friends.');
      const [low, high] = [userId, recipientId].sort();
      const pending = (
        await q.query(
          `SELECT * FROM friend_requests WHERE status='PENDING' AND LEAST(sender_id,recipient_id)=$1 AND GREATEST(sender_id,recipient_id)=$2 FOR UPDATE`,
          [low, high],
        )
      )[0] as Row | undefined;
      if (pending) {
        if (pending.sender_id === userId) {
          const response = { created: false, data: await this.friendRequestDto(pending.id, q) };
          await q.commitTransaction();
          return response;
        }
        throw error(
          409,
          'INCOMING_REQUEST_EXISTS',
          'An incoming friend request is already pending.',
          { requestId: pending.id },
        );
      }
      const rows = await q.query(
        `INSERT INTO friend_requests(sender_id,recipient_id) VALUES($1,$2) RETURNING id`,
        [userId, recipientId],
      );
      const response = { created: true, data: await this.friendRequestDto(rows[0].id, q) };
      await q.commitTransaction();
      return response;
    } catch (e) {
      if (q.isTransactionActive) await q.rollbackTransaction();
      if ((e as { code?: string })?.code === '23505')
        throw error(409, 'INCOMING_REQUEST_EXISTS', 'A friend request is already pending.');
      throw e;
    } finally {
      await q.release();
    }
  }
  async listRequests(
    userId: string,
    p: { direction: 'incoming' | 'outgoing'; page: number; limit: number },
  ): Promise<PaginatedResponse<FriendRequest>> {
    const column = p.direction === 'incoming' ? 'recipient_id' : 'sender_id';
    const [rows, count] = await Promise.all([
      this.db.query(
        `${this.friendRequestSelect} AND r.${column}=$1 AND r.status='PENDING' ORDER BY r.created_at DESC,r.id DESC OFFSET $2 LIMIT $3`,
        [userId, (p.page - 1) * p.limit, p.limit],
      ),
      this.db.query(
        `SELECT count(*)::int AS count FROM friend_requests r JOIN users s ON s.id=r.sender_id JOIN users d ON d.id=r.recipient_id WHERE r.${column}=$1 AND r.status='PENDING' AND s.deleted_at IS NULL AND d.deleted_at IS NULL`,
        [userId],
      ),
    ]);
    return pageResult(
      rows.map((r: Row) => this.serializeFriendRequest(r)),
      p.page,
      p.limit,
      count[0].count,
    );
  }
  private async transitionRequest(
    userId: string,
    id: string,
    action: 'accept' | 'reject' | 'cancel',
  ) {
    const q = this.db.createQueryRunner();
    try {
      await q.connect();
      await q.startTransaction();
      let row = (await q.query('SELECT * FROM friend_requests WHERE id=$1', [id]))[0] as
        Row | undefined;
      if (!row || (row.sender_id !== userId && row.recipient_id !== userId))
        throw error(404, 'FRIEND_REQUEST_NOT_FOUND', 'Friend request was not found.');
      await this.lockUsers(q, [row.sender_id, row.recipient_id]);
      row = (await q.query('SELECT * FROM friend_requests WHERE id=$1 FOR UPDATE', [id]))[0];
      if (!row) throw error(404, 'FRIEND_REQUEST_NOT_FOUND', 'Friend request was not found.');
      const actor = action === 'cancel' ? row.sender_id : row.recipient_id;
      if (actor !== userId)
        throw error(
          403,
          'FRIEND_REQUEST_ACTION_FORBIDDEN',
          'You cannot perform this action on this friend request.',
        );
      if (action === 'reject' && row.status === 'REJECTED') {
        const response = await this.friendRequestDto(id, q);
        await q.commitTransaction();
        return response;
      }
      if (action === 'cancel' && row.status === 'CANCELLED') {
        await q.commitTransaction();
        return;
      }
      if (action === 'accept' && row.status === 'ACCEPTED') {
        const existing =
          row.friendship_id &&
          (
            await q.query('SELECT * FROM friendships WHERE id=$1 AND removed_at IS NULL', [
              row.friendship_id,
            ])
          )[0];
        if (existing) {
          const response = await this.friendshipDto(existing, userId, q);
          await q.commitTransaction();
          return response;
        }
      }
      if (row.status !== 'PENDING')
        throw error(409, 'FRIEND_REQUEST_STATE_CONFLICT', 'Friend request is no longer pending.');
      if (action === 'accept') {
        const [low, high] = [row.sender_id, row.recipient_id].sort();
        let friendship = (
          await q.query(
            'SELECT * FROM friendships WHERE low_user_id=$1 AND high_user_id=$2 AND removed_at IS NULL FOR UPDATE',
            [low, high],
          )
        )[0];
        if (!friendship)
          friendship = (
            await q.query(
              'INSERT INTO friendships(low_user_id,high_user_id) VALUES($1,$2) RETURNING *',
              [low, high],
            )
          )[0];
        if (!friendship)
          throw error(500, 'INTERNAL_SERVER_ERROR', 'Friendship could not be created.');
        await q.query(
          "UPDATE friend_requests SET status='ACCEPTED',friendship_id=$2,updated_at=now() WHERE id=$1",
          [id, friendship.id],
        );
        const response = await this.friendshipDto(friendship, userId, q);
        await q.commitTransaction();
        return response;
      }
      const status = action === 'reject' ? 'REJECTED' : 'CANCELLED';
      await q.query('UPDATE friend_requests SET status=$2,updated_at=now() WHERE id=$1', [
        id,
        status,
      ]);
      const response = action === 'reject' ? await this.friendRequestDto(id, q) : undefined;
      await q.commitTransaction();
      return response;
    } catch (e) {
      if (q.isTransactionActive) await q.rollbackTransaction();
      if ((e as { code?: string })?.code === '23505')
        throw error(409, 'FRIEND_REQUEST_STATE_CONFLICT', 'Friend request changed concurrently.');
      throw e;
    } finally {
      await q.release();
    }
  }
  accept(userId: string, id: string) {
    return this.transitionRequest(userId, id, 'accept');
  }
  reject(userId: string, id: string) {
    return this.transitionRequest(userId, id, 'reject');
  }
  cancelRequest(userId: string, id: string) {
    return this.transitionRequest(userId, id, 'cancel');
  }
  private async friendshipDto(
    r: Row,
    userId: string,
    executor: DataSource | QueryRunner = this.db,
  ): Promise<Friendship> {
    const friendId = r.low_user_id === userId ? r.high_user_id : r.low_user_id;
    const [friend] = await executor.query(
      'SELECT id,name,avatar_url FROM users WHERE id=$1 AND deleted_at IS NULL',
      [friendId],
    );
    if (!friend) throw error(404, 'USER_NOT_FOUND', 'User was not found.');
    return {
      id: r.id,
      friend: {
        id: friend.id,
        name: friend.name,
        ...(friend.avatar_url ? { avatarUrl: friend.avatar_url } : {}),
      },
      createdAt: requiredStamp(r.created_at),
    };
  }
  async listFriends(
    userId: string,
    p: { page: number; limit: number },
  ): Promise<PaginatedResponse<Friendship>> {
    const [rows, count] = await Promise.all([
      this.db.query(
        `SELECT f.*,u.id AS friend_id,u.name AS friend_name,u.avatar_url AS friend_avatar_url FROM friendships f JOIN users u ON u.id=CASE WHEN f.low_user_id=$1 THEN f.high_user_id ELSE f.low_user_id END AND u.deleted_at IS NULL WHERE (f.low_user_id=$1 OR f.high_user_id=$1) AND f.removed_at IS NULL ORDER BY f.created_at DESC,f.id DESC OFFSET $2 LIMIT $3`,
        [userId, (p.page - 1) * p.limit, p.limit],
      ),
      this.db.query(
        `SELECT count(*)::int AS count FROM friendships f JOIN users u ON u.id=CASE WHEN f.low_user_id=$1 THEN f.high_user_id ELSE f.low_user_id END AND u.deleted_at IS NULL WHERE (f.low_user_id=$1 OR f.high_user_id=$1) AND f.removed_at IS NULL`,
        [userId],
      ),
    ]);
    return pageResult(
      rows.map((r: Row) => ({
        id: r.id,
        friend: {
          id: r.friend_id,
          name: r.friend_name,
          ...(r.friend_avatar_url ? { avatarUrl: r.friend_avatar_url } : {}),
        },
        createdAt: requiredStamp(r.created_at),
      })),
      p.page,
      p.limit,
      count[0].count,
    );
  }
  async removeFriend(userId: string, id: string) {
    const q = this.db.createQueryRunner();
    try {
      await q.connect();
      await q.startTransaction();
      const r = (await q.query('SELECT * FROM friendships WHERE id=$1', [id]))[0] as
        Row | undefined;
      if (!r || (r.low_user_id !== userId && r.high_user_id !== userId))
        throw error(404, 'FRIENDSHIP_NOT_FOUND', 'Friendship was not found.');
      await this.lockExistingUsers(q, [r.low_user_id, r.high_user_id]);
      await q.query('UPDATE friendships SET removed_at=COALESCE(removed_at,now()) WHERE id=$1', [
        id,
      ]);
      await q.commitTransaction();
    } catch (e) {
      if (q.isTransactionActive) await q.rollbackTransaction();
      throw e;
    } finally {
      await q.release();
    }
  }

  private async nextOccurrence(rule: RecurrenceRule, after: Date): Promise<Date | null> {
    return calculateNextOccurrence(rule, after);
  }
  private async validateDelivery(delivery: Delivery, now = new Date()): Promise<Date | null> {
    if (delivery.mode === 'immediate') return now;
    if (delivery.mode === 'scheduled') {
      const date = new Date(delivery.scheduledAt);
      if (date <= now) throw error(400, 'INVALID_SCHEDULE', 'scheduledAt must be in the future.');
      return date;
    }
    const next = await this.nextOccurrence(delivery.rule, now);
    if (!next) throw error(400, 'INVALID_SCHEDULE', 'The recurrence has no future occurrence.');
    return next;
  }
  private normalizeDelivery(delivery: Delivery): Delivery {
    if (delivery.mode === 'immediate') return { mode: 'immediate' };
    if (delivery.mode === 'scheduled')
      return { mode: 'scheduled', scheduledAt: new Date(delivery.scheduledAt).toISOString() };
    const rule = delivery.rule;
    const fields = {
      timeZone: rule.timeZone,
      localTime: rule.localTime,
      startsOn: rule.startsOn,
      ...(rule.endsOn ? { endsOn: rule.endsOn } : {}),
    };
    return {
      mode: 'recurring',
      rule:
        rule.frequency === 'weekly'
          ? { frequency: 'weekly', ...fields, weekdays: [...rule.weekdays].sort((a, b) => a - b) }
          : { frequency: 'daily', ...fields },
    };
  }
  private readonly notificationSelect = `SELECT n.*,u.id AS recipient_id_active,u.name AS recipient_name,u.avatar_url AS recipient_avatar_url
      FROM personal_notifications n LEFT JOIN users u ON u.id=n.recipient_id AND u.deleted_at IS NULL`;
  private serializeNotification(r: Row): PersonalNotification {
    return {
      id: r.id,
      senderId: r.sender_id,
      recipientId: r.recipient_id,
      recipient: r.recipient_id_active
        ? {
            id: r.recipient_id_active,
            name: r.recipient_name,
            ...(r.recipient_avatar_url ? { avatarUrl: r.recipient_avatar_url } : {}),
          }
        : null,
      title: r.title,
      body: r.body,
      delivery: r.delivery,
      status: r.status,
      version: r.version,
      nextRunAt: stamp(r.next_run_at),
      lastDeliveredAt: stamp(r.last_delivered_at),
      cancelledAt: stamp(r.cancelled_at),
      blockReason: r.block_reason,
      failureCode: r.failure_code,
      createdAt: requiredStamp(r.created_at),
      updatedAt: requiredStamp(r.updated_at),
    };
  }
  private async notificationDto(
    id: string,
    executor: DataSource | QueryRunner = this.db,
  ): Promise<PersonalNotification> {
    const [row] = await executor.query(`${this.notificationSelect} WHERE n.id=$1`, [id]);
    if (!row) throw error(404, 'NOTIFICATION_NOT_FOUND', 'Notification was not found.');
    return this.serializeNotification(row);
  }
  private async insertInbox(q: QueryRunner, notification: Row, when: Date) {
    const sender = (
      await q.query('SELECT name,avatar_url FROM users WHERE id=$1', [notification.sender_id])
    )[0];
    const occurrence = (
      await q.query(
        'INSERT INTO notification_occurrences(notification_id,scheduled_for,notification_version) VALUES($1,$2,$3) RETURNING id,delivered_at',
        [notification.id, when, notification.version],
      )
    )[0];
    await q.query(
      `INSERT INTO inbox_items(occurrence_id,recipient_id,sender_id,sender_name,sender_avatar_url,title,body)
      VALUES($1,$2,$3,$4,$5,$6,$7)`,
      [
        occurrence.id,
        notification.recipient_id,
        notification.sender_id,
        sender.name,
        sender.avatar_url,
        notification.title,
        notification.body,
      ],
    );
    return occurrence;
  }
  async createNotification(
    senderId: string,
    dto: {
      clientRequestId: string;
      recipientId: string;
      title: string;
      body: string;
      delivery: Delivery;
    },
  ) {
    const normalizedDelivery = this.normalizeDelivery(dto.delivery);
    const normalized = {
      recipientId: dto.recipientId,
      title: dto.title.trim(),
      body: dto.body.trim(),
      delivery: normalizedDelivery,
    };
    const hash = createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
    const previous = (
      await this.db.query(
        'SELECT id,payload_hash FROM personal_notifications WHERE sender_id=$1 AND client_request_id=$2',
        [senderId, dto.clientRequestId],
      )
    )[0] as Row | undefined;
    if (previous) {
      if (previous.payload_hash !== hash)
        throw error(
          409,
          'IDEMPOTENCY_KEY_REUSED',
          'This clientRequestId was already used with a different payload.',
        );
      return { created: false, data: await this.notificationDto(previous.id) };
    }
    const now = new Date();
    const next = await this.validateDelivery(normalizedDelivery, now);
    const status =
      normalizedDelivery.mode === 'immediate'
        ? 'COMPLETED'
        : normalizedDelivery.mode === 'recurring'
          ? 'ACTIVE'
          : 'SCHEDULED';
    const q = this.db.createQueryRunner();
    try {
      await q.connect();
      await q.startTransaction();
      await this.lockUsers(q, [senderId, dto.recipientId]);
      if (!(await this.isFriends(q, senderId, dto.recipientId)))
        throw error(
          403,
          'RECIPIENT_NOT_ALLOWED',
          'You can send notifications only to yourself or an accepted friend.',
        );
      const rows = await q.query(
        `INSERT INTO personal_notifications(sender_id,recipient_id,client_request_id,payload_hash,title,body,delivery,status,next_run_at,last_delivered_at)
        VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10) RETURNING *`,
        [
          senderId,
          dto.recipientId,
          dto.clientRequestId,
          hash,
          normalized.title,
          normalized.body,
          JSON.stringify(normalizedDelivery),
          status,
          status === 'COMPLETED' ? null : next,
          status === 'COMPLETED' ? now : null,
        ],
      );
      const n = rows[0];
      if (status === 'COMPLETED') await this.insertInbox(q, n, now);
      const response = { created: true, data: await this.notificationDto(n.id, q) };
      await q.commitTransaction();
      return response;
    } catch (e) {
      if (q.isTransactionActive) await q.rollbackTransaction();
      if ((e as { code?: string })?.code === '23505') {
        await q.release();
        const existing = (
          await this.db.query(
            'SELECT id,payload_hash FROM personal_notifications WHERE sender_id=$1 AND client_request_id=$2',
            [senderId, dto.clientRequestId],
          )
        )[0];
        if (existing) {
          if (existing.payload_hash !== hash)
            throw error(
              409,
              'IDEMPOTENCY_KEY_REUSED',
              'This clientRequestId was already used with a different payload.',
            );
          return { created: false, data: await this.notificationDto(existing.id) };
        }
      }
      throw e;
    } finally {
      if (!q.isReleased) await q.release();
    }
  }
  async listNotifications(
    userId: string,
    p: { page: number; limit: number },
  ): Promise<PaginatedResponse<PersonalNotification>> {
    const [rows, count] = await Promise.all([
      this.db.query(
        `${this.notificationSelect} WHERE n.sender_id=$1 ORDER BY n.created_at DESC,n.id DESC OFFSET $2 LIMIT $3`,
        [userId, (p.page - 1) * p.limit, p.limit],
      ),
      this.db.query(
        'SELECT count(*)::int AS count FROM personal_notifications WHERE sender_id=$1',
        [userId],
      ),
    ]);
    return pageResult(
      rows.map((r: Row) => this.serializeNotification(r)),
      p.page,
      p.limit,
      count[0].count,
    );
  }
  async getNotification(userId: string, id: string) {
    const r = (
      await this.db.query('SELECT id FROM personal_notifications WHERE id=$1 AND sender_id=$2', [
        id,
        userId,
      ])
    )[0];
    if (!r) throw error(404, 'NOTIFICATION_NOT_FOUND', 'Notification was not found.');
    return this.notificationDto(id);
  }
  async updateNotification(userId: string, id: string, dto: UpdateNotificationDto) {
    const q = this.db.createQueryRunner();
    try {
      await q.connect();
      await q.startTransaction();
      let n = (
        await q.query('SELECT * FROM personal_notifications WHERE id=$1 AND sender_id=$2', [
          id,
          userId,
        ])
      )[0] as Row | undefined;
      if (!n) throw error(404, 'NOTIFICATION_NOT_FOUND', 'Notification was not found.');
      await this.lockUsers(q, [n.sender_id, n.recipient_id]);
      const locked = (
        await q.query('SELECT * FROM personal_notifications WHERE id=$1 FOR UPDATE', [id])
      )[0] as Row | undefined;
      if (!locked) throw error(404, 'NOTIFICATION_NOT_FOUND', 'Notification was not found.');
      n = locked;
      if (n.version !== dto.version)
        throw error(409, 'VERSION_CONFLICT', 'Notification version is stale.');
      if (!['SCHEDULED', 'ACTIVE'].includes(n.status))
        throw error(
          409,
          'NOTIFICATION_STATE_CONFLICT',
          'This notification can no longer be edited.',
        );
      const now = new Date();
      if (n.next_run_at && new Date(n.next_run_at) <= now)
        throw error(409, 'NOTIFICATION_DUE', 'The next occurrence is due; reload before editing.');
      const delivery = this.normalizeDelivery(dto.delivery ?? n.delivery);
      if (delivery.mode !== n.delivery.mode)
        throw error(400, 'VALIDATION_ERROR', 'Delivery mode cannot be changed.');
      const next =
        delivery.mode === 'scheduled'
          ? await this.validateDelivery(delivery, now)
          : delivery.mode === 'recurring'
            ? await this.validateDelivery(delivery, now)
            : null;
      if (delivery.mode === 'immediate')
        throw error(
          400,
          'VALIDATION_ERROR',
          'Immediate delivery cannot be scheduled through an update.',
        );
      const title = dto.title ?? n.title,
        body = dto.body ?? n.body,
        status = delivery.mode === 'recurring' ? 'ACTIVE' : 'SCHEDULED';
      const updated = await q.query(
        `UPDATE personal_notifications SET title=$3,body=$4,delivery=$5::jsonb,status=$6,next_run_at=$7,version=version+1,updated_at=now(),retry_count=0,retry_at=NULL
        WHERE id=$1 AND version=$2 RETURNING id`,
        [id, dto.version, title, body, JSON.stringify(delivery), status, next],
        true,
      );
      if (!updated.affected) throw error(409, 'VERSION_CONFLICT', 'Notification version is stale.');
      const response = await this.notificationDto(id, q);
      await q.commitTransaction();
      return response;
    } catch (e) {
      if (q.isTransactionActive) await q.rollbackTransaction();
      throw e;
    } finally {
      await q.release();
    }
  }
  async cancelNotification(userId: string, id: string, dto: { version: number }) {
    const q = this.db.createQueryRunner();
    try {
      await q.connect();
      await q.startTransaction();
      let n = (
        await q.query('SELECT * FROM personal_notifications WHERE id=$1 AND sender_id=$2', [
          id,
          userId,
        ])
      )[0] as Row | undefined;
      if (!n) throw error(404, 'NOTIFICATION_NOT_FOUND', 'Notification was not found.');
      await this.lockExistingUsers(q, [n.sender_id, n.recipient_id]);
      const locked = (
        await q.query('SELECT * FROM personal_notifications WHERE id=$1 FOR UPDATE', [id])
      )[0] as Row | undefined;
      if (!locked) throw error(404, 'NOTIFICATION_NOT_FOUND', 'Notification was not found.');
      n = locked;
      if (n.status === 'CANCELLED') {
        const response = await this.notificationDto(id, q);
        await q.commitTransaction();
        return response;
      }
      if (n.version !== dto.version)
        throw error(409, 'VERSION_CONFLICT', 'Notification version is stale.');
      if (!['SCHEDULED', 'ACTIVE'].includes(n.status))
        throw error(
          409,
          'NOTIFICATION_STATE_CONFLICT',
          'This notification can no longer be cancelled.',
        );
      await q.query(
        "UPDATE personal_notifications SET status='CANCELLED',cancelled_at=now(),next_run_at=NULL,retry_at=NULL,version=version+1,updated_at=now() WHERE id=$1 AND version=$2",
        [id, dto.version],
      );
      const response = await this.notificationDto(id, q);
      await q.commitTransaction();
      return response;
    } catch (e) {
      if (q.isTransactionActive) await q.rollbackTransaction();
      throw e;
    } finally {
      await q.release();
    }
  }
  private inboxDto(r: Row): InboxItem {
    return {
      id: r.id,
      notificationId: r.notification_id,
      occurrenceId: r.occurrence_id,
      sender: {
        id: r.sender_id,
        name: r.sender_name,
        ...(r.sender_avatar_url ? { avatarUrl: r.sender_avatar_url } : {}),
      },
      title: r.title,
      body: r.body,
      scheduledFor: requiredStamp(r.scheduled_for),
      deliveredAt: requiredStamp(r.delivered_at),
      readAt: stamp(r.read_at),
    };
  }
  private inboxSelect = `SELECT i.*,o.notification_id,o.scheduled_for,o.delivered_at FROM inbox_items i JOIN notification_occurrences o ON o.id=i.occurrence_id`;
  async listInbox(
    userId: string,
    p: { page: number; limit: number; read?: boolean },
  ): Promise<PaginatedResponse<InboxItem>> {
    const values: unknown[] = [userId];
    let where = 'i.recipient_id=$1 AND i.deleted_at IS NULL';
    if (p.read !== undefined) {
      values.push(p.read);
      where += ` AND (i.read_at IS NOT NULL)=$${values.length}`;
    }
    const query = `${this.inboxSelect} WHERE ${where} ORDER BY i.created_at DESC,i.id DESC OFFSET $${values.length + 1} LIMIT $${values.length + 2}`;
    const [rows, count] = await Promise.all([
      this.db.query(query, [...values, (p.page - 1) * p.limit, p.limit]),
      this.db.query(`SELECT count(*)::int AS count FROM inbox_items i WHERE ${where}`, values),
    ]);
    return pageResult(
      rows.map((r: Row) => this.inboxDto(r)),
      p.page,
      p.limit,
      count[0].count,
    );
  }
  async unreadCount(userId: string) {
    const [row] = await this.db.query(
      'SELECT count(*)::int AS count FROM inbox_items WHERE recipient_id=$1 AND deleted_at IS NULL AND read_at IS NULL',
      [userId],
    );
    return { unreadCount: row.count };
  }
  async getInbox(userId: string, id: string) {
    const rows = await this.db.query(
      `${this.inboxSelect} WHERE i.id=$1 AND i.recipient_id=$2 AND i.deleted_at IS NULL`,
      [id, userId],
    );
    if (!rows.length) throw error(404, 'INBOX_ITEM_NOT_FOUND', 'Inbox item was not found.');
    return this.inboxDto(rows[0]);
  }
  async setInboxRead(userId: string, id: string, read: boolean) {
    const rows = await this.db.query(
      `WITH updated AS (UPDATE inbox_items SET read_at=CASE WHEN $3::boolean THEN COALESCE(read_at,now()) ELSE NULL END,updated_at=now() WHERE id=$1 AND recipient_id=$2 AND deleted_at IS NULL RETURNING *) SELECT i.*,o.notification_id,o.scheduled_for,o.delivered_at FROM updated i JOIN notification_occurrences o ON o.id=i.occurrence_id`,
      [id, userId, read],
    );
    if (!rows.length) throw error(404, 'INBOX_ITEM_NOT_FOUND', 'Inbox item was not found.');
    return this.inboxDto(rows[0]);
  }
  async readAll(userId: string) {
    const [result] = await this.db.query(
      `WITH updated AS (UPDATE inbox_items SET read_at=statement_timestamp(),updated_at=statement_timestamp() WHERE recipient_id=$1 AND deleted_at IS NULL AND read_at IS NULL RETURNING id) SELECT count(*)::int AS count FROM updated`,
      [userId],
    );
    return { updatedCount: result.count };
  }
  async deleteInbox(userId: string, id: string) {
    const [result] = await this.db.query(
      `WITH updated AS (UPDATE inbox_items SET deleted_at=COALESCE(deleted_at,now()),updated_at=now() WHERE id=$1 AND recipient_id=$2 RETURNING id) SELECT count(*)::int AS count FROM updated`,
      [id, userId],
    );
    if (!result.count) throw error(404, 'INBOX_ITEM_NOT_FOUND', 'Inbox item was not found.');
  }

  async processDue(now = new Date(), limit = 50): Promise<number> {
    const candidates = await this.db.query(
      `SELECT id,version,next_run_at FROM personal_notifications WHERE status IN ('SCHEDULED','ACTIVE') AND next_run_at <= $1 AND (retry_at IS NULL OR retry_at <= $1) ORDER BY COALESCE(retry_at,next_run_at),id LIMIT $2`,
      [now, limit],
    );
    let processed = 0;
    for (const item of candidates) {
      try {
        if (await this.processCandidate(item.id, now)) processed++;
      } catch (failure) {
        const code = this.failureCode(failure);
        this.logger.warn({
          notificationId: item.id,
          errorCode: code,
          event: 'DELIVERY_TRANSACTION_FAILED',
        });
        await this.recordRetry(item, now, this.isTransientFailure(code));
      }
    }
    return processed;
  }
  private async latestDue(rule: RecurrenceRule, from: Date, now: Date) {
    let occurrence: Date | null = await this.nextOccurrence(rule, new Date(from.getTime() - 1));
    let latest: Date | null = null;
    let guard = 0;
    while (occurrence && occurrence <= now && guard++ < 100000) {
      latest = occurrence;
      occurrence = await this.nextOccurrence(rule, occurrence);
    }
    return { latest, next: occurrence };
  }
  private async processCandidate(id: string, now: Date) {
    const q = this.db.createQueryRunner();
    try {
      await q.connect();
      await q.startTransaction();
      const before = (
        await q.query('SELECT sender_id,recipient_id FROM personal_notifications WHERE id=$1', [id])
      )[0] as Row | undefined;
      if (!before) {
        await q.rollbackTransaction();
        return false;
      }
      const ids = [...new Set([before.sender_id, before.recipient_id])].sort();
      const lockedUsers = await q.query(
        'SELECT id,deleted_at FROM users WHERE id=ANY($1::uuid[]) ORDER BY id FOR UPDATE',
        [ids],
      );
      const n = (
        await q.query(
          "SELECT * FROM personal_notifications WHERE id=$1 AND status IN ('SCHEDULED','ACTIVE') AND next_run_at <= $2 AND (retry_at IS NULL OR retry_at <= $2) FOR UPDATE SKIP LOCKED",
          [id, now],
        )
      )[0] as Row | undefined;
      if (!n) {
        await q.commitTransaction();
        return false;
      }
      const active =
        lockedUsers.length === ids.length && lockedUsers.every((u: Row) => u.deleted_at === null);
      const allowed = active && (await this.isFriends(q, n.sender_id, n.recipient_id));
      if (!allowed) {
        await q.query(
          "UPDATE personal_notifications SET status='BLOCKED',block_reason=$2,next_run_at=NULL,retry_at=NULL,version=version+1,updated_at=now() WHERE id=$1",
          [id, active ? 'FRIENDSHIP_REMOVED' : 'USER_INACTIVE'],
        );
        await q.commitTransaction();
        return true;
      }
      let deliverAt = new Date(n.next_run_at);
      let nextRun: Date | null = null;
      let nextStatus = 'COMPLETED';
      if (n.delivery.mode === 'recurring') {
        const result = await this.latestDue(n.delivery.rule, deliverAt, now);
        if (result.latest) deliverAt = result.latest;
        nextRun = result.next;
        if (nextRun) {
          nextStatus = 'ACTIVE';
          if (n.delivery.rule.endsOn) {
            const candidateLocal = Temporal.Instant.from(nextRun.toISOString())
              .toZonedDateTimeISO(n.delivery.rule.timeZone)
              .toPlainDate()
              .toString();
            if (candidateLocal > n.delivery.rule.endsOn) {
              nextRun = null;
              nextStatus = 'COMPLETED';
            }
          }
        }
      }
      await this.insertInbox(q, n, deliverAt);
      await q.query(
        'UPDATE personal_notifications SET status=$2,next_run_at=$3,last_delivered_at=now(),retry_count=0,retry_at=NULL,failure_code=NULL,version=version+1,updated_at=now() WHERE id=$1',
        [id, nextStatus, nextRun],
      );
      await q.commitTransaction();
      return true;
    } catch (e) {
      if (q.isTransactionActive) await q.rollbackTransaction();
      throw e;
    } finally {
      await q.release();
    }
  }
  private failureCode(failure: unknown): string {
    if (!failure || typeof failure !== 'object') return 'UNEXPECTED_ERROR';
    const candidate = failure as {
      code?: unknown;
      message?: unknown;
      driverError?: { code?: unknown };
    };
    const code = candidate.driverError?.code ?? candidate.code;
    if (code === undefined && candidate.message === 'timeout exceeded when trying to connect')
      return 'POOL_ACQUIRE_TIMEOUT';
    if (code === undefined && candidate.message === 'Connection terminated unexpectedly')
      return 'CONNECTION_CLOSED';
    return typeof code === 'string' && /^[A-Z0-9_]{2,32}$/.test(code) ? code : 'UNEXPECTED_ERROR';
  }
  private isTransientFailure(code: string): boolean {
    return (
      code.startsWith('08') ||
      [
        '40001',
        '40P01',
        '55P03',
        '57014',
        '53300',
        '57P01',
        '57P02',
        '57P03',
        'ECONNRESET',
        'ECONNREFUSED',
        'ETIMEDOUT',
        'EPIPE',
        'POOL_ACQUIRE_TIMEOUT',
        'CONNECTION_CLOSED',
      ].includes(code)
    );
  }
  private async recordRetry(
    candidate: { id: string; version: number; next_run_at: Date },
    now: Date,
    retryable: boolean,
  ) {
    const { id } = candidate;
    const q = this.db.createQueryRunner();
    try {
      await q.connect();
      await q.startTransaction();
      const owner = (
        await q.query(
          "SELECT sender_id,recipient_id FROM personal_notifications WHERE id=$1 AND version=$2 AND next_run_at=$3 AND status IN ('SCHEDULED','ACTIVE')",
          [id, candidate.version, candidate.next_run_at],
        )
      )[0] as Row | undefined;
      if (!owner) {
        await q.commitTransaction();
        return;
      }
      await this.lockExistingUsers(q, [owner.sender_id, owner.recipient_id]);
      const n = (
        await q.query(
          "SELECT * FROM personal_notifications WHERE id=$1 AND version=$2 AND next_run_at=$3 AND status IN ('SCHEDULED','ACTIVE') FOR UPDATE",
          [id, candidate.version, candidate.next_run_at],
        )
      )[0] as Row | undefined;
      if (!n) {
        await q.commitTransaction();
        return;
      }
      const retries = retryable ? n.retry_count + 1 : n.retry_count;
      if (!retryable || retries > 5)
        await q.query(
          "UPDATE personal_notifications SET status='FAILED',failure_code='DELIVERY_FAILED',next_run_at=NULL,retry_at=NULL,retry_count=$2,version=version+1,updated_at=now() WHERE id=$1",
          [id, retries],
        );
      else
        await q.query(
          'UPDATE personal_notifications SET retry_count=$2,retry_at=$3,updated_at=now() WHERE id=$1',
          [id, retries, new Date(now.getTime() + Math.pow(2, retries - 1) * 1000)],
        );
      await q.commitTransaction();
      this.logger.warn({
        notificationId: id,
        event: !retryable || retries > 5 ? 'DELIVERY_FAILED' : 'DELIVERY_RETRY_SCHEDULED',
        retryCount: retries,
      });
    } catch (failure) {
      if (q.isTransactionActive) await q.rollbackTransaction();
      this.logger.warn({
        notificationId: id,
        errorCode: this.failureCode(failure),
        event: 'RETRY_STATE_WRITE_FAILED',
      });
      throw failure;
    } finally {
      await q.release();
    }
  }
}
