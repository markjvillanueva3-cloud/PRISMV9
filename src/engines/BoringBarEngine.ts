/**
 * BoringBarEngine — Boring Bar Selection & Calculation
 *
 * Calculates parameters for boring operations:
 * - Bar deflection from overhang and cutting forces
 * - Minimum bar diameter for stiffness requirement
 * - Speed/feed for rough and finish boring
 * - Carbide vs steel vs heavy-metal bar recommendation
 * - Damped bar threshold determination
 *
 * Key physics: Boring bar deflection δ = F×L³/(3EI) where
 * L is overhang. Deflection must stay below surface finish
 * tolerance. Carbide bars (E=600 GPa) are ~3× stiffer than
 * steel (E=210 GPa). Heavy-metal bars are best for L/D > 6.
 *
 * Reference: Sandvik boring guide (C-2920:40),
 *            Kennametal boring selection guide,
 *            Machinery's Handbook Ch.30
 *
 * Actions: boring_calc, boring_deflection, boring_bar_select
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export type BarMaterial = "steel" | "carbide" | "heavy_metal" | "damped";

export interface BoringInput {
  bore_diameter_mm: number;
  bore_depth_mm: number;
  bar_diameter_mm?: number;
  bar_material?: BarMaterial;
  material_iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  is_finish?: boolean;
  target_ra_um?: number;
}

export interface BoringResult {
  bar_diameter: AtomicValue;
  bar_material: BarMaterial;
  overhang_ratio: AtomicValue;
  deflection: AtomicValue;
  max_deflection: AtomicValue;
  cutting_speed: AtomicValue;
  feed_rate: AtomicValue;
  depth_of_cut: AtomicValue;
  spindle_rpm: AtomicValue;
  predicted_ra: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Young's modulus (GPa) by bar material */
const BAR_MODULUS: Record<BarMaterial, number> = {
  steel: 210,
  carbide: 600,
  heavy_metal: 350,
  damped: 600, // carbide with damper
};

/** Max L/D ratio by bar material */
const MAX_LD: Record<BarMaterial, number> = {
  steel: 4,
  carbide: 6,
  heavy_metal: 8,
  damped: 10,
};

/** Cutting speed for boring (m/min) */
const BORE_SPEEDS: Record<string, number> = {
  P: 150, M: 90, K: 180, N: 350, S: 45, H: 60,
};

/** Feed per rev for boring (mm/rev) — finish */
const BORE_FEEDS_FINISH: Record<string, number> = {
  P: 0.08, M: 0.06, K: 0.10, N: 0.12, S: 0.04, H: 0.05,
};

/** Feed per rev for boring (mm/rev) — rough */
const BORE_FEEDS_ROUGH: Record<string, number> = {
  P: 0.20, M: 0.15, K: 0.25, N: 0.30, S: 0.10, H: 0.12,
};

/** Specific cutting force kc1 (N/mm²) */
const KC1: Record<string, number> = {
  P: 2000, M: 2400, K: 1200, N: 700, S: 2800, H: 3500,
};

// ── Engine ─────────────────────────────────────────────────────────

export class BoringBarEngine {
  /**
   * Calculate boring parameters and bar deflection.
   */
  calculate(input: BoringInput): BoringResult {
    const warnings: string[] = [];
    const iso = input.material_iso_group ?? "P";
    const boreDia = input.bore_diameter_mm;
    const boreDepth = input.bore_depth_mm;
    const isFinish = input.is_finish ?? true;
    const targetRa = input.target_ra_um ?? (isFinish ? 1.6 : 6.3);

    // Bar diameter: typically 60-70% of bore diameter
    const barDia = input.bar_diameter_mm ??
      Math.min(boreDia * 0.65, boreDia - 4);

    // Overhang ratio
    const ldRatio = boreDepth / barDia;

    // Select bar material based on L/D
    let barMat: BarMaterial;
    if (input.bar_material) {
      barMat = input.bar_material;
    } else if (ldRatio <= 4) {
      barMat = "steel";
    } else if (ldRatio <= 6) {
      barMat = "carbide";
    } else if (ldRatio <= 8) {
      barMat = "heavy_metal";
    } else {
      barMat = "damped";
    }

    const E = BAR_MODULUS[barMat] * 1000; // GPa → MPa
    const maxLD = MAX_LD[barMat];

    // Moment of inertia (mm⁴)
    const I = (Math.PI * Math.pow(barDia, 4)) / 64;

    // Cutting parameters
    const vc = isFinish
      ? BORE_SPEEDS[iso] ?? 150
      : (BORE_SPEEDS[iso] ?? 150) * 0.8;
    const rpm = (vc * 1000) / (Math.PI * boreDia);

    const fpr = isFinish
      ? BORE_FEEDS_FINISH[iso] ?? 0.08
      : BORE_FEEDS_ROUGH[iso] ?? 0.20;
    const feedRate = fpr * rpm;

    const doc = isFinish ? 0.2 : 1.5; // mm

    // Cutting force (tangential)
    const kc1 = KC1[iso] ?? 2000;
    // F = kc1 × ap × f (simplified)
    const cuttingForce = kc1 * doc * fpr;

    // Deflection: δ = F × L³ / (3 × E × I)
    const L = boreDepth;
    const deflection = (cuttingForce * Math.pow(L, 3)) /
      (3 * E * I);

    // Max allowable deflection (based on surface finish)
    // Rule of thumb: deflection < Ra/4 for finish
    const maxDeflection = isFinish
      ? targetRa / 4000 // μm → mm, then /4
      : 0.05; // 50μm for roughing

    // Surface finish prediction
    // Ra ≈ f² / (8 × r) × 1000 (nose radius ~0.4mm typical)
    const noseR = 0.4;
    const predictedRa = (fpr * fpr) / (8 * noseR) * 1000;

    // Warnings
    if (ldRatio > maxLD) {
      warnings.push(
        `L/D ratio ${r1(ldRatio)} exceeds ${maxLD} ` +
        `for ${barMat} bar — consider upgrading bar material`
      );
    }
    if (deflection > maxDeflection) {
      warnings.push(
        `Predicted deflection ${r3(deflection)}mm exceeds ` +
        `limit ${r3(maxDeflection)}mm — reduce depth of cut ` +
        "or use stiffer bar"
      );
    }
    if (barDia < boreDia * 0.5) {
      warnings.push(
        "Bar diameter < 50% of bore — poor rigidity"
      );
    }
    if (barDia > boreDia * 0.8) {
      warnings.push(
        "Bar diameter > 80% of bore — limited chip clearance"
      );
    }

    return {
      bar_diameter: av(r1(barDia), "mm", 0.05,
        "~65% of bore diameter"),
      bar_material: barMat,
      overhang_ratio: av(r1(ldRatio), "L/D", 0.05,
        "bore_depth / bar_diameter"),
      deflection: av(r3(deflection), "mm", 0.2,
        "F × L³ / (3EI)"),
      max_deflection: av(r3(maxDeflection), "mm", 0.1,
        isFinish ? "Ra / 4000" : "50μm roughing limit"),
      cutting_speed: av(r1(vc), "m/min", 0.1,
        "Boring speed tables"),
      feed_rate: av(Math.round(feedRate), "mm/min", 0.1,
        "fpr × RPM"),
      depth_of_cut: av(doc, "mm", 0.05,
        isFinish ? "Finish DOC" : "Rough DOC"),
      spindle_rpm: av(Math.round(rpm), "rev/min", 0.05,
        "Vc × 1000 / (π × D_bore)"),
      predicted_ra: av(r2(predictedRa), "μm", 0.2,
        "f² / (8 × r_nose) × 1000"),
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

function r1(n: number): number { return Math.round(n * 10) / 10; }
function r2(n: number): number { return Math.round(n * 100) / 100; }
function r3(n: number): number { return Math.round(n * 1000) / 1000; }

export const boringBarEngine = new BoringBarEngine();
