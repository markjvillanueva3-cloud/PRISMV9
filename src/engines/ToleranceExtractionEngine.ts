/**
 * ToleranceExtractionEngine — Tolerance & GD&T Parsing for Turning
 *
 * Parses engineering drawing tolerance callouts and GD&T frames, then
 * converts them into per-feature tolerance objects with machining strategy
 * implications for the turning pipeline.
 *
 * Handles:
 *   - Bilateral tolerances: ±0.1, +0.025/-0.025
 *   - Unilateral tolerances: +0.025/-0.000, +0.000/-0.050
 *   - Fit notation: H7/g6, H7, g6 (ISO 286-1 decomposition)
 *   - GD&T frames: position, concentricity, runout, cylindricity, etc.
 *   - ISO 2768-m general tolerance application
 *   - Surface finish → tolerance cross-check
 *
 * Strategy implications:
 *   - Tolerance < 0.01mm → requires finish pass + possible grinding
 *   - Tolerance < 0.025mm → requires finish pass with fine feed
 *   - Tolerance < 0.05mm → standard finish pass adequate
 *   - Tolerance > 0.1mm → rough pass may suffice
 *   - GD&T runout → mandates between-centers or tailstock support
 *   - GD&T concentricity → may require single-setup machining
 *
 * References:
 *   - ISO 286-1:2010 (ISO fits — fundamental deviations & tolerances)
 *   - ISO 2768-1:1989 (general tolerances for linear dimensions)
 *   - ISO 2768-2:1989 (general tolerances for geometrical)
 *   - ASME Y14.5-2018 (GD&T)
 *   - ISO 1302:2002 (surface texture indication)
 *
 * @module engines/ToleranceExtractionEngine
 * @milestone LATHE-PRO-MS-1 U-LPI03
 */

import { log } from "../utils/Logger.js";
import type {
  ExtractedDimension,
  ExtractedGDT,
  ToleranceType,
  GDTSymbol,
} from "./BlueprintOCREngine.js";

// ============================================================================
// TYPES
// ============================================================================

/** Per-feature tolerance object with machining strategy implications */
export interface FeatureTolerance {
  /** Feature ID this tolerance applies to */
  feature_id: string;
  /** Nominal dimension (mm) */
  nominal_mm: number;
  /** Upper deviation (mm, positive = material added) */
  upper_dev_mm: number;
  /** Lower deviation (mm, negative = material removed) */
  lower_dev_mm: number;
  /** Total tolerance band (mm) */
  tolerance_band_mm: number;
  /** Tolerance source */
  source: "explicit" | "fit_class" | "gdt" | "iso_2768_m" | "iso_2768_f" | "iso_2768_c";
  /** Fit class if applicable (e.g., "H7", "g6") */
  fit_class?: string;
  /** Machining strategy flags */
  strategy: ToleranceStrategy;
  /** Original raw text */
  raw_text?: string;
  /** Confidence */
  confidence: number;
}

export interface ToleranceStrategy {
  /** Required operation precision level */
  precision_level: "rough_only" | "semi_finish" | "finish" | "fine_finish" | "grinding";
  /** Minimum recommended passes */
  min_passes: number;
  /** Finish feed override (mm/rev) — null = use default */
  finish_feed_override_mm_rev?: number;
  /** Finish DOC override (mm) — null = use default */
  finish_doc_override_mm?: number;
  /** Requires between-centers support */
  requires_between_centers: boolean;
  /** Requires single-setup (no re-chuck) */
  requires_single_setup: boolean;
  /** Requires bore dwell at bottom */
  requires_dwell: boolean;
  /** Requires spring pass (zero-DOC final pass) */
  requires_spring_pass: boolean;
  /** Surface finish requirement (Ra μm) implied by tolerance */
  implied_ra_um?: number;
  /** Strategy notes for operator */
  notes: string[];
}

export interface GDTInterpretation {
  /** GD&T frame ID */
  gdt_id: string;
  /** Symbol */
  symbol: GDTSymbol;
  /** Tolerance value (mm) */
  tolerance_mm: number;
  /** Datum references */
  datums: string[];
  /** Feature it applies to */
  applied_to: string;
  /** Machining implications */
  implications: string[];
  /** Strategy overrides */
  strategy_overrides: Partial<ToleranceStrategy>;
}

export interface ToleranceExtractionResult {
  /** Per-feature tolerances */
  feature_tolerances: FeatureTolerance[];
  /** GD&T interpretations */
  gdt_interpretations: GDTInterpretation[];
  /** General tolerance class applied */
  general_tolerance_class: "f" | "m" | "c" | "v" | "none";
  /** Number of ISO 2768 defaults applied */
  defaults_applied: number;
  /** Warnings */
  warnings: string[];
}

// ============================================================================
// ISO 286-1 FIT TABLES — Fundamental Deviations (μm)
// Reference: ISO 286-1:2010, Tables 2-4
// ============================================================================

/** Hole basis fundamental deviations (uppercase letters) in μm */
const HOLE_DEVIATIONS: Record<string, Array<{ up_to_mm: number; dev_um: number }>> = {
  H: [ // Zero line — lower deviation = 0
    { up_to_mm: 3, dev_um: 0 }, { up_to_mm: 6, dev_um: 0 },
    { up_to_mm: 10, dev_um: 0 }, { up_to_mm: 18, dev_um: 0 },
    { up_to_mm: 30, dev_um: 0 }, { up_to_mm: 50, dev_um: 0 },
    { up_to_mm: 80, dev_um: 0 }, { up_to_mm: 120, dev_um: 0 },
    { up_to_mm: 180, dev_um: 0 }, { up_to_mm: 250, dev_um: 0 },
    { up_to_mm: 315, dev_um: 0 }, { up_to_mm: 400, dev_um: 0 },
  ],
};

/** IT grades — tolerance values in μm per ISO 286-1 */
const IT_GRADES: Record<number, number[]> = {
  // [up to 3, 3-6, 6-10, 10-18, 18-30, 30-50, 50-80, 80-120, 120-180, 180-250, 250-315, 315-400]
  5:  [4, 5, 6, 8, 9, 11, 13, 15, 18, 20, 23, 25],
  6:  [6, 8, 9, 11, 13, 16, 19, 22, 25, 29, 32, 36],
  7:  [10, 12, 15, 18, 21, 25, 30, 35, 40, 46, 52, 57],
  8:  [14, 18, 22, 27, 33, 39, 46, 54, 63, 72, 81, 89],
  9:  [25, 30, 36, 43, 52, 62, 74, 87, 100, 115, 130, 140],
  10: [40, 48, 58, 70, 84, 100, 120, 140, 160, 185, 210, 230],
  11: [60, 75, 90, 110, 130, 160, 190, 220, 250, 290, 320, 360],
};

/** Size range boundaries (mm) for IT grade lookup */
const SIZE_RANGES = [3, 6, 10, 18, 30, 50, 80, 120, 180, 250, 315, 400];

/** Shaft fundamental deviations (lowercase) in μm — most common for turning */
const SHAFT_DEVIATIONS: Record<string, Array<{ up_to_mm: number; dev_um: number }>> = {
  f: [ // Clearance fit (running fit)
    { up_to_mm: 3, dev_um: -6 }, { up_to_mm: 6, dev_um: -10 },
    { up_to_mm: 10, dev_um: -13 }, { up_to_mm: 18, dev_um: -16 },
    { up_to_mm: 30, dev_um: -20 }, { up_to_mm: 50, dev_um: -25 },
    { up_to_mm: 80, dev_um: -30 }, { up_to_mm: 120, dev_um: -36 },
    { up_to_mm: 180, dev_um: -43 }, { up_to_mm: 250, dev_um: -50 },
    { up_to_mm: 315, dev_um: -56 }, { up_to_mm: 400, dev_um: -62 },
  ],
  g: [ // Close running fit
    { up_to_mm: 3, dev_um: -2 }, { up_to_mm: 6, dev_um: -4 },
    { up_to_mm: 10, dev_um: -5 }, { up_to_mm: 18, dev_um: -6 },
    { up_to_mm: 30, dev_um: -7 }, { up_to_mm: 50, dev_um: -9 },
    { up_to_mm: 80, dev_um: -10 }, { up_to_mm: 120, dev_um: -12 },
    { up_to_mm: 180, dev_um: -14 }, { up_to_mm: 250, dev_um: -15 },
    { up_to_mm: 315, dev_um: -17 }, { up_to_mm: 400, dev_um: -18 },
  ],
  h: [ // Sliding fit (zero line)
    { up_to_mm: 3, dev_um: 0 }, { up_to_mm: 6, dev_um: 0 },
    { up_to_mm: 10, dev_um: 0 }, { up_to_mm: 18, dev_um: 0 },
    { up_to_mm: 30, dev_um: 0 }, { up_to_mm: 50, dev_um: 0 },
    { up_to_mm: 80, dev_um: 0 }, { up_to_mm: 120, dev_um: 0 },
    { up_to_mm: 180, dev_um: 0 }, { up_to_mm: 250, dev_um: 0 },
    { up_to_mm: 315, dev_um: 0 }, { up_to_mm: 400, dev_um: 0 },
  ],
  js: [ // Symmetric about zero (±IT/2)
    { up_to_mm: 3, dev_um: 0 }, { up_to_mm: 6, dev_um: 0 },
    { up_to_mm: 10, dev_um: 0 }, { up_to_mm: 18, dev_um: 0 },
    { up_to_mm: 30, dev_um: 0 }, { up_to_mm: 50, dev_um: 0 },
    { up_to_mm: 80, dev_um: 0 }, { up_to_mm: 120, dev_um: 0 },
    { up_to_mm: 180, dev_um: 0 }, { up_to_mm: 250, dev_um: 0 },
    { up_to_mm: 315, dev_um: 0 }, { up_to_mm: 400, dev_um: 0 },
  ],
  k: [ // Transition fit (locational)
    { up_to_mm: 3, dev_um: 0 }, { up_to_mm: 6, dev_um: 1 },
    { up_to_mm: 10, dev_um: 1 }, { up_to_mm: 18, dev_um: 1 },
    { up_to_mm: 30, dev_um: 2 }, { up_to_mm: 50, dev_um: 2 },
    { up_to_mm: 80, dev_um: 2 }, { up_to_mm: 120, dev_um: 3 },
    { up_to_mm: 180, dev_um: 3 }, { up_to_mm: 250, dev_um: 4 },
    { up_to_mm: 315, dev_um: 4 }, { up_to_mm: 400, dev_um: 4 },
  ],
  n: [ // Interference fit (light press)
    { up_to_mm: 3, dev_um: 4 }, { up_to_mm: 6, dev_um: 8 },
    { up_to_mm: 10, dev_um: 10 }, { up_to_mm: 18, dev_um: 12 },
    { up_to_mm: 30, dev_um: 15 }, { up_to_mm: 50, dev_um: 17 },
    { up_to_mm: 80, dev_um: 20 }, { up_to_mm: 120, dev_um: 23 },
    { up_to_mm: 180, dev_um: 27 }, { up_to_mm: 250, dev_um: 31 },
    { up_to_mm: 315, dev_um: 34 }, { up_to_mm: 400, dev_um: 37 },
  ],
  p: [ // Press fit
    { up_to_mm: 3, dev_um: 6 }, { up_to_mm: 6, dev_um: 12 },
    { up_to_mm: 10, dev_um: 15 }, { up_to_mm: 18, dev_um: 18 },
    { up_to_mm: 30, dev_um: 22 }, { up_to_mm: 50, dev_um: 26 },
    { up_to_mm: 80, dev_um: 32 }, { up_to_mm: 120, dev_um: 37 },
    { up_to_mm: 180, dev_um: 43 }, { up_to_mm: 250, dev_um: 50 },
    { up_to_mm: 315, dev_um: 56 }, { up_to_mm: 400, dev_um: 62 },
  ],
};

// ============================================================================
// ISO 2768-1 GENERAL TOLERANCES
// Reference: ISO 2768-1:1989, Table 1
// ============================================================================

interface GeneralToleranceBand {
  up_to_mm: number;
  f: number; // fine
  m: number; // medium
  c: number; // coarse
  v: number; // very coarse
}

const ISO_2768_LINEAR: GeneralToleranceBand[] = [
  { up_to_mm: 0.5,   f: 0.05, m: 0.05, c: 0.1,  v: 0.1  },
  { up_to_mm: 3,     f: 0.05, m: 0.10, c: 0.2,  v: 0.5  },
  { up_to_mm: 6,     f: 0.05, m: 0.10, c: 0.3,  v: 0.5  },
  { up_to_mm: 30,    f: 0.10, m: 0.20, c: 0.5,  v: 1.0  },
  { up_to_mm: 120,   f: 0.15, m: 0.30, c: 0.8,  v: 1.5  },
  { up_to_mm: 400,   f: 0.20, m: 0.50, c: 1.2,  v: 2.5  },
  { up_to_mm: 1000,  f: 0.30, m: 0.80, c: 2.0,  v: 4.0  },
  { up_to_mm: 2000,  f: 0.50, m: 1.20, c: 3.0,  v: 6.0  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/** Get size range index for a nominal dimension */
function getSizeIndex(nominal_mm: number): number {
  const abs = Math.abs(nominal_mm);
  for (let i = 0; i < SIZE_RANGES.length; i++) {
    if (abs <= SIZE_RANGES[i]) return i;
  }
  return SIZE_RANGES.length - 1;
}

/** Get IT grade tolerance in mm */
function getITTolerance(grade: number, nominal_mm: number): number {
  const gradeData = IT_GRADES[grade];
  if (!gradeData) return 0.050; // Default IT7
  const idx = getSizeIndex(nominal_mm);
  return (gradeData[idx] || gradeData[gradeData.length - 1]) / 1000; // μm to mm
}

/** Get fundamental deviation in mm for a shaft symbol */
function getShaftDeviation(symbol: string, nominal_mm: number): number {
  const lower = symbol.toLowerCase();
  const devTable = SHAFT_DEVIATIONS[lower];
  if (!devTable) return 0;
  const abs = Math.abs(nominal_mm);
  for (const entry of devTable) {
    if (abs <= entry.up_to_mm) return entry.dev_um / 1000; // μm to mm
  }
  return devTable[devTable.length - 1].dev_um / 1000;
}

/** Get general tolerance for a given class and nominal */
function getGeneralTolerance(
  nominal_mm: number,
  toleranceClass: "f" | "m" | "c" | "v",
): number {
  const abs = Math.abs(nominal_mm);
  for (const band of ISO_2768_LINEAR) {
    if (abs <= band.up_to_mm) return band[toleranceClass];
  }
  return ISO_2768_LINEAR[ISO_2768_LINEAR.length - 1][toleranceClass];
}

/** Determine machining strategy from tolerance band */
function determineStrategy(
  tolerance_band_mm: number,
  gdts: ExtractedGDT[],
  featureId: string,
): ToleranceStrategy {
  const notes: string[] = [];
  let precision: ToleranceStrategy["precision_level"] = "finish";
  let minPasses = 2;
  let finishFeed: number | undefined;
  let finishDOC: number | undefined;
  let requiresCenters = false;
  let requiresSingleSetup = false;
  let requiresDwell = false;
  let requiresSpringPass = false;
  let impliedRa: number | undefined;

  // Tolerance-based strategy
  if (tolerance_band_mm <= 0.005) {
    precision = "grinding";
    minPasses = 4;
    finishFeed = 0.03;
    finishDOC = 0.02;
    requiresSpringPass = true;
    impliedRa = 0.2;
    notes.push("Tolerance <5μm — grinding or super-finish required");
  } else if (tolerance_band_mm <= 0.010) {
    precision = "fine_finish";
    minPasses = 3;
    finishFeed = 0.05;
    finishDOC = 0.05;
    requiresSpringPass = true;
    impliedRa = 0.4;
    notes.push("Tolerance <10μm — fine finish with spring pass recommended");
  } else if (tolerance_band_mm <= 0.025) {
    precision = "finish";
    minPasses = 2;
    finishFeed = 0.08;
    finishDOC = 0.10;
    impliedRa = 0.8;
    notes.push("Tolerance <25μm — standard finish pass");
  } else if (tolerance_band_mm <= 0.050) {
    precision = "semi_finish";
    minPasses = 2;
    impliedRa = 1.6;
  } else if (tolerance_band_mm <= 0.100) {
    precision = "semi_finish";
    minPasses = 2;
    impliedRa = 3.2;
  } else {
    precision = "rough_only";
    minPasses = 1;
    impliedRa = 6.3;
    notes.push("Tolerance >100μm — roughing pass sufficient");
  }

  // GD&T overrides
  for (const gdt of gdts) {
    const appliedTo = (gdt.applied_to || "").toLowerCase();
    if (!appliedTo.includes(featureId.toLowerCase())) continue;

    switch (gdt.symbol) {
      case "circular_runout":
      case "total_runout":
        requiresCenters = true;
        notes.push(`Runout ${gdt.tolerance_value}mm — requires between-centers or tailstock`);
        break;
      case "concentricity":
        requiresSingleSetup = true;
        requiresCenters = true;
        notes.push(`Concentricity ${gdt.tolerance_value}mm — single setup + centers`);
        break;
      case "cylindricity":
        if (gdt.tolerance_value < 0.010) {
          requiresSpringPass = true;
          notes.push(`Cylindricity ${gdt.tolerance_value}mm — spring pass required`);
        }
        break;
      case "position":
        if (gdt.material_condition === "MMC") {
          notes.push("Position MMC — bonus tolerance applies at larger size");
        }
        break;
    }
  }

  return {
    precision_level: precision,
    min_passes: minPasses,
    finish_feed_override_mm_rev: finishFeed,
    finish_doc_override_mm: finishDOC,
    requires_between_centers: requiresCenters,
    requires_single_setup: requiresSingleSetup,
    requires_dwell: requiresDwell,
    requires_spring_pass: requiresSpringPass,
    implied_ra_um: impliedRa,
    notes,
  };
}

// ============================================================================
// FIT CLASS PARSER
// ============================================================================

/** Parse a fit notation like "H7/g6", "H7", "g6" */
function parseFitClass(
  raw: string,
  nominal_mm: number,
): { upper_dev_mm: number; lower_dev_mm: number; fit_class: string } | null {
  // Full fit: H7/g6
  const fullMatch = raw.match(/([A-Z][Ss]?)(\d+)\s*\/\s*([a-z][s]?)(\d+)/);
  if (fullMatch) {
    // Shaft specification (lowercase)
    const shaftSym = fullMatch[3];
    const shaftGrade = parseInt(fullMatch[4]);
    const shaftDev = getShaftDeviation(shaftSym, nominal_mm);
    const shaftIT = getITTolerance(shaftGrade, nominal_mm);

    // For shafts: upper = fundamental deviation, lower = deviation - IT
    if (shaftSym === "h" || shaftSym === "js") {
      // h: 0 to -IT, js: ±IT/2
      if (shaftSym === "js") {
        return { upper_dev_mm: shaftIT / 2, lower_dev_mm: -shaftIT / 2, fit_class: raw };
      }
      return { upper_dev_mm: 0, lower_dev_mm: -shaftIT, fit_class: raw };
    }

    // f, g: negative deviation, lower = deviation - IT
    if (shaftDev <= 0) {
      return { upper_dev_mm: shaftDev, lower_dev_mm: shaftDev - shaftIT, fit_class: raw };
    }

    // k, n, p: positive deviation (interference), upper = deviation + IT
    return { upper_dev_mm: shaftDev + shaftIT, lower_dev_mm: shaftDev, fit_class: raw };
  }

  // Hole only: H7
  const holeMatch = raw.match(/^([A-Z][Ss]?)(\d+)$/);
  if (holeMatch) {
    const grade = parseInt(holeMatch[2]);
    const it = getITTolerance(grade, nominal_mm);
    // Hole H: lower = 0, upper = +IT
    return { upper_dev_mm: it, lower_dev_mm: 0, fit_class: raw };
  }

  // Shaft only: g6
  const shaftMatch = raw.match(/^([a-z][s]?)(\d+)$/);
  if (shaftMatch) {
    const sym = shaftMatch[1];
    const grade = parseInt(shaftMatch[2]);
    const dev = getShaftDeviation(sym, nominal_mm);
    const it = getITTolerance(grade, nominal_mm);

    if (sym === "js") {
      return { upper_dev_mm: it / 2, lower_dev_mm: -it / 2, fit_class: raw };
    }
    if (sym === "h") {
      return { upper_dev_mm: 0, lower_dev_mm: -it, fit_class: raw };
    }
    if (dev <= 0) {
      return { upper_dev_mm: dev, lower_dev_mm: dev - it, fit_class: raw };
    }
    return { upper_dev_mm: dev + it, lower_dev_mm: dev, fit_class: raw };
  }

  return null;
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class ToleranceExtractionEngine {

  /**
   * Extract and interpret tolerances from blueprint dimensions and GD&T.
   *
   * @param dimensions - Extracted dimensions from BlueprintOCREngine
   * @param gdts - Extracted GD&T frames
   * @param generalToleranceClass - ISO 2768 class (default: "m")
   * @returns Per-feature tolerances with machining strategy implications
   */
  extract(
    dimensions: ExtractedDimension[],
    gdts: ExtractedGDT[],
    generalToleranceClass: "f" | "m" | "c" | "v" = "m",
  ): ToleranceExtractionResult {
    const featureTolerances: FeatureTolerance[] = [];
    const gdtInterpretations: GDTInterpretation[] = [];
    const warnings: string[] = [];
    let defaultsApplied = 0;

    log.info(`[ToleranceExtraction] Processing ${dimensions.length} dims, ${gdts.length} GD&T, class=${generalToleranceClass}`);

    // ── Process each dimension ─────────────────────────────────────
    for (const dim of dimensions) {
      const nominal = dim.unit === "in" ? dim.nominal * 25.4 : dim.nominal;

      let upper_dev = 0;
      let lower_dev = 0;
      let source: FeatureTolerance["source"] = "iso_2768_m";
      let fitClass: string | undefined;

      if (dim.tolerance) {
        // Explicit tolerance from drawing
        upper_dev = dim.unit === "in" ? dim.tolerance.upper * 25.4 : dim.tolerance.upper;
        lower_dev = dim.unit === "in" ? dim.tolerance.lower * 25.4 : dim.tolerance.lower;
        source = "explicit";
      } else if (dim.fit_class) {
        // Fit notation (H7/g6, etc.)
        const parsed = parseFitClass(dim.fit_class, nominal);
        if (parsed) {
          upper_dev = parsed.upper_dev_mm;
          lower_dev = parsed.lower_dev_mm;
          fitClass = parsed.fit_class;
          source = "fit_class";
        } else {
          warnings.push(`Could not parse fit class "${dim.fit_class}" for ${dim.id}`);
          // Fall through to general tolerance
        }
      }

      // Apply general tolerance if no explicit tolerance
      if (source !== "explicit" && source !== "fit_class") {
        const genTol = getGeneralTolerance(nominal, generalToleranceClass);
        upper_dev = genTol;
        lower_dev = -genTol;
        source = `iso_2768_${generalToleranceClass}` as FeatureTolerance["source"];
        defaultsApplied++;
      }

      const band = Math.abs(upper_dev - lower_dev);
      const strategy = determineStrategy(band, gdts, dim.id);

      featureTolerances.push({
        feature_id: dim.id,
        nominal_mm: nominal,
        upper_dev_mm: upper_dev,
        lower_dev_mm: lower_dev,
        tolerance_band_mm: band,
        source,
        fit_class: fitClass,
        strategy,
        raw_text: dim.raw_text,
        confidence: dim.confidence,
      });
    }

    // ── Process GD&T frames ────────────────────────────────────────
    for (const gdt of gdts) {
      const tolMM = gdt.tolerance_unit === "in" ? gdt.tolerance_value * 25.4 : gdt.tolerance_value;
      const implications: string[] = [];
      const strategyOverrides: Partial<ToleranceStrategy> = {};

      switch (gdt.symbol) {
        case "position":
          implications.push(`Position tolerance ${tolMM}mm — controls feature location`);
          if (gdt.material_condition === "MMC") {
            implications.push("MMC bonus tolerance applies — larger hole = more tolerance");
          }
          break;

        case "concentricity":
          implications.push(`Concentricity ${tolMM}mm — OD/ID must be coaxial`);
          strategyOverrides.requires_single_setup = true;
          strategyOverrides.requires_between_centers = true;
          if (tolMM < 0.025) {
            strategyOverrides.requires_spring_pass = true;
          }
          break;

        case "circular_runout":
        case "total_runout":
          implications.push(`Runout ${tolMM}mm relative to datum ${gdt.datum_references.join(",")}`);
          strategyOverrides.requires_between_centers = true;
          if (tolMM < 0.010) {
            strategyOverrides.precision_level = "fine_finish";
            implications.push("Tight runout — fine finish with tailstock mandatory");
          }
          break;

        case "cylindricity":
          implications.push(`Cylindricity ${tolMM}mm — controls form of cylinder`);
          if (tolMM < 0.010) {
            strategyOverrides.requires_spring_pass = true;
            strategyOverrides.precision_level = "fine_finish";
          }
          break;

        case "perpendicularity":
          implications.push(`Perpendicularity ${tolMM}mm to datum ${gdt.datum_references.join(",")}`);
          if (gdt.datum_references.includes("A")) {
            implications.push("Perpendicular to primary datum — face must be machined first");
          }
          break;

        case "parallelism":
          implications.push(`Parallelism ${tolMM}mm to datum ${gdt.datum_references.join(",")}`);
          break;

        case "profile_surface":
        case "profile_line":
          implications.push(`Profile tolerance ${tolMM}mm — contour accuracy requirement`);
          if (tolMM < 0.025) {
            strategyOverrides.precision_level = "fine_finish";
            strategyOverrides.finish_feed_override_mm_rev = 0.05;
          }
          break;

        case "flatness":
          implications.push(`Flatness ${tolMM}mm — face must be flat within tolerance`);
          break;

        case "straightness":
          implications.push(`Straightness ${tolMM}mm — axis/line must be straight`);
          if (tolMM < 0.010) {
            strategyOverrides.requires_between_centers = true;
          }
          break;

        default:
          implications.push(`${gdt.symbol} ${tolMM}mm`);
      }

      gdtInterpretations.push({
        gdt_id: gdt.id,
        symbol: gdt.symbol,
        tolerance_mm: tolMM,
        datums: gdt.datum_references,
        applied_to: gdt.applied_to || "unknown",
        implications,
        strategy_overrides: strategyOverrides,
      });
    }

    log.info(`[ToleranceExtraction] Complete: ${featureTolerances.length} tolerances, ${gdtInterpretations.length} GD&T, ${defaultsApplied} defaults`);

    return {
      feature_tolerances: featureTolerances,
      gdt_interpretations: gdtInterpretations,
      general_tolerance_class: generalToleranceClass,
      defaults_applied: defaultsApplied,
      warnings,
    };
  }

  /**
   * Parse a standalone fit class notation into deviations.
   * Useful for external callers that just need fit decomposition.
   *
   * @param fitNotation - e.g., "H7/g6", "H7", "g6"
   * @param nominal_mm - Nominal diameter in mm
   * @returns Deviations or null if unparseable
   */
  parseFit(
    fitNotation: string,
    nominal_mm: number,
  ): { upper_mm: number; lower_mm: number; band_mm: number; fit_class: string } | null {
    const result = parseFitClass(fitNotation, nominal_mm);
    if (!result) return null;
    return {
      upper_mm: result.upper_dev_mm,
      lower_mm: result.lower_dev_mm,
      band_mm: Math.abs(result.upper_dev_mm - result.lower_dev_mm),
      fit_class: result.fit_class,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const toleranceExtractionEngine = new ToleranceExtractionEngine();
