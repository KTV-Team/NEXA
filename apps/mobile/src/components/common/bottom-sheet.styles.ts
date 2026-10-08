import { StyleSheet } from 'react-native';
import { colors, rounded, spacing } from '@nexa/design-tokens';

export const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors['overlay-scrim'] },
  backdropPressable: { ...StyleSheet.absoluteFill },
  sheet: {
    maxHeight: '86%',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderTopLeftRadius: rounded.xxxl,
    borderTopRightRadius: rounded.xxxl,
    backgroundColor: colors.canvas,
  },
  dragRegion: { height: 32, alignItems: 'center', justifyContent: 'center' },
  dragHandle: { width: 36, height: 4, borderRadius: rounded.full, backgroundColor: colors['hairline-strong'] },
  title: { marginBottom: spacing.xs },
});
