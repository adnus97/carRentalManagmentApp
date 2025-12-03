// auth/auth.controller.ts
import {
  Controller,
  All,
  Get,
  Req,
  Res,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { BetterAuthService } from 'src/utils/better-auth/better-auth.service';
import { DatabaseService } from 'src/db/database.service';
import { users } from 'src/db/schema/users';
import { eq } from 'drizzle-orm';

@Controller('auth')
export class AuthController {
  constructor(
    private betterAuthService: BetterAuthService,
    private databaseService: DatabaseService,
  ) {}

  // auth/auth.controller.ts
  @All('*')
  async handleAuth(@Req() req: Request, @Res() res: Response) {
    try {
      const { toNodeHandler } = await import('better-auth/node');
      const authHandler = toNodeHandler(this.betterAuthService.auth);
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
