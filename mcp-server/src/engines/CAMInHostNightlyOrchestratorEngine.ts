/**
 * CAMInHostNightlyOrchestratorEngine — U-CAMTEST16 (backend half)
 * ================================================================
 *
 * PHASE-8: Backend orchestrator that drives a full nightly cycle:
 *   1. Generate scenarios via CAMScenarioGeneratorEngine
 *   2. Group scenarios by host
 *   3. Hand each host's scenario list to a runner_fn (DI: defaults to a
 *      no-op stub so tests run hermetically; production wires the real
 *      hub-driven runner)
 *   4. Aggregate results from CAMInHostResultsBridgeEngine
 *   5. Persist a NightlyRunReport to data/state/CAM_NIGHTLY_RUNS/<id>.json
 *   6. Render ASCII text dashboard + structured JSON for the React side
 *
 * The React dashboard half (web/src/pages/CAMInHostDashboard.tsx) is
 * deferred to the Codex frontend lane per
 * state/shared/ROADMAP_COLLABORATION_STATE.md. dashboardData() emits the
 * exact JSON shape the dashboard will render so the lanes stay decoupled.
 *
 * @module engines/CAMInHostNightlyOrchestratorEngine
 * @milestone CAM-EXHAUST-MS0 U-CAMTEST16 (backend half)
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";
import {
  CAMScenarioGeneratorEngine,
  GeneratorConfigSchema,
  type GeneratedScenario,
} from "./CAMScenarioGeneratorEngine.js";
import {
  CAMInHostResultsBridgeEngine,
  type FixtureHost,
  type FixtureCategory,
  type Summary,
} from "./CAMInHostResultsBridgeEngine.js";

// ── Schemas ──────────────────────────────────────────────────────────────────

export const NightlyRunDescriptorSchema = z.object({
  run_id: z.string().min(1),
  started_at_ms: z.number().int().nonnegative(),
  generator_config: GeneratorConfigSchema,
  scenario_count: z.number().int().nonnegative(),
  hosts: z.array(z.enum(["fusion360", "hypermill", "inventor_hsm", "mastercam"])),
});
export type NightlyRunDescriptor = z.infer<typeof NightlyRunDescriptorSchema>;

export const NightlyRunReportSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  descriptor: NightlyRunDescriptorSchema,
  finished_at_ms: z.number().int().nonnegative(),
  duration_ms: z.number().int().nonnegative(),
  scenarios_dispatched_per_host: z.record(
    z.enum(["fusion360", "hypermill", "inventor_hsm", "mastercam"]),
    z.number().int().nonnegative(),
  ),
  summary: z.object({
    total: z.number().int().nonnegative(),
    passed: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
    by_host: z.record(z.enum(["fusion360", "hypermill", "inventor_hsm", "mastercam"]), z.object({
      total: z.number().int().nonnegative(),
      passed: z.number().int().nonnegative(),
      failed: z.number().int().nonnegative(),
    })),
    by_category: z.record(z.enum(["pocket_2d", "contour_2d", "drilling", "threading", "surface_3d", "multi_axis", "turning"]), z.object({
      total: z.number().int().nonnegative(),
      passed: z.number().int().nonnegative(),
      failed: z.number().int().nonnegative(),
    })),
    by_assertion: z.record(z.enum([
      "frame_arrival", "latency_p99", "band_transitions", "hard_stop_trigger",
      "session_stats_reconcile", "encoder_schema", "reconnect_drain",
    ]), z.object({
      total: z.number().int().nonnegative(),
      passed: z.number().int().nonnegative(),
      failed: z.number().int().nonnegative(),
    })),
  }),
});
export type NightlyRunReport = z.infer<typeof NightlyRunReportSchema>;

// ── Constants ────────────────────────────────────────────────────────────────

export const SCHEMA_VERSION = "1.0.0";
export const NIGHTLY_RUNS_DIR = "data/state/CAM_NIGHTLY_RUNS";
const ALL_HOSTS: FixtureHost[] = ["fusion360", "hypermill", "inventor_hsm", "mastercam"];
const ALL_CATEGORIES: FixtureCategory[] = [
  "pocket_2d", "contour_2d", "drilling", "threading",
  "surface_3d", "multi_axis", "turning",
];

// ── Runner injection (DI) ────────────────────────────────────────────────────
// runner_fn receives the scenarios for one host. Production injects the real
// hub-driven runner; tests inject a stub that ingests synthetic results.

export type ScenarioRunnerFn = (host: FixtureHost, scenarios: GeneratedScenario[]) => void | Promise<void>;

const noopRunner: ScenarioRunnerFn = () => undefined;

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeRunId(now: number = Date.now()): string {
  const iso = new Date(now).toISOString().replace(/[:.]/g, "-");
  return `nightly_${iso}`;
}

function groupByHost(scenarios: GeneratedScenario[]): Map<FixtureHost, GeneratedScenario[]> {
  const out = new Map<FixtureHost, GeneratedScenario[]>();
  for (const h of ALL_HOSTS) out.set(h, []);
  for (const s of scenarios) {
    const list = out.get(s.host);
    if (list !== undefined) list.push(s);
  }
  return out;
}

function pad(s: string, width: number): string {
  return (s + " ".repeat(width)).slice(0, width);
}

function rightPad(n: number, width: number): string {
  return pad(String(n), width);
}

// ── Engine ───────────────────────────────────────────────────────────────────

export interface RunOptions {
  generator_config?: z.input<typeof GeneratorConfigSchema>;
  runner_fn?: ScenarioRunnerFn;
  hosts?: FixtureHost[];
  reset_bridge_first?: boolean;
  persist_dir?: string;
  /** Override Date.now() for deterministic test snapshots. */
  clock?: () => number;
}

export class CAMInHostNightlyOrchestratorEngine {
  static readonly SCHEMA_VERSION = SCHEMA_VERSION;
  static readonly NIGHTLY_RUNS_DIR = NIGHTLY_RUNS_DIR;
  static readonly ALL_HOSTS = ALL_HOSTS;

  /**
   * Execute one nightly orchestration cycle.
   * Steps: generate → group-by-host → invoke runner_fn per host →
   * aggregate from bridge → persist report → return report.
   */
  static async run(options: RunOptions = {}): Promise<NightlyRunReport> {
    const clock = options.clock ?? Date.now;
    const startedAt = clock();
    const cfg = GeneratorConfigSchema.parse(options.generator_config ?? {});
    const runner = options.runner_fn ?? noopRunner;
    const hostsFilter = options.hosts ?? ALL_HOSTS;
    const persistDir = options.persist_dir ?? NIGHTLY_RUNS_DIR;

    if (options.reset_bridge_first === true) {
      CAMInHostResultsBridgeEngine.reset();
    }

    const scenarios = CAMScenarioGeneratorEngine.generate(cfg);
    const grouped = groupByHost(scenarios);
    const dispatched: Record<string, number> = {};
    for (const h of ALL_HOSTS) dispatched[h] = 0;

    for (const host of hostsFilter) {
      const hostScenarios = grouped.get(host) ?? [];
      dispatched[host] = hostScenarios.length;
      // The runner_fn is responsible for executing the scenarios and
      // ingesting BundleResult envelopes into CAMInHostResultsBridgeEngine.
      // It may run synchronously (test stubs) or asynchronously (real hub).
      await Promise.resolve(runner(host, hostScenarios));
    }

    const summary = CAMInHostResultsBridgeEngine.summarize() as Summary;
    const finishedAt = clock();
    const runId = makeRunId(startedAt);

    const report: NightlyRunReport = NightlyRunReportSchema.parse({
      schemaVersion: SCHEMA_VERSION,
      descriptor: {
        run_id: runId,
        started_at_ms: startedAt,
        generator_config: cfg,
        scenario_count: scenarios.length,
        hosts: hostsFilter,
      },
      finished_at_ms: finishedAt,
      duration_ms: Math.max(0, finishedAt - startedAt),
      scenarios_dispatched_per_host: dispatched,
      summary,
    });

    CAMInHostNightlyOrchestratorEngine.persistReport(report, persistDir);
    return report;
  }

  /** Persist one report to the snapshot directory. */
  static persistReport(report: NightlyRunReport, dir: string = NIGHTLY_RUNS_DIR): { path: string } {
    NightlyRunReportSchema.parse(report);
    fs.mkdirSync(dir, { recursive: true });
    const target = path.join(dir, `${report.descriptor.run_id}.json`);
    fs.writeFileSync(target, JSON.stringify(report, null, 2), "utf8");
    return { path: target };
  }

  /** List recent run files in the snapshot directory, newest first. */
  static listRecentRuns(opts: { limit?: number; dir?: string } = {}): { path: string; run_id: string }[] {
    const dir = opts.dir ?? NIGHTLY_RUNS_DIR;
    const limit = opts.limit ?? 30;
    if (!fs.existsSync(dir)) return [];
    const files = fs.readdirSync(dir).filter(f => f.endsWith(".json")).sort().reverse();
    return files.slice(0, limit).map(f => ({
      path: path.join(dir, f),
      run_id: f.replace(/\.json$/, ""),
    }));
  }

  /** Load one report by run_id (or full path). */
  static getRun(run_id_or_path: string, dir: string = NIGHTLY_RUNS_DIR): NightlyRunReport {
    let target = run_id_or_path;
    if (!run_id_or_path.endsWith(".json")) target = path.join(dir, `${run_id_or_path}.json`);
    if (!fs.existsSync(target)) throw new Error(`CAMInHostNightlyOrchestrator: report not found at "${target}"`);
    const raw = fs.readFileSync(target, "utf8");
    return NightlyRunReportSchema.parse(JSON.parse(raw));
  }

  /**
   * Render an ASCII text dashboard from a report. Used by the CLI / smoke
   * test path so a failing nightly is readable in raw terminal output even
   * before the React dashboard exists.
   */
  static formatTextDashboard(report: NightlyRunReport): string {
    const lines: string[] = [];
    const sum = report.summary;
    const passPct = sum.total === 0 ? 0 : (sum.passed / sum.total) * 100;
    lines.push(`══ CAM In-Host Nightly Run — ${report.descriptor.run_id} ══`);
    lines.push(`  duration:  ${report.duration_ms} ms`);
    lines.push(`  scenarios: ${sum.total}  (passed=${sum.passed}, failed=${sum.failed}, pass=${passPct.toFixed(1)}%)`);
    lines.push("");
    lines.push("Per-host breakdown:");
    lines.push("  HOST           TOTAL   PASS   FAIL   PASS%");
    for (const h of ALL_HOSTS) {
      const r = sum.by_host[h];
      if (r === undefined) continue;
      const pct = r.total === 0 ? "   -" : `${((r.passed / r.total) * 100).toFixed(1)}%`;
      lines.push(`  ${pad(h, 14)} ${rightPad(r.total, 6)}  ${rightPad(r.passed, 5)}  ${rightPad(r.failed, 5)}  ${pad(pct, 5)}`);
    }
    lines.push("");
    lines.push("Per-category breakdown:");
    lines.push("  CATEGORY       TOTAL   PASS   FAIL   PASS%");
    for (const c of ALL_CATEGORIES) {
      const r = sum.by_category[c];
      if (r === undefined) continue;
      const pct = r.total === 0 ? "   -" : `${((r.passed / r.total) * 100).toFixed(1)}%`;
      lines.push(`  ${pad(c, 14)} ${rightPad(r.total, 6)}  ${rightPad(r.passed, 5)}  ${rightPad(r.failed, 5)}  ${pad(pct, 5)}`);
    }
    lines.push("");
    lines.push("Per-assertion-family failures (only families with > 0 failures):");
    let anyFailed = false;
    for (const a of Object.keys(sum.by_assertion)) {
      const r = sum.by_assertion[a as keyof typeof sum.by_assertion];
      if (r === undefined || r.failed === 0) continue;
      anyFailed = true;
      lines.push(`  ${pad(a, 25)} failed=${r.failed}/${r.total}`);
    }
    if (!anyFailed) lines.push("  (no assertion-family failures)");
    return lines.join("\n");
  }

  /**
   * Structured JSON shape for the React dashboard. Stable contract so the
   * frontend can render this report without re-parsing the full schema.
   */
  static dashboardData(report: NightlyRunReport): {
    run_id: string;
    started_at_ms: number;
    duration_ms: number;
    overall: { total: number; passed: number; failed: number; pass_pct: number };
    hosts: Array<{ host: FixtureHost; total: number; passed: number; failed: number; pass_pct: number }>;
    categories: Array<{ category: FixtureCategory; total: number; passed: number; failed: number; pass_pct: number }>;
    assertion_failures: Array<{ family: string; failed: number; total: number }>;
  } {
    const sum = report.summary;
    const pct = (a: number, b: number): number => (b === 0 ? 0 : (a / b) * 100);
    return {
      run_id: report.descriptor.run_id,
      started_at_ms: report.descriptor.started_at_ms,
      duration_ms: report.duration_ms,
      overall: {
        total: sum.total,
        passed: sum.passed,
        failed: sum.failed,
        pass_pct: pct(sum.passed, sum.total),
      },
      hosts: ALL_HOSTS.map(h => {
        const r = sum.by_host[h] ?? { total: 0, passed: 0, failed: 0 };
        return { host: h, total: r.total, passed: r.passed, failed: r.failed, pass_pct: pct(r.passed, r.total) };
      }),
      categories: ALL_CATEGORIES.map(c => {
        const r = sum.by_category[c] ?? { total: 0, passed: 0, failed: 0 };
        return { category: c, total: r.total, passed: r.passed, failed: r.failed, pass_pct: pct(r.passed, r.total) };
      }),
      assertion_failures: Object.entries(sum.by_assertion)
        .filter(([, r]) => (r as { failed: number }).failed > 0)
        .map(([family, r]) => ({ family, failed: (r as { failed: number; total: number }).failed, total: (r as { failed: number; total: number }).total })),
    };
  }

  static auditOrchestrator(report: NightlyRunReport): { ok: boolean; errors: string[] } {
    const errors: string[] = [];
    try { NightlyRunReportSchema.parse(report); }
    catch (e) { errors.push(`report schema parse failed: ${(e as Error).message}`); }
    if (report.summary.passed + report.summary.failed !== report.summary.total) {
      errors.push(`summary roll-up mismatch: ${report.summary.passed}+${report.summary.failed} ≠ ${report.summary.total}`);
    }
    if (report.finished_at_ms < report.descriptor.started_at_ms) {
      errors.push(`finished_at_ms (${report.finished_at_ms}) before started_at_ms (${report.descriptor.started_at_ms})`);
    }
    if (report.duration_ms !== Math.max(0, report.finished_at_ms - report.descriptor.started_at_ms)) {
      errors.push(`duration_ms (${report.duration_ms}) does not equal finished − started`);
    }
    return { ok: errors.length === 0, errors };
  }
}

export const camInHostNightlyOrchestratorEngine = CAMInHostNightlyOrchestratorEngine;
