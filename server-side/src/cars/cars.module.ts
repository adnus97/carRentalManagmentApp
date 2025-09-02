import { Module } from '@nestjs/common';
import { CarsController } from './cars.controller';
import { CarsService } from './cars.service';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  controllers: [CarsController],
  providers: [CarsService],
  exports: [CarsService],
  imports: [NotificationsModule],
})
export class CarsModule {}
