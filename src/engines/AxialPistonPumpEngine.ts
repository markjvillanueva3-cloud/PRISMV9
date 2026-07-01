/**
 * AxialPistonPumpEngine — Axial piston hydraulic pump analysis
 *
 * Models: Swashplate displacement, volumetric/mechanical efficiency,
 *         pressure ripple, flow pulsation, case drain, noise
 * References: ISO 4409, Ivantysyn & Ivantysynova, SAE J745
 */

export type PistonPumpType = "swashplate" | "bent_axis" | "inline";
export type ControlType = "fixed" | "pressure_compensated" | "load_sensing" | "electro_proportional";

export interface AxialPistonPumpInput {
  type?: PistonPumpType;
  control?: ControlType;
  num_pistons?: number;              // default 9
  piston_diameter_mm: number;
  piston_stroke_mm?: number;         // default from swashplate angle
  swashplate_angle_deg?: number;     // default 15
  shaft_speed_rpm?: number;          // default 1500
  system_pressure_bar?: number;      // default 250
  oil_viscosity_cSt?: number;        // default 32
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface AxialPistonPumpResult {
  displacement_cc_rev: AtomicValue;
  flow_rate_L_min: AtomicValue;
  volumetric_efficiency_pct: AtomicValue;
  mechanical_efficiency_pct: AtomicValue;
  input_power_kW: AtomicValue;
  torque_Nm: AtomicValue;
  flow_ripple_pct: AtomicValue;
  case_drain_L_min: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class AxialPistonPumpEngine {
  calculate(input: AxialPistonPumpInput): AxialPistonPumpResult {
    const {
      type = "swashplate",
      control = "pressure_compensated",
      num_pistons: z = 9,
      piston_diameter_mm: d,
      swashplate_angle_deg: alpha = 15,
      shaft_speed_rpm: N = 1500,
      system_pressure_bar: P = 250,
      oil_viscosity_cSt: nu = 32,
    } = input;

    const recs: string[] = [];
    const alphaRad = alpha * Math.PI / 180;

    // Piston stroke
    const PCD = d * 3; // pitch circle diameter ≈ 3× piston diameter
    const stroke = input.piston_stroke_mm ?? PCD * Math.tan(alphaRad);

    // Displacement per revolution
    const Ap = Math.PI * Math.pow(d / 2, 2); // mm²
    const Vrev = z * Ap * stroke / 1000; // cc (cm³)

    // Theoretical flow
    const Qtheory = Vrev * N / 1000; // L/min

    // Volumetric efficiency (decreases with pressure, increases with viscosity to a point)
    const leakCoeff = 0.0001 * P / (nu + 1);
    const volEff = Math.max(100 - leakCoeff * 100 - P / 1000, 85);

    // Actual flow
    const Qactual = Qtheory * volEff / 100;

    // Mechanical efficiency (friction losses)
    const viscousFriction = 0.001 * nu * N / 1000;
    const mechEff = Math.max(100 - 3 - viscousFriction, 88);

    // Overall efficiency
    const overallEff = volEff * mechEff / 10000;

    // Input power
    const hydraulicPower = Qactual / 60000 * P * 1e5 / 1000; // kW
    const inputPower = hydraulicPower / overallEff;

    // Torque
    const torque = inputPower * 1000 / (2 * Math.PI * N / 60);

    // Flow ripple (depends on number of pistons, odd numbers better)
    const ripple = 100 * (1 - Math.cos(Math.PI / z)) / (1 + Math.cos(Math.PI / z)) * 100;
    const flowRipple = Math.round(ripple * 10) / 10;

    // Case drain (internal leakage)
    const caseDrain = Qtheory * (1 - volEff / 100);

    // Bent axis modifier
    const typeMod = type === "bent_axis" ? { volEff: 1.02, mechEff: 0.98 } :
      type === "inline" ? { volEff: 0.98, mechEff: 1.01 } :
      { volEff: 1.0, mechEff: 1.0 };

    const adjVolEff = Math.min(volEff * typeMod.volEff, 99);
    const adjMechEff = Math.min(mechEff * typeMod.mechEff, 99);

    const isSafe = P < 420 && N < 4000 && adjVolEff > 85;

    if (P > 350) recs.push(`High pressure ${P}bar — verify pump rating, consider bent-axis`);
    if (N > 3000) recs.push(`High speed ${N}rpm — cavitation risk, check inlet conditions`);
    if (nu < 10) recs.push(`Low viscosity ${nu}cSt — increased leakage, poor film strength`);
    if (nu > 100) recs.push(`High viscosity ${nu}cSt — increased power loss, cavitation risk`);
    if (z % 2 === 0) recs.push(`Even piston count ${z} — higher flow ripple, prefer odd numbers`);
    if (recs.length === 0) recs.push(`Pump nominal — ${Vrev.toFixed(1)}cc/rev, ${Qactual.toFixed(1)}L/min, ηo=${(overallEff * 100).toFixed(0)}%`);

    return {
      displacement_cc_rev: mkAv(Math.round(Vrev * 10) / 10, "cc/rev", Vrev * 0.02, "zApS"),
      flow_rate_L_min: mkAv(Math.round(Qactual * 10) / 10, "L/min", Qactual * 0.03, "VN_eta"),
      volumetric_efficiency_pct: mkAv(Math.round(adjVolEff * 10) / 10, "%", adjVolEff * 0.02, "leakage_model"),
      mechanical_efficiency_pct: mkAv(Math.round(adjMechEff * 10) / 10, "%", adjMechEff * 0.02, "friction_model"),
      input_power_kW: mkAv(Math.round(inputPower * 100) / 100, "kW", inputPower * 0.05, "PQ_eta"),
      torque_Nm: mkAv(Math.round(torque * 10) / 10, "N·m", torque * 0.05, "P_omega"),
      flow_ripple_pct: mkAv(flowRipple, "%", flowRipple * 0.10, "kinematic"),
      case_drain_L_min: mkAv(Math.round(caseDrain * 100) / 100, "L/min", caseDrain * 0.20, "1-eta_v"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const axialPistonPumpEngine = new AxialPistonPumpEngine();
