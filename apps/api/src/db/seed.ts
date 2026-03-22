import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sites } from './schema';
import { createHash, randomBytes } from 'crypto';

async function seed() {
  const client = postgres(process.env.DATABASE_URL!);
  const db = drizzle(client);

  console.log('Seeding database...');

  const siteKey = 'jns_site_live_' + randomBytes(24).toString('base64url');
  const secretRaw = 'jns_secret_live_' + randomBytes(32).toString('base64url');
  const secretHash = createHash('sha256').update(secretRaw).digest('hex');

  await db.insert(sites).values({
    name: 'Demo Site',
    domain: ['localhost', 'example.com'],
    siteKey,
    secretKey: secretHash,
    ownerId: 'seed-user',
    settings: { powDifficulty: 4, mode: 'invisible' },
    isActive: true,
  });

  console.log('Seed complete.');
  console.log('Site Key:', siteKey);
  console.log('Secret Key:', secretRaw);

  await client.end();
}

seed().catch(console.error);
