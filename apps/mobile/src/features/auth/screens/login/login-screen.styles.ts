import { StyleSheet } from 'react-native';
import { colors, rounded, spacing } from '@nexa/design-tokens';

export const styles = StyleSheet.create({
  switchLabel: { color: colors.slate },
  remember: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xl,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: rounded.xs,
    borderWidth: 1,
    borderColor: colors['hairline-strong'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  checked: { backgroundColor: colors.primary, borderColor: colors.primary },
  rememberText: { flex: 1 },
  previewAction: { alignItems: 'center', marginTop: spacing.xs },
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
  note: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: rounded.lg,
    borderWidth: 1,
    borderColor: colors['hairline-soft'],
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  noteText: { flex: 1, color: colors.steel },
});
