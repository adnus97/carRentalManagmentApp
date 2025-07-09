import {
  pgTable,
  varchar,
  integer,
  timestamp,
  text,
} from 'drizzle-orm/pg-core';
import { cars } from './cars';
import { organization } from './organization';

export const carOilChanges = pgTable('car_oil_changes', {
  id: varchar('id', { length: 255 }).primaryKey(),

  carId: varchar('car_id', { length: 255 })
    .notNull()
    .references(() => cars.id, { onDelete: 'cascade' }),

  orgId: varchar('org_id', { length: 255 })
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),

  changedAt: timestamp('changed_at').defaultNow(), // when the oil was changed

  mileageAtChange: integer('mileage_at_change').notNull(), // car KM at oil change

  nextDueAtKm: integer('next_due_at_km'), // optional – helps with reminders

  cost: integer('cost'), // optional – oil change cost in MAD
});
