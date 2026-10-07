import { StyleSheet } from 'react-native';
import { colors, rounded, spacing } from '@nexa/design-tokens';

export const styles = StyleSheet.create({
  root: { flex: 1 },
  host: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 1000,
    elevation: 12,
  },
  toast: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    borderWidth: 1,
    borderRadius: rounded.xl,
    backgroundColor: colors.canvas,
    shadowColor: colors.black,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  message: { flex: 1, color: colors.ink },
  action: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.xs },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.68 },
});
