import {
  pgTable,
  uuid,
  varchar,
  integer,
  text,
  timestamp,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { sites } from './sites';
import { challenges } from './challenges';

export const verifications = pgTable('verifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  siteId: uuid('site_id')
    .notNull()
    .references(() => sites.id, { onDelete: 'cascade' }),
  challengeId: uuid('challenge_id')
    .notNull()
    .references(() => challenges.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 500 }).notNull(),
  riskScore: integer('risk_score').notNull(),
  action: text('action').notNull(),
  fingerprintHash: varchar('fingerprint_hash', { length: 255 }),
  behaviorScore: integer('behavior_score'),
  anomalies: jsonb('anomalies').$type<string[]>().default([]),
  powTimeMs: integer('pow_time_ms'),
  countryCode: varchar('country_code', { length: 2 }),
  ipAddress: varchar('ip_address', { length: 45 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const verificationsRelations = relations(verifications, ({ one }) => ({
  site: one(sites, {
    fields: [verifications.siteId],
    references: [sites.id],
  }),
  challenge: one(challenges, {
    fields: [verifications.challengeId],
    references: [challenges.id],
  }),
}));
