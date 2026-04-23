/**
 * WEDMThermalReleaseGateEngine — Thermal Budget & Recast Safety Gate
 *
 * Validates that thermal load during WEDM cutting stays within the dielectric
 * cooling capacity and predicts recast depth to ensure finish requirements.
 *
 * Physics model:
 *   1. Thermal conductivity k(T): ASM Handbook Vol. 16 piecewise-linear interpolation
 *   2. Recast depth: d_recast ≈ C_recast · √(α · t_on) · η_coupling
 *      where α = k(T) / (ρ · cp)
 *   3. Thermal budget: P_mean ≤ Q_cool
 *      P_mean = V · I · duty
 *      Q_cool = ṁ · cp · ΔT_allow · coupling
 *
 * The gate HARD-BLOCKS when:
 *   - Predicted recast exceeds finish-class threshold (fail_recast_excessive)
 *   - Thermal load exceeds cooling capacity (fail_heat_overload)
 *   - Both conditions fail (fail_both)
 *   - Unknown material (fail_unknown_material) — no silent fallback
 *
 * Output plugs into WEDMProgramSafetyGateEngine's `thermal` input and
 * contributes 0.15 to the composite S(x).
 *
 * MS-P2.5-SAFETY/U-P2.5-SAFE-05
 *
 * @see WEDMProgramSafetyGateEngine — composite S(x) gate consumer
 * @see WEDM_RECAST_MODEL — recast depth model constants
 * @see WEDM_ASM_KT_TABLE — temperature-dependent thermal conductivity
 */

import {
  WEDM_RECAST_MODEL,
  WEDM_DIELECTRIC_COOLING,
  WEDM_ASM_KT_TABLE,
  type ASMThermalMaterial,
} from "../physics/wedm-constants.js";

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type FinishClass = "rough" | "medium" | "finish" | "precision";
export type FlushMode = "submerged" | "side_flush";

export type ThermalVerdict =
  | "pass"
  | "fail_heat_overload"
  | "fail_recast_excessive"
  | "fail_both"
  | "fail_unknown_material";

export interface ThermalReleaseInput {
  /** Material type for thermal property lookup. REQUIRED. */
  material: ASMThermalMaterial | string;
  /** Finish class for recast threshold. Default "medium". */
  finish_class?: FinishClass;
  /** Gap voltage [V]. Default 80V. */
  voltage_V?: number;
  /** Peak discharge current [A]. Default 6A. */
  peak_current_A?: number;
  /** Pulse-on time [µs]. REQUIRED. */
  pulse_on_us: number;
  /** Pulse-off time [µs]. Default 25. */
  pulse_off_us?: number;
  /** Dielectric flow through kerf [mm³/s]. Default 80000. */
  flow_mm3_s?: number;
  /** Flushing mode affects cooling. Default "submerged". */
  mode?: FlushMode;
  /** Number of skim passes planned (reduces recast). Default 0. */
  skim_passes?: number;
  /** Fraction of spark energy absorbed by workpiece. Default 0.12. */
  absorption_fraction?: number;
  /** Peak surface temperature estimate [K]. Default 1200. */
  peak_temp_K?: number;
}

export interface ThermalMetrics {
  /** Mean power dissipation [W] */
  mean_power_W: number;
  /** Cooling capacity [W] */
  cooling_capacity_W: number;
  /** Predicted recast depth after skim passes [µm] */
  recast_depth_um: number;
  /** Max recast for finish class [µm] */
  recast_limit_um: number;
  /** Thermal conductivity at peak_temp_K [W/(m·K)] */
  k_T_W_per_mK: number;
  /** Peak surface temperature [°C] */
  peak_temp_C: number;
  /** Dielectric limit temperature [°C] */
  limit_temp_C: number;
}

export interface ThermalReleaseResult {
  success: boolean;
  pass: boolean;
  verdict: ThermalVerdict;
  hard_block: boolean;
  /** Resolved material key */
  material: ASMThermalMaterial | null;
  metrics: ThermalMetrics;
  /** Input shape for WEDMProgramSafetyGateEngine.thermal */
  safety_gate_input: {
    pass: boolean;
    max_temp_C: number;
    limit_temp_C: number;
    recast_depth_um: number;
  };
  /** S(x) contribution (0.15 when passing, 0 otherwise) */
  safety_score_contribution: number;
  summary: string;
  warnings: string[];
  recommendations: string[];
}

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

const SAFETY_SCORE_PASS = 0.15;
const SAFETY_SCORE_FAIL = 0.0;

const DIELECTRIC_BOILING_C = 100;

const DEFAULT_DENSITY_KG_M3: Record<ASMThermalMaterial, number> = {
  steel_carbon: 7850,
  steel_tool: 7800,
  stainless_steel: 8000,
  titanium: 4430,
  inconel: 8190,
  tungsten_carbide: 15000,
  pcd: 3510,
  aluminum: 2700,
  copper: 8940,
};

const DEFAULT_CP_J_KGK: Record<ASMThermalMaterial, number> = {
  steel_carbon: 486,
  steel_tool: 460,
  stainless_steel: 500,
  titanium: 526,
  inconel: 435,
  tungsten_carbide: 290,
  pcd: 509,
  aluminum: 900,
  copper: 385,
};

// ══════════════════════════════════════════════════════════════════════════════
// ENGINE
// ══════════════════════════════════════════════════════════════════════════════

export class WEDMThermalReleaseGateEngine {
  readonly name = "WEDMThermalReleaseGateEngine";
  readonly version = "1.0.0";

  /**
   * Evaluate thermal safety for given WEDM parameters.
   *
   * @param input pulse parameters, material, and cooling conditions
   * @returns full result with verdict and safety_gate_input
   */
  evaluate(input: ThermalReleaseInput): ThermalReleaseResult {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    const matKey = this.resolveMaterial(input.material);
    if (matKey === null) {
      return this.buildUnknownMaterialResult(input.material, warnings);
    }

    const {
      finish_class = "medium",
      voltage_V = 80,
      peak_current_A = 6,
      pulse_on_us,
      pulse_off_us = 25,
      flow_mm3_s = 80_000,
      mode = "submerged",
      skim_passes = 0,
      absorption_fraction = 0.12,
      peak_temp_K = 1200,
    } = input;

    const k = this.interpolateKT(matKey, peak_temp_K);
    const rho = DEFAULT_DENSITY_KG_M3[matKey];
    const cp = DEFAULT_CP_J_KGK[matKey];

    const alpha_m2_s = k / (rho * cp);
    const alpha_mm2_s = alpha_m2_s * 1e6;

    const t_on_s = pulse_on_us * 1e-6;
    const eta = WEDM_RECAST_MODEL.eta_coupling[matKey] ?? 0.22;

    let recast_um = WEDM_RECAST_MODEL.C_recast * Math.sqrt(alpha_mm2_s * t_on_s) * eta * 1000;
    for (let i = 0; i < skim_passes; i++) {
      recast_um *= (1 - WEDM_RECAST_MODEL.skim_reduction_per_pass);
    }
    recast_um = Math.max(recast_um, WEDM_RECAST_MODEL.min_residual_um);

    const recast_limit_um = WEDM_RECAST_MODEL.max_recast_um[finish_class];

    const duty = pulse_on_us / (pulse_on_us + pulse_off_us);
    const mean_power_W = voltage_V * peak_current_A * duty * absorption_fraction;

    const { cp_water_J_kgK, rho_water_kg_m3, allowable_delta_T_K } = WEDM_DIELECTRIC_COOLING;
    const couplingFactor = mode === "submerged"
      ? WEDM_DIELECTRIC_COOLING.submerged_coupling_factor
      : WEDM_DIELECTRIC_COOLING.side_flush_coupling_factor;

    const flow_m3_s = flow_mm3_s * 1e-9;
    const mass_flow_kg_s = flow_m3_s * rho_water_kg_m3;
    const cooling_capacity_W = mass_flow_kg_s * cp_water_J_kgK * allowable_delta_T_K * couplingFactor;

    const peak_temp_C = peak_temp_K - 273.15;

    const metrics: ThermalMetrics = {
      mean_power_W: Math.round(mean_power_W * 100) / 100,
      cooling_capacity_W: Math.round(cooling_capacity_W * 100) / 100,
      recast_depth_um: Math.round(recast_um * 100) / 100,
      recast_limit_um,
      k_T_W_per_mK: Math.round(k * 1000) / 1000,
      peak_temp_C: Math.round(peak_temp_C * 10) / 10,
      limit_temp_C: DIELECTRIC_BOILING_C,
    };

    const heatOverload = mean_power_W > cooling_capacity_W;
    const recastExcessive = recast_um > recast_limit_um;

    let verdict: ThermalVerdict;
    let pass: boolean;

    if (heatOverload && recastExcessive) {
      verdict = "fail_both";
      pass = false;
      warnings.push(
        `Heat overload: ${mean_power_W.toFixed(1)}W > ${cooling_capacity_W.toFixed(1)}W cooling`
      );
      warnings.push(
        `Recast excessive: ${recast_um.toFixed(2)}µm > ${recast_limit_um}µm limit`
      );
      recommendations.push("Reduce current/duty and add skim passes");
    } else if (heatOverload) {
      verdict = "fail_heat_overload";
      pass = false;
      warnings.push(
        `Heat overload: ${mean_power_W.toFixed(1)}W > ${cooling_capacity_W.toFixed(1)}W cooling`
      );
      recommendations.push(
        `Increase flow to ${Math.ceil(flow_mm3_s * mean_power_W / cooling_capacity_W)} mm³/s OR reduce duty`
      );
    } else if (recastExcessive) {
      verdict = "fail_recast_excessive";
      pass = false;
      warnings.push(
        `Recast excessive: ${recast_um.toFixed(2)}µm > ${recast_limit_um}µm for ${finish_class}`
      );
      const neededSkims = this.estimateSkimsNeeded(recast_um, recast_limit_um);
      recommendations.push(
        `Add ${neededSkims} skim passes OR reduce pulse_on_us to ~${Math.round(pulse_on_us * (recast_limit_um / recast_um) ** 2)}µs`
      );
    } else {
      verdict = "pass";
      pass = true;
    }

    return {
      success: true,
      pass,
      verdict,
      hard_block: !pass,
      material: matKey,
      metrics,
      safety_gate_input: {
        pass,
        max_temp_C: metrics.peak_temp_C,
        limit_temp_C: metrics.limit_temp_C,
        recast_depth_um: metrics.recast_depth_um,
      },
      safety_score_contribution: pass ? SAFETY_SCORE_PASS : SAFETY_SCORE_FAIL,
      summary: pass
        ? `THERMAL OK: P̄=${mean_power_W.toFixed(0)}W < ${cooling_capacity_W.toFixed(0)}W, d=${recast_um.toFixed(1)}µm ≤ ${recast_limit_um}µm`
        : `THERMAL BLOCK: ${verdict}`,
      warnings,
      recommendations,
    };
  }

  /**
   * Convenience gate wrapper.
   */
  gate(input: ThermalReleaseInput): {
    allow: boolean;
    reason: string;
    result: ThermalReleaseResult;
  } {
    const result = this.evaluate(input);
    return { allow: result.pass, reason: result.summary, result };
  }

  /**
   * Interpolate thermal conductivity k(T) from ASM table.
   * Piecewise-linear between knots; clamps at endpoints.
   */
  interpolateKT(material: ASMThermalMaterial, temp_K: number): number {
    const table = WEDM_ASM_KT_TABLE[material];
    if (!table || table.length === 0) {
      return 30;
    }

    if (temp_K <= table[0][0]) return table[0][1];
    if (temp_K >= table[table.length - 1][0]) return table[table.length - 1][1];

    for (let i = 0; i < table.length - 1; i++) {
      const [T1, k1] = table[i];
      const [T2, k2] = table[i + 1];
      if (temp_K >= T1 && temp_K <= T2) {
        const f = (temp_K - T1) / (T2 - T1);
        return k1 + f * (k2 - k1);
      }
    }

    return table[0][1];
  }

  /**
   * Resolve material string to ASMThermalMaterial key.
   * Returns null for unknown materials (fail closed, no silent fallback).
   */
  resolveMaterial(material: string): ASMThermalMaterial | null {
    if (!material || typeof material !== "string") return null;

    const m = material.toLowerCase().trim();
    if (!m) return null;

    if (m === "pcd" || m.includes("polycrystalline diamond") || m.includes("diamond")) return "pcd";
    if (m === "tungsten_carbide" || m === "wc" || m.includes("carbide")) return "tungsten_carbide";
    if (m === "steel_tool" || m === "d2" || m === "h13" || m.includes("tool steel")) return "steel_tool";
    if (m.includes("inconel") || m.includes("in718") || m === "718") return "inconel";
    if (m.includes("ti-6al-4v") || m.includes("titanium") || m.includes("ti6al4v")) return "titanium";
    if (m.includes("304") || m.includes("316") || m.includes("17-4") || m.includes("stainless")) return "stainless_steel";
    if (m === "6061" || m === "7075" || m.includes("alum")) return "aluminum";
    if (m === "c110" || m.includes("copper")) return "copper";
    if (m === "steel_carbon" || m.includes("1045") || m.includes("carbon steel")) return "steel_carbon";
    if (m === "stainless_steel") return "stainless_steel";

    const validKeys: ASMThermalMaterial[] = [
      "steel_carbon", "steel_tool", "stainless_steel", "titanium",
      "inconel", "tungsten_carbide", "pcd", "aluminum", "copper"
    ];
    if (validKeys.includes(m as ASMThermalMaterial)) {
      return m as ASMThermalMaterial;
    }

    return null;
  }

  /**
   * Estimate how many skim passes needed to reach target recast.
   */
  estimateSkimsNeeded(current_um: number, target_um: number): number {
    if (current_um <= target_um) return 0;
    const reduction = WEDM_RECAST_MODEL.skim_reduction_per_pass;
    let val = current_um;
    let passes = 0;
    while (val > target_um && passes < 20) {
      val *= (1 - reduction);
      passes++;
    }
    return passes;
  }

  private buildUnknownMaterialResult(material: string, warnings: string[]): ThermalReleaseResult {
    warnings.push(`Unknown material "${material}" — cannot look up thermal properties`);
    return {
      success: true,
      pass: false,
      verdict: "fail_unknown_material",
      hard_block: true,
      material: null,
      metrics: {
        mean_power_W: 0,
        cooling_capacity_W: 0,
        recast_depth_um: 0,
        recast_limit_um: 0,
        k_T_W_per_mK: 0,
        peak_temp_C: 0,
        limit_temp_C: DIELECTRIC_BOILING_C,
      },
      safety_gate_input: {
        pass: false,
        max_temp_C: 0,
        limit_temp_C: DIELECTRIC_BOILING_C,
        recast_depth_um: 0,
      },
      safety_score_contribution: SAFETY_SCORE_FAIL,
      summary: `THERMAL BLOCK: fail_unknown_material — "${material}"`,
      warnings,
      recommendations: ["Provide a known material: steel_tool, steel_carbon, pcd, titanium, etc."],
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ══════════════════════════════════════════════════════════════════════════════

export const wedmThermalReleaseGateEngine = new WEDMThermalReleaseGateEngine();
export default wedmThermalReleaseGateEngine;
