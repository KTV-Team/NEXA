import { useEffect, useId, useState } from 'react';
import { Animated, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { colors } from '@nexa/design-tokens';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { styles } from './skeleton.styles';

export function Skeleton({
  width = '100%',
  height = 16,
  radius = 8,
  animated = true,
  style,
}: {
  width?: ViewStyle['width'];
  height?: number;
  radius?: number;
  animated?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const reducedMotion = useReducedMotion();
  const [progress] = useState(() => new Animated.Value(0));
  const gradientId = useId().replace(/[^a-zA-Z0-9_-]/g, '');

  useEffect(() => {
    if (!animated || reducedMotion || measuredWidth <= 0) {
      progress.stopAnimation();
      progress.setValue(0);
      return;
    }

    const shimmer = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }),
    );
    shimmer.start();
    return () => shimmer.stop();
  }, [animated, measuredWidth, progress, reducedMotion]);

  const onLayout = (event: LayoutChangeEvent) => {
    setMeasuredWidth(event.nativeEvent.layout.width);
  };
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-measuredWidth, measuredWidth],
  });

  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={onLayout}
      style={[styles.base, { width, height, borderRadius: radius }, style]}
    >
      {animated && !reducedMotion && measuredWidth > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[styles.shimmer, { width: measuredWidth, transform: [{ translateX }] }]}
        >
          <Svg width={measuredWidth} height="100%">
            <Defs>
              <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor={colors['skeleton-base']} stopOpacity="0" />
                <Stop offset="50%" stopColor={colors['skeleton-highlight']} stopOpacity="1" />
                <Stop offset="100%" stopColor={colors['skeleton-base']} stopOpacity="0" />
              </LinearGradient>
            </Defs>
            <Rect width={measuredWidth} height="100%" fill={`url(#${gradientId})`} />
          </Svg>
        </Animated.View>
      )}
    </View>
  );
}
