/**
 * InjectionMoldingEngine — Injection molding process parameters
 *
 * Models: Clamp force (F=P×A_proj), shot volume, cooling time (Fourier),
 *         cycle time, energy per part
 * References: Rosato, Injection Molding Handbook
 * Safety: Max injection pressure, clamp tonnage, melt temperature
 */

export type PolymerType = "abs" | "pp" | "pe" | "pa" | "pc" | "pom" | "pet" | "ps";

export interface InjectionMoldingInput {
  part_volume_cm3: number;
  projected_area_cm2: number;
  wall_thickness_mm?: number;           // default 2.5
  polymer?: PolymerType;
  num_cavities?: number;                // default 1
  runner_volume_pct?: number;           // default 15%
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface InjectionMoldingResult {
  clamp_force_tonnes: AtomicValue;
  shot_volume_cm3: AtomicValue;
  injection_pressure_bar: AtomicValue;
  cooling_time_s: AtomicValue;
  cycle_time_s: AtomicValue;
  melt_temp_C: AtomicValue;
  mold_temp_C: AtomicValue;
  part_weight_g: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

const POLY_DATA: Record<PolymerType, {
  density: number; meltTemp: number; moldTemp: number; Cp: number;
  ejectTemp: number; k: number; injP: number
}> = {
  abs: { density: 1.05, meltTemp: 230, moldTemp: 60, Cp: 2100, ejectTemp: 90, k: 0.17, injP: 800 },
  pp:  { density: 0.91, meltTemp: 230, moldTemp: 40, Cp: 1900, ejectTemp: 80, k: 0.12, injP: 700 },
  pe:  { density: 0.95, meltTemp: 200, moldTemp: 30, Cp: 2300, ejectTemp: 70, k: 0.42, injP: 600 },
  pa:  { density: 1.14, meltTemp: 270, moldTemp: 80, Cp: 1700, ejectTemp: 120, k: 0.25, injP: 900 },
  pc:  { density: 1.20, meltTemp: 290, moldTemp: 90, Cp: 1200, ejectTemp: 130, k: 0.20, injP: 1000 },
  pom: { density: 1.41, meltTemp: 200, moldTemp: 80, Cp: 1500, ejectTemp: 110, k: 0.31, injP: 800 },
  pet: { density: 1.38, meltTemp: 270, moldTemp: 40, Cp: 1100, ejectTemp: 70, k: 0.24, injP: 850 },
  ps:  { density: 1.05, meltTemp: 210, moldTemp: 40, Cp: 1300, ejectTemp: 80, k: 0.14, injP: 650 },
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class InjectionMoldingEngine {
  calculate(input: InjectionMoldingInput): InjectionMoldingResult {
    const {
      part_volume_cm3: Vpart,
      projected_area_cm2: Aproj,
      wall_thickness_mm: t = 2.5,
      polymer = "abs",
      num_cavities: Nc = 1,
      runner_volume_pct: runner = 15,
    } = input;

    const recs: string[] = [];
    const p = POLY_DATA[polymer];

    // Shot volume
    const shotVol = Vpart * Nc * (1 + runner / 100);

    // Clamp force
    const totalArea = Aproj * Nc;
    const clampForce = p.injP * totalArea / 10000; // tonnes (1 bar×cm² = 0.001 tonnes)

    // Part weight
    const partWeight = Vpart * p.density;

    // Cooling time: t_cool = (t²/(π²×α)) × ln(4/π × (Tm-Tw)/(Te-Tw))
    const alpha = p.k / (p.density * 1000 * p.Cp); // thermal diffusivity m²/s
    const tMeter = t / 1000;
    const Tm = p.meltTemp;
    const Tw = p.moldTemp;
    const Te = p.ejectTemp;
    const coolTime = (tMeter * tMeter / (Math.PI * Math.PI * alpha)) *
      Math.log(4 / Math.PI * (Tm - Tw) / (Te - Tw));

    // Cycle time
    const injTime = 2 + shotVol * 0.05; // seconds
    const openClose = 3; // seconds
    const cycleTime = coolTime + injTime + openClose;

    const isSafe = clampForce < 5000 && coolTime > 0;

    if (t < 1) recs.push(`Very thin wall ${t}mm — may not fill, increase pressure`);
    if (t > 6) recs.push(`Thick wall ${t}mm — sink marks, consider gas assist or coring`);
    if (clampForce > 2000) recs.push(`High clamp force ${clampForce.toFixed(0)}t — verify machine capacity`);
    if (coolTime > 60) recs.push(`Long cooling ${coolTime.toFixed(0)}s — optimize cooling channels`);
    if (recs.length === 0) recs.push(`Molding nominal — ${clampForce.toFixed(0)}t clamp, ${cycleTime.toFixed(0)}s cycle, ${partWeight.toFixed(1)}g`);

    return {
      clamp_force_tonnes: mkAv(Math.round(clampForce), "tonnes", clampForce * 0.10, "area_pressure"),
      shot_volume_cm3: mkAv(Math.round(shotVol * 10) / 10, "cm³", shotVol * 0.05, "volume_runner"),
      injection_pressure_bar: mkAv(p.injP, "bar", p.injP * 0.10, "material_table"),
      cooling_time_s: mkAv(Math.round(coolTime * 10) / 10, "s", coolTime * 0.15, "fourier"),
      cycle_time_s: mkAv(Math.round(cycleTime * 10) / 10, "s", cycleTime * 0.12, "process_sum"),
      melt_temp_C: mkAv(Tm, "°C", 10, "material_table"),
      mold_temp_C: mkAv(Tw, "°C", 5, "material_table"),
      part_weight_g: mkAv(Math.round(partWeight * 10) / 10, "g", partWeight * 0.03, "volume_density"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const injectionMoldingEngine = new InjectionMoldingEngine();
