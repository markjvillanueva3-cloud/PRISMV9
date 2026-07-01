/**
 * SinkerAGIMasterEngine — die-sinking-EDM domain AGI master.
 *
 * Roadmap unit AGI-MASTER-PARITY-MS30 / P0-U02 — "SinkerAGIMasterEngine
 * using the existing sinker engines". Brings the sinker (die-sinking) EDM
 * domain to parity with milling, which already has {@link MillingAGIMasterEngine}.
 *
 * This is the reasoning + orchestration layer for sinker EDM: it does NOT
 * re-implement any process physics. It owns a typed capability catalog of
 * the eight sinker-EDM capabilities already wired into the `prism_edm`
 * dispatcher, matches a free-text task intent against that catalog, and
 * emits an ORDERED execution plan of real dispatcher actions plus a
 * mode-specific reasoning trace. A caller (or the dispatcher) then executes
 * the plan — the master plans, the leaf engines compute.
 *
 * The eight catalog capabilities map 1:1 onto verified `prism_edm` actions:
 *   sinker_calculate · sinker_materials · sinker_vdi_scale · sinker_recommend
 *   sinker_edm_electrode_plan · sinker_edm_flush_recommend
 *   sinker_edm_wear_compensate · sinker_edm_electrode_inspect
 *
 * Pure: no I/O, no state mutation, deterministic. Input is Zod-validated.
 *
 * References:
 *   - Sommer & Sommer, "Complete EDM Handbook", ch.6 — die-sinking workflow
 *     (electrode design → burn settings → flushing → wear → finish → QC).
 *   - PRISM MillingAGIMasterEngine — domain-AGI-master shape this matches.
 */

import { z } from "zod";

/** Catalog schema version — bump when CAPABILITIES changes shape. */
const CATALOG_VERSION = "1.0.0";

/** A finite, strictly-positive guard is not needed here — all inputs are
 *  strings — but the Zod schema is still explicit for MCP description use. */
export const SinkerAGIInputSchema = z.object({
  /** Free-text description of the sinker-EDM task to plan. */
  intent: z.string().min(1, "intent must be a non-empty string"),
  /** Reasoning mode; defaults to chain_of_thought. */
  reasoningMode: z
    .enum(["chain_of_thought", "multi_path", "deductive", "analogical"])
    .optional(),
  /** Optional electrode/workpiece material — folded into intent matching. */
  material: z.string().optional(),
  /** Optional free-text constraints — folded into intent matching. */
  constraints: z.array(z.string()).optional(),
});
export type SinkerAGIInput = z.infer<typeof SinkerAGIInputSchema>;

export type SinkerAGIReasoningMode = NonNullable<
  SinkerAGIInput["reasoningMode"]
>;

/** One sinker-EDM capability the master can route to. */
interface SinkerCapability {
  /** Stable capability id. */
  id: string;
  /** Real `prism_edm` dispatcher action that executes this capability. */
  dispatcherAction: string;
  /** Backing engine class (documentation / provenance). */
  backingEngine: string;
  /** One-line capability description. */
  description: string;
  /** Position in the canonical die-sinking workflow (1 = earliest). */
  workflowOrder: number;
  /** Lowercase keywords that route an intent to this capability. */
  keywords: string[];
}

/**
 * The eight sinker-EDM capabilities, in canonical die-sinking workflow
 * order: pick electrode material → design the electrode → compute the
 * burn → refine settings → plan flushing → compensate wear → target the
 * finish → inspect the cavity. Each `dispatcherAction` is a verified
 * `prism_edm` action (edmDispatcher.ts lines 233/350-351).
 */
const CAPABILITIES: readonly SinkerCapability[] = [
  {
    id: "material",
    dispatcherAction: "sinker_materials",
    backingEngine: "SinkerEDMCalculatorEngine",
    description: "Electrode/workpiece material lookup and properties",
    workflowOrder: 1,
    keywords: [
      "material",
      "materials",
      "graphite",
      "copper",
      "tungsten",
      "conductivity",
      "electrode material",
    ],
  },
  {
    id: "electrode_plan",
    dispatcherAction: "sinker_edm_electrode_plan",
    backingEngine: "SinkerEDMElectrodeGeometryEngine",
    description: "Electrode geometry planning and overcut/undersize sizing",
    workflowOrder: 2,
    keywords: [
      "electrode",
      "geometry",
      "overcut",
      "undersize",
      "design",
      "plan",
      "rib",
      "detail electrode",
    ],
  },
  {
    id: "calculate",
    dispatcherAction: "sinker_calculate",
    backingEngine: "SinkerEDMCalculatorEngine",
    description: "Core EDM process calculation — MRR, burn time, parameters",
    workflowOrder: 3,
    keywords: [
      "calculate",
      "mrr",
      "removal",
      "burn time",
      "cycle time",
      "parameter",
      "discharge",
      "current",
      "pulse",
    ],
  },
  {
    id: "recommend",
    dispatcherAction: "sinker_recommend",
    backingEngine: "SinkerEDMCalculatorEngine",
    description: "Process-setting recommendation and register selection",
    workflowOrder: 4,
    keywords: [
      "recommend",
      "recommendation",
      "settings",
      "register",
      "suggest",
      "optimize",
      "optimise",
    ],
  },
  {
    id: "flushing",
    dispatcherAction: "sinker_edm_flush_recommend",
    backingEngine: "SinkerEDMFlushingAdvisorEngine",
    description: "Dielectric flushing strategy — pressure, jump cycle, debris",
    workflowOrder: 5,
    keywords: [
      "flush",
      "flushing",
      "debris",
      "dielectric",
      "jump",
      "pressure",
      "lift",
    ],
  },
  {
    id: "wear_compensation",
    dispatcherAction: "sinker_edm_wear_compensate",
    backingEngine: "SinkerEDMWearCompensationEngine",
    description: "Electrode wear compensation and orbit/depth correction",
    workflowOrder: 6,
    keywords: [
      "wear",
      "compensation",
      "compensate",
      "orbit",
      "depth correction",
      "electrode wear",
    ],
  },
  {
    id: "vdi_finish",
    dispatcherAction: "sinker_vdi_scale",
    backingEngine: "SinkerEDMCalculatorEngine",
    description: "VDI 3400 surface-finish scale and roughness targeting",
    workflowOrder: 7,
    keywords: [
      "vdi",
      "surface",
      "finish",
      "roughness",
      "texture",
      "polish",
    ],
  },
  {
    id: "inspection",
    dispatcherAction: "sinker_edm_electrode_inspect",
    backingEngine: "SinkerEDMElectrodeInspectionEngine",
    description: "Electrode/cavity inspection with spark-gap back-calculation",
    workflowOrder: 8,
    keywords: [
      "inspect",
      "inspection",
      "cavity",
      "spark gap",
      "measure",
      "verify",
      "qc",
      "quality",
    ],
  },
] as const;

/** One step of the reasoning trace. */
export interface SinkerReasoningStep {
  step: number;
  /** What the master concluded at this step. */
  thought: string;
  /** Step-local confidence, 0..1. */
  confidence: number;
}

/** One ordered item of the execution plan. */
export interface SinkerEnginePlanItem {
  /** 1-based position in the ordered plan. */
  order: number;
  capabilityId: string;
  /** Real `prism_edm` action the caller invokes. */
  dispatcherAction: string;
  backingEngine: string;
  /** Why this capability was routed in. */
  reason: string;
  /** Intent keywords that triggered the match (empty on fallback routing). */
  matchedKeywords: string[];
}

export interface SinkerAGIRecommendation {
  topic: string;
  detail: string;
}

export interface SinkerAGIResult {
  intent: string;
  reasoningMode: SinkerAGIReasoningMode;
  reasoningSteps: SinkerReasoningStep[];
  /** Ordered die-sinking-workflow plan of real dispatcher actions. */
  enginePlan: SinkerEnginePlanItem[];
  recommendations: SinkerAGIRecommendation[];
  /** Overall plan confidence, 0..1. */
  confidence: number;
  provenance: {
    /** Total capabilities in the catalog (always 8). */
    enginesConsidered: number;
    /** Capabilities routed into the plan. */
    enginesRouted: number;
    /** True when no keyword matched and the full workflow was used. */
    fallbackPlan: boolean;
    catalogVersion: string;
  };
  warnings: string[];
  summary: string;
}

/** Tokens shorter than this are dropped before keyword matching. */
const MIN_TOKEN_LEN = 3;
/** Confidence assigned to a pure-fallback plan (zero keyword matches). */
const FALLBACK_CONFIDENCE = 0.25;
/** Matched-keyword count treated as a fully "strong" capability match. */
const STRONG_MATCH_KEYWORD_COUNT = 3;
/** Intent token count treated as "rich" enough for full richness credit. */
const RICH_INTENT_TOKEN_COUNT = 4;

class SinkerAGIMasterEngine {
  /**
   * Plan a sinker-EDM task: match the intent against the eight-capability
   * catalog and emit an ordered execution plan plus a reasoning trace.
   *
   * @param rawInput - {@link SinkerAGIInput} (Zod-validated).
   * @returns A {@link SinkerAGIResult}.
   * @throws  ZodError on malformed input (consistent with the sinker engine family).
   */
  reason(rawInput: unknown): SinkerAGIResult {
    const input = SinkerAGIInputSchema.parse(rawInput);
    const mode: SinkerAGIReasoningMode =
      input.reasoningMode ?? "chain_of_thought";
    const warnings: string[] = [];

    // Fold material + constraints into the text the matcher sees.
    const haystack = [
      input.intent,
      input.material ?? "",
      ...(input.constraints ?? []),
    ]
      .join(" ")
      .toLowerCase();
    const tokens = this.#tokenize(haystack);

    // Score every capability by keyword overlap (token equality OR the
    // keyword appearing as a phrase substring — keywords may be multi-word).
    const scored = CAPABILITIES.map((cap) => {
      const matchedKeywords: string[] = [];
      for (const kw of cap.keywords) {
        const k = kw.trim();
        const hit = k.includes(" ")
          ? haystack.includes(k)
          : tokens.has(k);
        if (hit) matchedKeywords.push(kw);
      }
      return { cap, matchedKeywords };
    });

    const matched = scored.filter((s) => s.matchedKeywords.length > 0);
    const fallbackPlan = matched.length === 0;
    if (fallbackPlan) {
      warnings.push(
        "No catalog keyword matched the intent — routed the full canonical " +
          "die-sinking workflow as a fallback plan; refine the intent for a " +
          "tighter route",
      );
    }

    // The plan: matched capabilities (or all eight on fallback), ordered by
    // the canonical die-sinking workflow precedence.
    const planSource = (fallbackPlan
      ? scored
      : matched
    )
      .slice()
      .sort((a, b) => a.cap.workflowOrder - b.cap.workflowOrder);

    const enginePlan: SinkerEnginePlanItem[] = planSource.map((s, i) => ({
      order: i + 1,
      capabilityId: s.cap.id,
      dispatcherAction: s.cap.dispatcherAction,
      backingEngine: s.cap.backingEngine,
      reason: fallbackPlan
        ? `Fallback: ${s.cap.description} (canonical workflow stage ${s.cap.workflowOrder})`
        : `Routed by intent — ${s.cap.description}`,
      matchedKeywords: s.matchedKeywords,
    }));

    const confidence = this.#confidence(
      matched.length,
      tokens.size,
      scored,
      fallbackPlan,
    );
    const reasoningSteps = this.#trace(mode, input.intent, enginePlan, confidence);
    const recommendations = this.#recommend(enginePlan, fallbackPlan);

    return {
      intent: input.intent,
      reasoningMode: mode,
      reasoningSteps,
      enginePlan,
      recommendations,
      confidence,
      provenance: {
        enginesConsidered: CAPABILITIES.length,
        enginesRouted: enginePlan.length,
        fallbackPlan,
        catalogVersion: CATALOG_VERSION,
      },
      warnings,
      summary: this.#summary(mode, enginePlan, confidence, fallbackPlan),
    };
  }

  /** Return a defensive per-call copy of the capability catalog so a caller
   *  cannot mutate the shared module-level CAPABILITIES. */
  listCapabilities(): readonly SinkerCapability[] {
    return CAPABILITIES.map((c) => ({ ...c, keywords: [...c.keywords] }));
  }

  /** Split text into a deduped set of lowercase tokens ≥ MIN_TOKEN_LEN chars. */
  #tokenize(text: string): Set<string> {
    const out = new Set<string>();
    for (const raw of text.split(/[^a-z0-9]+/)) {
      if (raw.length >= MIN_TOKEN_LEN) out.add(raw);
    }
    return out;
  }

  /**
   * Plan confidence on 0..1. A pure-fallback plan is fixed low. Otherwise
   * it rises with both the breadth of the route (capabilities matched / 8)
   * and its specificity (fraction of matched keyword phrases per matched
   * capability), so a precise multi-stage intent scores above a vague one.
   */
  #confidence(
    matchedCount: number,
    tokenCount: number,
    scored: { cap: SinkerCapability; matchedKeywords: string[] }[],
    fallbackPlan: boolean,
  ): number {
    if (fallbackPlan) return FALLBACK_CONFIDENCE;
    const breadth = matchedCount / CAPABILITIES.length;
    // Specificity: mean matched-keyword count across matched capabilities,
    // normalised by the strong-match reference, capped at 1.
    const matchedCaps = scored.filter((s) => s.matchedKeywords.length > 0);
    const meanKw =
      matchedCaps.reduce((a, s) => a + s.matchedKeywords.length, 0) /
      matchedCaps.length;
    const specificity = Math.min(1, meanKw / STRONG_MATCH_KEYWORD_COUNT);
    // A one-word intent cannot be highly confident regardless of a lucky hit.
    const intentRichness = Math.min(1, tokenCount / RICH_INTENT_TOKEN_COUNT);
    const raw =
      0.4 + 0.3 * breadth + 0.2 * specificity + 0.1 * intentRichness;
    return Math.max(0, Math.min(1, Number(raw.toFixed(4))));
  }

  /** Build a mode-specific reasoning trace over the planned capabilities. */
  #trace(
    mode: SinkerAGIReasoningMode,
    intent: string,
    plan: SinkerEnginePlanItem[],
    confidence: number,
  ): SinkerReasoningStep[] {
    const steps: SinkerReasoningStep[] = [];
    const push = (thought: string, c: number) =>
      steps.push({ step: steps.length + 1, thought, confidence: c });

    switch (mode) {
      case "chain_of_thought":
        push(`Interpret the sinker-EDM intent: "${intent}".`, confidence);
        for (const item of plan) {
          push(
            `Stage ${item.order}: ${item.capabilityId} → invoke prism_edm:${item.dispatcherAction}. ${item.reason}.`,
            confidence,
          );
        }
        push(
          `Chain complete — ${plan.length} stage(s) ordered by the die-sinking workflow.`,
          confidence,
        );
        break;

      case "multi_path":
        push(
          `Enumerate candidate capabilities for "${intent}" before committing to an order.`,
          confidence,
        );
        for (const item of plan) {
          push(
            `Candidate path: ${item.capabilityId} (${item.backingEngine}) — keywords [${item.matchedKeywords.join(", ") || "fallback"}].`,
            confidence,
          );
        }
        push(
          `Converge: order the candidates by canonical workflow precedence into a single executable plan.`,
          confidence,
        );
        break;

      case "deductive":
        push(
          `Premise: the intent "${intent}" states a die-sinking goal.`,
          confidence,
        );
        push(
          `Rule: each catalog keyword that fires implies its capability is required.`,
          confidence,
        );
        for (const item of plan) {
          push(
            `Therefore ${item.capabilityId} is required (prism_edm:${item.dispatcherAction}).`,
            confidence,
          );
        }
        push(
          `Conclusion: ${plan.length} capability(ies) deduced as required — the plan is complete.`,
          confidence,
        );
        break;

      case "analogical":
        push(
          `Map "${intent}" onto the canonical die-sinking template: material → electrode → burn → settings → flushing → wear → finish → inspection.`,
          confidence,
        );
        for (const item of plan) {
          push(
            `Template stage ${item.capabilityId} applies → prism_edm:${item.dispatcherAction}.`,
            confidence,
          );
        }
        push(
          `Unmatched template stages were ${plan.length === CAPABILITIES.length ? "all included" : "pruned as out of scope"}.`,
          confidence,
        );
        break;
    }
    return steps;
  }

  /** Derive a small set of actionable recommendations from the plan. */
  #recommend(
    plan: SinkerEnginePlanItem[],
    fallbackPlan: boolean,
  ): SinkerAGIRecommendation[] {
    const recs: SinkerAGIRecommendation[] = [];
    const ids = new Set(plan.map((p) => p.capabilityId));

    recs.push({
      topic: "execution",
      detail:
        `Execute the ${plan.length}-stage plan in order; each stage is a real ` +
        `prism_edm action. The master plans — the leaf engines compute.`,
    });

    if (fallbackPlan) {
      recs.push({
        topic: "intent",
        detail:
          "Intent matched no capability keyword. Name the operation " +
          "explicitly (e.g. 'electrode', 'flushing', 'wear', 'inspect') to " +
          "narrow the route from the full workflow.",
      });
    }

    // A burn that is calculated but never inspected has no QC closure.
    if (
      (ids.has("calculate") || ids.has("electrode_plan")) &&
      !ids.has("inspection")
    ) {
      recs.push({
        topic: "quality",
        detail:
          "The plan burns a cavity but omits inspection — append " +
          "sinker_edm_electrode_inspect to close the QC loop (spark-gap " +
          "back-calculation verifies the burn).",
      });
    }

    // Flushing is the dominant cause of unstable die-sinking burns.
    if (ids.has("calculate") && !ids.has("flushing")) {
      recs.push({
        topic: "stability",
        detail:
          "Process parameters are planned without a flushing strategy — " +
          "consider sinker_edm_flush_recommend; inadequate flushing is the " +
          "leading cause of secondary discharges and overcut drift.",
      });
    }

    return recs;
  }

  /** One-line human-readable summary of the plan. */
  #summary(
    mode: SinkerAGIReasoningMode,
    plan: SinkerEnginePlanItem[],
    confidence: number,
    fallbackPlan: boolean,
  ): string {
    const route = plan.map((p) => p.capabilityId).join(" → ");
    const conf = `${(confidence * 100).toFixed(0)}%`;
    return fallbackPlan
      ? `Sinker AGI master (${mode}): no keyword route — full die-sinking workflow [${route}], confidence ${conf}.`
      : `Sinker AGI master (${mode}): routed ${plan.length}/${CAPABILITIES.length} capabilities [${route}], confidence ${conf}.`;
  }
}

export const sinkerAGIMasterEngine = new SinkerAGIMasterEngine();
