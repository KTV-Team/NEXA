import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors, mobileTypography } from '@nexa/design-tokens';

export default function RootLayout() {
  return (
    <>
      <Stack
        screenOptions={{
          // {component.top-nav} — white canvas 64px bar, ink type, no shadow.
          headerStyle: {
            backgroundColor: colors.canvas,
          },
          headerTintColor: colors.ink,
          headerShadowVisible: false,
          headerTitleStyle: mobileTypography('heading-5'),
          contentStyle: {
            backgroundColor: colors.canvas,
          },
        }}
      />
      <StatusBar style="dark" />
    </>
  );
}
