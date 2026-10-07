import { TextInput, View, type TextInputProps } from 'react-native';
import { colors } from '@nexa/design-tokens';
import { LoadingIndicator } from './loading-indicator';
import { styles } from './loading-text-input.styles';

export function LoadingTextInput({
  loading = false,
  editable = true,
  style,
  ...props
}: TextInputProps & { loading?: boolean }) {
  return (
    <View style={[styles.field, loading && styles.fieldLoading]}>
      <TextInput
        {...props}
        editable={editable && !loading}
        placeholderTextColor={props.placeholderTextColor ?? colors.muted}
        style={[styles.input, style]}
      />
      {loading && <LoadingIndicator size="sm" color={colors['brand-blue']} />}
    </View>
  );
}
