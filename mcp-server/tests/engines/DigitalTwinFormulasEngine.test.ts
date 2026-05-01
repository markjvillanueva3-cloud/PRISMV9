import { describe, it, expect } from 'vitest';
import {
  digitalTwinFormulasEngine,
  DigitalTwinFormulasEngine,
} from '../../src/engines/DigitalTwinFormulasEngine.js';

describe('DigitalTwinFormulasEngine', () => {
  const engine = digitalTwinFormulasEngine;

  it('exports a singleton instance', () => {
    expect(engine).toBeInstanceOf(DigitalTwinFormulasEngine);
  });

  // ── ekfPredict ──────────────────────────────────────────────────
  describe('ekfPredict()', () => {
    it('predicts state with identity transition', () => {
      const r = engine.ekfPredict({
        state: [1, 2],
        F: [[1, 0], [0, 1]],
        P: [[1, 0], [0, 1]],
        Q: [[0.1, 0], [0, 0.1]],
      });
      expect(r.x_pred).toEqual([1, 2]);
      expect(r.P_pred[0][0]).toBeCloseTo(1.1, 5);
      expect(r.P_pred[1][1]).toBeCloseTo(1.1, 5);
      expect(r.formula).toContain('F');
    });

    it('applies control input B*u', () => {
      const r = engine.ekfPredict({
        state: [0, 0],
        F: [[1, 0], [0, 1]],
        P: [[1, 0], [0, 1]],
        Q: [[0, 0], [0, 0]],
        B: [[1, 0], [0, 1]],
        u: [5, 3],
      });
      expect(r.x_pred[0]).toBeCloseTo(5, 5);
      expect(r.x_pred[1]).toBeCloseTo(3, 5);
    });
  });

  // ── ekfUpdate ───────────────────────────────────────────────────
  describe('ekfUpdate()', () => {
    it('updates state toward measurement', () => {
      const r = engine.ekfUpdate({
        x_pred: [0, 0],
        P_pred: [[1, 0], [0, 1]],
        z: [1],
        H: [[1, 0]],
        R: [[0.1]],
      });
      // Updated state should move toward z=1
      expect(r.x_updated[0]).toBeGreaterThan(0);
      expect(r.innovation[0]).toBeCloseTo(1, 5);
      expect(r.K.length).toBe(2);
      expect(r.formula).toContain('Kalman');
    });

    it('returns smaller P after update', () => {
      const r = engine.ekfUpdate({
        x_pred: [5],
        P_pred: [[10]],
        z: [5.5],
        H: [[1]],
        R: [[1]],
      });
      expect(r.P_updated[0][0]).toBeLessThan(10);
    });
  });

  // ── driftDetect ─────────────────────────────────────────────────
  describe('driftDetect()', () => {
    it('detects upward drift via CUSUM', () => {
      // Stable then shift up
      const obs = [
        ...Array(20).fill(0),
        ...Array(20).fill(2),
      ];
      const r = engine.driftDetect({
        observations: obs, mu: 0, k: 0.5, h: 5,
      });
      expect(r.alarm_detected).toBe(true);
      expect(r.alarm_indices.length).toBeGreaterThan(0);
      expect(r.cusum_upper.length).toBe(40);
      expect(r.formula).toContain('CUSUM');
    });

    it('no alarm for stable process', () => {
      const obs = Array.from(
        { length: 30 },
        (_, i) => Math.sin(i) * 0.1
      );
      const r = engine.driftDetect({
        observations: obs, mu: 0, k: 0.5, h: 5,
      });
      expect(r.alarm_detected).toBe(false);
    });
  });

  // ── modelDivergence ─────────────────────────────────────────────
  describe('modelDivergence()', () => {
    it('reports low divergence for matching data', () => {
      const pred = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const actual = [1.1, 2.0, 2.9, 4.1, 5.0, 5.9, 7.1, 8.0, 8.9, 10.1];
      const r = engine.modelDivergence({ predicted: pred, actual });
      expect(r.rmse).toBeLessThan(0.2);
      expect(r.correlation).toBeGreaterThan(0.99);
      expect(r.diverged).toBe(false);
    });

    it('detects diverged twin', () => {
      const pred = [1, 2, 3, 4, 5];
      const actual = [10, 20, 30, 40, 50];
      const r = engine.modelDivergence({ predicted: pred, actual });
      expect(r.rmse).toBeGreaterThan(5);
      expect(r.diverged).toBe(true);
      expect(
        r.warnings.some((w: string) => w.includes('recalibration'))
      ).toBe(true);
    });
  });

  // ── calculate dispatcher ────────────────────────────────────────
  it('dispatches via calculate()', () => {
    const r = engine.calculate({
      action: 'digital_twin_drift_detect',
      params: {
        observations: [0, 0, 0, 5, 5, 5],
        mu: 0, k: 0.5, h: 3,
      },
    });
    expect(r).toBeDefined();
    expect(r.alarm_detected).toBe(true);
  });

  it('throws on unknown action', () => {
    expect(() => engine.calculate({
      action: 'bogus', params: {},
    })).toThrow();
  });
});
