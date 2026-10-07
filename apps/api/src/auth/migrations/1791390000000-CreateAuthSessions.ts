import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuthSessions1791390000000 implements MigrationInterface {
  name = 'CreateAuthSessions1791390000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE auth_sessions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        client_type varchar(8) NOT NULL,
        refresh_token_hash char(64) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        expires_at timestamptz NOT NULL,
        revoked_at timestamptz,
        CONSTRAINT ck_auth_sessions_client_type CHECK (client_type IN ('mobile', 'web'))
      )
    `);
    await queryRunner.query(
      'CREATE UNIQUE INDEX uq_auth_sessions_refresh_hash ON auth_sessions(refresh_token_hash)',
    );
    await queryRunner.query('CREATE INDEX idx_auth_sessions_user ON auth_sessions(user_id)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE auth_sessions');
  }
}
