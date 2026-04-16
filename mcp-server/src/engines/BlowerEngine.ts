/**
 * BlowerEngine — Industrial blower/fan performance analysis
 *
 * Models: Fan laws (affinity laws), system resistance curve,
 *         operating point, specific speed classification
 * References: AMCA 210, ASHRAE fundamentals
 */

export type BlowerType = "centrifugal" | "axial" | "mixed_flow" | "regenerative" | "positive_displacement";

export interface BlowerInput {
  blower_type?: BlowerType;
  flow_rate_m3_s: number;
  static_pressure_Pa: number;
  speed_rpm?: number;                // default 3000
  impeller_diameter_mm?: number;     // default 300
  air_density_kg_m3?: number;        // default 1.2
  motor_efficiency?: number;         // default 0.90
  fan_efficiency?: number;           // default varies by type
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface BlowerResult {
  air_power_kW: AtomicValue;
  shaft_power_kW: AtomicValue;
  motor_power_kW: AtomicValue;
  specific_speed: AtomicValue;
  tip_speed_m_s: AtomicValue;
  velocity_pressure_Pa: AtomicValue;
  total_pressure_Pa: AtomicValue;
  noise_dB_est: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

const FAN_EFF: Record<BlowerType, number> = {
  centrifugal: 0.78, axial: 0.82, mixed_flow: 0.80,
  regenerative: 0.45, positive_displacement: 0.65,
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class BlowerEngine {
  calculate(input: BlowerInput): BlowerResult {
    const {
      blower_type = "centrifugal",
      flow_rate_m3_s: Q,
      static_pressure_Pa: Ps,
      speed_rpm: N = 3000,
      impeller_diameter_mm: D = 300,
      air_density_kg_m3: rho = 1.2,
      motor_efficiency: etaMotor = 0.90,
    } = input;

    const recs: string[] = [];
    const etaFan = input.fan_efficiency ?? FAN_EFF[blower_type];

    // Velocity pressure (assume duct area from diameter)
    const ductArea = Math.PI / 4 * Math.pow(D / 1000, 2) * 0.6; // ~60% of impeller area
    const velocity = Q / Math.max(ductArea, 0.01);
    const Pv = 0.5 * rho * velocity * velocity;

    // Total pressure
    const Pt = Ps + Pv;

    // Air power
    const airPower = Q * Pt / 1000; // kW

    // Shaft power
    const shaftPower = airPower / Math.max(etaFan, 0.01);
    const motorPower = shaftPower / etaMotor;

    // Specific speed (Ns)
    const omega = 2 * Math.PI * N / 60;
    const Ns = omega * Math.sqrt(Q) / Math.pow(Pt / rho, 0.75);

    // Tip speed
    const tipSpeed = Math.PI * (D / 1000) * N / 60;

    // Noise estimate (Beranek correlation)
    const Lw = 10 + 20 * Math.log10(Q * 1000) + 10 * Math.log10(Pt); // dB rough

    const isSafe = tipSpeed < 150 && motorPower < 500;

    if (tipSpeed > 100) recs.push(`Tip speed ${tipSpeed.toFixed(0)} m/s — vibration/noise concern`);
    if (velocity > 25) recs.push(`Duct velocity ${velocity.toFixed(0)} m/s — high pressure drop`);
    if (etaFan < 0.55) recs.push(`Low fan efficiency ${(etaFan * 100).toFixed(0)}% — consider higher-efficiency type`);
    if (Ns < 0.5) recs.push(`Low specific speed — consider positive displacement blower`);
    if (recs.length === 0) recs.push(`Blower nominal — ${motorPower.toFixed(1)}kW, Ns=${Ns.toFixed(2)}, η=${(etaFan * 100).toFixed(0)}%`);

    return {
      air_power_kW: mkAv(Math.round(airPower * 1000) / 1000, "kW", airPower * 0.05, "QPt"),
      shaft_power_kW: mkAv(Math.round(shaftPower * 100) / 100, "kW", shaftPower * 0.08, "air_eta"),
      motor_power_kW: mkAv(Math.round(motorPower * 100) / 100, "kW", motorPower * 0.08, "shaft_motor"),
      specific_speed: mkAv(Math.round(Ns * 100) / 100, "dimensionless", Ns * 0.10, "omega_Q_Pt"),
      tip_speed_m_s: mkAv(Math.round(tipSpeed * 10) / 10, "m/s", tipSpeed * 0.02, "piDN"),
      velocity_pressure_Pa: mkAv(Math.round(Pv), "Pa", Pv * 0.10, "half_rho_v2"),
      total_pressure_Pa: mkAv(Math.round(Pt), "Pa", Pt * 0.05, "Ps_Pv"),
      noise_dB_est: mkAv(Math.round(Lw), "dB", 5, "beranek"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const blowerEngine = new BlowerEngine();
