import { DatabaseService, session } from '../../db';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { betterAuth, type Auth } from 'better-auth';
import { schema } from '../../db';

export type BetterAuthService = Auth;
export const AUTH_SERVICE = 'AUTH_SERVICE';

export const BETTER_AUTH = {
  provide: AUTH_SERVICE,
  useFactory: (database: DatabaseService) => {
    database.onModuleInit();
    const auth = betterAuth({
      emailAndPassword: { enabled: true },
      trustedOrigins: ['http://localhost:5173'],
      baseUrl: 'http://localhost:3000',
      basePath: '/api/v1/auth',
      database: drizzleAdapter(database.db, {
        provider: 'pg', // or "mysql", "sqlite"

        schema: {
          user: schema.users,
          session: schema.session,
          verification: schema.verification,
          account: schema.account,
        },
      }),
    });
    return auth;
  },
  inject: [DatabaseService],
};
