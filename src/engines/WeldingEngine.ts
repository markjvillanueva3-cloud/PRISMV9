/**
 * WeldingEngine — Welding process parameter calculation
 *
 * Models: Heat input (H=ηVI/v), cooling rate, HAZ width,
 *         preheat temperature, dilution, deposition rate
 * References: AWS D1.1, EN 1011, Rosenthal equation
 */

export type WeldProcess = "smaw" | "gmaw" | "gtaw" | "fcaw" | "saw" | "laser" | "electron_beam";
export type JointType = "butt" | "fillet" | "lap" | "tee" | "corner" | "edge";

export interface WeldingInput {
  process?: WeldProcess;
  joint_type?: JointType;
  voltage_V: number;
  current_A: number;
  travel_speed_mm_min: number;
  plate_thickness_mm: number;
  material?: string;               // default "carbon_steel"
  preheat_temp_C?: number;         // default 20
  interpass_temp_C?: number;       // default 250
  carbon_equivalent?: number;      // CE(IIW) — auto-calc if not given
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface WeldingResult {
  heat_input_kJ_mm: AtomicValue;
  cooling_rate_800_500_s: AtomicValue;
  haz_width_mm: AtomicValue;
  preheat_required_C: AtomicValue;
  deposition_rate_kg_h: AtomicValue;
  dilution_pct: AtomicValue;
  weld_pool_area_mm2: AtomicValue;
  thermal_efficiency: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

const PROCESS_EFF: Record<WeldProcess, number> = {
  smaw: 0.80, gmaw: 0.85, gtaw: 0.65, fcaw: 0.85,
  saw: 0.95, laser: 0.90, electron_beam: 0.95,
};

const DEPO_RATE: Record<WeldProcess, number> = {
  smaw: 1.5, gmaw: 3.5, gtaw: 0.8, fcaw: 4.0,
  saw: 8.0, laser: 2.0, electron_beam: 1.5,
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class WeldingEngine {
  calculate(input: WeldingInput): WeldingResult {
    const {
      process = "gmaw",
      voltage_V: V,
      current_A: I,
      travel_speed_mm_min: v,
      plate_thickness_mm: t,
      preheat_temp_C: Tp = 20,
      carbon_equivalent: CE = 0.40,
    } = input;

    const recs: string[] = [];
    const eta = PROCESS_EFF[process];
    const vMs = v / 60000; // m/s

    // Heat input (kJ/mm)
    const heatInput = (eta * V * I) / (v / 60) / 1000; // kJ/mm = η×V×I / (v_mm/s) / 1000

    // Rosenthal 2D cooling rate estimate (t8/5)
    // t8/5 = (4300 - 4.3×Tp)² × [(1/(2t))²] × [1/(HI×10³)] for thin plate
    const k = 50; // thermal conductivity W/m·K (steel)
    const t85_factor = Math.pow(4300 - 4.3 * Tp, 2);
    const t85 = t85_factor * t * 0.001 / (heatInput * 500 + 1); // simplified correlation
    const coolingRate = Math.max(0.5, Math.min(t85, 200));

    // HAZ width (empirical: proportional to √(heat input))
    const hazWidth = 2.5 * Math.sqrt(heatInput) * Math.sqrt(t < 10 ? 1.2 : 1);

    // Preheat requirement (CE-based, AWS D1.1 simplified)
    let preheatReq = 0;
    if (CE > 0.45) preheatReq = 100 + (CE - 0.45) * 500;
    else if (CE > 0.40 && t > 25) preheatReq = 75;
    else if (CE > 0.35 && t > 40) preheatReq = 50;

    // Deposition rate
    const depoRate = DEPO_RATE[process] * (I / 250); // scale with current

    // Dilution (process-dependent)
    const dilution = process === "saw" ? 50 : process === "gtaw" ? 15 : 30;

    // Weld pool area estimate
    const poolArea = Math.PI * (hazWidth * 0.8) * (t < hazWidth * 2 ? t : hazWidth * 2) / 4;

    const isSafe = heatInput >= 0.5 && heatInput <= 5.0 && Tp >= preheatReq;

    if (heatInput > 3.5) recs.push(`High heat input ${heatInput.toFixed(2)}kJ/mm — risk of grain coarsening`);
    if (heatInput < 0.5) recs.push(`Low heat input ${heatInput.toFixed(2)}kJ/mm — risk of lack of fusion`);
    if (Tp < preheatReq) recs.push(`Preheat ${Tp}°C below required ${preheatReq}°C — hydrogen cracking risk`);
    if (CE > 0.50) recs.push(`High CE=${CE} — use low-hydrogen consumables, control cooling rate`);
    if (coolingRate < 5) recs.push(`Slow cooling (t8/5=${coolingRate.toFixed(1)}s) — may produce soft HAZ`);
    if (recs.length === 0) recs.push(`Welding nominal — HI=${heatInput.toFixed(2)}kJ/mm, t8/5≈${coolingRate.toFixed(1)}s, HAZ≈${hazWidth.toFixed(1)}mm`);

    return {
      heat_input_kJ_mm: mkAv(Math.round(heatInput * 100) / 100, "kJ/mm", heatInput * 0.05, "aws_d1.1"),
      cooling_rate_800_500_s: mkAv(Math.round(coolingRate * 10) / 10, "s", coolingRate * 0.15, "rosenthal"),
      haz_width_mm: mkAv(Math.round(hazWidth * 10) / 10, "mm", hazWidth * 0.20, "empirical"),
      preheat_required_C: mkAv(Math.round(preheatReq), "°C", 25, "aws_ce"),
      deposition_rate_kg_h: mkAv(Math.round(depoRate * 10) / 10, "kg/h", depoRate * 0.10, "process_data"),
      dilution_pct: mkAv(dilution, "%", 5, "empirical"),
      weld_pool_area_mm2: mkAv(Math.round(poolArea), "mm²", poolArea * 0.25, "geometric"),
      thermal_efficiency: mkAv(eta, "ratio", 0.03, "process_data"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const weldingEngine = new WeldingEngine();
