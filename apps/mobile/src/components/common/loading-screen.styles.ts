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
  brandMark: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    borderRadius: rounded.md,
    backgroundColor: colors['brand-yellow'],
  },
  brandLetter: { color: colors.ink },
  title: { textAlign: 'center' },
  description: { maxWidth: 300, color: colors.steel, textAlign: 'center' },
  progress: { marginTop: spacing.sm },
});
