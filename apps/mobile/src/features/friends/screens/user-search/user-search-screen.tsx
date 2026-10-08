import { useState } from 'react';
import { Alert, Pressable, ScrollView, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@nexa/design-tokens';
import { AppText } from '@/components/app-text';
import { Icon } from '@/components/icon';
import { AppBottomNavigation } from '@/components/app-bottom-navigation';
import { styles } from './user-search-screen.styles';

export default function UserSearchScreen() {
  const [query, setQuery] = useState('');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'right', 'bottom', 'left']}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quay lại bạn bè"
          onPress={() => router.replace('/friends')}
          style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
        >
          <Icon name="back" size={20} />
        </Pressable>
        <AppText variant="body-md-medium" style={styles.headerTitle}>Tìm người dùng</AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Thông tin về tìm kiếm"
          onPress={() => Alert.alert(
            'Tìm người dùng',
            'Kết quả tìm kiếm chỉ được cung cấp theo thông tin mà máy chủ cho phép hiển thị.',
          )}
          style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
        >
          <Icon name="info" size={19} color={colors.steel} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.titleGroup}>
          <AppText variant="heading-3" style={styles.title}>Kết nối bạn bè</AppText>
          <AppText variant="body-sm" style={styles.subtitle}>
            Tìm tài khoản để gửi lời mời kết bạn.
          </AppText>
        </View>

        <View style={styles.searchField}>
          <Icon name="search" size={19} color={colors.steel} />
          <TextInput
            accessibilityLabel="Tìm người dùng"
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setQuery}
            placeholder="Nhập thông tin người dùng..."
            placeholderTextColor={colors.stone}
            returnKeyType="search"
            style={styles.searchInput}
            value={query}
          />
          {query.length > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Xóa nội dung tìm kiếm"
              onPress={() => setQuery('')}
              hitSlop={8}
              style={({ pressed }) => [styles.clearButton, pressed && styles.pressed]}
            >
              <Icon name="close" size={17} color={colors.steel} />
            </Pressable>
          )}
        </View>

        <View style={styles.notice}>
          <Icon name="info" size={17} color={colors['yellow-dark']} />
          <AppText variant="caption" style={styles.noticeText}>
            Tìm kiếm chỉ hiển thị thông tin được máy chủ cho phép. Hiện dịch vụ này chưa khả dụng.
          </AppText>
        </View>

        <View style={styles.resultHeading}>
          <AppText variant="caption-bold" style={styles.resultLabel}>
            {query.trim() ? 'KẾT QUẢ TÌM KIẾM' : 'TÌM NGƯỜI DÙNG'}
          </AppText>
          {query.trim().length > 0 && (
            <AppText variant="caption" style={styles.keyword} numberOfLines={1}>
              Từ khóa: “{query.trim()}”
            </AppText>
          )}
        </View>

        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Icon name="users" size={24} color={colors.steel} />
          </View>
          <AppText variant="body-md-medium" style={styles.emptyTitle}>
            {query.trim() ? 'Tìm kiếm chưa khả dụng' : 'Bắt đầu tìm kiếm'}
          </AppText>
          <AppText variant="body-sm" style={styles.emptyDescription}>
            {query.trim()
              ? 'Kết quả sẽ xuất hiện khi dịch vụ tìm kiếm người dùng sẵn sàng.'
              : 'Nhập thông tin người dùng để tìm kiếm khi dịch vụ được bật.'}
          </AppText>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/friends')}
          style={({ pressed }) => [styles.requestsLink, pressed && styles.pressed]}
        >
          <View style={styles.requestsCopy}>
            <AppText variant="body-sm-medium">Quản lý bạn bè và lời mời</AppText>
            <AppText variant="caption" style={styles.requestsHint}>
              Xem danh sách kết nối và lời mời kết bạn
            </AppText>
          </View>
          <Icon name="chevron-right" size={19} color={colors.steel} />
        </Pressable>
      </ScrollView>

      <AppBottomNavigation active="friends" />
    </SafeAreaView>
  );
}
