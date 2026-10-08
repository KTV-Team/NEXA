import { StyleSheet } from 'react-native';
import { colors, rounded, spacing } from '@nexa/design-tokens';
import { textStyle } from '@/theme/typography';

export const styles = StyleSheet.create({
  field: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors['hairline-strong'],
    borderRadius: rounded.md,
    backgroundColor: colors.canvas,
  },
  fieldLoading: { backgroundColor: colors.surface },
  input: {
    ...textStyle('body-md'),
    flex: 1,
    minWidth: 0,
    minHeight: 46,
    paddingVertical: spacing.xs,
    color: colors.ink,
  },
});
