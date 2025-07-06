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
import { customers } from './customers';

export const rents = pgTable('rents', {
  id: varchar('id', { length: 255 }).primaryKey().notNull(),
  carId: varchar('car_id', { length: 255 })
    .notNull()
    .references(() => cars.id, { onDelete: 'cascade' }),
  orgId: varchar('org_id', { length: 255 })
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  customerId: varchar('customer_id', { length: 255 }) // Foreign key to customer
    .notNull()
    .references(() => customers.id, { onDelete: 'cascade' }),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  returnedAt: timestamp('returned_at'),
  totalPrice: integer('total_price').notNull(),
  lateFee: integer('late_fee').default(0),
  status: text('status').default('active'), // "active", "completed", "canceled"
  damageReport: text('damage_report').default(''),
});
