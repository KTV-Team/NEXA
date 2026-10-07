import { describe, expect, it } from 'vitest';
import { registerFormSchema } from '../../../../../src/features/auth/screens/register/register-form-schema';

describe('registration form schema', () => {
  const credentials = {
    email: 'tri@example.com',
    name: 'Hoàng Minh Trí',
    password: 'Example123',
  };

  it('requires matching password confirmation', () => {
    expect(
      registerFormSchema.safeParse({ ...credentials, confirmPassword: 'Different123' }).success,
    ).toBe(false);
  });

  it('accepts matching confirmation as form-only data', () => {
    expect(
      registerFormSchema.safeParse({ ...credentials, confirmPassword: credentials.password })
        .success,
    ).toBe(true);
  });
});
