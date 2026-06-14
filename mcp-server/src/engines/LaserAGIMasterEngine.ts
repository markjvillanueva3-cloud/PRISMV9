/**
 * LaserAGIMasterEngine — laser-machining domain AGI master.
 *
 * Roadmap unit AGI-MASTER-PARITY-MS30 / P0-U03 — "LaserAGIMasterEngine
 * using the existing 9 laser engines". Brings laser machining to AGI-master
 * parity with milling ({@link MillingAGIMasterEngine}) and sinker EDM
 * ({@link SinkerAGIMasterEngine}, P0-U02) — this engine reuses that proven
 * reasoning + orchestration pattern.
 *
 * It does NOT compute any laser physics. It owns a typed catalog of nine
 * laser capabilities, each mapping to a real, verified dispatcher action,
 * matches a free-text intent against the catalog, and emits an ORDERED
 * execution plan plus a mode-specific reasoning trace. A caller (or a
 * dispatcher) then executes the plan — the master plans, the leaf engines
 * compute.
 *
 * The nine capabilities span two dispatchers, because laser process setup
 * and laser toolpath programming live in different places:
 *   prism_edm : laser_materials · laser_machines · laser_gas_recommend
 *               laser_calculate · laser_lora_config
 *   prism_cam : laser_cut_program · laser_weld_program
 *               laser_drill_program · laser_mark_program
 *
 * Pure: no I/O, no state mutation, deterministic. Input is Zod-validated.
 *
 * References:
 *   - Steen & Mazumder, "Laser Material Processing" (4e) — process-window
 *     workflow (material → source → assist gas → parameters → operation).
 *   - PRISM SinkerAGIMasterEngine — the domain-AGI-master shape reused here.
 */

import { z } from "zod";

/** Catalog schema version — bump when CAPABILITIES changes shape. */
const CATALOG_VERSION = "1.0.0";

export const LaserAGIInputSchema = z.object({
  /** Free-text description of the laser-machining task to plan. */
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
export type LaserAGIInput = z.infer<typeof LaserAGIInputSchema>;

export type LaserAGIReasoningMode = NonNullable<
  LaserAGIInput["reasoningMode"]
>;

/** Dispatcher a laser capability is executed through. */
export type LaserDispatcher = "prism_edm" | "prism_cam";

/** One laser-machining capability the master can route to. */
interface LaserCapability {
  /** Stable capability id. */
  id: string;
  /** Dispatcher that owns the executing action. */
  dispatcher: LaserDispatcher;
  /** Real dispatcher action that executes this capability. */
  action: string;
  /** Backing engine / handler (documentation / provenance). */
  backingEngine: string;
  /** One-line capability description. */
  description: string;
  /** Position in the canonical laser-process workflow (1 = earliest). */
  workflowOrder: number;
  /** Lowercase keywords that route an intent to this capability. */
  keywords: string[];
}

/**
 * The nine laser capabilities, in canonical laser-process workflow order:
 * pick the material → select the laser source → choose assist gas →
 * compute the process parameters → run the operation (cut / weld / drill /
 * mark) → close the adaptive-tuning loop. Each `action` is verified to
 * exist (edmDispatcher.ts lines 231/353; camDispatcher.ts line 1259).
 *
 * cut / weld / drill / mark are mutually-exclusive operation types — a job
 * is usually one of them — so they hold adjacent workflow slots; the order
 * field still gives every routed capability a deterministic plan position.
 */
const CAPABILITIES: readonly LaserCapability[] = [
  {
    id: "material",
    dispatcher: "prism_edm",
    action: "laser_materials",
    backingEngine: "LaserProcessEngine (laser_materials)",
    description: "Workpiece material lookup — absorptivity, reflectivity, grade",
    workflowOrder: 1,
    keywords: ["material", "materials", "alloy", "reflectivity", "absorptivity", "grade"],
  },
  {
    id: "machine",
    dispatcher: "prism_edm",
    action: "laser_machines",
    backingEngine: "LaserProcessEngine (laser_machines)",
    description: "Laser source / machine selection — fiber, CO2, Nd:YAG",
    workflowOrder: 2,
    keywords: ["machine", "machines", "source", "fiber", "fibre", "resonator", "wattage"],
  },
  {
    id: "assist_gas",
    dispatcher: "prism_edm",
    action: "laser_gas_recommend",
    backingEngine: "LaserProcessEngine (laser_gas_recommend)",
    description: "Assist-gas recommendation — nitrogen, oxygen, argon, purge",
    workflowOrder: 3,
    keywords: ["gas", "nitrogen", "oxygen", "argon", "assist", "purge"],
  },
  {
    id: "calculate",
    dispatcher: "prism_edm",
    action: "laser_calculate",
    backingEngine: "LaserProcessEngine (laser_calculate)",
    description: "Process-parameter calculation — power, speed, focus, kerf",
    workflowOrder: 4,
    keywords: ["calculate", "power", "speed", "focus", "kerf", "parameter", "fluence", "irradiance"],
  },
  {
    id: "cut",
    dispatcher: "prism_cam",
    action: "laser_cut_program",
    backingEngine: "LaserCuttingProgramEngine (laser_cut_program)",
    description: "Laser cutting program generation — contour / profile severing",
    workflowOrder: 5,
    keywords: ["cut", "cutting", "sever", "contour", "profile", "slit", "blank"],
  },
  {
    id: "weld",
    dispatcher: "prism_cam",
    action: "laser_weld_program",
    backingEngine: "LaserWeldingProgramEngine (laser_weld_program)",
    description: "Laser welding program generation — seam / keyhole joining",
    workflowOrder: 6,
    keywords: ["weld", "welding", "seam", "keyhole", "joint", "fusion"],
  },
  {
    id: "drill",
    dispatcher: "prism_cam",
    action: "laser_drill_program",
    backingEngine: "LaserDrillingProgramEngine (laser_drill_program)",
    description: "Laser drilling program generation — percussion / trepan holes",
    workflowOrder: 7,
    keywords: ["drill", "drilling", "percussion", "trepan", "pierce", "bore"],
  },
  {
    id: "mark",
    dispatcher: "prism_cam",
    action: "laser_mark_program",
    backingEngine: "LaserMarkingProgramEngine (laser_mark_program)",
    description: "Laser marking program generation — engrave / etch / anneal",
    workflowOrder: 8,
    keywords: ["mark", "marking", "engrave", "engraving", "etch", "serial", "logo", "anneal"],
  },
  {
    id: "adaptive_tuning",
    dispatcher: "prism_edm",
    action: "laser_lora_config",
    backingEngine: "LaserLoRACadenceEngine (laser_lora_config)",
    description: "Adaptive-tuning (LoRA) cadence configuration for the process",
    workflowOrder: 9,
    keywords: ["adaptive", "lora", "learning", "cadence", "calibration", "tune"],
  },
] as const;

/** One step of the reasoning trace. */
export interface LaserReasoningStep {
  step: number;
  /** What the master concluded at this step. */
  thought: string;
  /** Step-local confidence, 0..1. */
  confidence: number;
}

/** One ordered item of the execution plan. */
export interface LaserEnginePlanItem {
  /** 1-based position in the ordered plan. */
  order: number;
  capabilityId: string;
  /** Dispatcher the caller invokes for this step. */
  dispatcher: LaserDispatcher;
  /** Real dispatcher action that executes this step. */
  action: string;
  backingEngine: string;
  /** Why this capability was routed in. */
  reason: string;
  /** Intent keywords that triggered the match (empty on fallback routing). */
  matchedKeywords: string[];
}

export interface LaserAGIRecommendation {
  topic: string;
  detail: string;
}

export interface LaserAGIResult {
  intent: string;
  reasoningMode: LaserAGIReasoningMode;
  reasoningSteps: LaserReasoningStep[];
  /** Ordered laser-process-workflow plan of real dispatcher actions. */
  enginePlan: LaserEnginePlanItem[];
  recommendations: LaserAGIRecommendation[];
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
/** Operation capabilities — mutually-exclusive laser process types. */
const OPERATION_IDS = new Set(["cut", "weld", "drill", "mark"]);

class LaserAGIMasterEngine {
  /**
   * Plan a laser-machining task: match the intent against the nine-capability
   * catalog and emit an ordered execution plan plus a reasoning trace.
   *
   * @param rawInput - {@link LaserAGIInput} (Zod-validated).
   * @returns A {@link LaserAGIResult}.
   * @throws  ZodError on malformed input (consistent with the EDM engine family).
   */
  reason(rawInput: unknown): LaserAGIResult {
    const input = LaserAGIInputSchema.parse(rawInput);
    const mode: LaserAGIReasoningMode =
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
          "laser-process workflow as a fallback plan; refine the intent for " +
          "a tighter route",
      );
    }

    // The plan: matched capabilities (or all nine on fallback), ordered by
    // the canonical laser-process workflow precedence.
    const planSource = (fallbackPlan ? scored : matched)
      .slice()
      .sort((a, b) => a.cap.workflowOrder - b.cap.workflowOrder);

    const enginePlan: LaserEnginePlanItem[] = planSource.map((s, i) => ({
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

    // Multiple operation types in one plan is unusual — flag it.
    const operations = enginePlan.filter((p) => OPERATION_IDS.has(p.capabilityId));
    if (!fallbackPlan && operations.length > 1) {
      warnings.push(
        `Intent routed ${operations.length} operation types ` +
          `(${operations.map((o) => o.capabilityId).join(", ")}) — a laser job ` +
          "is usually a single operation; confirm the intent is not ambiguous",
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
  listCapabilities(): readonly LaserCapability[] {
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
    scored: { cap: LaserCapability; matchedKeywords: string[] }[],
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
    mode: LaserAGIReasoningMode,
    intent: string,
    plan: LaserEnginePlanItem[],
    confidence: number,
  ): LaserReasoningStep[] {
    const steps: LaserReasoningStep[] = [];
    const push = (thought: string, c: number) =>
      steps.push({ step: steps.length + 1, thought, confidence: c });

    switch (mode) {
      case "chain_of_thought":
        push(`Interpret the laser-machining intent: "${intent}".`, confidence);
        for (const item of plan) {
          push(
            `Stage ${item.order}: ${item.capabilityId} → invoke ${item.dispatcher}:${item.action}. ${item.reason}.`,
            confidence,
          );
        }
        push(
          `Chain complete — ${plan.length} stage(s) ordered by the laser-process workflow.`,
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
          `Premise: the intent "${intent}" states a laser-machining goal.`,
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
          `Map "${intent}" onto the canonical laser template: material → source → assist gas → parameters → operation → adaptive tuning.`,
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
    plan: LaserEnginePlanItem[],
    fallbackPlan: boolean,
  ): LaserAGIRecommendation[] {
    const recs: LaserAGIRecommendation[] = [];
    const ids = new Set(plan.map((p) => p.capabilityId));
    const hasOperation = plan.some((p) => OPERATION_IDS.has(p.capabilityId));

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
          "Intent matched no capability keyword. Name the operation " +
          "explicitly (e.g. 'cut', 'weld', 'drill', 'mark') to narrow the " +
          "route from the full workflow.",
      });
    }

    // A laser operation program needs computed power/speed/focus first.
    if (hasOperation && !ids.has("calculate")) {
      recs.push({
        topic: "parameters",
        detail:
          "The plan generates an operation program but omits parameter " +
          "calculation — prepend laser_calculate; power, speed and focus must " +
          "be solved before the program is meaningful.",
      });
    }

    // Material absorptivity is the dominant driver of every laser parameter.
    if (hasOperation && !ids.has("material")) {
      recs.push({
        topic: "material",
        detail:
          "No material lookup is planned — consider laser_materials; " +
          "absorptivity and reflectivity govern power coupling and therefore " +
          "every downstream parameter.",
      });
    }

    return recs;
  }

  /** One-line human-readable summary of the plan. */
  #summary(
    mode: LaserAGIReasoningMode,
    plan: LaserEnginePlanItem[],
    confidence: number,
    fallbackPlan: boolean,
  ): string {
    const route = plan.map((p) => p.capabilityId).join(" → ");
    const conf = `${(confidence * 100).toFixed(0)}%`;
    return fallbackPlan
      ? `Laser AGI master (${mode}): no keyword route — full laser-process workflow [${route}], confidence ${conf}.`
      : `Laser AGI master (${mode}): routed ${plan.length}/${CAPABILITIES.length} capabilities [${route}], confidence ${conf}.`;
  }
}

export const laserAGIMasterEngine = new LaserAGIMasterEngine();
