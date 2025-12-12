// src/auth/guards/super-admin.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  UseGuards,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DatabaseService, schema } from '../db';
import { eq } from 'drizzle-orm';
import { getRequestResponseFromContext } from '../utils/better-auth';

// Simple cookie parser function (same as AuthGuard)
function parseCookieString(cookieString: string): Map<string, string> {
  const cookies = new Map<string, string>();
  if (!cookieString) return cookies;

  cookieString.split(';').forEach((cookie) => {
    const [name, ...rest] = cookie.trim().split('=');
    if (name && rest.length > 0) {
      cookies.set(name.trim(), rest.join('=').trim());
    }
  });

  return cookies;
}

@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { req } = getRequestResponseFromContext(context);

    // ✅ Parse cookies properly
    const cookies = parseCookieString(req.headers.cookie || '');

    // Try both cookie names (production uses __Secure- prefix)
    const sessionToken =
      cookies.get('__Secure-better-auth.session_token') ||
      cookies.get('better-auth.session_token');

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
