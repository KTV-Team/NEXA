import { deviceRegistrationSchema } from '@nexa/validation';

describe('device registration boundary contract', () => {
  const validRegistration = {
    platform: 'ios',
    pushToken: 'ExpoPushToken[device_token_123]',
    permissionStatus: 'granted',
  } as const;

  it('accepts a granted native device with an Expo token', () => {
    expect(deviceRegistrationSchema.safeParse(validRegistration).success).toBe(true);
  });

  it('allows a registration without a token when OS permission is unavailable', () => {
    expect(deviceRegistrationSchema.safeParse({
      platform: 'android',
      pushToken: null,
      permissionStatus: 'denied',
    }).success).toBe(true);
  });

  it('rejects unknown platforms, malformed tokens and tokens after permission denial', () => {
    expect(deviceRegistrationSchema.safeParse({ ...validRegistration, platform: 'web' }).success).toBe(false);
    expect(deviceRegistrationSchema.safeParse({ ...validRegistration, pushToken: 'secret-token' }).success).toBe(false);
    expect(deviceRegistrationSchema.safeParse({ ...validRegistration, permissionStatus: 'denied' }).success).toBe(false);
  });
});
