import { Controller, Inject, All, Req, Res } from '@nestjs/common';
import { BetterAuthService } from 'src/utils/better-auth/better-auth.service';
import { toNestJsController } from 'src/utils/toNestJsController';
import { Request, Response } from 'express';
import { Get } from '@nestjs/common';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(BetterAuthService) private betterAuthSerivce: BetterAuthService,
  ) {}

  @Get('/test')
  async test() {
    return 'test';
  }
  @All('*')
  async handleAuth(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      return await toNestJsController(this.betterAuthSerivce, req, res);
    } catch (error) {
      console.error('Error in handleAuth:', error);
      throw new Error('Authentication handler failed');
    }
  }
}
