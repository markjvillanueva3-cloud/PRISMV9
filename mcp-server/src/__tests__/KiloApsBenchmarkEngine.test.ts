/**
 * KiloApsBenchmarkEngine Tests — KILO-CAM-TRAINING-MS0 iter 2
 *
 * Verifies pure-stats throughput computation + 3-mode comparison.
 * No network calls (engine is pure functions consuming pre-measured samples).
 *
 * @milestone KILO-CAM-TRAINING-MS0
 */

import { describe, it, expect } from "vitest";
import {
  kiloApsBenchmarkEngine,
  ThroughputStatsSchema,
  ModeComparisonSchema,
  type LatencySample,
} from "../engines/KiloApsBenchmarkEngine.js";

// Synthetic samples chosen so percentiles are exact: 100 successful APS
// samples with latencies 10..1000 ms in 10-ms increments → p50=500, p95=950, p99=990, mean=505.
function buildSyntheticAps(): LatencySample[] {
  const out: LatencySample[] = [];
  for (let i = 1; i <= 100; i++) {
    out.push({
      file_id: `f${i}`,
      mode: "aps_rest",
      api_call: "GET /data/v1/projects/.../folders/.../contents",
      latency_ms: i * 10,
      bytes_transferred: 50_000,
      success: true,
    });
  }
  return out;
}

// Add-in samples: 50 samples at 30,000 ms each (the historical "30s per op" pain).
function buildSyntheticAddin(): LatencySample[] {
  const out: LatencySample[] = [];
  for (let i = 1; i <= 50; i++) {
    out.push({
      file_id: `f${i}`,
      mode: "fusion_addin",
      api_call: "ws://localhost:18360/rpc.traverse_cam_tree",
      latency_ms: 30_000,
      success: true,
    });
  }
  return out;
}

// File-parse: 100 samples at 25 ms each (offline .f3d ZIP read).
function buildSyntheticFileParse(): LatencySample[] {
  const out: LatencySample[] = [];
  for (let i = 1; i <= 100; i++) {
    out.push({
      file_id: `f${i}`,
      mode: "file_parse",
      api_call: "fs.readFile + unzipper.parse",
      latency_ms: 25,
      success: true,
    });
  }
  return out;
}

describe("KiloApsBenchmarkEngine", () => {
  describe("computeThroughput — percentiles + throughput", () => {
    const samples = buildSyntheticAps();

    it("sample_count == 100 (all APS samples picked up)", () => {
      const s = kiloApsBenchmarkEngine.computeThroughput(samples, "aps_rest");
      expect(s.sample_count).toBe(100);
    });

    it("success_count == 100 (all marked success)", () => {
      const s = kiloApsBenchmarkEngine.computeThroughput(samples, "aps_rest");
      expect(s.success_count).toBe(100);
      expect(s.failure_count).toBe(0);
    });

    it("p50 == 505 (linear interp between 500 and 510)", () => {
      const s = kiloApsBenchmarkEngine.computeThroughput(samples, "aps_rest");
      expect(s.p50_ms).toBeCloseTo(505, 0);
    });

    it("p95 == 950.5 (linear interp at rank 94.05 of 100 samples)", () => {
      const s = kiloApsBenchmarkEngine.computeThroughput(samples, "aps_rest");
      // PERCENTILE.INC: rank = 0.95 * 99 = 94.05, samples[94]=950 + 0.05*(960-950)=950.5
      expect(s.p95_ms).toBeCloseTo(950.5, 1);
    });

    it("p99 == 990.1 (linear interp at rank 98.01 of 100 samples)", () => {
      const s = kiloApsBenchmarkEngine.computeThroughput(samples, "aps_rest");
      // PERCENTILE.INC: rank = 0.99 * 99 = 98.01, samples[98]=990 + 0.01*(1000-990)=990.1
      expect(s.p99_ms).toBeCloseTo(990.1, 1);
    });

    it("mean == 505 (arithmetic mean of 10..1000 step 10)", () => {
      const s = kiloApsBenchmarkEngine.computeThroughput(samples, "aps_rest");
      expect(s.mean_ms).toBeCloseTo(505, 0);
    });

    it("files_per_sec ≈ 1.98 (100 files / 50500 ms * 1000)", () => {
      const s = kiloApsBenchmarkEngine.computeThroughput(samples, "aps_rest");
      // 100/50500 * 1000 = 1.9802
      expect(s.files_per_sec).toBeCloseTo(1.98, 2);
    });

    it("corpus_eta_hours for 147,717 files at ~1.98 fps ≈ 20.72 hours", () => {
      const s = kiloApsBenchmarkEngine.computeThroughput(samples, "aps_rest");
      // 147717 / 1.98 / 3600 = 20.72
      expect(s.corpus_eta_hours).toBeCloseTo(20.72, 0);
    });

    it("operator override of corpus_size flows through", () => {
      const s = kiloApsBenchmarkEngine.computeThroughput(samples, "aps_rest", { corpus_size: 1000 });
      // 1000 / 1.98 / 3600 = 0.14 hours
      expect(s.corpus_eta_hours).toBeCloseTo(0.14, 1);
    });
  });

  describe("computeThroughput — refuse: empty samples surface (not stub)", () => {
    it("empty samples returns valid=false (no fabricated stats)", () => {
      const s = kiloApsBenchmarkEngine.computeThroughput([], "aps_rest");
      expect(s.valid).toBe(false);
      expect(s.gap).not.toBeNull();
      expect(s.gap!).toMatch(/no latency samples/);
    });

    it("empty samples have all stats at 0 (refuse: never invent)", () => {
      const s = kiloApsBenchmarkEngine.computeThroughput([], "aps_rest");
      expect(s.sample_count).toBe(0);
      expect(s.p50_ms).toBe(0);
      expect(s.files_per_sec).toBe(0);
      expect(s.corpus_eta_hours).toBe(0);
    });

    it("all-failure samples return valid=false with named gap", () => {
      const failed: LatencySample[] = [
        { file_id: "f1", mode: "aps_rest", api_call: "x", latency_ms: 100, success: false, error: "401" },
        { file_id: "f2", mode: "aps_rest", api_call: "x", latency_ms: 100, success: false, error: "429" },
      ];
      const s = kiloApsBenchmarkEngine.computeThroughput(failed, "aps_rest");
      expect(s.valid).toBe(false);
      expect(s.failure_count).toBe(2);
      expect(s.gap!).toMatch(/all 2 samples failed/);
    });
  });

  describe("compareModes — 3-mode ranking + speedup", () => {
    const samples = [
      ...buildSyntheticAps(),       // ~1.98 fps
      ...buildSyntheticAddin(),     // 50 files at 30,000 ms each = ~0.033 fps
      ...buildSyntheticFileParse(), // 100 files at 25 ms = 40 fps
    ];

    it("ranks file_parse first (40 fps), aps_rest second (1.98 fps), addin last (0.033 fps)", () => {
      const cmp = kiloApsBenchmarkEngine.compareModes(samples);
      expect(cmp.ranked_modes[0]).toBe("file_parse");
      expect(cmp.ranked_modes[1]).toBe("aps_rest");
      expect(cmp.ranked_modes[2]).toBe("fusion_addin");
    });

    it("recommended_primary_mode == file_parse (fastest valid mode)", () => {
      const cmp = kiloApsBenchmarkEngine.compareModes(samples);
      expect(cmp.recommended_primary_mode).toBe("file_parse");
    });

    it("speedup file_parse vs fusion_addin ≈ 1200× (40 / 0.033)", () => {
      const cmp = kiloApsBenchmarkEngine.compareModes(samples);
      // 40 / 0.0333 = 1200.6
      expect(cmp.best_to_worst_speedup!).toBeGreaterThan(1100);
      expect(cmp.best_to_worst_speedup!).toBeLessThan(1300);
    });

    it("output passes schema round-trip", () => {
      const cmp = kiloApsBenchmarkEngine.compareModes(samples);
      expect(() => ModeComparisonSchema.parse(cmp)).not.toThrow();
    });
  });

  describe("compareModes — empty-mode case", () => {
    it("when only one mode has data, it ranks first, others valid=false", () => {
      const cmp = kiloApsBenchmarkEngine.compareModes(buildSyntheticAps());
      expect(cmp.ranked_modes[0]).toBe("aps_rest");
      expect(cmp.modes.fusion_addin.valid).toBe(false);
      expect(cmp.modes.file_parse.valid).toBe(false);
      expect(cmp.recommended_primary_mode).toBe("aps_rest");
    });

    it("when no mode has data, recommended is null + speedup is null", () => {
      const cmp = kiloApsBenchmarkEngine.compareModes([]);
      expect(cmp.recommended_primary_mode).toBe(null);
      expect(cmp.best_to_worst_speedup).toBe(null);
    });
  });

  describe("R12 schema gates", () => {
    it("LatencySample with negative latency rejected", () => {
      const bad: LatencySample = { file_id: "x", mode: "aps_rest", api_call: "y", latency_ms: -1, success: true };
      expect(() => kiloApsBenchmarkEngine.computeThroughput([bad], "aps_rest")).toThrow();
    });

    it("invalid mode rejected", () => {
      const bad = { file_id: "x", mode: "made_up", api_call: "y", latency_ms: 100, success: true } as never;
      expect(() => kiloApsBenchmarkEngine.computeThroughput([bad as LatencySample], "aps_rest")).toThrow();
    });

    it("output fingerprints source", () => {
      const s = kiloApsBenchmarkEngine.computeThroughput(buildSyntheticAps(), "aps_rest");
      expect(s.source).toBe("kilo_aps_benchmark");
      const cmp = kiloApsBenchmarkEngine.compareModes(buildSyntheticAps());
      expect(cmp.source).toBe("kilo_aps_benchmark");
    });

    it("ThroughputStatsSchema round-trips", () => {
      const s = kiloApsBenchmarkEngine.computeThroughput(buildSyntheticAps(), "aps_rest");
      expect(() => ThroughputStatsSchema.parse(s)).not.toThrow();
    });
  });
});
