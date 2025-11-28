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
import { RentsModule } from './rents/rents.module';
import { ScheduleModule } from '@nestjs/schedule';
import { not } from 'drizzle-orm';
import { NotificationsModule } from './notifications/notifications.module';
import { ContractsModule } from './contracts/contracts.module';
import { ReportsModule } from './reports/reports.module';
import { ConfigModule } from '@nestjs/config';
import { R2Module } from './r2/r2.module';
import { FilesModule } from './files/files.module';
import { EmailModule } from './email/email.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import path, { join } from 'path';
import { SubscriptionModule } from './subscription/subscription.module';
import { AdminModule } from './admin/admin.module';
import {
  I18nModule,
  AcceptLanguageResolver,
  QueryResolver,
  HeaderResolver,
  I18nJsonLoader,
} from 'nestjs-i18n';
import { UsersModule } from './users/users.module';
@Module({
  imports: [
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      fallbacks: { 'en-*': 'en', 'fr-*': 'fr' },
      loader: I18nJsonLoader,
      loaderOptions: {
        // Dev: src/i18n, Prod: dist/src/i18n
        path: path.join(__dirname, '/i18n/'),
        watch: true,
      },
      resolvers: [
        { use: QueryResolver, options: ['lang', 'locale'] },
        AcceptLanguageResolver,
      ],
    }),

    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'public'),
      serveRoot: '/',
    }),
    ScheduleModule.forRoot(),
    ConfigModule.forRoot(),
    DatabaseModule,
    BetterAuthModule,
    AuthModule,
    OrganizationModule,
    CarsModule,
    ImagekitModule,
    CustomerModule,
    RentsModule,
    NotificationsModule,
    ScheduleModule.forRoot(), // For cron jobs
    NotificationsModule,
    ContractsModule,
    ReportsModule,
    R2Module,
    FilesModule,
    EmailModule,
    SubscriptionModule,
    AdminModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
