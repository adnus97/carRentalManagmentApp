// src/debug/debug.controller.ts
import { Controller, Get } from '@nestjs/common';

@Controller('debug')
export class DebugController {
  @Get('r2')
  getR2Env() {
    return {
      endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
      accessKey: !!process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
      secretKey: !!process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
      bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
      publicUrl: process.env.CLOUDFLARE_R2_PUBLIC_URL,
    };
  }
}
