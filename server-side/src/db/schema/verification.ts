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

export const verification = pgTable('verification', {
  id: varchar({ length: 255 }).primaryKey(),
  identifier: varchar({ length: 255 }),
  value: varchar({ length: 255 }),
  expiresAt: timestamp(),
  createdAt: timestamp(),
  updatedAt: timestamp(),
});
