// src/db/schema/notifications.ts
import {
  pgTable,
  text,
  boolean,
  timestamp,
  jsonb,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { organization } from './organization';

export const notifications = pgTable('notifications', {
  id: varchar('id', { length: 255 }).primaryKey(),

  userId: varchar('user_id', { length: 255 }).references(() => users.id, {
    onDelete: 'cascade',
  }),

  orgId: varchar('org_id', { length: 255 })
    .references(() => organization.id, { onDelete: 'cascade' })
    .default(null) // ✅ allow null
    .$type<string | null>(),

  type: text('type').notNull(),
  message: text('message').notNull(),
  level: text('level').default('info').notNull(),

  read: boolean('read').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),

  expiresAt: timestamp('expires_at', { withTimezone: true })
    .default(null)
    .$type<Date | null>(),
  metadata: jsonb('metadata').$type<Record<string, any> | null>(),
});
