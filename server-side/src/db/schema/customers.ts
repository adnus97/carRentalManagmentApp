import {
  integer,
  pgTable,
  text,
  varchar,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core';
import { organization } from './organization';

export const customers = pgTable('customers', {
  id: varchar('id', { length: 255 }).primaryKey().notNull(),
  orgId: varchar('org_id', { length: 255 }) // Ensures customers belong to an org
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  firstName: text('name').notNull(),
  lastName: text('last name').notNull(),
  email: varchar('email', { length: 255 }).unique(),
  phone: varchar('phone', { length: 20 }).notNull(),
  documentId: varchar('document_id', { length: 255 }), // e.g., passport, driver’s license
  createdAt: timestamp(),
  updatedAt: timestamp(),
});
