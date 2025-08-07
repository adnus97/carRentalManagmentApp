import { Module } from '@nestjs/common';
import { RentsService } from './rents.service';
import { RentsController } from './rents.controller';
import { RentStatusCronService } from './rent-status-cron.service';

@Module({
  controllers: [RentsController],
  providers: [RentsService, RentStatusCronService],
})
export class RentsModule {}
