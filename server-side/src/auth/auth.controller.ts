import { Controller, Inject, All, Req, Res } from '@nestjs/common';
import { BetterAuthService } from 'src/utils/better-auth/better-auth.service';
import { toNestJsController } from 'src/utils/toNestJsController';
import { Request, Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(BetterAuthService) private betterAuthSerivce: BetterAuthService,
  ) {}

  @All('*')
  async handleAuth(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const url = (req as any).originalUrl || req.url;
    console.log('Request received:', req.method, url);
    try {
      return await toNestJsController(this.betterAuthSerivce, req, res);
    } catch (error) {
      console.error('Error in handleAuth:', error);
      console.log('IN:', req.method, (req as any).originalUrl || req.url);
      throw new Error('Authentication handler failed');
    }
  }
}
