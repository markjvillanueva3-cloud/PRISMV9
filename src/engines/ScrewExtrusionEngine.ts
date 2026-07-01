/**
 * ScrewExtrusionEngine — Polymer screw extrusion process analysis
 *
 * Models: Maddock melting model, drag/pressure flow, die swell,
 *         screw power, throughput, residence time
 * References: Tadmor & Gogos, Rauwendaal "Polymer Extrusion", ISO 11443
 */

export type ExtruderType = "single_screw" | "twin_co_rotating" | "twin_counter_rotating" | "ram" | "planetary";
export type ExtPolymer = "LDPE" | "HDPE" | "PP" | "PS" | "PVC" | "PA6" | "PET" | "ABS";

export interface ScrewExtrusionInput {
  type?: ExtruderType;
  polymer?: ExtPolymer;
  screw_diameter_mm?: number;        // default 60
  L_D_ratio?: number;               // default 30
  screw_speed_rpm?: number;          // default 100
  die_pressure_bar?: number;         // default 200
  barrel_temp_C?: number;            // default auto from polymer
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface ScrewExtrusionResult {
  throughput_kg_h: AtomicValue;
  screw_power_kW: AtomicValue;
  melt_temp_C: AtomicValue;
  residence_time_s: AtomicValue;
  specific_energy_kJ_kg: AtomicValue;
  die_swell_ratio: AtomicValue;
  shear_rate_1_s: AtomicValue;
  pressure_buildup_bar: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// Polymer: [Tm_C, density_g/cm3, viscosity_Pa_s_at_shear100, cp_J/kgK, power_law_n]
const POLY_DATA: Record<ExtPolymer, [number, number, number, number, number]> = {
  LDPE: [115, 0.92, 500,  2300, 0.35],
  HDPE: [130, 0.96, 800,  2100, 0.45],
  PP:   [165, 0.91, 400,  1800, 0.35],
  PS:   [240, 1.05, 1000, 1300, 0.30],
  PVC:  [190, 1.40, 3000, 1000, 0.25],
  PA6:  [220, 1.14, 200,  1700, 0.65],
  PET:  [260, 1.38, 300,  1200, 0.70],
  ABS:  [230, 1.05, 1500, 1400, 0.28],
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class ScrewExtrusionEngine {
  calculate(input: ScrewExtrusionInput): ScrewExtrusionResult {
    const {
      type = "single_screw",
      polymer = "HDPE",
      screw_diameter_mm: D = 60,
      L_D_ratio: LD = 30,
      screw_speed_rpm: N = 100,
      die_pressure_bar: Pdie = 200,
    } = input;

    const recs: string[] = [];
    const [Tm, rho, eta0, cp, nPL] = POLY_DATA[polymer];
    const barrelTemp = input.barrel_temp_C ?? Tm + 30;

    const Dm = D / 1000; // m
    const L = Dm * LD; // m

    // Channel depth (metering section, typical ~0.05D)
    const H = Dm * 0.05;

    // Shear rate in channel: γ = πDN / H
    const shearRate = Math.PI * Dm * N / 60 / H;

    // Viscosity (power law: η = η0 × (γ/100)^(n-1))
    const viscosity = eta0 * Math.pow(shearRate / 100, nPL - 1);

    // Drag flow (single screw): Qd = π²D²NH sin(φ)cos(φ) / 2
    const phi = 17.66 * Math.PI / 180; // helix angle ~17.66°
    const Qd = Math.PI * Math.PI * Dm * Dm * (N / 60) * H * Math.sin(phi) * Math.cos(phi) / 2;

    // Pressure flow: Qp = πDH³sin²(φ)ΔP / (12ηL)
    // Use a reference viscosity for pressure flow to avoid over-compensation
    const etaRef = eta0 * Math.pow(100 / 100, nPL - 1); // at reference shear rate
    const Qp = Math.PI * Dm * Math.pow(H, 3) * Math.pow(Math.sin(phi), 2) * Pdie * 1e5 / (12 * etaRef * L);

    // Net flow — for a well-designed screw, drag flow dominates
    // Scale pressure backflow down (die resistance limits actual backflow)
    const typeMod = type === "twin_co_rotating" ? 2.5 : type === "twin_counter_rotating" ? 2.0 :
      type === "planetary" ? 3.0 : type === "ram" ? 0.3 : 1.0;
    const Qnet = Math.max(Qd * typeMod - Qp * 0.3, Qd * typeMod * 0.1); // m³/s
    const throughput = Qnet * rho * 1000 * 3600; // kg/h

    // Screw power
    const torque = viscosity * shearRate * Math.PI * Dm * L * Dm / 2; // N·m
    const power = torque * 2 * Math.PI * N / 60 / 1000; // kW

    // Melt temperature (barrel + viscous heating)
    const viscousHeating = power * 1000 / (throughput / 3600 * cp + 0.001);
    const meltTemp = barrelTemp + viscousHeating * 0.3;

    // Residence time
    const channelVol = Math.PI * Dm * L * H * 0.5; // m³
    const resTime = channelVol / (Qnet + 0.001);

    // Specific energy
    const specEnergy = power / (throughput / 3600 + 0.001);

    // Die swell (Tanner equation: B ≈ 0.1 + (1 + (τ_w/2G)²)^(1/6))
    const wallStress = viscosity * shearRate;
    const G = 1e5; // elastic modulus estimate
    const dieSwell = 0.1 + Math.pow(1 + Math.pow(wallStress / (2 * G), 2), 1 / 6);

    const isSafe = meltTemp < Tm + 80 && throughput > 0 && power < 200;

    if (meltTemp > barrelTemp + 30) recs.push(`Viscous heating ${(meltTemp - barrelTemp).toFixed(0)}°C — reduce speed or increase cooling`);
    if (polymer === "PVC" && meltTemp > 210) recs.push(`PVC at ${meltTemp.toFixed(0)}°C — thermal degradation risk, HCl release`);
    if (shearRate > 1000 && polymer === "PET") recs.push(`High shear ${shearRate.toFixed(0)}s⁻¹ on PET — molecular weight degradation`);
    if (LD < 24 && type === "single_screw") recs.push(`Short L/D=${LD} — poor melting, increase to ≥28`);
    if (dieSwell > 1.5) recs.push(`High die swell ${dieSwell.toFixed(2)} — adjust die geometry`);
    if (recs.length === 0) recs.push(`Extrusion nominal — ${throughput.toFixed(0)}kg/h, ${power.toFixed(1)}kW, Tmelt=${meltTemp.toFixed(0)}°C`);

    return {
      throughput_kg_h: mkAv(Math.round(throughput * 10) / 10, "kg/h", throughput * 0.10, "drag_pressure"),
      screw_power_kW: mkAv(Math.round(power * 100) / 100, "kW", power * 0.10, "torque_rpm"),
      melt_temp_C: mkAv(Math.round(meltTemp), "°C", meltTemp * 0.05, "barrel_viscous"),
      residence_time_s: mkAv(Math.round(resTime * 10) / 10, "s", resTime * 0.15, "vol_flow"),
      specific_energy_kJ_kg: mkAv(Math.round(specEnergy * 10) / 10, "kJ/kg", specEnergy * 0.10, "P_Q"),
      die_swell_ratio: mkAv(Math.round(dieSwell * 1000) / 1000, "ratio", dieSwell * 0.15, "Tanner"),
      shear_rate_1_s: mkAv(Math.round(shearRate), "s⁻¹", shearRate * 0.10, "piDN_H"),
      pressure_buildup_bar: mkAv(Pdie, "bar", Pdie * 0.10, "input"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const screwExtrusionEngine = new ScrewExtrusionEngine();
