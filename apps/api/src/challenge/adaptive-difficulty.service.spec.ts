import { AdaptiveDifficultyService } from './adaptive-difficulty.service';
import { ConfigService } from '@nestjs/config';

describe('AdaptiveDifficultyService', () => {
  let service: AdaptiveDifficultyService;
  let mockPipeline: any;
  let mockRedis: any;

  beforeEach(() => {
    mockPipeline = {
      zadd: jest.fn().mockReturnThis(),
      pexpire: jest.fn().mockReturnThis(),
      zremrangebyscore: jest.fn().mockReturnThis(),
      zcount: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([
        [null, 0],
        [null, 0],
      ]),
    };

    mockRedis = {
      pipeline: jest.fn().mockReturnValue(mockPipeline),
      on: jest.fn(),
      quit: jest.fn().mockResolvedValue(undefined),
    };

    // Mock ioredis constructor
    jest.doMock('ioredis', () => {
      return { default: jest.fn().mockImplementation(() => mockRedis) };
    });

    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'REDIS_URL') return 'redis://localhost:6379';
        return undefined;
      }),
    } as unknown as ConfigService;

    service = new AdaptiveDifficultyService(configService);
    // Inject mock redis
    (service as any).redis = mockRedis;
  });

  describe('getDifficultyBonus()', () => {
    it('should return 0 when below minimum sample size', async () => {
      mockPipeline.exec.mockResolvedValue([
        [null, 5],  // total = 5 (below min 10)
        [null, 4],  // blocks = 4
      ]);

      const bonus = await service.getDifficultyBonus('site-1');
      expect(bonus).toBe(0);
    });

    it('should return 0 when block rate is low', async () => {
      mockPipeline.exec.mockResolvedValue([
        [null, 100], // total = 100
        [null, 5],   // blocks = 5 (5%)
      ]);

      const bonus = await service.getDifficultyBonus('site-1');
      expect(bonus).toBe(0);
    });

    it('should return +1 for 15%+ block rate', async () => {
      mockPipeline.exec.mockResolvedValue([
        [null, 100], // total
        [null, 18],  // blocks (18%)
      ]);

      const bonus = await service.getDifficultyBonus('site-1');
      expect(bonus).toBe(1);
    });

    it('should return +2 for 25%+ block rate', async () => {
      mockPipeline.exec.mockResolvedValue([
        [null, 100],
        [null, 30], // 30%
      ]);

      const bonus = await service.getDifficultyBonus('site-1');
      expect(bonus).toBe(2);
    });

    it('should return +3 for 40%+ block rate', async () => {
      mockPipeline.exec.mockResolvedValue([
        [null, 100],
        [null, 45], // 45%
      ]);

      const bonus = await service.getDifficultyBonus('site-1');
      expect(bonus).toBe(3);
    });

    it('should return +4 for 60%+ block rate', async () => {
      mockPipeline.exec.mockResolvedValue([
        [null, 100],
        [null, 65], // 65%
      ]);

      const bonus = await service.getDifficultyBonus('site-1');
      expect(bonus).toBe(4);
    });

    it('should return 0 when Redis is not available', async () => {
      (service as any).redis = null;

      const bonus = await service.getDifficultyBonus('site-1');
      expect(bonus).toBe(0);
    });

    it('should return 0 when Redis throws', async () => {
      mockPipeline.exec.mockRejectedValue(new Error('Redis error'));

      const bonus = await service.getDifficultyBonus('site-1');
      expect(bonus).toBe(0);
    });
  });

  describe('getEffectiveDifficulty()', () => {
    it('should add bonus to base difficulty', async () => {
      mockPipeline.exec.mockResolvedValue([
        [null, 100],
        [null, 45], // 45% → +3
      ]);

      const result = await service.getEffectiveDifficulty('site-1', 4);
      expect(result).toBe(7); // 4 + 3
    });

    it('should clamp to maximum difficulty of 8', async () => {
      mockPipeline.exec.mockResolvedValue([
        [null, 100],
        [null, 65], // 65% → +4
      ]);

      const result = await service.getEffectiveDifficulty('site-1', 6);
      expect(result).toBe(8); // 6 + 4 = 10 → clamped to 8
    });

    it('should return base difficulty when no bonus', async () => {
      mockPipeline.exec.mockResolvedValue([
        [null, 100],
        [null, 5], // 5% → +0
      ]);

      const result = await service.getEffectiveDifficulty('site-1', 4);
      expect(result).toBe(4);
    });
  });

  describe('recordOutcome()', () => {
    it('should record to Redis pipeline', async () => {
      await service.recordOutcome('site-1', 'allow');

      expect(mockRedis.pipeline).toHaveBeenCalled();
      expect(mockPipeline.zadd).toHaveBeenCalled();
      expect(mockPipeline.exec).toHaveBeenCalled();
    });

    it('should add to blocks set when action is block', async () => {
      await service.recordOutcome('site-1', 'block');

      // zadd called twice: once for total, once for blocks
      expect(mockPipeline.zadd).toHaveBeenCalledTimes(2);
    });

    it('should not add to blocks set when action is allow', async () => {
      await service.recordOutcome('site-1', 'allow');

      // zadd called once: only for total
      expect(mockPipeline.zadd).toHaveBeenCalledTimes(1);
    });

    it('should silently fail when Redis is unavailable', async () => {
      (service as any).redis = null;
      await expect(service.recordOutcome('site-1', 'block')).resolves.toBeUndefined();
    });
  });
});
