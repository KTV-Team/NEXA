import { View } from 'react-native';
import { colors } from '@nexa/design-tokens';
import { AppText } from './app-text';
import { Icon } from './icon';
import { TextLink } from './text-link';
import { styles } from './error-notice.styles';

export function ErrorNotice({
  message,
  action,
}: {
  message: string;
  action?: { label: string; onPress(): void };
}) {
  return (
    <View style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <View style={styles.errorRow}>
        <Icon name="alert" color={colors['coral-dark']} />
        <AppText variant="body-sm" style={styles.errorText}>
          {message}
        </AppText>
      </View>
      {action && <TextLink label={action.label} onPress={action.onPress} />}
    </View>
  );
}

