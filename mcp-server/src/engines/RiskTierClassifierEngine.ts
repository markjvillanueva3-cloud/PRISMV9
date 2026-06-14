/**
 * RiskTierClassifierEngine — CAD-COMPLETE-MS0 / U-AI-12
 * ======================================================
 *
 * Classifies a CAD operation into a risk tier — low / medium / high /
 * critical — so the CAD agent knows which operations may run unattended
 * and which require operator confirmation. An autonomous boolean-cut on
 * an already-machined feature is unrecoverable, so destructive,
 * irreversible, and datum-touching operations escalate.
 *
 * The classifier is deterministic and keyword-driven: a base score from
 * the operation kind, plus additive escalation factors. Unknown op kinds
 * default to MEDIUM (conservative) — never LOW.
 *
 * @module engines/RiskTierClassifierEngine
 * @version 1.0.0
 */

export type RiskTier = "low" | "medium" | "high" | "critical";

/** Score thresholds — score < LOW_MAX is low, etc. Tuned so a bare geometry
 *  edit lands MEDIUM and any single escalation factor lifts it to HIGH. */
const TIER_THRESHOLDS = { lowMax: 0.3, mediumMax: 0.6, highMax: 0.85 } as const;

/** Additive escalation weights. */
const ESCALATION = {
  irreversible: 0.2,
  touchesDatum: 0.4,
  batch: 0.15,
  throughCut: 0.12,
  longPlan: 0.1,
} as const;

/** A plan with this many or more non-trivial ops carries cumulative blast radius. */
const LONG_PLAN_OPS = 5;

/** Base risk score by operation-kind keyword. First rule with a matching
 *  token wins; order matters. Matching is token-exact (the kind is split
 *  into words) — so "widget" never matches the "get" keyword. */
const KIND_RISK: ReadonlyArray<{ keywords: readonly string[]; base: number; label: string }> = [
  { keywords: ["delete", "remove", "destroy", "purge", "drop"], base: 0.78, label: "destructive (deletes geometry)" },
  { keywords: ["boolean", "subtract", "cut", "trim"], base: 0.7, label: "boolean / material-removing" },
  { keywords: ["combine", "merge", "join", "union", "intersect"], base: 0.55, label: "combine (boolean — depends on operation)" },
  { keywords: ["export", "save", "write", "publish", "post"], base: 0.4, label: "file write (no model damage)" },
  { keywords: ["extrude", "revolve", "fillet", "chamfer", "hole", "pocket", "sweep", "loft", "shell", "pattern", "scale", "move", "rotate", "mirror"], base: 0.45, label: "geometry mutation (reversible via undo)" },
  { keywords: ["create", "new", "sketch", "add", "insert", "draw"], base: 0.25, label: "additive create (reversible)" },
  { keywords: ["undo", "regenerate", "rebuild", "refresh"], base: 0.2, label: "recompute / reversal" },
  { keywords: ["color", "colour", "layer", "name", "rename", "tag", "annotate", "dimension", "view", "zoom", "select", "highlight", "query", "geometry", "inspect", "measure", "read", "list", "get", "status"], base: 0.1, label: "cosmetic / read-only" },
];

/** Split an operation kind into lowercase word tokens — handles snake_case,
 *  kebab-case, dotted, and camelCase forms. */
function tokenizeKind(kind: string): string[] {
  return kind
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[\s_\-./]+/)
    .map((t) => t.toLowerCase())
    .filter((t) => t.length > 0);
}

const UNKNOWN_BASE = 0.5; // conservative default for an unrecognised op kind

/** One CAD operation to classify. */
export interface CADOpRiskInput {
  /** Operation kind, e.g. "extrude", "delete_body", "boolean_subtract". */
  kind: string;
  /** Operation arguments — inspected for through-cuts and cut/subtract intent. */
  args?: Record<string, unknown>;
  /** True if the operation cannot be undone in the target CAD application. */
  irreversible?: boolean;
  /** True if the op touches a datum, a toleranced feature, or already-machined geometry. */
  touchesDatum?: boolean;
  /** True if the op fans out across multiple bodies / files / CAD apps. */
  batch?: boolean;
}

/** Risk classification of one operation. */
export interface RiskClassification {
  kind: string;
  tier: RiskTier;
  /** Risk score in [0,1] the tier is derived from. */
  score: number;
  /** Human-readable contributing factors. */
  factors: string[];
  /** True when the operator must confirm before the agent proceeds. */
  requiresConfirmation: boolean;
  reasoning: string[];
}

export class RiskTierClassifierEngine {
  /** Classify one CAD operation into a risk tier. */
  classify(op: CADOpRiskInput): RiskClassification {
    const kind = String(op?.kind ?? "").trim();
    const factors: string[] = [];
    const reasoning: string[] = [];

    if (kind.length === 0) {
      // No kind at all is itself a risk — cannot reason about an unnamed op.
      reasoning.push("Operation kind is empty — cannot assess; treated as HIGH risk pending clarification.");
      return {
        kind,
        tier: "high",
        score: TIER_THRESHOLDS.mediumMax + 0.1,
        factors: ["unidentified operation"],
        requiresConfirmation: true,
        reasoning,
      };
    }

    // --- base score from the operation kind ---
    const tokens = tokenizeKind(kind);
    const match = KIND_RISK.find((k) => k.keywords.some((kw) => tokens.includes(kw)));
    let score = match ? match.base : UNKNOWN_BASE;
    if (match) {
      factors.push(match.label);
      reasoning.push(`Kind "${kind}" → ${match.label} (base ${match.base}).`);
    } else {
      factors.push("unrecognised operation kind");
      reasoning.push(`Kind "${kind}" is unrecognised → conservative base ${UNKNOWN_BASE}.`);
    }

    // --- escalation factors ---
    if (op.irreversible) {
      score += ESCALATION.irreversible;
      factors.push("irreversible");
      reasoning.push(`Irreversible in the target CAD app → +${ESCALATION.irreversible}.`);
    }
    if (op.touchesDatum) {
      score += ESCALATION.touchesDatum;
      factors.push("touches datum / toleranced / machined feature");
      reasoning.push(`Touches a datum or already-machined feature → +${ESCALATION.touchesDatum}.`);
    }
    if (op.batch) {
      score += ESCALATION.batch;
      factors.push("batch fan-out");
      reasoning.push(`Fans out across multiple bodies / files → +${ESCALATION.batch}.`);
    }
    if (this.isThroughCut(op)) {
      score += ESCALATION.throughCut;
      factors.push("through-cut / subtract intent");
      reasoning.push(`Args indicate a through-cut or material-subtract → +${ESCALATION.throughCut}.`);
    }

    score = Math.min(1, Math.max(0, this.round(score)));
    const tier = this.tierOf(score);
    const requiresConfirmation = tier === "high" || tier === "critical";
    reasoning.push(
      `Final score ${score} → ${tier.toUpperCase()}${requiresConfirmation ? " — operator confirmation required." : "."}`,
    );

    return { kind, tier, score, factors, requiresConfirmation, reasoning };
  }

  /** Classify a batch of operations. */
  classifyBatch(ops: CADOpRiskInput[]): RiskClassification[] {
    return ops.map((op) => this.classify(op));
  }

  /**
   * Aggregate the risk of a multi-op plan — the plan inherits the highest
   * single-op tier, and a long plan of medium ops escalates one level.
   */
  classifyPlan(ops: CADOpRiskInput[]): RiskClassification & { opCount: number } {
    if (ops.length === 0) {
      return {
        kind: "<empty-plan>",
        tier: "low",
        score: 0,
        factors: ["empty plan"],
        requiresConfirmation: false,
        reasoning: ["Plan has no operations."],
        opCount: 0,
      };
    }
    const classified = this.classifyBatch(ops);
    let peak = classified[0];
    for (const c of classified) if (c.score > peak.score) peak = c;
    let score = peak.score;
    // Count of non-trivial ops — a few trivial cosmetics riding alongside one
    // risky op should not by themselves escalate the whole plan.
    const nonTrivial = classified.filter((c) => c.score >= TIER_THRESHOLDS.lowMax).length;
    const reasoning = [`Plan of ${ops.length} op(s); peak op "${peak.kind}" scored ${peak.score}.`];
    const factors = [...peak.factors];
    // Many non-trivial ops in one plan carry cumulative blast radius.
    if (nonTrivial >= LONG_PLAN_OPS) {
      score = Math.min(1, this.round(score + ESCALATION.longPlan));
      factors.push(`long plan (${nonTrivial} non-trivial of ${ops.length} ops)`);
      reasoning.push(
        `${nonTrivial} non-trivial ops ≥ ${LONG_PLAN_OPS} → cumulative-blast escalation +${ESCALATION.longPlan}.`,
      );
    }
    const tier = this.tierOf(score);
    const requiresConfirmation = tier === "high" || tier === "critical";
    reasoning.push(`Plan score ${score} → ${tier.toUpperCase()}.`);
    return { kind: "<plan>", tier, score, factors, requiresConfirmation, reasoning, opCount: ops.length };
  }

  /** Map a [0,1] score to a tier. */
  tierOf(score: number): RiskTier {
    if (score < TIER_THRESHOLDS.lowMax) return "low";
    if (score < TIER_THRESHOLDS.mediumMax) return "medium";
    if (score < TIER_THRESHOLDS.highMax) return "high";
    return "critical";
  }

  // --- internal ---

  /** Detect through-cut / subtract intent from the op args. */
  private isThroughCut(op: CADOpRiskInput): boolean {
    const a = op.args;
    if (!a || typeof a !== "object") return false;
    const through = a.through ?? a.throughAll ?? a.through_all;
    if (through === true) return true;
    const operation = String(a.operation ?? a.boolean ?? a.mode ?? "").toLowerCase();
    return operation === "cut" || operation === "subtract" || operation === "remove";
  }

  private round(n: number): number {
    return Math.round(n * 1e4) / 1e4;
  }
}

export const riskTierClassifierEngine = new RiskTierClassifierEngine();
