import { Check, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { VersionedEntity } from '../../database/base/entities';
import { TeamEntity } from '../../teams/entities/team.entity';
import { UserEntity } from '../../users/entities/user.entity';

@Entity({ name: 'events' })
@Index('idx_events_owner_starts', ['ownerUserId', 'startsAt'], { where: 'deleted_at IS NULL' })
@Index('idx_events_team_starts', ['teamId', 'startsAt'], { where: 'deleted_at IS NULL' })
@Check('ck_events_single_owner', '(owner_user_id IS NOT NULL AND team_id IS NULL) OR (owner_user_id IS NULL AND team_id IS NOT NULL)')
@Check('ck_events_date_range', 'ends_at IS NULL OR ends_at >= starts_at')
@Check('ck_events_kind', `kind IN ('EVENT', 'APPOINTMENT', 'BIRTHDAY', 'ANNIVERSARY', 'DEADLINE')`)
export class EventEntity extends VersionedEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ type: 'text', nullable: true })
  location!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'EVENT' })
  kind!: 'EVENT' | 'APPOINTMENT' | 'BIRTHDAY' | 'ANNIVERSARY' | 'DEADLINE';

  @Column({ name: 'starts_at', type: 'timestamptz' })
  startsAt!: Date;

  @Column({ name: 'ends_at', type: 'timestamptz', nullable: true })
  endsAt!: Date | null;

  @Column({ type: 'varchar', length: 64, default: 'UTC' })
  timezone!: string;

  @Column({ name: 'all_day', type: 'boolean', default: false })
  allDay!: boolean;

  @Column({ name: 'owner_user_id', type: 'uuid', nullable: true })
  ownerUserId!: string | null;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'owner_user_id', foreignKeyConstraintName: 'fk_events_owner' })
  ownerUser!: UserEntity | null;

  @Column({ name: 'team_id', type: 'uuid', nullable: true })
  teamId!: string | null;

  @ManyToOne(() => TeamEntity, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'team_id', foreignKeyConstraintName: 'fk_events_team' })
  team!: TeamEntity | null;
}
