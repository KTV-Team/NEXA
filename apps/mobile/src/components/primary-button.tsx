import { Pressable } from 'react-native';
import { colors } from '@nexa/design-tokens';
import { AppText } from './app-text';
import { LoadingIndicator } from './common/loading-indicator';
import { styles } from './primary-button.styles';

export function PrimaryButton({
  label,
  busy = false,
  busyLabel = 'Đang xử lý…',
  disabled = false,
  onPress,
}: {
  label: string;
  busy?: boolean;
  busyLabel?: string;
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
        busy && styles.busy,
        disabled && styles.disabled,
      ]}
    >
      {busy && <LoadingIndicator size="sm" color={colors['on-primary']} />}
      <AppText
        variant="button-md"
        style={{ color: disabled ? colors.muted : colors['on-primary'] }}
      >
        {busy ? busyLabel : label}
      </AppText>
    </Pressable>
  );
}

