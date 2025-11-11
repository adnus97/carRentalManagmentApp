// src/auth/auth.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UseGuards,
  createParamDecorator,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { eq } from 'drizzle-orm';
import { DatabaseService, organization, schema } from '../db';
import { parseCookies } from 'better-auth/cookies';
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
    readonly reflector: Reflector,
    private readonly database: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const { req } = getRequestResponseFromContext(context);

    const isPublic = this.reflector.get<boolean>(
      'isPublic',
      context.getHandler(),
    );
    if (isPublic) return true;

    const parseCookie = parseCookies(req.headers.cookie ?? '');
    const sessionToken = parseCookie.get('better-auth.session_token');
    if (!sessionToken) return false;

    const splitSessionToken = sessionToken.split('.')[0];

    const response = await this.database.db
      .select()
      .from(schema.session)
      .leftJoin(schema.users, eq(schema.users.id, schema.session.userId))
      .leftJoin(
        schema.organization,
        eq(schema.users.id, schema.organization.userId),
      )
      .where(eq(schema.session.token, splitSessionToken));

    if (!response.length) return false;

    const session = response[0];
    const user = session.user;

    const userRole = user.role || 'user';
    const subscriptionStatus = user.subscriptionStatus || 'inactive';
    const subscriptionEndDate = user.subscriptionEndDate
      ? new Date(user.subscriptionEndDate)
      : null;

    // ✅ Super admins bypass subscription checks
    if (userRole === 'super_admin') {
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
      await this.database.db
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
  }
}

export const Auth = () => UseGuards(AuthGuard);
export const Public = () => SetMetadata('isPublic', true);
