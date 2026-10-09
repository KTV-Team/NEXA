import type { ID, PaginatedResponse } from './common';
import type { UserSummary } from './users';

export type FriendRequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
export interface FriendRequest {
  id: ID; sender: UserSummary; recipient: UserSummary; status: FriendRequestStatus;
  friendshipId: ID | null; createdAt: string; updatedAt: string;
}
export interface Friendship { id: ID; friend: UserSummary; createdAt: string }
export interface SendFriendRequestDto { recipientId: ID }
export type FriendRequestDirection = 'incoming' | 'outgoing';

export type RecurrenceRule =
  | { frequency: 'daily'; timeZone: string; localTime: string; startsOn: string; endsOn?: string }
  | { frequency: 'weekly'; timeZone: string; localTime: string; startsOn: string; endsOn?: string; weekdays: number[] };
export type Delivery = { mode: 'immediate' } | { mode: 'scheduled'; scheduledAt: string } | { mode: 'recurring'; rule: RecurrenceRule };
export interface CreateNotificationDto { clientRequestId: ID; recipientId: ID; title: string; body: string; delivery: Delivery }
export interface UpdateNotificationDto { version: number; title?: string; body?: string; delivery?: Delivery }
export interface CancelNotificationDto { version: number }
export type NotificationStatus = 'QUEUED' | 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'BLOCKED' | 'FAILED';
export interface PersonalNotification {
  id: ID; senderId: ID; recipientId: ID; recipient: UserSummary | null; title: string; body: string;
  delivery: Delivery; status: NotificationStatus; version: number; nextRunAt: string | null;
  lastDeliveredAt: string | null; cancelledAt: string | null; blockReason: string | null;
  failureCode: string | null; createdAt: string; updatedAt: string;
}
export interface InboxItem {
  id: ID; notificationId: ID; occurrenceId: ID; sender: UserSummary; title: string; body: string;
  scheduledFor: string; deliveredAt: string; readAt: string | null;
}
export type Page<T> = PaginatedResponse<T>;
export interface SetInboxReadDto { read: boolean }
export interface ReadAllResponse { updatedCount: number }

export type PushPlatform = 'android' | 'ios';
export type PushPermissionStatus = 'granted' | 'provisional' | 'denied' | 'undetermined';
export interface DeviceRegistrationDto {
  platform: PushPlatform;
  pushToken: string | null;
  permissionStatus: PushPermissionStatus;
}
export interface DeviceRegistrationResponse { installationId: ID; registered: boolean }
export type InboxEventKind = 'created' | 'updated' | 'deleted' | 'resync';
export interface InboxRealtimeEvent {
  eventId: ID;
  kind: InboxEventKind;
  itemId?: ID;
}
