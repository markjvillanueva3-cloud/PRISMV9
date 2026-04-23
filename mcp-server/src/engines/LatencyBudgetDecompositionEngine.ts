/**
 * LatencyBudgetDecompositionEngine — U-LPR-PERF-SLO
 *
 * End-to-end latency SLO decomposition: splits the 2.5s p95 total budget
 * across 7 pipeline stages, records per-stage observed latencies, computes
 * per-stage p50/p95/p99 via R-7 (Hyndman-Fan Type 7) quantile, and detects
 * per-stage and aggregate breaches. Implements fast-burn (2 %/hr) and
 * slow-burn (10 %/6hr) error-budget alert criteria per Google SRE workbook.
 *
 * Stage budgets (p95 envelope, per roadmap Perf B1 + B2):
 *   OCR                   ≤300 ms
 *   CAD feature extract   ≤200 ms
 *   Tribal vector-kNN     ≤ 80 ms
 *   LoRA inference        ≤1500 ms (TTFT ≤400 ms if streaming)
 *   Physics validation    ≤150 ms
 *   G-code + dialect      ≤200 ms
 *   Sim gateway enqueue   ≤ 50 ms
 *   ───────────────────────────────
 *   Sum                   ≤2480 ms (500 ms slack vs 2.5s target)
 *
 * LoRA alt-deployment profile (GPU server async queue) relaxes the LoRA
 * budget to p95 ≤800 ms batch=1 — kept as a named alternative profile
 * selectable by operator policy, never auto-switched.
 *
 * Error-budget math (28-day rolling window, SLO 99.5 %):
 *   budget_ratio = 1 − SLO = 0.005
 *   actual_bad_ratio = breaches / observations
 *   burn_rate = actual_bad_ratio / budget_ratio
 *   fast_burn alert: burn_rate > 14.4 over 1h AND 1h error rate > budget_ratio
 *     (consumes 2 % of 28-day budget in 1 hour, per Google SRE workbook §4)
 *   slow_burn alert: burn_rate > 6   over 6h AND 6h error rate > budget_ratio
 *     (consumes 10 % of 28-day budget in 6 hours)
 *
 * @milestone LATHE-PROD-READY-MS0
 * @unit U-LPR-PERF-SLO
 * @phase PHASE-10 (Observability + SLO)
 */

import { log } from "../utils/Logger.js";

export type StageId =
  | "ocr"
  | "cad_feature"
  | "tribal_knn"
  | "lora_inference"
  | "physics_validation"
  | "gcode_dialect"
  | "sim_enqueue";

export type DeploymentProfile = "local_gpu" | "server_async";
export type BurnSeverity = "none" | "slow" | "fast" | "both";

export interface StageBudget {
  stage: StageId;
  p95_budget_ms: number;
  ttft_budget_ms: number | null; // time-to-first-token for streaming stages (LoRA only)
  profile: DeploymentProfile;
}

export interface StageObservation {
  id: string;
  stage: StageId;
  profile: DeploymentProfile;
  latency_ms: number;
  ttft_ms: number | null;
  observed_at: number;
  trace_id: string | null;
}

export interface StageStats {
  stage: StageId;
  profile: DeploymentProfile;
  budget_ms: number;
  count: number;
  p50_ms: number;
  p95_ms: number;
  p99_ms: number;
  max_ms: number;
  breaches: number;
  breach_ratio: number;
  ttft_p95_ms: number | null;
  ttft_budget_ms: number | null;
  ttft_breaches: number;
}

export interface EndToEndStats {
  generated_at: number;
  profile: DeploymentProfile;
  stage_stats: StageStats[];
  aggregate_budget_ms: number;
  aggregate_observed_p95_ms: number; // sum of per-stage p95s (conservative composition)
  slack_ms: number; // 2500 − aggregate_observed_p95_ms
  overall_status: "healthy" | "at_risk" | "breached";
}

export interface BurnRateAlert {
  generated_at: number;
  profile: DeploymentProfile;
  window_label: string; // "1h" | "6h"
  window_duration_minutes: number;
  observations: number;
  breaches: number;
  actual_bad_ratio: number;
  burn_rate: number;
  severity: BurnSeverity;
  triggered: boolean;
  threshold_burn_rate: number;
}

export interface BudgetComplianceReport {
  generated_at: number;
  profile: DeploymentProfile;
  slo: number;
  budget_ratio: number;
  observations_28d: number;
  breaches_28d: number;
  remaining_budget_ratio: number;
  e2e: EndToEndStats;
  fast_burn: BurnRateAlert;
  slow_burn: BurnRateAlert;
  findings: string[];
}

export interface LatencyBudgetStats {
  profiles_registered: number;
  observations_total: number;
  observations_by_stage: Record<StageId, number>;
  breaches_total: number;
}

// Per Google SRE Workbook §4 (Alerting on SLOs)
const FAST_BURN_THRESHOLD = 14.4; // 2 %/hr over 28d window
const SLOW_BURN_THRESHOLD = 6.0; //  10 %/6hr
const DEFAULT_SLO = 0.995;
const DEFAULT_WINDOW_28D_MS = 28 * 24 * 3600 * 1000;
const HOUR_MS = 3600 * 1000;

// Default profiles — local GPU is the primary target; server_async is fallback.
const DEFAULT_LOCAL_GPU: StageBudget[] = [
  { stage: "ocr",                p95_budget_ms:  300, ttft_budget_ms: null, profile: "local_gpu" },
  { stage: "cad_feature",        p95_budget_ms:  200, ttft_budget_ms: null, profile: "local_gpu" },
  { stage: "tribal_knn",         p95_budget_ms:   80, ttft_budget_ms: null, profile: "local_gpu" },
  { stage: "lora_inference",     p95_budget_ms: 1500, ttft_budget_ms: 400,  profile: "local_gpu" },
  { stage: "physics_validation", p95_budget_ms:  150, ttft_budget_ms: null, profile: "local_gpu" },
  { stage: "gcode_dialect",      p95_budget_ms:  200, ttft_budget_ms: null, profile: "local_gpu" },
  { stage: "sim_enqueue",        p95_budget_ms:   50, ttft_budget_ms: null, profile: "local_gpu" },
];

const DEFAULT_SERVER_ASYNC: StageBudget[] = [
  { stage: "ocr",                p95_budget_ms:  300, ttft_budget_ms: null, profile: "server_async" },
  { stage: "cad_feature",        p95_budget_ms:  200, ttft_budget_ms: null, profile: "server_async" },
  { stage: "tribal_knn",         p95_budget_ms:   80, ttft_budget_ms: null, profile: "server_async" },
  { stage: "lora_inference",     p95_budget_ms:  800, ttft_budget_ms: null, profile: "server_async" },
  { stage: "physics_validation", p95_budget_ms:  150, ttft_budget_ms: null, profile: "server_async" },
  { stage: "gcode_dialect",      p95_budget_ms:  200, ttft_budget_ms: null, profile: "server_async" },
  { stage: "sim_enqueue",        p95_budget_ms:   50, ttft_budget_ms: null, profile: "server_async" },
];

const AGGREGATE_TARGET_MS = 2500;

/**
 * Compute quantile using R-7 (Hyndman-Fan Type 7, numpy default).
 *   h = (n − 1) * q;   floor+ceil linear interpolation.
 */
function quantileR7(sortedValues: number[], q: number): number {
  if (sortedValues.length === 0) return 0;
  if (sortedValues.length === 1) return sortedValues[0];
  if (q <= 0) return sortedValues[0];
  if (q >= 1) return sortedValues[sortedValues.length - 1];
  const h = (sortedValues.length - 1) * q;
  const lo = Math.floor(h);
  const hi = Math.ceil(h);
  if (lo === hi) return sortedValues[lo];
  return sortedValues[lo] + (h - lo) * (sortedValues[hi] - sortedValues[lo]);
}

class LatencyBudgetDecompositionEngine {
  private budgets: Map<string, StageBudget> = new Map(); // key: `${profile}:${stage}`
  private observations: StageObservation[] = [];
  private observationCounter = 0;

  constructor() {
    for (const b of [...DEFAULT_LOCAL_GPU, ...DEFAULT_SERVER_ASYNC]) {
      this.budgets.set(this.keyFor(b.profile, b.stage), { ...b });
    }
  }

  private keyFor(profile: DeploymentProfile, stage: StageId): string {
    return profile + ":" + stage;
  }

  // ── Budget management ────────────────────────────────────────

  setBudget(budget: StageBudget): StageBudget {
    if (budget.p95_budget_ms <= 0) throw new Error("p95_budget_ms must be positive");
    if (budget.ttft_budget_ms !== null && budget.ttft_budget_ms <= 0) {
      throw new Error("ttft_budget_ms must be positive or null");
    }
    if (budget.ttft_budget_ms !== null && budget.ttft_budget_ms >= budget.p95_budget_ms) {
      throw new Error("ttft_budget_ms must be strictly less than p95_budget_ms");
    }
    this.budgets.set(this.keyFor(budget.profile, budget.stage), { ...budget });
    log.info("[PERF-SLO] Set budget " + budget.profile + "/" + budget.stage + " p95=" + budget.p95_budget_ms + "ms");
    return { ...budget };
  }

  getBudget(profile: DeploymentProfile, stage: StageId): StageBudget | null {
    const b = this.budgets.get(this.keyFor(profile, stage));
    return b ? { ...b } : null;
  }

  listBudgets(profile?: DeploymentProfile): StageBudget[] {
    let out = Array.from(this.budgets.values()).map(b => ({ ...b }));
    if (profile) out = out.filter(b => b.profile === profile);
    return out;
  }

  /** Aggregate budget for a profile — sum of all stage p95 budgets. */
  aggregateBudget(profile: DeploymentProfile): number {
    return this.listBudgets(profile).reduce((s, b) => s + b.p95_budget_ms, 0);
  }

  /** Validate that a profile's budget sums under the 2500ms aggregate target. */
  validateProfileBudget(profile: DeploymentProfile): { valid: boolean; total_ms: number; slack_ms: number; reason: string | null } {
    const total = this.aggregateBudget(profile);
    const slack = AGGREGATE_TARGET_MS - total;
    if (total > AGGREGATE_TARGET_MS) {
      return {
        valid: false,
        total_ms: total,
        slack_ms: slack,
        reason: "Profile sum " + total + "ms exceeds " + AGGREGATE_TARGET_MS + "ms aggregate target",
      };
    }
    return { valid: true, total_ms: total, slack_ms: slack, reason: null };
  }

  // ── Observations ────────────────────────────────────────────

  recordObservation(input: {
    stage: StageId;
    profile: DeploymentProfile;
    latency_ms: number;
    ttft_ms?: number | null;
    observed_at?: number;
    trace_id?: string | null;
  }): StageObservation {
    if (input.latency_ms < 0) throw new Error("latency_ms must be non-negative");
    if (typeof input.ttft_ms === "number" && input.ttft_ms < 0) {
      throw new Error("ttft_ms must be non-negative or null");
    }
    const budget = this.getBudget(input.profile, input.stage);
    if (!budget) {
      throw new Error("No budget registered for " + input.profile + "/" + input.stage);
    }
    if (typeof input.ttft_ms === "number" && budget.ttft_budget_ms === null) {
      throw new Error("Stage " + input.stage + " has no TTFT budget; cannot record ttft_ms");
    }
    this.observationCounter++;
    const obs: StageObservation = {
      id: "OBS-" + String(this.observationCounter).padStart(8, "0"),
      stage: input.stage,
      profile: input.profile,
      latency_ms: input.latency_ms,
      ttft_ms: input.ttft_ms ?? null,
      observed_at: input.observed_at ?? Date.now(),
      trace_id: input.trace_id ?? null,
    };
    this.observations.push(obs);
    return { ...obs };
  }

  listObservations(filter?: { stage?: StageId; profile?: DeploymentProfile; since?: number; limit?: number }): StageObservation[] {
    let out = this.observations.map(o => ({ ...o }));
    if (filter?.stage) out = out.filter(o => o.stage === filter.stage);
    if (filter?.profile) out = out.filter(o => o.profile === filter.profile);
    if (typeof filter?.since === "number") out = out.filter(o => o.observed_at >= filter.since!);
    out.sort((a, b) => b.observed_at - a.observed_at);
    if (typeof filter?.limit === "number" && filter.limit > 0) out = out.slice(0, filter.limit);
    return out;
  }

  // ── Statistics ──────────────────────────────────────────────

  /**
   * Per-stage stats for a profile over an optional time window.
   */
  stageStats(profile: DeploymentProfile, stage: StageId, since?: number): StageStats {
    const budget = this.getBudget(profile, stage);
    if (!budget) throw new Error("No budget registered for " + profile + "/" + stage);
    const obs = this.observations.filter(o =>
      o.profile === profile && o.stage === stage &&
      (typeof since !== "number" || o.observed_at >= since)
    );
    const latencies = obs.map(o => o.latency_ms).sort((a, b) => a - b);
    const ttfts = obs.map(o => o.ttft_ms).filter((x): x is number => typeof x === "number").sort((a, b) => a - b);
    const breaches = obs.filter(o => o.latency_ms > budget.p95_budget_ms).length;
    const ttftBreaches = budget.ttft_budget_ms !== null
      ? obs.filter(o => typeof o.ttft_ms === "number" && o.ttft_ms > budget.ttft_budget_ms!).length
      : 0;
    return {
      stage,
      profile,
      budget_ms: budget.p95_budget_ms,
      count: obs.length,
      p50_ms: quantileR7(latencies, 0.5),
      p95_ms: quantileR7(latencies, 0.95),
      p99_ms: quantileR7(latencies, 0.99),
      max_ms: latencies.length > 0 ? latencies[latencies.length - 1] : 0,
      breaches,
      breach_ratio: obs.length > 0 ? breaches / obs.length : 0,
      ttft_p95_ms: ttfts.length > 0 ? quantileR7(ttfts, 0.95) : null,
      ttft_budget_ms: budget.ttft_budget_ms,
      ttft_breaches: ttftBreaches,
    };
  }

  /**
   * End-to-end stats aggregated across all 7 stages for a given profile.
   * Aggregate p95 uses the conservative composition sum-of-p95s (upper bound
   * under independence; a tight bound under positive correlation).
   */
  endToEndStats(profile: DeploymentProfile, since?: number, now: number = Date.now()): EndToEndStats {
    const stages: StageId[] = [
      "ocr", "cad_feature", "tribal_knn", "lora_inference",
      "physics_validation", "gcode_dialect", "sim_enqueue",
    ];
    const perStage = stages
      .filter(s => this.getBudget(profile, s) !== null)
      .map(s => this.stageStats(profile, s, since));
    const aggregateBudget = this.aggregateBudget(profile);
    const observedP95 = perStage.reduce((s, st) => s + st.p95_ms, 0);
    const slack = AGGREGATE_TARGET_MS - observedP95;

    // Overall status:
    //   breached → observed p95 sum > aggregate budget
    //   at_risk  → any stage p95 exceeds its budget OR slack <200ms
    //   healthy  → everything under
    let status: "healthy" | "at_risk" | "breached";
    if (observedP95 > aggregateBudget) {
      status = "breached";
    } else if (perStage.some(s => s.p95_ms > s.budget_ms) || slack < 200) {
      status = "at_risk";
    } else {
      status = "healthy";
    }

    return {
      generated_at: now,
      profile,
      stage_stats: perStage,
      aggregate_budget_ms: aggregateBudget,
      aggregate_observed_p95_ms: observedP95,
      slack_ms: slack,
      overall_status: status,
    };
  }

  // ── Burn-rate alerts ─────────────────────────────────────────

  /**
   * Compute burn-rate alert over a sliding window.
   * Google SRE workbook §4: fast burn alert if burn_rate > 14.4 over 1h,
   * slow burn if burn_rate > 6 over 6h. Both require actual_bad_ratio
   * exceed budget_ratio to avoid noisy alerts on sparse windows.
   */
  computeBurnRate(input: {
    profile: DeploymentProfile;
    window_minutes: number;
    slo?: number;
    now?: number;
  }): BurnRateAlert {
    const now = input.now ?? Date.now();
    const slo = input.slo ?? DEFAULT_SLO;
    const budgetRatio = 1 - slo;
    const windowMs = input.window_minutes * 60 * 1000;
    const since = now - windowMs;
    const obs = this.observations.filter(o =>
      o.profile === input.profile && o.observed_at >= since
    );
    let breaches = 0;
    for (const o of obs) {
      const b = this.getBudget(o.profile, o.stage);
      if (b && o.latency_ms > b.p95_budget_ms) breaches++;
    }
    const actualBadRatio = obs.length > 0 ? breaches / obs.length : 0;
    const burnRate = budgetRatio > 0 ? actualBadRatio / budgetRatio : 0;

    const isFast = input.window_minutes <= 60 + 1;
    const threshold = isFast ? FAST_BURN_THRESHOLD : SLOW_BURN_THRESHOLD;
    const triggered = burnRate > threshold && actualBadRatio > budgetRatio && obs.length >= 10;

    return {
      generated_at: now,
      profile: input.profile,
      window_label: isFast ? "1h" : String(Math.round(input.window_minutes / 60)) + "h",
      window_duration_minutes: input.window_minutes,
      observations: obs.length,
      breaches,
      actual_bad_ratio: actualBadRatio,
      burn_rate: burnRate,
      severity: triggered ? (isFast ? "fast" : "slow") : "none",
      triggered,
      threshold_burn_rate: threshold,
    };
  }

  /**
   * Full 28-day compliance report — drives the PD alert engine.
   */
  generateComplianceReport(profile: DeploymentProfile, now: number = Date.now()): BudgetComplianceReport {
    const slo = DEFAULT_SLO;
    const budgetRatio = 1 - slo;
    const windowStart = now - DEFAULT_WINDOW_28D_MS;
    const obs28 = this.observations.filter(o =>
      o.profile === profile && o.observed_at >= windowStart
    );
    let breaches = 0;
    for (const o of obs28) {
      const b = this.getBudget(o.profile, o.stage);
      if (b && o.latency_ms > b.p95_budget_ms) breaches++;
    }
    const actualBadRatio = obs28.length > 0 ? breaches / obs28.length : 0;
    const remaining = Math.max(0, 1 - (actualBadRatio / budgetRatio));
    const e2e = this.endToEndStats(profile, windowStart, now);
    const fast = this.computeBurnRate({ profile, window_minutes: 60, slo, now });
    const slow = this.computeBurnRate({ profile, window_minutes: 360, slo, now });

    const findings: string[] = [];
    if (e2e.overall_status === "breached") {
      findings.push("E2E p95 " + e2e.aggregate_observed_p95_ms.toFixed(0) +
        "ms exceeds profile budget " + e2e.aggregate_budget_ms + "ms");
    }
    for (const s of e2e.stage_stats) {
      if (s.count > 0 && s.p95_ms > s.budget_ms) {
        findings.push("Stage " + s.stage + " p95 " + s.p95_ms.toFixed(0) +
          "ms exceeds budget " + s.budget_ms + "ms");
      }
    }
    if (fast.triggered) findings.push("FAST-BURN alert: consumed error budget at " + fast.burn_rate.toFixed(2) + "x in 1h");
    if (slow.triggered) findings.push("SLOW-BURN alert: consumed error budget at " + slow.burn_rate.toFixed(2) + "x in 6h");
    if (findings.length === 0) findings.push("Latency SLO posture healthy. Continue monitoring.");

    return {
      generated_at: now,
      profile,
      slo,
      budget_ratio: budgetRatio,
      observations_28d: obs28.length,
      breaches_28d: breaches,
      remaining_budget_ratio: remaining,
      e2e,
      fast_burn: fast,
      slow_burn: slow,
      findings,
    };
  }

  getStats(): LatencyBudgetStats {
    const byStage: Record<StageId, number> = {
      ocr: 0, cad_feature: 0, tribal_knn: 0, lora_inference: 0,
      physics_validation: 0, gcode_dialect: 0, sim_enqueue: 0,
    };
    let breaches = 0;
    for (const o of this.observations) {
      byStage[o.stage]++;
      const b = this.getBudget(o.profile, o.stage);
      if (b && o.latency_ms > b.p95_budget_ms) breaches++;
    }
    return {
      profiles_registered: this.budgets.size,
      observations_total: this.observations.length,
      observations_by_stage: byStage,
      breaches_total: breaches,
    };
  }

  clearAll(): { budgets: number; observations: number } {
    const bc = this.budgets.size;
    const oc = this.observations.length;
    this.budgets.clear();
    for (const b of [...DEFAULT_LOCAL_GPU, ...DEFAULT_SERVER_ASYNC]) {
      this.budgets.set(this.keyFor(b.profile, b.stage), { ...b });
    }
    this.observations = [];
    this.observationCounter = 0;
    return { budgets: bc, observations: oc };
  }

  /** Exposed for tests — quantileR7 is deterministic. */
  static quantileR7 = quantileR7;
}

export const latencyBudgetDecompositionEngine = new LatencyBudgetDecompositionEngine();
export { LatencyBudgetDecompositionEngine };
