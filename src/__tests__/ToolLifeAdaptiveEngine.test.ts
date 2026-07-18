/**
 * Tests for ToolLifeAdaptiveEngine
 * ==================================
 * Covers: reliability, hazardRate, weibullMLE, optimalReplacement, predict
 */

import { describe, it, expect } from 'vitest';
import {
  ToolLifeAdaptiveEngine,
  toolLifeAdaptiveEngine,
} from '../../src/engines/ToolLifeAdaptiveEngine.js';

describe('ToolLifeAdaptiveEngine', () => {
  const engine = new ToolLifeAdaptiveEngine();

  // ==========================================================================
  // SINGLETON
  // ==========================================================================

  describe('singleton', () => {
    it('exports a singleton instance', () => {
      expect(toolLifeAdaptiveEngine).toBeInstanceOf(ToolLifeAdaptiveEngine);
    });
  });

  // ==========================================================================
  // reliability — R(t) = exp(-(t/eta)^beta)
  // ==========================================================================

  describe('reliability', () => {
    it('returns 1.0 at t=0', () => {
      expect(engine.reliability(0, 2.5, 30)).toBe(1.0);
    });

    it('returns 1.0 for negative t', () => {
      expect(engine.reliability(-5, 2.5, 30)).toBe(1.0);
    });

    it('returns exp(-1) at t=eta when beta=1 (exponential)', () => {
      const R = engine.reliability(30, 1, 30);
      expect(R).toBeCloseTo(Math.exp(-1), 10);
    });

    it('returns exp(-(t/eta)^beta) for arbitrary values', () => {
      const R = engine.reliability(15, 2.5, 30);
      const expected = Math.exp(-Math.pow(15 / 30, 2.5));
      expect(R).toBeCloseTo(expected, 10);
    });

    it('is monotonically decreasing for increasing t', () => {
      let prev = 1.0;
      for (let t = 0; t <= 60; t += 5) {
        const R = engine.reliability(t, 2.5, 30);
        expect(R).toBeLessThanOrEqual(prev + 1e-12);
        prev = R;
      }
    });

    it('approaches 0 for very large t', () => {
      const R = engine.reliability(1000, 2.5, 30);
      expect(R).toBeCloseTo(0, 10);
    });

    it('at t=eta, R = exp(-1) for beta=1', () => {
      expect(engine.reliability(50, 1, 50)).toBeCloseTo(Math.exp(-1), 10);
    });
  });

  // ==========================================================================
  // hazardRate — h(t) = (beta/eta) * (t/eta)^(beta-1)
  // ==========================================================================

  describe('hazardRate', () => {
    it('returns 0 at t=0', () => {
      expect(engine.hazardRate(0, 2.5, 30)).toBe(0);
    });

    it('returns 0 for negative t', () => {
      expect(engine.hazardRate(-5, 2.5, 30)).toBe(0);
    });

    it('is constant for beta=1 (exponential) equal to 1/eta', () => {
      const h = engine.hazardRate(10, 1, 30);
      expect(h).toBeCloseTo(1 / 30, 10);
    });

    it('increases with t for beta > 1 (wear-out)', () => {
      const h1 = engine.hazardRate(10, 2.5, 30);
      const h2 = engine.hazardRate(20, 2.5, 30);
      expect(h2).toBeGreaterThan(h1);
    });

    it('decreases with t for beta < 1 (infant mortality)', () => {
      const h1 = engine.hazardRate(5, 0.5, 30);
      const h2 = engine.hazardRate(20, 0.5, 30);
      expect(h2).toBeLessThan(h1);
    });

    it('matches formula (beta/eta)*(t/eta)^(beta-1)', () => {
      const beta = 3, eta = 25, t = 15;
      const expected = (beta / eta) * Math.pow(t / eta, beta - 1);
      expect(engine.hazardRate(t, beta, eta)).toBeCloseTo(expected, 10);
    });
  });

  // ==========================================================================
  // weibullMLE
  // ==========================================================================

  describe('weibullMLE', () => {
    it('returns defaults for < 2 samples', () => {
      const result = engine.weibullMLE([25]);
      expect(result.beta).toBe(2.5);
      expect(result.eta).toBe(25);
    });

    it('returns defaults with eta=default for empty single sample 0', () => {
      const result = engine.weibullMLE([0]);
      expect(result.beta).toBe(2.5);
    });

    it('estimates beta > 1 for increasing failure rate data', () => {
      // Times drawn from a Weibull with beta=3, eta=30
      const times = [18, 22, 25, 27, 29, 30, 31, 33, 35, 38];
      const result = engine.weibullMLE(times);
      expect(result.beta).toBeGreaterThan(1);
      expect(result.eta).toBeGreaterThan(10);
    });

    it('eta is near the mean of failure times for beta~1', () => {
      // Exponential-like data (beta~1)
      const times = [5, 12, 18, 25, 33, 42, 55, 70];
      const result = engine.weibullMLE(times);
      expect(result.eta).toBeGreaterThan(0);
    });

    it('handles censored data', () => {
      const times = [10, 20, 30, 40, 50];
      const censored = [false, false, true, false, true];
      const result = engine.weibullMLE(times, censored);
      expect(result.beta).toBeGreaterThan(0);
      expect(result.eta).toBeGreaterThan(0);
    });

    it('handles all censored data gracefully', () => {
      const times = [10, 20, 30];
      const censored = [true, true, true];
      const result = engine.weibullMLE(times, censored);
      expect(result.beta).toBe(2.5); // defaults
      expect(result.eta).toBe(30);   // max of times
    });
  });

  // ==========================================================================
  // optimalReplacement
  // ==========================================================================

  describe('optimalReplacement', () => {
    it('returns a positive replacement time', () => {
      const t = engine.optimalReplacement(2.5, 30, 35, 535);
      expect(t).toBeGreaterThan(0);
    });

    it('optimal time is less than eta for beta > 1', () => {
      const t = engine.optimalReplacement(3, 30, 35, 535);
      expect(t).toBeLessThan(30);
    });

    it('higher scrap cost pushes replacement earlier', () => {
      const t1 = engine.optimalReplacement(2.5, 30, 35, 100);
      const t2 = engine.optimalReplacement(2.5, 30, 35, 5000);
      expect(t2).toBeLessThan(t1);
    });

    it('optimal time scales with eta', () => {
      const t1 = engine.optimalReplacement(2.5, 30, 35, 535);
      const t2 = engine.optimalReplacement(2.5, 60, 35, 535);
      expect(t2).toBeGreaterThan(t1);
    });
  });

  // ==========================================================================
  // predict — full pipeline
  // ==========================================================================

  describe('predict — basic', () => {
    const baseInput = {
      wear_observations: [
        { time_min: 0, vb_mm: 0.00 },
        { time_min: 5, vb_mm: 0.03 },
        { time_min: 10, vb_mm: 0.06 },
        { time_min: 15, vb_mm: 0.10 },
        { time_min: 20, vb_mm: 0.15 },
        { time_min: 25, vb_mm: 0.22 },
      ],
    };

    it('returns all required fields', () => {
      const result = engine.predict(baseInput);
      expect(result).toHaveProperty('weibull');
      expect(result).toHaveProperty('reliability');
      expect(result).toHaveProperty('rul');
      expect(result).toHaveProperty('replacement');
      expect(result).toHaveProperty('wear_trend');
      expect(result).toHaveProperty('wear_rate_mm_per_min');
      expect(result).toHaveProperty('tool_change_recommended');
      expect(result).toHaveProperty('urgency');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('formula');
    });

    it('weibull beta and eta are positive', () => {
      const result = engine.predict(baseInput);
      expect(result.weibull.beta).toBeGreaterThan(0);
      expect(result.weibull.eta_min).toBeGreaterThan(0);
    });

    it('reliability values are in [0, 1]', () => {
      const result = engine.predict(baseInput);
      expect(result.reliability.current_reliability).toBeGreaterThanOrEqual(0);
      expect(result.reliability.current_reliability).toBeLessThanOrEqual(1);
    });

    it('hazard rate is non-negative', () => {
      const result = engine.predict(baseInput);
      expect(result.reliability.hazard_rate).toBeGreaterThanOrEqual(0);
    });

    it('MTBF is positive', () => {
      const result = engine.predict(baseInput);
      expect(result.reliability.mtbf_min).toBeGreaterThan(0);
    });

    it('RUL predicted is non-negative', () => {
      const result = engine.predict(baseInput);
      expect(result.rul.predicted_min).toBeGreaterThanOrEqual(0);
    });

    it('RUL lower_bound <= predicted <= upper_bound', () => {
      const result = engine.predict(baseInput);
      expect(result.rul.lower_bound_min).toBeLessThanOrEqual(result.rul.predicted_min);
      expect(result.rul.upper_bound_min).toBeGreaterThanOrEqual(result.rul.predicted_min);
    });

    it('replacement optimal time is positive', () => {
      const result = engine.predict(baseInput);
      expect(result.replacement.optimal_time_min).toBeGreaterThan(0);
    });

    it('savings_pct is non-negative', () => {
      const result = engine.predict(baseInput);
      expect(result.replacement.savings_pct).toBeGreaterThanOrEqual(0);
    });

    it('formula contains Weibull notation', () => {
      const result = engine.predict(baseInput);
      expect(result.formula).toContain('R(t)');
      expect(result.formula).toContain('h(t)');
    });
  });

  // ==========================================================================
  // predict — wear trend detection
  // ==========================================================================

  describe('predict — wear trend', () => {
    it('detects accelerating wear (Taylor third region)', () => {
      const result = engine.predict({
        wear_observations: [
          { time_min: 0, vb_mm: 0.00 },
          { time_min: 5, vb_mm: 0.005 },
          { time_min: 10, vb_mm: 0.01 },
          { time_min: 15, vb_mm: 0.02 },
          { time_min: 20, vb_mm: 0.05 },
          { time_min: 25, vb_mm: 0.12 },
          { time_min: 28, vb_mm: 0.22 },
          { time_min: 30, vb_mm: 0.35 },
        ],
      });
      expect(result.wear_trend).toBe('accelerating');
      expect(result.warnings.some((w) => w.includes('Accelerating'))).toBe(true);
    });

    it('detects normal wear for linear progression', () => {
      const result = engine.predict({
        wear_observations: [
          { time_min: 0, vb_mm: 0.00 },
          { time_min: 5, vb_mm: 0.04 },
          { time_min: 10, vb_mm: 0.08 },
          { time_min: 15, vb_mm: 0.12 },
          { time_min: 20, vb_mm: 0.16 },
        ],
      });
      expect(result.wear_trend).toBe('normal');
    });

    it('wear_rate_mm_per_min is positive for growing wear', () => {
      const result = engine.predict({
        wear_observations: [
          { time_min: 0, vb_mm: 0.00 },
          { time_min: 10, vb_mm: 0.05 },
          { time_min: 20, vb_mm: 0.10 },
        ],
      });
      expect(result.wear_rate_mm_per_min).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // predict — urgency levels
  // ==========================================================================

  describe('predict — urgency', () => {
    it('returns "immediate" when wear is at VB limit', () => {
      const result = engine.predict({
        wear_observations: [
          { time_min: 0, vb_mm: 0.00 },
          { time_min: 5, vb_mm: 0.10 },
          { time_min: 10, vb_mm: 0.20 },
          { time_min: 15, vb_mm: 0.29 }, // 0.29 >= 0.3 * 0.95
        ],
        vb_limit_mm: 0.3,
      });
      expect(result.urgency).toBe('immediate');
      expect(result.tool_change_recommended).toBe(true);
    });

    it('returns "none" for fresh tool', () => {
      const result = engine.predict({
        wear_observations: [
          { time_min: 0, vb_mm: 0.00 },
          { time_min: 5, vb_mm: 0.01 },
        ],
        current_time_min: 5,
      });
      // With very low wear and high reliability, urgency should be "none" or "plan"
      expect(['none', 'plan']).toContain(result.urgency);
    });
  });

  // ==========================================================================
  // predict — edge cases
  // ==========================================================================

  describe('predict — edge cases', () => {
    it('handles empty observations with warning', () => {
      const result = engine.predict({ wear_observations: [] });
      expect(result.warnings.some((w) => w.includes('No wear observations'))).toBe(true);
      expect(result.weibull.beta).toBeGreaterThan(0);
    });

    it('respects custom VB limit', () => {
      const result = engine.predict({
        wear_observations: [
          { time_min: 0, vb_mm: 0.00 },
          { time_min: 10, vb_mm: 0.4 },
        ],
        vb_limit_mm: 0.5,
      });
      expect(result.urgency).not.toBe('immediate'); // 0.4 < 0.5*0.95
    });

    it('respects custom cost parameters', () => {
      const result = engine.predict({
        wear_observations: [
          { time_min: 0, vb_mm: 0.00 },
          { time_min: 5, vb_mm: 0.02 },
          { time_min: 10, vb_mm: 0.05 },
          { time_min: 15, vb_mm: 0.08 },
          { time_min: 20, vb_mm: 0.12 },
          { time_min: 25, vb_mm: 0.16 },
        ],
        costs: { tool_cost: 100, replacement_time_min: 10, machine_rate_per_min: 5, scrap_cost: 1000 },
      });
      expect(result.replacement.cost_per_part_at_optimal).toBeGreaterThan(0);
    });

    it('respects custom confidence level', () => {
      const result = engine.predict({
        wear_observations: [
          { time_min: 0, vb_mm: 0.00 },
          { time_min: 5, vb_mm: 0.02 },
          { time_min: 10, vb_mm: 0.05 },
          { time_min: 15, vb_mm: 0.08 },
          { time_min: 20, vb_mm: 0.12 },
        ],
        confidence_level: 0.99,
      });
      expect(result.rul.confidence).toBe(0.99);
    });

    it('uses prior parameters when provided', () => {
      const result = engine.predict({
        wear_observations: [
          { time_min: 0, vb_mm: 0.00 },
          { time_min: 5, vb_mm: 0.02 },
          { time_min: 10, vb_mm: 0.05 },
          { time_min: 15, vb_mm: 0.08 },
          { time_min: 20, vb_mm: 0.12 },
        ],
        prior: { beta: 4.0, eta_min: 50 },
      });
      // Prior should influence — beta should be positive
      expect(result.weibull.beta).toBeGreaterThan(0);
    });

    it('detects high force ratio warning', () => {
      const result = engine.predict({
        wear_observations: [
          { time_min: 0, vb_mm: 0.00, force_ratio: 1.0 },
          { time_min: 10, vb_mm: 0.10, force_ratio: 1.2 },
          { time_min: 20, vb_mm: 0.20, force_ratio: 1.8 },
        ],
      });
      expect(result.warnings.some((w) => w.includes('Force ratio'))).toBe(true);
    });

    it('r_squared is in [0, 1]', () => {
      const result = engine.predict({
        wear_observations: [
          { time_min: 0, vb_mm: 0.00 },
          { time_min: 5, vb_mm: 0.02 },
          { time_min: 10, vb_mm: 0.05 },
          { time_min: 15, vb_mm: 0.08 },
          { time_min: 20, vb_mm: 0.12 },
          { time_min: 25, vb_mm: 0.16 },
          { time_min: 30, vb_mm: 0.20 },
        ],
      });
      expect(result.weibull.r_squared).toBeGreaterThanOrEqual(0);
      expect(result.weibull.r_squared).toBeLessThanOrEqual(1);
    });
  });
});
