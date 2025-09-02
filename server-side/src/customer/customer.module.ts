import { Module } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { CustomerController } from './customer.controller';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  controllers: [CustomerController],
  providers: [CustomerService],
  imports: [NotificationsModule],
})
export class CustomerModule {}
