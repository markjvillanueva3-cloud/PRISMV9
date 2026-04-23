/**
 * Tests for MultivariateSPCEngine (Phase 0.22 U-SPC6)
 */

import { describe, it, expect } from "vitest";
import { MultivariateSPCEngine } from "../engines/MultivariateSPCEngine.js";

describe("MultivariateSPCEngine", () => {
  const baseConfig = {
    mean: [0, 0],
    covariance: [
      [1, 0.3],
      [0.3, 1],
    ],
    alpha: 0.0027,
  };

  describe("construction + validation", () => {
    it("rejects non-square covariance", () => {
      expect(
        () =>
          new MultivariateSPCEngine({
            mean: [0, 0],
            covariance: [[1, 0.3]],
          }),
      ).toThrow(/covariance/);
    });

    it("rejects asymmetric covariance", () => {
      expect(
        () =>
          new MultivariateSPCEngine({
            mean: [0, 0],
            covariance: [
              [1, 0.3],
              [0.9, 1],
            ],
          }),
      ).toThrow(/symmetric/);
    });

    it("rejects singular covariance", () => {
      expect(
        () =>
          new MultivariateSPCEngine({
            mean: [0, 0],
            covariance: [
              [1, 1],
              [1, 1],
            ],
          }),
      ).toThrow(/singular/);
    });

    it("accepts default alpha", () => {
      const e = new MultivariateSPCEngine({ mean: [0, 0], covariance: [[1, 0], [0, 1]] });
      expect(e.getUcl()).toBeGreaterThan(0);
    });
  });

  describe("chi-square critical value", () => {
    it("matches published χ²(2, 0.0027) within 2%", () => {
      const x = MultivariateSPCEngine.chiSquareCritical(2, 0.0027);
      // Published value ≈ 11.829; Wilson–Hilferty approx ≈ 11.7
      expect(x).toBeGreaterThan(11);
      expect(x).toBeLessThan(13);
    });

    it("matches published χ²(5, 0.05) within 2%", () => {
      const x = MultivariateSPCEngine.chiSquareCritical(5, 0.05);
      // Published value = 11.070
      expect(x).toBeCloseTo(11.07, 0);
    });

    it("rejects non-positive df", () => {
      expect(() => MultivariateSPCEngine.chiSquareCritical(0, 0.05)).toThrow(/df/);
    });

    it("rejects alpha outside (0,1)", () => {
      expect(() => MultivariateSPCEngine.chiSquareCritical(3, 0)).toThrow();
      expect(() => MultivariateSPCEngine.chiSquareCritical(3, 1)).toThrow();
    });
  });

  describe("hotellingT2()", () => {
    it("returns near-zero for an in-control observation at the mean", () => {
      const e = new MultivariateSPCEngine(baseConfig);
      const p = e.hotellingT2([0, 0]);
      expect(p.t2).toBeCloseTo(0, 6);
      expect(p.alarm).toBe(false);
    });

    it("fires alarm for a large simultaneous shift", () => {
      const e = new MultivariateSPCEngine(baseConfig);
      const p = e.hotellingT2([5, 5]);
      expect(p.alarm).toBe(true);
    });

    it("rejects wrong-dimension observation", () => {
      const e = new MultivariateSPCEngine(baseConfig);
      expect(() => e.hotellingT2([1, 2, 3])).toThrow();
    });

    it("detects correlation violations that univariate limits miss", () => {
      // Two variables with strong positive correlation; an observation that
      // is +1σ in one dimension but −1σ in the other is a joint outlier
      // even though each coordinate is within ±1σ.
      const e = new MultivariateSPCEngine({
        mean: [0, 0],
        covariance: [
          [1, 0.9],
          [0.9, 1],
        ],
        alpha: 0.05,
      });
      const point = e.hotellingT2([2, -2]);
      expect(point.alarm).toBe(true);
    });
  });

  describe("hotellingStream()", () => {
    it("returns one result per observation", () => {
      const e = new MultivariateSPCEngine(baseConfig);
      const obs = [
        [0, 0],
        [0.1, 0.1],
        [5, 5],
      ];
      const r = e.hotellingStream(obs);
      expect(r).toHaveLength(3);
      expect(r[0].alarm).toBe(false);
      expect(r[2].alarm).toBe(true);
    });

    it("indexes points sequentially", () => {
      const e = new MultivariateSPCEngine(baseConfig);
      const r = e.hotellingStream([[0, 0], [0, 0], [0, 0]]);
      expect(r.map((p) => p.index)).toEqual([0, 1, 2]);
    });
  });

  describe("mewmaStream()", () => {
    it("smoothes single-observation spikes relative to no smoothing", () => {
      const e = new MultivariateSPCEngine({
        ...baseConfig,
        alpha: 0.05,
      });
      const stream = Array.from({ length: 5 }, () => [0, 0] as number[]);
      stream.push([6, 6]);
      stream.push([0, 0]);
      const smoothed = e.mewmaStream(stream, 0.1);
      const noSmooth = e.mewmaStream(stream, 1.0);
      // Low λ must produce a strictly smaller T² at the spike index than λ=1
      expect(smoothed[5].t2).toBeLessThan(noSmooth[5].t2);
    });

    it("detects a sustained small shift within 20 samples", () => {
      const e = new MultivariateSPCEngine({
        ...baseConfig,
        alpha: 0.05,
      });
      const stream = Array.from({ length: 20 }, () => [0.7, 0.7] as number[]);
      const r = e.mewmaStream(stream, 0.2);
      expect(r.some((p) => p.alarm)).toBe(true);
    });

    it("rejects λ outside (0, 1]", () => {
      const e = new MultivariateSPCEngine(baseConfig);
      expect(() => e.mewmaStream([[0, 0]], 0)).toThrow(/lambda/);
      expect(() => e.mewmaStream([[0, 0]], 1.5)).toThrow(/lambda/);
    });
  });

  describe("fitFromReference()", () => {
    it("recovers mean from an in-control sample", () => {
      const obs = [
        [1, 2],
        [2, 3],
        [3, 4],
        [4, 5],
      ];
      const cfg = MultivariateSPCEngine.fitFromReference(obs);
      expect(cfg.mean[0]).toBeCloseTo(2.5, 6);
      expect(cfg.mean[1]).toBeCloseTo(3.5, 6);
    });

    it("produces a usable covariance for Phase II charting", () => {
      const obs = [
        [0.1, 0.3],
        [0.9, 0.2],
        [-1.1, 1.0],
        [0.6, -0.4],
        [-0.5, -0.9],
        [0.2, 0.8],
        [-0.3, -0.2],
        [0.7, 0.1],
      ];
      const cfg = MultivariateSPCEngine.fitFromReference(obs);
      const e = new MultivariateSPCEngine(cfg);
      const p = e.hotellingT2(cfg.mean);
      expect(p.alarm).toBe(false);
    });

    it("rejects fewer than 2 observations", () => {
      expect(() => MultivariateSPCEngine.fitFromReference([[1, 2]])).toThrow();
    });

    it("rejects inconsistent observation dimensions", () => {
      expect(() =>
        MultivariateSPCEngine.fitFromReference([
          [1, 2],
          [1, 2, 3],
        ]),
      ).toThrow();
    });
  });
});
