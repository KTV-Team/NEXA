import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { colors } from '@nexa/design-tokens';
import { AppText } from '@/components/app-text';
import { Icon, type IconName } from '@/components/icon';
import { styles } from './app-bottom-navigation.styles';

type AppTab = 'inbox' | 'create' | 'friends' | 'account';
type NavigationRoute = '/' | '/create-notification' | '/friends' | '/account';

const navigationItems: {
  key: AppTab;
  label: string;
  icon: IconName;
  route: NavigationRoute;
}[] = [
  { key: 'inbox', label: 'Hộp thư', icon: 'mail', route: '/' },
  { key: 'create', label: 'Tạo mới', icon: 'plus', route: '/create-notification' },
  { key: 'friends', label: 'Bạn bè', icon: 'users', route: '/friends' },
  { key: 'account', label: 'Cài đặt', icon: 'user', route: '/account' },
];

export function AppBottomNavigation({ active }: { active: AppTab }) {
  return (
    <View style={styles.navigation} accessibilityRole="tablist">
      {navigationItems.map((item) => {
        const selected = item.key === active;
        const tint = selected ? colors.ink : colors.steel;

        return (
          <Pressable
            key={item.key}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected }}
            onPress={() => router.replace(item.route)}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}
          >
            <Icon name={item.icon} size={20} color={tint} />
            <AppText
              variant={selected ? 'caption-bold' : 'caption'}
              style={[styles.label, { color: tint }]}
            >
              {item.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
