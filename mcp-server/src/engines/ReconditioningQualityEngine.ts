/**
 * ReconditioningQualityEngine -- quality scoring + expected Taylor-life shift for a
 * RECONDITIONED (reground/recoated) cutting tool.
 *
 * UNIT-0010 (Domain 2, Tool Reconditioning Quality). The ECONOMICS of recondition-vs-
 * replace already exist (algorithms/ToolLifeEconomicReplacementFormula.ts: costPerCutMinute /
 * economicLife, wired businessDispatcher). What was MISSING (verified: grep recondition|regrind
 * across engines found only economics/count/state, no QUALITY model) is a model that scores a
 * reground tool's edge-prep / coating-integrity / geometry-restoration and turns it into an
 * expected life multiplier vs a NEW tool. That multiplier is what a consumer feeds into the
 * existing TCO surfaces (reground_life = new_life * life_multiplier -> t_cut_min) and is what
 * replaces the hardcoded 0.7 "needs_regrind" derate in
 * InventoryAwareToolSelectorEngine.conditionFactor.
 *
 * PURE + NEVER-THROWS (matches the sibling BUEOnsetThresholdEngine contract): invalid inputs are
 * clamped + surfaced as warnings, never thrown, so a selection/quoting caller can't be crashed by
 * a bad tool record.
 *
 * DATA HONESTY (R12 + oscar refuse-list publishing-a-recommendation-without-uncertainty): the
 * retention factors below are INDUSTRY-TYPICAL reconditioning rules-of-thumb (carbide reground to
 * spec retains ~85-95% of new-tool life per cycle; HSS ~80-90%; a formerly-coated edge reground
 * WITHOUT recoat loses most of the coating's ~1.5-2x life benefit). They are NOT measured from JM
 * Die regrind records -- no such dataset exists in-repo (jm-tool-purchases.json is purchases, not
 * regrind outcomes). Every life_multiplier therefore carries an uncertainty band, and shop
 * regrind-outcome capture is the declared unblock. Sources: generic tool-reconditioning practice
 * (Kennametal/Sandvik/Guhring regrind guidelines); regrind-count ceilings cross-checked against
 * DeepHoleDrillingPhysicsEngine (carbide 3-5, HSS 2-3) + BroachDesignEngine.
 */

// --- Types ------------------------------------------------------------------

export type ReconditionToolType = "endmill" | "drill" | "insert" | "reamer" | "tap";
export type ReconditionSubstrate = "carbide" | "hss" | "cobalt_hss";
export type EdgePrepGrade = "sharp" | "honed" | "chipped" | "unknown";

export interface ReconditioningInput {
  tool_type: ReconditionToolType;
  substrate: ReconditionSubstrate;
  /** Was the ORIGINAL (new) tool coated? A reground edge cuts through the coating. */
  was_coated: boolean;
  /** If was_coated, was the tool RECOATED after regrind? (irrelevant if !was_coated) */
  recoated: boolean;
  /** Which regrind cycle produced this tool. 1 = first regrind, 2 = second, ... (>=1). */
  regrind_cycle: number;
  /** Post-regrind cutting-edge condition. */
  edge_prep_grade: EdgePrepGrade;
  /** Was diameter / flute geometry restored to the tool's spec tolerance? */
  geometry_within_spec: boolean;
}

export interface ReconditioningQualityResult {
  /** Composite quality of the reconditioning job, [0,1] (1 = as-new). */
  quality_score: number;
  /** Expected reground-tool life / new-tool life, (0,1]. Feed as t_cut_min = new_life * this. */
  life_multiplier: number;
  /** Absolute +/- uncertainty on life_multiplier (rule-of-thumb band; shrinks with shop data). */
  life_multiplier_uncertainty: number;
  /** Substrate/tool-typical maximum number of regrind cycles before retirement. */
  max_regrinds: number;
  /** True if regrind_cycle exceeds max_regrinds -> tool should be retired. */
  beyond_regrind_limit: boolean;
  recommendation: "recondition" | "replace" | "retire";
  /** Per-factor multipliers that composed life_multiplier (audit trail). */
  factor_attribution: {
    substrate_cycle: number;
    coating: number;
    edge_prep: number;
    geometry: number;
  };
  warnings: string[];
  source: string;
}

// --- Named constants (industry-typical, cited; NOT measured JM data) --------

/** Per-cycle life retention for a tool reground TO SPEC, by substrate. [nominal, +/- uncertainty] */
const BASE_RETENTION: Record<ReconditionSubstrate, { nominal: number; unc: number }> = {
  carbide:    { nominal: 0.90, unc: 0.05 }, // ~85-95%
  hss:        { nominal: 0.85, unc: 0.05 }, // ~80-90%
  cobalt_hss: { nominal: 0.87, unc: 0.05 },
};
/** Extra life lost per regrind cycle BEYOND the first (cumulative diameter/flute-length loss). */
const PER_CYCLE_DECREMENT = 0.03;
/** Coating factors: a reground edge cutting a job that expected coating. */
const COATING_STRIPPED_FACTOR = 0.65; // was coated, reground through, NOT recoated
const COATING_RECOATED_FACTOR = 0.95; // was coated, recoated after regrind
const COATING_NONE_FACTOR = 1.0;      // tool was never coated
/** Edge-prep factors. */
const EDGE_PREP_FACTOR: Record<EdgePrepGrade, number> = {
  sharp: 1.0, honed: 1.0, chipped: 0.5, unknown: 0.85,
};
/** Geometry-restoration factor when NOT within spec. */
const GEOMETRY_OUT_OF_SPEC_FACTOR = 0.7;
const GEOMETRY_IN_SPEC_FACTOR = 1.0;
/** Regrind-count ceilings (cross-checked vs DeepHoleDrillingPhysicsEngine / BroachDesignEngine). */
const MAX_REGRINDS: Record<ReconditionToolType, Record<ReconditionSubstrate, number>> = {
  endmill: { carbide: 5, hss: 3, cobalt_hss: 3 },
  drill:   { carbide: 3, hss: 3, cobalt_hss: 3 },
  reamer:  { carbide: 4, hss: 3, cobalt_hss: 3 },
  tap:     { carbide: 1, hss: 1, cobalt_hss: 1 }, // taps are rarely reground
  insert:  { carbide: 0, hss: 0, cobalt_hss: 0 }, // indexable inserts are replaced, not reground
};
/** Below this modeled life multiplier, reconditioning is not worth it -> replace. */
const REPLACE_THRESHOLD = 0.5;
/** Base + per-cycle uncertainty components for the empirical (non-substrate) factors. */
const EMPIRICAL_UNC_BASE = 0.08;
const EMPIRICAL_UNC_PER_CYCLE = 0.02;
const MAX_LIFE_UNC = 0.4;
/** Fallback multiplier when inputs are absent (matches the legacy hardcoded 0.7 derate). */
export const RECONDITION_FALLBACK_MULTIPLIER = 0.7;

// --- Engine -----------------------------------------------------------------

function clampUnit(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

class ReconditioningQualityEngineImpl {
  /**
   * Score a reconditioning job and derive its expected life multiplier vs a new tool.
   * Never throws -- invalid fields are clamped/defaulted and reported in `warnings`.
   *
   * @param input Tool + reconditioning descriptors.
   * @returns Quality score, life multiplier (+uncertainty), regrind-limit check, recommendation.
   */
  assess(input: ReconditioningInput): ReconditioningQualityResult {
    const warnings: string[] = [];

    const substrate: ReconditionSubstrate = BASE_RETENTION[input.substrate] ? input.substrate : "carbide";
    if (substrate !== input.substrate) warnings.push(`Unknown substrate "${input.substrate}"; assumed carbide.`);
    const toolType: ReconditionToolType = MAX_REGRINDS[input.tool_type] ? input.tool_type : "endmill";
    if (toolType !== input.tool_type) warnings.push(`Unknown tool_type "${input.tool_type}"; assumed endmill.`);

    let cycle = Math.floor(input.regrind_cycle);
    if (!Number.isFinite(cycle) || cycle < 1) { cycle = 1; warnings.push(`regrind_cycle invalid; clamped to 1.`); }

    const maxRegrinds = MAX_REGRINDS[toolType][substrate];
    const beyondLimit = cycle > maxRegrinds;
    if (beyondLimit) {
      warnings.push(`regrind_cycle ${cycle} exceeds the ${substrate} ${toolType} ceiling of ${maxRegrinds} -- retire the tool (structural integrity + geometry loss).`);
    }
    if (maxRegrinds === 0) {
      warnings.push(`Indexable ${toolType}s are not reground -- index to a fresh edge or replace.`);
    }

    // -- per-factor multipliers --
    const base = BASE_RETENTION[substrate];
    const substrateCycle = clampUnit(base.nominal - PER_CYCLE_DECREMENT * (cycle - 1));

    let coating: number;
    if (!input.was_coated) coating = COATING_NONE_FACTOR;
    else if (input.recoated) coating = COATING_RECOATED_FACTOR;
    else { coating = COATING_STRIPPED_FACTOR; warnings.push(`Tool was coated but not recoated after regrind -- the reground edge runs uncoated (reduced life/heat resistance).`); }

    const edgePrepKey: EdgePrepGrade = EDGE_PREP_FACTOR[input.edge_prep_grade] !== undefined ? input.edge_prep_grade : "unknown";
    if (edgePrepKey !== input.edge_prep_grade) warnings.push(`Unknown edge_prep_grade "${input.edge_prep_grade}"; assumed unknown (conservative).`);
    const edgePrep = EDGE_PREP_FACTOR[edgePrepKey];
    if (edgePrepKey === "chipped") warnings.push(`Chipped edge post-regrind -- re-hone or reject; halved life applied.`);

    const geometry = input.geometry_within_spec ? GEOMETRY_IN_SPEC_FACTOR : GEOMETRY_OUT_OF_SPEC_FACTOR;
    if (!input.geometry_within_spec) warnings.push(`Geometry not restored to spec -- diameter/flute deviation degrades finish + life.`);

    // -- compose --
    const lifeMultiplier = beyondLimit ? 0 : clampUnit(substrateCycle * coating * edgePrep * geometry);
    // quality_score normalizes the reconditioning-controllable factors (coating/edge/geometry) --
    // i.e. "how good was the RECONDITIONING job", separate from the substrate/cycle life ceiling.
    const qualityScore = beyondLimit ? 0 : clampUnit(coating * edgePrep * geometry);

    // Uncertainty: substrate band + a fixed rule-of-thumb component for the empirical factors,
    // combined RSS (independent). Widens with cycle count (less data on multi-regrind tools).
    const empiricalUnc = EMPIRICAL_UNC_BASE + EMPIRICAL_UNC_PER_CYCLE * (cycle - 1);
    const lifeUnc = beyondLimit ? 0 : Math.min(MAX_LIFE_UNC, Math.sqrt(base.unc * base.unc + empiricalUnc * empiricalUnc));

    let recommendation: ReconditioningQualityResult["recommendation"];
    if (beyondLimit || maxRegrinds === 0) recommendation = "retire";
    else if (lifeMultiplier < REPLACE_THRESHOLD) recommendation = "replace";
    else recommendation = "recondition";

    return {
      quality_score: +qualityScore.toFixed(4),
      life_multiplier: +lifeMultiplier.toFixed(4),
      life_multiplier_uncertainty: +lifeUnc.toFixed(4),
      max_regrinds: maxRegrinds,
      beyond_regrind_limit: beyondLimit,
      recommendation,
      factor_attribution: {
        substrate_cycle: +substrateCycle.toFixed(4),
        coating: +coating.toFixed(4),
        edge_prep: +edgePrep.toFixed(4),
        geometry: +geometry.toFixed(4),
      },
      warnings,
      source: "ReconditioningQualityEngine (industry-typical regrind retention bands + uncertainty; NOT measured JM data -- shop regrind-outcome capture is the declared unblock)",
    };
  }

  /**
   * Convenience for tool-SELECTION consumers replacing a hardcoded condition derate: returns just
   * the life multiplier for a reconditioned tool, or the legacy fallback when the reconditioning
   * descriptors are unknown.
   *
   * @param input Partial reconditioning descriptors (tool_type + substrate required to model).
   * @returns Modeled life_multiplier, or RECONDITION_FALLBACK_MULTIPLIER when un-modelable.
   */
  lifeMultiplierOrFallback(input: Partial<ReconditioningInput> | null | undefined): number {
    if (!input || input.tool_type === undefined || input.substrate === undefined) {
      return RECONDITION_FALLBACK_MULTIPLIER;
    }
    return this.assess({
      tool_type: input.tool_type,
      substrate: input.substrate,
      was_coated: input.was_coated ?? false,
      recoated: input.recoated ?? false,
      regrind_cycle: input.regrind_cycle ?? 1,
      edge_prep_grade: input.edge_prep_grade ?? "unknown",
      geometry_within_spec: input.geometry_within_spec ?? true,
    }).life_multiplier;
  }
}

/** Singleton export per PRISM engine convention. */
export const reconditioningQualityEngine = new ReconditioningQualityEngineImpl();
