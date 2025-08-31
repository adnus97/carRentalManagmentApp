import { Module } from '@nestjs/common';
import { RentsService } from './rents.service';
import { RentsController } from './rents.controller';
import { RentStatusCronService } from './rent-status-cron.service';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  controllers: [RentsController],
  providers: [RentsService, RentStatusCronService],
  imports: [NotificationsModule],
  exports: [RentsService],
})
export class RentsModule {}
