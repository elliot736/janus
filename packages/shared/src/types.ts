export type DetectionMode = 'invisible' | 'managed';
export type VerificationAction = 'allow' | 'challenge' | 'block';
export type ChallengeStatus = 'pending' | 'solved' | 'expired';

export interface ChallengeResponse {
  challengeId: string;
  challenge: string;
  difficulty: number;
  mode: DetectionMode;
  algorithm: string;
  expiresAt: string;
}

export interface VerifyRequest {
  challengeId: string;
  nonce: string;
  solveTimeMs?: number;
  fingerprint?: Record<string, unknown>;
  behaviorData?: Record<string, unknown>;
}

export interface VerifyResponse {
  success: boolean;
  token: string;
  riskScore: number;
  action: VerificationAction;
  expiresAt?: string;
  error?: string;
}

export interface SiteVerifyRequest {
  secret: string;
  token: string;
  remoteip?: string;
}

export interface SiteVerifyResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string | null;
  action?: VerificationAction;
  risk_score?: number;
  error?: string;
  'error-codes'?: string[];
}

export interface SiteSettings {
  powDifficulty?: number;
  mode?: DetectionMode;
  riskThresholds?: {
    allow: number;
    challenge: number;
    block: number;
  };
  blockedCountries?: string[];
}
