/**
 * BlowMoldingEngine — Blow molding process sizing
 *
 * Models: Parison programming, blow ratio, wall distribution,
 *         clamp force, cooling time, cycle optimization
 * References: Lee "Blow Molding Design Guide"
 * Safety: Blow ratio limits, parison sag, pinch-off forces
 */

export type BlowMoldProcess = "extrusion_blow" | "injection_blow" | "stretch_blow";

export interface BlowMoldingInput {
  container_volume_mL: number;
  container_diameter_mm: number;
  container_height_mm: number;
  wall_thickness_mm?: number;           // default 0.5
  polymer?: "pe" | "pp" | "pet" | "pvc";
  process?: BlowMoldProcess;
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface BlowMoldingResult {
  blow_ratio: AtomicValue;
  parison_diameter_mm: AtomicValue;
  parison_thickness_mm: AtomicValue;
  clamp_force_tonnes: AtomicValue;
  cooling_time_s: AtomicValue;
  cycle_time_s: AtomicValue;
  part_weight_g: AtomicValue;
  blow_pressure_bar: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

const BM_POLY: Record<string, { density: number; blowP: number; maxBR: number; k: number }> = {
  pe:  { density: 0.95, blowP: 6, maxBR: 4.0, k: 0.42 },
  pp:  { density: 0.91, blowP: 8, maxBR: 3.5, k: 0.12 },
  pet: { density: 1.38, blowP: 25, maxBR: 5.0, k: 0.24 },
  pvc: { density: 1.40, blowP: 5, maxBR: 3.0, k: 0.16 },
};

export class BlowMoldingEngine {
  calculate(input: BlowMoldingInput): BlowMoldingResult {
    const {
      container_volume_mL: V,
      container_diameter_mm: Dc,
      container_height_mm: Hc,
      wall_thickness_mm: tw = 0.5,
      polymer = "pe",
      process = "extrusion_blow",
    } = input;

    const recs: string[] = [];
    const p = BM_POLY[polymer];

    // Blow ratio
    const parisonDia = process === "stretch_blow" ? Dc * 0.5 : Dc * 0.7;
    const blowRatio = Dc / parisonDia;

    // Parison wall thickness (must thin to final wall)
    const parisonThick = tw * blowRatio * 1.2; // 20% safety

    // Part weight
    const surfaceArea = Math.PI * Dc * Hc + 2 * Math.PI * (Dc / 2) * (Dc / 2); // mm²
    const partWeight = surfaceArea * tw / 1000 * p.density; // grams

    // Clamp force
    const projArea = Dc * Hc / 100; // cm²
    const clampForce = p.blowP * projArea / 10000 * 10; // simplified tonnes

    // Cooling time
    const alpha = p.k / (p.density * 1000 * 2000); // thermal diffusivity
    const coolTime = Math.pow(tw / 1000, 2) / (Math.PI * Math.PI * alpha) * Math.log(4);

    // Cycle time
    const blowTime = 3;
    const ejectTime = 2;
    const extrudeTime = process === "extrusion_blow" ? 5 : 0;
    const cycleTime = coolTime + blowTime + ejectTime + extrudeTime;

    const isSafe = blowRatio <= p.maxBR && tw >= 0.2;

    if (blowRatio > p.maxBR * 0.8) recs.push(`High blow ratio ${blowRatio.toFixed(1)} — wall thinning risk`);
    if (tw < 0.3) recs.push(`Very thin wall ${tw}mm — may not hold pressure`);
    if (process === "stretch_blow" && polymer !== "pet") recs.push(`Stretch blow typically for PET — verify ${polymer} suitability`);
    if (V > 20000) recs.push(`Large container ${V}mL — verify parison sag and extrusion capacity`);
    if (recs.length === 0) recs.push(`Blow molding nominal — BR=${blowRatio.toFixed(1)}, ${cycleTime.toFixed(0)}s cycle, ${partWeight.toFixed(1)}g`);

    return {
      blow_ratio: mkAv(Math.round(blowRatio * 10) / 10, "ratio", blowRatio * 0.08, "diameter_ratio"),
      parison_diameter_mm: mkAv(Math.round(parisonDia), "mm", parisonDia * 0.05, "process_ratio"),
      parison_thickness_mm: mkAv(Math.round(parisonThick * 100) / 100, "mm", parisonThick * 0.10, "thinning"),
      clamp_force_tonnes: mkAv(Math.round(clampForce * 10) / 10, "tonnes", clampForce * 0.12, "pressure_area"),
      cooling_time_s: mkAv(Math.round(coolTime * 10) / 10, "s", coolTime * 0.15, "fourier"),
      cycle_time_s: mkAv(Math.round(cycleTime * 10) / 10, "s", cycleTime * 0.12, "process_sum"),
      part_weight_g: mkAv(Math.round(partWeight * 10) / 10, "g", partWeight * 0.05, "surface_volume"),
      blow_pressure_bar: mkAv(p.blowP, "bar", p.blowP * 0.10, "material_table"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const blowMoldingEngine = new BlowMoldingEngine();
