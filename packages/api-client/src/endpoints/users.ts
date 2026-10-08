import type { PaginatedResponse, UpdateUserDto, User, UserSummary } from '@nexa/types';
import type { ApiRequest } from '../transport';

export function createUserEndpoints(request: ApiRequest) {
  return {
    me: (): Promise<User> => request('GET', '/users/me'),
    update: (dto: UpdateUserDto): Promise<User> => request('PATCH', '/users/me', dto),
    search: (params: { q: string; page?: number; limit?: number }): Promise<PaginatedResponse<UserSummary>> => {
      const query = new URLSearchParams(
        Object.entries(params ?? {}).map(([key, value]) => [key, String(value)]),
      ).toString();
      return request('GET', `/users?${query}`);
    },
    getById: (id: string): Promise<User> => request('GET', `/users/${id}`),
  };
}
