import { View } from 'react-native';
import { styles } from './progress-bar.styles';

export function ProgressBar({ progress }: { progress: number }) {
  const percent = Number.isFinite(progress) ? Math.max(0, Math.min(100, progress)) : 0;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      style={styles.track}
    >
      <View style={[styles.fill, { width: `${percent}%` }]} />
    </View>
  );
}
