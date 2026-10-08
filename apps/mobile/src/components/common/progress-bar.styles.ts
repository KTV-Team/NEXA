import { StyleSheet } from 'react-native';
import { colors, rounded } from '@nexa/design-tokens';

export const styles = StyleSheet.create({
  track: {
    height: 6,
    overflow: 'hidden',
    borderRadius: rounded.full,
    backgroundColor: colors.surface,
  },
  fill: { height: '100%', borderRadius: rounded.full, backgroundColor: colors['brand-blue'] },
});
