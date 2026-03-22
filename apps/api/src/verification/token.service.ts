import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';

interface IssueParams {
  siteId: string;
  challengeId: string;
  ipAddress: string;
  fingerprintHash?: string;
  riskScore: number;
  action: string;
}

interface TokenData {
  siteId: string;
  challengeId: string;
  ipAddress: string;
  fingerprintHash?: string;
  riskScore: number;
  action: string;
  issuedAt: string;
  expiresAt: string;
}

interface VerifyResult {
  valid: boolean;
  reason?: string;
  data?: TokenData;
}

@Injectable()
export class TokenService {
  private readonly secret: string;
  private readonly tokenTtlMs: number;

  constructor(private readonly configService: ConfigService) {
    const secret = this.configService.get<string>('TOKEN_SECRET');
    if (!secret) throw new Error('TOKEN_SECRET environment variable is required');
    this.secret = secret;
    this.tokenTtlMs = 300_000; // 5 minutes
  }

  /**
   * Issue an HMAC-bound token containing verification data.
   * The token is bound to the IP and fingerprint to prevent replay.
   */
  issue(params: IssueParams): { token: string; expiresAt: string } {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.tokenTtlMs);

    const payload: TokenData = {
      siteId: params.siteId,
      challengeId: params.challengeId,
      ipAddress: params.ipAddress,
      fingerprintHash: params.fingerprintHash,
      riskScore: params.riskScore,
      action: params.action,
      issuedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString(
      'base64url',
    );
    const signature = this.sign(payloadB64);
    const token = `${payloadB64}.${signature}`;

    return {
      token,
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Verify a token using constant-time comparison.
   */
  verify(token: string, expectedSiteId: string): VerifyResult {
    const parts = token.split('.');
    if (parts.length !== 2) {
      return { valid: false, reason: 'Invalid token format' };
    }

    const [payloadB64, providedSignature] = parts;

    // Constant-time signature verification
    const expectedSignature = this.sign(payloadB64);
    if (!this.constantTimeEqual(providedSignature, expectedSignature)) {
      return { valid: false, reason: 'Invalid token signature' };
    }

    // Decode payload
    let data: TokenData;
    try {
      const decoded = Buffer.from(payloadB64, 'base64url').toString('utf-8');
      data = JSON.parse(decoded);
    } catch {
      return { valid: false, reason: 'Malformed token payload' };
    }

    // Check expiration
    if (new Date() > new Date(data.expiresAt)) {
      return { valid: false, reason: 'Token has expired' };
    }

    // Check site ownership
    if (data.siteId !== expectedSiteId) {
      return { valid: false, reason: 'Token does not belong to this site' };
    }

    return { valid: true, data };
  }

  private sign(data: string): string {
    return createHmac('sha256', this.secret).update(data).digest('base64url');
  }

  /**
   * Constant-time string comparison to prevent timing attacks.
   */
  private constantTimeEqual(a: string, b: string): boolean {
    const maxLen = Math.max(a.length, b.length);
    const bufA = Buffer.alloc(maxLen);
    const bufB = Buffer.alloc(maxLen);
    Buffer.from(a).copy(bufA);
    Buffer.from(b).copy(bufB);
    return timingSafeEqual(bufA, bufB) && a.length === b.length;
  }
}
