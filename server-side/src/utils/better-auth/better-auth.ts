import { DatabaseService } from '../../db';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { betterAuth, type Auth } from 'better-auth';

export type BetterAuthService = Auth;
export const AUTH_SERVICE = 'AUTH_SERVICE';

export const BETTER_AUTH = {
  provide: AUTH_SERVICE,
  useFactory: (database: DatabaseService) => {
    database.onModuleInit();
    const auth = betterAuth({
      database: drizzleAdapter(database, {
        provider: 'pg', // or "mysql", "sqlite"
      }),
    });
  },
  inject: [DatabaseService],
};
