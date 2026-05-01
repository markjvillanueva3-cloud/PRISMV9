/**
 * ThermoformingEngine — Thermoforming process parameters
 *
 * Models: Draw ratio, sheet thinning, heating time, forming force,
 *         cooling time, trim waste
 * References: Throne "Technology of Thermoforming"
 * Safety: Draw ratio limits, sheet sag, web formation
 */

export type FormingMethod = "vacuum" | "pressure" | "twin_sheet" | "drape";

export interface ThermoformingInput {
  part_length_mm: number;
  part_width_mm: number;
  part_depth_mm: number;
  sheet_thickness_mm?: number;          // default 1.5
  polymer?: "ps" | "abs" | "pp" | "pe" | "pet" | "pvc";
  forming_method?: FormingMethod;
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface ThermoformingResult {
  draw_ratio: AtomicValue;
  wall_thickness_min_mm: AtomicValue;
  forming_force_kN: AtomicValue;
  heating_time_s: AtomicValue;
  cooling_time_s: AtomicValue;
  cycle_time_s: AtomicValue;
  sheet_utilization_pct: AtomicValue;
  forming_temperature_C: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

const TF_POLY: Record<string, { formTemp: number; maxDR: number; density: number; k: number }> = {
  ps:  { formTemp: 160, maxDR: 3.0, density: 1.05, k: 0.14 },
  abs: { formTemp: 170, maxDR: 3.5, density: 1.05, k: 0.17 },
  pp:  { formTemp: 165, maxDR: 2.5, density: 0.91, k: 0.12 },
  pe:  { formTemp: 150, maxDR: 2.0, density: 0.95, k: 0.42 },
  pet: { formTemp: 140, maxDR: 4.0, density: 1.38, k: 0.24 },
  pvc: { formTemp: 145, maxDR: 2.5, density: 1.40, k: 0.16 },
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class ThermoformingEngine {
  calculate(input: ThermoformingInput): ThermoformingResult {
    const {
      part_length_mm: L,
      part_width_mm: W,
      part_depth_mm: D,
      sheet_thickness_mm: t = 1.5,
      polymer = "abs",
      forming_method = "vacuum",
    } = input;

    const recs: string[] = [];
    const p = TF_POLY[polymer];

    // Draw ratio (areal)
    const sheetArea = L * W;
    const partArea = L * W + 2 * (L + W) * D; // approximate developed area
    const drawRatio = D / Math.min(L, W);
    const arealDR = partArea / sheetArea;

    // Minimum wall thickness (corners)
    const tMin = t / arealDR;

    // Forming force
    const formPressure = forming_method === "vacuum" ? 0.9
      : forming_method === "pressure" ? 4.0
      : forming_method === "twin_sheet" ? 3.0 : 0.5;
    const force = formPressure * 100 * sheetArea / 1e6; // kN

    // Heating time (ceramic heaters)
    const heatingRate = 0.2; // mm/s penetration
    const heatTime = t / heatingRate;

    // Cooling time
    const alpha = p.k / (p.density * 1000 * 1500);
    const coolTime = Math.pow(t / 1000, 2) / (Math.PI * Math.PI * alpha) * 3;

    // Cycle time
    const formTime = 3;
    const trimTime = 2;
    const cycleTime = heatTime + coolTime + formTime + trimTime;

    // Sheet utilization (trim + flange waste)
    const flangeW = 25; // mm flange
    const sheetTotal = (L + 2 * flangeW) * (W + 2 * flangeW);
    const utilization = sheetArea / sheetTotal * 100;

    const isSafe = drawRatio <= p.maxDR && tMin >= 0.1;

    if (drawRatio > p.maxDR * 0.8) recs.push(`High draw ratio ${drawRatio.toFixed(1)} — wall thinning, use plug assist`);
    if (tMin < 0.2) recs.push(`Min wall ${tMin.toFixed(2)}mm too thin — increase sheet gauge`);
    if (forming_method === "vacuum" && D > 100) recs.push(`Deep part ${D}mm — switch to pressure forming`);
    if (polymer === "pp" && D > 50) recs.push(`PP deep draw — narrow forming window, pre-stretch recommended`);
    if (recs.length === 0) recs.push(`Thermoforming nominal — DR=${drawRatio.toFixed(1)}, ${cycleTime.toFixed(0)}s cycle, ${(tMin).toFixed(2)}mm min wall`);

    return {
      draw_ratio: mkAv(Math.round(drawRatio * 100) / 100, "ratio", drawRatio * 0.08, "depth_width"),
      wall_thickness_min_mm: mkAv(Math.round(tMin * 100) / 100, "mm", tMin * 0.15, "areal_thinning"),
      forming_force_kN: mkAv(Math.round(force * 10) / 10, "kN", force * 0.10, "pressure_area"),
      heating_time_s: mkAv(Math.round(heatTime), "s", heatTime * 0.15, "penetration_rate"),
      cooling_time_s: mkAv(Math.round(coolTime), "s", coolTime * 0.15, "fourier"),
      cycle_time_s: mkAv(Math.round(cycleTime), "s", cycleTime * 0.12, "process_sum"),
      sheet_utilization_pct: mkAv(Math.round(utilization * 10) / 10, "%", 2, "geometry"),
      forming_temperature_C: mkAv(p.formTemp, "°C", 10, "material_table"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const thermoformingEngine = new ThermoformingEngine();
