/**
 * Tests for SKILL-ORCH-MS0 / U-SPA16 benchmark gate.
 *
 * These are unit tests of the pure analyzer functions plus one integration
 * test that reads the persisted benchmark report (SKILL_ORCH_BENCHMARK.json)
 * and asserts every gate passes. The persisted report is treated as the
 * authoritative regression fixture: CI re-runs the benchmark script before
 * the test suite via `npm run build`, and this test locks in the invariants.
 *
 * Coverage:
 *   - analyzeInvocationReduction: pass/fail thresholds, edge cases
 *   - analyzeHardBlockPreservation: count gate, floor of 12, missing-delta report
 *   - analyzeAwarenessScore: direct preserve, wrapper preserve, missing list
 *   - Persisted SKILL_ORCH_BENCHMARK.json: verdict PASS, every gate passed
 */

import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import * as path from "node:path";
import {
  analyzeAwarenessScore,
  analyzeHardBlockPreservation,
  analyzeInvocationReduction,
  type BenchmarkReport,
} from "../../scripts/skill-orch-benchmark.js";

// ── analyzeInvocationReduction ───────────────────────────────────────────────

describe("analyzeInvocationReduction", () => {
  it("passes when reduction ≥ 30%", () => {
    const r = analyzeInvocationReduction({
      baselineSessionStart: 66,
      currentSessionStart: 39,
    });
    expect(r.reduction_pct).toBeCloseTo(40.9, 1);
    expect(r.passed).toBe(true);
  });

  it("passes at the 30% boundary", () => {
    const r = analyzeInvocationReduction({
      baselineSessionStart: 100,
      currentSessionStart: 70,
    });
    expect(r.reduction_pct).toBe(30);
    expect(r.passed).toBe(true);
  });

  it("fails just under 30%", () => {
    const r = analyzeInvocationReduction({
      baselineSessionStart: 100,
      currentSessionStart: 71,
    });
    expect(r.reduction_pct).toBe(29);
    expect(r.passed).toBe(false);
  });

  it("reports 0% when baseline is 0", () => {
    const r = analyzeInvocationReduction({
      baselineSessionStart: 0,
      currentSessionStart: 0,
    });
    expect(r.reduction_pct).toBe(0);
    expect(r.passed).toBe(false);
  });

  it("reports negative reduction when invocations grew", () => {
    const r = analyzeInvocationReduction({
      baselineSessionStart: 10,
      currentSessionStart: 15,
    });
    expect(r.reduction_pct).toBe(-50);
    expect(r.passed).toBe(false);
  });
});

// ── analyzeHardBlockPreservation ─────────────────────────────────────────────

describe("analyzeHardBlockPreservation", () => {
  it("passes when current ≥ baseline and baseline ≥ 12", () => {
    const r = analyzeHardBlockPreservation(29, {
      total_count: 29,
      unique_scripts: new Set(["a.mjs", "b.mjs"]),
    });
    expect(r.passed).toBe(true);
    expect(r.missing_matchers).toEqual([]);
  });

  it("fails when current < baseline", () => {
    const r = analyzeHardBlockPreservation(29, {
      total_count: 28,
      unique_scripts: new Set(),
    });
    expect(r.passed).toBe(false);
    expect(r.missing_matchers).toEqual(["count_delta:1_fewer_hard_blocks"]);
  });

  it("passes when current strictly exceeds baseline (new hard-block added)", () => {
    const r = analyzeHardBlockPreservation(29, {
      total_count: 31,
      unique_scripts: new Set(),
    });
    expect(r.passed).toBe(true);
  });

  it("enforces the ≥12 minimum even if baseline was lower", () => {
    const r = analyzeHardBlockPreservation(10, {
      total_count: 11,
      unique_scripts: new Set(),
    });
    expect(r.passed).toBe(false);
  });
});

// ── analyzeAwarenessScore ────────────────────────────────────────────────────

describe("analyzeAwarenessScore", () => {
  it("scores 1.0 when every baseline script is directly preserved", () => {
    const r = analyzeAwarenessScore({
      baselineScripts: ["a.mjs", "b.mjs"],
      currentDirect: new Set(["a.mjs", "b.mjs"]),
      consolidation: new Map(),
    });
    expect(r.preserved_directly).toBe(2);
    expect(r.preserved_via_wrapper).toBe(0);
    expect(r.score).toBe(1);
    expect(r.passed).toBe(true);
    expect(r.missing).toEqual([]);
  });

  it("credits wrapper preservation via consolidation map", () => {
    const r = analyzeAwarenessScore({
      baselineScripts: ["a.mjs", "b.mjs"],
      currentDirect: new Set(["unified-x.mjs"]),
      consolidation: new Map([["unified-x.mjs", ["a.mjs", "b.mjs"]]]),
    });
    expect(r.preserved_directly).toBe(0);
    expect(r.preserved_via_wrapper).toBe(2);
    expect(r.score).toBe(1);
    expect(r.passed).toBe(true);
  });

  it("mixes direct and wrapper preservation", () => {
    const r = analyzeAwarenessScore({
      baselineScripts: ["a.mjs", "b.mjs", "c.mjs"],
      currentDirect: new Set(["a.mjs", "unified-y.mjs"]),
      consolidation: new Map([["unified-y.mjs", ["b.mjs", "c.mjs"]]]),
    });
    expect(r.preserved_directly).toBe(1);
    expect(r.preserved_via_wrapper).toBe(2);
    expect(r.score).toBe(1);
  });

  it("flags scripts with no coverage as missing", () => {
    const r = analyzeAwarenessScore({
      baselineScripts: ["a.mjs", "b.mjs", "c.mjs"],
      currentDirect: new Set(["a.mjs"]),
      consolidation: new Map(),
    });
    expect(r.missing).toEqual(["b.mjs", "c.mjs"]);
    expect(r.score).toBeCloseTo(0.333, 2);
    expect(r.passed).toBe(false);
  });

  it("does NOT credit a wrapper that is itself not installed", () => {
    const r = analyzeAwarenessScore({
      baselineScripts: ["a.mjs"],
      currentDirect: new Set([]), // wrapper not in current settings.json
      consolidation: new Map([["unified-x.mjs", ["a.mjs"]]]),
    });
    expect(r.missing).toEqual(["a.mjs"]);
    expect(r.passed).toBe(false);
  });

  it("passes at exactly 0.80", () => {
    const baseline = ["1", "2", "3", "4", "5"].map((n) => `s${n}.mjs`);
    const r = analyzeAwarenessScore({
      baselineScripts: baseline,
      currentDirect: new Set(baseline.slice(0, 4)),
      consolidation: new Map(),
    });
    expect(r.score).toBeCloseTo(0.8, 3);
    expect(r.passed).toBe(true);
  });

  it("fails just under 0.80", () => {
    const baseline = Array.from({ length: 10 }, (_, i) => `s${i}.mjs`);
    const r = analyzeAwarenessScore({
      baselineScripts: baseline,
      currentDirect: new Set(baseline.slice(0, 7)),
      consolidation: new Map(),
    });
    expect(r.score).toBe(0.7);
    expect(r.passed).toBe(false);
  });
});

// ── Persisted benchmark report (regression lock-in) ──────────────────────────

const BENCHMARK_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "mcp-server",
  "data",
  "state",
  "SKILL_ORCH_BENCHMARK.json",
);

describe("SKILL_ORCH_BENCHMARK.json regression lock", () => {
  it("exists — the benchmark script must run before the test suite", () => {
    expect(existsSync(BENCHMARK_PATH)).toBe(true);
  });

  const shouldRun = existsSync(BENCHMARK_PATH);
  (shouldRun ? it : it.skip)(
    "verdict is PASS and every exit-condition gate passed",
    () => {
      const report = JSON.parse(
        readFileSync(BENCHMARK_PATH, "utf8"),
      ) as BenchmarkReport;
      expect(report.source).toContain("U-SPA16");
      expect(report.verdict).toBe("PASS");
      // Timing may have been run in quick mode (p50_ms=0) during build —
      // treat either "real timing passed" or "quick-mode skipped" as OK,
      // but forbid a real failed timing from being papered over.
      if (report.timing.p50_ms > 0) {
        expect(report.timing.p50_ms).toBeLessThanOrEqual(
          report.timing.target_p50_ms,
        );
      }
      expect(report.invocation_reduction.reduction_pct).toBeGreaterThanOrEqual(
        report.invocation_reduction.target_pct,
      );
      expect(
        report.hard_block_preservation.current_hard_block_count,
      ).toBeGreaterThanOrEqual(
        report.hard_block_preservation.baseline_hard_block_count,
      );
      expect(report.awareness_score.score).toBeGreaterThanOrEqual(
        report.awareness_score.target,
      );
      for (const gate of report.gates) {
        expect(
          gate.passed,
          `gate '${gate.name}' observed=${gate.observed} target=${gate.target}`,
        ).toBe(true);
      }
    },
  );
});
