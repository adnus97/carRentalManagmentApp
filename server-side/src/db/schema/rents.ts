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
  id: varchar('id', { length: 255 }).primaryKey().notNull(), // ✅ Normal UUID
  rentContractId: varchar('rent_contract_id', { length: 50 })
    .notNull()
    .unique(), // ✅ New field for 001/2025 format
  rentNumber: integer('rent_number').notNull(), // The sequential number part
  year: integer('year').notNull(), // The year part
  carId: varchar('car_id', { length: 255 })
    .notNull()
    .references(() => cars.id, { onDelete: 'cascade' }),
  orgId: varchar('org_id', { length: 255 })
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  customerId: varchar('customer_id', { length: 255 })
    .notNull()
    .references(() => customers.id, { onDelete: 'cascade' }),
  startDate: timestamp('start_date').notNull(),
  expectedEndDate: timestamp('expected_end_date'),
  isOpenContract: boolean('is_open_contract').default(false).notNull(),
  returnedAt: timestamp('returned_at'),
  totalPrice: integer('total_price'),
  deposit: integer('deposit').default(0).notNull(),
  guarantee: integer('guarantee').default(0).notNull(),
  lateFee: integer('late_fee').default(0),
  totalPaid: integer('total_paid').default(0).notNull(),
  isFullyPaid: boolean('is_fully_paid').default(false).notNull(),
  status: text('status', {
    enum: ['reserved', 'active', 'completed', 'canceled'],
  }).default('reserved'),
  damageReport: text('damage_report').default(''),
  isDeleted: boolean('is_deleted').default(false).notNull(),
});
export const rentCounters = pgTable('rent_counters', {
  id: varchar('id', { length: 255 }).primaryKey(),
  year: integer('year').notNull(),
  orgId: varchar('org_id', { length: 255 }).notNull(),
  counter: integer('counter').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
