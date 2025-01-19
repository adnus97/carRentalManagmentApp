import { string } from 'better-auth/*';
import {
  integer,
  pgTable,
  text,
  varchar,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core';

export const users = pgTable('user', {
  id: varchar({ length: 255 }).primaryKey(),
  name: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  emailVerified: boolean(),
  image: text(),
  createdAt: timestamp(),
  updatedAt: timestamp(),
});
