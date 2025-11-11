// src/admin/admin.module.ts
import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { SubscriptionService } from 'src/subscription/subscription.service';
import { DatabaseService } from 'src/db';
import { EmailService } from 'src/email/email.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import { SubscriptionModule } from 'src/subscription/subscription.module';

@Module({
  controllers: [AdminController],
  imports: [SubscriptionModule],
  providers: [
    AdminService,
    SubscriptionService,
    DatabaseService,
    EmailService,
    NotificationsService,
  ],
  exports: [AdminService],
})
export class AdminModule {}
