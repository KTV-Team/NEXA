import { Check, Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import type { AuthClientType } from '@nexa/types';

@Entity({ name: 'auth_sessions' })
@Index('idx_auth_sessions_user', ['userId'])
@Index('uq_auth_sessions_refresh_hash', ['refreshTokenHash'], { unique: true })
@Check('ck_auth_sessions_client_type', "client_type IN ('mobile', 'web')")
export class AuthSessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'client_type', type: 'varchar', length: 8 })
  clientType!: AuthClientType;

  @Column({ name: 'refresh_token_hash', type: 'char', length: 64 })
  refreshTokenHash!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;
}
