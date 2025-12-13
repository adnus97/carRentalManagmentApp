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

    // Parse cookies
    const cookies = parseCookieString(req.headers.cookie || '');

    // ✅ FIXED: Look for the actual cookie names being used
    const sessionToken =
      cookies.get('__Secure-velcar.session_token') || // Production (HTTPS)
      cookies.get('velcar.session_token') || // Development (HTTP)
      cookies.get('__Secure-better-auth.session_token') || // Fallback
      cookies.get('better-auth.session_token'); // Fallback

    if (!sessionToken) {
      console.log('❌ SuperAdminGuard: No session token found');
      console.log('Available cookies:', Array.from(cookies.keys()));
      throw new ForbiddenException('Authentication required');
    }

    const splitSessionToken = sessionToken.split('.')[0];

    // Query database for user
    const response = await this.database.db
      .select()
      .from(schema.session)
      .leftJoin(schema.users, eq(schema.users.id, schema.session.userId))
      .where(eq(schema.session.token, splitSessionToken));

    if (!response.length) {
      console.log('❌ SuperAdminGuard: Invalid session');
      throw new ForbiddenException('Invalid session');
    }

    const user = response[0].user;

    if (!user) {
      console.log('❌ SuperAdminGuard: User not found');
      throw new ForbiddenException('User not found');
    }

    console.log(
      '✅ SuperAdminGuard: User found:',
      user.email,
      'Role:',
      user.role,
    );

    // Check if super admin
    if (user.role !== 'super_admin') {
      console.log('❌ SuperAdminGuard: Insufficient permissions');
      throw new ForbiddenException({
        message: 'Access denied. Super admin privileges required.',
        statusCode: 403,
        error: 'INSUFFICIENT_PERMISSIONS',
      });
    }

    console.log('✅ SuperAdminGuard: Access granted');

    // Set user in req.locals for other uses
    if (!req.locals) req.locals = {};
    req.locals.user = user;

    return true;
  }
}

export const SuperAdmin = () => UseGuards(SuperAdminGuard);
