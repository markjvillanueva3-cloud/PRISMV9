/**
 * FluidizedBedEngine — Fluidized bed reactor/dryer sizing
 *
 * Models: Minimum fluidization velocity (Ergun), bed expansion,
 *         pressure drop, heat/mass transfer, distributor design
 * References: Kunii & Levenspiel, Perry's Ch.17
 * Safety: Elutriation, slugging, distributor pressure drop ratio
 */

export interface FluidizedBedInput {
  gas_flow_m3_h: number;
  bed_diameter_mm?: number;             // auto-sized
  particle_diameter_um?: number;        // default 200
  particle_density_kg_m3?: number;      // default 2500
  gas_density_kg_m3?: number;           // default 1.2
  gas_viscosity_Pa_s?: number;          // default 1.8e-5
  static_bed_height_mm?: number;        // default 500
  bed_voidage?: number;                 // default 0.45
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface FluidizedBedResult {
  min_fluidization_velocity_m_s: AtomicValue;
  operating_velocity_m_s: AtomicValue;
  bed_diameter_mm: AtomicValue;
  expanded_bed_height_mm: AtomicValue;
  pressure_drop_Pa: AtomicValue;
  terminal_velocity_m_s: AtomicValue;
  distributor_dp_Pa: AtomicValue;
  velocity_ratio: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class FluidizedBedEngine {
  calculate(input: FluidizedBedInput): FluidizedBedResult {
    const {
      gas_flow_m3_h: Qh,
      particle_diameter_um: dp_um = 200,
      particle_density_kg_m3: rhoP = 2500,
      gas_density_kg_m3: rhoG = 1.2,
      gas_viscosity_Pa_s: mu = 1.8e-5,
      static_bed_height_mm: Hbed = 500,
      bed_voidage: emf = 0.45,
    } = input;

    const recs: string[] = [];
    const Q = Qh / 3600;
    const dp = dp_um * 1e-6;

    // Minimum fluidization velocity (Ergun simplified)
    // Re_mf from Wen & Yu: Re_mf = √(33.7² + 0.0408×Ar) - 33.7
    const Ar = rhoG * (rhoP - rhoG) * 9.81 * Math.pow(dp, 3) / (mu * mu);
    const Re_mf = Math.sqrt(33.7 * 33.7 + 0.0408 * Ar) - 33.7;
    const Umf = Re_mf * mu / (rhoG * dp);

    // Terminal velocity (Stokes/Newton)
    const Ut = Math.sqrt(4 * dp * (rhoP - rhoG) * 9.81 / (3 * 0.44 * rhoG));

    // Auto-size bed diameter
    let D = input.bed_diameter_mm;
    const Uop = Umf * 3; // operate at 3× Umf
    if (!D) {
      const Abed = Q / Uop;
      D = Math.round(Math.sqrt(4 * Abed / Math.PI) * 1000);
    }
    const Abed = Math.PI / 4 * Math.pow(D / 1000, 2);
    const actualU = Q / Abed;

    // Bed expansion
    const n = 4.7; // Richardson-Zaki exponent (approximate)
    const ef = Math.pow(actualU / Ut, 1 / n);
    const expandedH = Hbed * (1 - emf) / (1 - Math.min(ef, 0.95));

    // Pressure drop = weight of bed per unit area
    const dP_bed = (1 - emf) * (rhoP - rhoG) * 9.81 * (Hbed / 1000);

    // Distributor pressure drop (30% of bed)
    const dP_dist = dP_bed * 0.30;

    const velRatio = actualU / Umf;
    const isSafe = actualU < Ut && velRatio >= 2 && velRatio <= 10;

    if (actualU > Ut * 0.5) recs.push(`Velocity near terminal ${Ut.toFixed(2)}m/s — significant elutriation`);
    if (velRatio < 2) recs.push(`Low velocity ratio ${velRatio.toFixed(1)} — poor fluidization quality`);
    if (velRatio > 8) recs.push(`High velocity ratio ${velRatio.toFixed(1)} — turbulent/fast regime`);
    if (dp_um < 50) recs.push(`Fine particles ${dp_um}μm — Geldart C, cohesive, poor fluidization`);
    if (recs.length === 0) recs.push(`Fluidized bed nominal — D=${D}mm, U/Umf=${velRatio.toFixed(1)}, ΔP=${dP_bed.toFixed(0)}Pa`);

    return {
      min_fluidization_velocity_m_s: mkAv(Math.round(Umf * 10000) / 10000, "m/s", Umf * 0.15, "wen_yu"),
      operating_velocity_m_s: mkAv(Math.round(actualU * 1000) / 1000, "m/s", actualU * 0.05, "flow_area"),
      bed_diameter_mm: mkAv(D, "mm", 0, "velocity_sizing"),
      expanded_bed_height_mm: mkAv(Math.round(expandedH), "mm", expandedH * 0.15, "richardson_zaki"),
      pressure_drop_Pa: mkAv(Math.round(dP_bed), "Pa", dP_bed * 0.08, "bed_weight"),
      terminal_velocity_m_s: mkAv(Math.round(Ut * 1000) / 1000, "m/s", Ut * 0.10, "drag_balance"),
      distributor_dp_Pa: mkAv(Math.round(dP_dist), "Pa", dP_dist * 0.15, "design_rule"),
      velocity_ratio: mkAv(Math.round(velRatio * 10) / 10, "ratio", velRatio * 0.10, "Umf_ratio"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const fluidizedBedEngine = new FluidizedBedEngine();
