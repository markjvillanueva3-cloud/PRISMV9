/**
 * ISOInsertGeometryEngine — ISO 1832 insert geometry → Kienzle approach angle
 *
 * The Kienzle cutting-force model needs the effective approach (lead) angle κr
 * to compute chip width and chip thickness correctly:
 *   b = ap / sin(κr)       (chip width — longer for smaller κr)
 *   h = f  × sin(κr)       (chip thickness — thinner for smaller κr)
 * Most existing callers default to κr = 90° (radial entry), which is wrong for
 * common inserts. A 35° rhombic insert in a 93° side-entry holder has an
 * effective κr of 93°, but swapping in a profiling holder drops it to 62.5°.
 *
 * This engine decodes ISO 1832 insert codes into shape angles, maps insert +
 * holder style combos to their typical κr, and lets downstream callers stop
 * hard-coding 90°.
 *
 * ISO 1832 first letter = shape angle:
 *   C  80° rhombic (CNMG/CCMT) — heavy roughing, strong corner
 *   D  55° rhombic (DNMG/DCMT) — general turning, profiles
 *   V  35° rhombic (VNMG/VCMT) — sharp profiling, thin walls, best access
 *   W  80° trigon   (WNMG/WCMT) — CNMG alternative, 3-edge version
 *   T  60° triangle (TNMG/TPMT) — 3 edges, classic turning
 *   S  90° square    (SNMG/SCMT) — maximum strength, roughing only
 *   R  round         (RNMG)      — radius profiling
 *   K  55° parallelogram (KNMG)  — niche profiling
 *
 * Holder lead-angle style drives the effective approach angle when the insert
 * is clamped into a standard toolholder. We cover the 6 most common combos.
 *
 * All Kienzle constants sourced from src/physics/constants.ts.
 *
 * @module engines/ISOInsertGeometryEngine
 * @milestone MILL-MASTER-P3-U05-KIENZLE-APPROACH
 */

import { CANONICAL_KIENZLE } from "../physics/constants.js";

export type ISOInsertShape = "C" | "D" | "V" | "W" | "T" | "S" | "R" | "K";
export type ISOGroup = "P" | "M" | "K" | "N" | "S" | "H";

/** Holder lead-angle style — common external-turning holders. */
export type HolderStyle =
  | "L"   // 95° side-entry (straight lead) — standard external OD roughing
  | "R"   // 93° side-entry — standard external OD
  | "F"   // 90° pull-in — facing + OD
  | "J"   // 72.5° profile — steep profiling with V insert
  | "Q"   // 107.5° back-turning — reverse feed
  | "K";  // 75° internal (boring) — ID turning

/** Insert shape → nose angle in degrees (included). */
const SHAPE_ANGLE_DEG: Readonly<Record<ISOInsertShape, number>> = Object.freeze({
  C: 80,  D: 55,  V: 35,  W: 80,  T: 60,  S: 90,  R: 360, K: 55,
});

/** Humanized description of each shape. */
const SHAPE_DESCRIPTION: Readonly<Record<ISOInsertShape, string>> = Object.freeze({
  C: "80° rhombic — heavy roughing, strong corner, CNMG family",
  D: "55° rhombic — general turning / profiling, DNMG family",
  V: "35° rhombic — sharp profiling, thin walls, VNMG family",
  W: "80° trigon — CNMG alternative with 3 edges, WNMG family",
  T: "60° triangle — classic turning, 3 edges, TNMG family",
  S: "90° square — maximum strength, heavy roughing, SNMG family",
  R: "Round — radius profiling, maximum edge strength, RNMG family",
  K: "55° parallelogram — niche profiling, KNMG family",
});

/** Typical κr [deg] for (shape × holder style). */
const APPROACH_ANGLE_TABLE: ReadonlyArray<{
  shape: ISOInsertShape;
  holder: HolderStyle;
  kappa_r_deg: number;
  notes: string;
}> = Object.freeze([
  // CNMG (80° rhombic) — most common, compatible with most holder styles
  { shape: "C", holder: "L", kappa_r_deg: 95,   notes: "CNMG + L-holder: standard external roughing, 95° lead" },
  { shape: "C", holder: "R", kappa_r_deg: 93,   notes: "CNMG + R-holder: 93° side-entry, most common external" },
  { shape: "C", holder: "F", kappa_r_deg: 90,   notes: "CNMG + F-holder: facing + 90° straight turning" },
  { shape: "C", holder: "K", kappa_r_deg: 75,   notes: "CNMG + K-holder: internal boring, 75° lead" },
  // DNMG (55° rhombic) — general-purpose
  { shape: "D", holder: "R", kappa_r_deg: 93,   notes: "DNMG + R-holder: general profiling" },
  { shape: "D", holder: "J", kappa_r_deg: 62.5, notes: "DNMG + J-holder: steep profile entry" },
  { shape: "D", holder: "K", kappa_r_deg: 75,   notes: "DNMG + K-holder: boring" },
  // VNMG (35° rhombic) — sharp profiling
  { shape: "V", holder: "J", kappa_r_deg: 62.5, notes: "VNMG + J-holder: steep profiling, best access" },
  { shape: "V", holder: "R", kappa_r_deg: 93,   notes: "VNMG + R-holder: general profile at reduced depth" },
  { shape: "V", holder: "Q", kappa_r_deg: 107.5, notes: "VNMG + Q-holder: back-turning reverse feed" },
  // WNMG (80° trigon)
  { shape: "W", holder: "R", kappa_r_deg: 95,   notes: "WNMG + R-holder: 3-edge version of CNMG" },
  { shape: "W", holder: "L", kappa_r_deg: 95,   notes: "WNMG + L-holder: side-entry roughing" },
  // TNMG (60° triangle)
  { shape: "T", holder: "R", kappa_r_deg: 91,   notes: "TNMG + R-holder: classic external turning" },
  { shape: "T", holder: "K", kappa_r_deg: 75,   notes: "TNMG + K-holder: boring (smaller clearance)" },
  // SNMG (90° square)
  { shape: "S", holder: "L", kappa_r_deg: 75,   notes: "SNMG + L-holder: heavy roughing, max strength" },
  { shape: "S", holder: "F", kappa_r_deg: 45,   notes: "SNMG + F-holder: high-feed entry-angle roughing" },
  // RNMG (round)
  { shape: "R", holder: "R", kappa_r_deg: 45,   notes: "RNMG: variable κr based on ap (45° typical effective)" },
]);

export interface ParsedInsertCode {
  code: string;
  shape: ISOInsertShape;
  clearance_letter: string;
  tolerance_letter: string;
  groove_letter: string;
  inscribed_circle_mm: number;
  thickness_code: string;
  corner_radius_mm: number;
  shape_angle_deg: number;
  shape_description: string;
}

export interface InsertKienzleInput {
  insert_code: string;            // e.g. "CNMG120408"
  holder_style: HolderStyle;
  ap_mm: number;                  // depth of cut
  feed_mm_rev: number;            // feed per revolution
  material_iso: ISOGroup;         // drives kc1.1 + mc
}

export interface InsertKienzleResult {
  shape: ISOInsertShape;
  holder_style: HolderStyle;
  kappa_r_deg: number;
  chip_width_b_mm: number;        // b = ap / sin(κr)
  chip_thickness_h_mm: number;    // h = f × sin(κr)
  kc_effective_n_mm2: number;     // kc1.1 × h^(-mc)
  cutting_force_n: number;        // Fc = kc_eff × b × h
  notes: string;
  warnings: string[];
}

export class ISOInsertGeometryEngine {
  /**
   * Parse an ISO 1832 insert code like "CNMG120408".
   * Never throws — returns a best-effort parse with a sensible shape default
   * and warnings for unrecognized characters.
   */
  parseCode(code: string): { parsed: ParsedInsertCode; warnings: string[] } {
    const warnings: string[] = [];
    const normalized = (code || "").trim().toUpperCase();
    if (normalized.length < 6) {
      warnings.push(`insert code '${code}' too short — using defaults`);
    }

    const shapeChar = normalized.charAt(0) as ISOInsertShape;
    const shape: ISOInsertShape = shapeChar in SHAPE_ANGLE_DEG ? shapeChar : "C";
    if (shape !== shapeChar) {
      warnings.push(`unknown shape letter '${shapeChar}' — defaulting to C (80° rhombic)`);
    }

    const clearance_letter = normalized.charAt(1) || "N";
    const tolerance_letter = normalized.charAt(2) || "M";
    const groove_letter = normalized.charAt(3) || "G";

    // Characters 4-5 = inscribed circle (IC) in mm (e.g., "12" → 12.7mm / 1/2")
    const icCode = normalized.substr(4, 2);
    const icNum = parseInt(icCode, 10);
    const ic_mm = Number.isFinite(icNum) ? icNum : 12;

    // Characters 6-7 = thickness code
    const thickness_code = normalized.substr(6, 2) || "04";

    // Characters 8-9 = corner radius × 100 (e.g., "08" → 0.8mm)
    const rCode = normalized.substr(8, 2);
    const rNum = parseInt(rCode, 10);
    const corner_radius_mm = Number.isFinite(rNum) ? rNum / 10 : 0.4;

    return {
      parsed: {
        code: normalized,
        shape,
        clearance_letter,
        tolerance_letter,
        groove_letter,
        inscribed_circle_mm: ic_mm,
        thickness_code,
        corner_radius_mm,
        shape_angle_deg: SHAPE_ANGLE_DEG[shape],
        shape_description: SHAPE_DESCRIPTION[shape],
      },
      warnings,
    };
  }

  /**
   * Look up the effective approach angle κr for a given (shape, holder) combo.
   * Returns the typical value + a fallback of 90° when the combo isn't charted.
   */
  approachAngle(shape: ISOInsertShape, holder: HolderStyle): {
    kappa_r_deg: number;
    notes: string;
    charted: boolean;
  } {
    const entry = APPROACH_ANGLE_TABLE.find((r) => r.shape === shape && r.holder === holder);
    if (entry) {
      return { kappa_r_deg: entry.kappa_r_deg, notes: entry.notes, charted: true };
    }
    return {
      kappa_r_deg: 90,
      notes: `uncharted combo ${shape}×${holder} — defaulting to κr=90° (radial)`,
      charted: false,
    };
  }

  /**
   * Full Kienzle calculation using κr derived from insert + holder geometry.
   * Applies b = ap/sin(κr), h = f·sin(κr), Fc = kc1.1 × h^(-mc) × b × h.
   */
  kienzleWithInsert(input: InsertKienzleInput): InsertKienzleResult {
    const { parsed, warnings } = this.parseCode(input.insert_code);
    const approach = this.approachAngle(parsed.shape, input.holder_style);
    const kappaRad = (approach.kappa_r_deg * Math.PI) / 180;
    const sinKappa = Math.sin(kappaRad);

    if (sinKappa <= 0) {
      warnings.push(`κr=${approach.kappa_r_deg}° produces sin≤0 — clamping to 90°`);
    }
    const sinEff = sinKappa > 0 ? sinKappa : 1;

    const b = input.ap_mm / sinEff;
    const h = input.feed_mm_rev * sinEff;

    const mat = CANONICAL_KIENZLE[input.material_iso];
    const { kc1_1, mc } = mat;
    // Effective kc at this chip thickness — kc1.1 corrected for non-1mm h
    const kcEff = h > 0 ? kc1_1 * Math.pow(h, -mc) : kc1_1;
    const Fc = kcEff * b * h;

    if (!approach.charted) {
      warnings.push(approach.notes);
    }
    if (h > 0.4) {
      warnings.push(`chip thickness h=${h.toFixed(3)}mm aggressive for finishing — consider higher feed`);
    }
    if (input.ap_mm < 0.5 * parsed.corner_radius_mm && parsed.corner_radius_mm > 0) {
      warnings.push(`ap (${input.ap_mm}mm) < half corner radius (${parsed.corner_radius_mm}mm) — nose-only cut, recalc if rough`);
    }

    return {
      shape: parsed.shape,
      holder_style: input.holder_style,
      kappa_r_deg: approach.kappa_r_deg,
      chip_width_b_mm: b,
      chip_thickness_h_mm: h,
      kc_effective_n_mm2: kcEff,
      cutting_force_n: Fc,
      notes: approach.notes,
      warnings,
    };
  }

  /**
   * Compare two inserts head-to-head under identical operating conditions.
   * Useful for VNMG-vs-CNMG decisions where the same ap/feed/material
   * produces different cutting forces because of differing κr.
   */
  compare(a: InsertKienzleInput, b: InsertKienzleInput): {
    a: InsertKienzleResult;
    b: InsertKienzleResult;
    force_ratio_a_over_b: number;
    h_ratio_a_over_b: number;
    b_ratio_a_over_b: number;
    winner_lower_force: "a" | "b" | "tie";
  } {
    const ra = this.kienzleWithInsert(a);
    const rb = this.kienzleWithInsert(b);
    const forceRatio = rb.cutting_force_n > 0 ? ra.cutting_force_n / rb.cutting_force_n : NaN;
    const hRatio = rb.chip_thickness_h_mm > 0 ? ra.chip_thickness_h_mm / rb.chip_thickness_h_mm : NaN;
    const bRatio = rb.chip_width_b_mm > 0 ? ra.chip_width_b_mm / rb.chip_width_b_mm : NaN;
    const delta = ra.cutting_force_n - rb.cutting_force_n;
    const winner =
      Math.abs(delta) / Math.max(1, Math.min(ra.cutting_force_n, rb.cutting_force_n)) < 0.02
        ? ("tie" as const)
        : delta < 0
        ? ("a" as const)
        : ("b" as const);
    return {
      a: ra,
      b: rb,
      force_ratio_a_over_b: +forceRatio.toFixed(4),
      h_ratio_a_over_b: +hRatio.toFixed(4),
      b_ratio_a_over_b: +bRatio.toFixed(4),
      winner_lower_force: winner,
    };
  }

  /** All charted (shape × holder) combos — for introspection / UI. */
  listChartedCombos(): ReadonlyArray<{ shape: ISOInsertShape; holder: HolderStyle; kappa_r_deg: number; notes: string }> {
    return APPROACH_ANGLE_TABLE;
  }

  /** Shape angle table for UI / training material. */
  getShapeAngles(): Readonly<Record<ISOInsertShape, number>> {
    return SHAPE_ANGLE_DEG;
  }
}

export const isoInsertGeometryEngine = new ISOInsertGeometryEngine();
