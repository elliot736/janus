import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { twoFactor } from 'better-auth/plugins';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as authSchema from '../db/schema/auth';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL environment variable is required');
const client = postgres(databaseUrl);
const db = drizzle(client);

const betterAuthSecret = process.env.BETTER_AUTH_SECRET;
if (!betterAuthSecret) throw new Error('BETTER_AUTH_SECRET environment variable is required');

export const auth = betterAuth({
  appName: 'Janus',
  secret: betterAuthSecret,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: authSchema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },
  trustedOrigins: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  plugins: [twoFactor()],
});

export type Auth = typeof auth;
