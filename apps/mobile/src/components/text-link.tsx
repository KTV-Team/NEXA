import { Pressable } from 'react-native';
import { colors } from '@nexa/design-tokens';
import { AppText } from './app-text';
import { styles } from './text-link.styles';

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

