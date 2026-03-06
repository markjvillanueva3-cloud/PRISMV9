/**
 * ThermalGrowthCompensationEngine — Spindle/tool/workpiece thermal expansion prediction
 *
 * Models: Linear thermal expansion (ΔL = α×L×ΔT), bearing heat generation,
 *         exponential thermal stabilization (1 - e^(-t/τ))
 * References: Bryan (1990) thermal error principles, ISO 230-3 thermal testing
 * Safety: Critical for precision machining — dimensional errors from thermal growth
 */

// ─── Types ─────────────────────────────────────────────────────────

export type SpindleBearingType = "angular_contact" | "roller" | "hydrostatic";
/** Tool Material Thermal type definition.
 */
export type ToolMaterialThermal = "carbide" | "hss" | "ceramic" | "cbn" | "pcd";
/** Workpiece Material Thermal type definition.
 */
export type WorkpieceMaterialThermal = "steel" | "aluminum" | "cast_iron" | "titanium" | "stainless" | "inconel";

/** Thermal Growth Input configuration/data structure.
 */
export interface ThermalGrowthInput {
  spindle_speed_rpm: number;
  cutting_time_min: number;
  ambient_temp_C?: number;                    // default 20°C
  spindle_bearing_type?: SpindleBearingType;  // default angular_contact
  tool_material?: ToolMaterialThermal;        // default carbide
  tool_overhang_mm: number;
  tool_holder_length_mm?: number;             // default 80mm
  workpiece_material?: WorkpieceMaterialThermal; // default steel
  workpiece_length_mm?: number;               // default 100mm
  cutting_power_kW?: number;                  // for heat input estimation
  coolant_active?: boolean;                   // default true
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

/** Thermal Growth Result configuration/data structure.
 */
export interface ThermalGrowthResult {
  spindle_growth_um: AtomicValue;
  tool_holder_growth_um: AtomicValue;
  tool_growth_um: AtomicValue;
  workpiece_growth_um: AtomicValue;
  total_z_error_um: AtomicValue;
  compensation_needed_mm: AtomicValue;
  time_to_stability_min: AtomicValue;
  spindle_temp_rise_C: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// ─── Constants ─────────────────────────────────────────────────────

/** Coefficient of thermal expansion (CTE) in 1/°C */
const CTE: Record<string, number> = {
  // Tool materials (×10⁻⁶)
  carbide: 5.5e-6,
  hss: 11.0e-6,
  ceramic: 7.5e-6,
  cbn: 4.8e-6,
  pcd: 3.5e-6,
  // Workpiece materials
  steel: 11.7e-6,
  aluminum: 23.1e-6,
  cast_iron: 10.8e-6,
  titanium: 8.6e-6,
  stainless: 16.0e-6,
  inconel: 12.8e-6,
  // Structural
  tool_holder: 11.5e-6,
  spindle: 11.7e-6,
};

/** Bearing friction factor — determines heat generation */
const BEARING_FRICTION: Record<SpindleBearingType, number> = {
  angular_contact: 0.0015,
  roller: 0.0025,
  hydrostatic: 0.0005,
};

/** Time constant for thermal stabilization (minutes) */
const THERMAL_TAU: Record<SpindleBearingType, number> = {
  angular_contact: 45,
  roller: 60,
  hydrostatic: 30,
};

// ─── Engine ────────────────────────────────────────────────────────

/** Thermal Growth Compensation Engine engine/manager.
 */
export class ThermalGrowthCompensationEngine {
  calculate(input: ThermalGrowthInput): ThermalGrowthResult {
    const {
      spindle_speed_rpm: rpm,
      cutting_time_min: t,
      spindle_bearing_type: bearingType = "angular_contact",
      tool_material: toolMat = "carbide",
      tool_overhang_mm: toolOH,
      tool_holder_length_mm: holderLen = 80,
      workpiece_material: wpMat = "steel",
      workpiece_length_mm: wpLen = 100,
      cutting_power_kW: power = 3,
      coolant_active: coolant = true,
    } = input;

    const recs: string[] = [];

    // ── 1. Spindle temperature rise model ──
    // Empirical: ΔT_max ≈ friction × (rpm/1000)^1.5 × 8 (°C)
    const friction = BEARING_FRICTION[bearingType];
    const dT_max_spindle = friction * Math.pow(rpm / 1000, 1.5) * 8.0;

    // Exponential approach to steady state: ΔT(t) = ΔT_max × (1 - e^(-t/τ))
    const tau = THERMAL_TAU[bearingType];
    const dT_spindle = dT_max_spindle * (1 - Math.exp(-t / tau));

    // ── 2. Heat contribution to tool/workpiece from cutting ──
    const toolHeatFraction = coolant ? 0.05 : 0.15;
    const wpHeatFraction = coolant ? 0.03 : 0.10;
    const dT_tool = power * toolHeatFraction * 50;     // °C
    const dT_holder = dT_spindle * 0.7;                // holder tracks spindle
    const dT_workpiece = power * wpHeatFraction * 30;

    // ── 3. Thermal expansion: ΔL = α × L × ΔT (result in µm) ──
    const spindleLen = 200; // mm (nose to bearing, typical)
    const spindleGrowth = CTE.spindle * spindleLen * dT_spindle * 1000;
    const holderGrowth = CTE.tool_holder * holderLen * dT_holder * 1000;
    const toolGrowth = CTE[toolMat] * toolOH * dT_tool * 1000;
    const wpGrowth = CTE[wpMat] * wpLen * dT_workpiece * 1000;

    // ── 4. Total Z-axis error ──
    // Tool grows away from work (+), work grows toward tool (-)
    const totalError = spindleGrowth + holderGrowth + toolGrowth - wpGrowth;

    // ── 5. Time to 95% thermal stability = 3τ ──
    const timeToStability = tau * 3;

    // ── 6. Safety assessment ──
    const isSafe = Math.abs(totalError) < 50;

    // ── 7. Recommendations ──
    if (Math.abs(totalError) > 30) {
      recs.push(
        `SAFETY: Total thermal Z-error ~${Math.abs(totalError).toFixed(1)}µm — `
        + `exceeds precision threshold. Apply thermal compensation or warm up for `
        + `${Math.round(timeToStability)} min before critical cuts`
      );
    }

    /** If.
     * @param rpm - rpm
     * @returns void
     */
    if (rpm > 15000 && bearingType !== "hydrostatic") {
      recs.push(
        `High-speed spindle at ${rpm} RPM with ${bearingType} bearings — `
        + `consider hydrostatic bearings for reduced thermal growth`
      );
    }

    /** If.
     * @param !coolant - !coolant
     * @returns void
     */
    if (!coolant && power > 2) {
      recs.push(
        `Dry cutting at ${power.toFixed(1)}kW — tool/workpiece thermal growth `
        + `significantly increased. Enable coolant or reduce cutting parameters`
      );
    }

    if (wpMat === "aluminum" && Math.abs(wpGrowth) > 10) {
      recs.push(
        `Aluminum workpiece growth ${wpGrowth.toFixed(1)}µm — high CTE material. `
        + `Consider inter-operation cooling or thermal compensation`
      );
    }

    /** If.
     * @param t - t
     * @returns void
     */
    if (t < timeToStability * 0.5) {
      recs.push(
        `Spindle NOT thermally stable (${t.toFixed(0)} of ${Math.round(timeToStability)} min). `
        + `Dimensional drift will occur during cutting`
      );
    }

    /** If.
     * @param recs.length - recs.length
     * @returns void
     */
    if (recs.length === 0) {
      recs.push(
        `Thermal growth nominal — total Z-error ${totalError.toFixed(1)}µm, `
        + `spindle ${dT_spindle > dT_max_spindle * 0.9 ? "thermally stable" : "still warming up"}`
      );
    }

    return {
      spindle_growth_um: {
        value: Math.round(spindleGrowth * 10) / 10,
        unit: "µm",
        uncertainty: Math.round(spindleGrowth * 0.20 * 10) / 10,
        source: "linear_thermal_expansion",
      },
      tool_holder_growth_um: {
        value: Math.round(holderGrowth * 10) / 10,
        unit: "µm",
        uncertainty: Math.round(holderGrowth * 0.15 * 10) / 10,
        source: "linear_thermal_expansion",
      },
      tool_growth_um: {
        value: Math.round(toolGrowth * 10) / 10,
        unit: "µm",
        uncertainty: Math.round(toolGrowth * 0.25 * 10) / 10,
        source: "linear_thermal_expansion",
        warning: toolGrowth > 15 ? "Significant tool thermal growth" : undefined,
      },
      workpiece_growth_um: {
        value: Math.round(wpGrowth * 10) / 10,
        unit: "µm",
        uncertainty: Math.round(wpGrowth * 0.20 * 10) / 10,
        source: "linear_thermal_expansion",
      },
      total_z_error_um: {
        value: Math.round(totalError * 10) / 10,
        unit: "µm",
        uncertainty: Math.round(Math.abs(totalError) * 0.30 * 10) / 10,
        source: "combined_thermal_model",
        warning: Math.abs(totalError) > 30 ? "Exceeds precision threshold" : undefined,
      },
      compensation_needed_mm: {
        value: Math.round(totalError / 1000 * 10000) / 10000,
        unit: "mm",
        uncertainty: Math.round(Math.abs(totalError) * 0.30 / 1000 * 10000) / 10000,
        source: "combined_thermal_model",
      },
      time_to_stability_min: {
        value: Math.round(timeToStability),
        unit: "min",
        uncertainty: Math.round(timeToStability * 0.15),
        source: "exponential_thermal_model",
      },
      spindle_temp_rise_C: {
        value: Math.round(dT_spindle * 10) / 10,
        unit: "°C",
        uncertainty: Math.round(dT_spindle * 0.20 * 10) / 10,
        source: "bearing_heat_model",
      },
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

/** Thermal Growth Compensation Engine constant.
 */
export const thermalGrowthCompensationEngine = new ThermalGrowthCompensationEngine();
