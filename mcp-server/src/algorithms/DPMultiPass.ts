/**
 * DP Multi-Pass Turning Optimizer — Dynamic Programming Depth Allocation
 *
 * Uses dynamic programming to optimally allocate total stock removal across
 * multiple turning passes. Minimizes total machining time by choosing the
 * optimal number of passes and depth distribution, respecting tool and
 * machine constraints.
 *
 * Manufacturing uses: roughing pass planning in turning, optimal stock
 * distribution, minimize cycle time for multi-pass operations.
 *
 * References:
 * - Shin, Y.C. & Joo, Y.S. (1992). "Optimization of Machining Conditions"
 * - Armarego, E.J.A. & Brown, R.H. (1969). "The Machining of Metals"
 * - Wang, J. et al. (2002). "Optimization of Multi-Pass Turning Operations"
 *
 * @module algorithms/DPMultiPass
 */

import type {
  Algorithm, AlgorithmMeta, ValidationResult, ValidationIssue, WithWarnings,
} from "./types.js";

export interface DPMultiPassInput {
  /** Total stock to remove (radial) [mm]. */
  total_stock: number;
  /** Minimum depth of cut per pass [mm]. Default 0.5. */
  min_depth?: number;
  /** Maximum depth of cut per pass [mm]. Default 5. */
  max_depth?: number;
  /** Maximum number of passes. Default 10. */
  max_passes?: number;
  /** Workpiece diameter [mm]. */
  workpiece_diameter: number;
  /** Cut length [mm]. */
  cut_length: number;
  /** Specific cutting force coefficient [N/mm²]. Default 2500. */
  Kc?: number;
  /** Maximum spindle power [kW]. Default 15. */
  max_power?: number;
  /** Feed rate [mm/rev]. Default 0.3 (roughing). */
  feed_rate?: number;
  /** Cutting speed [m/min]. Default 200. */
  cutting_speed?: number;
  /** Tool change time [s]. Default 30. */
  tool_change_time?: number;
  /** DP resolution [mm]. Default 0.1. */
  resolution?: number;
}

export interface PassAllocation {
  pass_number: number;
  depth_of_cut: number;
  diameter_after: number;
  machining_time: number;
  power_required: number;
}

export interface DPMultiPassOutput extends WithWarnings {
  /** Optimal pass allocations. */
  passes: PassAllocation[];
  /** Total number of passes. */
  n_passes: number;
  /** Total machining time [min]. */
  total_time: number;
  /** Total time including tool changes [min]. */
  total_time_with_changes: number;
  /** Comparison: equal-depth allocation time [min]. */
  equal_depth_time: number;
  /** Time savings vs equal depth [%]. */
  savings_pct: number;
  /** Average power utilization [%]. */
  avg_power_utilization: number;
  /** Whether all passes are within constraints. */
  feasible: boolean;
  calculation_method: string;
}

export class DPMultiPass implements Algorithm<DPMultiPassInput, DPMultiPassOutput> {

  validate(input: DPMultiPassInput): ValidationResult {
    const issues: ValidationIssue[] = [];
    if (!input.total_stock || input.total_stock <= 0) {
      issues.push({ field: "total_stock", message: "Must be > 0", severity: "error" });
    }
    if (!input.workpiece_diameter || input.workpiece_diameter <= 0) {
      issues.push({ field: "workpiece_diameter", message: "Must be > 0", severity: "error" });
    }
    if (!input.cut_length || input.cut_length <= 0) {
      issues.push({ field: "cut_length", message: "Must be > 0", severity: "error" });
    }
    if ((input.min_depth ?? 0.5) >= (input.max_depth ?? 5)) {
      issues.push({ field: "min_depth", message: "Must be less than max_depth", severity: "error" });
    }
    if (input.total_stock > input.workpiece_diameter / 2) {
      issues.push({ field: "total_stock", message: "Stock exceeds half the diameter", severity: "error" });
    }
    return { valid: issues.filter(i => i.severity === "error").length === 0, issues };
  }

  calculate(input: DPMultiPassInput): DPMultiPassOutput {
    const warnings: string[] = [];
    const totalStock = input.total_stock;
    const minAp = input.min_depth ?? 0.5;
    const maxAp = input.max_depth ?? 5;
    const maxPasses = input.max_passes ?? 10;
    const D0 = input.workpiece_diameter;
    const L = input.cut_length;
    const Kc = input.Kc ?? 2500;
    const Pmax = input.max_power ?? 15;
    const f = input.feed_rate ?? 0.3;
    const Vc = input.cutting_speed ?? 200;
    const tChange = (input.tool_change_time ?? 30) / 60; // s → min
    const res = input.resolution ?? 0.1;

    // Discretize total stock into steps
    const nSteps = Math.ceil(totalStock / res);
    const stepSize = totalStock / nSteps;

    // DP: dp[k][s] = min time to remove s steps of stock using k passes
    // dp[k][s] = min over d in [minAp, maxAp]: dp[k-1][s-d_steps] + time(d, diameter_at_s)
    const INF = 1e15;
    const dp: number[][] = Array.from({ length: maxPasses + 1 }, () => new Array(nSteps + 1).fill(INF));
    const choice: number[][] = Array.from({ length: maxPasses + 1 }, () => new Array(nSteps + 1).fill(0));

    dp[0][0] = 0;

    for (let k = 1; k <= maxPasses; k++) {
      for (let s = 1; s <= nSteps; s++) {
        const stockRemoved = s * stepSize;
        // Try all possible depths for pass k
        const minSteps = Math.max(1, Math.ceil(minAp / stepSize));
        const maxSteps = Math.min(s, Math.floor(maxAp / stepSize));

        for (let d = minSteps; d <= maxSteps; d++) {
          const prev = s - d;
          if (prev < 0 || dp[k - 1][prev] >= INF) continue;

          const depth = d * stepSize;
          const diamBefore = D0 - 2 * (prev * stepSize);

          // Check power constraint
          const n_rpm = (Vc * 1000) / (Math.PI * diamBefore);
          const power = Kc * depth * f * Vc / (60 * 1000); // kW

          if (power > Pmax) continue; // Infeasible

          // Machining time for this pass
          const time = L / (f * n_rpm);

          const totalTime = dp[k - 1][prev] + time;
          if (totalTime < dp[k][s]) {
            dp[k][s] = totalTime;
            choice[k][s] = d;
          }
        }
      }
    }

    // Find optimal number of passes
    let bestK = 1;
    let bestTotal = INF;
    for (let k = 1; k <= maxPasses; k++) {
      const t = dp[k][nSteps] + (k - 1) * tChange; // Include tool changes between passes
      if (t < bestTotal) {
        bestTotal = t;
        bestK = k;
      }
    }

    // Trace back optimal allocation
    const passes: PassAllocation[] = [];
    let remaining = nSteps;
    const depthSteps: number[] = [];
    for (let k = bestK; k >= 1; k--) {
      const d = choice[k][remaining];
      depthSteps.unshift(d);
      remaining -= d;
    }

    let totalTime = 0;
    let totalPowerUtil = 0;
    let cumStock = 0;
    let feasible = true;

    for (let i = 0; i < depthSteps.length; i++) {
      const depth = depthSteps[i] * stepSize;
      const diamBefore = D0 - 2 * cumStock;
      cumStock += depth;
      const diamAfter = D0 - 2 * cumStock;

      const n_rpm = (Vc * 1000) / (Math.PI * diamBefore);
      const time = L / (f * n_rpm);
      const power = Kc * depth * f * Vc / (60 * 1000);
      const powerPct = (power / Pmax) * 100;

      if (power > Pmax) feasible = false;

      passes.push({
        pass_number: i + 1,
        depth_of_cut: depth,
        diameter_after: diamAfter,
        machining_time: time,
        power_required: power,
      });

      totalTime += time;
      totalPowerUtil += powerPct;
    }

    const avgPowerUtil = passes.length > 0 ? totalPowerUtil / passes.length : 0;
    const totalWithChanges = totalTime + (passes.length - 1) * tChange;

    // Equal-depth comparison
    const equalDepth = totalStock / passes.length;
    let equalTime = 0;
    let eqCumStock = 0;
    for (let i = 0; i < passes.length; i++) {
      const diamBefore = D0 - 2 * eqCumStock;
      eqCumStock += equalDepth;
      const n_rpm = (Vc * 1000) / (Math.PI * diamBefore);
      equalTime += L / (f * n_rpm);
    }
    equalTime += (passes.length - 1) * tChange;

    const savings = equalTime > 0 ? ((equalTime - totalWithChanges) / equalTime) * 100 : 0;

    if (!feasible) {
      warnings.push("One or more passes exceed power limit — reduce max depth or increase power");
    }

    return {
      passes,
      n_passes: passes.length,
      total_time: totalTime,
      total_time_with_changes: totalWithChanges,
      equal_depth_time: equalTime,
      savings_pct: savings,
      avg_power_utilization: avgPowerUtil,
      feasible,
      warnings,
      calculation_method: `DP multi-pass (stock=${totalStock}mm, ${passes.length} passes, res=${stepSize}mm)`,
    };
  }

  getMetadata(): AlgorithmMeta {
    return {
      id: "dp-multi-pass",
      name: "DP Multi-Pass Turning Optimizer",
      description: "Dynamic programming optimal depth allocation for multi-pass turning",
      formula: "dp[k][s] = min_d { dp[k-1][s-d] + t(d) }; t = L/(f×n)",
      reference: "Shin & Joo (1992); Wang et al. (2002)",
      safety_class: "standard",
      domain: "planning",
      inputs: { total_stock: "Total radial stock [mm]", workpiece_diameter: "Initial diameter [mm]", cut_length: "Cutting length [mm]" },
      outputs: { passes: "Optimal pass allocations", total_time: "Minimum machining time [min]", savings_pct: "vs equal-depth [%]" },
    };
  }
}
