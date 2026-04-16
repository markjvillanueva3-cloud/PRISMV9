/**
 * Tests for ChangePointDetectionEngine (Phase 0.22 U-SPC7)
 */

import { describe, it, expect } from "vitest";
import {
  ChangePointDetectionEngine,
  DEFAULT_CP_CONFIG,
  changePointDetectionEngine,
} from "../engines/ChangePointDetectionEngine.js";

describe("ChangePointDetectionEngine", () => {
  describe("construction", () => {
    it("uses default config when none supplied", () => {
      const e = new ChangePointDetectionEngine();
      expect(e.getConfig()).toEqual(DEFAULT_CP_CONFIG);
    });

    it("rejects invalid minSegmentSize", () => {
      expect(() =>
        new ChangePointDetectionEngine({ minSegmentSize: 1, penalty: 1 })
      ).toThrow(/minSegmentSize/);
    });

    it("rejects non-positive penalty", () => {
      expect(() =>
        new ChangePointDetectionEngine({ minSegmentSize: 5, penalty: 0 })
      ).toThrow(/penalty/);
    });

    it("rejects non-integer maxDepth", () => {
      expect(() =>
        new ChangePointDetectionEngine({ minSegmentSize: 5, penalty: 1, maxDepth: 0 })
      ).toThrow(/maxDepth/);
    });
  });

  describe("detect() — binary segmentation", () => {
    const e = new ChangePointDetectionEngine({ minSegmentSize: 5, penalty: 5 });

    it("finds no change points in a constant series", () => {
      const r = e.detect(Array.from({ length: 40 }, () => 5));
      expect(r).toEqual([]);
    });

    it("returns empty when series is shorter than 2·minSegmentSize", () => {
      const r = e.detect([1, 2, 3, 4, 5]);
      expect(r).toEqual([]);
    });

    it("finds a single change point on a clear step", () => {
      const series = [...Array(15).fill(0), ...Array(15).fill(10)];
      const r = e.detect(series);
      expect(r.length).toBeGreaterThanOrEqual(1);
      const cp = r[0];
      expect(cp.index).toBeGreaterThanOrEqual(14);
      expect(cp.index).toBeLessThanOrEqual(16);
      expect(cp.leftMean).toBeCloseTo(0, 4);
      expect(cp.rightMean).toBeCloseTo(10, 4);
    });

    it("returns change points sorted by index", () => {
      const series = [
        ...Array(10).fill(0),
        ...Array(10).fill(5),
        ...Array(10).fill(0),
      ];
      const r = e.detect(series);
      for (let i = 1; i < r.length; i += 1) {
        expect(r[i].index).toBeGreaterThan(r[i - 1].index);
      }
    });

    it("validates input (rejects non-finite values)", () => {
      expect(() => e.detect([1, NaN, 3])).toThrow(/finite/);
    });

    it("penalty controls sensitivity", () => {
      const loose = new ChangePointDetectionEngine({ minSegmentSize: 5, penalty: 1 });
      const strict = new ChangePointDetectionEngine({ minSegmentSize: 5, penalty: 1000 });
      const series = [...Array(15).fill(0), ...Array(15).fill(1)];
      expect(loose.detect(series).length).toBeGreaterThanOrEqual(strict.detect(series).length);
    });

    it("respects maxDepth as a hard cap on recursion", () => {
      const shallow = new ChangePointDetectionEngine({ minSegmentSize: 5, penalty: 0.1, maxDepth: 1 });
      const deep = new ChangePointDetectionEngine({ minSegmentSize: 5, penalty: 0.1, maxDepth: 20 });
      const series = Array.from({ length: 120 }, (_, i) => Math.floor(i / 10) % 2);
      expect(shallow.detect(series).length).toBeLessThanOrEqual(deep.detect(series).length);
    });
  });

  describe("detectSingle() — CUSUM argmax", () => {
    const e = new ChangePointDetectionEngine();

    it("returns null on a 0- or 1-length series", () => {
      expect(e.detectSingle([])).toBeNull();
      expect(e.detectSingle([1])).toBeNull();
    });

    it("locates the split on a clear step", () => {
      const series = [...Array(20).fill(0), ...Array(20).fill(5)];
      const cp = e.detectSingle(series)!;
      expect(cp.index).toBe(20);
      expect(cp.leftMean).toBeCloseTo(0, 4);
      expect(cp.rightMean).toBeCloseTo(5, 4);
    });

    it("returns a single change point for a monotone trend (best single split)", () => {
      const series = Array.from({ length: 20 }, (_, i) => i);
      const cp = e.detectSingle(series);
      expect(cp).not.toBeNull();
      expect(cp!.index).toBeGreaterThan(0);
      expect(cp!.index).toBeLessThan(20);
    });
  });

  describe("module singleton", () => {
    it("exports a ready-to-use instance", () => {
      expect(changePointDetectionEngine.getConfig()).toEqual(DEFAULT_CP_CONFIG);
    });
  });
});
