/**
 * StandardDimensionLookupEngine — Derives exact tool dimensions from ISO/DIN designations
 *
 * The designation IS the dimension — no PDF reading needed.
 *
 * 3 lookup systems:
 *   1. ISO 1832 Turning Insert Decoder (CNMG120408 → ic, thickness, corner radius, shape angle)
 *   2. DIN 371/376 Tap Dimensions (M6×1.0 → OAL, thread length, shank, pitch)
 *   3. ISO 13399 Standard End Mill Dimensions (D10 regular → OAL, LOC)
 *
 * Plus: applyStandardDimensions() to upgrade estimated dims in tool arrays.
 *
 * Actions: standard_dimension_lookup, standard_dimension_apply
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ISO1832Result {
  designation: string;
  shape: string;
  shapeAngle: number;
  ic_mm: number;
  thickness_mm: number;
  cornerRadius_mm: number;
  tolerance: string;
  chipbreaker: string;
  clearanceAngle: string;
}

export interface TapDimensionResult {
  threadSize: string;
  pitch_mm: number;
  oal_mm: number;
  threadLength_mm: number;
  shank_mm: number;
  standard: string; // "DIN 371" | "DIN 376" | "ASME B94.9"
  threadSystem: string; // "metric" | "UNC" | "UNF"
}

export interface EndMillDimensionResult {
  dc_mm: number;
  series: "stub" | "regular" | "long";
  oal_mm: number;
  loc_mm: number;
  standard: string; // "ISO 13399"
}

export interface StandardDimensionLookupResult {
  type: "iso1832" | "tap" | "endmill";
  iso1832?: ISO1832Result;
  tap?: TapDimensionResult;
  endmill?: EndMillDimensionResult;
}

export interface ApplyResult {
  upgraded: number;
  total: number;
  details: Array<{
    index: number;
    toolId?: string;
    method: string;
    before: Record<string, number>;
    after: Record<string, number>;
  }>;
}

// ============================================================================
// ISO 1832 TABLES
// ============================================================================

/** Shape letter → included angle (degrees). */
const ISO1832_SHAPES: Record<string, { angle: number; name: string }> = {
  A: { angle: 85, name: "85° parallelogram" },
  B: { angle: 82, name: "82° parallelogram" },
  C: { angle: 80, name: "80° diamond" },
  D: { angle: 55, name: "55° diamond" },
  E: { angle: 75, name: "75° diamond" },
  H: { angle: 120, name: "hexagonal" },
  K: { angle: 55, name: "55° parallelogram" },
  L: { angle: 90, name: "90° rectangle" },
  M: { angle: 86, name: "86° diamond" },
  O: { angle: 135, name: "octagonal" },
  P: { angle: 108, name: "pentagonal" },
  R: { angle: 360, name: "round" },
  S: { angle: 90, name: "square" },
  T: { angle: 60, name: "triangle" },
  V: { angle: 35, name: "35° diamond" },
  W: { angle: 80, name: "80° trigon" },
};

/** Clearance angle letter → description. */
const ISO1832_CLEARANCE: Record<string, string> = {
  A: "3°", B: "5°", C: "7°", D: "15°", E: "20°", F: "25°", G: "30°",
  N: "0°", P: "11°", O: "other",
};

/** Tolerance class letter. */
const ISO1832_TOLERANCE: Record<string, string> = {
  A: "±0.025 IC, ±0.025 thk", C: "±0.025 IC, ±0.025 thk",
  E: "±0.025 IC, ±0.025 thk", F: "±0.013 IC, ±0.025 thk",
  G: "±0.025 IC, ±0.13 thk", H: "±0.013 IC, ±0.013 thk",
  J: "±0.05 IC, ±(±0.05~±0.15) thk", K: "±0.08 IC, ±0.025 thk",
  L: "±0.05 IC, ±0.025 thk", M: "±0.05~0.15 IC, ±0.13 thk",
  N: "±0.05~0.15 IC, ±0.025 thk", U: "±0.08~0.25 IC, ±0.13 thk",
};

/**
 * IC size code → inscribed circle diameter in mm.
 * Two-digit code: multiply by 1/16" (1.5875mm) for standard imperial-origin sizes.
 */
const ISO1832_IC: Record<string, number> = {
  "03": 3.97,
  "04": 4.76,
  "05": 5.56,
  "06": 6.35,
  "07": 7.94,
  "08": 8.0,
  "09": 9.525,
  "10": 10.0,
  "11": 11.0,
  "12": 12.7,
  "13": 13.0,
  "15": 15.0,
  "16": 15.875,
  "19": 19.05,
  "22": 22.225,
  "25": 25.4,
  "32": 32.0,
};

/**
 * Thickness code → thickness in mm.
 * Standard codes per ISO 1832.
 */
const ISO1832_THICKNESS: Record<string, number> = {
  "01": 1.59,
  "T1": 1.98,
  "02": 2.38,
  "T2": 2.78,
  "03": 3.18,
  "T3": 3.97,
  "04": 4.76,
  "05": 5.56,
  "06": 6.35,
  "07": 7.94,
  "09": 9.525,
};

/**
 * Corner radius code → corner radius in mm.
 * Two-digit code: value × 0.1mm.
 */
const ISO1832_CORNER_RADIUS: Record<string, number> = {
  "00": 0, // sharp
  "V0": 0, // sharp alternate
  "01": 0.1,
  "02": 0.2,
  "04": 0.4,
  "08": 0.8,
  "12": 1.2,
  "16": 1.6,
  "20": 2.0,
  "24": 2.4,
  "28": 2.8,
  "32": 3.2,
};

// ============================================================================
// DIN 371/376 TAP TABLES
// ============================================================================

interface TapEntry {
  pitch: number;
  oal: number;
  threadLen: number;
  shank: number;
  standard: string;
}

/** Metric coarse taps per DIN 371 (M1-M10) and DIN 376 (M12+). */
const METRIC_TAP_TABLE: Record<string, TapEntry> = {
  "M1":   { pitch: 0.25, oal: 40,  threadLen: 5,  shank: 2.0,  standard: "DIN 371" },
  "M1.2": { pitch: 0.25, oal: 40,  threadLen: 5,  shank: 2.2,  standard: "DIN 371" },
  "M1.4": { pitch: 0.3,  oal: 40,  threadLen: 5,  shank: 2.5,  standard: "DIN 371" },
  "M1.6": { pitch: 0.35, oal: 40,  threadLen: 6,  shank: 2.8,  standard: "DIN 371" },
  "M1.8": { pitch: 0.35, oal: 40,  threadLen: 6,  shank: 3.0,  standard: "DIN 371" },
  "M2":   { pitch: 0.4,  oal: 45,  threadLen: 7,  shank: 3.0,  standard: "DIN 371" },
  "M2.2": { pitch: 0.45, oal: 50,  threadLen: 7,  shank: 3.5,  standard: "DIN 371" },
  "M2.5": { pitch: 0.45, oal: 50,  threadLen: 8,  shank: 3.5,  standard: "DIN 371" },
  "M3":   { pitch: 0.5,  oal: 56,  threadLen: 10, shank: 3.5,  standard: "DIN 371" },
  "M3.5": { pitch: 0.6,  oal: 56,  threadLen: 11, shank: 4.0,  standard: "DIN 371" },
  "M4":   { pitch: 0.7,  oal: 63,  threadLen: 12, shank: 4.5,  standard: "DIN 371" },
  "M4.5": { pitch: 0.75, oal: 63,  threadLen: 13, shank: 5.0,  standard: "DIN 371" },
  "M5":   { pitch: 0.8,  oal: 70,  threadLen: 14, shank: 6.0,  standard: "DIN 371" },
  "M6":   { pitch: 1.0,  oal: 80,  threadLen: 18, shank: 6.0,  standard: "DIN 371" },
  "M7":   { pitch: 1.0,  oal: 80,  threadLen: 18, shank: 7.0,  standard: "DIN 371" },
  "M8":   { pitch: 1.25, oal: 90,  threadLen: 22, shank: 6.3,  standard: "DIN 371" },
  "M10":  { pitch: 1.5,  oal: 100, threadLen: 24, shank: 7.0,  standard: "DIN 371" },
  "M12":  { pitch: 1.75, oal: 110, threadLen: 26, shank: 9.0,  standard: "DIN 376" },
  "M14":  { pitch: 2.0,  oal: 110, threadLen: 28, shank: 11.0, standard: "DIN 376" },
  "M16":  { pitch: 2.0,  oal: 125, threadLen: 30, shank: 12.0, standard: "DIN 376" },
  "M18":  { pitch: 2.5,  oal: 125, threadLen: 32, shank: 14.0, standard: "DIN 376" },
  "M20":  { pitch: 2.5,  oal: 140, threadLen: 35, shank: 14.0, standard: "DIN 376" },
  "M22":  { pitch: 2.5,  oal: 140, threadLen: 36, shank: 16.0, standard: "DIN 376" },
  "M24":  { pitch: 3.0,  oal: 160, threadLen: 38, shank: 18.0, standard: "DIN 376" },
  "M27":  { pitch: 3.0,  oal: 160, threadLen: 40, shank: 20.0, standard: "DIN 376" },
  "M30":  { pitch: 3.5,  oal: 170, threadLen: 42, shank: 22.0, standard: "DIN 376" },
  "M33":  { pitch: 3.5,  oal: 170, threadLen: 44, shank: 24.0, standard: "DIN 376" },
  "M36":  { pitch: 4.0,  oal: 180, threadLen: 45, shank: 25.0, standard: "DIN 376" },
  "M42":  { pitch: 4.5,  oal: 200, threadLen: 50, shank: 32.0, standard: "DIN 376" },
  "M48":  { pitch: 5.0,  oal: 210, threadLen: 52, shank: 36.0, standard: "DIN 376" },
};

/** UNC (Unified National Coarse) tap dimensions per ASME B94.9. */
const UNC_TAP_TABLE: Record<string, TapEntry> = {
  "#0-80":   { pitch: 25.4 / 80,  oal: 32,  threadLen: 5,  shank: 1.5,  standard: "ASME B94.9" },
  "#1-64":   { pitch: 25.4 / 64,  oal: 38,  threadLen: 6,  shank: 2.0,  standard: "ASME B94.9" },
  "#2-56":   { pitch: 25.4 / 56,  oal: 38,  threadLen: 7,  shank: 2.4,  standard: "ASME B94.9" },
  "#3-48":   { pitch: 25.4 / 48,  oal: 40,  threadLen: 8,  shank: 2.8,  standard: "ASME B94.9" },
  "#4-40":   { pitch: 25.4 / 40,  oal: 44,  threadLen: 9,  shank: 3.0,  standard: "ASME B94.9" },
  "#5-40":   { pitch: 25.4 / 40,  oal: 50,  threadLen: 10, shank: 3.4,  standard: "ASME B94.9" },
  "#6-32":   { pitch: 25.4 / 32,  oal: 50,  threadLen: 10, shank: 3.5,  standard: "ASME B94.9" },
  "#8-32":   { pitch: 25.4 / 32,  oal: 56,  threadLen: 12, shank: 4.2,  standard: "ASME B94.9" },
  "#10-24":  { pitch: 25.4 / 24,  oal: 56,  threadLen: 14, shank: 4.8,  standard: "ASME B94.9" },
  "#12-24":  { pitch: 25.4 / 24,  oal: 63,  threadLen: 16, shank: 5.5,  standard: "ASME B94.9" },
  "1/4-20":  { pitch: 25.4 / 20,  oal: 63,  threadLen: 18, shank: 6.35, standard: "ASME B94.9" },
  "5/16-18": { pitch: 25.4 / 18,  oal: 70,  threadLen: 19, shank: 7.94, standard: "ASME B94.9" },
  "3/8-16":  { pitch: 25.4 / 16,  oal: 80,  threadLen: 22, shank: 9.53, standard: "ASME B94.9" },
  "7/16-14": { pitch: 25.4 / 14,  oal: 85,  threadLen: 24, shank: 11.1, standard: "ASME B94.9" },
  "1/2-13":  { pitch: 25.4 / 13,  oal: 90,  threadLen: 26, shank: 12.7, standard: "ASME B94.9" },
  "9/16-12": { pitch: 25.4 / 12,  oal: 95,  threadLen: 28, shank: 14.3, standard: "ASME B94.9" },
  "5/8-11":  { pitch: 25.4 / 11,  oal: 100, threadLen: 30, shank: 15.9, standard: "ASME B94.9" },
  "3/4-10":  { pitch: 25.4 / 10,  oal: 110, threadLen: 34, shank: 19.1, standard: "ASME B94.9" },
  "7/8-9":   { pitch: 25.4 / 9,   oal: 125, threadLen: 38, shank: 22.2, standard: "ASME B94.9" },
  "1-8":     { pitch: 25.4 / 8,   oal: 140, threadLen: 42, shank: 25.4, standard: "ASME B94.9" },
};

/** UNF (Unified National Fine) tap dimensions per ASME B94.9. */
const UNF_TAP_TABLE: Record<string, TapEntry> = {
  "#0-80":   { pitch: 25.4 / 80,  oal: 32,  threadLen: 5,  shank: 1.5,  standard: "ASME B94.9" },
  "#1-72":   { pitch: 25.4 / 72,  oal: 38,  threadLen: 6,  shank: 2.0,  standard: "ASME B94.9" },
  "#2-64":   { pitch: 25.4 / 64,  oal: 38,  threadLen: 7,  shank: 2.4,  standard: "ASME B94.9" },
  "#3-56":   { pitch: 25.4 / 56,  oal: 40,  threadLen: 8,  shank: 2.8,  standard: "ASME B94.9" },
  "#4-48":   { pitch: 25.4 / 48,  oal: 44,  threadLen: 9,  shank: 3.0,  standard: "ASME B94.9" },
  "#5-44":   { pitch: 25.4 / 44,  oal: 50,  threadLen: 10, shank: 3.4,  standard: "ASME B94.9" },
  "#6-40":   { pitch: 25.4 / 40,  oal: 50,  threadLen: 10, shank: 3.5,  standard: "ASME B94.9" },
  "#8-36":   { pitch: 25.4 / 36,  oal: 56,  threadLen: 12, shank: 4.2,  standard: "ASME B94.9" },
  "#10-32":  { pitch: 25.4 / 32,  oal: 56,  threadLen: 14, shank: 4.8,  standard: "ASME B94.9" },
  "#12-28":  { pitch: 25.4 / 28,  oal: 63,  threadLen: 16, shank: 5.5,  standard: "ASME B94.9" },
  "1/4-28":  { pitch: 25.4 / 28,  oal: 63,  threadLen: 18, shank: 6.35, standard: "ASME B94.9" },
  "5/16-24": { pitch: 25.4 / 24,  oal: 70,  threadLen: 19, shank: 7.94, standard: "ASME B94.9" },
  "3/8-24":  { pitch: 25.4 / 24,  oal: 80,  threadLen: 22, shank: 9.53, standard: "ASME B94.9" },
  "7/16-20": { pitch: 25.4 / 20,  oal: 85,  threadLen: 24, shank: 11.1, standard: "ASME B94.9" },
  "1/2-20":  { pitch: 25.4 / 20,  oal: 90,  threadLen: 26, shank: 12.7, standard: "ASME B94.9" },
  "9/16-18": { pitch: 25.4 / 18,  oal: 95,  threadLen: 28, shank: 14.3, standard: "ASME B94.9" },
  "5/8-18":  { pitch: 25.4 / 18,  oal: 100, threadLen: 30, shank: 15.9, standard: "ASME B94.9" },
  "3/4-16":  { pitch: 25.4 / 16,  oal: 110, threadLen: 34, shank: 19.1, standard: "ASME B94.9" },
  "7/8-14":  { pitch: 25.4 / 14,  oal: 125, threadLen: 38, shank: 22.2, standard: "ASME B94.9" },
  "1-12":    { pitch: 25.4 / 12,  oal: 140, threadLen: 42, shank: 25.4, standard: "ASME B94.9" },
};

// ============================================================================
// ISO 13399 END MILL TABLES
// ============================================================================

interface EndMillEntry {
  stub: { oal: number; loc: number };
  regular: { oal: number; loc: number };
  long: { oal: number; loc: number };
}

/** Standard end mill dimensions by cutting diameter (mm). ISO 13399 / DIN 6527. */
const ENDMILL_TABLE: Record<number, EndMillEntry> = {
  1:   { stub: { oal: 32,  loc: 3  }, regular: { oal: 39,  loc: 5  }, long: { oal: 50,  loc: 8  } },
  1.5: { stub: { oal: 32,  loc: 4  }, regular: { oal: 39,  loc: 6  }, long: { oal: 50,  loc: 10 } },
  2:   { stub: { oal: 35,  loc: 5  }, regular: { oal: 39,  loc: 7  }, long: { oal: 50,  loc: 12 } },
  2.5: { stub: { oal: 35,  loc: 6  }, regular: { oal: 42,  loc: 8  }, long: { oal: 50,  loc: 14 } },
  3:   { stub: { oal: 39,  loc: 8  }, regular: { oal: 50,  loc: 12 }, long: { oal: 57,  loc: 18 } },
  4:   { stub: { oal: 50,  loc: 11 }, regular: { oal: 57,  loc: 14 }, long: { oal: 63,  loc: 22 } },
  5:   { stub: { oal: 50,  loc: 13 }, regular: { oal: 57,  loc: 16 }, long: { oal: 65,  loc: 26 } },
  6:   { stub: { oal: 50,  loc: 13 }, regular: { oal: 57,  loc: 16 }, long: { oal: 66,  loc: 26 } },
  8:   { stub: { oal: 58,  loc: 19 }, regular: { oal: 63,  loc: 22 }, long: { oal: 75,  loc: 32 } },
  10:  { stub: { oal: 66,  loc: 22 }, regular: { oal: 72,  loc: 26 }, long: { oal: 83,  loc: 40 } },
  12:  { stub: { oal: 73,  loc: 26 }, regular: { oal: 83,  loc: 30 }, long: { oal: 95,  loc: 48 } },
  14:  { stub: { oal: 78,  loc: 26 }, regular: { oal: 83,  loc: 32 }, long: { oal: 100, loc: 50 } },
  16:  { stub: { oal: 82,  loc: 32 }, regular: { oal: 92,  loc: 38 }, long: { oal: 110, loc: 55 } },
  18:  { stub: { oal: 85,  loc: 35 }, regular: { oal: 95,  loc: 40 }, long: { oal: 115, loc: 58 } },
  20:  { stub: { oal: 92,  loc: 38 }, regular: { oal: 104, loc: 45 }, long: { oal: 126, loc: 65 } },
  25:  { stub: { oal: 105, loc: 45 }, regular: { oal: 121, loc: 55 }, long: { oal: 150, loc: 80 } },
  32:  { stub: { oal: 110, loc: 45 }, regular: { oal: 128, loc: 55 }, long: { oal: 160, loc: 85 } },
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

/** StandardDimensionLookupEngine — deterministic dimension lookup from ISO/DIN designations. */
export class StandardDimensionLookupEngine {

  // ──────────────────────────────────────────────────────────────────────────
  // 1. ISO 1832 Turning Insert Decoder
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Decode an ISO 1832 turning insert designation into exact dimensions.
   * @example decodeISO1832("CNMG120408") → { ic_mm: 12.7, thickness_mm: 4.76, cornerRadius_mm: 0.8, shapeAngle: 80 }
   */
  decodeISO1832(designation: string): ISO1832Result | null {
    if (!designation || designation.length < 7) return null;
    const d = designation.toUpperCase().trim();

    // ISO 1832 format: SSSS LLNN TT RR [chipbreaker]
    // Positions: [0]=Shape [1]=Clearance [2]=Tolerance [3]=Type(chipbreaker) [4-5]=IC [6-7]=Thickness [8-9]=CornerRadius
    const shapeLetter = d[0];
    const clearanceLetter = d[1];
    const toleranceLetter = d[2];
    const typeLetter = d[3]; // chipbreaker/fixing type

    const shapeInfo = ISO1832_SHAPES[shapeLetter];
    if (!shapeInfo) return null;

    // Extract IC size code (positions 4-5)
    const icCode = d.substring(4, 6);
    const ic = ISO1832_IC[icCode];
    if (ic === undefined) return null;

    // Extract thickness code (positions 6-8, may be 2 chars like "04" or "T3")
    let thicknessCode: string;
    let radiusStart: number;
    if (d[6] === "T") {
      // T-prefix thickness codes like T3
      thicknessCode = d.substring(6, 8);
      radiusStart = 8;
    } else {
      thicknessCode = d.substring(6, 8);
      radiusStart = 8;
    }
    const thickness = ISO1832_THICKNESS[thicknessCode];
    if (thickness === undefined) return null;

    // Extract corner radius code (positions 8-9 or 8-10)
    const radiusCode = d.substring(radiusStart, radiusStart + 2);
    const cornerRadius = ISO1832_CORNER_RADIUS[radiusCode];
    if (cornerRadius === undefined) return null;

    return {
      designation: d,
      shape: shapeInfo.name,
      shapeAngle: shapeInfo.angle,
      ic_mm: ic,
      thickness_mm: thickness,
      cornerRadius_mm: cornerRadius,
      tolerance: ISO1832_TOLERANCE[toleranceLetter] ?? "unknown",
      chipbreaker: typeLetter === "G" ? "with chipbreaker"
                 : typeLetter === "N" ? "without chipbreaker"
                 : typeLetter === "F" ? "with chipbreaker, sharp edge"
                 : typeLetter,
      clearanceAngle: ISO1832_CLEARANCE[clearanceLetter] ?? "unknown",
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. DIN 371/376 Tap Dimensions
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Look up tap dimensions by thread designation.
   * Supports: metric (M6×1.0 or M6), UNC (#10-24, 1/4-20), UNF (#10-32, 1/4-28).
   */
  lookupTapDimensions(threadSize: string): TapDimensionResult | null {
    if (!threadSize) return null;
    const ts = threadSize.trim().toUpperCase();

    // Try metric first: "M6", "M6×1.0", "M6x1.0", "M6X1.0"
    const metricMatch = ts.match(/^(M\d+(?:\.\d+)?)/);
    if (metricMatch) {
      const key = metricMatch[1];
      const entry = METRIC_TAP_TABLE[key];
      if (entry) {
        return {
          threadSize: `${key}×${entry.pitch}`,
          pitch_mm: entry.pitch,
          oal_mm: entry.oal,
          threadLength_mm: entry.threadLen,
          shank_mm: entry.shank,
          standard: entry.standard,
          threadSystem: "metric",
        };
      }
      return null;
    }

    // Try UNC: "#10-24", "1/4-20", etc.
    const uncEntry = UNC_TAP_TABLE[ts] ?? UNC_TAP_TABLE[threadSize.trim()];
    if (uncEntry) {
      return {
        threadSize: ts,
        pitch_mm: Math.round(uncEntry.pitch * 1000) / 1000,
        oal_mm: uncEntry.oal,
        threadLength_mm: uncEntry.threadLen,
        shank_mm: uncEntry.shank,
        standard: uncEntry.standard,
        threadSystem: "UNC",
      };
    }

    // Try UNF
    const unfEntry = UNF_TAP_TABLE[ts] ?? UNF_TAP_TABLE[threadSize.trim()];
    if (unfEntry) {
      return {
        threadSize: ts,
        pitch_mm: Math.round(unfEntry.pitch * 1000) / 1000,
        oal_mm: unfEntry.oal,
        threadLength_mm: unfEntry.threadLen,
        shank_mm: unfEntry.shank,
        standard: unfEntry.standard,
        threadSystem: "UNF",
      };
    }

    return null;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 3. ISO 13399 Standard End Mill Dimensions
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Look up standard end mill OAL and LOC by cutting diameter and series.
   * @param dc_mm Cutting diameter in mm (1-32 standard sizes)
   * @param seriesHint 'stub', 'regular', or 'long'. Defaults to 'regular'.
   */
  lookupEndMillDimensions(dc_mm: number, seriesHint?: "stub" | "regular" | "long"): EndMillDimensionResult | null {
    if (!dc_mm || dc_mm <= 0) return null;

    const series = seriesHint ?? "regular";

    // Exact match first
    const entry = ENDMILL_TABLE[dc_mm];
    if (entry) {
      const dims = entry[series];
      return {
        dc_mm,
        series,
        oal_mm: dims.oal,
        loc_mm: dims.loc,
        standard: "ISO 13399",
      };
    }

    // Find nearest standard size for approximate match
    const sizes = Object.keys(ENDMILL_TABLE).map(Number).sort((a, b) => a - b);
    let nearest = sizes[0];
    let minDist = Math.abs(dc_mm - nearest);
    for (const s of sizes) {
      const dist = Math.abs(dc_mm - s);
      if (dist < minDist) {
        minDist = dist;
        nearest = s;
      }
    }

    // Only use nearest if within 10% tolerance
    if (minDist / dc_mm > 0.10) return null;

    const nearEntry = ENDMILL_TABLE[nearest];
    const dims = nearEntry[series];
    return {
      dc_mm: nearest,
      series,
      oal_mm: dims.oal,
      loc_mm: dims.loc,
      standard: "ISO 13399",
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Apply Standard Dimensions to Tool Arrays
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * For each tool with estimated dimensions, try ISO 1832 / DIN 371/376 / ISO 13399 lookup.
   * If matched, replaces estimated values with standard values and tags dimensionSource: "standard".
   */
  applyStandardDimensions(tools: Record<string, any>[]): ApplyResult {
    const result: ApplyResult = { upgraded: 0, total: tools.length, details: [] };

    for (let i = 0; i < tools.length; i++) {
      const tool = tools[i];
      // Skip tools already with real/standard dimensions
      if (tool.dimensionSource === "standard" || tool.dimensionSource === "measured") continue;

      // Try ISO 1832 for turning inserts
      if (this._isInsert(tool)) {
        const designation = tool.designation ?? tool.iso_code ?? tool.name ?? "";
        const decoded = this.decodeISO1832(designation);
        if (decoded) {
          const before = { ic_mm: tool.ic_mm, thickness_mm: tool.thickness_mm, cornerRadius_mm: tool.cornerRadius_mm };
          tool.ic_mm = decoded.ic_mm;
          tool.thickness_mm = decoded.thickness_mm;
          tool.cornerRadius_mm = decoded.cornerRadius_mm;
          tool.shapeAngle = decoded.shapeAngle;
          tool.dimensionSource = "standard";
          tool.dimensionStandard = "ISO 1832";
          result.details.push({
            index: i, toolId: tool.id ?? tool.toolId, method: "ISO 1832",
            before, after: { ic_mm: decoded.ic_mm, thickness_mm: decoded.thickness_mm, cornerRadius_mm: decoded.cornerRadius_mm },
          });
          result.upgraded++;
          continue;
        }
      }

      // Try DIN 371/376 for taps
      if (this._isTap(tool)) {
        const threadSpec = tool.threadSize ?? tool.thread ?? tool.designation ?? tool.name ?? "";
        const tapDims = this.lookupTapDimensions(threadSpec);
        if (tapDims) {
          const before = { oal_mm: tool.oal_mm ?? tool.oal, threadLength_mm: tool.threadLength_mm, shank_mm: tool.shank_mm ?? tool.shank };
          tool.oal_mm = tapDims.oal_mm;
          tool.oal = tapDims.oal_mm;
          tool.threadLength_mm = tapDims.threadLength_mm;
          tool.shank_mm = tapDims.shank_mm;
          tool.shank = tapDims.shank_mm;
          tool.pitch_mm = tapDims.pitch_mm;
          tool.dimensionSource = "standard";
          tool.dimensionStandard = tapDims.standard;
          result.details.push({
            index: i, toolId: tool.id ?? tool.toolId, method: tapDims.standard,
            before, after: { oal_mm: tapDims.oal_mm, threadLength_mm: tapDims.threadLength_mm, shank_mm: tapDims.shank_mm },
          });
          result.upgraded++;
          continue;
        }
      }

      // Try ISO 13399 for end mills / drills
      if (this._isEndMill(tool)) {
        const dc = tool.dc ?? tool.diameter ?? tool.dc_mm ?? 0;
        const seriesHint = this._inferSeries(tool);
        const emDims = this.lookupEndMillDimensions(dc, seriesHint);
        if (emDims) {
          const before = { oal_mm: tool.oal_mm ?? tool.oal, loc_mm: tool.loc_mm ?? tool.loc };
          tool.oal_mm = emDims.oal_mm;
          tool.oal = emDims.oal_mm;
          tool.loc_mm = emDims.loc_mm;
          tool.loc = emDims.loc_mm;
          tool.dimensionSource = "standard";
          tool.dimensionStandard = "ISO 13399";
          result.details.push({
            index: i, toolId: tool.id ?? tool.toolId, method: "ISO 13399",
            before, after: { oal_mm: emDims.oal_mm, loc_mm: emDims.loc_mm },
          });
          result.upgraded++;
          continue;
        }
      }
    }

    return result;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Unified lookup — dispatched action entry point
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Unified lookup: auto-detects designation type and returns dimensions.
   * Tries ISO 1832, then tap, then end mill.
   */
  lookup(params: { designation?: string; threadSize?: string; dc_mm?: number; series?: "stub" | "regular" | "long" }): StandardDimensionLookupResult | null {
    // ISO 1832 insert
    if (params.designation) {
      const iso = this.decodeISO1832(params.designation);
      if (iso) return { type: "iso1832", iso1832: iso };

      // Maybe it's a tap designation like "M6" or "M6x1.0"
      const tap = this.lookupTapDimensions(params.designation);
      if (tap) return { type: "tap", tap };
    }

    // Explicit tap lookup
    if (params.threadSize) {
      const tap = this.lookupTapDimensions(params.threadSize);
      if (tap) return { type: "tap", tap };
    }

    // End mill lookup
    if (params.dc_mm) {
      const em = this.lookupEndMillDimensions(params.dc_mm, params.series);
      if (em) return { type: "endmill", endmill: em };
    }

    return null;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ──────────────────────────────────────────────────────────────────────────

  private _isInsert(tool: Record<string, any>): boolean {
    const t = (tool.type ?? tool.toolType ?? "").toLowerCase();
    const n = (tool.name ?? tool.designation ?? "").toUpperCase();
    return t.includes("insert") || t.includes("turning")
      || /^[CDTRSVEWHKBMAOPLR][NABCDEFGOP][ACEFGHJKLMNU][FGMNR]\d{6}/.test(n);
  }

  private _isTap(tool: Record<string, any>): boolean {
    const t = (tool.type ?? tool.toolType ?? "").toLowerCase();
    const n = (tool.name ?? tool.designation ?? "").toUpperCase();
    return t.includes("tap") || t.includes("thread")
      || /^M\d/.test(n) || /^#\d+-\d+$/.test(n) || /^\d+\/\d+-\d+$/.test(n);
  }

  private _isEndMill(tool: Record<string, any>): boolean {
    const t = (tool.type ?? tool.toolType ?? "").toLowerCase();
    return t.includes("endmill") || t.includes("end mill") || t.includes("end_mill")
      || t.includes("mill") || t.includes("flat") || t.includes("ball")
      || t.includes("bull") || t.includes("slot");
  }

  private _inferSeries(tool: Record<string, any>): "stub" | "regular" | "long" {
    const n = (tool.name ?? tool.series ?? tool.description ?? "").toLowerCase();
    if (n.includes("stub") || n.includes("short")) return "stub";
    if (n.includes("long") || n.includes("extra")) return "long";
    return "regular";
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/** Singleton instance for dispatcher wiring. */
export const standardDimensionLookupEngine = new StandardDimensionLookupEngine();
