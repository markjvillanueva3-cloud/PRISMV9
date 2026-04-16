/**
 * PeristalticPumpEngine — Peristaltic (hose/tube) pump analysis
 *
 * Models: Displacement per revolution, pulsation, tube life,
 *         flow accuracy, suction capability, shear rate
 * References: Watson-Marlow engineering data, ISO 15783
 */

export type TubeMaterial = "silicone" | "norprene" | "pharmed" | "viton" | "tygon" | "PTFE";
export type PumpSize = "micro" | "small" | "medium" | "large" | "industrial";

export interface PeristalticPumpInput {
  tube_material?: TubeMaterial;
  pump_size?: PumpSize;
  tube_id_mm: number;
  tube_wall_mm?: number;              // default auto
  roller_count?: number;              // default 3
  rpm?: number;                       // default 100
  discharge_pressure_bar?: number;    // default 1
  fluid_viscosity_mPa_s?: number;    // default 1 (water)
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface PeristalticPumpResult {
  flow_rate_mL_min: AtomicValue;
  displacement_mL_rev: AtomicValue;
  pulsation_pct: AtomicValue;
  tube_life_hours: AtomicValue;
  max_suction_m: AtomicValue;
  shear_rate_1_s: AtomicValue;
  power_W: AtomicValue;
  accuracy_pct: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// Tube: [shore_hardness_A, max_pressure_bar, fatigue_cycles, chemical_resistance_0to1]
const TUBE_DATA: Record<TubeMaterial, [number, number, number, number]> = {
  silicone:  [50, 2, 200000, 0.5],
  norprene:  [55, 3, 500000, 0.8],
  pharmed:   [60, 3, 1000000, 0.9],
  viton:     [75, 4, 300000, 0.95],
  tygon:     [55, 2, 150000, 0.7],
  PTFE:      [65, 5, 400000, 1.0],
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class PeristalticPumpEngine {
  calculate(input: PeristalticPumpInput): PeristalticPumpResult {
    const {
      tube_material = "silicone",
      pump_size = "medium",
      tube_id_mm: ID,
      roller_count: nRollers = 3,
      rpm: N = 100,
      discharge_pressure_bar: Pd = 1,
      fluid_viscosity_mPa_s: mu = 1,
    } = input;

    const recs: string[] = [];
    const wall = input.tube_wall_mm ?? Math.max(ID * 0.3, 1.5);
    const [shore, Pmax, fatigueCycles, chemRes] = TUBE_DATA[tube_material];

    // Displacement per revolution
    // V/rev = nRollers × π × (ID/2)² × occlusion_length
    const occlusionLength = ID * 2; // mm typical
    const Vrev = nRollers * Math.PI * Math.pow(ID / 2, 2) * occlusionLength / 1000; // mL

    // Flow rate
    const flowRate = Vrev * N; // mL/min

    // Pressure correction (flow decreases with backpressure)
    const slipFactor = 1 - Pd / (Pmax * 2 + 0.001) * 0.15;
    const actualFlow = flowRate * slipFactor;

    // Pulsation (depends on number of rollers)
    const pulsation = 100 / nRollers; // % approximate

    // Tube life (fatigue cycles / occlusions per minute)
    const occlusionsPerMin = nRollers * N;
    const tubeLifeMin = fatigueCycles / occlusionsPerMin;
    const tubeLifeH = tubeLifeMin / 60;

    // Pressure effect on tube life
    const pressureLifeFactor = Math.pow(Pmax / (Pd + 0.1), 0.5);
    const adjTubeLife = tubeLifeH * Math.min(pressureLifeFactor, 2);

    // Suction capability
    const maxSuction = 8 * (shore / 60); // meters of water

    // Shear rate in tube
    const Qm3s = actualFlow / 1e6 / 60; // m³/s
    const Rm = ID / 2000; // m
    const shearRate = 4 * Qm3s / (Math.PI * Math.pow(Rm, 3));

    // Power
    const torque = Pd * 1e5 * Vrev / 1e6 / (2 * Math.PI) * nRollers; // N·m
    const power = torque * N * 2 * Math.PI / 60 + 2; // W (+2W friction baseline)

    // Accuracy (decreases with wear, pressure, viscosity)
    const accuracy = 100 - Pd * 2 - Math.log10(mu + 1) * 2 - N / 200;

    // Size modifier
    const sizeMod = pump_size === "micro" ? 0.1 : pump_size === "small" ? 0.5 :
      pump_size === "large" ? 2 : pump_size === "industrial" ? 5 : 1.0;

    const isSafe = Pd < Pmax && N < 300 && adjTubeLife > 100;

    if (Pd > Pmax * 0.8) recs.push(`Pressure ${Pd}bar near tube limit ${Pmax}bar — use higher-rated tube`);
    if (N > 200) recs.push(`High RPM ${N} — accelerated tube wear, reduce speed`);
    if (adjTubeLife < 500) recs.push(`Short tube life ${adjTubeLife.toFixed(0)}h — consider Pharmed tube`);
    if (pulsation > 40) recs.push(`High pulsation ${pulsation.toFixed(0)}% — add dampener or use more rollers`);
    if (mu > 100) recs.push(`Viscous fluid ${mu}mPa·s — flow accuracy reduced, calibrate`);
    if (recs.length === 0) recs.push(`Pump nominal — ${actualFlow.toFixed(1)}mL/min, ${pulsation.toFixed(0)}% pulse, life=${adjTubeLife.toFixed(0)}h`);

    return {
      flow_rate_mL_min: mkAv(Math.round(actualFlow * 10) / 10, "mL/min", actualFlow * 0.05, "displacement_rpm"),
      displacement_mL_rev: mkAv(Math.round(Vrev * 1000) / 1000, "mL/rev", Vrev * 0.05, "geometry"),
      pulsation_pct: mkAv(Math.round(pulsation * 10) / 10, "%", pulsation * 0.10, "100_n"),
      tube_life_hours: mkAv(Math.round(adjTubeLife), "h", adjTubeLife * 0.25, "fatigue_occlusion"),
      max_suction_m: mkAv(Math.round(maxSuction * 10) / 10, "m", maxSuction * 0.15, "shore_hardness"),
      shear_rate_1_s: mkAv(Math.round(shearRate), "1/s", shearRate * 0.10, "4Q_piR3"),
      power_W: mkAv(Math.round(power * 10) / 10, "W", power * 0.20, "torque_rpm"),
      accuracy_pct: mkAv(Math.round(accuracy * 10) / 10, "%", accuracy * 0.05, "empirical"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const peristalticPumpEngine = new PeristalticPumpEngine();
