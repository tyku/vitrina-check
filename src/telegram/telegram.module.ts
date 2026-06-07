import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ChecklistsModule } from '../checklists';
import { SchedulesModule } from '../schedules';
import { UserModule } from '../user/user.module';
import { TelegramWebhookController } from './telegram-webhook.controller';
import { TelegramWebhookAuthService } from './telegram-webhook-auth.service';
import { TelegramWebhookInboundService } from './telegram-webhook-inbound.service';
import { TelegramWebhookLimitsInterceptor } from './telegram-webhook-limits.interceptor';
import {
  telegramWebhookDedupRedisProvider,
  TelegramWebhookDedupRedisLifecycle,
} from './telegram-webhook-dedup-redis.provider';
import { TelegramWebhookUpdateDedupService } from './telegram-webhook-update-dedup.service';
import { TELEGRAM_INCOMING_QUEUE } from './telegram-incoming.constants';
import { TELEGRAM_OUTBOUND_QUEUE } from './telegram-outbound.constants';
import { TelegramOutboundProcessor } from './telegram-outbound.processor';
import { TelegramOutboundRateLimitService } from './telegram-outbound-rate-limit.service';
import { TelegramOutboundService } from './telegram-outbound.service';
import { TelegramBotUiService } from './telegram-bot-ui.service';
import { TelegramIncomingProcessor } from './telegram-incoming.processor';
import { TelegramUserSessionService } from './telegram-user-session.service';
import { TelegramScheduleUiService } from './telegram-schedule-ui.service';
import { TelegramTagsUiService } from './telegram-tags-ui.service';
import { TelegramVitrinyUiService } from './telegram-vitriny-ui.service';
import { TelegramWebhookRegisterService } from './telegram-webhook-register.service';

@Module({
  imports: [
    UserModule,
    ChecklistsModule,
    SchedulesModule,
    BullModule.registerQueue({
      name: TELEGRAM_INCOMING_QUEUE,
    }),
    BullModule.registerQueue({
      name: TELEGRAM_OUTBOUND_QUEUE,
    }),
  ],
  controllers: [TelegramWebhookController],
  providers: [
    TelegramWebhookAuthService,
    telegramWebhookDedupRedisProvider,
    TelegramWebhookDedupRedisLifecycle,
    TelegramWebhookUpdateDedupService,
    TelegramWebhookInboundService,
    TelegramWebhookLimitsInterceptor,
    TelegramOutboundService,
    TelegramOutboundRateLimitService,
    TelegramOutboundProcessor,
    TelegramBotUiService,
    TelegramVitrinyUiService,
    TelegramTagsUiService,
    TelegramScheduleUiService,
    TelegramUserSessionService,
    TelegramIncomingProcessor,
    TelegramWebhookRegisterService,
  ],
  exports: [
    TelegramWebhookAuthService,
    TelegramOutboundService,
    TelegramBotUiService,
    BullModule,
  ],
})
export class TelegramModule {}
