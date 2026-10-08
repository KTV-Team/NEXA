interface TestAuthClient {
  auth: {
    refresh(refreshToken?: string): Promise<unknown>;
    logout(refreshToken?: string): Promise<void>;
  };
}

// Keep the cross-workspace test runtime-only so the API tsconfig rootDir stays scoped to apps/api.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createApiClient } = require('../../../../packages/api-client/src') as {
  createApiClient(config: { baseUrl: string; authClient: 'mobile' | 'web' }): TestAuthClient;
};

describe('auth API client transport contract', () => {
  const originalFetch = global.fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 204 } as Response);
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('sends mobile refresh tokens in JSON and handles bodyless 204 logout', async () => {
    const client = createApiClient({ baseUrl: 'https://api.example.test', authClient: 'mobile' });
    await client.auth.refresh('a'.repeat(43));

    const [refreshUrl, refreshInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(refreshUrl).toBe('https://api.example.test/auth/refresh');
    expect(refreshInit.headers).toMatchObject({
      'X-Auth-Client': 'mobile',
      'Content-Type': 'application/json',
    });
    expect(refreshInit.credentials).toBe('omit');
    expect(refreshInit.body).toBe(JSON.stringify({ refreshToken: 'a'.repeat(43) }));

    fetchMock.mockClear();
    await client.auth.logout();
    const [, logoutInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(logoutInit.headers).toEqual({ 'X-Auth-Client': 'mobile' });
    expect(logoutInit.body).toBeUndefined();
  });

  it('uses web cookies and never sends a refresh token in the request body', async () => {
    const client = createApiClient({ baseUrl: 'https://api.example.test', authClient: 'web' });
    await client.auth.refresh();

    const [, refreshInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(refreshInit.headers).toMatchObject({
      'X-Auth-Client': 'web',
      'Content-Type': 'application/json',
    });
    expect(refreshInit.credentials).toBe('include');
    expect(refreshInit.body).toBe('{}');

    fetchMock.mockClear();
    await client.auth.logout();
    const [, logoutInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(logoutInit.headers).toEqual({ 'X-Auth-Client': 'web' });
    expect(logoutInit.credentials).toBe('include');
    expect(logoutInit.body).toBeUndefined();
  });
});
