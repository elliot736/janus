import {
  Injectable,
  Inject,
  BadRequestException,
  GoneException,
  ForbiddenException,
} from '@nestjs/common';
import { DATABASE_TOKEN, type Database } from '../db/db.provider';
import { verifications } from '../db/schema';
import { SitesService } from '../sites/sites.service';
import { ChallengeService } from '../challenge/challenge.service';
import { PowService } from '../challenge/pow.service';
import { RiskScoringService } from './risk-scoring.service';
import { FingerprintService } from './fingerprint.service';
import { TokenService } from './token.service';
import { MetricsService } from '../metrics/metrics.service';

interface VerifyParams {
  siteKey: string;
  challengeId: string;
  nonce: string;
  solveTimeMs?: number;
  fingerprint?: Record<string, unknown>;
  behaviorData?: Record<string, unknown>;
  ipAddress: string;
  origin?: string;
}

interface SiteVerifyParams {
  secret: string;
  token: string;
  remoteIp?: string;
}

@Injectable()
export class VerificationService {
  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: Database,
    private readonly sitesService: SitesService,
    private readonly challengeService: ChallengeService,
    private readonly powService: PowService,
    private readonly riskScoringService: RiskScoringService,
    private readonly fingerprintService: FingerprintService,
    private readonly tokenService: TokenService,
    private readonly metricsService: MetricsService,
  ) {}

  async verify(params: VerifyParams) {
    // 1. Validate site key
    const site = await this.sitesService.findBySiteKey(params.siteKey);

    // 1b. Validate origin against site's allowed domains
    if (params.origin && site.domain?.length > 0) {
      const originHost = new URL(params.origin).hostname;
      const allowed = site.domain.some(
        (d: string) => d === originHost || originHost.endsWith('.' + d),
      );
      if (!allowed) {
        throw new ForbiddenException('Origin not allowed for this site');
      }
    }

    // 2. Validate challenge exists and is pending
    const challenge = await this.challengeService.findById(params.challengeId);
    if (!challenge) {
      throw new BadRequestException('Challenge not found');
    }
    if (challenge.status !== 'pending') {
      throw new BadRequestException('Challenge already used or expired');
    }
    if (challenge.siteId !== site.id) {
      throw new BadRequestException('Challenge does not belong to this site');
    }
    if (new Date() > challenge.expiresAt) {
      await this.challengeService.markExpired(params.challengeId);
      throw new GoneException('Challenge has expired');
    }
    if (challenge.ipAddress !== params.ipAddress) {
      throw new BadRequestException('IP address mismatch');
    }

    // 3. Verify PoW solution
    const powResult = await this.powService.verifyPow({
      challenge: challenge.challenge,
      nonce: params.nonce,
      difficulty: challenge.difficulty,
      challengeId: params.challengeId,
      solveTimeMs: params.solveTimeMs,
    });

    if (!powResult.valid) {
      throw new BadRequestException(
        `PoW verification failed: ${powResult.reason}`,
      );
    }

    // 4. Mark challenge as solved
    await this.challengeService.markSolved(params.challengeId);

    // 5. Compute fingerprint hash
    const fingerprintHash = params.fingerprint
      ? this.fingerprintService.computeHash(params.fingerprint)
      : undefined;

    // 6. Check fingerprint consistency and velocity
    const fingerprintAnalysis = fingerprintHash
      ? await this.fingerprintService.analyze({
          fingerprintHash,
          ipAddress: params.ipAddress,
          siteId: site.id,
        })
      : { anomalies: [], consistencyScore: 100 };

    // 7. Score risk
    const siteMode = (site.settings as Record<string, unknown> | null)?.mode as string | undefined;
    const riskResult = this.riskScoringService.score({
      solveTimeMs: params.solveTimeMs,
      behaviorData: params.behaviorData,
      fingerprintConsistency: fingerprintAnalysis.consistencyScore,
      fingerprintAnomalies: fingerprintAnalysis.anomalies,
      ipAddress: params.ipAddress,
      ja3Hash: challenge.ja3Hash,
      mode: siteMode,
    });

    // 8. Determine action based on risk thresholds
    const thresholds = (site.settings as any)?.riskThresholds ?? {
      allow: 30,
      challenge: 60,
      block: 80,
    };

    let action: 'allow' | 'challenge' | 'block';
    if (riskResult.score <= thresholds.allow) {
      action = 'allow';
    } else if (riskResult.score <= thresholds.block) {
      action = 'challenge';
    } else {
      action = 'block';
    }

    // 9. Issue token
    const token = this.tokenService.issue({
      siteId: site.id,
      challengeId: params.challengeId,
      ipAddress: params.ipAddress,
      fingerprintHash,
      riskScore: riskResult.score,
      action,
    });

    // 10. Store verification record
    const [record] = await this.db
      .insert(verifications)
      .values({
        siteId: site.id,
        challengeId: params.challengeId,
        token: token.token,
        riskScore: riskResult.score,
        action,
        fingerprintHash: fingerprintHash ?? null,
        behaviorScore: riskResult.behaviorScore ?? null,
        anomalies: riskResult.anomalies,
        powTimeMs: params.solveTimeMs ?? null,
        ipAddress: params.ipAddress,
      })
      .returning();

    if (!record) throw new Error('Failed to store verification');

    this.metricsService.incrementVerification(action);
    this.metricsService.recordRiskScore(riskResult.score);

    return {
      success: true,
      token: token.token,
      action,
      riskScore: riskResult.score,
      expiresAt: token.expiresAt,
    };
  }

  async siteVerify(params: SiteVerifyParams) {
    // 1. Validate secret key
    const site = await this.sitesService.findBySecretKeyHash(params.secret);

    // 2. Verify token
    const tokenData = this.tokenService.verify(params.token, site.id);

    if (!tokenData.valid) {
      return {
        success: false,
        error: tokenData.reason,
      };
    }

    // 3. Optionally check remote IP matches
    if (params.remoteIp && tokenData.data?.ipAddress !== params.remoteIp) {
      return {
        success: false,
        error: 'Remote IP does not match token IP',
        'error-codes': ['ip-mismatch'],
      };
    }

    return {
      success: true,
      challenge_ts: tokenData.data?.issuedAt,
      hostname: site.domain?.[0] ?? null,
      action: tokenData.data?.action,
      risk_score: tokenData.data?.riskScore,
    };
  }
}
