import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'inbox_items' })
export class InboxItemEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'occurrence_id', type: 'uuid' }) occurrenceId!: string;
  @Column({ name: 'recipient_id', type: 'uuid' }) recipientId!: string;
  @Column({ name: 'sender_id', type: 'uuid' }) senderId!: string;
  @Column({ name: 'sender_name', type: 'varchar', length: 100 }) senderName!: string;
  @Column({ name: 'sender_avatar_url', type: 'text', nullable: true }) senderAvatarUrl!: string | null;
  @Column({ type: 'varchar', length: 200 }) title!: string;
  @Column({ type: 'varchar', length: 5000 }) body!: string;
  @Column({ name: 'read_at', type: 'timestamptz', nullable: true }) readAt!: Date | null;
  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true }) deletedAt!: Date | null;
  @Column({ name: 'created_at', type: 'timestamptz', insert: false, update: false }) createdAt!: Date;
  @Column({ name: 'updated_at', type: 'timestamptz', insert: false, update: false }) updatedAt!: Date;
}
