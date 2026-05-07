/**
 * WEDMWireBreakRiskCostEngine Tests
 * WEDM-P2P-PRODUCTION-MS0 U-PROD-19
 */

import { describe, it, expect } from 'vitest';
import { wedmWireBreakRiskCostEngine } from '../engines/WEDMWireBreakRiskCostEngine.js';

describe('WEDMWireBreakRiskCostEngine', () => {
  const baseInput = {
    material: 'tool_steel',
    thickness_mm: 25,
    wire_diameter_mm: 0.25,
    wire_type: 'brass' as const,
    current_density_A_mm2: 300,
    tension_N: 8,
    has_thin_walls: false,
    has_sharp_corners: false,
    cut_length_mm: 500,
    machine_hourly_rate_usd: 85,
    part_value_usd: 200,
  };

  describe('calculate', () => {
    it('returns AtomicValue for break probability', () => {
      const result = wedmWireBreakRiskCostEngine.calculate(baseInput);
      expect(result.break_probability_per_meter).toBeDefined();
      expect(result.break_probability_per_meter.value).toBeGreaterThan(0);
      expect(result.break_probability_per_meter.unit).toBe('breaks/m');
      expect(result.break_probability_per_meter.source).toContain('Rajurkar-Wang');
    });

    it('returns expected breaks per job', () => {
      const result = wedmWireBreakRiskCostEngine.calculate(baseInput);
      expect(result.expected_breaks_per_job.value).toBeGreaterThanOrEqual(0);
      expect(result.expected_breaks_per_job.unit).toBe('breaks');
    });

    it('calculates re-thread time based on wire type', () => {
      const brassResult = wedmWireBreakRiskCostEngine.calculate(baseInput);
      const molyResult = wedmWireBreakRiskCostEngine.calculate({
        ...baseInput,
        wire_type: 'moly',
      });
      expect(molyResult.re_thread_time_min.value).toBeGreaterThan(
        brassResult.re_thread_time_min.value
      );
    });

    it('calculates cost per break including scrap risk', () => {
      const result = wedmWireBreakRiskCostEngine.calculate(baseInput);
      expect(result.cost_per_break_usd.value).toBeGreaterThan(0);
      expect(result.cost_per_break_usd.unit).toBe('USD');
    });

    it('returns total break risk cost', () => {
      const result = wedmWireBreakRiskCostEngine.calculate(baseInput);
      expect(result.total_break_risk_cost_usd.value).toBeGreaterThanOrEqual(0);
    });

    it('increases risk for thin walls', () => {
      const normalResult = wedmWireBreakRiskCostEngine.calculate(baseInput);
      const thinWallResult = wedmWireBreakRiskCostEngine.calculate({
        ...baseInput,
        has_thin_walls: true,
      });
      expect(thinWallResult.break_probability_per_meter.value).toBeGreaterThan(
        normalResult.break_probability_per_meter.value
      );
    });

    it('increases risk for sharp corners', () => {
      const normalResult = wedmWireBreakRiskCostEngine.calculate(baseInput);
      const sharpCornerResult = wedmWireBreakRiskCostEngine.calculate({
        ...baseInput,
        has_sharp_corners: true,
      });
      expect(sharpCornerResult.break_probability_per_meter.value).toBeGreaterThan(
        normalResult.break_probability_per_meter.value
      );
    });

    it('increases risk at high current density', () => {
      const lowDensityResult = wedmWireBreakRiskCostEngine.calculate({
        ...baseInput,
        current_density_A_mm2: 200,
      });
      const highDensityResult = wedmWireBreakRiskCostEngine.calculate({
        ...baseInput,
        current_density_A_mm2: 450,
      });
      expect(highDensityResult.break_probability_per_meter.value).toBeGreaterThan(
        lowDensityResult.break_probability_per_meter.value
      );
    });

    it('categorizes risk levels correctly', () => {
      const lowRisk = wedmWireBreakRiskCostEngine.calculate({
        ...baseInput,
        current_density_A_mm2: 150,
        cut_length_mm: 100,
        tension_N: 5,
      });
      expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(lowRisk.risk_category);

      const highRisk = wedmWireBreakRiskCostEngine.calculate({
        ...baseInput,
        current_density_A_mm2: 480,
        has_thin_walls: true,
        has_sharp_corners: true,
      });
      expect(['HIGH', 'CRITICAL']).toContain(highRisk.risk_category);
    });

    it('provides recommendations for high risk jobs', () => {
      const result = wedmWireBreakRiskCostEngine.calculate({
        ...baseInput,
        current_density_A_mm2: 450,
        has_thin_walls: true,
      });
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.some(r => r.includes('current') || r.includes('thin wall'))).toBe(true);
    });

    it('compares to historical average', () => {
      const result = wedmWireBreakRiskCostEngine.calculate(baseInput);
      expect(result.historical_comparison).toBeDefined();
      expect(result.historical_comparison.material_avg_breaks_per_km).toBeGreaterThan(0);
      expect(result.historical_comparison.this_job_vs_avg).toBeDefined();
    });
  });

  describe('material variations', () => {
    it('tungsten carbide has higher break risk than steel', () => {
      const steelResult = wedmWireBreakRiskCostEngine.calculate({
        ...baseInput,
        material: 'steel',
      });
      const carbideResult = wedmWireBreakRiskCostEngine.calculate({
        ...baseInput,
        material: 'tungsten_carbide',
      });
      expect(carbideResult.break_probability_per_meter.value).toBeGreaterThan(
        steelResult.break_probability_per_meter.value
      );
    });

    it('aluminum has lower break risk than hardened steel', () => {
      const aluminumResult = wedmWireBreakRiskCostEngine.calculate({
        ...baseInput,
        material: 'aluminum',
      });
      const hardenedResult = wedmWireBreakRiskCostEngine.calculate({
        ...baseInput,
        material: 'hardened_steel',
      });
      expect(aluminumResult.break_probability_per_meter.value).toBeLessThan(
        hardenedResult.break_probability_per_meter.value
      );
    });
  });

  describe('calculateBatch', () => {
    const batchInput = {
      material: 'tool_steel',
      thickness_mm: 20,
      wire_diameter_mm: 0.25,
      wire_type: 'brass' as const,
      current_density_A_mm2: 300,
      tension_N: 8,
      has_thin_walls: false,
      has_sharp_corners: false,
      machine_hourly_rate_usd: 85,
    };

    const parts = [
      { cut_length_mm: 300, part_value_usd: 100 },
      { cut_length_mm: 500, part_value_usd: 200 },
      { cut_length_mm: 200, part_value_usd: 80 },
    ];

    it('returns individual risks for each part', () => {
      const result = wedmWireBreakRiskCostEngine.calculateBatch(batchInput, parts);
      expect(result.individual_risks).toHaveLength(3);
    });

    it('calculates batch total risk cost', () => {
      const result = wedmWireBreakRiskCostEngine.calculateBatch(batchInput, parts);
      expect(result.batch_total_risk_cost_usd.value).toBeGreaterThanOrEqual(0);
      expect(result.batch_total_risk_cost_usd.unit).toBe('USD');
    });

    it('sums expected breaks across batch', () => {
      const result = wedmWireBreakRiskCostEngine.calculateBatch(batchInput, parts);
      const individualSum = result.individual_risks.reduce(
        (sum, r) => sum + r.expected_breaks_per_job.value,
        0
      );
      expect(result.batch_expected_breaks.value).toBeCloseTo(individualSum, 6);
    });

    it('assigns batch risk category', () => {
      const result = wedmWireBreakRiskCostEngine.calculateBatch(batchInput, parts);
      expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(result.batch_risk_category);
    });
  });

  describe('wire type variations', () => {
    it('tungsten wire has longer re-thread time', () => {
      const brassResult = wedmWireBreakRiskCostEngine.calculate(baseInput);
      const tungstenResult = wedmWireBreakRiskCostEngine.calculate({
        ...baseInput,
        wire_type: 'tungsten',
      });
      expect(tungstenResult.re_thread_time_min.value).toBeGreaterThan(
        brassResult.re_thread_time_min.value
      );
    });

    it('zinc coated wire has slightly higher re-thread time than brass', () => {
      const brassResult = wedmWireBreakRiskCostEngine.calculate(baseInput);
      const zincResult = wedmWireBreakRiskCostEngine.calculate({
        ...baseInput,
        wire_type: 'zinc_coated',
      });
      expect(zincResult.re_thread_time_min.value).toBeGreaterThan(
        brassResult.re_thread_time_min.value
      );
    });
  });

  describe('thickness effects', () => {
    it('thin material increases break risk', () => {
      const thinResult = wedmWireBreakRiskCostEngine.calculate({
        ...baseInput,
        thickness_mm: 3,
      });
      const normalResult = wedmWireBreakRiskCostEngine.calculate({
        ...baseInput,
        thickness_mm: 25,
      });
      expect(thinResult.break_probability_per_meter.value).toBeGreaterThan(
        normalResult.break_probability_per_meter.value
      );
    });

    it('very thick material also increases risk slightly', () => {
      const normalResult = wedmWireBreakRiskCostEngine.calculate({
        ...baseInput,
        thickness_mm: 30,
      });
      const thickResult = wedmWireBreakRiskCostEngine.calculate({
        ...baseInput,
        thickness_mm: 100,
      });
      expect(thickResult.break_probability_per_meter.value).toBeGreaterThan(
        normalResult.break_probability_per_meter.value
      );
    });
  });

  describe('calculateGauge', () => {
    it('returns probability_per_job in [0, 1]', () => {
      const result = wedmWireBreakRiskCostEngine.calculateGauge(baseInput);
      expect(result.probability_per_job).toBeGreaterThanOrEqual(0);
      expect(result.probability_per_job).toBeLessThanOrEqual(1);
    });

    it('satisfies Poisson CDF: P(>=1) = 1 - exp(-lambda)', () => {
      const result = wedmWireBreakRiskCostEngine.calculateGauge(baseInput);
      const lambda = result.expected_breaks_per_job;
      const expectedP = 1 - Math.exp(-lambda);
      expect(result.probability_per_job).toBeCloseTo(expectedP, 9);
    });

    it('probability_per_job <= expected_breaks (Poisson inequality)', () => {
      // For any lambda >= 0, 1 - e^(-lambda) <= lambda. Equality at lambda=0.
      const result = wedmWireBreakRiskCostEngine.calculateGauge({
        ...baseInput,
        cut_length_mm: 2_000_000, // very long cut → large lambda
      });
      expect(result.probability_per_job).toBeLessThanOrEqual(
        result.expected_breaks_per_job + 1e-9,
      );
    });

    it('saturates near 1 for very long cuts (lambda large)', () => {
      const result = wedmWireBreakRiskCostEngine.calculateGauge({
        ...baseInput,
        cut_length_mm: 100_000_000, // 100 km → lambda >> 1
        current_density_A_mm2: 450,
      });
      expect(result.probability_per_job).toBeGreaterThan(0.99);
      expect(result.probability_per_job).toBeLessThanOrEqual(1);
    });

    it('returns 5 factor_contributions in stable order', () => {
      const result = wedmWireBreakRiskCostEngine.calculateGauge(baseInput);
      expect(result.factor_contributions).toHaveLength(5);
      expect(result.factor_contributions.map(f => f.name)).toEqual([
        'Current density',
        'Wire tension',
        'Material thickness',
        'Thin walls',
        'Sharp corners',
      ]);
    });

    it('factor contributions sum to ~100% when any factor > 1', () => {
      const result = wedmWireBreakRiskCostEngine.calculateGauge({
        ...baseInput,
        current_density_A_mm2: 450, // density > 0.8 threshold → mult > 1
        has_thin_walls: true,
        has_sharp_corners: true,
      });
      const total = result.factor_contributions.reduce(
        (s, f) => s + f.contribution_pct,
        0,
      );
      expect(total).toBeCloseTo(100, 6);
    });

    it('returns 0% contribution for all factors when all multipliers = 1', () => {
      // All drivers must stay below their excess-risk thresholds:
      //   • density ratio ≤ 0.8  (brass max = 500 A/mm²)
      //   • tension ratio ≤ 0.7  (NOTE: getMaxTension's `× 0.001` scale factor
      //     yields a very small ceiling for 0.25 mm brass wire, so tension_N
      //     must be correspondingly tiny here — not a realistic run value,
      //     but the only way to exercise the "no excess risk" branch against
      //     the engine's current formula.)
      //   • thickness in [10, 50) mm
      //   • no thin walls, no sharp corners
      const result = wedmWireBreakRiskCostEngine.calculateGauge({
        ...baseInput,
        thickness_mm: 25,
        current_density_A_mm2: 300,  // 300/500 = 0.60 < 0.80
        tension_N: 0.02,             // stays below the (scaled) 70% threshold
        has_thin_walls: false,
        has_sharp_corners: false,
      });
      const total = result.factor_contributions.reduce(
        (s, f) => s + f.contribution_pct,
        0,
      );
      expect(total).toBeCloseTo(0, 6);
      // Every factor should be at 0% (no excess risk).
      for (const f of result.factor_contributions) {
        expect(f.contribution_pct).toBeCloseTo(0, 6);
      }
    });

    it('thin walls contributes positively when enabled', () => {
      const result = wedmWireBreakRiskCostEngine.calculateGauge({
        ...baseInput,
        has_thin_walls: true,
      });
      const thinWallsFactor = result.factor_contributions.find(
        f => f.name === 'Thin walls',
      );
      expect(thinWallsFactor).toBeDefined();
      expect(thinWallsFactor!.multiplier).toBeCloseTo(1.8, 6);
      expect(thinWallsFactor!.contribution_pct).toBeGreaterThan(0);
    });

    it('sharp corners contributes less than thin walls (1.5 vs 1.8 multiplier)', () => {
      const result = wedmWireBreakRiskCostEngine.calculateGauge({
        ...baseInput,
        has_thin_walls: true,
        has_sharp_corners: true,
        thickness_mm: 25,
      });
      const thinWalls = result.factor_contributions.find(f => f.name === 'Thin walls')!;
      const sharpCorners = result.factor_contributions.find(f => f.name === 'Sharp corners')!;
      // ln(1.8) ≈ 0.588 vs ln(1.5) ≈ 0.405; thin walls dominates.
      expect(thinWalls.contribution_pct).toBeGreaterThan(sharpCorners.contribution_pct);
    });

    it('risk_category matches calculate() for same input', () => {
      const gaugeResult = wedmWireBreakRiskCostEngine.calculateGauge(baseInput);
      const baseResult = wedmWireBreakRiskCostEngine.calculate(baseInput);
      expect(gaugeResult.risk_category).toBe(baseResult.risk_category);
    });

    it('flat scalars match AtomicValue payloads from calculate()', () => {
      const gaugeResult = wedmWireBreakRiskCostEngine.calculateGauge(baseInput);
      const baseResult = wedmWireBreakRiskCostEngine.calculate(baseInput);
      expect(gaugeResult.probability_per_meter).toBe(
        baseResult.break_probability_per_meter.value,
      );
      expect(gaugeResult.expected_breaks_per_job).toBe(
        baseResult.expected_breaks_per_job.value,
      );
      expect(gaugeResult.cost_per_break_usd).toBe(baseResult.cost_per_break_usd.value);
      expect(gaugeResult.total_break_risk_cost_usd).toBe(
        baseResult.total_break_risk_cost_usd.value,
      );
      expect(gaugeResult.re_thread_time_min).toBe(baseResult.re_thread_time_min.value);
    });

    it('recommendations and historical_comparison flow through unchanged', () => {
      const gaugeResult = wedmWireBreakRiskCostEngine.calculateGauge({
        ...baseInput,
        current_density_A_mm2: 450,
        has_thin_walls: true,
      });
      expect(gaugeResult.recommendations.length).toBeGreaterThan(0);
      expect(gaugeResult.historical_comparison.material_avg_breaks_per_km).toBeGreaterThan(0);
      expect(typeof gaugeResult.historical_comparison.this_job_vs_avg).toBe('string');
    });

    it('probability_per_job monotonically increases with current density', () => {
      const low = wedmWireBreakRiskCostEngine.calculateGauge({
        ...baseInput,
        current_density_A_mm2: 200,
      });
      const high = wedmWireBreakRiskCostEngine.calculateGauge({
        ...baseInput,
        current_density_A_mm2: 450,
      });
      expect(high.probability_per_job).toBeGreaterThan(low.probability_per_job);
    });
  });

  describe('uncertainty and confidence', () => {
    it('all AtomicValues have uncertainty', () => {
      const result = wedmWireBreakRiskCostEngine.calculate(baseInput);
      expect(result.break_probability_per_meter.uncertainty).toBeGreaterThan(0);
      expect(result.expected_breaks_per_job.uncertainty).toBeGreaterThanOrEqual(0);
      expect(result.re_thread_time_min.uncertainty).toBeGreaterThan(0);
      expect(result.cost_per_break_usd.uncertainty).toBeGreaterThan(0);
    });

    it('all AtomicValues have confidence scores', () => {
      const result = wedmWireBreakRiskCostEngine.calculate(baseInput);
      expect(result.break_probability_per_meter.confidence).toBeGreaterThan(0);
      expect(result.break_probability_per_meter.confidence).toBeLessThanOrEqual(1);
    });
  });
});
