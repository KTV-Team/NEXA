import { StyleSheet } from 'react-native';
import { colors } from '@nexa/design-tokens';

export const loadingIndicatorColor = colors.primary;

export const styles = StyleSheet.create({
  screenContent: { backgroundColor: colors.canvas },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.canvas,
  },
});
