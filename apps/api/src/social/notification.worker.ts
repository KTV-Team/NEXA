import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { appEnvironment } from '../config/environment';
import { SocialService } from './social.service';

@Injectable()
export class NotificationWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationWorker.name);
  private timer?: NodeJS.Timeout;
  private running?: Promise<void>;
  constructor(private readonly social: SocialService) {}

  onModuleInit() {
    if (!appEnvironment.NOTIFICATION_WORKER_ENABLED) return;
    void this.tick();
    this.timer = setInterval(() => void this.tick(), 1000);
    this.timer.unref();
  }
  async onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    await this.running;
  }
  async tick() {
    if (this.running) return this.running;
    this.running = this.social.processDue(new Date(), 50).then(() => undefined).catch(() => {
      this.logger.warn('Notification worker cycle failed; it will retry on the next poll.');
    }).finally(() => { this.running = undefined; });
    return this.running;
  }
}
