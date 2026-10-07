import { Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@nexa/design-tokens';
import { AppBottomNavigation } from '@/components/app-bottom-navigation';
import { AppText } from '@/components/app-text';
import { Icon } from '@/components/icon';
import { styles } from './notification-target-screen.styles';

export default function NotificationTargetScreen() {
  const { itemId } = useLocalSearchParams<{ itemId?: string }>();
  const hasItemId = typeof itemId === 'string' && itemId.trim().length > 0;

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
        <View style={styles.errorCard}>
          <View style={styles.errorIcon}>
            <Icon name="alert" size={25} color={colors['yellow-dark']} />
          </View>
          <AppText variant="heading-4" style={styles.title}>
            {hasItemId ? 'Không thể tải thông báo' : 'Thiếu mã thông báo'}
          </AppText>
          <AppText variant="body-sm" style={styles.description}>
            {hasItemId
              ? 'Dịch vụ inbox chưa khả dụng. Chưa thể xác nhận nội dung hoặc quyền truy cập của thông báo này.'
              : 'Liên kết này chưa có mã inbox cần thiết để mở nội dung thông báo.'}
          </AppText>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/')}
            style={({ pressed }) => [styles.inboxButton, pressed && styles.pressed]}
          >
            <Icon name="mail" size={17} color={colors['on-primary']} />
            <AppText variant="button-md" style={styles.inboxButtonText}>Về Hộp thư</AppText>
          </Pressable>
        </View>

        <View style={styles.privacyNotice}>
          <Icon name="lock" size={17} color={colors.steel} />
          <AppText variant="caption" style={styles.privacyText}>
            Nội dung chỉ mở sau khi hệ thống xác nhận thông báo còn tồn tại và thuộc tài khoản của bạn.
          </AppText>
        </View>
      </ScrollView>

      <AppBottomNavigation active="inbox" />
    </SafeAreaView>
  );
}
