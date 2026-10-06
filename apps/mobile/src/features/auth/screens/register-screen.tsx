import { useRef, useState } from 'react';
import { Keyboard, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { colors, spacing } from '@nexa/design-tokens';
import { registerFormSchema, registerSchema } from '@nexa/validation';
import { AppText, ErrorNotice, Icon, PrimaryButton, TextLink } from '../../../components/ui';
import { AuthScaffold } from '../components/auth-scaffold';
import { FormField } from '../components/form-field';
import { useAuth } from '../auth-provider';
import { useAuthForm } from '../use-auth-form';
import { authErrorMessage } from '../auth-errors';

export default function RegisterScreen() {
  const auth = useAuth();
  const form = useAuthForm(registerFormSchema, {
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const name = useRef<TextInput>(null);
  const email = useRef<TextInput>(null);
  const password = useRef<TextInput>(null);
  const confirmPassword = useRef<TextInput>(null);
  const submitting = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const goBack = () => {
    if (!busy) router.replace('./login');
  };
  const submit = async () => {
    if (submitting.current) return;
    const values = form.validate();
    if (!values) {
      const refs = { name, email, password, confirmPassword };
      if (form.firstInvalid) refs[form.firstInvalid].current?.focus();
      return;
    }
    Keyboard.dismiss();
    submitting.current = true;
    setBusy(true);
    setError(null);
    try {
      await auth.register(registerSchema.parse(values));
    } catch (cause) {
      setError(authErrorMessage(cause, true));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };
  const change = (field: keyof typeof form.values, value: string) => {
    form.setValue(field, value);
    setError(null);
  };
  const checks = [
    {
      label: 'Tối thiểu 8 ký tự (tối đa 128)',
      valid: form.values.password.length >= 8 && form.values.password.length <= 128,
    },
    { label: 'Ít nhất 1 chữ cái in hoa (A–Z)', valid: /[A-Z]/.test(form.values.password) },
    { label: 'Ít nhất 1 chữ cái in thường (a–z)', valid: /[a-z]/.test(form.values.password) },
    { label: 'Ít nhất 1 chữ số (0–9)', valid: /\d/.test(form.values.password) },
  ];
  return (
    <AuthScaffold
      title="Tạo tài khoản"
      description="Bắt đầu quản lý kế hoạch cá nhân và phối hợp hiệu quả cùng đội ngũ."
      back={goBack}
    >
      {error && <ErrorNotice message={error} />}
      <FormField
        ref={name}
        label="Họ và tên"
        placeholder="Ví dụ: Hoàng Minh Trí"
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        submitBehavior="submit"
        value={form.values.name}
        onChangeText={(value) => change('name', value)}
        onBlur={() => form.blur('name')}
        onSubmitEditing={() => email.current?.focus()}
        helper="Tối thiểu 2 ký tự, tối đa 100 ký tự."
        error={form.errors.name}
        editable={!busy}
      />
      <FormField
        ref={email}
        label="Email"
        placeholder="name@company.com"
        autoComplete="email"
        textContentType="emailAddress"
        keyboardType="email-address"
        returnKeyType="next"
        submitBehavior="submit"
        value={form.values.email}
        onChangeText={(value) => change('email', value)}
        onBlur={() => form.blur('email')}
        onSubmitEditing={() => password.current?.focus()}
        helper="Dùng email cá nhân hoặc email tổ chức của bạn."
        error={form.errors.email}
        editable={!busy}
      />
      <FormField
        ref={password}
        label="Mật khẩu"
        password
        placeholder="Tối thiểu 8 ký tự"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        submitBehavior="submit"
        value={form.values.password}
        onChangeText={(value) => change('password', value)}
        onBlur={() => form.blur('password')}
        onSubmitEditing={() => confirmPassword.current?.focus()}
        error={form.errors.password}
        editable={!busy}
      >
        <View style={styles.checks}>
          {checks.map((check) => (
            <View
              key={check.label}
              style={styles.check}
              accessible
              accessibilityLabel={`${check.valid ? 'Đã đạt' : 'Chưa đạt'}: ${check.label}`}
            >
              <Icon
                name={check.valid ? 'check' : 'alert'}
                size={14}
                color={check.valid ? colors['moss-dark'] : colors.steel}
              />
              <AppText
                variant="caption"
                style={{ flex: 1, color: check.valid ? colors['moss-dark'] : colors.steel }}
              >
                {check.label}
              </AppText>
            </View>
          ))}
        </View>
      </FormField>
      <FormField
        ref={confirmPassword}
        label="Xác nhận mật khẩu"
        password
        placeholder="Nhập lại chính xác mật khẩu"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        value={form.values.confirmPassword}
        onChangeText={(value) => change('confirmPassword', value)}
        onBlur={() => form.blur('confirmPassword')}
        onSubmitEditing={() => void submit()}
        helper="Đảm bảo mật khẩu xác nhận trùng khớp với mật khẩu đã nhập."
        error={form.errors.confirmPassword}
        editable={!busy}
      />
      <AppText variant="caption" style={styles.terms}>
        Hãy dùng email bạn có thể truy cập và mật khẩu riêng cho tài khoản NEXA.
      </AppText>
      <PrimaryButton label="Tạo tài khoản" busy={busy} onPress={() => void submit()} />
      <View style={styles.switchRow}>
        <AppText variant="body-sm" style={{ color: colors.slate }}>
          Đã có tài khoản NEXA?
        </AppText>
        <TextLink label="Đăng nhập ngay" disabled={busy} onPress={goBack} />
      </View>
    </AuthScaffold>
  );
}
const styles = StyleSheet.create({
  checks: { gap: spacing.xxs },
  check: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  terms: { color: colors.steel, marginBottom: spacing.xl },
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
});
