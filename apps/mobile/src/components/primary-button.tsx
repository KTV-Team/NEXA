import { ActivityIndicator, Pressable } from 'react-native';
import { colors } from '@nexa/design-tokens';
import { AppText } from './app-text';
import { styles } from './primary-button.styles';

export function PrimaryButton({
  label,
  busy = false,
  disabled = false,
  onPress,
}: {
  label: string;
  busy?: boolean;
  disabled?: boolean;
  onPress(): void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || busy, busy }}
      aria-busy={busy}
      aria-disabled={disabled || busy}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {busy && <ActivityIndicator size="small" color={colors['on-primary']} />}
      <AppText
        variant="button-md"
        style={{ color: disabled ? colors.muted : colors['on-primary'] }}
      >
        {busy ? 'Đang xử lý…' : label}
      </AppText>
    </Pressable>
  );
}

