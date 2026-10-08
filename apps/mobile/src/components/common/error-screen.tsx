import { View } from 'react-native';
import { colors } from '@nexa/design-tokens';
import { AppText } from '@/components/app-text';
import { Icon } from '@/components/icon';
import { PrimaryButton } from '@/components/primary-button';
import { styles } from './error-screen.styles';

export function ErrorScreen({
  title = 'Không thể tải dữ liệu',
  message,
  retryLabel = 'Thử kết nối lại',
  onRetry,
}: {
  title?: string;
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.screen}>
      <View style={styles.iconCircle}>
        <Icon name="alert" size={24} color={colors.danger} />
      </View>
      <AppText variant="heading-4" style={styles.title}>{title}</AppText>
      <AppText variant="body-sm" style={styles.message}>{message}</AppText>
      {onRetry && (
        <View style={styles.action}>
          <PrimaryButton label={retryLabel} onPress={onRetry} />
        </View>
      )}
    </View>
  );
}
