import { Request } from 'express';

/**
 * Extract client IP. Trust X-Real-IP only (set by Nginx from $remote_addr).
 * Never trust X-Forwarded-For directly — it's client-controlled.
 */
export function extractClientIp(request: Request): string {
  return (request.headers['x-real-ip'] as string) || request.ip || '0.0.0.0';
}
