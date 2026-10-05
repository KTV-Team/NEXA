import { Check, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { AuditedTimestampEntity } from '../../database/base/entities';
import { TeamEntity } from './team.entity';
import { UserEntity } from '../../users/entities/user.entity';
import type { TeamRole } from '@nexa/types';

@Entity({ name: 'team_members' })
@Index('uq_team_members_one_owner', ['teamId'], { unique: true, where: `role = 'OWNER'` })
@Index('idx_team_members_user_team', ['userId', 'teamId'])
@Check('ck_team_members_role', `role IN ('OWNER', 'ADMIN', 'MEMBER')`)
export class TeamMemberEntity extends AuditedTimestampEntity {
  @PrimaryColumn({ name: 'team_id', type: 'uuid' })
  teamId!: string;

  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => TeamEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_id', foreignKeyConstraintName: 'fk_team_members_team' })
  team!: TeamEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'fk_team_members_user' })
  user!: UserEntity;

  @Column({ type: 'varchar', length: 16 })
  role!: TeamRole;
}
