import type { DevDemoData } from '@nexa/types';
import type { ApiRequest } from '../transport';

export function createDevEndpoints(request: ApiRequest) {
  return {
    demo: (): Promise<DevDemoData> => request('GET', '/dev/demo'),
  };
}
