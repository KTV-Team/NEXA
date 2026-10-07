import { useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { Animated, Modal, PanResponder, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/app-text';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { styles } from './bottom-sheet.styles';

export function BottomSheet({
  visible,
  title,
  children,
  onClose,
}: PropsWithChildren<{
  visible: boolean;
  title?: string;
  onClose(): void;
}>) {
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const [translateY] = useState(() => new Animated.Value(0));

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) =>
          gesture.dy > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderMove: (_event, gesture) => {
          translateY.setValue(Math.max(0, gesture.dy));
        },
        onPanResponderRelease: (_event, gesture) => {
          if (gesture.dy > 96 || gesture.vy > 1.1) {
            onClose();
            return;
          }
          if (reducedMotion) {
            translateY.setValue(0);
            return;
          }
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
          }).start();
        },
        onPanResponderTerminate: () => {
          if (reducedMotion) {
            translateY.setValue(0);
            return;
          }
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
          }).start();
        },
      }),
    [onClose, reducedMotion, translateY],
  );

  useEffect(() => {
    if (visible) translateY.setValue(0);
  }, [translateY, visible]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Đóng bảng tùy chọn"
          onPress={onClose}
          style={styles.backdropPressable}
        />
        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 16) },
            { transform: [{ translateY }] },
          ]}
        >
          <View style={styles.dragRegion} {...panResponder.panHandlers}>
            <View style={styles.dragHandle} />
          </View>
          {title && (
            <AppText variant="heading-5" style={styles.title}>
              {title}
            </AppText>
          )}
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}
