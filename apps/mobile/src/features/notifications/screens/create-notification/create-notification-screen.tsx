import { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import * as Crypto from 'expo-crypto';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Friendship, PersonalNotification, UserSummary } from '@nexa/types';
import { ApiClientError } from '@nexa/api-client';
import { colors } from '@nexa/design-tokens';
import { AppText } from '@/components/app-text';
import { Icon, type IconName } from '@/components/icon';
import { PrimaryButton } from '@/components/primary-button';
import { useAuth } from '@/features/auth/auth-provider';
import {
  buildCreateNotificationRequest,
  localCalendarDate,
  type CreateNotificationFormValues,
  type NotificationFormErrors,
  type NotificationFormField,
} from './create-notification-form';
import { styles } from './create-notification-screen.styles';

type Recipient = 'self' | 'friend';
type DeliveryMode = CreateNotificationFormValues['deliveryMode'];

const deliveryOptions: { value: DeliveryMode; title: string; detail: string; icon: IconName }[] = [
  { value: 'immediate', title: 'Gửi ngay', detail: 'Lưu yêu cầu để máy chủ xử lý.', icon: 'mail' },
  { value: 'scheduled', title: 'Lên lịch một lần', detail: 'Chọn thời điểm trong tương lai.', icon: 'calendar' },
  { value: 'recurring', title: 'Lặp lại định kỳ', detail: 'Lặp theo ngày hoặc tuần.', icon: 'repeat' },
];

const weekdays = [
  { value: 1, label: 'T2' },
  { value: 2, label: 'T3' },
  { value: 3, label: 'T4' },
  { value: 4, label: 'T5' },
  { value: 5, label: 'T6' },
  { value: 6, label: 'T7' },
  { value: 7, label: 'CN' },
];

function timeZoneForDevice(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function emptyForm(now = new Date()): CreateNotificationFormValues {
  return {
    recipientId: '',
    title: '',
    body: '',
    deliveryMode: 'immediate',
    scheduledDate: '',
    scheduledTime: '',
    recurrenceFrequency: 'daily',
    recurrenceStartsOn: localCalendarDate(now),
    recurrenceEndsOn: '',
    recurrenceLocalTime: '09:00',
    recurrenceWeekdays: [],
  };
}

function statusCopy(notification: PersonalNotification): string {
  switch (notification.status) {
    case 'QUEUED': return 'Đã tiếp nhận yêu cầu. Máy chủ sẽ lưu thông báo vào inbox.';
    case 'SCHEDULED': return 'Thông báo đã được lên lịch.';
    case 'ACTIVE': return 'Lịch lặp đang hoạt động.';
    case 'COMPLETED': return 'Thông báo đã được lưu vào inbox.';
    case 'BLOCKED': return 'Không thể gửi vì người nhận không còn đủ điều kiện.';
    case 'FAILED': return 'Máy chủ không thể lưu thông báo vào inbox.';
    case 'CANCELLED': return 'Thông báo đã bị hủy.';
  }
}

function statusIcon(notification: PersonalNotification): IconName {
  switch (notification.status) {
    case 'QUEUED': return 'clock';
    case 'SCHEDULED': return 'calendar';
    case 'ACTIVE': return 'repeat';
    case 'COMPLETED': return 'check';
    case 'BLOCKED':
    case 'FAILED': return 'alert';
    case 'CANCELLED': return 'close';
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'RECIPIENT_NOT_ALLOWED') return 'Người nhận không còn là bạn đã chấp nhận.';
    if (error.code === 'IDEMPOTENCY_KEY_REUSED') return 'Yêu cầu đã đổi nội dung. Hãy gửi lại như một thông báo mới.';
    if (error.code === 'INVALID_SCHEDULE') return 'Thời gian hoặc quy tắc lặp không hợp lệ.';
    return error.message;
  }
  return 'Không thể kết nối máy chủ. Hãy thử lại.';
}

export default function CreateNotificationScreen() {
  const { api, session, clearExpiredSession } = useAuth();
  const sessionUserId = session?.user.id;
  const deviceTimeZone = useMemo(timeZoneForDevice, []);
  const [recipient, setRecipient] = useState<Recipient>('self');
  const [friendId, setFriendId] = useState('');
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [friendPage, setFriendPage] = useState(1);
  const [friendPages, setFriendPages] = useState(1);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendsError, setFriendsError] = useState<string | null>(null);
  const [friendsRetryKey, setFriendsRetryKey] = useState(0);
  const [form, setForm] = useState(() => emptyForm());
  const [fieldErrors, setFieldErrors] = useState<NotificationFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<PersonalNotification | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const requestKey = useRef<{ fingerprint: string; id: string } | null>(null);
  const activeUserId = useRef(session?.user.id);
  activeUserId.current = session?.user.id;

  useEffect(() => {
    if (recipient !== 'friend' || !sessionUserId) {
      setFriends([]);
      setFriendPage(1);
      setFriendPages(1);
      setFriendsError(null);
      return;
    }

    let active = true;
    setFriendsLoading(true);
    setFriendsError(null);
    void api.friends.list({ page: 1, limit: 20 }).then((result) => {
      if (!active || activeUserId.current !== sessionUserId) return;
      setFriends(result.data);
      setFriendPage(result.meta.page);
      setFriendPages(result.meta.totalPages);
      setFriendId((current) => result.data.some((friend) => friend.friend.id === current) ? current : '');
    }).catch((failure: unknown) => {
      if (!active || activeUserId.current !== sessionUserId) return;
      if (failure instanceof ApiClientError && failure.statusCode === 401) {
        void clearExpiredSession();
        return;
      }
      setFriendsError(errorMessage(failure));
    }).finally(() => {
      if (active) setFriendsLoading(false);
    });
    return () => { active = false; };
  }, [api, clearExpiredSession, recipient, sessionUserId, friendsRetryKey]);

  const updateForm = <K extends keyof CreateNotificationFormValues>(key: K, value: CreateNotificationFormValues[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      if (!current[key as NotificationFormField]) return current;
      const next = { ...current };
      delete next[key as NotificationFormField];
      return next;
    });
    setError(null);
  };

  const loadMoreFriends = async () => {
    if (friendsLoading || friendPage >= friendPages || !session) return;
    const owner = session.user.id;
    setFriendsLoading(true);
    setFriendsError(null);
    try {
      const result = await api.friends.list({ page: friendPage + 1, limit: 20 });
      if (activeUserId.current !== owner) return;
      setFriends((current) => {
        const seen = new Set(current.map((friend) => friend.friend.id));
        return [...current, ...result.data.filter((friend) => !seen.has(friend.friend.id))];
      });
      setFriendPage(result.meta.page);
      setFriendPages(result.meta.totalPages);
    } catch (failure) {
      if (activeUserId.current !== owner) return;
      if (failure instanceof ApiClientError && failure.statusCode === 401) {
        await clearExpiredSession();
        return;
      }
      setFriendsError(errorMessage(failure));
    } finally {
      setFriendsLoading(false);
    }
  };

  const submit = async () => {
    if (submitting || !session) return;
    const owner = session.user.id;
    const values = {
      ...form,
      recipientId: recipient === 'self' ? owner : friendId,
    };
    const candidateId = requestKey.current?.id ?? Crypto.randomUUID();
    const result = buildCreateNotificationRequest(values, candidateId, deviceTimeZone);
    setFieldErrors(result.errors);
    setError(null);
    if (!result.payload) return;

    const fingerprint = JSON.stringify({ ...result.payload, clientRequestId: '' });
    const clientRequestId = requestKey.current?.fingerprint === fingerprint
      ? requestKey.current.id
      : Crypto.randomUUID();
    requestKey.current = { fingerprint, id: clientRequestId };
    const payload = { ...result.payload, clientRequestId };
    setSubmitting(true);
    try {
      const notification = await api.notifications.create(payload);
      if (activeUserId.current !== owner) return;
      setCreated(notification);
      requestKey.current = null;
    } catch (failure) {
      if (activeUserId.current !== owner) return;
      if (failure instanceof ApiClientError && failure.statusCode === 401) {
        await clearExpiredSession();
        return;
      }
      if (failure instanceof ApiClientError && failure.code === 'RECIPIENT_NOT_ALLOWED') {
        setFieldErrors((current) => ({ ...current, recipientId: errorMessage(failure) }));
      }
      setError(errorMessage(failure));
    } finally {
      if (activeUserId.current === owner) setSubmitting(false);
    }
  };

  const refreshStatus = async () => {
    if (!created || !session) return;
    const owner = session.user.id;
    setLoadingStatus(true);
    setError(null);
    try {
      const notification = await api.notifications.get(created.id);
      if (activeUserId.current === owner) setCreated(notification);
    } catch (failure) {
      if (activeUserId.current !== owner) return;
      if (failure instanceof ApiClientError && failure.statusCode === 401) {
        await clearExpiredSession();
        return;
      }
      setError(errorMessage(failure));
    } finally {
      if (activeUserId.current === owner) setLoadingStatus(false);
    }
  };

  const createAnother = () => {
    requestKey.current = null;
    setCreated(null);
    setForm(emptyForm());
    setRecipient('self');
    setFriendId('');
    setFieldErrors({});
    setError(null);
  };

  const renderFieldError = (field: NotificationFormField) => {
    const message = fieldErrors[field];
    return message ? <AppText accessibilityRole="alert" variant="caption" style={styles.fieldError}>{message}</AppText> : null;
  };

  const selectedFriend = friends.find((friend) => friend.friend.id === friendId)?.friend;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'right', 'bottom', 'left']}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quay lại hộp thư"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
        >
          <Icon name="back" size={20} />
        </Pressable>
        <AppText variant="body-md-medium" style={styles.headerTitle}>Tạo thông báo</AppText>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {created ? (
            <View style={styles.statusCard}>
              <View style={styles.statusHeading}>
                <Icon
                  name={statusIcon(created)}
                  size={20}
                  color={created.status === 'COMPLETED' ? colors['moss-dark'] : colors.steel}
                />
                <AppText variant="heading-4">Trạng thái thông báo</AppText>
              </View>
              <AppText accessibilityRole="text" variant="body-sm">{statusCopy(created)}</AppText>
              {error ? <AppText accessibilityRole="alert" variant="caption" style={styles.fieldError}>{error}</AppText> : null}
              <PrimaryButton
                label="Kiểm tra trạng thái"
                busy={loadingStatus}
                busyLabel="Đang tải…"
                onPress={() => { void refreshStatus(); }}
              />
              <Pressable accessibilityRole="button" onPress={createAnother} style={styles.secondaryAction}>
                <AppText variant="button-md">Tạo thông báo mới</AppText>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => router.replace('/')} style={styles.secondaryAction}>
                <AppText variant="button-md">Về Hộp thư</AppText>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.titleGroup}>
                <AppText variant="heading-3" style={styles.title}>Gửi thông báo mới</AppText>
                <AppText variant="body-sm" style={styles.subtitle}>
                  Tạo lời nhắc cho bản thân hoặc gửi cho bạn bè đã chấp nhận kết bạn.
                </AppText>
              </View>

              {!session ? (
                <View style={styles.availabilityNotice}>
                  <Icon name="alert" size={18} color={colors.steel} />
                  <AppText variant="body-sm" style={styles.noticeText}>
                    Đăng nhập để lưu và gửi thông báo.
                  </AppText>
                </View>
              ) : null}

              <View style={styles.fieldGroup}>
                <FieldLabel>Người nhận</FieldLabel>
                <View style={styles.segmentedControl}>
                  <SegmentButton label="Chính tôi" selected={recipient === 'self'} onPress={() => { setRecipient('self'); setFieldErrors({}); }} />
                  <SegmentButton label="Bạn bè" selected={recipient === 'friend'} onPress={() => { setRecipient('friend'); setFieldErrors({}); }} />
                </View>
                {recipient === 'self' ? (
                  <View style={styles.selectedRecipient}>
                    <View style={styles.recipientAvatar}>
                      <AppText variant="caption-bold" style={styles.recipientInitial}>Tôi</AppText>
                    </View>
                    <View style={styles.recipientCopy}>
                      <AppText variant="body-sm-medium">Chính tôi</AppText>
                      <AppText variant="caption" style={styles.secondaryText}>Tự nhắc nhở bản thân</AppText>
                    </View>
                    <Icon name="check" size={18} color={colors['moss-dark']} />
                  </View>
                ) : (
                  <View style={styles.friendsList}>
                    {friendsLoading && friends.length === 0 ? (
                      <AppText variant="body-sm">Đang tải danh sách bạn bè…</AppText>
                    ) : friendsError ? (
                      <View style={styles.friendError}>
                        <AppText accessibilityRole="alert" variant="body-sm" style={styles.fieldError}>{friendsError}</AppText>
                        <Pressable accessibilityRole="button" onPress={() => setFriendsRetryKey((value) => value + 1)}>
                          <AppText variant="body-sm-medium">Thử tải lại</AppText>
                        </Pressable>
                      </View>
                    ) : friends.length === 0 ? (
                      <AppText variant="body-sm" style={styles.secondaryText}>Bạn chưa có bạn bè đã chấp nhận.</AppText>
                    ) : (
                      friends.map(({ friend }) => (
                        <FriendOption
                          key={friend.id}
                          friend={friend}
                          selected={friendId === friend.id}
                          onPress={() => { setFriendId(friend.id); setFieldErrors({}); }}
                        />
                      ))
                    )}
                    {friendPage < friendPages ? (
                      <Pressable accessibilityRole="button" disabled={friendsLoading} onPress={() => { void loadMoreFriends(); }} style={styles.loadMoreButton}>
                        <AppText variant="body-sm-medium">{friendsLoading ? 'Đang tải…' : 'Tải thêm bạn bè'}</AppText>
                      </Pressable>
                    ) : null}
                  </View>
                )}
                {selectedFriend ? <AppText variant="caption" style={styles.selectedFriendName}>Đã chọn: {selectedFriend.name}</AppText> : null}
                {renderFieldError('recipientId')}
              </View>

              <View style={styles.fieldGroup}>
                <FieldLabel>Tiêu đề thông báo</FieldLabel>
                <TextInput
                  accessibilityLabel="Tiêu đề thông báo"
                  accessibilityHint={fieldErrors.title ? `Lỗi: ${fieldErrors.title}` : undefined}
                  placeholder="Nhập tiêu đề"
                  placeholderTextColor={colors.muted}
                  value={form.title}
                  onChangeText={(value) => updateForm('title', value)}
                  style={styles.input}
                  returnKeyType="next"
                  maxLength={200}
                />
                {renderFieldError('title')}
                <AppText variant="caption" style={styles.helper}>Tối đa 200 ký tự.</AppText>
              </View>

              <View style={styles.fieldGroup}>
                <FieldLabel>Nội dung chi tiết</FieldLabel>
                <TextInput
                  accessibilityLabel="Nội dung chi tiết"
                  accessibilityHint={fieldErrors.body ? `Lỗi: ${fieldErrors.body}` : undefined}
                  placeholder="Nhập nội dung thông báo"
                  placeholderTextColor={colors.muted}
                  value={form.body}
                  onChangeText={(value) => updateForm('body', value)}
                  style={[styles.input, styles.multilineInput]}
                  multiline
                  textAlignVertical="top"
                  maxLength={5000}
                />
                {renderFieldError('body')}
                <AppText variant="caption" style={styles.helper}>Tối đa 5000 ký tự.</AppText>
              </View>

              <View style={styles.fieldGroup}>
                <FieldLabel>Hình thức gửi</FieldLabel>
                <View style={styles.deliveryList}>
                  {deliveryOptions.map((option) => (
                    <Pressable
                      key={option.value}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: form.deliveryMode === option.value }}
                      aria-checked={form.deliveryMode === option.value}
                      onPress={() => updateForm('deliveryMode', option.value)}
                      style={({ pressed }) => [
                        styles.deliveryOption,
                        form.deliveryMode === option.value && styles.deliveryOptionSelected,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Icon name={option.icon} size={18} color={form.deliveryMode === option.value ? colors.ink : colors.steel} />
                      <View style={styles.deliveryCopy}>
                        <AppText variant="body-sm-medium">{option.title}</AppText>
                        <AppText variant="caption" style={styles.secondaryText}>{option.detail}</AppText>
                      </View>
                      <View style={[styles.radioOuter, form.deliveryMode === option.value && styles.radioSelected]}>
                        {form.deliveryMode === option.value && <View style={styles.radioInner} />}
                      </View>
                    </Pressable>
                  ))}
                </View>
              </View>

              {form.deliveryMode === 'scheduled' ? (
                <View style={styles.scheduleCard}>
                  <AppText variant="body-sm-medium">Thời điểm gửi ({deviceTimeZone})</AppText>
                  <View style={styles.scheduleFields}>
                    <View style={styles.scheduleField}>
                      <FieldHint>Ngày gửi</FieldHint>
                      <TextInput accessibilityLabel="Ngày gửi" placeholder="dd/mm/yyyy" placeholderTextColor={colors.muted} value={form.scheduledDate} onChangeText={(value) => updateForm('scheduledDate', value)} style={styles.scheduleInput} />
                      {renderFieldError('scheduledDate')}
                    </View>
                    <View style={styles.scheduleField}>
                      <FieldHint>Giờ gửi</FieldHint>
                      <TextInput accessibilityLabel="Giờ gửi" placeholder="hh:mm" placeholderTextColor={colors.muted} value={form.scheduledTime} onChangeText={(value) => updateForm('scheduledTime', value)} style={styles.scheduleInput} />
                      {renderFieldError('scheduledTime')}
                    </View>
                  </View>
                  <AppText variant="caption" style={styles.helper}>Thời điểm sẽ được đổi sang UTC trước khi gửi đến máy chủ.</AppText>
                </View>
              ) : null}

              {form.deliveryMode === 'recurring' ? (
                <View style={styles.scheduleCard}>
                  <AppText variant="body-sm-medium">Quy tắc lặp lại</AppText>
                  <View style={styles.segmentedControl}>
                    <SegmentButton label="Mỗi ngày" selected={form.recurrenceFrequency === 'daily'} onPress={() => updateForm('recurrenceFrequency', 'daily')} />
                    <SegmentButton label="Mỗi tuần" selected={form.recurrenceFrequency === 'weekly'} onPress={() => updateForm('recurrenceFrequency', 'weekly')} />
                  </View>
                  {form.recurrenceFrequency === 'weekly' ? (
                    <View style={styles.weekdays}>
                      {weekdays.map((day) => {
                        const selected = form.recurrenceWeekdays.includes(day.value);
                        return (
                          <Pressable
                            key={day.value}
                            accessibilityRole="checkbox"
                            accessibilityLabel={day.label}
                            accessibilityState={{ checked: selected }}
                            onPress={() => updateForm('recurrenceWeekdays', selected
                              ? form.recurrenceWeekdays.filter((value) => value !== day.value)
                              : [...form.recurrenceWeekdays, day.value].sort((a, b) => a - b))}
                            style={[styles.weekdayButton, selected && styles.weekdayButtonSelected]}
                          >
                            <AppText variant="caption-bold" style={selected ? styles.weekdayTextSelected : undefined}>{day.label}</AppText>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : null}
                  {renderFieldError('recurrenceWeekdays')}
                  <View style={styles.scheduleFields}>
                    <View style={styles.scheduleField}>
                      <FieldHint>Ngày bắt đầu</FieldHint>
                      <TextInput accessibilityLabel="Ngày bắt đầu lặp lại" placeholder="yyyy-mm-dd" placeholderTextColor={colors.muted} value={form.recurrenceStartsOn} onChangeText={(value) => updateForm('recurrenceStartsOn', value)} style={styles.scheduleInput} />
                      {renderFieldError('recurrenceStartsOn')}
                    </View>
                    <View style={styles.scheduleField}>
                      <FieldHint>Ngày kết thúc (tùy chọn)</FieldHint>
                      <TextInput accessibilityLabel="Ngày kết thúc lặp lại" placeholder="yyyy-mm-dd" placeholderTextColor={colors.muted} value={form.recurrenceEndsOn} onChangeText={(value) => updateForm('recurrenceEndsOn', value)} style={styles.scheduleInput} />
                      {renderFieldError('recurrenceEndsOn')}
                    </View>
                  </View>
                  <View style={styles.scheduleField}>
                    <FieldHint>{`Giờ địa phương (${deviceTimeZone})`}</FieldHint>
                    <TextInput accessibilityLabel="Giờ lặp lại" placeholder="hh:mm" placeholderTextColor={colors.muted} value={form.recurrenceLocalTime} onChangeText={(value) => updateForm('recurrenceLocalTime', value)} style={styles.scheduleInput} />
                    {renderFieldError('recurrenceLocalTime')}
                  </View>
                  {renderFieldError('timeZone')}
                </View>
              ) : null}

              {error ? <AppText accessibilityRole="alert" variant="body-sm" style={styles.fieldError}>{error}</AppText> : null}
              <View style={styles.submitArea}>
                <PrimaryButton
                  label="Tạo thông báo"
                  busy={submitting}
                  busyLabel="Đang gửi…"
                  disabled={!session}
                  onPress={() => { void submit(); }}
                />
                <Pressable accessibilityRole="button" onPress={() => router.back()} style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}>
                  <AppText variant="button-md" style={styles.cancelText}>Hủy bỏ</AppText>
                </Pressable>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FieldLabel({ children }: { children: string }) {
  return <AppText variant="body-sm-medium">{children}</AppText>;
}

function FieldHint({ children }: { children: string }) {
  return <AppText variant="caption" style={styles.fieldHint}>{children}</AppText>;
}

function SegmentButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress(): void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
      onPress={onPress}
      style={({ pressed }) => [styles.segmentButton, selected && styles.segmentButtonSelected, pressed && styles.pressed]}
    >
      <AppText variant="body-sm-medium" style={selected ? styles.segmentTextSelected : styles.segmentText}>{label}</AppText>
    </Pressable>
  );
}

function FriendOption({ friend, selected, onPress }: { friend: UserSummary; selected: boolean; onPress(): void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={`Chọn ${friend.name}`}
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
      onPress={onPress}
      style={({ pressed }) => [styles.friendOption, selected && styles.friendOptionSelected, pressed && styles.pressed]}
    >
      <View style={styles.friendAvatar}>
        <AppText variant="caption-bold">{friend.name.slice(0, 1).toLocaleUpperCase()}</AppText>
      </View>
      <AppText variant="body-sm-medium" style={styles.friendName}>{friend.name}</AppText>
      {selected ? <Icon name="check" size={18} color={colors['moss-dark']} /> : null}
    </Pressable>
  );
}
