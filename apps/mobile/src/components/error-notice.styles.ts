import { StyleSheet } from 'react-native';
import { colors, rounded, spacing } from '@nexa/design-tokens';

export const styles = StyleSheet.create({
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
