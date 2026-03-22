import { type NextRequest, NextResponse } from "next/server";

export interface SiteVerifyResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string | null;
  action?: string;
  risk_score?: number;
  error?: string;
  "error-codes"?: string[];
}

export interface JanusVerifyOptions {
  /** Your Janus secret key */
  secretKey: string;
  /** Base URL of your Janus API server */
  apiUrl: string;
}

/**
 * Verify a Janus token in a Next.js Server Action or Route Handler.
 *
 * ```typescript
 * // app/api/submit/route.ts
 * import { verifyJanusToken } from '@janus/nextjs/server';
 *
 * export async function POST(request: NextRequest) {
 *   const body = await request.json();
 *   const result = await verifyJanusToken(body['janus-token'], {
 *     secretKey: process.env.JANUS_SECRET_KEY!,
 *     apiUrl: process.env.JANUS_API_URL!,
 *   });
 *
 *   if (!result.success || result.action === 'block') {
 *     return NextResponse.json({ error: 'Bot detected' }, { status: 403 });
 *   }
 *
 *   // Process the form...
 * }
 * ```
 */
export async function verifyJanusToken(
  token: string,
  options: JanusVerifyOptions,
  remoteIp?: string,
): Promise<SiteVerifyResponse> {
  if (!token) {
    return { success: false, error: "Missing token" };
  }

  try {
    const response = await fetch(`${options.apiUrl}/api/v1/siteverify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: options.secretKey,
        token,
        remoteip: remoteIp,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    return await response.json();
  } catch (err) {
    return {
      success: false,
      error: `Verification request failed: ${(err as Error).message}`,
    };
  }
}

/**
 * Next.js middleware helper that verifies Janus tokens on protected routes.
 *
 * ```typescript
 * // middleware.ts
 * import { withJanusProtection } from '@janus/nextjs/server';
 *
 * export default withJanusProtection({
 *   secretKey: process.env.JANUS_SECRET_KEY!,
 *   apiUrl: process.env.JANUS_API_URL!,
 *   protectedPaths: ['/api/submit', '/api/contact'],
 * });
 * ```
 */
export function withJanusProtection(options: JanusVerifyOptions & {
  /** Paths that require Janus verification (POST requests only) */
  protectedPaths: string[];
  /** Actions to reject (default: ['block']) */
  rejectActions?: string[];
}) {
  const rejectActions = options.rejectActions ?? ["block"];

  return async (request: NextRequest) => {
    // Only check POST requests to protected paths
    if (request.method !== "POST") {
      return NextResponse.next();
    }

    const isProtected = options.protectedPaths.some((p) =>
      request.nextUrl.pathname.startsWith(p),
    );
    if (!isProtected) {
      return NextResponse.next();
    }

    try {
      const body = await request.clone().json();
      const token = body?.["janus-token"];

      if (!token) {
        return NextResponse.json(
          { error: "Missing janus-token" },
          { status: 403 },
        );
      }

      const ip = request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for") ?? undefined;
      const result = await verifyJanusToken(token, options, ip);

      if (!result.success || (result.action && rejectActions.includes(result.action))) {
        return NextResponse.json(
          { error: "Bot verification failed", action: result.action },
          { status: 403 },
        );
      }

      // Attach result as header for downstream route handlers
      const response = NextResponse.next();
      response.headers.set("x-janus-action", result.action ?? "unknown");
      response.headers.set("x-janus-risk-score", String(result.risk_score ?? -1));
      return response;
    } catch {
      // Don't block on verification errors — fail open for middleware
      return NextResponse.next();
    }
  };
}
