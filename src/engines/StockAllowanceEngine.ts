/**
 * StockAllowanceEngine — Machining Allowance Calculator
 *
 * Calculates required stock allowances between operations:
 * - Roughing → semi-finish → finish allowances
 * - Heat treatment distortion allowance
 * - Grinding stock after hardening
 * - Plating/coating thickness compensation
 * - Raw material size selection
 *
 * Key physics: Each machining stage needs sufficient stock
 * for the next operation. Allowances depend on part size,
 * tolerances, material behavior, and process capability.
 * Heat treatment causes distortion proportional to
 * section thickness and temperature gradient.
 *
 * Reference: Machinery's Handbook Ch.14 (Allowances),
 *            ISO 8015 (Tolerancing),
 *            DIN 7168 (General tolerances)
 *
 * Actions: stock_allowance_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface StockAllowanceInput {
  finished_dimension_mm: number;
  tolerance_mm?: number;
  operation_sequence?: string[];
  material_type?: "steel" | "aluminum" | "titanium"
    | "stainless" | "cast_iron";
  heat_treatment?: "none" | "through_harden" | "case_harden"
    | "nitriding" | "stress_relieve";
  surface_treatment?: "none" | "chrome_plate" | "anodize"
    | "nickel_plate" | "zinc_plate";
}

export interface StockAllowanceResult {
  raw_stock_size: AtomicValue;
  total_allowance: AtomicValue;
  roughing_allowance: AtomicValue;
  semi_finish_allowance: AtomicValue;
  finishing_allowance: AtomicValue;
  grinding_allowance: AtomicValue;
  heat_treat_distortion: AtomicValue;
  coating_allowance: AtomicValue;
  allowance_breakdown: Array<{
    stage: string;
    allowance_mm: number;
  }>;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Heat treatment distortion (mm per 100mm dimension) */
const HT_DISTORTION: Record<string, number> = {
  none: 0,
  through_harden: 0.15,
  case_harden: 0.10,
  nitriding: 0.05,
  stress_relieve: 0.02,
};

/** Coating thickness per side (mm) */
const COATING_THICKNESS: Record<string, number> = {
  none: 0,
  chrome_plate: 0.025,
  anodize: 0.025,
  nickel_plate: 0.05,
  zinc_plate: 0.01,
};

/** Material distortion factor (relative to steel) */
const MAT_FACTOR: Record<string, number> = {
  steel: 1.0,
  aluminum: 1.3,
  titanium: 0.8,
  stainless: 1.2,
  cast_iron: 0.6,
};

// ── Engine ─────────────────────────────────────────────────────────

export class StockAllowanceEngine {
  /**
   * Calculate stock allowances for operation sequence.
   */
  calculate(input: StockAllowanceInput): StockAllowanceResult {
    const warnings: string[] = [];
    const dim = input.finished_dimension_mm;
    const tol = input.tolerance_mm ?? 0.05;
    const mat = input.material_type ?? "steel";
    const ht = input.heat_treatment ?? "none";
    const coating = input.surface_treatment ?? "none";

    const matFactor = MAT_FACTOR[mat] ?? 1.0;

    // Base allowances scale with dimension
    const dimFactor = Math.sqrt(dim / 50);

    // Roughing: 1-3mm per side depending on size
    const roughAllow = Math.max(
      0.5,
      Math.min(1.0 + dim * 0.02, 3.0)
    ) * matFactor;

    // Semi-finish: 0.3-1mm per side
    const semiAllow = Math.max(
      0.2,
      Math.min(0.3 + dim * 0.005, 1.0)
    );

    // Finish: based on tolerance
    const finishAllow = Math.max(
      tol * 3,
      0.1
    );

    // Grinding: if needed
    const needsGrinding = tol < 0.02 || ht !== "none";
    const grindAllow = needsGrinding
      ? Math.max(0.1, 0.05 + dim * 0.001) : 0;

    // Heat treatment distortion
    const htDistortion = (HT_DISTORTION[ht] ?? 0)
      * (dim / 100) * matFactor;

    // Coating allowance (reduce finished dim by coating)
    const coatAllow = COATING_THICKNESS[coating] ?? 0;

    // Total allowance per side
    const totalAllow = roughAllow + semiAllow + finishAllow
      + grindAllow + htDistortion + coatAllow;

    // Raw stock size (add allowance to both sides)
    const rawStock = dim + totalAllow * 2;

    // Build breakdown
    const breakdown: Array<{ stage: string; allowance_mm: number }> = [];
    breakdown.push({
      stage: "Roughing",
      allowance_mm: r3(roughAllow),
    });
    breakdown.push({
      stage: "Semi-finish",
      allowance_mm: r3(semiAllow),
    });
    breakdown.push({
      stage: "Finishing",
      allowance_mm: r3(finishAllow),
    });
    if (grindAllow > 0) {
      breakdown.push({
        stage: "Grinding",
        allowance_mm: r3(grindAllow),
      });
    }
    if (htDistortion > 0) {
      breakdown.push({
        stage: "Heat treat distortion",
        allowance_mm: r3(htDistortion),
      });
    }
    if (coatAllow > 0) {
      breakdown.push({
        stage: "Coating compensation",
        allowance_mm: r3(coatAllow),
      });
    }

    // Warnings
    if (totalAllow > dim * 0.2) {
      warnings.push(
        "Allowance > 20% of dimension — " +
        "verify raw material availability"
      );
    }
    if (tol < 0.01 && ht !== "none" && grindAllow < 0.15) {
      warnings.push(
        "Tight tolerance with heat treatment — " +
        "increase grinding allowance"
      );
    }
    if (mat === "aluminum" && ht === "through_harden") {
      warnings.push(
        "Aluminum typically age-hardened, " +
        "not through-hardened"
      );
    }

    return {
      raw_stock_size: av(r2(rawStock), "mm", 0.05,
        "finished + 2 × total_allowance"),
      total_allowance: av(r3(totalAllow), "mm/side", 0.1,
        "Sum of all stage allowances"),
      roughing_allowance: av(r3(roughAllow), "mm/side", 0.1,
        "Based on dimension and material"),
      semi_finish_allowance: av(r3(semiAllow), "mm/side", 0.1,
        "0.3-1.0mm scaled by dimension"),
      finishing_allowance: av(r3(finishAllow), "mm/side", 0.1,
        "3× tolerance or 0.1mm minimum"),
      grinding_allowance: av(r3(grindAllow), "mm/side", 0.1,
        needsGrinding
          ? "Required for tolerance/HT"
          : "Not needed"),
      heat_treat_distortion: av(r3(htDistortion), "mm", 0.2,
        ht === "none"
          ? "No heat treatment"
          : "Distortion per 100mm × dim"),
      coating_allowance: av(r3(coatAllow), "mm/side", 0.05,
        coating === "none"
          ? "No coating"
          : "Coating thickness per side"),
      allowance_breakdown: breakdown,
      warnings,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function av(
  value: number, unit: string,
  uncertainty: number, source: string
): AtomicValue {
  return { value, unit, uncertainty, source };
}

function r2(n: number): number { return Math.round(n * 100) / 100; }
function r3(n: number): number { return Math.round(n * 1000) / 1000; }

export const stockAllowanceEngine = new StockAllowanceEngine();
