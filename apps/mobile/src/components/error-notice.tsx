import { StyleSheet, View } from 'react-native';
import { colors, rounded, spacing } from '@nexa/design-tokens';
import { AppText } from './app-text';
import { Icon } from './icon';
import { TextLink } from './text-link';

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

const styles = StyleSheet.create({
  error: {
    padding: spacing.md,
    borderRadius: rounded.md,
    backgroundColor: colors['brand-red'],
    marginBottom: spacing.xl,
    gap: spacing.xs,
  },
  errorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  errorText: { flex: 1, color: colors['coral-dark'] },
});
