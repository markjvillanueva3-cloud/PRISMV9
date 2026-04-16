/**
 * VanePumpEngine — Rotary vane pump performance analysis
 *
 * Models: Displacement from vane geometry, volumetric/mechanical
 *         efficiency, pressure-flow characteristic, vane tip speed
 * References: Henke, Vickers hydraulic handbook
 */

export type VanePumpType = "fixed" | "variable" | "balanced" | "unbalanced";

export interface VanePumpInput {
  pump_type?: VanePumpType;
  rotor_diameter_mm: number;
  cam_ring_diameter_mm: number;
  vane_width_mm: number;
  num_vanes?: number;                // default 10
  speed_rpm: number;
  discharge_pressure_bar?: number;   // default 100
  volumetric_efficiency?: number;    // 0-1, default 0.92
  mechanical_efficiency?: number;    // 0-1, default 0.88
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface VanePumpResult {
  displacement_cc_rev: AtomicValue;
  flow_rate_lpm: AtomicValue;
  theoretical_flow_lpm: AtomicValue;
  input_power_kW: AtomicValue;
  output_power_kW: AtomicValue;
  overall_efficiency_pct: AtomicValue;
  vane_tip_speed_m_s: AtomicValue;
  specific_speed: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class VanePumpEngine {
  calculate(input: VanePumpInput): VanePumpResult {
    const {
      pump_type = "balanced",
      rotor_diameter_mm: Dr,
      cam_ring_diameter_mm: Dc,
      vane_width_mm: W,
      num_vanes: Z = 10,
      speed_rpm: N,
      discharge_pressure_bar: P = 100,
      volumetric_efficiency: etaV = 0.92,
      mechanical_efficiency: etaM = 0.88,
    } = input;

    const recs: string[] = [];

    // Eccentricity
    const e = (Dc - Dr) / 2; // mm

    // Displacement: V = π × e × Dr × W × (for unbalanced, ×1; balanced ×2)
    // Simplified: V_cc = π × (e/10) × (Dr/10) × (W/10) for each chamber
    const balancedFactor = pump_type === "balanced" ? 2 : 1;
    const V_cc = Math.PI * (e / 10) * (Dr / 10) * (W / 10) * balancedFactor;

    // Flow rates
    const Q_theo = V_cc * N / 1000; // L/min
    const Q_actual = Q_theo * etaV;

    // Power
    const P_out = P * 1e5 * Q_actual / 60000 / 1000; // kW
    const etaOverall = etaV * etaM;
    const P_in = P_out / Math.max(etaOverall, 0.01);

    // Vane tip speed
    const tipSpeed = Math.PI * (Dc / 1000) * N / 60;

    // Specific speed
    const omega = 2 * Math.PI * N / 60;
    const Ns = omega * Math.sqrt(Q_actual / 60000) / Math.pow(P * 1e5 / 998, 0.75);

    const maxTip = pump_type === "balanced" ? 18 : 15;
    const isSafe = tipSpeed < maxTip && P < 250 && etaOverall > 0.5;

    if (tipSpeed > 15) recs.push(`Tip speed ${tipSpeed.toFixed(1)} m/s — vane wear acceleration`);
    if (P > 210) recs.push(`High pressure ${P} bar — consider piston pump`);
    if (e / Dr > 0.15) recs.push(`High eccentricity ratio ${(e / Dr).toFixed(3)} — stress on vanes`);
    if (Z < 8) recs.push(`Few vanes (${Z}) — increased flow ripple`);
    if (recs.length === 0) recs.push(`Vane pump nominal — ${Q_actual.toFixed(1)}L/min, ${P_in.toFixed(1)}kW, η=${(etaOverall * 100).toFixed(0)}%`);

    return {
      displacement_cc_rev: mkAv(Math.round(V_cc * 100) / 100, "cc/rev", V_cc * 0.05, "geometry"),
      flow_rate_lpm: mkAv(Math.round(Q_actual * 100) / 100, "L/min", Q_actual * 0.05, "VN_etaV"),
      theoretical_flow_lpm: mkAv(Math.round(Q_theo * 100) / 100, "L/min", Q_theo * 0.03, "VN"),
      input_power_kW: mkAv(Math.round(P_in * 100) / 100, "kW", P_in * 0.08, "PQ_eta"),
      output_power_kW: mkAv(Math.round(P_out * 100) / 100, "kW", P_out * 0.05, "PQ"),
      overall_efficiency_pct: mkAv(Math.round(etaOverall * 1000) / 10, "%", etaOverall * 100 * 0.05, "etaV_etaM"),
      vane_tip_speed_m_s: mkAv(Math.round(tipSpeed * 100) / 100, "m/s", tipSpeed * 0.02, "piDcN"),
      specific_speed: mkAv(Math.round(Ns * 10000) / 10000, "dimensionless", Ns * 0.15, "omega_Q_P"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const vanePumpEngine = new VanePumpEngine();
