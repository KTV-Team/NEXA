import { HttpException, Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { createHash } from 'node:crypto';
import { Temporal } from '@js-temporal/polyfill';
import type { Delivery, RecurrenceRule, UpdateNotificationDto } from '@nexa/types';

// TypeORM returns untyped driver rows for parameterized SQL operations below.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
const error = (status: number, code: string, message: string, details?: Record<string, unknown>) =>
  new HttpException({ code, message, ...(details ? { details } : {}) }, status);
const stamp = (value: unknown) => value == null ? null : new Date(value as string | number | Date).toISOString();
const pageResult = <T>(data: T[], page: number, limit: number, total: number) => ({ data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });

export async function calculateNextOccurrence(rule: RecurrenceRule, after: Date): Promise<Date | null> {
  try { new Intl.DateTimeFormat('en-US', { timeZone: rule.timeZone }).format(after); }
  catch { throw error(400, 'INVALID_SCHEDULE', 'The time zone is invalid.'); }
  if (rule.endsOn && rule.endsOn < rule.startsOn) throw error(400, 'INVALID_SCHEDULE', 'endsOn must not be before startsOn.');
  try { Temporal.PlainDate.from(rule.startsOn); if (rule.endsOn) Temporal.PlainDate.from(rule.endsOn); }
  catch { throw error(400, 'INVALID_SCHEDULE', 'The recurrence date is invalid.'); }
  if (rule.frequency === 'weekly' && new Set(rule.weekdays).size !== rule.weekdays.length) throw error(400, 'INVALID_SCHEDULE', 'Weekdays must be unique.');
  const localToday = Temporal.Instant.from(after.toISOString()).toZonedDateTimeISO(rule.timeZone).toPlainDate().toString();
  const cursor = localToday > rule.startsOn ? localToday : rule.startsOn;
  const [year, month, day] = cursor.split('-').map(Number) as [number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day));
  for (let i = 0; i < 366 * 200; i++) {
    const dateString = date.toISOString().slice(0, 10);
    if (rule.endsOn && dateString > rule.endsOn) return null;
    const isoWeekday = ((date.getUTCDay() + 6) % 7) + 1;
    if (rule.frequency === 'daily' || rule.weekdays.includes(isoWeekday)) {
      const [hour, minute] = rule.localTime.split(':').map(Number);
      const scheduled = Temporal.ZonedDateTime.from({ timeZone: rule.timeZone, year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate(), hour, minute }, { disambiguation: 'compatible' });
      const instant = new Date(Number(scheduled.epochMilliseconds));
      if (dateString >= rule.startsOn && instant > after) return instant;
    }
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return null;
}

@Injectable()
export class SocialService {
  constructor(private readonly db: DataSource) {}

  private async lockUsers(q: QueryRunner, ids: string[]) {
    const unique = [...new Set(ids)].sort();
    const rows = await q.query('SELECT id FROM users WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL ORDER BY id FOR UPDATE', [unique]);
    if (rows.length !== unique.length) throw error(404, 'USER_NOT_FOUND', 'User was not found.');
  }
  private async lockExistingUsers(q: QueryRunner, ids: string[]) {
    const unique = [...new Set(ids)].sort();
    const rows = await q.query('SELECT id FROM users WHERE id = ANY($1::uuid[]) ORDER BY id FOR UPDATE', [unique]);
    if (rows.length !== unique.length) throw error(404, 'USER_NOT_FOUND', 'User was not found.');
  }
  private async isFriends(q: QueryRunner, a: string, b: string) {
    if (a === b) return true;
    const [low, high] = [a, b].sort();
    return (await q.query('SELECT 1 FROM friendships WHERE low_user_id=$1 AND high_user_id=$2 AND removed_at IS NULL', [low, high])).length > 0;
  }
  private async friendRequestDto(id: string): Promise<Row> {
    const rows = await this.db.query(`SELECT r.*, s.name AS sender_name,s.avatar_url AS sender_avatar_url,d.name AS recipient_name,d.avatar_url AS recipient_avatar_url
      FROM friend_requests r JOIN users s ON s.id=r.sender_id JOIN users d ON d.id=r.recipient_id
      WHERE r.id=$1 AND s.deleted_at IS NULL AND d.deleted_at IS NULL`, [id]);
    const r = rows[0];
    return { id: r.id, sender: { id: r.sender_id, name: r.sender_name, ...(r.sender_avatar_url ? { avatarUrl: r.sender_avatar_url } : {}) }, recipient: { id: r.recipient_id, name: r.recipient_name, ...(r.recipient_avatar_url ? { avatarUrl: r.recipient_avatar_url } : {}) }, status: r.status, friendshipId: r.friendship_id, createdAt: stamp(r.created_at), updatedAt: stamp(r.updated_at) };
  }
  async sendRequest(userId: string, recipientId: string) {
    if (userId === recipientId) throw error(400, 'SELF_FRIEND_REQUEST', 'You cannot send a friend request to yourself.');
    const q = this.db.createQueryRunner(); await q.connect(); await q.startTransaction();
    try {
      await this.lockUsers(q, [userId, recipientId]);
      if (await this.isFriends(q, userId, recipientId)) throw error(409, 'ALREADY_FRIENDS', 'These users are already friends.');
      const [low, high] = [userId, recipientId].sort();
      const pending = (await q.query(`SELECT * FROM friend_requests WHERE status='PENDING' AND LEAST(sender_id,recipient_id)=$1 AND GREATEST(sender_id,recipient_id)=$2 FOR UPDATE`, [low, high]))[0] as Row | undefined;
      if (pending) {
        if (pending.sender_id === userId) { await q.commitTransaction(); return { created: false, data: await this.friendRequestDto(pending.id) }; }
        throw error(409, 'INCOMING_REQUEST_EXISTS', 'An incoming friend request is already pending.', { requestId: pending.id });
      }
      const rows = await q.query(`INSERT INTO friend_requests(sender_id,recipient_id) VALUES($1,$2) RETURNING id`, [userId, recipientId]);
      await q.commitTransaction(); return { created: true, data: await this.friendRequestDto(rows[0].id) };
    } catch (e) { if (q.isTransactionActive) await q.rollbackTransaction(); if ((e as { code?: string })?.code === '23505') throw error(409, 'INCOMING_REQUEST_EXISTS', 'A friend request is already pending.'); throw e; }
    finally { await q.release(); }
  }
  async listRequests(userId: string, p: { direction: 'incoming'|'outgoing'; page: number; limit: number }) {
    const column = p.direction === 'incoming' ? 'recipient_id' : 'sender_id';
    const [rows, count] = await Promise.all([
      this.db.query(`SELECT r.id FROM friend_requests r JOIN users s ON s.id=r.sender_id JOIN users d ON d.id=r.recipient_id WHERE r.${column}=$1 AND r.status='PENDING' AND s.deleted_at IS NULL AND d.deleted_at IS NULL ORDER BY r.created_at DESC,r.id DESC OFFSET $2 LIMIT $3`, [userId, (p.page-1)*p.limit, p.limit]),
      this.db.query(`SELECT count(*)::int AS count FROM friend_requests r JOIN users s ON s.id=r.sender_id JOIN users d ON d.id=r.recipient_id WHERE r.${column}=$1 AND r.status='PENDING' AND s.deleted_at IS NULL AND d.deleted_at IS NULL`, [userId]),
    ]);
    return pageResult(await Promise.all(rows.map((r: Row) => this.friendRequestDto(r.id))), p.page, p.limit, count[0].count);
  }
  private async transitionRequest(userId: string, id: string, action: 'accept'|'reject'|'cancel') {
    const q = this.db.createQueryRunner(); await q.connect(); await q.startTransaction();
    try {
      let row = (await q.query('SELECT * FROM friend_requests WHERE id=$1', [id]))[0] as Row | undefined;
      if (!row || (row.sender_id !== userId && row.recipient_id !== userId)) throw error(404, 'FRIEND_REQUEST_NOT_FOUND', 'Friend request was not found.');
      await this.lockUsers(q, [row.sender_id, row.recipient_id]);
      row = (await q.query('SELECT * FROM friend_requests WHERE id=$1 FOR UPDATE', [id]))[0];
      if (!row) throw error(404, 'FRIEND_REQUEST_NOT_FOUND', 'Friend request was not found.');
      const actor = action === 'cancel' ? row.sender_id : row.recipient_id;
      if (actor !== userId) throw error(403, 'FRIEND_REQUEST_ACTION_FORBIDDEN', 'You cannot perform this action on this friend request.');
      if (action === 'reject' && row.status === 'REJECTED') { await q.commitTransaction(); return this.friendRequestDto(id); }
      if (action === 'cancel' && row.status === 'CANCELLED') { await q.commitTransaction(); return; }
      if (action === 'accept' && row.status === 'ACCEPTED') {
        const existing = row.friendship_id && (await q.query('SELECT * FROM friendships WHERE id=$1 AND removed_at IS NULL', [row.friendship_id]))[0];
        if (existing) { await q.commitTransaction(); return this.friendshipDto(existing, userId); }
      }
      if (row.status !== 'PENDING') throw error(409, 'FRIEND_REQUEST_STATE_CONFLICT', 'Friend request is no longer pending.');
      if (action === 'accept') {
        const [low, high] = [row.sender_id, row.recipient_id].sort();
        let friendship = (await q.query('SELECT * FROM friendships WHERE low_user_id=$1 AND high_user_id=$2 AND removed_at IS NULL FOR UPDATE', [low, high]))[0];
        if (!friendship) friendship = (await q.query('INSERT INTO friendships(low_user_id,high_user_id) VALUES($1,$2) RETURNING *', [low, high]))[0];
        if (!friendship) throw error(500, 'INTERNAL_SERVER_ERROR', 'Friendship could not be created.');
        await q.query("UPDATE friend_requests SET status='ACCEPTED',friendship_id=$2,updated_at=now() WHERE id=$1", [id, friendship.id]);
        await q.commitTransaction(); return this.friendshipDto(friendship, userId);
      }
      const status = action === 'reject' ? 'REJECTED' : 'CANCELLED';
      await q.query('UPDATE friend_requests SET status=$2,updated_at=now() WHERE id=$1', [id, status]);
      await q.commitTransaction(); return action === 'reject' ? this.friendRequestDto(id) : undefined;
    } catch (e) { if (q.isTransactionActive) await q.rollbackTransaction(); if ((e as { code?: string })?.code === '23505') throw error(409, 'FRIEND_REQUEST_STATE_CONFLICT', 'Friend request changed concurrently.'); throw e; }
    finally { await q.release(); }
  }
  accept(userId: string, id: string) { return this.transitionRequest(userId, id, 'accept'); }
  reject(userId: string, id: string) { return this.transitionRequest(userId, id, 'reject'); }
  cancelRequest(userId: string, id: string) { return this.transitionRequest(userId, id, 'cancel'); }
  private friendshipDto(r: Row, userId: string) {
    const friendId = r.low_user_id === userId ? r.high_user_id : r.low_user_id;
    return this.db.query('SELECT id,name,avatar_url FROM users WHERE id=$1 AND deleted_at IS NULL', [friendId]).then((rows: Row[]) => ({ id: r.id, friend: { id: rows[0]!.id, name: rows[0]!.name, ...(rows[0]!.avatar_url ? { avatarUrl: rows[0]!.avatar_url } : {}) }, createdAt: stamp(r.created_at) }));
  }
  async listFriends(userId: string, p: { page: number; limit: number }) {
    const [rows, count] = await Promise.all([
      this.db.query(`SELECT f.*,u.id AS friend_id,u.name AS friend_name,u.avatar_url AS friend_avatar_url FROM friendships f JOIN users u ON u.id=CASE WHEN f.low_user_id=$1 THEN f.high_user_id ELSE f.low_user_id END AND u.deleted_at IS NULL WHERE (f.low_user_id=$1 OR f.high_user_id=$1) AND f.removed_at IS NULL ORDER BY f.created_at DESC,f.id DESC OFFSET $2 LIMIT $3`, [userId,(p.page-1)*p.limit,p.limit]),
      this.db.query(`SELECT count(*)::int AS count FROM friendships f JOIN users u ON u.id=CASE WHEN f.low_user_id=$1 THEN f.high_user_id ELSE f.low_user_id END AND u.deleted_at IS NULL WHERE (f.low_user_id=$1 OR f.high_user_id=$1) AND f.removed_at IS NULL`, [userId]),
    ]);
    return pageResult(rows.map((r: Row) => ({ id:r.id, friend:{id:r.friend_id,name:r.friend_name,...(r.friend_avatar_url?{avatarUrl:r.friend_avatar_url}:{})}, createdAt:stamp(r.created_at) })),p.page,p.limit,count[0].count);
  }
  async removeFriend(userId: string, id: string) {
    const q=this.db.createQueryRunner(); await q.connect(); await q.startTransaction();
    try { const r=(await q.query('SELECT * FROM friendships WHERE id=$1',[id]))[0] as Row|undefined; if(!r || (r.low_user_id!==userId && r.high_user_id!==userId)) throw error(404,'FRIENDSHIP_NOT_FOUND','Friendship was not found.'); await this.lockExistingUsers(q,[r.low_user_id,r.high_user_id]); await q.query('UPDATE friendships SET removed_at=COALESCE(removed_at,now()) WHERE id=$1',[id]); await q.commitTransaction(); }
    catch(e){if(q.isTransactionActive)await q.rollbackTransaction();throw e;} finally{await q.release();}
  }

  private async nextOccurrence(rule: RecurrenceRule, after: Date): Promise<Date | null> {
    return calculateNextOccurrence(rule, after);
  }
  private async validateDelivery(delivery: Delivery, now = new Date()): Promise<Date | null> {
    if (delivery.mode === 'immediate') return now;
    if (delivery.mode === 'scheduled') {
      const date = new Date(delivery.scheduledAt);
      if (date <= now) throw error(400, 'INVALID_SCHEDULE', 'scheduledAt must be in the future.');
      return date;
    }
    const next = await this.nextOccurrence(delivery.rule, now);
    if (!next) throw error(400, 'INVALID_SCHEDULE', 'The recurrence has no future occurrence.');
    return next;
  }
  private async notificationDto(id: string): Promise<Row> {
    const rows = await this.db.query(`SELECT n.*,u.id AS recipient_id_active,u.name AS recipient_name,u.avatar_url AS recipient_avatar_url
      FROM personal_notifications n LEFT JOIN users u ON u.id=n.recipient_id AND u.deleted_at IS NULL WHERE n.id=$1`, [id]);
    const r=rows[0];
    return { id:r.id,senderId:r.sender_id,recipientId:r.recipient_id,recipient:r.recipient_id_active?{id:r.recipient_id_active,name:r.recipient_name,...(r.recipient_avatar_url?{avatarUrl:r.recipient_avatar_url}:{})}:null,title:r.title,body:r.body,delivery:r.delivery,status:r.status,version:r.version,nextRunAt:stamp(r.next_run_at),lastDeliveredAt:stamp(r.last_delivered_at),cancelledAt:stamp(r.cancelled_at),blockReason:r.block_reason,failureCode:r.failure_code,createdAt:stamp(r.created_at),updatedAt:stamp(r.updated_at) };
  }
  private async insertInbox(q: QueryRunner, notification: Row, when: Date) {
    const sender=(await q.query('SELECT name,avatar_url FROM users WHERE id=$1',[notification.sender_id]))[0];
    const occurrence=(await q.query('INSERT INTO notification_occurrences(notification_id,scheduled_for,notification_version) VALUES($1,$2,$3) RETURNING id,delivered_at',[notification.id,when,notification.version]))[0];
    await q.query(`INSERT INTO inbox_items(occurrence_id,recipient_id,sender_id,sender_name,sender_avatar_url,title,body)
      VALUES($1,$2,$3,$4,$5,$6,$7)`,[occurrence.id,notification.recipient_id,notification.sender_id,sender.name,sender.avatar_url,notification.title,notification.body]);
    return occurrence;
  }
  async createNotification(senderId: string, dto: { clientRequestId:string; recipientId:string; title:string; body:string; delivery:Delivery }) {
    const normalizedDelivery: Delivery = dto.delivery.mode==='scheduled'
      ? { ...dto.delivery, scheduledAt: new Date(dto.delivery.scheduledAt).toISOString() }
      : dto.delivery;
    const normalized={recipientId:dto.recipientId,title:dto.title.trim(),body:dto.body.trim(),delivery:normalizedDelivery};
    const hash=createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
    const previous=(await this.db.query('SELECT id,payload_hash FROM personal_notifications WHERE sender_id=$1 AND client_request_id=$2',[senderId,dto.clientRequestId]))[0] as Row|undefined;
    if(previous){if(previous.payload_hash!==hash)throw error(409,'IDEMPOTENCY_KEY_REUSED','This clientRequestId was already used with a different payload.');return {created:false,data:await this.notificationDto(previous.id)};}
    const now=new Date(); const next=await this.validateDelivery(normalizedDelivery,now);
    const status=normalizedDelivery.mode==='immediate'?'COMPLETED':normalizedDelivery.mode==='recurring'?'ACTIVE':'SCHEDULED';
    const q=this.db.createQueryRunner();await q.connect();await q.startTransaction();
    try{
      await this.lockUsers(q,[senderId,dto.recipientId]);
      if(!(await this.isFriends(q,senderId,dto.recipientId)))throw error(403,'RECIPIENT_NOT_ALLOWED','You can send notifications only to yourself or an accepted friend.');
      const rows=await q.query(`INSERT INTO personal_notifications(sender_id,recipient_id,client_request_id,payload_hash,title,body,delivery,status,next_run_at,last_delivered_at)
        VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10) RETURNING *`,[senderId,dto.recipientId,dto.clientRequestId,hash,normalized.title,normalized.body,JSON.stringify(normalizedDelivery),status,status==='COMPLETED'?null:next,status==='COMPLETED'?now:null]);
      const n=rows[0]; if(status==='COMPLETED') await this.insertInbox(q,n,now);
      await q.commitTransaction();return {created:true,data:await this.notificationDto(n.id)};
    }catch(e){if(q.isTransactionActive)await q.rollbackTransaction();if((e as { code?: string })?.code==='23505'){
      const existing=(await this.db.query('SELECT id,payload_hash FROM personal_notifications WHERE sender_id=$1 AND client_request_id=$2',[senderId,dto.clientRequestId]))[0];
      if(existing){if(existing.payload_hash!==hash)throw error(409,'IDEMPOTENCY_KEY_REUSED','This clientRequestId was already used with a different payload.');return {created:false,data:await this.notificationDto(existing.id)};}
    }throw e;}finally{await q.release();}
  }
  async listNotifications(userId:string,p:{page:number;limit:number}){
    const [rows,count]=await Promise.all([
      this.db.query('SELECT id FROM personal_notifications WHERE sender_id=$1 ORDER BY created_at DESC,id DESC OFFSET $2 LIMIT $3',[userId,(p.page-1)*p.limit,p.limit]),
      this.db.query('SELECT count(*)::int AS count FROM personal_notifications WHERE sender_id=$1',[userId]),
    ]);return pageResult(await Promise.all(rows.map((r:Row)=>this.notificationDto(r.id))),p.page,p.limit,count[0].count);
  }
  async getNotification(userId:string,id:string){const r=(await this.db.query('SELECT id FROM personal_notifications WHERE id=$1 AND sender_id=$2',[id,userId]))[0];if(!r)throw error(404,'NOTIFICATION_NOT_FOUND','Notification was not found.');return this.notificationDto(id);}
  async updateNotification(userId:string,id:string,dto:UpdateNotificationDto){
    const q=this.db.createQueryRunner();await q.connect();await q.startTransaction();
    try{
      let n=(await q.query('SELECT * FROM personal_notifications WHERE id=$1 AND sender_id=$2',[id,userId]))[0] as Row|undefined;
      if(!n)throw error(404,'NOTIFICATION_NOT_FOUND','Notification was not found.');
      await this.lockUsers(q,[n.sender_id,n.recipient_id]);const locked=(await q.query('SELECT * FROM personal_notifications WHERE id=$1 FOR UPDATE',[id]))[0] as Row|undefined;if(!locked)throw error(404,'NOTIFICATION_NOT_FOUND','Notification was not found.');n=locked;
      if(n.version!==dto.version)throw error(409,'VERSION_CONFLICT','Notification version is stale.');
      if(!['SCHEDULED','ACTIVE'].includes(n.status))throw error(409,'NOTIFICATION_STATE_CONFLICT','This notification can no longer be edited.');
      const now=new Date();if(n.next_run_at&&new Date(n.next_run_at)<=now)throw error(409,'NOTIFICATION_DUE','The next occurrence is due; reload before editing.');
      let delivery=dto.delivery??n.delivery;if(delivery.mode!==n.delivery.mode)throw error(400,'VALIDATION_ERROR','Delivery mode cannot be changed.');
      if(delivery.mode==='scheduled')delivery={...delivery,scheduledAt:new Date(delivery.scheduledAt).toISOString()};
      const next=delivery.mode==='scheduled'?await this.validateDelivery(delivery,now):delivery.mode==='recurring'?await this.validateDelivery(delivery,now):null;
      if(delivery.mode==='immediate')throw error(400,'VALIDATION_ERROR','Immediate delivery cannot be scheduled through an update.');
      const title=dto.title??n.title, body=dto.body??n.body, status=delivery.mode==='recurring'?'ACTIVE':'SCHEDULED';
      const updated=await q.query(`UPDATE personal_notifications SET title=$3,body=$4,delivery=$5::jsonb,status=$6,next_run_at=$7,version=version+1,updated_at=now(),retry_count=0,retry_at=NULL
        WHERE id=$1 AND version=$2 RETURNING id`,[id,dto.version,title,body,JSON.stringify(delivery),status,next]);
      if(!updated.length)throw error(409,'VERSION_CONFLICT','Notification version is stale.');
      await q.commitTransaction();return this.notificationDto(id);
    }catch(e){if(q.isTransactionActive)await q.rollbackTransaction();throw e;}finally{await q.release();}
  }
  async cancelNotification(userId:string,id:string,dto:{version:number}){
    const q=this.db.createQueryRunner();await q.connect();await q.startTransaction();
    try{let n=(await q.query('SELECT * FROM personal_notifications WHERE id=$1 AND sender_id=$2',[id,userId]))[0] as Row|undefined;if(!n)throw error(404,'NOTIFICATION_NOT_FOUND','Notification was not found.');await this.lockExistingUsers(q,[n.sender_id,n.recipient_id]);const locked=(await q.query('SELECT * FROM personal_notifications WHERE id=$1 FOR UPDATE',[id]))[0] as Row|undefined;if(!locked)throw error(404,'NOTIFICATION_NOT_FOUND','Notification was not found.');n=locked;
      if(n.status==='CANCELLED'){await q.commitTransaction();return this.notificationDto(id);}
      if(n.version!==dto.version)throw error(409,'VERSION_CONFLICT','Notification version is stale.');if(!['SCHEDULED','ACTIVE'].includes(n.status))throw error(409,'NOTIFICATION_STATE_CONFLICT','This notification can no longer be cancelled.');
      await q.query("UPDATE personal_notifications SET status='CANCELLED',cancelled_at=now(),next_run_at=NULL,retry_at=NULL,version=version+1,updated_at=now() WHERE id=$1 AND version=$2",[id,dto.version]);await q.commitTransaction();return this.notificationDto(id);
    }catch(e){if(q.isTransactionActive)await q.rollbackTransaction();throw e;}finally{await q.release();}
  }
  private inboxDto(r:Row){return {id:r.id,notificationId:r.notification_id,occurrenceId:r.occurrence_id,sender:{id:r.sender_id,name:r.sender_name,...(r.sender_avatar_url?{avatarUrl:r.sender_avatar_url}:{})},title:r.title,body:r.body,scheduledFor:stamp(r.scheduled_for),deliveredAt:stamp(r.delivered_at),readAt:stamp(r.read_at)};}
  private inboxSelect=`SELECT i.*,o.notification_id,o.scheduled_for,o.delivered_at FROM inbox_items i JOIN notification_occurrences o ON o.id=i.occurrence_id`;
  async listInbox(userId:string,p:{page:number;limit:number;read?:boolean}){
    const values:unknown[]=[userId];let where='i.recipient_id=$1 AND i.deleted_at IS NULL';if(p.read!==undefined){values.push(p.read);where+=` AND (i.read_at IS NOT NULL)=$${values.length}`;}
    const query=`${this.inboxSelect} WHERE ${where} ORDER BY i.created_at DESC,i.id DESC OFFSET $${values.length+1} LIMIT $${values.length+2}`;
    const [rows,count]=await Promise.all([this.db.query(query,[...values,(p.page-1)*p.limit,p.limit]),this.db.query(`SELECT count(*)::int AS count FROM inbox_items i WHERE ${where}`,values)]);
    return pageResult(rows.map((r:Row)=>this.inboxDto(r)),p.page,p.limit,count[0].count);
  }
  async unreadCount(userId:string){const [row]=await this.db.query('SELECT count(*)::int AS count FROM inbox_items WHERE recipient_id=$1 AND deleted_at IS NULL AND read_at IS NULL',[userId]);return {unreadCount:row.count};}
  async getInbox(userId:string,id:string){const rows=await this.db.query(`${this.inboxSelect} WHERE i.id=$1 AND i.recipient_id=$2 AND i.deleted_at IS NULL`,[id,userId]);if(!rows.length)throw error(404,'INBOX_ITEM_NOT_FOUND','Inbox item was not found.');return this.inboxDto(rows[0]);}
  async setInboxRead(userId:string,id:string,read:boolean){const rows=await this.db.query(`UPDATE inbox_items SET read_at=CASE WHEN $3::boolean THEN COALESCE(read_at,now()) ELSE NULL END,updated_at=now() WHERE id=$1 AND recipient_id=$2 AND deleted_at IS NULL RETURNING id`,[id,userId,read]);if(!rows.length)throw error(404,'INBOX_ITEM_NOT_FOUND','Inbox item was not found.');return this.getInbox(userId,id);}
  async readAll(userId:string){const rows=await this.db.query(`UPDATE inbox_items SET read_at=statement_timestamp(),updated_at=statement_timestamp() WHERE recipient_id=$1 AND deleted_at IS NULL AND read_at IS NULL RETURNING id`,[userId]);return {updatedCount:rows.length};}
  async deleteInbox(userId:string,id:string){const rows=await this.db.query(`UPDATE inbox_items SET deleted_at=COALESCE(deleted_at,now()),updated_at=now() WHERE id=$1 AND recipient_id=$2 RETURNING id`,[id,userId]);if(!rows.length)throw error(404,'INBOX_ITEM_NOT_FOUND','Inbox item was not found.');}

  async processDue(now = new Date(), limit = 50): Promise<number> {
    const candidates=await this.db.query(`SELECT id,version,next_run_at FROM personal_notifications WHERE status IN ('SCHEDULED','ACTIVE') AND next_run_at <= $1 AND (retry_at IS NULL OR retry_at <= $1) ORDER BY COALESCE(retry_at,next_run_at),id LIMIT $2`,[now,limit]);
    let processed=0;for(const item of candidates){try{if(await this.processCandidate(item.id,now))processed++;}catch{await this.recordRetry(item,now);}}
    return processed;
  }
  private async latestDue(rule:RecurrenceRule,from:Date,now:Date){
    let occurrence:Date|null=await this.nextOccurrence(rule,new Date(from.getTime()-1));let latest:Date|null=null;let guard=0;
    while(occurrence&&occurrence<=now&&guard++<100000){latest=occurrence;occurrence=await this.nextOccurrence(rule,occurrence);}
    return {latest,next:occurrence};
  }
  private async processCandidate(id:string,now:Date){
    const q=this.db.createQueryRunner();await q.connect();await q.startTransaction();
    try{
      const before=(await q.query('SELECT sender_id,recipient_id FROM personal_notifications WHERE id=$1',[id]))[0] as Row|undefined;if(!before){await q.rollbackTransaction();return false;}
      const ids=[...new Set([before.sender_id,before.recipient_id])].sort();const lockedUsers=await q.query('SELECT id,deleted_at FROM users WHERE id=ANY($1::uuid[]) ORDER BY id FOR UPDATE',[ids]);
      const n=(await q.query("SELECT * FROM personal_notifications WHERE id=$1 AND status IN ('SCHEDULED','ACTIVE') AND next_run_at <= $2 AND (retry_at IS NULL OR retry_at <= $2) FOR UPDATE SKIP LOCKED",[id,now]))[0] as Row|undefined;
      if(!n){await q.commitTransaction();return false;}
      const active=lockedUsers.length===ids.length&&lockedUsers.every((u:Row)=>u.deleted_at===null);
      const allowed=active&&await this.isFriends(q,n.sender_id,n.recipient_id);
      if(!allowed){await q.query("UPDATE personal_notifications SET status='BLOCKED',block_reason=$2,next_run_at=NULL,retry_at=NULL,version=version+1,updated_at=now() WHERE id=$1",[id,active?'FRIENDSHIP_REMOVED':'USER_INACTIVE']);await q.commitTransaction();return true;}
      let deliverAt=new Date(n.next_run_at);let nextRun:Date|null=null;let nextStatus='COMPLETED';
      if(n.delivery.mode==='recurring'){
        const result=await this.latestDue(n.delivery.rule,deliverAt,now);if(result.latest)deliverAt=result.latest;nextRun=result.next;
        if(nextRun){nextStatus='ACTIVE';if(n.delivery.rule.endsOn){const candidateLocal=Temporal.Instant.from(nextRun.toISOString()).toZonedDateTimeISO(n.delivery.rule.timeZone).toPlainDate().toString();if(candidateLocal>n.delivery.rule.endsOn){nextRun=null;nextStatus='COMPLETED';}}}
      }
      await this.insertInbox(q,n,deliverAt);
      await q.query('UPDATE personal_notifications SET status=$2,next_run_at=$3,last_delivered_at=now(),retry_count=0,retry_at=NULL,failure_code=NULL,version=version+1,updated_at=now() WHERE id=$1',[id,nextStatus,nextRun]);
      await q.commitTransaction();return true;
    }catch(e){if(q.isTransactionActive)await q.rollbackTransaction();throw e;}finally{await q.release();}
  }
  private async recordRetry(candidate:{id:string;version:number;next_run_at:Date},now:Date){
    const {id}=candidate;
    const q=this.db.createQueryRunner();await q.connect();await q.startTransaction();
    try{const owner=(await q.query("SELECT sender_id,recipient_id FROM personal_notifications WHERE id=$1 AND version=$2 AND next_run_at=$3 AND status IN ('SCHEDULED','ACTIVE')",[id,candidate.version,candidate.next_run_at]))[0] as Row|undefined;if(!owner){await q.commitTransaction();return;}await this.lockUsers(q,[owner.sender_id,owner.recipient_id]);const n=(await q.query("SELECT * FROM personal_notifications WHERE id=$1 AND version=$2 AND next_run_at=$3 AND status IN ('SCHEDULED','ACTIVE') FOR UPDATE",[id,candidate.version,candidate.next_run_at]))[0] as Row|undefined;if(!n){await q.commitTransaction();return;}
      const retries=n.retry_count+1;if(retries>5)await q.query("UPDATE personal_notifications SET status='FAILED',failure_code='DELIVERY_FAILED',next_run_at=NULL,retry_at=NULL,retry_count=$2,version=version+1,updated_at=now() WHERE id=$1",[id,retries]);
      else await q.query('UPDATE personal_notifications SET retry_count=$2,retry_at=$3,updated_at=now() WHERE id=$1',[id,retries,new Date(now.getTime()+Math.pow(2,retries-1)*1000)]);
      await q.commitTransaction();
    }catch{if(q.isTransactionActive)await q.rollbackTransaction();}finally{await q.release();}
  }
}
