import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UseGuards,
  createParamDecorator,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Session, User } from 'better-auth';
import { getRequestResponseFromContext } from 'src/utils/better-auth/better-auth';
import { parseCookies } from 'better-auth';
import { BetterAuthService } from 'src/utils/better-auth/better-auth';
import { fromNodeHeaders } from 'better-auth/node';

export interface CustomUser extends User {
  session_id: string;
  token: string;
  org_id: string | null;
  role: string | null;
}
export const CurrentUser = createParamDecorator(
  (_: unknown, context: ExecutionContext) => {
    const { req } = getRequestResponseFromContext(context);
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
    readonly betterAuthService: BetterAuthService,
    readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext) {
    const { req } = getRequestResponseFromContext(context);

    const parseCookie = parseCookies(req.headers.cookie ?? '');
    const sessionToken = parseCookie.get('better-auth.session_token');

    // api is public
    const isPublic = this.reflector.get<boolean>(
      'isPublic',
      context.getHandler(),
    );

    if (isPublic) return true;
    if (!sessionToken) return false;

    const session = (await this.betterAuthService.api.getSession({
      headers: fromNodeHeaders(req.headers),
    })) as any;

    if (!session) {
      return false;
    }

    req.locals = {};

    req.locals.user = session.user as unknown as User;
    req.locals.session = session.session as unknown as Session;
    return true;
  }
}

export const Auth = () => {
  return UseGuards(AuthGuard);
};

// api is public accessible
export const Public = () => SetMetadata('isPublic', true);
