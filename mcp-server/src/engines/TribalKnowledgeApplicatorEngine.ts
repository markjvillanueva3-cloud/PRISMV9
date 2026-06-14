/**
 * TribalKnowledgeApplicatorEngine — Wisdom Synthesis (U-CAMAGI12, CADCAM-DAGI-MS4)
 *
 * Applies shop-floor tribal knowledge + machining playbook rules to STRATEGY
 * DECISIONS. Where TribalKnowledgeAdvisorEngine surfaces advice for a single
 * context and TribalPlaybookEnforcementEngine validates a single parameter set,
 * this engine takes a SET of strategy candidates, scores each against tribal
 * constraints, ranks them, picks the best, and emits a human-readable rationale.
 *
 * Design: the scoring core is deterministic w.r.t. its inputs (no external
 * engine calls in the hot path) so it is fully unit-testable. `fromPlaybookRules()`
 * bridges MachiningPlaybookEngine output into the constraint model through a
 * structural interface — no fragile import coupling.
 */

export type RuleSeverity = "critical" | "important" | "recommended" | "tip";

/**
 * Severity → tribalScore penalty. These are engine-domain scoring weights
 * (decision-theory tuning), NOT physics constants — defined here by design.
 * critical halves the score on its own; four tips barely register.
 */
const SEVERITY_PENALTY: Readonly<Record<RuleSeverity, number>> = Object.freeze({
  critical: 0.5,
  important: 0.25,
  recommended: 0.1,
  tip: 0.03,
});

export interface TribalConstraint {
  id: string;
  severity: RuleSeverity;
  description: string;
  /** Parameter key this constraint bounds (matched against candidate.params). */
  appliesTo?: string;
  /** Inclusive lower bound for the appliesTo parameter. */
  min?: number;
  /** Inclusive upper bound for the appliesTo parameter. */
  max?: number;
  /** Candidate is penalized if it carries this tag. */
  forbiddenTag?: string;
  /** Candidate is penalized if it lacks this tag. */
  requiredTag?: string;
}

export interface StrategyCandidate {
  id: string;
  name: string;
  /** Machining parameters keyed by name (e.g. feed_mm_rev, doc_mm, rpm). */
  params?: Record<string, number>;
  /** Descriptive tags (e.g. "trochoidal", "climb", "flood-coolant"). */
  tags?: string[];
  description?: string;
  /** Upstream optimizer score in [0,1]; defaults to 0.5 when omitted. */
  baseScore?: number;
}

export interface ConstraintViolation {
  constraintId: string;
  severity: RuleSeverity;
  reason: string;
}

export interface ScoredStrategy {
  id: string;
  name: string;
  baseScore: number;
  tribalScore: number;
  combinedScore: number;
  violations: ConstraintViolation[];
  rationale: string[];
}

export interface ApplicatorContext {
  material?: string;
  operation?: string;
  feature?: string;
}

export interface ApplicatorInput {
  candidates: StrategyCandidate[];
  constraints: TribalConstraint[];
  context?: ApplicatorContext;
}

export interface ApplicatorResult {
  ranked: ScoredStrategy[];
  chosen: ScoredStrategy | null;
  /** Strategy the naive (highest-baseScore) picker would have selected. */
  naivePick: ScoredStrategy | null;
  /** Human-readable synthesis of why `chosen` won. */
  tribalRationale: string;
  /**
   * Outcome improvement of the tribal-aware pick over the naive pick, as a
   * percentage of the naive pick's combined (true) score. 0 when they agree
   * or when the naive pick was already shop-floor sound.
   */
  improvementPct: number;
}

/** Minimal structural shape of a MachiningPlaybookEngine rule — no import coupling. */
export interface PlaybookRuleLike {
  id?: string;
  severity?: string;
  category?: string;
  rule?: string;
  description?: string;
  parameter?: string;
  min?: number;
  max?: number;
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function normalizeSeverity(raw: unknown): RuleSeverity {
  const s = String(raw ?? "").toLowerCase();
  if (s === "critical" || s === "blocker" || s === "danger" || s === "severe") return "critical";
  if (s === "important" || s === "warning" || s === "high" || s === "major") return "important";
  if (s === "recommended" || s === "advice" || s === "medium" || s === "moderate") return "recommended";
  return "tip";
}

function severityIcon(s: RuleSeverity): string {
  return s === "critical" ? "BLOCK" : s === "important" ? "WARN" : s === "recommended" ? "INFO" : "NOTE";
}

export class TribalKnowledgeApplicatorEngine {
  private applyCount = 0;
  private lastImprovementPct = 0;

  /**
   * Score every candidate against the tribal/playbook constraints, rank by
   * combined score, and pick the best. The returned result is deterministic
   * w.r.t. the input (the internal applyCount telemetry is not part of it).
   */
  apply(input: ApplicatorInput): ApplicatorResult {
    const candidates = Array.isArray(input?.candidates) ? input.candidates : [];
    const constraints = Array.isArray(input?.constraints) ? input.constraints : [];

    if (candidates.length === 0) {
      return {
        ranked: [],
        chosen: null,
        naivePick: null,
        tribalRationale:
          "No strategy candidates supplied — there is nothing for tribal knowledge to be applied to.",
        improvementPct: 0,
      };
    }

    const scored = candidates.map((c) => this.scoreCandidate(c, constraints));

    // Rank by combinedScore desc; tie-break by tribalScore desc then id asc so
    // the ordering is fully deterministic regardless of input order.
    const ranked = [...scored].sort((a, b) => {
      if (b.combinedScore !== a.combinedScore) return b.combinedScore - a.combinedScore;
      if (b.tribalScore !== a.tribalScore) return b.tribalScore - a.tribalScore;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
    const chosen = ranked[0];

    // Naive picker: highest baseScore, blind to tribal knowledge.
    const naivePick = [...scored].sort((a, b) => {
      if (b.baseScore !== a.baseScore) return b.baseScore - a.baseScore;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    })[0];

    // Improvement: how much better the tribal-aware pick's TRUE (combined)
    // outcome is than the naive pick's true outcome. Because `chosen` is the
    // max-combinedScore strategy, this is always >= 0 — tribal knowledge can
    // never select a worse strategy than the naive picker would have.
    let improvementPct = 0;
    if (naivePick.combinedScore > 0) {
      improvementPct =
        ((chosen.combinedScore - naivePick.combinedScore) / naivePick.combinedScore) * 100;
    } else if (chosen.combinedScore > 0) {
      improvementPct = 100;
    }
    improvementPct = Math.max(0, Math.round(improvementPct * 10) / 10);

    this.applyCount += 1;
    this.lastImprovementPct = improvementPct;

    return {
      ranked,
      chosen,
      naivePick,
      tribalRationale: this.synthesizeRationale(chosen, naivePick, constraints.length, input.context),
      improvementPct,
    };
  }

  /** Score a single candidate against all constraints. Deterministic / pure. */
  scoreCandidate(candidate: StrategyCandidate, constraints: TribalConstraint[]): ScoredStrategy {
    const baseScore = clamp01(typeof candidate.baseScore === "number" ? candidate.baseScore : 0.5);
    const params = candidate.params ?? {};
    const tags = new Set(candidate.tags ?? []);
    const violations: ConstraintViolation[] = [];
    const rationale: string[] = [];

    let penalty = 0;
    const seen = new Set<string>();
    for (const c of constraints) {
      if (!c || typeof c.id !== "string" || seen.has(c.id)) continue;
      seen.add(c.id);
      const v = this.checkConstraint(c, params, tags);
      if (v) {
        violations.push(v);
        penalty += SEVERITY_PENALTY[v.severity];
        rationale.push(`[${severityIcon(v.severity)}] ${v.severity.toUpperCase()}: ${v.reason} (${v.constraintId})`);
      }
    }

    const tribalScore = clamp01(1 - penalty);
    // tribalScore acts as a pure multiplier in [0,1]: a clean candidate keeps
    // its full baseScore (tips never worsen a sound strategy — abort criterion),
    // a candidate that breaks tribal knowledge is demoted proportionally.
    const combinedScore = clamp01(baseScore * tribalScore);

    if (violations.length === 0) {
      rationale.push(`[OK] Clean — no tribal-knowledge violations across ${seen.size} constraint(s).`);
    }

    return {
      id: candidate.id,
      name: candidate.name,
      baseScore,
      tribalScore,
      combinedScore,
      violations,
      rationale,
    };
  }

  /** Returns a violation if the candidate breaks the constraint, else null. */
  private checkConstraint(
    c: TribalConstraint,
    params: Record<string, number>,
    tags: Set<string>,
  ): ConstraintViolation | null {
    const severity: RuleSeverity = c.severity in SEVERITY_PENALTY ? c.severity : "tip";

    // Numeric bound check against a named parameter.
    if (c.appliesTo && (typeof c.min === "number" || typeof c.max === "number")) {
      const val = params[c.appliesTo];
      if (typeof val === "number" && Number.isFinite(val)) {
        if (typeof c.min === "number" && val < c.min) {
          return {
            constraintId: c.id,
            severity,
            reason: `${c.appliesTo}=${val} is below tribal minimum ${c.min} — ${c.description}`,
          };
        }
        if (typeof c.max === "number" && val > c.max) {
          return {
            constraintId: c.id,
            severity,
            reason: `${c.appliesTo}=${val} exceeds tribal maximum ${c.max} — ${c.description}`,
          };
        }
      }
    }

    // Forbidden tag.
    if (c.forbiddenTag && tags.has(c.forbiddenTag)) {
      return {
        constraintId: c.id,
        severity,
        reason: `carries forbidden tag "${c.forbiddenTag}" — ${c.description}`,
      };
    }

    // Required tag.
    if (c.requiredTag && !tags.has(c.requiredTag)) {
      return {
        constraintId: c.id,
        severity,
        reason: `missing required tag "${c.requiredTag}" — ${c.description}`,
      };
    }

    return null;
  }

  /**
   * Bridge MachiningPlaybookEngine rules (or any structurally-similar source)
   * into the tribal constraint model. Defensive: tolerates partial / malformed
   * entries so a noisy upstream rule store can never throw here.
   */
  fromPlaybookRules(rules: readonly PlaybookRuleLike[]): TribalConstraint[] {
    if (!Array.isArray(rules)) return [];
    const out: TribalConstraint[] = [];
    for (let i = 0; i < rules.length; i++) {
      const r = rules[i];
      if (!r || typeof r !== "object") continue;
      const id = typeof r.id === "string" && r.id.length > 0 ? r.id : `playbook-rule-${i}`;
      const description =
        (typeof r.rule === "string" && r.rule) ||
        (typeof r.description === "string" && r.description) ||
        `Playbook rule ${id}`;
      const constraint: TribalConstraint = {
        id,
        severity: normalizeSeverity(r.severity),
        description,
      };
      if (typeof r.parameter === "string" && r.parameter.length > 0) {
        constraint.appliesTo = r.parameter;
        if (typeof r.min === "number" && Number.isFinite(r.min)) constraint.min = r.min;
        if (typeof r.max === "number" && Number.isFinite(r.max)) constraint.max = r.max;
      }
      out.push(constraint);
    }
    return out;
  }

  /** Human-readable synthesis of the decision. */
  synthesizeRationale(
    chosen: ScoredStrategy,
    naivePick: ScoredStrategy,
    constraintCount: number,
    context?: ApplicatorContext,
  ): string {
    const lines: string[] = [];

    const ctxBits: string[] = [];
    if (context?.material) ctxBits.push(`material ${context.material}`);
    if (context?.operation) ctxBits.push(`operation ${context.operation}`);
    if (context?.feature) ctxBits.push(`feature ${context.feature}`);
    if (ctxBits.length > 0) lines.push(`Context: ${ctxBits.join(", ")}.`);

    lines.push(
      `Selected "${chosen.name}" (combined ${chosen.combinedScore.toFixed(3)} = base ` +
        `${chosen.baseScore.toFixed(2)} x tribal ${chosen.tribalScore.toFixed(2)}).`,
    );

    if (chosen.id !== naivePick.id) {
      lines.push(
        `Tribal knowledge OVERRODE the naive pick "${naivePick.name}" ` +
          `(base ${naivePick.baseScore.toFixed(2)}) because it carried ${naivePick.violations.length} ` +
          `violation(s), dropping its true combined outcome to ${naivePick.combinedScore.toFixed(3)}.`,
      );
    } else {
      lines.push(`The naive and tribal-aware pickers agree — the chosen strategy is already shop-floor sound.`);
    }

    if (chosen.violations.length === 0) {
      lines.push(`Chosen strategy is clean against all ${constraintCount} tribal constraint(s).`);
    } else {
      const crit = chosen.violations.filter((v) => v.severity === "critical").length;
      lines.push(
        `Chosen strategy still carries ${chosen.violations.length} residual caution(s)` +
          (crit > 0 ? ` including ${crit} CRITICAL` : "") +
          `: ${chosen.violations.map((v) => v.constraintId).join(", ")}.`,
      );
    }

    return lines.join(" ");
  }

  /** Engine introspection — invocation telemetry + scoring configuration. */
  getStats(): {
    applyCount: number;
    lastImprovementPct: number;
    severityWeights: Record<RuleSeverity, number>;
    version: string;
  } {
    return {
      applyCount: this.applyCount,
      lastImprovementPct: this.lastImprovementPct,
      severityWeights: { ...SEVERITY_PENALTY },
      version: "1.0.0",
    };
  }
}

export const tribalKnowledgeApplicatorEngine = new TribalKnowledgeApplicatorEngine();
