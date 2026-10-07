import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Icon } from '@/components/icon';
import { styles } from './auth-scaffold.styles';

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
          <View style={styles.balance} />
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

