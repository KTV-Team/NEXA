import { createNotificationSchema, deliverySchema, inboxQuerySchema, sendFriendRequestSchema } from '@nexa/validation';
import { updateUserSchema } from '@nexa/validation';

describe('social and profile request schemas', () => {
  it('trims profile values, permits HTTPS avatar removal, and rejects identity fields', () => {
    expect(updateUserSchema.parse({ name: '  NEXA User  ' })).toEqual({ name: 'NEXA User' });
    expect(updateUserSchema.parse({ avatarUrl: null })).toEqual({ avatarUrl: null });
    expect(updateUserSchema.safeParse({ email: 'someone@example.test' }).success).toBe(false);
    expect(updateUserSchema.safeParse({ avatarUrl: 'http://example.test/a.png' }).success).toBe(false);
    expect(updateUserSchema.safeParse({}).success).toBe(false);
  });

  it('requires strict UUID based friend and notification payloads', () => {
    expect(sendFriendRequestSchema.safeParse({ recipientId: 'not-a-uuid' }).success).toBe(false);
    expect(sendFriendRequestSchema.safeParse({ recipientId: '00000000-0000-4000-8000-000000000001', role: 'admin' }).success).toBe(false);
    expect(createNotificationSchema.safeParse({
      clientRequestId: '00000000-0000-4000-8000-000000000001', recipientId: '00000000-0000-4000-8000-000000000002',
      title: 'Hi', body: 'Hello', delivery: { mode: 'immediate' }, senderId: '00000000-0000-4000-8000-000000000003',
    }).success).toBe(false);
  });

  it('accepts recurrence shapes and parses literal read filters', () => {
    expect(deliverySchema.safeParse({ mode: 'recurring', rule: { frequency: 'weekly', timeZone: 'UTC', localTime: '09:30', startsOn: '2026-10-01', weekdays: [1, 5] } }).success).toBe(true);
    expect(deliverySchema.safeParse({ mode: 'recurring', rule: { frequency: 'weekly', timeZone: 'UTC', localTime: '9:30', startsOn: '2026-10-01', weekdays: [1, 1] } }).success).toBe(false);
    expect(inboxQuerySchema.parse({ read: 'false' }).read).toBe(false);
    expect(inboxQuerySchema.safeParse({ read: 'no' }).success).toBe(false);
  });
});
