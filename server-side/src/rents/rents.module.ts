import { forwardRef, Module } from '@nestjs/common';
import { RentsService } from './rents.service';
import { RentsController } from './rents.controller';
//import { RentStatusCronService } from './rent-status-cron.service';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { ContractsModule } from 'src/contracts/contracts.module';

@Module({
  controllers: [RentsController],
  providers: [RentsService],
  imports: [NotificationsModule, forwardRef(() => ContractsModule)],
  exports: [RentsService],
})
export class RentsModule {}
