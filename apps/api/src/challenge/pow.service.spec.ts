import { PowService } from './pow.service';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';

// Mock ioredis
const mockRedis = {
  set: jest.fn(),
  quit: jest.fn(),
  on: jest.fn(),
};

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => mockRedis);
});

describe('PowService', () => {
  let service: PowService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedis.set.mockResolvedValue('OK');

    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'REDIS_URL') return 'redis://localhost:6379';
        return undefined;
      }),
    } as unknown as ConfigService;

    service = new PowService(configService);
  });

  /**
   * Helper: find a nonce that produces a hash with the required leading zeros.
   */
  function findValidNonce(
    challenge: string,
    difficulty: number,
  ): { nonce: string; hash: string } {
    const prefix = '0'.repeat(difficulty);
    for (let i = 0; i < 1_000_000; i++) {
      const nonce = i.toString();
      const hash = createHash('sha256')
        .update(`${challenge}${nonce}`)
        .digest('hex');
      if (hash.startsWith(prefix)) {
        return { nonce, hash };
      }
    }
    throw new Error('Could not find valid nonce in 1M iterations');
  }

  describe('verifyPow()', () => {
    it('should pass for a valid hash with correct leading zeros', async () => {
      const challenge = 'test-challenge-abc';
      const difficulty = 2;
      const { nonce } = findValidNonce(challenge, difficulty);

      const result = await service.verifyPow({
        challenge,
        nonce,
        difficulty,
        challengeId: 'ch-1',
        solveTimeMs: 1000,
      });

      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should fail when hash does not have required leading zeros', async () => {
      const result = await service.verifyPow({
        challenge: 'test-challenge',
        nonce: 'bad-nonce-that-wont-match',
        difficulty: 10, // Very high difficulty, essentially impossible to match randomly
        challengeId: 'ch-2',
        solveTimeMs: 1000,
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('does not meet difficulty requirement');
    });

    it('should fail on nonce replay (Redis SET NX returns null)', async () => {
      mockRedis.set.mockResolvedValue(null);

      const challenge = 'test-challenge-replay';
      const difficulty = 2;
      const { nonce } = findValidNonce(challenge, difficulty);

      const result = await service.verifyPow({
        challenge,
        nonce,
        difficulty,
        challengeId: 'ch-3',
        solveTimeMs: 1000,
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Nonce already used');
    });

    it('should fail when solve time is too fast (<50ms)', async () => {
      const challenge = 'test-challenge-fast';
      const difficulty = 2;
      const { nonce } = findValidNonce(challenge, difficulty);

      const result = await service.verifyPow({
        challenge,
        nonce,
        difficulty,
        challengeId: 'ch-4',
        solveTimeMs: 30,
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('too quickly');
    });

    it('should fail when solve time is too slow (>300000ms)', async () => {
      const challenge = 'test-challenge-slow';
      const difficulty = 2;
      const { nonce } = findValidNonce(challenge, difficulty);

      const result = await service.verifyPow({
        challenge,
        nonce,
        difficulty,
        challengeId: 'ch-5',
        solveTimeMs: 400_000,
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('took too long');
    });

    it('should pass with normal solve time', async () => {
      const challenge = 'test-challenge-normal';
      const difficulty = 2;
      const { nonce } = findValidNonce(challenge, difficulty);

      const result = await service.verifyPow({
        challenge,
        nonce,
        difficulty,
        challengeId: 'ch-6',
        solveTimeMs: 5000,
      });

      expect(result.valid).toBe(true);
    });

    it('should return internal error when Redis fails (fail closed)', async () => {
      mockRedis.set.mockRejectedValue(new Error('Redis connection refused'));

      const challenge = 'test-challenge-redis-fail';
      const difficulty = 2;
      const { nonce } = findValidNonce(challenge, difficulty);

      const result = await service.verifyPow({
        challenge,
        nonce,
        difficulty,
        challengeId: 'ch-7',
        solveTimeMs: 1000,
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Internal verification error');
    });

    it('should pass when solveTimeMs is undefined', async () => {
      const challenge = 'test-challenge-no-time';
      const difficulty = 2;
      const { nonce } = findValidNonce(challenge, difficulty);

      const result = await service.verifyPow({
        challenge,
        nonce,
        difficulty,
        challengeId: 'ch-8',
      });

      expect(result.valid).toBe(true);
    });
  });

  describe('computeHash()', () => {
    it('should compute SHA-256 hash of challenge + nonce', () => {
      const expected = createHash('sha256')
        .update('challengenonce')
        .digest('hex');
      expect(service.computeHash('challenge', 'nonce')).toBe(expected);
    });
  });
});
