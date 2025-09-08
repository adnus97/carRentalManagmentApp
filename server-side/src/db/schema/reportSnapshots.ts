import {
  pgTable,
  varchar,
  integer,
  timestamp,
  text,
} from 'drizzle-orm/pg-core';
import { organization } from './organization';
import { cars } from './cars';

export const reportSnapshots = pgTable('report_snapshots', {
  id: varchar('id', { length: 255 }).primaryKey(),
  orgId: varchar('org_id', { length: 255 })
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  carId: varchar('car_id', { length: 255 }).references(() => cars.id, {
    onDelete: 'cascade',
  }),
  date: timestamp('date').notNull(), // bucket date
  interval: text('interval', { enum: ['day', 'week', 'month'] }).notNull(),
  revenueBilled: integer('revenue_billed').notNull(),
  revenueCollected: integer('revenue_collected').notNull(),
  rents: integer('rents').notNull(),
  utilization: integer('utilization').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
