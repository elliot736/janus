import { Injectable, Inject, ForbiddenException } from '@nestjs/common';
import { createHmac, randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { DATABASE_TOKEN, type Database } from '../db/db.provider';
import { challenges } from '../db/schema';
import { SitesService } from '../sites/sites.service';
import { MetricsService } from '../metrics/metrics.service';
import { eq } from 'drizzle-orm';

interface IssueChallengeParams {
  siteKey: string;
  ipAddress: string;
  ja3Hash?: string;
  origin?: string;
}

@Injectable()
export class ChallengeService {
  private readonly hmacSecret: string;

  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: Database,
    private readonly sitesService: SitesService,
    private readonly configService: ConfigService,
    private readonly metricsService: MetricsService,
  ) {
    const secret = this.configService.get<string>('HMAC_SECRET');
    if (!secret) throw new Error('HMAC_SECRET environment variable is required');
    this.hmacSecret = secret;
  }

  async issueChallenge(params: IssueChallengeParams) {
    const site = await this.sitesService.findBySiteKey(params.siteKey);

    // Validate origin against site's allowed domains
    if (params.origin && site.domain?.length > 0) {
      const originHost = new URL(params.origin).hostname;
      const allowed = site.domain.some(
        (d: string) => d === originHost || originHost.endsWith('.' + d),
      );
      if (!allowed) {
        throw new ForbiddenException('Origin not allowed for this site');
      }
    }

    const settings = site.settings as Record<string, unknown> | null;
    const difficulty = (settings?.powDifficulty as number) ?? 4;
    const mode = (settings?.mode as string) ?? 'invisible';
    const gdprMode = (settings?.gdprMode as boolean) ?? false;
    const nonce = randomBytes(16).toString('hex');
    const timestamp = Date.now().toString();

    // HMAC-SHA256 bound challenge: site + IP + timestamp + nonce
    const challengeData = `${site.id}:${params.ipAddress}:${timestamp}:${nonce}`;
    const challengeHmac = createHmac('sha256', this.hmacSecret)
      .update(challengeData)
      .digest('hex');

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    const [record] = await this.db
      .insert(challenges)
      .values({
        siteId: site.id,
        challenge: challengeHmac,
        difficulty,
        ipAddress: params.ipAddress,
        ja3Hash: params.ja3Hash ?? null,
        status: 'pending',
        expiresAt,
      })
      .returning();

    if (!record) throw new Error('Failed to create challenge');

    this.metricsService.incrementChallenge();

    return {
      challengeId: record.id,
      challenge: challengeHmac,
      difficulty,
      algorithm: 'SHA-256',
      mode,
      ...(gdprMode ? { gdprMode: true } : {}),
      expiresAt: expiresAt.toISOString(),
    };
  }

  async findById(challengeId: string) {
    const [challenge] = await this.db
      .select()
      .from(challenges)
      .where(eq(challenges.id, challengeId));

    return challenge ?? null;
  }

  async markSolved(challengeId: string) {
    await this.db
      .update(challenges)
      .set({ status: 'solved' })
      .where(eq(challenges.id, challengeId));
  }

  async markExpired(challengeId: string) {
    await this.db
      .update(challenges)
      .set({ status: 'expired' })
      .where(eq(challenges.id, challengeId));
  }
}
