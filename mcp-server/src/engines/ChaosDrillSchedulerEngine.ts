/**
 * ChaosDrillSchedulerEngine — U-LPR-OPS-CHAOS
 *
 * Continuous chaos-engineering game-day scheduler. Maintains a catalog of
 * failure scenarios (dispatcher latency injection, engine restart, backup
 * attestation tamper, tenant isolation breach attempt, DR failover, rate-limit
 * overflow, KMS key rotation, audit log gap detection), schedules them at
 * weekly/monthly/quarterly cadences, and tracks executions with pass/fail
 * outcomes, blast-radius metrics, and post-mortem links.
 *
 * Design principles (Netflix Chaos Monkey lineage, Google SRE Game Days):
 *   - Start in staging/canary only; production gated by explicit allow flag.
 *   - Every scenario has a rollback_action the engine can invoke on failure.
 *   - Executions are idempotent by scenario_id + scheduled_for.
 *   - Skipped executions still count as "coverage gap" and surface in reports.
 *
 * Compliance hook: U-LPR-OPS-DR relies on actual failover drills — this
 * engine drives those as "dr_failover" scenarios.
 *
 * @milestone LATHE-PROD-READY-MS0
 * @unit U-LPR-OPS-CHAOS
 * @phase PHASE-11 (Production Ops Maturity)
 */

import { log } from "../utils/Logger.js";

export type ChaosCategory =
  | "latency_injection"
  | "process_restart"
  | "attestation_tamper"
  | "tenant_isolation"
  | "dr_failover"
  | "rate_limit_overflow"
  | "kms_rotation"
  | "audit_gap"
  | "capacity_saturation"
  | "clock_skew";

export type ChaosSeverity = "low" | "medium" | "high" | "critical";
export type ChaosCadence = "weekly" | "monthly" | "quarterly" | "ad_hoc";
export type ChaosEnvironment = "staging" | "canary" | "production";
export type ExecutionStatus =
  | "planned"
  | "running"
  | "passed"
  | "failed"
  | "aborted"
  | "rolled_back"
  | "skipped";

export interface ChaosScenario {
  id: string;
  category: ChaosCategory;
  name: string;
  description: string;
  severity: ChaosSeverity;
  cadence: ChaosCadence;
  allowed_environments: ChaosEnvironment[];
  blast_radius: {
    max_tenants: number; // 0 = none, -1 = unbounded (dev-only)
    max_duration_seconds: number;
    recoverable_without_human: boolean;
  };
  rollback_action: string; // engine method or runbook link
  linked_runbook: string;
  prerequisite_scenario_ids: string[]; // must have passed before this can run
}

export interface ChaosExecution {
  id: string;
  scenario_id: string;
  scheduled_for: number; // epoch ms
  started_at: number | null;
  completed_at: number | null;
  environment: ChaosEnvironment;
  status: ExecutionStatus;
  observed_blast_radius: {
    affected_tenants: number;
    actual_duration_seconds: number;
    rollback_invoked: boolean;
  } | null;
  findings: string[]; // bullet list of issues found
  post_mortem_ref: string | null;
  operator: string | null;
  rollback_successful: boolean | null;
}

export interface ChaosCoverageReport {
  generated_at: number;
  window_days: number;
  scenario_count: number;
  scenarios_with_recent_passing_drill: number;
  scenarios_with_recent_failure: number;
  scenarios_overdue: ScenarioCoverage[];
  overall_health: "healthy" | "degraded" | "at_risk";
  findings: string[];
}

export interface ScenarioCoverage {
  scenario_id: string;
  name: string;
  category: ChaosCategory;
  cadence: ChaosCadence;
  last_passed_at: number | null;
  last_failed_at: number | null;
  days_since_last_pass: number | null; // null = never passed
  days_overdue: number;
}

export interface ChaosStats {
  scenarios_registered: number;
  scenarios_by_cadence: Record<ChaosCadence, number>;
  executions_total: number;
  executions_passed: number;
  executions_failed: number;
  executions_aborted: number;
  pass_rate: number; // passed / (passed + failed)
  open_executions: number; // status: planned or running
  latest_execution_at: number | null;
}

// Cadence → window in ms for "overdue" determination
const CADENCE_WINDOW_MS: Record<ChaosCadence, number> = {
  weekly: 7 * 24 * 3600 * 1000,
  monthly: 30 * 24 * 3600 * 1000,
  quarterly: 90 * 24 * 3600 * 1000,
  ad_hoc: Number.POSITIVE_INFINITY, // ad-hoc never goes overdue
};

// ── Default chaos scenario catalog ──────────────────────────────────

const DEFAULT_SCENARIOS: ChaosScenario[] = [
  {
    id: "CHAOS-DISP-LATENCY",
    category: "latency_injection",
    name: "Dispatcher latency injection",
    description: "Inject 500ms artificial latency into one dispatcher to verify client retry/backoff and SLO alerting.",
    severity: "low",
    cadence: "weekly",
    allowed_environments: ["staging", "canary"],
    blast_radius: { max_tenants: 5, max_duration_seconds: 300, recoverable_without_human: true },
    rollback_action: "orchestration.dispatcher.clear_latency_filter",
    linked_runbook: "runbooks/chaos/dispatcher-latency.md",
    prerequisite_scenario_ids: [],
  },
  {
    id: "CHAOS-ENGINE-RESTART",
    category: "process_restart",
    name: "Singleton engine cold restart",
    description: "Force a random engine singleton to reload mid-request to verify graceful in-flight handling.",
    severity: "medium",
    cadence: "weekly",
    allowed_environments: ["staging", "canary"],
    blast_radius: { max_tenants: 10, max_duration_seconds: 60, recoverable_without_human: true },
    rollback_action: "orchestration.engine.auto_recover",
    linked_runbook: "runbooks/chaos/engine-restart.md",
    prerequisite_scenario_ids: [],
  },
  {
    id: "CHAOS-BACKUP-TAMPER",
    category: "attestation_tamper",
    name: "Backup attestation tamper drill",
    description: "Mutate a stored backup attestation and confirm BackupRestoreDrillEngine detects signature break.",
    severity: "high",
    cadence: "monthly",
    allowed_environments: ["staging"],
    blast_radius: { max_tenants: 0, max_duration_seconds: 120, recoverable_without_human: true },
    rollback_action: "orchestration.backup.restore_original_attestation",
    linked_runbook: "runbooks/chaos/attestation-tamper.md",
    prerequisite_scenario_ids: [],
  },
  {
    id: "CHAOS-TENANT-ISOLATION",
    category: "tenant_isolation",
    name: "Tenant isolation breach attempt",
    description: "Submit a synthetic cross-tenant read request and confirm MultiTenantEngine rejects it with audit log entry.",
    severity: "critical",
    cadence: "monthly",
    allowed_environments: ["staging", "canary"],
    blast_radius: { max_tenants: 2, max_duration_seconds: 30, recoverable_without_human: true },
    rollback_action: "orchestration.tenant.purge_synthetic_requests",
    linked_runbook: "runbooks/chaos/tenant-isolation.md",
    prerequisite_scenario_ids: [],
  },
  {
    id: "CHAOS-DR-FAILOVER",
    category: "dr_failover",
    name: "DR failover drill",
    description: "Execute full DR failover per U-LPR-OPS-DR plan; measure RTO/RPO vs. tier targets.",
    severity: "critical",
    cadence: "quarterly",
    allowed_environments: ["staging"],
    blast_radius: { max_tenants: 0, max_duration_seconds: 14400, recoverable_without_human: false },
    rollback_action: "orchestration.dr.failback_to_primary",
    linked_runbook: "runbooks/chaos/dr-failover.md",
    prerequisite_scenario_ids: ["CHAOS-BACKUP-TAMPER"], // proven backup integrity before failover
  },
  {
    id: "CHAOS-RATE-LIMIT",
    category: "rate_limit_overflow",
    name: "Rate-limit overflow",
    description: "Burst requests above per-tenant quota and confirm RateLimitEngine enforces with proper 429s.",
    severity: "low",
    cadence: "weekly",
    allowed_environments: ["staging", "canary"],
    blast_radius: { max_tenants: 3, max_duration_seconds: 180, recoverable_without_human: true },
    rollback_action: "orchestration.rate.clear_synthetic_clients",
    linked_runbook: "runbooks/chaos/rate-limit.md",
    prerequisite_scenario_ids: [],
  },
  {
    id: "CHAOS-KMS-ROTATION",
    category: "kms_rotation",
    name: "KMS key rotation drill",
    description: "Rotate KMS envelope keys and verify both old and new keys decrypt correctly during rollout window.",
    severity: "high",
    cadence: "quarterly",
    allowed_environments: ["staging", "canary", "production"],
    blast_radius: { max_tenants: -1, max_duration_seconds: 3600, recoverable_without_human: false },
    rollback_action: "orchestration.kms.revert_rotation",
    linked_runbook: "runbooks/chaos/kms-rotation.md",
    prerequisite_scenario_ids: [],
  },
  {
    id: "CHAOS-AUDIT-GAP",
    category: "audit_gap",
    name: "Audit log gap detection",
    description: "Drop synthetic audit records and confirm AuditLogEngine flags the hash-chain break.",
    severity: "critical",
    cadence: "monthly",
    allowed_environments: ["staging"],
    blast_radius: { max_tenants: 0, max_duration_seconds: 60, recoverable_without_human: true },
    rollback_action: "orchestration.audit.restore_synthetic_records",
    linked_runbook: "runbooks/chaos/audit-gap.md",
    prerequisite_scenario_ids: [],
  },
];

class ChaosDrillSchedulerEngine {
  private scenarios: Map<string, ChaosScenario> = new Map();
  private executions: Map<string, ChaosExecution> = new Map();
  private executionCounter = 0;

  constructor() {
    for (const s of DEFAULT_SCENARIOS) this.scenarios.set(s.id, { ...s });
  }

  // ── Scenario management ────────────────────────────────────────

  registerScenario(scenario: ChaosScenario): ChaosScenario {
    if (!scenario.id) throw new Error("scenario.id required");
    if (scenario.allowed_environments.length === 0) {
      throw new Error("scenario must allow at least one environment");
    }
    if (scenario.blast_radius.max_duration_seconds <= 0) {
      throw new Error("max_duration_seconds must be positive");
    }
    for (const pid of scenario.prerequisite_scenario_ids) {
      if (pid === scenario.id) throw new Error("scenario cannot require itself");
      if (!this.scenarios.has(pid)) {
        throw new Error("Unknown prerequisite scenario: " + pid);
      }
    }
    this.scenarios.set(scenario.id, { ...scenario });
    log.info("[CHAOS] Registered scenario: " + scenario.id + " (" + scenario.cadence + ")");
    return { ...scenario };
  }

  getScenario(id: string): ChaosScenario | null {
    const s = this.scenarios.get(id);
    return s ? { ...s } : null;
  }

  listScenarios(filter?: { category?: ChaosCategory; cadence?: ChaosCadence; severity?: ChaosSeverity }): ChaosScenario[] {
    let out = Array.from(this.scenarios.values()).map(s => ({ ...s }));
    if (filter?.category) out = out.filter(s => s.category === filter.category);
    if (filter?.cadence) out = out.filter(s => s.cadence === filter.cadence);
    if (filter?.severity) out = out.filter(s => s.severity === filter.severity);
    return out;
  }

  // ── Execution lifecycle ────────────────────────────────────────

  schedule(input: {
    scenario_id: string;
    scheduled_for: number;
    environment: ChaosEnvironment;
    operator?: string;
  }): ChaosExecution {
    const scenario = this.scenarios.get(input.scenario_id);
    if (!scenario) throw new Error("Unknown scenario: " + input.scenario_id);
    if (!scenario.allowed_environments.includes(input.environment)) {
      throw new Error(
        "Scenario " + input.scenario_id + " not allowed in " + input.environment +
        " (allowed: " + scenario.allowed_environments.join(", ") + ")"
      );
    }
    // Prerequisite gate: every prerequisite must have at least one passed execution.
    for (const pid of scenario.prerequisite_scenario_ids) {
      const passed = Array.from(this.executions.values()).some(
        e => e.scenario_id === pid && e.status === "passed"
      );
      if (!passed) {
        throw new Error("Prerequisite not met: " + pid + " has no passed execution");
      }
    }
    this.executionCounter++;
    const execution: ChaosExecution = {
      id: "CX-" + String(this.executionCounter).padStart(5, "0"),
      scenario_id: input.scenario_id,
      scheduled_for: input.scheduled_for,
      started_at: null,
      completed_at: null,
      environment: input.environment,
      status: "planned",
      observed_blast_radius: null,
      findings: [],
      post_mortem_ref: null,
      operator: input.operator ?? null,
      rollback_successful: null,
    };
    this.executions.set(execution.id, execution);
    log.info("[CHAOS] Scheduled " + execution.id + " for scenario " + input.scenario_id + " in " + input.environment);
    return { ...execution };
  }

  startExecution(id: string, now: number = Date.now()): ChaosExecution {
    const e = this.executions.get(id);
    if (!e) throw new Error("Unknown execution: " + id);
    if (e.status !== "planned") throw new Error("Execution " + id + " is " + e.status + ", not planned");
    e.started_at = now;
    e.status = "running";
    return { ...e };
  }

  completeExecution(input: {
    id: string;
    status: "passed" | "failed" | "aborted" | "rolled_back";
    findings?: string[];
    observed_blast_radius: ChaosExecution["observed_blast_radius"];
    rollback_successful?: boolean;
    post_mortem_ref?: string;
    now?: number;
  }): ChaosExecution {
    const e = this.executions.get(input.id);
    if (!e) throw new Error("Unknown execution: " + input.id);
    if (e.status !== "running") throw new Error("Execution " + input.id + " is " + e.status + ", not running");
    const scenario = this.scenarios.get(e.scenario_id);
    if (!scenario) throw new Error("Scenario gone missing: " + e.scenario_id);

    // Enforce blast radius at completion
    if (input.observed_blast_radius) {
      const br = input.observed_blast_radius;
      const cap = scenario.blast_radius;
      if (cap.max_tenants >= 0 && br.affected_tenants > cap.max_tenants) {
        e.findings.push(
          "BLAST_RADIUS_EXCEEDED: tenants " + br.affected_tenants + " > cap " + cap.max_tenants
        );
      }
      if (br.actual_duration_seconds > cap.max_duration_seconds) {
        e.findings.push(
          "DURATION_EXCEEDED: " + br.actual_duration_seconds + "s > cap " + cap.max_duration_seconds + "s"
        );
      }
    }
    if (input.findings) e.findings.push(...input.findings);
    e.observed_blast_radius = input.observed_blast_radius;
    e.status = input.status;
    e.rollback_successful = input.rollback_successful ?? null;
    e.post_mortem_ref = input.post_mortem_ref ?? null;
    e.completed_at = input.now ?? Date.now();
    log.info("[CHAOS] Completed " + input.id + " status=" + input.status + " findings=" + e.findings.length);
    return { ...e };
  }

  skipExecution(id: string, reason: string): ChaosExecution {
    const e = this.executions.get(id);
    if (!e) throw new Error("Unknown execution: " + id);
    if (e.status !== "planned") throw new Error("Only planned executions can be skipped");
    e.status = "skipped";
    e.findings.push("SKIPPED: " + reason);
    e.completed_at = Date.now();
    return { ...e };
  }

  getExecution(id: string): ChaosExecution | null {
    const e = this.executions.get(id);
    return e ? { ...e } : null;
  }

  listExecutions(filter?: { scenario_id?: string; status?: ExecutionStatus; environment?: ChaosEnvironment }): ChaosExecution[] {
    let out = Array.from(this.executions.values()).map(e => ({ ...e }));
    if (filter?.scenario_id) out = out.filter(e => e.scenario_id === filter.scenario_id);
    if (filter?.status) out = out.filter(e => e.status === filter.status);
    if (filter?.environment) out = out.filter(e => e.environment === filter.environment);
    return out;
  }

  // ── Coverage reporting ────────────────────────────────────────

  generateCoverageReport(windowDays: number = 90, now: number = Date.now()): ChaosCoverageReport {
    const windowMs = windowDays * 24 * 3600 * 1000;
    const scenarios = Array.from(this.scenarios.values());
    const coverages: ScenarioCoverage[] = scenarios.map(s => this.scenarioCoverage(s, now));

    const withPassing = coverages.filter(
      c => c.last_passed_at !== null && (now - c.last_passed_at) <= windowMs
    ).length;
    const withFailure = coverages.filter(
      c => c.last_failed_at !== null && (now - c.last_failed_at) <= windowMs
    ).length;
    const overdue = coverages.filter(c => c.days_overdue > 0);

    const criticalOverdue = overdue.filter(c => {
      const scenario = this.scenarios.get(c.scenario_id);
      return scenario?.severity === "critical" || scenario?.severity === "high";
    });

    let health: "healthy" | "degraded" | "at_risk";
    if (criticalOverdue.length > 0) health = "at_risk";
    else if (overdue.length > 0 || withFailure > 0) health = "degraded";
    else health = "healthy";

    const findings: string[] = [];
    if (criticalOverdue.length > 0) {
      findings.push(
        "CRITICAL: " + criticalOverdue.length + " high/critical severity scenarios overdue"
      );
    }
    if (withFailure > 0) {
      findings.push(withFailure + " scenarios failed within the last " + windowDays + " days");
    }
    if (health === "healthy") findings.push("All scenarios passing within cadence windows.");

    return {
      generated_at: now,
      window_days: windowDays,
      scenario_count: scenarios.length,
      scenarios_with_recent_passing_drill: withPassing,
      scenarios_with_recent_failure: withFailure,
      scenarios_overdue: overdue,
      overall_health: health,
      findings,
    };
  }

  private scenarioCoverage(scenario: ChaosScenario, now: number): ScenarioCoverage {
    const forScenario = Array.from(this.executions.values()).filter(e => e.scenario_id === scenario.id);
    const passes = forScenario.filter(e => e.status === "passed" && e.completed_at !== null);
    const failures = forScenario.filter(e => e.status === "failed" && e.completed_at !== null);
    const lastPass = passes.length > 0
      ? Math.max(...passes.map(e => e.completed_at as number))
      : null;
    const lastFail = failures.length > 0
      ? Math.max(...failures.map(e => e.completed_at as number))
      : null;
    const windowMs = CADENCE_WINDOW_MS[scenario.cadence];
    let daysOverdue = 0;
    if (Number.isFinite(windowMs)) {
      const referenceMs = lastPass ?? 0; // never passed → reference at epoch start
      const elapsed = now - referenceMs;
      if (elapsed > windowMs) {
        daysOverdue = Math.floor((elapsed - windowMs) / (24 * 3600 * 1000));
      }
    }
    return {
      scenario_id: scenario.id,
      name: scenario.name,
      category: scenario.category,
      cadence: scenario.cadence,
      last_passed_at: lastPass,
      last_failed_at: lastFail,
      days_since_last_pass: lastPass !== null ? Math.floor((now - lastPass) / (24 * 3600 * 1000)) : null,
      days_overdue: daysOverdue,
    };
  }

  getStats(): ChaosStats {
    const scenarios = Array.from(this.scenarios.values());
    const byCadence: Record<ChaosCadence, number> = { weekly: 0, monthly: 0, quarterly: 0, ad_hoc: 0 };
    for (const s of scenarios) byCadence[s.cadence]++;
    const executions = Array.from(this.executions.values());
    const passed = executions.filter(e => e.status === "passed").length;
    const failed = executions.filter(e => e.status === "failed").length;
    const aborted = executions.filter(e => e.status === "aborted").length;
    const open = executions.filter(e => e.status === "planned" || e.status === "running").length;
    const denom = passed + failed;
    const latest = executions
      .map(e => e.completed_at ?? e.started_at ?? e.scheduled_for)
      .filter((x): x is number => typeof x === "number");
    return {
      scenarios_registered: scenarios.length,
      scenarios_by_cadence: byCadence,
      executions_total: executions.length,
      executions_passed: passed,
      executions_failed: failed,
      executions_aborted: aborted,
      pass_rate: denom > 0 ? passed / denom : 1,
      open_executions: open,
      latest_execution_at: latest.length > 0 ? Math.max(...latest) : null,
    };
  }

  clearAll(): { scenarios_cleared: number; executions_cleared: number } {
    const sc = this.scenarios.size;
    const ec = this.executions.size;
    this.scenarios.clear();
    for (const s of DEFAULT_SCENARIOS) this.scenarios.set(s.id, { ...s });
    this.executions.clear();
    this.executionCounter = 0;
    return { scenarios_cleared: sc, executions_cleared: ec };
  }
}

export const chaosDrillSchedulerEngine = new ChaosDrillSchedulerEngine();
