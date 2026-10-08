import { calculateNextOccurrence } from '../../src/social/social.service';

describe('recurrence timezone calculation', () => {
  it('moves a nonexistent spring-forward local time through the DST gap', async () => {
    const next = await calculateNextOccurrence({ frequency: 'daily', timeZone: 'America/New_York', localTime: '02:30', startsOn: '2026-03-08' }, new Date('2026-03-08T06:00:00.000Z'));
    expect(next?.toISOString()).toBe('2026-03-08T07:30:00.000Z');
  });

  it('chooses the earlier instant for a repeated fall-back local time', async () => {
    const next = await calculateNextOccurrence({ frequency: 'daily', timeZone: 'America/New_York', localTime: '01:30', startsOn: '2026-11-01' }, new Date('2026-11-01T04:00:00.000Z'));
    expect(next?.toISOString()).toBe('2026-11-01T05:30:00.000Z');
  });
});
