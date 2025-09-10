import {
  pgTable,
  integer,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { sql } from 'drizzle-orm';
import { files } from './files';

export const organization = pgTable('organization', {
  id: varchar({ length: 255 }).primaryKey(),
  name: text().notNull(),
  userId: varchar('user_id', { length: 255 })
    .notNull()
    .unique() // Each user can only have one organization
    .references(() => users.id, { onDelete: 'cascade' }),
  email: text(),
  website: text(),
  phone: text(),
  address: text(),
  imageFileId: varchar('image_file_id').references(() => files.id),
  fleetListFileId: varchar('fleet_list_file_id').references(() => files.id),
  modelGFileId: varchar('model_g_file_id').references(() => files.id),
  rcFileId: varchar('rc_file_id').references(() => files.id),
  statusFileId: varchar('status_file_id').references(() => files.id),
  identifiantFiscaleFileId: varchar('identifiant_fiscale_file_id').references(
    () => files.id,
  ),
  decisionFileId: varchar('decision_file_id').references(() => files.id),
  ceoIdCardFileId: varchar('ceo_id_card_file_id').references(() => files.id),
  bilanFileId: varchar('bilan_file_id').references(() => files.id),

  createdAt: timestamp({ withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp({ withTimezone: true }).default(sql`now()`),
});
