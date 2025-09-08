import { Body, Controller, Post } from '@nestjs/common';
import { UploadService, PresignDto, PresignResult } from './upload.service';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('presigned-url')
  async createPresignedUrl(@Body() body: PresignDto): Promise<PresignResult> {
    if (!body?.fileName || !body?.fileType) {
      throw new Error('fileName and fileType are required');
    }
    return this.uploadService.createPresignedUrl(body);
  }
}
