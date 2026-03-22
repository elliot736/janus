import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { and, eq, lt, sql } from 'drizzle-orm';
import { DATABASE_TOKEN, type Database } from '../db/db.provider';
import { challenges, verifications } from '../db/schema';

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

  @Cron('0 0 2 * * *') // Daily at 2am
  async cleanOldData() {
    const retentionDays = parseInt(process.env.DATA_RETENTION_DAYS || '30', 10);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    // Delete old verifications
    const deletedVerifications = await this.db
      .delete(verifications)
      .where(lt(verifications.createdAt, cutoff))
      .returning({ id: verifications.id });

    // Delete old solved/expired challenges
    const deletedChallenges = await this.db
      .delete(challenges)
      .where(and(
        lt(challenges.createdAt, cutoff),
        sql`${challenges.status} != 'pending'`
      ))
      .returning({ id: challenges.id });

    this.logger.log(`Data retention cleanup: removed ${deletedVerifications.length} verifications and ${deletedChallenges.length} challenges older than ${retentionDays} days`);
  }
}
