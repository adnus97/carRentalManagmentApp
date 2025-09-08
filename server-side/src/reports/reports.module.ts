import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { DatabaseService } from 'src/db';
import { NotificationsService } from 'src/notifications/notifications.service';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, DatabaseService, NotificationsService],
  exports: [ReportsService],
})
export class ReportsModule {}
