import { forwardRef, Module } from '@nestjs/common';
import { RentsService } from './rents.service';
import { RentsController } from './rents.controller';
//import { RentStatusCronService } from './rent-status-cron.service';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { ContractsModule } from 'src/contracts/contracts.module';
import { FilesModule } from 'src/files/files.module';
import { RentsRepository } from './rents.repository';
import { DatabaseModule } from 'src/db';

@Module({
  controllers: [RentsController],
  providers: [RentsService, RentsRepository],
  imports: [
    DatabaseModule,
    NotificationsModule,
    forwardRef(() => ContractsModule),
    FilesModule,
  ],
  exports: [RentsService, RentsRepository],
})
export class RentsModule {}
