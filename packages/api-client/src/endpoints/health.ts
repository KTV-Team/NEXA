import type { HealthStatus } from '@nexa/types';
import type { ApiRequest } from '../transport';

export function createHealthEndpoints(request: ApiRequest) {
  return { check: (): Promise<HealthStatus> => request('GET', '/health') };
}
