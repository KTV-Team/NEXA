interface SocialClient {
  friends: { cancel(id: string): Promise<void> };
  notifications: { create(dto: unknown): Promise<unknown> };
  inbox: {
    list(params: {
      read: boolean;
      page?: number;
    }): Promise<{ data: unknown[]; meta: { total: number } }>;
  };
  devices: {
    register(installationId: string, dto: { platform: 'android' | 'ios'; pushToken: string | null; permissionStatus: string }): Promise<{ installationId: string; registered: boolean }>;
    unregister(installationId: string): Promise<void>;
  };
}
export {};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createApiClient } = require('../../../../packages/api-client/src') as {
  createApiClient(config: { baseUrl: string; authClient: 'mobile' | 'web'; getAccessToken?: () => Promise<string | null> }): SocialClient;
};

describe('social API client contract', () => {
  const originalFetch = global.fetch;
  let fetchMock: jest.Mock;
  beforeEach(() => {
    fetchMock = jest
      .fn()
      .mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: { data: [], meta: { total: 0 } } }),
      } as Response);
    global.fetch = fetchMock as unknown as typeof fetch;
  });
  afterAll(() => {
    global.fetch = originalFetch;
  });
  it('uses include credentials, boolean query values and bodyless DELETE for web clients', async () => {
    const client = createApiClient({
      baseUrl: 'https://api.example.test/api/v1',
      authClient: 'web',
    });
    const page = await client.inbox.list({ read: false, page: 2 });
    expect(page).toEqual({ data: [], meta: { total: 0 } });
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.example.test/api/v1/inbox?read=false&page=2');
    expect(options.credentials).toBe('include');
    expect(options.headers).toEqual({ 'X-Auth-Client': 'web' });
    fetchMock.mockClear();
    fetchMock.mockResolvedValueOnce({ ok: true, status: 204 } as Response);
    await client.friends.cancel('00000000-0000-4000-8000-000000000001');
    const [, deleteOptions] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(deleteOptions.method).toBe('DELETE');
    expect(deleteOptions.body).toBeUndefined();
    expect(deleteOptions.headers).toEqual({ 'X-Auth-Client': 'web' });
  });

  it('registers and unregisters a device through the authenticated mobile contract', async () => {
    const installationId = '00000000-0000-4000-8000-000000000001';
    const client = createApiClient({
      baseUrl: 'https://api.example.test/api/v1',
      authClient: 'mobile',
      getAccessToken: async () => 'test-access-token',
    });
    const dto = {
      platform: 'ios' as const,
      pushToken: 'ExpoPushToken[device_token_123]',
      permissionStatus: 'granted',
    };
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { installationId, registered: true } }),
    } as Response);
    await client.devices.register(installationId, dto);
    const [registerUrl, registerOptions] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(registerUrl).toBe(`https://api.example.test/api/v1/devices/${installationId}`);
    expect(registerOptions.method).toBe('PUT');
    expect(registerOptions.headers).toMatchObject({
      Authorization: 'Bearer test-access-token',
      'X-Auth-Client': 'mobile',
      'Content-Type': 'application/json',
    });
    expect(registerOptions.body).toBe(JSON.stringify(dto));

    fetchMock.mockClear();
    fetchMock.mockResolvedValueOnce({ ok: true, status: 204 } as Response);
    await client.devices.unregister(installationId);
    const [unregisterUrl, unregisterOptions] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(unregisterUrl).toBe(`https://api.example.test/api/v1/devices/${installationId}`);
    expect(unregisterOptions.method).toBe('DELETE');
    expect(unregisterOptions.body).toBeUndefined();
  });
});
