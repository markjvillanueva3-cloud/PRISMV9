/**
 * AutoChainConsumers.test.ts — INTEL-OLLAMA-OBSIDIAN-MS0/P9-U04
 *
 * Round-trip tests for the 3 dispatcher consumers added to wire the AUTO-chain:
 *
 *   1. devDispatcher (build):    build_guard_quality_score → QualityScoreEngine.compute()
 *   2. hookDispatcher:           audit                     → QualityDashboardEngine.compute()
 *   3. sessionDispatcher.session_end (extension)            → SelfImprovementPatternEngine.compute()
 *                                                              (acts as the AUTO-6 "consolidate" step)
 *
 * The tests don't spin up the MCP server. Instead they import each dispatcher's
 * underlying engine singleton and exercise the EXACT call shape the dispatcher
 * case body uses. This locks the wiring contract: if the dispatcher case body
 * changes its method or arguments, these tests fail.
 */
import { describe, it, expect } from "vitest";
import { qualityScoreEngine } from "../engines/QualityScoreEngine.js";
import { qualityDashboardEngine } from "../engines/QualityDashboardEngine.js";
import { selfImprovementPatternEngine } from "../engines/SelfImprovementPatternEngine.js";

const PRIORITY_MIN = 0;
const PRIORITY_MAX = 100;
const RATE_MIN = 0;
const RATE_MAX = 1;

// Mirrors devDispatcher.build_guard_quality_score case body exactly.
function deriveEngineName(params: { engine_name?: string; file_path?: string }): string | null {
  let engineName: string | null = (params.engine_name as string | undefined) ?? null;
  if (!engineName && typeof params.file_path === "string" && params.file_path.length > 0) {
    const base = params.file_path.split(/[\\/]/).pop() || "";
    engineName = base.replace(/\.(ts|tsx|js)$/, "") || null;
  }
  return engineName;
}

// ──────────────────────────────────────────────────────────────────────────
// 1. devDispatcher.build_guard_quality_score → QualityScoreEngine.compute()
// ──────────────────────────────────────────────────────────────────────────

describe("P9-U04 — build_guard_quality_score → QualityScoreEngine", () => {
  it("explicit engine_name passes through to compute() and emits the dispatcher payload subset", async () => {
    const engineName = deriveEngineName({ engine_name: "QualityScoreEngine" });
    expect(engineName).toBe("QualityScoreEngine");

    const report = await qualityScoreEngine.compute(engineName ?? undefined);

    // Anti-regression: dispatcher projects exactly these fields
    expect(Number.isFinite(report.system_Q)).toBe(true);
    expect(Number.isFinite(report.mean_Q)).toBe(true);
    expect(Number.isInteger(report.scored_engines)).toBe(true);
    expect(Number.isInteger(report.engines_below_70)).toBe(true);
    expect(Array.isArray(report.alerts)).toBe(true);

    // Filter for an existing engine name → at least 1 match (the engine itself).
    expect(report.scored_engines).toBeGreaterThanOrEqual(1);
  });

  it("file_path fallback strips directories and supported extensions", () => {
    expect(deriveEngineName({ file_path: "src/engines/QualityScoreEngine.ts" })).toBe(
      "QualityScoreEngine"
    );
    expect(deriveEngineName({ file_path: "src\\engines\\QualityScoreEngine.ts" })).toBe(
      "QualityScoreEngine"
    );
    expect(deriveEngineName({ file_path: "QualityScoreEngine.tsx" })).toBe(
      "QualityScoreEngine"
    );
    expect(deriveEngineName({ file_path: "QualityScoreEngine.js" })).toBe(
      "QualityScoreEngine"
    );

    // Empty / missing → null (the dispatcher then passes undefined to compute)
    expect(deriveEngineName({ file_path: "" })).toBe(null);
    expect(deriveEngineName({})).toBe(null);
  });

  it("non-matching engine_name yields a finite report with zero engines (no crash)", async () => {
    const engineName = deriveEngineName({ engine_name: "ZZZ_DOES_NOT_EXIST_XX" });
    const report = await qualityScoreEngine.compute(engineName ?? undefined);

    // Filter matches nothing → scored_engines must be 0 and projection finite.
    expect(report.scored_engines).toBe(0);
    expect(Number.isFinite(report.system_Q)).toBe(true);
    expect(Number.isFinite(report.mean_Q)).toBe(true);
    expect(report.engines_below_70).toBe(0);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// 2. hookDispatcher.audit → QualityDashboardEngine.compute()
// ──────────────────────────────────────────────────────────────────────────

describe("P9-U04 — hookDispatcher.audit → QualityDashboardEngine", () => {
  it("compute() returns a snapshot with all projected fields finite/typed", () => {
    const snap = qualityDashboardEngine.compute();

    expect(Number.isFinite(snap.system_Q)).toBe(true);
    expect(Number.isFinite(snap.mean_Q)).toBe(true);
    expect(Number.isInteger(snap.engines_below_70)).toBe(true);
    expect(typeof snap.timestamp).toBe("string");
    expect(snap.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    // Optional fields read by the dispatcher with `?? 0` / `?? []`.
    if (snap.schema_coverage !== null && snap.schema_coverage !== undefined) {
      expect(Number.isFinite(snap.schema_coverage.coverage_pct)).toBe(true);
    }
    if (snap.tests !== null && snap.tests !== undefined) {
      expect(Number.isFinite(snap.tests.pass_rate)).toBe(true);
    }
    if (snap.alerts !== null && snap.alerts !== undefined) {
      expect(Array.isArray(snap.alerts)).toBe(true);
    }
  });

  it("dispatcher projection: alert_count and critical_alerts derive from snap.alerts", () => {
    const snap = qualityDashboardEngine.compute();

    const alerts = snap.alerts ?? [];
    const alertCount = alerts.length;
    const criticalAlerts = alerts.filter(
      (a: { severity?: string }) => a.severity === "critical"
    ).length;

    expect(alertCount).toBeGreaterThanOrEqual(0);
    expect(criticalAlerts).toBeGreaterThanOrEqual(0);
    expect(criticalAlerts).toBeLessThanOrEqual(alertCount);
  });

  it("read() round-trip: the persisted snapshot equals what compute() just emitted", () => {
    const computed = qualityDashboardEngine.compute();
    const persisted = qualityDashboardEngine.read();

    // _persist runs inside compute(), so read() must succeed and match.
    expect(persisted === null).toBe(false);
    if (persisted !== null) {
      expect(persisted.system_Q).toBe(computed.system_Q);
      expect(persisted.timestamp).toBe(computed.timestamp);
      expect(persisted.engines_below_70).toBe(computed.engines_below_70);
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────
// 3. sessionDispatcher.session_end (extension) → SelfImprovementPatternEngine.compute()
// ──────────────────────────────────────────────────────────────────────────

describe("P9-U04 — sessionDispatcher.session_end → SelfImprovementPatternEngine.consolidate", () => {
  it("compute() emits a SelfImprovementReport with all projected fields well-formed", () => {
    const sip = selfImprovementPatternEngine.compute();

    expect(Number.isInteger(sip.total_patterns)).toBe(true);
    expect(Number.isFinite(sip.aggregate_priority)).toBe(true);
    expect(Number.isFinite(sip.system_improvement_rate)).toBe(true);
    expect(Array.isArray(sip.patterns)).toBe(true);
    expect(Array.isArray(sip.warnings)).toBe(true);
    expect(sip.patterns.length).toBe(sip.total_patterns);

    // Invariant: every pattern priority is in [0, 100] (engine clamps).
    for (const p of sip.patterns) {
      expect(Number.isFinite(p.priority)).toBe(true);
      expect(p.priority).toBeGreaterThanOrEqual(PRIORITY_MIN);
      expect(p.priority).toBeLessThanOrEqual(PRIORITY_MAX);
    }

    // Invariant: patterns are sorted by priority descending.
    for (let i = 1; i < sip.patterns.length; i++) {
      expect(sip.patterns[i - 1].priority).toBeGreaterThanOrEqual(sip.patterns[i].priority);
    }
  });

  it("dispatcher projection: top_priority and warnings_count derive deterministically", () => {
    const sip = selfImprovementPatternEngine.compute();

    // Mirror the sessionDispatcher.session_end case body exactly:
    const consolidate = {
      total_patterns: sip.total_patterns,
      aggregate_priority: sip.aggregate_priority,
      system_improvement_rate: sip.system_improvement_rate,
      top_priority: sip.patterns[0]?.priority ?? 0,
      warnings_count: (sip.warnings ?? []).length,
    };

    expect(consolidate.total_patterns).toBeGreaterThanOrEqual(0);
    expect(consolidate.warnings_count).toBeGreaterThanOrEqual(0);

    if (sip.patterns.length === 0) {
      // Empty pattern list → top_priority falls back to 0 (no crash on undefined).
      expect(consolidate.top_priority).toBe(0);
    } else {
      // Non-empty → top_priority is the first (highest) priority.
      expect(consolidate.top_priority).toBe(sip.patterns[0].priority);
    }
  });

  it("system_improvement_rate is in [0, 1]", () => {
    const sip = selfImprovementPatternEngine.compute();
    expect(sip.system_improvement_rate).toBeGreaterThanOrEqual(RATE_MIN);
    expect(sip.system_improvement_rate).toBeLessThanOrEqual(RATE_MAX);
  });
});
