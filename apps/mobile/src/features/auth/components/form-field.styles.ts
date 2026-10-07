import { Platform, StyleSheet, type TextInputProps } from 'react-native';
import { colors, components, rounded, spacing } from '@nexa/design-tokens';
import { textStyle } from '@/theme/typography';

export const PlatformWebOutline =
  Platform.OS === 'web' ? ({ outlineWidth: 0 } as TextInputProps['style']) : undefined;

export const styles = StyleSheet.create({
  requiredMarker: { color: colors['coral-dark'] },
  group: { marginBottom: spacing.xl, gap: spacing.xs },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  wrapper: {
    minHeight: components['text-input'].height,
    height: components['text-input'].height,
    borderWidth: 1,
    borderColor: colors['hairline-strong'],
    borderRadius: rounded.md,
    backgroundColor: colors.canvas,
    flexDirection: 'row',
    alignItems: 'center',
  },
  focused: { borderWidth: 2, borderColor: colors['brand-blue'] },
  invalid: { borderColor: colors['coral-dark'] },
  input: {
    ...textStyle('body-md'),
    flex: 1,
    minWidth: 0,
    height: '100%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    color: colors.ink,
  },
  passwordInput: { paddingRight: spacing.xxs },
  eye: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  helper: { color: colors.steel },
  error: { color: colors['coral-dark'] },
});
