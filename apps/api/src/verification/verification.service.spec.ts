import {
  BadRequestException,
  GoneException,
  ForbiddenException,
} from '@nestjs/common';
import { VerificationService } from './verification.service';

describe('VerificationService', () => {
  let service: VerificationService;
  let mockDb: any;
  let mockSitesService: any;
  let mockChallengeService: any;
  let mockPowService: any;
  let mockRiskScoringService: any;
  let mockFingerprintService: any;
  let mockTokenService: any;
  let mockMetricsService: any;
  let mockGeoIpService: any;
  let mockWebhooksService: any;

  const fakeSite = {
    id: 'site-uuid-1',
    name: 'Test Site',
    domain: ['example.com'],
    siteKey: 'jns_site_live_abc',
    settings: { mode: 'managed', riskThresholds: { allow: 30, challenge: 60, block: 80 } },
    isActive: true,
  };

  const fakeChallenge = {
    id: 'challenge-uuid-1',
    siteId: 'site-uuid-1',
    challenge: 'hmac-hash-value',
    difficulty: 4,
    ipAddress: '1.2.3.4',
    ja3Hash: 'ja3-hash',
    status: 'pending',
    expiresAt: new Date(Date.now() + 300_000),
  };

  const baseVerifyParams = {
    siteKey: 'jns_site_live_abc',
    challengeId: 'challenge-uuid-1',
    nonce: '12345',
    solveTimeMs: 2000,
    fingerprint: { screen: '1920x1080' },
    behaviorData: { mouseMovements: 25 },
    ipAddress: '1.2.3.4',
    origin: 'https://example.com',
  };

  beforeEach(() => {
    mockDb = {
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([
            {
              id: 'verification-uuid-1',
              siteId: fakeSite.id,
              challengeId: fakeChallenge.id,
              token: 'issued-token',
              riskScore: 25,
              action: 'allow',
            },
          ]),
        }),
      }),
    };

    mockSitesService = {
      findBySiteKey: jest.fn().mockResolvedValue(fakeSite),
      findBySecretKeyHash: jest.fn().mockResolvedValue(fakeSite),
    };

    mockChallengeService = {
      findById: jest.fn().mockResolvedValue(fakeChallenge),
      markSolved: jest.fn().mockResolvedValue(undefined),
      markExpired: jest.fn().mockResolvedValue(undefined),
    };

    mockPowService = {
      verifyPow: jest.fn().mockResolvedValue({ valid: true }),
    };

    mockRiskScoringService = {
      score: jest.fn().mockReturnValue({
        score: 25,
        behaviorScore: 70,
        anomalies: [],
      }),
    };

    mockFingerprintService = {
      computeHash: jest.fn().mockReturnValue('fp-hash-123'),
      analyze: jest.fn().mockResolvedValue({
        anomalies: [],
        consistencyScore: 95,
      }),
    };

    mockTokenService = {
      issue: jest.fn().mockReturnValue({
        token: 'issued-token-string',
        expiresAt: new Date(Date.now() + 300_000).toISOString(),
      }),
      verify: jest.fn().mockReturnValue({
        valid: true,
        data: {
          siteId: 'site-uuid-1',
          challengeId: 'challenge-uuid-1',
          ipAddress: '1.2.3.4',
          riskScore: 25,
          action: 'allow',
          issuedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 300_000).toISOString(),
        },
      }),
    };

    mockMetricsService = {
      incrementVerification: jest.fn(),
      recordRiskScore: jest.fn(),
    };

    mockGeoIpService = {
      lookup: jest.fn().mockReturnValue({
        countryCode: 'US',
        isDatacenter: false,
        isVpn: false,
        isProxy: false,
        asn: null,
        asnOrg: null,
      }),
    };

    mockWebhooksService = {
      fire: jest.fn(),
    };

    service = new VerificationService(
      mockDb,
      mockSitesService,
      mockChallengeService,
      mockPowService,
      mockRiskScoringService,
      mockFingerprintService,
      mockTokenService,
      mockMetricsService,
      mockGeoIpService,
      mockWebhooksService,
    );
  });

  describe('verify()', () => {
    it('should succeed on happy path: valid challenge, valid PoW, scores risk, issues token, stores verification', async () => {
      const result = await service.verify(baseVerifyParams);

      expect(result.success).toBe(true);
      expect(result.token).toBe('issued-token-string');
      expect(result.action).toBeDefined();
      expect(result.riskScore).toBe(25);
      expect(result.expiresAt).toBeDefined();

      // Verify all services were called
      expect(mockSitesService.findBySiteKey).toHaveBeenCalledWith('jns_site_live_abc');
      expect(mockChallengeService.findById).toHaveBeenCalledWith('challenge-uuid-1');
      expect(mockPowService.verifyPow).toHaveBeenCalled();
      expect(mockChallengeService.markSolved).toHaveBeenCalledWith('challenge-uuid-1');
      expect(mockFingerprintService.computeHash).toHaveBeenCalled();
      expect(mockFingerprintService.analyze).toHaveBeenCalled();
      expect(mockRiskScoringService.score).toHaveBeenCalled();
      expect(mockTokenService.issue).toHaveBeenCalled();
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should reject when challenge not found', async () => {
      mockChallengeService.findById.mockResolvedValue(null);

      await expect(service.verify(baseVerifyParams)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.verify(baseVerifyParams)).rejects.toThrow(
        'Challenge not found',
      );
    });

    it('should reject when challenge already used', async () => {
      mockChallengeService.findById.mockResolvedValue({
        ...fakeChallenge,
        status: 'solved',
      });

      await expect(service.verify(baseVerifyParams)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.verify(baseVerifyParams)).rejects.toThrow(
        'Challenge already used or expired',
      );
    });

    it('should reject when challenge expired', async () => {
      mockChallengeService.findById.mockResolvedValue({
        ...fakeChallenge,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(service.verify(baseVerifyParams)).rejects.toThrow(
        GoneException,
      );
    });

    it('should reject when challenge belongs to different site', async () => {
      mockChallengeService.findById.mockResolvedValue({
        ...fakeChallenge,
        siteId: 'different-site-id',
      });

      await expect(service.verify(baseVerifyParams)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.verify(baseVerifyParams)).rejects.toThrow(
        'Challenge does not belong to this site',
      );
    });

    it('should reject when IP mismatch', async () => {
      mockChallengeService.findById.mockResolvedValue({
        ...fakeChallenge,
        ipAddress: '9.9.9.9',
      });

      await expect(service.verify(baseVerifyParams)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.verify(baseVerifyParams)).rejects.toThrow(
        'IP address mismatch',
      );
    });

    it('should reject when PoW verification fails', async () => {
      mockPowService.verifyPow.mockResolvedValue({
        valid: false,
        reason: 'Hash does not meet difficulty requirement',
      });

      await expect(service.verify(baseVerifyParams)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.verify(baseVerifyParams)).rejects.toThrow(
        'PoW verification failed',
      );
    });

    it('should reject invalid origin', async () => {
      await expect(
        service.verify({ ...baseVerifyParams, origin: 'https://evil.com' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should handle missing fingerprint data gracefully', async () => {
      const result = await service.verify({
        ...baseVerifyParams,
        fingerprint: undefined,
      });

      expect(result.success).toBe(true);
      expect(mockFingerprintService.computeHash).not.toHaveBeenCalled();
      expect(mockFingerprintService.analyze).not.toHaveBeenCalled();
    });
  });

  describe('siteVerify()', () => {
    it('should return success with challenge_ts, hostname, action, risk_score for valid token', async () => {
      const result = await service.siteVerify({
        secret: 'jns_secret_live_abc',
        token: 'valid-token',
      });

      expect(result.success).toBe(true);
      expect(result.challenge_ts).toBeDefined();
      expect(result.hostname).toBe('example.com');
      expect(result.action).toBe('allow');
      expect(result.risk_score).toBe(25);

      expect(mockSitesService.findBySecretKeyHash).toHaveBeenCalledWith(
        'jns_secret_live_abc',
      );
      expect(mockTokenService.verify).toHaveBeenCalledWith(
        'valid-token',
        'site-uuid-1',
      );
    });

    it('should return success=false with error reason for invalid token', async () => {
      mockTokenService.verify.mockReturnValue({
        valid: false,
        reason: 'Token has expired',
      });

      const result = await service.siteVerify({
        secret: 'jns_secret_live_abc',
        token: 'expired-token',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Token has expired');
    });

    it('should return IP mismatch error when remoteIp does not match', async () => {
      const result = await service.siteVerify({
        secret: 'jns_secret_live_abc',
        token: 'valid-token',
        remoteIp: '9.9.9.9',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Remote IP does not match token IP');
      expect(result['error-codes']).toContain('ip-mismatch');
    });

    it('should succeed when remoteIp matches token IP', async () => {
      const result = await service.siteVerify({
        secret: 'jns_secret_live_abc',
        token: 'valid-token',
        remoteIp: '1.2.3.4',
      });

      expect(result.success).toBe(true);
    });
  });
});
