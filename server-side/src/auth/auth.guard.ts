import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  SetMetadata,
  UseGuards,
  createParamDecorator,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Session, User } from 'better-auth';
import { parseCookies } from 'better-auth/cookies';
import {
  BetterAuthService,
  getRequestResponseFromContext,
} from '../utils/better-auth';
import { fromNodeHeaders } from 'better-auth/node';
import { DatabaseService, organization, schema } from '../db';
import { eq } from 'drizzle-orm';

export interface CustomUser extends User {
  session_id: string;
  token: string;
  org_id: string | null;
  role: string | null;
}
export const CurrentUser = createParamDecorator(
  (_: unknown, context: ExecutionContext) => {
    const { req } = getRequestResponseFromContext(context);
    if (!req.locals) return null;
    const user = req.locals.user;
    const session = req.locals.session;
    return user
      ? {
          ...user,
          session_id: session?.id,
          token: session?.token,
          org_id: session?.active_organization_id,
          role: session?.role,
        }
      : null;
  },
);

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    // readonly luciaService: LuciaService,
    // readonly betterAuthService: BetterAuthService,
    readonly reflector: Reflector,
    @Inject(DatabaseService) private readonly database: DatabaseService,
    // @Inject(BetterAuthService)
    // private readonly betterAuthService: BetterAuthService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const { req } = getRequestResponseFromContext(context);

    const parseCookie = parseCookies(req.headers.cookie ?? '');
    const sessionToken = parseCookie.get('better-auth.session_token');
    const splitSessionToekn = sessionToken?.split('.')[0];

    // api is public
    const isPublic = this.reflector.get<boolean>(
      'isPublic',
      context.getHandler(),
    );

    if (isPublic) return true;
    if (!sessionToken) return false;

    const response = await this.database.db
      .select()
      .from(schema.session)
      .leftJoin(schema.users, eq(schema.users.id, schema.session.userId))
      .leftJoin(
        schema.organization,
        eq(schema.users.id, schema.organization.userId),
      )
      .where(eq(schema.session.token, splitSessionToekn));

    // const session = await this.betterAuthService.auth.api.getSession;

    if (!response.length) {
      return false;
    }
    const session = response[0];
    if (!req.locals) req.locals = {};
    req.locals.user = session.user as unknown as User;
    req.locals.session = {
      ...(session.session as unknown as Session),
      active_organization_id: session.organization?.id || null,
    };
    return true;
  }
}

export const Auth = () => {
  return UseGuards(AuthGuard);
};

// api is public accessible
export const Public = () => SetMetadata('isPublic', true);
