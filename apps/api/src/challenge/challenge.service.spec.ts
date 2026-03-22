import { ForbiddenException } from '@nestjs/common';
import { ChallengeService } from './challenge.service';
import { ConfigService } from '@nestjs/config';

describe('ChallengeService', () => {
  let service: ChallengeService;
  let mockDb: any;
  let mockSitesService: any;
  let mockConfigService: any;
  let mockMetricsService: any;
  let mockAdaptiveDifficulty: any;

  const fakeSite = {
    id: 'site-uuid-1',
    name: 'Test Site',
    domain: ['example.com', 'test.com'],
    siteKey: 'jns_site_live_abc',
    settings: { powDifficulty: 5, mode: 'managed' },
    isActive: true,
  };

  beforeEach(() => {
    const returningMock = jest.fn().mockResolvedValue([
      {
        id: 'challenge-uuid-1',
        siteId: fakeSite.id,
        challenge: 'generated-hmac',
        difficulty: 5,
        ipAddress: '1.2.3.4',
        ja3Hash: null,
        status: 'pending',
        expiresAt: new Date(Date.now() + 300_000),
      },
    ]);

    mockDb = {
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: returningMock,
        }),
      }),
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      }),
    };

    mockSitesService = {
      findBySiteKey: jest.fn().mockResolvedValue(fakeSite),
    };

    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'HMAC_SECRET') return 'test-hmac-secret';
        return undefined;
      }),
    } as unknown as ConfigService;

    mockMetricsService = {
      incrementChallenge: jest.fn(),
    };

    mockAdaptiveDifficulty = {
      getEffectiveDifficulty: jest.fn().mockResolvedValue(5),
      getDifficultyBonus: jest.fn().mockResolvedValue(0),
      recordOutcome: jest.fn(),
    };

    service = new ChallengeService(mockDb, mockSitesService, mockConfigService, mockMetricsService, mockAdaptiveDifficulty);
  });

  describe('issueChallenge()', () => {
    it('should return challengeId, challenge hash, difficulty, and mode', async () => {
      const result = await service.issueChallenge({
        siteKey: 'jns_site_live_abc',
        ipAddress: '1.2.3.4',
      });

      expect(result.challengeId).toBe('challenge-uuid-1');
      expect(result.challenge).toBeDefined();
      expect(typeof result.challenge).toBe('string');
      expect(result.difficulty).toBe(5);
      expect(result.mode).toBe('managed');
      expect(result.algorithm).toBe('SHA-256');
      expect(result.expiresAt).toBeDefined();
    });

    it('should use site powDifficulty from settings', async () => {
      const result = await service.issueChallenge({
        siteKey: 'jns_site_live_abc',
        ipAddress: '1.2.3.4',
      });

      // The difficulty passed to db.insert should be 5 (from settings)
      const insertValues =
        mockDb.insert.mock.results[0].value.values.mock.calls[0][0];
      expect(insertValues.difficulty).toBe(5);
      expect(result.difficulty).toBe(5);
    });

    it('should default to difficulty 4 when settings is empty', async () => {
      mockSitesService.findBySiteKey.mockResolvedValue({
        ...fakeSite,
        settings: null,
      });
      mockAdaptiveDifficulty.getEffectiveDifficulty.mockResolvedValue(4);

      const result = await service.issueChallenge({
        siteKey: 'jns_site_live_abc',
        ipAddress: '1.2.3.4',
      });

      const insertValues =
        mockDb.insert.mock.results[0].value.values.mock.calls[0][0];
      expect(insertValues.difficulty).toBe(4);
      expect(result.difficulty).toBe(4);
      // Should have been called with base difficulty 4
      expect(mockAdaptiveDifficulty.getEffectiveDifficulty).toHaveBeenCalledWith('site-uuid-1', 4);
    });

    it('should increase difficulty when adaptive service detects attack', async () => {
      // Base difficulty is 5 (from settings), adaptive adds +2 = 7
      mockAdaptiveDifficulty.getEffectiveDifficulty.mockResolvedValue(7);

      const result = await service.issueChallenge({
        siteKey: 'jns_site_live_abc',
        ipAddress: '1.2.3.4',
      });

      const insertValues =
        mockDb.insert.mock.results[0].value.values.mock.calls[0][0];
      expect(insertValues.difficulty).toBe(7);
      expect(result.difficulty).toBe(7);
    });

    it('should validate origin against site domains', async () => {
      const result = await service.issueChallenge({
        siteKey: 'jns_site_live_abc',
        ipAddress: '1.2.3.4',
        origin: 'https://example.com',
      });

      expect(result.challengeId).toBe('challenge-uuid-1');
    });

    it('should reject invalid origin', async () => {
      await expect(
        service.issueChallenge({
          siteKey: 'jns_site_live_abc',
          ipAddress: '1.2.3.4',
          origin: 'https://evil.com',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow request when no origin header is provided', async () => {
      const result = await service.issueChallenge({
        siteKey: 'jns_site_live_abc',
        ipAddress: '1.2.3.4',
      });

      expect(result.challengeId).toBeDefined();
    });

    it('should allow subdomain origins', async () => {
      const result = await service.issueChallenge({
        siteKey: 'jns_site_live_abc',
        ipAddress: '1.2.3.4',
        origin: 'https://sub.example.com',
      });

      expect(result.challengeId).toBeDefined();
    });
  });

  describe('findById()', () => {
    it('should return challenge when found', async () => {
      const fakeChallenge = {
        id: 'challenge-uuid-1',
        siteId: 'site-uuid-1',
        challenge: 'hmac-hash',
        difficulty: 4,
        status: 'pending',
      };

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([fakeChallenge]),
        }),
      });

      const result = await service.findById('challenge-uuid-1');
      expect(result).toEqual(fakeChallenge);
    });

    it('should return null when not found', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      });

      const result = await service.findById('nonexistent-id');
      expect(result).toBeNull();
    });
  });

  describe('constructor', () => {
    it('should throw if HMAC_SECRET is not configured', () => {
      const badConfig = {
        get: jest.fn(() => undefined),
      } as unknown as ConfigService;

      expect(
        () => new ChallengeService(mockDb, mockSitesService, badConfig, mockMetricsService, mockAdaptiveDifficulty),
      ).toThrow('HMAC_SECRET environment variable is required');
    });
  });
});
