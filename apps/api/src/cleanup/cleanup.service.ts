import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { and, eq, lt, sql } from 'drizzle-orm';
import { DATABASE_TOKEN, type Database } from '../db/db.provider';
import { challenges } from '../db/schema';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(@Inject(DATABASE_TOKEN) private readonly db: Database) {}

  @Cron('0 */5 * * * *')
  async cleanupExpiredChallenges() {
    const result = await this.db
      .delete(challenges)
      .where(
        and(
          eq(challenges.status, 'pending'),
          lt(challenges.expiresAt, sql`NOW()`),
        ),
      )
      .returning({ id: challenges.id });

    const count = result.length;
    if (count > 0) {
      this.logger.log(`Cleaned up ${count} expired pending challenges`);
    }
  }
}
