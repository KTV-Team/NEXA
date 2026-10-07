import { router } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@nexa/design-tokens';
import { AppText } from '@/components/app-text';
import { Icon } from '@/components/icon';
import { useAuth } from '@/features/auth/auth-provider';
import { styles } from './inbox-screen.styles';

export default function InboxScreen() {
  const { session } = useAuth();
  const initials = (session?.user.name ?? 'N')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => Array.from(part)[0] ?? '')
    .join('')
    .toLocaleUpperCase('vi-VN');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'right', 'bottom', 'left']}>
      <View style={styles.header}>
        <View style={styles.brand}>
          <View style={styles.brandMark}>
            <AppText variant="body-md-medium" style={styles.brandLetter}>N</AppText>
          </View>
          <AppText variant="body-md-medium" style={styles.brandName}>NEXA</AppText>
        </View>
        {session && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Tài khoản ${session.user.name}`}
            onPress={() => router.push('/account')}
            style={({ pressed }) => [styles.avatarButton, pressed && styles.pressed]}
          >
            <AppText variant="caption-bold" style={styles.avatarText}>{initials}</AppText>
          </Pressable>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleRow}>
          <View style={styles.titleCopy}>
            <AppText variant="heading-3" style={styles.title}>Hộp thư</AppText>
            <AppText variant="body-sm" style={styles.subtitle}>
              Thông báo và lời nhắc của bạn
            </AppText>
          </View>
          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <AppText variant="caption-bold" style={styles.statusText}>Chưa đồng bộ</AppText>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/create-notification')}
          style={({ pressed }) => [styles.createButton, pressed && styles.createButtonPressed]}
        >
          <Icon name="plus" size={18} color={colors['on-primary']} />
          <AppText variant="button-md" style={styles.createButtonText}>Tạo thông báo mới</AppText>
        </Pressable>

        <View style={styles.connectionNotice}>
          <Icon name="alert" size={18} color={colors['yellow-dark']} />
          <AppText variant="body-sm" style={styles.connectionText}>
            Dịch vụ inbox chưa được kết nối. Chưa thể tải thông báo hoặc số lượng chưa đọc.
          </AppText>
        </View>

        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Icon name="mail" size={26} color={colors.steel} />
          </View>
          <AppText variant="body-md-medium" style={styles.emptyTitle}>
            Hộp thư chưa khả dụng
          </AppText>
          <AppText variant="body-sm" style={styles.emptyDescription}>
            Khi API thông báo được tích hợp, các thông báo và lời nhắc sẽ hiển thị tại đây.
          </AppText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

