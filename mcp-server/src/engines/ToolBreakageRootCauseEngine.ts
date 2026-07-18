/**
 * ToolBreakageRootCauseEngine -- attributes an OBSERVED tool break to the dominant damage mode.
 *
 * UNIT-0011 (half 2, breakage root-cause). Tool breakage PREDICTION already exists
 * (ToolBreakagePredictionEngine.predictBreakage -> P_break + per-mode probabilities
 * {fatigue, deflection, chipload, engagement}); its getBreakageRisk helper returns only the top
 * factor NAME for a SINGLE operation. What was missing (verified: grep found ScrapRootCauseEngine
 * (part-scrap forensics) + A3ReportEngine / root_cause_analyses (business QM records) -- NONE attribute
 * a tool break to the four physics damage terms) is a post-break, multi-operation root-cause analysis:
 * it runs the FORWARD model, RANKS all four modes by their computed failure probability, quantifies a
 * dominance margin (honest multi-factor flag when modes are near-tied), warns when an observed break
 * EXCEEDS model expectation (an unmodeled cause is likely), and maps the dominant mode to standard
 * corrective actions. This COMPOSES ToolBreakagePredictionEngine's OWN reviewed damage models (no new
 * physics, no inversion) -- it re-reads its outputs, so it needs no separate force/damage-formula sign-off.
 *
 * DISTINCT from ScrapRootCauseEngine (analyzeScrapEvent = part-scrap/quality forensics) and
 * A3ReportEngine (8D/A3 corrective-action records): this is TOOL-breakage physics attribution.
 *
 * PURE + NEVER-THROWS (matches BUEMitigationRecommenderEngine): deterministic; invalid state -> warnings.
 * Sources: inherited from ToolBreakagePredictionEngine (Miner's rule cumulative fatigue; deflection
 * stress ratio sigma/sigma_yield; chip-load peak ratio; engagement spike factor). Corrective actions are
 * standard machining practice (Sandvik Technical Guide 2023; Smith, "Cutting Tool Technology" 2008).
 */

import {
  ToolBreakagePredictionEngine,
  type BreakageTool,
  type BreakageForces,
  type EngagementEntry,
  type BreakagePrediction,
} from "./ToolBreakagePredictionEngine.js";

// --- Types ------------------------------------------------------------------

export type DamageMode = "fatigue" | "deflection" | "chipload" | "engagement";

export interface BreakageRootCauseInput {
  tool: BreakageTool;
  forces: BreakageForces;
  engagement_history?: EngagementEntry[];
  /** Was a break actually observed? Post-break analysis defaults true; false = pre-emptive what-if. */
  break_observed?: boolean;
}

export interface DamageModeAttribution {
  mode: DamageMode;
  /** The mode's independent failure probability from the forward model [0-1]. */
  probability: number;
  /** Normalized share of the summed mode probabilities [0-1]; the ranking basis. */
  share: number;
  /** The physical quantity that drives this mode + its value from the prediction. */
  driver: string;
  /** Ranked, standard machining corrective actions for THIS mode. */
  corrective_actions: string[];
}

export interface BreakageRootCauseResult {
  /** Model combined breakage probability P_break [0-1] (from predictBreakage). */
  breakage_probability: number;
  risk_level: string;
  /** Highest-probability damage mode (the attributed root cause). */
  dominant_mode: DamageMode | null;
  /** dominant.share - runnerUp.share [0-1]; low => multi-factor, not a single clean cause. */
  dominance_margin: number;
  /** All four modes, ranked by probability (desc). */
  attribution: DamageModeAttribution[];
  /** The dominant mode's corrective actions, surfaced for the caller. */
  primary_corrective_actions: string[];
  /** Truthful pointer to the controller-recovery step (not composed here). */
  recovery_pointer: string;
  warnings: string[];
  source: string;
}

// --- Constants (heuristic classification thresholds -- NOT physics constants) ---
const VALID_TOOL_MATERIALS: ReadonlyArray<BreakageTool["tool_material"]> = [
  "carbide", "hss", "cermet", "ceramic", "cbn", "pcd",
];
/** Below this top-vs-runnerUp share gap the break is multi-factor, not one clean cause. */
const DOMINANCE_AMBIGUOUS_MARGIN = 0.15;
/** An observed break with model P_break at/below this is under-predicted => unmodeled cause likely. */
const OBSERVED_MODEL_GAP_PBREAK = 0.15;

const RECOVERY_POINTER =
  "For the controller-specific stop/retract/re-entry recovery procedure, call " +
  "CNCControllerDeepLearningEngine.getRecoveryProcedure(controller, 'tool_breakage').";

const SOURCE =
  "ToolBreakageRootCauseEngine (composes ToolBreakagePredictionEngine.predictBreakage: ranks the four " +
  "reviewed damage-mode probabilities {fatigue=Miner, deflection=stress-ratio, chipload=peak-ratio, " +
  "engagement=spike-factor}; corrective actions are standard machining practice). No new physics.";

/** Standard corrective actions per damage mode (ranked; the physical driver each term measures). */
const CORRECTIVE_ACTIONS: Record<DamageMode, string[]> = {
  fatigue: [
    "Replace/retire the tool -- accumulated Miner cumulative-fatigue damage is the dominant driver (at or past fatigue life).",
    "Lower cyclic bending stress: reduce feed per tooth (fz) and/or axial depth (ap) to cut Fc.",
    "Budget tool life by cumulative damage per operation and swap on schedule, not to visible failure.",
  ],
  deflection: [
    "Reduce stickout (gauge length) -- deflection stress scales ~L^3, the single biggest lever.",
    "Reduce radial/axial engagement (ae/ap) and/or fz to lower the bending force Fc.",
    "Use a larger-diameter or more rigid tool/holder (stub length, shrink-fit) for the same reach.",
  ],
  chipload: [
    "Reduce feed per tooth (fz) -- the peak chip-load ratio is the dominant driver.",
    "Smooth entry/exit: arc-in or ramp instead of a straight plunge; avoid full-width recuts.",
    "Inspect the toolpath for chip recutting / plunge spikes that transiently multiply chip load.",
  ],
  engagement: [
    "Cap radial engagement with a trochoidal/adaptive (constant-engagement) toolpath -- engagement spikes are the dominant driver.",
    "Reduce stepover (ae) and avoid full-slot or corner full-immersion cuts.",
    "Add corner deceleration / lead-in so engagement does not spike at direction changes.",
  ],
};

/** Which prediction field is the physical driver for each mode (for the driver caption). */
function driverCaption(mode: DamageMode, p: BreakagePrediction): string {
  switch (mode) {
    case "fatigue": return `Miner cumulative damage = ${p.miner_damage} (1.0 = fatigue failure)`;
    case "deflection": return `deflection stress ratio sigma/sigma_yield = ${p.stress_ratio} (stress ${p.deflection_stress_MPa} MPa)`;
    case "chipload": return `peak chip-load ratio actual/nominal = ${p.peak_chipload_ratio}`;
    case "engagement": return `max engagement spike factor = ${p.max_engagement_spike}`;
  }
}

// --- Engine -----------------------------------------------------------------

class ToolBreakageRootCauseEngineImpl {
  private readonly predictor = new ToolBreakagePredictionEngine();

  /**
   * Attribute a tool break to its dominant damage mode. Never throws.
   *
   * @param input observed break context (tool geometry/material, cutting forces, engagement history).
   * @returns ranked mode attribution + dominant cause + corrective actions + honesty warnings.
   */
  analyze(input: BreakageRootCauseInput): BreakageRootCauseResult {
    const warnings: string[] = [];
    const empty = (): BreakageRootCauseResult => ({
      breakage_probability: 0, risk_level: "LOW", dominant_mode: null, dominance_margin: 0,
      attribution: [], primary_corrective_actions: [], recovery_pointer: RECOVERY_POINTER,
      warnings, source: SOURCE,
    });

    // --- Guard (never-throws): validate the essentials predictBreakage relies on. ---
    const t = input?.tool;
    const f = input?.forces;
    if (!t || !f) { warnings.push("Missing tool or forces -- cannot attribute a root cause."); return empty(); }
    if (!VALID_TOOL_MATERIALS.includes(t.tool_material)) {
      warnings.push(`Invalid tool_material '${t.tool_material}' (expected one of ${VALID_TOOL_MATERIALS.join(", ")}).`);
      return empty();
    }
    for (const [k, v] of [
      ["diameter_mm", t.diameter_mm], ["flute_count", t.flute_count],
      ["cutting_length_mm", t.cutting_length_mm], ["gauge_length_mm", t.gauge_length_mm],
    ] as const) {
      if (!(Number.isFinite(v) && v > 0)) { warnings.push(`tool.${k} must be a finite positive number (got ${v}).`); return empty(); }
    }
    if (!(Number.isFinite(f.Fc_N) && f.Fc_N > 0)) { warnings.push(`forces.Fc_N must be a finite positive number (got ${f.Fc_N}).`); return empty(); }

    // --- Compose the forward model (defensive: honor never-throws even if the callee is not robust). ---
    let pred: BreakagePrediction;
    try {
      pred = this.predictor.predictBreakage(t, f, input.engagement_history ?? []);
    } catch (e) {
      warnings.push(`ToolBreakagePredictionEngine.predictBreakage failed: ${(e as Error)?.message ?? String(e)}.`);
      return empty();
    }

    // --- Rank the four modes by their computed failure probability. ---
    const probs = pred.probabilities;
    const total = probs.fatigue + probs.deflection + probs.chipload + probs.engagement;
    const modes: DamageMode[] = ["fatigue", "deflection", "chipload", "engagement"];
    const attribution: DamageModeAttribution[] = modes
      .map((mode) => ({
        mode,
        probability: probs[mode],
        share: total > 0 ? +(probs[mode] / total).toFixed(4) : 0,
        driver: driverCaption(mode, pred),
        corrective_actions: CORRECTIVE_ACTIONS[mode],
      }))
      .sort((a, b) => b.probability - a.probability);

    const dominant = attribution[0];
    const runnerUp = attribution[1];
    const dominance_margin = +(dominant.share - runnerUp.share).toFixed(4);
    const break_observed = input.break_observed ?? true;

    // --- Honesty warnings (R12): don't over-claim a single clean cause. ---
    if (total === 0) {
      warnings.push(
        "The forward model predicts no active failure driver (all four mode probabilities are 0). " +
        (break_observed
          ? "Since a break WAS observed, the cause is almost certainly UNMODELED -- material defect / hard inclusion, chip packing or recut, tool run-out / mis-set, or a programming error. Inspect these before re-cutting."
          : "No dominant mode to attribute for this operating point."),
      );
    } else if (dominant.probability > 0 && dominance_margin < DOMINANCE_AMBIGUOUS_MARGIN) {
      warnings.push(
        `Multi-factor break: '${dominant.mode}' (${dominant.share}) and '${runnerUp.mode}' (${runnerUp.share}) are near-tied ` +
        `(margin ${dominance_margin} < ${DOMINANCE_AMBIGUOUS_MARGIN}). Treat as multi-factor -- address the top two modes together.`,
      );
    }
    if (break_observed && total > 0 && pred.breakage_probability <= OBSERVED_MODEL_GAP_PBREAK) {
      warnings.push(
        `Observed break EXCEEDS model expectation (P_break=${pred.breakage_probability}, ${pred.risk_level}). ` +
        `The dominant MODELED driver is '${dominant.mode}', but the low absolute probability means an unmodeled cause is likely ` +
        "(material defect / hard inclusion, chip packing / recut, run-out / mis-set, prior fatigue not captured, programming error). Verify before re-cutting.",
      );
    }

    return {
      breakage_probability: pred.breakage_probability,
      risk_level: pred.risk_level,
      dominant_mode: total > 0 ? dominant.mode : null,
      dominance_margin,
      attribution,
      primary_corrective_actions: total > 0 ? dominant.corrective_actions : [],
      recovery_pointer: RECOVERY_POINTER,
      warnings,
      source: SOURCE,
    };
  }
}

/** Singleton export per PRISM engine convention. */
export const toolBreakageRootCauseEngine = new ToolBreakageRootCauseEngineImpl();
