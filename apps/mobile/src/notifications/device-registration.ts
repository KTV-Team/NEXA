import * as Crypto from 'expo-crypto';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { DeviceRegistrationResponse, PushPermissionStatus, PushPlatform } from '@nexa/types';
import type { AuthService } from '@/features/auth/auth-service';

const installationKey = 'nexa.push.installation-id';
let installationIdRequest: Promise<string> | undefined;

export interface DeviceRegistrationState {
  permissionStatus: PushPermissionStatus;
  registered: boolean;
  error: string | null;
}

function currentPlatform(): PushPlatform | null {
  return Platform.OS === 'android' || Platform.OS === 'ios' ? Platform.OS : null;
}

function permissionStatus(status: Notifications.NotificationPermissionsStatus): PushPermissionStatus {
  if (Platform.OS === 'ios' && status.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return 'provisional';
  if (status.granted) return 'granted';
  if (status.status === Notifications.PermissionStatus.DENIED) return 'denied';
  return 'undetermined';
}

async function getInstallationId(): Promise<string> {
  if (!installationIdRequest) {
    installationIdRequest = (async () => {
      const stored = await SecureStore.getItemAsync(installationKey);
      if (stored) return stored;
      const generated = Crypto.randomUUID();
      await SecureStore.setItemAsync(installationKey, generated);
      return generated;
    })().catch((error: unknown) => {
      installationIdRequest = undefined;
      throw error;
    });
  }
  return installationIdRequest;
}

function easProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra;
  const eas = extra && typeof extra['eas'] === 'object' && extra['eas'] !== null
    ? extra['eas'] as Record<string, unknown>
    : undefined;
  const projectId = Constants.easConfig?.projectId ?? eas?.['projectId'];
  return typeof projectId === 'string' && projectId.length > 0 ? projectId : undefined;
}

export async function registerDevice(
  api: AuthService['api'],
  requestPermission = false,
): Promise<DeviceRegistrationState> {
  const platform = currentPlatform();
  if (!platform) return { permissionStatus: 'undetermined', registered: false, error: null };

  let permission = await Notifications.getPermissionsAsync();
  if (requestPermission && !permission.granted && permission.ios?.status !== Notifications.IosAuthorizationStatus.PROVISIONAL) {
    permission = await Notifications.requestPermissionsAsync();
  }
  const status = permissionStatus(permission);
  let token: string | null = null;
  if (status === 'granted' || status === 'provisional') {
    try {
      if (platform === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Thông báo NEXA', importance: Notifications.AndroidImportance.HIGH,
        });
      }
      const projectId = easProjectId();
      if (!projectId) throw new Error('EXPO_PROJECT_ID_MISSING');
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    } catch (failure) {
      const error = failure instanceof Error && failure.message === 'EXPO_PROJECT_ID_MISSING'
        ? 'Thiếu cấu hình EAS project ID.'
        : 'Chưa thể lấy push token. Kiểm tra mạng và thử lại.';
      return { permissionStatus: status, registered: false, error };
    }
  }

  try {
    const installationId = await getInstallationId();
    const result: DeviceRegistrationResponse = await api.devices.register(installationId, {
      platform, pushToken: token, permissionStatus: status,
    });
    return { permissionStatus: status, registered: result.registered, error: null };
  } catch {
    return { permissionStatus: status, registered: false, error: 'Chưa thể đồng bộ thiết bị. Thử lại khi có mạng.' };
  }
}

export async function unregisterDevice(api: AuthService['api']): Promise<void> {
  const installationId = await SecureStore.getItemAsync(installationKey);
  if (installationId) await api.devices.unregister(installationId);
}
