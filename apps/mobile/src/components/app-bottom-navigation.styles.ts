import { StyleSheet } from 'react-native';
import { colors, spacing } from '@nexa/design-tokens';

export const styles = StyleSheet.create({
  navigation: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors['hairline-soft'],
    backgroundColor: colors.canvas,
    paddingHorizontal: spacing.xs,
  },
  item: {
    flex: 1,
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
  },
  pressed: { opacity: 0.65 },
  label: { textAlign: 'center' },
});
