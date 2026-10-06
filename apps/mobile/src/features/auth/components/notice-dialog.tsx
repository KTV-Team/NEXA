import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { colors, rounded, spacing } from '@nexa/design-tokens';
import { AppText, PrimaryButton } from '../../../components/ui';

export function NoticeDialog({
  title,
  message,
  close,
}: {
  title: string;
  message: string;
  close(): void;
}) {
  return (
    <Modal transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.overlay} onPress={close} accessibilityLabel="Đóng thông báo">
        <Pressable style={styles.card} onPress={() => {}} accessibilityViewIsModal>
          <AppText variant="heading-5" accessibilityRole="header">
            {title}
          </AppText>
          <AppText variant="body-sm" style={{ color: colors.slate }}>
            {message}
          </AppText>
          <View>
            <PrimaryButton label="Đã hiểu" onPress={close} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: `${colors.primary}66`,
  },
  card: {
    width: '100%',
    maxWidth: 430,
    gap: spacing.md,
    backgroundColor: colors.canvas,
    borderRadius: rounded.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors['hairline-soft'],
  },
});
