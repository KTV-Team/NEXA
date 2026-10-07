import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { appEnvironment } from './config/environment';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { DevModule } from './dev/dev.module';

const devModules = appEnvironment.NODE_ENV === 'production' ? [] : [DevModule];

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => appEnvironment] }),
    DatabaseModule,
    HealthModule,
    AuthModule,
    UsersModule,
    ...devModules,
  ],
})
export class AppModule {}
