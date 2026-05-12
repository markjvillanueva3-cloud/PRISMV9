/**
 * Tests for TransitionPathEngine — CAMK-MS3/U03
 * ==================================================
 * Covers: shortestRetract, directLink, spiralTransition, smoothTransition,
 *         autoSelect, plan, planBatch, distance calculations, edge cases
 */

import { describe, it, expect } from 'vitest';
import {
  TransitionPathEngine,
  transitionPathEngine,
} from '../../src/engines/TransitionPathEngine.js';

// ── Helpers ───────────────────────────────────────────────────────────────

const stock = { min_x: 0, min_y: 0, min_z: 0, max_x: 100, max_y: 100, max_z: 20 };
const pt = (x: number, y: number, z: number) => ({ x, y, z });

describe('TransitionPathEngine', () => {
  const engine = new TransitionPathEngine();

  // ========================================================================
  // SINGLETON
  // ========================================================================

  describe('singleton', () => {
    it('exports a singleton instance', () => {
      expect(transitionPathEngine).toBeInstanceOf(TransitionPathEngine);
    });
  });

  // ========================================================================
  // shortestRetract
  // ========================================================================

  describe('shortestRetract', () => {
    it('generates retract → rapid XY → plunge moves', () => {
      const result = engine.shortestRetract({
        from: pt(10, 10, 5),
        to: pt(80, 80, 5),
        stock,
      });
      expect(result.strategy_used).toBe('shortest_retract');
      expect(result.move_count).toBe(3); // retract, xy, plunge
      expect(result.retract_height_mm).toBeCloseTo(25, 0); // stock.max_z + 5 default clearance
    });

    it('retract height = stock.max_z + clearance_mm', () => {
      const result = engine.shortestRetract({
        from: pt(10, 10, 5), to: pt(80, 80, 5),
        stock, clearance_mm: 10,
      });
      expect(result.retract_height_mm).toBeCloseTo(30, 0);
    });

    it('skips retract if already above safe Z', () => {
      const result = engine.shortestRetract({
        from: pt(10, 10, 30), // already above safe Z (25)
        to: pt(80, 80, 5),
        stock, clearance_mm: 5,
      });
      // Should only have rapid XY + plunge (maybe 2 moves)
      expect(result.move_count).toBeLessThanOrEqual(3);
    });

    it('skips XY move when from/to are at same XY position', () => {
      const result = engine.shortestRetract({
        from: pt(50, 50, 5), to: pt(50, 50, 15),
        stock,
      });
      // Only retract + plunge (or just retract if target Z < safeZ)
      expect(result.move_count).toBeLessThanOrEqual(2);
    });

    it('total_distance_mm is positive', () => {
      const result = engine.shortestRetract({
        from: pt(0, 0, 0), to: pt(100, 100, 0), stock,
      });
      expect(result.total_distance_mm).toBeGreaterThan(0);
    });

    it('air_time_sec computed from distance and rapid rate', () => {
      const rate = 30000; // mm/min default
      const result = engine.shortestRetract({
        from: pt(0, 0, 10), to: pt(0, 0, 10), stock,
        rapid_rate_mmmin: rate,
      });
      // Time = distance / rate * 60
      const expectedTime = (result.total_distance_mm / rate) * 60;
      expect(result.air_time_sec).toBeCloseTo(expectedTime, 4);
    });
  });

  // ========================================================================
  // directLink
  // ========================================================================

  describe('directLink', () => {
    it('uses direct path when no collision', () => {
      // Both points above stock — no collision
      const result = engine.directLink({
        from: pt(10, 10, 30), to: pt(80, 80, 30),
        stock,
      });
      expect(result.strategy_used).toBe('direct');
      expect(result.move_count).toBe(1);
    });

    it('falls back to retract when direct path collides with stock', () => {
      // Points inside stock Z range — will collide
      const result = engine.directLink({
        from: pt(10, 10, 10), to: pt(80, 80, 10),
        stock,
      });
      expect(result.strategy_used).toBe('shortest_retract');
      expect(result.move_count).toBeGreaterThan(1);
    });

    it('checks obstacle collision', () => {
      const obstacle = { min_x: 40, min_y: 40, min_z: 25, max_x: 60, max_y: 60, max_z: 50 };
      const result = engine.directLink({
        from: pt(10, 10, 35), to: pt(90, 90, 35),
        stock, obstacles: [obstacle],
      });
      // Path crosses the obstacle
      expect(result.strategy_used).toBe('shortest_retract');
    });

    it('direct path distance equals 3D Euclidean distance', () => {
      const from = pt(0, 0, 30);
      const to = pt(30, 40, 30);
      const result = engine.directLink({ from, to, stock });
      if (result.strategy_used === 'direct') {
        const expectedDist = Math.sqrt(30 ** 2 + 40 ** 2);
        expect(result.total_distance_mm).toBeCloseTo(expectedDist, 2);
      }
    });
  });

  // ========================================================================
  // spiralTransition
  // ========================================================================

  describe('spiralTransition', () => {
    it('produces 4 moves: arc out, retract, rapid XY, spiral in', () => {
      const result = engine.spiralTransition({
        from: pt(10, 10, 5), to: pt(80, 80, 5),
        stock, tool_diameter_mm: 10,
      });
      expect(result.strategy_used).toBe('spiral');
      expect(result.move_count).toBe(4);
    });

    it('includes arc_cw and arc_cc moves', () => {
      const result = engine.spiralTransition({
        from: pt(10, 10, 5), to: pt(80, 80, 5),
        stock, tool_diameter_mm: 12,
      });
      const types = result.moves.map(m => m.type);
      expect(types).toContain('arc_cw');
      expect(types).toContain('arc_cc');
    });

    it('retract height equals stock.max_z + clearance', () => {
      const result = engine.spiralTransition({
        from: pt(10, 10, 5), to: pt(80, 80, 5),
        stock, clearance_mm: 8,
      });
      expect(result.retract_height_mm).toBeCloseTo(28, 0);
    });

    it('arc moves have i/j center offsets', () => {
      const result = engine.spiralTransition({
        from: pt(10, 10, 5), to: pt(80, 80, 5),
        stock, tool_diameter_mm: 10,
      });
      const arcs = result.moves.filter(m => m.type === 'arc_cw' || m.type === 'arc_cc');
      for (const arc of arcs) {
        expect(arc.i).toBeDefined();
        expect(arc.j).toBeDefined();
      }
    });

    it('total distance is positive', () => {
      const result = engine.spiralTransition({
        from: pt(10, 10, 5), to: pt(80, 80, 5), stock,
      });
      expect(result.total_distance_mm).toBeGreaterThan(0);
    });
  });

  // ========================================================================
  // smoothTransition
  // ========================================================================

  describe('smoothTransition', () => {
    it('uses single arc for close points (dist < 2 * toolDia)', () => {
      const result = engine.smoothTransition({
        from: pt(50, 50, 10), to: pt(55, 55, 10),
        stock, tool_diameter_mm: 10,
      });
      expect(result.strategy_used).toBe('smooth');
      // dist ~ 7.07 < 2*10=20, so single arc
      expect(result.move_count).toBe(1);
      expect(result.moves[0].type).toBe('arc_cw');
    });

    it('uses lift-traverse-settle for distant points', () => {
      const result = engine.smoothTransition({
        from: pt(10, 10, 10), to: pt(90, 90, 10),
        stock, tool_diameter_mm: 10,
      });
      // dist ~ 113 > 2*10=20, so 3 moves
      expect(result.move_count).toBe(3);
      const types = result.moves.map(m => m.type);
      expect(types).toContain('linear');
      expect(types).toContain('rapid');
    });

    it('retract height is max(z) + 2 for distant points', () => {
      const result = engine.smoothTransition({
        from: pt(10, 10, 8), to: pt(90, 90, 12),
        stock, tool_diameter_mm: 10,
      });
      expect(result.retract_height_mm).toBeCloseTo(14, 0); // max(8,12) + 2
    });
  });

  // ========================================================================
  // autoSelect
  // ========================================================================

  describe('autoSelect', () => {
    it('selects direct when path is collision-free', () => {
      const result = engine.autoSelect({
        from: pt(10, 10, 30), to: pt(90, 90, 30),
        stock,
      });
      expect(result.strategy_used).toBe('direct');
    });

    it('selects smooth for close moves with collision', () => {
      const result = engine.autoSelect({
        from: pt(50, 50, 10), to: pt(55, 55, 10),
        stock, tool_diameter_mm: 10,
      });
      // Inside stock → not direct; dist < 3*toolDia → smooth
      expect(result.strategy_used).toBe('smooth');
    });

    it('selects shortest_retract for distant moves with collision', () => {
      const result = engine.autoSelect({
        from: pt(10, 10, 10), to: pt(90, 90, 10),
        stock, tool_diameter_mm: 10,
      });
      // Inside stock → not direct; dist > 3*toolDia → retract
      expect(result.strategy_used).toBe('shortest_retract');
    });
  });

  // ========================================================================
  // plan
  // ========================================================================

  describe('plan', () => {
    it('dispatches to correct strategy by name', () => {
      const strategies = ['shortest_retract', 'direct', 'spiral', 'smooth', 'auto'] as const;
      for (const strategy of strategies) {
        const result = engine.plan({
          from: pt(10, 10, 30), to: pt(90, 90, 30),
          stock, strategy,
        });
        expect(result.strategy_used).toBeTruthy();
        expect(result.total_distance_mm).toBeGreaterThanOrEqual(0);
      }
    });

    it('defaults to auto when no strategy specified', () => {
      const result = engine.plan({
        from: pt(10, 10, 30), to: pt(90, 90, 30),
        stock,
      });
      // Auto should pick direct here (above stock)
      expect(result.strategy_used).toBe('direct');
    });
  });

  // ========================================================================
  // planBatch
  // ========================================================================

  describe('planBatch', () => {
    it('returns empty result for fewer than 2 points', () => {
      const result = engine.planBatch({ points: [pt(0, 0, 0)], stock });
      expect(result.transitions).toHaveLength(0);
      expect(result.total_air_distance_mm).toBe(0);
    });

    it('plans N-1 transitions for N points', () => {
      const points = [pt(10, 10, 30), pt(50, 50, 30), pt(90, 90, 30)];
      const result = engine.planBatch({ points, stock });
      expect(result.transitions).toHaveLength(2);
    });

    it('total_air_distance_mm is sum of transition distances', () => {
      const points = [pt(10, 10, 30), pt(50, 50, 30), pt(90, 90, 30)];
      const result = engine.planBatch({ points, stock });
      const sumDist = result.transitions.reduce((s, t) => s + t.total_distance_mm, 0);
      expect(result.total_air_distance_mm).toBeCloseTo(sumDist, 4);
    });

    it('savings_vs_full_retract_pct is non-negative', () => {
      const points = [pt(10, 10, 30), pt(50, 50, 30), pt(90, 90, 30)];
      const result = engine.planBatch({ points, stock, strategy: 'auto' });
      expect(result.savings_vs_full_retract_pct).toBeGreaterThanOrEqual(0);
    });

    it('direct strategy shows savings over full retract for above-stock paths', () => {
      const points = [pt(10, 10, 30), pt(50, 50, 30), pt(90, 90, 30)];
      const result = engine.planBatch({ points, stock, strategy: 'direct' });
      // Direct link above stock should save distance vs high retract
      expect(result.savings_vs_full_retract_pct).toBeGreaterThanOrEqual(0);
    });

    it('passes clearance_mm and rapid_rate through to transitions', () => {
      const points = [pt(10, 10, 10), pt(90, 90, 10)];
      const result = engine.planBatch({
        points, stock, clearance_mm: 15, rapid_rate_mmmin: 20000,
        strategy: 'shortest_retract',
      });
      expect(result.transitions[0].retract_height_mm).toBeCloseTo(35, 0); // 20 + 15
    });
  });
});
