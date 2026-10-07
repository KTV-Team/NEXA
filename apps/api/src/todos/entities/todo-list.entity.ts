import { Check, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { VersionedEntity } from '../../database/base/entities';
import { TeamEntity } from '../../teams/entities/team.entity';
import { UserEntity } from '../../users/entities/user.entity';

@Entity({ name: 'todo_lists' })
@Index('idx_todo_lists_owner_created', ['ownerUserId', 'createdAt'], { where: 'deleted_at IS NULL' })
@Index('idx_todo_lists_team_created', ['teamId', 'createdAt'], { where: 'deleted_at IS NULL' })
@Check('ck_todo_lists_single_owner', '(owner_user_id IS NOT NULL AND team_id IS NULL) OR (owner_user_id IS NULL AND team_id IS NOT NULL)')
export class TodoListEntity extends VersionedEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ name: 'owner_user_id', type: 'uuid', nullable: true })
  ownerUserId!: string | null;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'owner_user_id', foreignKeyConstraintName: 'fk_todo_lists_owner' })
  ownerUser!: UserEntity | null;

  @Column({ name: 'team_id', type: 'uuid', nullable: true })
  teamId!: string | null;

  @ManyToOne(() => TeamEntity, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'team_id', foreignKeyConstraintName: 'fk_todo_lists_team' })
  team!: TeamEntity | null;
}
