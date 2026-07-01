/**
 * AirCompressorEngine — Compressed air system sizing
 *
 * Models: Polytropic compression, FAD (Free Air Delivery),
 *         receiver sizing, specific power, multi-stage intercooling
 * References: CAGI, Compressed Air & Gas Institute
 * Safety: Discharge temperature, pressure relief, moisture
 */

export type CompressorType = "reciprocating" | "rotary_screw" | "centrifugal" | "scroll";

export interface AirCompressorInput {
  air_demand_m3_min: number;            // FAD at atmospheric
  discharge_pressure_bar?: number;       // default 7
  inlet_temp_C?: number;                // default 20
  compressor_type?: CompressorType;
  num_stages?: number;                  // auto-selected
  duty_cycle_pct?: number;              // default 75
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface AirCompressorResult {
  shaft_power_kW: AtomicValue;
  motor_power_kW: AtomicValue;
  specific_power_kW_m3_min: AtomicValue;
  discharge_temp_C: AtomicValue;
  receiver_volume_L: AtomicValue;
  compression_ratio: AtomicValue;
  volumetric_efficiency_pct: AtomicValue;
  moisture_removal_L_h: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class AirCompressorEngine {
  calculate(input: AirCompressorInput): AirCompressorResult {
    const {
      air_demand_m3_min: FAD,
      discharge_pressure_bar: Pd = 7,
      inlet_temp_C: Ti = 20,
      compressor_type = "rotary_screw",
      duty_cycle_pct = 75,
    } = input;

    const recs: string[] = [];
    const P1 = 1.013; // bar atmospheric
    const P2 = Pd + P1; // absolute
    const T1 = Ti + 273.15;
    const r = P2 / P1; // compression ratio

    // Auto-select stages
    let stages = input.num_stages;
    if (!stages) {
      stages = r <= 4 ? 1 : r <= 16 ? 2 : 3;
    }
    const r_stage = Math.pow(r, 1 / stages);

    // Polytropic exponent
    const n = compressor_type === "reciprocating" ? 1.3
      : compressor_type === "rotary_screw" ? 1.35
      : compressor_type === "centrifugal" ? 1.38 : 1.25;

    // Polytropic power per stage: P = (n/(n-1)) × P1 × V1 × ((P2/P1)^((n-1)/n) - 1)
    const V1 = FAD / 60; // m³/s
    const powerPerStage = (n / (n - 1)) * P1 * 1e5 * V1 * (Math.pow(r_stage, (n - 1) / n) - 1) / 1000;
    const totalPower = powerPerStage * stages; // kW (with intercooling)

    // Volumetric efficiency (reciprocating)
    const etaV = compressor_type === "reciprocating"
      ? 0.96 - 0.04 * r_stage : 0.95;

    // Mechanical/overall efficiency
    const etaM = compressor_type === "rotary_screw" ? 0.88
      : compressor_type === "centrifugal" ? 0.82 : 0.85;
    const shaftPower = totalPower / etaM;

    // Motor sizing (next standard motor)
    const stdMotors = [0.75, 1.1, 1.5, 2.2, 3, 4, 5.5, 7.5, 11, 15, 18.5, 22, 30, 37, 45, 55, 75, 90, 110, 132, 160, 200, 250, 315];
    const motorPower = stdMotors.find(m => m >= shaftPower * 1.1) ?? Math.ceil(shaftPower * 1.1);

    // Specific power
    const specificPower = shaftPower / FAD;

    // Discharge temperature (per stage, with intercooling to T1+10 between stages)
    const T2_stage = T1 * Math.pow(r_stage, (n - 1) / n);
    const Td = T2_stage - 273.15;

    // Receiver: V = Q × t / ΔP (rule of thumb: 3-5× FAD in liters)
    const receiver = FAD * 1000 * 3 / (duty_cycle_pct / 100); // liters

    // Moisture removal (simplified psychrometric)
    const moistureIn = FAD * 60 * 0.008; // kg/h at 50% RH, 20°C
    const moistureOut = moistureIn * P1 / P2;
    const moistureRemoved = (moistureIn - moistureOut) / 1 * 1000; // mL/h → L/h

    const isSafe = Td < 200 && specificPower < 10;

    if (Td > 180) recs.push(`High discharge temp ${Td.toFixed(0)}°C — add aftercooler or intercooler`);
    if (specificPower > 7) recs.push(`High specific power ${specificPower.toFixed(1)}kW/m³/min — consider more efficient type`);
    if (r > 10 && stages === 1) recs.push(`High compression ratio ${r.toFixed(1)} — use multi-stage`);
    if (compressor_type === "reciprocating" && FAD > 5) recs.push(`Large demand ${FAD}m³/min — consider rotary screw`);
    if (recs.length === 0) recs.push(`Compressor nominal — ${motorPower}kW motor, ${specificPower.toFixed(1)}kW/m³/min, ${receiver.toFixed(0)}L receiver`);

    return {
      shaft_power_kW: mkAv(Math.round(shaftPower * 10) / 10, "kW", shaftPower * 0.08, "polytropic"),
      motor_power_kW: mkAv(motorPower, "kW", 0, "standard_motor"),
      specific_power_kW_m3_min: mkAv(Math.round(specificPower * 100) / 100, "kW/m³/min", specificPower * 0.08, "power_flow"),
      discharge_temp_C: mkAv(Math.round(Td), "°C", Td * 0.08, "polytropic"),
      receiver_volume_L: mkAv(Math.round(receiver), "L", receiver * 0.15, "rule_of_thumb"),
      compression_ratio: mkAv(Math.round(r * 100) / 100, "ratio", r * 0.01, "pressure_ratio"),
      volumetric_efficiency_pct: mkAv(Math.round(etaV * 1000) / 10, "%", 2, "clearance"),
      moisture_removal_L_h: mkAv(Math.round(moistureRemoved * 10) / 10, "L/h", moistureRemoved * 0.20, "psychrometric"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const airCompressorEngine = new AirCompressorEngine();
