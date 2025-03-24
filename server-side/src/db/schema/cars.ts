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
import { organization } from './organization';

export const cars = pgTable('cars', {
  id: varchar({ length: 255 }).primaryKey(),
  make: text('make').notNull(),
  model: text('model').notNull(),
  year: integer('year').notNull(),
  purchasePrice: integer('purchase_price').notNull(),
  pricePerDay: integer('price_per_day').notNull(),
  isAvailable: boolean('is_available').default(true),
  orgId: varchar('org_id', { length: 255 })
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }), // Deleting org deletes cars
  createdAt: timestamp(),
  updatedAt: timestamp(),
});
