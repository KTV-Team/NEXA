import type { PaginatedResponse, UpdateUserDto, User } from '@nexa/types';
import type { ApiRequest } from '../transport';

export function createUserEndpoints(request: ApiRequest) {
  return {
    me: (): Promise<User> => request('GET', '/users/me'),
    update: (dto: UpdateUserDto): Promise<User> => request('PATCH', '/users/me', dto),
    list: (params?: { page?: number; limit?: number }): Promise<PaginatedResponse<User>> => {
      const query = new URLSearchParams(
        Object.entries(params ?? {}).map(([key, value]) => [key, String(value)]),
      ).toString();
      return request('GET', `/users${query ? `?${query}` : ''}`);
    },
    getById: (id: string): Promise<User> => request('GET', `/users/${id}`),
  };
}
