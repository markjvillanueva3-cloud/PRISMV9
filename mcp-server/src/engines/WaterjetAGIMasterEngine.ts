/**
 * WaterjetAGIMasterEngine — waterjet-machining domain AGI master.
 *
 * Roadmap unit AGI-MASTER-PARITY-MS30 / P0-U04 — "WaterjetAGIMasterEngine
 * using the existing waterjet engines". Completes the non-traditional-
 * machining AGI-master parity set alongside SinkerAGIMasterEngine (P0-U02)
 * and LaserAGIMasterEngine (P0-U03), reusing that proven reasoning +
 * orchestration pattern.
 *
 * It computes no waterjet physics. It owns a typed catalog of nine
 * waterjet capabilities — backed by the six waterjet engines (one process
 * engine serves the four setup capabilities; four CAM program engines;
 * one adaptive-cadence engine) — matches a free-text intent against the
 * catalog, and emits an ORDERED execution plan plus a mode-specific
 * reasoning trace. A caller (or a dispatcher) then executes the plan —
 * the master plans, the leaf engines compute.
 *
 * The nine capabilities span two dispatchers:
 *   prism_edm : waterjet_materials · waterjet_abrasives · waterjet_calculate
 *               waterjet_quality_levels · waterjet_lora_config
 *   prism_cam : waterjet_abrasive_program · waterjet_pure_program
 *               waterjet_taper_program · waterjet_depth_program
 *
 * Pure: no I/O, no state mutation, deterministic. Input is Zod-validated.
 *
 * References:
 *   - Olsen, "Abrasive Waterjet Machining" — process-window workflow
 *     (material → abrasive → parameters → quality → operation).
 *   - PRISM LaserAGIMasterEngine — the domain-AGI-master shape reused here.
 */

import { z } from "zod";

/** Catalog schema version — bump when CAPABILITIES changes shape. */
const CATALOG_VERSION = "1.0.0";

export const WaterjetAGIInputSchema = z.object({
  /** Free-text description of the waterjet-machining task to plan. */
  intent: z.string().min(1, "intent must be a non-empty string"),
  /** Reasoning mode; defaults to chain_of_thought. */
  reasoningMode: z
    .enum(["chain_of_thought", "multi_path", "deductive", "analogical"])
    .optional(),
  /** Optional workpiece material — folded into intent matching. */
  material: z.string().optional(),
  /** Optional free-text constraints — folded into intent matching. */
  constraints: z.array(z.string()).optional(),
});
export type WaterjetAGIInput = z.infer<typeof WaterjetAGIInputSchema>;

export type WaterjetAGIReasoningMode = NonNullable<
  WaterjetAGIInput["reasoningMode"]
>;

/** Dispatcher a waterjet capability is executed through. */
export type WaterjetDispatcher = "prism_edm" | "prism_cam";

/** One waterjet-machining capability the master can route to. */
interface WaterjetCapability {
  /** Stable capability id. */
  id: string;
  /** Dispatcher that owns the executing action. */
  dispatcher: WaterjetDispatcher;
  /** Real dispatcher action that executes this capability. */
  action: string;
  /** Backing engine / handler (documentation / provenance). */
  backingEngine: string;
  /** One-line capability description. */
  description: string;
  /** Position in the canonical waterjet-process workflow (1 = earliest). */
  workflowOrder: number;
  /** Lowercase keywords that route an intent to this capability. */
  keywords: string[];
}

/**
 * The nine waterjet capabilities, in canonical waterjet-process workflow
 * order: pick the material → select abrasive → compute the jet parameters
 * → set the edge-quality target → run the operation (abrasive or pure cut,
 * with optional taper compensation / depth control) → close the adaptive-
 * tuning loop. Each `action` is verified to exist (edmDispatcher.ts lines
 * 232/355; camDispatcher.ts line 1261).
 *
 * abrasive_cut and pure_cut are the two mutually-exclusive cut MODES — a
 * job runs one or the other; taper_comp and depth_control are program
 * refinements that may accompany either.
 */
const CAPABILITIES: readonly WaterjetCapability[] = [
  {
    id: "material",
    dispatcher: "prism_edm",
    action: "waterjet_materials",
    backingEngine: "WaterjetProcessEngine (waterjet_materials)",
    description: "Workpiece material lookup — machinability, grade, thickness",
    workflowOrder: 1,
    keywords: ["material", "materials", "alloy", "grade", "composite", "laminate"],
  },
  {
    id: "abrasive",
    dispatcher: "prism_edm",
    action: "waterjet_abrasives",
    backingEngine: "WaterjetProcessEngine (waterjet_abrasives)",
    description: "Abrasive selection — garnet type, mesh / grit size",
    workflowOrder: 2,
    keywords: ["abrasive", "abrasives", "garnet", "grit", "mesh"],
  },
  {
    id: "calculate",
    dispatcher: "prism_edm",
    action: "waterjet_calculate",
    backingEngine: "WaterjetProcessEngine (waterjet_calculate)",
    description: "Jet-parameter calculation — pressure, speed, orifice, flow",
    workflowOrder: 3,
    keywords: ["calculate", "pressure", "speed", "orifice", "parameter", "flow", "nozzle"],
  },
  {
    id: "quality",
    dispatcher: "prism_edm",
    action: "waterjet_quality_levels",
    backingEngine: "WaterjetProcessEngine (waterjet_quality_levels)",
    description: "Edge-quality level selection (Q1..Q5) and finish targeting",
    workflowOrder: 4,
    keywords: ["quality", "finish", "roughness", "edge"],
  },
  {
    id: "abrasive_cut",
    dispatcher: "prism_cam",
    action: "waterjet_abrasive_program",
    backingEngine: "WaterjetAbrasiveProgramEngine (waterjet_abrasive_program)",
    description: "Abrasive-waterjet cutting program — metals and hard materials",
    workflowOrder: 5,
    keywords: ["abrasive", "metal", "steel", "titanium", "thick", "contour", "sever"],
  },
  {
    id: "pure_cut",
    dispatcher: "prism_cam",
    action: "waterjet_pure_program",
    backingEngine: "WaterjetPureProgramEngine (waterjet_pure_program)",
    description: "Pure-waterjet cutting program — soft materials, no abrasive",
    workflowOrder: 6,
    keywords: ["pure", "foam", "gasket", "rubber", "elastomer", "soft"],
  },
  {
    id: "taper_comp",
    dispatcher: "prism_cam",
    action: "waterjet_taper_program",
    backingEngine: "WaterjetTaperProgramEngine (waterjet_taper_program)",
    description: "Kerf-taper compensation program — tilt-head correction",
    workflowOrder: 7,
    keywords: ["taper", "tapered", "conical", "wedge"],
  },
  {
    id: "depth_control",
    dispatcher: "prism_cam",
    action: "waterjet_depth_program",
    backingEngine: "WaterjetDepthProgramEngine (waterjet_depth_program)",
    description: "Controlled-depth program — pocketing, etching, blind cuts",
    workflowOrder: 8,
    keywords: ["depth", "pocket", "etch", "blind", "pierce"],
  },
  {
    id: "adaptive_tuning",
    dispatcher: "prism_edm",
    action: "waterjet_lora_config",
    backingEngine: "WaterjetLoRACadenceEngine (waterjet_lora_config)",
    description: "Adaptive-tuning (LoRA) cadence configuration for the process",
    workflowOrder: 9,
    keywords: ["adaptive", "lora", "learning", "cadence", "calibration", "tune"],
  },
] as const;

/** One step of the reasoning trace. */
export interface WaterjetReasoningStep {
  step: number;
  /** What the master concluded at this step. */
  thought: string;
  /** Step-local confidence, 0..1. */
  confidence: number;
}

/** One ordered item of the execution plan. */
export interface WaterjetEnginePlanItem {
  /** 1-based position in the ordered plan. */
  order: number;
  capabilityId: string;
  /** Dispatcher the caller invokes for this step. */
  dispatcher: WaterjetDispatcher;
  /** Real dispatcher action that executes this step. */
  action: string;
  backingEngine: string;
  /** Why this capability was routed in. */
  reason: string;
  /** Intent keywords that triggered the match (empty on fallback routing). */
  matchedKeywords: string[];
}

export interface WaterjetAGIRecommendation {
  topic: string;
  detail: string;
}

export interface WaterjetAGIResult {
  intent: string;
  reasoningMode: WaterjetAGIReasoningMode;
  reasoningSteps: WaterjetReasoningStep[];
  /** Ordered waterjet-process-workflow plan of real dispatcher actions. */
  enginePlan: WaterjetEnginePlanItem[];
  recommendations: WaterjetAGIRecommendation[];
  /** Overall plan confidence, 0..1. */
  confidence: number;
  provenance: {
    /** Total capabilities in the catalog (always 9). */
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
/** The two mutually-exclusive waterjet cut modes. */
const CUT_MODE_IDS = new Set(["abrasive_cut", "pure_cut"]);

class WaterjetAGIMasterEngine {
  /**
   * Plan a waterjet-machining task: match the intent against the nine-
   * capability catalog and emit an ordered plan plus a reasoning trace.
   *
   * @param rawInput - {@link WaterjetAGIInput} (Zod-validated).
   * @returns A {@link WaterjetAGIResult}.
   * @throws  ZodError on malformed input (consistent with the EDM engine family).
   */
  reason(rawInput: unknown): WaterjetAGIResult {
    const input = WaterjetAGIInputSchema.parse(rawInput);
    const mode: WaterjetAGIReasoningMode =
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
        const hit = k.includes(" ") ? haystack.includes(k) : tokens.has(k);
        if (hit) matchedKeywords.push(kw);
      }
      return { cap, matchedKeywords };
    });

    const matched = scored.filter((s) => s.matchedKeywords.length > 0);
    const fallbackPlan = matched.length === 0;
    if (fallbackPlan) {
      warnings.push(
        "No catalog keyword matched the intent — routed the full canonical " +
          "waterjet-process workflow as a fallback plan; refine the intent " +
          "for a tighter route",
      );
    }

    // The plan: matched capabilities (or all nine on fallback), ordered by
    // the canonical waterjet-process workflow precedence.
    const planSource = (fallbackPlan ? scored : matched)
      .slice()
      .sort((a, b) => a.cap.workflowOrder - b.cap.workflowOrder);

    const enginePlan: WaterjetEnginePlanItem[] = planSource.map((s, i) => ({
      order: i + 1,
      capabilityId: s.cap.id,
      dispatcher: s.cap.dispatcher,
      action: s.cap.action,
      backingEngine: s.cap.backingEngine,
      reason: fallbackPlan
        ? `Fallback: ${s.cap.description} (canonical workflow stage ${s.cap.workflowOrder})`
        : `Routed by intent — ${s.cap.description}`,
      matchedKeywords: s.matchedKeywords,
    }));

    // Both cut modes in one plan is contradictory — a job runs one or the other.
    const cutModes = enginePlan.filter((p) => CUT_MODE_IDS.has(p.capabilityId));
    if (!fallbackPlan && cutModes.length > 1) {
      warnings.push(
        "Intent routed both abrasive and pure cutting modes — a waterjet job " +
          "uses a single cut mode; confirm the intent (abrasive for metals " +
          "and hard materials, pure for soft materials)",
      );
    }

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
  listCapabilities(): readonly WaterjetCapability[] {
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
   * it rises with both the breadth of the route (capabilities matched / 9)
   * and its specificity (matched keyword phrases per matched capability),
   * so a precise multi-stage intent scores above a vague one.
   */
  #confidence(
    matchedCount: number,
    tokenCount: number,
    scored: { cap: WaterjetCapability; matchedKeywords: string[] }[],
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
    mode: WaterjetAGIReasoningMode,
    intent: string,
    plan: WaterjetEnginePlanItem[],
    confidence: number,
  ): WaterjetReasoningStep[] {
    const steps: WaterjetReasoningStep[] = [];
    const push = (thought: string, c: number) =>
      steps.push({ step: steps.length + 1, thought, confidence: c });

    switch (mode) {
      case "chain_of_thought":
        push(`Interpret the waterjet-machining intent: "${intent}".`, confidence);
        for (const item of plan) {
          push(
            `Stage ${item.order}: ${item.capabilityId} → invoke ${item.dispatcher}:${item.action}. ${item.reason}.`,
            confidence,
          );
        }
        push(
          `Chain complete — ${plan.length} stage(s) ordered by the waterjet-process workflow.`,
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
          `Premise: the intent "${intent}" states a waterjet-machining goal.`,
          confidence,
        );
        push(
          `Rule: each catalog keyword that fires implies its capability is required.`,
          confidence,
        );
        for (const item of plan) {
          push(
            `Therefore ${item.capabilityId} is required (${item.dispatcher}:${item.action}).`,
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
          `Map "${intent}" onto the canonical waterjet template: material → abrasive → parameters → quality → operation → adaptive tuning.`,
          confidence,
        );
        for (const item of plan) {
          push(
            `Template stage ${item.capabilityId} applies → ${item.dispatcher}:${item.action}.`,
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
    plan: WaterjetEnginePlanItem[],
    fallbackPlan: boolean,
  ): WaterjetAGIRecommendation[] {
    const recs: WaterjetAGIRecommendation[] = [];
    const ids = new Set(plan.map((p) => p.capabilityId));
    const hasCut = plan.some((p) => CUT_MODE_IDS.has(p.capabilityId));

    recs.push({
      topic: "execution",
      detail:
        `Execute the ${plan.length}-stage plan in order; each stage is a real ` +
        `dispatcher action. The master plans — the leaf engines compute.`,
    });

    if (fallbackPlan) {
      recs.push({
        topic: "intent",
        detail:
          "Intent matched no capability keyword. Name the material or " +
          "operation explicitly (e.g. 'abrasive', 'pure', 'taper', 'depth') " +
          "to narrow the route from the full workflow.",
      });
    }

    // A cutting program needs computed pressure / speed / orifice first.
    if (hasCut && !ids.has("calculate")) {
      recs.push({
        topic: "parameters",
        detail:
          "The plan generates a cutting program but omits parameter " +
          "calculation — prepend waterjet_calculate; pump pressure, traverse " +
          "speed and orifice must be solved before the program is meaningful.",
      });
    }

    // Abrasive selection drives abrasive-cut edge quality and running cost.
    if (ids.has("abrasive_cut") && !ids.has("abrasive")) {
      recs.push({
        topic: "abrasive",
        detail:
          "An abrasive cut is planned without abrasive selection — consider " +
          "waterjet_abrasives; garnet type and mesh size govern cut speed, " +
          "edge quality and abrasive cost.",
      });
    }

    return recs;
  }

  /** One-line human-readable summary of the plan. */
  #summary(
    mode: WaterjetAGIReasoningMode,
    plan: WaterjetEnginePlanItem[],
    confidence: number,
    fallbackPlan: boolean,
  ): string {
    const route = plan.map((p) => p.capabilityId).join(" → ");
    const conf = `${(confidence * 100).toFixed(0)}%`;
    return fallbackPlan
      ? `Waterjet AGI master (${mode}): no keyword route — full waterjet-process workflow [${route}], confidence ${conf}.`
      : `Waterjet AGI master (${mode}): routed ${plan.length}/${CAPABILITIES.length} capabilities [${route}], confidence ${conf}.`;
  }
}

export const waterjetAGIMasterEngine = new WaterjetAGIMasterEngine();
