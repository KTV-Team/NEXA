interface SocialClient {
  friends: { cancel(id: string): Promise<void> };
  notifications: { create(dto: unknown): Promise<unknown> };
  inbox: { list(params: { read: boolean; page?: number }): Promise<unknown> };
}
export {};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createApiClient } = require('../../../../packages/api-client/src') as { createApiClient(config: { baseUrl: string; authClient: 'mobile'|'web' }): SocialClient };

describe('social API client contract', () => {
  const originalFetch=global.fetch;let fetchMock:jest.Mock;
  beforeEach(()=>{fetchMock=jest.fn().mockResolvedValue({ok:true,status:204} as Response);global.fetch=fetchMock as unknown as typeof fetch;});
  afterAll(()=>{global.fetch=originalFetch;});
  it('uses include credentials, boolean query values and bodyless DELETE for web clients',async()=>{
    const client=createApiClient({baseUrl:'https://api.example.test/api/v1',authClient:'web'});
    await client.inbox.list({read:false,page:2});
    const [url,options]=fetchMock.mock.calls[0] as [string,RequestInit];
    expect(url).toBe('https://api.example.test/api/v1/inbox?read=false&page=2');
    expect(options.credentials).toBe('include');expect(options.headers).toEqual({'X-Auth-Client':'web'});
    fetchMock.mockClear();await client.friends.cancel('00000000-0000-4000-8000-000000000001');
    const [,deleteOptions]=fetchMock.mock.calls[0] as [string,RequestInit];
    expect(deleteOptions.method).toBe('DELETE');expect(deleteOptions.body).toBeUndefined();expect(deleteOptions.headers).toEqual({'X-Auth-Client':'web'});
  });
});
