import { useState } from 'react';
import { View } from 'react-native';
import { AppText } from '@/components/app-text';
import { ErrorNotice } from '@/components/error-notice';
import { PrimaryButton } from '@/components/primary-button';
import { AuthScaffold } from '../../components/auth-scaffold';
import { useAuth } from '../../auth-provider';
import { styles } from './account-session-screen.styles';

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
        <AppText style={styles.email}>{session?.user.email}</AppText>
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
