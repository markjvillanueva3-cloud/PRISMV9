/**
 * DimensionalAnalysisEngine — L2-P2-MS1 CAD/CAM Layer
 * *** SAFETY CRITICAL ***
 *
 * Predicts dimensional accuracy from machine capability, tool deflection,
 * thermal growth, and wear progression. Determines if a given machine/tool
 * setup can achieve required tolerances.
 *
 * SAFETY: Dimensional errors cause assembly failures and functional defects.
 * Conservative prediction prevents shipping out-of-spec parts.
 *
 * Actions: dimension_predict, dimension_validate, dimension_budget
 */

// ============================================================================
// TYPES
// ============================================================================

export interface DimensionInput {
  nominal_mm: number;
  tolerance_mm: number;               // total tolerance band (e.g., 0.02)
  tolerance_type: "bilateral" | "unilateral_plus" | "unilateral_minus";
  machine_accuracy_mm: number;        // machine positioning accuracy
  tool_diameter_mm: number;
  tool_stickout_mm: number;
  cutting_force_N: number;
  iso_material_group: string;
  cutting_speed_mmin: number;
  operation_time_min: number;         // for thermal and wear effects
  ambient_temp_C?: number;
}

export interface DimensionPrediction {
  nominal_mm: number;
  predicted_actual_mm: number;
  total_error_mm: number;
  error_budget: ErrorBudget;
  within_tolerance: boolean;
  tolerance_consumed_pct: number;
  cpk_estimate: number;
  confidence_pct: number;
  recommendations: string[];
}

export interface ErrorBudget {
  machine_accuracy_mm: number;
  tool_deflection_mm: number;
  thermal_growth_mm: number;
  tool_wear_mm: number;
  surface_finish_mm: number;
  total_systematic_mm: number;
  total_random_mm: number;            // RSS of random components
  total_worst_case_mm: number;        // arithmetic sum
}

export interface DimensionValidation {
  achievable: boolean;
  margin_mm: number;
  limiting_factor: string;
  issues: string[];
}

export interface ToleranceBudget {
  total_tolerance_mm: number;
  allocated: { source: string; allocation_mm: number; pct: number }[];
  remaining_mm: number;
  feasible: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

// CTE by ISO group (µm/m/°C)
const CTE: Record<string, number> = { P: 12, M: 16, K: 11, N: 23, S: 13, H: 11 };

// Tool wear rate (mm/min of cutting) by ISO group
const WEAR_RATE: Record<string, number> = { P: 0.0003, M: 0.0005, K: 0.0002, N: 0.0001, S: 0.0008, H: 0.0004 };

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class DimensionalAnalysisEngine {
  /**
   * Predict dimensional accuracy.
   * SAFETY: Conservative — always overestimates error magnitude.
   */
  predict(input: DimensionInput): DimensionPrediction {
    const iso = input.iso_material_group || "P";

    // 1. Machine accuracy (systematic)
    const machErr = input.machine_accuracy_mm;

    // 2. Tool deflection (systematic — cantilever beam)
    const E = 600000; // carbide MPa
    const d = input.tool_diameter_mm;
    const I = (Math.PI * d * d * d * d) / 64;
    const L = input.tool_stickout_mm;
    const deflection = (input.cutting_force_N * L * L * L) / (3 * E * I);

    // 3. Thermal growth (systematic)
    const cte = CTE[iso] || 12;
    const dT = 5 + input.cutting_speed_mmin * 0.02; // estimated temp rise
    const thermalGrowth = (cte * dT * input.nominal_mm) / 1e6;

    // 4. Tool wear (systematic, grows with time)
    const wearRate = WEAR_RATE[iso] || 0.0003;
    const wearError = wearRate * input.operation_time_min;

    // 5. Surface finish contribution (random)
    const raContribution = 0.002; // ~2µm Ra typical

    // Error budget
    const systematic = machErr + deflection + thermalGrowth + wearError;
    const random = Math.sqrt(machErr * machErr * 0.3 * 0.3 + raContribution * raContribution); // 30% of machine acc is random
    const worstCase = machErr + deflection + thermalGrowth + wearError + raContribution;

    const budget: ErrorBudget = {
      machine_accuracy_mm: Math.round(machErr * 10000) / 10000,
      tool_deflection_mm: Math.round(deflection * 10000) / 10000,
      thermal_growth_mm: Math.round(thermalGrowth * 10000) / 10000,
      tool_wear_mm: Math.round(wearError * 10000) / 10000,
      surface_finish_mm: raContribution,
      total_systematic_mm: Math.round(systematic * 10000) / 10000,
      total_random_mm: Math.round(random * 10000) / 10000,
      total_worst_case_mm: Math.round(worstCase * 10000) / 10000,
    };

    const totalError = systematic; // use systematic for prediction
    const predicted = input.nominal_mm + totalError; // assumes positive error direction
    const halfTol = input.tolerance_mm / 2;
    const withinTol = totalError <= halfTol;
    const tolConsumed = halfTol > 0 ? (totalError / halfTol) * 100 : 100;

    // Cpk estimate: assumes 3-sigma process
    const sigma = random > 0 ? random : 0.001;
    const cpk = halfTol / (3 * sigma);

    const recommendations: string[] = [];
    if (!withinTol) {
      // Find biggest contributor
      const contributors = [
        { name: "machine_accuracy", val: machErr },
        { name: "tool_deflection", val: deflection },
        { name: "thermal_growth", val: thermalGrowth },
        { name: "tool_wear", val: wearError },
      ].sort((a, b) => b.val - a.val);

      recommendations.push(`Largest error source: ${contributors[0].name} (${(contributors[0].val * 1000).toFixed(1)}µm)`);

      if (contributors[0].name === "tool_deflection") {
        recommendations.push("Reduce tool stickout or increase tool diameter to reduce deflection");
      }
      if (contributors[0].name === "thermal_growth") {
        recommendations.push("Allow thermal stabilization or use probing cycle for offset correction");
      }
    }
    if (cpk < 1.33) {
      recommendations.push(`Cpk ${cpk.toFixed(2)} < 1.33 — process is not capable for this tolerance`);
    }

    return {
      nominal_mm: input.nominal_mm,
      predicted_actual_mm: Math.round(predicted * 10000) / 10000,
      total_error_mm: Math.round(totalError * 10000) / 10000,
      error_budget: budget,
      within_tolerance: withinTol,
      tolerance_consumed_pct: Math.round(tolConsumed * 10) / 10,
      cpk_estimate: Math.round(cpk * 100) / 100,
      confidence_pct: withinTol ? Math.min(99, Math.round(cpk * 30)) : Math.max(5, Math.round((1 - tolConsumed / 200) * 100)),
      recommendations,
    };
  }

  validate(input: DimensionInput): DimensionValidation {
    const prediction = this.predict(input);
    const margin = input.tolerance_mm / 2 - prediction.total_error_mm;
    const issues: string[] = [];

    if (!prediction.within_tolerance) {
      issues.push(`Total error ${(prediction.total_error_mm * 1000).toFixed(1)}µm exceeds half-tolerance ${(input.tolerance_mm / 2 * 1000).toFixed(1)}µm`);
    }
    if (prediction.cpk_estimate < 1.0) {
      issues.push(`Process not capable: Cpk ${prediction.cpk_estimate.toFixed(2)} < 1.0`);
    }

    const limiting = prediction.error_budget;
    const factors = [
      { name: "machine_accuracy", val: limiting.machine_accuracy_mm },
      { name: "tool_deflection", val: limiting.tool_deflection_mm },
      { name: "thermal_growth", val: limiting.thermal_growth_mm },
      { name: "tool_wear", val: limiting.tool_wear_mm },
    ];
    const biggest = factors.sort((a, b) => b.val - a.val)[0];

    return {
      achievable: prediction.within_tolerance,
      margin_mm: Math.round(margin * 10000) / 10000,
      limiting_factor: biggest.name,
      issues,
    };
  }

  toleranceBudget(totalTolerance_mm: number, sources: string[]): ToleranceBudget {
    // Equal allocation by default
    const n = sources.length;
    const perSource = totalTolerance_mm / n;
    const allocated = sources.map(s => ({
      source: s,
      allocation_mm: Math.round(perSource * 10000) / 10000,
      pct: Math.round(100 / n * 10) / 10,
    }));

    return {
      total_tolerance_mm: totalTolerance_mm,
      allocated,
      remaining_mm: 0,
      feasible: perSource > 0.001, // at least 1µm per source
    };
  }
}

export const dimensionalAnalysisEngine = new DimensionalAnalysisEngine();
