import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { AuditedTimestampEntity } from '../../database/base/entities';
import { NotificationEntity } from './notification.entity';
import { UserEntity } from '../../users/entities/user.entity';

@Entity({ name: 'notification_recipients' })
@Index('idx_notification_recipients_unread', ['userId', 'createdAt', 'notificationId'], { where: 'read_at IS NULL' })
export class NotificationRecipientEntity extends AuditedTimestampEntity {
  @PrimaryColumn({ name: 'notification_id', type: 'uuid' })
  notificationId!: string;

  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => NotificationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'notification_id', foreignKeyConstraintName: 'fk_notification_recipients_notification' })
  notification!: NotificationEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'fk_notification_recipients_user' })
  user!: UserEntity;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt!: Date | null;
}
