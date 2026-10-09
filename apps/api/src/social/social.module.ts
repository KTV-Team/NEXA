import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SocialController } from './social.controller';
import { SocialService } from './social.service';
import { NotificationWorker } from './notification.worker';
import { NoStoreInterceptor } from '../common/interceptors/no-store.interceptor';
import { RecipientPolicyService } from './recipient-policy.service';
import { NotificationDeliveryService } from './notification-delivery.service';
import { InboxRealtimeGateway } from './inbox-realtime.gateway';
import { ExpoPushService } from './expo-push.service';
import { InboxDeliveryWorker } from './inbox-delivery.worker';

@Module({ imports: [AuthModule], controllers: [SocialController], providers: [SocialService, NotificationWorker, NoStoreInterceptor, RecipientPolicyService, NotificationDeliveryService, InboxRealtimeGateway, ExpoPushService, InboxDeliveryWorker], exports: [SocialService, RecipientPolicyService, NotificationDeliveryService] })
export class SocialModule {}
