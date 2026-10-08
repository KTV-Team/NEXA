import { StyleSheet } from 'react-native';
import { colors } from '@nexa/design-tokens';

export const styles = StyleSheet.create({
  base: { overflow: 'hidden', backgroundColor: colors['skeleton-base'] },
  shimmer: { position: 'absolute', top: 0, bottom: 0, left: 0 },
});
