import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'inbox_event_outbox' })
export class InboxDeliveryOutboxEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'occurrence_id', type: 'uuid', nullable: true }) occurrenceId!: string | null;
  @Column({ name: 'item_id', type: 'uuid', nullable: true }) itemId!: string | null;
  @Column({ name: 'recipient_id', type: 'uuid' }) recipientId!: string;
  @Column({ type: 'varchar', length: 16 }) kind!: 'created' | 'updated' | 'deleted' | 'resync';
  @Column({ name: 'created_at', type: 'timestamptz', insert: false, update: false }) createdAt!: Date;
  @Column({ name: 'published_at', type: 'timestamptz', nullable: true }) publishedAt!: Date | null;
}
