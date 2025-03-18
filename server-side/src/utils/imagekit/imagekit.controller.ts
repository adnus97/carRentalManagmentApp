// imagekit.controller.ts
import { Controller, Get } from '@nestjs/common';
import { ImageKitService } from './imagekit.service';

@Controller('imagekitAuth')
export class ImageKitController {
  constructor(private readonly imageKitService: ImageKitService) {}

  @Get()
  getAuth() {
    return this.imageKitService.getAuthenticationParameters();
  }
}
