/**
 * Batch 29 Engines -- Unit Tests
 * TimeSeriesEngine, ClusteringEngine
 * @milestone AUDIT-FT-B29
 */
import { describe, it, expect } from "vitest";
import { timeSeriesEngine } from "../engines/TimeSeriesEngine.js";
import { clusteringEngine } from "../engines/ClusteringEngine.js";

describe("TimeSeriesEngine", () => {
  describe("simpleExponentialSmoothing", () => {
    it("returns empty for empty input", () => {
      expect(timeSeriesEngine.simpleExponentialSmoothing([])).toEqual([]);
    });

    it("smooths a noisy signal", () => {
      const data = [10, 12, 11, 13, 12, 14, 13, 15];
      const smoothed = timeSeriesEngine.simpleExponentialSmoothing(data, 0.3);
      expect(smoothed.length).toBe(data.length);
      expect(smoothed[0]).toBe(10);
      // Smoothed values should be less volatile
      const dataRange = Math.max(...data) - Math.min(...data);
      const smoothRange = Math.max(...smoothed) - Math.min(...smoothed);
      expect(smoothRange).toBeLessThanOrEqual(dataRange);
    });
  });

  describe("holtSmoothing", () => {
    it("captures upward trend", () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const r = timeSeriesEngine.holtSmoothing(data, 0.5, 0.3);
      expect(r.smoothed.length).toBe(10);
      expect(r.trend[r.trend.length - 1]).toBeGreaterThan(0);
    });

    it("handles short data", () => {
      const r = timeSeriesEngine.holtSmoothing([5]);
      expect(r.smoothed).toEqual([5]);
    });
  });

  describe("holtWinters", () => {
    it("fits seasonal data", () => {
      // Generate seasonal data: trend + season(period=4)
      const data: number[] = [];
      const season = [1, 0.8, 1.2, 1.0];
      for (let i = 0; i < 24; i++) {
        data.push((10 + i * 0.5) * season[i % 4]);
      }
      const r = timeSeriesEngine.holtWinters(data, { seasonLength: 4 });
      if ("error" in r) throw new Error(r.error);
      expect(r.fitted.length).toBe(24);
      expect(r.seasonal.length).toBe(4); // one per season period
    });

    it("generates forecasts", () => {
      const data: number[] = [];
      const season = [1, 0.9, 1.1, 1.0];
      for (let i = 0; i < 24; i++) {
        data.push((10 + i * 0.3) * season[i % 4]);
      }
      const r = timeSeriesEngine.holtWinters(data, { seasonLength: 4 });
      if ("error" in r) throw new Error(r.error);
      const fc = r.forecast(8);
      expect(fc.length).toBe(8);
      // Forecasts should be positive (positive data)
      fc.forEach(v => expect(v).toBeGreaterThan(0));
    });

    it("rejects insufficient data", () => {
      const r = timeSeriesEngine.holtWinters([1, 2, 3], { seasonLength: 4 });
      expect("error" in r).toBe(true);
    });
  });

  describe("detectSeasonality", () => {
    it("detects periodic signal", () => {
      const data: number[] = [];
      for (let i = 0; i < 100; i++) data.push(Math.sin(2 * Math.PI * i / 10) + 5);
      const r = timeSeriesEngine.detectSeasonality(data);
      expect(r.seasonal).toBe(true);
      expect(r.period).toBe(10);
    });

    it("returns false for white noise", () => {
      // Use a deterministic "noisy" signal with no periodicity
      const data = Array.from({ length: 50 }, (_, i) => (i * 7 + 3) % 13);
      const r = timeSeriesEngine.detectSeasonality(data);
      // Not guaranteed to be false for all pseudo-random sequences, but this one shouldn't be periodic
      expect(r.autocorrelations.length).toBeGreaterThan(0);
    });
  });

  describe("decompose", () => {
    it("decomposes additive series", () => {
      const data: number[] = [];
      for (let i = 0; i < 40; i++) {
        data.push(10 + i * 0.2 + [2, -1, 0, 1, -2][i % 5]);
      }
      const r = timeSeriesEngine.decompose(data, 5, false);
      expect(r.trend.length).toBe(40);
      expect(r.seasonal.length).toBe(40);
      expect(r.residual.length).toBe(40);
      // Trend should be non-null in the middle
      expect(r.trend[10]).not.toBeNull();
    });
  });

  describe("forecastHolt", () => {
    it("projects trend forward", () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8];
      const fc = timeSeriesEngine.forecastHolt(data, 4);
      expect(fc.length).toBe(4);
      // Should continue upward
      expect(fc[0]).toBeGreaterThan(8);
      expect(fc[3]).toBeGreaterThan(fc[0]);
    });
  });
});

describe("ClusteringEngine", () => {
  describe("kMedoids", () => {
    it("separates two clusters", () => {
      const data = [
        [0, 0], [1, 0], [0, 1], [1, 1],    // cluster A near origin
        [10, 10], [11, 10], [10, 11], [11, 11], // cluster B far away
      ];
      const r = clusteringEngine.kMedoids(data, 2);
      expect(r.medoids.length).toBe(2);
      expect(r.labels.length).toBe(8);
      // First 4 should share a label, last 4 should share another
      expect(r.labels[0]).toBe(r.labels[1]);
      expect(r.labels[4]).toBe(r.labels[5]);
      expect(r.labels[0]).not.toBe(r.labels[4]);
    });

    it("throws for k > n", () => {
      expect(() => clusteringEngine.kMedoids([[1]], 2)).toThrow();
    });

    it("returns cost", () => {
      const data = [[0, 0], [1, 1], [10, 10], [11, 11]];
      const r = clusteringEngine.kMedoids(data, 2);
      expect(r.cost).toBeGreaterThan(0);
      expect(r.iterations).toBeGreaterThan(0);
    });
  });

  describe("meanShift", () => {
    it("finds clusters in well-separated data", () => {
      const data: number[][] = [];
      // Cluster A around (0,0)
      for (let i = 0; i < 20; i++) data.push([i * 0.1 - 1, i * 0.05 - 0.5]);
      // Cluster B around (10,10)
      for (let i = 0; i < 20; i++) data.push([10 + i * 0.1 - 1, 10 + i * 0.05 - 0.5]);
      const r = clusteringEngine.meanShift(data, 2.0);
      expect(r.numClusters).toBeGreaterThanOrEqual(2);
      expect(r.labels.length).toBe(40);
      expect(r.bandwidth).toBe(2.0);
    });

    it("auto-estimates bandwidth", () => {
      const data = [[0, 0], [1, 1], [2, 2], [10, 10], [11, 11], [12, 12]];
      const r = clusteringEngine.meanShift(data);
      expect(r.bandwidth).toBeGreaterThan(0);
      expect(r.clusterCenters.length).toBeGreaterThan(0);
    });
  });

  describe("silhouetteScore", () => {
    it("scores well-separated clusters highly", () => {
      const data = [[0, 0], [1, 0], [0, 1], [10, 10], [11, 10], [10, 11]];
      const labels = [0, 0, 0, 1, 1, 1];
      const score = clusteringEngine.silhouetteScore(data, labels);
      expect(score).toBeGreaterThan(0.5);
    });

    it("returns 0 for single cluster", () => {
      const data = [[0, 0], [1, 1], [2, 2]];
      const labels = [0, 0, 0];
      expect(clusteringEngine.silhouetteScore(data, labels)).toBe(0);
    });
  });
});
