import { ActivityIndicator, View } from 'react-native';
import { colors } from '@nexa/design-tokens';
import { AppText } from '@/components/app-text';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { styles } from './loading-indicator.styles';

const indicatorSizes = { sm: 16, md: 22, lg: 36 } as const;

export function LoadingIndicator({
  size = 'md',
  color = colors['brand-blue'],
  label,
}: {
  size?: keyof typeof indicatorSizes;
  color?: string;
  label?: string;
}) {
  const reducedMotion = useReducedMotion();

  return (
    <View
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityLabel={label ?? 'Đang tải'}
    >
      {!reducedMotion ? (
        <ActivityIndicator size={indicatorSizes[size]} color={color} />
      ) : (
        <View
          style={[
            styles.staticIndicator,
            { width: indicatorSizes[size], height: indicatorSizes[size], borderColor: color },
          ]}
        />
      )}
      {label && <AppText variant="body-sm" style={styles.label}>{label}</AppText>}
    </View>
  );
}
