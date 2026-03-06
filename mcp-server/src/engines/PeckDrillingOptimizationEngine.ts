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
    if (ldRatio > drillData.base_ld) {
      feedReductionPct = Math.min(40, (ldRatio - drillData.base_ld) * 5);
    }
    // Extra reduction for difficult materials at depth
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
    if (ldRatio > 8 && input.drill_type === "hss_twist") {
      recs.push("L/D > 8 with HSS — consider carbide or gun drill for better chip evacuation");
    }
    if (ldRatio > 4 && !input.coolant_through_spindle) {
      recs.push("Deep hole without through-spindle coolant — strongly recommend TSC for chip evacuation");
    }
    if (chipFactor > 1.3 && ldRatio > 5) {
      recs.push(`Difficult material (${matKey}) at L/D=${ldRatio.toFixed(1)} — use pecking with full retract and reduced feed`);
    }
    if (ldRatio > 20 && input.drill_type !== "gun_drill") {
      recs.push("L/D > 20 — gun drill recommended for reliable deep hole production");
    }
    if (numPecks > 15) {
      recs.push(`${numPecks} pecks needed — cycle time will be long; consider pilot + gun drill approach`);
    }
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
}

/** Peck Drilling Optimization Engine constant.
 */
export const peckDrillingOptimizationEngine = new PeckDrillingOptimizationEngine();
