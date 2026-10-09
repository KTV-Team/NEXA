import { createHash } from 'node:crypto';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { appEnvironment } from '../config/environment';
import { ExpoPushService, ExpoRequestError, type ExpoMessage } from './expo-push.service';

interface ClaimedJob {
  id: string;
  item_id: string;
  installation_id: string;
  recipient_id: string;
  session_id: string;
  attempt_count: number;
  lease_until: Date;
  push_token: string | null;
  push_token_hash: string | null;
  device_user_id: string | null;
  device_session_id: string | null;
  permission_status: string | null;
  title: string | null;
  body: string | null;
  occurrence_id: string | null;
  deleted_at: Date | null;
  session_active: boolean;
  user_active: boolean;
}

const retrySeconds = [5, 15, 45, 135, 405];
export function pushRetryDelayMs(attemptCount: number, random = Math.random()): number | null {
  const seconds = retrySeconds[attemptCount - 1];
  if (!seconds) return null;
  return Math.round(seconds * (0.8 + random * 0.4) * 1000);
}

@Injectable()
export class InboxDeliveryWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InboxDeliveryWorker.name);
  private timer?: NodeJS.Timeout;
  private running?: Promise<void>;

  constructor(
    private readonly db: DataSource,
    private readonly push: ExpoPushService,
  ) {}

  onModuleInit(): void {
    if (!appEnvironment.NOTIFICATION_WORKER_ENABLED) return;
    void this.tick();
    this.timer = setInterval(() => void this.tick(), 1000);
    this.timer.unref();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    await this.running;
  }

  async tick(): Promise<void> {
    if (this.running) return this.running;
    this.running = this.dispatchEvents()
      .then(() => this.sendPendingPushes())
      .then(() => this.checkReceipts())
      .catch(() => this.logger.warn('Inbox delivery worker cycle failed; it will retry on the next poll.'))
      .finally(() => { this.running = undefined; });
    return this.running;
  }

  private async dispatchEvents(): Promise<void> {
    const q = this.db.createQueryRunner();
    try {
      await q.connect();
      await q.startTransaction();
      const events = await q.query(
        'SELECT id,recipient_id,kind,item_id FROM inbox_event_outbox WHERE published_at IS NULL ORDER BY created_at,id LIMIT 50 FOR UPDATE SKIP LOCKED',
      );
      for (const event of events as Array<{ id: string; recipient_id: string; kind: string; item_id: string | null }>) {
        if (event.kind === 'created' && event.item_id) {
          await q.query(
            `INSERT INTO inbox_push_jobs(item_id,installation_id,recipient_id,session_id)
             SELECT i.id,d.installation_id,d.user_id,d.session_id
             FROM inbox_items i
             JOIN device_registrations d ON d.user_id=i.recipient_id AND d.session_id IS NOT NULL
               AND d.push_token IS NOT NULL AND d.permission_status IN ('granted','provisional')
             JOIN auth_sessions s ON s.id=d.session_id AND s.user_id=d.user_id AND s.revoked_at IS NULL AND s.expires_at>now()
             JOIN users u ON u.id=d.user_id AND u.deleted_at IS NULL
             WHERE i.id=$1 AND i.recipient_id=$2 AND i.deleted_at IS NULL
             ON CONFLICT (item_id,installation_id) DO NOTHING`,
            [event.item_id, event.recipient_id],
          );
        }
        await q.query("SELECT pg_notify('nexa_inbox_events',$1)", [event.id]);
        await q.query('UPDATE inbox_event_outbox SET published_at=now() WHERE id=$1', [event.id]);
      }
      await q.commitTransaction();
    } catch (failure) {
      if (q.isTransactionActive) await q.rollbackTransaction();
      throw failure;
    } finally {
      await q.release();
    }
  }

  private async claimPushJobs(): Promise<ClaimedJob[]> {
    const q = this.db.createQueryRunner();
    try {
      await q.connect();
      await q.startTransaction();
      const candidates = await q.query(
        `SELECT id FROM inbox_push_jobs WHERE status='pending' AND (retry_at IS NULL OR retry_at<=now())
         AND (lease_until IS NULL OR lease_until<=now()) ORDER BY COALESCE(retry_at,created_at),id
         LIMIT 50 FOR UPDATE SKIP LOCKED`,
      ) as Array<{ id: string }>;
      if (!candidates.length) {
        await q.commitTransaction();
        return [];
      }
      const ids = candidates.map((row) => row.id);
      const leaseUntil = new Date(Date.now() + 60_000);
      await q.query(
        `UPDATE inbox_push_jobs SET attempt_count=attempt_count+1,lease_until=$2,updated_at=now()
         WHERE id=ANY($1::uuid[])`,
        [ids, leaseUntil],
      );
      const jobs = await q.query(
        `SELECT j.id,j.item_id,j.installation_id,j.recipient_id,j.session_id,j.attempt_count,j.lease_until,j.push_token_hash,
           d.push_token,d.user_id AS device_user_id,d.session_id AS device_session_id,d.permission_status,
           i.title,i.body,i.occurrence_id,i.deleted_at,
           (s.id IS NOT NULL AND s.revoked_at IS NULL AND s.expires_at>now()) AS session_active,
           (u.id IS NOT NULL AND u.deleted_at IS NULL) AS user_active
         FROM inbox_push_jobs j
         LEFT JOIN device_registrations d ON d.installation_id=j.installation_id
         LEFT JOIN inbox_items i ON i.id=j.item_id AND i.recipient_id=j.recipient_id
         LEFT JOIN auth_sessions s ON s.id=j.session_id AND s.user_id=j.recipient_id
         LEFT JOIN users u ON u.id=j.recipient_id
         WHERE j.id=ANY($1::uuid[])`,
        [ids],
      ) as ClaimedJob[];
      for (const job of jobs) {
        const tokenHash = job.push_token
          ? createHash('sha256').update(job.push_token).digest('hex')
          : null;
        await q.query('UPDATE inbox_push_jobs SET push_token_hash=$2 WHERE id=$1', [job.id, tokenHash]);
        job.push_token_hash = tokenHash;
      }
      await q.commitTransaction();
      return jobs;
    } catch (failure) {
      if (q.isTransactionActive) await q.rollbackTransaction();
      throw failure;
    } finally {
      await q.release();
    }
  }

  private async sendPendingPushes(): Promise<void> {
    const jobs = await this.claimPushJobs();
    if (!jobs.length) return;
    const eligible: Array<{ job: ClaimedJob; message: ExpoMessage }> = [];
    for (const job of jobs) {
      const sessionMatches = job.device_user_id === job.recipient_id && job.device_session_id === job.session_id;
      if (!job.user_active || !job.session_active || !sessionMatches || !job.push_token ||
          !['granted', 'provisional'].includes(job.permission_status ?? '') || !job.title ||
          !job.body || !job.occurrence_id || job.deleted_at) {
        await this.finishJob(job, 'skipped', 'DEVICE_OR_ITEM_UNAVAILABLE');
        continue;
      }
      eligible.push({ job, message: this.push.message({
        token: job.push_token, title: job.title, body: job.body,
        itemId: job.item_id, occurrenceId: job.occurrence_id,
      }) });
    }
    if (!eligible.length) return;
    try {
      const tickets = await this.push.send(eligible.map((entry) => entry.message));
      for (let index = 0; index < eligible.length; index++) {
        const entry = eligible[index];
        const ticket = tickets[index];
        if (!entry || !ticket) {
          if (entry) await this.retryJob(entry.job, 'EXPO_BAD_RESPONSE');
        } else if (ticket.status === 'ok') {
          await this.acceptJob(entry.job, ticket.id);
        } else if (ticket.code === 'DeviceNotRegistered') {
          await this.disableToken(entry.job, entry.message.to);
          await this.finishJob(entry.job, 'skipped', ticket.code);
        } else if (ticket.retryable) {
          await this.retryJob(entry.job, ticket.code);
        } else {
          await this.finishJob(entry.job, 'failed', ticket.code);
        }
      }
    } catch (failure) {
      const code = failure instanceof ExpoRequestError ? failure.code : 'EXPO_REQUEST_FAILED';
      const retryable = failure instanceof ExpoRequestError ? failure.retryable : true;
      for (const { job } of eligible) {
        if (retryable) await this.retryJob(job, code);
        else await this.finishJob(job, 'failed', code);
      }
    }
  }

  private async retryJob(job: ClaimedJob, code: string): Promise<void> {
    const delay = pushRetryDelayMs(job.attempt_count);
    if (delay === null) {
      await this.finishJob(job, 'failed', code);
      return;
    }
    await this.db.query(
      `UPDATE inbox_push_jobs SET status='pending',retry_at=now()+($3::int * interval '1 millisecond'),lease_until=NULL,push_token_hash=NULL,last_error=$4,updated_at=now()
       WHERE id=$1 AND status='pending' AND lease_until=$2`,
      [job.id, job.lease_until, delay, code],
    );
  }

  private async finishJob(job: ClaimedJob, status: 'failed' | 'skipped', code: string): Promise<void> {
    await this.db.query(
      `UPDATE inbox_push_jobs SET status=$3,lease_until=NULL,retry_at=NULL,push_token_hash=NULL,last_error=$4,updated_at=now()
       WHERE id=$1 AND status='pending' AND lease_until=$2`,
      [job.id, job.lease_until, status, code],
    );
  }

  private async acceptJob(job: ClaimedJob, ticketId: string): Promise<void> {
    await this.db.query(
      `UPDATE inbox_push_jobs SET status='accepted',provider_message_id=$3,accepted_at=now(),receipt_status='pending',
       lease_until=NULL,retry_at=NULL,last_error=NULL,updated_at=now()
       WHERE id=$1 AND status='pending' AND lease_until=$2`,
      [job.id, job.lease_until, ticketId],
    );
  }

  private async disableToken(job: ClaimedJob, token: string): Promise<void> {
    await this.db.query(
      'UPDATE device_registrations SET push_token=NULL,updated_at=now() WHERE installation_id=$1 AND user_id=$2 AND session_id=$3 AND push_token=$4',
      [job.installation_id, job.recipient_id, job.session_id, token],
    );
  }

  private async checkReceipts(): Promise<void> {
    const rows = await this.db.query(
      `SELECT id,provider_message_id,installation_id,recipient_id,session_id,accepted_at,push_token_hash
       FROM inbox_push_jobs WHERE status='accepted' AND receipt_status='pending' AND accepted_at<=now()-interval '15 minutes'
       AND (receipt_checked_at IS NULL OR receipt_checked_at<=now()-interval '1 minute') ORDER BY accepted_at,id LIMIT 100`,
    ) as Array<{ id: string; provider_message_id: string; installation_id: string; recipient_id: string; session_id: string; accepted_at: Date; push_token_hash: string | null }>;
    if (!rows.length) return;
    let receipts: Awaited<ReturnType<ExpoPushService['receipts']>>;
    try {
      receipts = await this.push.receipts(rows.map((row) => row.provider_message_id));
    } catch {
      await this.db.query('UPDATE inbox_push_jobs SET receipt_checked_at=now() WHERE id=ANY($1::uuid[])', [rows.map((row) => row.id)]);
      return;
    }
    for (const row of rows) {
      const receipt = receipts[row.provider_message_id];
      if (receipt?.status === 'ok') {
        await this.db.query("UPDATE inbox_push_jobs SET receipt_status='ok',receipt_checked_at=now(),push_token_hash=NULL,updated_at=now() WHERE id=$1", [row.id]);
      } else if (receipt?.status === 'error') {
        if (receipt.code === 'DeviceNotRegistered') {
          const [device] = await this.db.query(
            'SELECT push_token FROM device_registrations WHERE installation_id=$1 AND user_id=$2 AND session_id=$3',
            [row.installation_id, row.recipient_id, row.session_id],
          ) as Array<{ push_token: string | null }>;
          if (device?.push_token && row.push_token_hash === createHash('sha256').update(device.push_token).digest('hex')) {
            await this.db.query(
              'UPDATE device_registrations SET push_token=NULL,updated_at=now() WHERE installation_id=$1 AND user_id=$2 AND session_id=$3 AND push_token=$4',
              [row.installation_id, row.recipient_id, row.session_id, device.push_token],
            );
          }
        }
        await this.db.query(
          "UPDATE inbox_push_jobs SET receipt_status='error',receipt_error=$2,receipt_checked_at=now(),push_token_hash=NULL,updated_at=now() WHERE id=$1",
          [row.id, receipt.code ?? 'PROVIDER_REJECTED'],
        );
      } else if (Date.now() - new Date(row.accepted_at).getTime() >= 24 * 60 * 60 * 1000) {
        await this.db.query("UPDATE inbox_push_jobs SET receipt_status='expired',receipt_checked_at=now(),push_token_hash=NULL,updated_at=now() WHERE id=$1", [row.id]);
      } else {
        await this.db.query('UPDATE inbox_push_jobs SET receipt_checked_at=now() WHERE id=$1', [row.id]);
      }
    }
  }
}
