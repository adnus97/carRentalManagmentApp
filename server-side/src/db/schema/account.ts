import { string } from 'better-auth/*';
import { users } from './users';
import {
  integer,
  pgTable,
  text,
  varchar,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core';

export const account = pgTable('account', {
  id: varchar({ length: 255 }).primaryKey(),
  userId: varchar({ length: 255 }).references(() => users.id),
  accountId: varchar({ length: 255 }),
  providerId: varchar({ length: 255 }),
  accessToken: varchar({ length: 255 }),
  refreshToken: varchar({ length: 255 }),
  accessTokenExpiresAt: timestamp(),
  refreshTokenExpiresAt: timestamp(),
  scope: varchar({ length: 255 }),
  idToken: varchar({ length: 255 }),
  password: varchar({ length: 255 }),
  createdAt: timestamp(),
  updatedAt: timestamp(),
});
