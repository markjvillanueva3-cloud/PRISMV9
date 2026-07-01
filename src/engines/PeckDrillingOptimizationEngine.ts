/**
 * PeckDrillingOptimizationEngine — Deep Hole Drilling Optimizer
 *
 * Calculates optimal peck depth, retract strategy, feed reduction,
 * and cycle time for deep hole drilling operations.
 *
 * References:
 *   Sandvik Coromant "Hole Making" handbook
 *   Kennametal drilling application guide
 *   Machinery's Handbook, 31st Ed., Drilling chapter
 *
 * Actions: peck_drill_optimize
 */

// ============================================================================
// TYPES
// ============================================================================

export type DrillType = "hss_twist" | "carbide_twist" | "carbide_insert" | "gun_drill" | "spade";

/** Peck Strategy type definition.
 */
export type PeckStrategy = "full_retract" | "chip_break" | "gun_drill_continuous";

/** Peck Drilling Input configuration/data structure.
 */
export interface PeckDrillingInput {
  drill_diameter_mm: number;
  hole_depth_mm: number;
  material: string;
  drill_type: DrillType;
  cutting_speed_m_min: number;     // Vc
  feed_per_rev_mm: number;         // fn
  coolant_through_spindle: boolean;
}

/** Peck Drilling Result configuration/data structure.
 */
export interface PeckDrillingResult {
  ld_ratio: number;
  peck_strategy: PeckStrategy;
  peck_depth_mm: number;
  retract_distance_mm: number;
  num_pecks: number;
  feed_reduction_pct: number;
  adjusted_feed_mm_rev: number;
  estimated_cycle_time_s: number;
  recommendations: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Material chip-breaking difficulty factor (1.0 = steel baseline) */
const MATERIAL_CHIP_FACTOR: Record<string, number> = {
  steel: 1.0, stainless: 1.3, aluminum: 0.6, cast_iron: 0.7,
  titanium: 1.5, inconel: 1.6, copper: 0.8, brass: 0.5,
  plastic: 0.4, carbon_steel: 0.9, alloy_steel: 1.1,
};

/** Drill type peck depth multiplier (relative to diameter) */
const DRILL_TYPE_PECK: Record<DrillType, { base_ld: number; max_peck_factor: number; retract_mm: number }> = {
  hss_twist:      { base_ld: 3.0, max_peck_factor: 1.0,  retract_mm: 1.0 },
  carbide_twist:  { base_ld: 5.0, max_peck_factor: 1.5,  retract_mm: 0.5 },
  carbide_insert: { base_ld: 5.0, max_peck_factor: 2.0,  retract_mm: 0.5 },
  gun_drill:      { base_ld: 40,  max_peck_factor: 10.0, retract_mm: 0.0 },
  spade:          { base_ld: 4.0, max_peck_factor: 1.0,  retract_mm: 1.0 },
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

/** Peck Drilling Optimization Engine engine/manager.
 */
export class PeckDrillingOptimizationEngine {
  calculate(input: PeckDrillingInput): PeckDrillingResult {
    const { drill_diameter_mm: D, hole_depth_mm: L } = input;

    if (D <= 0) throw new Error("Drill diameter must be positive");
    if (L <= 0) throw new Error("Hole depth must be positive");

    const ldRatio = L / D;
    const matKey = this._materialKey(input.material);
    const chipFactor = MATERIAL_CHIP_FACTOR[matKey] ?? 1.0;
    const drillData = DRILL_TYPE_PECK[input.drill_type];

    // Determine peck strategy
    let strategy: PeckStrategy;
    /** If.
     * @param input.drill_type - input.drill_type
     * @returns void
     */
    if (input.drill_type === "gun_drill") {
      strategy = "gun_drill_continuous";
    } else if (ldRatio <= 3 && chipFactor <= 1.0 && input.coolant_through_spindle) {
      strategy = "chip_break";  // shallow hole, easy chip — just break, don't retract
    } else {
      strategy = "full_retract";
    }

    // Peck depth calculation
    // Base: peck = D × factor, reduced for deeper holes and difficult materials
    let peckDepth: number;
    /** If.
     * @param strategy - strategy
     * @returns void
     */
    if (strategy === "gun_drill_continuous") {
      peckDepth = L; // gun drills don't peck — continuous feed with through-coolant
    } else {
      const basePeck = D * drillData.max_peck_factor;
      // Reduce peck depth for high L/D and difficult materials
      const depthReduction = Math.max(0.3, 1 - (ldRatio - 3) * 0.05);
      const materialReduction = 1 / chipFactor;
      peckDepth = Math.max(D * 0.25, basePeck * depthReduction * materialReduction);
      peckDepth = Math.round(peckDepth * 100) / 100;
    }

    // Number of pecks
    const numPecks = strategy === "gun_drill_continuous" ? 1 : Math.ceil(L / peckDepth);

    // Retract distance
    const retractDist = strategy === "chip_break" ? 0.3 : drillData.retract_mm;

    // Feed reduction for deep holes
    // Beyond base L/D, reduce feed progressively
    let feedReductionPct = 0;
    /** If.
     * @param ldRatio - ld ratio
     * @returns void
     */
    if (ldRatio > drillData.base_ld) {
      feedReductionPct = Math.min(40, (ldRatio - drillData.base_ld) * 5);
    }
    // Extra reduction for difficult materials at depth
    /** If.
     * @param chipFactor - chip factor
     * @returns void
     */
    if (chipFactor > 1.2 && ldRatio > 4) {
      feedReductionPct = Math.min(50, feedReductionPct + 10);
    }
    const adjustedFeed = input.feed_per_rev_mm * (1 - feedReductionPct / 100);

    // Cycle time estimate
    const rpm = (input.cutting_speed_m_min * 1000) / (Math.PI * D);
    const feedRate = adjustedFeed * rpm; // mm/min
    const cuttingTime = (L / feedRate) * 60; // seconds
    // Add retract time: each peck → rapid to clearance + rapid back
    const rapidRate = 5000; // mm/min typical rapid
    const retractTime = strategy === "gun_drill_continuous" ? 0
      : numPecks * (2 * (L / 2) / rapidRate) * 60; // average retract distance = L/2
    const totalTime = cuttingTime + retractTime;

    // Recommendations
    const recs: string[] = [];
    /** If.
     * @param ldRatio - ld ratio
     * @returns void
     */
    if (ldRatio > 8 && input.drill_type === "hss_twist") {
      recs.push("L/D > 8 with HSS — consider carbide or gun drill for better chip evacuation");
    }
    /** If.
     * @param ldRatio - ld ratio
     * @returns void
     */
    if (ldRatio > 4 && !input.coolant_through_spindle) {
      recs.push("Deep hole without through-spindle coolant — strongly recommend TSC for chip evacuation");
    }
    /** If.
     * @param chipFactor - chip factor
     * @returns void
     */
    if (chipFactor > 1.3 && ldRatio > 5) {
      recs.push(`Difficult material (${matKey}) at L/D=${ldRatio.toFixed(1)} — use pecking with full retract and reduced feed`);
    }
    /** If.
     * @param ldRatio - ld ratio
     * @returns void
     */
    if (ldRatio > 20 && input.drill_type !== "gun_drill") {
      recs.push("L/D > 20 — gun drill recommended for reliable deep hole production");
    }
    /** If.
     * @param numPecks - num pecks
     * @returns void
     */
    if (numPecks > 15) {
      recs.push(`${numPecks} pecks needed — cycle time will be long; consider pilot + gun drill approach`);
    }
    /** If.
     * @param recs.length - recs.length
     * @returns void
     */
    if (recs.length === 0) {
      recs.push("Drilling parameters within normal range — proceed");
    }

    return {
      ld_ratio: Math.round(ldRatio * 10) / 10,
      peck_strategy: strategy,
      peck_depth_mm: peckDepth,
      retract_distance_mm: retractDist,
      num_pecks: numPecks,
      feed_reduction_pct: Math.round(feedReductionPct),
      adjusted_feed_mm_rev: Math.round(adjustedFeed * 1000) / 1000,
      estimated_cycle_time_s: Math.round(totalTime * 10) / 10,
      recommendations: recs,
    };
  }

  private _materialKey(material: string): string {
    const m = material.toLowerCase();
    if (m.includes("stainless")) return "stainless";
    if (m.includes("aluminum") || m.includes("aluminium")) return "aluminum";
    if (m.includes("cast") && m.includes("iron")) return "cast_iron";
    if (m.includes("titanium")) return "titanium";
    if (m.includes("inconel") || m.includes("718")) return "inconel";
    if (m.includes("copper")) return "copper";
    if (m.includes("brass")) return "brass";
    if (m.includes("plastic") || m.includes("nylon") || m.includes("delrin")) return "plastic";
    if (m.includes("alloy")) return "alloy_steel";
    if (m.includes("carbon") && m.includes("steel")) return "carbon_steel";
    return "steel";
  }

  /**
   * Optimize peck drilling using ChipEvacuationModel for physics-based
   * L/D strategy selection with coolant pressure/flow requirements.
   *
   * Enhances the existing heuristic peck calculation with:
   * - L/D-based strategy selection (standard/peck/high-pressure/gundrill)
   * - Required coolant pressure and flow for the chosen strategy
   * - Material-specific peck depth from evacuation model
   * - Pressure/flow adequacy check against machine capabilities
   *
   * Falls back to existing calculate() if ChipEvacuationModel unavailable.
   *
   * References: Sandvik Drilling Application Guide (2021); Klocke (2011)
   */
  optimizeWithEvacuation(input: PeckDrillingInput & {
    system_pressure_bar?: number;
    system_flow_lpm?: number;
  }): PeckDrillingResult & {
    evacuation_model_used: boolean;
    required_pressure_bar: number;
    required_flow_lpm: number;
    pressure_adequate: boolean;
    flow_adequate: boolean;
    evacuation_strategy: string;
    chip_volume_per_peck_mm3: number | null;
    max_depth_no_retract_mm: number;
  } {
    const D = input.drill_diameter_mm;
    const L = input.hole_depth_mm;
    const sysPressure = input.system_pressure_bar ?? 40;
    const sysFlow = input.system_flow_lpm ?? 20;

    // Run base calculation first
    const baseResult = this.calculate(input);

    // Map drill material to evacuation model material type
    const matKey = this._materialKey(input.material);
    const evacMatMap: Record<string, string> = {
      steel: "steel", stainless: "stainless", aluminum: "aluminum",
      titanium: "titanium", inconel: "superalloy", cast_iron: "cast_iron",
      copper: "copper", brass: "copper", carbon_steel: "steel",
      alloy_steel: "steel", plastic: "aluminum",
    };
    const evacMat = evacMatMap[matKey] ?? "steel";

    // Try ChipEvacuationModel
    let evacUsed = false;
    let reqPressure = 20;
    let reqFlow = 10;
    let pressureOK = true;
    let flowOK = true;
    let evacStrategy = baseResult.peck_strategy;
    let chipVolPerPeck: number | null = null;
    let maxNoRetract = D * 3;

    try {
      const { ChipEvacuationModel } = require("../algorithms/ChipEvacuationModel.js");
      const model = new ChipEvacuationModel();
      const evacResult = model.calculate({
        tool_diameter: D,
        hole_depth: L,
        material_type: evacMat as "steel" | "stainless" | "aluminum" | "titanium" | "superalloy" | "cast_iron" | "copper",
        system_pressure: sysPressure,
        system_flow: sysFlow,
        coolant_through: input.coolant_through_spindle,
        feed_per_rev: input.feed_per_rev_mm,
        cutting_speed: input.cutting_speed_m_min,
      });
      evacUsed = true;
      reqPressure = evacResult.required_pressure;
      reqFlow = evacResult.required_flow;
      pressureOK = evacResult.pressure_adequate;
      flowOK = evacResult.flow_adequate;
      evacStrategy = evacResult.strategy;
      chipVolPerPeck = evacResult.chip_volume_per_peck;
      maxNoRetract = evacResult.max_depth_no_retract;

      // Override peck depth from evacuation model if it's more conservative
      if (evacResult.peck_depth !== null && evacResult.peck_depth < baseResult.peck_depth_mm) {
        baseResult.peck_depth_mm = Math.round(evacResult.peck_depth * 100) / 100;
        baseResult.num_pecks = Math.ceil(L / baseResult.peck_depth_mm);
      }

      // Add evacuation warnings to recommendations
      if (!pressureOK) {
        baseResult.recommendations.push(
          `Coolant pressure ${sysPressure} bar insufficient — need ${reqPressure.toFixed(0)} bar for ${evacStrategy}`,
        );
      }
      if (!flowOK) {
        baseResult.recommendations.push(
          `Coolant flow ${sysFlow} L/min insufficient — need ${reqFlow.toFixed(1)} L/min for chip evacuation`,
        );
      }
      if (evacResult.recommendations) {
        baseResult.recommendations.push(...evacResult.recommendations);
      }
    } catch {
      // Fallback: estimate pressure/flow from L/D heuristic
      const ldRatio = L / D;
      reqPressure = ldRatio > 8 ? 70 : ldRatio > 5 ? 40 : 20;
      reqFlow = D * (ldRatio > 8 ? 1.5 : 1.0);
      pressureOK = sysPressure >= reqPressure;
      flowOK = sysFlow >= reqFlow;
    }

    return {
      ...baseResult,
      evacuation_model_used: evacUsed,
      required_pressure_bar: Math.round(reqPressure * 10) / 10,
      required_flow_lpm: Math.round(reqFlow * 10) / 10,
      pressure_adequate: pressureOK,
      flow_adequate: flowOK,
      evacuation_strategy: evacStrategy,
      chip_volume_per_peck_mm3: chipVolPerPeck !== null ? Math.round(chipVolPerPeck) : null,
      max_depth_no_retract_mm: Math.round(maxNoRetract * 10) / 10,
    };
  }
}

export const peckDrillingOptimizationEngine = new PeckDrillingOptimizationEngine();
