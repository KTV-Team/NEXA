import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'notification_occurrences' })
export class NotificationOccurrenceEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'notification_id', type: 'uuid' }) notificationId!: string;
  @Column({ name: 'scheduled_for', type: 'timestamptz' }) scheduledFor!: Date;
  @Column({ name: 'delivered_at', type: 'timestamptz', insert: false, update: false }) deliveredAt!: Date;
  @Column({ name: 'notification_version', type: 'integer' }) notificationVersion!: number;
}
