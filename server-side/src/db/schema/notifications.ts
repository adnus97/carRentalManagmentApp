// src/db/schema/notifications.ts (replace existing)
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

  // User and organization
  userId: varchar('user_id', { length: 255 })
    .references(() => users.id, {
      onDelete: 'cascade',
    })
    .notNull(),
  orgId: varchar('org_id', { length: 255 })
    .references(() => organization.id, { onDelete: 'cascade' })
    .$type<string | null>(),

  // Enhanced categorization
  category: text('category').notNull(),
  type: text('type').notNull(),
  priority: text('priority').default('MEDIUM').notNull(),

  // Content
  title: text('title').notNull(),
  message: text('message').notNull(),
  level: text('level').default('info').notNull(),

  // Status tracking
  read: boolean('read').default(false).notNull(),
  dismissed: boolean('dismissed').default(false).notNull(),
  emailSent: boolean('email_sent').default(false).notNull(),

  // Timestamps
  createdAt: timestamp('created_at', {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
  readAt: timestamp('read_at', {
    withTimezone: true,
  }),
  expiresAt: timestamp('expires_at', {
    withTimezone: true,
  }).$type<Date | null>(),

  // Actions
  actionUrl: text('action_url'),
  actionLabel: text('action_label'),

  // Metadata
  metadata: jsonb('metadata').$type<Record<string, any> | null>(),
});

// User preferences table
export const userNotificationPreferences = pgTable(
  'user_notification_preferences',
  {
    id: varchar('id', { length: 255 }).primaryKey(),
    userId: varchar('user_id', { length: 255 })
      .references(() => users.id, {
        onDelete: 'cascade',
      })
      .notNull()
      .unique(),

    emailEnabled: boolean('email_enabled').default(true).notNull(),
    pushEnabled: boolean('push_enabled').default(true).notNull(),

    // Category preferences stored as JSON
    categoryPreferences: jsonb('category_preferences')
      .$type<Record<string, boolean>>()
      .default({}),

    // Quiet hours
    quietHoursStart: text('quiet_hours_start'),
    quietHoursEnd: text('quiet_hours_end'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
);
