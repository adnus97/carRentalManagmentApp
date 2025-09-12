import { Module } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { CustomerController } from './customer.controller';
import { DatabaseModule } from 'src/db/database.module';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { FilesModule } from 'src/files/files.module'; // Add this

@Module({
  imports: [DatabaseModule, NotificationsModule, FilesModule], // Add FilesModule
  controllers: [CustomerController],
  providers: [CustomerService],
  exports: [CustomerService],
})
export class CustomerModule {}
