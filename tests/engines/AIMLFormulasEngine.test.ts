import { describe, it, expect } from 'vitest';
import {
  aimlFormulasEngine,
  AIMLFormulasEngine,
} from '../../src/engines/AIMLFormulasEngine.js';

describe('AIMLFormulasEngine', () => {
  const engine = aimlFormulasEngine;

  it('exports a singleton instance', () => {
    expect(engine).toBeInstanceOf(AIMLFormulasEngine);
  });

  // ── featureImportance ───────────────────────────────────────────
  describe('featureImportance()', () => {
    it('computes permutation importance scores', () => {
      const r = engine.featureImportance({
        features: ['speed', 'feed', 'depth'],
        X: [
          [100, 0.1, 1], [200, 0.2, 2], [150, 0.15, 1.5],
          [120, 0.12, 1.2], [180, 0.18, 1.8], [160, 0.16, 1.6],
        ],
        y: [10, 20, 15, 12, 18, 16],
      });
      expect(r.importances).toBeDefined();
      expect(r.importances.length).toBe(3);
      expect(r.formula).toBeDefined();
    });
  });

  // ── modelSelection ──────────────────────────────────────────────
  describe('modelSelection()', () => {
    it('computes AIC and BIC', () => {
      const r = engine.modelSelection({
        residuals: [0.1, -0.2, 0.15, -0.05, 0.1, -0.1],
        n_params: 3,
        n_observations: 6,
      });
      expect(r.aic).toBeDefined();
      expect(r.bic).toBeDefined();
      expect(typeof r.aic).toBe('number');
      expect(r.formula).toContain('AIC');
    });
  });

  // ── anomalyDetection ───────────────────────────────────────────
  describe('anomalyDetection()', () => {
    it('detects anomalies via isolation forest score', () => {
      const normal = Array.from({ length: 20 }, (_, i) => [i, i * 2]);
      const withOutlier = [...normal, [100, 200]];
      const r = engine.anomalyDetection({
        data: withOutlier,
        contamination: 0.05,
      });
      expect(r.anomaly_scores).toBeDefined();
      expect(r.anomaly_indices).toBeDefined();
    });
  });

  // ── reinforcementLearning ──────────────────────────────────────
  describe('reinforcementLearning()', () => {
    it('performs Q-learning update', () => {
      const r = engine.reinforcementLearning({
        q_table: [[0, 0, 0], [0, 0, 0]],
        state: 0,
        action: 1,
        reward: 10,
        next_state: 1,
        alpha: 0.1,
        gamma: 0.9,
        epsilon: 0.1,
      });
      expect(r.updated_q_table).toBeDefined();
      expect(r.selected_action).toBeDefined();
      expect(r.formula).toContain('Q');
    });
  });

  // ── calculate dispatcher ────────────────────────────────────────
  it('dispatches via calculate()', () => {
    const r = engine.calculate({
      action: 'calc_model_selection',
      params: {
        residuals: [0.1, -0.2, 0.15],
        n_params: 2,
        n_observations: 3,
      },
    });
    expect(r).toBeDefined();
  });

  it('throws on unknown action', () => {
    expect(() => engine.calculate({
      action: 'bogus',
      params: {},
    })).toThrow();
  });
});
