import { mobileTypography, type TypographyName } from '@nexa/design-tokens';
import type { TextStyle } from 'react-native';

const families = {
  '400': 'NotoSans_400Regular',
  '500': 'NotoSans_500Medium',
  '600': 'NotoSans_600SemiBold',
} as const;

/** Bundled, offline-capable substitute specified by DESIGN.md. */
export function textStyle(name: TypographyName): TextStyle {
  const token = mobileTypography(name);
  return { ...token, fontFamily: families[token.fontWeight], fontWeight: 'normal' };
}
