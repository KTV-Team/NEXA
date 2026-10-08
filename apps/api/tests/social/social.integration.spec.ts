import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';
import { DataSource } from 'typeorm';
import type { ApiResponse, AuthResponse, Friendship, PersonalNotification, InboxItem } from '@nexa/types';
import { ApiExceptionFilter } from '../../src/common/filters/api-exception.filter';
import { assertDedicatedTestDatabase } from '../../src/database/test-database';
import { databaseOptions } from '../../src/database/database.options';
import { AppModule } from '../../src/app.module';
import { SocialService } from '../../src/social/social.service';
export {};

describe('profile, friends, notifications and inbox API', () => {
  let app: NestFastifyApplication;
  let db: DataSource;
  const emails = [`social-${randomUUID()}@example.test`, `social-${randomUUID()}@example.test`];
  const users: Array<{ id: string; token: string }> = [];

  beforeAll(async () => {
    assertDedicatedTestDatabase();
    db = new DataSource(databaseOptions); await db.initialize(); await db.runMigrations();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.register(fastifyCookie); app.setGlobalPrefix('api/v1'); app.useGlobalFilters(new ApiExceptionFilter()); await app.init();
    for (const email of emails) {
      const response = await request('POST', '/auth/register', { email, name: 'Social Test', password: 'SocialPassword123' });
      const registration = response.data as AuthResponse;
      users.push({ id: registration.user.id, token: registration.tokens.accessToken });
    }
  });
  afterAll(async () => {
    await app?.close();
    if (db?.isInitialized) {
      const ids = users.map((user) => user.id);
      if (ids.length) {
        await db.query('DELETE FROM inbox_items WHERE recipient_id=ANY($1::uuid[]) OR sender_id=ANY($1::uuid[])', [ids]);
        await db.query('DELETE FROM notification_occurrences WHERE notification_id IN (SELECT id FROM personal_notifications WHERE sender_id=ANY($1::uuid[]) OR recipient_id=ANY($1::uuid[]))', [ids]);
        await db.query('DELETE FROM personal_notifications WHERE sender_id=ANY($1::uuid[]) OR recipient_id=ANY($1::uuid[])', [ids]);
        await db.query('DELETE FROM friend_requests WHERE sender_id=ANY($1::uuid[]) OR recipient_id=ANY($1::uuid[])', [ids]);
        await db.query('DELETE FROM friendships WHERE low_user_id=ANY($1::uuid[]) OR high_user_id=ANY($1::uuid[])', [ids]);
      }
      await db.query('DELETE FROM users WHERE email=ANY($1::varchar[])', [emails]);
      await db.destroy();
    }
  });

  it('updates own profile, searches without exposing email, accepts a request, and persists/read-marks immediate inbox delivery', async () => {
    const alice = users[0]!; const bob = users[1]!;
    const profile = await request('PATCH', '/users/me', { name: '  Alice 100XXUser  ', avatarUrl: 'https://cdn.example.test/a.png' }, alice.token);
    expect(profile.status).toBe(200); expect(profile.data).toMatchObject({ name: 'Alice 100XXUser', avatarUrl: 'https://cdn.example.test/a.png' });
    const bobProfile=await request('PATCH','/users/me',{name:'Bob 100%_User',avatarUrl:null},bob.token);
    expect(bobProfile.status).toBe(200);expect(bobProfile.data).not.toHaveProperty('avatarUrl');
    for(let i=0;i<8;i++) expect((await request('PATCH','/users/me',{name:'Alice 100XXUser'},alice.token)).status).toBe(200);
    const limited=await request('PATCH','/users/me',{name:'Alice Social'},alice.token);
    expect(limited.status).toBe(429);expect(limited.error?.code).toBe('RATE_LIMITED');
    const search = await request('GET', `/users?q=${encodeURIComponent('100%_User')}`, undefined, alice.token);
    expect(search.data.data).toEqual([expect.objectContaining({ id: bob.id, name: 'Bob 100%_User' })]);
    expect(search.data.data[0]).not.toHaveProperty('email');
    const exactEmail=await request('GET',`/users?q=${encodeURIComponent(emails[1]!)}`,undefined,alice.token);
    expect(exactEmail.data.data).toEqual([expect.objectContaining({id:bob.id})]);

    const sent = await request('POST', '/friend-requests', { recipientId: bob.id }, alice.token);
    expect(sent.status).toBe(201);
    const duplicate = await request('POST', '/friend-requests', { recipientId: bob.id }, alice.token);
    expect(duplicate.status).toBe(200); expect(duplicate.data.id).toBe(sent.data.id);
    const crossed = await request('POST', '/friend-requests', { recipientId: alice.id }, bob.token);
    expect(crossed.status).toBe(409); expect(crossed.error?.details).toMatchObject({ requestId: sent.data.id });
    const forbidden = await request('POST', `/friend-requests/${sent.data.id}/accept`, undefined, alice.token);
    expect(forbidden.status).toBe(403);
    const acceptedResults = await Promise.all([
      request('POST', `/friend-requests/${sent.data.id}/accept`, undefined, bob.token),
      request('POST', `/friend-requests/${sent.data.id}/accept`, undefined, bob.token),
    ]);
    const accepted = acceptedResults[0]!;
    expect(acceptedResults.map((result) => result.status)).toEqual([200,200]);
    expect(acceptedResults[1]!.data.id).toBe(accepted.data.id);
    const friendship = accepted.data as Friendship;
    expect(friendship.friend.id).toBe(alice.id);

    const createDto = { clientRequestId: randomUUID(), recipientId: bob.id, title: 'Hello', body: 'From the inbox integration test', delivery: { mode: 'immediate' } };
    const created = await request('POST', '/notifications', createDto, alice.token);
    expect(created.status).toBe(201); expect((created.data as PersonalNotification).status).toBe('COMPLETED');
    const replay = await request('POST', '/notifications', createDto, alice.token);
    expect(replay.status).toBe(200); expect(replay.data.id).toBe(created.data.id);
    const changedReplay = await request('POST', '/notifications', { ...createDto, title: 'Changed' }, alice.token);
    expect(changedReplay.status).toBe(409);
    const inbox = await request('GET', '/inbox?read=false', undefined, bob.token);
    const item = (inbox.data as { data: InboxItem[] }).data.find((candidate) => candidate.notificationId === created.data.id)!;
    expect(item.title).toBe('Hello'); expect(item.sender.id).toBe(alice.id);
    expect((await request('GET', `/notifications/${created.data.id}`, undefined, bob.token)).status).toBe(404);
    expect((await request('GET', `/inbox/${item.id}`, undefined, alice.token)).status).toBe(404);
    const read = await request('PATCH', `/inbox/${item.id}`, { read: true }, bob.token);
    expect(read.data.readAt).toBeTruthy();
    expect((await request('GET', '/inbox/unread-count', undefined, bob.token)).data.unreadCount).toBe(0);
    await request('DELETE', `/inbox/${item.id}`, undefined, bob.token);
    expect((await request('GET', `/inbox/${item.id}`, undefined, bob.token)).status).toBe(404);
  });

  it('rejects notification delivery after friendship removal and keeps user ownership boundaries', async () => {
    const alice=users[0]!;const bob=users[1]!;
    const friendRows=await db.query('SELECT id FROM friendships WHERE (low_user_id=$1 OR high_user_id=$1) AND removed_at IS NULL',[alice.id]);
    if(friendRows.length) await request('DELETE', `/friends/${friendRows[0].id}`, undefined, bob.token);
    const pending=await request('POST','/friend-requests',{recipientId:bob.id},alice.token);
    expect(pending.status).toBe(201);
    expect((await request('POST',`/friend-requests/${pending.data.id}/reject`,undefined,alice.token)).status).toBe(403);
    const rejected=await request('POST',`/friend-requests/${pending.data.id}/reject`,undefined,bob.token);
    expect(rejected.status).toBe(200);expect(rejected.data.status).toBe('REJECTED');
    expect((await request('POST',`/friend-requests/${pending.data.id}/reject`,undefined,bob.token)).status).toBe(200);
    const cancelPending=await request('POST','/friend-requests',{recipientId:bob.id},alice.token);
    expect(cancelPending.status).toBe(201);
    expect((await request('DELETE',`/friend-requests/${cancelPending.data.id}`,undefined,bob.token)).status).toBe(403);
    expect((await request('DELETE',`/friend-requests/${cancelPending.data.id}`,undefined,alice.token)).status).toBe(204);
    expect((await request('DELETE',`/friend-requests/${cancelPending.data.id}`,undefined,alice.token)).status).toBe(204);
    const denied=await request('POST','/notifications',{clientRequestId:randomUUID(),recipientId:bob.id,title:'Denied',body:'No longer friends',delivery:{mode:'immediate'}},alice.token);
    expect(denied.status).toBe(403);
    const other=await request('GET',`/notifications/${randomUUID()}`,undefined,bob.token);expect(other.status).toBe(404);
  });

  it('processes a due scheduled item deterministically after downtime', async () => {
    const alice=users[0]!;
    const scheduledAt=new Date(Date.now()+60*60_000).toISOString();
    const clientRequestId=randomUUID();
    const createDto={clientRequestId,recipientId:alice.id,title:'Due schedule',body:'Simulated restart catch-up',delivery:{mode:'scheduled',scheduledAt}};
    const created=await request('POST','/notifications',createDto,alice.token);
    expect(created.status).toBe(201);
    const sameInstant=new Date(new Date(scheduledAt).getTime()-5*60*60_000).toISOString().replace('Z','-05:00');
    const replay=await request('POST','/notifications',{...createDto,delivery:{mode:'scheduled',scheduledAt:sameInstant}},alice.token);
    expect(replay.status).toBe(200);expect(replay.data.id).toBe(created.data.id);
    await db.query('UPDATE personal_notifications SET next_run_at=now()-interval \'1 minute\' WHERE id=$1',[created.data.id]);
    const service=app.get(SocialService);
    const parallel=await Promise.all([service.processDue(new Date(),50),service.processDue(new Date(),50)]);
    expect(parallel.reduce((sum,count)=>sum+count,0)).toBe(1);
    expect((await request('GET',`/notifications/${created.data.id}`,undefined,alice.token)).data.status).toBe('COMPLETED');
    const inbox=await request('GET','/inbox',undefined,alice.token);
    const dueItems=(inbox.data.data as InboxItem[]).filter((item)=>item.notificationId===created.data.id);
    expect(dueItems).toHaveLength(1);expect(dueItems[0]!.title).toBe('Due schedule');
    const cancelTarget=await request('POST','/notifications',{clientRequestId:randomUUID(),recipientId:alice.id,title:'Cancelable',body:'Future item',delivery:{mode:'scheduled',scheduledAt:new Date(Date.now()+2*60*60_000).toISOString()}},alice.token);
    const updated=await request('PATCH',`/notifications/${cancelTarget.data.id}`,{version:1,title:'Updated title'},alice.token);
    expect(updated.data.version).toBe(2);expect(updated.data.title).toBe('Updated title');
    expect((await request('POST',`/notifications/${cancelTarget.data.id}/cancel`,{version:1},alice.token)).status).toBe(409);
    const cancelled=await request('POST',`/notifications/${cancelTarget.data.id}/cancel`,{version:2},alice.token);
    expect(cancelled.data.status).toBe('CANCELLED');
    expect((await request('POST',`/notifications/${cancelTarget.data.id}/cancel`,{version:1},alice.token)).data.status).toBe('CANCELLED');
  });

  it('serves create, inbox read, and logout through a real listening HTTP socket', async () => {
    const alice=users[0]!;
    await app.listen(0,'127.0.0.1');
    const address=app.getHttpServer().address() as AddressInfo;
    const base=`http://127.0.0.1:${address.port}/api/v1`;
    const headers={authorization:`Bearer ${alice.token}`,'content-type':'application/json','x-auth-client':'mobile'};
    const createResponse=await fetch(`${base}/notifications`,{method:'POST',headers,body:JSON.stringify({clientRequestId:randomUUID(),recipientId:alice.id,title:'Socket smoke',body:'Real network request',delivery:{mode:'immediate'}})});
    expect(createResponse.status).toBe(201);
    const created=await createResponse.json() as ApiResponse<PersonalNotification>;
    const inboxResponse=await fetch(`${base}/inbox`,{headers:{authorization:`Bearer ${alice.token}`,'x-auth-client':'mobile'}});
    expect(inboxResponse.status).toBe(200);
    const inbox=await inboxResponse.json() as ApiResponse<{data:InboxItem[]}>;
    const item=inbox.data!.data.find((row)=>row.notificationId===created.data!.id)!;
    const readResponse=await fetch(`${base}/inbox/${item.id}`,{method:'PATCH',headers,body:JSON.stringify({read:true})});
    expect(readResponse.status).toBe(200);
    const logout=await fetch(`${base}/auth/logout`,{method:'POST',headers:{authorization:`Bearer ${alice.token}`,'x-auth-client':'mobile'}});
    expect(logout.status).toBe(204);
  });

  // Inject response payloads vary by route; individual assertions narrow the returned contract.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function request<T = any>(method: 'GET'|'POST'|'PATCH'|'DELETE', path: string, body?: unknown, token?: string) {
    const response = await app.inject({ method, url: `/api/v1${path}`, payload: body as Record<string, unknown> | undefined, headers: token ? { authorization: `Bearer ${token}` } : undefined });
    let json: ApiResponse<T> | undefined; try { json=response.json<ApiResponse<T>>(); } catch { /* 204 */ }
    return { status: response.statusCode, data: json?.data, error: json?.error };
  }
});
