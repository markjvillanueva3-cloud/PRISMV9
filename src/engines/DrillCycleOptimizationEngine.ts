/**
 * DrillCycleOptimizationEngine — Drill cycle selection & peck parameter optimization
 *
 * Models: Depth-to-diameter ratio classification, peck depth calculation,
 *         chip evacuation analysis, dwell time optimization, cycle time estimation
 * References: Sandvik Drilling Guide (2023), Klocke (2011), OSG Technical Manual
 * Extends: Complements DrillBreakthroughForceEngine (exit force) with cycle strategy
 */

import { machiningPlaybookEngine } from "./MachiningPlaybookEngine.js";

// ─── Types ─────────────────────────────────────────────────────────

export type DrillCycleType =
  | "standard"       // no pecking — shallow holes (L/D ≤ 3)
  | "peck"           // full retract peck — deep holes, difficult materials
  | "chip_break"     // partial retract — medium depth, good chip control
  | "gun_drill"      // single-lip with coolant-through — L/D > 10
  | "bta"            // boring and trepanning — L/D > 20, large diameter
  | "step";          // incremental depth increase — fragile drills

/** Material Chip Behavior type definition.
 */
export type MaterialChipBehavior =
  | "long_stringy"   // aluminum, copper — needs aggressive pecking
  | "short_breaking" // cast iron, brass — minimal pecking needed
  | "moderate"       // carbon steel — standard approach
  | "gummy"          // stainless, titanium — heat + adhesion concern
  | "abrasive";      // composites, MMC — tool wear concern

/** Coolant Delivery type definition.
 */
export type CoolantDelivery =
  | "flood_external"
  | "through_tool"
  | "mql"
  | "dry"
  | "none";

/** Drill Cycle Input configuration/data structure.
 */
export interface DrillCycleInput {
  drill_diameter_mm: number;
  hole_depth_mm: number;
  material_chip_behavior?: MaterialChipBehavior;  // default "moderate"
  workpiece_hardness_hrc?: number;
  feed_mm_rev: number;
  spindle_rpm: number;
  is_through_hole: boolean;
  coolant_delivery?: CoolantDelivery;              // default "flood_external"
  has_pilot_hole?: boolean;                        // default false
  pilot_diameter_mm?: number;
  is_interrupted_cut?: boolean;                    // cross-hole, keyway
  minimum_wall_thickness_mm?: number;              // for thin-wall check
  machine_rapid_mm_min?: number;                   // rapid traverse rate, default 10000
  spot_drill_used?: boolean;                       // default true for accuracy
}

/** Atomic Value configuration/data structure.
 */
export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
  warning?: string;
}

/** Drill Cycle Result configuration/data structure.
 */
export interface DrillCycleResult {
  recommended_cycle: DrillCycleType;
  depth_to_diameter_ratio: number;
  peck_depth_mm: AtomicValue;
  number_of_pecks: number;
  dwell_time_s: AtomicValue;
  retract_height_mm: number;
  estimated_cycle_time_s: AtomicValue;
  chip_evacuation_risk: "low" | "medium" | "high";
  coolant_adequate: boolean;
  is_safe: boolean;
  recommendations: string[];
}

// ─── Constants ─────────────────────────────────────────────────────

/** L/D ratio thresholds for cycle selection — Sandvik Drilling Guide */
const LD_THRESHOLDS = {
  standard_max: 3.0,       // standard drill (no peck) up to 3×D
  chip_break_max: 5.0,     // chip-break peck up to 5×D
  peck_max: 10.0,          // full-retract peck up to 10×D
  gun_drill_max: 30.0,     // gun drill up to 30×D
  bta_min: 15.0,           // BTA for 15×D+ (overlaps gun drill)
} as const;

/** Peck depth as fraction of drill diameter by material */
const PECK_DEPTH_FRACTION: Record<MaterialChipBehavior, number> = {
  long_stringy: 0.5,    // aluminum — shorter pecks, chips wrap
  short_breaking: 1.5,  // cast iron — long pecks, chips break naturally
  moderate: 1.0,        // steel — standard 1×D peck
  gummy: 0.5,           // stainless/titanium — heat buildup, frequent retract
  abrasive: 0.75,       // composites — moderate, protect cutting edge
};

/** Peck depth reduction factor for deep holes (beyond 5×D) */
const DEEP_HOLE_REDUCTION = 0.75; // reduce peck depth by 25% past 5×D

/** Dwell time at bottom (seconds) — chip clearing before retract */
const DWELL_TIME_BASE: Record<MaterialChipBehavior, number> = {
  long_stringy: 0.3,
  short_breaking: 0.1,
  moderate: 0.2,
  gummy: 0.5,    // longer dwell — let heat dissipate
  abrasive: 0.3,
};

/** Retract clearance above workpiece surface (mm) */
const RETRACT_CLEARANCE_MM = 3.0;

/** Minimum peck depth to prevent rubbing (mm) */
const MIN_PECK_DEPTH_MM = 0.5;

/** Coolant suitability by L/D — Sandvik recommendation */
function coolantAdequate(ld: number, delivery: CoolantDelivery): boolean {
  if (delivery === "through_tool") return true;       // always adequate
  if (delivery === "flood_external" && ld <= 5) return true;
  if (delivery === "mql" && ld <= 3) return true;
  if (delivery === "dry" && ld <= 2) return true;
  if (delivery === "none") return false;
  return false;
}

// ─── Engine ────────────────────────────────────────────────────────

/** Drill Cycle Optimization Engine engine/manager.
 */
export class DrillCycleOptimizationEngine {
  /**
   * Select optimal drill cycle and compute peck parameters.
   *
   * Decision tree based on L/D ratio, material chip behavior,
   * coolant delivery, and hole geometry constraints.
   */
  calculate(input: DrillCycleInput): DrillCycleResult {
    const recommendations: string[] = [];
    let isSafe = true;

    const D = input.drill_diameter_mm;
    const L = input.hole_depth_mm;
    const LD = L / D;
    const chipBehavior = input.material_chip_behavior ?? "moderate";
    const coolant = input.coolant_delivery ?? "flood_external";
    const rapidRate = input.machine_rapid_mm_min ?? 10000;
    const feedRate = input.feed_mm_rev * input.spindle_rpm; // mm/min

    // ── Cycle type selection ──
    let cycle: DrillCycleType = this.selectCycleType(LD, chipBehavior, coolant, D, input);

    // ── Peck depth calculation ──
    let peckFraction = PECK_DEPTH_FRACTION[chipBehavior];

    // Reduce peck depth for deep holes
    /** If.
     * @param LD - l d
     * @returns void
     */
    if (LD > 5) {
      peckFraction *= DEEP_HOLE_REDUCTION;
    }

    // Through-tool coolant allows longer pecks
    /** If.
     * @param coolant - coolant
     * @returns void
     */
    if (coolant === "through_tool") {
      peckFraction *= 1.5;
    }

    // Interrupted cut — reduce peck depth for stability
    /** If.
     * @param input.is_interrupted_cut - input.is_interrupted_cut
     * @returns void
     */
    if (input.is_interrupted_cut) {
      peckFraction *= 0.7;
      recommendations.push("Interrupted cut detected — peck depth reduced 30% for stability.");
    }

    let peckDepth = D * peckFraction;
    peckDepth = Math.max(peckDepth, MIN_PECK_DEPTH_MM);

    // For standard cycle, peck depth = full hole depth
    /** If.
     * @param cycle - cycle
     * @returns void
     */
    if (cycle === "standard") {
      peckDepth = L;
    }

    // Number of pecks
    const numPecks = cycle === "standard" ? 1 : Math.ceil(L / peckDepth);

    // ── Dwell time ──
    let dwellBase = DWELL_TIME_BASE[chipBehavior];
    // Blind holes need longer dwell for chip clearing
    /** If.
     * @param !input.is_through_hole - !input.is_through_hole
     * @returns void
     */
    if (!input.is_through_hole) {
      dwellBase *= 1.5;
    }
    // Deep holes need more dwell
    /** If.
     * @param LD - l d
     * @returns void
     */
    if (LD > 5) {
      dwellBase *= 1.3;
    }

    // ── Cycle time estimation ──
    const drillTimePerPeck = peckDepth / feedRate * 60; // seconds per peck
    const retractTime = (L + RETRACT_CLEARANCE_MM) / rapidRate * 60; // seconds
    const approachTime = RETRACT_CLEARANCE_MM / rapidRate * 60;

    let totalCycleTime: number;
    /** If.
     * @param cycle - cycle
     * @returns void
     */
    if (cycle === "standard") {
      totalCycleTime = (L / feedRate * 60) + approachTime + retractTime;
    } else if (cycle === "chip_break") {
      // Chip break: partial retract (1–2mm), less time than full peck
      const partialRetractTime = 2 / rapidRate * 60; // 2mm partial retract
      totalCycleTime = numPecks * (drillTimePerPeck + partialRetractTime + dwellBase) + approachTime;
    } else {
      // Full peck: each peck returns to surface
      totalCycleTime = 0;
      /** For.
       * @param let - let
       * @returns void
       */
      for (let i = 0; i < numPecks; i++) {
        const depthSoFar = Math.min((i + 1) * peckDepth, L);
        const thisPeckRetract = depthSoFar / rapidRate * 60;
        const thisPeckApproach = depthSoFar / rapidRate * 60;
        totalCycleTime += drillTimePerPeck + thisPeckRetract + thisPeckApproach + dwellBase;
      }
      totalCycleTime += approachTime;
    }

    // ── Chip evacuation risk ──
    let chipRisk: "low" | "medium" | "high" = "low";
    if (LD > 5 && coolant !== "through_tool") chipRisk = "medium";
    if (LD > 8 && coolant !== "through_tool") chipRisk = "high";
    if (chipBehavior === "long_stringy" && LD > 3) chipRisk = "medium";
    if (chipBehavior === "gummy" && LD > 4) chipRisk = "high";

    // ── Coolant check ──
    const coolantOk = coolantAdequate(LD, coolant);
    /** If.
     * @param !coolantOk - !coolant ok
     * @returns void
     */
    if (!coolantOk) {
      recommendations.push(
        `Coolant delivery "${coolant}" inadequate for L/D = ${LD.toFixed(1)}. ` +
        (LD > 5 ? "Use through-tool coolant." : "Use flood coolant minimum.")
      );
    }

    // ── Safety checks ──
    /** If.
     * @param LD - l d
     * @returns void
     */
    if (LD > 10 && cycle !== "gun_drill" && cycle !== "bta") {
      recommendations.push(`L/D = ${LD.toFixed(1)} exceeds standard drill range. Consider gun drill or BTA.`);
      isSafe = false;
    }

    /** If.
     * @param chipRisk - chip risk
     * @returns void
     */
    if (chipRisk === "high") {
      recommendations.push("High chip evacuation risk — reduce feed, increase peck frequency, or use through-tool coolant.");
    }

    /** If.
     * @param input.minimum_wall_thickness_mm - input.minimum_wall_thickness_mm
     * @returns void
     */
    if (input.minimum_wall_thickness_mm !== undefined && input.minimum_wall_thickness_mm < D * 0.3) {
      recommendations.push(`Thin wall (${input.minimum_wall_thickness_mm} mm) — reduce feed by 30–50% to prevent deflection.`);
    }

    /** If.
     * @param coolant - coolant
     * @returns void
     */
    if (coolant === "dry" && chipBehavior === "gummy") {
      recommendations.push("CRITICAL: Dry drilling gummy material — tool failure and work hardening risk. Add coolant.");
      isSafe = false;
    }

    /** If.
     * @param !input.spot_drill_used - !input.spot_drill_used
     * @returns void
     */
    if (!input.spot_drill_used && !input.has_pilot_hole && D > 10) {
      recommendations.push("No spot drill for Ø > 10 mm — drill may walk. Use a spot drill or pilot hole.");
    }

    // ── Optimization recommendations ──
    /** If.
     * @param cycle - cycle
     * @returns void
     */
    if (cycle === "peck" && coolant === "flood_external") {
      recommendations.push("Consider through-tool coolant to reduce pecks and cycle time by ~40%.");
    }

    const pbResult = machiningPlaybookEngine.advise({
      categories: ["deep_hole", "hole_making"],
      operation_type: "drilling",
      aspect_ratio: LD,
    });
    for (const rule of pbResult.rules) {
      if (rule.severity === "critical" || rule.severity === "important") {
        recommendations.push(`[Playbook ${rule.id}] ${rule.title}`);
      }
    }

    // ── Uncertainty ──
    const peckUncertainty = peckDepth * 0.15;
    const dwellUncertainty = dwellBase * 0.25;
    const cycleTimeUncertainty = totalCycleTime * 0.20;

    return {
      recommended_cycle: cycle,
      depth_to_diameter_ratio: Math.round(LD * 100) / 100,
      peck_depth_mm: {
        value: Math.round(peckDepth * 100) / 100,
        unit: "mm",
        uncertainty: Math.round(peckUncertainty * 100) / 100,
        source: `${chipBehavior} chip behavior × ${peckFraction.toFixed(2)}×D — Sandvik drilling guide`,
      },
      number_of_pecks: numPecks,
      dwell_time_s: {
        value: Math.round(dwellBase * 100) / 100,
        unit: "s",
        uncertainty: Math.round(dwellUncertainty * 100) / 100,
        source: `${chipBehavior} material dwell + depth/blind-hole correction`,
      },
      retract_height_mm: RETRACT_CLEARANCE_MM,
      estimated_cycle_time_s: {
        value: Math.round(totalCycleTime * 100) / 100,
        unit: "s",
        uncertainty: Math.round(cycleTimeUncertainty * 100) / 100,
        source: "Sum of drill/retract/approach/dwell times at programmed feed + rapid",
      },
      chip_evacuation_risk: chipRisk,
      coolant_adequate: coolantOk,
      is_safe: isSafe,
      recommendations,
    };
  }

  /** Select drill cycle type from L/D ratio and constraints */
  private selectCycleType(
    LD: number,
    chipBehavior: MaterialChipBehavior,
    coolant: CoolantDelivery,
    diameter: number,
    input: DrillCycleInput,
  ): DrillCycleType {
    // BTA: very deep + large diameter
    if (LD > LD_THRESHOLDS.bta_min && diameter >= 18) return "bta";

    // Gun drill: deep holes with through-tool coolant
    if (LD > LD_THRESHOLDS.peck_max) return "gun_drill";

    // Standard: shallow holes
    if (LD <= LD_THRESHOLDS.standard_max && chipBehavior !== "long_stringy") return "standard";

    // Chip break: medium depth, materials that break chips well
    if (LD <= LD_THRESHOLDS.chip_break_max && (chipBehavior === "short_breaking" || chipBehavior === "moderate")) {
      return "chip_break";
    }

    // Through-tool coolant allows chip-break instead of full peck
    if (coolant === "through_tool" && LD <= LD_THRESHOLDS.peck_max) return "chip_break";

    // Default: full peck
    return "peck";
  }
}

/** Drill Cycle Optimization Engine constant.
 */
export const drillCycleOptimizationEngine = new DrillCycleOptimizationEngine();
