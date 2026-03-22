import {
  pgTable,
  uuid,
  varchar,
  integer,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { sites } from './sites';

export const challenges = pgTable('challenges', {
  id: uuid('id').primaryKey().defaultRandom(),
  siteId: uuid('site_id')
    .notNull()
    .references(() => sites.id, { onDelete: 'cascade' }),
  challenge: varchar('challenge', { length: 255 }).notNull(),
  difficulty: integer('difficulty').notNull().default(4),
  ipAddress: varchar('ip_address', { length: 45 }).notNull(),
  ja3Hash: varchar('ja3_hash', { length: 255 }),
  status: text('status').notNull().default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
});

export const challengesRelations = relations(challenges, ({ one }) => ({
  site: one(sites, {
    fields: [challenges.siteId],
    references: [sites.id],
  }),
}));
