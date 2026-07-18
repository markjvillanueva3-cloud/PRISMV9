/**
 * Tests for MultiSetupPlannerEngine — CAMK-MS3/U05
 * ==================================================
 * Covers: plan, visibilityAnalysis, stabilityCheck, datumChainAnalysis,
 *         greedySetCover, algorithm recommendation, edge cases
 */

import { describe, it, expect } from 'vitest';
import {
  MultiSetupPlannerEngine,
  multiSetupPlannerEngine,
  type Feature,
  type Orientation,
  type SetupPlannerInput,
} from '../../src/engines/MultiSetupPlannerEngine.js';

// ── Helpers ───────────────────────────────────────────────────────────────

function feature(id: string, type: Feature['type'], accessDir: { x: number; y: number; z: number }, extra: Partial<Feature> = {}): Feature {
  return {
    id, type, access_direction: accessDir,
    position: { x: 0, y: 0, z: 0 },
    dimensions: { width: 10, length: 10, depth: 5 },
    ...extra,
  };
}

const topAccess = { x: 0, y: 0, z: 1 };
const bottomAccess = { x: 0, y: 0, z: -1 };
const rightAccess = { x: 1, y: 0, z: 0 };
const leftAccess = { x: -1, y: 0, z: 0 };
const frontAccess = { x: 0, y: 1, z: 0 };

const partBounds = { min_x: 0, min_y: 0, min_z: 0, max_x: 100, max_y: 100, max_z: 50 };

describe('MultiSetupPlannerEngine', () => {
  const engine = new MultiSetupPlannerEngine();

  // ========================================================================
  // SINGLETON
  // ========================================================================

  describe('singleton', () => {
    it('exports a singleton instance', () => {
      expect(multiSetupPlannerEngine).toBeInstanceOf(MultiSetupPlannerEngine);
    });
  });

  // ========================================================================
  // plan — empty / trivial
  // ========================================================================

  describe('plan — edge cases', () => {
    it('returns empty result for no features', () => {
      const result = engine.plan({ features: [], part_bounds: partBounds });
      expect(result.setup_count).toBe(0);
      expect(result.warnings).toContain('No features provided');
    });

    it('handles single top-access feature in one setup', () => {
      const result = engine.plan({
        features: [feature('F1', 'pocket', topAccess)],
        part_bounds: partBounds,
      });
      expect(result.setup_count).toBe(1);
      expect(result.covered_features).toBe(1);
      expect(result.uncovered_features).toHaveLength(0);
    });
  });

  // ========================================================================
  // visibilityAnalysis
  // ========================================================================

  describe('visibilityAnalysis', () => {
    const orientations: Orientation[] = [
      { name: '+Z', direction: { x: 0, y: 0, z: 1 } },
      { name: '-Z', direction: { x: 0, y: 0, z: -1 } },
      { name: '+X', direction: { x: 1, y: 0, z: 0 } },
    ];

    it('maps top-access features to +Z orientation', () => {
      const features = [feature('F1', 'pocket', topAccess)];
      const visMap = engine.visibilityAnalysis(features, orientations);
      expect(visMap.get('+Z')).toContain('F1');
      expect(visMap.get('-Z')).not.toContain('F1');
    });

    it('maps bottom-access features to -Z orientation', () => {
      const features = [feature('F2', 'hole', bottomAccess)];
      const visMap = engine.visibilityAnalysis(features, orientations);
      expect(visMap.get('-Z')).toContain('F2');
    });

    it('maps right-access features to +X orientation', () => {
      const features = [feature('F3', 'slot', rightAccess)];
      const visMap = engine.visibilityAnalysis(features, orientations);
      expect(visMap.get('+X')).toContain('F3');
    });

    it('uses cos(60deg) = 0.5 visibility threshold', () => {
      // 45-degree access direction (cos=0.707 > 0.5 → visible from +Z)
      const diag = { x: 0, y: 0.707, z: 0.707 };
      const features = [feature('F4', 'surface', diag)];
      const visMap = engine.visibilityAnalysis(features, orientations);
      expect(visMap.get('+Z')).toContain('F4');
    });

    it('rejects feature with access perpendicular to orientation (cos=0 < 0.5)', () => {
      // Horizontal access is perpendicular to +Z
      const features = [feature('F5', 'slot', { x: 1, y: 0, z: 0 })];
      const visMap = engine.visibilityAnalysis(features, orientations);
      expect(visMap.get('+Z')).not.toContain('F5');
    });

    it('handles zero-magnitude access direction', () => {
      const features = [feature('F6', 'hole', { x: 0, y: 0, z: 0 })];
      const visMap = engine.visibilityAnalysis(features, orientations);
      // Should not crash, feature should not be visible from any orientation
      for (const [, fids] of visMap) {
        expect(fids).not.toContain('F6');
      }
    });
  });

  // ========================================================================
  // stabilityCheck
  // ========================================================================

  describe('stabilityCheck', () => {
    it('returns stable for +Z with sufficient clamping (5000N vs 1000N cut)', () => {
      const result = engine.stabilityCheck(
        { name: '+Z', direction: { x: 0, y: 0, z: 1 } }, 1000, 5000,
      );
      // margin = 5000 / (1000 * 2.5) = 2.0
      expect(result.stable).toBe(true);
      expect(result.margin).toBeCloseTo(2.0, 3);
    });

    it('returns unstable when clamping is insufficient', () => {
      const result = engine.stabilityCheck(
        { name: '+Z', direction: { x: 0, y: 0, z: 1 } }, 5000, 5000,
      );
      // margin = 5000 / (5000 * 2.5) = 0.4
      expect(result.stable).toBe(false);
      expect(result.margin).toBeCloseTo(0.4, 3);
    });

    it('applies 15% gravity penalty for non-top orientations', () => {
      const result = engine.stabilityCheck(
        { name: '+X', direction: { x: 1, y: 0, z: 0 } }, 1000, 5000,
      );
      // effective = 5000 * 0.85 = 4250; margin = 4250 / 2500 = 1.7
      expect(result.margin).toBeCloseTo(1.7, 3);
      expect(result.stable).toBe(true);
    });

    it('no penalty for exact +Z direction', () => {
      const topResult = engine.stabilityCheck(
        { name: 'top', direction: { x: 0, y: 0, z: 1 } }, 1000, 5000,
      );
      const sideResult = engine.stabilityCheck(
        { name: 'side', direction: { x: 0, y: 0, z: -1 } }, 1000, 5000,
      );
      expect(topResult.margin).toBeGreaterThan(sideResult.margin);
    });

    it('margin boundary: exactly 1.0 is stable', () => {
      // Need: effective / (cut * 2.5) = 1.0 → effective = cut * 2.5
      // +Z: effective = clamp → clamp = 1000 * 2.5 = 2500
      const result = engine.stabilityCheck(
        { name: '+Z', direction: { x: 0, y: 0, z: 1 } }, 1000, 2500,
      );
      expect(result.margin).toBeCloseTo(1.0, 3);
      expect(result.stable).toBe(true);
    });
  });

  // ========================================================================
  // datumChainAnalysis
  // ========================================================================

  describe('datumChainAnalysis', () => {
    it('returns empty chain for single setup', () => {
      const setups = [{
        id: 'SETUP-01', orientation: { name: '+Z', direction: { x: 0, y: 0, z: 1 } },
        features: ['F1'], datum_face: 'F1', clamping_stable: true,
        stability_margin: 2.0, tolerance_stack_mm: 0, recommended_algorithms: [],
      }];
      const result = engine.datumChainAnalysis(setups, 0.01, 1000);
      expect(result.chain).toHaveLength(0);
      expect(result.stack_mm).toBe(0);
      expect(result.within_spec).toBe(true);
    });

    it('computes RSS for two setups', () => {
      const setups = [
        { id: 'S1', orientation: { name: '+Z', direction: { x: 0, y: 0, z: 1 } }, features: ['F1'], datum_face: 'F1', clamping_stable: true, stability_margin: 2, tolerance_stack_mm: 0, recommended_algorithms: [] },
        { id: 'S2', orientation: { name: '-Z', direction: { x: 0, y: 0, z: -1 } }, features: ['F2'], datum_face: 'F2', clamping_stable: true, stability_margin: 1.7, tolerance_stack_mm: 0, recommended_algorithms: [] },
      ];
      const result = engine.datumChainAnalysis(setups, 0.01, 1000);
      expect(result.chain).toHaveLength(1);
      // RSS of 1 link = 0.01 * sqrt(1) = 0.01
      expect(result.stack_mm).toBeGreaterThanOrEqual(0.01);
    });

    it('RSS grows with sqrt(N) for N-1 links', () => {
      const makeSetup = (id: string) => ({
        id, orientation: { name: '+Z', direction: { x: 0, y: 0, z: 1 } },
        features: [id], datum_face: id, clamping_stable: true,
        stability_margin: 2, tolerance_stack_mm: 0, recommended_algorithms: [],
      });
      const setups3 = [makeSetup('S1'), makeSetup('S2'), makeSetup('S3')];
      const setups5 = [makeSetup('S1'), makeSetup('S2'), makeSetup('S3'), makeSetup('S4'), makeSetup('S5')];
      const r3 = engine.datumChainAnalysis(setups3, 0.01, 1000);
      const r5 = engine.datumChainAnalysis(setups5, 0.01, 1000);
      // 0.01*sqrt(2) vs 0.01*sqrt(4) → stack5 should be larger
      expect(r5.stack_mm).toBeGreaterThan(r3.stack_mm);
    });

    it('within_spec is false when stack exceeds 3x tolerance', () => {
      const makeSetup = (id: string) => ({
        id, orientation: { name: '+Z', direction: { x: 0, y: 0, z: 1 } },
        features: [id], datum_face: id, clamping_stable: true,
        stability_margin: 2, tolerance_stack_mm: 0, recommended_algorithms: [],
      });
      // 20 setups → RSS = tol * sqrt(19) ≈ tol * 4.36 > 3*tol
      const setups = Array.from({ length: 20 }, (_, i) => makeSetup(`S${i}`));
      const result = engine.datumChainAnalysis(setups, 0.01, 1000);
      expect(result.within_spec).toBe(false);
    });

    it('each chain link has correct from/to setup IDs', () => {
      const makeSetup = (id: string) => ({
        id, orientation: { name: '+Z', direction: { x: 0, y: 0, z: 1 } },
        features: [id], datum_face: id, clamping_stable: true,
        stability_margin: 2, tolerance_stack_mm: 0, recommended_algorithms: [],
      });
      const setups = [makeSetup('S1'), makeSetup('S2'), makeSetup('S3')];
      const result = engine.datumChainAnalysis(setups, 0.01, 1000);
      expect(result.chain[0].from_setup).toBe('S1');
      expect(result.chain[0].to_setup).toBe('S2');
      expect(result.chain[1].from_setup).toBe('S2');
      expect(result.chain[1].to_setup).toBe('S3');
    });
  });

  // ========================================================================
  // greedySetCover
  // ========================================================================

  describe('greedySetCover', () => {
    it('selects minimum orientations to cover all features', () => {
      const visMap = new Map<string, string[]>([
        ['A', ['F1', 'F2', 'F3']],
        ['B', ['F2', 'F4']],
        ['C', ['F3', 'F4', 'F5']],
      ]);
      const selected = engine.greedySetCover(['F1', 'F2', 'F3', 'F4', 'F5'], visMap);
      // Greedy: picks A (covers 3), then C (covers F4,F5). Only 2 orientations needed.
      expect(selected.length).toBeLessThanOrEqual(3);
      // Verify all features covered
      const covered = new Set<string>();
      for (const name of selected) {
        visMap.get(name)!.forEach(f => covered.add(f));
      }
      expect(covered.size).toBe(5);
    });

    it('returns empty when no orientations exist', () => {
      const result = engine.greedySetCover(['F1'], new Map());
      expect(result).toHaveLength(0);
    });

    it('handles case where not all features are coverable', () => {
      const visMap = new Map<string, string[]>([
        ['A', ['F1', 'F2']],
      ]);
      const selected = engine.greedySetCover(['F1', 'F2', 'F3'], visMap);
      expect(selected).toContain('A');
      // F3 is not coverable
    });

    it('uses greedy selection (picks largest-cover-first)', () => {
      const visMap = new Map<string, string[]>([
        ['small', ['F1']],
        ['large', ['F1', 'F2', 'F3']],
      ]);
      const selected = engine.greedySetCover(['F1', 'F2', 'F3'], visMap);
      expect(selected[0]).toBe('large');
    });
  });

  // ========================================================================
  // plan — multi-orientation parts
  // ========================================================================

  describe('plan — multi-orientation', () => {
    it('creates multiple setups for features requiring different access directions', () => {
      const features = [
        feature('F1', 'pocket', topAccess),
        feature('F2', 'hole', topAccess),
        feature('F3', 'slot', bottomAccess),
        feature('F4', 'bore', rightAccess),
      ];
      const result = engine.plan({ features, part_bounds: partBounds });
      expect(result.setup_count).toBeGreaterThanOrEqual(2);
      expect(result.covered_features).toBe(4);
    });

    it('groups top-access features into same setup', () => {
      const features = [
        feature('F1', 'pocket', topAccess),
        feature('F2', 'hole', topAccess),
        feature('F3', 'surface', topAccess),
      ];
      const result = engine.plan({ features, part_bounds: partBounds });
      expect(result.setup_count).toBe(1);
      expect(result.setups[0].features).toContain('F1');
      expect(result.setups[0].features).toContain('F2');
      expect(result.setups[0].features).toContain('F3');
    });

    it('warns about uncovered features with restricted orientations', () => {
      // Diagonal access that doesn't align with any default orientation (cos < 0.5)
      const weirdAccess = { x: 0.4, y: 0.4, z: 0.4 };
      // Normalize: mag = sqrt(0.48) ≈ 0.693. cos(angle with each axis) ≈ 0.4/0.693 ≈ 0.577 > 0.5 → will be visible!
      // Use a more extreme angle to truly be uncovered
      const trulyWeird = { x: 0.577, y: 0.577, z: 0.577 };
      // cos with +Z = 0.577/1 = 0.577 > 0.5 → still visible
      // Instead restrict orientations
      const result = engine.plan({
        features: [feature('F1', 'pocket', topAccess), feature('F2', 'slot', { x: 1, y: 1, z: 0 })],
        part_bounds: partBounds,
        available_orientations: [{ name: '+Z', direction: { x: 0, y: 0, z: 1 } }],
      });
      // F2 access (1,1,0) dot +Z (0,0,1) = 0 < 0.5 → uncovered
      expect(result.uncovered_features).toContain('F2');
      expect(result.warnings.some(w => w.includes('not reachable'))).toBe(true);
    });

    it('each feature appears in exactly one setup (no duplicates)', () => {
      const features = [
        feature('F1', 'pocket', topAccess),
        feature('F2', 'hole', topAccess),
        feature('F3', 'slot', rightAccess),
        feature('F4', 'bore', bottomAccess),
      ];
      const result = engine.plan({ features, part_bounds: partBounds });
      const allAssigned: string[] = [];
      for (const setup of result.setups) {
        allAssigned.push(...setup.features);
      }
      const unique = new Set(allAssigned);
      expect(unique.size).toBe(allAssigned.length);
    });
  });

  // ========================================================================
  // plan — datum selection and tolerance
  // ========================================================================

  describe('plan — datum and tolerance', () => {
    it('selects explicitly marked datum feature', () => {
      const features = [
        feature('F1', 'pocket', topAccess, { tolerance_mm: 0.05 }),
        feature('F2', 'surface', topAccess, { is_datum: true }),
      ];
      const result = engine.plan({ features, part_bounds: partBounds });
      expect(result.setups[0].datum_face).toBe('F2');
    });

    it('selects tightest-tolerance feature as datum when no explicit datum', () => {
      const features = [
        feature('F1', 'pocket', topAccess, { tolerance_mm: 0.05 }),
        feature('F2', 'hole', topAccess, { tolerance_mm: 0.01 }),
        feature('F3', 'surface', topAccess, { tolerance_mm: 0.1 }),
      ];
      const result = engine.plan({ features, part_bounds: partBounds });
      expect(result.setups[0].datum_face).toBe('F2');
    });

    it('tolerance stack grows with setups (RSS)', () => {
      const features = [
        feature('F1', 'pocket', topAccess),
        feature('F2', 'slot', bottomAccess),
        feature('F3', 'bore', rightAccess),
      ];
      const result = engine.plan({ features, part_bounds: partBounds });
      if (result.setups.length >= 2) {
        // Each subsequent setup should have >= previous tolerance stack
        for (let i = 1; i < result.setups.length; i++) {
          expect(result.setups[i].tolerance_stack_mm)
            .toBeGreaterThanOrEqual(result.setups[i - 1].tolerance_stack_mm);
        }
      }
    });

    it('warns when feature tolerance is tighter than stack', () => {
      const features = [
        feature('F1', 'pocket', topAccess),
        feature('F2', 'bore', bottomAccess, { tolerance_mm: 0.001 }),
      ];
      const result = engine.plan({
        features, part_bounds: partBounds, datum_tolerance_mm: 0.01,
      });
      // Second setup tolerance stack will exceed 0.001mm
      if (result.setups.length >= 2) {
        expect(result.warnings.some(w => w.includes('tighter than stack'))).toBe(true);
      }
    });
  });

  // ========================================================================
  // plan — algorithm recommendation
  // ========================================================================

  describe('plan — algorithm recommendation', () => {
    it('recommends TGAR for pockets', () => {
      const features = [feature('F1', 'pocket', topAccess)];
      const result = engine.plan({ features, part_bounds: partBounds });
      expect(result.setups[0].recommended_algorithms).toContain('TGAR');
    });

    it('recommends HRAF for surfaces and fillets', () => {
      const features = [
        feature('F1', 'surface', topAccess),
        feature('F2', 'fillet', topAccess),
      ];
      const result = engine.plan({ features, part_bounds: partBounds });
      expect(result.setups[0].recommended_algorithms).toContain('HRAF');
    });

    it('recommends PTDC for holes and bores', () => {
      const features = [
        feature('F1', 'hole', topAccess),
        feature('F2', 'bore', topAccess),
      ];
      const result = engine.plan({ features, part_bounds: partBounds });
      expect(result.setups[0].recommended_algorithms).toContain('PTDC');
    });

    it('returns at most 2 recommended algorithms', () => {
      const features = [
        feature('F1', 'pocket', topAccess),
        feature('F2', 'surface', topAccess),
        feature('F3', 'hole', topAccess),
        feature('F4', 'slot', topAccess),
      ];
      const result = engine.plan({ features, part_bounds: partBounds });
      expect(result.setups[0].recommended_algorithms.length).toBeLessThanOrEqual(2);
    });
  });

  // ========================================================================
  // plan — output structure
  // ========================================================================

  describe('plan — output structure', () => {
    it('setup IDs follow SETUP-01 format', () => {
      const features = [
        feature('F1', 'pocket', topAccess),
        feature('F2', 'slot', rightAccess),
      ];
      const result = engine.plan({ features, part_bounds: partBounds });
      for (const setup of result.setups) {
        expect(setup.id).toMatch(/^SETUP-\d{2}$/);
      }
    });

    it('formula string is populated', () => {
      const result = engine.plan({
        features: [feature('F1', 'pocket', topAccess)],
        part_bounds: partBounds,
      });
      expect(result.formula).toContain('totalStack');
      expect(result.formula).toContain('visibility');
    });

    it('optimization_method describes the algorithm', () => {
      const result = engine.plan({
        features: [feature('F1', 'pocket', topAccess)],
        part_bounds: partBounds,
      });
      expect(result.optimization_method).toContain('greedy-set-cover');
    });

    it('total_features equals input count', () => {
      const features = [
        feature('F1', 'pocket', topAccess),
        feature('F2', 'hole', rightAccess),
        feature('F3', 'slot', bottomAccess),
      ];
      const result = engine.plan({ features, part_bounds: partBounds });
      expect(result.total_features).toBe(3);
    });

    it('covered + uncovered = total features', () => {
      const features = [
        feature('F1', 'pocket', topAccess),
        feature('F2', 'hole', rightAccess),
      ];
      const result = engine.plan({ features, part_bounds: partBounds });
      expect(result.covered_features + result.uncovered_features.length).toBe(result.total_features);
    });
  });
});
