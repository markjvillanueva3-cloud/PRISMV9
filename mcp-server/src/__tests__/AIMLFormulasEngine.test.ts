import { describe, it, expect } from 'vitest';
import {
  aimlFormulasEngine,
  AIMLFormulasEngine,
} from '../engines/AIMLFormulasEngine.js';

describe('AIMLFormulasEngine', () => {
  const engine = aimlFormulasEngine;

  it('exports a singleton instance', () => {
    expect(engine).toBeInstanceOf(AIMLFormulasEngine);
  });

  // ── featureImportance ───────────────────────────────────────────
  describe('featureImportance()', () => {
    it('computes permutation importance scores', () => {
      const r = engine.featureImportance({
        feature_names: ['speed', 'feed', 'depth'],
        X: [
          [100, 0.1, 1], [200, 0.2, 2], [150, 0.15, 1.5],
          [120, 0.12, 1.2], [180, 0.18, 1.8], [160, 0.16, 1.6],
        ],
        y: [10, 20, 15, 12, 18, 16],
      });
      expect(r.importances).toBeDefined();
      expect(r.importances.length).toBe(3);
      expect(r.method).toBeDefined();
    });
  });

  // ── modelSelection ──────────────────────────────────────────────
  describe('modelSelection()', () => {
    it('computes AIC and BIC', () => {
      const r = engine.modelSelection({
        model_params: [2, 3],
        log_likelihoods: [-10, -8],
        n_observations: 6,
      });
      expect(r.aic).toBeDefined();
      expect(r.bic).toBeDefined();
      expect(typeof r.aic[0]).toBe('number');
      expect(r.best_aic_idx).toBeDefined();
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
      expect(r.scores).toBeDefined();
      expect(r.anomaly_indices).toBeDefined();
    });
  });

  // ── reinforcementLearning ──────────────────────────────────────
  describe('reinforcementLearning()', () => {
    it('performs Q-learning update', () => {
      const r = engine.reinforcementLearning({
        n_states: 2,
        n_actions: 3,
        episodes: [
          { state: 0, action: 1, reward: 10, next_state: 1, done: false },
        ],
        alpha: 0.1,
        gamma: 0.9,
      });
      expect(r.q_table).toBeDefined();
      expect(r.policy).toBeDefined();
      expect(r.method).toBe('q_learning');
    });
  });

  // ── calculate dispatcher ────────────────────────────────────────
  it('dispatches via calculate()', () => {
    const r = engine.calculate({
      action: 'calc_model_selection',
      params: {
        model_params: [2, 3],
        log_likelihoods: [-10, -8],
        n_observations: 6,
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
