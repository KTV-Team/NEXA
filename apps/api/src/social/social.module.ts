import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SocialController } from './social.controller';
import { SocialService } from './social.service';
import { NotificationWorker } from './notification.worker';
import { NoStoreInterceptor } from '../common/interceptors/no-store.interceptor';

@Module({ imports: [AuthModule], controllers: [SocialController], providers: [SocialService, NotificationWorker, NoStoreInterceptor], exports: [SocialService] })
export class SocialModule {}
