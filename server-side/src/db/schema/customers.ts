// src/db/schema/customers.ts
import {
  integer,
  pgTable,
  text,
  varchar,
  boolean,
  timestamp,
  real,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { organization } from './organization';
import { files } from './files'; // Import files table for foreign key reference

export const customers = pgTable(
  'customers',
  {
    id: varchar('id', { length: 255 }).primaryKey().notNull(),
    orgId: varchar('org_id', { length: 255 })
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 20 }).notNull(),
    documentId: varchar('document_id', { length: 255 }).notNull(),
    documentType: text('document_type', {
      enum: ['passport', 'driver_license', 'id_card'],
    }),
    rating: real('rating').default(0),
    ratingCount: integer('rating_count').default(0),
    createdAt: timestamp().defaultNow(),
    updatedAt: timestamp().defaultNow(),
    isDeleted: boolean('is_deleted').default(false),
    isBlacklisted: boolean('is_blacklisted').default(false),
    blacklistReason: text('blacklist_reason'),
    // New file ID columns
    idCardId: varchar('id_card_id', { length: 255 }).references(
      () => files.id,
      { onDelete: 'set null' },
    ),
    driversLicenseId: varchar('drivers_license_id', { length: 255 }).references(
      () => files.id,
      { onDelete: 'set null' },
    ),
  },
  (table) => {
    return {
      //  Composite unique index: orgId + documentId
      orgDocumentUnique: uniqueIndex('org_document_unique').on(
        table.orgId,
        table.documentId,
      ),
    };
  },
);

//  Blacklist table (unchanged)
export const customerBlacklist = pgTable('customer_blacklist', {
  id: varchar('id', { length: 255 }).primaryKey().notNull(),
  customerId: varchar('customer_id', { length: 255 })
    .notNull()
    .references(() => customers.id, { onDelete: 'cascade' }),
  reason: text('reason').notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp().defaultNow(),
});

//  Ratings table (unchanged)
export const customerRatings = pgTable('customer_ratings', {
  id: varchar('id', { length: 255 }).primaryKey().notNull(),
  customerId: varchar('customer_id', { length: 255 })
    .notNull()
    .references(() => customers.id, { onDelete: 'cascade' }),
  rating: integer('rating').notNull(), // 1–5
  comment: text('comment'),
  createdAt: timestamp().defaultNow(),
});
