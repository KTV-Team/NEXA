import { ActivityIndicator, Pressable, StyleSheet, Text, View, type TextProps } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors, rounded, spacing, type TypographyName } from '@nexa/design-tokens';
import { textStyle } from '../theme/typography';

export function AppText({
  variant = 'body-md',
  style,
  ...props
}: TextProps & { variant?: TypographyName }) {
  return <Text {...props} style={[textStyle(variant), { color: colors.ink }, style]} />;
}

export function Icon({
  name,
  size = 20,
  color = colors.ink,
}: {
  name: 'back' | 'eye' | 'eye-off' | 'check' | 'lock' | 'alert';
  size?: number;
  color?: string;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {name === 'back' && <Path d="m15 18-6-6 6-6" />}
      {(name === 'eye' || name === 'eye-off') && (
        <>
          <Path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
          <Circle cx={12} cy={12} r={3} />
          {name === 'eye-off' && <Path d="m3 3 18 18" />}
        </>
      )}
      {name === 'check' && <Path d="m5 12 4 4L19 6" />}
      {name === 'lock' && (
        <>
          <Rect x={5} y={10} width={14} height={11} rx={2} />
          <Path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" />
        </>
      )}
      {name === 'alert' && (
        <>
          <Circle cx={12} cy={12} r={9} />
          <Path d="M12 7v6m0 4h.01" />
        </>
      )}
    </Svg>
  );
}

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
      style={({ pressed }) => [styles.link, pressed && { opacity: 0.7 }]}
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

export function ErrorNotice({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <View style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <View style={styles.errorRow}>
        <Icon name="alert" color={colors['coral-dark']} />
        <AppText variant="body-sm" style={styles.errorText}>
          {message}
        </AppText>
      </View>
      {retry && <TextLink label="Thử khôi phục phiên" onPress={retry} />}
    </View>
  );
}

export const styles = StyleSheet.create({
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
  link: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  error: {
    padding: spacing.md,
    borderRadius: rounded.md,
    backgroundColor: colors['brand-red'],
    marginBottom: spacing.xl,
    gap: spacing.xs,
  },
  errorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  errorText: { flex: 1, color: colors['coral-dark'] },
});
