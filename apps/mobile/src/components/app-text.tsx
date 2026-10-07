import { Text, type TextProps } from 'react-native';
import { colors, type TypographyName } from '@nexa/design-tokens';
import { textStyle } from '@/theme/typography';

interface AppTextProps extends TextProps {
  variant?: TypographyName;
}

export function AppText({ variant = 'body-md', style, ...props }: AppTextProps) {
  return <Text {...props} style={[textStyle(variant), { color: colors.ink }, style]} />;
}
