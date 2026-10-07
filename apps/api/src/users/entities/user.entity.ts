import { Check, Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { SoftDeletableEntity } from '../../database/base/entities';
import type { SystemRole } from '@nexa/types';

@Entity({ name: 'users' })
@Index('uq_users_email', ['email'], { unique: true })
@Check('ck_users_email_normalized', 'email = lower(btrim(email))')
@Check('ck_users_system_role', `system_role IN ('USER', 'ADMIN', 'SUPER_ADMIN')`)
export class UserEntity extends SoftDeletableEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 254 })
  email!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl!: string | null;

  @Column({ name: 'system_role', type: 'varchar', length: 20, default: 'USER' })
  systemRole!: SystemRole;
}
