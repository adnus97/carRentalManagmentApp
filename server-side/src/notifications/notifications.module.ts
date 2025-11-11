// src/notifications/notifications.module.ts
import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { EnhancedCronService } from './enhanced-cron.service';
import { DatabaseModule } from '../db/database.module';
import { EmailModule } from 'src/email/email.module';

@Module({
  imports: [DatabaseModule, EmailModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, EnhancedCronService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
