import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { BetterAuthModule } from './utils/better-auth/better-auth.module';
import { DatabaseModule } from './db';
import { OrganizationModule } from './organization/organization.module';
import { UploadModule } from './upload/upload.module';

@Module({
  imports: [DatabaseModule, BetterAuthModule, AuthModule, OrganizationModule, UploadModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
