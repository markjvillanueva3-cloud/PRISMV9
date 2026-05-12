/**
 * BenchmarkSuiteEngine — Comprehensive Test Suite
 *
 * Tests: scenario listing, predictor evaluation, pass/fail grading,
 *        regression detection, edge cases.
 */

import { describe, it, expect } from 'vitest';
import {
  benchmarkSuiteEngine,
  type BenchmarkScenario,
} from '../../engines/BenchmarkSuiteEngine.js';

// ── Helper Predictors ───────────────────────────────────────────────

/** Returns midpoint of every expected range — should pass all */
function perfectPredictor(
  scenario: BenchmarkScenario
): Record<string, number> {
  const out: Record<string, number> = {};
  const exp = scenario.expected;
  if (exp.force_N) out.force_N = (exp.force_N.min + exp.force_N.max) / 2;
  if (exp.temperature_C) {
    out.temperature_C = (exp.temperature_C.min + exp.temperature_C.max) / 2;
  }
  if (exp.ra_um) out.ra_um = (exp.ra_um.min + exp.ra_um.max) / 2;
  if (exp.deflection_um) {
    out.deflection_um = (exp.deflection_um.min + exp.deflection_um.max) / 2;
  }
  if (exp.cycle_time_sec) {
    out.cycle_time_sec = (exp.cycle_time_sec.min + exp.cycle_time_sec.max) / 2;
  }
  if (exp.tool_life_min) {
    out.tool_life_min = (exp.tool_life_min.min + exp.tool_life_min.max) / 2;
  }
  return out;
}

/** Returns wildly wrong values — should fail all */
function terriblePredictor(): Record<string, number> {
  return {
    force_N: 99999,
    temperature_C: 99999,
    ra_um: 99999,
    deflection_um: 99999,
    cycle_time_sec: 99999,
    tool_life_min: 99999,
  };
}

/** Returns nothing — missing predictions */
function emptyPredictor(): Record<string, number> {
  return {};
}

/** Returns values just inside range min */
function minEdgePredictor(
  scenario: BenchmarkScenario
): Record<string, number> {
  const out: Record<string, number> = {};
  const exp = scenario.expected;
  if (exp.force_N) out.force_N = exp.force_N.min;
  if (exp.temperature_C) out.temperature_C = exp.temperature_C.min;
  if (exp.ra_um) out.ra_um = exp.ra_um.min;
  if (exp.deflection_um) out.deflection_um = exp.deflection_um.min;
  if (exp.cycle_time_sec) out.cycle_time_sec = exp.cycle_time_sec.min;
  if (exp.tool_life_min) out.tool_life_min = exp.tool_life_min.min;
  return out;
}

// ── Tests ───────────────────────────────────────────────────────────

describe('BenchmarkSuiteEngine', () => {

  // ── getScenarios ──────────────────────────────────────────────

  describe('getScenarios', () => {
    it('returns all 18 built-in scenarios', () => {
      const all = benchmarkSuiteEngine.getScenarios();
      expect(all.length).toBe(18);
    });

    it('filters by category', () => {
      const toolLife = benchmarkSuiteEngine.getScenarios('tool_life');
      expect(toolLife.length).toBe(5);
      for (const s of toolLife) {
        expect(s.category).toBe('tool_life');
      }
    });

    it('returns empty for unknown category', () => {
      const unknown = benchmarkSuiteEngine.getScenarios('nonexistent');
      expect(unknown).toHaveLength(0);
    });

    it('force category has correct count', () => {
      const force = benchmarkSuiteEngine.getScenarios('force');
      expect(force.length).toBe(6);
    });

    it('each scenario has required fields', () => {
      const all = benchmarkSuiteEngine.getScenarios();
      for (const s of all) {
        expect(s.id).toBeTruthy();
        expect(s.name).toBeTruthy();
        expect(s.category).toBeTruthy();
        expect(s.material).toBeTruthy();
        expect(s.tool.diameter_mm).toBeGreaterThan(0);
        expect(s.conditions.vc_m_min).toBeGreaterThan(0);
        expect(s.source).toBeTruthy();
      }
    });

    it('returns a copy, not the internal array', () => {
      const a = benchmarkSuiteEngine.getScenarios();
      const b = benchmarkSuiteEngine.getScenarios();
      expect(a).not.toBe(b);
    });
  });

  // ── getScenario ───────────────────────────────────────────────

  describe('getScenario', () => {
    it('finds a scenario by ID', () => {
      const s = benchmarkSuiteEngine.getScenario('TL-AL6061');
      expect(s).toBeDefined();
      expect(s!.material).toBe('Al6061-T6');
    });

    it('returns undefined for unknown ID', () => {
      expect(benchmarkSuiteEngine.getScenario('FAKE-ID')).toBeUndefined();
    });
  });

  // ── run (perfect predictor) ───────────────────────────────────

  describe('run — perfect predictor', () => {
    it('passes all 18 scenarios', () => {
      const result = benchmarkSuiteEngine.run({
        predictor: perfectPredictor,
      });
      expect(result.total).toBe(18);
      expect(result.passed).toBe(18);
      expect(result.failed).toBe(0);
      expect(result.pass_rate_pct).toBe(100);
      expect(result.grade).toBe('A');
    });

    it('has no regressions without baseline', () => {
      const result = benchmarkSuiteEngine.run({
        predictor: perfectPredictor,
      });
      expect(result.regressions).toHaveLength(0);
    });

    it('each scenario result is marked passed', () => {
      const result = benchmarkSuiteEngine.run({
        predictor: perfectPredictor,
      });
      for (const r of result.results) {
        expect(r.passed).toBe(true);
      }
    });

    it('deviations show within_range = true', () => {
      const result = benchmarkSuiteEngine.run({
        predictor: perfectPredictor,
      });
      for (const r of result.results) {
        for (const dev of Object.values(r.deviations)) {
          expect(dev.within_range).toBe(true);
        }
      }
    });
  });

  // ── run (terrible predictor) ──────────────────────────────────

  describe('run — terrible predictor', () => {
    it('fails all scenarios', () => {
      const result = benchmarkSuiteEngine.run({
        predictor: terriblePredictor,
      });
      expect(result.passed).toBe(0);
      expect(result.failed).toBe(18);
      expect(result.pass_rate_pct).toBe(0);
      expect(result.grade).toBe('F');
    });
  });

  // ── run (empty predictor) ────────────────────────────────────

  describe('run — empty predictor', () => {
    it('fails all when predictions are missing', () => {
      const result = benchmarkSuiteEngine.run({
        predictor: emptyPredictor,
      });
      expect(result.passed).toBe(0);
      expect(result.failed).toBe(18);
    });

    it('deviations have NaN values and within_range = false', () => {
      const result = benchmarkSuiteEngine.run({
        predictor: emptyPredictor,
      });
      for (const r of result.results) {
        for (const dev of Object.values(r.deviations)) {
          expect(dev.within_range).toBe(false);
          expect(Number.isNaN(dev.value)).toBe(true);
        }
      }
    });
  });

  // ── run (edge predictor) ──────────────────────────────────────

  describe('run — boundary values', () => {
    it('passes when predictions equal range min', () => {
      const result = benchmarkSuiteEngine.run({
        predictor: minEdgePredictor,
      });
      expect(result.passed).toBe(18);
    });
  });

  // ── run (selected scenarios) ──────────────────────────────────

  describe('run — scenario selection', () => {
    it('runs only selected scenarios by ID', () => {
      const result = benchmarkSuiteEngine.run({
        predictor: perfectPredictor,
        scenarios: ['TL-AL6061', 'TL-1045'],
      });
      expect(result.total).toBe(2);
      expect(result.passed).toBe(2);
    });

    it('warns about unknown scenario IDs', () => {
      const result = benchmarkSuiteEngine.run({
        predictor: perfectPredictor,
        scenarios: ['TL-AL6061', 'FAKE-ID'],
      });
      expect(result.total).toBe(1);
      expect(result.warnings.some(w => w.includes('FAKE-ID'))).toBe(true);
    });

    it('returns grade F when no scenarios match', () => {
      const result = benchmarkSuiteEngine.run({
        predictor: perfectPredictor,
        scenarios: ['NONEXISTENT'],
      });
      expect(result.total).toBe(0);
      expect(result.grade).toBe('F');
    });
  });

  // ── run (regression detection) ────────────────────────────────

  describe('run — regression detection', () => {
    it('detects regression when new predictions are worse', () => {
      // Baseline: slightly off midpoint so oldErr > 0
      const baseline: Record<string, Record<string, number>> = {};
      const scenarios = benchmarkSuiteEngine.getScenarios();
      for (const s of scenarios) {
        const pred = perfectPredictor(s);
        // Shift force slightly above midpoint so oldErr is small but > 0
        if (pred.force_N) pred.force_N += 5;
        baseline[s.id] = pred;
      }

      // New predictor: force is much further from midpoint
      const result = benchmarkSuiteEngine.run({
        predictor: (s) => {
          const pred = perfectPredictor(s);
          if (pred.force_N) pred.force_N *= 2;
          return pred;
        },
        baseline,
      });

      expect(result.regressions.length).toBeGreaterThan(0);
      expect(
        result.warnings.some(w => w.includes('regression'))
      ).toBe(true);
    });

    it('no regressions when predictions improve', () => {
      // Baseline has slightly off predictions
      const scenarios = benchmarkSuiteEngine.getScenarios();
      const baseline: Record<string, Record<string, number>> = {};
      for (const s of scenarios) {
        const pred = perfectPredictor(s);
        // Shift baseline slightly away from midpoint
        if (pred.force_N) {
          const range = s.expected.force_N!;
          pred.force_N = range.max; // at edge
        }
        baseline[s.id] = pred;
      }

      // New predictor returns perfect midpoints
      const result = benchmarkSuiteEngine.run({
        predictor: perfectPredictor,
        baseline,
      });

      expect(result.regressions).toHaveLength(0);
    });
  });

  // ── run (predictor throws) ────────────────────────────────────

  describe('run — predictor error handling', () => {
    it('handles predictor that throws', () => {
      const result = benchmarkSuiteEngine.run({
        predictor: () => {
          throw new Error('Model crashed');
        },
      });
      expect(result.failed).toBe(18);
      expect(result.warnings.some(w => w.includes('Predictor threw'))).toBe(true);
    });
  });

  // ── Grading thresholds ────────────────────────────────────────

  describe('grading', () => {
    it('grade A at 100% pass rate', () => {
      const result = benchmarkSuiteEngine.run({
        predictor: perfectPredictor,
      });
      expect(result.grade).toBe('A');
    });

    it('grade F at 0% pass rate', () => {
      const result = benchmarkSuiteEngine.run({
        predictor: terriblePredictor,
      });
      expect(result.grade).toBe('F');
    });

    it('formula string describes grading', () => {
      const result = benchmarkSuiteEngine.run({
        predictor: perfectPredictor,
      });
      expect(result.formula).toContain('pass_rate');
      expect(result.formula).toContain('grade');
    });
  });
});
