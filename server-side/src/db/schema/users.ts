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
  role: varchar({ length: 50 }).notNull().default('user'),
  subscriptionStatus: varchar({ length: 50 }).notNull().default('inactive'),
  subscriptionStartDate: timestamp(),
  subscriptionEndDate: timestamp(),
  subscriptionType: varchar({ length: 50 }).default('yearly'),
  locale: varchar({ length: 10 }),
  createdAt: timestamp(),
  updatedAt: timestamp(),
});
