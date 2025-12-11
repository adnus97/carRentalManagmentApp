import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { DatabaseModule, DatabaseService } from 'src/db';
import { NotificationsService } from 'src/notifications/notifications.service';

@Module({
  imports: [
    DatabaseModule, // ✅ Add this - needed for DatabaseService
  ],
  controllers: [ReportsController],
  providers: [ReportsService, DatabaseService, NotificationsService],
  exports: [ReportsService],
})
export class ReportsModule {}
