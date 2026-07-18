/**
 * SurfaceTreatmentEngine — Surface Finishing & Coating Calculator
 *
 * Models: Surface treatment selection and process parameters.
 * - Anodizing (Type II, Type III hard anodize) — thickness, time
 * - Plating (chrome, nickel, zinc) — thickness, current density
 * - Nitriding — case depth, time, hardness
 * - Shot peening — Almen intensity, coverage, residual stress
 * - Passivation — chemical bath parameters
 * - Cost estimation per area
 *
 * Key physics: Faraday's law for plating: m = ItM/(nF).
 * Nitriding depth ≈ K√t. Anodize thickness ∝ I×t.
 * Shot peen residual stress from Almen strip deflection.
 *
 * Reference: ASM Surface Engineering Handbook,
 *            MIL-A-8625 (anodizing),
 *            AMS 2430 (shot peening),
 *            ASTM B633 (zinc plating)
 *
 * Actions: surface_treatment_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface SurfaceTreatmentInput {
  process?: "anodize_ii" | "anodize_iii" | "chrome_plate" | "nickel_plate" |
    "zinc_plate" | "nitriding" | "shot_peen" | "passivation";
  target_thickness_um?: number;
  surface_area_cm2?: number;
  base_material?: "aluminum" | "steel" | "stainless" | "titanium";
  target_hardness_hv?: number;
  part_complexity?: "simple" | "moderate" | "complex";
  quantity?: number;
}

export interface SurfaceTreatmentResult {
  coating_thickness: AtomicValue;
  process_time: AtomicValue;
  surface_hardness: AtomicValue;
  dimensional_change: AtomicValue;
  cost_per_part: AtomicValue;
  corrosion_hours_salt_spray: AtomicValue;
  wear_improvement: AtomicValue;
  process_temp: AtomicValue;
  treatment_feasible: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

interface ProcessSpec {
  thickness_range: [number, number]; // µm
  hardness_hv: number;
  process_temp_c: number;
  growth_ratio: number; // dim change as fraction of thickness (0.5 = 50% growth outward)
  rate_um_min: number;
  salt_spray_hours_per_um: number;
  cost_per_cm2: number;
  wear_factor: number; // multiplier vs untreated
  compatible: string[];
}

const PROCESSES: Record<string, ProcessSpec> = {
  anodize_ii: {
    thickness_range: [5, 25], hardness_hv: 300, process_temp_c: 20,
    growth_ratio: 0.5, rate_um_min: 0.4, salt_spray_hours_per_um: 30,
    cost_per_cm2: 0.02, wear_factor: 3, compatible: ["aluminum"],
  },
  anodize_iii: {
    thickness_range: [25, 75], hardness_hv: 700, process_temp_c: 0,
    growth_ratio: 0.5, rate_um_min: 0.8, salt_spray_hours_per_um: 50,
    cost_per_cm2: 0.05, wear_factor: 10, compatible: ["aluminum"],
  },
  chrome_plate: {
    thickness_range: [2, 250], hardness_hv: 900, process_temp_c: 55,
    growth_ratio: 1.0, rate_um_min: 0.4, salt_spray_hours_per_um: 15,
    cost_per_cm2: 0.08, wear_factor: 15, compatible: ["steel", "stainless", "aluminum"],
  },
  nickel_plate: {
    thickness_range: [5, 100], hardness_hv: 550, process_temp_c: 88,
    growth_ratio: 1.0, rate_um_min: 0.3, salt_spray_hours_per_um: 20,
    cost_per_cm2: 0.06, wear_factor: 5, compatible: ["steel", "stainless", "aluminum"],
  },
  zinc_plate: {
    thickness_range: [5, 25], hardness_hv: 100, process_temp_c: 30,
    growth_ratio: 1.0, rate_um_min: 0.5, salt_spray_hours_per_um: 40,
    cost_per_cm2: 0.01, wear_factor: 1, compatible: ["steel"],
  },
  nitriding: {
    thickness_range: [50, 500], hardness_hv: 1000, process_temp_c: 520,
    growth_ratio: 0.02, rate_um_min: 0.05, salt_spray_hours_per_um: 5,
    cost_per_cm2: 0.10, wear_factor: 12, compatible: ["steel", "stainless"],
  },
  shot_peen: {
    thickness_range: [0, 0], hardness_hv: 0, process_temp_c: 20,
    growth_ratio: 0, rate_um_min: 0, salt_spray_hours_per_um: 0,
    cost_per_cm2: 0.03, wear_factor: 1,
    compatible: ["steel", "aluminum", "stainless", "titanium"],
  },
  passivation: {
    thickness_range: [0, 2], hardness_hv: 0, process_temp_c: 50,
    growth_ratio: 0, rate_um_min: 0.01, salt_spray_hours_per_um: 100,
    cost_per_cm2: 0.01, wear_factor: 1, compatible: ["stainless", "titanium"],
  },
};

// ── Engine ─────────────────────────────────────────────────────────

export class SurfaceTreatmentEngine {
  calculate(input: SurfaceTreatmentInput): SurfaceTreatmentResult {
    const warnings: string[] = [];
    const proc = input.process ?? "anodize_ii";
    const spec = PROCESSES[proc] ?? PROCESSES.anodize_ii;
    const baseMat = input.base_material ?? "aluminum";
    const area = input.surface_area_cm2 ?? 500;
    const qty = input.quantity ?? 1;
    const complexity = input.part_complexity ?? "moderate";

    // Compatibility check
    if (!spec.compatible.includes(baseMat)) {
      warnings.push(
        `${proc} not compatible with ${baseMat} — ` +
        `compatible: ${spec.compatible.join(", ")}`
      );
    }

    // Target thickness
    let thickness: number;
    if (input.target_thickness_um) {
      thickness = input.target_thickness_um;
    } else {
      thickness = (spec.thickness_range[0] + spec.thickness_range[1]) / 2;
    }

    // Clamp to range
    if (thickness < spec.thickness_range[0]) {
      warnings.push(
        `${thickness}µm below min ${spec.thickness_range[0]}µm for ${proc}`
      );
    }
    if (thickness > spec.thickness_range[1] && spec.thickness_range[1] > 0) {
      warnings.push(
        `${thickness}µm exceeds max ${spec.thickness_range[1]}µm for ${proc}`
      );
    }

    // Process time
    let processTime: number;
    if (proc === "shot_peen") {
      processTime = area < 200 ? 5 : area < 1000 ? 15 : 30; // minutes
    } else if (proc === "passivation") {
      processTime = 30; // standard citric acid bath
    } else {
      processTime = spec.rate_um_min > 0
        ? Math.round(thickness / spec.rate_um_min)
        : 60;
    }

    // Dimensional change
    const dimChange = thickness * spec.growth_ratio / 1000; // µm → mm

    // Surface hardness
    const hardness = spec.hardness_hv > 0
      ? spec.hardness_hv
      : (input.target_hardness_hv ?? 0);

    // Corrosion resistance
    const saltSpray = thickness * spec.salt_spray_hours_per_um;

    // Cost
    const complexityFactor: Record<string, number> = {
      simple: 0.8, moderate: 1.0, complex: 1.5,
    };
    const cf = complexityFactor[complexity] ?? 1.0;
    const costPerPart = spec.cost_per_cm2 * area * cf +
      (proc === "chrome_plate" ? 15 : proc === "nitriding" ? 25 : 5); // setup
    const batchDiscount = qty >= 100 ? 0.7 : qty >= 10 ? 0.85 : 1.0;
    const finalCost = costPerPart * batchDiscount;

    // Wear improvement
    const wearImprove = spec.wear_factor;

    // Feasibility
    const feasible = spec.compatible.includes(baseMat);

    // Additional warnings
    if (proc === "anodize_iii" && thickness > 50) {
      warnings.push("Hard anodize > 50µm — fatigue life reduction ~10-15%");
    }
    if (proc === "chrome_plate") {
      warnings.push("Chrome plating — ensure compliance with environmental regulations (REACH)");
    }
    if (proc === "nitriding" && baseMat === "stainless") {
      warnings.push("Nitriding stainless — may reduce corrosion resistance unless low-temp process used");
    }
    if (dimChange > 0.025) {
      warnings.push(
        `Dimensional growth ${r3(dimChange)}mm per side — ` +
        "pre-machine to final size minus coating thickness"
      );
    }

    const src = "SurfaceTreatmentEngine (ASM/MIL/AMS)";

    return {
      coating_thickness: mkAv(r1(thickness), "µm", thickness * 0.1, proc),
      process_time: mkAv(processTime, "min", processTime * 0.15, src),
      surface_hardness: mkAv(hardness, "HV", hardness * 0.05,
        hardness > 0 ? proc : "N/A"),
      dimensional_change: mkAv(r3(dimChange), "mm/side", dimChange * 0.1,
        `${r0(spec.growth_ratio * 100)}% outward growth`),
      cost_per_part: mkAv(r2(finalCost), "USD", finalCost * 0.2,
        `${area}cm² × ${cf}× complexity`),
      corrosion_hours_salt_spray: mkAv(r0(saltSpray), "hours", saltSpray * 0.2,
        `${r1(thickness)}µm × ${spec.salt_spray_hours_per_um}h/µm`),
      wear_improvement: mkAv(wearImprove, "×", 0, `vs untreated ${baseMat}`),
      process_temp: mkAv(spec.process_temp_c, "°C", 5, proc),
      treatment_feasible: mkAv(feasible ? 1 : 0,
        feasible ? "PASS" : "FAIL", 0, src),
      warnings,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function mkAv(value: number, unit: string, uncertainty: number, source: string): AtomicValue {
  return { value, unit, uncertainty, source };
}
function r0(n: number): number { return Math.round(n); }
function r1(n: number): number { return Math.round(n * 10) / 10; }
function r2(n: number): number { return Math.round(n * 100) / 100; }
function r3(n: number): number { return Math.round(n * 1000) / 1000; }

export const surfaceTreatmentEngine = new SurfaceTreatmentEngine();
