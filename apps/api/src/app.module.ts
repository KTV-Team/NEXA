import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { appEnvironment } from './config/environment';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { DevModule } from './dev/dev.module';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ApiEnvelopeInterceptor } from './common/interceptors/api-envelope.interceptor';
import { SocialModule } from './social/social.module';

const devModules = appEnvironment.NODE_ENV === 'production' ? [] : [DevModule];

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => appEnvironment] }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    DatabaseModule,
    HealthModule,
    AuthModule,
    UsersModule,
    SocialModule,
    ...devModules,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: ApiEnvelopeInterceptor },
  ],
})
export class AppModule {}
