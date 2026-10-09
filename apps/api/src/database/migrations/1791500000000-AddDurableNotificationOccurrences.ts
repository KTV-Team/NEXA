import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDurableNotificationOccurrences1791500000000 implements MigrationInterface {
  name = 'AddDurableNotificationOccurrences1791500000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TABLE personal_notifications DROP CONSTRAINT ck_personal_notifications_status",
    );
    await queryRunner.query(
      "ALTER TABLE personal_notifications ADD CONSTRAINT ck_personal_notifications_status CHECK (status IN ('QUEUED','SCHEDULED','ACTIVE','COMPLETED','CANCELLED','BLOCKED','FAILED'))",
    );
    await queryRunner.query(
      'ALTER TABLE personal_notifications DROP CONSTRAINT ck_personal_notifications_next_run',
    );
    await queryRunner.query(
      "ALTER TABLE personal_notifications ADD CONSTRAINT ck_personal_notifications_next_run CHECK ((status IN ('QUEUED','SCHEDULED','ACTIVE') AND next_run_at IS NOT NULL) OR (status NOT IN ('QUEUED','SCHEDULED','ACTIVE') AND next_run_at IS NULL))",
    );
    await queryRunner.query('DROP INDEX idx_personal_notifications_due');
    await queryRunner.query(
      "CREATE INDEX idx_personal_notifications_due ON personal_notifications(next_run_at,retry_at,id) WHERE status IN ('QUEUED','SCHEDULED','ACTIVE')",
    );

    await queryRunner.query(
      "ALTER TABLE notification_occurrences ADD COLUMN status varchar(16) NOT NULL DEFAULT 'pending', ADD COLUMN attempt_count integer NOT NULL DEFAULT 0, ADD COLUMN retry_at timestamptz, ADD COLUMN lease_until timestamptz, ADD COLUMN claim_token uuid, ADD COLUMN last_error varchar(64), ADD COLUMN payload_title varchar(200), ADD COLUMN payload_body varchar(5000)",
    );
    await queryRunner.query('ALTER TABLE notification_occurrences ALTER COLUMN delivered_at DROP NOT NULL');
    await queryRunner.query(
      "DO $$ BEGIN IF EXISTS (SELECT 1 FROM notification_occurrences o LEFT JOIN inbox_items i ON i.occurrence_id=o.id WHERE i.id IS NULL) THEN RAISE EXCEPTION 'Cannot migrate orphan notification occurrences without inbox snapshots'; END IF; END $$",
    );
    await queryRunner.query(
      "UPDATE notification_occurrences o SET status='persisted',payload_title=i.title,payload_body=i.body,delivered_at=i.created_at FROM inbox_items i WHERE i.occurrence_id=o.id",
    );
    await queryRunner.query(
      'ALTER TABLE notification_occurrences ALTER COLUMN payload_title SET NOT NULL, ALTER COLUMN payload_body SET NOT NULL',
    );
    await queryRunner.query(
      "ALTER TABLE notification_occurrences ADD CONSTRAINT ck_notification_occurrences_status CHECK (status IN ('pending','processing','persisted','failed')), ADD CONSTRAINT ck_notification_occurrences_attempt_count CHECK (attempt_count >= 0), ADD CONSTRAINT ck_notification_occurrences_lease CHECK ((status='processing') = (claim_token IS NOT NULL AND lease_until IS NOT NULL))",
    );
    await queryRunner.query(
      "CREATE INDEX idx_notification_occurrences_due ON notification_occurrences(status,retry_at,lease_until,scheduled_for) WHERE status IN ('pending','processing')",
    );

    await queryRunner.query(`
      CREATE TABLE inbox_delivery_outbox (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        occurrence_id uuid NOT NULL,
        item_id uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        published_at timestamptz,
        CONSTRAINT fk_inbox_delivery_outbox_occurrence FOREIGN KEY (occurrence_id) REFERENCES notification_occurrences(id) ON DELETE RESTRICT,
        CONSTRAINT fk_inbox_delivery_outbox_item FOREIGN KEY (item_id) REFERENCES inbox_items(id) ON DELETE RESTRICT,
        CONSTRAINT uq_inbox_delivery_outbox_occurrence UNIQUE (occurrence_id)
      )
    `);
    await queryRunner.query(
      'CREATE INDEX idx_inbox_delivery_outbox_pending ON inbox_delivery_outbox(created_at,id) WHERE published_at IS NULL',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "DO $$ BEGIN IF EXISTS (SELECT 1 FROM personal_notifications WHERE status='QUEUED') OR EXISTS (SELECT 1 FROM notification_occurrences WHERE status<>'persisted' OR delivered_at IS NULL) OR EXISTS (SELECT 1 FROM inbox_delivery_outbox WHERE published_at IS NULL) THEN RAISE EXCEPTION 'Drain notification work and pending outbox rows before reverting durable notification migration'; END IF; END $$",
    );
    await queryRunner.query('DROP TABLE inbox_delivery_outbox');
    await queryRunner.query('DROP INDEX idx_notification_occurrences_due');
    await queryRunner.query(
      'ALTER TABLE notification_occurrences DROP CONSTRAINT ck_notification_occurrences_status, DROP CONSTRAINT ck_notification_occurrences_attempt_count, DROP CONSTRAINT ck_notification_occurrences_lease, DROP COLUMN status, DROP COLUMN attempt_count, DROP COLUMN retry_at, DROP COLUMN lease_until, DROP COLUMN claim_token, DROP COLUMN last_error, DROP COLUMN payload_title, DROP COLUMN payload_body',
    );
    await queryRunner.query('ALTER TABLE notification_occurrences ALTER COLUMN delivered_at SET NOT NULL');
    await queryRunner.query('DROP INDEX idx_personal_notifications_due');
    await queryRunner.query(
      "ALTER TABLE personal_notifications DROP CONSTRAINT ck_personal_notifications_next_run, DROP CONSTRAINT ck_personal_notifications_status",
    );
    await queryRunner.query(
      "ALTER TABLE personal_notifications ADD CONSTRAINT ck_personal_notifications_status CHECK (status IN ('SCHEDULED','ACTIVE','COMPLETED','CANCELLED','BLOCKED','FAILED'))",
    );
    await queryRunner.query(
      "ALTER TABLE personal_notifications ADD CONSTRAINT ck_personal_notifications_next_run CHECK ((status IN ('SCHEDULED','ACTIVE') AND next_run_at IS NOT NULL) OR (status NOT IN ('SCHEDULED','ACTIVE') AND next_run_at IS NULL))",
    );
    await queryRunner.query(
      'CREATE INDEX idx_personal_notifications_due ON personal_notifications(next_run_at,retry_at,id) WHERE status IN (\'SCHEDULED\',\'ACTIVE\')',
    );
  }
}
