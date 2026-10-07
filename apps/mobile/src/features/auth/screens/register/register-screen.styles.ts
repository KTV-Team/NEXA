import { StyleSheet } from 'react-native';
import { colors, spacing } from '@nexa/design-tokens';

export const styles = StyleSheet.create({
  checkText: { flex: 1 },
  checks: { gap: spacing.xxs },
  check: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  switchLabel: { color: colors.slate },
  terms: { color: colors.steel, marginBottom: spacing.xl },
  switchRow: {
    borderTopWidth: 1,
    borderTopColor: colors['hairline-soft'],
    marginTop: spacing.xl,
    paddingTop: spacing.xs,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xxs,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
