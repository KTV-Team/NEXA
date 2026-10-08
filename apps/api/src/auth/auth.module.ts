import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { AuthWebOriginGuard } from './auth-web-origin.guard';
import { AuthAccountEntity } from './entities/auth-account.entity';
import { AuthSessionEntity } from './entities/auth-session.entity';
import { UserEntity } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, AuthAccountEntity, AuthSessionEntity]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: Buffer.from(config.getOrThrow<string>('AUTH_ACCESS_SECRET'), 'base64'),
        signOptions: {
          algorithm: 'HS256' as const,
          issuer: 'nexa-api',
          audience: 'nexa-client',
          expiresIn: 900,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, AuthWebOriginGuard],
  exports: [AuthService, AuthGuard, AuthWebOriginGuard, JwtModule, TypeOrmModule],
})
export class AuthModule {}
