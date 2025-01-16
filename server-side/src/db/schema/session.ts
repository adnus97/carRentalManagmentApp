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

export const session = pgTable('session', {
  id: varchar({ length: 255 }).primaryKey(),
  userId: varchar({ length: 255 }).references(() => users.id),
  token: varchar({ length: 255 }).notNull(),
  expiresAt: timestamp(),
  ipAddress: varchar({ length: 255 }),
  createdAt: timestamp(),
  updatedAt: timestamp(),
});
