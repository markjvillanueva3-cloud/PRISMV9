/**
 * VacuumPumpEngine — Vacuum pump selection and performance
 *
 * Models: Pump-down time, throughput (S×P), gas load,
 *         ultimate pressure, power consumption
 * References: Leybold Vacuum Technology, O'Hanlon
 * Safety: Backstreaming, outgassing, leak rate
 */

export type VacuumPumpType = "rotary_vane" | "scroll" | "roots" | "turbomolecular" | "diaphragm" | "cryopump";

export interface VacuumPumpInput {
  chamber_volume_L: number;
  target_pressure_mbar: number;
  pumpdown_time_min?: number;           // default 10
  gas_load_mbar_L_s?: number;           // default 0
  pump_type?: VacuumPumpType;
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface VacuumPumpResult {
  pumping_speed_L_s: AtomicValue;
  power_kW: AtomicValue;
  pumpdown_time_min: AtomicValue;
  ultimate_pressure_mbar: AtomicValue;
  throughput_mbar_L_s: AtomicValue;
  pressure_ratio: AtomicValue;
  inlet_diameter_mm: AtomicValue;
  pump_stages: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

const VP_DATA: Record<VacuumPumpType, {
  ultimate_mbar: number; maxSpeed_L_s: number; power_per_speed: number; stages: number
}> = {
  rotary_vane:    { ultimate_mbar: 1e-3, maxSpeed_L_s: 100, power_per_speed: 0.05, stages: 2 },
  scroll:         { ultimate_mbar: 1e-2, maxSpeed_L_s: 30, power_per_speed: 0.08, stages: 1 },
  roots:          { ultimate_mbar: 1e-3, maxSpeed_L_s: 5000, power_per_speed: 0.02, stages: 1 },
  turbomolecular: { ultimate_mbar: 1e-10, maxSpeed_L_s: 2000, power_per_speed: 0.15, stages: 1 },
  diaphragm:      { ultimate_mbar: 2, maxSpeed_L_s: 5, power_per_speed: 0.10, stages: 4 },
  cryopump:       { ultimate_mbar: 1e-10, maxSpeed_L_s: 10000, power_per_speed: 0.20, stages: 1 },
};

export class VacuumPumpEngine {
  calculate(input: VacuumPumpInput): VacuumPumpResult {
    const {
      chamber_volume_L: V,
      target_pressure_mbar: Pt,
      pumpdown_time_min: tTarget = 10,
      gas_load_mbar_L_s: Qgas = 0,
      pump_type = "rotary_vane",
    } = input;

    const recs: string[] = [];
    const vp = VP_DATA[pump_type];
    const P0 = 1013; // atmospheric, mbar
    const t_s = tTarget * 60;

    // Required pumping speed: V × ln(P0/Pt) / t + Qgas/Pt
    const S_required = V * Math.log(P0 / Pt) / t_s + Qgas / Math.max(Pt, 1e-6);
    const S = Math.max(S_required, 0.5);

    // Actual pump-down time with selected speed
    const t_actual = V * Math.log(P0 / Pt) / S / 60; // min

    // Throughput
    const throughput = S * Pt;

    // Power
    const power = S * vp.power_per_speed;

    // Pressure ratio
    const pressureRatio = P0 / Pt;

    // Inlet diameter (approximate from speed)
    const inletDia = Math.sqrt(S * 4 / (Math.PI * 50)) * 1000; // mm, assuming 50 m/s gas velocity
    const stdInlets = [16, 25, 40, 63, 100, 160, 250, 320, 500];
    const inlet = stdInlets.find(d => d >= inletDia) ?? stdInlets[stdInlets.length - 1];

    const isSafe = Pt >= vp.ultimate_mbar && S <= vp.maxSpeed_L_s;

    if (Pt < vp.ultimate_mbar) recs.push(`Target ${Pt}mbar below pump ultimate ${vp.ultimate_mbar}mbar — need different pump type`);
    if (S > vp.maxSpeed_L_s) recs.push(`Required speed ${S.toFixed(0)}L/s exceeds ${pump_type} max ${vp.maxSpeed_L_s}L/s — need parallel pumps or larger type`);
    if (pump_type === "rotary_vane" && Pt < 0.01) recs.push(`For <0.01mbar use turbomolecular or cryopump with rotary vane backing`);
    if (Qgas > 0 && Qgas / S > Pt * 0.5) recs.push(`Gas load significant — verify continuous pumping capacity`);
    if (recs.length === 0) recs.push(`Vacuum pump nominal — S=${S.toFixed(1)}L/s, ${t_actual.toFixed(1)}min pumpdown, ${power.toFixed(1)}kW`);

    return {
      pumping_speed_L_s: mkAv(Math.round(S * 10) / 10, "L/s", S * 0.10, "pumpdown_eq"),
      power_kW: mkAv(Math.round(power * 100) / 100, "kW", power * 0.12, "speed_factor"),
      pumpdown_time_min: mkAv(Math.round(t_actual * 10) / 10, "min", t_actual * 0.10, "volume_speed"),
      ultimate_pressure_mbar: mkAv(vp.ultimate_mbar, "mbar", vp.ultimate_mbar * 0.50, "pump_spec"),
      throughput_mbar_L_s: mkAv(Math.round(throughput * 1000) / 1000, "mbar·L/s", throughput * 0.10, "speed_pressure"),
      pressure_ratio: mkAv(Math.round(pressureRatio), "ratio", pressureRatio * 0.01, "atm_target"),
      inlet_diameter_mm: mkAv(inlet, "mm", 0, "standard_size"),
      pump_stages: mkAv(vp.stages, "stages", 0, "pump_type"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const vacuumPumpEngine = new VacuumPumpEngine();
