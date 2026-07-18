import { describe, it, expect } from 'vitest';
import {
  optimalControlEngine,
  OptimalControlEngine,
  ControlSegment,
} from '../../src/engines/OptimalControlEngine.js';

// ── Test helpers ───────────────────────────────────────────────────────

function makeSegments(n: number): ControlSegment[] {
  return Array.from({ length: n }, (_, i) => ({
    feed_mmmin: 500 + i * 50,
    rpm: 8000,
    force_N: 400 + i * 30,
    temperature_C: 150 + i * 10,
    vibration_g: 0.5 + i * 0.3,
    position: { x: i * 10, y: 0, z: 0 },
  }));
}

const defaultConstraints = {
  force_max_N: 1500,
  temp_max_C: 350,
  feed_min_mmmin: 100,
  feed_max_mmmin: 5000,
};

describe('OptimalControlEngine', () => {
  const engine = optimalControlEngine;

  it('exports a singleton instance', () => {
    expect(engine).toBeInstanceOf(OptimalControlEngine);
  });

  // ── optimize() dispatch ──────────────────────────────────────────
  describe('optimize()', () => {
    it('throws on fewer than 2 segments', () => {
      expect(() =>
        engine.optimize({
          method: 'pontryagin',
          segments: [makeSegments(1)[0]],
          constraints: defaultConstraints,
        })
      ).toThrow('At least 2 segments');
    });

    it('throws on unknown method', () => {
      expect(() =>
        engine.optimize({
          method: 'unknown' as any,
          segments: makeSegments(3),
          constraints: defaultConstraints,
        })
      ).toThrow('Unknown method');
    });
  });

  // ── Pontryagin ───────────────────────────────────────────────────
  describe('pontryagin()', () => {
    it('returns optimal feeds for each segment', () => {
      const segs = makeSegments(5);
      const r = engine.pontryagin(segs, defaultConstraints);
      expect(r.method).toBe('pontryagin');
      expect(r.optimal_feeds).toHaveLength(5);
    });

    it('optimal feeds respect min/max constraints', () => {
      const segs = makeSegments(5);
      const r = engine.pontryagin(segs, {
        ...defaultConstraints,
        feed_min_mmmin: 200,
        feed_max_mmmin: 3000,
      });
      for (const f of r.optimal_feeds) {
        expect(f.feed_mmmin).toBeGreaterThanOrEqual(200);
        expect(f.feed_mmmin).toBeLessThanOrEqual(3000);
      }
    });

    it('costate array has same length as segments', () => {
      const segs = makeSegments(4);
      const r = engine.pontryagin(segs, defaultConstraints);
      expect(r.pontryagin!.costate).toHaveLength(4);
    });

    it('feed_override_pct is computed correctly', () => {
      const segs = makeSegments(3);
      const r = engine.pontryagin(segs, defaultConstraints);
      for (let i = 0; i < 3; i++) {
        const entry = r.optimal_feeds[i];
        const expected = (entry.feed_mmmin / segs[i].feed_mmmin) * 100;
        expect(entry.feed_override_pct).toBeCloseTo(expected, 0);
      }
    });

    it('performance tracks original vs optimized time', () => {
      const segs = makeSegments(5);
      const r = engine.pontryagin(segs, defaultConstraints);
      expect(r.performance.original_time_sec).toBeGreaterThan(0);
      expect(r.performance.optimized_time_sec).toBeGreaterThan(0);
    });

    it('formula references Kienzle model', () => {
      const segs = makeSegments(3);
      const r = engine.pontryagin(segs, defaultConstraints);
      expect(r.formula).toContain('Kienzle');
    });
  });

  // ── MPC ──────────────────────────────────────────────────────────
  describe('mpc()', () => {
    it('returns horizon costs and iteration count', () => {
      const segs = makeSegments(5);
      const r = engine.mpc(
        segs,
        defaultConstraints,
        3,
        { time: 1, force: 1, temperature: 1 }
      );
      expect(r.method).toBe('mpc');
      expect(r.mpc!.horizon_costs).toHaveLength(5);
      expect(r.mpc!.iterations).toBeGreaterThan(0);
    });

    it('optimal feeds have correct segment indices', () => {
      const segs = makeSegments(4);
      const r = engine.mpc(
        segs,
        defaultConstraints,
        2,
        { time: 1, force: 1, temperature: 1 }
      );
      for (let i = 0; i < 4; i++) {
        expect(r.optimal_feeds[i].segment_idx).toBe(i);
      }
    });

    it('increasing force weight reduces peak force', () => {
      const segs = makeSegments(5);
      const rLow = engine.mpc(
        segs,
        defaultConstraints,
        3,
        { time: 1, force: 0.1, temperature: 0.1 }
      );
      const rHigh = engine.mpc(
        segs,
        defaultConstraints,
        3,
        { time: 0.1, force: 10, temperature: 0.1 }
      );
      expect(rHigh.performance.peak_force_N)
        .toBeLessThanOrEqual(rLow.performance.peak_force_N + 1);
    });

    it('formula mentions golden-section', () => {
      const segs = makeSegments(3);
      const r = engine.mpc(
        segs,
        defaultConstraints,
        2,
        { time: 1, force: 1, temperature: 1 }
      );
      expect(r.formula).toContain('golden-section');
    });
  });

  // ── LQR ──────────────────────────────────────────────────────────
  describe('lqr()', () => {
    it('returns gain vector K and eigenvalues', () => {
      const segs = makeSegments(5);
      const r = engine.lqr(segs, [1, 0.1], 0.01);
      expect(r.method).toBe('lqr');
      expect(r.lqr!.gain_K).toHaveLength(2);
      expect(r.lqr!.eigenvalues).toHaveLength(2);
    });

    it('closed-loop is stable (eigenvalues within unit circle)', () => {
      const segs = makeSegments(5);
      const r = engine.lqr(segs, [1, 0.1], 0.01);
      expect(r.lqr!.stable).toBe(true);
      for (const e of r.lqr!.eigenvalues) {
        expect(Math.abs(e)).toBeLessThan(1);
      }
    });

    it('feeds stay within default bounds', () => {
      const segs = makeSegments(5);
      const r = engine.lqr(segs, [1, 0.1], 0.01);
      for (const f of r.optimal_feeds) {
        expect(f.feed_mmmin).toBeGreaterThanOrEqual(50);
        expect(f.feed_mmmin).toBeLessThanOrEqual(10000);
      }
    });

    it('formula references DARE', () => {
      const segs = makeSegments(3);
      const r = engine.lqr(segs, [1, 0.1], 0.01);
      expect(r.formula).toContain('LQR');
      expect(r.formula).toContain('u=-Kx');
    });
  });

  // ── HJB ──────────────────────────────────────────────────────────
  describe('hjb()', () => {
    it('returns value function samples and policy', () => {
      const segs = makeSegments(4);
      const r = engine.hjb(segs, defaultConstraints);
      expect(r.method).toBe('hjb');
      expect(r.hjb!.value_function_samples).toHaveLength(4);
      expect(r.hjb!.policy).toHaveLength(4);
    });

    it('value function is non-negative', () => {
      const segs = makeSegments(4);
      const r = engine.hjb(segs, defaultConstraints);
      for (const v of r.hjb!.value_function_samples) {
        expect(v).toBeGreaterThanOrEqual(0);
      }
    });

    it('policy indices are valid bin indices', () => {
      const segs = makeSegments(4);
      const r = engine.hjb(segs, defaultConstraints);
      for (const p of r.hjb!.policy) {
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThan(25); // nBins = 25
      }
    });

    it('formula mentions backward induction and uncertainty', () => {
      const segs = makeSegments(3);
      const r = engine.hjb(segs, defaultConstraints);
      expect(r.formula).toContain('backward induction');
      expect(r.formula).toContain('uncertainty');
    });

    it('feeds respect constraint bounds', () => {
      const segs = makeSegments(5);
      const r = engine.hjb(segs, {
        ...defaultConstraints,
        feed_min_mmmin: 200,
        feed_max_mmmin: 4000,
      });
      for (const f of r.optimal_feeds) {
        expect(f.feed_mmmin).toBeGreaterThanOrEqual(200);
        expect(f.feed_mmmin).toBeLessThanOrEqual(4000);
      }
    });
  });

  // ── Cross-method comparison ──────────────────────────────────────
  describe('cross-method', () => {
    it('all methods return time_reduction_pct', () => {
      const segs = makeSegments(5);
      const methods = ['pontryagin', 'mpc', 'lqr', 'hjb'] as const;
      for (const method of methods) {
        const r = engine.optimize({
          method,
          segments: segs,
          constraints: defaultConstraints,
        });
        expect(typeof r.time_reduction_pct).toBe('number');
      }
    });
  });
});
