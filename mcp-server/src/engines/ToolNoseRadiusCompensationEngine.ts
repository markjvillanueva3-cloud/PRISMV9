/**
 * ToolNoseRadiusCompensationEngine — TNR (G40/G41/G42) reference + validation
 *
 * Tool Nose Radius (TNR) compensation handles the offset between the theoretical
 * sharp tool point used in part programs and the actual tangent contact point on
 * a finite-radius tool nose. Without TNR, programmed contours on angles/arcs
 * deviate from the part-print dimensions by the projection of the nose radius.
 *
 * G-codes (ISO / Fanuc-style lathe):
 *   G40 - Cancel TNR
 *   G41 - Tool nose center LEFT of surface (looking in cut direction)
 *   G42 - Tool nose center RIGHT of surface (looking in cut direction)
 *
 * P-code orientation indexes the direction from the imaginary tool tip to the
 * nose-radius center. Set in the TOOL DATA SET / Tool Data Setting screen
 * (NOSE R COMP / P column).
 *
 * Ported from PRISM_TOOL_NOSE_RADIUS_COMPENSATION_ENGINE.js (monolith R2.3.1).
 *
 * Literature: Fanuc Series 0/0i/15/16/18/21 lathe programming manuals (TNR section).
 *
 * @module ToolNoseRadiusCompensationEngine
 */

import { z } from "zod";

// ============================================================================
// TYPES
// ============================================================================

/** TNR G-code definition. */
export interface TNRGCodeDefinition {
  /** Short identifier shown on operator panel / program. */
  name: string;
  /** Operator-facing description. */
  description: string;
}

/** P-code orientation definition. */
export interface PCodeOrientation {
  /** Angle in degrees from the imaginary tool tip to nose-radius center. */
  angle: number;
  /** Quadrant label as printed in the Fanuc reference. */
  quadrant: string;
  /** Typical use case (e.g. "OD turning right"). */
  typical: string;
}

/** Cancellation method signature. */
export interface CancellationMethod {
  /** Example single-line G-code invocation. */
  example: string;
  /** Free-form description of behavior. */
  description: string;
  /** Optional caveat / "note" text from the manual. */
  note?: string;
}

/** Per-line G-code parse result (deterministic - no inference). */
export interface ProgramLineParse {
  lineNumber: number;
  raw: string;
  /** Detected TNR-related codes: G40 | G41 | G42 | none. */
  tnr: "G40" | "G41" | "G42" | "none";
  /** Whether this line is G80 (LAP-end). */
  isG80: boolean;
}

/** Result of validating a G-code program against TNR + LAP rules. */
export interface TNRValidationResult {
  ok: boolean;
  issues: Array<{
    severity: "error" | "warning";
    rule: string;
    lineNumber: number;
    message: string;
  }>;
  parsed: ProgramLineParse[];
}

// ============================================================================
// Zod schemas
// ============================================================================

export const PCodeLookupInputSchema = z.object({
  pCode: z.number().int().min(0).max(8),
});

export const ProgramValidateInputSchema = z.object({
  program: z.string(),
});

// ============================================================================
// CANONICAL CONSTANTS
// ============================================================================

/** Maximum compensation magnitude per Fanuc spec (+/- 999.999 mm). */
export const TNR_MAX_COMP_MM = 999.999;

/** TNR G-codes. */
export const TNR_G_CODES: Record<"G40" | "G41" | "G42", TNRGCodeDefinition> = {
  G40: { name: "Cancel TNR", description: "Cancel tool nose radius compensation." },
  G41: { name: "TNR Left",  description: "Tool nose center LEFT of surface (looking in cut direction)." },
  G42: { name: "TNR Right", description: "Tool nose center RIGHT of surface (looking in cut direction)." },
};

/** P-code orientation lookup table (P0..P8). */
export const TNR_P_CODES: Record<number, PCodeOrientation> = {
  0: { angle: NaN, quadrant: "sign-based", typical: "Direction from sign of nose R data" },
  1: { angle: 45,  quadrant: "I",   typical: "Back boring" },
  2: { angle: 135, quadrant: "II",  typical: "OD facing left" },
  3: { angle: 225, quadrant: "III", typical: "OD turning right" },
  4: { angle: 315, quadrant: "IV",  typical: "ID turning" },
  5: { angle: 0,   quadrant: "+X",  typical: "Face grooving right" },
  6: { angle: 90,  quadrant: "+Z",  typical: "OD grooving down" },
  7: { angle: 180, quadrant: "-X",  typical: "Face grooving left" },
  8: { angle: 270, quadrant: "-Z",  typical: "ID grooving" },
};

/** Cancellation methods (basic, with-K, with-I). */
export const TNR_CANCELLATION_METHODS: Record<string, CancellationMethod> = {
  basic:  { example: "G40 X__ Z__", description: "Plain cancel - may not give desired exit path.", note: "May leave a residual offset on exit." },
  withK:  { example: "G40 X__ K-1", description: "K word controls exit direction.",                note: "Provides controlled linear exit from workpiece." },
  withI:  { example: "G40 X__ I1",  description: "I word controls the X-direction component." },
};

/** Setup procedure steps (Fanuc Tool Data Setting screen). */
export const TNR_SETUP_PROCEDURE: readonly string[] = Object.freeze([
  "Select Tool Data Setting mode",
  "For 2-saddle/turret, select turret A with [A] key",
  "Move cursor to X column of NOSE R COMP",
  "Press [F1] (SET), input compensation data",
  "Set Z compensation also",
  "Move cursor to P column, set orientation code",
  `Maximum setting: +/- ${TNR_MAX_COMP_MM} mm`,
]);

// ============================================================================
// ENGINE
// ============================================================================

/** TNR G41/G42 detection regex - recognizes the G code as a whole word. */
const G_TNR_REGEX = /\bG(40|41|42)\b/;
const G_G80_REGEX = /\bG80\b/;

/**
 * Static-method engine: stateless lookup + validation.
 */
export class ToolNoseRadiusCompensationEngine {

  /** Get the G-code definition. */
  static getGCode(code: "G40" | "G41" | "G42"): TNRGCodeDefinition {
    return TNR_G_CODES[code];
  }

  /**
   * Look up a P-code orientation by integer index 0..8.
   * @throws when pCode is out of range.
   */
  static lookupPCode(pCode: number): PCodeOrientation {
    PCodeLookupInputSchema.parse({ pCode });
    return TNR_P_CODES[pCode];
  }

  /** Return all 9 P-code orientations as a flat array indexed by P0..P8. */
  static listPCodes(): PCodeOrientation[] {
    return Object.keys(TNR_P_CODES)
      .map(k => Number(k))
      .sort((a, b) => a - b)
      .map(k => TNR_P_CODES[k]);
  }

  /** Read the canonical cancellation method by key (basic | withK | withI). */
  static getCancellationMethod(key: "basic" | "withK" | "withI"): CancellationMethod {
    return TNR_CANCELLATION_METHODS[key];
  }

  /**
   * Parse a G-code program line-by-line. Strictly textual - no semantic
   * interpolation; line numbers are 1-based.
   */
  static parseProgram(program: string): ProgramLineParse[] {
    const lines = program.split(/\r?\n/);
    const out: ProgramLineParse[] = [];
    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const upper = raw.toUpperCase();
      const tnrMatch = G_TNR_REGEX.exec(upper);
      const tnr = tnrMatch ? (("G" + tnrMatch[1]) as "G40" | "G41" | "G42") : "none";
      const isG80 = G_G80_REGEX.test(upper);
      out.push({ lineNumber: i + 1, raw, tnr, isG80 });
    }
    return out;
  }

  /**
   * Validate that TNR is properly cancelled before LAP-end (G80).
   * The LAP rule from the Fanuc manual: TNR (G41/G42) MUST be cancelled (G40)
   * before the G80 block that ends a LAP contour.
   *
   * Issues a `tnr.unbalanced_lap` ERROR when a LAP contains G41/G42 followed
   * by G80 without an intervening G40.
   */
  static validateProgram(program: string): TNRValidationResult {
    const parsed = ToolNoseRadiusCompensationEngine.parseProgram(program);
    const issues: TNRValidationResult["issues"] = [];

    let activeTNR: null | "G41" | "G42" = null;
    let activeTNRLine = -1;
    for (const line of parsed) {
      if (line.tnr === "G41" || line.tnr === "G42") {
        activeTNR = line.tnr;
        activeTNRLine = line.lineNumber;
      } else if (line.tnr === "G40") {
        activeTNR = null;
        activeTNRLine = -1;
      }
      if (line.isG80 && activeTNR !== null) {
        issues.push({
          severity: "error",
          rule: "tnr.unbalanced_lap",
          lineNumber: line.lineNumber,
          message: `G80 reached at line ${line.lineNumber} while TNR ${activeTNR} (line ${activeTNRLine}) is still active. LAP contours MUST cancel TNR with G40 before G80.`,
        });
      }
    }

    return { ok: issues.every(i => i.severity !== "error"), issues, parsed };
  }

  /**
   * Check whether a compensation value lies inside the maximum allowed range.
   * @returns true if abs(value) <= TNR_MAX_COMP_MM.
   */
  static isCompensationInRange(valueMm: number): boolean {
    if (!Number.isFinite(valueMm)) return false;
    return Math.abs(valueMm) <= TNR_MAX_COMP_MM;
  }

  /** Return the canonical setup procedure (immutable). */
  static getSetupProcedure(): readonly string[] {
    return TNR_SETUP_PROCEDURE;
  }
}

/** Singleton-style ergonomic export. */
export const toolNoseRadiusCompensationEngine = ToolNoseRadiusCompensationEngine;
