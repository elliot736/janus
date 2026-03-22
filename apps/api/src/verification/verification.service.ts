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
import { GeoIpService } from '../geoip/geoip.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { AdaptiveDifficultyService } from '../challenge/adaptive-difficulty.service';
import { PluginRegistryService } from '../plugins/plugin-registry.service';
import { AlertingService } from '../alerting/alerting.service';

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
    private readonly geoIpService: GeoIpService,
    private readonly webhooksService: WebhooksService,
    private readonly adaptiveDifficulty: AdaptiveDifficultyService,
    private readonly pluginRegistry: PluginRegistryService,
    private readonly alertingService: AlertingService,
  ) {}

  async verify(params: VerifyParams) {
    // 1. Validate site key
    const site = await this.sitesService.findBySiteKey(params.siteKey);

    // 1b. Validate origin against site's allowed domains
    if (params.origin && site.domain?.length > 0) {
      let originHost: string;
      try {
        originHost = new URL(params.origin).hostname;
      } catch {
        throw new ForbiddenException('Invalid origin');
      }
      const originParts = originHost.split('.');
      const allowed = site.domain.some((d: string) => {
        if (d === originHost) return true;
        const domainParts = d.split('.');
        if (originParts.length <= domainParts.length) return false;
        return originParts.slice(-domainParts.length).join('.') === d;
      });
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

    // 5. Check GDPR mode
    const siteSettings = site.settings as Record<string, unknown> | null;
    const gdprMode = (siteSettings?.gdprMode as boolean) ?? false;

    // 6. GeoIP lookup (in-memory, IP is not stored or logged)
    const geoIp = this.geoIpService.lookup(params.ipAddress);
    const blockedCountries =
      (siteSettings?.blockedCountries as string[] | undefined) ?? [];

    // 7. Compute fingerprint hash
    // Fingerprint hashes are not personal data (they're one-way hashes of
    // aggregated browser properties), so they run in both standard and GDPR mode.
    const fingerprintHash = params.fingerprint
      ? this.fingerprintService.computeHash(params.fingerprint)
      : undefined;

    // 7. Check fingerprint consistency and velocity
    const fingerprintAnalysis = fingerprintHash
      ? await this.fingerprintService.analyze({
          fingerprintHash,
          ipAddress: params.ipAddress,
          siteId: site.id,
        })
      : { anomalies: [], consistencyScore: 100 };

    // 8. Score risk (all signals used in both modes)
    const siteMode = (siteSettings?.mode as string) ?? undefined;
    const riskResult = this.riskScoringService.score({
      solveTimeMs: params.solveTimeMs,
      behaviorData: params.behaviorData,
      fingerprintConsistency: fingerprintAnalysis.consistencyScore,
      fingerprintAnomalies: fingerprintAnalysis.anomalies,
      ipAddress: params.ipAddress,
      ja3Hash: challenge.ja3Hash,
      mode: siteMode,
      geoIp: {
        countryCode: geoIp.countryCode,
        isDatacenter: geoIp.isDatacenter,
        isVpn: geoIp.isVpn,
        isProxy: geoIp.isProxy,
      },
      blockedCountries,
    });

    // 9. Execute risk plugins
    const pluginResult = await this.pluginRegistry.execute(site.id, {
      siteId: site.id,
      ipAddress: params.ipAddress,
      countryCode: geoIp.countryCode,
      isDatacenter: geoIp.isDatacenter,
      isVpn: geoIp.isVpn,
      isProxy: geoIp.isProxy,
      asn: geoIp.asn,
      asnOrg: geoIp.asnOrg,
      fingerprintHash: fingerprintHash ?? null,
      solveTimeMs: params.solveTimeMs ?? null,
      behaviorData: params.behaviorData ?? null,
      mode: siteMode ?? null,
      ja3Hash: challenge.ja3Hash ?? null,
      currentScore: riskResult.score,
      currentAnomalies: riskResult.anomalies,
    });

    riskResult.score = Math.max(0, Math.min(100, riskResult.score + pluginResult.totalAdjustment));
    riskResult.anomalies.push(...pluginResult.anomalies);

    // 10. Determine action based on risk thresholds
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

    // 10. Issue token
    const token = this.tokenService.issue({
      siteId: site.id,
      challengeId: params.challengeId,
      ipAddress: params.ipAddress,
      fingerprintHash,
      riskScore: riskResult.score,
      action,
    });

    // 11. Store verification record (anonymize IP in GDPR mode)
    const storedIp = gdprMode ? this.anonymizeIp(params.ipAddress) : params.ipAddress;
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
        countryCode: geoIp.countryCode ?? null,
        ipAddress: storedIp,
      })
      .returning();

    if (!record) throw new Error('Failed to store verification');

    this.metricsService.incrementVerification(action);
    this.metricsService.recordRiskScore(riskResult.score);

    // Record outcome for adaptive difficulty (non-blocking)
    this.adaptiveDifficulty.recordOutcome(site.id, action);

    // Fire webhook and email alert for blocked verifications (non-blocking)
    if (action === 'block') {
      this.webhooksService.fire(site.id, 'verification.blocked', {
        riskScore: riskResult.score,
        anomalies: riskResult.anomalies,
        countryCode: geoIp.countryCode,
      });
      this.alertingService.alertHighRiskVerification(
        site.id,
        site.name,
        riskResult.score,
        riskResult.anomalies,
        geoIp.countryCode,
        gdprMode ? storedIp : params.ipAddress,
      );
    }

    return {
      success: true,
      token: token.token,
      action,
      riskScore: riskResult.score,
      expiresAt: token.expiresAt,
    };
  }

  private anonymizeIp(ip: string): string {
    if (ip.includes(':')) {
      // IPv6: zero out to /48 — keep first 3 groups only (GDPR compliant)
      const parts = ip.split(':');
      return parts.slice(0, 3).join(':') + '::';
    }
    // IPv4: zero out last two octets for stronger anonymization
    const parts = ip.split('.');
    parts[2] = '0';
    parts[3] = '0';
    return parts.join('.');
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
