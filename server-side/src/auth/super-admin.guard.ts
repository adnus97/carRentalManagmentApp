import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  UseGuards,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DatabaseService, schema } from '../db';
import { parseCookies } from 'better-auth/cookies';
import { eq } from 'drizzle-orm';
import { getRequestResponseFromContext } from '../utils/better-auth';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly database: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { req } = getRequestResponseFromContext(context);

    // ✅ Parse session token from cookies
    const parseCookie = parseCookies(req.headers.cookie ?? '');
    const sessionToken = parseCookie.get('better-auth.session_token');

    if (!sessionToken) {
      throw new ForbiddenException('Authentication required');
    }

    const splitSessionToken = sessionToken.split('.')[0];

    // ✅ Query database for user
    const response = await this.database.db
      .select()
      .from(schema.session)
      .leftJoin(schema.users, eq(schema.users.id, schema.session.userId))
      .where(eq(schema.session.token, splitSessionToken));

    if (!response.length) {
      throw new ForbiddenException('Invalid session');
    }

    const user = response[0].user;

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    // ✅ Check if super admin
    if (user.role !== 'super_admin') {
      throw new ForbiddenException({
        message: 'Access denied. Super admin privileges required.',
        statusCode: 403,
        error: 'INSUFFICIENT_PERMISSIONS',
      });
    }

    // ✅ Set user in req.locals for other uses
    if (!req.locals) req.locals = {};
    req.locals.user = user;

    return true;
  }
}

export const SuperAdmin = () => UseGuards(SuperAdminGuard);
