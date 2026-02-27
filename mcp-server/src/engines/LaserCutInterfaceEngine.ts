/**
 * LaserCutInterfaceEngine — L2-P4-MS1 PASS2 Specialty
 *
 * Calculates laser cutting parameters for CO2 and fiber lasers.
 * Models: kerf width, heat-affected zone, pierce time, gas pressure,
 * and cutting speed for various materials and thicknesses.
 *
 * Supports: mild steel, stainless, aluminum, copper, brass, titanium
 * with assist gases N2, O2, air, and argon.
 *
 * Actions: laser_cut_calc, laser_cut_kerf, laser_cut_recommend
 */

// ============================================================================
// TYPES
// ============================================================================

export type LaserType = "CO2" | "fiber";
export type AssistGas = "O2" | "N2" | "air" | "argon";

export interface LaserCutInput {
  laser_type: LaserType;
  power_W: number;
  material: string;
  thickness_mm: number;
  assist_gas: AssistGas;
  gas_pressure_bar: number;
  focus_position_mm: number;           // relative to surface (negative = below)
  nozzle_diameter_mm: number;
  beam_quality_mm_mrad?: number;       // BPP (beam parameter product)
}

export interface LaserCutResult {
  max_cutting_speed_mm_per_min: number;
  recommended_speed_mm_per_min: number;
  kerf_width_mm: number;
  heat_affected_zone_mm: number;
  pierce_time_sec: number;
  surface_roughness_Ra_um: number;
  edge_quality: "excellent" | "good" | "fair" | "poor";
  dross_risk: "none" | "low" | "moderate" | "high";
  cost_per_meter: number;              // relative cost units
  recommendations: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Material absorptivity (fraction of laser energy absorbed)
const ABSORPTIVITY: Record<string, Record<LaserType, number>> = {
  mild_steel: { CO2: 0.45, fiber: 0.55 },
  stainless: { CO2: 0.40, fiber: 0.50 },
  aluminum: { CO2: 0.08, fiber: 0.35 },
  copper: { CO2: 0.02, fiber: 0.25 },
  brass: { CO2: 0.05, fiber: 0.30 },
  titanium: { CO2: 0.35, fiber: 0.48 },
};

// Material thermal properties for speed calculation
const MATERIAL_CUT_FACTOR: Record<string, number> = {
  mild_steel: 1.0, stainless: 0.75, aluminum: 0.6,
  copper: 0.3, brass: 0.45, titanium: 0.65,
};

// O2 assist gas exothermic boost (oxidation adds energy)
const O2_BOOST: Record<string, number> = {
  mild_steel: 1.8,  // O2 cutting of steel is 1.8x faster
  stainless: 1.0,   // no boost (oxidation unwanted)
  aluminum: 1.0,
  copper: 1.0,
  brass: 1.0,
  titanium: 1.0,    // dangerous with O2
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class LaserCutInterfaceEngine {
  calculate(input: LaserCutInput): LaserCutResult {
    const matKey = this._materialKey(input.material);
    const absorb = ABSORPTIVITY[matKey]?.[input.laser_type] || 0.4;
    const cutFactor = MATERIAL_CUT_FACTOR[matKey] || 0.8;

    // Effective power (absorbed)
    let effectivePower = input.power_W * absorb;

    // O2 boost for reactive cutting
    if (input.assist_gas === "O2") {
      effectivePower *= O2_BOOST[matKey] || 1.0;
    }

    // Maximum cutting speed (empirical model)
    // v ∝ P / (t * ρ * cp * ΔT)  → simplified: v = K * P / t^1.5
    const K = 0.08 * cutFactor;
    const maxSpeed = K * effectivePower / Math.pow(input.thickness_mm, 1.5);

    // Recommended speed (80% of max for quality)
    const recSpeed = maxSpeed * 0.8;

    // Kerf width: approximately nozzle_dia * 0.1 + beam_dia + thickness_effect
    const beamDia = input.beam_quality_mm_mrad
      ? input.beam_quality_mm_mrad * 0.01
      : input.laser_type === "fiber" ? 0.05 : 0.15;
    const kerf = beamDia + input.thickness_mm * 0.01 + input.nozzle_diameter_mm * 0.03;

    // HAZ: increases with thickness and power, decreases with speed
    const haz = 0.05 + input.thickness_mm * 0.02 + input.power_W / 50000;

    // Pierce time: proportional to thickness squared
    const pierceTime = 0.1 + input.thickness_mm * input.thickness_mm * 0.01;

    // Surface roughness estimate
    const baseRa = input.laser_type === "fiber" ? 3.0 : 4.0;
    const Ra = baseRa + input.thickness_mm * 0.3;

    // Edge quality assessment
    const speedRatio = recSpeed > 0 ? recSpeed / maxSpeed : 0;
    const edgeQuality: LaserCutResult["edge_quality"] =
      Ra < 5 && input.assist_gas === "N2" ? "excellent"
      : Ra < 8 ? "good"
      : Ra < 15 ? "fair"
      : "poor";

    // Dross risk
    const drossRisk: LaserCutResult["dross_risk"] =
      matKey === "aluminum" && input.assist_gas !== "N2" ? "high"
      : input.thickness_mm > 15 && input.assist_gas === "O2" ? "moderate"
      : input.thickness_mm > 20 ? "moderate"
      : "low";

    // Cost per meter (relative: gas consumption + electricity + time)
    const gasFlowRate = input.gas_pressure_bar * input.nozzle_diameter_mm * 5; // L/min approx
    const timePerMeter = recSpeed > 0 ? 1000 / recSpeed : 999; // min/m
    const costPerMeter = timePerMeter * (input.power_W / 1000 * 0.15 + gasFlowRate * 0.01);

    // Recommendations
    const recs: string[] = [];
    if (matKey === "aluminum" && input.laser_type === "CO2") {
      recs.push("Fiber laser strongly preferred for aluminum — CO2 absorptivity only 8%");
    }
    if (matKey === "titanium" && input.assist_gas === "O2") {
      recs.push("CAUTION: O2 assist gas with titanium causes fire risk — use argon or N2");
    }
    if (matKey === "stainless" && input.assist_gas === "O2") {
      recs.push("O2 assist causes oxidized edge on stainless — use N2 for clean cut");
    }
    if (input.thickness_mm > 25 && input.laser_type === "fiber") {
      recs.push("Thick plate (>25mm) — verify power is sufficient; may need multi-pass or slower speed");
    }
    if (drossRisk === "high") {
      recs.push("High dross risk — optimize gas pressure and consider deburring post-process");
    }
    if (recs.length === 0) {
      recs.push("Laser cutting parameters within normal range — proceed");
    }

    return {
      max_cutting_speed_mm_per_min: Math.round(maxSpeed * 10) / 10,
      recommended_speed_mm_per_min: Math.round(recSpeed * 10) / 10,
      kerf_width_mm: Math.round(kerf * 1000) / 1000,
      heat_affected_zone_mm: Math.round(haz * 100) / 100,
      pierce_time_sec: Math.round(pierceTime * 100) / 100,
      surface_roughness_Ra_um: Math.round(Ra * 10) / 10,
      edge_quality: edgeQuality,
      dross_risk: drossRisk,
      cost_per_meter: Math.round(costPerMeter * 100) / 100,
      recommendations: recs,
    };
  }

  private _materialKey(material: string): string {
    const m = material.toLowerCase();
    if (m.includes("stainless") || m.includes("304") || m.includes("316")) return "stainless";
    if (m.includes("aluminum") || m.includes("6061") || m.includes("5052")) return "aluminum";
    if (m.includes("copper")) return "copper";
    if (m.includes("brass")) return "brass";
    if (m.includes("titanium") || m.includes("ti-")) return "titanium";
    return "mild_steel";
  }
}

export const laserCutInterfaceEngine = new LaserCutInterfaceEngine();
