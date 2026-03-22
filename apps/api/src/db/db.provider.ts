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
      max: parseInt(configService.get<string>('DB_POOL_MAX') ?? '20', 10),
      idle_timeout: parseInt(configService.get<string>('DB_POOL_IDLE_TIMEOUT') ?? '20', 10),
      connect_timeout: parseInt(configService.get<string>('DB_POOL_CONNECT_TIMEOUT') ?? '10', 10),
      max_lifetime: parseInt(configService.get<string>('DB_POOL_MAX_LIFETIME') ?? '1800', 10),
      prepare: true,
    });
    return drizzle(client, { schema });
  },
};
