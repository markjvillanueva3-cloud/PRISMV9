/**
 * CAMInHostRegressionDetectorEngine.test.ts — U-CAMTEST17
 * ========================================================
 *
 * Coverage:
 *   - happy path: identical baseline + current → 0 findings
 *   - 5 regression types fire under the right conditions
 *   - severity mapping (info / warning / critical) follows threshold table
 *   - new_failing_family is always critical
 *   - golden baseline file IO (load / save / hasGolden / promoteToGolden)
 *   - real-fs detectAgainstGolden round trip
 *   - filter helpers
 *   - audit invariant
 *   - dispatcher round-trip
 */

import { describe, it, expect, afterAll } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  CAMInHostRegressionDetectorEngine,
  RegressionReportSchema,
  RegressionFindingSchema,
  RegressionSeveritySchema,
  RegressionTypeSchema,
  GoldenBaselineFileSchema,
  WARNING_THRESHOLD_PCT,
  CRITICAL_THRESHOLD_PCT,
  SCHEMA_VERSION,
  DEFAULT_GOLDEN_PATH,
  type RegressionReport,
  type RegressionFinding,
  type RegressionType,
} from "../engines/CAMInHostRegressionDetectorEngine.js";
import type { NightlyRunReport } from "../engines/CAMInHostNightlyOrchestratorEngine.js";

// ── Test fixtures ────────────────────────────────────────────────────────────

function buildReport(overrides: {
  run_id?: string;
  total?: number;
  passed?: number;
  failed?: number;
  by_host?: Partial<Record<string, { total: number; passed: number; failed: number }>>;
  by_category?: Partial<Record<string, { total: number; passed: number; failed: number }>>;
  by_assertion?: Partial<Record<string, { total: number; passed: number; failed: number }>>;
} = {}): NightlyRunReport {
  const total = overrides.total ?? 100;
  const passed = overrides.passed ?? total;
  const failed = overrides.failed ?? (total - passed);
  const baseHost = { total: 25, passed: 25, failed: 0 };
  const baseCat = { total: 14, passed: 14, failed: 0 };
  const baseAssert = { total: 100, passed: 100, failed: 0 };

  const by_host = {
    fusion360:    { ...baseHost, ...(overrides.by_host?.fusion360 ?? {}) },
    hypermill:    { ...baseHost, ...(overrides.by_host?.hypermill ?? {}) },
    inventor_hsm: { ...baseHost, ...(overrides.by_host?.inventor_hsm ?? {}) },
    mastercam:    { ...baseHost, ...(overrides.by_host?.mastercam ?? {}) },
  };

  const by_category = {
    pocket_2d:  { ...baseCat, ...(overrides.by_category?.pocket_2d ?? {}) },
    contour_2d: { ...baseCat, ...(overrides.by_category?.contour_2d ?? {}) },
    drilling:   { ...baseCat, ...(overrides.by_category?.drilling ?? {}) },
    threading:  { ...baseCat, ...(overrides.by_category?.threading ?? {}) },
    surface_3d: { ...baseCat, ...(overrides.by_category?.surface_3d ?? {}) },
    multi_axis: { ...baseCat, ...(overrides.by_category?.multi_axis ?? {}) },
    turning:    { ...baseCat, ...(overrides.by_category?.turning ?? {}) },
  };

  const by_assertion = {
    frame_arrival:           { ...baseAssert, ...(overrides.by_assertion?.frame_arrival ?? {}) },
    latency_p99:             { ...baseAssert, ...(overrides.by_assertion?.latency_p99 ?? {}) },
    band_transitions:        { ...baseAssert, ...(overrides.by_assertion?.band_transitions ?? {}) },
    hard_stop_trigger:       { ...baseAssert, ...(overrides.by_assertion?.hard_stop_trigger ?? {}) },
    session_stats_reconcile: { ...baseAssert, ...(overrides.by_assertion?.session_stats_reconcile ?? {}) },
    encoder_schema:          { ...baseAssert, ...(overrides.by_assertion?.encoder_schema ?? {}) },
    reconnect_drain:         { ...baseAssert, ...(overrides.by_assertion?.reconnect_drain ?? {}) },
  };

  return {
    schemaVersion: "1.0.0",
    descriptor: {
      run_id: overrides.run_id ?? "nightly_test",
      started_at_ms: 1_000_000,
      generator_config: { stress_profile: "calm", expected_frame_count: 12, latency_p99_budget_ms: 100 },
      scenario_count: total,
      hosts: ["fusion360", "hypermill", "inventor_hsm", "mastercam"],
    },
    finished_at_ms: 1_000_500,
    duration_ms: 500,
    scenarios_dispatched_per_host: { fusion360: 25, hypermill: 25, inventor_hsm: 25, mastercam: 25 },
    summary: { total, passed, failed, by_host, by_category, by_assertion },
  };
}

/**
 * Find a finding of a specific type and dimension. Throws if missing so the
 * test fails clearly instead of silently asserting against undefined.
 */
function mustFind(report: RegressionReport, type: RegressionType, dimension?: string): RegressionFinding {
  const f = report.findings.find(x => x.type === type && (dimension === undefined || x.dimension === dimension));
  if (f === undefined) {
    throw new Error(`expected finding type=${type}${dimension ? ` dimension=${dimension}` : ""} but none found in ${report.findings.length} findings`);
  }
  return f;
}

function countByType(report: RegressionReport, type: RegressionType): number {
  return report.findings.filter(f => f.type === type).length;
}

// ── 1. Static surface ────────────────────────────────────────────────────────

describe("CAMInHostRegressionDetectorEngine — static surface", () => {
  it("exposes thresholds (5% warning, 10% critical)", () => {
    expect(WARNING_THRESHOLD_PCT).toBe(5);
    expect(CRITICAL_THRESHOLD_PCT).toBe(10);
    expect(CAMInHostRegressionDetectorEngine.WARNING_THRESHOLD_PCT).toBe(5);
    expect(CAMInHostRegressionDetectorEngine.CRITICAL_THRESHOLD_PCT).toBe(10);
  });

  it("exposes SCHEMA_VERSION 1.0.0 and default golden path", () => {
    expect(SCHEMA_VERSION).toBe("1.0.0");
    expect(DEFAULT_GOLDEN_PATH).toBe("data/state/CAM_INHOST_GOLDEN_BASELINE.json");
  });
});

// ── 2. Happy path ────────────────────────────────────────────────────────────

describe("CAMInHostRegressionDetectorEngine — happy path", () => {
  it("identical baseline and current produce 0 findings", () => {
    const r = buildReport({ run_id: "current" });
    const b = buildReport({ run_id: "baseline" });
    const report = CAMInHostRegressionDetectorEngine.detectRegressions(r, b);
    expect(report.total_findings).toBe(0);
    expect(report.findings.length).toBe(0);
    expect(report.has_critical).toBe(false);
    expect(report.by_severity).toEqual({ critical: 0, warning: 0, info: 0 });
  });

  it("RegressionReport has stable schema (parse round-trip)", () => {
    const r = buildReport({ run_id: "current" });
    const b = buildReport({ run_id: "baseline" });
    const report = CAMInHostRegressionDetectorEngine.detectRegressions(r, b);
    expect(() => RegressionReportSchema.parse(report)).not.toThrow();
    expect(report.current_run_id).toBe("current");
    expect(report.baseline_run_id).toBe("baseline");
  });
});

// ── 3. Per-type regression detection ────────────────────────────────────────

describe("CAMInHostRegressionDetectorEngine — per-type detection", () => {
  it("scenario_count regression fires when total differs (delta=10 → critical)", () => {
    const baseline = buildReport({ total: 100 });
    const current = buildReport({ total: 90 });
    const report = CAMInHostRegressionDetectorEngine.detectRegressions(current, baseline);
    expect(report.by_type.scenario_count).toBe(1);
    const f = mustFind(report, "scenario_count");
    expect(f.delta).toBe(-10);
    expect(f.severity).toBe("critical");
    expect(f.baseline_value).toBe(100);
    expect(f.current_value).toBe(90);
  });

  it("scenario_count delta = 5 → warning severity", () => {
    const baseline = buildReport({ total: 100 });
    const current = buildReport({ total: 95 });
    const report = CAMInHostRegressionDetectorEngine.detectRegressions(current, baseline);
    const f = mustFind(report, "scenario_count");
    expect(f.severity).toBe("warning");
    expect(f.delta).toBe(-5);
  });

  it("host_pass_rate regression fires when fusion360 pass% drops 12pt (→ critical)", () => {
    const baseline = buildReport();
    const current = buildReport({
      by_host: { fusion360: { total: 25, passed: 22, failed: 3 } }, // 88% → drop of 12
    });
    const report = CAMInHostRegressionDetectorEngine.detectRegressions(current, baseline);
    const f = mustFind(report, "host_pass_rate", "fusion360");
    expect(f.severity).toBe("critical");
    expect(f.baseline_value).toBe(100);
    expect(f.current_value).toBe(88);
    expect(f.delta).toBe(-12);
  });

  it("host_pass_rate drop = exactly WARNING_THRESHOLD = warning severity", () => {
    const baseline = buildReport();
    const current = buildReport({
      by_host: { fusion360: { total: 100, passed: 95, failed: 5 } },
    });
    const report = CAMInHostRegressionDetectorEngine.detectRegressions(current, baseline);
    const f = mustFind(report, "host_pass_rate", "fusion360");
    expect(f.severity).toBe("warning");
    expect(f.delta).toBe(-5);
  });

  it("host_pass_rate IMPROVEMENT does not register as regression", () => {
    const baseline = buildReport({
      by_host: { fusion360: { total: 25, passed: 20, failed: 5 } }, // 80%
    });
    const current = buildReport({
      by_host: { fusion360: { total: 25, passed: 25, failed: 0 } }, // 100% (improvement)
    });
    const report = CAMInHostRegressionDetectorEngine.detectRegressions(current, baseline);
    expect(countByType(report, "host_pass_rate")).toBe(0);
  });

  it("category_pass_rate regression fires when pocket_2d pass% drops ~29pt (→ critical)", () => {
    const baseline = buildReport();
    const current = buildReport({
      by_category: { pocket_2d: { total: 14, passed: 10, failed: 4 } }, // ~71%
    });
    const report = CAMInHostRegressionDetectorEngine.detectRegressions(current, baseline);
    const f = mustFind(report, "category_pass_rate", "pocket_2d");
    expect(f.severity).toBe("critical");
    expect(f.baseline_value).toBe(100);
    expect(f.current_value).toBeCloseTo(71.43, 1);
    expect(f.delta).toBeLessThan(-CRITICAL_THRESHOLD_PCT);
  });

  it("assertion_failure_rate regression fires when latency_p99 failure% rises 25pt (→ critical)", () => {
    const baseline = buildReport();
    const current = buildReport({
      by_assertion: { latency_p99: { total: 100, passed: 75, failed: 25 } },
    });
    const report = CAMInHostRegressionDetectorEngine.detectRegressions(current, baseline);
    const failRate = mustFind(report, "assertion_failure_rate", "latency_p99");
    expect(failRate.severity).toBe("critical");
    expect(failRate.delta).toBe(25);
    expect(failRate.baseline_value).toBe(0);
    expect(failRate.current_value).toBe(25);
  });

  it("new_failing_family is always critical (clean → any failure)", () => {
    const baseline = buildReport();
    const current = buildReport({
      by_assertion: { hard_stop_trigger: { total: 100, passed: 99, failed: 1 } },
    });
    const report = CAMInHostRegressionDetectorEngine.detectRegressions(current, baseline);
    const f = mustFind(report, "new_failing_family", "hard_stop_trigger");
    expect(f.severity).toBe("critical");
    expect(f.delta).toBe(1);
    expect(f.baseline_value).toBe(0);
    expect(f.current_value).toBe(1);
    expect(report.has_critical).toBe(true);
  });

  it("does NOT fire new_failing_family when baseline already had failures", () => {
    const baseline = buildReport({
      by_assertion: { hard_stop_trigger: { total: 100, passed: 99, failed: 1 } },
    });
    const current = buildReport({
      by_assertion: { hard_stop_trigger: { total: 100, passed: 95, failed: 5 } },
    });
    const report = CAMInHostRegressionDetectorEngine.detectRegressions(current, baseline);
    expect(countByType(report, "new_failing_family")).toBe(0);
  });
});

// ── 4. Severity mapping ─────────────────────────────────────────────────────

describe("CAMInHostRegressionDetectorEngine — severity mapping", () => {
  it("delta = 5% absolute → warning (boundary)", () => {
    const baseline = buildReport();
    const current = buildReport({
      by_host: { fusion360: { total: 100, passed: 95, failed: 5 } },
    });
    const report = CAMInHostRegressionDetectorEngine.detectRegressions(current, baseline);
    expect(report.findings.length).toBe(1);
    expect(report.findings[0].severity).toBe("warning");
    expect(report.findings[0].delta).toBe(-5);
  });

  it("delta = 10% absolute → critical (boundary)", () => {
    const baseline = buildReport();
    const current = buildReport({
      by_host: { fusion360: { total: 100, passed: 90, failed: 10 } },
    });
    const report = CAMInHostRegressionDetectorEngine.detectRegressions(current, baseline);
    expect(report.findings.length).toBe(1);
    expect(report.findings[0].severity).toBe("critical");
    expect(report.findings[0].delta).toBe(-10);
  });

  it("delta < 5% absolute → no finding (sub-threshold changes are filtered)", () => {
    const baseline = buildReport();
    const current = buildReport({
      by_host: { fusion360: { total: 100, passed: 97, failed: 3 } },
    });
    const report = CAMInHostRegressionDetectorEngine.detectRegressions(current, baseline);
    expect(countByType(report, "host_pass_rate")).toBe(0);
    expect(report.total_findings).toBe(0);
  });
});

// ── 5. Golden baseline file IO ─────────────────────────────────────────────

const TMP_FILES: string[] = [];
function tmpGoldenPath(): string {
  const p = path.join(os.tmpdir(), `cam-golden-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  TMP_FILES.push(p);
  return p;
}
afterAll(() => {
  for (const p of TMP_FILES) {
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
});

describe("CAMInHostRegressionDetectorEngine — golden baseline IO", () => {
  it("hasGolden returns false when path does not exist", () => {
    expect(CAMInHostRegressionDetectorEngine.hasGolden("/nope/missing.json")).toBe(false);
  });

  it("promoteToGolden writes a valid GoldenBaselineFile", () => {
    const baseline = buildReport({ run_id: "promoted" });
    const target = tmpGoldenPath();
    const r = CAMInHostRegressionDetectorEngine.promoteToGolden(baseline, target);
    expect(fs.existsSync(target)).toBe(true);
    expect(r.path).toBe(target);
    const raw = JSON.parse(fs.readFileSync(target, "utf8"));
    const parsed = GoldenBaselineFileSchema.parse(raw);
    expect(parsed.source_run_id).toBe("promoted");
    expect(parsed.report.descriptor.run_id).toBe("promoted");
  });

  it("loadGolden round-trips with promoteToGolden", () => {
    const baseline = buildReport({ run_id: "round-trip" });
    const target = tmpGoldenPath();
    CAMInHostRegressionDetectorEngine.promoteToGolden(baseline, target);
    const loaded = CAMInHostRegressionDetectorEngine.loadGolden(target);
    expect(loaded.descriptor.run_id).toBe("round-trip");
    expect(loaded.summary.total).toBe(baseline.summary.total);
  });

  it("loadGolden throws on missing file (failure mode)", () => {
    expect(() => CAMInHostRegressionDetectorEngine.loadGolden("/nope/missing.json")).toThrow(/not found/);
  });

  it("loadGolden throws on corrupt baseline file", () => {
    const target = tmpGoldenPath();
    fs.writeFileSync(target, "{ not valid", "utf8");
    expect(() => CAMInHostRegressionDetectorEngine.loadGolden(target)).toThrow();
  });

  it("promoteToGolden creates parent directory if missing", () => {
    const dir = path.join(os.tmpdir(), `cam-golden-dir-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    const target = path.join(dir, "nested", "golden.json");
    TMP_FILES.push(target);
    const baseline = buildReport({ run_id: "with-mkdir" });
    CAMInHostRegressionDetectorEngine.promoteToGolden(baseline, target);
    expect(fs.existsSync(target)).toBe(true);
  });

  it("detectAgainstGolden loads golden + diffs in one call", () => {
    const baseline = buildReport({ run_id: "golden" });
    const current = buildReport({
      run_id: "current",
      by_host: { fusion360: { total: 100, passed: 80, failed: 20 } },
    });
    const target = tmpGoldenPath();
    CAMInHostRegressionDetectorEngine.promoteToGolden(baseline, target);
    const report = CAMInHostRegressionDetectorEngine.detectAgainstGolden(current, target);
    expect(report.findings.length).toBeGreaterThan(0);
    expect(report.has_critical).toBe(true);
  });
});

// ── 6. Filter helpers ─────────────────────────────────────────────────────

describe("CAMInHostRegressionDetectorEngine — filter helpers", () => {
  it("findingsBySeverity returns only the requested severity", () => {
    const baseline = buildReport();
    const current = buildReport({
      by_host: {
        fusion360: { total: 100, passed: 95, failed: 5 },           // -5 → warning
        hypermill: { total: 100, passed: 80, failed: 20 },          // -20 → critical
      },
    });
    const report = CAMInHostRegressionDetectorEngine.detectRegressions(current, baseline);
    const critical = CAMInHostRegressionDetectorEngine.findingsBySeverity(report, "critical");
    expect(critical.length).toBe(1);
    expect(critical[0].severity).toBe("critical");
    expect(critical[0].dimension).toBe("hypermill");
    const warnings = CAMInHostRegressionDetectorEngine.findingsBySeverity(report, "warning");
    expect(warnings.length).toBe(1);
    expect(warnings[0].dimension).toBe("fusion360");
  });

  it("findingsByType returns only the requested type", () => {
    const baseline = buildReport({ total: 100 });
    const current = buildReport({
      total: 80,
      by_host: { fusion360: { total: 80, passed: 60, failed: 20 } },
    });
    const report = CAMInHostRegressionDetectorEngine.detectRegressions(current, baseline);
    const counts = CAMInHostRegressionDetectorEngine.findingsByType(report, "scenario_count");
    expect(counts.length).toBe(1);
    expect(counts[0].type).toBe("scenario_count");
    expect(counts[0].delta).toBe(-20);
  });
});

// ── 7. Schema validation ─────────────────────────────────────────────────

describe("CAMInHostRegressionDetectorEngine — schema validation", () => {
  it("RegressionSeveritySchema rejects unknown severity (failure mode)", () => {
    const bad: unknown = "blocker";
    expect(() => RegressionSeveritySchema.parse(bad)).toThrow();
  });

  it("RegressionTypeSchema rejects unknown type (failure mode)", () => {
    const bad: unknown = "perf_drift";
    expect(() => RegressionTypeSchema.parse(bad)).toThrow();
  });

  it("RegressionFindingSchema rejects empty dimension (adversarial)", () => {
    expect(() => RegressionFindingSchema.parse({
      type: "host_pass_rate", severity: "critical", dimension: "",
      detail: "x", baseline_value: 0, current_value: 0, delta: 0,
    })).toThrow();
  });
});

// ── 8. Audit invariant ───────────────────────────────────────────────────

describe("CAMInHostRegressionDetectorEngine — audit", () => {
  it("auditReport passes on a real report", () => {
    const r = buildReport();
    const b = buildReport();
    const report = CAMInHostRegressionDetectorEngine.detectRegressions(r, b);
    const audit = CAMInHostRegressionDetectorEngine.auditReport(report);
    expect(audit.ok).toBe(true);
    expect(audit.errors).toEqual([]);
  });

  it("auditReport flags total_findings drift", () => {
    const r = buildReport();
    const b = buildReport();
    const report = CAMInHostRegressionDetectorEngine.detectRegressions(r, b);
    const tampered = { ...report, total_findings: 99 };
    const audit = CAMInHostRegressionDetectorEngine.auditReport(tampered);
    expect(audit.ok).toBe(false);
    expect(audit.errors.some(e => e.includes("total_findings"))).toBe(true);
  });

  it("auditReport flags by_severity sum drift", () => {
    const r = buildReport();
    const b = buildReport();
    const report = CAMInHostRegressionDetectorEngine.detectRegressions(r, b);
    const tampered: RegressionReport = { ...report, by_severity: { critical: 99, warning: 0, info: 0 }, has_critical: true };
    const audit = CAMInHostRegressionDetectorEngine.auditReport(tampered);
    expect(audit.ok).toBe(false);
    expect(audit.errors.some(e => e.includes("by_severity"))).toBe(true);
  });
});

// ── 9. Dispatcher round-trip ─────────────────────────────────────────────

describe("U-CAMTEST17 — dispatcher round-trip (prism_cam)", () => {
  it("ACTIONS array exposes all regression detector actions", async () => {
    const mod = await import("../tools/dispatchers/camDispatcher.js");
    expect(mod.ACTIONS).toContain("cam_regression_detect");
    expect(mod.ACTIONS).toContain("cam_regression_detect_against_golden");
    expect(mod.ACTIONS).toContain("cam_regression_load_golden");
    expect(mod.ACTIONS).toContain("cam_regression_promote_golden");
    expect(mod.ACTIONS).toContain("cam_regression_has_golden");
    expect(mod.ACTIONS).toContain("cam_regression_findings_by_severity");
    expect(mod.ACTIONS).toContain("cam_regression_findings_by_type");
    expect(mod.ACTIONS).toContain("cam_regression_audit");
  });

  it("engine reachable via the same dynamic-import path the dispatcher uses", async () => {
    const mod = await import("../engines/CAMInHostRegressionDetectorEngine.js");
    expect(mod.CAMInHostRegressionDetectorEngine.SCHEMA_VERSION).toBe("1.0.0");
    expect(mod.CAMInHostRegressionDetectorEngine.WARNING_THRESHOLD_PCT).toBe(5);
  });

  it("end-to-end: detectRegressions returns a parsed RegressionReport with critical finding", async () => {
    const mod = await import("../engines/CAMInHostRegressionDetectorEngine.js");
    const baseline = buildReport({ run_id: "baseline-disp" });
    const current = buildReport({
      run_id: "current-disp",
      by_host: { fusion360: { total: 100, passed: 80, failed: 20 } },
    });
    const report = mod.CAMInHostRegressionDetectorEngine.detectRegressions(current, baseline);
    expect(() => RegressionReportSchema.parse(report)).not.toThrow();
    expect(report.has_critical).toBe(true);
    expect(report.current_run_id).toBe("current-disp");
    expect(report.baseline_run_id).toBe("baseline-disp");
  });
});
