import { describe, it, expect } from 'vitest';
import {
  fuzzyNeuralHybridEngine,
  FuzzyNeuralHybridEngine,
} from '../../src/engines/FuzzyNeuralHybridEngine.js';

describe('FuzzyNeuralHybridEngine', () => {
  const engine = fuzzyNeuralHybridEngine;

  it('exports a singleton instance', () => {
    expect(engine).toBeInstanceOf(FuzzyNeuralHybridEngine);
  });

  // ── Membership Functions ─────────────────────────────────────────
  describe('gaussianMF()', () => {
    it('peak value is 1 at mean', () => {
      expect(engine.gaussianMF(5, 5, 1)).toBeCloseTo(1.0, 10);
    });

    it('decays symmetrically away from mean', () => {
      const left = engine.gaussianMF(3, 5, 1);
      const right = engine.gaussianMF(7, 5, 1);
      expect(left).toBeCloseTo(right, 10);
    });

    it('at 1 sigma, value = e^{-0.5} ≈ 0.6065', () => {
      expect(engine.gaussianMF(6, 5, 1)).toBeCloseTo(
        Math.exp(-0.5), 4
      );
    });

    it('sigma=0 gives impulse at mean', () => {
      expect(engine.gaussianMF(5, 5, 0)).toBe(1);
      expect(engine.gaussianMF(5.001, 5, 0)).toBe(0);
    });
  });

  describe('triangularMF()', () => {
    it('peak = 1 at vertex b', () => {
      // At b exactly, the left branch gives (b-a)/(b-a) = 1
      expect(engine.triangularMF(5, 3, 5, 7)).toBeCloseTo(1.0, 10);
    });

    it('returns 0 outside [a, c]', () => {
      expect(engine.triangularMF(2, 3, 5, 7)).toBe(0);
      expect(engine.triangularMF(8, 3, 5, 7)).toBe(0);
    });

    it('midpoint of left slope = 0.5', () => {
      expect(engine.triangularMF(4, 3, 5, 7)).toBeCloseTo(0.5, 10);
    });

    it('returns 0 at boundary points a and c', () => {
      expect(engine.triangularMF(3, 3, 5, 7)).toBe(0);
      expect(engine.triangularMF(7, 3, 5, 7)).toBe(0);
    });
  });

  // ── compute() dispatch ───────────────────────────────────────────
  describe('compute()', () => {
    it('warns on missing anfis input', () => {
      const r = engine.compute({ method: 'anfis' });
      expect(r.warnings).toContain('Missing anfis input');
    });

    it('warns on missing taguchi input', () => {
      const r = engine.compute({ method: 'fuzzy_taguchi' });
      expect(r.warnings).toContain('Missing taguchi input');
    });

    it('warns on missing type2 input', () => {
      const r = engine.compute({ method: 'type2_fuzzy' });
      expect(r.warnings).toContain('Missing type2 input');
    });

    it('warns on missing ahp input', () => {
      const r = engine.compute({ method: 'fuzzy_ahp' });
      expect(r.warnings).toContain('Missing ahp input');
    });

    it('warns on unknown method', () => {
      const r = engine.compute({ method: 'unknown' as any });
      expect(r.warnings.some(w => w.includes('Unknown'))).toBe(true);
    });
  });

  // ── ANFIS ────────────────────────────────────────────────────────
  describe('anfisPredict()', () => {
    const anfisInput = {
      inputs: [
        {
          name: 'speed',
          value: 100,
          sets: [
            { name: 'low', type: 'gaussian' as const, params: [50, 20] },
            { name: 'high', type: 'gaussian' as const, params: [150, 20] },
          ],
        },
        {
          name: 'feed',
          value: 0.2,
          sets: [
            { name: 'low', type: 'gaussian' as const, params: [0.1, 0.05] },
            { name: 'high', type: 'gaussian' as const, params: [0.3, 0.05] },
          ],
        },
      ],
    };

    it('produces a numeric output', () => {
      const r = engine.anfisPredict(anfisInput);
      expect(typeof r.output).toBe('number');
      expect(isFinite(r.output)).toBe(true);
    });

    it('firing strengths sum to ~1 (normalized)', () => {
      const r = engine.anfisPredict(anfisInput);
      const sum = r.firing_strengths.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 4);
    });

    it('number of rules = product of set counts', () => {
      const r = engine.anfisPredict(anfisInput);
      // 2 sets for speed * 2 sets for feed = 4 rules
      expect(r.firing_strengths).toHaveLength(4);
      expect(r.rule_outputs).toHaveLength(4);
    });

    it('training produces defined RMSE when data provided', () => {
      const r = engine.anfisPredict({
        ...anfisInput,
        training_data: [
          { inputs: [60, 0.12], output: 5 },
          { inputs: [100, 0.20], output: 10 },
          { inputs: [140, 0.28], output: 15 },
          { inputs: [80, 0.15], output: 7 },
          { inputs: [120, 0.25], output: 12 },
        ],
        epochs: 20,
        learning_rate: 0.005,
      });
      expect(r.trained).toBe(true);
      expect(r.training_rmse).toBeDefined();
    });

    it('warns on small training data', () => {
      const warnings: string[] = [];
      engine.anfisPredict(
        {
          ...anfisInput,
          training_data: [{ inputs: [100, 0.2], output: 5 }],
        },
        warnings
      );
      expect(warnings.some(w => w.includes('< 3'))).toBe(true);
    });
  });

  // ── Fuzzy Taguchi ────────────────────────────────────────────────
  describe('fuzzyTaguchi()', () => {
    const taguchiInput = {
      factors: [
        { name: 'speed', levels: [100, 200, 300] },
        { name: 'feed', levels: [0.1, 0.2, 0.3] },
      ],
      responses: [
        {
          name: 'roughness',
          target: 'smaller' as const,
          values: Array.from({ length: 9 }, () => [1.2, 1.3, 1.1]),
        },
        {
          name: 'mrr',
          target: 'larger' as const,
          values: Array.from({ length: 9 }, (_, i) => [
            10 + i, 11 + i, 9 + i,
          ]),
        },
      ],
    };

    it('returns optimal levels for each factor', () => {
      const r = engine.fuzzyTaguchi(taguchiInput);
      expect(Object.keys(r.optimal_levels)).toContain('speed');
      expect(Object.keys(r.optimal_levels)).toContain('feed');
    });

    it('optimal levels are from the defined levels', () => {
      const r = engine.fuzzyTaguchi(taguchiInput);
      expect([100, 200, 300]).toContain(r.optimal_levels['speed']);
      expect([0.1, 0.2, 0.3]).toContain(r.optimal_levels['feed']);
    });

    it('fuzzy desirability values in [0, 1]', () => {
      const r = engine.fuzzyTaguchi(taguchiInput);
      for (const d of r.fuzzy_desirability) {
        expect(d).toBeGreaterThanOrEqual(0);
        expect(d).toBeLessThanOrEqual(1.0001);
      }
    });

    it('S/N ratios array matches experiment count', () => {
      const r = engine.fuzzyTaguchi(taguchiInput);
      expect(r.sn_ratios).toHaveLength(9);
    });

    it('warns on empty factors', () => {
      const warnings: string[] = [];
      engine.fuzzyTaguchi(
        { factors: [], responses: [] },
        warnings
      );
      expect(warnings.some(w => w.includes('No factors'))).toBe(true);
    });
  });

  // ── Type-2 Fuzzy ─────────────────────────────────────────────────
  describe('type2Defuzzify()', () => {
    const type2Sets = [
      {
        name: 'low',
        lower_mf: {
          name: 'low_l',
          type: 'gaussian' as const,
          params: [2, 0.4],
        },
        upper_mf: {
          name: 'low_u',
          type: 'gaussian' as const,
          params: [2, 0.8],
        },
      },
      {
        name: 'high',
        lower_mf: {
          name: 'high_l',
          type: 'gaussian' as const,
          params: [8, 0.4],
        },
        upper_mf: {
          name: 'high_u',
          type: 'gaussian' as const,
          params: [8, 0.8],
        },
      },
    ];

    it('defuzzified value is between set centroids', () => {
      const r = engine.type2Defuzzify(type2Sets, 5);
      expect(r.defuzzified_value).toBeGreaterThanOrEqual(2);
      expect(r.defuzzified_value).toBeLessThanOrEqual(8);
    });

    it('centroid interval: left <= right', () => {
      const r = engine.type2Defuzzify(type2Sets, 5);
      expect(r.centroid_interval[0])
        .toBeLessThanOrEqual(r.centroid_interval[1]);
    });

    it('defuzzified = avg of centroid interval', () => {
      const r = engine.type2Defuzzify(type2Sets, 5);
      const avg = (r.centroid_interval[0] + r.centroid_interval[1]) / 2;
      expect(r.defuzzified_value).toBeCloseTo(avg, 5);
    });

    it('empty sets returns zeros', () => {
      const r = engine.type2Defuzzify([], 5);
      expect(r.defuzzified_value).toBe(0);
    });

    it('warns when upper MF < lower MF', () => {
      const badSets = [
        {
          name: 'bad',
          lower_mf: {
            name: 'lo',
            type: 'gaussian' as const,
            params: [5, 2],
          },
          upper_mf: {
            name: 'up',
            type: 'gaussian' as const,
            params: [5, 0.1], // Narrower → lower at non-peak
          },
        },
      ];
      const warnings: string[] = [];
      engine.type2Defuzzify(badSets, 3, warnings);
      // At x=3, upper (sigma=0.1) < lower (sigma=2)
      expect(
        warnings.some(w => w.includes('upper MF < lower MF'))
      ).toBe(true);
    });
  });

  // ── Fuzzy AHP ────────────────────────────────────────────────────
  describe('fuzzyAHP()', () => {
    const ahpInput = {
      criteria: ['cost', 'quality', 'time'],
      comparisons: [
        { i: 0, j: 1, value: 3 },  // cost 3x quality
        { i: 0, j: 2, value: 5 },  // cost 5x time
        { i: 1, j: 2, value: 2 },  // quality 2x time
      ],
      alternatives: ['machine_A', 'machine_B'],
      alt_comparisons: [
        {
          criterion_idx: 0,
          comparisons: [{ i: 0, j: 1, value: 2 }],
        },
        {
          criterion_idx: 1,
          comparisons: [{ i: 0, j: 1, value: 0.5 }],
        },
        {
          criterion_idx: 2,
          comparisons: [{ i: 0, j: 1, value: 1 }],
        },
      ],
    };

    it('criteria weights sum to 1', () => {
      const r = engine.fuzzyAHP(ahpInput);
      const sum = r.criteria_weights.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 4);
    });

    it('criteria weights are all positive', () => {
      const r = engine.fuzzyAHP(ahpInput);
      for (const w of r.criteria_weights) {
        expect(w).toBeGreaterThan(0);
      }
    });

    it('consistent comparisons have CR < 0.1', () => {
      const r = engine.fuzzyAHP(ahpInput);
      expect(r.consistency_ratio).toBeLessThan(0.1);
      expect(r.consistent).toBe(true);
    });

    it('returns a best alternative', () => {
      const r = engine.fuzzyAHP(ahpInput);
      expect(r.best_alternative).toBeTruthy();
      expect(
        ['machine_A', 'machine_B']
      ).toContain(r.best_alternative);
    });

    it('alternative scores array matches alt count', () => {
      const r = engine.fuzzyAHP(ahpInput);
      expect(r.alternative_scores).toHaveLength(2);
    });

    it('warns on inconsistent comparisons (CR >= 0.1)', () => {
      const warnings: string[] = [];
      engine.fuzzyAHP(
        {
          criteria: ['a', 'b', 'c'],
          comparisons: [
            { i: 0, j: 1, value: 9 },
            { i: 0, j: 2, value: 1 / 9 },
            { i: 1, j: 2, value: 9 }, // Contradictory
          ],
          alternatives: ['x'],
          alt_comparisons: [],
        },
        warnings
      );
      expect(warnings.some(w => w.includes('CR='))).toBe(true);
    });

    it('handles 2 criteria (no consistency issue)', () => {
      const r = engine.fuzzyAHP({
        criteria: ['a', 'b'],
        comparisons: [{ i: 0, j: 1, value: 3 }],
        alternatives: ['x'],
        alt_comparisons: [
          {
            criterion_idx: 0,
            comparisons: [],
          },
        ],
      });
      expect(r.consistent).toBe(true);
      expect(r.criteria_weights).toHaveLength(2);
    });

    it('warns with < 2 criteria', () => {
      const warnings: string[] = [];
      engine.fuzzyAHP(
        {
          criteria: ['only'],
          comparisons: [],
          alternatives: [],
          alt_comparisons: [],
        },
        warnings
      );
      expect(
        warnings.some(w => w.includes('at least 2'))
      ).toBe(true);
    });
  });
});
