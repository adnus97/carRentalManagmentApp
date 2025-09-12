// src/db/schema/files.ts
import {
  boolean,
  doublePrecision,
  pgTable,
  timestamp,
  varchar,
  json,
  text,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { organization } from './organization';

export const files = pgTable('files', {
  id: varchar('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  path: varchar('path', { length: 500 }).notNull(),
  type: varchar('type', { length: 100 }).notNull(),
  size: doublePrecision('size').notNull(),
  url: text('url'), // Public URL if file is public
  isPublic: boolean('is_public').default(false),
  checksum: varchar('checksum', { length: 64 }).notNull(), // SHA-256 hash
  createdBy: varchar('created_by', { length: 255 })
    .references(() => users.id)
    .notNull(),
  orgId: varchar('org_id', { length: 255 }).references(() => organization.id),
  metadata: json('metadata'), // Additional file metadata
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdateFn(() => new Date()),
});

export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;
