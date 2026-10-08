import { View } from 'react-native';
import { InlineAlert } from './common/inline-alert';
import { styles } from './error-notice.styles';

export function ErrorNotice({
  message,
  action,
}: {
  message: string;
  action?: { label: string; onPress(): void };
}) {
  return (
    <View style={styles.wrapper}>
      <InlineAlert variant="danger" message={message} action={action} />
    </View>
  );
}

