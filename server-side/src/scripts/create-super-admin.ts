// src/scripts/create-super-admin.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { users } from '../db/schema/users';
import { eq } from 'drizzle-orm';
import * as readline from 'readline';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function createSuperAdmin() {
  // Create direct database connection
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const db = drizzle(pool);

  rl.question('Enter super admin email: ', async (email) => {
    try {
      // Check if user exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, email));

      if (!existingUser) {
        console.log(
          '❌ User not found. Please register first via the web interface.',
        );
        await pool.end();
        rl.close();
        process.exit(1);
      }

      if (existingUser.role === 'super_admin') {
        console.log('✅ User is already a super admin.');
        await pool.end();
        rl.close();
        process.exit(0);
      }

      // Promote to super admin
      await db
        .update(users)
        .set({
          role: 'super_admin',
          subscriptionStatus: 'active',
          subscriptionStartDate: new Date(),
          subscriptionEndDate: new Date('2099-12-31'),
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingUser.id));

      console.log('✅ User promoted to super admin successfully!');
      console.log(`   Email: ${email}`);
      console.log(`   Name: ${existingUser.name}`);

      await pool.end();
      rl.close();
      process.exit(0);
    } catch (error) {
      console.error('❌ Error:', error);
      await pool.end();
      rl.close();
      process.exit(1);
    }
  });
}

createSuperAdmin().catch(async (error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
