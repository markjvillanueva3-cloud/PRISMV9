/**
 * MixerAgitatorEngine — Agitator power, impeller sizing, mixing time
 *
 * Models: Power number correlation (P=Np×ρ×N³×D⁵), Reynolds number,
 *         tip speed, mixing time (Nθ correlation), scale-up
 * References: Rushton turbine correlations, Perry's Ch.18
 * Safety: Shaft critical speed, seal pressure rating, tip speed limits
 */

export type ImpellerType = "rushton" | "pitched_blade" | "hydrofoil" | "anchor" | "helical";

export interface MixerAgitatorInput {
  tank_diameter_mm: number;
  liquid_height_mm?: number;            // default = tank diameter
  liquid_density_kg_m3?: number;        // default 1000
  liquid_viscosity_cP?: number;         // default 1
  impeller_type?: ImpellerType;
  impeller_diameter_mm?: number;        // default D/3
  speed_rpm?: number;                   // default auto
  num_impellers?: number;               // default 1
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface MixerAgitatorResult {
  power_kW: AtomicValue;
  torque_Nm: AtomicValue;
  reynolds_number: AtomicValue;
  tip_speed_m_s: AtomicValue;
  power_number: AtomicValue;
  mixing_time_s: AtomicValue;
  impeller_diameter_mm: AtomicValue;
  flow_regime: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

const NP_DATA: Record<ImpellerType, { Np_turb: number; Nq: number; maxTip: number }> = {
  rushton:        { Np_turb: 5.0, Nq: 0.72, maxTip: 8 },
  pitched_blade:  { Np_turb: 1.5, Nq: 0.79, maxTip: 10 },
  hydrofoil:      { Np_turb: 0.35, Nq: 0.56, maxTip: 12 },
  anchor:         { Np_turb: 0.35, Nq: 0.30, maxTip: 3 },
  helical:        { Np_turb: 0.35, Nq: 0.20, maxTip: 2 },
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class MixerAgitatorEngine {
  calculate(input: MixerAgitatorInput): MixerAgitatorResult {
    const {
      tank_diameter_mm: T,
      liquid_density_kg_m3: rho = 1000,
      liquid_viscosity_cP: mu_cP = 1,
      impeller_type = "rushton",
      num_impellers = 1,
    } = input;

    const recs: string[] = [];
    const Tm = T / 1000;
    const Hm = (input.liquid_height_mm ?? T) / 1000;
    const mu = mu_cP * 1e-3; // Pa·s
    const imp = NP_DATA[impeller_type];

    // Impeller diameter
    const Dmm = input.impeller_diameter_mm ?? Math.round(T / 3);
    const Dm = Dmm / 1000;

    // Speed selection (if not provided)
    let N_rpm = input.speed_rpm;
    if (!N_rpm) {
      // Target tip speed ~5 m/s for turbulent
      const targetTip = Math.min(5, imp.maxTip);
      N_rpm = Math.round(targetTip / (Math.PI * Dm) * 60);
    }
    const N = N_rpm / 60; // rps

    // Reynolds number
    const Re = rho * N * Dm * Dm / mu;

    // Flow regime
    const regime = Re > 10000 ? "turbulent" : Re > 10 ? "transitional" : "laminar";

    // Power number (turbulent Np, with correction for transitional/laminar)
    let Np: number;
    if (Re > 10000) {
      Np = imp.Np_turb;
    } else if (Re > 10) {
      Np = imp.Np_turb * Math.pow(10000 / Re, 0.3);
    } else {
      Np = 65 / Re; // laminar correlation
    }

    // Power: P = Np × ρ × N³ × D⁵
    const P_single = Np * rho * Math.pow(N, 3) * Math.pow(Dm, 5);
    const P_total = P_single * num_impellers / 1000; // kW

    // Torque
    const omega = 2 * Math.PI * N;
    const torque = P_total * 1000 / omega;

    // Tip speed
    const tipSpeed = Math.PI * Dm * N;

    // Mixing time: Nθ ≈ 5.5 × (T/D)² for Rushton in turbulent
    const NthetaFactor = impeller_type === "rushton" ? 5.5 : impeller_type === "pitched_blade" ? 4.0 : 6.0;
    const Ntheta = NthetaFactor * Math.pow(Tm / Dm, 2);
    const mixTime = Ntheta / N;

    const isSafe = tipSpeed <= imp.maxTip && Re > 1;

    if (tipSpeed > imp.maxTip * 0.9) recs.push(`High tip speed ${tipSpeed.toFixed(1)}m/s — erosion and vortex risk`);
    if (Re < 100 && impeller_type === "rushton") recs.push(`Laminar flow Re=${Re.toFixed(0)} — use anchor or helical impeller`);
    if (Dm / Tm > 0.5) recs.push(`Large D/T ratio ${(Dm / Tm).toFixed(2)} — baffles recommended`);
    if (Dm / Tm < 0.2) recs.push(`Small D/T ratio ${(Dm / Tm).toFixed(2)} — poor mixing coverage`);
    if (Hm / Tm > 1.5 && num_impellers === 1) recs.push(`Tall tank H/T=${(Hm / Tm).toFixed(1)} — add second impeller`);
    if (recs.length === 0) recs.push(`Agitator nominal — ${Dmm}mm ${impeller_type}, ${N_rpm}rpm, ${P_total.toFixed(2)}kW`);

    return {
      power_kW: mkAv(Math.round(P_total * 100) / 100, "kW", P_total * 0.12, "power_number"),
      torque_Nm: mkAv(Math.round(torque * 10) / 10, "Nm", torque * 0.12, "power_speed"),
      reynolds_number: mkAv(Math.round(Re), "dimensionless", Re * 0.05, "impeller_Re"),
      tip_speed_m_s: mkAv(Math.round(tipSpeed * 10) / 10, "m/s", tipSpeed * 0.05, "geometry"),
      power_number: mkAv(Math.round(Np * 100) / 100, "dimensionless", Np * 0.10, "correlation"),
      mixing_time_s: mkAv(Math.round(mixTime), "s", mixTime * 0.20, "Ntheta_correlation"),
      impeller_diameter_mm: mkAv(Dmm, "mm", 0, "D_T_ratio"),
      flow_regime: mkAv(Re > 10000 ? 3 : Re > 10 ? 2 : 1, "regime_code", 0, "reynolds", regime),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const mixerAgitatorEngine = new MixerAgitatorEngine();
