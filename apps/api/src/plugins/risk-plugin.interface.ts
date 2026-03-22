/**
 * Context passed to every risk plugin during scoring.
 * Contains all available signals — plugins pick what they need.
 */
export interface RiskPluginContext {
  /** Site ID being verified */
  siteId: string;
  /** Client IP address */
  ipAddress: string;
  /** GeoIP country code (null if GeoIP disabled) */
  countryCode: string | null;
  /** Whether the IP is from a known datacenter */
  isDatacenter: boolean;
  /** Whether a VPN was detected */
  isVpn: boolean;
  /** Whether a proxy was detected */
  isProxy: boolean;
  /** ASN number (null if GeoIP disabled) */
  asn: number | null;
  /** ASN organization name */
  asnOrg: string | null;
  /** Browser fingerprint hash */
  fingerprintHash: string | null;
  /** PoW solve time in milliseconds */
  solveTimeMs: number | null;
  /** Behavioral data from the SDK */
  behaviorData: Record<string, unknown> | null;
  /** Detection mode (invisible/managed) */
  mode: string | null;
  /** JA3 TLS fingerprint hash */
  ja3Hash: string | null;
  /** Current accumulated risk score before this plugin */
  currentScore: number;
  /** Current anomalies list before this plugin */
  currentAnomalies: string[];
}

/**
 * Result returned by a risk plugin.
 * Plugins return a score adjustment and optional anomalies.
 */
export interface RiskPluginResult {
  /** Score adjustment (positive = riskier, negative = safer). Clamped to [-50, +50]. */
  scoreAdjustment: number;
  /** Anomaly strings to add to the verification record */
  anomalies?: string[];
}

/**
 * Risk plugin interface.
 *
 * Plugins are executed in priority order (lower = first) after the
 * built-in scoring engine. Each plugin receives the full verification
 * context and returns a score adjustment.
 *
 * Plugins can be:
 * - **Global**: run on every verification across all sites
 * - **Site-scoped**: run only for specific sites (configured in site settings)
 *
 * Example: IP blocklist plugin
 * ```typescript
 * {
 *   name: 'ip-blocklist',
 *   description: 'Check IP against internal blocklist',
 *   priority: 10,
 *   evaluate: async (ctx) => {
 *     const blocked = await myBlocklist.check(ctx.ipAddress);
 *     return blocked
 *       ? { scoreAdjustment: 40, anomalies: ['ip_blocklisted'] }
 *       : { scoreAdjustment: 0 };
 *   },
 * }
 * ```
 */
export interface RiskPlugin {
  /** Unique plugin name (kebab-case, e.g., 'ip-blocklist') */
  name: string;
  /** Human-readable description */
  description: string;
  /** Execution priority (lower = runs first, default: 100) */
  priority?: number;
  /** Evaluate the risk context and return a score adjustment */
  evaluate(context: RiskPluginContext): Promise<RiskPluginResult> | RiskPluginResult;
}
