import { Modal, Pressable, View } from 'react-native';
import { colors } from '@nexa/design-tokens';
import { AppText } from '@/components/app-text';
import { LoadingIndicator } from './loading-indicator';
import { styles } from './confirmation-dialog.styles';

export function ConfirmationDialog({
  visible,
  title,
  message,
  confirmLabel,
  busyLabel = 'Đang xử lý…',
  cancelLabel = 'Hủy bỏ',
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  busyLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm(): void;
  onCancel(): void;
}) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.scrim}>
        <View accessibilityViewIsModal style={styles.dialog}>
          <AppText variant="heading-5" style={styles.title}>{title}</AppText>
          <AppText variant="body-sm" style={styles.message}>{message}</AppText>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={onCancel}
              style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
            >
              <AppText variant="body-sm-medium" style={styles.cancelText}>{cancelLabel}</AppText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: busy, busy }}
              disabled={busy}
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.confirmButton,
                destructive && styles.confirmDestructive,
                busy && styles.busy,
                pressed && !busy && styles.pressed,
              ]}
            >
              {busy && <LoadingIndicator size="sm" color={colors['on-primary']} />}
              <AppText variant="body-sm-medium" style={styles.confirmText}>
                {busy ? busyLabel : confirmLabel}
              </AppText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
