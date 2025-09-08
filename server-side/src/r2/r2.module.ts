import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { R2Service } from './r2.service';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  providers: [R2Service, UploadService],
  controllers: [UploadController],
  exports: [R2Service, UploadService],
})
export class R2Module {}
