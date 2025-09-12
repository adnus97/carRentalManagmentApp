import { forwardRef, Module } from '@nestjs/common';
import { RentsService } from './rents.service';
import { RentsController } from './rents.controller';
//import { RentStatusCronService } from './rent-status-cron.service';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { ContractsModule } from 'src/contracts/contracts.module';
import { FilesModule } from 'src/files/files.module';
import { RentsRepository } from './rents.repository';

@Module({
  controllers: [RentsController],
  providers: [RentsService, RentsRepository],
  imports: [
    NotificationsModule,
    forwardRef(() => ContractsModule),
    FilesModule,
  ],
  exports: [RentsService, RentsRepository],
})
export class RentsModule {}
