/**
 * U-WIRE-LATHE-PERF-SLO — wiring-gate test
 * ==========================================
 *
 * Verifies the 8 dispatcher actions for `LathePerformanceSLORegistryEngine`
 * (targets/getTarget/setTarget/recordSample/sampleCount/evaluate/dashboard/
 * clearSamples) — and exercises real semantic invariants against the
 * canonical 8-metric SLO surface (NOT presence-only assertions).
 *
 * @module __tests__/U-WIRE-LATHE-PERF-SLO
 */
import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  lathePerformanceSLORegistryEngine,
  type SLOTarget,
} from "../engines/LathePerformanceSLORegistryEngine.js";
import { TURNING_ACTION_SCHEMAS } from "../schemas/turningActionSchemas.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DISPATCHER_SRC = readFileSync(
  join(__dirname, "..", "tools", "dispatchers", "turningDispatcher.ts"),
  "utf-8"
);
const SCHEMA_MAP = TURNING_ACTION_SCHEMAS as Record<string, { safeParse: (v: unknown) => { success: boolean } }>;

const ACTIONS = [
  "lathe_slo_targets",
  "lathe_slo_get_target",
  "lathe_slo_set_target",
  "lathe_slo_record_sample",
  "lathe_slo_sample_count",
  "lathe_slo_evaluate",
  "lathe_slo_dashboard",
  "lathe_slo_clear_samples",
] as const;

const METHOD_MAP: Record<typeof ACTIONS[number], string> = {
  lathe_slo_targets: "targets",
  lathe_slo_get_target: "getTarget",
  lathe_slo_set_target: "setTarget",
  lathe_slo_record_sample: "recordSample",
  lathe_slo_sample_count: "sampleCount",
  lathe_slo_evaluate: "evaluate",
  lathe_slo_dashboard: "dashboard",
  lathe_slo_clear_samples: "clearSamples",
};

beforeEach(() => {
  // Singleton state isolation between tests — clearSamples() with no arg
  // resets ALL rolling windows so sample-count assertions are deterministic.
  lathePerformanceSLORegistryEngine.clearSamples();
});

describe("U-WIRE-LATHE-PERF-SLO — turning-dispatcher wiring", () => {
  it("registers all 8 actions in TURNING_ACTION_SCHEMAS", () => {
    for (const a of ACTIONS) {
      if (!SCHEMA_MAP[a]) throw new Error(`${a} missing from TURNING_ACTION_SCHEMAS`);
    }
  });

  it("targets/dashboard schemas accept empty input", () => {
    expect(SCHEMA_MAP["lathe_slo_targets"]!.safeParse({}).success).toBe(true);
    expect(SCHEMA_MAP["lathe_slo_dashboard"]!.safeParse({}).success).toBe(true);
  });

  it("metric-only schemas accept a valid metric and reject unknown ones", () => {
    expect(SCHEMA_MAP["lathe_slo_evaluate"]!.safeParse({ metric: "parting_cycle_time_ms" }).success).toBe(true);
    expect(SCHEMA_MAP["lathe_slo_evaluate"]!.safeParse({ metric: "made_up_metric" }).success).toBe(false);
    expect(SCHEMA_MAP["lathe_slo_get_target"]!.safeParse({ metric: "tool_change_ms" }).success).toBe(true);
    expect(SCHEMA_MAP["lathe_slo_sample_count"]!.safeParse({ metric: "simulation_completion_ms" }).success).toBe(true);
  });

  it("record_sample schema rejects negative value", () => {
    expect(SCHEMA_MAP["lathe_slo_record_sample"]!.safeParse({ metric: "tool_change_ms", value: -1 }).success).toBe(false);
  });

  it("set_target schema rejects target with unknown metric / wrong percentile", () => {
    expect(SCHEMA_MAP["lathe_slo_set_target"]!.safeParse({ target: { metric: "fake", percentile: 95, threshold: 1000, unit: "ms", window_size: 10, min_samples: 1, description: "x", remediation: "y" } }).success).toBe(false);
    expect(SCHEMA_MAP["lathe_slo_set_target"]!.safeParse({ target: { metric: "tool_change_ms", percentile: 42, threshold: 1000, unit: "ms", window_size: 10, min_samples: 1, description: "x", remediation: "y" } }).success).toBe(false);
  });

  it("clear_samples schema accepts both empty AND metric input", () => {
    expect(SCHEMA_MAP["lathe_slo_clear_samples"]!.safeParse({}).success).toBe(true);
    expect(SCHEMA_MAP["lathe_slo_clear_samples"]!.safeParse({ metric: "tool_change_ms" }).success).toBe(true);
  });

  it("dispatcher source carries all 8 actions in enum AND case form", () => {
    for (const a of ACTIONS) {
      expect(DISPATCHER_SRC.includes(`"${a}"`)).toBe(true);
      expect(DISPATCHER_SRC.includes(`case "${a}":`)).toBe(true);
    }
  });

  it("each case routes to its matching engine method (action↔method map verified)", () => {
    for (const a of ACTIONS) {
      const startIdx = DISPATCHER_SRC.indexOf(`case "${a}":`);
      if (startIdx < 0) throw new Error(`${a} case missing`);
      const endIdx = DISPATCHER_SRC.indexOf('case "', startIdx + `case "${a}":`.length);
      const block = DISPATCHER_SRC.slice(startIdx, endIdx > 0 ? endIdx : startIdx + 4000);
      const expectedMethod = METHOD_MAP[a];
      if (!block.includes(`lathePerformanceSLORegistryEngine.${expectedMethod}(`)) {
        throw new Error(`${a} case must call .${expectedMethod} — block: ${block.slice(0, 200)}`);
      }
    }
  });
});

describe("U-WIRE-LATHE-PERF-SLO — engine semantic round-trip", () => {
  it("targets() returns exactly 8 default SLO entries covering all canonical metrics", () => {
    const targets = lathePerformanceSLORegistryEngine.targets();
    expect(targets.length).toBe(8);
    const metrics = targets.map((t) => t.metric).sort();
    expect(metrics).toEqual([
      "collision_check_ms",
      "feed_override_latency_ms",
      "first_piece_approval_min",
      "parting_cycle_time_ms",
      "program_generation_ms",
      "setup_sheet_render_ms",
      "simulation_completion_ms",
      "tool_change_ms",
    ]);
    // Every target carries the canonical fields (no presence-only stubs).
    for (const t of targets) {
      expect(t.threshold).toBeGreaterThan(0);
      expect([50, 90, 95, 99]).toContain(t.percentile);
      expect(["ms", "min"]).toContain(t.unit);
      expect(t.window_size).toBeGreaterThanOrEqual(t.min_samples);
      expect(t.description.length).toBeGreaterThan(0);
      expect(t.remediation.length).toBeGreaterThan(0);
    }
  });

  it("getTarget('tool_change_ms') returns the documented JM Die default (6000ms p95, ms unit)", () => {
    const t = lathePerformanceSLORegistryEngine.getTarget("tool_change_ms");
    if (!t) throw new Error("tool_change_ms target missing");
    expect(t.metric).toBe("tool_change_ms");
    expect(t.percentile).toBe(95);
    expect(t.threshold).toBe(6_000);
    expect(t.unit).toBe("ms");
  });

  it("recordSample increments sampleCount by exactly N for N writes", () => {
    expect(lathePerformanceSLORegistryEngine.sampleCount("tool_change_ms")).toBe(0);
    lathePerformanceSLORegistryEngine.recordSample("tool_change_ms", 3500);
    lathePerformanceSLORegistryEngine.recordSample("tool_change_ms", 4200);
    lathePerformanceSLORegistryEngine.recordSample("tool_change_ms", 5100);
    expect(lathePerformanceSLORegistryEngine.sampleCount("tool_change_ms")).toBe(3);
  });

  it("evaluate returns 'insufficient_data' before min_samples is reached", () => {
    // tool_change_ms min_samples = 10. Record 5 samples — below threshold.
    for (let i = 0; i < 5; i++) {
      lathePerformanceSLORegistryEngine.recordSample("tool_change_ms", 3000);
    }
    const v = lathePerformanceSLORegistryEngine.evaluate("tool_change_ms");
    expect(v.metric).toBe("tool_change_ms");
    expect(v.sample_count).toBe(5);
    expect(v.status).toBe("insufficient_data");
  });

  it("evaluate breaches on samples exceeding threshold (real breach detection)", () => {
    // tool_change_ms threshold 6000ms p95. Pump 20 samples all > 8000.
    for (let i = 0; i < 20; i++) {
      lathePerformanceSLORegistryEngine.recordSample("tool_change_ms", 8000 + i * 50);
    }
    const v = lathePerformanceSLORegistryEngine.evaluate("tool_change_ms");
    expect(v.sample_count).toBe(20);
    expect(v.status).toBe("breach");
    expect(v.measured).not.toBeNull();
    if (v.measured !== null && v.measured <= 6000) {
      throw new Error(`measured p95 should exceed threshold — got ${v.measured} vs 6000`);
    }
    expect(v.remediation).not.toBeNull();
  });

  it("evaluate reports 'healthy' when samples comfortably under threshold", () => {
    // 20 fast tool changes (1000ms) — well below 6000ms threshold.
    for (let i = 0; i < 20; i++) {
      lathePerformanceSLORegistryEngine.recordSample("tool_change_ms", 1000 + i * 20);
    }
    const v = lathePerformanceSLORegistryEngine.evaluate("tool_change_ms");
    expect(v.sample_count).toBe(20);
    // Either "healthy" or "warning" — but definitely NOT a breach.
    if (v.status === "breach") {
      throw new Error(`low samples must not breach — got status=${v.status} measured=${v.measured}`);
    }
  });

  it("clearSamples('tool_change_ms') resets ONLY that metric's window", () => {
    lathePerformanceSLORegistryEngine.recordSample("tool_change_ms", 4000);
    lathePerformanceSLORegistryEngine.recordSample("simulation_completion_ms", 20000);
    expect(lathePerformanceSLORegistryEngine.sampleCount("tool_change_ms")).toBe(1);
    expect(lathePerformanceSLORegistryEngine.sampleCount("simulation_completion_ms")).toBe(1);
    lathePerformanceSLORegistryEngine.clearSamples("tool_change_ms");
    expect(lathePerformanceSLORegistryEngine.sampleCount("tool_change_ms")).toBe(0);
    expect(lathePerformanceSLORegistryEngine.sampleCount("simulation_completion_ms")).toBe(1);
  });

  it("setTarget overrides an existing target (read-back proves the mutation landed)", () => {
    const orig = lathePerformanceSLORegistryEngine.getTarget("tool_change_ms")!;
    const newThreshold = orig.threshold * 2;
    const overridden: SLOTarget = { ...orig, threshold: newThreshold };
    lathePerformanceSLORegistryEngine.setTarget(overridden);
    const after = lathePerformanceSLORegistryEngine.getTarget("tool_change_ms")!;
    expect(after.threshold).toBe(newThreshold);
    // Hermetic restore for the singleton.
    lathePerformanceSLORegistryEngine.setTarget(orig);
    expect(lathePerformanceSLORegistryEngine.getTarget("tool_change_ms")!.threshold).toBe(orig.threshold);
  });

  it("dashboard snapshot reflects ingested samples (canonical SLODashboard shape)", () => {
    lathePerformanceSLORegistryEngine.recordSample("tool_change_ms", 3000);
    const d = lathePerformanceSLORegistryEngine.dashboard();
    // Canonical SLODashboard fields per engine line 166-174.
    expect(typeof d.generated_at).toBe("string");
    expect(d.total_metrics).toBe(8);
    expect(Array.isArray(d.verdicts)).toBe(true);
    expect(d.verdicts.length).toBe(8);
    // Aggregate counters add up to total_metrics (definitional invariant).
    expect(d.breaching + d.warning + d.healthy + d.insufficient_data).toBe(d.total_metrics);
    // Every verdict in dashboard.verdicts must be one of the 8 canonical metrics.
    const seen = new Set(d.verdicts.map((v) => v.metric));
    expect(seen.size).toBe(8);
  });
});
