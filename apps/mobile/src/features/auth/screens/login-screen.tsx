import { useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { colors, rounded, spacing } from '@nexa/design-tokens';
import { loginSchema } from '@nexa/validation';
import { AppText, ErrorNotice, Icon, PrimaryButton, TextLink } from '../../../components/ui';
import { AuthScaffold } from '../components/auth-scaffold';
import { FormField } from '../components/form-field';
import { useAuth } from '../auth-provider';
import { useAuthForm } from '../use-auth-form';
import { authErrorMessage } from '../auth-errors';

export default function LoginScreen() {
  const auth = useAuth();
  const form = useAuthForm(loginSchema, { email: '', password: '' });
  const email = useRef<TextInput>(null);
  const password = useRef<TextInput>(null);
  const submitting = useRef(false);
  const [busy, setBusy] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    if (submitting.current) return;
    const values = form.validate();
    if (!values) {
      (form.firstInvalid === 'email' ? email : password).current?.focus();
      return;
    }
    Keyboard.dismiss();
    submitting.current = true;
    setBusy(true);
    setError(null);
    try {
      await auth.login(values, remember);
    } catch (cause) {
      setError(authErrorMessage(cause));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };
  return (
    <AuthScaffold
      title="Đăng nhập"
      description="Quản lý thông báo cá nhân và kết nối với bạn bè."
      footer={
        <View style={styles.note}>
          <Icon name="lock" color={colors.steel} />
          <AppText variant="caption" style={styles.noteText}>
            Phiên đăng nhập được lưu bảo mật trên thiết bị khi bạn chọn duy trì đăng nhập.
          </AppText>
        </View>
      }
    >
      {auth.restorationError && (
        <ErrorNotice message={auth.restorationError} retry={() => void auth.retryRestore()} />
      )}
      {error && <ErrorNotice message={error} />}
      <FormField
        ref={email}
        label="Email"
        placeholder="name@company.com"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        submitBehavior="submit"
        value={form.values.email}
        onChangeText={(value) => {
          form.setValue('email', value);
          setError(null);
        }}
        onBlur={() => form.blur('email')}
        onSubmitEditing={() => password.current?.focus()}
        error={form.errors.email}
        helper="Email dùng cho tài khoản NEXA của bạn."
        editable={!busy}
      />
      <FormField
        ref={password}
        label="Mật khẩu"
        password
        placeholder="Tối thiểu 8 ký tự"
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        value={form.values.password}
        onChangeText={(value) => {
          form.setValue('password', value);
          setError(null);
        }}
        onBlur={() => form.blur('password')}
        onSubmitEditing={() => void submit()}
        error={form.errors.password}
        helper="Mật khẩu phải có ít nhất 8 ký tự."
        editable={!busy}
      />
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel="Duy trì trạng thái đăng nhập trên thiết bị này"
        accessibilityState={{ checked: remember, disabled: busy }}
        aria-checked={remember}
        aria-disabled={busy}
        disabled={busy}
        onPress={() => setRemember(!remember)}
        style={styles.remember}
      >
        <View style={[styles.checkbox, remember && styles.checked]}>
          {remember && <Icon name="check" size={16} color={colors['on-primary']} />}
        </View>
        <AppText variant="body-sm" style={styles.rememberText}>
          Duy trì trạng thái đăng nhập trên thiết bị này
        </AppText>
      </Pressable>
      <PrimaryButton label="Đăng nhập" busy={busy} onPress={() => void submit()} />
      <View style={styles.switchRow}>
        <AppText variant="body-sm" style={{ color: colors.slate }}>
          Chưa có tài khoản NEXA?
        </AppText>
        <TextLink label="Đăng ký ngay" disabled={busy} onPress={() => router.push('./register')} />
      </View>
    </AuthScaffold>
  );
}
const styles = StyleSheet.create({
  remember: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xl,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: rounded.xs,
    borderWidth: 1,
    borderColor: colors['hairline-strong'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  checked: { backgroundColor: colors.primary, borderColor: colors.primary },
  rememberText: { flex: 1 },
  switchRow: {
    borderTopWidth: 1,
    borderTopColor: colors['hairline-soft'],
    marginTop: spacing.xl,
    paddingTop: spacing.xs,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xxs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: rounded.lg,
    borderWidth: 1,
    borderColor: colors['hairline-soft'],
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  noteText: { flex: 1, color: colors.steel },
});
