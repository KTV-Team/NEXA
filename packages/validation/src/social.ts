import { z } from 'zod';
import { paginationSchema } from './pagination';

const uuid = z.string().uuid();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
});
const localTime = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const timeZone = z.string().min(1).max(100);
const recurrenceBase = z.object({ timeZone, localTime, startsOn: date, endsOn: date.optional() }).strict();
const recurrence = z.discriminatedUnion('frequency', [
  recurrenceBase.extend({ frequency: z.literal('daily') }),
  recurrenceBase.extend({ frequency: z.literal('weekly'), weekdays: z.array(z.number().int().min(1).max(7)).min(1).max(7) }),
]).superRefine((rule, context) => {
  if (rule.endsOn && rule.endsOn < rule.startsOn) context.addIssue({ code: z.ZodIssueCode.custom, path: ['endsOn'], message: 'End date must not precede start date.' });
  if (rule.frequency === 'weekly' && new Set(rule.weekdays).size !== rule.weekdays.length) context.addIssue({ code: z.ZodIssueCode.custom, path: ['weekdays'], message: 'Weekdays must be unique.' });
});
export const deliverySchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('immediate') }).strict(),
  z.object({ mode: z.literal('scheduled'), scheduledAt: z.string().datetime({ offset: true }) }).strict(),
  z.object({ mode: z.literal('recurring'), rule: recurrence }).strict(),
]);
export const createNotificationSchema = z.object({
  clientRequestId: uuid, recipientId: uuid, title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(5000), delivery: deliverySchema,
}).strict();
export const updateNotificationSchema = z.object({
  version: z.number().int().positive(), title: z.string().trim().min(1).max(200).optional(),
  body: z.string().trim().min(1).max(5000).optional(), delivery: deliverySchema.optional(),
}).strict().refine((value) => value.title !== undefined || value.body !== undefined || value.delivery !== undefined);
export const cancelNotificationSchema = z.object({ version: z.number().int().positive() }).strict();
export const sendFriendRequestSchema = z.object({ recipientId: uuid }).strict();
export const friendRequestQuerySchema = paginationSchema.extend({ direction: z.enum(['incoming', 'outgoing']).default('incoming') }).strict();
export const inboxQuerySchema = paginationSchema.extend({ read: z.enum(['true', 'false']).transform((value) => value === 'true').optional() }).strict();
export const readInboxSchema = z.object({ read: z.boolean() }).strict();
export const idParamSchema = z.object({ id: uuid }).strict();
export const requestIdParamSchema = z.object({ requestId: uuid }).strict();
export const itemIdParamSchema = z.object({ itemId: uuid }).strict();
export const installationIdParamSchema = z.object({ installationId: uuid }).strict();
export const inboxReadAllSchema = z.object({}).strict();
export const deviceRegistrationSchema = z.object({
  platform: z.enum(['android', 'ios']),
  pushToken: z.string().regex(/^(?:ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/).max(512).nullable(),
  permissionStatus: z.enum(['granted', 'provisional', 'denied', 'undetermined']),
}).strict().superRefine((value, context) => {
  const permissionAllowsToken = value.permissionStatus === 'granted' || value.permissionStatus === 'provisional';
  if (value.pushToken !== null && !permissionAllowsToken) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['pushToken'], message: 'A push token is required only when notification permission is granted.' });
  }
});
