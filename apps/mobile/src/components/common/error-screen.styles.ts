import { StyleSheet } from 'react-native';
import { colors, rounded, spacing } from '@nexa/design-tokens';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
    backgroundColor: colors.canvas,
  },
  iconCircle: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    borderRadius: rounded.full,
    backgroundColor: colors['danger-surface'],
  },
  title: { textAlign: 'center' },
  message: { maxWidth: 320, color: colors.slate, textAlign: 'center' },
  action: { width: '100%', maxWidth: 320, marginTop: spacing.sm },
});
