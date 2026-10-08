import { Pressable, View } from 'react-native';
import { colors } from '@nexa/design-tokens';
import { AppText } from '@/components/app-text';
import { Icon } from '@/components/icon';
import { styles } from './inline-alert.styles';

export type FeedbackVariant = 'info' | 'success' | 'warning' | 'danger';

const variantConfig = {
  info: { icon: 'info', color: colors['brand-blue'] },
  success: { icon: 'check', color: colors['success-accent'] },
  warning: { icon: 'alert', color: colors['brand-yellow-deep'] },
  danger: { icon: 'alert', color: colors.danger },
} as const;

export function InlineAlert({
  variant = 'info',
  title,
  message,
  action,
  onDismiss,
}: {
  variant?: FeedbackVariant;
  title?: string;
  message: string;
  action?: { label: string; onPress(): void };
  onDismiss?: () => void;
}) {
  const config = variantConfig[variant];

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.alert, styles[variant]]}
    >
      <Icon name={config.icon} size={18} color={config.color} />
      <View style={styles.copy}>
        {title && <AppText variant="body-sm-medium">{title}</AppText>}
        <AppText variant="body-sm" style={styles.message}>{message}</AppText>
        {action && (
          <Pressable
            accessibilityRole="button"
            onPress={action.onPress}
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}
          >
            <AppText variant="body-sm-medium" style={{ color: config.color }}>
              {action.label}
            </AppText>
          </Pressable>
        )}
      </View>
      {onDismiss && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Đóng thông báo"
          onPress={onDismiss}
          hitSlop={4}
          style={({ pressed }) => [styles.dismiss, pressed && styles.pressed]}
        >
          <Icon name="close" size={16} color={config.color} />
        </Pressable>
      )}
    </View>
  );
}
