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
import { toNodeHandler } from 'better-auth/node';
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

  // private async getCurrentUser(@Req() req: Request, @Res() res: Response) {
  //   console.log('✅ /me endpoint HIT!');

  //   try {
  //     const session = await this.betterAuthService.auth.api.getSession({
  //       headers: req.headers as any,
  //     });

  //     console.log('📝 Session:', session);

  //     if (!session?.user) {
  //       console.log('❌ No session found');
  //       return res.status(401).json({ error: 'Not authenticated' });
  //     }

  //     // Fetch full user data from database
  //     const [fullUser] = await this.databaseService.db
  //       .select({
  //         id: users.id,
  //         name: users.name,
  //         email: users.email,
  //         emailVerified: users.emailVerified,
  //         image: users.image,
  //         role: users.role,
  //         subscriptionStatus: users.subscriptionStatus,
  //         subscriptionStartDate: users.subscriptionStartDate,
  //         subscriptionEndDate: users.subscriptionEndDate,
  //         createdAt: users.createdAt,
  //         updatedAt: users.updatedAt,
  //       })
  //       .from(users)
  //       .where(eq(users.id, session.user.id));

  //     if (!fullUser) {
  //       return res.status(404).json({ error: 'User not found' });
  //     }

  //     console.log('✅ Returning user:', fullUser);
  //     return res.json(fullUser);
  //   } catch (error) {
  //     console.error('💥 Error fetching current user:', error);
  //     return res.status(500).json({ error: 'Internal server error' });
  //   }
  // }
}
