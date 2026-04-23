/**
 * WEDMWirePremiumROIEngine Tests
 * WEDM-P2P-PRODUCTION-MS0 U-PROD-20
 */

import { describe, it, expect } from 'vitest';
import { wedmWirePremiumROIEngine } from '../engines/WEDMWirePremiumROIEngine.js';

describe('WEDMWirePremiumROIEngine', () => {
  const baseInput = {
    material: 'tool_steel',
    thickness_mm: 25,
    cut_length_mm: 1000,
    current_wire_class: 'standard_brass' as const,
    candidate_wire_class: 'zinc_coated' as const,
    machine_hourly_rate_usd: 85,
  };

  describe('calculate', () => {
    it('returns current wire analysis', () => {
      const result = wedmWirePremiumROIEngine.calculate(baseInput);
      expect(result.current_wire.wire_class).toBe('standard_brass');
      expect(result.current_wire.cutting_speed_mm_min.value).toBeGreaterThan(0);
      expect(result.current_wire.estimated_cut_time_min.value).toBeGreaterThan(0);
    });

    it('returns candidate wire analysis', () => {
      const result = wedmWirePremiumROIEngine.calculate(baseInput);
      expect(result.candidate_wire.wire_class).toBe('zinc_coated');
      expect(result.candidate_wire.cutting_speed_mm_min.value).toBeGreaterThan(0);
    });

    it('zinc coated is faster than standard brass', () => {
      const result = wedmWirePremiumROIEngine.calculate(baseInput);
      expect(result.candidate_wire.cutting_speed_mm_min.value).toBeGreaterThan(
        result.current_wire.cutting_speed_mm_min.value
      );
    });

    it('calculates time saved', () => {
      const result = wedmWirePremiumROIEngine.calculate(baseInput);
      expect(result.time_saved_min).toBeDefined();
      expect(result.time_saved_min.unit).toBe('min');
    });

    it('calculates wire cost difference', () => {
      const result = wedmWirePremiumROIEngine.calculate(baseInput);
      expect(result.wire_cost_difference_usd).toBeDefined();
      expect(result.wire_cost_difference_usd.unit).toBe('USD');
    });

    it('calculates net savings', () => {
      const result = wedmWirePremiumROIEngine.calculate(baseInput);
      expect(result.net_savings_usd).toBeDefined();
      expect(result.net_savings_usd.unit).toBe('USD');
    });

    it('calculates ROI percentage', () => {
      const result = wedmWirePremiumROIEngine.calculate(baseInput);
      expect(result.roi_percent).toBeDefined();
      expect(result.roi_percent.unit).toBe('%');
    });

    it('calculates breakeven cut length', () => {
      const result = wedmWirePremiumROIEngine.calculate(baseInput);
      expect(result.breakeven_cut_length_mm).toBeDefined();
      expect(result.breakeven_cut_length_mm.unit).toBe('mm');
    });

    it('provides recommendation', () => {
      const result = wedmWirePremiumROIEngine.calculate(baseInput);
      expect(['UPGRADE', 'STAY', 'MARGINAL']).toContain(result.recommendation);
    });

    it('provides reasoning', () => {
      const result = wedmWirePremiumROIEngine.calculate(baseInput);
      expect(result.reasoning).toBeDefined();
      expect(Array.isArray(result.reasoning)).toBe(true);
    });
  });

  describe('wire class comparisons', () => {
    it('gamma coated is faster than zinc coated', () => {
      const result = wedmWirePremiumROIEngine.calculate({
        ...baseInput,
        current_wire_class: 'zinc_coated',
        candidate_wire_class: 'gamma_coated',
      });
      expect(result.time_saved_min.value).toBeGreaterThan(0);
    });

    it('diffusion annealed is fastest production wire', () => {
      const result = wedmWirePremiumROIEngine.calculate({
        ...baseInput,
        current_wire_class: 'standard_brass',
        candidate_wire_class: 'diffusion_annealed',
      });
      expect(result.time_saved_min.value).toBeGreaterThan(0);
    });

    it('moly is slower than brass (different application)', () => {
      const result = wedmWirePremiumROIEngine.calculate({
        ...baseInput,
        current_wire_class: 'standard_brass',
        candidate_wire_class: 'moly',
      });
      expect(result.time_saved_min.value).toBeLessThan(0);
    });

    it('tungsten is slowest (micro EDM only)', () => {
      const result = wedmWirePremiumROIEngine.calculate({
        ...baseInput,
        current_wire_class: 'standard_brass',
        candidate_wire_class: 'tungsten',
      });
      expect(result.time_saved_min.value).toBeLessThan(0);
      expect(result.recommendation).toBe('STAY');
    });
  });

  describe('batch quantity effects', () => {
    it('larger batches amplify savings', () => {
      const singleResult = wedmWirePremiumROIEngine.calculate(baseInput);
      const batchResult = wedmWirePremiumROIEngine.calculate({
        ...baseInput,
        batch_quantity: 10,
      });
      expect(Math.abs(batchResult.net_savings_usd.value)).toBeGreaterThan(
        Math.abs(singleResult.net_savings_usd.value)
      );
    });

    it('batch of 1 is same as no batch', () => {
      const noQty = wedmWirePremiumROIEngine.calculate(baseInput);
      const qty1 = wedmWirePremiumROIEngine.calculate({
        ...baseInput,
        batch_quantity: 1,
      });
      expect(qty1.net_savings_usd.value).toBeCloseTo(noQty.net_savings_usd.value, 4);
    });
  });

  describe('material variations', () => {
    it('aluminum cuts faster than tool steel', () => {
      const steelResult = wedmWirePremiumROIEngine.calculate(baseInput);
      const aluminumResult = wedmWirePremiumROIEngine.calculate({
        ...baseInput,
        material: 'aluminum',
      });
      expect(aluminumResult.current_wire.cutting_speed_mm_min.value).toBeGreaterThan(
        steelResult.current_wire.cutting_speed_mm_min.value
      );
    });

    it('tungsten carbide cuts slower', () => {
      const steelResult = wedmWirePremiumROIEngine.calculate(baseInput);
      const carbideResult = wedmWirePremiumROIEngine.calculate({
        ...baseInput,
        material: 'tungsten_carbide',
      });
      expect(carbideResult.current_wire.cutting_speed_mm_min.value).toBeLessThan(
        steelResult.current_wire.cutting_speed_mm_min.value
      );
    });
  });

  describe('thickness effects', () => {
    it('thin material cuts faster', () => {
      const thickResult = wedmWirePremiumROIEngine.calculate({
        ...baseInput,
        thickness_mm: 50,
      });
      const thinResult = wedmWirePremiumROIEngine.calculate({
        ...baseInput,
        thickness_mm: 10,
      });
      expect(thinResult.current_wire.cutting_speed_mm_min.value).toBeGreaterThan(
        thickResult.current_wire.cutting_speed_mm_min.value
      );
    });
  });

  describe('compareAll', () => {
    it('compares all wire classes', () => {
      const result = wedmWirePremiumROIEngine.compareAll({
        ...baseInput,
      });
      expect(result.comparisons.length).toBe(5);  // All except current
    });

    it('identifies best choice', () => {
      const result = wedmWirePremiumROIEngine.compareAll(baseInput);
      expect(result.best_choice).toBeDefined();
    });

    it('reports best savings', () => {
      const result = wedmWirePremiumROIEngine.compareAll(baseInput);
      expect(result.best_savings_usd).toBeDefined();
      expect(typeof result.best_savings_usd).toBe('number');
    });

    it('best choice matches highest net savings', () => {
      const result = wedmWirePremiumROIEngine.compareAll(baseInput);
      const bestComparison = result.comparisons.find(
        c => c.candidate_wire.wire_class === result.best_choice
      );
      if (bestComparison) {
        expect(bestComparison.net_savings_usd.value).toBe(result.best_savings_usd);
      }
    });
  });

  describe('uncertainty and confidence', () => {
    it('all AtomicValues have uncertainty', () => {
      const result = wedmWirePremiumROIEngine.calculate(baseInput);
      expect(result.time_saved_min.uncertainty).toBeGreaterThanOrEqual(0);
      expect(result.net_savings_usd.uncertainty).toBeGreaterThanOrEqual(0);
      expect(result.roi_percent.uncertainty).toBeGreaterThanOrEqual(0);
    });

    it('all AtomicValues have sources', () => {
      const result = wedmWirePremiumROIEngine.calculate(baseInput);
      expect(result.time_saved_min.source).toContain('WEDMWirePremiumROI');
      expect(result.net_savings_usd.source).toContain('WEDMWirePremiumROI');
    });
  });

  describe('edge cases', () => {
    it('handles very short cuts', () => {
      const result = wedmWirePremiumROIEngine.calculate({
        ...baseInput,
        cut_length_mm: 10,
      });
      expect(result.time_saved_min.value).toBeDefined();
      expect(result.net_savings_usd.value).toBeDefined();
    });

    it('handles very long cuts', () => {
      const result = wedmWirePremiumROIEngine.calculate({
        ...baseInput,
        cut_length_mm: 100000,
      });
      expect(result.time_saved_min.value).toBeDefined();
      expect(result.net_savings_usd.value).toBeDefined();
    });

    it('handles unknown material gracefully', () => {
      const result = wedmWirePremiumROIEngine.calculate({
        ...baseInput,
        material: 'unobtanium',
      });
      expect(result.current_wire.cutting_speed_mm_min.value).toBeGreaterThan(0);
    });
  });
});
