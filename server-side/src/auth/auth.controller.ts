// auth/auth.controller.ts
import {
  Controller,
  All,
  Req,
  Res,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { BetterAuthService } from 'src/utils/better-auth/better-auth.service';
import { toNodeHandler } from 'better-auth/node';

@Controller('auth') // Changed to match basePath
export class AuthController {
  constructor(private betterAuthService: BetterAuthService) {}

  @All('*')
  async handleAuth(@Req() req: Request, @Res() res: Response) {
    try {
      const authHandler = toNodeHandler(this.betterAuthService.auth);
      console.log('Auth request:', req.method, req.url, req.path);
      return await authHandler(req, res);
    } catch (error) {
      console.error('Auth error:', error);
      throw new HttpException(
        'Authentication handler failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
