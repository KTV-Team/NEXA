import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import type { Delivery, NotificationStatus } from '@nexa/types';

@Entity({ name: 'personal_notifications' })
export class PersonalNotificationEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'sender_id', type: 'uuid' }) senderId!: string;
  @Column({ name: 'recipient_id', type: 'uuid' }) recipientId!: string;
  @Column({ name: 'client_request_id', type: 'uuid' }) clientRequestId!: string;
  @Column({ name: 'payload_hash', type: 'char', length: 64 }) payloadHash!: string;
  @Column({ type: 'varchar', length: 200 }) title!: string;
  @Column({ type: 'varchar', length: 5000 }) body!: string;
  @Column({ type: 'jsonb' }) delivery!: Delivery;
  @Column({ type: 'varchar', length: 16 }) status!: NotificationStatus;
  @Column({ type: 'integer' }) version!: number;
  @Column({ name: 'next_run_at', type: 'timestamptz', nullable: true }) nextRunAt!: Date | null;
  @Column({ name: 'last_delivered_at', type: 'timestamptz', nullable: true }) lastDeliveredAt!: Date | null;
  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true }) cancelledAt!: Date | null;
  @Column({ name: 'block_reason', type: 'varchar', length: 64, nullable: true }) blockReason!: string | null;
  @Column({ name: 'failure_code', type: 'varchar', length: 64, nullable: true }) failureCode!: string | null;
  @Column({ name: 'retry_count', type: 'integer' }) retryCount!: number;
  @Column({ name: 'retry_at', type: 'timestamptz', nullable: true }) retryAt!: Date | null;
  @Column({ name: 'created_at', type: 'timestamptz', insert: false, update: false }) createdAt!: Date;
  @Column({ name: 'updated_at', type: 'timestamptz', insert: false, update: false }) updatedAt!: Date;
}
