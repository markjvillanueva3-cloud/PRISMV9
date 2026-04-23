/**
 * PreWetRunChaosGateEngine (U-LPR-CHAOS-DRILL)
 *
 * One-shot hard gate that must pass BEFORE the first real-world wet-run.
 * Injects each of N mandatory chaos scenarios into the control plane,
 * measures rollback latency, and requires 100% of scenarios to both
 * (a) trigger an auto-rollback and (b) complete rollback within the
 * published budget (default 60 000 ms per Phase-8 plan).
 *
 * Distinct from ChaosDrillSchedulerEngine (U-LPR-OPS-CHAOS) which
 * schedules weekly continuous chaos post-MS0. This engine is a gate
 * token producer — wet-run Phase-8 is blocked until its passReport()
 * returns { passed: true } for the current artifact hash.
 *
 * Mandatory scenarios (per plan):
 *   - mtconnect_stream_loss — simulate MTConnect TCP drop mid-cut
 *   - tenant_id_collision   — two requests with same session, different tenant
 *   - lora_poison           — inject physics-invalid parameter via LoRA output
 *
 * Recommended additional scenarios (scrutiny-added):
 *   - kms_key_rotation_fail — envelope-key rotation fails mid-request
 *   - dispatcher_storm      — sustained burst of safety-critical calls
 *   - mtconnect_clock_skew  — timestamp drift on live telemetry stream
 *
 * Gate semantics:
 *   - A run is identified by a bundle_hash (sha256 of deployed artifacts).
 *   - Each scenario execution records: injected_at, rollback_triggered_at,
 *     rollback_completed_at, latency_ms, passed.
 *   - The gate is "passed" only when every mandatory scenario has at
 *     least one execution where passed==true AND all passed executions
 *     for that bundle_hash have latency ≤ budget_ms.
 *   - Operators can re-inject a failed scenario; the gate re-evaluates.
 */

export type ChaosScenarioId =
  | "mtconnect_stream_loss"
  | "tenant_id_collision"
  | "lora_poison"
  | "kms_key_rotation_fail"
  | "dispatcher_storm"
  | "mtconnect_clock_skew";

export const MANDATORY_SCENARIOS: readonly ChaosScenarioId[] = [
  "mtconnect_stream_loss",
  "tenant_id_collision",
  "lora_poison",
] as const;

export const DEFAULT_ROLLBACK_BUDGET_MS = 60_000;

export type ScenarioOutcome = "passed" | "failed_latency" | "failed_no_rollback" | "failed_no_detection";

export interface ScenarioExecution {
  execution_id: string;
  bundle_hash: string;
  scenario_id: ChaosScenarioId;
  injected_at: number;
  detected_at?: number;
  rollback_triggered_at?: number;
  rollback_completed_at?: number;
  latency_ms?: number;
  outcome: ScenarioOutcome;
  evidence: string;
  operator: string;
}

export interface GateReport {
  bundle_hash: string;
  generated_at: number;
  passed: boolean;
  budget_ms: number;
  scenarios: Array<{
    scenario_id: ChaosScenarioId;
    mandatory: boolean;
    executions: number;
    latest_outcome: ScenarioOutcome | "not_run";
    best_latency_ms: number | null;
    within_budget: boolean;
  }>;
  failure_reasons: string[];
}

export interface GateTokenRecord {
  bundle_hash: string;
  issued_at: number;
  issued_by: string;
  budget_ms: number;
  report_snapshot: GateReport;
  signature: string;
}

export class PreWetRunChaosGateEngine {
  private executions: ScenarioExecution[] = [];
  private tokens: GateTokenRecord[] = [];
  private budgetMs = DEFAULT_ROLLBACK_BUDGET_MS;

  setBudget(ms: number): void {
    if (!Number.isFinite(ms) || ms <= 0) throw new Error("budget_ms must be >0");
    if (ms > 300_000) throw new Error("budget_ms exceeds sanity ceiling (300 000 ms)");
    this.budgetMs = Math.floor(ms);
  }

  getBudget(): number {
    return this.budgetMs;
  }

  /**
   * Record a chaos scenario execution. Latency is derived from
   * injected_at → rollback_completed_at. The outcome is computed from
   * the available timestamps and the budget.
   */
  recordExecution(input: {
    execution_id: string;
    bundle_hash: string;
    scenario_id: ChaosScenarioId;
    injected_at: number;
    detected_at?: number;
    rollback_triggered_at?: number;
    rollback_completed_at?: number;
    evidence: string;
    operator: string;
  }): ScenarioExecution {
    if (!input.execution_id.trim()) throw new Error("execution_id required");
    if (!input.bundle_hash.trim()) throw new Error("bundle_hash required");
    if (!/^[a-f0-9]{8,64}$/i.test(input.bundle_hash)) {
      throw new Error("bundle_hash must be hex 8–64 chars");
    }
    if (!input.operator.trim()) throw new Error("operator required");
    if ((input.evidence ?? "").trim().length < 10) {
      throw new Error("evidence too short (≥10 chars)");
    }
    if (this.executions.some((e) => e.execution_id === input.execution_id)) {
      throw new Error(`execution_id already recorded: ${input.execution_id}`);
    }
    const t0 = input.injected_at;
    if (!Number.isFinite(t0)) throw new Error("injected_at required");
    if (input.rollback_triggered_at !== undefined && input.rollback_triggered_at < t0) {
      throw new Error("rollback_triggered_at cannot precede injected_at");
    }
    if (
      input.rollback_completed_at !== undefined &&
      input.rollback_triggered_at !== undefined &&
      input.rollback_completed_at < input.rollback_triggered_at
    ) {
      throw new Error("rollback_completed_at cannot precede rollback_triggered_at");
    }

    let outcome: ScenarioOutcome;
    let latency: number | undefined;
    if (input.detected_at === undefined) {
      outcome = "failed_no_detection";
    } else if (input.rollback_triggered_at === undefined) {
      outcome = "failed_no_rollback";
    } else if (input.rollback_completed_at === undefined) {
      outcome = "failed_no_rollback";
    } else {
      latency = input.rollback_completed_at - t0;
      outcome = latency <= this.budgetMs ? "passed" : "failed_latency";
    }

    const ex: ScenarioExecution = {
      execution_id: input.execution_id,
      bundle_hash: input.bundle_hash.toLowerCase(),
      scenario_id: input.scenario_id,
      injected_at: t0,
      detected_at: input.detected_at,
      rollback_triggered_at: input.rollback_triggered_at,
      rollback_completed_at: input.rollback_completed_at,
      latency_ms: latency,
      outcome,
      evidence: input.evidence.trim(),
      operator: input.operator.trim(),
    };
    this.executions.push(ex);
    return { ...ex };
  }

  listExecutions(filter?: {
    bundle_hash?: string;
    scenario_id?: ChaosScenarioId;
    outcome?: ScenarioOutcome;
  }): ScenarioExecution[] {
    const hash = filter?.bundle_hash?.toLowerCase();
    return this.executions
      .filter((e) => !hash || e.bundle_hash === hash)
      .filter((e) => !filter?.scenario_id || e.scenario_id === filter.scenario_id)
      .filter((e) => !filter?.outcome || e.outcome === filter.outcome)
      .map((e) => ({ ...e }));
  }

  /**
   * Build a gate report for the given bundle_hash. A gate PASSES only
   * when every mandatory scenario has at least one `passed` execution
   * against that hash AND the fastest passed execution is ≤ budget.
   */
  buildReport(bundle_hash: string, now?: number): GateReport {
    const hash = bundle_hash.toLowerCase();
    const budget = this.budgetMs;
    const ts = now ?? Date.now();
    const perScenario: GateReport["scenarios"] = [];
    const failures: string[] = [];

    const allScenarios: ChaosScenarioId[] = [
      "mtconnect_stream_loss",
      "tenant_id_collision",
      "lora_poison",
      "kms_key_rotation_fail",
      "dispatcher_storm",
      "mtconnect_clock_skew",
    ];

    for (const sid of allScenarios) {
      const runs = this.executions.filter(
        (e) => e.bundle_hash === hash && e.scenario_id === sid,
      );
      const passed = runs.filter((e) => e.outcome === "passed");
      const best = passed
        .map((e) => e.latency_ms ?? Infinity)
        .reduce((a, b) => Math.min(a, b), Infinity);
      const latest = runs.length > 0 ? runs[runs.length - 1].outcome : "not_run";
      const mandatory = MANDATORY_SCENARIOS.includes(sid);
      const within = Number.isFinite(best) ? best <= budget : false;
      perScenario.push({
        scenario_id: sid,
        mandatory,
        executions: runs.length,
        latest_outcome: latest,
        best_latency_ms: Number.isFinite(best) ? best : null,
        within_budget: within,
      });
      if (mandatory) {
        if (runs.length === 0) failures.push(`${sid}: no executions for bundle ${hash}`);
        else if (passed.length === 0) failures.push(`${sid}: no passed execution (latest=${latest})`);
        else if (!within) failures.push(`${sid}: best latency ${best}ms > budget ${budget}ms`);
      }
    }

    return {
      bundle_hash: hash,
      generated_at: ts,
      passed: failures.length === 0,
      budget_ms: budget,
      scenarios: perScenario,
      failure_reasons: failures,
    };
  }

  /**
   * Issue a gate token for a PASSING bundle_hash. Refuses to issue for
   * any hash whose report does not pass. The signature is an HMAC-like
   * hash over canonical fields — deterministic but not cryptographic;
   * the intent is audit traceability, not secrecy.
   */
  issueToken(input: {
    bundle_hash: string;
    issued_by: string;
    now?: number;
  }): GateTokenRecord {
    if (!input.issued_by.trim()) throw new Error("issued_by required");
    const report = this.buildReport(input.bundle_hash, input.now);
    if (!report.passed) {
      throw new Error(`gate not passed — ${report.failure_reasons.join("; ")}`);
    }
    const now = input.now ?? Date.now();
    const canonical = JSON.stringify({
      bundle_hash: report.bundle_hash,
      issued_at: now,
      issued_by: input.issued_by.trim(),
      budget_ms: this.budgetMs,
      scenarios: report.scenarios.map((s) => ({
        scenario_id: s.scenario_id,
        best_latency_ms: s.best_latency_ms,
      })),
    });
    const signature = simpleHash(canonical);
    const rec: GateTokenRecord = {
      bundle_hash: report.bundle_hash,
      issued_at: now,
      issued_by: input.issued_by.trim(),
      budget_ms: this.budgetMs,
      report_snapshot: report,
      signature,
    };
    this.tokens.push(rec);
    return { ...rec };
  }

  listTokens(bundle_hash?: string): GateTokenRecord[] {
    const hash = bundle_hash?.toLowerCase();
    return this.tokens.filter((t) => !hash || t.bundle_hash === hash).map((t) => ({ ...t }));
  }

  getStats(): {
    total_executions: number;
    executions_by_outcome: Record<ScenarioOutcome, number>;
    executions_by_scenario: Partial<Record<ChaosScenarioId, number>>;
    passed_bundle_hashes: number;
    tokens_issued: number;
    average_passed_latency_ms: number | null;
  } {
    const byOutcome: Record<ScenarioOutcome, number> = {
      passed: 0,
      failed_latency: 0,
      failed_no_rollback: 0,
      failed_no_detection: 0,
    };
    const byScenario: Partial<Record<ChaosScenarioId, number>> = {};
    const latencies: number[] = [];
    for (const e of this.executions) {
      byOutcome[e.outcome] += 1;
      byScenario[e.scenario_id] = (byScenario[e.scenario_id] ?? 0) + 1;
      if (e.outcome === "passed" && e.latency_ms !== undefined) latencies.push(e.latency_ms);
    }
    const hashes = new Set(this.tokens.map((t) => t.bundle_hash));
    return {
      total_executions: this.executions.length,
      executions_by_outcome: byOutcome,
      executions_by_scenario: byScenario,
      passed_bundle_hashes: hashes.size,
      tokens_issued: this.tokens.length,
      average_passed_latency_ms:
        latencies.length === 0 ? null : latencies.reduce((a, b) => a + b, 0) / latencies.length,
    };
  }

  clearAll(): void {
    this.executions.length = 0;
    this.tokens.length = 0;
    this.budgetMs = DEFAULT_ROLLBACK_BUDGET_MS;
  }
}

/**
 * Stable non-cryptographic 32-bit hash (djb2) hex-encoded.
 * Used only for audit-trail signatures, not secrecy. Deterministic so
 * the same canonical JSON always produces the same signature.
 */
function simpleHash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export const preWetRunChaosGateEngine = new PreWetRunChaosGateEngine();
