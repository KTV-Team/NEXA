import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, rounded, spacing } from '@nexa/design-tokens';
import { AppText, ErrorNotice, PrimaryButton } from '../src/components/ui';
import { AuthScaffold } from '../src/features/auth/components/auth-scaffold';
import { useAuth } from '../src/features/auth/auth-provider';

/** Displays the active account session and its sign-out action. */
export default function AccountSessionScreen() {
  const { session, logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <AuthScaffold title="Chào mừng đến NEXA" description="Bạn đã đăng nhập thành công.">
      {error && <ErrorNotice message={error} />}
      <View style={styles.card}>
        <AppText variant="heading-5">{session?.user.name}</AppText>
        <AppText style={{ color: colors.slate }}>{session?.user.email}</AppText>
      </View>
      <PrimaryButton
        label="Đăng xuất"
        busy={busy}
        onPress={() => {
          setBusy(true);
          void logout()
            .catch(() => setError('Không thể kết thúc phiên. Vui lòng thử lại.'))
            .finally(() => setBusy(false));
        }}
      />
    </AuthScaffold>
  );
}
const styles = StyleSheet.create({
  card: {
    padding: spacing.xl,
    gap: spacing.xs,
    borderRadius: rounded.xl,
    borderWidth: 1,
    borderColor: colors['hairline-soft'],
    marginBottom: spacing.xl,
  },
});
