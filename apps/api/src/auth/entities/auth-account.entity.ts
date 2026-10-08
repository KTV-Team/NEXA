import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TimestampEntity } from '../../database/base/entities';
import { UserEntity } from '../../users/entities/user.entity';

@Entity({ name: 'auth_accounts' })
@Index('uq_auth_accounts_provider_subject', ['provider', 'providerSubject'], { unique: true })
@Index('uq_auth_accounts_user_provider', ['userId', 'provider'], { unique: true })
@Check(
  'ck_auth_accounts_password_hash',
  "(provider = 'password' AND password_hash IS NOT NULL) OR (provider <> 'password' AND password_hash IS NULL)",
)
export class AuthAccountEntity extends TimestampEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'fk_auth_accounts_user' })
  user!: UserEntity;

  @Column({ type: 'varchar', length: 32 })
  provider!: string;

  @Column({ name: 'provider_subject', type: 'varchar', length: 255 })
  providerSubject!: string;

  @Column({ name: 'password_hash', type: 'text', nullable: true, select: false })
  passwordHash!: string | null;
}
