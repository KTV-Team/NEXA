import { createDevEndpoints } from './endpoints/dev';
import { createAuthEndpoints } from './endpoints/auth';
import { createHealthEndpoints } from './endpoints/health';
import { createUserEndpoints } from './endpoints/users';
import { createTransport, type ApiClientConfig } from './transport';

export { ApiClientError } from './errors';
export type { ApiClientConfig } from './transport';

export class ApiClient {
  readonly auth: ReturnType<typeof createAuthEndpoints>;
  readonly users: ReturnType<typeof createUserEndpoints>;
  readonly dev: ReturnType<typeof createDevEndpoints>;
  readonly health: ReturnType<typeof createHealthEndpoints>;

  constructor(config: ApiClientConfig) {
    const request = createTransport(config);
    this.auth = createAuthEndpoints(request);
    this.users = createUserEndpoints(request);
    this.dev = createDevEndpoints(request);
    this.health = createHealthEndpoints(request);
  }
}

export function createApiClient(config: ApiClientConfig): ApiClient {
  return new ApiClient(config);
}
