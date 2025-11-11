// src/subscription/subscription.module.ts
import { Module } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionAdminController } from './subscription-admin.controller';
import { SubscriptionCronService } from './subscription-cron.service';
import { DatabaseService } from 'src/db';
import { EmailService } from 'src/email/email.service';
import { NotificationsService } from 'src/notifications/notifications.service';

@Module({
  controllers: [SubscriptionController, SubscriptionAdminController],
  providers: [
    SubscriptionService,
    SubscriptionCronService,
    DatabaseService,
    EmailService,
    NotificationsService,
  ],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
