import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApiClientError } from '@nexa/api-client';
import type { InboxItem } from '@nexa/types';
import { colors } from '@nexa/design-tokens';
import { AppBottomNavigation } from '@/components/app-bottom-navigation';
import { AppText } from '@/components/app-text';
import { Icon } from '@/components/icon';
import { useAuth } from '@/features/auth/auth-provider';
import { useNotificationRuntime } from '@/notifications/notification-runtime';
import { styles } from './notification-target-screen.styles';

const itemIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function failureMessage(failure: unknown): string {
  if (failure instanceof ApiClientError) {
    if (failure.statusCode === 404) return 'Thông báo không tồn tại hoặc không thuộc tài khoản của bạn.';
    return failure.message;
  }
  return 'Không thể kết nối máy chủ. Hãy thử lại.';
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Thời gian không xác định'
    : date.toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function NotificationTargetScreen() {
  const { itemId } = useLocalSearchParams<{ itemId?: string }>();
  const validItemId = typeof itemId === 'string' && itemIdPattern.test(itemId) ? itemId : null;
  const { api, session, clearExpiredSession } = useAuth();
  const sessionUserId = session?.user.id;
  const { clearPendingTap } = useNotificationRuntime();
  const [item, setItem] = useState<InboxItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [markingRead, setMarkingRead] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [itemOwnerId, setItemOwnerId] = useState<string | null>(null);
  const [loadedItemId, setLoadedItemId] = useState<string | null>(null);
  const activeUserId = useRef(sessionUserId);
  useEffect(() => { activeUserId.current = sessionUserId; }, [sessionUserId]);
  const visibleItem = itemOwnerId === sessionUserId && loadedItemId === validItemId ? item : null;

  const markItemRead = useCallback(async (owner: string, current: InboxItem) => {
    if (current.readAt !== null) return;
    setMarkingRead(true);
    setReadError(null);
    try {
      const updated = await api.inbox.setRead(current.id, { read: true });
      if (activeUserId.current === owner) setItem(updated);
    } catch (failure) {
      if (activeUserId.current !== owner) return;
      if (failure instanceof ApiClientError && failure.statusCode === 401) {
        await clearExpiredSession();
      } else {
        setReadError(`Đã tải nội dung nhưng chưa cập nhật trạng thái đã đọc. ${failureMessage(failure)}`);
      }
    } finally {
      if (activeUserId.current === owner) setMarkingRead(false);
    }
  }, [api, clearExpiredSession]);

  useEffect(() => {
    if (!sessionUserId || !validItemId) return;

    let active = true;
    const owner = sessionUserId;
    void Promise.resolve().then(async () => {
      setLoading(true);
      setError(null);
      setReadError(null);
      try {
        const loaded = await api.inbox.get(validItemId);
        if (!active || activeUserId.current !== owner) return;
        setItem(loaded);
        setItemOwnerId(owner);
        setLoadedItemId(validItemId);
        await clearPendingTap();
        if (!active || activeUserId.current !== owner) return;
        await markItemRead(owner, loaded);
      } catch (failure) {
        if (!active || activeUserId.current !== owner) return;
        if (failure instanceof ApiClientError && failure.statusCode === 401) {
          await clearExpiredSession();
          return;
        }
        setError(failureMessage(failure));
        if (failure instanceof ApiClientError && failure.statusCode === 404) await clearPendingTap();
      } finally {
        if (active) setLoading(false);
      }
    });
    return () => { active = false; };
  }, [api, clearExpiredSession, clearPendingTap, markItemRead, retryKey, sessionUserId, validItemId]);

  const isLoading = !!sessionUserId && !!validItemId && (loading || (!visibleItem && !error));
  const loadingLabel = isLoading ? 'Đang xác minh và tải thông báo…' : null;
  const displayError = !sessionUserId
    ? 'Đăng nhập để mở nội dung thông báo.'
    : !validItemId
      ? 'Liên kết này chưa có mã inbox hợp lệ.'
      : error;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'right', 'bottom', 'left']}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quay lại hộp thư"
          onPress={() => router.replace('/')}
          style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
        >
          <Icon name="back" size={20} />
        </Pressable>
        <AppText variant="body-md-medium" style={styles.headerTitle}>Thông báo</AppText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {isLoading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator color={colors.primary} />
            <AppText variant="body-sm" style={styles.description}>{loadingLabel}</AppText>
          </View>
        ) : visibleItem ? (
          <View style={styles.itemCard}>
            <View style={styles.senderRow}>
              <View style={styles.senderAvatar}>
                <AppText variant="caption-bold" style={styles.senderInitial}>{Array.from(visibleItem.sender.name.trim())[0]?.toLocaleUpperCase('vi-VN') ?? 'N'}</AppText>
              </View>
              <View style={styles.senderCopy}>
                <AppText variant="body-sm-medium">{visibleItem.sender.name}</AppText>
                <AppText variant="caption" style={styles.timestamp}>{formatDate(visibleItem.deliveredAt)}</AppText>
              </View>
              {markingRead ? <ActivityIndicator size="small" color={colors.primary} /> : null}
            </View>
            <AppText variant="heading-4" style={styles.itemTitle}>{visibleItem.title}</AppText>
            <AppText variant="body-md" style={styles.itemBody}>{visibleItem.body}</AppText>
            <AppText variant="caption" style={styles.scheduleText}>Thời gian đã lên lịch: {formatDate(visibleItem.scheduledFor)}</AppText>
            {readError ? <AppText accessibilityRole="alert" variant="body-sm" style={styles.errorText}>{readError}</AppText> : null}
            {visibleItem.readAt === null ? (
              <Pressable
                accessibilityRole="button"
                disabled={markingRead}
                onPress={() => { void markItemRead(sessionUserId ?? '', visibleItem); }}
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
              >
                <AppText variant="button-md">Thử đánh dấu đã đọc</AppText>
              </Pressable>
            ) : (
              <AppText variant="caption-bold" style={styles.readStatus}>Đã đọc</AppText>
            )}
          </View>
        ) : (
          <View style={styles.errorCard}>
            <View style={styles.errorIcon}><Icon name="alert" size={25} color={colors['yellow-dark']} /></View>
            <AppText variant="heading-4" style={styles.title}>
              {validItemId ? 'Không thể mở thông báo' : 'Thiếu mã thông báo'}
            </AppText>
            <AppText accessibilityRole="alert" variant="body-sm" style={styles.description}>
              {displayError ?? 'Chưa thể xác minh quyền truy cập vào thông báo này.'}
            </AppText>
            {validItemId && session ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setRetryKey((value) => value + 1)}
                style={({ pressed }) => [styles.inboxButton, pressed && styles.pressed]}
              >
                <AppText variant="button-md" style={styles.inboxButtonText}>Thử lại</AppText>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace('/')}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            >
              <AppText variant="button-md">Về Hộp thư</AppText>
            </Pressable>
          </View>
        )}

        <View style={styles.privacyNotice}>
          <Icon name="mail" size={17} color={colors.steel} />
          <AppText variant="caption" style={styles.privacyText}>
            Nội dung được tải lại từ inbox sau khi máy chủ xác nhận thông báo thuộc tài khoản của bạn.
          </AppText>
        </View>
      </ScrollView>

      <AppBottomNavigation active="inbox" />
    </SafeAreaView>
  );
}
