import type { PropsWithChildren } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, rounded, spacing } from '@nexa/design-tokens';
import { AppText, Icon } from '../../../components/ui';

export function AuthScaffold({
  title,
  description,
  back,
  footer,
  children,
}: PropsWithChildren<{
  title: string;
  description: string;
  back?: () => void;
  footer?: React.ReactNode;
}>) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.frame}>
        <View style={styles.header}>
          {back && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Quay lại đăng nhập"
              onPress={back}
              style={styles.back}
            >
              <Icon name="back" />
            </Pressable>
          )}
          <View style={styles.brand} accessible accessibilityLabel="NEXA">
            <View style={styles.logo}>
              <AppText variant="body-md-medium">N</AppText>
            </View>
            <AppText variant="heading-5" style={styles.brandName}>
              NEXA
            </AppText>
          </View>
          {back ? (
            <View style={styles.balance} />
          ) : (
            <View style={styles.badge}>
              <AppText variant="caption-bold" style={{ color: colors['yellow-dark'] }}>
                v1.0
              </AppText>
            </View>
          )}
        </View>
        <KeyboardAvoidingView
          style={styles.fill}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={styles.content}
          >
            <View style={styles.titles}>
              <AppText variant="heading-3" accessibilityRole="header">
                {title}
              </AppText>
              <AppText style={styles.description}>{description}</AppText>
            </View>
            {children}
            {footer && <View style={styles.footer}>{footer}</View>}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  frame: { flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center' },
  fill: { flex: 1 },
  header: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
    minHeight: spacing.section,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  logo: {
    width: 28,
    height: 28,
    borderRadius: rounded.sm,
    backgroundColor: colors['brand-yellow'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: { fontFamily: 'NotoSans_600SemiBold' },
  badge: {
    backgroundColor: colors['surface-yellow'],
    borderRadius: rounded.full,
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balance: { width: 44 },
  content: {
    flexGrow: 1,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  titles: { gap: spacing.xs, marginBottom: spacing.xl },
  description: { color: colors.slate },
  footer: { marginTop: 'auto', paddingTop: spacing.xl },
});
