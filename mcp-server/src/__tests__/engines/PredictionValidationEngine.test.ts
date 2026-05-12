/**
 * PredictionValidationEngine — Comprehensive Test Suite
 *
 * Tests: MAE, MAPE, R², Bland-Altman, paired t-test, 95% CI,
 *        RMSE, max error, grading, edge cases.
 */

import { describe, it, expect } from 'vitest';
import {
  predictionValidationEngine,
  type ValidationPair,
  type ValidationInput,
} from '../../engines/PredictionValidationEngine.js';

// ── Test Data ───────────────────────────────────────────────────────

/** Perfect predictions — pred === meas */
const perfectPairs: ValidationPair[] = [
  { predicted: 100, measured: 100, label: 'point-1' },
  { predicted: 200, measured: 200, label: 'point-2' },
  { predicted: 300, measured: 300, label: 'point-3' },
  { predicted: 400, measured: 400, label: 'point-4' },
  { predicted: 500, measured: 500, label: 'point-5' },
];

/** Realistic cutting force predictions (N) with small errors */
const forcePairs: ValidationPair[] = [
  { predicted: 520, measured: 500 },
  { predicted: 480, measured: 490 },
  { predicted: 610, measured: 600 },
  { predicted: 690, measured: 700 },
  { predicted: 780, measured: 750 },
  { predicted: 850, measured: 860 },
  { predicted: 920, measured: 900 },
  { predicted: 1010, measured: 1000 },
  { predicted: 1100, measured: 1080 },
  { predicted: 1200, measured: 1190 },
];

/** Large systematic bias — predictions all 50% above measured */
const biasedPairs: ValidationPair[] = [
  { predicted: 150, measured: 100 },
  { predicted: 300, measured: 200 },
  { predicted: 450, measured: 300 },
  { predicted: 600, measured: 400 },
  { predicted: 750, measured: 500 },
];

/** Proportional bias — error grows with magnitude */
const proportionalPairs: ValidationPair[] = [
  { predicted: 10, measured: 10 },
  { predicted: 22, measured: 20 },
  { predicted: 35, measured: 30 },
  { predicted: 52, measured: 40 },
  { predicted: 75, measured: 50 },
  { predicted: 105, measured: 60 },
];

// ── Tests ───────────────────────────────────────────────────────────

describe('PredictionValidationEngine', () => {
  // ── rSquared ──────────────────────────────────────────────────

  describe('rSquared', () => {
    it('returns 1.0 for perfect predictions', () => {
      const pred = [100, 200, 300, 400, 500];
      const meas = [100, 200, 300, 400, 500];
      expect(predictionValidationEngine.rSquared(pred, meas)).toBeCloseTo(1.0, 10);
    });

    it('returns 0 when predictions equal the mean', () => {
      const meas = [10, 20, 30, 40, 50];
      const m = 30; // mean of measured
      const pred = [m, m, m, m, m];
      expect(predictionValidationEngine.rSquared(pred, meas)).toBeCloseTo(0.0, 10);
    });

    it('returns negative R² when model is worse than mean', () => {
      const meas = [10, 20, 30, 40, 50];
      const pred = [50, 40, 30, 20, 10]; // reversed
      const r2 = predictionValidationEngine.rSquared(pred, meas);
      expect(r2).toBeLessThan(0);
    });

    it('returns 1.0 when all values are identical (zero variance)', () => {
      const pred = [5, 5, 5];
      const meas = [5, 5, 5];
      expect(predictionValidationEngine.rSquared(pred, meas)).toBe(1);
    });

    it('computes correct R² for known data', () => {
      // y = 2x, pred = 2x + small noise
      const meas = [2, 4, 6, 8, 10];
      const pred = [2.1, 3.9, 6.2, 7.8, 10.1];
      const r2 = predictionValidationEngine.rSquared(pred, meas);
      expect(r2).toBeGreaterThan(0.99);
      expect(r2).toBeLessThanOrEqual(1.0);
    });
  });

  // ── blandAltman ───────────────────────────────────────────────

  describe('blandAltman', () => {
    it('returns zero bias for perfect predictions', () => {
      const ba = predictionValidationEngine.blandAltman(perfectPairs);
      expect(ba.bias).toBeCloseTo(0, 10);
      expect(ba.sd).toBeCloseTo(0, 10);
      expect(ba.upper_loa).toBeCloseTo(0, 10);
      expect(ba.lower_loa).toBeCloseTo(0, 10);
      expect(ba.proportional_bias).toBe(false);
    });

    it('computes correct bias as mean difference', () => {
      const pairs: ValidationPair[] = [
        { predicted: 12, measured: 10 },
        { predicted: 22, measured: 20 },
        { predicted: 32, measured: 30 },
      ];
      const ba = predictionValidationEngine.blandAltman(pairs);
      expect(ba.bias).toBeCloseTo(2.0, 10); // all diffs = 2
      expect(ba.sd).toBeCloseTo(0, 10);
      expect(ba.points).toHaveLength(3);
    });

    it('computes limits of agreement as bias ± 1.96*SD', () => {
      const ba = predictionValidationEngine.blandAltman(forcePairs);
      expect(ba.upper_loa).toBeCloseTo(ba.bias + 1.96 * ba.sd, 6);
      expect(ba.lower_loa).toBeCloseTo(ba.bias - 1.96 * ba.sd, 6);
    });

    it('detects proportional bias when |r| > 0.3', () => {
      const ba = predictionValidationEngine.blandAltman(proportionalPairs);
      expect(ba.proportional_bias).toBe(true);
    });

    it('point means are average of predicted and measured', () => {
      const ba = predictionValidationEngine.blandAltman(forcePairs);
      for (let i = 0; i < forcePairs.length; i++) {
        const expectedMean = (forcePairs[i].predicted + forcePairs[i].measured) / 2;
        expect(ba.points[i].mean).toBeCloseTo(expectedMean, 10);
      }
    });
  });

  // ── pairedTTest ───────────────────────────────────────────────

  describe('pairedTTest', () => {
    it('returns t=0 when all differences are zero', () => {
      const diffs = [0, 0, 0, 0, 0];
      const result = predictionValidationEngine.pairedTTest(diffs);
      expect(result.t).toBeCloseTo(0, 10);
      expect(result.df).toBe(4);
    });

    it('detects significant difference for large bias with variance', () => {
      const diffs = [48, 52, 49, 51, 47, 53, 50, 50, 48, 52];
      const result = predictionValidationEngine.pairedTTest(diffs);
      expect(Math.abs(result.t)).toBeGreaterThan(2);
      expect(result.p).toBeLessThan(0.05);
    });

    it('returns t=0 when all diffs are identical (zero variance)', () => {
      const diffs = [50, 50, 50, 50, 50];
      const result = predictionValidationEngine.pairedTTest(diffs);
      // se=0, so t is defined as 0 by the engine
      expect(result.t).toBe(0);
    });

    it('has correct degrees of freedom = n-1', () => {
      const diffs = [1, -1, 2, -2, 3, -3, 4, -4];
      const result = predictionValidationEngine.pairedTTest(diffs);
      expect(result.df).toBe(7);
    });

    it('returns high p-value for zero-mean symmetric diffs', () => {
      const diffs = [5, -5, 3, -3, 1, -1, 4, -4, 2, -2];
      const result = predictionValidationEngine.pairedTTest(diffs);
      expect(result.p).toBeGreaterThan(0.5); // mean = 0, so not significant
    });
  });

  // ── validate (full pipeline) ──────────────────────────────────

  describe('validate', () => {
    it('returns perfect scores for identical predictions', () => {
      const result = predictionValidationEngine.validate({
        pairs: perfectPairs,
        quantity: 'cutting_force_N',
        algorithm: 'Kienzle',
        material: 'AISI1045',
      });
      expect(result.mae).toBeCloseTo(0, 10);
      expect(result.mape_pct).toBeCloseTo(0, 10);
      expect(result.r_squared).toBeCloseTo(1.0, 10);
      expect(result.rmse).toBeCloseTo(0, 10);
      expect(result.max_error).toBeCloseTo(0, 10);
      expect(result.grade).toBe('A');
      expect(result.passed).toBe(true);
      expect(result.n).toBe(5);
      expect(result.residuals).toHaveLength(5);
    });

    it('computes correct MAE for force predictions', () => {
      const result = predictionValidationEngine.validate({
        pairs: forcePairs,
        quantity: 'force_N',
      });
      // Manual: diffs = [20,-10,10,-10,30,-10,20,10,20,10], abs = [20,10,10,10,30,10,20,10,20,10]
      // MAE = 150/10 = 15
      expect(result.mae).toBeCloseTo(15, 6);
    });

    it('computes correct RMSE', () => {
      const result = predictionValidationEngine.validate({
        pairs: forcePairs,
        quantity: 'force_N',
      });
      // residuals = [20,-10,10,-10,30,-10,20,10,20,10]
      // sum of squares = 400+100+100+100+900+100+400+100+400+100 = 2700
      // RMSE = sqrt(2700/10) = sqrt(270) ≈ 16.4317
      expect(result.rmse).toBeCloseTo(Math.sqrt(270), 4);
    });

    it('returns grade F and failed for 50% MAPE bias', () => {
      const result = predictionValidationEngine.validate({
        pairs: biasedPairs,
        quantity: 'tool_life_min',
        pass_threshold_mape: 15,
      });
      expect(result.mape_pct).toBeCloseTo(50, 0);
      expect(result.grade).toBe('F');
      expect(result.passed).toBe(false);
    });

    it('handles empty pairs gracefully', () => {
      const result = predictionValidationEngine.validate({
        pairs: [],
        quantity: 'surface_roughness',
      });
      expect(result.n).toBe(0);
      expect(result.mape_pct).toBe(Infinity);
      expect(result.grade).toBe('F');
      expect(result.passed).toBe(false);
      expect(result.warnings).toContain('No data pairs provided');
    });

    it('warns when n < 3', () => {
      const result = predictionValidationEngine.validate({
        pairs: [{ predicted: 100, measured: 105 }, { predicted: 200, measured: 195 }],
        quantity: 'Ra_um',
      });
      expect(result.n).toBe(2);
      expect(result.warnings.some(w => w.includes('n < 3'))).toBe(true);
    });

    it('excludes measured=0 from MAPE and warns', () => {
      const pairs: ValidationPair[] = [
        { predicted: 10, measured: 0 },
        { predicted: 100, measured: 100 },
        { predicted: 200, measured: 200 },
      ];
      const result = predictionValidationEngine.validate({
        pairs,
        quantity: 'deflection_um',
      });
      expect(result.warnings.some(w => w.includes('measured=0'))).toBe(true);
      // MAPE should only count the 2 non-zero pairs (both have 0% error)
      expect(result.mape_pct).toBeCloseTo(0, 6);
    });

    it('assigns correct grades based on MAPE thresholds', () => {
      // Grade A: MAPE < 5%
      const gradeA = predictionValidationEngine.validate({
        pairs: [
          { predicted: 101, measured: 100 },
          { predicted: 201, measured: 200 },
          { predicted: 301, measured: 300 },
        ],
        quantity: 'force',
      });
      expect(gradeA.grade).toBe('A');

      // Grade D: MAPE 15-25% — use pairs with ~20% error
      const gradeD = predictionValidationEngine.validate({
        pairs: [
          { predicted: 120, measured: 100 },
          { predicted: 240, measured: 200 },
          { predicted: 360, measured: 300 },
        ],
        quantity: 'force',
      });
      expect(gradeD.grade).toBe('D');
    });

    it('detects proportional bias warning', () => {
      const result = predictionValidationEngine.validate({
        pairs: proportionalPairs,
        quantity: 'temperature_C',
      });
      expect(result.warnings.some(w => w.includes('Proportional bias'))).toBe(true);
    });

    it('confidence interval contains zero for unbiased predictions', () => {
      // Small symmetric errors
      const pairs: ValidationPair[] = Array.from({ length: 20 }, (_, i) => ({
        predicted: 100 + i * 10 + (i % 2 === 0 ? 2 : -2),
        measured: 100 + i * 10,
      }));
      const result = predictionValidationEngine.validate({ pairs, quantity: 'force' });
      expect(result.confidence_interval_95.lower).toBeLessThan(1);
      expect(result.confidence_interval_95.upper).toBeGreaterThan(-1);
    });

    it('CI width = 2 * 1.96 * SE', () => {
      const result = predictionValidationEngine.validate({
        pairs: forcePairs,
        quantity: 'force',
      });
      // CI width should be 2 * 1.96 * (sd / sqrt(n))
      const residuals = forcePairs.map(p => p.predicted - p.measured);
      const m = residuals.reduce((s, v) => s + v, 0) / residuals.length;
      const variance = residuals.reduce((s, v) => s + (v - m) ** 2, 0) / (residuals.length - 1);
      const se = Math.sqrt(variance) / Math.sqrt(residuals.length);
      expect(result.confidence_interval_95.width).toBeCloseTo(2 * 1.96 * se, 4);
    });

    it('custom pass_threshold_mape works', () => {
      const result = predictionValidationEngine.validate({
        pairs: forcePairs,
        quantity: 'force',
        pass_threshold_mape: 1, // very strict
      });
      expect(result.passed).toBe(false);
    });

    it('populates algorithm and material in output', () => {
      const result = predictionValidationEngine.validate({
        pairs: forcePairs,
        quantity: 'force',
        algorithm: 'Kienzle',
        material: 'Ti6Al4V',
      });
      expect(result.algorithm).toBe('Kienzle');
      expect(result.material).toBe('Ti6Al4V');
    });

    it('max_error is the largest absolute residual', () => {
      const result = predictionValidationEngine.validate({
        pairs: forcePairs,
        quantity: 'force',
      });
      const maxAbs = Math.max(...forcePairs.map(p => Math.abs(p.predicted - p.measured)));
      expect(result.max_error).toBeCloseTo(maxAbs, 10);
    });

    it('formula string is populated', () => {
      const result = predictionValidationEngine.validate({
        pairs: forcePairs,
        quantity: 'force',
      });
      expect(result.formula).toContain('MAE');
      expect(result.formula).toContain('R²');
    });
  });
});
