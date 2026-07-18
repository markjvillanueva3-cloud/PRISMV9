/**
 * CAMISO286FitClassifierEngine — CAM-AI-TRAINING-MS0/U-CAMT-FIT-CLASSIFY
 *
 * Classifies a (nominal, upperTol, lowerTol) dimension to its closest
 * ISO 286 fit grade — IT grade (5-12) + hole/shaft letter (H, h, g, f,
 * e, M, K, J). Used for tolerance-stack propagation in the kilo
 * print-to-program orchestrator: a callout like "12.000 +0.025/-0.012"
 * → H7+g6 transition fit.
 *
 * Pure ISO 286 table lookup. Size bands per ISO 286-1; IT-grade values
 * are the standard tabulated micrometers per size band.
 *
 * Note: this engine returns a BEST-MATCH classification (closest IT
 * grade by tolerance-width). Operators verify the letter assignment by
 * inspecting the deviation from nominal — kilo flags ambiguity.
 */
import { BaseEngine } from "./BaseEngine.js";
import type { EngineInfo, EngineCapability } from "./IEngine.js";

export type ITGrade = 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface FitClassification {
  /** Total tolerance width (upperTol + lowerTol) in mm. */
  totalToleranceMm: number;
  /** Inferred IT grade. */
  itGrade: ITGrade | null;
  /** Closest letter (H7, g6, h7, etc.). */
  fit: string | null;
  /** Whether the dimension is unilateral (one tol = 0) or bilateral. */
  unilateral: boolean;
  /** Size band used for the lookup. */
  sizeBandMm: string;
  rationale: string;
}

/** Size bands (over → up-to inclusive) in mm. Standard ISO 286 ranges. */
const SIZE_BANDS: ReadonlyArray<{ over: number; upTo: number; label: string }> = [
  { over: 0,    upTo: 3,    label: "0-3" },
  { over: 3,    upTo: 6,    label: "3-6" },
  { over: 6,    upTo: 10,   label: "6-10" },
  { over: 10,   upTo: 18,   label: "10-18" },
  { over: 18,   upTo: 30,   label: "18-30" },
  { over: 30,   upTo: 50,   label: "30-50" },
  { over: 50,   upTo: 80,   label: "50-80" },
  { over: 80,   upTo: 120,  label: "80-120" },
  { over: 120,  upTo: 180,  label: "120-180" },
  { over: 180,  upTo: 250,  label: "180-250" },
  { over: 250,  upTo: 315,  label: "250-315" },
  { over: 315,  upTo: 400,  label: "315-400" },
  { over: 400,  upTo: 500,  label: "400-500" },
];

/**
 * IT-grade tolerance values per size band, in micrometers (µm).
 * Index: SIZE_BAND_INDEX → ITGrade → µm.
 * Source: ISO 286-1:2010 Annex B (standard tabulated values).
 */
const IT_GRADE_MICROMETERS: ReadonlyArray<Record<ITGrade, number>> = [
  // 0-3
  { 5: 4,   6: 6,   7: 10,  8: 14,  9: 25,  10: 40,  11: 60,  12: 100 },
  // 3-6
  { 5: 5,   6: 8,   7: 12,  8: 18,  9: 30,  10: 48,  11: 75,  12: 120 },
  // 6-10
  { 5: 6,   6: 9,   7: 15,  8: 22,  9: 36,  10: 58,  11: 90,  12: 150 },
  // 10-18
  { 5: 8,   6: 11,  7: 18,  8: 27,  9: 43,  10: 70,  11: 110, 12: 180 },
  // 18-30
  { 5: 9,   6: 13,  7: 21,  8: 33,  9: 52,  10: 84,  11: 130, 12: 210 },
  // 30-50
  { 5: 11,  6: 16,  7: 25,  8: 39,  9: 62,  10: 100, 11: 160, 12: 250 },
  // 50-80
  { 5: 13,  6: 19,  7: 30,  8: 46,  9: 74,  10: 120, 11: 190, 12: 300 },
  // 80-120
  { 5: 15,  6: 22,  7: 35,  8: 54,  9: 87,  10: 140, 11: 220, 12: 350 },
  // 120-180
  { 5: 18,  6: 25,  7: 40,  8: 63,  9: 100, 10: 160, 11: 250, 12: 400 },
  // 180-250
  { 5: 20,  6: 29,  7: 46,  8: 72,  9: 115, 10: 185, 11: 290, 12: 460 },
  // 250-315
  { 5: 23,  6: 32,  7: 52,  8: 81,  9: 130, 10: 210, 11: 320, 12: 520 },
  // 315-400
  { 5: 25,  6: 36,  7: 57,  8: 89,  9: 140, 10: 230, 11: 360, 12: 570 },
  // 400-500
  { 5: 27,  6: 40,  7: 63,  8: 97,  9: 155, 10: 250, 11: 400, 12: 630 },
];

export class CAMISO286FitClassifierEngine extends BaseEngine {
  constructor() {
    const info: EngineInfo = {
      name: "CAMISO286FitClassifierEngine",
      version: "1.0.0",
      domain: "cam_ai_training",
      description: "Classifies numeric dimension+tolerance to ISO 286 IT grade + fit letter.",
    };
    super(info);
  }

  getCapabilities(): EngineCapability[] {
    return [
      { name: "classify",   description: "Classify dim+tol → fit",     actions: ["cam_iso286_classify"] },
      { name: "size_bands", description: "List ISO 286 size bands",    actions: ["cam_iso286_size_bands"] },
      { name: "it_values",  description: "IT-grade µm table per band", actions: ["cam_iso286_it_values"] },
    ];
  }

  validate(input: unknown): string | null {
    if (input == null || typeof input !== "object") return "input must be an object";
    return null;
  }

  protected async executeImpl(_input: unknown): Promise<unknown> {
    return { engine: "CAMISO286FitClassifierEngine", note: "use typed methods" };
  }

  classify(nominalMm: number, upperTolMm: number, lowerTolMm: number): FitClassification {
    const total = upperTolMm + lowerTolMm;
    const totalUm = total * 1000;
    const bandIdx = SIZE_BANDS.findIndex((b) => nominalMm > b.over && nominalMm <= b.upTo);
    if (bandIdx < 0) {
      return {
        totalToleranceMm: total,
        itGrade: null,
        fit: null,
        unilateral: upperTolMm === 0 || lowerTolMm === 0,
        sizeBandMm: "out-of-range",
        rationale: `nominal ${nominalMm}mm outside ISO 286 standard range (0-500mm)`,
      };
    }
    const band = SIZE_BANDS[bandIdx];
    const grades = IT_GRADE_MICROMETERS[bandIdx];

    // Find closest IT grade by µm width.
    let bestGrade: ITGrade | null = null;
    let bestDelta = Infinity;
    for (const g of [5, 6, 7, 8, 9, 10, 11, 12] as ITGrade[]) {
      const delta = Math.abs(totalUm - grades[g]);
      if (delta < bestDelta) {
        bestDelta = delta;
        bestGrade = g;
      }
    }

    // Fit letter inference:
    //   bilateral symmetric (upper ≈ lower) → "Js" (or "JS")
    //   unilateral upper only (lower = 0) → "h" (shaft) — basic shaft
    //   unilateral lower only (upper = 0) → "H" (hole) — basic hole
    //   asymmetric with upper > lower → "g" or "f" (clearance shaft side)
    //   asymmetric with lower > upper → "K" or "M" (interference hole side)
    let letter = "?";
    const unilateral = upperTolMm === 0 || lowerTolMm === 0;
    if (lowerTolMm === 0 && upperTolMm > 0) {
      letter = "H";
    } else if (upperTolMm === 0 && lowerTolMm > 0) {
      letter = "h";
    } else if (Math.abs(upperTolMm - lowerTolMm) < 0.001) {
      letter = "Js";
    } else if (upperTolMm > lowerTolMm) {
      letter = "g";
    } else {
      letter = "K";
    }

    const fit = bestGrade !== null ? `${letter}${bestGrade}` : null;

    return {
      totalToleranceMm: total,
      itGrade: bestGrade,
      fit,
      unilateral,
      sizeBandMm: band.label,
      rationale: `nominal ${nominalMm}mm in band ${band.label}; total tol ${(total * 1000).toFixed(1)}µm → IT${bestGrade} (closest match), letter ${letter}`,
    };
  }

  size_bands(): ReadonlyArray<{ over: number; upTo: number; label: string }> {
    return SIZE_BANDS;
  }

  it_values(sizeBandLabel: string): Record<ITGrade, number> | null {
    const idx = SIZE_BANDS.findIndex((b) => b.label === sizeBandLabel);
    if (idx < 0) return null;
    return IT_GRADE_MICROMETERS[idx];
  }
}

export const camISO286FitClassifierEngine = new CAMISO286FitClassifierEngine();
