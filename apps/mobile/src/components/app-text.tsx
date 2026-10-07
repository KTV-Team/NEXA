import { Text, type TextProps } from 'react-native';
import { type TypographyName } from '@nexa/design-tokens';
import { textStyle } from '@/theme/typography';
import { styles } from './app-text.styles';

interface AppTextProps extends TextProps {
  variant?: TypographyName;
}

export function AppText({ variant = 'body-md', style, ...props }: AppTextProps) {
  return <Text {...props} style={[textStyle(variant), styles.base, style]} />;
}
