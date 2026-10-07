import { StyleSheet } from 'react-native';
import { colors, rounded, spacing } from '@nexa/design-tokens';

export const styles = StyleSheet.create({
  email: { color: colors.slate },
  card: {
    padding: spacing.xl,
    gap: spacing.xs,
    borderRadius: rounded.xl,
    borderWidth: 1,
    borderColor: colors['hairline-soft'],
    marginBottom: spacing.xl,
  },
});
