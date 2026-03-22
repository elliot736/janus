import type { RiskPlugin, RiskPluginContext, RiskPluginResult } from '../risk-plugin.interface';

/**
 * Built-in plugin: adjusts risk based on time-of-day patterns.
 * Bot traffic often spikes during off-peak hours (2am-6am site-local time).
 *
 * This is a simple example — you can extend it with per-site timezone
 * configuration and historical traffic pattern analysis.
 */
export const timeOfDayPlugin: RiskPlugin = {
  name: 'time-of-day',
  description: 'Adjusts risk for off-peak hour traffic patterns',
  priority: 90,
  evaluate(_context: RiskPluginContext): RiskPluginResult {
    const hour = new Date().getUTCHours();

    // Off-peak hours (2am-6am UTC): slightly higher suspicion
    if (hour >= 2 && hour < 6) {
      return {
        scoreAdjustment: 5,
        anomalies: ['off_peak_hour'],
      };
    }

    return { scoreAdjustment: 0 };
  },
};
