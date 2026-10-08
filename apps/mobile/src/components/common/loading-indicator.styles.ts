import { StyleSheet } from 'react-native';
import { colors, rounded, spacing } from '@nexa/design-tokens';

export const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  staticIndicator: { borderWidth: 2, borderRightColor: colors.transparent, borderRadius: rounded.full },
  label: { color: colors.slate },
});
