import { Module } from '@nestjs/common';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })], // ensure env is available
  controllers: [EmailController],
  providers: [EmailService],
  exports: [EmailService], // IMPORTANT
})
export class EmailModule {}
