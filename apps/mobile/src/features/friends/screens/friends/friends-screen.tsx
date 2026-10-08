import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@nexa/design-tokens';
import { AppText } from '@/components/app-text';
import { Icon } from '@/components/icon';
import { AppBottomNavigation } from '@/components/app-bottom-navigation';
import { styles } from './friends-screen.styles';

type FriendsTab = 'all' | 'incoming' | 'outgoing';

const tabs: { key: FriendsTab; label: string }[] = [
  { key: 'all', label: 'Tất cả bạn bè' },
  { key: 'incoming', label: 'Lời mời đến' },
  { key: 'outgoing', label: 'Đã gửi' },
];

const tabCopy: Record<FriendsTab, { title: string; description: string }> = {
  all: {
    title: 'Danh sách bạn bè chưa khả dụng',
    description: 'Bạn bè đã được xác nhận sẽ xuất hiện tại đây và có thể nhận thông báo.',
  },
  incoming: {
    title: 'Lời mời đến chưa khả dụng',
    description: 'Các lời mời bạn nhận sẽ xuất hiện tại đây để bạn phản hồi.',
  },
  outgoing: {
    title: 'Lời mời đã gửi chưa khả dụng',
    description: 'Các lời mời đang chờ phản hồi sẽ xuất hiện tại đây.',
  },
};

export default function FriendsScreen() {
  const [activeTab, setActiveTab] = useState<FriendsTab>('all');
  const activeCopy = tabCopy[activeTab];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'right', 'bottom', 'left']}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <AppText variant="body-md-medium">Bạn bè</AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tìm và thêm bạn"
          onPress={() => router.push('/user-search')}
          style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
        >
          <Icon name="plus" size={16} color={colors['on-primary']} />
          <AppText variant="caption-bold" style={styles.addButtonText}>Thêm bạn</AppText>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleGroup}>
          <AppText variant="heading-3" style={styles.title}>Bạn bè</AppText>
          <AppText variant="body-sm" style={styles.subtitle}>
            Quản lý danh sách kết nối và lời mời kết bạn.
          </AppText>
        </View>

        <View style={styles.tabRail} accessibilityRole="tablist">
          {tabs.map((tab) => {
            const selected = tab.key === activeTab;

            return (
              <Pressable
                key={tab.key}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                onPress={() => setActiveTab(tab.key)}
                style={({ pressed }) => [
                  styles.tab,
                  selected && styles.tabSelected,
                  pressed && styles.pressed,
                ]}
              >
                <AppText
                  variant="caption-bold"
                  numberOfLines={1}
                  style={[styles.tabText, selected && styles.tabTextSelected]}
                >
                  {tab.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.notice}>
          <Icon name="info" size={17} color={colors.steel} />
          <AppText variant="body-sm" style={styles.noticeText}>
            Dịch vụ tìm kiếm và quản lý lời mời kết bạn chưa khả dụng. Dữ liệu sẽ hiện tại đây khi được kết nối.
          </AppText>
        </View>

        <View style={styles.sectionHeading}>
          <AppText variant="caption-bold" style={styles.sectionLabel}>
            {tabs.find((tab) => tab.key === activeTab)?.label.toLocaleUpperCase('vi-VN')}
          </AppText>
          {activeTab === 'all' && (
            <AppText variant="caption" style={styles.sectionHint}>
              Chỉ bạn bè đã chấp nhận
            </AppText>
          )}
        </View>

        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Icon name={activeTab === 'all' ? 'users' : 'mail'} size={24} color={colors.steel} />
          </View>
          <AppText variant="body-md-medium" style={styles.emptyTitle}>{activeCopy.title}</AppText>
          <AppText variant="body-sm" style={styles.emptyDescription}>
            {activeCopy.description}
          </AppText>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/user-search')}
          style={({ pressed }) => [styles.searchLink, pressed && styles.pressed]}
        >
          <Icon name="search" size={17} color={colors.ink} />
          <AppText variant="body-sm-medium" style={styles.searchLinkText}>
            Tìm người dùng
          </AppText>
          <Icon name="chevron-right" size={18} color={colors.steel} />
        </Pressable>
      </ScrollView>

      <AppBottomNavigation active="friends" />
    </SafeAreaView>
  );
}
