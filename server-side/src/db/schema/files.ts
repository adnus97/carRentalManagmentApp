import {
  boolean,
  doublePrecision,
  pgTable,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { organization } from './organization';

export const files = pgTable('files', {
  id: varchar('id').primaryKey(),
  name: varchar('name').notNull(),
  path: varchar('path').notNull(),
  type: varchar('type').notNull(),
  size: doublePrecision('size'),
  url: varchar('url'), // IF public, this will be the url to the file in the storage provider otherwise we generate a signed url for the file
  isPublic: boolean('is_public').default(false),
  createdBy: varchar('created_by').references(() => users.id),
  orgId: varchar('org_id').references(() => organization.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdateFn(() => new Date()),
});
export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;
