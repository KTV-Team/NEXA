import { Check, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { VersionedEntity } from '../../database/base/entities';
import { EventEntity } from '../../events/entities/event.entity';
import { TeamEntity } from '../../teams/entities/team.entity';

@Entity({ name: 'notifications' })
@Index('idx_notifications_scheduled', ['scheduledAt', 'id'], { where: "deleted_at IS NULL AND status = 'SCHEDULED'" })
@Index('idx_notifications_team_created', ['targetTeamId', 'createdAt'], { where: 'deleted_at IS NULL AND target_team_id IS NOT NULL' })
@Check('ck_notifications_status', `status IN ('DRAFT', 'SCHEDULED', 'SENT', 'CANCELLED')`)
@Check('ck_notifications_scheduled_at', "status <> 'SCHEDULED' OR scheduled_at IS NOT NULL")
@Check('ck_notifications_sent_at', "(status = 'SENT' AND sent_at IS NOT NULL) OR (status <> 'SENT' AND sent_at IS NULL)")
@Check('ck_notifications_cancelled_at', "(status = 'CANCELLED' AND cancelled_at IS NOT NULL) OR (status <> 'CANCELLED' AND cancelled_at IS NULL)")
export class NotificationEntity extends VersionedEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text' })
  body!: string;

  @Column({ type: 'varchar', length: 16, default: 'DRAFT' })
  status!: 'DRAFT' | 'SCHEDULED' | 'SENT' | 'CANCELLED';

  @Column({ name: 'scheduled_at', type: 'timestamptz', nullable: true })
  scheduledAt!: Date | null;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt!: Date | null;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt!: Date | null;

  @Column({ name: 'target_team_id', type: 'uuid', nullable: true })
  targetTeamId!: string | null;

  @ManyToOne(() => TeamEntity, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'target_team_id', foreignKeyConstraintName: 'fk_notifications_team' })
  targetTeam!: TeamEntity | null;

  @Column({ name: 'event_id', type: 'uuid', nullable: true })
  eventId!: string | null;

  @ManyToOne(() => EventEntity, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'event_id', foreignKeyConstraintName: 'fk_notifications_event' })
  event!: EventEntity | null;
}
