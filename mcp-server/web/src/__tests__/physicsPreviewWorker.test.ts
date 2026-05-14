/**
 * Physics Preview Worker Tests
 * @milestone LATHE-PROD-READY-MS0 U-LPR-WEBWORKER
 */

import { describe, it, expect } from 'vitest';
import { calculate, calculateBatch, type PhysicsPreviewInput } from '../workers/physicsPreview.worker';

describe('physicsPreview.worker', () => {
  describe('calculate cutting_force', () => {
    it('calculates Kienzle cutting force with defaults', () => {
      const result = calculate({
        operation: 'cutting_force',
        params: {},
      });

      expect(result.operation).toBe('cutting_force');
      expect(result.unit).toBe('N');
      expect(result.confidence).toBe('preview');
      expect(result.value).toBeGreaterThan(0);
    });

    it('calculates with custom parameters', () => {
      const result = calculate({
        operation: 'cutting_force',
        params: { kc11: 2000, mc: 0.25, ap: 3, f: 0.3 },
      });

      // Fc = kc11 * ap * f^(1-mc) = 2000 * 3 * 0.3^0.75 ≈ 2431
      expect(result.value).toBeGreaterThan(2000);
      expect(result.value).toBeLessThan(3000);
    });

    it('warns on high cutting force', () => {
      const result = calculate({
        operation: 'cutting_force',
        params: { kc11: 3000, ap: 5, f: 0.5 },
      });

      expect(result.warning).toBeDefined();
      expect(result.warning).toContain('High cutting force');
    });
  });

  describe('calculate surface_finish', () => {
    it('calculates ideal Ra with defaults', () => {
      const result = calculate({
        operation: 'surface_finish',
        params: {},
      });

      expect(result.operation).toBe('surface_finish');
      expect(result.unit).toBe('µm Ra');
      expect(result.value).toBeGreaterThan(0);
    });

    it('Ra increases with feed squared', () => {
      const low = calculate({
        operation: 'surface_finish',
        params: { f: 0.1, r: 0.8 },
      });

      const high = calculate({
        operation: 'surface_finish',
        params: { f: 0.2, r: 0.8 },
      });

      // Ra ∝ f², so doubling f should ~4x Ra
      expect(high.value / low.value).toBeCloseTo(4, 0);
    });

    it('warns on rough finish', () => {
      const result = calculate({
        operation: 'surface_finish',
        params: { f: 0.5, r: 0.4 },
      });

      expect(result.warning).toBeDefined();
      expect(result.warning).toContain('Rough finish');
    });
  });

  describe('calculate cycle_time', () => {
    it('calculates cycle time', () => {
      const result = calculate({
        operation: 'cycle_time',
        params: { length: 100, f: 0.2, rpm: 1000, passes: 1, rapidTime: 5 },
      });

      expect(result.operation).toBe('cycle_time');
      expect(result.unit).toBe('s');
      // feedRate = 0.2 * 1000 = 200 mm/min
      // cutTime = (100 / 200) * 60 = 30s
      // total = 30 + 5 = 35s
      expect(result.value).toBeCloseTo(35, 0);
    });
  });

  describe('calculate deflection', () => {
    it('calculates tool deflection', () => {
      const result = calculate({
        operation: 'deflection',
        params: { force: 500, length: 40, diameter: 20, E: 210000 },
      });

      expect(result.operation).toBe('deflection');
      expect(result.unit).toBe('mm');
      expect(result.value).toBeGreaterThan(0);
      expect(result.value).toBeLessThan(1);
    });

    it('deflection increases with overhang cubed', () => {
      const short = calculate({
        operation: 'deflection',
        params: { force: 500, length: 20, diameter: 20 },
      });

      const long = calculate({
        operation: 'deflection',
        params: { force: 500, length: 40, diameter: 20 },
      });

      // δ ∝ L³, so doubling L should ~8x δ (rounding affects precision)
      expect(long.value / short.value).toBeGreaterThan(6);
      expect(long.value / short.value).toBeLessThan(10);
    });

    it('warns on high deflection', () => {
      const result = calculate({
        operation: 'deflection',
        params: { force: 2000, length: 60, diameter: 16 },
      });

      expect(result.warning).toBeDefined();
      expect(result.warning).toContain('High deflection');
    });
  });

  describe('unknown operation', () => {
    it('handles unknown operation gracefully', () => {
      const result = calculate({
        operation: 'unknown_op' as 'cutting_force',
        params: {},
      });

      expect(result.value).toBe(0);
      expect(result.warning).toContain('Unknown operation');
    });
  });

  describe('calculateBatch', () => {
    it('calculates multiple operations', () => {
      const inputs: PhysicsPreviewInput[] = [
        { operation: 'cutting_force', params: { ap: 2 } },
        { operation: 'surface_finish', params: { f: 0.15 } },
        { operation: 'cycle_time', params: { length: 50 } },
      ];

      const results = calculateBatch(inputs);

      expect(results).toHaveLength(3);
      expect(results[0].operation).toBe('cutting_force');
      expect(results[1].operation).toBe('surface_finish');
      expect(results[2].operation).toBe('cycle_time');
    });

    it('handles empty batch', () => {
      const results = calculateBatch([]);
      expect(results).toHaveLength(0);
    });
  });
});
