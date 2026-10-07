import { forwardRef, useId, useState, type ReactNode } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';
import { colors } from '@nexa/design-tokens';
import { AppText } from '@/components/app-text';
import { Icon } from '@/components/icon';
import { PlatformWebOutline, styles } from './form-field.styles';

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
          <AppText variant="body-sm" style={styles.requiredMarker}>
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
