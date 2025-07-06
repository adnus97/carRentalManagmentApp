import { integer, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { pgTable } from 'drizzle-orm/pg-core';
import { cars } from './cars';
import { organization } from './organization';

export const carMonthlyTargets = pgTable('car_monthly_targets', {
  id: varchar('id', { length: 255 }).primaryKey().notNull(),
  carId: varchar('car_id', { length: 255 })
    .notNull()
    .references(() => cars.id, { onDelete: 'cascade' }),
  orgId: varchar('org_id', { length: 255 })
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  month: text('month').notNull(), // e.g., '2025-01'
  revenueGoal: integer('revenue_goal').notNull(), // Monthly revenue target
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
