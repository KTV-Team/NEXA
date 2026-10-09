import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'inbox_push_jobs' })
export class InboxPushJobEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'item_id', type: 'uuid' }) itemId!: string;
  @Column({ name: 'installation_id', type: 'uuid' }) installationId!: string;
  @Column({ name: 'recipient_id', type: 'uuid' }) recipientId!: string;
  @Column({ name: 'session_id', type: 'uuid' }) sessionId!: string;
  @Column({ type: 'varchar', length: 16 }) status!: 'pending' | 'accepted' | 'failed' | 'skipped';
  @Column({ name: 'attempt_count', type: 'integer', insert: false, update: false }) attemptCount!: number;
  @Column({ name: 'retry_at', type: 'timestamptz', nullable: true }) retryAt!: Date | null;
  @Column({ name: 'lease_until', type: 'timestamptz', nullable: true }) leaseUntil!: Date | null;
  @Column({ name: 'provider_message_id', type: 'varchar', length: 64, nullable: true }) providerMessageId!: string | null;
  @Column({ name: 'push_token_hash', type: 'char', length: 64, nullable: true }) pushTokenHash!: string | null;
  @Column({ name: 'accepted_at', type: 'timestamptz', nullable: true }) acceptedAt!: Date | null;
  @Column({ name: 'receipt_status', type: 'varchar', length: 16, nullable: true }) receiptStatus!: 'pending' | 'ok' | 'error' | 'expired' | null;
  @Column({ name: 'receipt_error', type: 'varchar', length: 64, nullable: true }) receiptError!: string | null;
  @Column({ name: 'receipt_checked_at', type: 'timestamptz', nullable: true }) receiptCheckedAt!: Date | null;
  @Column({ name: 'last_error', type: 'varchar', length: 64, nullable: true }) lastError!: string | null;
  @Column({ name: 'created_at', type: 'timestamptz', insert: false, update: false }) createdAt!: Date;
}
