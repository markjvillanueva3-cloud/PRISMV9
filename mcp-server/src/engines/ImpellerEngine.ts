/**
 * ImpellerEngine — Centrifugal pump/fan impeller design analysis
 *
 * Models: Euler turbomachinery equation, specific speed (Ns),
 *         slip factor (Wiesner), NPSH, affinity laws
 * References: Stepanoff, Karassik, Cordier diagram
 */

export type ImpellerType = "radial" | "mixed_flow" | "axial" | "backward_curved" | "forward_curved";
export type FluidType = "water" | "air" | "oil" | "slurry";

export interface ImpellerInput {
  flow_rate_m3_s: number;
  head_m?: number;                    // default 30 (pump) or pressure rise
  speed_rpm: number;
  impeller_type?: ImpellerType;
  outer_diameter_mm?: number;         // default auto-calc
  blade_count?: number;               // default 7
  inlet_diameter_mm?: number;         // default 0.5×D2
  blade_exit_angle_deg?: number;      // β2, default 25
  fluid?: FluidType;
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface ImpellerResult {
  specific_speed: AtomicValue;
  tip_speed_m_s: AtomicValue;
  euler_head_m: AtomicValue;
  slip_factor: AtomicValue;
  power_kW: AtomicValue;
  efficiency_pct: AtomicValue;
  npsh_required_m: AtomicValue;
  suction_specific_speed: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class ImpellerEngine {
  calculate(input: ImpellerInput): ImpellerResult {
    const {
      flow_rate_m3_s: Q,
      head_m: H = 30,
      speed_rpm: N,
      impeller_type = "backward_curved",
      blade_count: Z = 7,
      blade_exit_angle_deg: beta2_deg = 25,
      fluid = "water",
    } = input;

    const recs: string[] = [];
    const omega = 2 * Math.PI * N / 60;
    const beta2 = beta2_deg * Math.PI / 180;

    // Specific speed (dimensionless)
    const Ns = N * Math.sqrt(Q) / Math.pow(H, 0.75);

    // Auto-calc diameter from specific speed if not given
    const D2 = input.outer_diameter_mm ? input.outer_diameter_mm / 1000 :
      Math.pow(60 * Math.sqrt(2 * 9.81 * H) / (Math.PI * N), 1) * 1.2;
    const D1 = input.inlet_diameter_mm ? input.inlet_diameter_mm / 1000 : D2 * 0.5;

    // Tip speed
    const U2 = Math.PI * D2 * N / 60;
    const U1 = Math.PI * D1 * N / 60;

    // Slip factor (Wiesner correlation)
    const sigma = 1 - Math.sqrt(Math.sin(beta2)) / Math.pow(Z, 0.7);

    // Euler head: H_euler = σ × U2² / g (assuming no pre-swirl)
    const Vr2 = Q / (Math.PI * D2 * 0.05); // radial velocity at exit (b2 ≈ 0.05×D2)
    const Vu2 = sigma * (U2 - Vr2 / Math.tan(beta2));
    const H_euler = U2 * Vu2 / 9.81;

    // Hydraulic efficiency estimate from Ns
    const etaH = Ns > 10 ? Math.min(0.92, 0.60 + 0.005 * Ns) :
      Ns > 1 ? 0.55 + 0.03 * Ns : 0.50;
    const etaTotal = etaH * 0.95 * 0.97; // hydraulic × mechanical × volumetric

    // Power
    const rho = fluid === "water" ? 998 : fluid === "air" ? 1.2 : fluid === "oil" ? 860 : 1300;
    const power = rho * 9.81 * Q * H / (etaTotal * 1000); // kW

    // NPSH required (Thoma correlation)
    const NPSH_r = 0.3 * Math.pow(N * Math.sqrt(Q), 4 / 3) / Math.pow(9.81, 1) * 0.001 + 1;

    // Suction specific speed
    const Nss = N * Math.sqrt(Q) / Math.pow(Math.max(NPSH_r, 0.1), 0.75);

    const isSafe = U2 < 80 && etaTotal > 0.3 && Nss < 300;

    if (U2 > 60) recs.push(`Tip speed ${U2.toFixed(0)} m/s — material stress concern above 60 m/s`);
    if (Ns < 5) recs.push(`Low Ns=${Ns.toFixed(1)} — radial impeller, narrow passages, low efficiency`);
    if (Ns > 100) recs.push(`High Ns=${Ns.toFixed(0)} — consider axial flow design`);
    if (Nss > 200) recs.push(`Suction specific speed ${Nss.toFixed(0)} — cavitation risk, lower speed or increase eye`);
    if (recs.length === 0) recs.push(`Impeller nominal — Ns=${Ns.toFixed(1)}, U2=${U2.toFixed(0)}m/s, η=${(etaTotal * 100).toFixed(0)}%`);

    return {
      specific_speed: mkAv(Math.round(Ns * 10) / 10, "dimensionless", Ns * 0.05, "NsQH"),
      tip_speed_m_s: mkAv(Math.round(U2 * 10) / 10, "m/s", U2 * 0.02, "piDN"),
      euler_head_m: mkAv(Math.round(H_euler * 10) / 10, "m", H_euler * 0.10, "euler"),
      slip_factor: mkAv(Math.round(sigma * 1000) / 1000, "ratio", sigma * 0.05, "wiesner"),
      power_kW: mkAv(Math.round(power * 100) / 100, "kW", power * 0.10, "rhoQH_eta"),
      efficiency_pct: mkAv(Math.round(etaTotal * 1000) / 10, "%", etaTotal * 100 * 0.10, "composite"),
      npsh_required_m: mkAv(Math.round(NPSH_r * 10) / 10, "m", NPSH_r * 0.20, "thoma"),
      suction_specific_speed: mkAv(Math.round(Nss), "dimensionless", Nss * 0.10, "NssQNPSH"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const impellerEngine = new ImpellerEngine();
