import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { eq, and, gte, sql, count, desc, or } from 'drizzle-orm';
import { DATABASE_TOKEN, type Database } from '../db/db.provider';
import { sites, verifications, challenges } from '../db/schema';

@Injectable()
export class AnalyticsService {
  constructor(@Inject(DATABASE_TOKEN) private readonly db: Database) {}

  private async validateSiteOwnership(siteId: string, userId: string) {
    const [site] = await this.db
      .select({ id: sites.id, ownerId: sites.ownerId })
      .from(sites)
      .where(eq(sites.id, siteId));

    if (!site) {
      throw new NotFoundException('Site not found');
    }
    if (site.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return site;
  }

  private daysAgo(days: number): Date {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d;
  }

  async getSummary(siteId: string, userId: string, days: number) {
    await this.validateSiteOwnership(siteId, userId);
    const since = this.daysAgo(days);

    const [totals] = await this.db
      .select({
        totalVerifications: count(verifications.id),
        avgRiskScore: sql<number>`COALESCE(AVG(${verifications.riskScore}), 0)::int`,
        allowCount: sql<number>`COUNT(*) FILTER (WHERE ${verifications.action} = 'allow')`,
        challengeCount: sql<number>`COUNT(*) FILTER (WHERE ${verifications.action} = 'challenge')`,
        blockCount: sql<number>`COUNT(*) FILTER (WHERE ${verifications.action} = 'block')`,
      })
      .from(verifications)
      .where(
        and(
          eq(verifications.siteId, siteId),
          gte(verifications.createdAt, since),
        ),
      );

    const [challengeTotals] = await this.db
      .select({
        totalChallenges: count(challenges.id),
        pendingCount: sql<number>`COUNT(*) FILTER (WHERE ${challenges.status} = 'pending')`,
        solvedCount: sql<number>`COUNT(*) FILTER (WHERE ${challenges.status} = 'solved')`,
        expiredCount: sql<number>`COUNT(*) FILTER (WHERE ${challenges.status} = 'expired')`,
      })
      .from(challenges)
      .where(
        and(
          eq(challenges.siteId, siteId),
          gte(challenges.createdAt, since),
        ),
      );

    return {
      period: { days, since: since.toISOString() },
      verifications: totals,
      challenges: challengeTotals,
    };
  }

  async getRequestsPerDay(siteId: string, userId: string, days: number) {
    await this.validateSiteOwnership(siteId, userId);
    const since = this.daysAgo(days);

    const rows = await this.db
      .select({
        date: sql<string>`DATE(${verifications.createdAt})::text`,
        count: count(verifications.id),
      })
      .from(verifications)
      .where(
        and(
          eq(verifications.siteId, siteId),
          gte(verifications.createdAt, since),
        ),
      )
      .groupBy(sql`DATE(${verifications.createdAt})`)
      .orderBy(sql`DATE(${verifications.createdAt})`);

    return rows;
  }

  async getPassFailRatio(siteId: string, userId: string, days: number) {
    await this.validateSiteOwnership(siteId, userId);
    const since = this.daysAgo(days);

    const rows = await this.db
      .select({
        action: verifications.action,
        count: count(verifications.id),
      })
      .from(verifications)
      .where(
        and(
          eq(verifications.siteId, siteId),
          gte(verifications.createdAt, since),
        ),
      )
      .groupBy(verifications.action);

    return rows;
  }

  async getRiskDistribution(siteId: string, userId: string, days: number) {
    await this.validateSiteOwnership(siteId, userId);
    const since = this.daysAgo(days);

    const rows = await this.db
      .select({
        bucket: sql<string>`
          CASE
            WHEN ${verifications.riskScore} <= 20 THEN 'very_low'
            WHEN ${verifications.riskScore} <= 40 THEN 'low'
            WHEN ${verifications.riskScore} <= 60 THEN 'medium'
            WHEN ${verifications.riskScore} <= 80 THEN 'high'
            ELSE 'very_high'
          END
        `,
        count: count(verifications.id),
      })
      .from(verifications)
      .where(
        and(
          eq(verifications.siteId, siteId),
          gte(verifications.createdAt, since),
        ),
      )
      .groupBy(
        sql`CASE
            WHEN ${verifications.riskScore} <= 20 THEN 'very_low'
            WHEN ${verifications.riskScore} <= 40 THEN 'low'
            WHEN ${verifications.riskScore} <= 60 THEN 'medium'
            WHEN ${verifications.riskScore} <= 80 THEN 'high'
            ELSE 'very_high'
          END`,
      );

    return rows;
  }

  async getVerificationLogs(
    siteId: string,
    userId: string,
    page: number,
    pageSize: number,
  ) {
    await this.validateSiteOwnership(siteId, userId);

    const clampedPageSize = Math.min(Math.max(pageSize, 1), 100);
    const clampedPage = Math.max(page, 1);
    const offset = (clampedPage - 1) * clampedPageSize;

    const [totalResult] = await this.db
      .select({ total: count(verifications.id) })
      .from(verifications)
      .where(eq(verifications.siteId, siteId));

    const total = totalResult?.total ?? 0;

    const data = await this.db
      .select({
        id: verifications.id,
        riskScore: verifications.riskScore,
        action: verifications.action,
        fingerprintHash: verifications.fingerprintHash,
        ipAddress: verifications.ipAddress,
        powTimeMs: verifications.powTimeMs,
        anomalies: verifications.anomalies,
        createdAt: verifications.createdAt,
      })
      .from(verifications)
      .where(eq(verifications.siteId, siteId))
      .orderBy(desc(verifications.createdAt))
      .limit(clampedPageSize)
      .offset(offset);

    return {
      data,
      total,
      page: clampedPage,
      pageSize: clampedPageSize,
    };
  }

  async getTopIps(
    siteId: string,
    userId: string,
    days: number,
    limit: number,
  ) {
    await this.validateSiteOwnership(siteId, userId);
    const since = this.daysAgo(days);

    const rows = await this.db
      .select({
        ipAddress: verifications.ipAddress,
        count: count(verifications.id),
        avgRiskScore: sql<number>`COALESCE(AVG(${verifications.riskScore}), 0)::int`,
        blockCount: sql<number>`COUNT(*) FILTER (WHERE ${verifications.action} = 'block')`,
      })
      .from(verifications)
      .where(
        and(
          eq(verifications.siteId, siteId),
          gte(verifications.createdAt, since),
        ),
      )
      .groupBy(verifications.ipAddress)
      .orderBy(sql`COUNT(${verifications.id}) DESC`)
      .limit(limit);

    return rows;
  }

  async deleteData(
    siteId: string,
    userId: string,
    ip?: string,
    fingerprint?: string,
  ) {
    await this.validateSiteOwnership(siteId, userId);

    let deletedVerifications = 0;
    let deletedChallenges = 0;

    if (ip) {
      const vResult = await this.db
        .delete(verifications)
        .where(
          and(
            eq(verifications.siteId, siteId),
            eq(verifications.ipAddress, ip),
          ),
        )
        .returning({ id: verifications.id });
      deletedVerifications += vResult.length;

      const cResult = await this.db
        .delete(challenges)
        .where(
          and(
            eq(challenges.siteId, siteId),
            eq(challenges.ipAddress, ip),
          ),
        )
        .returning({ id: challenges.id });
      deletedChallenges += cResult.length;
    }

    if (fingerprint) {
      const vResult = await this.db
        .delete(verifications)
        .where(
          and(
            eq(verifications.siteId, siteId),
            eq(verifications.fingerprintHash, fingerprint),
          ),
        )
        .returning({ id: verifications.id });
      deletedVerifications += vResult.length;
    }

    return {
      deleted: {
        verifications: deletedVerifications,
        challenges: deletedChallenges,
      },
    };
  }
}
