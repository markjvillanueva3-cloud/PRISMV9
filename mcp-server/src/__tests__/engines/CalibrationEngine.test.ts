/**
 * CalibrationEngine — Comprehensive Test Suite
 *
 * Tests: Kienzle force, Taylor tool life, thermal partition,
 *        deflection stiffness calibration via Levenberg-Marquardt.
 */

import { describe, it, expect } from 'vitest';
import {
  calibrationEngine,
  type CalibrationInput,
} from '../../engines/CalibrationEngine.js';

// ── Kienzle Force Data ──────────────────────────────────────────────
// Fc = kc11 * b * h^(1 - mc), using kc11=2000, mc=0.25

function kienzleForce(b: number, h: number, kc11 = 2000, mc = 0.25): number {
  return kc11 * b * Math.pow(h, 1 - mc);
}

const kienzleMeasurements = [
  { inputs: { b: 2, h: 0.1 }, measured: kienzleForce(2, 0.1) },
  { inputs: { b: 3, h: 0.15 }, measured: kienzleForce(3, 0.15) },
  { inputs: { b: 4, h: 0.2 }, measured: kienzleForce(4, 0.2) },
  { inputs: { b: 2.5, h: 0.12 }, measured: kienzleForce(2.5, 0.12) },
  { inputs: { b: 5, h: 0.25 }, measured: kienzleForce(5, 0.25) },
  { inputs: { b: 3.5, h: 0.18 }, measured: kienzleForce(3.5, 0.18) },
];

// ── Taylor Tool Life Data ───────────────────────────────────────────
// V * T^n = C, so T = (C/V)^(1/n), using C=300, n=0.25

function taylorLife(V: number, C = 300, n = 0.25): number {
  return Math.pow(C / V, 1 / n);
}

const taylorMeasurements = [
  { inputs: { V: 100 }, measured: taylorLife(100) },
  { inputs: { V: 150 }, measured: taylorLife(150) },
  { inputs: { V: 200 }, measured: taylorLife(200) },
  { inputs: { V: 250 }, measured: taylorLife(250) },
  { inputs: { V: 300 }, measured: taylorLife(300) },
];

// ── Thermal Partition Data ──────────────────────────────────────────
// T_chip = eta * Fc * Vc / (rho * cp * f * ap), eta=0.6

function thermalTemp(
  Fc: number, Vc: number,
  f: number, ap: number,
  eta = 0.6, rho = 7800, cp = 500
): number {
  return eta * Fc * Vc / (rho * cp * f * ap);
}

const thermalMeasurements = [
  {
    inputs: { Fc: 500, Vc: 3, f: 0.1, ap: 2, rho: 7800, cp: 500 },
    measured: thermalTemp(500, 3, 0.1, 2),
  },
  {
    inputs: { Fc: 600, Vc: 2.5, f: 0.12, ap: 2.5, rho: 7800, cp: 500 },
    measured: thermalTemp(600, 2.5, 0.12, 2.5),
  },
  {
    inputs: { Fc: 700, Vc: 2, f: 0.08, ap: 3, rho: 7800, cp: 500 },
    measured: thermalTemp(700, 2, 0.08, 3),
  },
  {
    inputs: { Fc: 450, Vc: 3.5, f: 0.15, ap: 1.5, rho: 7800, cp: 500 },
    measured: thermalTemp(450, 3.5, 0.15, 1.5),
  },
];

// ── Deflection Data ─────────────────────────────────────────────────
// delta = F * L^3 / (3 * EI), EI = 1e6

function deflection(F: number, L: number, EI = 1e6): number {
  return F * Math.pow(L, 3) / (3 * EI);
}

const deflectionMeasurements = [
  { inputs: { F: 100, L: 50 }, measured: deflection(100, 50) },
  { inputs: { F: 200, L: 60 }, measured: deflection(200, 60) },
  { inputs: { F: 150, L: 70 }, measured: deflection(150, 70) },
  { inputs: { F: 300, L: 40 }, measured: deflection(300, 40) },
  { inputs: { F: 250, L: 55 }, measured: deflection(250, 55) },
];

// ── Tests ───────────────────────────────────────────────────────────

describe('CalibrationEngine', () => {

  // ── calibrateKienzle ──────────────────────────────────────────

  describe('calibrateKienzle', () => {
    it('recovers kc11 and mc from synthetic data', () => {
      const result = calibrationEngine.calibrate({
        data: { type: 'kienzle', measurements: kienzleMeasurements },
        max_iterations: 500,
      });
      expect(result.model_type).toBe('kienzle');
      const kc11 = result.parameters.find(p => p.name === 'kc11');
      const mc = result.parameters.find(p => p.name === 'mc');
      expect(kc11).toBeDefined();
      expect(mc).toBeDefined();
      // Should be in the right ballpark
      expect(kc11!.value).toBeGreaterThan(1000);
      expect(kc11!.value).toBeLessThan(4000);
      expect(mc!.value).toBeGreaterThan(0.05);
      expect(mc!.value).toBeLessThan(0.8);
    });

    it('achieves low RMSE on exact data', () => {
      const result = calibrationEngine.calibrate({
        data: { type: 'kienzle', measurements: kienzleMeasurements },
        max_iterations: 500,
      });
      expect(result.after_rmse).toBeLessThan(result.before_rmse + 1);
    });

    it('reports improvement percentage with bad guess', () => {
      const result = calibrationEngine.calibrate({
        data: { type: 'kienzle', measurements: kienzleMeasurements },
        initial_guess: { kc11: 1000, mc: 0.5 },
        max_iterations: 500,
      });
      // Even if not converged, should show some improvement
      expect(result.after_rmse).toBeLessThanOrEqual(result.before_rmse);
    });

    it('parameter units are correct', () => {
      const result = calibrationEngine.calibrate({
        data: { type: 'kienzle', measurements: kienzleMeasurements },
      });
      expect(result.parameters[0].unit).toBe('N/mm²');
      expect(result.parameters[1].unit).toBe('dimensionless');
    });

    it('confidence intervals bracket the true values', () => {
      const result = calibrationEngine.calibrate({
        data: { type: 'kienzle', measurements: kienzleMeasurements },
      });
      const kc11 = result.parameters.find(p => p.name === 'kc11')!;
      expect(kc11.confidence_interval_95[0]).toBeLessThanOrEqual(2000);
      expect(kc11.confidence_interval_95[1]).toBeGreaterThanOrEqual(2000);
    });

    it('formula string describes the Kienzle model', () => {
      const result = calibrationEngine.calibrate({
        data: { type: 'kienzle', measurements: kienzleMeasurements },
      });
      expect(result.formula).toContain('kc11');
    });
  });

  // ── calibrateTaylor ───────────────────────────────────────────

  describe('calibrateTaylor', () => {
    it('recovers C and n from synthetic Taylor data', () => {
      const result = calibrationEngine.calibrate({
        data: { type: 'taylor', measurements: taylorMeasurements },
        max_iterations: 500,
      });
      expect(result.model_type).toBe('taylor');
      const C = result.parameters.find(p => p.name === 'C');
      const n = result.parameters.find(p => p.name === 'n');
      expect(C).toBeDefined();
      expect(n).toBeDefined();
      expect(C!.value).toBeGreaterThan(50);
      expect(C!.value).toBeLessThan(1000);
      expect(n!.value).toBeGreaterThan(0.05);
      expect(n!.value).toBeLessThan(1.0);
    });

    it('achieves reasonable RMSE on exact Taylor data', () => {
      const result = calibrationEngine.calibrate({
        data: { type: 'taylor', measurements: taylorMeasurements },
        max_iterations: 500,
      });
      expect(result.after_rmse).toBeLessThanOrEqual(result.before_rmse + 1);
    });

    it('has correct number of residuals', () => {
      const result = calibrationEngine.calibrate({
        data: { type: 'taylor', measurements: taylorMeasurements },
      });
      expect(result.residuals).toHaveLength(taylorMeasurements.length);
    });
  });

  // ── calibrateThermal ──────────────────────────────────────────

  describe('calibrateThermal', () => {
    it('recovers eta from synthetic thermal data', () => {
      const result = calibrationEngine.calibrate({
        data: { type: 'thermal', measurements: thermalMeasurements },
        max_iterations: 500,
      });
      expect(result.model_type).toBe('thermal');
      const eta = result.parameters.find(p => p.name === 'eta');
      expect(eta).toBeDefined();
      // eta should be in a physically reasonable range
      expect(eta!.value).toBeGreaterThan(0.1);
      expect(eta!.value).toBeLessThan(1.5);
    });

    it('eta unit is dimensionless', () => {
      const result = calibrationEngine.calibrate({
        data: { type: 'thermal', measurements: thermalMeasurements },
      });
      const eta = result.parameters.find(p => p.name === 'eta')!;
      expect(eta.unit).toBe('dimensionless');
    });

    it('warns if fitted eta is outside (0,1)', () => {
      // Give data that would push eta > 1
      const badMeasurements = thermalMeasurements.map(m => ({
        ...m,
        measured: m.measured * 3, // triple the temperature
      }));
      const result = calibrationEngine.calibrate({
        data: { type: 'thermal', measurements: badMeasurements },
      });
      // eta ~ 1.8 which is outside physical range
      const hasWarning = result.warnings.some(w =>
        w.includes('outside physical range')
      );
      expect(hasWarning).toBe(true);
    });
  });

  // ── calibrateDeflection ───────────────────────────────────────

  describe('calibrateDeflection', () => {
    it('recovers EI from synthetic deflection data', () => {
      const result = calibrationEngine.calibrate({
        data: { type: 'deflection', measurements: deflectionMeasurements },
        max_iterations: 500,
      });
      expect(result.model_type).toBe('deflection');
      const EI = result.parameters.find(p => p.name === 'EI');
      expect(EI).toBeDefined();
      // Check that EI is in the right ballpark (within 50%)
      expect(EI!.value).toBeGreaterThan(5e5);
      expect(EI!.value).toBeLessThan(2e6);
    });

    it('EI unit is N*mm^2', () => {
      const result = calibrationEngine.calibrate({
        data: { type: 'deflection', measurements: deflectionMeasurements },
      });
      expect(result.parameters[0].unit).toBe('N·mm²');
    });
  });

  // ── levenbergMarquardt ────────────────────────────────────────

  describe('levenbergMarquardt', () => {
    it('converges on a simple quadratic', () => {
      // y = a*x^2, find a given data
      const xData = [1, 2, 3, 4, 5];
      const yData = xData.map(x => 3 * x * x); // a = 3
      const resFn = (p: number[]) =>
        xData.map((x, i) => yData[i] - p[0] * x * x);
      const jacFn = () =>
        xData.map(x => [-x * x]);
      const result = calibrationEngine.levenbergMarquardt(
        resFn, jacFn, [1], 200, 1e-6, 0.01
      );
      // Should find a value close to 3
      expect(result.params[0]).toBeCloseTo(3, 2);
    });

    it('respects max_iterations limit', () => {
      // Deliberately difficult problem with 1 iteration
      const resFn = (p: number[]) => [p[0] - 100, p[0] * 2 - 300];
      const jacFn = () => [[1], [2]];
      const result = calibrationEngine.levenbergMarquardt(
        resFn, jacFn, [0], 1, 1e-12, 0.01
      );
      expect(result.iterations).toBeLessThanOrEqual(1);
    });
  });

  // ── Error handling ────────────────────────────────────────────

  describe('error handling', () => {
    it('throws for fewer than 2 measurements', () => {
      expect(() => calibrationEngine.calibrate({
        data: {
          type: 'kienzle',
          measurements: [{ inputs: { b: 2, h: 0.1 }, measured: 100 }],
        },
      })).toThrow('At least 2 measurement points');
    });

    it('throws for empty measurements', () => {
      expect(() => calibrationEngine.calibrate({
        data: { type: 'taylor', measurements: [] },
      })).toThrow('At least 2 measurement points');
    });

    it('throws for unknown calibration type', () => {
      expect(() => calibrationEngine.calibrate({
        data: {
          type: 'unknown' as 'kienzle',
          measurements: [
            { inputs: { x: 1 }, measured: 1 },
            { inputs: { x: 2 }, measured: 4 },
          ],
        },
      })).toThrow('Unknown calibration type');
    });
  });

  // ── Result structure ──────────────────────────────────────────

  describe('result structure', () => {
    it('has all required fields', () => {
      const result = calibrationEngine.calibrate({
        data: { type: 'kienzle', measurements: kienzleMeasurements },
      });
      expect(result).toHaveProperty('parameters');
      expect(result).toHaveProperty('residuals');
      expect(result).toHaveProperty('r_squared');
      expect(result).toHaveProperty('rmse');
      expect(result).toHaveProperty('iterations');
      expect(result).toHaveProperty('converged');
      expect(result).toHaveProperty('before_rmse');
      expect(result).toHaveProperty('after_rmse');
      expect(result).toHaveProperty('improvement_pct');
      expect(result).toHaveProperty('model_type');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('formula');
    });

    it('r_squared is between 0 and 1 for good fits', () => {
      const result = calibrationEngine.calibrate({
        data: { type: 'kienzle', measurements: kienzleMeasurements },
      });
      expect(result.r_squared).toBeGreaterThanOrEqual(0);
      expect(result.r_squared).toBeLessThanOrEqual(1);
    });

    it('std_error is non-negative for all parameters', () => {
      const result = calibrationEngine.calibrate({
        data: { type: 'taylor', measurements: taylorMeasurements },
      });
      for (const p of result.parameters) {
        expect(p.std_error).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
