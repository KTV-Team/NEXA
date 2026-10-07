import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { SessionStorage } from './auth-service';

const key = 'nexa.auth.session.v1';

/** Web preview persists only for the current tab; native uses Keychain/Keystore. */
export const sessionStorage: SessionStorage = {
  async read() {
    if (Platform.OS === 'web')
      return typeof window === 'undefined' ? null : window.sessionStorage.getItem(key);
    return SecureStore.getItemAsync(key);
  },
  async write(value) {
    if (Platform.OS === 'web') {
      window.sessionStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  },
  async remove() {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') window.sessionStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};
