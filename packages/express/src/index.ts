import type { Request, Response, NextFunction } from "express";

export interface SiteVerifyResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string | null;
  action?: string;
  risk_score?: number;
  error?: string;
  "error-codes"?: string[];
}

export interface JanusMiddlewareOptions {
  /** Your Janus secret key (server-side only) */
  secretKey: string;
  /** Base URL of your Janus API server */
  apiUrl: string;
  /**
   * How to extract the Janus token from the request.
   * Default: reads `req.body['janus-token']`
   */
  tokenExtractor?: (req: Request) => string | undefined;
  /**
   * Actions that should be rejected (default: ['block'])
   * Set to ['block', 'challenge'] to also reject challenged requests.
   */
  rejectActions?: string[];
  /**
   * Called when verification fails or action is rejected.
   * Default: responds with 403 JSON.
   */
  onReject?: (req: Request, res: Response, result: SiteVerifyResponse) => void;
  /**
   * Called when verification succeeds.
   * The verification result is attached to `req.janus`.
   */
  onVerify?: (req: Request, result: SiteVerifyResponse) => void;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      janus?: SiteVerifyResponse;
    }
  }
}

/**
 * Express middleware that validates Janus tokens server-side.
 *
 * ```typescript
 * import { janusVerify } from '@janus/express';
 *
 * app.post('/login',
 *   janusVerify({
 *     secretKey: process.env.JANUS_SECRET_KEY,
 *     apiUrl: 'https://janus.example.com',
 *   }),
 *   (req, res) => {
 *     // req.janus.success === true
 *     // req.janus.risk_score, req.janus.action available
 *   }
 * );
 * ```
 */
export function janusVerify(options: JanusMiddlewareOptions) {
  const {
    secretKey,
    apiUrl,
    tokenExtractor = (req) => req.body?.["janus-token"],
    rejectActions = ["block"],
    onReject = (_req, res, result) => {
      res.status(403).json({
        error: "Bot verification failed",
        details: result.error || result.action,
      });
    },
    onVerify,
  } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const token = tokenExtractor(req);

    if (!token) {
      const failResult: SiteVerifyResponse = {
        success: false,
        error: "Missing janus-token",
      };
      onReject(req, res, failResult);
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/api/v1/siteverify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: secretKey,
          token,
          remoteip: req.ip,
        }),
        signal: AbortSignal.timeout(10_000),
      });

      const result: SiteVerifyResponse = await response.json();

      // Attach to request for downstream handlers
      req.janus = result;

      if (!result.success || (result.action && rejectActions.includes(result.action))) {
        onReject(req, res, result);
        return;
      }

      if (onVerify) {
        onVerify(req, result);
      }

      next();
    } catch (err) {
      const failResult: SiteVerifyResponse = {
        success: false,
        error: `Janus verification request failed: ${(err as Error).message}`,
      };
      req.janus = failResult;
      onReject(req, res, failResult);
    }
  };
}

/**
 * Simple function to verify a Janus token without middleware.
 * Useful for non-Express contexts or manual verification.
 *
 * ```typescript
 * const result = await verifyToken({
 *   secretKey: process.env.JANUS_SECRET_KEY,
 *   apiUrl: 'https://janus.example.com',
 *   token: req.body['janus-token'],
 *   remoteIp: req.ip,
 * });
 * ```
 */
export async function verifyToken(params: {
  secretKey: string;
  apiUrl: string;
  token: string;
  remoteIp?: string;
}): Promise<SiteVerifyResponse> {
  const response = await fetch(`${params.apiUrl}/api/v1/siteverify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      secret: params.secretKey,
      token: params.token,
      remoteip: params.remoteIp,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  return response.json();
}
