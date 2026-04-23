/**
 * PowderCompactionEngine — Powder metallurgy compaction analysis
 *
 * Models: Heckel equation (ln(1/(1-D))=kP+A), pressure-density,
 *         ejection force, die wall friction, spring-back
 * References: Heckel 1961, MPIF Standard 35
 */

export type PowderMaterial = "iron" | "copper" | "aluminum" | "tungsten_carbide" | "stainless" | "titanium";
export type CompactionType = "single_action" | "double_action" | "isostatic" | "rotary";

export interface PowderCompactionInput {
  material?: PowderMaterial;
  compaction_type?: CompactionType;
  part_diameter_mm: number;
  part_height_mm: number;
  target_density_pct?: number;        // % of theoretical, default 90
  fill_depth_ratio?: number;          // fill/part ratio, default 2.5
  die_wall_friction?: number;         // µ, default 0.15
  lubricant_pct?: number;            // wt%, default 0.75
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface PowderCompactionResult {
  compaction_pressure_MPa: AtomicValue;
  press_force_kN: AtomicValue;
  ejection_force_kN: AtomicValue;
  compression_ratio: AtomicValue;
  green_density_g_cm3: AtomicValue;
  spring_back_pct: AtomicValue;
  fill_depth_mm: AtomicValue;
  density_gradient_pct: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// Material data: [theoretical_density_g/cm3, heckel_k_1/MPa, apparent_density_ratio, yield_MPa]
const POWDER_DATA: Record<PowderMaterial, [number, number, number, number]> = {
  iron:             [7.87, 0.005, 0.30, 200],
  copper:           [8.96, 0.008, 0.28, 150],
  aluminum:         [2.70, 0.012, 0.35, 100],
  tungsten_carbide: [15.6, 0.002, 0.25, 800],
  stainless:        [7.98, 0.004, 0.28, 250],
  titanium:         [4.51, 0.003, 0.25, 300],
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class PowderCompactionEngine {
  calculate(input: PowderCompactionInput): PowderCompactionResult {
    const {
      material = "iron",
      compaction_type = "double_action",
      part_diameter_mm: D,
      part_height_mm: H,
      target_density_pct: targetD = 90,
      fill_depth_ratio = 2.5,
      die_wall_friction: mu = 0.15,
      lubricant_pct = 0.75,
    } = input;

    const recs: string[] = [];
    const [rhoTheo, k, apparentRatio, yieldStr] = POWDER_DATA[material];

    const targetRho = targetD / 100;

    // Heckel equation: P = ln(1/(1-D)) / k - A/k
    // Simplified: P ≈ -ln(1-targetRho) / k
    const P = -Math.log(1 - targetRho) / k;

    // Die friction adjustment
    const frictionFactor = compaction_type === "double_action" ? 1.0 :
      compaction_type === "isostatic" ? 0.8 : 1.3;
    const Peff = P * frictionFactor * (1 + mu * 4 * H / D * 0.5);

    // Press force
    const area_mm2 = Math.PI / 4 * D * D;
    const force = Peff * area_mm2 / 1000; // kN

    // Ejection force
    const sideArea = Math.PI * D * H;
    const ejectionForce = mu * Peff * sideArea / (area_mm2 + 1) * area_mm2 / 1000 * 0.3;

    // Compression ratio
    const compressionRatio = 1 / apparentRatio * targetRho;
    const fillDepth = H * fill_depth_ratio;

    // Green density
    const greenDensity = rhoTheo * targetRho;

    // Spring-back
    const springBack = (1 - lubricant_pct / 100) * 0.3 + 0.1; // %

    // Density gradient (worse for single action, tall parts)
    const hd = H / D;
    const gradient = compaction_type === "single_action" ? hd * 5 :
      compaction_type === "double_action" ? hd * 2.5 : hd * 1;

    const isSafe = Peff < 1000 && hd < 4 && targetD < 98;

    if (hd > 2) recs.push(`H/D ratio ${hd.toFixed(1)} > 2 — density gradient risk, use double-action`);
    if (targetD > 95) recs.push(`High density target ${targetD}% — consider re-pressing or HIP`);
    if (Peff > 800) recs.push(`High pressure ${Peff.toFixed(0)}MPa — die wear concern`);
    if (lubricant_pct < 0.5) recs.push(`Low lubricant ${lubricant_pct}% — ejection/scoring risk`);
    if (gradient > 5) recs.push(`Density gradient ${gradient.toFixed(1)}% — use multi-level tooling`);
    if (recs.length === 0) recs.push(`Compaction nominal — ${Peff.toFixed(0)}MPa, ${force.toFixed(0)}kN, ρ=${greenDensity.toFixed(2)}g/cm³`);

    return {
      compaction_pressure_MPa: mkAv(Math.round(Peff), "MPa", Peff * 0.10, "heckel"),
      press_force_kN: mkAv(Math.round(force * 10) / 10, "kN", force * 0.10, "PA"),
      ejection_force_kN: mkAv(Math.round(ejectionForce * 10) / 10, "kN", ejectionForce * 0.20, "friction"),
      compression_ratio: mkAv(Math.round(compressionRatio * 100) / 100, "ratio", compressionRatio * 0.05, "density_ratio"),
      green_density_g_cm3: mkAv(Math.round(greenDensity * 100) / 100, "g/cm³", greenDensity * 0.05, "target"),
      spring_back_pct: mkAv(Math.round(springBack * 100) / 100, "%", springBack * 0.20, "elastic"),
      fill_depth_mm: mkAv(Math.round(fillDepth * 10) / 10, "mm", fillDepth * 0.05, "ratio"),
      density_gradient_pct: mkAv(Math.round(gradient * 10) / 10, "%", gradient * 0.25, "HD_type"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const powderCompactionEngine = new PowderCompactionEngine();
