import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { createHash, randomBytes } from 'crypto';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { sites, challenges, verifications, apiKeys } from './schema';

function generateSiteKey(): string {
  return 'jns_site_live_' + randomBytes(24).toString('base64url');
}

function generateSecretKey(): { raw: string; hash: string } {
  const raw = 'jns_secret_live_' + randomBytes(32).toString('base64url');
  const hash = createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
}

function generateApiKeyPair(): { raw: string; hash: string } {
  const raw = 'jns_api_' + randomBytes(32).toString('base64url');
  const hash = createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
}

function randomIp(): string {
  return `${Math.floor(Math.random() * 223) + 1}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
}

function randomRiskScore(): number {
  // Weight toward lower scores (most traffic is human)
  const r = Math.random();
  if (r < 0.6) return Math.floor(Math.random() * 25);
  if (r < 0.85) return 25 + Math.floor(Math.random() * 35);
  return 60 + Math.floor(Math.random() * 40);
}

function actionFromScore(score: number): string {
  if (score < 30) return 'allow';
  if (score < 70) return 'challenge';
  return 'block';
}

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const client = postgres(databaseUrl);
  const db = drizzle(client);

  console.log('Seeding Janus database...\n');

  // ── 1. Create sites ──────────────────────────────────────────────────

  const siteData = [
    {
      name: 'Production Website',
      domain: ['example.com', 'www.example.com'],
      settings: { powDifficulty: 4, mode: 'invisible' as const, riskThresholds: { allow: 30, challenge: 60, block: 80 } },
    },
    {
      name: 'Staging Environment',
      domain: ['staging.example.com'],
      settings: { powDifficulty: 3, mode: 'invisible' as const, riskThresholds: { allow: 40, challenge: 70, block: 85 } },
    },
    {
      name: 'Marketing Landing Page',
      domain: ['promo.example.com', 'landing.example.com'],
      settings: { powDifficulty: 5, mode: 'managed' as const, riskThresholds: { allow: 25, challenge: 55, block: 75 } },
    },
  ];

  const createdSites: { id: string; name: string; siteKey: string; secretRaw: string }[] = [];

  for (const data of siteData) {
    const siteKey = generateSiteKey();
    const { raw: secretRaw, hash: secretHash } = generateSecretKey();

    const [site] = await db.insert(sites).values({
      name: data.name,
      domain: data.domain,
      siteKey,
      secretKey: secretHash,
      ownerId: 'seed-user',
      settings: data.settings,
      isActive: true,
    }).returning();

    if (!site) throw new Error(`Failed to create site: ${data.name}`);
    createdSites.push({ id: site.id, name: data.name, siteKey, secretRaw });
  }

  console.log('Created sites:\n');
  console.log('+--------------------------+----------------------------------------------+');
  console.log('| Name                     | Domains                                      |');
  console.log('+--------------------------+----------------------------------------------+');
  for (const s of createdSites) {
    const data = siteData.find((d) => d.name === s.name)!;
    console.log(`| ${s.name.padEnd(24)} | ${data.domain.join(', ').padEnd(44)} |`);
  }
  console.log('+--------------------------+----------------------------------------------+\n');

  // ── 2. Create API keys per site ──────────────────────────────────────

  const createdKeys: { siteName: string; label: string; raw: string }[] = [];

  for (const site of createdSites) {
    const labels = site.name === 'Production Website'
      ? ['Production Backend', 'CI Pipeline']
      : ['Backend'];

    for (const label of labels) {
      const { raw, hash } = generateApiKeyPair();
      await db.insert(apiKeys).values({
        siteId: site.id,
        userId: 'seed-user',
        keyHash: hash,
        label,
      });
      createdKeys.push({ siteName: site.name, label, raw });
    }
  }

  console.log(`Created ${createdKeys.length} API keys across ${createdSites.length} sites.\n`);

  // ── 3. Create historical challenges and verifications ────────────────

  console.log('Generating historical verification data...');

  const prodSite = createdSites[0]!;
  let totalVerifications = 0;
  let allowCount = 0;
  let challengeCount = 0;
  let blockCount = 0;

  // Generate 7 days of verification data for the production site
  for (let hoursBack = 0; hoursBack < 168; hoursBack++) {
    // Variable traffic: more during business hours
    const hour = (24 - (hoursBack % 24)) % 24;
    const isBusinessHours = hour >= 8 && hour <= 20;
    const requestCount = isBusinessHours
      ? 3 + Math.floor(Math.random() * 5)
      : 1 + Math.floor(Math.random() * 2);

    for (let i = 0; i < requestCount; i++) {
      const ip = randomIp();
      const challengeHmac = createHash('sha256')
        .update(`${prodSite.id}:${ip}:${Date.now()}:${randomBytes(16).toString('hex')}`)
        .digest('hex');

      const createdAt = hoursAgo(hoursBack);
      const expiresAt = new Date(createdAt.getTime() + 5 * 60 * 1000);

      const [challenge] = await db.insert(challenges).values({
        siteId: prodSite.id,
        challenge: challengeHmac,
        difficulty: 4,
        ipAddress: ip,
        status: 'solved',
        expiresAt,
        createdAt,
      }).returning();

      if (!challenge) continue;

      const riskScore = randomRiskScore();
      const action = actionFromScore(riskScore);
      const powTimeMs = 800 + Math.floor(Math.random() * 4000);
      const fingerprintHash = createHash('sha256').update(`fp-${ip}-${i}`).digest('hex');

      const anomalies: string[] = [];
      if (riskScore > 60) anomalies.push('fingerprint_inconsistent');
      if (riskScore > 75) anomalies.push('pow_solve_too_fast');
      if (riskScore > 85) anomalies.push('no_mouse_movement');

      await db.insert(verifications).values({
        siteId: prodSite.id,
        challengeId: challenge.id,
        token: `seed-token-${challenge.id}`,
        riskScore,
        action,
        fingerprintHash,
        behaviorScore: Math.max(0, 100 - riskScore + Math.floor(Math.random() * 20) - 10),
        anomalies,
        powTimeMs,
        ipAddress: ip,
        createdAt,
      });

      totalVerifications++;
      if (action === 'allow') allowCount++;
      else if (action === 'challenge') challengeCount++;
      else blockCount++;
    }
  }

  console.log(`  Generated ${totalVerifications} verifications over 7 days`);
  console.log(`  Allow: ${allowCount} | Challenge: ${challengeCount} | Block: ${blockCount}\n`);

  // ── 4. Print site credentials to a local file (not stdout) ──────────

  const credentialsPath = join(__dirname, '..', '..', 'seed-credentials.json');
  const credentials = {
    sites: createdSites.map((s) => ({
      name: s.name,
      siteKey: s.siteKey,
      secretKey: s.secretRaw,
    })),
    apiKeys: createdKeys.map((k) => ({
      site: k.siteName,
      label: k.label,
      key: k.raw,
    })),
  };
  writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2));
  console.log(`\nSite credentials written to: ${credentialsPath}`);
  console.log('(Delete this file after copying your keys)\n');

  console.log('Instructions:');
  console.log('  1. Log in to the dashboard at http://localhost:3000');
  console.log('  2. Sites are pre-created with realistic verification history');
  console.log('  3. The Production Website has 7 days of traffic data for analytics');
  console.log('  4. Check seed-credentials.json for site keys and secret keys');
  console.log('  5. Use the secret keys for server-side token validation via POST /api/v1/siteverify');
  console.log('  6. Use the API keys for programmatic access');
  console.log('  7. The Marketing Landing Page uses managed mode (checkbox widget)\n');

  await client.end();
  console.log('Seed complete.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
