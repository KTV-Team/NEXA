import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'notification_occurrences' })
export class NotificationOccurrenceEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'notification_id', type: 'uuid' }) notificationId!: string;
  @Column({ name: 'scheduled_for', type: 'timestamptz' }) scheduledFor!: Date;
  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true }) deliveredAt!: Date | null;
  @Column({ name: 'notification_version', type: 'integer' }) notificationVersion!: number;
  @Column({ type: 'varchar', length: 16, default: 'pending' }) status!: 'pending' | 'processing' | 'persisted' | 'failed';
  @Column({ name: 'attempt_count', type: 'integer', default: 0 }) attemptCount!: number;
  @Column({ name: 'retry_at', type: 'timestamptz', nullable: true }) retryAt!: Date | null;
  @Column({ name: 'lease_until', type: 'timestamptz', nullable: true }) leaseUntil!: Date | null;
  @Column({ name: 'claim_token', type: 'uuid', nullable: true }) claimToken!: string | null;
  @Column({ name: 'last_error', type: 'varchar', length: 64, nullable: true }) lastError!: string | null;
  @Column({ name: 'payload_title', type: 'varchar', length: 200 }) payloadTitle!: string;
  @Column({ name: 'payload_body', type: 'varchar', length: 5000 }) payloadBody!: string;
}
