import { Check, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { AuditedTimestampEntity } from '../../database/base/entities';
import { EventEntity } from './event.entity';
import { UserEntity } from '../../users/entities/user.entity';

@Entity({ name: 'event_participants' })
@Index('idx_event_participants_user_event', ['userId', 'eventId'])
@Check('ck_event_participants_rsvp', `rsvp IS NULL OR rsvp IN ('GOING', 'NOT_GOING', 'MAYBE')`)
@Check('ck_event_participants_responded', '(rsvp IS NULL AND responded_at IS NULL) OR (rsvp IS NOT NULL AND responded_at IS NOT NULL)')
export class EventParticipantEntity extends AuditedTimestampEntity {
  @PrimaryColumn({ name: 'event_id', type: 'uuid' })
  eventId!: string;

  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => EventEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id', foreignKeyConstraintName: 'fk_event_participants_event' })
  event!: EventEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'fk_event_participants_user' })
  user!: UserEntity;

  @Column({ type: 'varchar', length: 16, nullable: true })
  rsvp!: 'GOING' | 'NOT_GOING' | 'MAYBE' | null;

  @Column({ name: 'responded_at', type: 'timestamptz', nullable: true })
  respondedAt!: Date | null;
}
