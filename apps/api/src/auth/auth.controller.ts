import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import type { AuthResponse, AuthTokens, LoginDto } from '@nexa/types';

// Stub implementation — replace with real JWT service
@Controller('auth')
export class AuthController {
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): AuthResponse {
    // ⚠️  Replace with real database lookup + bcrypt comparison
    const stubUser = {
      id: '1',
      email: dto.email,
      name: 'Alice',
      role: 'admin' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const stubTokens: AuthTokens = {
      accessToken: 'stub-access-token',
      refreshToken: 'stub-refresh-token',
      expiresIn: 3600,
    };

    return { user: stubUser, tokens: stubTokens };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(): void {
    // Invalidate token in production
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() body: { refreshToken: string }): AuthTokens {
    console.log('Refreshing token for:', body.refreshToken);
    return {
      accessToken: 'new-stub-access-token',
      refreshToken: 'new-stub-refresh-token',
      expiresIn: 3600,
    };
  }
}
