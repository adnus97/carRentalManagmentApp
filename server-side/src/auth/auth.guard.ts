// src/auth/auth.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UseGuards,
  createParamDecorator,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../db/database.service';
import { schema } from '../db';
import { User, Session } from 'better-auth';
import { getRequestResponseFromContext } from '../utils/better-auth';

export interface CustomUser extends User {
  session_id: string;
  token: string;
  org_id: string | null;
  role: string;
  subscriptionStatus: string;
  subscriptionEndDate: Date | null;
}

// Simple cookie parser function
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

export const CurrentUser = createParamDecorator(
  (_: unknown, context: ExecutionContext) => {
    const { req } = getRequestResponseFromContext(context);
    if (!req.locals) return null;
    return req.locals.user as CustomUser;
  },
);

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(DatabaseService) private readonly databaseService: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext) {
    try {
      const { req } = getRequestResponseFromContext(context);

      // Check if it's a public route
      const isPublic = this.reflector.get<boolean>(
        'isPublic',
        context.getHandler(),
      );

      if (isPublic) {
        return true;
      }

      const cookies = parseCookieString(req.headers.cookie || '');

      // ✅ FIXED: Look for the actual cookie names being used
      const sessionToken =
        cookies.get('__Secure-velcar.session_token') || // Production (HTTPS)
        cookies.get('velcar.session_token') || // Development (HTTP)
        cookies.get('__Secure-better-auth.session_token') || // Fallback
        cookies.get('better-auth.session_token'); // Fallback

      if (!sessionToken) {
        console.log('❌ No session token found');
        console.log('Available cookies:', Array.from(cookies.keys()));
        return false;
      }

      const splitSessionToken = sessionToken.split('.')[0];

      if (!this.databaseService || !this.databaseService.db) {
        console.log('❌ Database service not available');
        return false;
      }

      const response = await this.databaseService.db
        .select()
        .from(schema.session)
        .leftJoin(schema.users, eq(schema.users.id, schema.session.userId))
        .leftJoin(
          schema.organization,
          eq(schema.users.id, schema.organization.userId),
        )
        .where(eq(schema.session.token, splitSessionToken));

      if (!response.length) {
        console.log('❌ No session found in database');
        return false;
      }

      const session = response[0];
      const user = session.user;

      if (!user) {
        console.log('❌ No user found in session');
        return false;
      }

      const userRole = user.role || 'user';
      const subscriptionStatus = user.subscriptionStatus || 'inactive';
      const subscriptionEndDate = user.subscriptionEndDate
        ? new Date(user.subscriptionEndDate)
        : null;

      console.log('✅ User authenticated:', user.email, 'Role:', userRole);

      // ✅ Super admins bypass subscription checks
      if (userRole === 'super_admin') {
        console.log('✅ Super admin access granted');

        if (!req.locals) req.locals = {};
        req.locals.user = {
          ...user,
          session_id: session.session.id,
          token: session.session.token,
          org_id: session.organization?.id || null,
          role: userRole,
          subscriptionStatus: 'active', // Always active for super admin
          subscriptionEndDate: null,
        } as CustomUser;

        req.locals.session = session.session as unknown as Session;

        return true;
      }

      // ✅ Regular users: check subscription
      const now = new Date();

      // Auto-expire if subscription ended
      if (
        subscriptionStatus === 'active' &&
        subscriptionEndDate &&
        subscriptionEndDate < now
      ) {
        await this.databaseService.db
          .update(schema.users)
          .set({
            subscriptionStatus: 'expired',
            updatedAt: new Date(),
          })
          .where(eq(schema.users.id, user.id));

        throw new ForbiddenException({
          message:
            'Your subscription has expired. Please contact support to renew.',
          statusCode: 403,
          error: 'SUBSCRIPTION_EXPIRED',
          subscriptionEndDate,
        });
      }

      // Allow access to certain routes without subscription
      const path = req.path || req.url;

      const allowedPaths = [
        '/subscription',
        '/auth',
        '/notifications',
        '/api/auth',
      ];
      const isAllowedPath = allowedPaths.some((p) => path.includes(p));

      // Block inactive/expired users (except on allowed routes)
      if (!isAllowedPath && subscriptionStatus !== 'active') {
        throw new ForbiddenException({
          message: 'Your subscription is not active. Please contact support.',
          statusCode: 403,
          error: 'SUBSCRIPTION_REQUIRED',
          subscriptionStatus,
        });
      }

      if (!req.locals) req.locals = {};
      req.locals.user = {
        ...user,
        session_id: session.session.id,
        token: session.session.token,
        org_id: session.organization?.id || null,
        role: userRole,
        subscriptionStatus,
        subscriptionEndDate,
      } as CustomUser;

      req.locals.session = session.session as unknown as Session;

      return true;
    } catch (error) {
      // Re-throw ForbiddenException to preserve the 403 status
      if (error instanceof ForbiddenException) {
        throw error;
      }

      console.error('❌ AuthGuard error:', error);
      return false;
    }
  }
}

export const Auth = () => UseGuards(AuthGuard);
export const Public = () => SetMetadata('isPublic', true);
