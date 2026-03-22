export const KEY_PREFIXES = {
  SITE_KEY: 'jns_site_live_',
  SECRET_KEY: 'jns_secret_live_',
  API_KEY: 'jns_api_',
} as const;

export const RISK_THRESHOLDS = {
  ALLOW: 30,
  CHALLENGE: 60,
  BLOCK: 80,
} as const;

export const POW_DEFAULTS = {
  DIFFICULTY: 4,
  ALGORITHM: 'SHA-256',
  CHALLENGE_TTL_MS: 5 * 60 * 1000,
  TOKEN_TTL_MS: 5 * 60 * 1000,
} as const;

export const RATE_LIMITS = {
  IP_PER_MINUTE: 100,
  SITE_PER_MINUTE: 1000,
  FINGERPRINT_PER_MINUTE: 30,
} as const;

export const DETECTION_MODES = {
  INVISIBLE: 'invisible',
  MANAGED: 'managed',
} as const;
