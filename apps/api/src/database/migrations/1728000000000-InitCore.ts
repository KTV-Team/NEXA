import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitCore1728000000000 implements MigrationInterface {
  name = 'InitCore1728000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email varchar(254) NOT NULL,
        name varchar(100) NOT NULL,
        avatar_url text,
        system_role varchar(20) NOT NULL DEFAULT 'USER',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        created_by uuid,
        updated_by uuid,
        deleted_at timestamptz,
        deleted_by uuid,
        CONSTRAINT ck_users_email_normalized CHECK (email = lower(btrim(email))),
        CONSTRAINT ck_users_system_role CHECK (system_role IN ('USER', 'ADMIN', 'SUPER_ADMIN'))
      )`);
    await queryRunner.query(`CREATE UNIQUE INDEX uq_users_email ON users(email)`);
    await queryRunner.query(`
      ALTER TABLE users
        ADD CONSTRAINT fk_audit_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        ADD CONSTRAINT fk_audit_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
        ADD CONSTRAINT fk_audit_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL`);

    await queryRunner.query(`
      CREATE TABLE auth_accounts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL,
        provider varchar(32) NOT NULL,
        provider_subject varchar(255) NOT NULL,
        password_hash text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_auth_accounts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT ck_auth_accounts_password_hash CHECK ((provider = 'password' AND password_hash IS NOT NULL) OR (provider <> 'password' AND password_hash IS NULL))
      )`);
    await queryRunner.query(`CREATE UNIQUE INDEX uq_auth_accounts_provider_subject ON auth_accounts(provider, provider_subject)`);
    await queryRunner.query(`CREATE UNIQUE INDEX uq_auth_accounts_user_provider ON auth_accounts(user_id, provider)`);

    await queryRunner.query(`
      CREATE TABLE teams (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(100) NOT NULL,
        version integer NOT NULL DEFAULT 1,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        created_by uuid,
        updated_by uuid,
        deleted_at timestamptz,
        deleted_by uuid,
        CONSTRAINT fk_audit_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_audit_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_audit_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL
      )`);

    await queryRunner.query(`
      CREATE TABLE team_members (
        team_id uuid NOT NULL,
        user_id uuid NOT NULL,
        role varchar(16) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        created_by uuid,
        updated_by uuid,
        CONSTRAINT pk_team_members PRIMARY KEY (team_id, user_id),
        CONSTRAINT fk_team_members_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
        CONSTRAINT fk_team_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
        CONSTRAINT fk_audit_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_audit_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT ck_team_members_role CHECK (role IN ('OWNER', 'ADMIN', 'MEMBER'))
      )`);
    await queryRunner.query(`CREATE UNIQUE INDEX uq_team_members_one_owner ON team_members(team_id) WHERE role = 'OWNER'`);
    await queryRunner.query(`CREATE INDEX idx_team_members_user_team ON team_members(user_id, team_id)`);

    await queryRunner.query(`
      CREATE TABLE todo_lists (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(120) NOT NULL,
        owner_user_id uuid,
        team_id uuid,
        version integer NOT NULL DEFAULT 1,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        created_by uuid,
        updated_by uuid,
        deleted_at timestamptz,
        deleted_by uuid,
        CONSTRAINT fk_todo_lists_owner FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE RESTRICT,
        CONSTRAINT fk_todo_lists_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE RESTRICT,
        CONSTRAINT fk_audit_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_audit_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_audit_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT ck_todo_lists_single_owner CHECK ((owner_user_id IS NOT NULL AND team_id IS NULL) OR (owner_user_id IS NULL AND team_id IS NOT NULL))
      )`);
    await queryRunner.query(`CREATE INDEX idx_todo_lists_owner_created ON todo_lists(owner_user_id, created_at) WHERE deleted_at IS NULL`);
    await queryRunner.query(`CREATE INDEX idx_todo_lists_team_created ON todo_lists(team_id, created_at) WHERE deleted_at IS NULL`);

    await queryRunner.query(`
      CREATE TABLE todo_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        list_id uuid NOT NULL,
        title varchar(200) NOT NULL,
        note text,
        due_at timestamptz,
        priority varchar(16) NOT NULL DEFAULT 'NORMAL',
        completed_at timestamptz,
        position integer NOT NULL DEFAULT 0,
        version integer NOT NULL DEFAULT 1,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        created_by uuid,
        updated_by uuid,
        deleted_at timestamptz,
        deleted_by uuid,
        CONSTRAINT fk_todo_items_list FOREIGN KEY (list_id) REFERENCES todo_lists(id) ON DELETE CASCADE,
        CONSTRAINT fk_audit_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_audit_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_audit_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT ck_todo_items_priority CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
        CONSTRAINT ck_todo_items_position CHECK (position >= 0)
      )`);
    await queryRunner.query(`CREATE INDEX idx_todo_items_list_position ON todo_items(list_id, position, id) WHERE deleted_at IS NULL`);
    await queryRunner.query(`CREATE INDEX idx_todo_items_open_due ON todo_items(due_at, list_id) WHERE deleted_at IS NULL AND completed_at IS NULL AND due_at IS NOT NULL`);

    await queryRunner.query(`
      CREATE TABLE events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        title varchar(200) NOT NULL,
        note text,
        location text,
        kind varchar(20) NOT NULL DEFAULT 'EVENT',
        starts_at timestamptz NOT NULL,
        ends_at timestamptz,
        timezone varchar(64) NOT NULL DEFAULT 'UTC',
        all_day boolean NOT NULL DEFAULT false,
        owner_user_id uuid,
        team_id uuid,
        version integer NOT NULL DEFAULT 1,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        created_by uuid,
        updated_by uuid,
        deleted_at timestamptz,
        deleted_by uuid,
        CONSTRAINT fk_events_owner FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE RESTRICT,
        CONSTRAINT fk_events_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE RESTRICT,
        CONSTRAINT fk_audit_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_audit_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_audit_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT ck_events_single_owner CHECK ((owner_user_id IS NOT NULL AND team_id IS NULL) OR (owner_user_id IS NULL AND team_id IS NOT NULL)),
        CONSTRAINT ck_events_date_range CHECK (ends_at IS NULL OR ends_at >= starts_at),
        CONSTRAINT ck_events_kind CHECK (kind IN ('EVENT', 'APPOINTMENT', 'BIRTHDAY', 'ANNIVERSARY', 'DEADLINE'))
      )`);
    await queryRunner.query(`CREATE INDEX idx_events_owner_starts ON events(owner_user_id, starts_at) WHERE deleted_at IS NULL`);
    await queryRunner.query(`CREATE INDEX idx_events_team_starts ON events(team_id, starts_at) WHERE deleted_at IS NULL`);

    await queryRunner.query(`
      CREATE TABLE event_participants (
        event_id uuid NOT NULL,
        user_id uuid NOT NULL,
        rsvp varchar(16),
        responded_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        created_by uuid,
        updated_by uuid,
        CONSTRAINT pk_event_participants PRIMARY KEY (event_id, user_id),
        CONSTRAINT fk_event_participants_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
        CONSTRAINT fk_event_participants_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_audit_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_audit_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT ck_event_participants_rsvp CHECK (rsvp IS NULL OR rsvp IN ('GOING', 'NOT_GOING', 'MAYBE')),
        CONSTRAINT ck_event_participants_responded CHECK ((rsvp IS NULL AND responded_at IS NULL) OR (rsvp IS NOT NULL AND responded_at IS NOT NULL))
      )`);
    await queryRunner.query(`CREATE INDEX idx_event_participants_user_event ON event_participants(user_id, event_id)`);

    await queryRunner.query(`
      CREATE TABLE notifications (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        title varchar(200) NOT NULL,
        body text NOT NULL,
        status varchar(16) NOT NULL DEFAULT 'DRAFT',
        scheduled_at timestamptz,
        sent_at timestamptz,
        cancelled_at timestamptz,
        target_team_id uuid,
        event_id uuid,
        version integer NOT NULL DEFAULT 1,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        created_by uuid,
        updated_by uuid,
        deleted_at timestamptz,
        deleted_by uuid,
        CONSTRAINT fk_notifications_team FOREIGN KEY (target_team_id) REFERENCES teams(id) ON DELETE RESTRICT,
        CONSTRAINT fk_notifications_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE RESTRICT,
        CONSTRAINT fk_audit_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_audit_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_audit_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT ck_notifications_status CHECK (status IN ('DRAFT', 'SCHEDULED', 'SENT', 'CANCELLED')),
        CONSTRAINT ck_notifications_scheduled_at CHECK (status <> 'SCHEDULED' OR scheduled_at IS NOT NULL),
        CONSTRAINT ck_notifications_sent_at CHECK ((status = 'SENT' AND sent_at IS NOT NULL) OR (status <> 'SENT' AND sent_at IS NULL)),
        CONSTRAINT ck_notifications_cancelled_at CHECK ((status = 'CANCELLED' AND cancelled_at IS NOT NULL) OR (status <> 'CANCELLED' AND cancelled_at IS NULL))
      )`);
    await queryRunner.query(`CREATE INDEX idx_notifications_scheduled ON notifications(scheduled_at, id) WHERE deleted_at IS NULL AND status = 'SCHEDULED'`);
    await queryRunner.query(`CREATE INDEX idx_notifications_team_created ON notifications(target_team_id, created_at) WHERE deleted_at IS NULL AND target_team_id IS NOT NULL`);

    await queryRunner.query(`
      CREATE TABLE notification_recipients (
        notification_id uuid NOT NULL,
        user_id uuid NOT NULL,
        read_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        created_by uuid,
        updated_by uuid,
        CONSTRAINT pk_notification_recipients PRIMARY KEY (notification_id, user_id),
        CONSTRAINT fk_notification_recipients_notification FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE,
        CONSTRAINT fk_notification_recipients_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_audit_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_audit_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
      )`);
    await queryRunner.query(`CREATE INDEX idx_notification_recipients_unread ON notification_recipients(user_id, created_at, notification_id) WHERE read_at IS NULL`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of [
      'notification_recipients',
      'notifications',
      'event_participants',
      'events',
      'todo_items',
      'todo_lists',
      'team_members',
      'teams',
      'auth_accounts',
      'users',
    ]) {
      await queryRunner.query(`DROP TABLE ${table}`);
    }
  }
}
