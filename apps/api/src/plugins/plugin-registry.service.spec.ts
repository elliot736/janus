import { PluginRegistryService } from './plugin-registry.service';
import type { RiskPlugin, RiskPluginContext } from './risk-plugin.interface';

describe('PluginRegistryService', () => {
  let registry: PluginRegistryService;

  const baseContext: RiskPluginContext = {
    siteId: 'site-1',
    ipAddress: '1.2.3.4',
    countryCode: 'US',
    isDatacenter: false,
    isVpn: false,
    isProxy: false,
    asn: null,
    asnOrg: null,
    fingerprintHash: 'fp-hash',
    solveTimeMs: 2000,
    behaviorData: null,
    mode: 'invisible',
    ja3Hash: 'ja3',
    currentScore: 50,
    currentAnomalies: [],
  };

  beforeEach(() => {
    registry = new PluginRegistryService();
  });

  function makePlugin(overrides: Partial<RiskPlugin> = {}): RiskPlugin {
    return {
      name: overrides.name ?? 'test-plugin',
      description: overrides.description ?? 'Test plugin',
      priority: overrides.priority ?? 100,
      evaluate: overrides.evaluate ?? jest.fn().mockReturnValue({ scoreAdjustment: 0 }),
    };
  }

  describe('registerGlobal()', () => {
    it('should register a plugin', () => {
      registry.registerGlobal(makePlugin());
      const list = registry.listPlugins();
      expect(list.global).toHaveLength(1);
      expect(list.global[0]!.name).toBe('test-plugin');
    });

    it('should not register duplicate names', () => {
      registry.registerGlobal(makePlugin());
      registry.registerGlobal(makePlugin());
      expect(registry.listPlugins().global).toHaveLength(1);
    });

    it('should sort by priority', () => {
      registry.registerGlobal(makePlugin({ name: 'low', priority: 200 }));
      registry.registerGlobal(makePlugin({ name: 'high', priority: 10 }));
      const list = registry.listPlugins();
      expect(list.global[0]!.name).toBe('high');
      expect(list.global[1]!.name).toBe('low');
    });
  });

  describe('registerForSite()', () => {
    it('should register a site-scoped plugin', () => {
      registry.registerForSite('site-1', makePlugin());
      const list = registry.listPlugins();
      expect(list.sites['site-1']).toHaveLength(1);
    });

    it('should not register duplicate names for same site', () => {
      registry.registerForSite('site-1', makePlugin());
      registry.registerForSite('site-1', makePlugin());
      expect(registry.listPlugins().sites['site-1']).toHaveLength(1);
    });
  });

  describe('unregisterGlobal()', () => {
    it('should remove a registered plugin', () => {
      registry.registerGlobal(makePlugin());
      expect(registry.unregisterGlobal('test-plugin')).toBe(true);
      expect(registry.listPlugins().global).toHaveLength(0);
    });

    it('should return false for unknown plugin', () => {
      expect(registry.unregisterGlobal('nonexistent')).toBe(false);
    });
  });

  describe('unregisterForSite()', () => {
    it('should remove a site-scoped plugin', () => {
      registry.registerForSite('site-1', makePlugin());
      expect(registry.unregisterForSite('site-1', 'test-plugin')).toBe(true);
      expect(registry.listPlugins().sites['site-1']).toBeUndefined();
    });

    it('should return false for unknown site', () => {
      expect(registry.unregisterForSite('unknown', 'test-plugin')).toBe(false);
    });
  });

  describe('execute()', () => {
    it('should return zero adjustment when no plugins registered', async () => {
      const result = await registry.execute('site-1', baseContext);
      expect(result.totalAdjustment).toBe(0);
      expect(result.anomalies).toEqual([]);
    });

    it('should accumulate score adjustments from multiple plugins', async () => {
      registry.registerGlobal(makePlugin({
        name: 'plugin-a',
        evaluate: () => ({ scoreAdjustment: 10, anomalies: ['a'] }),
      }));
      registry.registerGlobal(makePlugin({
        name: 'plugin-b',
        evaluate: () => ({ scoreAdjustment: 5, anomalies: ['b'] }),
      }));

      const result = await registry.execute('site-1', baseContext);
      expect(result.totalAdjustment).toBe(15);
      expect(result.anomalies).toEqual(['a', 'b']);
    });

    it('should include site-scoped plugins', async () => {
      registry.registerGlobal(makePlugin({
        name: 'global',
        evaluate: () => ({ scoreAdjustment: 5 }),
      }));
      registry.registerForSite('site-1', makePlugin({
        name: 'site-only',
        evaluate: () => ({ scoreAdjustment: 10, anomalies: ['site_specific'] }),
      }));

      const result = await registry.execute('site-1', baseContext);
      expect(result.totalAdjustment).toBe(15);
      expect(result.anomalies).toContain('site_specific');
    });

    it('should not include other site plugins', async () => {
      registry.registerForSite('site-2', makePlugin({
        name: 'other-site',
        evaluate: () => ({ scoreAdjustment: 99 }),
      }));

      const result = await registry.execute('site-1', baseContext);
      expect(result.totalAdjustment).toBe(0);
    });

    it('should clamp individual plugin adjustment to [-50, +50]', async () => {
      registry.registerGlobal(makePlugin({
        name: 'extreme',
        evaluate: () => ({ scoreAdjustment: 200 }),
      }));

      const result = await registry.execute('site-1', baseContext);
      expect(result.totalAdjustment).toBe(50);
    });

    it('should clamp negative adjustments too', async () => {
      registry.registerGlobal(makePlugin({
        name: 'generous',
        evaluate: () => ({ scoreAdjustment: -200 }),
      }));

      const result = await registry.execute('site-1', baseContext);
      expect(result.totalAdjustment).toBe(-50);
    });

    it('should handle plugin errors gracefully', async () => {
      registry.registerGlobal(makePlugin({
        name: 'broken',
        evaluate: () => { throw new Error('crash'); },
      }));
      registry.registerGlobal(makePlugin({
        name: 'healthy',
        evaluate: () => ({ scoreAdjustment: 5 }),
      }));

      const result = await registry.execute('site-1', baseContext);
      expect(result.totalAdjustment).toBe(5);
    });

    it('should handle async plugins', async () => {
      registry.registerGlobal(makePlugin({
        name: 'async-plugin',
        evaluate: async () => {
          await new Promise((r) => setTimeout(r, 1));
          return { scoreAdjustment: 7, anomalies: ['async_check'] };
        },
      }));

      const result = await registry.execute('site-1', baseContext);
      expect(result.totalAdjustment).toBe(7);
      expect(result.anomalies).toContain('async_check');
    });

    it('should execute in priority order', async () => {
      const order: string[] = [];

      registry.registerGlobal(makePlugin({
        name: 'second',
        priority: 20,
        evaluate: () => { order.push('second'); return { scoreAdjustment: 0 }; },
      }));
      registry.registerGlobal(makePlugin({
        name: 'first',
        priority: 10,
        evaluate: () => { order.push('first'); return { scoreAdjustment: 0 }; },
      }));

      await registry.execute('site-1', baseContext);
      expect(order).toEqual(['first', 'second']);
    });

    it('should pass updated score to subsequent plugins', async () => {
      let capturedScore = 0;

      registry.registerGlobal(makePlugin({
        name: 'adder',
        priority: 10,
        evaluate: () => ({ scoreAdjustment: 20 }),
      }));
      registry.registerGlobal(makePlugin({
        name: 'reader',
        priority: 20,
        evaluate: (ctx) => { capturedScore = ctx.currentScore; return { scoreAdjustment: 0 }; },
      }));

      await registry.execute('site-1', baseContext);
      // baseContext.currentScore is 50, first plugin adds 20 = 70
      expect(capturedScore).toBe(70);
    });
  });

  describe('listPlugins()', () => {
    it('should list global and site plugins', () => {
      registry.registerGlobal(makePlugin({ name: 'g1' }));
      registry.registerForSite('s1', makePlugin({ name: 'p1' }));
      registry.registerForSite('s1', makePlugin({ name: 'p2' }));

      const list = registry.listPlugins();
      expect(list.global).toHaveLength(1);
      expect(list.sites['s1']).toHaveLength(2);
    });
  });
});
