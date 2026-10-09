import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError, createApiClient } from '@nexa/api-client';
import { loginSchema, registerSchema } from '@nexa/validation';
import { AuthService, type SessionStorage } from '../../../src/features/auth/auth-service';

const user = {
  id: 'user-123',
  name: 'Hoàng Minh Trí',
  email: 'tri@example.com',
  role: 'user' as const,
  createdAt: '2026-10-06T00:00:00Z',
  updatedAt: '2026-10-06T00:00:00Z',
};
const tokens = { accessToken: 'test-access', refreshToken: 'test-refresh', expiresIn: 3600 };
const response = { user, tokens };
const credentials = { email: user.email, password: 'Example123' };
function store(value: string | null = null): SessionStorage {
  return {
    read: vi.fn(async () => value),
    write: vi.fn(async (next) => {
      value = next;
    }),
    remove: vi.fn(async () => {
      value = null;
    }),
  };
}
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify({ success: true, data }), { status });
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('mobile form contracts', () => {
  it('normalizes email and name while preserving the password exactly', () => {
    expect(loginSchema.parse({ email: ' TRI@EXAMPLE.COM ', password: '  Example123 ' })).toEqual({
      email: user.email,
      password: '  Example123 ',
    });
    expect(registerSchema.parse({ ...credentials, name: '  Hoàng Minh Trí  ' }).name).toBe(
      user.name,
    );
  });
  it('never includes confirmation or a client-supplied role in the registration DTO', () => {
    expect(
      registerSchema.parse({
        ...credentials,
        name: user.name,
        confirmPassword: credentials.password,
        role: 'admin',
      }),
    ).toEqual({ ...credentials, name: user.name });
  });
  it('rejects whitespace names, invalid email and weak or oversized passwords', () => {
    for (const changes of [
      { name: '  ' },
      { email: 'wrong' },
      { password: 'abcdefgh' },
      { password: 'A1' + 'a'.repeat(127) },
    ]) {
      expect(
        registerSchema.safeParse({ ...credentials, name: user.name, ...changes }).success,
      ).toBe(false);
    }
  });
});

describe('authentication transport', () => {
  it('posts the registration DTO to the shared endpoint', async () => {
    const fetcher = vi.fn(async () => json(response));
    vi.stubGlobal('fetch', fetcher);
    await createApiClient({ baseUrl: 'https://api.example/api/v1/' }).auth.register({
      ...credentials,
      name: user.name,
    });
    expect(fetcher.mock.calls[0]).toEqual([
      'https://api.example/api/v1/auth/register',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ ...credentials, name: user.name }),
      }),
    ]);
  });
  it('handles logout HTTP 204 without trying to parse an empty body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 204 })),
    );
    await expect(
      createApiClient({ baseUrl: 'https://api.example' }).auth.logout(),
    ).resolves.toBeUndefined();
  });
  it('rejects the existing stub response instead of treating it as a login', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(response))),
    );
    await expect(
      createApiClient({ baseUrl: 'https://api.example' }).auth.login(credentials),
    ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });
  it('does not invalidate another session when login credentials are rejected', async () => {
    const unauthorized = vi.fn();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              success: false,
              error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' },
            }),
            { status: 401 },
          ),
      ),
    );
    const client = createApiClient({
      baseUrl: 'https://api.example',
      onUnauthorized: unauthorized,
    });
    await expect(client.auth.login(credentials)).rejects.toBeInstanceOf(ApiClientError);
    expect(unauthorized).not.toHaveBeenCalled();
    await expect(client.users.me()).rejects.toBeInstanceOf(ApiClientError);
    expect(unauthorized).toHaveBeenCalledOnce();
  });
  it('cancels stalled requests and returns a retryable timeout error', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: unknown, init: RequestInit) =>
          new Promise((_resolve, reject) =>
            init.signal?.addEventListener('abort', () => reject(new Error('aborted'))),
          ),
      ),
    );
    const assertion = expect(
      createApiClient({ baseUrl: 'https://api.example', timeoutMs: 50 }).auth.login(credentials),
    ).rejects.toMatchObject({ code: 'TIMEOUT' });
    await vi.advanceTimersByTimeAsync(50);
    await assertion;
  });
});

describe('session lifecycle', () => {
  it('persists the returned session, never the password', async () => {
    const storage = store();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json(response)),
    );
    await new AuthService('https://api.example', storage).login(credentials, true);
    const saved = await storage.read();
    expect(saved).toContain(tokens.refreshToken);
    expect(saved).not.toContain(credentials.password);
  });
  it('removes an older remembered session when remember-me is unchecked', async () => {
    const storage = store('old-session');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json(response)),
    );
    await new AuthService('https://api.example', storage).login(credentials, false);
    expect(await storage.read()).toBeNull();
  });
  it('does not extend token expiry when restoring a valid session', async () => {
    const expiresAt = Date.now() + 120000;
    const storage = store(JSON.stringify({ ...response, expiresAt }));
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json(user)),
    );
    const restored = await new AuthService('https://api.example', storage).restore();
    expect(restored?.expiresAt).toBe(expiresAt);
  });
  it('shares an in-flight restore across concurrent callers', async () => {
    const storage = store(JSON.stringify({ ...response, expiresAt: Date.now() + 120000 }));
    const fetcher = vi.fn(async () => json(user));
    vi.stubGlobal('fetch', fetcher);
    const service = new AuthService('https://api.example', storage);
    const [first, second] = await Promise.all([service.restore(), service.restore()]);
    expect(first).toEqual(second);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('rotates an expired token before accessing the profile and persists the new token', async () => {
    const storage = store(JSON.stringify({ ...response, expiresAt: Date.now() - 1 }));
    const newTokens = { ...tokens, accessToken: 'rotated-access', refreshToken: 'rotated-refresh' };
    const fetcher = vi.fn(async (url: string, init: RequestInit) => {
      if (url.endsWith('/auth/refresh')) return json(newTokens);
      expect(init.headers).toMatchObject({ Authorization: 'Bearer rotated-access' });
      return json(user);
    });
    vi.stubGlobal('fetch', fetcher);
    const restored = await new AuthService('https://api.example', storage).restore();
    expect(restored?.tokens).toEqual(newTokens);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(await storage.read()).toContain('rotated-refresh');
  });
  it('clears a corrupt or revoked session', async () => {
    const corrupt = store('broken-json');
    expect(await new AuthService('https://api.example', corrupt).restore()).toBeNull();
    expect(await corrupt.read()).toBeNull();
    const revoked = store(JSON.stringify({ ...response, expiresAt: Date.now() + 120000 }));
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ success: false }), { status: 401 })),
    );
    expect(await new AuthService('https://api.example', revoked).restore()).toBeNull();
    expect(await revoked.read()).toBeNull();
  });
  it('keeps persisted data for retry when restoration hits an outage, and never returns an authenticated session', async () => {
    const storage = store(JSON.stringify({ ...response, expiresAt: Date.now() + 120000 }));
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('offline');
      }),
    );
    await expect(new AuthService('https://api.example', storage).restore()).rejects.toThrow(
      'offline',
    );
    expect(await storage.read()).not.toBeNull();
  });
  it('clears local credentials even if remote logout fails', async () => {
    const storage = store();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(json(response))
      .mockRejectedValueOnce(new TypeError('offline'));
    vi.stubGlobal('fetch', fetcher);
    const service = new AuthService('https://api.example', storage);
    await service.login(credentials, true);
    await expect(service.logout()).rejects.toThrow('offline');
    expect(await storage.read()).toBeNull();
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      'https://api.example/auth/logout',
      expect.objectContaining({
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      }),
    );
  });
  it('does not restore a logged-out session when a refresh response arrives late', async () => {
    const storage = store();
    let resolveRefresh: (response: Response) => void = () => { throw new Error('Refresh did not start'); };
    let markRefreshStarted: () => void = () => undefined;
    const refreshStarted = new Promise<void>((resolve) => { markRefreshStarted = resolve; });
    const fetcher = vi.fn(async (url: string) => {
      if (url.endsWith('/auth/login')) return json({ user, tokens: { ...tokens, expiresIn: 1 } });
      if (url.endsWith('/auth/refresh')) {
        markRefreshStarted();
        return new Promise<Response>((resolve) => { resolveRefresh = resolve; });
      }
      if (url.endsWith('/auth/logout')) return new Response(null, { status: 204 });
      throw new Error('Profile request must not run after logout');
    });
    vi.stubGlobal('fetch', fetcher);
    const service = new AuthService('https://api.example', storage);
    await service.login(credentials, true);
    const profile = service.api.users.me();
    const rejected = expect(profile).rejects.toMatchObject({ code: 'SESSION_EXPIRED' });
    await refreshStarted;
    await service.logout();
    resolveRefresh(json({ ...tokens, accessToken: 'late-access', refreshToken: 'late-refresh' }));
    await rejected;
    expect(await storage.read()).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it('ignores an unauthorized response from an account used before logout', async () => {
    const storage = store();
    let rejectOldRequest: (response: Response) => void = () => { throw new Error('Request did not start'); };
    let markStarted: () => void = () => undefined;
    const requestStarted = new Promise<void>((resolve) => { markStarted = resolve; });
    let logins = 0;
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.endsWith('/auth/login')) {
        ++logins;
        return json({ user: { ...user, id: `user-${logins}` }, tokens: { ...tokens, accessToken: `access-${logins}` } });
      }
      if (url.endsWith('/auth/logout')) return new Response(null, { status: 204 });
      if (url.endsWith('/users/me') && logins === 1) {
        markStarted();
        return new Promise<Response>((resolve) => { rejectOldRequest = resolve; });
      }
      return json({ ...user, id: 'user-2' });
    }));
    const service = new AuthService('https://api.example', storage);
    await service.login(credentials, true);
    const oldRequest = service.api.users.me();
    const rejection = expect(oldRequest).rejects.toMatchObject({ statusCode: 401 });
    await requestStarted;
    await service.logout();
    await service.login(credentials, true);
    rejectOldRequest(new Response(JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED', message: 'Expired' } }), { status: 401 }));
    await rejection;
    expect((await service.api.users.me()).id).toBe('user-2');
    expect(await storage.read()).toContain('access-2');
  });
});
