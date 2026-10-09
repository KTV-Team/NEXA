import { describe, expect, it } from 'vitest';
import {
  buildCreateNotificationRequest,
  type CreateNotificationFormValues,
} from '../../../../../src/features/notifications/screens/create-notification/create-notification-form';

function values(overrides: Partial<CreateNotificationFormValues> = {}): CreateNotificationFormValues {
  return {
    recipientId: '00000000-0000-4000-8000-000000000001',
    title: '  Nhắc lịch  ',
    body: '  Nội dung  ',
    deliveryMode: 'immediate',
    scheduledDate: '',
    scheduledTime: '',
    recurrenceFrequency: 'daily',
    recurrenceStartsOn: '2026-10-08',
    recurrenceEndsOn: '',
    recurrenceLocalTime: '09:30',
    recurrenceWeekdays: [],
    ...overrides,
  };
}

describe('create notification form request', () => {
  it('uses the selected client request ID and trims immediate delivery content', () => {
    const result = buildCreateNotificationRequest(
      values(),
      '00000000-0000-4000-8000-000000000002',
      'Asia/Bangkok',
    );

    expect(result.errors).toEqual({});
    expect(result.payload).toMatchObject({
      clientRequestId: '00000000-0000-4000-8000-000000000002',
      recipientId: '00000000-0000-4000-8000-000000000001',
      title: 'Nhắc lịch',
      body: 'Nội dung',
      delivery: { mode: 'immediate' },
    });
  });

  it('converts one-time local date and time to an ISO UTC timestamp', () => {
    const result = buildCreateNotificationRequest(
      values({ deliveryMode: 'scheduled', scheduledDate: '09/10/2026', scheduledTime: '09:30' }),
      '00000000-0000-4000-8000-000000000002',
      'Asia/Bangkok',
      new Date('2026-10-08T00:00:00.000Z'),
    );

    expect(result.errors).toEqual({});
    expect(result.payload?.delivery).toEqual({
      mode: 'scheduled',
      scheduledAt: expect.stringMatching(/^2026-10-09T[0-9]{2}:[0-9]{2}:00\.000Z$/),
    });
  });

  it('creates the agreed weekly recurrence shape with ISO weekdays and device timezone', () => {
    const result = buildCreateNotificationRequest(
      values({
        deliveryMode: 'recurring',
        recurrenceFrequency: 'weekly',
        recurrenceWeekdays: [1, 4],
        recurrenceEndsOn: '2026-12-31',
      }),
      '00000000-0000-4000-8000-000000000002',
      'Asia/Bangkok',
      new Date('2026-10-08T00:00:00.000Z'),
    );

    expect(result.errors).toEqual({});
    expect(result.payload?.delivery).toEqual({
      mode: 'recurring',
      rule: {
        frequency: 'weekly',
        weekdays: [1, 4],
        timeZone: 'Asia/Bangkok',
        localTime: '09:30',
        startsOn: '2026-10-08',
        endsOn: '2026-12-31',
      },
    });
  });

  it('returns field errors for impossible dates, past schedules, and an empty weekly selection', () => {
    const invalidDate = buildCreateNotificationRequest(
      values({ deliveryMode: 'scheduled', scheduledDate: '31/02/2026', scheduledTime: '09:30' }),
      '00000000-0000-4000-8000-000000000002',
      'Asia/Bangkok',
    );
    const past = buildCreateNotificationRequest(
      values({ deliveryMode: 'scheduled', scheduledDate: '08/10/2026', scheduledTime: '08:00' }),
      '00000000-0000-4000-8000-000000000002',
      'Asia/Bangkok',
      new Date('2026-10-08T02:00:00.000Z'),
    );
    const noWeekdays = buildCreateNotificationRequest(
      values({ deliveryMode: 'recurring', recurrenceFrequency: 'weekly' }),
      '00000000-0000-4000-8000-000000000002',
      'Asia/Bangkok',
      new Date('2026-10-08T00:00:00.000Z'),
    );

    expect(invalidDate.errors.scheduledDate).toBeDefined();
    expect(past.errors.scheduledDate).toContain('tương lai');
    expect(noWeekdays.errors.recurrenceWeekdays).toBeDefined();
  });
});
