/**
 * HydraulicMotorEngine — Hydraulic motor performance analysis
 *
 * Models: Displacement-based torque/speed, volumetric & mechanical
 *         efficiency, power mapping, case drain flow
 * References: Parker Hannifin, Bosch Rexroth, ISO 4409
 */

export type MotorType = "gear" | "vane" | "axial_piston" | "radial_piston" | "gerotor";

export interface HydraulicMotorInput {
  motor_type?: MotorType;
  displacement_cc_rev: number;       // cm³/rev
  pressure_bar: number;              // operating pressure
  speed_rpm: number;
  volumetric_efficiency?: number;    // 0-1, default varies by type
  mechanical_efficiency?: number;    // 0-1, default varies by type
  fluid_viscosity_cSt?: number;      // default 32
  max_pressure_bar?: number;         // default 350
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface HydraulicMotorResult {
  theoretical_torque_Nm: AtomicValue;
  actual_torque_Nm: AtomicValue;
  theoretical_flow_lpm: AtomicValue;
  actual_flow_lpm: AtomicValue;
  output_power_kW: AtomicValue;
  input_power_kW: AtomicValue;
  overall_efficiency_pct: AtomicValue;
  case_drain_lpm: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// Motor data: [eta_vol_default, eta_mech_default, max_speed_rpm, max_pressure_bar]
const MOTOR_DATA: Record<MotorType, [number, number, number, number]> = {
  gear:          [0.90, 0.85, 4000, 250],
  vane:          [0.92, 0.88, 3000, 210],
  axial_piston:  [0.95, 0.92, 6000, 420],
  radial_piston: [0.96, 0.93, 2000, 450],
  gerotor:       [0.91, 0.85, 2500, 200],
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class HydraulicMotorEngine {
  calculate(input: HydraulicMotorInput): HydraulicMotorResult {
    const {
      motor_type = "axial_piston",
      displacement_cc_rev: Vd,
      pressure_bar: P,
      speed_rpm: N,
      fluid_viscosity_cSt: visc = 32,
    } = input;

    const recs: string[] = [];
    const [etaV_def, etaM_def, maxSpeed, maxPress] = MOTOR_DATA[motor_type];
    const etaV = input.volumetric_efficiency ?? etaV_def;
    const etaM = input.mechanical_efficiency ?? etaM_def;
    const Pmax = input.max_pressure_bar ?? maxPress;

    // Theoretical torque: T = Vd × ΔP / (2π)
    const T_theo = Vd * P * 1e-1 / (2 * Math.PI); // Nm (cc × bar → Nm conversion: 1cc×1bar = 0.1 Nm)
    const T_actual = T_theo * etaM;

    // Theoretical flow: Q = Vd × N / 1000
    const Q_theo = Vd * N / 1000; // L/min
    const Q_actual = Q_theo / etaV; // need more flow due to leakage

    // Power
    const P_out = T_actual * 2 * Math.PI * N / 60 / 1000; // kW
    const P_in = P * 1e5 * Q_actual / 60000 / 1000; // kW

    // Overall efficiency
    const etaOverall = etaV * etaM;

    // Case drain (leakage flow)
    const caseDrain = Q_actual - Q_theo;

    const isSafe = P < Pmax && N < maxSpeed && etaOverall > 0.5;

    if (P > Pmax * 0.9) recs.push(`Pressure ${P} bar near max ${Pmax} bar — seal/fatigue risk`);
    if (N > maxSpeed * 0.9) recs.push(`Speed ${N} rpm near max ${maxSpeed} rpm — cavitation risk`);
    if (visc < 15) recs.push(`Low viscosity ${visc}cSt — increased leakage and wear`);
    if (visc > 100) recs.push(`High viscosity ${visc}cSt — excessive pressure drop, poor efficiency`);
    if (caseDrain > Q_theo * 0.15) recs.push(`High case drain ${caseDrain.toFixed(1)} L/min — check seals`);
    if (recs.length === 0) recs.push(`Motor nominal — T=${T_actual.toFixed(1)}Nm, ${P_out.toFixed(1)}kW, η=${(etaOverall * 100).toFixed(0)}%`);

    return {
      theoretical_torque_Nm: mkAv(Math.round(T_theo * 100) / 100, "Nm", T_theo * 0.03, "VdP_2pi"),
      actual_torque_Nm: mkAv(Math.round(T_actual * 100) / 100, "Nm", T_actual * 0.05, "mech_eff"),
      theoretical_flow_lpm: mkAv(Math.round(Q_theo * 100) / 100, "L/min", Q_theo * 0.02, "VdN"),
      actual_flow_lpm: mkAv(Math.round(Q_actual * 100) / 100, "L/min", Q_actual * 0.05, "vol_eff"),
      output_power_kW: mkAv(Math.round(P_out * 100) / 100, "kW", P_out * 0.05, "Tw"),
      input_power_kW: mkAv(Math.round(P_in * 100) / 100, "kW", P_in * 0.05, "PQ"),
      overall_efficiency_pct: mkAv(Math.round(etaOverall * 1000) / 10, "%", etaOverall * 100 * 0.05, "etaV_etaM"),
      case_drain_lpm: mkAv(Math.round(caseDrain * 100) / 100, "L/min", caseDrain * 0.20, "leakage"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const hydraulicMotorEngine = new HydraulicMotorEngine();
