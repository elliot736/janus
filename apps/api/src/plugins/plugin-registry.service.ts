import { Injectable, Logger } from '@nestjs/common';
import type { RiskPlugin, RiskPluginContext, RiskPluginResult } from './risk-plugin.interface';

/** Maximum score adjustment a single plugin can apply */
const MAX_PLUGIN_ADJUSTMENT = 50;

@Injectable()
export class PluginRegistryService {
  private readonly logger = new Logger(PluginRegistryService.name);
  private readonly globalPlugins: RiskPlugin[] = [];
  private readonly sitePlugins = new Map<string, RiskPlugin[]>();

  /**
   * Register a global plugin that runs on every verification.
   */
  registerGlobal(plugin: RiskPlugin): void {
    if (this.globalPlugins.some((p) => p.name === plugin.name)) {
      this.logger.warn(`Global plugin "${plugin.name}" already registered — skipping`);
      return;
    }
    this.globalPlugins.push(plugin);
    this.sortPlugins(this.globalPlugins);
    this.logger.log(`Registered global risk plugin: ${plugin.name}`);
  }

  /**
   * Register a plugin scoped to a specific site.
   */
  registerForSite(siteId: string, plugin: RiskPlugin): void {
    const existing = this.sitePlugins.get(siteId) ?? [];
    if (existing.some((p) => p.name === plugin.name)) {
      this.logger.warn(`Plugin "${plugin.name}" already registered for site ${siteId} — skipping`);
      return;
    }
    existing.push(plugin);
    this.sortPlugins(existing);
    this.sitePlugins.set(siteId, existing);
    this.logger.log(`Registered risk plugin "${plugin.name}" for site ${siteId}`);
  }

  /**
   * Unregister a global plugin by name.
   */
  unregisterGlobal(pluginName: string): boolean {
    const index = this.globalPlugins.findIndex((p) => p.name === pluginName);
    if (index === -1) return false;
    this.globalPlugins.splice(index, 1);
    this.logger.log(`Unregistered global risk plugin: ${pluginName}`);
    return true;
  }

  /**
   * Unregister a site-scoped plugin by name.
   */
  unregisterForSite(siteId: string, pluginName: string): boolean {
    const plugins = this.sitePlugins.get(siteId);
    if (!plugins) return false;
    const index = plugins.findIndex((p) => p.name === pluginName);
    if (index === -1) return false;
    plugins.splice(index, 1);
    if (plugins.length === 0) this.sitePlugins.delete(siteId);
    this.logger.log(`Unregistered risk plugin "${pluginName}" for site ${siteId}`);
    return true;
  }

  /**
   * Execute all applicable plugins for a verification.
   * Returns the total score adjustment and collected anomalies.
   */
  async execute(
    siteId: string,
    context: RiskPluginContext,
  ): Promise<{ totalAdjustment: number; anomalies: string[] }> {
    const plugins = [
      ...this.globalPlugins,
      ...(this.sitePlugins.get(siteId) ?? []),
    ];

    if (plugins.length === 0) {
      return { totalAdjustment: 0, anomalies: [] };
    }

    // Re-sort merged list by priority
    plugins.sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));

    let totalAdjustment = 0;
    const anomalies: string[] = [];

    for (const plugin of plugins) {
      try {
        const result: RiskPluginResult = await plugin.evaluate({
          ...context,
          currentScore: context.currentScore + totalAdjustment,
          currentAnomalies: [...context.currentAnomalies, ...anomalies],
        });

        // Clamp individual plugin adjustments
        const clamped = Math.max(
          -MAX_PLUGIN_ADJUSTMENT,
          Math.min(MAX_PLUGIN_ADJUSTMENT, result.scoreAdjustment),
        );
        totalAdjustment += clamped;

        if (result.anomalies?.length) {
          anomalies.push(...result.anomalies);
        }
      } catch (err) {
        this.logger.error(
          `Risk plugin "${plugin.name}" failed: ${(err as Error).message}`,
        );
        // Plugin failures don't block verification
      }
    }

    return { totalAdjustment, anomalies };
  }

  /**
   * List all registered plugins (for dashboard/API).
   */
  listPlugins(): { global: PluginInfo[]; sites: Record<string, PluginInfo[]> } {
    const toInfo = (p: RiskPlugin): PluginInfo => ({
      name: p.name,
      description: p.description,
      priority: p.priority ?? 100,
    });

    const sites: Record<string, PluginInfo[]> = {};
    for (const [siteId, plugins] of this.sitePlugins) {
      sites[siteId] = plugins.map(toInfo);
    }

    return {
      global: this.globalPlugins.map(toInfo),
      sites,
    };
  }

  private sortPlugins(plugins: RiskPlugin[]): void {
    plugins.sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));
  }
}

interface PluginInfo {
  name: string;
  description: string;
  priority: number;
}
