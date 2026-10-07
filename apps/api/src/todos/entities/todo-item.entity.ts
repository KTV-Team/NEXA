import { Check, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { VersionedEntity } from '../../database/base/entities';
import { TodoListEntity } from './todo-list.entity';

@Entity({ name: 'todo_items' })
@Index('idx_todo_items_list_position', ['listId', 'position', 'id'], { where: 'deleted_at IS NULL' })
@Index('idx_todo_items_open_due', ['dueAt', 'listId'], { where: 'deleted_at IS NULL AND completed_at IS NULL AND due_at IS NOT NULL' })
@Check('ck_todo_items_priority', `priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')`)
@Check('ck_todo_items_position', 'position >= 0')
export class TodoItemEntity extends VersionedEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'list_id', type: 'uuid' })
  listId!: string;

  @ManyToOne(() => TodoListEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'list_id', foreignKeyConstraintName: 'fk_todo_items_list' })
  list!: TodoListEntity;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ name: 'due_at', type: 'timestamptz', nullable: true })
  dueAt!: Date | null;

  @Column({ type: 'varchar', length: 16, default: 'NORMAL' })
  priority!: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @Column({ type: 'integer', default: 0 })
  position!: number;
}
