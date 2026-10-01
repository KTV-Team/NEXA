import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors, mobileTypography } from '@nexa/design-tokens';

export default function RootLayout() {
  return (
    <>
      <Stack
        screenOptions={{
          // {component.top-nav} — cream 64px bar, ink type, no shadow or hairline.
          headerStyle: {
            backgroundColor: colors.canvas,
          },
          headerTintColor: colors.ink,
          headerShadowVisible: false,
          headerTitleStyle: mobileTypography('title-md'),
          contentStyle: {
            backgroundColor: colors.canvas,
          },
        }}
      />
      <StatusBar style="dark" />
    </>
  );
}
