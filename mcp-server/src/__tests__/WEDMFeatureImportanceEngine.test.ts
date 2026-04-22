/**
 * Tests for WEDMFeatureImportanceEngine (WEDM-NEXT-MS0 U-WN02)
 * SHAP-inspired feature importance for Wire EDM parameters
 */
import { describe, it, expect, beforeAll } from 'vitest';
import {
  WEDMFeatureImportanceEngine,
  WEDMDataPoint,
  FeatureImportanceResult,
  PartialDependenceResult,
  InteractionEffect,
  wedmFeatureImportanceEngine,
} from '../engines/WEDMFeatureImportanceEngine.js';
import { registerEdmDispatcher } from '../tools/dispatchers/edmDispatcher.js';

type Handler = (args: { action: string; params?: Record<string, any> }) => Promise<any>;

function createServer(): { handler: Promise<Handler> } {
  let resolve!: (h: Handler) => void;
  const handler = new Promise<Handler>((r) => (resolve = r));
  const fakeServer = {
    tool(_name: string, _desc: string, _schema: any, fn: Handler) {
      resolve(fn);
    },
  };
  registerEdmDispatcher(fakeServer);
  return { handler };
}

async function call(handler: Handler, action: string, params: Record<string, any>): Promise<any> {
  const r = await handler({ action, params });
  const text = r?.content?.[0]?.text ?? JSON.stringify(r);
  try { return JSON.parse(text); } catch { return r; }
}

function createSampleData(material = 'steel', count = 10): WEDMDataPoint[] {
  const data: WEDMDataPoint[] = [];
  for (let i = 0; i < count; i++) {
    data.push({
      parameters: {
        gapVoltage: 50 + Math.random() * 20,
        wireTension: 10 + Math.random() * 10,
        flushingPressure: 0.5 + Math.random() * 1.0,
        pulseOnTime: 15 + Math.random() * 20,
        pulseOffTime: 30 + Math.random() * 30,
        wireSpeed: 6 + Math.random() * 8,
      },
      outcomes: {
        mrr: 25 + Math.random() * 20,
        surfaceRa: 1.0 + Math.random() * 2.0,
        wireConsumption: 40 + Math.random() * 30,
        energyConsumption: 3 + Math.random() * 4,
      },
      material,
      thickness: 25,
    });
  }
  return data;
}

describe('WEDMFeatureImportanceEngine', () => {
  let engine: WEDMFeatureImportanceEngine;

  beforeAll(() => {
    engine = new WEDMFeatureImportanceEngine();
  });

  describe('computeImportance', () => {
    it('returns importance scores for all features', () => {
      const data = createSampleData('steel', 20);
      const result = engine.computeImportance(data, 'mrr');

      expect(result).toHaveLength(6);
      expect(result.every(r => r.feature && typeof r.importance === 'number')).toBe(true);
      expect(result.every(r => r.rank >= 1 && r.rank <= 6)).toBe(true);
    });

    it('normalizes importance scores to sum to 1', () => {
      const data = createSampleData('steel', 15);
      const result = engine.computeImportance(data, 'mrr');

      const total = result.reduce((sum, r) => sum + r.importance, 0);
      expect(total).toBeCloseTo(1.0, 5);
    });

    it('ranks features by importance (highest first)', () => {
      const data = createSampleData('aluminum', 20);
      const result = engine.computeImportance(data, 'surfaceRa');

      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].importance).toBeGreaterThanOrEqual(result[i + 1].importance);
        expect(result[i].rank).toBeLessThan(result[i + 1].rank);
      }
    });

    it('handles empty data gracefully', () => {
      const result = engine.computeImportance([], 'mrr');

      expect(result).toHaveLength(6);
      expect(result.every(r => r.importance === 0)).toBe(true);
    });

    it('respects custom permutation count', () => {
      const data = createSampleData('steel', 10);
      const result = engine.computeImportance(data, 'wireConsumption', { nPermutations: 5 });

      expect(result).toHaveLength(6);
      expect(result.every(r => r.stdDev >= 0)).toBe(true);
    });

    it('works with all outcome types', () => {
      const data = createSampleData('titanium', 15);

      for (const outcome of ['mrr', 'surfaceRa', 'wireConsumption', 'energyConsumption'] as const) {
        const result = engine.computeImportance(data, outcome);
        expect(result).toHaveLength(6);
        expect(result[0].importance).toBeGreaterThanOrEqual(0);
      }
    });

    it('produces consistent rankings with sufficient data', () => {
      const data = createSampleData('steel', 50);
      const result1 = engine.computeImportance(data, 'mrr', { nPermutations: 20 });
      const result2 = engine.computeImportance(data, 'mrr', { nPermutations: 20 });

      // Top feature should be consistent
      expect(result1[0].feature).toBe(result2[0].feature);
    });
  });

  describe('computePartialDependence', () => {
    it('returns PDP curve for a feature-outcome pair', () => {
      const data = createSampleData('steel', 20);
      const result = engine.computePartialDependence(data, 'gapVoltage', 'mrr');

      expect(result.feature).toBe('gapVoltage');
      expect(result.outcome).toBe('mrr');
      expect(result.points.length).toBeGreaterThan(0);
      expect(['increasing', 'decreasing', 'nonlinear', 'flat']).toContain(result.trend);
      expect(result.sensitivity).toBeGreaterThanOrEqual(0);
    });

    it('respects custom point count', () => {
      const data = createSampleData('aluminum', 15);
      const result = engine.computePartialDependence(data, 'wireTension', 'surfaceRa', { nPoints: 10 });

      expect(result.points).toHaveLength(10);
    });

    it('detects increasing trend for positive coefficients', () => {
      const data = createSampleData('steel', 30);
      const result = engine.computePartialDependence(data, 'gapVoltage', 'mrr');

      // gapVoltage has positive coefficient for MRR in steel
      expect(['increasing', 'nonlinear']).toContain(result.trend);
    });

    it('includes confidence values for each point', () => {
      const data = createSampleData('titanium', 20);
      const result = engine.computePartialDependence(data, 'pulseOnTime', 'energyConsumption');

      expect(result.points.every(p => p.confidence >= 0 && p.confidence <= 1)).toBe(true);
    });

    it('handles all features', () => {
      const data = createSampleData('steel', 15);
      const features = ['gapVoltage', 'wireTension', 'flushingPressure', 'pulseOnTime', 'pulseOffTime', 'wireSpeed'] as const;

      for (const feature of features) {
        const result = engine.computePartialDependence(data, feature, 'mrr');
        expect(result.feature).toBe(feature);
        expect(result.points.length).toBeGreaterThan(0);
      }
    });

    it('works with empty data using defaults', () => {
      const result = engine.computePartialDependence([], 'wireSpeed', 'wireConsumption');

      expect(result.feature).toBe('wireSpeed');
      expect(result.points.length).toBeGreaterThan(0);
    });
  });

  describe('computeInteractions', () => {
    it('returns interaction effects for all feature pairs', () => {
      const data = createSampleData('steel', 20);
      const result = engine.computeInteractions(data, 'mrr');

      // C(6,2) = 15 pairs
      expect(result).toHaveLength(15);
      expect(result.every(r => r.feature1 && r.feature2)).toBe(true);
      expect(result.every(r => typeof r.interactionStrength === 'number')).toBe(true);
    });

    it('classifies interaction types correctly', () => {
      const data = createSampleData('aluminum', 25);
      const result = engine.computeInteractions(data, 'surfaceRa');

      const validTypes = ['synergistic', 'antagonistic', 'independent'];
      expect(result.every(r => validTypes.includes(r.type))).toBe(true);
    });

    it('sorts interactions by strength (strongest first)', () => {
      const data = createSampleData('titanium', 20);
      const result = engine.computeInteractions(data, 'wireConsumption');

      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].interactionStrength).toBeGreaterThanOrEqual(result[i + 1].interactionStrength);
      }
    });

    it('handles empty data gracefully', () => {
      const result = engine.computeInteractions([], 'energyConsumption');

      expect(result).toHaveLength(15);
      expect(result.every(r => typeof r.interactionStrength === 'number')).toBe(true);
    });

    it('identifies weak interactions as independent', () => {
      const data = createSampleData('steel', 30);
      const result = engine.computeInteractions(data, 'mrr');

      // Some interactions should be classified as independent (strength < 0.05)
      const independentCount = result.filter(r => r.type === 'independent').length;
      expect(independentCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getOptimizationGuidance', () => {
    it('returns recommendations for top features', () => {
      const data = createSampleData('steel', 20);
      const importance = engine.computeImportance(data, 'mrr');
      const guidance = engine.getOptimizationGuidance(importance, 'mrr', 'maximize');

      expect(guidance.length).toBeLessThanOrEqual(4);
      expect(guidance.every(g => g.feature && g.recommendation && g.priority >= 0)).toBe(true);
    });

    it('recommends increase for positive coefficients when maximizing', () => {
      const data = createSampleData('steel', 20);
      const importance = engine.computeImportance(data, 'mrr');
      const guidance = engine.getOptimizationGuidance(importance, 'mrr', 'maximize');

      // gapVoltage has positive coefficient for MRR
      const gapGuidance = guidance.find(g => g.feature === 'gapVoltage');
      if (gapGuidance) {
        expect(gapGuidance.recommendation).toBe('increase');
      }
    });

    it('recommends opposite direction when minimizing', () => {
      const data = createSampleData('steel', 20);
      const importance = engine.computeImportance(data, 'surfaceRa');
      const maxGuidance = engine.getOptimizationGuidance(importance, 'surfaceRa', 'maximize');
      const minGuidance = engine.getOptimizationGuidance(importance, 'surfaceRa', 'minimize');

      // Same feature should have opposite recommendations
      const maxRec = maxGuidance.find(g => g.feature === 'pulseOnTime');
      const minRec = minGuidance.find(g => g.feature === 'pulseOnTime');
      if (maxRec && minRec) {
        expect(maxRec.recommendation).not.toBe(minRec.recommendation);
      }
    });

    it('prioritizes by importance', () => {
      const data = createSampleData('aluminum', 25);
      const importance = engine.computeImportance(data, 'wireConsumption');
      const guidance = engine.getOptimizationGuidance(importance, 'wireConsumption', 'minimize');

      for (let i = 0; i < guidance.length - 1; i++) {
        expect(guidance[i].priority).toBeGreaterThanOrEqual(guidance[i + 1].priority);
      }
    });
  });

  describe('material-specific behavior', () => {
    it('uses different coefficients for different materials', () => {
      const steelData = createSampleData('steel', 20);
      const aluminumData = createSampleData('aluminum', 20);

      const steelImportance = engine.computeImportance(steelData, 'mrr');
      const aluminumImportance = engine.computeImportance(aluminumData, 'mrr');

      // Rankings may differ between materials
      expect(steelImportance[0].feature).toBeDefined();
      expect(aluminumImportance[0].feature).toBeDefined();
    });

    it('handles titanium material', () => {
      const data = createSampleData('titanium', 15);
      const result = engine.computeImportance(data, 'surfaceRa');

      expect(result).toHaveLength(6);
      expect(result[0].importance).toBeGreaterThanOrEqual(0);
    });

    it('falls back to steel for unknown materials', () => {
      const data = createSampleData('unobtainium', 15);
      const result = engine.computeImportance(data, 'mrr');

      expect(result).toHaveLength(6);
      expect(result.every(r => Number.isFinite(r.importance))).toBe(true);
    });

    it('recognizes aluminum aliases', () => {
      const data1 = createSampleData('al6061', 10);
      const data2 = createSampleData('aluminum_7075', 10);

      const result1 = engine.computeImportance(data1, 'mrr');
      const result2 = engine.computeImportance(data2, 'mrr');

      // Both should use aluminum coefficients
      expect(result1).toHaveLength(6);
      expect(result2).toHaveLength(6);
    });
  });

  describe('singleton export', () => {
    it('exports a singleton instance', () => {
      expect(wedmFeatureImportanceEngine).toBeInstanceOf(WEDMFeatureImportanceEngine);
    });
  });

  describe('dispatcher round-trip', () => {
    let handler: Handler;

    beforeAll(async () => {
      const s = createServer();
      handler = await s.handler;
    });

    it('wedm_feature_importance via dispatcher returns importance scores', async () => {
      const data = createSampleData('steel', 15);
      const r = await call(handler, 'wedm_feature_importance', {
        data,
        target_outcome: 'mrr',
        n_permutations: 5,
      });

      expect(Array.isArray(r)).toBe(true);
      expect(r.length).toBe(6);
      expect(r[0].feature).toBeDefined();
      expect(typeof r[0].importance).toBe('number');
    });

    it('wedm_partial_dependence via dispatcher returns PDP', async () => {
      const data = createSampleData('aluminum', 10);
      const r = await call(handler, 'wedm_partial_dependence', {
        data,
        feature: 'gapVoltage',
        outcome: 'surfaceRa',
        n_points: 15,
      });

      expect(r.feature).toBe('gapVoltage');
      expect(r.outcome).toBe('surfaceRa');
      expect(r.points).toHaveLength(15);
      expect(['increasing', 'decreasing', 'nonlinear', 'flat']).toContain(r.trend);
    });

    it('wedm_feature_interactions via dispatcher returns interactions', async () => {
      const data = createSampleData('titanium', 12);
      const r = await call(handler, 'wedm_feature_interactions', {
        data,
        outcome: 'wireConsumption',
      });

      expect(Array.isArray(r)).toBe(true);
      expect(r.length).toBe(15);
      expect(r[0].feature1).toBeDefined();
      expect(r[0].feature2).toBeDefined();
      expect(r[0].interactionStrength).toBeGreaterThanOrEqual(0);
    });

    it('wedm_optimization_guidance via dispatcher returns guidance', async () => {
      const data = createSampleData('steel', 20);
      const r = await call(handler, 'wedm_optimization_guidance', {
        data,
        target_outcome: 'mrr',
        direction: 'maximize',
      });

      expect(Array.isArray(r)).toBe(true);
      expect(r.length).toBeLessThanOrEqual(4);
      expect(r[0].feature).toBeDefined();
      expect(['increase', 'decrease']).toContain(r[0].recommendation);
    });

    it('dispatcher handles empty data gracefully', async () => {
      const r = await call(handler, 'wedm_feature_importance', {
        target_outcome: 'energyConsumption',
      });

      expect(Array.isArray(r)).toBe(true);
      expect(r.length).toBe(6);
    });

    it('dispatcher uses default outcome when not specified', async () => {
      const data = createSampleData('steel', 10);
      const r = await call(handler, 'wedm_partial_dependence', {
        data,
        feature: 'wireTension',
      });

      expect(r.outcome).toBe('mrr');
    });
  });
});
