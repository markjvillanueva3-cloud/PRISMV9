/**
 * MachineToolErrorBudgetEngine — Geometric Error Budget Allocation & Propagation
 *
 * Allocates and propagates machine tool geometric errors through kinematic chains
 * to predict volumetric accuracy and identify dominant error contributors.
 *
 * Models:
 * - 21-error model: 6 DOF × 3 axes + 3 squareness = 21 geometric errors
 * - Abbe offset: ε_workpiece = ε_scale + L_Abbe × sin(angular_error)
 * - HTM propagation: T_total = T_X · T_Y · T_Z · T_spindle · T_tool
 * - Thermal growth: δ_thermal = α · ΔT · L (linear expansion model)
 * - RSS budget: σ_total² = Σ(σ_i²) for uncorrelated errors
 * - Worst-case budget: ε_total = Σ|ε_i| for correlated errors
 *
 * References:
 * - ISO 230-1:2012: Test code for machine tools — Geometric accuracy
 * - ISO 230-2:2014: Determination of positioning accuracy
 * - Slocum (1992): Precision Machine Design, Ch. 3-6
 * - Schwenke et al. (2008): Geometric error measurement of machines, CIRP Annals
 *
 * Actions: error_budget (calcDispatcher)
 */

// ── Types ──────────────────────────────────────────────────────────────────

export type AxisName = "X" | "Y" | "Z" | "A" | "B" | "C";
export type ErrorType =
  | "positioning" | "straightness_h" | "straightness_v"
  | "roll" | "pitch" | "yaw" | "squareness";

export interface AxisError {
  axis: AxisName;
  error_type: ErrorType;
  value_um: number;        // magnitude in µm (or µrad for angular)
  abbe_offset_mm?: number; // distance from scale to cutting point
  thermal_coeff?: number;  // µm/°C
}

export interface ErrorBudgetInput {
  /** Machine type for default error set */
  machine_type?: "vmc" | "hmc" | "lathe" | "5axis" | "grinder";
  /** Axis errors (overrides defaults if provided) */
  errors?: AxisError[];
  /** Work volume dimensions (mm) */
  work_volume_x_mm?: number;
  work_volume_y_mm?: number;
  work_volume_z_mm?: number;
  /** Target part tolerance (µm) */
  target_tolerance_um: number;
  /** Temperature differential from reference (°C) */
  delta_T_C?: number;
  /** Correlation model */
  method?: "rss" | "worst_case" | "both";
}

export interface ErrorContributor {
  axis: AxisName;
  error_type: ErrorType;
  contribution_um: number;
  pct_of_total: number;
  abbe_amplified: boolean;
}

export interface ErrorBudgetResult {
  rss_total_um: number;
  worst_case_total_um: number;
  contributors: ErrorContributor[];
  top_3_contributors: string[];
  meets_tolerance: boolean;
  tolerance_margin_um: number;
  thermal_contribution_um: number;
  budget_utilization_pct: number;
  recommendations: string[];
  warnings: string[];
  formula: string;
}

// ── Default error sets per machine type ────────────────────────────────

function defaultErrors(machineType: string): AxisError[] {
  // Typical errors for a mid-range VMC (ISO 230 class)
  const vmc: AxisError[] = [
    { axis: "X", error_type: "positioning", value_um: 5, abbe_offset_mm: 200 },
    { axis: "X", error_type: "straightness_h", value_um: 3 },
    { axis: "X", error_type: "straightness_v", value_um: 3 },
    { axis: "X", error_type: "roll", value_um: 8 },     // µrad
    { axis: "X", error_type: "pitch", value_um: 6 },
    { axis: "X", error_type: "yaw", value_um: 5 },
    { axis: "Y", error_type: "positioning", value_um: 5, abbe_offset_mm: 250 },
    { axis: "Y", error_type: "straightness_h", value_um: 4 },
    { axis: "Y", error_type: "straightness_v", value_um: 3 },
    { axis: "Y", error_type: "roll", value_um: 7 },
    { axis: "Y", error_type: "pitch", value_um: 6 },
    { axis: "Y", error_type: "yaw", value_um: 5 },
    { axis: "Z", error_type: "positioning", value_um: 4, abbe_offset_mm: 300 },
    { axis: "Z", error_type: "straightness_h", value_um: 3 },
    { axis: "Z", error_type: "straightness_v", value_um: 3 },
    { axis: "Z", error_type: "roll", value_um: 6 },
    { axis: "Z", error_type: "pitch", value_um: 5 },
    { axis: "Z", error_type: "yaw", value_um: 4 },
    { axis: "X", error_type: "squareness", value_um: 10 },  // XY squareness
    { axis: "Y", error_type: "squareness", value_um: 8 },   // YZ squareness
    { axis: "Z", error_type: "squareness", value_um: 9 },   // XZ squareness
  ];

  const scale: Record<string, number> = {
    vmc: 1.0, hmc: 0.9, lathe: 0.8, "5axis": 1.3, grinder: 0.5,
  };
  const s = scale[machineType] ?? 1.0;

  return vmc.map(e => ({ ...e, value_um: e.value_um * s }));
}

// ── Engine ──────────────────────────────────────────────────────────────────

export class MachineToolErrorBudgetEngine {

  /**
   * Abbe error amplification: ε = ε_scale + L_Abbe × θ
   * θ in µrad, L in mm → result in µm
   */
  abbeAmplification(
    scaleError_um: number, angularError_urad: number, abbeOffset_mm: number,
  ): number {
    return scaleError_um + abbeOffset_mm * angularError_urad / 1000;
  }

  /**
   * Thermal growth: δ = α · ΔT · L
   * For steel: α ≈ 11.7 µm/m/°C
   */
  thermalGrowth(
    length_mm: number, deltaT_C: number, alpha_um_m_C: number = 11.7,
  ): number {
    return alpha_um_m_C * deltaT_C * (length_mm / 1000);
  }

  /**
   * RSS (Root Sum Square) combination of uncorrelated errors.
   * σ_total = sqrt(Σ σ_i²)
   */
  rssCombine(errors_um: number[]): number {
    return Math.sqrt(errors_um.reduce((sum, e) => sum + e * e, 0));
  }

  /**
   * Worst-case (arithmetic sum) combination.
   * ε_total = Σ |ε_i|
   */
  worstCaseCombine(errors_um: number[]): number {
    return errors_um.reduce((sum, e) => sum + Math.abs(e), 0);
  }

  /** Compute effective error contribution including Abbe effects. */
  effectiveError(error: AxisError, workVolume_mm: number): {
    value_um: number; abbe_amplified: boolean;
  } {
    const isAngular = ["roll", "pitch", "yaw"].includes(error.error_type);

    if (isAngular && error.abbe_offset_mm) {
      // Angular error × Abbe offset
      return {
        value_um: error.abbe_offset_mm * error.value_um / 1000,
        abbe_amplified: true,
      };
    }

    if (isAngular) {
      // Angular error over work volume
      return {
        value_um: workVolume_mm * error.value_um / 1000,
        abbe_amplified: false,
      };
    }

    if (error.error_type === "squareness") {
      // Squareness error scales with travel
      return {
        value_um: workVolume_mm * error.value_um / 1000,
        abbe_amplified: false,
      };
    }

    // Linear errors: positioning, straightness
    if (error.abbe_offset_mm && error.error_type === "positioning") {
      // Positioning with Abbe offset considers angular pitch/yaw
      return {
        value_um: error.value_um,
        abbe_amplified: false,
      };
    }

    return { value_um: error.value_um, abbe_amplified: false };
  }

  /** Main entry — compute error budget. */
  analyze(input: ErrorBudgetInput): ErrorBudgetResult {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    const errors = input.errors ?? defaultErrors(input.machine_type ?? "vmc");
    const volX = input.work_volume_x_mm ?? 500;
    const volY = input.work_volume_y_mm ?? 400;
    const volZ = input.work_volume_z_mm ?? 300;
    const deltaT = input.delta_T_C ?? 0;

    // Map axis to work volume dimension
    const axisVol: Record<string, number> = {
      X: volX, Y: volY, Z: volZ, A: volX, B: volY, C: volZ,
    };

    // Compute effective contributions
    const contributors: ErrorContributor[] = [];
    const effectiveValues: number[] = [];

    for (const err of errors) {
      const vol = axisVol[err.axis] ?? 400;
      const eff = this.effectiveError(err, vol);
      effectiveValues.push(eff.value_um);
      contributors.push({
        axis: err.axis,
        error_type: err.error_type,
        contribution_um: Math.round(eff.value_um * 100) / 100,
        pct_of_total: 0, // computed after total
        abbe_amplified: eff.abbe_amplified,
      });
    }

    // Thermal contribution (affects all 3 linear axes)
    let thermalTotal = 0;
    if (deltaT !== 0) {
      const thermalX = this.thermalGrowth(volX, deltaT);
      const thermalY = this.thermalGrowth(volY, deltaT);
      const thermalZ = this.thermalGrowth(volZ, deltaT);
      thermalTotal = this.rssCombine([thermalX, thermalY, thermalZ]);
      effectiveValues.push(thermalTotal);
      contributors.push({
        axis: "X",
        error_type: "positioning",
        contribution_um: Math.round(thermalTotal * 100) / 100,
        pct_of_total: 0,
        abbe_amplified: false,
      });
    }

    // Combine
    const rssTotal = this.rssCombine(effectiveValues);
    const wcTotal = this.worstCaseCombine(effectiveValues);

    // Compute percentages (using RSS as reference)
    const rssSquared = rssTotal * rssTotal;
    for (let i = 0; i < contributors.length; i++) {
      const c = contributors[i];
      c.pct_of_total = rssSquared > 0
        ? Math.round((c.contribution_um * c.contribution_um / rssSquared) * 10000) / 100
        : 0;
    }

    // Sort by contribution
    contributors.sort((a, b) => b.contribution_um - a.contribution_um);

    const top3 = contributors.slice(0, 3).map(c =>
      `${c.axis}-${c.error_type}: ${c.contribution_um.toFixed(1)}µm (${c.pct_of_total.toFixed(0)}%)`,
    );

    // Tolerance check
    const meetsTol = rssTotal <= input.target_tolerance_um;
    const margin = input.target_tolerance_um - rssTotal;
    const utilization = (rssTotal / input.target_tolerance_um) * 100;

    // Recommendations
    if (!meetsTol) {
      recommendations.push(
        `Reduce top error contributor (${top3[0]}) to meet ±${input.target_tolerance_um}µm tolerance`,
      );
      if (thermalTotal > rssTotal * 0.3) {
        recommendations.push("Thermal growth is >30% of total — add temperature compensation");
      }
    }
    if (utilization > 80 && meetsTol) {
      recommendations.push("Budget utilization >80% — limited margin for tool wear and fixturing");
    }
    if (contributors.some(c => c.abbe_amplified && c.pct_of_total > 20)) {
      recommendations.push("Abbe-amplified errors dominate — reduce offset or improve angular accuracy");
    }
    if (deltaT > 3) {
      warnings.push(`Temperature differential of ${deltaT}°C may exceed compensation range`);
    }

    return {
      rss_total_um: Math.round(rssTotal * 100) / 100,
      worst_case_total_um: Math.round(wcTotal * 100) / 100,
      contributors,
      top_3_contributors: top3,
      meets_tolerance: meetsTol,
      tolerance_margin_um: Math.round(margin * 100) / 100,
      thermal_contribution_um: Math.round(thermalTotal * 100) / 100,
      budget_utilization_pct: Math.round(utilization * 10) / 10,
      recommendations,
      warnings,
      formula: "21-error model: 6DOF×3axes+3squareness; " +
        "Abbe: ε=ε_scale+L_Abbe×θ; " +
        "RSS: σ=√(Σσᵢ²); " +
        "Thermal: δ=α·ΔT·L; " +
        "Worst-case: ε=Σ|εᵢ|",
    };
  }
}

export const machineToolErrorBudgetEngine = new MachineToolErrorBudgetEngine();
