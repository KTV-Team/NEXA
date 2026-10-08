import { DataSource } from 'typeorm';
import { SocialService } from '../../src/social/social.service';

describe('social transaction lifecycle', () => {
  it.each(['connect', 'startTransaction'] as const)(
    'releases its runner when %s fails',
    async (operation) => {
      const failure = new Error('Injected lifecycle failure');
      const runner = {
        connect: jest.fn().mockResolvedValue(undefined),
        startTransaction: jest.fn().mockResolvedValue(undefined),
        release: jest.fn().mockResolvedValue(undefined),
        isTransactionActive: false,
        isReleased: false,
      };
      runner[operation].mockRejectedValueOnce(failure);
      const source = { query: jest.fn().mockResolvedValue([]), createQueryRunner: () => runner };
      const service = new SocialService(source as unknown as DataSource);
      await expect(
        service.createNotification('user', {
          clientRequestId: 'key',
          recipientId: 'user',
          title: 'Reminder',
          body: 'Body',
          delivery: { mode: 'immediate' },
        }),
      ).rejects.toBe(failure);
      expect(runner.release).toHaveBeenCalledTimes(1);
    },
  );

  it('rolls back and releases its runner if commit fails', async () => {
    const failure = new Error('Injected commit failure');
    const runner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      query: jest
        .fn()
        .mockResolvedValueOnce([{ low_user_id: 'a', high_user_id: 'b' }])
        .mockResolvedValueOnce([{ id: 'a' }, { id: 'b' }])
        .mockResolvedValueOnce([[], 1]),
      commitTransaction: jest.fn().mockRejectedValueOnce(failure),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      isTransactionActive: true,
    };
    const source = { createQueryRunner: () => runner };
    await expect(
      new SocialService(source as unknown as DataSource).removeFriend('a', 'friendship'),
    ).rejects.toBe(failure);
    expect(runner.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(runner.release).toHaveBeenCalledTimes(1);
  });
});
