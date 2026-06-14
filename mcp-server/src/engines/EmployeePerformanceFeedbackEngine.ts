/**
 * EmployeePerformanceFeedbackEngine — closes the self-learning loop for shop personnel.
 *
 * Pulls signal from 5 employee-portal sources (no rebuild — composes existing
 * engines) and emits:
 *   1. coaching nudges (positive + corrective) per employee
 *   2. role-progression readiness scores (0..1) toward the next career tier
 *   3. team-aggregate trends (5-employee rolling window) for foreman dashboard
 *
 * SIGNAL INPUTS (records pushed in via recordSignal — adapter pattern):
 *   - sf_outcome      → from EmployeePerMachineSFAdaptiveEngine (Bayesian S/F outcomes)
 *   - insert_outcome  → from EmployeeInsertSideTrackerEngine (insert side life)
 *   - op_completion   → from EmployeePerOpPartTrackerEngine (op-by-op parts shipped)
 *   - safety_incident → from SafetyTrainingRecordEngine domain (LOTO/HazCom/etc.)
 *   - course_outcome  → from EmployeeRoleAcademyInjectionEngine (passed/failed)
 *
 * SCORING — weighted exponential-moving-average per dimension:
 *   quality   = wins_vs_chatter_vs_break (from sf + insert)
 *   throughput = parts_per_clocked_hr   (from op_completion)
 *   safety    = 1 − incident_density    (from safety_incident)
 *   learning  = course_pass_rate         (from course_outcome)
 *   composite = 0.30·quality + 0.30·throughput + 0.20·safety + 0.20·learning
 *
 * EMA half-life = 30 records (≈ 1 month of moderate signal). Recent signal weighted
 * more than ancient.
 *
 * READINESS for next role tier: composite × completion_rate_of_growth_courses,
 * scaled into [0,1]. ≥0.80 → "ready", 0.60-0.80 → "developing", <0.60 → "early".
 *
 * Hotel-soul invariants: PII-free (employee_id only), Object.frozen returns,
 * R12 fail-loud, audit-trail on every signal.
 *
 * @module EmployeePerformanceFeedbackEngine
 * @milestone HOTEL/U-EMPLOYEE-PERFORMANCE-FEEDBACK (2026-05-25, slot:hotel iter16)
 */

export type SignalKind =
  | "sf_outcome"
  | "insert_outcome"
  | "op_completion"
  | "safety_incident"
  | "course_outcome";

export type SignalVerdict =
  | "positive"     // win, perfect surface, no chatter, passed
  | "neutral"      // okay, no notable wins or issues
  | "minor_issue"  // chatter, surface degraded, minor NC, minor delay
  | "major_issue"; // tool break, scrap part, failed course, safety incident

export interface PerformanceSignal {
  id: string;
  employee_id: string;
  kind: SignalKind;
  verdict: SignalVerdict;
  weight: number;        // 0..1, signal importance
  recorded_at: string;   // ISO timestamp
  context?: string;      // optional human-readable note (e.g. "JOB-1234 op-3")
}

export interface DimensionScore {
  value: number;     // 0..1
  sample_n: number;
  last_updated: string | null;
}

export interface EmployeeProfile {
  employee_id: string;
  signals: ReadonlyArray<PerformanceSignal>;
  quality: DimensionScore;
  throughput: DimensionScore;
  safety: DimensionScore;
  learning: DimensionScore;
  composite_score: number;
  last_evaluated_at: string | null;
}

export interface CoachingNudge {
  employee_id: string;
  kind: "positive" | "corrective";
  dimension: "quality" | "throughput" | "safety" | "learning" | "composite";
  message: string;
  severity: "info" | "warn" | "critical";
}

export interface RoleReadinessAssessment {
  employee_id: string;
  current_composite: number;
  growth_course_completion_pct: number;
  readiness_score: number;
  readiness_label: "early" | "developing" | "ready" | "promote_now";
  rationale: ReadonlyArray<string>;
}

/** Verdict → score contribution (0..1). */
const VERDICT_SCORE: Readonly<Record<SignalVerdict, number>> = Object.freeze({
  positive: 1.0,
  neutral: 0.6,
  minor_issue: 0.3,
  major_issue: 0.0,
});

const EMA_HALF_LIFE = 10;
// alpha = 1 - 0.5^(1/half_life) ≈ 0.0670 for half_life=10 — recent signals weighted
// more so the score reflects current performance within ~1-2 weeks of shop signal.
const EMA_ALPHA = 1 - Math.pow(0.5, 1 / EMA_HALF_LIFE);
// Safety is rarer + higher-stakes — react sharply so a single major incident
// drops safety below the 0.85 alert threshold immediately (OSHA-style reactivity).
const SAFETY_ALPHA = 0.5;

class EmployeePerformanceFeedbackEngine {
  private signals: Map<string, PerformanceSignal> = new Map();
  private profiles: Map<string, EmployeeProfile> = new Map();
  private nextSignalId = 1;

  recordSignal(args: {
    employee_id: string;
    kind: SignalKind;
    verdict: SignalVerdict;
    weight?: number;
    context?: string;
  }): PerformanceSignal {
    if (!args.employee_id) {
      throw new Error("EmployeePerformanceFeedbackEngine.recordSignal: employee_id required");
    }
    const validKinds: SignalKind[] = [
      "sf_outcome",
      "insert_outcome",
      "op_completion",
      "safety_incident",
      "course_outcome",
    ];
    if (!validKinds.includes(args.kind)) {
      throw new Error(`EmployeePerformanceFeedbackEngine.recordSignal: unknown kind "${args.kind}"`);
    }
    if (!Object.prototype.hasOwnProperty.call(VERDICT_SCORE, args.verdict)) {
      throw new Error(
        `EmployeePerformanceFeedbackEngine.recordSignal: unknown verdict "${args.verdict}". Valid: ${Object.keys(VERDICT_SCORE).join(", ")}`,
      );
    }
    const weight = args.weight ?? 1.0;
    if (weight < 0 || weight > 1) {
      throw new Error("EmployeePerformanceFeedbackEngine.recordSignal: weight must be in [0, 1]");
    }
    const id = `PFS-${String(this.nextSignalId++).padStart(6, "0")}`;
    const sig: PerformanceSignal = Object.freeze({
      id,
      employee_id: args.employee_id,
      kind: args.kind,
      verdict: args.verdict,
      weight,
      recorded_at: new Date().toISOString(),
      ...(args.context !== undefined && { context: args.context }),
    });
    this.signals.set(id, sig);
    this.applyToProfile(sig);
    return sig;
  }

  private applyToProfile(sig: PerformanceSignal): void {
    let p = this.profiles.get(sig.employee_id);
    if (!p) {
      p = {
        employee_id: sig.employee_id,
        signals: [],
        quality: { value: 0.5, sample_n: 0, last_updated: null },
        throughput: { value: 0.5, sample_n: 0, last_updated: null },
        safety: { value: 1.0, sample_n: 0, last_updated: null },
        learning: { value: 0.5, sample_n: 0, last_updated: null },
        composite_score: 0.5,
        last_evaluated_at: null,
      };
    }
    const dim = this.dimensionFor(sig.kind);
    const score = VERDICT_SCORE[sig.verdict];
    const cur = p[dim];
    // Weighted EMA: x_t = (1-α)·x_{t-1} + α·(w·s + (1-w)·x_{t-1})
    //              = x_{t-1} + α·w·(s − x_{t-1})
    const alpha = dim === "safety" ? SAFETY_ALPHA : EMA_ALPHA;
    const newValue = cur.value + alpha * sig.weight * (score - cur.value);
    const newDim: DimensionScore = {
      value: newValue,
      sample_n: cur.sample_n + 1,
      last_updated: sig.recorded_at,
    };
    const composite =
      0.30 * (dim === "quality" ? newValue : p.quality.value) +
      0.30 * (dim === "throughput" ? newValue : p.throughput.value) +
      0.20 * (dim === "safety" ? newValue : p.safety.value) +
      0.20 * (dim === "learning" ? newValue : p.learning.value);
    const updated: EmployeeProfile = {
      employee_id: sig.employee_id,
      signals: [...p.signals, sig],
      quality: dim === "quality" ? newDim : p.quality,
      throughput: dim === "throughput" ? newDim : p.throughput,
      safety: dim === "safety" ? newDim : p.safety,
      learning: dim === "learning" ? newDim : p.learning,
      composite_score: composite,
      last_evaluated_at: sig.recorded_at,
    };
    this.profiles.set(sig.employee_id, updated);
  }

  private dimensionFor(kind: SignalKind): "quality" | "throughput" | "safety" | "learning" {
    switch (kind) {
      case "sf_outcome":
      case "insert_outcome":
        return "quality";
      case "op_completion":
        return "throughput";
      case "safety_incident":
        return "safety";
      case "course_outcome":
        return "learning";
    }
  }

  /** Return frozen snapshot of profile. */
  getProfile(employee_id: string): EmployeeProfile | null {
    const p = this.profiles.get(employee_id);
    if (!p) return null;
    return Object.freeze({
      ...p,
      signals: Object.freeze([...p.signals].map((s) => Object.freeze({ ...s }))),
      quality: Object.freeze({ ...p.quality }),
      throughput: Object.freeze({ ...p.throughput }),
      safety: Object.freeze({ ...p.safety }),
      learning: Object.freeze({ ...p.learning }),
    });
  }

  /** Emit coaching nudges based on the current profile. */
  generateNudges(employee_id: string): ReadonlyArray<CoachingNudge> {
    const p = this.profiles.get(employee_id);
    if (!p) {
      throw new Error(
        `EmployeePerformanceFeedbackEngine.generateNudges: no profile for "${employee_id}" — record signals first`,
      );
    }
    const out: CoachingNudge[] = [];
    // Positive nudges — celebrate sustained excellence
    for (const dim of ["quality", "throughput", "safety", "learning"] as const) {
      const score = p[dim];
      if (score.sample_n >= 5 && score.value >= 0.85) {
        out.push(Object.freeze({
          employee_id,
          kind: "positive" as const,
          dimension: dim,
          message: `Sustained ${dim} excellence (${(score.value * 100).toFixed(0)}% over ${score.sample_n} signals)`,
          severity: "info" as const,
        }));
      }
    }
    // Corrective nudges
    if (p.quality.sample_n >= 3 && p.quality.value < 0.50) {
      out.push(Object.freeze({
        employee_id,
        kind: "corrective" as const,
        dimension: "quality" as const,
        message: `Quality score ${(p.quality.value * 100).toFixed(0)}% — review per-machine S/F + insert wear with foreman`,
        severity: p.quality.value < 0.30 ? ("critical" as const) : ("warn" as const),
      }));
    }
    if (p.throughput.sample_n >= 3 && p.throughput.value < 0.45) {
      out.push(Object.freeze({
        employee_id,
        kind: "corrective" as const,
        dimension: "throughput" as const,
        message: `Throughput trending low (${(p.throughput.value * 100).toFixed(0)}%) — check multi-job concurrency settings`,
        severity: "warn" as const,
      }));
    }
    if (p.safety.sample_n >= 1 && p.safety.value < 0.85) {
      out.push(Object.freeze({
        employee_id,
        kind: "corrective" as const,
        dimension: "safety" as const,
        message: `Recent safety signal(s) — auto-assign refresher per OSHA cadence`,
        severity: p.safety.value < 0.60 ? ("critical" as const) : ("warn" as const),
      }));
    }
    if (p.learning.sample_n >= 2 && p.learning.value < 0.50) {
      out.push(Object.freeze({
        employee_id,
        kind: "corrective" as const,
        dimension: "learning" as const,
        message: `Course pass rate below threshold — pair with mentor on next required course`,
        severity: "warn" as const,
      }));
    }
    if (p.composite_score >= 0.85 && p.signals.length >= 10) {
      out.push(Object.freeze({
        employee_id,
        kind: "positive" as const,
        dimension: "composite" as const,
        message: `Composite ${(p.composite_score * 100).toFixed(0)}% — candidate for next-tier readiness review`,
        severity: "info" as const,
      }));
    }
    return Object.freeze(out);
  }

  /**
   * Assess role-progression readiness. Caller passes growth_course_completion_pct
   * computed externally (typically via EmployeeRoleAcademyInjectionEngine).
   */
  assessRoleReadiness(args: {
    employee_id: string;
    growth_course_completion_pct: number;
  }): RoleReadinessAssessment {
    const p = this.profiles.get(args.employee_id);
    if (!p) {
      throw new Error(
        `EmployeePerformanceFeedbackEngine.assessRoleReadiness: no profile for "${args.employee_id}"`,
      );
    }
    if (args.growth_course_completion_pct < 0 || args.growth_course_completion_pct > 1) {
      throw new Error(
        "EmployeePerformanceFeedbackEngine.assessRoleReadiness: growth_course_completion_pct must be in [0, 1]",
      );
    }
    // readiness = 0.7·composite + 0.3·growth_completion
    const readiness = 0.7 * p.composite_score + 0.3 * args.growth_course_completion_pct;
    let label: RoleReadinessAssessment["readiness_label"];
    if (readiness >= 0.90) label = "promote_now";
    else if (readiness >= 0.80) label = "ready";
    else if (readiness >= 0.60) label = "developing";
    else label = "early";
    const rationale: string[] = [];
    rationale.push(`Composite ${(p.composite_score * 100).toFixed(0)}% (weight 70%)`);
    rationale.push(`Growth-course completion ${(args.growth_course_completion_pct * 100).toFixed(0)}% (weight 30%)`);
    if (p.safety.value < 0.85 && p.safety.sample_n > 0) {
      rationale.push(`⚠ Recent safety signals — review before promote`);
    }
    if (p.signals.length < 10) {
      rationale.push(`Limited signal (${p.signals.length}) — assessment confidence low`);
    }
    return Object.freeze({
      employee_id: args.employee_id,
      current_composite: p.composite_score,
      growth_course_completion_pct: args.growth_course_completion_pct,
      readiness_score: readiness,
      readiness_label: label,
      rationale: Object.freeze(rationale),
    });
  }

  /** Team-aggregate trend report (foreman dashboard). */
  teamRollup(args: { employee_ids: string[] }): {
    n: number;
    avg_quality: number;
    avg_throughput: number;
    avg_safety: number;
    avg_learning: number;
    avg_composite: number;
    top_composite: { employee_id: string; score: number } | null;
    needs_attention: ReadonlyArray<{ employee_id: string; score: number; dim: string }>;
  } {
    if (!Array.isArray(args.employee_ids) || args.employee_ids.length === 0) {
      throw new Error("EmployeePerformanceFeedbackEngine.teamRollup: employee_ids array required");
    }
    const profiles = args.employee_ids
      .map((id) => this.profiles.get(id))
      .filter((p): p is EmployeeProfile => p != null);
    if (profiles.length === 0) {
      return Object.freeze({
        n: 0,
        avg_quality: 0,
        avg_throughput: 0,
        avg_safety: 0,
        avg_learning: 0,
        avg_composite: 0,
        top_composite: null,
        needs_attention: Object.freeze([]),
      });
    }
    const n = profiles.length;
    const avg = (sel: (p: EmployeeProfile) => number) =>
      profiles.reduce((s, p) => s + sel(p), 0) / n;
    const top = profiles.reduce((best, p) => (p.composite_score > best.composite_score ? p : best));
    const needs: { employee_id: string; score: number; dim: string }[] = [];
    for (const p of profiles) {
      if (p.quality.sample_n >= 3 && p.quality.value < 0.50) {
        needs.push({ employee_id: p.employee_id, score: p.quality.value, dim: "quality" });
      }
      if (p.safety.sample_n >= 1 && p.safety.value < 0.85) {
        needs.push({ employee_id: p.employee_id, score: p.safety.value, dim: "safety" });
      }
    }
    return Object.freeze({
      n,
      avg_quality: avg((p) => p.quality.value),
      avg_throughput: avg((p) => p.throughput.value),
      avg_safety: avg((p) => p.safety.value),
      avg_learning: avg((p) => p.learning.value),
      avg_composite: avg((p) => p.composite_score),
      top_composite: Object.freeze({ employee_id: top.employee_id, score: top.composite_score }),
      needs_attention: Object.freeze(needs.map((n) => Object.freeze(n))),
    });
  }

  reset(): void {
    this.signals.clear();
    this.profiles.clear();
    this.nextSignalId = 1;
  }
}

export const employeePerformanceFeedbackEngine = new EmployeePerformanceFeedbackEngine();
