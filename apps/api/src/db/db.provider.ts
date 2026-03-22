import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export const DATABASE_TOKEN = Symbol('DATABASE_TOKEN');

export type Database = ReturnType<typeof drizzle<typeof schema>>;

export const dbProvider: Provider = {
  provide: DATABASE_TOKEN,
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const databaseUrl = configService.getOrThrow<string>('DATABASE_URL');
    const client = postgres(databaseUrl, {
      max: 20,
      idle_timeout: 20,
      connect_timeout: 10,
    });
    return drizzle(client, { schema });
  },
};
