import { TokenService } from './token.service';
import { ConfigService } from '@nestjs/config';

describe('TokenService', () => {
  let service: TokenService;
  const TEST_SECRET = 'test-token-secret-for-unit-tests';

  beforeEach(() => {
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'TOKEN_SECRET') return TEST_SECRET;
        return undefined;
      }),
    } as unknown as ConfigService;

    service = new TokenService(configService);
  });

  const issueParams = {
    siteId: 'site-123',
    challengeId: 'challenge-456',
    ipAddress: '1.2.3.4',
    fingerprintHash: 'fp-hash-abc',
    riskScore: 25,
    action: 'allow',
  };

  describe('issue()', () => {
    it('should return a token string with base64url payload + signature', () => {
      const result = service.issue(issueParams);
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');

      const parts = result.token.split('.');
      expect(parts).toHaveLength(2);

      // Verify payload can be decoded
      const payload = JSON.parse(
        Buffer.from(parts[0], 'base64url').toString('utf-8'),
      );
      expect(payload.siteId).toBe('site-123');
      expect(payload.challengeId).toBe('challenge-456');
      expect(payload.ipAddress).toBe('1.2.3.4');
      expect(payload.riskScore).toBe(25);
      expect(payload.action).toBe('allow');
      expect(payload.issuedAt).toBeDefined();
      expect(payload.expiresAt).toBeDefined();
    });

    it('should return an expiresAt string', () => {
      const result = service.issue(issueParams);
      expect(result.expiresAt).toBeDefined();
      const expiresDate = new Date(result.expiresAt);
      expect(expiresDate.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('verify()', () => {
    it('should return valid=true with correct data for a valid token', () => {
      const { token } = service.issue(issueParams);
      const result = service.verify(token, 'site-123');

      expect(result.valid).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.siteId).toBe('site-123');
      expect(result.data!.challengeId).toBe('challenge-456');
      expect(result.data!.ipAddress).toBe('1.2.3.4');
      expect(result.data!.riskScore).toBe(25);
      expect(result.data!.action).toBe('allow');
    });

    it('should return valid=false for tampered payload', () => {
      const { token } = service.issue(issueParams);
      const [, signature] = token.split('.');

      // Create tampered payload
      const tamperedPayload = Buffer.from(
        JSON.stringify({ ...issueParams, riskScore: 0 }),
      ).toString('base64url');
      const tamperedToken = `${tamperedPayload}.${signature}`;

      const result = service.verify(tamperedToken, 'site-123');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Invalid token signature');
    });

    it('should return valid=false for wrong signature', () => {
      const { token } = service.issue(issueParams);
      const [payload] = token.split('.');
      const wrongToken = `${payload}.wrong-signature`;

      const result = service.verify(wrongToken, 'site-123');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Invalid token signature');
    });

    it('should return valid=false for expired token', () => {
      // Issue token, then manipulate the expiry by creating a service with
      // a very short TTL is not possible, so we'll create a token manually
      const { token } = service.issue(issueParams);
      const [payloadB64] = token.split('.');
      const payload = JSON.parse(
        Buffer.from(payloadB64, 'base64url').toString('utf-8'),
      );

      // Set expiry in the past
      payload.expiresAt = new Date(Date.now() - 1000).toISOString();
      const newPayloadB64 = Buffer.from(JSON.stringify(payload)).toString(
        'base64url',
      );

      // Re-sign with the same secret (we need to call issue on a manipulated service)
      // Instead, create a new token with the service using the manipulated payload
      // We can exploit the fact that we know the secret
      const { createHmac } = require('crypto');
      const newSignature = createHmac('sha256', TEST_SECRET)
        .update(newPayloadB64)
        .digest('base64url');
      const expiredToken = `${newPayloadB64}.${newSignature}`;

      const result = service.verify(expiredToken, 'site-123');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Token has expired');
    });

    it('should return valid=false for wrong siteId', () => {
      const { token } = service.issue(issueParams);
      const result = service.verify(token, 'different-site');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Token does not belong to this site');
    });

    it('should return valid=false for malformed token (no dot separator)', () => {
      const result = service.verify('not-a-valid-token', 'site-123');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Invalid token format');
    });

    it('should return valid=false for token with too many parts', () => {
      const result = service.verify('a.b.c', 'site-123');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Invalid token format');
    });

    it('should verify equal strings correctly via constantTimeEqual (indirectly)', () => {
      // Issue and immediately verify - exercises constantTimeEqual with equal strings
      const { token } = service.issue(issueParams);
      const result = service.verify(token, 'site-123');
      expect(result.valid).toBe(true);
    });

    it('should reject unequal strings via constantTimeEqual (indirectly)', () => {
      const { token } = service.issue(issueParams);
      const [payload] = token.split('.');
      const result = service.verify(`${payload}.definitely-wrong`, 'site-123');
      expect(result.valid).toBe(false);
    });
  });

  describe('constructor', () => {
    it('should throw if TOKEN_SECRET is not configured', () => {
      const badConfig = {
        get: jest.fn(() => undefined),
      } as unknown as ConfigService;

      expect(() => new TokenService(badConfig)).toThrow(
        'TOKEN_SECRET environment variable is required',
      );
    });
  });
});
