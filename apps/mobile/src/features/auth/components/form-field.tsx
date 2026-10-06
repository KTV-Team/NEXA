import { forwardRef, useId, useState, type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { colors, components, rounded, spacing } from '@nexa/design-tokens';
import { AppText, Icon } from '../../../components/ui';
import { textStyle } from '../../../theme/typography';

interface FieldProps extends TextInputProps {
  label: string;
  helper?: string;
  error?: string;
  password?: boolean;
  labelAction?: ReactNode;
  children?: ReactNode;
}

export const FormField = forwardRef<TextInput, FieldProps>(function FormField(
  { label, helper, error, password, labelAction, children, style, onFocus, onBlur, ...props },
  ref,
) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.group}>
      <View style={styles.labelRow}>
        <AppText nativeID={`${id}-label`} variant="body-sm-medium">
          {label}
          <AppText variant="body-sm" style={{ color: colors['coral-dark'] }}>
            {' '}
            *
          </AppText>
        </AppText>
        {labelAction}
      </View>
      <View style={[styles.wrapper, focused && styles.focused, !!error && styles.invalid]}>
        <TextInput
          {...props}
          ref={ref}
          accessibilityLabel={label}
          accessibilityLabelledBy={`${id}-label`}
          accessibilityHint={error ?? helper}
          aria-invalid={!!error}
          nativeID={id}
          placeholderTextColor={colors.muted}
          secureTextEntry={password && !visible}
          autoCapitalize={props.autoCapitalize ?? 'none'}
          autoCorrect={props.autoCorrect ?? false}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[styles.input, password && styles.passwordInput, PlatformWebOutline, style]}
        />
        {password && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${visible ? 'Ẩn' : 'Hiện'} ${label.toLowerCase()}`}
            accessibilityState={{ disabled: props.editable === false }}
            disabled={props.editable === false}
            onPress={() => setVisible(!visible)}
            style={styles.eye}
          >
            <Icon name={visible ? 'eye-off' : 'eye'} color={colors.steel} />
          </Pressable>
        )}
      </View>
      {error ? (
        <AppText variant="caption" accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </AppText>
      ) : helper ? (
        <AppText variant="caption" style={styles.helper}>
          {helper}
        </AppText>
      ) : null}
      {children}
    </View>
  );
});

const PlatformWebOutline =
  Platform.OS === 'web' ? ({ outlineWidth: 0 } as TextInputProps['style']) : undefined;
const styles = StyleSheet.create({
  group: { marginBottom: spacing.xl, gap: spacing.xs },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  wrapper: {
    minHeight: components['text-input'].height,
    height: components['text-input'].height,
    borderWidth: 1,
    borderColor: colors['hairline-strong'],
    borderRadius: rounded.md,
    backgroundColor: colors.canvas,
    flexDirection: 'row',
    alignItems: 'center',
  },
  focused: { borderWidth: 2, borderColor: colors['brand-blue'] },
  invalid: { borderColor: colors['coral-dark'] },
  input: {
    ...textStyle('body-md'),
    flex: 1,
    minWidth: 0,
    height: '100%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    color: colors.ink,
  },
  passwordInput: { paddingRight: spacing.xxs },
  eye: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  helper: { color: colors.steel },
  error: { color: colors['coral-dark'] },
});
