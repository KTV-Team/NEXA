import { createDevEndpoints } from './endpoints/dev';
import { createHealthEndpoints } from './endpoints/health';
import { createUserEndpoints } from './endpoints/users';
import { createTransport, type ApiClientConfig } from './transport';
import type { AuthClientType } from '@nexa/types';
import { createAuthEndpoints, type AuthEndpoints } from './endpoints/auth';

export { ApiClientError } from './errors';
export type { ApiClientConfig } from './transport';

export class ApiClient<T extends AuthClientType = 'mobile'> {
  readonly auth: AuthEndpoints<T>;
  readonly users: ReturnType<typeof createUserEndpoints>;
  readonly dev: ReturnType<typeof createDevEndpoints>;
  readonly health: ReturnType<typeof createHealthEndpoints>;

  constructor(config: ApiClientConfig & { authClient?: T }) {
    const request = createTransport(config);
    this.auth = createAuthEndpoints(request, config.authClient ?? ('mobile' as T));
    this.users = createUserEndpoints(request);
    this.dev = createDevEndpoints(request);
    this.health = createHealthEndpoints(request);
  }
}

export function createApiClient(config: ApiClientConfig & { authClient: 'web' }): ApiClient<'web'>;
export function createApiClient(
  config: ApiClientConfig & { authClient?: 'mobile' },
): ApiClient<'mobile'>;
export function createApiClient(config: ApiClientConfig): ApiClient<AuthClientType>;
export function createApiClient(config: ApiClientConfig): ApiClient<AuthClientType> {
  return new ApiClient(config);
}
