/**
 * RegressionBaselineEngine (U-LPR-REGRESSION-BASELINE, QA B2)
 *
 * Freezes the Lathe-Prod test contract at plan kickoff. Stores:
 *   • test_id → expected result sha256 (deterministic output hash)
 *   • test_id → timing p95 (Hyndman-Fan R-7 quantile of recent runs)
 *   • flaky-test quarantine list (explicit reason, never silent skip)
 *
 * CI diff-gate: new run is compared against the frozen baseline and
 * failures fall into three buckets:
 *
 *   RESULT_DIFF     — expected hash mismatch (pass / fail semantics changed)
 *   TIMING_REGRESS  — observed p95 > baseline_p95 × (1 + max_slowdown)
 *                     where max_slowdown defaults to 20 % per run.
 *   FLAKY           — test fails at rate > 1 % over 100 runs and is NOT
 *                     currently quarantined. Blocks until quarantine ticket
 *                     is filed with an explicit reason.
 *
 * The engine distinguishes "hard" breaches (RESULT_DIFF, unquarantined
 * FLAKY) from "soft" ones (TIMING_REGRESS within 2×budget) so CI can
 * differentiate merge blockers from advisory warnings.
 *
 * Pure in-memory; caller persists to
 * `data/state/TEST_BASELINE_LATHE_PROD.json` (schemaVersion 1).
 *
 * Refs:
 *   - Google Testing Blog (2016) "Flaky Tests at Google and How We
 *     Mitigate Them" — quarantine-with-reason pattern.
 *   - Hyndman & Fan (1996) "Sample Quantiles in Statistical Packages"
 *     American Statistician §4 — R-7 quantile we use for p95.
 *   - Jenkins LTS release notes (2022) on baseline-diff CI patterns.
 */

export type BreachKind = "RESULT_DIFF" | "TIMING_REGRESS" | "FLAKY";
export type BreachSeverity = "hard" | "soft";

export interface BaselineEntry {
  test_id: string;
  expected_result_sha256: string;   // hash of expected output
  baseline_p95_ms: number;          // frozen p95 timing
  sample_count: number;             // runs that produced baseline_p95
  frozen_at: number;                // epoch ms when baseline was locked
  frozen_by: string;                // engineer who froze it
  notes?: string;
}

export interface QuarantineEntry {
  test_id: string;
  reason: string;                   // ≥20 chars mandatory
  filed_at: number;
  filed_by: string;
  expires_at?: number;              // optional sunset
  ticket_url?: string;
}

export interface TestRun {
  test_id: string;
  result_sha256: string;
  duration_ms: number;
  passed: boolean;
  run_at: number;
  run_by?: string;                  // CI job id or developer
}

export interface Breach {
  test_id: string;
  kind: BreachKind;
  severity: BreachSeverity;
  detail: string;
  observed: number | string;
  expected: number | string;
}

export interface DiffGateReport {
  runs_evaluated: number;
  hard_breaches: Breach[];
  soft_breaches: Breach[];
  missing_tests: string[];          // in baseline but not in run
  new_tests: string[];              // in run but not in baseline
  passed: boolean;                  // no hard breaches
}

const DEFAULT_MAX_SLOWDOWN = 0.20;
const FLAKY_FAIL_RATE_THRESHOLD = 0.01;
const FLAKY_MIN_RUNS = 100;
const SHA256_REGEX = /^[a-f0-9]{64}$/i;

export class RegressionBaselineEngine {
  private baseline = new Map<string, BaselineEntry>();
  private quarantine = new Map<string, QuarantineEntry>();
  private recentRuns = new Map<string, TestRun[]>();   // test_id → buffer
  private runHistorySize = 200;

  freeze(entries: BaselineEntry[], frozen_by: string): number {
    if (!frozen_by.trim()) throw new Error("frozen_by required");
    if (entries.length === 0) throw new Error("cannot freeze empty baseline");
    this.baseline.clear();
    for (const e of entries) {
      if (!e.test_id.trim()) throw new Error("test_id required");
      if (!SHA256_REGEX.test(e.expected_result_sha256)) {
        throw new Error(`test ${e.test_id}: expected_result_sha256 must be 64-hex`);
      }
      if (e.baseline_p95_ms <= 0) {
        throw new Error(`test ${e.test_id}: baseline_p95_ms must be >0`);
      }
      if (e.sample_count < 1) {
        throw new Error(`test ${e.test_id}: sample_count must be ≥1`);
      }
      if (this.baseline.has(e.test_id)) {
        throw new Error(`duplicate test_id ${e.test_id} in baseline`);
      }
      this.baseline.set(e.test_id, {
        ...e,
        expected_result_sha256: e.expected_result_sha256.toLowerCase(),
        frozen_by: frozen_by.trim(),
      });
    }
    return this.baseline.size;
  }

  getBaseline(test_id: string): BaselineEntry | null {
    const e = this.baseline.get(test_id);
    return e ? { ...e } : null;
  }

  listBaseline(): BaselineEntry[] {
    return Array.from(this.baseline.values()).map((e) => ({ ...e }));
  }

  quarantineTest(input: QuarantineEntry): QuarantineEntry {
    if (!input.test_id.trim()) throw new Error("test_id required");
    if (!input.reason || input.reason.trim().length < 20) {
      throw new Error("quarantine reason must be ≥20 chars");
    }
    if (!input.filed_by.trim()) throw new Error("filed_by required");
    if (!this.baseline.has(input.test_id)) {
      throw new Error(`test ${input.test_id} not in baseline`);
    }
    if (input.expires_at !== undefined && input.expires_at <= input.filed_at) {
      throw new Error("expires_at must be > filed_at");
    }
    const rec: QuarantineEntry = {
      ...input,
      reason: input.reason.trim(),
      filed_by: input.filed_by.trim(),
      ticket_url: input.ticket_url?.trim() || undefined,
    };
    this.quarantine.set(input.test_id, rec);
    return { ...rec };
  }

  liftQuarantine(test_id: string): boolean {
    return this.quarantine.delete(test_id);
  }

  isQuarantined(test_id: string, now = Date.now()): boolean {
    const q = this.quarantine.get(test_id);
    if (!q) return false;
    if (q.expires_at !== undefined && now >= q.expires_at) return false;
    return true;
  }

  listQuarantine(now = Date.now()): QuarantineEntry[] {
    const out: QuarantineEntry[] = [];
    for (const q of this.quarantine.values()) {
      if (q.expires_at !== undefined && now >= q.expires_at) continue;
      out.push({ ...q });
    }
    return out;
  }

  /** Record a raw run for flaky-rate tracking. */
  recordRun(run: TestRun): void {
    if (!run.test_id.trim()) throw new Error("test_id required");
    if (!SHA256_REGEX.test(run.result_sha256)) {
      throw new Error("result_sha256 must be 64-hex");
    }
    if (run.duration_ms < 0) throw new Error("duration_ms must be ≥0");
    const buf = this.recentRuns.get(run.test_id) ?? [];
    buf.push({
      ...run,
      result_sha256: run.result_sha256.toLowerCase(),
    });
    if (buf.length > this.runHistorySize) buf.shift();
    this.recentRuns.set(run.test_id, buf);
  }

  /**
   * CI diff-gate — evaluates a batch of runs against the frozen baseline.
   * Returns the full breach report with hard/soft separation.
   */
  evaluate(
    runs: TestRun[],
    opts: {
      max_slowdown_ratio?: number;
      now?: number;
      flaky_min_runs?: number;
      flaky_threshold?: number;
    } = {},
  ): DiffGateReport {
    const max_slowdown = opts.max_slowdown_ratio ?? DEFAULT_MAX_SLOWDOWN;
    const now = opts.now ?? Date.now();
    const flaky_min = opts.flaky_min_runs ?? FLAKY_MIN_RUNS;
    const flaky_threshold = opts.flaky_threshold ?? FLAKY_FAIL_RATE_THRESHOLD;
    if (max_slowdown < 0) throw new Error("max_slowdown_ratio must be ≥0");
    if (flaky_threshold <= 0 || flaky_threshold > 1) {
      throw new Error("flaky_threshold must be in (0, 1]");
    }

    const hard: Breach[] = [];
    const soft: Breach[] = [];
    const seen = new Set<string>();
    for (const run of runs) {
      seen.add(run.test_id);
      this.recordRun(run);
      const base = this.baseline.get(run.test_id);
      if (!base) continue;      // captured as "new_tests" below
      const quarantined = this.isQuarantined(run.test_id, now);

      // RESULT_DIFF (hard, suppressed when quarantined)
      if (run.result_sha256.toLowerCase() !== base.expected_result_sha256) {
        const breach: Breach = {
          test_id: run.test_id,
          kind: "RESULT_DIFF",
          severity: quarantined ? "soft" : "hard",
          detail: `expected hash ${base.expected_result_sha256.slice(0, 12)}… got ${run.result_sha256.slice(0, 12).toLowerCase()}…`,
          observed: run.result_sha256,
          expected: base.expected_result_sha256,
        };
        (quarantined ? soft : hard).push(breach);
      }

      // TIMING_REGRESS (soft at 1×, hard at 2×)
      const slowdown_cap = base.baseline_p95_ms * (1 + max_slowdown);
      if (run.duration_ms > slowdown_cap) {
        const hard_cap = base.baseline_p95_ms * (1 + 2 * max_slowdown);
        soft.push({
          test_id: run.test_id,
          kind: "TIMING_REGRESS",
          severity: run.duration_ms > hard_cap ? "hard" : "soft",
          detail: `p95 ${run.duration_ms.toFixed(1)}ms exceeds ${slowdown_cap.toFixed(1)}ms (baseline ${base.baseline_p95_ms.toFixed(1)}ms)`,
          observed: run.duration_ms,
          expected: slowdown_cap,
        });
        if (run.duration_ms > hard_cap && !quarantined) {
          hard.push(soft[soft.length - 1]);
          soft.pop();
        }
      }
    }

    // FLAKY detection runs AFTER recordRun so latest run is included.
    for (const [test_id, buf] of this.recentRuns.entries()) {
      if (!this.baseline.has(test_id)) continue;
      if (buf.length < flaky_min) continue;
      const failCount = buf.filter((r) => !r.passed).length;
      const rate = failCount / buf.length;
      if (rate > flaky_threshold) {
        if (this.isQuarantined(test_id, now)) continue;
        hard.push({
          test_id,
          kind: "FLAKY",
          severity: "hard",
          detail: `fail rate ${(rate * 100).toFixed(2)}% over ${buf.length} runs — exceeds ${(flaky_threshold * 100).toFixed(2)}%, not quarantined`,
          observed: rate,
          expected: flaky_threshold,
        });
      }
    }

    const missing = Array.from(this.baseline.keys()).filter(
      (id) => !seen.has(id),
    );
    const new_tests = Array.from(seen).filter((id) => !this.baseline.has(id));
    return {
      runs_evaluated: runs.length,
      hard_breaches: hard,
      soft_breaches: soft,
      missing_tests: missing,
      new_tests,
      passed: hard.length === 0,
    };
  }

  /**
   * Compute the test's p95 over its recent-runs buffer (R-7 quantile).
   * Useful for refreshing baseline_p95_ms after intentional perf work.
   */
  observedP95(test_id: string): number | null {
    const buf = this.recentRuns.get(test_id);
    if (!buf || buf.length === 0) return null;
    const durations = buf.map((r) => r.duration_ms).sort((a, b) => a - b);
    const h = (durations.length - 1) * 0.95;
    const lo = Math.floor(h);
    const hi = Math.ceil(h);
    return lo === hi ? durations[lo] : durations[lo] + (h - lo) * (durations[hi] - durations[lo]);
  }

  toSnapshot(): {
    schemaVersion: 1;
    baseline: BaselineEntry[];
    quarantine: QuarantineEntry[];
  } {
    return {
      schemaVersion: 1,
      baseline: this.listBaseline(),
      quarantine: Array.from(this.quarantine.values()).map((q) => ({ ...q })),
    };
  }

  loadSnapshot(snap: {
    schemaVersion: number;
    baseline: BaselineEntry[];
    quarantine: QuarantineEntry[];
  }): void {
    if (snap.schemaVersion !== 1) {
      throw new Error(`unsupported schemaVersion ${snap.schemaVersion}`);
    }
    this.baseline.clear();
    this.quarantine.clear();
    this.recentRuns.clear();
    for (const e of snap.baseline) this.baseline.set(e.test_id, { ...e });
    for (const q of snap.quarantine) this.quarantine.set(q.test_id, { ...q });
  }

  clearAll(): void {
    this.baseline.clear();
    this.quarantine.clear();
    this.recentRuns.clear();
  }
}

export const regressionBaselineEngine = new RegressionBaselineEngine();
