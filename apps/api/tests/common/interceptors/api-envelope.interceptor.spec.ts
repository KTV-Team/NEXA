import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { ApiEnvelopeInterceptor } from '../../../src/common/interceptors/api-envelope.interceptor';

describe('ApiEnvelopeInterceptor', () => {
  it('wraps response data even when its own fields include success', async () => {
    const payload = { success: false, reason: 'offline' } as const;
    const next: CallHandler<typeof payload> = { handle: () => of(payload) };
    const interceptor = new ApiEnvelopeInterceptor<typeof payload>();

    await expect(
      lastValueFrom(interceptor.intercept({} as ExecutionContext, next)),
    ).resolves.toEqual({ success: true, data: payload });
  });
});
