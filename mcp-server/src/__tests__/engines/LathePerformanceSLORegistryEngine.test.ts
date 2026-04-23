/**
 * LathePerformanceSLORegistryEngine tests
 * LATHE-PROD-READY-MS0 / U-LPR-PERF-SLO
 */
import { describe, it, expect } from "vitest";
import {
  LathePerformanceSLORegistryEngine,
  lathePerformanceSLORegistryEngine,
  DEFAULT_LATHE_SLO_TARGETS,
  type LatheSLOMetric,
  type SLOTarget,
} from "../../engines/LathePerformanceSLORegistryEngine.js";

function fresh(): LathePerformanceSLORegistryEngine {
  return new LathePerformanceSLORegistryEngine();
}

describe("LathePerformanceSLORegistryEngine", () => {
  it("exports a ready-to-use singleton", () => {
    expect(lathePerformanceSLORegistryEngine).toBeInstanceOf(
      LathePerformanceSLORegistryEngine,
    );
  });

  it("seeds with the canonical lathe SLO target set", () => {
    const e = fresh();
    const metrics = e.targets().map((t) => t.metric);
    expect(metrics).toContain("parting_cycle_time_ms");
    expect(metrics).toContain("program_generation_ms");
    expect(metrics).toContain("tool_change_ms");
    expect(metrics).toContain("simulation_completion_ms");
    expect(metrics.length).toBe(DEFAULT_LATHE_SLO_TARGETS.length);
  });

  it("targets() returns cloned copies — mutation doesn't leak", () => {
    const e = fresh();
    const snap1 = e.targets();
    snap1[0].threshold = 999999;
    const snap2 = e.targets();
    expect(snap2[0].threshold).not.toBe(999999);
  });

  it("getTarget returns undefined for unknown metric", () => {
    const e = fresh();
    expect(e.getTarget("not_a_metric" as LatheSLOMetric)).toBeUndefined();
  });

  it("insufficient_data verdict when samples < min_samples", () => {
    const e = fresh();
    // parting_cycle_time_ms needs 10 samples
    for (let i = 0; i < 5; i++) e.recordSample("parting_cycle_time_ms", 4000);
    const v = e.evaluate("parting_cycle_time_ms");
    expect(v.status).toBe("insufficient_data");
    expect(v.measured).toBeNull();
    expect(v.sample_count).toBe(5);
  });

  it("ok verdict when p95 is well under threshold", () => {
    const e = fresh();
    for (let i = 0; i < 20; i++) e.recordSample("parting_cycle_time_ms", 2000);
    const v = e.evaluate("parting_cycle_time_ms");
    expect(v.status).toBe("ok");
    expect(v.measured).toBe(2000);
    expect(v.remediation).toBeNull();
    expect(v.error_budget_pct).toBeGreaterThan(0);
  });

  it("warning verdict when p95 is within 10% of threshold", () => {
    const e = fresh();
    // threshold = 8000, warning zone = 7200..8000
    for (let i = 0; i < 20; i++) e.recordSample("parting_cycle_time_ms", 7500);
    const v = e.evaluate("parting_cycle_time_ms");
    expect(v.status).toBe("warning");
    expect(v.remediation).not.toBeNull();
  });

  it("breach verdict when p95 exceeds threshold", () => {
    const e = fresh();
    for (let i = 0; i < 20; i++) e.recordSample("parting_cycle_time_ms", 9500);
    const v = e.evaluate("parting_cycle_time_ms");
    expect(v.status).toBe("breach");
    expect(v.measured).toBe(9500);
    expect(v.remediation).toMatch(/parting blade/i);
    expect(v.error_budget_pct).toBeLessThan(0);
  });

  it("percentile calculation picks correct rank (p95 of 20 samples = rank 19)", () => {
    const e = fresh();
    // 20 samples: 0..19 — p95 should be the 19th in sorted order
    // rank = ceil(0.95 * 20) = 19 → sorted[18] = 18
    for (let i = 0; i < 20; i++) e.recordSample("parting_cycle_time_ms", i);
    const v = e.evaluate("parting_cycle_time_ms");
    expect(v.measured).toBe(18);
  });

  it("recordSample trims beyond window_size (ring buffer)", () => {
    const e = fresh();
    // parting_cycle_time_ms window = 100
    for (let i = 0; i < 150; i++) e.recordSample("parting_cycle_time_ms", i);
    expect(e.sampleCount("parting_cycle_time_ms")).toBe(100);
    // The window should contain the MOST RECENT 100 samples — values 50..149
    const v = e.evaluate("parting_cycle_time_ms");
    // p95 of 50..149 → rank = 95 → sorted[94] = 50 + 94 = 144
    expect(v.measured).toBe(144);
  });

  it("recordSample rejects NaN, negative, and Infinity", () => {
    const e = fresh();
    expect(() => e.recordSample("parting_cycle_time_ms", NaN)).toThrow(/Invalid sample/);
    expect(() => e.recordSample("parting_cycle_time_ms", -5)).toThrow(/Invalid sample/);
    expect(() => e.recordSample("parting_cycle_time_ms", Infinity)).toThrow(/Invalid sample/);
  });

  it("recordSample on unknown metric throws", () => {
    const e = fresh();
    expect(() => e.recordSample("not_a_metric" as LatheSLOMetric, 100)).toThrow(
      /No target configured/,
    );
  });

  it("setTarget validates percentile", () => {
    const e = fresh();
    const invalid: SLOTarget = {
      metric: "tool_change_ms",
      percentile: 75 as 95,
      threshold: 1000,
      unit: "ms",
      window_size: 100,
      min_samples: 10,
      description: "",
      remediation: "",
    };
    expect(() => e.setTarget(invalid)).toThrow(/Invalid percentile/);
  });

  it("setTarget rejects min_samples > window_size", () => {
    const e = fresh();
    const bad: SLOTarget = {
      metric: "tool_change_ms",
      percentile: 95,
      threshold: 1000,
      unit: "ms",
      window_size: 10,
      min_samples: 20,
      description: "",
      remediation: "",
    };
    expect(() => e.setTarget(bad)).toThrow(/cannot exceed window_size/);
  });

  it("setTarget replaces an existing target without dropping samples", () => {
    const e = fresh();
    for (let i = 0; i < 30; i++) e.recordSample("tool_change_ms", 5000);
    const replacement: SLOTarget = {
      metric: "tool_change_ms",
      percentile: 99,
      threshold: 10000,
      unit: "ms",
      window_size: 200,
      min_samples: 10,
      description: "replaced",
      remediation: "replaced",
    };
    e.setTarget(replacement);
    expect(e.getTarget("tool_change_ms")?.threshold).toBe(10000);
    expect(e.sampleCount("tool_change_ms")).toBe(30);
  });

  it("dashboard aggregates counts by status", () => {
    const e = fresh();
    // tool_change_ms threshold 6000 — inject breach
    for (let i = 0; i < 30; i++) e.recordSample("tool_change_ms", 7000);
    // parting_cycle_time_ms threshold 8000 — inject ok
    for (let i = 0; i < 20; i++) e.recordSample("parting_cycle_time_ms", 3000);
    const d = e.dashboard();
    expect(d.total_metrics).toBe(DEFAULT_LATHE_SLO_TARGETS.length);
    expect(d.breaching).toBeGreaterThan(0);
    expect(d.healthy).toBeGreaterThan(0);
    expect(d.insufficient_data).toBeGreaterThan(0);
    // every verdict accounted for
    expect(
      d.breaching + d.warning + d.healthy + d.insufficient_data,
    ).toBe(d.total_metrics);
  });

  it("dashboard generated_at is ISO-8601", () => {
    const d = fresh().dashboard();
    expect(() => new Date(d.generated_at).toISOString()).not.toThrow();
  });

  it("error_budget_pct negative when measured > threshold", () => {
    const e = fresh();
    for (let i = 0; i < 20; i++) e.recordSample("parting_cycle_time_ms", 12000);
    const v = e.evaluate("parting_cycle_time_ms");
    expect(v.error_budget_pct).toBeLessThan(0);
  });

  it("error_budget_pct positive when measured < threshold", () => {
    const e = fresh();
    for (let i = 0; i < 20; i++) e.recordSample("parting_cycle_time_ms", 2000);
    const v = e.evaluate("parting_cycle_time_ms");
    expect(v.error_budget_pct).toBeGreaterThan(0);
  });

  it("clearSamples(metric) clears only that metric", () => {
    const e = fresh();
    for (let i = 0; i < 20; i++) e.recordSample("parting_cycle_time_ms", 2000);
    for (let i = 0; i < 20; i++) e.recordSample("tool_change_ms", 4000);
    e.clearSamples("parting_cycle_time_ms");
    expect(e.sampleCount("parting_cycle_time_ms")).toBe(0);
    expect(e.sampleCount("tool_change_ms")).toBe(20);
  });

  it("clearSamples() without arg clears every metric", () => {
    const e = fresh();
    for (let i = 0; i < 20; i++) e.recordSample("parting_cycle_time_ms", 2000);
    for (let i = 0; i < 20; i++) e.recordSample("tool_change_ms", 4000);
    e.clearSamples();
    expect(e.sampleCount("parting_cycle_time_ms")).toBe(0);
    expect(e.sampleCount("tool_change_ms")).toBe(0);
  });

  it("constructor rejects duplicate seed targets", () => {
    const dup: SLOTarget = {
      metric: "tool_change_ms",
      percentile: 95,
      threshold: 6000,
      unit: "ms",
      window_size: 100,
      min_samples: 10,
      description: "",
      remediation: "",
    };
    expect(() => new LathePerformanceSLORegistryEngine([dup, dup])).toThrow(
      /Duplicate SLO target/,
    );
  });

  it("custom seed constructor replaces the defaults entirely", () => {
    const only: SLOTarget = {
      metric: "feed_override_latency_ms",
      percentile: 50,
      threshold: 100,
      unit: "ms",
      window_size: 10,
      min_samples: 1,
      description: "only",
      remediation: "n/a",
    };
    const e = new LathePerformanceSLORegistryEngine([only]);
    expect(e.targets()).toHaveLength(1);
    expect(e.getTarget("feed_override_latency_ms")?.threshold).toBe(100);
    expect(e.getTarget("parting_cycle_time_ms")).toBeUndefined();
  });

  it("measured is rounded to 2 decimal places", () => {
    const e = fresh();
    // Inject float samples that would yield a non-round percentile
    const vals = [1000.1234, 2000.5678, 3000.9012];
    for (let i = 0; i < 20; i++) e.recordSample("parting_cycle_time_ms", vals[i % 3]);
    const v = e.evaluate("parting_cycle_time_ms");
    if (v.measured !== null) {
      const rounded = Math.round(v.measured * 100) / 100;
      expect(v.measured).toBe(rounded);
    }
  });
});
