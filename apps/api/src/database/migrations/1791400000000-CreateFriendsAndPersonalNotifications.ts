import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFriendsAndPersonalNotifications1791400000000 implements MigrationInterface {
  name = 'CreateFriendsAndPersonalNotifications1791400000000';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE friendships (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), low_user_id uuid NOT NULL, high_user_id uuid NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(), removed_at timestamptz,
      CONSTRAINT ck_friendships_order CHECK (low_user_id < high_user_id),
      CONSTRAINT fk_friendships_low FOREIGN KEY (low_user_id) REFERENCES users(id) ON DELETE RESTRICT,
      CONSTRAINT fk_friendships_high FOREIGN KEY (high_user_id) REFERENCES users(id) ON DELETE RESTRICT
    )`);
    await q.query(`CREATE UNIQUE INDEX uq_friendships_active_pair ON friendships(low_user_id, high_user_id) WHERE removed_at IS NULL`);
    await q.query(`CREATE INDEX idx_friendships_low ON friendships(low_user_id, created_at DESC) WHERE removed_at IS NULL`);
    await q.query(`CREATE INDEX idx_friendships_high ON friendships(high_user_id, created_at DESC) WHERE removed_at IS NULL`);
    await q.query(`CREATE TABLE friend_requests (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sender_id uuid NOT NULL, recipient_id uuid NOT NULL,
      status varchar(16) NOT NULL DEFAULT 'PENDING', friendship_id uuid,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT ck_friend_requests_pair CHECK (sender_id <> recipient_id),
      CONSTRAINT ck_friend_requests_status CHECK (status IN ('PENDING','ACCEPTED','REJECTED','CANCELLED')),
      CONSTRAINT fk_friend_requests_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE RESTRICT,
      CONSTRAINT fk_friend_requests_recipient FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE RESTRICT,
      CONSTRAINT fk_friend_requests_friendship FOREIGN KEY (friendship_id) REFERENCES friendships(id) ON DELETE RESTRICT
    )`);
    await q.query(`CREATE UNIQUE INDEX uq_friend_requests_pending_pair ON friend_requests(LEAST(sender_id, recipient_id), GREATEST(sender_id, recipient_id)) WHERE status = 'PENDING'`);
    await q.query(`CREATE INDEX idx_friend_requests_sender ON friend_requests(sender_id, status, created_at DESC, id DESC)`);
    await q.query(`CREATE INDEX idx_friend_requests_recipient ON friend_requests(recipient_id, status, created_at DESC, id DESC)`);
    await q.query(`CREATE TABLE personal_notifications (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sender_id uuid NOT NULL, recipient_id uuid NOT NULL,
      client_request_id uuid NOT NULL, payload_hash char(64) NOT NULL, title varchar(200) NOT NULL, body varchar(5000) NOT NULL,
      delivery jsonb NOT NULL, status varchar(16) NOT NULL, version integer NOT NULL DEFAULT 1,
      next_run_at timestamptz, last_delivered_at timestamptz, cancelled_at timestamptz, block_reason varchar(64), failure_code varchar(64),
      retry_count integer NOT NULL DEFAULT 0, retry_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT ck_personal_notifications_status CHECK (status IN ('SCHEDULED','ACTIVE','COMPLETED','CANCELLED','BLOCKED','FAILED')),
      CONSTRAINT ck_personal_notifications_version CHECK (version > 0),
      CONSTRAINT ck_personal_notifications_retry CHECK (retry_count >= 0),
      CONSTRAINT ck_personal_notifications_cancelled CHECK ((status = 'CANCELLED') = (cancelled_at IS NOT NULL)),
      CONSTRAINT ck_personal_notifications_next_run CHECK ((status IN ('SCHEDULED','ACTIVE') AND next_run_at IS NOT NULL) OR (status NOT IN ('SCHEDULED','ACTIVE') AND next_run_at IS NULL)),
      CONSTRAINT fk_personal_notifications_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE RESTRICT,
      CONSTRAINT fk_personal_notifications_recipient FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE RESTRICT,
      CONSTRAINT uq_personal_notifications_idempotency UNIQUE (sender_id, client_request_id)
    )`);
    await q.query(`CREATE INDEX idx_personal_notifications_sender ON personal_notifications(sender_id, created_at DESC, id DESC)`);
    await q.query(`CREATE INDEX idx_personal_notifications_due ON personal_notifications(next_run_at, retry_at, id) WHERE status IN ('SCHEDULED','ACTIVE')`);
    await q.query(`CREATE TABLE notification_occurrences (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), notification_id uuid NOT NULL, scheduled_for timestamptz NOT NULL,
      delivered_at timestamptz NOT NULL DEFAULT now(), notification_version integer NOT NULL,
      CONSTRAINT fk_occurrences_notification FOREIGN KEY (notification_id) REFERENCES personal_notifications(id) ON DELETE RESTRICT,
      CONSTRAINT uq_notification_occurrence UNIQUE (notification_id, scheduled_for)
    )`);
    await q.query(`CREATE TABLE inbox_items (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), occurrence_id uuid NOT NULL, recipient_id uuid NOT NULL,
      sender_id uuid NOT NULL, sender_name varchar(100) NOT NULL, sender_avatar_url text,
      title varchar(200) NOT NULL, body varchar(5000) NOT NULL, read_at timestamptz, deleted_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT fk_inbox_occurrence FOREIGN KEY (occurrence_id) REFERENCES notification_occurrences(id) ON DELETE RESTRICT,
      CONSTRAINT fk_inbox_recipient FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE RESTRICT,
      CONSTRAINT fk_inbox_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE RESTRICT,
      CONSTRAINT uq_inbox_occurrence_recipient UNIQUE (occurrence_id, recipient_id)
    )`);
    await q.query(`CREATE INDEX idx_inbox_owner_created ON inbox_items(recipient_id, created_at DESC, id DESC) WHERE deleted_at IS NULL`);
    await q.query(`CREATE INDEX idx_inbox_unread ON inbox_items(recipient_id, created_at DESC) WHERE deleted_at IS NULL AND read_at IS NULL`);
  }

  async down(q: QueryRunner): Promise<void> {
    for (const table of ['inbox_items','notification_occurrences','personal_notifications','friend_requests','friendships']) await q.query(`DROP TABLE ${table}`);
  }
}
