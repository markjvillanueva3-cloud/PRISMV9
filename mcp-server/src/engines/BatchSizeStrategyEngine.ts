/**
 * BatchSizeStrategyEngine — Batch-Size-Aware Machining Strategy Optimizer
 *
 * Optimizes strategy selection and cutting parameters based on production
 * quantity tier. Each tier has fundamentally different cost drivers:
 *
 *   Prototype  (1–5):    Safety margins dominate. Tool life irrelevant. Accept
 *                        10% slower cycle for 50% more safety margin.
 *   Small Batch (6–50):  Balance speed and safety. Adaptive/HSM preferred.
 *                        Tool cost matters but not dominant.
 *   Production (51–500): Minimize cycle time. Tool cost significant.
 *                        Aggressive proven strategies + sister-tool planning.
 *   Long Run  (500+):    Minimize TOTAL cost = cycle × rate + tool changes ×
 *                        change cost. Highest Cpk, lights-out capable.
 *
 * Safety factor multipliers:
 *   Prototype  → 1.5×  (all feed/speed limits)
 *   Small      → 1.2×
 *   Production → 1.0×  (nominal)
 *   Long Run   → 0.95× (slightly aggressive, SPC-monitored)
 *
 * Methods:
 *   recommend(batchSize, feature, material, tool, machine)
 *   adjustParameters(baseParams, batchSize)
 *   costBreakdown(strategy, batchSize, params)
 *
 * @engine BatchSizeStrategyEngine
 * @shortcode E1100
 * @dispatcher camDispatcher
 * @actions batch_strategy_recommend, batch_strategy_adjust, batch_strategy_cost
 * @milestone CAMX-MS12/U08
 */

// ─── Enums & Constants ────────────────────────────────────────────────────────

export type BatchTier = "prototype" | "small_batch" | "production" | "long_run";

/** Safety factor applied to all S/F/ap/ae limits per tier. */
const SAFETY_FACTOR: Record<BatchTier, number> = {
  prototype:   1.50,
  small_batch: 1.20,
  production:  1.00,
  long_run:    0.95,
};

/**
 * Preferred strategy categories per tier (ordered by preference).
 * These align with common CAM strategy naming across NX, Mastercam, hyperMILL.
 */
const PREFERRED_STRATEGIES: Record<BatchTier, string[]> = {
  prototype:   ["conventional_roughing", "conventional_finishing", "2d_contour", "trochoidal_light"],
  small_batch: ["adaptive_roughing", "hsm_roughing", "trochoidal", "hsm_finishing"],
  production:  ["aggressive_roughing", "hsm_dynamic", "high_feed", "trochoidal_heavy"],
  long_run:    ["optimized_high_feed", "trochoidal_heavy", "hsm_dynamic", "waveform"],
};

/** Cycle time penalty factor — prototype accepts 10% slower. */
const CYCLE_TIME_TOLERANCE: Record<BatchTier, number> = {
  prototype:   1.10,   // 10% slower acceptable
  small_batch: 1.03,   // 3% slack
  production:  1.00,   // minimize
  long_run:    0.98,   // push for sub-nominal (proven headroom)
};

/** Tool life aggressiveness — prototype ignores tool life; long run maximizes it. */
const TOOL_LIFE_WEIGHT: Record<BatchTier, number> = {
  prototype:   0.0,    // irrelevant
  small_batch: 0.3,
  production:  0.6,
  long_run:    1.0,
};

/** Sister tool required flag per tier. */
const SISTER_TOOL_REQUIRED: Record<BatchTier, boolean> = {
  prototype:   false,
  small_batch: false,
  production:  true,
  long_run:    true,
};

/** Lights-out capable requirement per tier. */
const LIGHTS_OUT_REQUIRED: Record<BatchTier, boolean> = {
  prototype:   false,
  small_batch: false,
  production:  false,
  long_run:    true,
};

/** Minimum acceptable Cpk per tier. */
const MIN_CPK: Record<BatchTier, number> = {
  prototype:   1.00,
  small_batch: 1.33,
  production:  1.33,
  long_run:    1.67,
};

/** Default machine rate USD/hr if not supplied. */
const DEFAULT_MACHINE_RATE_USD_HR = 85;
/** Default tool change time, min. */
const DEFAULT_TOOL_CHANGE_MIN = 2.5;
/** Default tool change cost (labor + downtime), USD. */
const DEFAULT_TOOL_CHANGE_COST_USD = 8.0;

// ─── Input Types ──────────────────────────────────────────────────────────────

/** Feature descriptor for batch strategy decisions. */
export interface BatchFeature {
  /** Feature type: "pocket" | "contour" | "slot" | "bore" | "face" | "profile" */
  type: string;
  /** Volume of material to remove, cm³ */
  volume_cm3: number;
  /** Required surface tolerance (bilateral ±), mm */
  tolerance_mm: number;
  /** Required surface roughness Ra, µm (finish spec) */
  required_Ra_um?: number;
}

/** Material descriptor. */
export interface BatchMaterial {
  /** Material group: "aluminum" | "steel" | "stainless" | "titanium" | "cast_iron" | "superalloy" */
  group: string;
  /** Specific cutting force coefficient kc1_1, N/mm² */
  kc1_1_n_mm2?: number;
  /** Taylor C constant (tool life), m/min */
  taylor_C?: number;
  /** Taylor n exponent */
  taylor_n?: number;
  /** Hardness, HRC (optional) */
  hardness_HRC?: number;
}

/** Tool descriptor. */
export interface BatchTool {
  /** Tool diameter, mm */
  diameter_mm: number;
  /** Number of flutes */
  flute_count: number;
  /** Corner radius, mm */
  corner_radius_mm: number;
  /** Tool purchase cost, USD */
  cost_usd: number;
  /** Nominal expected life, parts per edge */
  expected_life_parts?: number;
  /** Max recommended Vc, m/min */
  max_vc_m_min?: number;
  /** Max recommended fz, mm/tooth */
  max_fz_mm?: number;
  /** Max ap, mm */
  max_ap_mm?: number;
  /** Max ae, mm */
  max_ae_mm?: number;
}

/** Machine descriptor. */
export interface BatchMachine {
  /** Machine hourly rate, USD/hr */
  rate_usd_hr?: number;
  /** Max spindle speed, RPM */
  max_rpm?: number;
  /** Spindle power, kW */
  spindle_power_kw?: number;
  /** Supports probing for in-process measurement */
  has_probing?: boolean;
  /** Supports pallet changer / unattended running */
  pallet_changer?: boolean;
  /** Tool magazine capacity */
  tool_magazine_capacity?: number;
}

// ─── Output Types ─────────────────────────────────────────────────────────────

/** Recommended base cutting parameters for a given tier. */
export interface AdjustedParams {
  /** Cutting speed Vc, m/min */
  Vc_m_min: number;
  /** Feed per tooth fz, mm/tooth */
  fz_mm: number;
  /** Axial depth of cut ap, mm */
  ap_mm: number;
  /** Radial depth of cut ae, mm */
  ae_mm: number;
  /** Applied safety factor (inverse — parameters divided by this) */
  safety_factor: number;
  /** Batch tier that determined these params */
  tier: BatchTier;
  /** Notes on why these values were chosen */
  rationale: string[];
}

/** Per-strategy cost breakdown for a given batch size. */
export interface CostBreakdown {
  /** Cost per individual part, USD */
  per_part_cost_usd: number;
  /** Total batch cost (all parts), USD */
  total_batch_cost_usd: number;
  /** Number of tool changes required for entire batch */
  tool_changes: number;
  /** Total machining cycle time for the batch, min */
  cycle_time_total_min: number;
  /** Cost breakdown components, USD per part */
  components: {
    machining_usd: number;
    tool_amortization_usd: number;
    tool_change_usd: number;
    overhead_usd: number;
  };
  /** Tier-specific optimization note */
  optimization_note: string;
}

/** Full strategy recommendation returned by recommend(). */
export interface BatchStrategyRecommendation {
  /** Resolved batch tier */
  tier: BatchTier;
  /** Batch size provided */
  batch_size: number;
  /** Ordered list of recommended strategy names (best first) */
  recommended_strategies: string[];
  /** Primary recommended strategy */
  primary_strategy: string;
  /** Whether sister tools are required */
  sister_tool_required: boolean;
  /** Whether lights-out operation is expected */
  lights_out_capable: boolean;
  /** Minimum Cpk target for this tier */
  min_cpk_target: number;
  /** Adjusted cutting parameters for this tier */
  adjusted_params: AdjustedParams;
  /** Cost breakdown for the primary strategy */
  cost_estimate: CostBreakdown;
  /** Optimization focus statement */
  optimization_focus: string;
  /** Tier-specific warnings or requirements */
  warnings: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Classify a batch size into a BatchTier. */
function classifyBatch(batchSize: number): BatchTier {
  if (batchSize <= 5)   return "prototype";
  if (batchSize <= 50)  return "small_batch";
  if (batchSize <= 500) return "production";
  return "long_run";
}

/** Compute spindle speed RPM from Vc and diameter. */
function vcToRpm(vc_m_min: number, diameter_mm: number): number {
  return (vc_m_min * 1000) / (Math.PI * Math.max(diameter_mm, 0.1));
}

/** Compute MRR, mm³/min. */
function computeMRR(
  Vc: number, fz: number, ap: number, ae: number,
  flutes: number, diameter_mm: number,
): number {
  const rpm = vcToRpm(Vc, diameter_mm);
  const Vf = fz * flutes * rpm;
  return ae * ap * Vf;
}

/**
 * Estimate cycle time (min) for a given MRR and feature volume.
 * volume_cm3 → mm³, plus a 0.5 min overhead for approach/retract.
 */
function estimateCycleTime(volume_cm3: number, mrr_mm3_min: number, overhead_min = 0.5): number {
  const vol_mm3 = volume_cm3 * 1000;
  return vol_mm3 / Math.max(mrr_mm3_min, 0.001) + overhead_min;
}

/**
 * Estimate tool life in parts given Taylor parameters and Vc.
 * T_min = (C / Vc)^(1/n).  life_parts = T_min / cycle_time_min.
 */
function estimateToolLifeParts(
  Vc: number, cycleTime_min: number,
  taylorC: number, taylorN: number,
): number {
  const T_min = Math.pow(taylorC / Math.max(Vc, 1), 1 / Math.max(taylorN, 0.01));
  return T_min / Math.max(cycleTime_min, 0.01);
}

/** Tier-specific optimization focus statement. */
function tierFocusStatement(tier: BatchTier): string {
  switch (tier) {
    case "prototype":
      return "Maximize safety margins and programming simplicity. Accept 10% slower cycle time for 50% more safety margin. Tool cost and life are not significant factors.";
    case "small_batch":
      return "Balance speed and safety. Use adaptive/HSM strategies to reduce cycle time while maintaining adequate safety margins. Tool cost matters but is not dominant.";
    case "production":
      return "Minimize cycle time. Tool cost is significant — use proven aggressive strategies and plan for sister tools to support unmanned running.";
    case "long_run":
      return "Minimize TOTAL cost: (cycle_time × machine_rate) + (tool_changes × change_cost) + tool_cost. Every second saved multiplies across 500+ parts. Highest Cpk and lights-out capability mandatory.";
  }
}

/** Generate per-tier warnings. */
function tierWarnings(
  tier: BatchTier,
  machine: BatchMachine,
  batchSize: number,
): string[] {
  const warnings: string[] = [];

  if (tier === "long_run") {
    if (!machine.pallet_changer) {
      warnings.push("Long run (500+): Pallet changer not specified — unmanned operation may be limited.");
    }
    if (!machine.has_probing) {
      warnings.push("Long run (500+): In-process probing strongly recommended for SPC feedback loops.");
    }
    if ((machine.tool_magazine_capacity ?? 24) < 30) {
      warnings.push("Long run: Limited tool magazine capacity — sister tool slots may be restricted.");
    }
  }

  if (tier === "production" && !machine.has_probing) {
    warnings.push("Production run: In-process probing recommended to catch tool wear before scrapping parts.");
  }

  if (tier === "prototype" && batchSize === 1) {
    warnings.push("Single-part prototype: Use slowest feed rate of recommended range. No recovery from scrap.");
  }

  return warnings;
}

// ─── Engine Class ─────────────────────────────────────────────────────────────

class BatchSizeStrategyEngine {

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Recommend a strategy suite and adjusted parameters for a given batch size.
   *
   * @param batchSize   Number of parts to produce
   * @param feature     Feature descriptor (type, volume, tolerance)
   * @param material    Material group and optional Taylor constants
   * @param tool        Tool geometry and cost
   * @param machine     Machine capability and rate
   */
  recommend(
    batchSize: number,
    feature: BatchFeature,
    material: BatchMaterial,
    tool: BatchTool,
    machine: BatchMachine,
  ): BatchStrategyRecommendation {
    const tier = classifyBatch(batchSize);
    const adjustedParams = this.adjustParameters(
      this._buildBaseParams(tool, material),
      batchSize,
    );

    const strategies = this._filterStrategiesByFeature(
      PREFERRED_STRATEGIES[tier],
      feature,
      material,
    );
    const primaryStrategy = strategies[0] ?? PREFERRED_STRATEGIES[tier][0];

    const costEst = this.costBreakdown(primaryStrategy, batchSize, adjustedParams, feature, tool, machine);

    return {
      tier,
      batch_size: batchSize,
      recommended_strategies: strategies,
      primary_strategy: primaryStrategy,
      sister_tool_required: SISTER_TOOL_REQUIRED[tier],
      lights_out_capable: LIGHTS_OUT_REQUIRED[tier]
        ? (machine.pallet_changer ?? false)
        : false,
      min_cpk_target: MIN_CPK[tier],
      adjusted_params: adjustedParams,
      cost_estimate: costEst,
      optimization_focus: tierFocusStatement(tier),
      warnings: tierWarnings(tier, machine, batchSize),
    };
  }

  /**
   * Adjust base S/F/ap/ae parameters for the batch tier.
   * Parameters are divided by the safety factor (1.5× safety → all limits
   * reduced to 1/1.5 of nominal, giving the 50% margin headroom).
   *
   * @param baseParams  Nominal tool limits {Vc_m_min, fz_mm, ap_mm, ae_mm}
   * @param batchSize   Number of parts
   */
  adjustParameters(
    baseParams: Pick<AdjustedParams, "Vc_m_min" | "fz_mm" | "ap_mm" | "ae_mm">,
    batchSize: number,
  ): AdjustedParams {
    const tier = classifyBatch(batchSize);
    const sf = SAFETY_FACTOR[tier];
    const ct = CYCLE_TIME_TOLERANCE[tier];

    // Divide all limits by safety factor (higher sf = more conservative parameters)
    const Vc  = parseFloat((baseParams.Vc_m_min / sf).toFixed(2));
    const fz  = parseFloat((baseParams.fz_mm    / sf).toFixed(4));
    const ap  = parseFloat((baseParams.ap_mm    / sf).toFixed(3));
    const ae  = parseFloat((baseParams.ae_mm    / sf).toFixed(3));

    const rationale: string[] = [
      `Tier: ${tier} (batch=${batchSize})`,
      `Safety factor: ${sf}× → all limits reduced to ${(100 / sf).toFixed(1)}% of nominal`,
      `Cycle time tolerance: ${((ct - 1) * 100).toFixed(0)}% ${ct >= 1 ? "slack" : "target reduction"} vs nominal`,
    ];

    if (tier === "prototype") {
      rationale.push("Conventional strategies preferred — minimize programming complexity.");
      rationale.push("Tool life not tracked — accept heavier wear for process confidence.");
    } else if (tier === "small_batch") {
      rationale.push("Adaptive/HSM strategies preferred — trochoidal keeps chip load consistent.");
    } else if (tier === "production") {
      rationale.push("Nominal parameters — proven reliability at full feed rate.");
      rationale.push("Plan sister tools for automatic changeover at wear threshold.");
    } else {
      rationale.push("Slightly aggressive (0.95× safety) — monitored by SPC with probing feedback.");
      rationale.push("Lights-out capable strategy required; pallet changer assumed.");
      rationale.push("Strategy variability (Cpk) weighted equally with MRR when selecting.");
    }

    return { Vc_m_min: Vc, fz_mm: fz, ap_mm: ap, ae_mm: ae, safety_factor: sf, tier, rationale };
  }

  /**
   * Compute cost breakdown for a strategy + batch size.
   *
   * @param strategy    Strategy name (informational, affects note text)
   * @param batchSize   Number of parts
   * @param params      Adjusted cutting parameters (from adjustParameters)
   * @param feature     Feature descriptor
   * @param tool        Tool cost and life data
   * @param machine     Machine rate
   */
  costBreakdown(
    strategy: string,
    batchSize: number,
    params: Pick<AdjustedParams, "Vc_m_min" | "fz_mm" | "ap_mm" | "ae_mm">,
    feature?: BatchFeature,
    tool?: BatchTool,
    machine?: BatchMachine,
  ): CostBreakdown {
    const tier = classifyBatch(batchSize);
    const machineRate = (machine?.rate_usd_hr ?? DEFAULT_MACHINE_RATE_USD_HR) / 60; // USD/min
    const toolCost    = tool?.cost_usd ?? 25;
    const toolLife    = tool?.expected_life_parts ?? 50;
    const diameter    = tool?.diameter_mm ?? 12;
    const flutes      = tool?.flute_count ?? 4;
    const volume      = feature?.volume_cm3 ?? 10;

    // MRR and cycle time
    const mrr = computeMRR(
      params.Vc_m_min, params.fz_mm, params.ap_mm, params.ae_mm, flutes, diameter,
    );
    const cycleTimePerPart = estimateCycleTime(volume, mrr);
    const totalCycleTime   = cycleTimePerPart * batchSize;

    // Tool changes: parts per edge / batch size
    const toolChanges = Math.ceil(batchSize / Math.max(toolLife, 1));

    // Cost components per part
    const machiningUsd      = cycleTimePerPart * machineRate;
    const toolAmortUsd      = toolCost / Math.max(toolLife, 1);
    const toolChangeUsd     = (toolChanges * DEFAULT_TOOL_CHANGE_COST_USD) / batchSize;
    const overheadUsd       = 0.50; // fixed overhead per part

    const perPartCost  = machiningUsd + toolAmortUsd + toolChangeUsd + overheadUsd;
    const totalCost    = perPartCost * batchSize;

    // Optimization note per tier
    let note = "";
    if (tier === "prototype") {
      note = `Prototype run (${batchSize} parts): Cost dominated by machine time (${(machiningUsd / perPartCost * 100).toFixed(0)}%). Tool amortization negligible.`;
    } else if (tier === "small_batch") {
      note = `Small batch (${batchSize} parts): ${toolChanges} tool change(s) planned. Balance HSM cycle time vs setup overhead.`;
    } else if (tier === "production") {
      note = `Production run (${batchSize} parts): ${toolChanges} tool changes required. Sister tool strategy saves ~${(toolChanges * DEFAULT_TOOL_CHANGE_MIN).toFixed(1)} min downtime.`;
    } else {
      const savings1sec = machineRate / 60; // USD per second per part × batch
      const totalSavings = savings1sec * batchSize;
      note = `Long run (${batchSize} parts): 1 second/part saved = $${totalSavings.toFixed(2)} total. Minimize variability — target Cpk ≥ ${MIN_CPK.long_run}.`;
    }

    return {
      per_part_cost_usd:    parseFloat(perPartCost.toFixed(4)),
      total_batch_cost_usd: parseFloat(totalCost.toFixed(2)),
      tool_changes:         toolChanges,
      cycle_time_total_min: parseFloat(totalCycleTime.toFixed(2)),
      components: {
        machining_usd:          parseFloat(machiningUsd.toFixed(4)),
        tool_amortization_usd:  parseFloat(toolAmortUsd.toFixed(4)),
        tool_change_usd:        parseFloat(toolChangeUsd.toFixed(4)),
        overhead_usd:           overheadUsd,
      },
      optimization_note: note,
    };
  }

  // ── Private Helpers ─────────────────────────────────────────────────────────

  /**
   * Build nominal base parameters from tool maximums.
   * Defaults are conservative mid-range values if tool doesn't specify limits.
   */
  private _buildBaseParams(tool: BatchTool, _material: BatchMaterial): Pick<AdjustedParams, "Vc_m_min" | "fz_mm" | "ap_mm" | "ae_mm"> {
    return {
      Vc_m_min: tool.max_vc_m_min ?? 200,
      fz_mm:    tool.max_fz_mm    ?? 0.08,
      ap_mm:    tool.max_ap_mm    ?? tool.diameter_mm * 0.5,
      ae_mm:    tool.max_ae_mm    ?? tool.diameter_mm * 0.25,
    };
  }

  /**
   * Filter and reorder the preferred strategy list based on feature type
   * and material. Promotes trochoidal for hard materials, conventional for
   * prototype aluminum, etc.
   */
  private _filterStrategiesByFeature(
    strategies: string[],
    feature: BatchFeature,
    material: BatchMaterial,
  ): string[] {
    const isTough = ["titanium", "superalloy", "stainless"].includes(material.group);
    const isAlum  = material.group === "aluminum";
    const isPocket = ["pocket", "slot"].includes(feature.type);

    return strategies.map(s => {
      let priority = 0;
      // Boost trochoidal for tough materials or pockets (lower radial engagement)
      if (isTough && s.includes("trochoidal")) priority += 2;
      // Boost conventional for aluminum prototype (less risk of built-up edge)
      if (isAlum && s.includes("conventional")) priority += 1;
      // Boost adaptive for pocket features
      if (isPocket && s.includes("adaptive")) priority += 1;
      // Penalize conventional for tough materials
      if (isTough && s.includes("conventional")) priority -= 2;
      return { s, priority };
    })
      .sort((a, b) => b.priority - a.priority)
      .map(x => x.s);
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export const batchSizeStrategyEngine = new BatchSizeStrategyEngine();
export { BatchSizeStrategyEngine };
