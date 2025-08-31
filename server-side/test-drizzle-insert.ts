// test-drizzle-insert.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { notifications } from './src/db/schema/notifications';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

async function main() {
  const testNotif = {
    id: 'testnotif002',
    userId: 'testuser001',
    orgId: null,
    type: 'RENT_STARTED',
    message: 'Rental TEST2 has started for car TESTCAR2',
    level: 'info',
    read: false,
    // ❌ don’t pass createdAt → let Postgres use default NOW()
    // ❌ don’t pass expiresAt if null
    metadata: { rentId: 'rent002', carId: 'car002' }, // ✅ object
  };

  const query = db.insert(notifications).values(testNotif).toSQL();
  console.log('[DEBUG] SQL:', query.sql);
  console.log('[DEBUG] Params:', query.params);

  try {
    await db.insert(notifications).values(testNotif);
    console.log('✅ Insert success');
  } catch (err: any) {
    console.error('❌ Insert failed:', err.message);
  }

  const rows = await db.select().from(notifications).limit(5);
  console.log('Rows:', rows);

  await pool.end();
}

main();
