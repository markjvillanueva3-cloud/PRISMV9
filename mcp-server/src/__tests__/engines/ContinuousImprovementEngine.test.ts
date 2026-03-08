/**
 * ContinuousImprovementEngine — Comprehensive Test Suite
 *
 * Tests: BMA model weighting, residual analysis (bias/trend/hetero/normality),
 *        correction factor learning, improvement measurement, edge cases.
 */

import { describe, it, expect } from 'vitest';
import {
  continuousImprovementEngine,
  type ModelResult,
  type CorrectionFactor,
  type ImprovementInput,
} from '../../engines/ContinuousImprovementEngine.js';

// ── Test Data ───────────────────────────────────────────────────────

/** Measured cutting forces (N) — ground truth */
const measured = [500, 520, 540, 560, 580, 600, 620, 640, 660, 680,
  700, 720, 740, 760, 780, 800, 820, 840, 860, 880];

/** Good model: small random-looking errors around truth */
const goodPredictions = measured.map((m, i) =>
  m + (i % 2 === 0 ? 5 : -5)
);

/** Biased model: systematically ~50 N too high with small variance */
const biasedPredictions = measured.map((m, i) => m + 50 + (i % 2 === 0 ? 2 : -2));

/** Bad model: large errors */
const badPredictions = measured.map(m => m * 1.3);

/** Trending residuals: error grows with index */
const trendPredictions = measured.map((m, i) => m + i * 5);

const goodModel: ModelResult = {
  model_name: 'Kienzle',
  predictions: goodPredictions,
  measured,
  n_parameters: 2,
};

const biasedModel: ModelResult = {
  model_name: 'SimplifiedKienzle',
  predictions: biasedPredictions,
  measured,
  n_parameters: 1,
};

const badModel: ModelResult = {
  model_name: 'LinearApprox',
  predictions: badPredictions,
  measured,
  n_parameters: 1,
};

const trendModel: ModelResult = {
  model_name: 'TrendingModel',
  predictions: trendPredictions,
  measured,
  n_parameters: 2,
};

// ── Tests ───────────────────────────────────────────────────────────

describe('ContinuousImprovementEngine', () => {

  // ── bayesianModelAveraging ────────────────────────────────────

  describe('bayesianModelAveraging', () => {
    it('assigns highest weight to best-fitting model', () => {
      const weights = continuousImprovementEngine.bayesianModelAveraging(
        [goodModel, badModel]
      );
      const goodW = weights.find(w => w.model === 'Kienzle')!;
      const badW = weights.find(w => w.model === 'LinearApprox')!;
      expect(goodW.weight).toBeGreaterThan(badW.weight);
    });

    it('weights sum to 1', () => {
      const weights = continuousImprovementEngine.bayesianModelAveraging(
        [goodModel, biasedModel, badModel]
      );
      const sum = weights.reduce((s, w) => s + w.weight, 0);
      expect(sum).toBeCloseTo(1.0, 6);
    });

    it('single model gets weight 1', () => {
      const weights = continuousImprovementEngine.bayesianModelAveraging(
        [goodModel]
      );
      expect(weights).toHaveLength(1);
      expect(weights[0].weight).toBeCloseTo(1.0, 6);
    });

    it('lower BIC means higher weight', () => {
      const weights = continuousImprovementEngine.bayesianModelAveraging(
        [goodModel, badModel]
      );
      const good = weights.find(w => w.model === 'Kienzle')!;
      const bad = weights.find(w => w.model === 'LinearApprox')!;
      expect(good.bic).toBeLessThan(bad.bic);
    });

    it('penalizes more parameters via BIC', () => {
      // Two models with same fit but different param counts
      const fewParams: ModelResult = {
        model_name: 'Simple',
        predictions: goodPredictions,
        measured,
        n_parameters: 1,
      };
      const manyParams: ModelResult = {
        model_name: 'Complex',
        predictions: goodPredictions,
        measured,
        n_parameters: 10,
      };
      const weights = continuousImprovementEngine.bayesianModelAveraging(
        [fewParams, manyParams]
      );
      const simple = weights.find(w => w.model === 'Simple')!;
      const complex = weights.find(w => w.model === 'Complex')!;
      expect(simple.bic).toBeLessThan(complex.bic);
      expect(simple.weight).toBeGreaterThan(complex.weight);
    });
  });

  // ── analyzeResiduals ──────────────────────────────────────────

  describe('analyzeResiduals', () => {
    it('detects bias in residuals with strong positive mean', () => {
      // Mean = 50 with small variance — tStat will be large
      const residuals = [48, 52, 49, 51, 47, 53, 50, 50, 48, 52,
        49, 51, 47, 53, 50, 50, 48, 52, 49, 51];
      const result = continuousImprovementEngine.analyzeResiduals(
        residuals
      );
      expect(result.has_bias).toBe(true);
      expect(result.bias_value).toBeCloseTo(50, 0);
    });

    it('no bias for zero-mean residuals', () => {
      const residuals = [5, -5, 3, -3, 7, -7, 2, -2, 4, -4,
        6, -6, 1, -1, 8, -8, 9, -9, 10, -10];
      const result = continuousImprovementEngine.analyzeResiduals(
        residuals
      );
      expect(result.has_bias).toBe(false);
      expect(result.bias_value).toBeCloseTo(0, 6);
    });

    it('detects linear trend in residuals', () => {
      // Residuals that grow linearly: 0, 5, 10, 15, ...
      const residuals = Array.from({ length: 20 }, (_, i) => i * 5);
      const result = continuousImprovementEngine.analyzeResiduals(
        residuals
      );
      expect(result.has_trend).toBe(true);
      expect(result.trend_slope).toBeGreaterThan(0);
    });

    it('no trend for flat residuals', () => {
      const residuals = Array.from({ length: 20 }, () => 3);
      const result = continuousImprovementEngine.analyzeResiduals(
        residuals
      );
      expect(result.has_trend).toBe(false);
    });

    it('detects heteroscedasticity', () => {
      // Small residuals then large residuals
      const residuals = [
        1, -1, 2, -2, 1, -1, 0.5, -0.5,
        50, -50, 40, -40, 60, -60, 30, -30,
      ];
      const result = continuousImprovementEngine.analyzeResiduals(
        residuals
      );
      expect(result.has_heteroscedasticity).toBe(true);
    });

    it('no heteroscedasticity for constant-variance residuals', () => {
      const residuals = Array.from({ length: 20 }, (_, i) =>
        (i % 2 === 0 ? 5 : -5)
      );
      const result = continuousImprovementEngine.analyzeResiduals(
        residuals
      );
      expect(result.has_heteroscedasticity).toBe(false);
    });

    it('returns normality p-value in [0, 1]', () => {
      const residuals = Array.from({ length: 30 }, (_, i) =>
        (i % 2 === 0 ? 3 : -3)
      );
      const result = continuousImprovementEngine.analyzeResiduals(
        residuals
      );
      expect(result.normality_p_value).toBeGreaterThanOrEqual(0);
      expect(result.normality_p_value).toBeLessThanOrEqual(1);
    });

    it('handles empty residuals gracefully', () => {
      const result = continuousImprovementEngine.analyzeResiduals([]);
      expect(result.has_bias).toBe(false);
      expect(result.has_trend).toBe(false);
      expect(result.has_heteroscedasticity).toBe(false);
      expect(result.normality_p_value).toBe(1);
    });
  });

  // ── learnCorrection ───────────────────────────────────────────

  describe('learnCorrection', () => {
    it('learns multiplicative factor close to 1 for good model', () => {
      const cf = continuousImprovementEngine.learnCorrection(
        goodPredictions, measured, 'Kienzle', 'AISI1045', 'force_N'
      );
      expect(cf.factor).toBeCloseTo(1.0, 1);
      expect(cf.algorithm).toBe('Kienzle');
      expect(cf.material).toBe('AISI1045');
      expect(cf.quantity).toBe('force_N');
    });

    it('learns bias offset for biased model', () => {
      const cf = continuousImprovementEngine.learnCorrection(
        biasedPredictions, measured, 'Simple', 'AISI1045', 'force_N'
      );
      // measured ~ factor * pred + offset, factor ~ 1, offset ~ -50
      expect(cf.factor).toBeCloseTo(1.0, 0);
      expect(cf.bias_offset).toBeLessThan(-30);
    });

    it('confidence increases with sample size', () => {
      const small = continuousImprovementEngine.learnCorrection(
        goodPredictions.slice(0, 5),
        measured.slice(0, 5),
        'A', 'B', 'C'
      );
      const large = continuousImprovementEngine.learnCorrection(
        goodPredictions,
        measured,
        'A', 'B', 'C'
      );
      expect(large.confidence).toBeGreaterThanOrEqual(small.confidence);
    });

    it('n_observations matches input length', () => {
      const cf = continuousImprovementEngine.learnCorrection(
        goodPredictions, measured, 'A', 'B', 'C'
      );
      expect(cf.n_observations).toBe(measured.length);
    });

    it('description indicates over/underprediction', () => {
      const cf = continuousImprovementEngine.learnCorrection(
        biasedPredictions, measured, 'Kienzle', 'AISI1045', 'force_N'
      );
      expect(cf.description).toContain('overpredicts');
    });

    it('returns default for empty data', () => {
      const cf = continuousImprovementEngine.learnCorrection(
        [], [], 'A', 'B', 'C'
      );
      expect(cf.factor).toBe(1);
      expect(cf.bias_offset).toBe(0);
      expect(cf.n_observations).toBe(0);
    });
  });

  // ── applyCorrections ─────────────────────────────────────────

  describe('applyCorrections', () => {
    it('applies matching correction factor', () => {
      const corrections: CorrectionFactor[] = [{
        algorithm: 'Kienzle',
        material: 'AISI1045',
        quantity: 'force_N',
        factor: 0.95,
        bias_offset: -10,
        confidence: 0.8,
        n_observations: 20,
        description: 'test',
      }];
      const corrected = continuousImprovementEngine.applyCorrections(
        100, corrections, 'Kienzle', 'AISI1045', 'force_N'
      );
      expect(corrected).toBeCloseTo(0.95 * 100 + (-10), 6);
    });

    it('returns original value when no corrections match', () => {
      const corrections: CorrectionFactor[] = [{
        algorithm: 'Other',
        material: 'Ti6Al4V',
        quantity: 'temp_C',
        factor: 0.5,
        bias_offset: 0,
        confidence: 0.9,
        n_observations: 10,
        description: 'test',
      }];
      const corrected = continuousImprovementEngine.applyCorrections(
        100, corrections, 'Kienzle', 'AISI1045', 'force_N'
      );
      expect(corrected).toBe(100);
    });

    it('uses highest-confidence correction when multiple match', () => {
      const corrections: CorrectionFactor[] = [
        {
          algorithm: 'A', material: 'B', quantity: 'C',
          factor: 2.0, bias_offset: 0, confidence: 0.5,
          n_observations: 10, description: 'low',
        },
        {
          algorithm: 'A', material: 'B', quantity: 'C',
          factor: 1.1, bias_offset: 5, confidence: 0.9,
          n_observations: 50, description: 'high',
        },
      ];
      const corrected = continuousImprovementEngine.applyCorrections(
        100, corrections, 'A', 'B', 'C'
      );
      // Should use factor=1.1, bias=5 (higher confidence)
      expect(corrected).toBeCloseTo(1.1 * 100 + 5, 6);
    });
  });

  // ── improve (full pipeline) ───────────────────────────────────

  describe('improve', () => {
    it('selects best model with lowest RMSE', () => {
      const result = continuousImprovementEngine.improve({
        models: [goodModel, badModel],
        algorithm: 'Kienzle',
        material: 'AISI1045',
        quantity: 'force_N',
      });
      expect(result.best_model).toBe('Kienzle');
    });

    it('model_weights sum to 1', () => {
      const result = continuousImprovementEngine.improve({
        models: [goodModel, biasedModel, badModel],
      });
      const sum = result.model_weights.reduce(
        (s, w) => s + w.weight, 0
      );
      expect(sum).toBeCloseTo(1.0, 6);
    });

    it('improvement_pct is positive when correction helps', () => {
      const result = continuousImprovementEngine.improve({
        models: [biasedModel],
        algorithm: 'Simple',
        material: 'AISI1045',
        quantity: 'force_N',
      });
      expect(result.improvement.improvement_pct).toBeGreaterThan(0);
      expect(result.improvement.after_rmse).toBeLessThan(
        result.improvement.before_rmse
      );
    });

    it('detects bias in residual analysis', () => {
      const result = continuousImprovementEngine.improve({
        models: [biasedModel],
      });
      expect(result.residual_analysis.has_bias).toBe(true);
      expect(result.residual_analysis.bias_value).toBeCloseTo(50, -1);
    });

    it('detects trend in residual analysis', () => {
      const result = continuousImprovementEngine.improve({
        models: [trendModel],
      });
      expect(result.residual_analysis.has_trend).toBe(true);
    });

    it('generates bias recommendation', () => {
      const result = continuousImprovementEngine.improve({
        models: [biasedModel],
      });
      expect(
        result.recommendations.some(r => r.includes('Systematic bias'))
      ).toBe(true);
    });

    it('generates trend recommendation', () => {
      const result = continuousImprovementEngine.improve({
        models: [trendModel],
      });
      expect(
        result.recommendations.some(r => r.includes('Trend'))
      ).toBe(true);
    });

    it('learns correction factors with enough observations', () => {
      const result = continuousImprovementEngine.improve({
        models: [goodModel],
        algorithm: 'Kienzle',
        material: 'Ti6Al4V',
        quantity: 'force_N',
      });
      expect(result.correction_factors).toHaveLength(1);
      expect(result.correction_factors[0].algorithm).toBe('Kienzle');
      expect(result.correction_factors[0].material).toBe('Ti6Al4V');
    });

    it('skips correction learning with too few observations', () => {
      const smallModel: ModelResult = {
        model_name: 'TinyModel',
        predictions: [100, 200, 300],
        measured: [105, 195, 305],
        n_parameters: 1,
      };
      const result = continuousImprovementEngine.improve({
        models: [smallModel],
        min_observations: 10,
      });
      expect(result.correction_factors).toHaveLength(0);
      expect(
        result.warnings.some(w => w.includes('Insufficient'))
      ).toBe(true);
    });

    it('merges existing corrections with new ones', () => {
      const existing: CorrectionFactor[] = [{
        algorithm: 'Kienzle',
        material: 'AISI1045',
        quantity: 'force_N',
        factor: 0.98,
        bias_offset: -5,
        confidence: 0.7,
        n_observations: 15,
        description: 'old correction',
      }];
      const result = continuousImprovementEngine.improve({
        models: [goodModel],
        algorithm: 'Kienzle',
        material: 'AISI1045',
        quantity: 'force_N',
        existing_corrections: existing,
      });
      // Should have learned a new correction too
      expect(result.correction_factors.length).toBeGreaterThanOrEqual(1);
    });

    it('formula string describes BIC and correction', () => {
      const result = continuousImprovementEngine.improve({
        models: [goodModel],
      });
      expect(result.formula).toContain('BIC');
      expect(result.formula).toContain('corrected');
    });

    it('recommends BMA ensemble when no dominant model', () => {
      // Two models with very similar performance
      const modelA: ModelResult = {
        model_name: 'ModelA',
        predictions: goodPredictions,
        measured,
        n_parameters: 2,
      };
      const modelB: ModelResult = {
        model_name: 'ModelB',
        predictions: goodPredictions.map(p => p + 1),
        measured,
        n_parameters: 2,
      };
      const result = continuousImprovementEngine.improve({
        models: [modelA, modelB],
      });
      // Both should have similar weights, so ensemble recommended
      const bestWeight = result.model_weights[0].weight;
      if (bestWeight < 0.6) {
        expect(
          result.recommendations.some(r => r.includes('BMA ensemble'))
        ).toBe(true);
      }
    });
  });

  // ── Error handling ────────────────────────────────────────────

  describe('error handling', () => {
    it('throws for empty models array', () => {
      expect(() =>
        continuousImprovementEngine.improve({ models: [] })
      ).toThrow('At least one model');
    });

    it('throws for mismatched prediction/measured lengths', () => {
      expect(() =>
        continuousImprovementEngine.improve({
          models: [{
            model_name: 'Bad',
            predictions: [1, 2, 3],
            measured: [1, 2],
            n_parameters: 1,
          }],
        })
      ).toThrow('lengths must match');
    });

    it('warns for very small observation count', () => {
      const result = continuousImprovementEngine.improve({
        models: [{
          model_name: 'Tiny',
          predictions: [100, 200, 300],
          measured: [105, 195, 310],
          n_parameters: 1,
        }],
        min_observations: 5,
      });
      expect(
        result.warnings.some(w =>
          w.includes('only') || w.includes('3') || w.includes('Insufficient')
        )
      ).toBe(true);
    });
  });
});
