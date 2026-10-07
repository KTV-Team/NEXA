import { Pressable, StyleSheet } from 'react-native';
import { colors } from '@nexa/design-tokens';
import { AppText } from './app-text';

export function TextLink({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress(): void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      accessibilityState={{ disabled }}
      onPress={onPress}
      style={({ pressed }) => [styles.link, pressed && styles.pressed]}
    >
      <AppText
        variant="body-sm-medium"
        style={{ color: disabled ? colors.muted : colors['brand-blue'] }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  pressed: { opacity: 0.7 },
});
