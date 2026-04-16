/**
 * Tests for AdaptiveRefinementEngine — CAMK-MS3/U04
 * ==================================================
 * Covers: chordError, insertMidpoint, needsRefinement, refine (all 4 criteria),
 *         convergence, point cap, edge cases
 */

import { describe, it, expect } from 'vitest';
import {
  AdaptiveRefinementEngine,
  adaptiveRefinementEngine,
  type InputPoint,
  type RefinementInput,
  type RefinementCriterion,
} from '../../src/engines/AdaptiveRefinementEngine.js';

// ── Helpers ───────────────────────────────────────────────────────────────

function pt(x: number, y: number, z: number, extra: Partial<InputPoint> = {}): InputPoint {
  return { x, y, z, ...extra };
}

/** Build a straight line of N points along X axis. */
function straightLine(n: number, spacing: number = 1): InputPoint[] {
  return Array.from({ length: n }, (_, i) => pt(i * spacing, 0, 0));
}

/** Build a curved path (semicircle in XY). */
function semicircle(n: number, radius: number = 10): InputPoint[] {
  return Array.from({ length: n }, (_, i) => {
    const theta = (Math.PI * i) / (n - 1);
    return pt(radius * Math.cos(theta), radius * Math.sin(theta), 0);
  });
}

describe('AdaptiveRefinementEngine', () => {
  const engine = new AdaptiveRefinementEngine();

  // ========================================================================
  // SINGLETON
  // ========================================================================

  describe('singleton', () => {
    it('exports a singleton instance', () => {
      expect(adaptiveRefinementEngine).toBeInstanceOf(AdaptiveRefinementEngine);
    });
  });

  // ========================================================================
  // chordError
  // ========================================================================

  describe('chordError', () => {
    it('returns 0 for collinear points', () => {
      const err = engine.chordError(
        { x: 0, y: 0, z: 0 },
        { x: 5, y: 0, z: 0 },
        { x: 10, y: 0, z: 0 },
      );
      expect(err).toBeCloseTo(0, 6);
    });

    it('returns correct perpendicular distance for right-angle bend', () => {
      // A=(0,0,0), B=(5,5,0), C=(10,0,0) → B is 5 units off the chord AC
      const err = engine.chordError(
        { x: 0, y: 0, z: 0 },
        { x: 5, y: 5, z: 0 },
        { x: 10, y: 0, z: 0 },
      );
      expect(err).toBeCloseTo(5, 4);
    });

    it('returns 0 when A and C are the same point', () => {
      const err = engine.chordError(
        { x: 0, y: 0, z: 0 },
        { x: 5, y: 5, z: 0 },
        { x: 0, y: 0, z: 0 },
      );
      expect(err).toBeCloseTo(0, 6);
    });

    it('works in 3D', () => {
      // A=(0,0,0), B=(0,1,0), C=(0,0,1)
      // AC = (0,0,1), AB = (0,1,0)
      // AB x AC = (1*1-0*0, 0*0-0*1, 0*0-1*0) = (1,0,0), |cross|=1
      // |AC| = 1, distance = 1/1 = 1
      const err = engine.chordError(
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 1, z: 0 },
        { x: 0, y: 0, z: 1 },
      );
      expect(err).toBeCloseTo(1, 4);
    });

    it('handles very small chord errors', () => {
      const err = engine.chordError(
        { x: 0, y: 0, z: 0 },
        { x: 5, y: 0.001, z: 0 },
        { x: 10, y: 0, z: 0 },
      );
      expect(err).toBeCloseTo(0.001, 4);
    });
  });

  // ========================================================================
  // insertMidpoint
  // ========================================================================

  describe('insertMidpoint', () => {
    it('computes geometric midpoint', () => {
      const mid = engine.insertMidpoint(pt(0, 0, 0), pt(10, 20, 30));
      expect(mid.x).toBeCloseTo(5, 6);
      expect(mid.y).toBeCloseTo(10, 6);
      expect(mid.z).toBeCloseTo(15, 6);
    });

    it('marks point as non-original', () => {
      const mid = engine.insertMidpoint(pt(0, 0, 0), pt(10, 10, 10));
      expect(mid.original).toBe(false);
    });

    it('interpolates feed and RPM', () => {
      const mid = engine.insertMidpoint(
        pt(0, 0, 0, { feed_mmmin: 1000, rpm: 8000 }),
        pt(10, 0, 0, { feed_mmmin: 2000, rpm: 12000 }),
      );
      expect(mid.feed_mmmin).toBeCloseTo(1500, 0);
      expect(mid.rpm).toBeCloseTo(10000, 0);
    });

    it('interpolates ae_mm and ap_mm', () => {
      const mid = engine.insertMidpoint(
        pt(0, 0, 0, { ae_mm: 2, ap_mm: 4 }),
        pt(10, 0, 0, { ae_mm: 6, ap_mm: 8 }),
      );
      expect(mid.ae_mm).toBeCloseTo(4, 4);
      expect(mid.ap_mm).toBeCloseTo(6, 4);
    });

    it('handles undefined optional properties', () => {
      const mid = engine.insertMidpoint(pt(0, 0, 0), pt(10, 0, 0));
      expect(mid.feed_mmmin).toBeUndefined();
      expect(mid.rpm).toBeUndefined();
    });
  });

  // ========================================================================
  // needsRefinement
  // ========================================================================

  describe('needsRefinement', () => {
    it('returns needs=false for straight-line segments (curvature)', () => {
      const points = straightLine(5);
      const result = engine.needsRefinement(
        points, 1, ['curvature'], { chord: 0.01, force: 50, temp: 10, mrr: 10 },
      );
      expect(result.needs).toBe(false);
    });

    it('returns needs=true for high curvature', () => {
      // Sharp bend: 3 points forming a corner
      const points = [pt(0, 0, 0), pt(5, 5, 0), pt(10, 0, 0)];
      const result = engine.needsRefinement(
        points, 0, ['curvature'], { chord: 0.01, force: 50, temp: 10, mrr: 10 },
      );
      expect(result.needs).toBe(true);
      expect(result.criterion).toBe('curvature');
    });

    it('detects high force gradient', () => {
      const points = [
        pt(0, 0, 0, { force_N: 100 }),
        pt(1, 0, 0, { force_N: 200 }),  // gradient = 100 N/mm
      ];
      const result = engine.needsRefinement(
        points, 0, ['force'], { chord: 0.01, force: 50, temp: 10, mrr: 10 },
      );
      expect(result.needs).toBe(true);
      expect(result.criterion).toBe('force');
      expect(result.error).toBeCloseTo(100, 0);
    });

    it('detects high thermal gradient', () => {
      const points = [
        pt(0, 0, 0, { temperature_C: 100 }),
        pt(2, 0, 0, { temperature_C: 150 }),  // gradient = 25 C/mm
      ];
      const result = engine.needsRefinement(
        points, 0, ['thermal'], { chord: 0.01, force: 50, temp: 10, mrr: 10 },
      );
      expect(result.needs).toBe(true);
      expect(result.criterion).toBe('thermal');
      expect(result.error).toBeCloseTo(25, 0);
    });

    it('detects high MRR deviation', () => {
      const points = [
        pt(0, 0, 0, { mrr_mm3_min: 100 }),
        pt(1, 0, 0, { mrr_mm3_min: 150 }),  // deviation = 50/125 * 100 = 40%
      ];
      const result = engine.needsRefinement(
        points, 0, ['engagement'], { chord: 0.01, force: 50, temp: 10, mrr: 10 },
      );
      expect(result.needs).toBe(true);
      expect(result.criterion).toBe('engagement');
      expect(result.error).toBeCloseTo(40, 0);
    });

    it('returns needs=false for out-of-bounds index', () => {
      const points = straightLine(3);
      const result = engine.needsRefinement(
        points, -1, ['curvature'], { chord: 0.01, force: 50, temp: 10, mrr: 10 },
      );
      expect(result.needs).toBe(false);
    });

    it('returns needs=false for zero-length segment', () => {
      const points = [pt(5, 5, 5), pt(5, 5, 5)];
      const result = engine.needsRefinement(
        points, 0, ['curvature'], { chord: 0.01, force: 50, temp: 10, mrr: 10 },
      );
      expect(result.needs).toBe(false);
    });
  });

  // ========================================================================
  // refine — curvature
  // ========================================================================

  describe('refine — curvature', () => {
    it('does not add points to a straight line', () => {
      const result = engine.refine({
        points: straightLine(10),
        criteria: ['curvature'],
      });
      expect(result.points_added).toBe(0);
      expect(result.converged).toBe(true);
      expect(result.refined_count).toBe(10);
    });

    it('adds points to a semicircle (high curvature)', () => {
      const result = engine.refine({
        points: semicircle(5, 10),
        criteria: ['curvature'],
        tolerances: { chord_error_mm: 0.5 },
      });
      expect(result.points_added).toBeGreaterThan(0);
      expect(result.refined_count).toBeGreaterThan(5);
    });

    it('all original points are preserved and marked', () => {
      const input = semicircle(5, 10);
      const result = engine.refine({
        points: input,
        criteria: ['curvature'],
        tolerances: { chord_error_mm: 0.5 },
      });
      const originals = result.refined_points.filter(p => p.original);
      expect(originals.length).toBe(5);
    });

    it('converges within max_iterations', () => {
      const result = engine.refine({
        points: semicircle(4, 10),
        criteria: ['curvature'],
        tolerances: { chord_error_mm: 0.1 },
        max_iterations: 10,
      });
      expect(result.iterations).toBeLessThanOrEqual(10);
    });
  });

  // ========================================================================
  // refine — force
  // ========================================================================

  describe('refine — force', () => {
    it('adds points where force gradient exceeds threshold', () => {
      const points = [
        pt(0, 0, 0, { force_N: 100 }),
        pt(10, 0, 0, { force_N: 100 }),
        pt(20, 0, 0, { force_N: 800 }),  // gradient = 70 N/mm > default 50
        pt(30, 0, 0, { force_N: 800 }),
      ];
      const result = engine.refine({
        points,
        criteria: ['force'],
        tolerances: { max_force_gradient_N_mm: 50 },
      });
      expect(result.points_added).toBeGreaterThan(0);
      expect(result.refinement_stats.force_inserts).toBeGreaterThan(0);
    });
  });

  // ========================================================================
  // refine — thermal
  // ========================================================================

  describe('refine — thermal', () => {
    it('adds points where thermal gradient exceeds threshold', () => {
      const points = [
        pt(0, 0, 0, { temperature_C: 25 }),
        pt(5, 0, 0, { temperature_C: 25 }),
        pt(10, 0, 0, { temperature_C: 200 }),  // gradient = 35 C/mm > default 10
        pt(15, 0, 0, { temperature_C: 200 }),
      ];
      const result = engine.refine({
        points,
        criteria: ['thermal'],
        tolerances: { max_temp_gradient_C_mm: 10 },
      });
      expect(result.points_added).toBeGreaterThan(0);
      expect(result.refinement_stats.thermal_inserts).toBeGreaterThan(0);
    });
  });

  // ========================================================================
  // refine — engagement (MRR)
  // ========================================================================

  describe('refine — engagement', () => {
    it('adds points where MRR deviation exceeds threshold', () => {
      const points = [
        pt(0, 0, 0, { mrr_mm3_min: 500 }),
        pt(5, 0, 0, { mrr_mm3_min: 500 }),
        pt(10, 0, 0, { mrr_mm3_min: 900 }),  // deviation = 400/700 * 100 = 57% > 10
        pt(15, 0, 0, { mrr_mm3_min: 900 }),
      ];
      const result = engine.refine({
        points,
        criteria: ['engagement'],
        tolerances: { mrr_deviation_pct: 10 },
      });
      expect(result.points_added).toBeGreaterThan(0);
      expect(result.refinement_stats.engagement_inserts).toBeGreaterThan(0);
    });
  });

  // ========================================================================
  // refine — multi-criteria
  // ========================================================================

  describe('refine — multi-criteria', () => {
    it('handles combined curvature + force criteria', () => {
      const points = [
        pt(0, 0, 0, { force_N: 100 }),
        pt(5, 5, 0, { force_N: 100 }),
        pt(10, 0, 0, { force_N: 800 }),
        pt(15, 0, 0, { force_N: 800 }),
      ];
      const result = engine.refine({
        points,
        criteria: ['curvature', 'force'],
        tolerances: { chord_error_mm: 0.1, max_force_gradient_N_mm: 50 },
      });
      const totalInserts = result.refinement_stats.curvature_inserts + result.refinement_stats.force_inserts;
      expect(totalInserts).toBeGreaterThan(0);
    });
  });

  // ========================================================================
  // refine — edge cases
  // ========================================================================

  describe('refine — edge cases', () => {
    it('warns for fewer than 2 points', () => {
      const result = engine.refine({ points: [pt(0, 0, 0)], criteria: ['curvature'] });
      expect(result.warnings).toContain('Need at least 2 points for refinement');
      expect(result.refined_count).toBe(1);
    });

    it('stops at max_points cap', () => {
      // Use very few coarse points with extremely tight tolerance to force many insertions
      const result = engine.refine({
        points: semicircle(4, 100),
        criteria: ['curvature'],
        tolerances: { chord_error_mm: 0.0001 },
        max_iterations: 50,
        max_points: 30,
      });
      expect(result.refined_count).toBeLessThanOrEqual(30);
      if (!result.converged) {
        expect(result.warnings.some(w => w.includes('Point cap'))).toBe(true);
      }
    });

    it('defaults to curvature when criteria array is empty', () => {
      const result = engine.refine({
        points: semicircle(5, 10),
        criteria: [] as RefinementCriterion[],
        tolerances: { chord_error_mm: 0.5 },
      });
      // Should still run curvature refinement
      expect(result.formula).toContain('curvature');
    });

    it('density_improvement_pct reflects added points', () => {
      const result = engine.refine({
        points: semicircle(5, 10),
        criteria: ['curvature'],
        tolerances: { chord_error_mm: 0.1 },
      });
      const expectedDensity = (result.points_added / result.original_count) * 100;
      expect(result.density_improvement_pct).toBeCloseTo(expectedDensity, 0);
    });

    it('algorithm_context appears in formula', () => {
      const result = engine.refine({
        points: straightLine(5),
        criteria: ['curvature'],
        algorithm_context: 'PTDC',
      });
      expect(result.formula).toContain('PTDC');
    });

    it('max_error is rounded to 6 decimal places', () => {
      const result = engine.refine({
        points: semicircle(4, 10),
        criteria: ['curvature'],
        tolerances: { chord_error_mm: 0.5 },
      });
      const str = result.max_error.toString();
      const decPart = str.split('.')[1] ?? '';
      expect(decPart.length).toBeLessThanOrEqual(6);
    });
  });
});
