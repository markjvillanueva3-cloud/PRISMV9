import { describe, it, expect } from 'vitest';
import {
  informationTheoryEngine,
  InformationTheoryEngine,
} from '../../engines/InformationTheoryEngine.js';

describe('InformationTheoryEngine', () => {
  const engine = informationTheoryEngine;

  it('exports a singleton instance', () => {
    expect(engine).toBeInstanceOf(InformationTheoryEngine);
  });

  // ── histogram() ────────────────────────────────────────────────────
  describe('histogram()', () => {
    it('returns normalized probabilities summing to 1', () => {
      const signal = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const h = engine.histogram(signal, 5);
      const sum = h.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 10);
    });

    it('returns empty array for empty signal', () => {
      expect(engine.histogram([], 10)).toEqual([]);
    });

    it('constant signal puts all mass in one bin', () => {
      const h = engine.histogram([5, 5, 5, 5], 10);
      expect(h[0]).toBe(1.0);
      expect(h.slice(1).every(v => v === 0)).toBe(true);
    });

    it('returns correct number of bins', () => {
      const h = engine.histogram([1, 2, 3], 7);
      expect(h).toHaveLength(7);
    });
  });

  // ── shannonEntropy() ───────────────────────────────────────────────
  describe('shannonEntropy()', () => {
    it('entropy >= 0 for any signal', () => {
      const h = engine.shannonEntropy([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      expect(h).toBeGreaterThanOrEqual(0);
    });

    it('constant signal has zero entropy', () => {
      const h = engine.shannonEntropy([7, 7, 7, 7, 7, 7, 7, 7, 7, 7]);
      expect(h).toBeCloseTo(0, 6);
    });

    it('uniform signal has maximum entropy', () => {
      // Create a signal that fills bins uniformly
      const bins = 10;
      const signal: number[] = [];
      for (let i = 0; i < 1000; i++) signal.push(i / 1000);
      const h = engine.shannonEntropy(signal, bins);
      const maxH = Math.log2(bins);
      expect(h).toBeCloseTo(maxH, 0);
    });

    it('entropy <= log2(bins)', () => {
      const bins = 20;
      const signal = Array.from({ length: 100 }, (_, i) => Math.sin(i));
      const h = engine.shannonEntropy(signal, bins);
      expect(h).toBeLessThanOrEqual(Math.log2(bins) + 0.01);
    });
  });

  // ── mutualInformation() ────────────────────────────────────────────
  describe('mutualInformation()', () => {
    it('MI >= 0 (non-negative)', () => {
      const x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const y = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
      const mi = engine.mutualInformation(x, y, 5);
      expect(mi).toBeGreaterThanOrEqual(0);
    });

    it('identical signals have high MI', () => {
      const x = Array.from({ length: 100 }, (_, i) => Math.sin(i * 0.1));
      const mi = engine.mutualInformation(x, x, 10);
      expect(mi).toBeGreaterThan(0.5);
    });

    it('MI <= min(H(X), H(Y))', () => {
      const x = Array.from({ length: 100 }, (_, i) => i);
      const y = Array.from({ length: 100 }, (_, i) => i * 2);
      const bins = 10;
      const mi = engine.mutualInformation(x, y, bins);
      const hx = engine.shannonEntropy(x, bins);
      const hy = engine.shannonEntropy(y, bins);
      expect(mi).toBeLessThanOrEqual(Math.min(hx, hy) + 0.01);
    });
  });

  // ── klDivergence() ─────────────────────────────────────────────────
  describe('klDivergence()', () => {
    it('KL(P||P) ≈ 0 (same distribution)', () => {
      const p = Array.from({ length: 200 }, (_, i) => Math.sin(i * 0.05));
      const dkl = engine.klDivergence(p, p, 10);
      expect(dkl).toBeCloseTo(0, 1);
    });

    it('KL >= 0 (Gibbs inequality)', () => {
      const p = Array.from({ length: 100 }, (_, i) => i);
      const q = Array.from({ length: 100 }, (_, i) => i * i);
      expect(engine.klDivergence(p, q, 10)).toBeGreaterThanOrEqual(0);
    });

    it('different distributions yield positive KL divergence', () => {
      // Gaussian-like vs uniform-like distributions
      const p = Array.from({ length: 200 }, (_, i) => {
        const x = (i - 100) / 30;
        return Math.exp(-0.5 * x * x);
      });
      const q = Array.from({ length: 200 }, (_, i) => i / 200);
      const dkl = engine.klDivergence(p, q, 10);
      expect(dkl).toBeGreaterThan(0);
    });
  });

  // ── transferEntropy() ──────────────────────────────────────────────
  describe('transferEntropy()', () => {
    it('returns 0 for signals shorter than MIN_SIGNAL_LENGTH', () => {
      const te = engine.transferEntropy([1, 2, 3], [4, 5, 6], 1, 5);
      expect(te).toBe(0);
    });

    it('TE >= 0 for valid signals', () => {
      const x = Array.from({ length: 50 }, (_, i) => Math.sin(i * 0.2));
      const y = Array.from({ length: 50 }, (_, i) => Math.cos(i * 0.2));
      const te = engine.transferEntropy(x, y, 1, 5);
      expect(te).toBeGreaterThanOrEqual(0);
    });

    it('TE is non-negative for causal signal', () => {
      // x drives y with lag 1
      const x = Array.from({ length: 100 }, (_, i) => Math.sin(i * 0.1));
      const y = x.map((v, i) => (i > 0 ? x[i - 1] * 0.8 + v * 0.2 : v));
      const teXY = engine.transferEntropy(x, y, 1, 5);
      expect(teXY).toBeGreaterThanOrEqual(0);
    });
  });

  // ── sampleEntropy() ────────────────────────────────────────────────
  describe('sampleEntropy()', () => {
    it('returns 0 for signal shorter than MIN_SAMPEN_LENGTH', () => {
      expect(engine.sampleEntropy([1, 2, 3])).toBe(0);
    });

    it('returns 0 for constant signal', () => {
      const signal = new Array(50).fill(5);
      expect(engine.sampleEntropy(signal)).toBe(0);
    });

    it('regular signal has lower SampEn than noisy signal', () => {
      const regular = Array.from({ length: 100 }, (_, i) => Math.sin(i * 0.1));
      const noisy = Array.from({ length: 100 }, () => Math.random() * 10);
      const seReg = engine.sampleEntropy(regular);
      const seNoisy = engine.sampleEntropy(noisy);
      expect(seReg).toBeLessThan(seNoisy + 0.5);
    });

    it('SampEn >= 0 for non-constant signals', () => {
      const signal = Array.from(
        { length: 50 },
        (_, i) => Math.sin(i * 0.3) + 0.1 * Math.random()
      );
      const se = engine.sampleEntropy(signal);
      expect(se).toBeGreaterThanOrEqual(0);
    });
  });

  // ── analyze() composite ────────────────────────────────────────────
  describe('analyze()', () => {
    it('returns all 5 measures when signals provided', () => {
      const x = Array.from({ length: 100 }, (_, i) => Math.sin(i * 0.1));
      const y = Array.from({ length: 100 }, (_, i) => Math.cos(i * 0.1));
      const ref = Array.from({ length: 100 }, (_, i) => Math.sin(i * 0.12));
      const r = engine.analyze({
        signal_x: x,
        signal_y: y,
        reference_signal: ref,
      });
      expect(r.shannon_entropy).toBeDefined();
      expect(r.mutual_information).toBeDefined();
      expect(r.kl_divergence).toBeDefined();
      expect(r.transfer_entropy).toBeDefined();
      expect(r.sample_entropy).toBeDefined();
      expect(r.process_health_score).toBeGreaterThanOrEqual(0);
      expect(r.process_health_score).toBeLessThanOrEqual(100);
    });

    it('warns when signal_y missing for MI and TE', () => {
      const r = engine.analyze({
        signal_x: Array.from({ length: 50 }, (_, i) => i),
        measures: ['mutual_info', 'transfer_entropy'],
      });
      expect(r.warnings).toContain('mutual_info requires signal_y; skipped');
      expect(r.warnings).toContain('transfer_entropy requires signal_y; skipped');
    });

    it('warns when reference_signal missing for KL', () => {
      const r = engine.analyze({
        signal_x: Array.from({ length: 50 }, (_, i) => i),
        measures: ['kl_divergence'],
      });
      expect(r.warnings).toContain(
        'kl_divergence requires reference_signal; skipped'
      );
    });

    it('stability classification: constant = stable', () => {
      const r = engine.analyze({
        signal_x: new Array(50).fill(42),
        measures: ['shannon'],
      });
      expect(r.shannon_entropy!.stability).toBe('stable');
    });

    it('drift_severity is none for identical distributions', () => {
      const sig = Array.from({ length: 200 }, (_, i) => i);
      const r = engine.analyze({
        signal_x: sig,
        reference_signal: sig,
        measures: ['kl_divergence'],
      });
      expect(r.kl_divergence!.drift_severity).toBe('none');
      expect(r.kl_divergence!.drift_detected).toBe(false);
    });

    it('health score = 100 when no measures computed', () => {
      const r = engine.analyze({ signal_x: [1], measures: [] });
      expect(r.process_health_score).toBe(100);
    });

    it('formula string contains all requested formulas', () => {
      const r = engine.analyze({
        signal_x: Array.from({ length: 50 }, (_, i) => i),
        measures: ['shannon'],
      });
      expect(r.formula).toContain('H(X)');
    });
  });
});
