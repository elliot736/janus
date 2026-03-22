import type { RiskPlugin, RiskPluginContext, RiskPluginResult } from '../risk-plugin.interface';

/**
 * Built-in plugin: penalizes IPs that have accumulated high risk scores
 * across multiple recent verifications (repeat offenders).
 *
 * This is a stateless example — in production, you'd check Redis/DB
 * for the IP's recent history.
 */
export const rateAbusePlugin: RiskPlugin = {
  name: 'rate-abuse-detector',
  description: 'Penalizes requests that already show multiple risk signals',
  priority: 50,
  evaluate(context: RiskPluginContext): RiskPluginResult {
    // If the current score is already high and the IP is from a datacenter,
    // this is likely an automated attack — apply additional penalty
    if (context.currentScore >= 60 && context.isDatacenter) {
      return {
        scoreAdjustment: 15,
        anomalies: ['repeat_offender_datacenter'],
      };
    }

    // If the current score is very high with multiple anomalies,
    // add a compounding penalty
    if (context.currentScore >= 70 && context.currentAnomalies.length >= 3) {
      return {
        scoreAdjustment: 10,
        anomalies: ['multi_signal_compound'],
      };
    }

    return { scoreAdjustment: 0 };
  },
};
