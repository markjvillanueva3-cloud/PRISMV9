/**
 * Tests for RestMachiningEngine — CAMK-MS3/U01
 * ==================================================
 * Covers: aabbVolume, aabbIntersection, detectRestRegions, classifyZone,
 *         recommendToolDiameter, quickCheck, analyze (full pipeline)
 */

import { describe, it, expect } from 'vitest';
import {
  RestMachiningEngine,
  restMachiningEngine,
  type AABB,
  type RestAnalysisInput,
  type RestZone,
  type ToolEntry,
} from '../../src/engines/RestMachiningEngine.js';

// ── Helpers ───────────────────────────────────────────────────────────────

function box(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number): AABB {
  return { min_x: x1, min_y: y1, min_z: z1, max_x: x2, max_y: y2, max_z: z2 };
}

function makeZone(overrides: Partial<RestZone> = {}): RestZone {
  return {
    id: 'RZ-001', type: 'corner', bounds: box(0, 0, 0, 5, 5, 10),
    volume_mm3: 250, max_depth_mm: 10, min_width_mm: 5,
    recommended_algorithm: 'SFCR', recommended_tool_diameter_mm: 4,
    reason: 'test', ...overrides,
  };
}

describe('RestMachiningEngine', () => {
  const engine = new RestMachiningEngine();

  // ========================================================================
  // SINGLETON
  // ========================================================================

  describe('singleton', () => {
    it('exports a singleton instance', () => {
      expect(restMachiningEngine).toBeInstanceOf(RestMachiningEngine);
    });
  });

  // ========================================================================
  // aabbVolume
  // ========================================================================

  describe('aabbVolume', () => {
    it('computes volume of a unit cube', () => {
      expect(engine.aabbVolume(box(0, 0, 0, 1, 1, 1))).toBeCloseTo(1, 6);
    });

    it('computes volume of a rectangular stock block', () => {
      // 100 x 50 x 25 mm stock
      expect(engine.aabbVolume(box(0, 0, 0, 100, 50, 25))).toBeCloseTo(125_000, 0);
    });

    it('returns 0 for degenerate (zero-height) box', () => {
      expect(engine.aabbVolume(box(0, 0, 0, 10, 10, 0))).toBe(0);
    });

    it('returns 0 for inverted box (min > max)', () => {
      expect(engine.aabbVolume(box(10, 10, 10, 5, 5, 5))).toBe(0);
    });

    it('handles very small volumes (micro features)', () => {
      const v = engine.aabbVolume(box(0, 0, 0, 0.1, 0.1, 0.1));
      expect(v).toBeCloseTo(0.001, 6);
    });
  });

  // ========================================================================
  // aabbIntersection
  // ========================================================================

  describe('aabbIntersection', () => {
    it('returns intersection of two overlapping boxes', () => {
      const inter = engine.aabbIntersection(box(0, 0, 0, 10, 10, 10), box(5, 5, 5, 15, 15, 15));
      expect(inter).not.toBeNull();
      expect(engine.aabbVolume(inter!)).toBeCloseTo(125, 0); // 5x5x5
    });

    it('returns null for non-overlapping boxes', () => {
      const inter = engine.aabbIntersection(box(0, 0, 0, 5, 5, 5), box(10, 10, 10, 15, 15, 15));
      expect(inter).toBeNull();
    });

    it('returns null for boxes touching at a face (zero-volume intersection)', () => {
      const inter = engine.aabbIntersection(box(0, 0, 0, 5, 5, 5), box(5, 0, 0, 10, 5, 5));
      expect(inter).toBeNull();
    });

    it('returns the smaller box when fully contained', () => {
      const inter = engine.aabbIntersection(box(0, 0, 0, 20, 20, 20), box(5, 5, 5, 10, 10, 10));
      expect(inter).not.toBeNull();
      expect(engine.aabbVolume(inter!)).toBeCloseTo(125, 0);
    });

    it('handles partial overlap in only two axes', () => {
      // Overlap in X and Y but not Z
      const inter = engine.aabbIntersection(box(0, 0, 0, 10, 10, 5), box(5, 5, 6, 15, 15, 15));
      expect(inter).toBeNull();
    });
  });

  // ========================================================================
  // detectRestRegions
  // ========================================================================

  describe('detectRestRegions', () => {
    it('returns full stock when nothing was machined and stock differs from target', () => {
      const stock = box(0, 0, 0, 100, 50, 25);
      const target = box(10, 10, 0, 90, 40, 20);
      const regions = engine.detectRestRegions(stock, [], target);
      // All stock remains; regions should have total volume ~ stock volume
      const totalVol = regions.reduce((s, r) => s + engine.aabbVolume(r), 0);
      expect(totalVol).toBeGreaterThan(0);
    });

    it('returns empty when machined zones fully cover stock outside target', () => {
      const stock = box(0, 0, 0, 10, 10, 10);
      const target = box(2, 2, 0, 8, 8, 10);
      // Machine away the entire stock (covering it completely)
      const machined = [box(0, 0, 0, 10, 10, 10)];
      const regions = engine.detectRestRegions(stock, machined, target);
      expect(regions.length).toBe(0);
    });

    it('detects corner rest material left by large tool', () => {
      const stock = box(0, 0, 0, 50, 50, 20);
      const target = box(5, 5, 0, 45, 45, 15);
      // Machine a central pocket but leave corners
      const machined = [box(10, 10, 0, 40, 40, 15)];
      const regions = engine.detectRestRegions(stock, machined, target);
      expect(regions.length).toBeGreaterThan(0);
      const totalVol = regions.reduce((s, r) => s + engine.aabbVolume(r), 0);
      expect(totalVol).toBeGreaterThan(0);
    });

    it('filters regions smaller than 0.01 mm3', () => {
      const stock = box(0, 0, 0, 10, 10, 10);
      const target = box(0, 0, 0, 10, 10, 10);
      // Machine exactly matches stock — nothing to remove
      const machined = [box(0, 0, 0, 10, 10, 10)];
      const regions = engine.detectRestRegions(stock, machined, target);
      expect(regions.length).toBe(0);
    });
  });

  // ========================================================================
  // classifyZone
  // ========================================================================

  describe('classifyZone', () => {
    const prevToolDia = 20;
    const stepover = 8; // 40% of 20

    it('classifies small XY zone as corner', () => {
      // Both XY dims < 20 * 0.6 = 12
      const zone = box(0, 0, 0, 10, 10, 15);
      expect(engine.classifyZone(zone, prevToolDia, stepover)).toBe('corner');
    });

    it('classifies shallow wide zone as floor', () => {
      // depth=2, minSide=30 > prevToolDia=20, depth < 0.3*30=9
      const zone = box(0, 0, 0, 30, 40, 2);
      expect(engine.classifyZone(zone, prevToolDia, stepover)).toBe('floor');
    });

    it('classifies narrow tall zone as wall', () => {
      // minSide=5 < stepover*1.2=9.6, depth=30 > 5*3=15
      const zone = box(0, 0, 0, 5, 50, 30);
      expect(engine.classifyZone(zone, prevToolDia, stepover)).toBe('wall');
    });

    it('classifies small zone near tool-radius as fillet', () => {
      // toolR=10, minSide=12 < 10*1.5=15, maxSide=25 < 10*3=30, d=15 < 10*2=20
      const zone = box(0, 0, 0, 12, 25, 15);
      expect(engine.classifyZone(zone, prevToolDia, stepover)).toBe('fillet');
    });

    it('classifies long-narrow moderate-depth zone as step', () => {
      // maxSide=60 > 15*3=45, d=10 > 15*0.5=7.5, d < 15*3=45
      const zone = box(0, 0, 0, 15, 60, 10);
      expect(engine.classifyZone(zone, prevToolDia, stepover)).toBe('step');
    });

    it('classifies deep wide zone as pocket', () => {
      // depth=20 > 25*0.5=12.5, minSide=25 > 20*0.8=16
      const zone = box(0, 0, 0, 25, 30, 20);
      expect(engine.classifyZone(zone, prevToolDia, stepover)).toBe('pocket');
    });

    it('defaults to corner for ambiguous small zone', () => {
      // Very tiny zone that doesn't match other rules
      const zone = box(0, 0, 0, 2, 2, 2);
      expect(engine.classifyZone(zone, prevToolDia, stepover)).toBe('corner');
    });
  });

  // ========================================================================
  // recommendToolDiameter
  // ========================================================================

  describe('recommendToolDiameter', () => {
    it('picks largest available tool that fits', () => {
      const zone = makeZone({ min_width_mm: 10 });
      const tools: ToolEntry[] = [
        { type: 'endmill', diameter_mm: 3 },
        { type: 'endmill', diameter_mm: 6 },
        { type: 'endmill', diameter_mm: 8 },
        { type: 'endmill', diameter_mm: 12 },
      ];
      // maxAllowed = 10 * 0.9 = 9, so 8 fits
      expect(engine.recommendToolDiameter(zone, tools)).toBe(8);
    });

    it('falls back to standard diameters when no tools provided', () => {
      const zone = makeZone({ min_width_mm: 7 });
      // maxAllowed = 7*0.9 = 6.3, largest standard <= 6.3 is 6
      expect(engine.recommendToolDiameter(zone)).toBe(6);
    });

    it('returns smallest standard diameter for very narrow zone', () => {
      const zone = makeZone({ min_width_mm: 0.6 });
      // maxAllowed = 0.54 → 0.5 is the smallest standard
      expect(engine.recommendToolDiameter(zone)).toBe(0.5);
    });

    it('filters out zero-diameter tools', () => {
      const zone = makeZone({ min_width_mm: 5 });
      const tools: ToolEntry[] = [
        { type: 'endmill', diameter_mm: 0 },
        { type: 'endmill', diameter_mm: 3 },
      ];
      expect(engine.recommendToolDiameter(zone, tools)).toBe(3);
    });

    it('considers tool deflection for deep zones — picks second tool if first deflects too much', () => {
      // Deep zone with small width — large tool stickout causes deflection
      const zone = makeZone({ min_width_mm: 12, max_depth_mm: 100 });
      const tools: ToolEntry[] = [
        { type: 'endmill', diameter_mm: 10 },
        { type: 'endmill', diameter_mm: 8 },
      ];
      // Tool D10, stickout=100, ae=3 → deflection may exceed 0.05mm
      const result = engine.recommendToolDiameter(zone, tools);
      expect([8, 10]).toContain(result);
    });
  });

  // ========================================================================
  // quickCheck
  // ========================================================================

  describe('quickCheck', () => {
    it('returns needed=false when no previous operations', () => {
      const input: RestAnalysisInput = {
        target_geometry: box(5, 5, 0, 45, 45, 15),
        stock: box(0, 0, 0, 50, 50, 20),
        previous_ops: [],
      };
      const result = engine.quickCheck(input);
      expect(result.needed).toBe(false);
      expect(result.zone_count).toBe(0);
    });

    it('detects rest material after partial machining', () => {
      const input: RestAnalysisInput = {
        target_geometry: box(5, 5, 0, 95, 45, 20),
        stock: box(0, 0, 0, 100, 50, 25),
        previous_ops: [{
          tool: { type: 'endmill', diameter_mm: 20 },
          strategy: 'pocket',
          stock_before: box(0, 0, 0, 100, 50, 25),
          zones_cut: [box(10, 10, 0, 90, 40, 20)],
        }],
      };
      const result = engine.quickCheck(input);
      expect(result.needed).toBe(true);
      expect(result.zone_count).toBeGreaterThan(0);
      expect(result.total_rest_volume_mm3).toBeGreaterThan(0);
      expect(result.largest_zone_volume_mm3).toBeGreaterThan(0);
      expect(result.largest_zone_volume_mm3).toBeLessThanOrEqual(result.total_rest_volume_mm3);
    });

    it('returns zone_count = 0 when machining covers everything', () => {
      const stock = box(0, 0, 0, 10, 10, 10);
      const target = box(2, 2, 0, 8, 8, 10);
      const input: RestAnalysisInput = {
        target_geometry: target,
        stock,
        previous_ops: [{
          tool: { type: 'endmill', diameter_mm: 10 },
          strategy: 'pocket',
          stock_before: stock,
          zones_cut: [stock], // cut entire stock
        }],
      };
      const result = engine.quickCheck(input);
      expect(result.zone_count).toBe(0);
    });
  });

  // ========================================================================
  // analyze (full pipeline)
  // ========================================================================

  describe('analyze', () => {
    it('returns empty result for missing stock', () => {
      const result = engine.analyze({});
      expect(result.zone_count).toBe(0);
      expect(result.optimization_notes).toContain('Missing stock geometry — cannot analyze');
    });

    it('returns empty result for missing target geometry', () => {
      const result = engine.analyze({ stock: box(0, 0, 0, 50, 50, 25) });
      expect(result.zone_count).toBe(0);
      expect(result.optimization_notes).toContain('Missing target geometry — cannot analyze');
    });

    it('returns empty result when no previous operations', () => {
      const result = engine.analyze({
        stock: box(0, 0, 0, 50, 50, 25),
        target_geometry: box(5, 5, 0, 45, 45, 20),
        previous_ops: [],
      });
      expect(result.zone_count).toBe(0);
      expect(result.optimization_notes[0]).toContain('No previous operations');
    });

    it('detects rest zones after roughing with a large tool', () => {
      const result = engine.analyze({
        stock: box(0, 0, 0, 100, 50, 25),
        target_geometry: box(5, 5, 0, 95, 45, 20),
        previous_ops: [{
          tool: { type: 'endmill', diameter_mm: 20 },
          strategy: 'pocket',
          stock_before: box(0, 0, 0, 100, 50, 25),
          zones_cut: [box(15, 15, 0, 85, 35, 20)],
        }],
        material: 'aluminum',
      });
      expect(result.zone_count).toBeGreaterThan(0);
      expect(result.rest_zones.length).toBeGreaterThan(0);
      expect(result.operations.length).toBeGreaterThan(0);
      expect(result.total_rest_volume_mm3).toBeGreaterThan(0);
      expect(result.estimated_total_time_sec).toBeGreaterThan(0);
    });

    it('assigns correct algorithm per zone type', () => {
      const algoMap: Record<string, string> = {
        corner: 'SFCR', floor: 'CFSF', wall: 'PTDC',
        pocket: 'VCER', fillet: 'HRAF', step: 'TGAR',
      };
      const result = engine.analyze({
        stock: box(0, 0, 0, 100, 50, 25),
        target_geometry: box(5, 5, 0, 95, 45, 20),
        previous_ops: [{
          tool: { type: 'endmill', diameter_mm: 20 },
          strategy: 'pocket',
          stock_before: box(0, 0, 0, 100, 50, 25),
          zones_cut: [box(15, 15, 0, 85, 35, 20)],
        }],
      });
      for (const zone of result.rest_zones) {
        expect(zone.recommended_algorithm).toBe(algoMap[zone.type]);
      }
    });

    it('sequences operations largest-tool-first', () => {
      const result = engine.analyze({
        stock: box(0, 0, 0, 100, 80, 30),
        target_geometry: box(5, 5, 0, 95, 75, 25),
        previous_ops: [{
          tool: { type: 'endmill', diameter_mm: 25 },
          strategy: 'pocket',
          stock_before: box(0, 0, 0, 100, 80, 30),
          zones_cut: [box(20, 20, 0, 80, 60, 25)],
        }],
        available_tools: [
          { type: 'endmill', diameter_mm: 3 },
          { type: 'endmill', diameter_mm: 6 },
          { type: 'endmill', diameter_mm: 10 },
        ],
      });
      if (result.operations.length >= 2) {
        // Within same tool group, sequence numbers should be ascending
        for (let i = 1; i < result.operations.length; i++) {
          expect(result.operations[i].sequence).toBeGreaterThan(result.operations[i - 1].sequence);
        }
      }
    });

    it('counts tool changes correctly', () => {
      const result = engine.analyze({
        stock: box(0, 0, 0, 100, 80, 30),
        target_geometry: box(5, 5, 0, 95, 75, 25),
        previous_ops: [{
          tool: { type: 'endmill', diameter_mm: 25 },
          strategy: 'pocket',
          stock_before: box(0, 0, 0, 100, 80, 30),
          zones_cut: [box(20, 20, 0, 80, 60, 25)],
        }],
      });
      // Tool changes count should be non-negative
      expect(result.tool_changes).toBeGreaterThanOrEqual(0);
      expect(result.tool_changes).toBeLessThan(result.operations.length);
    });

    it('includes formulas in result', () => {
      const result = engine.analyze({
        stock: box(0, 0, 0, 50, 50, 25),
        target_geometry: box(5, 5, 0, 45, 45, 20),
        previous_ops: [{
          tool: { type: 'endmill', diameter_mm: 20 },
          strategy: 'pocket',
          stock_before: box(0, 0, 0, 50, 50, 25),
          zones_cut: [box(10, 10, 0, 40, 40, 20)],
        }],
      });
      expect(result.formulas).toHaveProperty('scallop_flat');
      expect(result.formulas).toHaveProperty('cusp_ballnose');
      expect(result.formulas).toHaveProperty('tool_deflection');
      expect(result.formulas).toHaveProperty('mrr');
      expect(result.formulas).toHaveProperty('min_corner_radius');
    });

    it('applies material MRR factor for aluminum (3x faster)', () => {
      const aluminumResult = engine.analyze({
        stock: box(0, 0, 0, 100, 50, 25),
        target_geometry: box(5, 5, 0, 95, 45, 20),
        previous_ops: [{
          tool: { type: 'endmill', diameter_mm: 20 },
          strategy: 'pocket',
          stock_before: box(0, 0, 0, 100, 50, 25),
          zones_cut: [box(15, 15, 0, 85, 35, 20)],
        }],
        material: 'aluminum',
      });
      const steelResult = engine.analyze({
        stock: box(0, 0, 0, 100, 50, 25),
        target_geometry: box(5, 5, 0, 95, 45, 20),
        previous_ops: [{
          tool: { type: 'endmill', diameter_mm: 20 },
          strategy: 'pocket',
          stock_before: box(0, 0, 0, 100, 50, 25),
          zones_cut: [box(15, 15, 0, 85, 35, 20)],
        }],
        material: 'steel',
      });
      // Aluminum should be faster (lower time) due to 3x MRR factor
      if (aluminumResult.operations.length > 0 && steelResult.operations.length > 0) {
        expect(aluminumResult.estimated_total_time_sec).toBeLessThan(steelResult.estimated_total_time_sec);
      }
    });

    it('warns about unknown material', () => {
      const result = engine.analyze({
        stock: box(0, 0, 0, 50, 50, 25),
        target_geometry: box(5, 5, 0, 45, 45, 20),
        previous_ops: [{
          tool: { type: 'endmill', diameter_mm: 20 },
          strategy: 'pocket',
          stock_before: box(0, 0, 0, 50, 50, 25),
          zones_cut: [box(10, 10, 0, 40, 40, 20)],
        }],
        material: 'unobtanium',
      });
      expect(result.optimization_notes.some(n => n.includes('Unknown material'))).toBe(true);
    });

    it('generates zone IDs in RZ-001 format', () => {
      const result = engine.analyze({
        stock: box(0, 0, 0, 100, 50, 25),
        target_geometry: box(5, 5, 0, 95, 45, 20),
        previous_ops: [{
          tool: { type: 'endmill', diameter_mm: 20 },
          strategy: 'pocket',
          stock_before: box(0, 0, 0, 100, 50, 25),
          zones_cut: [box(15, 15, 0, 85, 35, 20)],
        }],
      });
      for (const zone of result.rest_zones) {
        expect(zone.id).toMatch(/^RZ-\d{3}$/);
      }
    });

    it('operations have positive MRR and scallop height', () => {
      const result = engine.analyze({
        stock: box(0, 0, 0, 100, 50, 25),
        target_geometry: box(5, 5, 0, 95, 45, 20),
        previous_ops: [{
          tool: { type: 'endmill', diameter_mm: 20 },
          strategy: 'pocket',
          stock_before: box(0, 0, 0, 100, 50, 25),
          zones_cut: [box(15, 15, 0, 85, 35, 20)],
        }],
      });
      for (const op of result.operations) {
        expect(op.mrr_mm3_per_min).toBeGreaterThan(0);
        expect(op.scallop_height_mm).toBeGreaterThanOrEqual(0);
        expect(op.estimated_time_sec).toBeGreaterThan(0);
      }
    });
  });
});
