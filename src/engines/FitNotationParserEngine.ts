/**
 * FitNotationParserEngine — H7/g6 → Actual Tolerance Bands
 *
 * Parses ISO 286-1:2010 fit notation strings and returns actual tolerance
 * bands (upper/lower deviations in µm) for a given nominal diameter.
 *
 * Supports:
 *   - Combined fits: "H7/g6", "H7/p6"
 *   - Single hole basis: "H7", "H8", "H11"
 *   - Single shaft basis: "g6", "h6", "p6", "js7"
 *   - Letter codes: a-zc (shaft), A-ZC (hole)
 *   - IT grades: IT01, IT0, IT1..IT18
 *   - Standard diameter ranges: 0-3, 3-6, ..., 400-500mm
 *
 * Output per component:
 *   - upper_deviation_um, lower_deviation_um, tolerance_band_um
 *   - Fit classification: clearance / transition / interference
 *   - Machining implication: IT grade → required process
 *
 * References:
 *   - ISO 286-1:2010 (Geometrical product specifications — ISO code system
 *     for tolerances on linear sizes — Part 1: Basis of tolerances,
 *     deviations and fits)
 *   - ISO 286-2:2010 (Part 2: Tables of standard tolerance classes and
 *     limit deviations for holes and shafts)
 *
 * @module engines/FitNotationParserEngine
 * @milestone LATHE-PRO-MS-1 U-LPI11
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Parsed fit notation components */
export interface FitNotation {
  /** Full original string (e.g., "H7/g6") */
  raw: string;
  /** Hole component (e.g., "H7") — null if shaft-only */
  hole?: { letter: string; grade: number };
  /** Shaft component (e.g., "g6") — null if hole-only */
  shaft?: { letter: string; grade: number };
}

/** Tolerance band for a single component */
export interface ToleranceBand {
  /** Fundamental deviation letter (e.g., "H", "g") */
  letter: string;
  /** IT grade (e.g., 7) */
  grade: number;
  /** Upper deviation in µm (positive = material added) */
  upper_deviation_um: number;
  /** Lower deviation in µm (negative = material removed) */
  lower_deviation_um: number;
  /** Tolerance band width in µm (always positive) */
  tolerance_band_um: number;
  /** Is this a hole or shaft component */
  component: "hole" | "shaft";
}

/** Fit classification */
export type FitType = "clearance" | "transition" | "interference";

/** Machining process recommendation based on IT grade */
export interface MachiningImplication {
  /** Required process */
  process: string;
  /** Approximate Ra achievable (µm) */
  typical_ra_um: number;
  /** Notes */
  notes: string;
}

/** Full fit analysis result */
export interface FitAnalysisResult {
  /** Original notation */
  notation: FitNotation;
  /** Nominal diameter used for lookup (mm) */
  nominal_diameter_mm: number;
  /** Hole tolerance band (if hole specified) */
  hole?: ToleranceBand;
  /** Shaft tolerance band (if shaft specified) */
  shaft?: ToleranceBand;
  /** Fit type (if both hole and shaft specified) */
  fit_type?: FitType;
  /** Min/max clearance or interference (µm) */
  clearance_um?: { min: number; max: number };
  /** Machining implications */
  machining: MachiningImplication[];
  /** Warnings */
  warnings: string[];
}

// ============================================================================
// ISO 286 STANDARD TOLERANCE GRADES (IT values in µm)
// ============================================================================

/** Nominal diameter ranges in mm — ISO 286-1 Table 1 */
const DIAMETER_RANGES: Array<{ min: number; max: number }> = [
  { min: 0, max: 3 },
  { min: 3, max: 6 },
  { min: 6, max: 10 },
  { min: 10, max: 18 },
  { min: 18, max: 30 },
  { min: 30, max: 50 },
  { min: 50, max: 80 },
  { min: 80, max: 120 },
  { min: 120, max: 180 },
  { min: 180, max: 250 },
  { min: 250, max: 315 },
  { min: 315, max: 400 },
  { min: 400, max: 500 },
];

/**
 * Standard tolerance values (IT grades) in µm per diameter range.
 * ISO 286-1:2010 Table 1.
 * Columns: IT01, IT0, IT1, IT2, IT3, IT4, IT5, IT6, IT7, IT8, IT9, IT10, IT11, IT12, IT13, IT14, IT15, IT16, IT17, IT18
 * Rows: one per diameter range
 */
const IT_TABLE: number[][] = [
  // 0-3mm
  [0.3, 0.5, 0.8, 1.2, 2, 3, 4, 6, 10, 14, 25, 40, 60, 100, 140, 250, 400, 600, 1000, 1400],
  // 3-6mm
  [0.4, 0.6, 1, 1.5, 2.5, 4, 5, 8, 12, 18, 30, 48, 75, 120, 180, 300, 480, 750, 1200, 1800],
  // 6-10mm
  [0.4, 0.6, 1, 1.5, 2.5, 4, 6, 9, 15, 22, 36, 58, 90, 150, 220, 360, 580, 900, 1500, 2200],
  // 10-18mm
  [0.5, 0.8, 1.2, 2, 3, 5, 8, 11, 18, 27, 43, 70, 110, 180, 270, 430, 700, 1100, 1800, 2700],
  // 18-30mm
  [0.6, 1, 1.5, 2.5, 4, 6, 9, 13, 21, 33, 52, 84, 130, 210, 330, 520, 840, 1300, 2100, 3300],
  // 30-50mm
  [0.6, 1, 1.5, 2.5, 4, 7, 11, 16, 25, 39, 62, 100, 160, 250, 390, 620, 1000, 1600, 2500, 3900],
  // 50-80mm
  [0.8, 1, 2, 3, 5, 8, 13, 19, 30, 46, 74, 120, 190, 300, 460, 740, 1200, 1900, 3000, 4600],
  // 80-120mm
  [1, 1.5, 2.5, 4, 6, 10, 15, 22, 35, 54, 87, 140, 220, 350, 540, 870, 1400, 2200, 3500, 5400],
  // 120-180mm
  [1.2, 2, 3.5, 5, 8, 12, 18, 25, 40, 63, 100, 160, 250, 400, 630, 1000, 1600, 2500, 4000, 6300],
  // 180-250mm
  [2, 3, 4.5, 7, 10, 14, 20, 29, 46, 72, 115, 185, 290, 460, 720, 1150, 1850, 2900, 4600, 7200],
  // 250-315mm
  [2.5, 4, 6, 8, 12, 16, 23, 32, 52, 81, 130, 210, 320, 520, 810, 1300, 2100, 3200, 5200, 8100],
  // 315-400mm
  [3, 5, 7, 9, 13, 18, 25, 36, 57, 89, 140, 230, 360, 570, 890, 1400, 2300, 3600, 5700, 8900],
  // 400-500mm
  [4, 6, 8, 10, 15, 20, 27, 40, 63, 97, 155, 250, 400, 630, 970, 1550, 2500, 4000, 6300, 9700],
];

/** IT grade index mapping */
const IT_GRADES = ["IT01", "IT0", "IT1", "IT2", "IT3", "IT4", "IT5", "IT6", "IT7", "IT8", "IT9", "IT10", "IT11", "IT12", "IT13", "IT14", "IT15", "IT16", "IT17", "IT18"];

// ============================================================================
// FUNDAMENTAL DEVIATIONS (µm) — ISO 286-1:2010 Tables 2 & 3
// ============================================================================

/**
 * Shaft fundamental deviations — lower-case letters a to zc.
 * Each entry: [letter, type ("es"|"ei"), values per diameter range].
 * "es" = upper deviation, "ei" = lower deviation.
 * For most shaft letters, the fundamental deviation is "es" (upper).
 * For letters j-zc past the zero line, the fundamental deviation is "ei" (lower).
 *
 * Simplified to the most commonly used letters: a, b, c, d, e, f, g, h, j, js, k, m, n, p, r, s, t, u, x, z
 */
type DevEntry = { letter: string; dev_type: "es" | "ei"; values: number[] };

const SHAFT_DEVIATIONS: DevEntry[] = [
  // Letters a-h: fundamental deviation = es (upper), es is NEGATIVE (shaft below nominal)
  { letter: "a",  dev_type: "es", values: [-270, -270, -280, -290, -300, -310, -320, -340, -360, -380, -410, -440, -480] },
  { letter: "b",  dev_type: "es", values: [-140, -140, -150, -150, -160, -170, -180, -190, -200, -210, -230, -240, -260] },
  { letter: "c",  dev_type: "es", values: [-60, -70, -80, -95, -110, -120, -130, -140, -150, -170, -180, -200, -210] },
  { letter: "d",  dev_type: "es", values: [-20, -30, -40, -50, -65, -80, -100, -120, -145, -170, -190, -210, -230] },
  { letter: "e",  dev_type: "es", values: [-14, -20, -25, -32, -40, -50, -60, -72, -85, -100, -110, -125, -135] },
  { letter: "f",  dev_type: "es", values: [-6, -10, -13, -16, -20, -25, -30, -36, -43, -50, -56, -62, -68] },
  { letter: "g",  dev_type: "es", values: [-2, -4, -5, -6, -7, -9, -10, -12, -14, -15, -17, -18, -20] },
  { letter: "h",  dev_type: "es", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  // Letters j, k: fundamental deviation = ei (lower), near zero line
  // js: symmetrical tolerance (±IT/2)
  { letter: "j",  dev_type: "ei", values: [-2, -2, -2, -3, -3, -4, -5, -5, -6, -7, -7, -7, -8] },
  { letter: "k",  dev_type: "ei", values: [0, 1, 1, 1, 2, 2, 2, 3, 3, 4, 4, 4, 5] },
  // Letters m-zc: fundamental deviation = ei (lower), ei is POSITIVE (shaft above nominal = interference direction)
  { letter: "m",  dev_type: "ei", values: [2, 4, 6, 7, 8, 9, 11, 13, 15, 17, 20, 21, 23] },
  { letter: "n",  dev_type: "ei", values: [4, 8, 10, 12, 15, 17, 20, 23, 27, 31, 34, 37, 40] },
  { letter: "p",  dev_type: "ei", values: [6, 12, 15, 18, 22, 26, 32, 37, 43, 50, 56, 62, 68] },
  { letter: "r",  dev_type: "ei", values: [10, 15, 19, 23, 28, 34, 41, 48, 55, 63, 72, 78, 86] },
  { letter: "s",  dev_type: "ei", values: [14, 19, 23, 28, 35, 43, 53, 59, 68, 79, 88, 98, 108] },
  { letter: "t",  dev_type: "ei", values: [18, 23, 28, 33, 41, 48, 60, 68, 79, 92, 101, 114, 126] },
  { letter: "u",  dev_type: "ei", values: [18, 28, 34, 40, 48, 58, 70, 82, 94, 109, 122, 137, 151] },
  { letter: "x",  dev_type: "ei", values: [20, 34, 42, 52, 64, 78, 94, 112, 130, 150, 170, 190, 210] },
  { letter: "z",  dev_type: "ei", values: [26, 44, 56, 67, 81, 98, 118, 139, 160, 185, 210, 232, 258] },
];

/**
 * Hole fundamental deviations — upper-case letters A to ZC.
 * Hole deviations mirror shaft deviations with sign change.
 * H has EI = 0 (lower deviation is zero, tolerance goes positive).
 * For simplicity, we derive hole deviations from shaft by sign-swapping.
 */
const HOLE_BASE_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "J", "K", "M", "N", "P", "R", "S", "T", "U", "X", "Z"];

// ============================================================================
// MACHINING IMPLICATIONS
// ============================================================================

const IT_TO_PROCESS: Record<number, MachiningImplication> = {
  1: { process: "lapping/honing", typical_ra_um: 0.1, notes: "Precision grinding + lapping required" },
  2: { process: "lapping/honing", typical_ra_um: 0.1, notes: "Precision grinding + lapping required" },
  3: { process: "precision grinding", typical_ra_um: 0.2, notes: "Cylindrical grinding with fine wheel" },
  4: { process: "precision grinding", typical_ra_um: 0.4, notes: "Cylindrical grinding" },
  5: { process: "fine grinding/honing", typical_ra_um: 0.4, notes: "Finish grinding or honing" },
  6: { process: "finish turning", typical_ra_um: 0.8, notes: "Finish turning with fine feed, sharp insert" },
  7: { process: "careful turning", typical_ra_um: 1.6, notes: "Finish turning pass required" },
  8: { process: "standard turning", typical_ra_um: 3.2, notes: "Standard finish pass" },
  9: { process: "standard turning", typical_ra_um: 3.2, notes: "Single finish pass adequate" },
  10: { process: "rough turning", typical_ra_um: 6.3, notes: "Rough turning may suffice" },
  11: { process: "rough turning", typical_ra_um: 6.3, notes: "Rough turning only" },
  12: { process: "rough turning/sawing", typical_ra_um: 12.5, notes: "As-machined or sawn stock" },
  13: { process: "sawing/shearing", typical_ra_um: 25, notes: "Non-critical dimension" },
  14: { process: "casting/forging", typical_ra_um: 25, notes: "As-cast or as-forged" },
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class FitNotationParserEngine {

  /**
   * Parse a fit notation string and compute tolerance bands.
   *
   * @param notation - Fit string (e.g., "H7/g6", "H7", "g6")
   * @param nominal_diameter_mm - Nominal diameter in mm
   * @returns Full fit analysis with deviations, classification, and machining implications
   */
  static parse(notation: string, nominal_diameter_mm: number): FitAnalysisResult {
    const warnings: string[] = [];

    if (nominal_diameter_mm <= 0 || nominal_diameter_mm > 500) {
      warnings.push(`Diameter ${nominal_diameter_mm}mm outside ISO 286 range (0-500mm)`);
    }

    // Parse notation
    const parsed = FitNotationParserEngine.parseNotation(notation);
    if (!parsed.hole && !parsed.shaft) {
      return {
        notation: parsed,
        nominal_diameter_mm,
        warnings: [`Could not parse fit notation: "${notation}"`],
        machining: [],
      };
    }

    // Find diameter range
    const rangeIdx = FitNotationParserEngine.findDiameterRange(nominal_diameter_mm);

    // Compute hole band
    let holeBand: ToleranceBand | undefined;
    if (parsed.hole) {
      holeBand = FitNotationParserEngine.computeHoleBand(
        parsed.hole.letter, parsed.hole.grade, rangeIdx,
      );
      if (!holeBand) warnings.push(`Unknown hole letter: ${parsed.hole.letter}`);
    }

    // Compute shaft band
    let shaftBand: ToleranceBand | undefined;
    if (parsed.shaft) {
      shaftBand = FitNotationParserEngine.computeShaftBand(
        parsed.shaft.letter, parsed.shaft.grade, rangeIdx,
      );
      if (!shaftBand) warnings.push(`Unknown shaft letter: ${parsed.shaft.letter}`);
    }

    // Fit classification
    let fitType: FitType | undefined;
    let clearanceRange: { min: number; max: number } | undefined;
    if (holeBand && shaftBand) {
      // Clearance = hole_lower - shaft_upper (min) and hole_upper - shaft_lower (max)
      const minClr = holeBand.lower_deviation_um - shaftBand.upper_deviation_um;
      const maxClr = holeBand.upper_deviation_um - shaftBand.lower_deviation_um;
      clearanceRange = { min: minClr, max: maxClr };

      if (minClr > 0) {
        fitType = "clearance";
      } else if (maxClr < 0) {
        fitType = "interference";
      } else {
        fitType = "transition";
      }
    }

    // Machining implications
    const machining: MachiningImplication[] = [];
    if (parsed.hole) {
      const impl = IT_TO_PROCESS[parsed.hole.grade] || IT_TO_PROCESS[14];
      machining.push({ ...impl, process: `Hole: ${impl.process}` });
    }
    if (parsed.shaft) {
      const impl = IT_TO_PROCESS[parsed.shaft.grade] || IT_TO_PROCESS[14];
      machining.push({ ...impl, process: `Shaft: ${impl.process}` });
    }

    log.info(`[FitNotation] ${notation} @ Ø${nominal_diameter_mm}mm → ${fitType || "single"} ${holeBand ? `hole(+${holeBand.upper_deviation_um}/${holeBand.lower_deviation_um}µm)` : ""} ${shaftBand ? `shaft(+${shaftBand.upper_deviation_um}/${shaftBand.lower_deviation_um}µm)` : ""}`);

    return {
      notation: parsed,
      nominal_diameter_mm,
      hole: holeBand,
      shaft: shaftBand,
      fit_type: fitType,
      clearance_um: clearanceRange,
      machining,
      warnings,
    };
  }

  /**
   * Get the IT tolerance value in µm for a given grade and diameter.
   *
   * @param grade - IT grade (0-18, or 101 for IT01)
   * @param nominal_diameter_mm - Nominal diameter in mm
   * @returns Tolerance value in µm
   */
  static getITValue(grade: number, nominal_diameter_mm: number): number {
    const rangeIdx = FitNotationParserEngine.findDiameterRange(nominal_diameter_mm);
    // Grade mapping: IT01=0, IT0=1, IT1=2, ..., IT18=19
    let colIdx: number;
    if (grade === -1 || grade === 101) colIdx = 0; // IT01
    else if (grade === 0) colIdx = 1;
    else colIdx = grade + 1;

    if (colIdx < 0 || colIdx >= 20) return 0;
    return IT_TABLE[rangeIdx]?.[colIdx] ?? 0;
  }

  // ── Parsing ─────────────────────────────────────────────────────────

  /** Parse notation string into hole/shaft components */
  private static parseNotation(raw: string): FitNotation {
    const trimmed = raw.trim();
    const result: FitNotation = { raw: trimmed };

    // Combined fit: "H7/g6" or "H7g6"
    const combinedSlash = trimmed.match(/^([A-Z][A-Za-z]?)(\d+)\s*\/\s*([a-z][a-z]?)(\d+)$/);
    if (combinedSlash) {
      result.hole = { letter: combinedSlash[1], grade: parseInt(combinedSlash[2]) };
      result.shaft = { letter: combinedSlash[3], grade: parseInt(combinedSlash[4]) };
      return result;
    }

    const combinedNoSlash = trimmed.match(/^([A-Z][A-Za-z]?)(\d+)\s*([a-z][a-z]?)(\d+)$/);
    if (combinedNoSlash) {
      result.hole = { letter: combinedNoSlash[1], grade: parseInt(combinedNoSlash[2]) };
      result.shaft = { letter: combinedNoSlash[3], grade: parseInt(combinedNoSlash[4]) };
      return result;
    }

    // Single hole: "H7"
    const holeOnly = trimmed.match(/^([A-Z][A-Za-z]?)(\d+)$/);
    if (holeOnly) {
      result.hole = { letter: holeOnly[1], grade: parseInt(holeOnly[2]) };
      return result;
    }

    // Single shaft: "g6", "js7"
    const shaftOnly = trimmed.match(/^([a-z][a-z]?)(\d+)$/);
    if (shaftOnly) {
      result.shaft = { letter: shaftOnly[1], grade: parseInt(shaftOnly[2]) };
      return result;
    }

    return result;
  }

  /** Find diameter range index */
  private static findDiameterRange(dia: number): number {
    for (let i = 0; i < DIAMETER_RANGES.length; i++) {
      if (dia > DIAMETER_RANGES[i].min && dia <= DIAMETER_RANGES[i].max) return i;
    }
    // Below 0 or above 500: clamp
    if (dia <= 0) return 0;
    return DIAMETER_RANGES.length - 1;
  }

  // ── Band Computation ────────────────────────────────────────────────

  /** Compute hole tolerance band */
  private static computeHoleBand(
    letter: string,
    grade: number,
    rangeIdx: number,
  ): ToleranceBand | undefined {
    const itValue = FitNotationParserEngine.getITForRange(grade, rangeIdx);
    if (itValue === null) return undefined;

    // Special case: JS (symmetrical)
    if (letter === "JS" || letter === "Js") {
      return {
        letter, grade,
        upper_deviation_um: Math.round(itValue / 2),
        lower_deviation_um: -Math.round(itValue / 2),
        tolerance_band_um: itValue,
        component: "hole",
      };
    }

    // H is the base: EI = 0, ES = EI + IT
    if (letter === "H") {
      return {
        letter, grade,
        upper_deviation_um: itValue,
        lower_deviation_um: 0,
        tolerance_band_um: itValue,
        component: "hole",
      };
    }

    // For other hole letters: derive from shaft by sign-swapping
    // Hole letter X → deviation = -(shaft letter x deviation)
    const shaftLetter = letter.toLowerCase();
    const shaftDev = FitNotationParserEngine.getShaftDeviation(shaftLetter, rangeIdx);
    if (shaftDev === null) return undefined;

    // Hole: fundamental deviation = -shaft_deviation
    // For letters A-G: EI = -es(shaft), ES = EI + IT
    // For letters K-Z: ES = -ei(shaft), EI = ES - IT
    const lowerIdx = HOLE_BASE_LETTERS.indexOf(letter);
    if (lowerIdx < 0) return undefined;

    if (letter <= "H") {
      // A-H: lower deviation (EI) = -es of corresponding shaft
      const EI = -(shaftDev.deviation);
      const ES = EI + itValue;
      return {
        letter, grade,
        upper_deviation_um: ES,
        lower_deviation_um: EI,
        tolerance_band_um: itValue,
        component: "hole",
      };
    } else {
      // K-Z: upper deviation (ES) = -ei of corresponding shaft
      const ES = -(shaftDev.deviation);
      const EI = ES - itValue;
      return {
        letter, grade,
        upper_deviation_um: ES,
        lower_deviation_um: EI,
        tolerance_band_um: itValue,
        component: "hole",
      };
    }
  }

  /** Compute shaft tolerance band */
  private static computeShaftBand(
    letter: string,
    grade: number,
    rangeIdx: number,
  ): ToleranceBand | undefined {
    const itValue = FitNotationParserEngine.getITForRange(grade, rangeIdx);
    if (itValue === null) return undefined;

    // js: symmetrical
    if (letter === "js") {
      return {
        letter, grade,
        upper_deviation_um: Math.round(itValue / 2),
        lower_deviation_um: -Math.round(itValue / 2),
        tolerance_band_um: itValue,
        component: "shaft",
      };
    }

    // h: es = 0, ei = es - IT = -IT
    if (letter === "h") {
      return {
        letter, grade,
        upper_deviation_um: 0,
        lower_deviation_um: -itValue,
        tolerance_band_um: itValue,
        component: "shaft",
      };
    }

    const devInfo = FitNotationParserEngine.getShaftDeviation(letter, rangeIdx);
    if (!devInfo) return undefined;

    if (devInfo.type === "es") {
      // Letters a-h: fundamental = es (upper deviation)
      const es = devInfo.deviation;
      const ei = es - itValue;
      return {
        letter, grade,
        upper_deviation_um: es,
        lower_deviation_um: ei,
        tolerance_band_um: itValue,
        component: "shaft",
      };
    } else {
      // Letters j-z: fundamental = ei (lower deviation)
      const ei = devInfo.deviation;
      const es = ei + itValue;
      return {
        letter, grade,
        upper_deviation_um: es,
        lower_deviation_um: ei,
        tolerance_band_um: itValue,
        component: "shaft",
      };
    }
  }

  /** Get shaft fundamental deviation for a letter at a diameter range */
  private static getShaftDeviation(
    letter: string,
    rangeIdx: number,
  ): { deviation: number; type: "es" | "ei" } | null {
    const entry = SHAFT_DEVIATIONS.find(d => d.letter === letter);
    if (!entry) return null;
    const val = entry.values[rangeIdx];
    if (val === undefined) return null;
    return { deviation: val, type: entry.dev_type };
  }

  /** Get IT tolerance value for a grade at a diameter range index */
  private static getITForRange(grade: number, rangeIdx: number): number | null {
    let colIdx: number;
    if (grade === -1 || grade === 101) colIdx = 0;
    else if (grade === 0) colIdx = 1;
    else colIdx = grade + 1;

    if (colIdx < 0 || colIdx >= 20) return null;
    return IT_TABLE[rangeIdx]?.[colIdx] ?? null;
  }
}

/** Singleton instance */
export const fitNotationParserEngine = new FitNotationParserEngine();
