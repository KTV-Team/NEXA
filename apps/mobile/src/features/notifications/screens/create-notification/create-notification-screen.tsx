import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@nexa/design-tokens';
import { AppText } from '@/components/app-text';
import { Icon, type IconName } from '@/components/icon';
import { PrimaryButton } from '@/components/primary-button';
import { styles } from './create-notification-screen.styles';

type Recipient = 'self' | 'friend';
type DeliveryMode = 'immediate' | 'scheduled' | 'recurring';

const deliveryOptions: { value: DeliveryMode; title: string; detail: string; icon: IconName }[] = [
  { value: 'immediate', title: 'Gửi ngay', detail: 'Gửi sau khi dịch vụ thông báo sẵn sàng.', icon: 'mail' },
  { value: 'scheduled', title: 'Lên lịch một lần', detail: 'Chọn thời điểm gửi trong tương lai.', icon: 'calendar' },
  { value: 'recurring', title: 'Lặp lại định kỳ', detail: 'Tạo lời nhắc theo chu kỳ.', icon: 'repeat' },
];

export default function CreateNotificationScreen() {
  const [recipient, setRecipient] = useState<Recipient>('self');
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('immediate');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'right', 'bottom', 'left']}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quay lại hộp thư"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
        >
          <Icon name="back" size={20} />
        </Pressable>
        <AppText variant="body-md-medium" style={styles.headerTitle}>Tạo thông báo</AppText>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.titleGroup}>
            <AppText variant="heading-3" style={styles.title}>Gửi thông báo mới</AppText>
            <AppText variant="body-sm" style={styles.subtitle}>
              Tạo lời nhắc cho bản thân hoặc gửi cho bạn bè đã chấp nhận kết bạn.
            </AppText>
          </View>

          <View style={styles.availabilityNotice}>
            <Icon name="alert" size={18} color={colors.steel} />
            <AppText variant="body-sm" style={styles.noticeText}>
              API thông báo và danh sách bạn bè chưa có trong backend. Bản nháp này chưa thể gửi hoặc lưu.
            </AppText>
          </View>

          <View style={styles.fieldGroup}>
            <FieldLabel>Người nhận</FieldLabel>
            <View style={styles.segmentedControl}>
              <SegmentButton
                label="Chính tôi"
                selected={recipient === 'self'}
                onPress={() => setRecipient('self')}
              />
              <SegmentButton
                label="Bạn bè"
                selected={recipient === 'friend'}
                onPress={() => setRecipient('friend')}
              />
            </View>
            {recipient === 'self' ? (
              <View style={styles.selectedRecipient}>
                <View style={styles.recipientAvatar}>
                  <AppText variant="caption-bold" style={styles.recipientInitial}>Tôi</AppText>
                </View>
                <View style={styles.recipientCopy}>
                  <AppText variant="body-sm-medium">Chính tôi</AppText>
                  <AppText variant="caption" style={styles.secondaryText}>Tự nhắc nhở bản thân</AppText>
                </View>
                <Icon name="check" size={18} color={colors['moss-dark']} />
              </View>
            ) : (
              <InfoPanel>
                Danh sách bạn bè đã kết bạn sẽ hiển thị khi API quan hệ bạn bè được tích hợp.
              </InfoPanel>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <FieldLabel>Tiêu đề thông báo</FieldLabel>
            <TextInput
              accessibilityLabel="Tiêu đề thông báo"
              placeholder="Nhập tiêu đề"
              placeholderTextColor={colors.muted}
              value={title}
              onChangeText={setTitle}
              style={styles.input}
              returnKeyType="next"
            />
            <AppText variant="caption" style={styles.helper}>
              Tiêu đề sẽ xuất hiện cùng thông báo trong inbox.
            </AppText>
          </View>

          <View style={styles.fieldGroup}>
            <FieldLabel>Nội dung chi tiết</FieldLabel>
            <TextInput
              accessibilityLabel="Nội dung chi tiết"
              placeholder="Nhập nội dung thông báo"
              placeholderTextColor={colors.muted}
              value={body}
              onChangeText={setBody}
              style={[styles.input, styles.multilineInput]}
              multiline
              textAlignVertical="top"
            />
            <AppText variant="caption" style={styles.helper}>
              Nội dung chi tiết của lời nhắc hoặc thông báo.
            </AppText>
          </View>

          <View style={styles.fieldGroup}>
            <FieldLabel>Hình thức gửi</FieldLabel>
            <View style={styles.deliveryList}>
              {deliveryOptions.map((option) => (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: deliveryMode === option.value }}
                  aria-checked={deliveryMode === option.value}
                  onPress={() => setDeliveryMode(option.value)}
                  style={({ pressed }) => [
                    styles.deliveryOption,
                    deliveryMode === option.value && styles.deliveryOptionSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <Icon
                    name={option.icon}
                    size={18}
                    color={deliveryMode === option.value ? colors.ink : colors.steel}
                  />
                  <View style={styles.deliveryCopy}>
                    <AppText variant="body-sm-medium">{option.title}</AppText>
                    <AppText variant="caption" style={styles.secondaryText}>{option.detail}</AppText>
                  </View>
                  <View style={[styles.radioOuter, deliveryMode === option.value && styles.radioSelected]}>
                    {deliveryMode === option.value && <View style={styles.radioInner} />}
                  </View>
                </Pressable>
              ))}
            </View>
          </View>

          {deliveryMode === 'scheduled' && (
            <View style={styles.scheduleCard}>
              <AppText variant="body-sm-medium">Thời điểm gửi</AppText>
              <View style={styles.scheduleFields}>
                <View style={styles.scheduleField}>
                  <AppText variant="caption" style={styles.fieldHint}>Ngày gửi</AppText>
                  <TextInput
                    accessibilityLabel="Ngày gửi"
                    placeholder="dd/mm/yyyy"
                    placeholderTextColor={colors.muted}
                    value={date}
                    onChangeText={setDate}
                    style={styles.scheduleInput}
                  />
                </View>
                <View style={styles.scheduleField}>
                  <AppText variant="caption" style={styles.fieldHint}>Giờ gửi</AppText>
                  <TextInput
                    accessibilityLabel="Giờ gửi"
                    placeholder="hh:mm"
                    placeholderTextColor={colors.muted}
                    value={time}
                    onChangeText={setTime}
                    style={styles.scheduleInput}
                  />
                </View>
              </View>
              <AppText variant="caption" style={styles.helper}>
                Lịch gửi chỉ hoạt động sau khi dịch vụ lịch phía máy chủ được tích hợp.
              </AppText>
            </View>
          )}

          {deliveryMode === 'recurring' && (
            <InfoPanel>
              Cấu hình chu kỳ sẽ được bổ sung sau khi quy tắc lặp lại được xác nhận và backend hỗ trợ.
            </InfoPanel>
          )}

          <View style={styles.submitArea}>
            <PrimaryButton
              label="Tạo thông báo"
              disabled
              onPress={() => undefined}
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => router.back()}
              style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
            >
              <AppText variant="button-md" style={styles.cancelText}>Hủy bỏ</AppText>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FieldLabel({ children }: { children: string }) {
  return <AppText variant="body-sm-medium">{children}</AppText>;
}

function SegmentButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress(): void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
      onPress={onPress}
      style={[styles.segmentButton, selected && styles.segmentButtonSelected]}
    >
      <AppText variant="body-sm-medium" style={selected ? styles.segmentTextSelected : styles.segmentText}>
        {label}
      </AppText>
    </Pressable>
  );
}

function InfoPanel({ children }: { children: string }) {
  return (
    <View style={styles.infoPanel}>
      <Icon name="alert" size={16} color={colors.steel} />
      <AppText variant="caption" style={styles.infoPanelText}>{children}</AppText>
    </View>
  );
}

