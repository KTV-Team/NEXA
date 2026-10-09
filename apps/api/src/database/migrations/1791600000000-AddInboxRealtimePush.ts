import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInboxRealtimePush1791600000000 implements MigrationInterface {
  name = 'AddInboxRealtimePush1791600000000';

  async up(q: QueryRunner): Promise<void> {
    await q.query('ALTER TABLE inbox_delivery_outbox RENAME TO inbox_event_outbox');
    await q.query(
      "ALTER TABLE inbox_event_outbox ADD COLUMN recipient_id uuid, ADD COLUMN kind varchar(16) NOT NULL DEFAULT 'created'",
    );
    await q.query(
      'UPDATE inbox_event_outbox e SET recipient_id=i.recipient_id FROM inbox_items i WHERE i.id=e.item_id',
    );
    await q.query(
      "DO $$ BEGIN IF EXISTS (SELECT 1 FROM inbox_event_outbox WHERE recipient_id IS NULL) THEN RAISE EXCEPTION 'Cannot backfill inbox event ownership'; END IF; END $$",
    );
    await q.query(
      'ALTER TABLE inbox_event_outbox ALTER COLUMN recipient_id SET NOT NULL, ALTER COLUMN item_id DROP NOT NULL, ALTER COLUMN occurrence_id DROP NOT NULL, DROP CONSTRAINT uq_inbox_delivery_outbox_occurrence',
    );
    await q.query(
      'ALTER TABLE inbox_event_outbox ADD CONSTRAINT fk_inbox_event_outbox_recipient FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE RESTRICT, ADD CONSTRAINT ck_inbox_event_outbox_kind CHECK (kind IN (\'created\',\'updated\',\'deleted\',\'resync\')), ADD CONSTRAINT ck_inbox_event_outbox_shape CHECK ((kind=\'created\' AND item_id IS NOT NULL AND occurrence_id IS NOT NULL) OR (kind IN (\'updated\',\'deleted\') AND item_id IS NOT NULL AND occurrence_id IS NULL) OR (kind=\'resync\' AND item_id IS NULL AND occurrence_id IS NULL))',
    );
    await q.query(
      'CREATE UNIQUE INDEX uq_inbox_event_outbox_occurrence ON inbox_event_outbox(occurrence_id) WHERE occurrence_id IS NOT NULL',
    );
    await q.query('ALTER INDEX idx_inbox_delivery_outbox_pending RENAME TO idx_inbox_event_outbox_pending');

    await q.query(`CREATE TABLE device_registrations (
      installation_id uuid PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      session_id uuid REFERENCES auth_sessions(id) ON DELETE SET NULL,
      platform varchar(8) NOT NULL,
      push_token varchar(512),
      permission_status varchar(16) NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT ck_device_registrations_platform CHECK (platform IN ('android','ios')),
      CONSTRAINT ck_device_registrations_permission CHECK (permission_status IN ('granted','provisional','denied','undetermined')),
      CONSTRAINT ck_device_registrations_token_permission CHECK (push_token IS NULL OR permission_status IN ('granted','provisional'))
    )`);
    await q.query(
      'CREATE UNIQUE INDEX uq_device_registrations_push_token ON device_registrations(push_token) WHERE push_token IS NOT NULL',
    );
    await q.query('CREATE INDEX idx_device_registrations_owner ON device_registrations(user_id,session_id)');

    await q.query(`CREATE TABLE inbox_push_jobs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      item_id uuid NOT NULL REFERENCES inbox_items(id) ON DELETE RESTRICT,
      installation_id uuid NOT NULL REFERENCES device_registrations(installation_id) ON DELETE RESTRICT,
      recipient_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      session_id uuid NOT NULL REFERENCES auth_sessions(id) ON DELETE RESTRICT,
      status varchar(16) NOT NULL DEFAULT 'pending',
      attempt_count integer NOT NULL DEFAULT 0,
      retry_at timestamptz,
      lease_until timestamptz,
      provider_message_id varchar(64),
      push_token_hash char(64),
      accepted_at timestamptz,
      receipt_status varchar(16),
      receipt_error varchar(64),
      receipt_checked_at timestamptz,
      last_error varchar(64),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT uq_inbox_push_jobs_item_installation UNIQUE (item_id,installation_id),
      CONSTRAINT ck_inbox_push_jobs_status CHECK (status IN ('pending','accepted','failed','skipped')),
      CONSTRAINT ck_inbox_push_jobs_attempt_count CHECK (attempt_count BETWEEN 0 AND 6),
      CONSTRAINT ck_inbox_push_jobs_receipt_status CHECK (receipt_status IS NULL OR receipt_status IN ('pending','ok','error','expired')),
      CONSTRAINT ck_inbox_push_jobs_lease CHECK ((lease_until IS NULL) OR status='pending'),
      CONSTRAINT ck_inbox_push_jobs_provider_receipt CHECK ((provider_message_id IS NULL AND receipt_status IS NULL) OR (provider_message_id IS NOT NULL AND status='accepted' AND receipt_status IS NOT NULL))
    )`);
    await q.query(
      "CREATE INDEX idx_inbox_push_jobs_due ON inbox_push_jobs(retry_at,created_at,id) WHERE status='pending'",
    );
    await q.query(
      "CREATE INDEX idx_inbox_push_jobs_receipts ON inbox_push_jobs(accepted_at,id) WHERE status='accepted' AND receipt_status='pending'",
    );
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM device_registrations)
        OR EXISTS (SELECT 1 FROM inbox_push_jobs)
        OR EXISTS (SELECT 1 FROM inbox_event_outbox WHERE kind <> 'created') THEN
        RAISE EXCEPTION 'Cannot revert inbox realtime/push while device, push-job, or mutation-event data exists';
      END IF;
    END $$`);
    await q.query('DROP TABLE inbox_push_jobs');
    await q.query('DROP TABLE device_registrations');
    await q.query('ALTER INDEX idx_inbox_event_outbox_pending RENAME TO idx_inbox_delivery_outbox_pending');
    await q.query('DROP INDEX uq_inbox_event_outbox_occurrence');
    await q.query(
      'ALTER TABLE inbox_event_outbox DROP CONSTRAINT fk_inbox_event_outbox_recipient, DROP CONSTRAINT ck_inbox_event_outbox_kind, DROP CONSTRAINT ck_inbox_event_outbox_shape, ALTER COLUMN item_id SET NOT NULL, ALTER COLUMN occurrence_id SET NOT NULL, DROP COLUMN recipient_id, DROP COLUMN kind, ADD CONSTRAINT uq_inbox_delivery_outbox_occurrence UNIQUE (occurrence_id)',
    );
    await q.query('ALTER TABLE inbox_event_outbox RENAME TO inbox_delivery_outbox');
  }
}
