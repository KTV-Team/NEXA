import { randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';
import { DataSource, type QueryRunner } from 'typeorm';
import type { RecurrenceRule } from '@nexa/types';
import { databaseOptions } from '../../src/database/database.options';
import { assertDedicatedTestDatabase } from '../../src/database/test-database';
import { SocialService } from '../../src/social/social.service';

describe('social persistence and scheduling reliability', () => {
  let db: DataSource;
  let service: SocialService;
  let users: string[];
  const start = new Date('2090-01-01T09:00:00.000Z');

  beforeAll(async () => {
    assertDedicatedTestDatabase();
    db = new DataSource(databaseOptions);
    await db.initialize();
    await db.runMigrations();
    service = new SocialService(db);
  });
  beforeEach(async () => {
    users = [randomUUID(), randomUUID()];
    for (const id of users)
      await db.query('INSERT INTO users(id,email,name) VALUES($1,$2,$3)', [
        id,
        `${id}@example.test`,
        'Reliability fixture',
      ]);
  });
  afterEach(async () => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    await db.query(
      'DELETE FROM inbox_delivery_outbox WHERE occurrence_id IN (SELECT o.id FROM notification_occurrences o JOIN personal_notifications n ON n.id=o.notification_id WHERE n.sender_id=ANY($1::uuid[]) OR n.recipient_id=ANY($1::uuid[]))',
      [users],
    );
    await db.query(
      'DELETE FROM inbox_items WHERE recipient_id=ANY($1::uuid[]) OR sender_id=ANY($1::uuid[])',
      [users],
    );
    await db.query(
      'DELETE FROM notification_occurrences WHERE notification_id IN (SELECT id FROM personal_notifications WHERE sender_id=ANY($1::uuid[]))',
      [users],
    );
    await db.query(
      'DELETE FROM personal_notifications WHERE sender_id=ANY($1::uuid[]) OR recipient_id=ANY($1::uuid[])',
      [users],
    );
    await db.query(
      'DELETE FROM friend_requests WHERE sender_id=ANY($1::uuid[]) OR recipient_id=ANY($1::uuid[])',
      [users],
    );
    await db.query(
      'DELETE FROM friendships WHERE low_user_id=ANY($1::uuid[]) OR high_user_id=ANY($1::uuid[])',
      [users],
    );
    await db.query('DELETE FROM users WHERE id=ANY($1::uuid[])', [users]);
  });
  afterAll(async () => {
    await db?.destroy();
  });

  const dto = (recipientId: string) => ({
    clientRequestId: randomUUID(),
    recipientId,
    title: 'Original title',
    body: 'Original body',
    delivery: { mode: 'immediate' as const },
  });
  async function scheduled(recipientId = users[0]!) {
    return (
      await service.createNotification(users[0]!, {
        ...dto(recipientId),
        delivery: { mode: 'scheduled', scheduledAt: start.toISOString() },
      })
    ).data;
  }
  async function recurring(rule: RecurrenceRule, recipientId = users[0]!) {
    return (
      await service.createNotification(users[0]!, {
        ...dto(recipientId),
        delivery: { mode: 'recurring', rule },
      })
    ).data;
  }
  async function state(id: string) {
    return (await db.query('SELECT * FROM personal_notifications WHERE id=$1', [id]))[0];
  }
  async function makeFriends() {
    const request = await service.sendRequest(users[0]!, users[1]!);
    return await service.accept(users[1]!, request.data.id);
  }
  function faultOnInbox(code: string, afterRollback?: () => Promise<void>, failRetryWrite = false) {
    const create = db.createQueryRunner.bind(db);
    let handled = false;
    jest.spyOn(db, 'createQueryRunner').mockImplementation(() => {
      const q = create();
      const query = q.query.bind(q);
      const rollback = q.rollbackTransaction.bind(q);
      let failed = false;
      q.query = (async (sql: string, parameters?: unknown[], structured?: boolean) => {
        if (sql.startsWith('INSERT INTO inbox_items')) {
          failed = true;
          throw Object.assign(new Error('Injected failure: private payload'), { code });
        }
        if (failRetryWrite && sql.startsWith('UPDATE personal_notifications SET retry_count'))
          throw Object.assign(new Error('Retry write failed'), { code: '08006' });
        return structured ? query(sql, parameters, true) : query(sql, parameters);
      }) as QueryRunner['query'];
      q.rollbackTransaction = async () => {
        await rollback();
        if (failed && !handled && afterRollback) {
          handled = true;
          await afterRollback();
        }
      };
      return q;
    });
  }

  it('creates and serializes using one pool connection, and handles ten concurrent creates', async () => {
    const limited = new DataSource({
      ...databaseOptions,
      extra: { max: 1, connectionTimeoutMillis: 1000 },
    });
    await limited.initialize();
    try {
      const single = new SocialService(limited);
      const result = await single.createNotification(users[0]!, dto(users[0]!));
      expect(result.data.status).toBe('QUEUED');
      expect(await single.processDue()).toBe(1);
      expect((await single.getNotification(users[0]!, result.data.id)).status).toBe('COMPLETED');
      expect((await single.sendRequest(users[0]!, users[1]!)).created).toBe(true);
    } finally {
      await limited.destroy();
    }
    const results = await Promise.all(
      Array.from({ length: 10 }, () => service.createNotification(users[0]!, dto(users[0]!))),
    );
    expect(results.every((result) => result.created)).toBe(true);
    expect(results.every((result) => result.data.status === 'QUEUED')).toBe(true);
    expect(await service.processDue()).toBe(10);
    expect((await service.listInbox(users[0]!, { page: 1, limit: 100 })).meta.total).toBe(11);
  });

  it('uses two queries per list regardless of page size, without private user fields', async () => {
    for (let i = 0; i < 15; i++) {
      const id = randomUUID();
      users.push(id);
      await db.query('INSERT INTO users(id,email,name) VALUES($1,$2,$3)', [
        id,
        `${id}@example.test`,
        'List fixture',
      ]);
      await service.sendRequest(users[0]!, id);
    }
    await Promise.all(
      Array.from({ length: 15 }, () => service.createNotification(users[0]!, dto(users[0]!))),
    );
    const spy = jest.spyOn(db, 'query');
    const requests = await service.listRequests(users[0]!, {
      direction: 'outgoing',
      page: 1,
      limit: 100,
    });
    expect(requests.data).toHaveLength(15);
    expect(spy).toHaveBeenCalledTimes(2);
    spy.mockClear();
    const notifications = await service.listNotifications(users[0]!, { page: 1, limit: 100 });
    expect(notifications.data).toHaveLength(15);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(requests.data[0]!.recipient).not.toHaveProperty('email');
  });

  it('replays concurrent duplicate creates without duplicate inbox rows or exhausted connections', async () => {
    const payload = dto(users[0]!);
    const results = await Promise.all(
      Array.from({ length: 10 }, () => service.createNotification(users[0]!, payload)),
    );
    expect(results.filter((result) => result.created)).toHaveLength(1);
    expect(new Set(results.map((result) => result.data.id)).size).toBe(1);
    expect(await service.processDue()).toBe(1);
    expect((await service.listInbox(users[0]!, { page: 1, limit: 20 })).meta.total).toBe(1);
  });

  it('reports accurate read-all counts and rejects missing, deleted or foreign inbox mutations', async () => {
    expect(await service.readAll(users[0]!)).toEqual({ updatedCount: 0 });
    await Promise.all(
      Array.from({ length: 3 }, () => service.createNotification(users[0]!, dto(users[0]!))),
    );
    expect(await service.processDue()).toBe(3);
    const items = (await service.listInbox(users[0]!, { page: 1, limit: 20 })).data;
    const first = await service.setInboxRead(users[0]!, items[0]!.id, true);
    expect((await service.setInboxRead(users[0]!, items[0]!.id, true)).readAt).toBe(first.readAt);
    expect(await service.readAll(users[0]!)).toEqual({ updatedCount: 2 });
    expect(await service.readAll(users[0]!)).toEqual({ updatedCount: 0 });
    await expect(service.deleteInbox(users[1]!, items[0]!.id)).rejects.toMatchObject({
      status: 404,
    });
    await expect(service.deleteInbox(users[0]!, randomUUID())).rejects.toMatchObject({
      status: 404,
    });
    await service.deleteInbox(users[0]!, items[0]!.id);
    await service.deleteInbox(users[0]!, items[0]!.id);
    await expect(service.setInboxRead(users[0]!, items[0]!.id, false)).rejects.toMatchObject({
      status: 404,
    });
    expect((await service.unreadCount(users[0]!)).unreadCount).toBe(0);
  });

  it('leaves inbox arrivals after the read-all statement unread', async () => {
    await service.createNotification(users[0]!, dto(users[0]!));
    await service.processDue();
    const query = db.query.bind(db);
    let injected = false;
    jest.spyOn(db, 'query').mockImplementation(async (...args: Parameters<DataSource['query']>) => {
      const result = await query(...args);
      if (
        !injected &&
        args[0].startsWith('WITH updated AS (UPDATE inbox_items SET read_at=statement_timestamp()')
      ) {
        injected = true;
        await service.createNotification(users[0]!, dto(users[0]!));
        await service.processDue();
      }
      return result;
    });
    expect(await service.readAll(users[0]!)).toEqual({ updatedCount: 1 });
    expect(await service.unreadCount(users[0]!)).toEqual({ unreadCount: 1 });
  });

  it('coalesces daily downtime to the latest occurrence, respects inclusive end and preserves snapshots', async () => {
    const n = await recurring({
      frequency: 'daily',
      timeZone: 'UTC',
      localTime: '09:00',
      startsOn: '2090-01-01',
      endsOn: '2090-01-03',
    });
    expect(await service.processDue(new Date('2090-01-01T08:59:00Z'))).toBe(0);
    expect(await service.processDue(new Date('2090-01-03T10:00:00Z'))).toBe(1);
    const inbox = (await service.listInbox(users[0]!, { page: 1, limit: 20 })).data;
    expect(inbox).toHaveLength(1);
    expect(inbox[0]!.scheduledFor).toBe('2090-01-03T09:00:00.000Z');
    expect((await service.getNotification(users[0]!, n.id)).status).toBe('COMPLETED');
    expect(await service.processDue(new Date('2090-01-10T10:00:00Z'))).toBe(0);
    await service.deleteInbox(users[0]!, inbox[0]!.id);
    expect(
      await db.query('SELECT id FROM notification_occurrences WHERE notification_id=$1', [n.id]),
    ).toHaveLength(1);
    expect(
      (
        await service.createNotification(users[0]!, {
          clientRequestId: (await state(n.id)).client_request_id,
          recipientId: users[0]!,
          title: 'Original title',
          body: 'Original body',
          delivery: n.delivery,
        })
      ).created,
    ).toBe(false);
    expect((await service.listInbox(users[0]!, { page: 1, limit: 20 })).meta.total).toBe(0);
  });

  it('advances weekly local-calendar schedules and edits future content without changing delivered snapshots', async () => {
    const n = await recurring({
      frequency: 'weekly',
      timeZone: 'Asia/Ho_Chi_Minh',
      localTime: '09:00',
      startsOn: '2090-01-01',
      weekdays: [1, 5],
    });
    const due = new Date(n.nextRunAt!);
    expect(await service.processDue(due)).toBe(1);
    const after = await service.getNotification(users[0]!, n.id);
    expect(new Date(after.nextRunAt!).getTime()).toBeGreaterThan(due.getTime());
    jest.useFakeTimers({
      doNotFake: [
        'setTimeout',
        'clearTimeout',
        'setInterval',
        'clearInterval',
        'setImmediate',
        'clearImmediate',
        'nextTick',
        'queueMicrotask',
        'hrtime',
        'performance',
      ],
    });
    jest.setSystemTime(new Date(due.getTime() + 1000));
    const edited = await service.updateNotification(users[0]!, n.id, {
      version: after.version,
      title: 'Future title',
    });
    jest.useRealTimers();
    await expect(
      service.updateNotification(users[0]!, n.id, {
        version: after.version,
        title: 'Stale change',
      }),
    ).rejects.toMatchObject({ status: 409 });
    const old = (await service.listInbox(users[0]!, { page: 1, limit: 20 })).data[0]!;
    expect(old.title).toBe('Original title');
    expect(await service.processDue(new Date(edited.nextRunAt!))).toBe(1);
    const items = (await service.listInbox(users[0]!, { page: 1, limit: 20 })).data;
    expect(items.map((item) => item.title).sort()).toEqual(['Future title', 'Original title']);
  });

  it.each(['sender', 'recipient'] as const)(
    'blocks delivery when the %s is soft-deleted',
    async (side) => {
      await makeFriends();
      const n = await scheduled(users[1]!);
      await db.query('UPDATE users SET deleted_at=now() WHERE id=$1', [
        side === 'sender' ? users[0] : users[1],
      ]);
      expect(await service.processDue(start)).toBe(1);
      expect(await state(n.id)).toMatchObject({
        status: 'BLOCKED',
        block_reason: 'USER_INACTIVE',
        next_run_at: null,
      });
      expect((await service.listInbox(users[1]!, { page: 1, limit: 20 })).meta.total).toBe(0);
    },
  );

  it('serializes friendship removal against delivery and stops later sends', async () => {
    const friend = await makeFriends();
    if (!friend || !('friend' in friend)) throw new Error('Expected friendship');
    const n = await recurring(
      { frequency: 'daily', timeZone: 'UTC', localTime: '09:00', startsOn: '2090-01-01' },
      users[1]!,
    );
    await Promise.all([service.processDue(start), service.removeFriend(users[0]!, friend.id)]);
    const row = await state(n.id),
      inbox = await service.listInbox(users[1]!, { page: 1, limit: 20 });
    expect(['ACTIVE', 'BLOCKED']).toContain(row.status);
    expect(inbox.meta.total).toBe(row.status === 'ACTIVE' ? 1 : 0);
    await expect(service.createNotification(users[0]!, dto(users[1]!))).rejects.toMatchObject({
      status: 403,
    });
    await service.processDue(new Date('2090-01-02T09:00:00Z'));
    expect((await state(n.id)).status).toBe('BLOCKED');
    const request = await service.sendRequest(users[0]!, users[1]!);
    await service.accept(users[1]!, request.data.id);
    expect(await service.processDue(new Date('2090-01-03T09:00:00Z'))).toBe(0);
  });

  it('serializes cancellation against delivery without discarding a committed inbox', async () => {
    const n = await scheduled();
    const results = await Promise.allSettled([
      service.processDue(start),
      service.cancelNotification(users[0]!, n.id, { version: 1 }),
    ]);
    const row = await state(n.id),
      inbox = await service.listInbox(users[0]!, { page: 1, limit: 20 });
    expect(['COMPLETED', 'CANCELLED']).toContain(row.status);
    expect(inbox.meta.total).toBe(row.status === 'COMPLETED' ? 1 : 0);
    if (row.status === 'CANCELLED') expect(results[1].status).toBe('fulfilled');
    else expect(results[1].status).toBe('rejected');
  });

  it('rejects cancellation between inbox persistence and occurrence acknowledgement', async () => {
    const n = await scheduled();
    const delivery = (service as unknown as { delivery: { persistDelivery: (payload: unknown) => Promise<{ itemId: string }> } }).delivery;
    const persist = delivery.persistDelivery.bind(delivery);
    let markPersisted!: () => void;
    let continueDelivery!: () => void;
    const persisted = new Promise<void>((resolve) => { markPersisted = resolve; });
    const continueAfterPersistence = new Promise<void>((resolve) => { continueDelivery = resolve; });
    jest.spyOn(delivery, 'persistDelivery').mockImplementation(async (payload) => {
      const receipt = await persist(payload);
      markPersisted();
      await continueAfterPersistence;
      return receipt;
    });

    const processing = service.processDue(start);
    await persisted;
    await expect(service.cancelNotification(users[0]!, n.id, { version: 1 })).rejects.toMatchObject({
      status: 409,
      response: expect.objectContaining({ code: 'NOTIFICATION_DUE' }),
    });
    continueDelivery();
    expect(await processing).toBe(1);
    expect((await state(n.id)).status).toBe('COMPLETED');
    expect((await service.listInbox(users[0]!, { page: 1, limit: 20 })).meta.total).toBe(1);
  });

  it('rolls back partial delivery, bounds transient retries and then fails cleanly', async () => {
    const n = await scheduled();
    faultOnInbox('40001');
    const log = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    let now = start;
    for (let attempt = 1; attempt <= 6; attempt++) {
      expect(await service.processDue(now)).toBe(0);
      const row = await state(n.id);
      const [occurrence] = await db.query(
        'SELECT status,attempt_count,retry_at FROM notification_occurrences WHERE notification_id=$1',
        [n.id],
      );
      if (attempt <= 5) {
        expect(occurrence).toMatchObject({ status: 'pending', attempt_count: attempt });
        expect(row.status).toBe('SCHEDULED');
        expect(new Date(row.retry_at).getTime() - now.getTime()).toBe(2 ** (attempt - 1) * 1000);
        now = new Date(row.retry_at);
      } else {
        expect(occurrence).toMatchObject({ status: 'failed', attempt_count: attempt, retry_at: null });
        expect(row).toMatchObject({
          status: 'FAILED',
          failure_code: 'DELIVERY_FAILED',
          retry_count: 6,
          next_run_at: null,
        });
      }
    }
    expect(log).toHaveBeenCalled();
    expect(JSON.stringify(log.mock.calls)).not.toContain('private payload');
  });

  it('does not blindly retry permanent delivery errors', async () => {
    const n = await scheduled();
    faultOnInbox('23514');
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    await service.processDue(start);
    expect(await state(n.id)).toMatchObject({
      status: 'FAILED',
      retry_count: 0,
      next_run_at: null,
    });
  });

  it('recovers after a transient failure and respects the retry deadline', async () => {
    const n = await scheduled();
    faultOnInbox('40001');
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    await service.processDue(start);
    const failed = await state(n.id);
    expect(failed.retry_count).toBe(1);
    jest.restoreAllMocks();
    expect(await service.processDue(new Date(start.getTime() + 500))).toBe(0);
    expect(await service.processDue(new Date(failed.retry_at))).toBe(1);
    expect(await state(n.id)).toMatchObject({
      status: 'COMPLETED',
      retry_count: 0,
      retry_at: null,
    });
    expect((await service.listInbox(users[0]!, { page: 1, limit: 20 })).data[0]!.scheduledFor).toBe(
      start.toISOString(),
    );
  });

  it('rejects editing an occurrence that is already due', async () => {
    const n = await scheduled();
    jest.useFakeTimers({
      doNotFake: [
        'setTimeout',
        'clearTimeout',
        'setInterval',
        'clearInterval',
        'setImmediate',
        'clearImmediate',
        'nextTick',
        'queueMicrotask',
        'hrtime',
        'performance',
      ],
    });
    jest.setSystemTime(start);
    await expect(
      service.updateNotification(users[0]!, n.id, { version: 1, title: 'Too late' }),
    ).rejects.toMatchObject({
      status: 409,
      response: expect.objectContaining({ code: 'NOTIFICATION_DUE' }),
    });
    jest.useRealTimers();
    expect((await state(n.id)).title).toBe('Original title');
  });

  it('propagates retry persistence failures instead of silently succeeding', async () => {
    const n = await scheduled();
    faultOnInbox('40001', undefined, true);
    const log = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    await expect(service.processDue(start)).rejects.toMatchObject({ code: '08006' });
    expect(await state(n.id)).toMatchObject({ status: 'SCHEDULED', retry_count: 0 });
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'RETRY_STATE_WRITE_FAILED',
        notificationId: n.id,
        errorCode: '08006',
      }),
    );
  });

  it('does not overwrite a cancellation committed after failed delivery rollback', async () => {
    const n = await scheduled();
    faultOnInbox('40001', async () => {
      await service.cancelNotification(users[0]!, n.id, { version: 1 });
    });
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    await service.processDue(start);
    expect(await state(n.id)).toMatchObject({
      status: 'CANCELLED',
      retry_count: 0,
      next_run_at: null,
    });
    expect(
      await db.query('SELECT status,last_error,claim_token FROM notification_occurrences WHERE notification_id=$1', [n.id]),
    ).toEqual([expect.objectContaining({ status: 'failed', last_error: 'NOTIFICATION_CANCELLED', claim_token: null })]);
  });

  it('queues an immediate create durably before the worker persists its inbox item', async () => {
    faultOnInbox('40001');
    const result = await service.createNotification(users[0]!, dto(users[0]!));
    expect(result.data.status).toBe('QUEUED');
    expect((await service.listNotifications(users[0]!, { page: 1, limit: 20 })).meta.total).toBe(1);
    expect((await service.listInbox(users[0]!, { page: 1, limit: 20 })).meta.total).toBe(0);
    expect(await service.processDue()).toBe(0);
    expect((await service.getNotification(users[0]!, result.data.id)).status).toBe('QUEUED');
    expect((await service.listInbox(users[0]!, { page: 1, limit: 20 })).meta.total).toBe(0);
  });

  it('replays a persisted inbox item after losing the delivery response without creating a duplicate', async () => {
    const result = await service.createNotification(users[0]!, dto(users[0]!));
    const delivery = (service as unknown as { delivery: { persistDelivery: (payload: unknown) => Promise<{ itemId: string }> } }).delivery;
    const persist = delivery.persistDelivery.bind(delivery);
    let loseFirstResponse = true;
    jest.spyOn(delivery, 'persistDelivery').mockImplementation(async (payload) => {
      const receipt = await persist(payload);
      if (loseFirstResponse) {
        loseFirstResponse = false;
        throw Object.assign(new Error('Delivery response was lost.'), { code: '08006' });
      }
      return receipt;
    });

    expect(await service.processDue()).toBe(0);
    expect((await service.listInbox(users[0]!, { page: 1, limit: 20 })).meta.total).toBe(1);
    const pending = await state(result.data.id);
    expect(pending.status).toBe('QUEUED');
    expect(pending.retry_count).toBe(1);

    expect(await service.processDue(new Date(pending.retry_at))).toBe(1);
    expect((await service.getNotification(users[0]!, result.data.id)).status).toBe('COMPLETED');
    expect((await service.listInbox(users[0]!, { page: 1, limit: 20 })).meta.total).toBe(1);
    expect(
      await db.query('SELECT occurrence_id FROM inbox_delivery_outbox WHERE occurrence_id IN (SELECT id FROM notification_occurrences WHERE notification_id=$1)', [result.data.id]),
    ).toHaveLength(1);
  });
});
