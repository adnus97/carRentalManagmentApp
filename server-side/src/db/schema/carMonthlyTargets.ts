import { integer, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { pgTable } from 'drizzle-orm/pg-core';
import { cars } from './cars';
import { organization } from './organization';
import { start } from 'repl';

export const carMonthlyTargets = pgTable('car_monthly_targets', {
  id: varchar('id', { length: 255 }).primaryKey().notNull(),
  carId: varchar('car_id', { length: 255 })
    .notNull()
    .references(() => cars.id, { onDelete: 'cascade' }),
  orgId: varchar('org_id', { length: 255 })
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  startDate: timestamp('start_date').notNull(), // Start date of the month
  endDate: timestamp('end_date').notNull(), // End date of the month
  targetRents: integer('target_rents').notNull(), // Monthly rent target
  revenueGoal: integer('revenue_goal').notNull(), // Monthly revenue target
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
