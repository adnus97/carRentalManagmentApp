import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { BetterAuthModule } from './utils/better-auth/better-auth.module';
import { DatabaseModule } from './db';
import { OrganizationModule } from './organization/organization.module';

import { ImagekitModule } from './utils/imagekit/imagekit.module';
import { CarsModule } from './cars/cars.module';
import { CustomerModule } from './customer/customer.module';

@Module({
  imports: [
    DatabaseModule,
    BetterAuthModule,
    AuthModule,
    OrganizationModule,
    CarsModule,
    ImagekitModule,
    CustomerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
