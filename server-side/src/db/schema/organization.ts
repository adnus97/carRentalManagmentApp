import {
  pgTable,
  integer,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { sql } from 'drizzle-orm';

export const organization = pgTable('organization', {
  id: varchar({ length: 255 }).primaryKey(),
  name: text().notNull(),
  userId: varchar('user_id', { length: 255 })
    .notNull()
    .unique() // Each user can only have one organization
    .references(() => users.id, { onDelete: 'cascade' }),
  image: text(),
  fleetList: text('fleet_list'), // PDF
  modelG: text('model_g'), // PDF
  rc: text('rc'), // PDF
  status: text('status'), // PDF
  identifiantFiscale: text('identifiant_fiscale'), // PDF
  decision: text('decision'), // PDF
  ceoIdCard: text('ceo_id_card'), // IMG
  bilan: text('bilan'), // PDF
  createdAt: timestamp({ withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp({ withTimezone: true }).default(sql`now()`),
});
