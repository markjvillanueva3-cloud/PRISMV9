/**
 * CrossProcessTierRouterEngine — XPROC-NEURAL Tier 12 (T12-01)
 *
 * Query classifier that routes natural-language operator questions to the
 * correct XPROC-NEURAL tier(s). Without this, every caller has to memorize
 * "is this a T9-03 question or a T11-04 question?" — the router carries
 * that knowledge so the orchestrator (T12-02) can fan out to the right
 * engines.
 *
 * Design: keyword + intent matching against a fixed routing table.
 * NOT a learned classifier — deterministic, testable, auditable. Each
 * routing rule has:
 *   - matcher: regex over normalized query text
 *   - intent: enum classifying the question type
 *   - tiers: ordered list of tiers to invoke (primary first)
 *   - reason: human-readable explanation tied to roadmap
 *
 * Routing decisions are returned with `availability` flags indicating
 * which routed tiers are actually built vs. blocked on prerequisites.
 * The orchestrator (T12-02) consumes this to graceful-degrade.
 *
 * Per CLAUDE.md: this engine is operator-facing and never modifies state.
 * It SUGGESTS tiers; the orchestrator and operator approve invocation.
 *
 * @module CrossProcessTierRouterEngine
 */

import { z } from "zod";

const RouteInputSchema = z.object({
  query: z.string().min(1).max(2000).describe("Natural-language operator question"),
  context_hint: z.enum([
    "prediction", "safety", "explanation", "exploration",
    "calibration", "fleet", "novel_material", "auto",
  ]).default("auto").describe("Optional disambiguator when query is ambiguous"),
  max_tiers: z.number().int().min(1).max(11).default(4).describe("Cap on returned tier count"),
});
export type RouteInput = z.infer<typeof RouteInputSchema>;

export type Intent =
  | "predict"
  | "safety_check"
  | "explain_failure"
  | "active_learning"
  | "novelty_check"
  | "doe_plan"
  | "trust_score"
  | "causal_effect"
  | "intervention"
  | "counterfactual"
  | "constraint_check"
  | "general";

export type TierId =
  | "T1-01" | "T1-02" | "T1-03" | "T1-04" | "T1-05"
  | "T2-01" | "T2-02" | "T2-03" | "T2-04"
  | "T3-01" | "T3-02" | "T3-03" | "T3-04"
  | "T4-01" | "T4-02" | "T4-03" | "T4-04"
  | "T5-01" | "T5-02" | "T5-03" | "T5-04"
  | "T6-01" | "T6-02" | "T6-03" | "T6-04"
  | "T7-01" | "T7-02" | "T7-03" | "T7-04"
  | "T8-01" | "T8-02" | "T8-03" | "T8-04"
  | "T9-01" | "T9-02" | "T9-03" | "T9-04"
  | "T10-01" | "T10-02" | "T10-03" | "T10-04"
  | "T11-01" | "T11-02" | "T11-03" | "T11-04";

export interface RoutedTier {
  tier_id: TierId;
  engine_id: string;
  confidence: number;       // 0..1
  reason: string;
  available: boolean;       // false → engine not yet built
}

export interface RouteResult {
  intent: Intent;
  tiers: RoutedTier[];
  unavailable_tiers: TierId[];
  rationale: string;
}

// Engines that are actually shipped (read from disk would be ideal — this is
// the deterministic snapshot and updates with each tier ship)
const AVAILABLE_TIERS = new Set<TierId>([
  "T8-01", "T8-03",
  "T9-01", "T9-02", "T9-03", "T9-04",
  "T11-01", "T11-02", "T11-03", "T11-04",
]);

const ENGINE_BY_TIER: Record<TierId, string> = {
  "T1-01": "CrossProcessSpeedFeedRouterEngine",
  "T1-02": "CrossProcessTransferModelEngine",
  "T1-03": "CrossProcessSimilarityKernelEngine",
  "T1-04": "CrossProcessConformalPredictorEngine",
  "T1-05": "CrossProcessAGIBridgeEngine",
  "T2-01": "CrossProcessReplayBufferEngine",
  "T2-02": "CrossProcessEpisodicMemoryEngine",
  "T2-03": "CrossProcessConsolidationEngine",
  "T2-04": "CrossProcessForgetCurveEngine",
  "T3-01": "CrossProcessOnlineRegressorEngine",
  "T3-02": "CrossProcessDriftDetectorEngine",
  "T3-03": "CrossProcessRollingCalibratorEngine",
  "T3-04": "CrossProcessAdaptiveLearningRateEngine",
  "T4-01": "CrossProcessRLAgentEngine",
  "T4-02": "CrossProcessRewardShapingEngine",
  "T4-03": "CrossProcessPolicyEvaluatorEngine",
  "T4-04": "CrossProcessExperienceReplayEngine",
  "T5-01": "CrossProcessBayesianPriorEngine",
  "T5-02": "CrossProcessConformalIntervalEngine",
  "T5-03": "CrossProcessVarianceDecomposerEngine",
  "T5-04": "CrossProcessTrustScorerEngine",
  "T6-01": "CrossProcessFedAvgEngine",
  "T6-02": "CrossProcessSecureAggregatorEngine",
  "T6-03": "CrossProcessDifferentialPrivacyEngine",
  "T6-04": "CrossProcessByzantineRobustEngine",
  "T7-01": "CrossProcessMAMLEngine",
  "T7-02": "CrossProcessProtoNetEngine",
  "T7-03": "CrossProcessFewShotAdapterEngine",
  "T7-04": "CrossProcessHyperparameterTunerEngine",
  "T8-01": "CrossProcessSymbolicConstraintEnforcerEngine",
  "T8-02": "CrossProcessFormulaInjectionEngine",
  "T8-03": "CrossProcessNeuroSymbolicSafetyVerifierEngine",
  "T8-04": "CrossProcessHybridBlendEngine",
  "T9-01": "CrossProcessCausalGraphLearnerEngine",
  "T9-02": "CrossProcessDoCalculusEngine",
  "T9-03": "CrossProcessCounterfactualPredictorEngine",
  "T9-04": "CrossProcessMediationAnalyzerEngine",
  "T10-01": "CrossProcessVisionMLEngine",
  "T10-02": "CrossProcessTimeSeriesEngine",
  "T10-03": "CrossProcessTextEmbeddingEngine",
  "T10-04": "CrossProcessMultiModalFusionEngine",
  "T11-01": "CrossProcessUncertaintyDrivenSamplerEngine",
  "T11-02": "CrossProcessNoveltyDetectorEngine",
  "T11-03": "CrossProcessCuriosityDrivenExplorationEngine",
  "T11-04": "CrossProcessBayesianDOEPlannerEngine",
};

interface RoutingRule {
  intent: Intent;
  matchers: RegExp[];
  tiers: Array<{ tier: TierId; confidence: number; reason: string }>;
}

const ROUTES: RoutingRule[] = [
  {
    intent: "predict",
    matchers: [/predict\b/i, /\bsf\b|speed.*feed|speed-feed/i, /what.*should.*be|what.*value/i, /recommend.*param/i],
    tiers: [
      { tier: "T1-02", confidence: 0.9, reason: "Cross-process transfer learning predicts SF for new context" },
      { tier: "T7-02", confidence: 0.6, reason: "Few-shot proto-net handles unseen materials" },
      { tier: "T1-03", confidence: 0.5, reason: "Similarity kernel weights similar past jobs" },
      { tier: "T5-02", confidence: 0.4, reason: "Conformal interval bounds the prediction" },
    ],
  },
  {
    intent: "safety_check",
    matchers: [/\bsafe\b|safety|spindle|crash/i, /verify.*constraint/i, /can.*we.*run/i, /\bvalidate\b/i],
    tiers: [
      { tier: "T8-03", confidence: 0.95, reason: "Neuro-symbolic safety verifier composes constraint + safety" },
      { tier: "T8-01", confidence: 0.85, reason: "Symbolic constraint enforcer checks Kienzle/Taylor/RPM" },
    ],
  },
  {
    intent: "explain_failure",
    matchers: [/why.*fail|failure mode|root cause/i, /what.*caused/i, /diagnose/i],
    tiers: [
      { tier: "T9-03", confidence: 0.9, reason: "Counterfactual predictor: what would have happened differently" },
      { tier: "T9-04", confidence: 0.7, reason: "Mediation analyzer: which variable conducted the failure" },
      { tier: "T9-02", confidence: 0.5, reason: "Do-calculus: identifies confounders behind the symptom" },
    ],
  },
  {
    intent: "causal_effect",
    matchers: [/causal|effect of|impact of|due to/i, /attribut/i],
    tiers: [
      { tier: "T9-02", confidence: 0.85, reason: "Do-calculus computes interventional effect with back-door" },
      { tier: "T9-01", confidence: 0.7, reason: "PC-algorithm DAG learner builds the graph for identification" },
      { tier: "T9-04", confidence: 0.6, reason: "Mediation decomposes total effect into NDE + NIE" },
    ],
  },
  {
    intent: "intervention",
    matchers: [/intervention|intervene|do\(|set.*to|force.*value/i],
    tiers: [
      { tier: "T9-02", confidence: 0.9, reason: "Do-calculus identify+intervene primitives" },
    ],
  },
  {
    intent: "counterfactual",
    matchers: [/what.*if|counterfactual|would.*have/i, /alternative outcome/i],
    tiers: [
      { tier: "T9-03", confidence: 0.95, reason: "Pearl twin-network counterfactual" },
    ],
  },
  {
    intent: "active_learning",
    matchers: [/active.*learn|next.*experiment|which.*to.*run/i, /prioritize.*pending/i],
    tiers: [
      { tier: "T11-01", confidence: 0.9, reason: "k-NN variance ranks pending jobs by uncertainty" },
      { tier: "T11-04", confidence: 0.8, reason: "Bayesian DOE plans budget-bounded run set" },
    ],
  },
  {
    intent: "novelty_check",
    matchers: [/novel|new material|unseen|out.of.dist|outlier/i],
    tiers: [
      { tier: "T11-02", confidence: 0.95, reason: "Median-normalized k-NN distance flags far-out candidates" },
    ],
  },
  {
    intent: "doe_plan",
    matchers: [/doe|design.*experiment|experiment.*plan|budget.*run/i],
    tiers: [
      { tier: "T11-04", confidence: 0.95, reason: "Greedy MI-max GP-surrogate planner" },
      { tier: "T11-01", confidence: 0.5, reason: "Variance ranking seeds the candidate pool" },
    ],
  },
  {
    intent: "trust_score",
    matchers: [/trust|trustworth|reliable|confiden|certain/i, /\bcalibrat/i],
    tiers: [
      { tier: "T5-04", confidence: 0.85, reason: "Trust scorer composes prediction + interval + drift" },
      { tier: "T1-04", confidence: 0.7, reason: "Conformal predictor provides distribution-free coverage" },
      { tier: "T5-02", confidence: 0.6, reason: "Conformal interval direct" },
    ],
  },
  {
    intent: "constraint_check",
    matchers: [/constraint|formula bound|kienzle|taylor|enforce/i],
    tiers: [
      { tier: "T8-01", confidence: 0.95, reason: "Symbolic constraint enforcer projects predictions onto feasible region" },
      { tier: "T8-02", confidence: 0.6, reason: "Formula injection blends ML with physics" },
    ],
  },
];

const HINT_TO_INTENT: Record<string, Intent> = {
  prediction: "predict",
  safety: "safety_check",
  explanation: "explain_failure",
  exploration: "active_learning",
  calibration: "trust_score",
  novel_material: "novelty_check",
  fleet: "general",
  auto: "general",
};

export class CrossProcessTierRouterEngine {
  /**
   * Route a query to relevant XPROC-NEURAL tiers.
   */
  static route(input: RouteInput): RouteResult {
    const parsed = RouteInputSchema.parse(input);
    const norm = parsed.query.toLowerCase().trim();

    // Try matchers; on miss, fall back to context_hint
    const matched: Array<{ rule: RoutingRule; score: number }> = [];
    for (const rule of ROUTES) {
      let score = 0;
      for (const re of rule.matchers) {
        if (re.test(norm)) score += 1;
      }
      if (score > 0) matched.push({ rule, score });
    }

    let intent: Intent;
    let tierBag: Array<{ tier: TierId; confidence: number; reason: string }>;

    if (matched.length === 0) {
      // Fall back to hint
      intent = HINT_TO_INTENT[parsed.context_hint] ?? "general";
      const hintRule = ROUTES.find((r) => r.intent === intent);
      tierBag = hintRule?.tiers ?? [];
      if (tierBag.length === 0) {
        return {
          intent: "general",
          tiers: [],
          unavailable_tiers: [],
          rationale: `No matchers fired and hint='${parsed.context_hint}' did not resolve to any tier; consider rephrasing.`,
        };
      }
    } else {
      // Take the highest-scoring matched rule
      matched.sort((a, b) => b.score - a.score);
      intent = matched[0].rule.intent;
      tierBag = matched[0].rule.tiers;
    }

    // Build routed tiers, sorted by confidence
    const routed: RoutedTier[] = tierBag
      .map((t) => ({
        tier_id: t.tier,
        engine_id: ENGINE_BY_TIER[t.tier],
        confidence: t.confidence,
        reason: t.reason,
        available: AVAILABLE_TIERS.has(t.tier),
      }))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, parsed.max_tiers);

    const unavailable = routed.filter((r) => !r.available).map((r) => r.tier_id);

    return {
      intent,
      tiers: routed,
      unavailable_tiers: unavailable,
      rationale: `Intent='${intent}'. Routed to ${routed.length} tier(s); ${routed.length - unavailable.length} available, ${unavailable.length} blocked on prerequisites.`,
    };
  }

  /**
   * Explain why a tier was routed (for audit/operator transparency).
   */
  static explain(input: RouteInput): { intent: Intent; explanations: Array<{ tier_id: TierId; reason: string; available: boolean }> } {
    const result = this.route(input);
    return {
      intent: result.intent,
      explanations: result.tiers.map((t) => ({ tier_id: t.tier_id, reason: t.reason, available: t.available })),
    };
  }

  static readonly engineId = "CrossProcessTierRouterEngine";
  static readonly version = "1.0.0";
  static readonly tier = "T12-01";
}

export const crossProcessTierRouterEngine = CrossProcessTierRouterEngine;

export function crossProcessTierRouter(action: string, params: Record<string, unknown>): unknown {
  switch (action) {
    case "xproc_route_query":
      return CrossProcessTierRouterEngine.route(params as RouteInput);
    case "xproc_route_explain":
      return CrossProcessTierRouterEngine.explain(params as RouteInput);
    default:
      throw new Error(`crossProcessTierRouter: unknown action '${action}'`);
  }
}
