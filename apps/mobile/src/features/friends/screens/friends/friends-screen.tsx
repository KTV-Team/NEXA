import { useCallback, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@nexa/design-tokens';
import type { FriendRequest, Friendship } from '@nexa/types';
import { AppText } from '@/components/app-text';
import { ErrorNotice } from '@/components/error-notice';
import { Icon } from '@/components/icon';
import { AppBottomNavigation } from '@/components/app-bottom-navigation';
import { useAuth } from '@/features/auth/auth-provider';
import { apiErrorMessage } from '@/components/common/api-error-message';
import { styles } from './friends-screen.styles';

type FriendsTab = 'all' | 'incoming' | 'outgoing';
const tabs: { key: FriendsTab; label: string }[] = [
  { key: 'all', label: 'Tất cả bạn bè' },
  { key: 'incoming', label: 'Lời mời đến' },
  { key: 'outgoing', label: 'Đã gửi' },
];
const pageSize = 20;

export default function FriendsScreen() {
  const { api } = useAuth();
  const [activeTab, setActiveTab] = useState<FriendsTab>('all');
  const [items, setItems] = useState<(Friendship | FriendRequest)[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const requestVersion = useRef(0);
  const loadLock = useRef(false);
  const actionLock = useRef(false);

  const load = useCallback(async (nextPage: number) => {
    if (loadLock.current) return;
    loadLock.current = true;
    const version = requestVersion.current;
    if (nextPage === 1) {
      setLoading(true);
      setItems([]);
      setPage(0);
      setHasMore(false);
    } else setLoadingMore(true);
    setError(null);
    try {
      const result = activeTab === 'all'
        ? await api.friends.list({ page: nextPage, limit: pageSize })
        : await api.friends.requests({ direction: activeTab, page: nextPage, limit: pageSize });
      if (version !== requestVersion.current) return;
      setItems((previous) => nextPage === 1 ? result.data : [...previous, ...result.data]);
      setPage(nextPage);
      setHasMore(nextPage < result.meta.totalPages);
    } catch (cause) {
      if (version === requestVersion.current) setError(apiErrorMessage(cause));
    } finally {
      if (version === requestVersion.current) {
        loadLock.current = false;
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [activeTab, api]);

  const reload = useCallback(() => {
    ++requestVersion.current;
    loadLock.current = false;
    void load(1);
  }, [load]);
  useFocusEffect(useCallback(() => {
    reload();
    return () => { ++requestVersion.current; loadLock.current = false; };
  }, [reload]));

  const chooseTab = (tab: FriendsTab) => {
    if (tab === activeTab) return;
    ++requestVersion.current;
    loadLock.current = false;
    setItems([]);
    setPage(0);
    setHasMore(false);
    setLoading(true);
    setError(null);
    setActiveTab(tab);
  };

  const act = async (id: string, action: 'accept' | 'reject' | 'cancel' | 'remove') => {
    if (actionLock.current) return;
    actionLock.current = true;
    setBusyId(id);
    setError(null);
    try {
      if (action === 'accept') await api.friends.accept(id);
      else if (action === 'reject') await api.friends.reject(id);
      else if (action === 'cancel') await api.friends.cancel(id);
      else await api.friends.remove(id);
      reload();
    } catch (cause) {
      reload();
      setError(apiErrorMessage(cause));
    } finally {
      actionLock.current = false;
      setBusyId(null);
    }
  };
  const confirmRemove = (id: string, name: string) => Alert.alert('Hủy kết bạn', `Hủy kết bạn với ${name}?`, [
    { text: 'Giữ lại', style: 'cancel' },
    { text: 'Hủy kết bạn', style: 'destructive', onPress: () => void act(id, 'remove') },
  ]);

  return <SafeAreaView style={styles.safeArea} edges={['top', 'right', 'bottom', 'left']}>
    <View style={styles.header}>
      <AppText variant="body-md-medium" style={styles.headerCopy}>Bạn bè</AppText>
      <Pressable accessibilityRole="button" accessibilityLabel="Tìm và thêm bạn" onPress={() => router.push('/user-search')}
        style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}>
        <Icon name="plus" size={16} color={colors['on-primary']} />
        <AppText variant="caption-bold" style={styles.addButtonText}>Thêm bạn</AppText>
      </Pressable>
    </View>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.titleGroup}>
        <AppText variant="heading-3" style={styles.title}>Bạn bè</AppText>
        <AppText variant="body-sm" style={styles.subtitle}>Quản lý danh sách kết nối và lời mời kết bạn.</AppText>
      </View>
      <View style={styles.tabRail} accessibilityRole="tablist">
        {tabs.map((tab) => <Pressable key={tab.key} accessibilityRole="tab" accessibilityLabel={tab.label}
          accessibilityState={{ selected: tab.key === activeTab }} onPress={() => chooseTab(tab.key)}
          style={({ pressed }) => [styles.tab, tab.key === activeTab && styles.tabSelected, pressed && styles.pressed]}>
          <AppText variant="caption-bold" numberOfLines={1}
            style={[styles.tabText, tab.key === activeTab && styles.tabTextSelected]}>{tab.label}</AppText>
        </Pressable>)}
      </View>
      {error && <ErrorNotice message={error} action={{ label: 'Thử lại', onPress: reload }} />}
      {loading ? <AppText variant="body-sm">Đang tải…</AppText> : !error && items.length === 0 ? <View style={styles.emptyCard}>
        <View style={styles.emptyIcon}><Icon name={activeTab === 'all' ? 'users' : 'mail'} size={24} color={colors.steel} /></View>
        <AppText variant="body-md-medium" style={styles.emptyTitle}>
          {activeTab === 'all' ? 'Chưa có bạn bè' : activeTab === 'incoming' ? 'Chưa có lời mời đến' : 'Chưa gửi lời mời nào'}
        </AppText>
      </View> : items.map((item) => {
        const person = 'friend' in item ? item.friend : activeTab === 'incoming' ? item.sender : item.recipient;
        return <View key={item.id} style={styles.personCard}>
          <View style={styles.personCopy}>
            <AppText variant="body-sm-medium" numberOfLines={2}>{person.name}</AppText>
            <AppText variant="caption" style={styles.sectionHint}>
              {activeTab === 'all' ? 'Bạn bè' : activeTab === 'incoming' ? 'Đã gửi lời mời cho bạn' : 'Đang chờ phản hồi'}
            </AppText>
          </View>
          {activeTab === 'all' ? <Action label="Hủy kết bạn" person={person.name} disabled={busyId !== null}
            onPress={() => confirmRemove(item.id, person.name)} /> : activeTab === 'incoming' ? <View style={styles.actions}>
            <Action label="Chấp nhận" person={person.name} disabled={busyId !== null} onPress={() => void act(item.id, 'accept')} />
            <Action label="Từ chối" person={person.name} disabled={busyId !== null} onPress={() => void act(item.id, 'reject')} />
          </View> : <Action label="Hủy lời mời" person={person.name} disabled={busyId !== null} onPress={() => void act(item.id, 'cancel')} />}
        </View>;
      })}
      {!loading && hasMore && <Pressable accessibilityRole="button" accessibilityLabel="Tải thêm"
        accessibilityState={{ disabled: loadingMore }} disabled={loadingMore} onPress={() => void load(page + 1)} style={styles.loadMore}>
        <AppText variant="body-sm-medium">{loadingMore ? 'Đang tải…' : 'Tải thêm'}</AppText>
      </Pressable>}
      <Pressable accessibilityRole="button" onPress={() => router.push('/user-search')}
        style={({ pressed }) => [styles.searchLink, pressed && styles.pressed]}>
        <Icon name="search" size={17} color={colors.ink} />
        <AppText variant="body-sm-medium" style={styles.searchLinkText}>Tìm người dùng</AppText>
        <Icon name="chevron-right" size={18} color={colors.steel} />
      </Pressable>
    </ScrollView>
    <AppBottomNavigation active="friends" />
  </SafeAreaView>;
}

function Action({ label, person, disabled, onPress }: { label: string; person: string; disabled: boolean; onPress(): void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${person}`}
    accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={styles.actionButton}>
    <AppText variant="caption-bold">{label}</AppText>
  </Pressable>;
}
