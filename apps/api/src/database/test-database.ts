import { appEnvironment } from '../config/environment';

export function assertDedicatedTestDatabase(): void {
  if (
    appEnvironment.NODE_ENV !== 'test' ||
    appEnvironment.DB_NAME !== 'nexa_test' ||
    !['localhost', '127.0.0.1'].includes(appEnvironment.DB_HOST.toLowerCase()) ||
    !appEnvironment.ALLOW_DEV_SEED
  ) {
    throw new Error('Database integration tests require NODE_ENV=test, local nexa_test, and ALLOW_DEV_SEED=true');
  }
}
