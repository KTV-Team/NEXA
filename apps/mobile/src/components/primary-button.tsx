import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { colors, rounded, spacing } from '@nexa/design-tokens';
import { AppText } from './app-text';

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

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    borderRadius: rounded.full,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  pressed: { backgroundColor: colors.charcoal },
  disabled: { backgroundColor: colors.hairline },
});
