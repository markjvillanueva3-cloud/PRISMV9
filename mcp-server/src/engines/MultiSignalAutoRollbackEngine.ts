/**
 * MultiSignalAutoRollbackEngine (U-LPR-AUTOROLLBACK)
 *
 * Multi-signal auto-rollback for LoRA adapters and other hot-swappable
 * artifacts. Fires whenever ANY of the five trigger channels breaches,
 * completes the rollback in ≤ROLLBACK_SLA_MS, and records full evidence.
 *
 * Trigger channels (from LATHE-PROD-READY-MS0 plan Phase-6 ML B3):
 *
 *   1. EVT-POT/GPD threshold (primary — physics_validity is bimodal so
 *      a 2σ Gaussian is wrong). Fits a Generalised Pareto Distribution
 *      to the historical bad-epoch exceedances over a high threshold u,
 *      then triggers when the current tail probability exceeds the 99th
 *      percentile of that fit.
 *   2. Thumbs-down rate >15% over a trailing window of 20 programs.
 *   3. Error rate >5% over the current 5-minute window.
 *   4. Latency p95 >3000 ms over the current window.
 *   5. S(x) safety score <0.70 on any single request.
 *
 * The GPD parameters (ξ shape, β scale, u threshold) are computed using
 * the Grimshaw-Hosking MLE approximation — simple closed-form bias
 * correction that works well for sample sizes ≥30 and is robust to
 * heavy-tailed physics validity distributions. See Coles (2001) "An
 * Introduction to Statistical Modeling of Extreme Values", §4.
 *
 * Rollback SLA: ≤60 000 ms (plan calls out "<60s"). Any firing whose
 * total elapsed rollback > ROLLBACK_SLA_MS is logged as an SLA
 * violation even if the rollback itself succeeded.
 */

export type RollbackTriggerKind =
  | "evt_tail_breach"
  | "thumbs_down_rate"
  | "error_rate"
  | "latency_p95"
  | "safety_score";

export type RollbackOutcome = "success" | "partial" | "failed";

export interface RollbackTriggerConfig {
  thumbs_down_window: number;     // default 20 programs
  thumbs_down_max_rate: number;   // default 0.15
  error_rate_window_ms: number;   // default 300_000 (5 min)
  error_rate_max: number;         // default 0.05
  latency_p95_ms_max: number;     // default 3000
  safety_score_min: number;       // default 0.70
  evt_threshold_quantile: number; // default 0.20 — fraction of low tail used for GPD fit
  evt_tail_p_value: number;       // default 0.01 — current sample flagged if tail-prob < this
  evt_min_samples: number;        // default 30
  rollback_sla_ms: number;        // default 60_000
}

export const DEFAULT_TRIGGER_CONFIG: RollbackTriggerConfig = {
  thumbs_down_window: 20,
  thumbs_down_max_rate: 0.15,
  error_rate_window_ms: 300_000,
  error_rate_max: 0.05,
  latency_p95_ms_max: 3000,
  safety_score_min: 0.7,
  evt_threshold_quantile: 0.20,
  evt_tail_p_value: 0.01,
  evt_min_samples: 30,
  rollback_sla_ms: 60_000,
};

export interface ProgramFeedback {
  program_id: string;
  artifact_id: string;        // LoRA adapter or bundle under evaluation
  timestamp: number;
  thumbs_up: boolean;
  error: boolean;
  latency_ms: number;
  safety_score: number;       // S(x) from SafetyEngine [0, 1]
  physics_validity?: number;  // [0, 1], used for EVT tail fit
}

export interface RollbackTrigger {
  kind: RollbackTriggerKind;
  artifact_id: string;
  detected_at: number;
  measured_value: number;
  threshold: number;
  detail: string;
}

export interface RollbackExecution {
  trigger: RollbackTrigger;
  initiated_at: number;
  completed_at?: number;
  elapsed_ms?: number;
  outcome: RollbackOutcome;
  within_sla: boolean;
  from_artifact: string;
  to_artifact: string;
  notes: string;
}

export interface GPDFit {
  threshold_u: number;
  shape_xi: number;
  scale_beta: number;
  exceedance_count: number;
  sample_count: number;
  exceedance_rate: number;
}

/**
 * Survival function P(X > x) for a left-tail GPD fit. The GPD is fit on
 * exceedances below threshold u (bad = low physics_validity), so:
 *
 *   For x ≥ u: S(x) ≈ 1 − λ  (conservative body approximation; accurate at u).
 *   For x < u: F(x) = λ · (1 + ξ·(u−x)/β)^(−1/ξ)   (Coles §4, left-tail analog),
 *              S(x) = 1 − F(x).
 *
 * Where λ = exceedance_rate = P(X < u). Returns 1 − P(X ≤ x).
 */
export function gpdSurvival(fit: GPDFit, x: number): number {
  const { threshold_u: u, shape_xi: xi, scale_beta: beta, exceedance_rate: lambda } = fit;
  if (beta <= 0) return 1 - lambda;
  if (x >= u) {
    // Right of threshold: no body model available. 1 − λ is exact at x = u
    // and a conservative upper bound on survival for x > u.
    return 1 - lambda;
  }
  const y = u - x; // left-tail exceedance (positive)
  let tailFrac: number;
  if (Math.abs(xi) < 1e-6) {
    tailFrac = Math.exp(-y / beta);
  } else {
    const arg = 1 + (xi * y) / beta;
    if (arg <= 0) {
      tailFrac = 0;
    } else {
      tailFrac = Math.pow(arg, -1 / xi);
    }
  }
  const F = lambda * tailFrac;
  return 1 - F;
}

/**
 * Fit Generalised Pareto Distribution to exceedances of values below u.
 * We treat "bad" as small physics_validity, so "exceedance" = u - x for
 * values below u. Uses method-of-moments initial guess then Hosking
 * probability-weighted-moments refinement — closed-form, no iteration.
 */
export function fitGPD(values: number[], threshold_u: number): GPDFit | null {
  const exceedances: number[] = [];
  for (const v of values) {
    if (v < threshold_u) exceedances.push(threshold_u - v);
  }
  const n = values.length;
  const k = exceedances.length;
  if (n === 0 || k < 2) return null;

  // Probability-weighted moments (Hosking 1985)
  const sorted = exceedances.slice().sort((a, b) => a - b);
  const m0 = sorted.reduce((a, b) => a + b, 0) / k;
  let m1 = 0;
  for (let i = 0; i < k; i++) {
    m1 += ((k - i - 1) / (k - 1)) * sorted[i];
  }
  m1 /= k;
  if (m0 - 2 * m1 === 0) {
    return {
      threshold_u,
      shape_xi: 0,
      scale_beta: m0,
      exceedance_count: k,
      sample_count: n,
      exceedance_rate: k / n,
    };
  }
  const xi = 2 - m0 / (m0 - 2 * m1);
  const beta = (2 * m0 * m1) / (m0 - 2 * m1);
  // Sanity: scale must be positive for a valid GPD
  const safeBeta = beta > 0 ? beta : m0;
  const safeXi = Number.isFinite(xi) ? Math.max(-0.5, Math.min(0.5, xi)) : 0;
  return {
    threshold_u,
    shape_xi: safeXi,
    scale_beta: safeBeta,
    exceedance_count: k,
    sample_count: n,
    exceedance_rate: k / n,
  };
}

/** R-7 (Hyndman-Fan Type 7, numpy default) quantile. */
export function quantileR7(values: number[], q: number): number {
  if (values.length === 0) throw new Error("quantileR7 needs ≥1 value");
  if (q < 0 || q > 1) throw new Error("q ∈ [0, 1]");
  const v = values.slice().sort((a, b) => a - b);
  const h = (v.length - 1) * q;
  const lo = Math.floor(h);
  const hi = Math.ceil(h);
  return lo === hi ? v[lo] : v[lo] + (h - lo) * (v[hi] - v[lo]);
}

export class MultiSignalAutoRollbackEngine {
  private config: RollbackTriggerConfig = { ...DEFAULT_TRIGGER_CONFIG };
  private feedback: ProgramFeedback[] = [];
  private executions: RollbackExecution[] = [];
  // artifact_id → currently rolled-back flag; prevents double-fire
  private rollbackLatched = new Map<string, boolean>();
  // artifact_id → currently-active fallback artifact (for rollback semantics)
  private activeFallback = new Map<string, string>();

  setConfig(partial: Partial<RollbackTriggerConfig>): RollbackTriggerConfig {
    const next: RollbackTriggerConfig = { ...this.config, ...partial };
    if (next.thumbs_down_window <= 0) throw new Error("thumbs_down_window must be >0");
    if (next.thumbs_down_max_rate < 0 || next.thumbs_down_max_rate > 1) {
      throw new Error("thumbs_down_max_rate must be in [0, 1]");
    }
    if (next.error_rate_window_ms <= 0) throw new Error("error_rate_window_ms must be >0");
    if (next.error_rate_max < 0 || next.error_rate_max > 1) {
      throw new Error("error_rate_max must be in [0, 1]");
    }
    if (next.latency_p95_ms_max <= 0) throw new Error("latency_p95_ms_max must be >0");
    if (next.safety_score_min < 0 || next.safety_score_min > 1) {
      throw new Error("safety_score_min must be in [0, 1]");
    }
    if (next.evt_threshold_quantile <= 0 || next.evt_threshold_quantile >= 1) {
      throw new Error("evt_threshold_quantile must be in (0, 1)");
    }
    if (next.evt_tail_p_value <= 0 || next.evt_tail_p_value >= 1) {
      throw new Error("evt_tail_p_value must be in (0, 1)");
    }
    if (next.evt_min_samples < 2) throw new Error("evt_min_samples must be ≥2");
    if (next.rollback_sla_ms <= 0) throw new Error("rollback_sla_ms must be >0");
    this.config = next;
    return { ...this.config };
  }

  getConfig(): RollbackTriggerConfig {
    return { ...this.config };
  }

  /** Register fallback artifact to rollback to (pinned last-known-good). */
  setFallback(artifact_id: string, fallback_id: string): void {
    if (!artifact_id.trim() || !fallback_id.trim()) {
      throw new Error("artifact_id and fallback_id required");
    }
    if (artifact_id === fallback_id) throw new Error("fallback must differ from active");
    this.activeFallback.set(artifact_id, fallback_id);
  }

  getFallback(artifact_id: string): string | null {
    return this.activeFallback.get(artifact_id) ?? null;
  }

  /** Ingest a program feedback sample; auto-triggers rollback evaluation. */
  recordFeedback(fb: ProgramFeedback, now?: number): RollbackTrigger | null {
    if (!fb.program_id.trim()) throw new Error("program_id required");
    if (!fb.artifact_id.trim()) throw new Error("artifact_id required");
    if (!Number.isFinite(fb.timestamp)) throw new Error("timestamp required");
    if (fb.latency_ms < 0) throw new Error("latency_ms must be ≥0");
    if (fb.safety_score < 0 || fb.safety_score > 1) {
      throw new Error("safety_score must be in [0, 1]");
    }
    if (fb.physics_validity !== undefined && (fb.physics_validity < 0 || fb.physics_validity > 1)) {
      throw new Error("physics_validity must be in [0, 1]");
    }
    this.feedback.push({ ...fb });
    return this.evaluate(fb.artifact_id, now ?? fb.timestamp);
  }

  /**
   * Evaluate all 5 trigger channels against feedback for artifact_id.
   * Returns the first breach detected (in trigger priority order) or null.
   */
  evaluate(artifact_id: string, now: number): RollbackTrigger | null {
    if (this.rollbackLatched.get(artifact_id)) return null;
    const cfg = this.config;
    const all = this.feedback.filter((f) => f.artifact_id === artifact_id);

    // (1) Safety score — single-sample trigger, highest priority
    const latest = all[all.length - 1];
    if (latest && latest.safety_score < cfg.safety_score_min) {
      return {
        kind: "safety_score",
        artifact_id,
        detected_at: now,
        measured_value: latest.safety_score,
        threshold: cfg.safety_score_min,
        detail: `S(x)=${latest.safety_score.toFixed(3)} < ${cfg.safety_score_min}`,
      };
    }

    // (2) Thumbs-down trailing window
    const trail = all.slice(-cfg.thumbs_down_window);
    if (trail.length >= cfg.thumbs_down_window) {
      const down = trail.filter((f) => !f.thumbs_up).length;
      const rate = down / trail.length;
      if (rate > cfg.thumbs_down_max_rate) {
        return {
          kind: "thumbs_down_rate",
          artifact_id,
          detected_at: now,
          measured_value: rate,
          threshold: cfg.thumbs_down_max_rate,
          detail: `${down}/${trail.length} thumbs-down = ${(rate * 100).toFixed(1)}%`,
        };
      }
    }

    // (3) Error rate over the error window
    const errWindow = all.filter((f) => now - f.timestamp <= cfg.error_rate_window_ms);
    if (errWindow.length > 0) {
      const errs = errWindow.filter((f) => f.error).length;
      const rate = errs / errWindow.length;
      if (rate > cfg.error_rate_max) {
        return {
          kind: "error_rate",
          artifact_id,
          detected_at: now,
          measured_value: rate,
          threshold: cfg.error_rate_max,
          detail: `${errs}/${errWindow.length} errors over ${cfg.error_rate_window_ms}ms = ${(rate * 100).toFixed(1)}%`,
        };
      }
    }

    // (4) Latency p95 over the error window
    if (errWindow.length >= 5) {
      const latencies = errWindow.map((f) => f.latency_ms);
      const p95 = quantileR7(latencies, 0.95);
      if (p95 > cfg.latency_p95_ms_max) {
        return {
          kind: "latency_p95",
          artifact_id,
          detected_at: now,
          measured_value: p95,
          threshold: cfg.latency_p95_ms_max,
          detail: `p95=${p95.toFixed(0)}ms > ${cfg.latency_p95_ms_max}ms over ${errWindow.length} samples`,
        };
      }
    }

    // (5) EVT/GPD tail breach on physics_validity. Physics validity is
    // bimodal — a Gaussian 2σ trigger is wrong, so we fit a Generalised
    // Pareto to the lower `evt_threshold_quantile` fraction of historical
    // samples and flag the current sample if its left-tail CDF is below
    // `evt_tail_p_value` (default 1 %).
    const physics = all
      .map((f) => f.physics_validity)
      .filter((v): v is number => typeof v === "number");
    if (
      physics.length >= cfg.evt_min_samples &&
      latest?.physics_validity !== undefined
    ) {
      const u = quantileR7(physics, cfg.evt_threshold_quantile);
      const fit = fitGPD(physics, u);
      if (fit && latest.physics_validity < u) {
        const leftTailP = 1 - gpdSurvival(fit, latest.physics_validity);
        if (leftTailP < cfg.evt_tail_p_value) {
          return {
            kind: "evt_tail_breach",
            artifact_id,
            detected_at: now,
            measured_value: leftTailP,
            threshold: cfg.evt_tail_p_value,
            detail: `GPD(u=${u.toFixed(3)},ξ=${fit.shape_xi.toFixed(3)},β=${fit.scale_beta.toFixed(3)}) P(X≤${latest.physics_validity.toFixed(3)})=${leftTailP.toExponential(2)} < ${cfg.evt_tail_p_value}`,
          };
        }
      }
    }
    return null;
  }

  /**
   * Execute the rollback for a detected trigger. Caller must pass the
   * fallback artifact_id (pre-registered or explicit) and the actual
   * elapsed time from detected_at → completed_at.
   */
  executeRollback(input: {
    trigger: RollbackTrigger;
    initiated_at: number;
    completed_at: number;
    outcome?: RollbackOutcome;
    to_artifact?: string;
    notes?: string;
  }): RollbackExecution {
    const { trigger } = input;
    if (input.completed_at < input.initiated_at) {
      throw new Error("completed_at cannot precede initiated_at");
    }
    if (input.initiated_at < trigger.detected_at) {
      throw new Error("initiated_at cannot precede trigger.detected_at");
    }
    const to =
      input.to_artifact ??
      this.activeFallback.get(trigger.artifact_id) ??
      null;
    if (!to) throw new Error(`no fallback registered for artifact ${trigger.artifact_id}`);
    const elapsed = input.completed_at - trigger.detected_at;
    const outcome = input.outcome ?? "success";
    const rec: RollbackExecution = {
      trigger: { ...trigger },
      initiated_at: input.initiated_at,
      completed_at: input.completed_at,
      elapsed_ms: elapsed,
      outcome,
      within_sla: elapsed <= this.config.rollback_sla_ms,
      from_artifact: trigger.artifact_id,
      to_artifact: to,
      notes: (input.notes ?? "").trim(),
    };
    this.executions.push(rec);
    if (outcome === "success") {
      this.rollbackLatched.set(trigger.artifact_id, true);
    }
    return { ...rec };
  }

  /** Manually re-arm a latched artifact (e.g., after incident closeout). */
  rearm(artifact_id: string): void {
    this.rollbackLatched.delete(artifact_id);
  }

  isLatched(artifact_id: string): boolean {
    return this.rollbackLatched.get(artifact_id) === true;
  }

  listFeedback(artifact_id?: string): ProgramFeedback[] {
    return this.feedback
      .filter((f) => !artifact_id || f.artifact_id === artifact_id)
      .map((f) => ({ ...f }));
  }

  listExecutions(artifact_id?: string): RollbackExecution[] {
    return this.executions
      .filter((e) => !artifact_id || e.from_artifact === artifact_id)
      .map((e) => ({ ...e }));
  }

  getStats(): {
    total_feedback: number;
    total_executions: number;
    by_kind: Record<RollbackTriggerKind, number>;
    by_outcome: Record<RollbackOutcome, number>;
    sla_violation_count: number;
    sla_violation_rate: number;
    average_elapsed_ms: number | null;
  } {
    const by_kind: Record<RollbackTriggerKind, number> = {
      evt_tail_breach: 0,
      thumbs_down_rate: 0,
      error_rate: 0,
      latency_p95: 0,
      safety_score: 0,
    };
    const by_outcome: Record<RollbackOutcome, number> = {
      success: 0,
      partial: 0,
      failed: 0,
    };
    let sla_violations = 0;
    let sum = 0;
    let cnt = 0;
    for (const e of this.executions) {
      by_kind[e.trigger.kind] += 1;
      by_outcome[e.outcome] += 1;
      if (!e.within_sla) sla_violations += 1;
      if (e.elapsed_ms !== undefined) {
        sum += e.elapsed_ms;
        cnt += 1;
      }
    }
    return {
      total_feedback: this.feedback.length,
      total_executions: this.executions.length,
      by_kind,
      by_outcome,
      sla_violation_count: sla_violations,
      sla_violation_rate: this.executions.length === 0 ? 0 : sla_violations / this.executions.length,
      average_elapsed_ms: cnt === 0 ? null : sum / cnt,
    };
  }

  clearAll(): void {
    this.feedback.length = 0;
    this.executions.length = 0;
    this.rollbackLatched.clear();
    this.activeFallback.clear();
    this.config = { ...DEFAULT_TRIGGER_CONFIG };
  }
}

export const multiSignalAutoRollbackEngine = new MultiSignalAutoRollbackEngine();
