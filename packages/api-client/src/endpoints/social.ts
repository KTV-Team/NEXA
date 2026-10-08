import type {
  CancelNotificationDto, CreateNotificationDto, FriendRequest, Friendship, InboxItem,
  PaginatedResponse, PersonalNotification, ReadAllResponse, SendFriendRequestDto,
  SetInboxReadDto, UpdateNotificationDto, UserSummary,
} from '@nexa/types';
import type { ApiRequest } from '../transport';

const queryString = (params: Record<string, string | number | boolean | undefined>) => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined) query.set(key, String(value));
  return query.toString();
};

export function createSocialEndpoints(request: ApiRequest) {
  return {
    friends: {
      sendRequest: (dto: SendFriendRequestDto): Promise<FriendRequest> => request('POST', '/friend-requests', dto),
      requests: (params?: { direction?: 'incoming' | 'outgoing'; page?: number; limit?: number }): Promise<PaginatedResponse<FriendRequest>> => request('GET', `/friend-requests?${queryString(params ?? {})}`),
      accept: (requestId: string): Promise<Friendship> => request('POST', `/friend-requests/${encodeURIComponent(requestId)}/accept`),
      reject: (requestId: string): Promise<FriendRequest> => request('POST', `/friend-requests/${encodeURIComponent(requestId)}/reject`),
      cancel: (requestId: string): Promise<void> => request('DELETE', `/friend-requests/${encodeURIComponent(requestId)}`),
      list: (params?: { page?: number; limit?: number }): Promise<PaginatedResponse<Friendship>> => request('GET', `/friends?${queryString(params ?? {})}`),
      remove: (friendshipId: string): Promise<void> => request('DELETE', `/friends/${encodeURIComponent(friendshipId)}`),
    },
    notifications: {
      create: (dto: CreateNotificationDto): Promise<PersonalNotification> => request('POST', '/notifications', dto),
      list: (params?: { page?: number; limit?: number }): Promise<PaginatedResponse<PersonalNotification>> => request('GET', `/notifications?${queryString(params ?? {})}`),
      get: (id: string): Promise<PersonalNotification> => request('GET', `/notifications/${encodeURIComponent(id)}`),
      update: (id: string, dto: UpdateNotificationDto): Promise<PersonalNotification> => request('PATCH', `/notifications/${encodeURIComponent(id)}`, dto),
      cancel: (id: string, dto: CancelNotificationDto): Promise<PersonalNotification> => request('POST', `/notifications/${encodeURIComponent(id)}/cancel`, dto),
    },
    inbox: {
      list: (params?: { page?: number; limit?: number; read?: boolean }): Promise<PaginatedResponse<InboxItem>> => request('GET', `/inbox?${queryString(params ?? {})}`),
      unreadCount: (): Promise<{ unreadCount: number }> => request('GET', '/inbox/unread-count'),
      get: (itemId: string): Promise<InboxItem> => request('GET', `/inbox/${encodeURIComponent(itemId)}`),
      setRead: (itemId: string, dto: SetInboxReadDto): Promise<InboxItem> => request('PATCH', `/inbox/${encodeURIComponent(itemId)}`, dto),
      readAll: (): Promise<ReadAllResponse> => request('POST', '/inbox/read-all'),
      delete: (itemId: string): Promise<void> => request('DELETE', `/inbox/${encodeURIComponent(itemId)}`),
    },
  };
}
