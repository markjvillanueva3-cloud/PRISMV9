/**
 * ElectrospinningEngine — Electrospinning nanofiber production
 *
 * Models: Taylor cone formation, fiber diameter prediction,
 *         electric field analysis, flow rate optimization, bead defects
 * References: Reneker & Yarin, Fridrikh model, Rutledge & Fridrikh
 */

export type PolymerType = "PAN" | "PVA" | "PCL" | "PLGA" | "nylon" | "PVDF" | "PEO";
export type CollectorType = "flat_plate" | "rotating_drum" | "mandrel" | "patterned" | "liquid_bath";

export interface ElectrospinningInput {
  polymer?: PolymerType;
  collector?: CollectorType;
  voltage_kV: number;
  tip_to_collector_mm?: number;       // default 150
  flow_rate_mL_h?: number;            // default 1.0
  solution_concentration_pct?: number; // default 10
  needle_gauge?: number;               // default 21
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface ElectrospinningResult {
  fiber_diameter_nm: AtomicValue;
  electric_field_kV_cm: AtomicValue;
  taylor_cone_voltage_kV: AtomicValue;
  production_rate_g_h: AtomicValue;
  jet_velocity_m_s: AtomicValue;
  bead_risk_index: AtomicValue;
  mat_thickness_um_h: AtomicValue;
  specific_surface_area_m2_g: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// Polymer: [viscosity_factor, conductivity_uS/cm, surface_tension_mN/m, density_g/cm3]
const POLYMER_DATA: Record<PolymerType, [number, number, number, number]> = {
  PAN:   [1.0,  50, 30, 1.18],
  PVA:   [0.8,  100, 50, 1.26],
  PCL:   [1.2,  10,  35, 1.15],
  PLGA:  [1.1,  20,  28, 1.25],
  nylon: [0.9,  80,  42, 1.14],
  PVDF:  [1.3,  30,  25, 1.78],
  PEO:   [0.7,  200, 55, 1.21],
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class ElectrospinningEngine {
  calculate(input: ElectrospinningInput): ElectrospinningResult {
    const {
      polymer = "PAN",
      collector = "flat_plate",
      voltage_kV: V,
      tip_to_collector_mm: d = 150,
      flow_rate_mL_h: Q = 1.0,
      solution_concentration_pct: C = 10,
      needle_gauge = 21,
    } = input;

    const recs: string[] = [];
    const [viscFactor, sigma_e, gamma, rho] = POLYMER_DATA[polymer];

    // Needle ID from gauge (approximate)
    const needleID = 0.8 - needle_gauge * 0.02; // mm rough

    // Electric field
    const E = V / (d / 10); // kV/cm

    // Taylor cone onset voltage (Vc = (4H²/L²)(ln(2L/R) - 1.5)(0.117πγR))
    // Simplified: Vc ≈ 1.3 × √(γ × d)
    const Vc = 1.3 * Math.sqrt(gamma / 1000 * d / 1000) * 10; // kV, rough

    // Fridrikh model: fiber diameter
    // d_f ∝ (Q × γ × ε / (I × π))^(1/3) where I is current
    const current = sigma_e * 1e-6 * Q / 3600 * 1e-6; // A, rough
    const Qm3s = Q / 3600 / 1e6; // m³/s
    const df = 100 * Math.pow(C / 10, 0.8) * Math.pow(Q / 1.0, 0.3) *
      Math.pow(15 / V, 0.5) * viscFactor * 1000; // nm

    // Jet velocity
    const jetV = Qm3s / (Math.PI * Math.pow(needleID / 2000, 2)); // m/s

    // Production rate
    const prodRate = Q * C / 100 * rho; // g/h

    // Bead defect risk (0-10): low viscosity + low voltage → beads
    const beadRisk = Math.max(10 - C * 0.5 - V * 0.2 + Q * 2, 0);

    // Mat thickness accumulation rate
    const collectorArea = collector === "rotating_drum" ? 0.05 : 0.01; // m²
    const matRate = prodRate / (rho * collectorArea * 1000) * 1000; // μm/h

    // Specific surface area (inverse of fiber diameter)
    const SSA = 4 / (rho * df / 1e9 * 1000); // m²/g

    const isSafe = V < 40 && V > Vc && beadRisk < 5;

    if (V < Vc) recs.push(`Voltage ${V}kV below Taylor cone onset ${Vc.toFixed(1)}kV — increase voltage`);
    if (V > 30) recs.push(`High voltage ${V}kV — corona discharge risk, increase distance`);
    if (beadRisk > 5) recs.push(`Bead risk ${beadRisk.toFixed(1)} — increase concentration or voltage`);
    if (C < 5) recs.push(`Low concentration ${C}% — electrospraying instead of spinning`);
    if (df > 1000) recs.push(`Large fiber diameter ${df.toFixed(0)}nm — reduce flow rate or concentration`);
    if (recs.length === 0) recs.push(`Spinning nominal — df=${df.toFixed(0)}nm, ${prodRate.toFixed(2)}g/h, E=${E.toFixed(1)}kV/cm`);

    return {
      fiber_diameter_nm: mkAv(Math.round(df), "nm", df * 0.25, "fridrikh"),
      electric_field_kV_cm: mkAv(Math.round(E * 100) / 100, "kV/cm", E * 0.05, "V_d"),
      taylor_cone_voltage_kV: mkAv(Math.round(Vc * 10) / 10, "kV", Vc * 0.15, "taylor"),
      production_rate_g_h: mkAv(Math.round(prodRate * 1000) / 1000, "g/h", prodRate * 0.10, "QC_rho"),
      jet_velocity_m_s: mkAv(Math.round(jetV * 1000) / 1000, "m/s", jetV * 0.20, "Q_A"),
      bead_risk_index: mkAv(Math.round(beadRisk * 10) / 10, "index", beadRisk * 0.25, "composite"),
      mat_thickness_um_h: mkAv(Math.round(matRate * 10) / 10, "μm/h", matRate * 0.30, "mass_area"),
      specific_surface_area_m2_g: mkAv(Math.round(SSA * 10) / 10, "m²/g", SSA * 0.25, "4_rho_df"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const electrospinningEngine = new ElectrospinningEngine();
