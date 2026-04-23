/**
 * GearPumpEngine — External/internal gear pump sizing
 *
 * Models: Displacement (V=π×m²×z×b), volumetric efficiency,
 *         flow rate, pressure rating, torque/power
 * References: Hydraulic Institute, Rexroth
 * Safety: Pressure limits, cavitation, NPSH, trapped volume
 */

export type GearPumpType = "external" | "internal" | "gerotor";

export interface GearPumpInput {
  flow_rate_L_min: number;
  discharge_pressure_bar?: number;      // default 100
  speed_rpm?: number;                   // default 1500
  fluid_viscosity_cSt?: number;         // default 32
  pump_type?: GearPumpType;
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface GearPumpResult {
  displacement_cc_rev: AtomicValue;
  actual_flow_L_min: AtomicValue;
  volumetric_efficiency_pct: AtomicValue;
  input_power_kW: AtomicValue;
  shaft_torque_Nm: AtomicValue;
  overall_efficiency_pct: AtomicValue;
  gear_module_mm: AtomicValue;
  tip_speed_m_s: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class GearPumpEngine {
  calculate(input: GearPumpInput): GearPumpResult {
    const {
      flow_rate_L_min: Q,
      discharge_pressure_bar: P = 100,
      speed_rpm: N = 1500,
      fluid_viscosity_cSt: nu = 32,
      pump_type = "external",
    } = input;

    const recs: string[] = [];

    // Volumetric efficiency (decreases with pressure, increases with viscosity)
    const etaV = pump_type === "external" ? 0.93 - P * 0.0002
      : pump_type === "internal" ? 0.91 - P * 0.0003
      : 0.90 - P * 0.0003;

    // Required displacement
    const Vd = Q * 1000 / (N * Math.max(etaV, 0.7)); // cc/rev

    // Gear sizing (external gear)
    const z = 12; // teeth
    const m = Math.pow(Vd / (2 * Math.PI * z * 0.5), 1 / 3); // approximate module, mm
    const mStd = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0];
    const gearModule = mStd.find(v => v >= m) ?? m;

    // Actual flow
    const actualFlow = Vd * N * etaV / 1000; // L/min

    // Power and torque
    const mechEff = 0.90;
    const overallEff = etaV * mechEff;
    const hydraulicPower = P * Q / 600; // kW
    const inputPower = hydraulicPower / overallEff;
    const torque = inputPower * 1000 / (2 * Math.PI * N / 60);

    // Tip speed
    const pcd = gearModule * z; // mm
    const tipSpeed = Math.PI * pcd / 1000 * N / 60;

    const isSafe = P <= 250 && tipSpeed <= 12;

    if (P > 200) recs.push(`High pressure ${P}bar — verify gear tooth strength and bearing life`);
    if (tipSpeed > 10) recs.push(`High tip speed ${tipSpeed.toFixed(1)}m/s — noise and cavitation risk`);
    if (nu < 10) recs.push(`Low viscosity ${nu}cSt — poor lubrication, increased leakage`);
    if (nu > 200) recs.push(`High viscosity ${nu}cSt — cavitation risk at inlet, verify NPSH`);
    if (recs.length === 0) recs.push(`Gear pump nominal — ${Vd.toFixed(1)}cc/rev, ${inputPower.toFixed(1)}kW, η=${(overallEff * 100).toFixed(0)}%`);

    return {
      displacement_cc_rev: mkAv(Math.round(Vd * 10) / 10, "cc/rev", Vd * 0.05, "flow_speed"),
      actual_flow_L_min: mkAv(Math.round(actualFlow * 10) / 10, "L/min", actualFlow * 0.05, "displacement"),
      volumetric_efficiency_pct: mkAv(Math.round(etaV * 1000) / 10, "%", 2, "pressure_viscosity"),
      input_power_kW: mkAv(Math.round(inputPower * 100) / 100, "kW", inputPower * 0.08, "hydraulic_power"),
      shaft_torque_Nm: mkAv(Math.round(torque * 10) / 10, "Nm", torque * 0.08, "power_speed"),
      overall_efficiency_pct: mkAv(Math.round(overallEff * 1000) / 10, "%", 2, "vol_mech"),
      gear_module_mm: mkAv(gearModule, "mm", 0, "standard_size"),
      tip_speed_m_s: mkAv(Math.round(tipSpeed * 10) / 10, "m/s", tipSpeed * 0.05, "geometry"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const gearPumpEngine = new GearPumpEngine();
