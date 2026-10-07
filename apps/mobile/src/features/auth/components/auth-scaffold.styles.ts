import { StyleSheet } from 'react-native';
import { colors, rounded, spacing } from '@nexa/design-tokens';

export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  frame: { flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center' },
  fill: { flex: 1 },
  header: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
    minHeight: spacing.section,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  logo: {
    width: 28,
    height: 28,
    borderRadius: rounded.sm,
    backgroundColor: colors['brand-yellow'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: { fontFamily: 'NotoSans_600SemiBold' },
  back: {
    width: 44,
    height: 44,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balance: { width: 44 },
  content: {
    flexGrow: 1,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  titles: { gap: spacing.xs, marginBottom: spacing.xl },
  description: { color: colors.slate },
  footer: { marginTop: 'auto', paddingTop: spacing.xl },
});
