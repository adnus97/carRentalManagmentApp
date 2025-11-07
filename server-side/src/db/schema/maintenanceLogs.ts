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

// schema/maintenanceLogs.ts
export const maintenanceLogs = pgTable('maintenance_logs', {
  id: varchar('id', { length: 255 }).primaryKey().notNull(),
  carId: varchar('car_id', { length: 255 })
    .notNull()
    .references(() => cars.id, { onDelete: 'cascade' }),
  orgId: varchar('org_id', { length: 255 })
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  type: text('type').$type<
    'general' | 'oil_change' | 'tire_rotation' | 'inspection' | 'other'
  >(),
  mileage: integer('mileage'), // optional
  cost: integer('cost'), // optional,
  description: text('description'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
