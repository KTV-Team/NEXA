import { pushRetryDelayMs } from '../../src/social/inbox-delivery.worker';
import { ExpoPushService, truncateUtf8 } from '../../src/social/expo-push.service';

describe('durable inbox push delivery', () => {
  it('uses the approved retry schedule and stops after five retries', () => {
    expect([1, 2, 3, 4, 5].map((attempt) => pushRetryDelayMs(attempt, 0.5))).toEqual([
      5_000,
      15_000,
      45_000,
      135_000,
      405_000,
    ]);
    expect(pushRetryDelayMs(0, 0.5)).toBeNull();
    expect(pushRetryDelayMs(6, 0.5)).toBeNull();
  });

  it('applies bounded jitter to each retry interval', () => {
    expect(pushRetryDelayMs(1, 0)).toBe(4_000);
    expect(pushRetryDelayMs(1, 1)).toBe(6_000);
  });

  it('truncates push content on UTF-8 character boundaries within provider limits', () => {
    const title = truncateUtf8(`${'a'.repeat(509)}😀title`, 512);
    const body = truncateUtf8('通知'.repeat(1000), 2400);
    expect(Buffer.byteLength(title, 'utf8')).toBeLessThanOrEqual(512);
    expect(Buffer.byteLength(body, 'utf8')).toBeLessThanOrEqual(2400);
    expect(title.endsWith('…')).toBe(true);
    expect(body.endsWith('…')).toBe(true);
  });

  it('builds a native notification with only the authorized inbox identifiers', () => {
    const message = new ExpoPushService().message({
      token: 'ExpoPushToken[test-device]',
      title: 'Nhắc lịch',
      body: 'Nội dung đã lưu trong inbox',
      itemId: '00000000-0000-4000-8000-000000000001',
      occurrenceId: '00000000-0000-4000-8000-000000000002',
    });
    expect(message).toMatchObject({
      to: 'ExpoPushToken[test-device]',
      title: 'Nhắc lịch',
      body: 'Nội dung đã lưu trong inbox',
      sound: 'default',
      priority: 'high',
      channelId: 'default',
      data: {
        itemId: '00000000-0000-4000-8000-000000000001',
        occurrenceId: '00000000-0000-4000-8000-000000000002',
      },
    });
    expect(Object.keys(message.data).sort()).toEqual(['itemId', 'occurrenceId']);
  });
});
