import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { sites } from './sites';

export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  siteId: uuid('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(),
  keyHash: varchar('key_hash', { length: 255 }).notNull(),
  label: varchar('label', { length: 255 }).notNull(),
  lastUsedAt: timestamp('last_used_at'),
  createdAt: timestamp('created_at').defaultNow(),
});
