import {
  integer,
  pgTable,
  text,
  varchar,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core';
import { organization } from './organization';
import { cars } from './cars';

export const maintenanceLogs = pgTable('maintenance_logs', {
  id: varchar('id', { length: 255 }).primaryKey().notNull(),
  carId: varchar('car_id', { length: 255 })
    .notNull()
    .references(() => cars.id, { onDelete: 'cascade' }),
  orgId: varchar('org_id', { length: 255 })
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // e.g., 'oil_change', 'tire_rotation', etc.
  description: text('description').notNull(),
  mileage: integer('mileage').notNull(), // Mileage at the time of maintenance
  cost: integer('cost').notNull(), // Cost of the maintenance
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
