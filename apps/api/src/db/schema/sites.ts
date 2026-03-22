import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export interface SiteSettings {
  powDifficulty?: number;
  mode?: 'managed' | 'invisible' | 'interactive';
  riskThresholds?: {
    allow: number;
    challenge: number;
    block: number;
  };
  gdprMode?: boolean;
  blockedCountries?: string[];
}

export const sites = pgTable('sites', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  domain: text('domain').array().notNull(),
  siteKey: varchar('site_key', { length: 255 }).notNull().unique(),
  secretKey: varchar('secret_key', { length: 255 }).notNull(),
  ownerId: text('owner_id').notNull(),
  settings: jsonb('settings').$type<SiteSettings>().default({}),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const sitesRelations = relations(sites, ({ many }) => ({
  challenges: many(challenges),
  verifications: many(verifications),
}));

// Forward references — imported by relations, defined in their own files
import { challenges } from './challenges';
import { verifications } from './verifications';
