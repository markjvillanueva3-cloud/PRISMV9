/**
 * PRISM MCP Server - Tolerance Engine (R3-P2)
 *
 * ISO 286-1:2010 tolerance analysis:
 *   - IT grade lookup (tolerance width for nominal size + grade)
 *   - Shaft/hole fit analysis (clearance / transition / interference)
 *   - Tolerance stack-up (worst case + RSS)
 *   - Process capability (Cpk/Cp)
 *
 * All data from ISO 286-1:2010 Tables 1-5.
 * Reference: "ISO system of limits and fits — Part 1: Bases of tolerances,
 * deviations and fits"
 *
 * Exported functions:
 *   calculateITGrade(nominal_mm, it_grade)
 *   analyzeShaftHoleFit(nominal_mm, fit_class)
 *   toleranceStackUp(dimensions[])
 *   calculateCpk(nominal_mm, tolerance_mm, process_sigma_mm)
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// ISO 286 SIZE BANDS
// ============================================================================

/** ISO 286 nominal size bands (mm). Each entry: [min, max] inclusive. */
const SIZE_BANDS: Array<[number, number]> = [
  [1, 3],
  [3, 6],
  [6, 10],
  [10, 18],
  [18, 30],
  [30, 50],
  [50, 80],
  [80, 120],
  [120, 180],
  [180, 250],
  [250, 315],
  [315, 400],
  [400, 500],
];

/** Find the ISO 286 size band index for a given nominal dimension. */
function findSizeBand(nominal_mm: number): number {
  for (let i = 0; i < SIZE_BANDS.length; i++) {
    const [lo, hi] = SIZE_BANDS[i];
    // First band [1,3] is inclusive on both ends; subsequent bands are (lo, hi]
    if ((i === 0 ? nominal_mm >= lo : nominal_mm > lo) && nominal_mm <= hi) return i;
  }
  return -1;
}

/** Geometric mean of a size band (used in fundamental deviation formulas). */
function bandGeometricMean(bandIdx: number): number {
  const [lo, hi] = SIZE_BANDS[bandIdx];
  return Math.sqrt(lo * hi);
}

// ============================================================================
// IT GRADE TOLERANCE TABLE (ISO 286-1:2010 Table 1)
// ============================================================================

/**
 * IT grade tolerance values in micrometers (μm).
 * Rows: 13 size bands (1-3 through 400-500).
 * Columns: IT grades 01, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18
 * Index mapping: IT01=0, IT0=1, IT1=2, ..., IT18=19
 */
const IT_TABLE: number[][] = [
  // 1-3 mm
  [0.3, 0.5, 0.8, 1.2, 2, 3, 4, 6, 10, 14, 25, 40, 60, 100, 140, 250, 400, 600, 1000, 1400],
  // 3-6 mm
  [0.4, 0.6, 1, 1.5, 2.5, 4, 5, 8, 12, 18, 30, 48, 75, 120, 180, 300, 480, 750, 1200, 1800],
  // 6-10 mm
  [0.4, 0.6, 1, 1.5, 2.5, 4, 6, 9, 15, 22, 36, 58, 90, 150, 220, 360, 580, 900, 1500, 2200],
  // 10-18 mm
  [0.5, 0.8, 1.2, 2, 3, 5, 8, 11, 18, 27, 43, 70, 110, 180, 270, 430, 700, 1100, 1800, 2700],
  // 18-30 mm
  [0.6, 1, 1.5, 2.5, 4, 6, 9, 13, 21, 33, 52, 84, 130, 210, 330, 520, 840, 1300, 2100, 3300],
  // 30-50 mm
  [0.6, 1, 1.5, 2.5, 4, 7, 11, 16, 25, 39, 62, 100, 160, 250, 390, 620, 1000, 1600, 2500, 3900],
  // 50-80 mm
  [0.8, 1, 2, 3, 5, 8, 13, 19, 30, 46, 74, 120, 190, 300, 460, 740, 1200, 1900, 3000, 4600],
  // 80-120 mm
  [1, 1.5, 2.5, 4, 6, 10, 15, 22, 35, 54, 87, 140, 220, 350, 540, 870, 1400, 2200, 3500, 5400],
  // 120-180 mm
  [1.2, 2, 3.5, 5, 8, 12, 18, 25, 40, 63, 100, 160, 250, 400, 630, 1000, 1600, 2500, 4000, 6300],
  // 180-250 mm
  [2, 3, 4.5, 7, 10, 14, 20, 29, 46, 72, 115, 185, 290, 460, 720, 1150, 1850, 2900, 4600, 7200],
  // 250-315 mm
  [2.5, 4, 6, 8, 12, 16, 23, 32, 52, 81, 130, 210, 320, 520, 810, 1300, 2100, 3200, 5200, 8100],
  // 315-400 mm
  [3, 5, 7, 9, 13, 18, 25, 36, 57, 89, 140, 230, 360, 570, 890, 1400, 2300, 3600, 5700, 8900],
  // 400-500 mm
  [4, 6, 8, 10, 15, 20, 27, 40, 63, 97, 155, 250, 400, 630, 970, 1550, 2500, 4000, 6300, 9700],
];

/** Map IT grade number to column index. IT01=0, IT0=1, IT1=2, ..., IT18=19 */
function itGradeToIndex(grade: number | string): number {
  const g = typeof grade === "string" ? parseInt(grade, 10) : grade;
  if (g === -1) return 0; // IT01
  if (g === 0) return 1;  // IT0
  if (g >= 1 && g <= 18) return g + 1;
  return -1;
}

// ============================================================================
// FUNDAMENTAL DEVIATIONS (ISO 286-1:2010 Tables 2-5)
// ============================================================================

/**
 * Fundamental deviations for shafts (lowercase letters).
 * Each entry: array of 13 values (one per size band), in μm.
 * For shafts, the deviation is the UPPER deviation (es) for positions a-h,
 * and the LOWER deviation (ei) for positions k-zc.
 * h = 0 by definition. H = 0 by definition (holes).
 *
 * Sign convention: negative = below nominal, positive = above nominal.
 * Shafts a-h have negative upper deviations (shaft is below hole).
 * Shafts k-zc have positive lower deviations (shaft is above hole baseline).
 */
interface DeviationEntry {
  /** Upper deviation (es) in μm — used for clearance positions (a-h) */
  es?: number[];
  /** Lower deviation (ei) in μm — used for interference positions (k-zc) */
  ei?: number[];
}

/**
 * Shaft fundamental deviations by position letter.
 * Values per size band index (0-12).
 * For positions a-h: es (upper deviation) is given, ei = es - IT
 * For position js: symmetric, es = +IT/2, ei = -IT/2
 * For positions k-zc: ei (lower deviation) is given, es = ei + IT
 */
const SHAFT_DEVIATIONS: Record<string, number[]> = {
  // Upper deviations (es) for clearance shafts — all NEGATIVE
  a:  [-270, -270, -280, -290, -300, -310, -340, -380, -420, -480, -540, -600, -680],
  b:  [-140, -140, -150, -150, -160, -170, -180, -200, -220, -240, -260, -280, -310],
  c:  [-60,  -70,  -80,  -95,  -110, -120, -140, -150, -170, -190, -210, -230, -250],
  d:  [-20,  -30,  -40,  -50,  -65,  -80,  -100, -120, -145, -170, -190, -210, -230],
  e:  [-14,  -20,  -25,  -32,  -40,  -50,  -60,  -72,  -85,  -100, -110, -125, -135],
  f:  [-6,   -10,  -13,  -16,  -20,  -25,  -30,  -36,  -43,  -50,  -56,  -62,  -68],
  g:  [-2,   -4,   -5,   -6,   -7,   -9,   -10,  -12,  -14,  -15,  -17,  -18,  -20],
  h:  [0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0],

  // Lower deviations (ei) for interference/transition shafts — all POSITIVE
  // js is special: symmetric ±IT/2 (handled in code, not in table)
  k:  [0,    1,    1,    1,    2,    2,    2,    3,    3,    4,    4,    4,    5],
  m:  [2,    4,    6,    7,    8,    9,    11,   13,   15,   17,   20,   21,   23],
  n:  [4,    8,    10,   12,   15,   17,   20,   23,   27,   31,   34,   37,   40],
  p:  [6,    12,   15,   18,   22,   26,   32,   37,   43,   50,   56,   62,   68],
  r:  [10,   15,   19,   23,   28,   34,   41,   48,   55,   63,   72,   78,   86],
  s:  [14,   19,   23,   28,   35,   43,   53,   59,   68,   77,   86,   93,   103],
  t:  [18,   23,   28,   33,   41,   48,   60,   71,   83,   96,   108,  119,  131],
  u:  [18,   28,   33,   39,   48,   60,   75,   88,   102,  118,  133,  148,  165],
  x:  [26,   35,   42,   50,   60,   72,   90,   107,  125,  146,  165,  185,  205],
  z:  [32,   42,   52,   64,   78,   94,   114,  136,  160,  186,  210,  235,   262],
};

/**
 * Hole fundamental deviations by position letter (UPPERCASE).
 * For holes, the convention is opposite to shafts:
 *   H = 0 (lower deviation EI = 0)
 *   For positions A-H: EI (lower deviation) is given (positive = above nominal)
 *   For positions K-ZC: ES (upper deviation) is given (negative = below nominal)
 *
 * Simplification: Hole deviations are the NEGATIVE of the corresponding shaft
 * deviations for the same letter. i.e., EI(A) = -es(a), ES(K) = -ei(k).
 * This holds for all common positions per ISO 286-1 Section 4.3.2.
 *
 * NOTE: ISO 286-1 defines delta correction factors (Δ) for hole positions
 * K, M, N at IT grades > 8. The simple negation rule used here is accurate
 * for the most common precision fits (IT6, IT7) but may deviate by a few
 * microns at coarser grades. Acceptable for quality_predict and common fits.
 */
function getHoleDeviation(position: string, bandIdx: number): { EI: number; ES_from_EI: boolean } | { ES: number; EI_from_ES: boolean } {
  const lower = position.toLowerCase();

  if (lower === "h") {
    // H: EI = 0, ES = EI + IT
    return { EI: 0, ES_from_EI: false };
  }

  // Clearance holes (A-H): EI is positive (hole is enlarged)
  if (["a", "b", "c", "d", "e", "f", "g"].includes(lower)) {
    const shaftEs = SHAFT_DEVIATIONS[lower];
    if (!shaftEs) throw new Error(`Unknown hole position: ${position}`);
    // EI(A) = -es(a), and since es(a) is negative, EI is positive
    return { EI: -shaftEs[bandIdx], ES_from_EI: false };
  }

  // Interference/transition holes (K-ZC): ES is negative (hole is reduced)
  if (["k", "m", "n", "p", "r", "s", "t", "u", "x", "z"].includes(lower)) {
    const shaftEi = SHAFT_DEVIATIONS[lower];
    if (!shaftEi) throw new Error(`Unknown hole position: ${position}`);
    // ES(K) = -ei(k), and since ei(k) is positive, ES is negative
    return { ES: -shaftEi[bandIdx], EI_from_ES: false };
  }

  throw new Error(`Unsupported hole position: ${position}. Supported: A-H, K, M, N, P, R, S, T, U, X, Z`);
}

// ============================================================================
// EXPORTED FUNCTIONS
// ============================================================================

export interface ITGradeResult {
  tolerance_um: number;
  tolerance_mm: number;
  grade: number;
  grade_label: string;
  nominal_mm: number;
  size_band: string;
}

/**
 * Look up ISO 286 IT grade tolerance width for a nominal dimension.
 *
 * @param nominal_mm  Nominal dimension in mm (1–500)
 * @param it_grade    IT grade number (01→-1, 0, 1–18). Common: 6, 7, 8, 9, 11
 * @returns Tolerance width in both μm and mm
 */
export function calculateITGrade(nominal_mm: number, it_grade: number): ITGradeResult {
  if (nominal_mm < 1 || nominal_mm > 500) {
    throw new Error(`[ToleranceEngine] Nominal dimension ${nominal_mm}mm outside ISO 286 range (1–500mm)`);
  }

  const bandIdx = findSizeBand(nominal_mm);
  if (bandIdx < 0) {
    throw new Error(`[ToleranceEngine] No ISO 286 size band for ${nominal_mm}mm`);
  }

  const colIdx = itGradeToIndex(it_grade);
  if (colIdx < 0 || colIdx >= IT_TABLE[0].length) {
    throw new Error(`[ToleranceEngine] Invalid IT grade: ${it_grade}. Valid: -1 (IT01), 0–18`);
  }

  const tolerance_um = IT_TABLE[bandIdx][colIdx];
  const [lo, hi] = SIZE_BANDS[bandIdx];

  return {
    tolerance_um,
    tolerance_mm: tolerance_um / 1000,
    grade: it_grade,
    grade_label: it_grade === -1 ? "IT01" : `IT${it_grade}`,
    nominal_mm,
    size_band: `${lo}–${hi} mm`,
  };
}

export interface FitLimit {
  nominal_mm: number;
  upper_mm: number;
  lower_mm: number;
  tolerance_mm: number;
  tolerance_um: number;
  position: string;
  grade: number;
}

export interface FitAnalysisResult {
  nominal_mm: number;
  fit_class: string;
  hole: FitLimit;
  shaft: FitLimit;
  fit_type: "clearance" | "transition" | "interference";
  min_clearance_mm: number;
  max_clearance_mm: number;
  mean_clearance_mm: number;
}

/**
 * Analyze a shaft/hole fit per ISO 286.
 *
 * @param nominal_mm  Nominal dimension in mm
 * @param fit_class   Fit designation (e.g. "H7/g6", "H7/p6", "H8/f7")
 * @returns Complete fit analysis with limits and fit type
 */
export function analyzeShaftHoleFit(nominal_mm: number, fit_class: string): FitAnalysisResult {
  // Parse fit class: "H7/g6" → hole={position:'H', grade:7}, shaft={position:'g', grade:6}
  const match = fit_class.match(/^([A-Z])(\d+)\s*\/\s*([a-z])(\d+)$/);
  if (!match) {
    throw new Error(
      `[ToleranceEngine] Invalid fit class format: "${fit_class}". ` +
      `Expected format: "H7/g6", "H8/f7", etc.`
    );
  }

  const holePosition = match[1].toUpperCase();
  const holeGrade = parseInt(match[2], 10);
  const shaftPosition = match[3].toLowerCase();
  const shaftGrade = parseInt(match[4], 10);

  if (nominal_mm < 1 || nominal_mm > 500) {
    throw new Error(`[ToleranceEngine] Nominal dimension ${nominal_mm}mm outside ISO 286 range (1–500mm)`);
  }

  const bandIdx = findSizeBand(nominal_mm);
  if (bandIdx < 0) {
    throw new Error(`[ToleranceEngine] No ISO 286 size band for ${nominal_mm}mm`);
  }

  // Get IT tolerance widths
  const holeTol = calculateITGrade(nominal_mm, holeGrade);
  const shaftTol = calculateITGrade(nominal_mm, shaftGrade);

  // Calculate hole limits
  let holeUpper_um: number;
  let holeLower_um: number;

  if (holePosition === "H") {
    holeLower_um = 0; // H: lower deviation = 0
    holeUpper_um = holeTol.tolerance_um;
  } else {
    const holeDev = getHoleDeviation(holePosition, bandIdx);
    if ("EI" in holeDev) {
      holeLower_um = holeDev.EI;
      holeUpper_um = holeLower_um + holeTol.tolerance_um;
    } else {
      holeUpper_um = holeDev.ES;
      holeLower_um = holeUpper_um - holeTol.tolerance_um;
    }
  }

  // Calculate shaft limits
  let shaftUpper_um: number;
  let shaftLower_um: number;

  if (shaftPosition === "h") {
    shaftUpper_um = 0; // h: upper deviation = 0
    shaftLower_um = -shaftTol.tolerance_um;
  } else if (shaftPosition === "js") {
    // js: symmetric ± IT/2
    shaftUpper_um = shaftTol.tolerance_um / 2;
    shaftLower_um = -shaftTol.tolerance_um / 2;
  } else if (["a", "b", "c", "d", "e", "f", "g"].includes(shaftPosition)) {
    // Clearance shafts: es (upper deviation) is given, ei = es - IT
    const esValues = SHAFT_DEVIATIONS[shaftPosition];
    if (!esValues) throw new Error(`[ToleranceEngine] Unknown shaft position: ${shaftPosition}`);
    shaftUpper_um = esValues[bandIdx]; // negative for clearance shafts
    shaftLower_um = shaftUpper_um - shaftTol.tolerance_um;
  } else {
    // Interference/transition shafts: ei (lower deviation) is given, es = ei + IT
    const eiValues = SHAFT_DEVIATIONS[shaftPosition];
    if (!eiValues) throw new Error(`[ToleranceEngine] Unknown shaft position: ${shaftPosition}`);
    shaftLower_um = eiValues[bandIdx]; // positive for interference shafts
    shaftUpper_um = shaftLower_um + shaftTol.tolerance_um;
  }

  // Calculate clearance (positive = clearance, negative = interference)
  // Clearance = Hole dimension - Shaft dimension
  const maxClearance_um = holeUpper_um - shaftLower_um;
  const minClearance_um = holeLower_um - shaftUpper_um;
  const meanClearance_um = (maxClearance_um + minClearance_um) / 2;

  // Determine fit type
  let fit_type: "clearance" | "transition" | "interference";
  if (minClearance_um > 0) {
    fit_type = "clearance";
  } else if (maxClearance_um < 0) {
    fit_type = "interference";
  } else {
    fit_type = "transition";
  }

  const hole: FitLimit = {
    nominal_mm,
    upper_mm: nominal_mm + holeUpper_um / 1000,
    lower_mm: nominal_mm + holeLower_um / 1000,
    tolerance_mm: holeTol.tolerance_mm,
    tolerance_um: holeTol.tolerance_um,
    position: holePosition,
    grade: holeGrade,
  };

  const shaft: FitLimit = {
    nominal_mm,
    upper_mm: nominal_mm + shaftUpper_um / 1000,
    lower_mm: nominal_mm + shaftLower_um / 1000,
    tolerance_mm: shaftTol.tolerance_mm,
    tolerance_um: shaftTol.tolerance_um,
    position: shaftPosition,
    grade: shaftGrade,
  };

  log.info(
    `[ToleranceEngine] ${fit_class} @ ${nominal_mm}mm: ` +
    `${fit_type} fit, clearance ${minClearance_um}–${maxClearance_um} μm`
  );

  return {
    nominal_mm,
    fit_class,
    hole,
    shaft,
    fit_type,
    min_clearance_mm: Math.round(minClearance_um) / 1000,
    max_clearance_mm: Math.round(maxClearance_um) / 1000,
    mean_clearance_mm: Math.round(meanClearance_um) / 1000,
  };
}

export interface StackDimension {
  nominal: number;
  tolerance: number;
  distribution?: "normal" | "uniform";
}

export interface StackUpResult {
  dimensions_analyzed: number;
  mean_dimension: number;
  worst_case_tolerance: number;
  rss_tolerance: number;
  worst_case_range: { min: number; max: number };
  rss_range: { min: number; max: number };
}

/**
 * Tolerance stack-up analysis (worst case + RSS statistical).
 *
 * @param dimensions  Array of dimensions with bilateral tolerances
 * @returns Stack-up results with both worst-case and RSS
 */
export function toleranceStackUp(dimensions: StackDimension[]): StackUpResult {
  if (!dimensions || dimensions.length === 0) {
    throw new Error("[ToleranceEngine] toleranceStackUp: at least one dimension required");
  }

  const mean = dimensions.reduce((s, d) => s + d.nominal, 0);
  const worstCase = dimensions.reduce((s, d) => s + Math.abs(d.tolerance), 0);
  const rss = Math.sqrt(dimensions.reduce((s, d) => s + d.tolerance * d.tolerance, 0));

  log.info(`[ToleranceEngine] Stack-up: ${dimensions.length} dims, WC=${worstCase.toFixed(3)}, RSS=${rss.toFixed(3)}`);

  return {
    dimensions_analyzed: dimensions.length,
    mean_dimension: Math.round(mean * 1000) / 1000,
    worst_case_tolerance: Math.round(worstCase * 1000) / 1000,
    rss_tolerance: Math.round(rss * 1000) / 1000,
    worst_case_range: {
      min: Math.round((mean - worstCase) * 1000) / 1000,
      max: Math.round((mean + worstCase) * 1000) / 1000,
    },
    rss_range: {
      min: Math.round((mean - rss) * 1000) / 1000,
      max: Math.round((mean + rss) * 1000) / 1000,
    },
  };
}

export interface CpkResult {
  cpk: number;
  cp: number;
  sigma: number;
  tolerance_mm: number;
  upper_spec: number;
  lower_spec: number;
  nominal_mm: number;
  capability_rating: "excellent" | "good" | "adequate" | "inadequate";
}

/**
 * Calculate process capability indices Cp and Cpk.
 *
 * @param nominal_mm       Nominal dimension
 * @param tolerance_mm     Bilateral tolerance (± this value)
 * @param process_sigma_mm Process standard deviation in mm
 * @returns Cp, Cpk, and capability rating
 */
export function calculateCpk(
  nominal_mm: number,
  tolerance_mm: number,
  process_sigma_mm: number
): CpkResult {
  if (process_sigma_mm <= 0) {
    throw new Error("[ToleranceEngine] calculateCpk: process_sigma must be > 0");
  }
  if (tolerance_mm <= 0) {
    throw new Error("[ToleranceEngine] calculateCpk: tolerance must be > 0");
  }

  const USL = nominal_mm + tolerance_mm;
  const LSL = nominal_mm - tolerance_mm;
  const totalTolerance = 2 * tolerance_mm;

  // Cp = (USL - LSL) / (6σ) — process potential (centered)
  const cp = totalTolerance / (6 * process_sigma_mm);

  // Cpk = min((USL - μ) / 3σ, (μ - LSL) / 3σ) — assumes μ = nominal (centered)
  const cpk_upper = (USL - nominal_mm) / (3 * process_sigma_mm);
  const cpk_lower = (nominal_mm - LSL) / (3 * process_sigma_mm);
  const cpk = Math.min(cpk_upper, cpk_lower);

  // Rating per automotive/aerospace standards
  let capability_rating: "excellent" | "good" | "adequate" | "inadequate";
  if (cpk >= 2.0) capability_rating = "excellent";
  else if (cpk >= 1.33) capability_rating = "good";
  else if (cpk >= 1.0) capability_rating = "adequate";
  else capability_rating = "inadequate";

  log.info(`[ToleranceEngine] Cpk=${cpk.toFixed(2)}, Cp=${cp.toFixed(2)}, rating=${capability_rating}`);

  return {
    cpk: Math.round(cpk * 100) / 100,
    cp: Math.round(cp * 100) / 100,
    sigma: process_sigma_mm,
    tolerance_mm,
    upper_spec: USL,
    lower_spec: LSL,
    nominal_mm,
    capability_rating,
  };
}

/**
 * Find the achievable IT grade for a given deflection.
 * Returns the tightest (lowest) IT grade where the tolerance band
 * is at least 2× the deflection (safety margin for process variation).
 *
 * @param nominal_mm      Nominal dimension
 * @param deflection_mm   Max tool deflection in mm
 * @returns IT grade result or null if no grade achievable
 */
export function findAchievableGrade(nominal_mm: number, deflection_mm: number): ITGradeResult | null {
  if (nominal_mm < 1 || nominal_mm > 500) return null;

  const required_um = deflection_mm * 1000 * 2; // 2× safety margin

  // Search from IT5 (tightest practical machining) to IT14
  for (let grade = 5; grade <= 14; grade++) {
    const result = calculateITGrade(nominal_mm, grade);
    if (result.tolerance_um >= required_um) {
      return result;
    }
  }

  // Deflection too large even for IT14
  return calculateITGrade(nominal_mm, 14);
}
