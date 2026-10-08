import { View } from 'react-native';
import { colors } from '@nexa/design-tokens';
import { AppText } from '@/components/app-text';
import { LoadingIndicator } from './loading-indicator';
import { styles } from './loading-screen.styles';

export function LoadingScreen({
  title = 'Đang tải dữ liệu…',
  description,
}: {
  title?: string;
  description?: string;
}) {
  return (
    <View style={styles.screen}>
      <View style={styles.brandMark}>
        <AppText variant="body-md-medium" style={styles.brandLetter}>N</AppText>
      </View>
      <AppText variant="body-md-medium" style={styles.title}>{title}</AppText>
      {description && <AppText variant="body-sm" style={styles.description}>{description}</AppText>}
      <View style={styles.progress}>
        <LoadingIndicator size="md" color={colors['brand-blue']} label="Đang tải" />
      </View>
    </View>
  );
}
