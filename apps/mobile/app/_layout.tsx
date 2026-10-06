import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  NotoSans_400Regular,
  NotoSans_500Medium,
  NotoSans_600SemiBold,
} from '@expo-google-fonts/noto-sans';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '@nexa/design-tokens';
import { AuthProvider, useAuth } from '../src/features/auth/auth-provider';

void SplashScreen.preventAutoHideAsync();
function RootNavigator() {
  const { session, loading } = useAuth();
  useEffect(() => {
    if (!loading) void SplashScreen.hideAsync();
  }, [loading]);
  if (loading)
    return (
      <View style={styles.loading}>
        <ActivityIndicator
          accessibilityLabel="Đang khôi phục phiên đăng nhập"
          color={colors.primary}
        />
      </View>
    );
  return (
    <>
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }}
      >
        <Stack.Protected guard={!session}>
          <Stack.Screen name="login" />
          <Stack.Screen name="register" options={{ gestureEnabled: false }} />
        </Stack.Protected>
        <Stack.Protected guard={!!session}>
          <Stack.Screen name="index" />
        </Stack.Protected>
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}
export default function RootLayout() {
  const [loaded, error] = useFonts({
    NotoSans_400Regular,
    NotoSans_500Medium,
    NotoSans_600SemiBold,
  });
  if (!loaded && !error) return null;
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.canvas,
  },
});
