/**
 * CAMInHostNightlyOrchestratorEngine.test.ts — U-CAMTEST16
 * =========================================================
 *
 * Coverage:
 *   - happy path: orchestrator runs end-to-end with a stub runner that
 *     ingests synthetic results, summary aggregates correctly
 *   - DI runner_fn: tests inject deterministic results
 *   - hosts filter (only run subset of hosts)
 *   - persistReport / listRecentRuns / getRun real-fs round-trip
 *   - text dashboard renders pass% per host + per category
 *   - dashboardData JSON shape is stable for the React side
 *   - audit invariant
 *   - dispatcher round-trip
 */

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  CAMInHostNightlyOrchestratorEngine,
  NightlyRunReportSchema,
  SCHEMA_VERSION,
  NIGHTLY_RUNS_DIR,
  type ScenarioRunnerFn,
} from "../engines/CAMInHostNightlyOrchestratorEngine.js";
import {
  CAMInHostAssertionBundleEngine,
  type ObservedFrame,
  type SessionStats,
  type ScenarioExpectations,
  type BundleResult,
} from "../engines/CAMInHostAssertionBundleEngine.js";
import { CAMInHostResultsBridgeEngine } from "../engines/CAMInHostResultsBridgeEngine.js";

// ── Test fixtures ────────────────────────────────────────────────────────────

function calmObserved(count: number): ObservedFrame[] {
  const out: ObservedFrame[] = [];
  for (let i = 0; i < count; i++) {
    out.push({ seq: i, latency_ms: 1.0, hard_stop: false, band: 0, payload_valid: true });
  }
  return out;
}

function calmStats(count: number): SessionStats {
  return { frames_in: count, frames_delivered: count, frames_queued: 0, frames_dropped: 0, frames_unknown_target: 0 };
}

function calmExpectations(count: number): ScenarioExpectations {
  return { expected_frame_count: count, expected_band_transitions: 0, deliberate_hard_stop: false, latency_p99_budget_ms: 100 };
}

function passingBundle(): BundleResult {
  return CAMInHostAssertionBundleEngine.evaluate({
    observed: calmObserved(12), stats: calmStats(12), expectations: calmExpectations(12),
  });
}

function failingBundle(): BundleResult {
  return CAMInHostAssertionBundleEngine.evaluate({
    observed: calmObserved(8), stats: calmStats(8), expectations: calmExpectations(12),
  });
}

/** Stub runner that ingests one passing envelope per scenario. */
function allPassRunner(): ScenarioRunnerFn {
  return (host, scenarios) => {
    for (const s of scenarios) {
      CAMInHostResultsBridgeEngine.ingestBundle({
        scenario_id: s.scenario_id, host, category: s.category, bundle: passingBundle(), timestamp_ms: 1000,
      });
    }
  };
}

/** Stub runner that fails 1 in 3 scenarios deterministically. */
function partialFailRunner(): ScenarioRunnerFn {
  return (host, scenarios) => {
    scenarios.forEach((s, i) => {
      const bundle = i % 3 === 0 ? failingBundle() : passingBundle();
      CAMInHostResultsBridgeEngine.ingestBundle({
        scenario_id: s.scenario_id, host, category: s.category, bundle, timestamp_ms: 1000,
      });
    });
  };
}

const TMP_DIRS: string[] = [];
function tmpRunsDir(): string {
  const dir = path.join(os.tmpdir(), `cam-nightly-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  TMP_DIRS.push(dir);
  return dir;
}
afterAll(() => {
  for (const d of TMP_DIRS) {
    if (fs.existsSync(d)) fs.rmSync(d, { recursive: true, force: true });
  }
});

beforeEach(() => CAMInHostResultsBridgeEngine.reset());

// ── 1. Static surface ────────────────────────────────────────────────────────

describe("CAMInHostNightlyOrchestratorEngine — static surface", () => {
  it("exposes SCHEMA_VERSION 1.0.0", () => {
    expect(SCHEMA_VERSION).toBe("1.0.0");
    expect(CAMInHostNightlyOrchestratorEngine.SCHEMA_VERSION).toBe("1.0.0");
  });

  it("NIGHTLY_RUNS_DIR points at data/state/CAM_NIGHTLY_RUNS", () => {
    expect(NIGHTLY_RUNS_DIR).toBe("data/state/CAM_NIGHTLY_RUNS");
    expect(CAMInHostNightlyOrchestratorEngine.NIGHTLY_RUNS_DIR).toBe(NIGHTLY_RUNS_DIR);
  });

  it("ALL_HOSTS lists all 4 in-host runner targets", () => {
    expect(CAMInHostNightlyOrchestratorEngine.ALL_HOSTS).toEqual([
      "fusion360", "hypermill", "inventor_hsm", "mastercam",
    ]);
  });
});

// ── 2. Happy path orchestration ─────────────────────────────────────────────

describe("CAMInHostNightlyOrchestratorEngine — orchestration", () => {
  it("runs end-to-end with a passing runner against pocket_2d category", async () => {
    const dir = tmpRunsDir();
    let clockNow = 1_000_000;
    const report = await CAMInHostNightlyOrchestratorEngine.run({
      generator_config: { categories: ["pocket_2d"] },
      runner_fn: allPassRunner(),
      reset_bridge_first: true,
      persist_dir: dir,
      clock: () => clockNow++,
    });
    expect(report.descriptor.scenario_count).toBe(108);          // pocket_2d count
    expect(report.summary.total).toBe(108);
    expect(report.summary.passed).toBe(108);
    expect(report.summary.failed).toBe(0);
    expect(report.descriptor.run_id).toMatch(/^nightly_/);
  });

  it("partial fail runner produces non-zero failure count", async () => {
    const dir = tmpRunsDir();
    const report = await CAMInHostNightlyOrchestratorEngine.run({
      generator_config: { categories: ["pocket_2d"] },
      runner_fn: partialFailRunner(),
      reset_bridge_first: true,
      persist_dir: dir,
    });
    expect(report.summary.failed).toBeGreaterThan(0);
    expect(report.summary.passed + report.summary.failed).toBe(report.summary.total);
  });

  it("tracks per-host scenario dispatch counts", async () => {
    const dir = tmpRunsDir();
    const report = await CAMInHostNightlyOrchestratorEngine.run({
      generator_config: { categories: ["pocket_2d"] },
      runner_fn: allPassRunner(),
      reset_bridge_first: true,
      persist_dir: dir,
    });
    // pocket_2d: 3 parts × 9 slots = 27 scenarios per host × 4 hosts.
    expect(report.scenarios_dispatched_per_host.fusion360).toBe(27);
    expect(report.scenarios_dispatched_per_host.hypermill).toBe(27);
    expect(report.scenarios_dispatched_per_host.inventor_hsm).toBe(27);
    expect(report.scenarios_dispatched_per_host.mastercam).toBe(27);
  });

  it("hosts filter narrows dispatch (only fusion360)", async () => {
    const dir = tmpRunsDir();
    const report = await CAMInHostNightlyOrchestratorEngine.run({
      generator_config: { categories: ["pocket_2d"] },
      runner_fn: allPassRunner(),
      hosts: ["fusion360"],
      reset_bridge_first: true,
      persist_dir: dir,
    });
    expect(report.scenarios_dispatched_per_host.fusion360).toBe(27);
    expect(report.scenarios_dispatched_per_host.hypermill).toBe(0);
    expect(report.scenarios_dispatched_per_host.mastercam).toBe(0);
  });

  it("default no-op runner produces empty result set (audit still passes)", async () => {
    const dir = tmpRunsDir();
    const report = await CAMInHostNightlyOrchestratorEngine.run({
      generator_config: { categories: ["pocket_2d"] },
      reset_bridge_first: true,
      persist_dir: dir,
    });
    expect(report.descriptor.scenario_count).toBe(108);
    expect(report.summary.total).toBe(0);                       // no runner → bridge is empty
    const audit = CAMInHostNightlyOrchestratorEngine.auditOrchestrator(report);
    expect(audit.ok).toBe(true);
  });

  it("duration_ms equals finished − started", async () => {
    const dir = tmpRunsDir();
    let n = 1_000_000;
    const report = await CAMInHostNightlyOrchestratorEngine.run({
      generator_config: { categories: ["pocket_2d"] },
      runner_fn: allPassRunner(),
      reset_bridge_first: true,
      persist_dir: dir,
      clock: () => n++,                                          // advances on each call
    });
    expect(report.duration_ms).toBe(report.finished_at_ms - report.descriptor.started_at_ms);
    expect(report.duration_ms).toBeGreaterThanOrEqual(0);
  });
});

// ── 3. Persistence ──────────────────────────────────────────────────────────

describe("CAMInHostNightlyOrchestratorEngine — persistence", () => {
  it("persistReport writes a versioned JSON snapshot", async () => {
    const dir = tmpRunsDir();
    const report = await CAMInHostNightlyOrchestratorEngine.run({
      generator_config: { categories: ["pocket_2d"] },
      runner_fn: allPassRunner(),
      reset_bridge_first: true,
      persist_dir: dir,
    });
    const target = path.join(dir, `${report.descriptor.run_id}.json`);
    expect(fs.existsSync(target)).toBe(true);
    const raw = JSON.parse(fs.readFileSync(target, "utf8"));
    const parsed = NightlyRunReportSchema.parse(raw);
    expect(parsed.descriptor.scenario_count).toBe(108);
  });

  it("listRecentRuns returns nothing for a non-existent directory", () => {
    const dir = path.join(os.tmpdir(), `cam-nightly-empty-${Date.now()}`);
    expect(CAMInHostNightlyOrchestratorEngine.listRecentRuns({ dir })).toEqual([]);
  });

  it("listRecentRuns returns persisted runs newest-first up to limit", async () => {
    const dir = tmpRunsDir();
    let nowVal = 5_000_000;
    for (let i = 0; i < 4; i++) {
      await CAMInHostNightlyOrchestratorEngine.run({
        generator_config: { categories: ["pocket_2d"] },
        runner_fn: allPassRunner(),
        reset_bridge_first: true,
        persist_dir: dir,
        clock: () => nowVal++,                                   // each run gets a unique start time
      });
      nowVal += 100_000;                                         // separation between runs
    }
    const list = CAMInHostNightlyOrchestratorEngine.listRecentRuns({ dir, limit: 3 });
    expect(list.length).toBe(3);
    // Sorted reverse alphabetical = reverse chronological for ISO timestamps.
    expect(list[0].run_id > list[1].run_id).toBe(true);
  });

  it("getRun loads a persisted report by run_id", async () => {
    const dir = tmpRunsDir();
    const report = await CAMInHostNightlyOrchestratorEngine.run({
      generator_config: { categories: ["pocket_2d"] },
      runner_fn: allPassRunner(),
      reset_bridge_first: true,
      persist_dir: dir,
    });
    const loaded = CAMInHostNightlyOrchestratorEngine.getRun(report.descriptor.run_id, dir);
    expect(loaded.descriptor.run_id).toBe(report.descriptor.run_id);
    expect(loaded.summary.total).toBe(report.summary.total);
  });

  it("getRun throws on missing run_id (failure mode)", () => {
    const dir = tmpRunsDir();
    fs.mkdirSync(dir, { recursive: true });
    expect(() => CAMInHostNightlyOrchestratorEngine.getRun("nonexistent_run", dir)).toThrow(/report not found/);
  });
});

// ── 4. Text dashboard ──────────────────────────────────────────────────────

describe("CAMInHostNightlyOrchestratorEngine — text dashboard", () => {
  it("formatTextDashboard includes run header + per-host + per-category sections", async () => {
    const dir = tmpRunsDir();
    const report = await CAMInHostNightlyOrchestratorEngine.run({
      generator_config: { categories: ["pocket_2d"] },
      runner_fn: allPassRunner(),
      reset_bridge_first: true,
      persist_dir: dir,
    });
    const text = CAMInHostNightlyOrchestratorEngine.formatTextDashboard(report);
    expect(text).toContain("CAM In-Host Nightly Run");
    expect(text).toContain(report.descriptor.run_id);
    expect(text).toContain("Per-host breakdown:");
    expect(text).toContain("Per-category breakdown:");
    expect(text).toContain("Per-assertion-family failures");
    expect(text).toContain("fusion360");
    expect(text).toContain("pocket_2d");
  });

  it("formatTextDashboard says '(no assertion-family failures)' on a clean run", async () => {
    const dir = tmpRunsDir();
    const report = await CAMInHostNightlyOrchestratorEngine.run({
      generator_config: { categories: ["pocket_2d"] },
      runner_fn: allPassRunner(),
      reset_bridge_first: true,
      persist_dir: dir,
    });
    const text = CAMInHostNightlyOrchestratorEngine.formatTextDashboard(report);
    expect(text).toContain("(no assertion-family failures)");
  });

  it("formatTextDashboard surfaces failed assertion families on a partial-fail run", async () => {
    const dir = tmpRunsDir();
    const report = await CAMInHostNightlyOrchestratorEngine.run({
      generator_config: { categories: ["pocket_2d"] },
      runner_fn: partialFailRunner(),
      reset_bridge_first: true,
      persist_dir: dir,
    });
    const text = CAMInHostNightlyOrchestratorEngine.formatTextDashboard(report);
    expect(text).toContain("frame_arrival");
    expect(text).not.toContain("(no assertion-family failures)");
  });
});

// ── 5. Dashboard data JSON shape ───────────────────────────────────────────

describe("CAMInHostNightlyOrchestratorEngine — dashboard JSON shape", () => {
  it("dashboardData exposes overall + hosts + categories + assertion_failures", async () => {
    const dir = tmpRunsDir();
    const report = await CAMInHostNightlyOrchestratorEngine.run({
      generator_config: { categories: ["pocket_2d"] },
      runner_fn: partialFailRunner(),
      reset_bridge_first: true,
      persist_dir: dir,
    });
    const data = CAMInHostNightlyOrchestratorEngine.dashboardData(report);
    expect(data.run_id).toBe(report.descriptor.run_id);
    expect(data.overall.total).toBeGreaterThan(0);
    expect(data.overall.pass_pct).toBeGreaterThan(0);
    expect(data.overall.pass_pct).toBeLessThan(100);
    expect(data.hosts.length).toBe(4);
    expect(data.categories.length).toBe(7);
    expect(data.assertion_failures.length).toBeGreaterThan(0);
    expect(data.assertion_failures[0].family).toBe("frame_arrival");
  });

  it("dashboardData pass_pct is 0 when total is 0 (no division-by-zero)", async () => {
    const dir = tmpRunsDir();
    const report = await CAMInHostNightlyOrchestratorEngine.run({
      generator_config: { categories: ["pocket_2d"] },
      reset_bridge_first: true,
      persist_dir: dir,                                          // no runner → no results
    });
    const data = CAMInHostNightlyOrchestratorEngine.dashboardData(report);
    expect(data.overall.pass_pct).toBe(0);
    expect(data.overall.total).toBe(0);
    for (const h of data.hosts) expect(h.pass_pct).toBe(0);
  });
});

// ── 6. Audit invariant ────────────────────────────────────────────────────

describe("CAMInHostNightlyOrchestratorEngine — audit", () => {
  it("auditOrchestrator passes on a real report", async () => {
    const dir = tmpRunsDir();
    const report = await CAMInHostNightlyOrchestratorEngine.run({
      generator_config: { categories: ["pocket_2d"] },
      runner_fn: allPassRunner(),
      reset_bridge_first: true,
      persist_dir: dir,
    });
    const audit = CAMInHostNightlyOrchestratorEngine.auditOrchestrator(report);
    expect(audit.ok).toBe(true);
    expect(audit.errors).toEqual([]);
  });

  it("auditOrchestrator flags duration drift", async () => {
    const dir = tmpRunsDir();
    const report = await CAMInHostNightlyOrchestratorEngine.run({
      generator_config: { categories: ["pocket_2d"] },
      runner_fn: allPassRunner(),
      reset_bridge_first: true,
      persist_dir: dir,
    });
    const tampered = { ...report, duration_ms: report.duration_ms + 999 };
    const audit = CAMInHostNightlyOrchestratorEngine.auditOrchestrator(tampered);
    expect(audit.ok).toBe(false);
    expect(audit.errors.some(e => e.includes("duration_ms"))).toBe(true);
  });

  it("auditOrchestrator flags summary roll-up mismatch", async () => {
    const dir = tmpRunsDir();
    const report = await CAMInHostNightlyOrchestratorEngine.run({
      generator_config: { categories: ["pocket_2d"] },
      runner_fn: allPassRunner(),
      reset_bridge_first: true,
      persist_dir: dir,
    });
    const tampered = { ...report, summary: { ...report.summary, passed: report.summary.passed + 1 } };
    const audit = CAMInHostNightlyOrchestratorEngine.auditOrchestrator(tampered);
    expect(audit.ok).toBe(false);
    expect(audit.errors.some(e => e.includes("roll-up"))).toBe(true);
  });
});

// ── 7. Dispatcher round-trip ─────────────────────────────────────────────

describe("U-CAMTEST16 — dispatcher round-trip (prism_cam)", () => {
  it("ACTIONS array exposes all nightly orchestrator actions", async () => {
    const mod = await import("../tools/dispatchers/camDispatcher.js");
    expect(mod.ACTIONS).toContain("cam_nightly_run");
    expect(mod.ACTIONS).toContain("cam_nightly_list_recent");
    expect(mod.ACTIONS).toContain("cam_nightly_get_run");
    expect(mod.ACTIONS).toContain("cam_nightly_text_dashboard");
    expect(mod.ACTIONS).toContain("cam_nightly_dashboard_data");
    expect(mod.ACTIONS).toContain("cam_nightly_audit");
  });

  it("engine reachable via the same dynamic-import path the dispatcher uses", async () => {
    const mod = await import("../engines/CAMInHostNightlyOrchestratorEngine.js");
    expect(mod.CAMInHostNightlyOrchestratorEngine.SCHEMA_VERSION).toBe("1.0.0");
  });

  it("text dashboard renders for a freshly-orchestrated report end-to-end", async () => {
    const mod = await import("../engines/CAMInHostNightlyOrchestratorEngine.js");
    const dir = tmpRunsDir();
    const report = await mod.CAMInHostNightlyOrchestratorEngine.run({
      generator_config: { categories: ["pocket_2d"] },
      runner_fn: allPassRunner(),
      reset_bridge_first: true,
      persist_dir: dir,
    });
    const text = mod.CAMInHostNightlyOrchestratorEngine.formatTextDashboard(report);
    expect(text.length).toBeGreaterThan(0);
    expect(text).toContain("nightly_");
  });
});
