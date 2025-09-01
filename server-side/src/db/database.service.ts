import 'dotenv/config';
import { Injectable, type OnModuleInit } from '@nestjs/common';
import { type NodePgDatabase, drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

import pg from 'pg';

export type SchemaType = typeof schema;
const { Pool, types } = pg;
@Injectable()
export class DatabaseService implements OnModuleInit {
  db!: NodePgDatabase<SchemaType>;

  onModuleInit() {
    const pool = new Pool({
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      connectionString: process.env['DATABASE_URL']!,
    });
    this.db = drizzle(pool, { schema });
  }
}
