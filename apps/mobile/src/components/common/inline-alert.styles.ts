import { StyleSheet } from 'react-native';
import { colors, rounded, spacing } from '@nexa/design-tokens';

export const styles = StyleSheet.create({
  alert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: rounded.lg,
  },
  info: { backgroundColor: colors['info-surface'], borderColor: colors['brand-blue'] },
  success: { backgroundColor: colors['success-surface'], borderColor: colors['success-accent'] },
  warning: { backgroundColor: colors['surface-yellow'], borderColor: colors['brand-yellow-deep'] },
  danger: { backgroundColor: colors['danger-surface'], borderColor: colors.danger },
  copy: { flex: 1, gap: spacing.xxs },
  message: { color: colors.slate },
  action: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', paddingRight: spacing.sm },
  dismiss: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', margin: -spacing.xs },
  pressed: { opacity: 0.68 },
});
