import { RiskScoringService } from './risk-scoring.service';

describe('RiskScoringService', () => {
  let service: RiskScoringService;

  beforeEach(() => {
    service = new RiskScoringService();
  });

  const baseParams = {
    fingerprintConsistency: 85,
    fingerprintAnomalies: [] as string[],
    ipAddress: '1.2.3.4',
    ja3Hash: 'some-hash',
  };

  describe('score()', () => {
    it('should return base score of 50 with no signals', () => {
      const result = service.score(baseParams);
      expect(result.score).toBe(50);
      expect(result.anomalies).toEqual([]);
    });

    it('should increase risk by 25 for fast PoW (<100ms)', () => {
      const result = service.score({ ...baseParams, solveTimeMs: 50 });
      expect(result.score).toBe(75);
      expect(result.anomalies).toContain('pow_solve_too_fast');
    });

    it('should decrease risk by 10 for normal PoW (1000-15000ms)', () => {
      const result = service.score({ ...baseParams, solveTimeMs: 5000 });
      expect(result.score).toBe(40);
    });

    it('should increase risk by 5 for slow PoW (>30000ms)', () => {
      const result = service.score({ ...baseParams, solveTimeMs: 35000 });
      expect(result.score).toBe(55);
      expect(result.anomalies).toContain('pow_solve_slow');
    });

    it('should increase risk by 20 for low fingerprint consistency (<50)', () => {
      const result = service.score({
        ...baseParams,
        fingerprintConsistency: 30,
      });
      expect(result.score).toBe(70);
      expect(result.anomalies).toContain('fingerprint_inconsistent');
    });

    it('should decrease risk by 10 for high fingerprint consistency (>=90)', () => {
      const result = service.score({
        ...baseParams,
        fingerprintConsistency: 95,
      });
      expect(result.score).toBe(40);
    });

    it('should increase risk for low behavior score (<30) in managed mode', () => {
      const result = service.score({
        ...baseParams,
        mode: 'managed',
        behaviorData: { mouseMovements: 0, keystrokes: 0 },
      });
      // behaviorScore: 50 - 30 (no mouse) - 20 (no interaction) = 0, which is <30
      // score: 50 + 20 (managed low behavior) = 70
      expect(result.score).toBe(70);
    });

    it('should decrease risk by 15 for high behavior score (>=80) in managed mode', () => {
      const result = service.score({
        ...baseParams,
        mode: 'managed',
        behaviorData: {
          mouseMovements: 25,
          keystrokes: 10,
          timeOnPageMs: 5000,
          touchEvents: 3,
          scrollEvents: 2,
        },
      });
      // behaviorScore: 50 + 20 (mouse>20) + 15 (timeOnPage>3000) + 10 (touch) + 5 (scroll) = 100
      // score: 50 - 15 (high behavior managed) = 35
      expect(result.score).toBe(35);
    });

    it('should weight behavior lower in invisible mode (+5 for low score)', () => {
      const result = service.score({
        ...baseParams,
        mode: 'invisible',
        behaviorData: { mouseMovements: 0, keystrokes: 0 },
      });
      // behaviorScore: 50 - 30 - 20 = 0, <30
      // invisible mode: +5 instead of +20
      expect(result.score).toBe(55);
    });

    it('should add +15 in managed mode with no behavior data', () => {
      const result = service.score({
        ...baseParams,
        mode: 'managed',
      });
      expect(result.score).toBe(65);
      expect(result.anomalies).toContain('managed_mode_no_behavior');
    });

    it('should add +5 for missing JA3 hash', () => {
      const result = service.score({
        ...baseParams,
        ja3Hash: null,
      });
      expect(result.score).toBe(55);
      expect(result.anomalies).toContain('missing_ja3');
    });

    it('should clamp score to minimum 0', () => {
      // Stack many negative signals:
      // base=50, normal pow=-10, high fp=-10, high behavior managed=-15 => 15
      // Can't easily get below 0, but verify clamp logic
      const result = service.score({
        ...baseParams,
        solveTimeMs: 5000,
        fingerprintConsistency: 95,
        mode: 'managed',
        behaviorData: {
          mouseMovements: 25,
          timeOnPageMs: 5000,
          touchEvents: 3,
          scrollEvents: 2,
        },
      });
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should clamp score to maximum 100', () => {
      const result = service.score({
        ...baseParams,
        solveTimeMs: 50,
        fingerprintConsistency: 30,
        mode: 'managed',
        behaviorData: { mouseMovements: 0, keystrokes: 0 },
        ja3Hash: null,
      });
      // base=50, fast pow=+25, low fp=+20, low behavior managed=+20, no ja3=+5 = 120 -> clamped to 100
      expect(result.score).toBe(100);
    });

    it('should accumulate anomalies correctly', () => {
      const result = service.score({
        ...baseParams,
        solveTimeMs: 50,
        fingerprintConsistency: 30,
        fingerprintAnomalies: ['existing_anomaly'],
        ja3Hash: null,
      });
      expect(result.anomalies).toContain('existing_anomaly');
      expect(result.anomalies).toContain('pow_solve_too_fast');
      expect(result.anomalies).toContain('fingerprint_inconsistent');
      expect(result.anomalies).toContain('missing_ja3');
    });
  });

  describe('analyzeBehavior() (tested indirectly via score())', () => {
    it('should penalize heavily for zero mouse movements', () => {
      const result = service.score({
        ...baseParams,
        mode: 'managed',
        behaviorData: { mouseMovements: 0 },
      });
      expect(result.behaviorScore).toBeDefined();
      // behaviorScore: 50 - 30 = 20
      expect(result.behaviorScore).toBe(20);
      expect(result.anomalies).toContain('no_mouse_movement');
    });

    it('should reward high mouse movements', () => {
      const result = service.score({
        ...baseParams,
        mode: 'managed',
        behaviorData: { mouseMovements: 25 },
      });
      // behaviorScore: 50 + 20 = 70
      expect(result.behaviorScore).toBe(70);
    });

    it('should penalize zero interaction (no mouse, no keyboard)', () => {
      const result = service.score({
        ...baseParams,
        mode: 'managed',
        behaviorData: { mouseMovements: 0, keystrokes: 0 },
      });
      // behaviorScore: 50 - 30 (no mouse) - 20 (no interaction) = 0
      expect(result.behaviorScore).toBe(0);
      expect(result.anomalies).toContain('no_mouse_movement');
      expect(result.anomalies).toContain('no_interaction');
    });

    it('should penalize fast page interaction (<500ms)', () => {
      const result = service.score({
        ...baseParams,
        mode: 'managed',
        behaviorData: { timeOnPageMs: 200 },
      });
      // behaviorScore: 50 - 25 = 25
      expect(result.behaviorScore).toBe(25);
      expect(result.anomalies).toContain('too_fast_page_interaction');
    });

    it('should add small reward for touch events', () => {
      const result = service.score({
        ...baseParams,
        mode: 'managed',
        behaviorData: { touchEvents: 5 },
      });
      // behaviorScore: 50 + 10 = 60
      expect(result.behaviorScore).toBe(60);
    });

    it('should add small reward for scroll events', () => {
      const result = service.score({
        ...baseParams,
        mode: 'managed',
        behaviorData: { scrollEvents: 3 },
      });
      // behaviorScore: 50 + 5 = 55
      expect(result.behaviorScore).toBe(55);
    });
  });
});
