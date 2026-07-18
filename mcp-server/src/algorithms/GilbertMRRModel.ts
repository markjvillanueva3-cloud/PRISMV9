/**
 * Gilbert Material Removal Rate Model
 *
 * Combines volumetric MRR calculation with Gilbert's minimum-cost-speed
 * equation (derived from Taylor tool life):
 *   MRR = ap x ae x Vf  [mm^3/min]
 *   V_opt = C / T_opt^n  where T_opt = (1/n - 1) x (Ct/Cm + tc)
 *
 * SAFETY-CRITICAL: MRR directly affects machine power requirements,
 * tool loading, and chip evacuation demands.
 *
 * References:
 * - Gilbert, W.W. (1950). "Economics of Machining"
 * - Altintas, Y. (2012). "Manufacturing Automation", Ch.1
 * - ISO 3685:1993 Tool life testing
 *
 * @module algorithms/GilbertMRRModel
 */

import type {
  Algorithm,
  AlgorithmMeta,
  ValidationResult,
  ValidationIssue,
  WithWarnings,
} from "./types.js";

// ── Input / Output Types ────────────────────────────────────────────

/** Gilbert M R R Input configuration/data structure.
 */
export interface GilbertMRRInput {
  /** Cutting speed [m/min]. */
  cutting_speed: number;
  /** Feed per tooth [mm/tooth]. */
  feed_per_tooth: number;
  /** Axial depth of cut [mm]. */
  axial_depth: number;
  /** Radial depth of cut [mm]. */
  radial_depth: number;
  /** Tool diameter [mm]. */
  tool_diameter: number;
  /** Number of teeth/flutes. */
  number_of_teeth: number;
  /** Workpiece volume to machine [mm^3] (optional, for time estimate). */
  volume_mm3?: number;
  /** Taylor C constant [m/min] (for Gilbert optimization). */
  taylor_C?: number;
  /** Taylor n exponent (for Gilbert optimization). */
  taylor_n?: number;
  /** Tool cost per edge [currency unit] (for Gilbert optimization). */
  tool_cost?: number;
  /** Tool change time [min] (for Gilbert optimization). */
  tool_change_time?: number;
  /** Machine rate [currency/min] (for Gilbert optimization). */
  machine_rate?: number;
}

/** Gilbert minimum-cost / maximum-production optimal-speed result.
 *
 *  Output of `GilbertMRRModel.calculateOptimalSpeed()`. This is the focused
 *  entry point composed by `UltimateSpeedFeedEngine.gilbertOptimalSpeed`
 *  (SF-PSN-WIRE-MS0/U-SFPSN-05). The full MRR + optimal-speed result is
 *  `GilbertMRROutput` returned by `calculate()`.
 */
export interface GilbertOptimalSpeedResult {
  /** Minimum-cost cutting speed Vc [m/min]: V = C / T_opt^n. */
  V_min_cost: number;
  /** Maximum-production cutting speed Vc [m/min]: V = C / T_prod^n, where
   *  T_prod = (1/n - 1) × changeTime_min (no toolCost term). */
  V_max_prod: number;
  /** Optimal tool life at V_min_cost [min]. Clamped to ≥1 min. */
  T_min_cost: number;
  /** Cost per part at V_min_cost [currency]:
   *  machineCostPerMin × cutTime_min + toolCost / partsPerLife. */
  cost_per_part_optimal: number;
}

/** Gilbert M R R Output configuration/data structure.
 */
export interface GilbertMRROutput extends WithWarnings {
  /** Material removal rate [mm^3/min]. */
  mrr_mm3: number;
  /** Material removal rate [cm^3/min]. */
  mrr_cm3: number;
  /** Table feed rate [mm/min]. */
  feed_rate: number;
  /** Spindle speed [rpm]. */
  spindle_speed: number;
  /** Estimated machining time [min] (if volume provided). */
  machining_time: number | null;
  /** Power estimate [kW] (rough: MRR x kw_factor). */
  power_estimate_kw: number;
  /** Gilbert optimal cutting speed [m/min] (if Taylor params provided). */
  optimal_speed: number | null;
  /** Optimal tool life at V_opt [min]. */
  optimal_tool_life: number | null;
  /** Tool life at current speed [min] (if Taylor params provided). */
  current_tool_life: number | null;
  /** Calculation method tag. */
  calculation_method: string;
}

// ── Safety Limits ───────────────────────────────────────────────────

const LIMITS = {
  MAX_CUTTING_SPEED: 2000,   // m/min
  MIN_CUTTING_SPEED: 1,
  MAX_FEED: 2.0,             // mm/tooth
  MIN_FEED: 0.001,
  MAX_DEPTH: 100,            // mm
  MIN_DEPTH: 0.01,
  MAX_DIAMETER: 500,         // mm
  MIN_DIAMETER: 0.1,
  MAX_MRR: 5000,             // cm^3/min
  MAX_POWER: 200,            // kW
};

/** Approximate specific power [kW per cm^3/min] by material class. */
const SPECIFIC_POWER_KW: Record<string, number> = {
  default: 0.04, // ~40 W per cm^3/min (steel avg)
};

// ── Algorithm Implementation ────────────────────────────────────────

/** Gilbert M R R Model engine/manager.
 */
export class GilbertMRRModel implements Algorithm<GilbertMRRInput, GilbertMRROutput> {

  /** Compute Gilbert minimum-cost & maximum-production speeds from
   *  Taylor + economic parameters. Pure-function entry point intended
   *  for composition from engines that only need the speed-optimization
   *  branch (no MRR side). Mirror's UltimateSpeedFeedEngine's inline
   *  `gilbertOptimalSpeed()` signature bit-for-bit; SF-PSN-WIRE-MS0/U-SFPSN-05
   *  uses this as the canonical entry point for the inline-shim refactor.
   *
   *  Formula (Gilbert, 1950):
   *    T_opt = max(1, (1/n - 1) × (toolCost/max(0.01, machineCostPerMin) + changeTime_min))
   *    V_cost = C × T_opt^(-n)
   *    T_prod = max(1, (1/n - 1) × changeTime_min)
   *    V_prod = C × T_prod^(-n)
   *    parts  = max(1, floor(T_opt / max(0.1, cutTime_min)))
   *    cost/p = machineCostPerMin × cutTime_min + toolCost / parts
   *
   *  Reference: Gilbert (1950) "Economics of Machining"; Altintas (2012)
   *  "Manufacturing Automation" Ch.1.
   *
   *  Clamps (preserved verbatim from inline baseline):
   *    - machineCostPerMin floor 0.01 (avoid div-by-zero in cost-ratio)
   *    - T_opt floor 1 min (unphysical sub-minute optimal life)
   *    - cutTime_min floor 0.1 (avoid div-by-zero in partsPerLife)
   *    - partsPerLife floor 1 (at least one part per tool change)
   *
   *  @param n - Taylor n exponent (HSS≈0.10, carbide≈0.25, ceramic≈0.4)
   *  @param C - Taylor C constant [m/min]
   *  @param machineCostPerMin - machine cost rate [currency/min]
   *  @param toolCost - cost per cutting edge [currency]
   *  @param changeTime_min - tool change time [min]
   *  @param cutTime_min - cutting time per part [min]
   *  @returns GilbertOptimalSpeedResult with V_min_cost, V_max_prod, T_min_cost, cost_per_part_optimal
   */
  static calculateOptimalSpeed(
    n: number, C: number, machineCostPerMin: number,
    toolCost: number, changeTime_min: number, cutTime_min: number,
  ): GilbertOptimalSpeedResult {
    // T_opt = ((1/n) - 1) × (toolCost/machineCost + changeTime); floor at 1 min.
    const T_opt = Math.max(1, ((1 / n) - 1) * (toolCost / Math.max(0.01, machineCostPerMin) + changeTime_min));
    const V_cost = C * Math.pow(T_opt, -n);
    const T_prod = Math.max(1, ((1 / n) - 1) * changeTime_min);
    const V_prod = C * Math.pow(T_prod, -n);
    const partsPerLife = Math.max(1, Math.floor(T_opt / Math.max(0.1, cutTime_min)));
    const costPerPart = machineCostPerMin * cutTime_min + toolCost / partsPerLife;
    return { V_min_cost: V_cost, V_max_prod: V_prod, T_min_cost: T_opt, cost_per_part_optimal: costPerPart };
  }

  /** Validate.
   * @param input - input data
   * @returns validation result
   */
  validate(input: GilbertMRRInput): ValidationResult {
    const issues: ValidationIssue[] = [];

    /** If.
     * @param !input.cutting_speed - !input.cutting_speed
     * @returns void
     */
    if (!input.cutting_speed || input.cutting_speed < LIMITS.MIN_CUTTING_SPEED || input.cutting_speed > LIMITS.MAX_CUTTING_SPEED) {
      issues.push({ field: "cutting_speed", message: `Cutting speed must be ${LIMITS.MIN_CUTTING_SPEED}-${LIMITS.MAX_CUTTING_SPEED} m/min, got ${input.cutting_speed}`, severity: "error" });
    }
    /** If.
     * @param !input.feed_per_tooth - !input.feed_per_tooth
     * @returns void
     */
    if (!input.feed_per_tooth || input.feed_per_tooth < LIMITS.MIN_FEED || input.feed_per_tooth > LIMITS.MAX_FEED) {
      issues.push({ field: "feed_per_tooth", message: `Feed must be ${LIMITS.MIN_FEED}-${LIMITS.MAX_FEED} mm/tooth, got ${input.feed_per_tooth}`, severity: "error" });
    }
    /** If.
     * @param !input.axial_depth - !input.axial_depth
     * @returns void
     */
    if (!input.axial_depth || input.axial_depth < LIMITS.MIN_DEPTH || input.axial_depth > LIMITS.MAX_DEPTH) {
      issues.push({ field: "axial_depth", message: `Axial depth must be ${LIMITS.MIN_DEPTH}-${LIMITS.MAX_DEPTH} mm, got ${input.axial_depth}`, severity: "error" });
    }
    /** If.
     * @param !input.radial_depth - !input.radial_depth
     * @returns void
     */
    if (!input.radial_depth || input.radial_depth < LIMITS.MIN_DEPTH) {
      issues.push({ field: "radial_depth", message: `Radial depth must be >= ${LIMITS.MIN_DEPTH} mm, got ${input.radial_depth}`, severity: "error" });
    }
    /** If.
     * @param !input.tool_diameter - !input.tool_diameter
     * @returns void
     */
    if (!input.tool_diameter || input.tool_diameter < LIMITS.MIN_DIAMETER || input.tool_diameter > LIMITS.MAX_DIAMETER) {
      issues.push({ field: "tool_diameter", message: `Tool diameter must be ${LIMITS.MIN_DIAMETER}-${LIMITS.MAX_DIAMETER} mm, got ${input.tool_diameter}`, severity: "error" });
    }
    /** If.
     * @param !input.number_of_teeth - !input.number_of_teeth
     * @returns void
     */
    if (!input.number_of_teeth || input.number_of_teeth < 1) {
      issues.push({ field: "number_of_teeth", message: `Number of teeth must be >= 1, got ${input.number_of_teeth}`, severity: "error" });
    }
    if (input.taylor_n !== undefined && (input.taylor_n <= 0 || input.taylor_n >= 1)) {
      issues.push({ field: "taylor_n", message: `Taylor n must be 0 < n < 1, got ${input.taylor_n}`, severity: "error" });
    }
    /** If.
     * @param input.radial_depth - input.radial_depth
     * @returns void
     */
    if (input.radial_depth && input.tool_diameter && input.radial_depth > input.tool_diameter) {
      issues.push({ field: "radial_depth", message: `Radial depth (${input.radial_depth}) exceeds tool diameter (${input.tool_diameter})`, severity: "warning" });
    }

    return { valid: issues.filter(i => i.severity === "error").length === 0, issues };
  }

  /** Calculate.
   * @param input - input data
   * @returns gilbert m r r output
   */
  calculate(input: GilbertMRRInput): GilbertMRROutput {
    const warnings: string[] = [];
    const {
      cutting_speed, feed_per_tooth, axial_depth, radial_depth,
      tool_diameter, number_of_teeth, volume_mm3,
      taylor_C, taylor_n, tool_cost, tool_change_time, machine_rate,
    } = input;

    // Spindle speed: n = 1000 x Vc / (pi x D)
    const spindle_speed = (1000 * cutting_speed) / (Math.PI * tool_diameter);

    // Table feed rate: Vf = fz x z x n
    const feed_rate = feed_per_tooth * number_of_teeth * spindle_speed;

    // MRR = ap x ae x Vf
    const mrr_mm3 = axial_depth * radial_depth * feed_rate;
    const mrr_cm3 = mrr_mm3 / 1000;

    // Safety cap
    /** If.
     * @param mrr_cm3 - mrr_cm3
     * @returns void
     */
    if (mrr_cm3 > LIMITS.MAX_MRR) {
      warnings.push(`MRR ${mrr_cm3.toFixed(1)} cm^3/min exceeds practical limit of ${LIMITS.MAX_MRR}`);
    }

    // Machining time
    const machining_time = volume_mm3 !== undefined ? volume_mm3 / mrr_mm3 : null;

    // Power estimate (rough)
    const power_estimate_kw = Math.min(mrr_cm3 * SPECIFIC_POWER_KW.default, LIMITS.MAX_POWER);

    // Gilbert optimal speed (requires Taylor params + cost params)
    let optimal_speed: number | null = null;
    let optimal_tool_life: number | null = null;
    let current_tool_life: number | null = null;

    /** If.
     * @param taylor_C - taylor_ c
     * @returns void
     */
    if (taylor_C && taylor_n) {
      // Current tool life: T = (C / V)^(1/n)
      current_tool_life = Math.pow(taylor_C / cutting_speed, 1 / taylor_n);

      /** If.
       * @param tool_cost - tool_cost
       * @returns void
       */
      if (tool_cost !== undefined && machine_rate && tool_change_time !== undefined) {
        // Gilbert's equation: T_opt = (1/n - 1) x (Ct/Cm + tc)
        const cost_ratio = (tool_cost + tool_change_time * machine_rate) / machine_rate;
        const T_opt = (1 / taylor_n - 1) * cost_ratio;

        /** If.
         * @param T_opt - t_opt
         * @returns void
         */
        if (T_opt > 0) {
          optimal_tool_life = T_opt;
          optimal_speed = taylor_C / Math.pow(T_opt, taylor_n);

          /** If.
           * @param cutting_speed - cutting_speed
           * @returns void
           */
          if (cutting_speed > optimal_speed * 1.3) {
            warnings.push(`Speed ${cutting_speed.toFixed(0)} m/min exceeds optimal ${optimal_speed.toFixed(0)} by >${((cutting_speed / optimal_speed - 1) * 100).toFixed(0)}%. Higher cost per part.`);
          }
        }
      }

      /** If.
       * @param current_tool_life - current_tool_life
       * @returns void
       */
      if (current_tool_life < 5) {
        warnings.push(`Tool life ${current_tool_life.toFixed(1)} min is very short. Consider reducing speed.`);
      }
    }

    /** If.
     * @param power_estimate_kw - power_estimate_kw
     * @returns void
     */
    if (power_estimate_kw > 50) {
      warnings.push(`High power requirement: ${power_estimate_kw.toFixed(1)} kW. Verify machine capacity.`);
    }

    return {
      mrr_mm3, mrr_cm3, feed_rate, spindle_speed,
      machining_time, power_estimate_kw,
      optimal_speed, optimal_tool_life, current_tool_life,
      warnings,
      calculation_method: optimal_speed
        ? "MRR (ap x ae x Vf) + Gilbert minimum-cost-speed"
        : "MRR (ap x ae x Vf)",
    };
  }

  /** Gets metadata.
   * @returns algorithm meta
   */
  getMetadata(): AlgorithmMeta {
    return {
      id: "gilbert-mrr",
      name: "Gilbert Material Removal Rate Model",
      description: "Volumetric MRR with Gilbert's minimum-cost-speed optimization",
      formula: "MRR = ap x ae x fz x z x n; V_opt = C / T_opt^n",
      reference: "Gilbert (1950); Altintas 'Manufacturing Automation' (2012) Ch.1",
      safety_class: "critical",
      domain: "power",
      inputs: {
        cutting_speed: "Cutting speed [m/min]",
        feed_per_tooth: "Feed per tooth [mm/tooth]",
        axial_depth: "Axial depth of cut [mm]",
        radial_depth: "Radial depth of cut [mm]",
        tool_diameter: "Tool diameter [mm]",
        number_of_teeth: "Number of flutes [-]",
      },
      outputs: {
        mrr_mm3: "Material removal rate [mm^3/min]",
        mrr_cm3: "Material removal rate [cm^3/min]",
        feed_rate: "Table feed rate [mm/min]",
        spindle_speed: "Spindle speed [rpm]",
        optimal_speed: "Gilbert optimal speed [m/min]",
        power_estimate_kw: "Power estimate [kW]",
      },
    };
  }
}
