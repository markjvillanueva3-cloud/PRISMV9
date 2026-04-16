/**
 * FCFSyntaxValidatorEngine
 * ==========================
 *
 * ASME Y14.5-2018 Feature Control Frame syntax validator.
 *
 * This engine validates a parsed FCF (from GDTCalloutParserEngine) for
 * standards-compliant syntax. It catches invalid symbol-modifier
 * combinations, missing datums, wrong tolerance magnitudes, and other
 * syntax violations that would be rejected by a drawing review.
 *
 * Validations (per ASME Y14.5-2018):
 *   - Form tolerances (flatness, straightness, roundness, cylindricity)
 *     may NOT reference datums
 *   - Material modifiers (M/L) apply only to features of size (positional
 *     controls, axial straightness). Invalid on flatness/roundness/etc.
 *   - Diameter symbol (Ø) valid only for position, concentricity, runout
 *   - Position tolerance requires at least a primary datum
 *   - Concentricity + symmetry are deprecated in Y14.5-2018 (note, not error)
 *   - Composite FCF: refinement tol ≤ primary, same symbol
 *   - Circular runout & total runout require ≥1 datum
 *   - Profile tolerance with datums → profile-to-datum
 *   - Parallelism/perpendicularity/angularity require ≥1 datum
 *   - Tolerance value > 0
 *   - Tolerance ≤ 50% of feature size (sanity check)
 *
 * Severity levels:
 *   - error: standards violation — drawing would be rejected
 *   - warning: deprecated or unusual but allowed
 *   - info: style / best-practice suggestion
 *
 * @module engines/FCFSyntaxValidatorEngine
 * @milestone LATHE-PRO-MS8
 */

import type { FCF, GDTSymbol, MaterialModifier } from "./GDTCalloutParserEngine.js";

export type FCFIssueSeverity = "error" | "warning" | "info";

export interface FCFIssue {
  severity: FCFIssueSeverity;
  code: string;
  message: string;
}

export interface FCFValidationInput {
  fcf: FCF;
  /** Feature size (mm) for sanity check of tolerance magnitude */
  feature_size_mm?: number;
  /** Does the feature have a defined size (i.e., a feature of size)? */
  is_feature_of_size?: boolean;
}

export interface FCFValidationResult {
  valid: boolean;
  issues: FCFIssue[];
  summary: { errors: number; warnings: number; info: number };
}

const FORM_SYMBOLS: GDTSymbol[] = ["flatness", "straightness", "roundness", "cylindricity"];
const ORIENTATION_SYMBOLS: GDTSymbol[] = ["parallelism", "perpendicularity", "angularity"];
const LOCATION_SYMBOLS: GDTSymbol[] = ["position", "concentricity", "symmetry"];
const PROFILE_SYMBOLS: GDTSymbol[] = ["profile_of_line", "profile_of_surface"];
const RUNOUT_SYMBOLS: GDTSymbol[] = ["circular_runout", "total_runout"];

/** Symbols where diameter prefix (Ø) is valid */
const DIA_VALID_SYMBOLS: GDTSymbol[] = [
  "position",
  "concentricity",
  "circular_runout",
  "total_runout",
];

/** Symbols where material modifier (M/L) is valid */
const MMC_VALID_SYMBOLS: GDTSymbol[] = [
  "position",
  "concentricity",
  "symmetry",
  "perpendicularity",
  "parallelism",
  "angularity",
  "straightness", // axial straightness of a feature of size
];

/** Deprecated symbols in ASME Y14.5-2018 */
const DEPRECATED_SYMBOLS: GDTSymbol[] = ["concentricity", "symmetry"];

class FCFSyntaxValidatorEngineImpl {
  validate(i: FCFValidationInput): FCFValidationResult {
    const issues: FCFIssue[] = [];
    const f = i.fcf;

    // Pass-through errors from parser
    for (const e of f.errors) {
      issues.push({ severity: "error", code: "PARSE_ERROR", message: e });
    }

    // --- Tolerance value checks ---
    if (f.tolerance_mm <= 0) {
      issues.push({
        severity: "error",
        code: "ZERO_TOLERANCE",
        message: `Tolerance must be > 0, got ${f.tolerance_mm}`,
      });
    }
    if (i.feature_size_mm && f.tolerance_mm > i.feature_size_mm * 0.5) {
      issues.push({
        severity: "warning",
        code: "TOL_TOO_LOOSE",
        message: `Tolerance ${f.tolerance_mm}mm > 50% of feature size ${i.feature_size_mm}mm — sanity check`,
      });
    }

    // --- Form tolerances cannot have datums ---
    if (FORM_SYMBOLS.includes(f.symbol) && f.datums.length > 0) {
      issues.push({
        severity: "error",
        code: "FORM_WITH_DATUM",
        message: `Form tolerance (${f.symbol}) must NOT reference datums (Y14.5 §8.2)`,
      });
    }

    // --- Orientation/location/profile/runout need datums ---
    if (
      (ORIENTATION_SYMBOLS.includes(f.symbol) || RUNOUT_SYMBOLS.includes(f.symbol)) &&
      f.datums.length === 0
    ) {
      issues.push({
        severity: "error",
        code: "MISSING_DATUM",
        message: `${f.symbol} requires at least one datum reference`,
      });
    }
    if (f.symbol === "position" && f.datums.length === 0) {
      issues.push({
        severity: "error",
        code: "POSITION_NO_DATUM",
        message: "Position tolerance requires at least a primary datum",
      });
    }

    // --- Diameter prefix check ---
    if (f.diameter && !DIA_VALID_SYMBOLS.includes(f.symbol)) {
      issues.push({
        severity: "error",
        code: "INVALID_DIAMETER_PREFIX",
        message: `Diameter prefix (Ø) invalid for ${f.symbol}; valid only for ${DIA_VALID_SYMBOLS.join(", ")}`,
      });
    }

    // --- Material modifier checks ---
    if (f.material_modifier !== "RFS") {
      if (FORM_SYMBOLS.includes(f.symbol) && f.symbol !== "straightness") {
        issues.push({
          severity: "error",
          code: "MMC_ON_FORM",
          message: `Material modifier (${f.material_modifier}) invalid for form tolerance ${f.symbol}`,
        });
      } else if (PROFILE_SYMBOLS.includes(f.symbol)) {
        issues.push({
          severity: "error",
          code: "MMC_ON_PROFILE",
          message: `Material modifier (${f.material_modifier}) invalid on ${f.symbol} (surface profile)`,
        });
      } else if (RUNOUT_SYMBOLS.includes(f.symbol)) {
        issues.push({
          severity: "error",
          code: "MMC_ON_RUNOUT",
          message: `Material modifier (${f.material_modifier}) invalid on ${f.symbol}`,
        });
      } else if (!MMC_VALID_SYMBOLS.includes(f.symbol)) {
        issues.push({
          severity: "warning",
          code: "MMC_UNUSUAL",
          message: `Material modifier (${f.material_modifier}) unusual for ${f.symbol}`,
        });
      }
      // Material modifier on straightness requires feature of size
      if (f.symbol === "straightness" && !i.is_feature_of_size) {
        issues.push({
          severity: "warning",
          code: "MMC_STRAIGHTNESS_NOT_FOS",
          message: "Material modifier on straightness requires axis/feature-of-size context",
        });
      }
    }

    // --- Deprecated symbols ---
    if (DEPRECATED_SYMBOLS.includes(f.symbol)) {
      issues.push({
        severity: "warning",
        code: "DEPRECATED_SYMBOL",
        message: `${f.symbol} is deprecated in Y14.5-2018 — prefer position or runout for coaxiality`,
      });
    }

    // --- Composite FCF checks ---
    if (f.composite_refinement) {
      const r = f.composite_refinement;
      if (r.symbol !== f.symbol) {
        issues.push({
          severity: "error",
          code: "COMPOSITE_SYMBOL_MISMATCH",
          message: `Composite refinement symbol (${r.symbol}) must match primary (${f.symbol})`,
        });
      }
      if (r.tolerance_mm > f.tolerance_mm) {
        issues.push({
          severity: "error",
          code: "COMPOSITE_REFINEMENT_LOOSER",
          message: `Refinement tol ${r.tolerance_mm} must be ≤ primary ${f.tolerance_mm}`,
        });
      }
      // Recursively validate refinement (without composite checks)
      const ref = this.validate({
        fcf: { ...r, composite_refinement: undefined },
        feature_size_mm: i.feature_size_mm,
        is_feature_of_size: i.is_feature_of_size,
      });
      for (const issue of ref.issues) {
        issues.push({
          severity: issue.severity,
          code: `REFINEMENT_${issue.code}`,
          message: `(refinement) ${issue.message}`,
        });
      }
    }

    // --- Datum reference consistency ---
    const seen = new Set<string>();
    for (const d of f.datums) {
      if (seen.has(d.label)) {
        issues.push({
          severity: "error",
          code: "DUPLICATE_DATUM",
          message: `Datum '${d.label}' referenced more than once in FCF`,
        });
      }
      seen.add(d.label);
      if (d.modifier && d.modifier !== "RFS" && !isDatumModifierValid(d.modifier, f.symbol)) {
        issues.push({
          severity: "warning",
          code: "DATUM_MMC_UNUSUAL",
          message: `Datum ${d.label}(${d.modifier}) unusual for ${f.symbol}`,
        });
      }
    }

    // --- Profile style note ---
    if (PROFILE_SYMBOLS.includes(f.symbol) && f.datums.length === 0) {
      issues.push({
        severity: "info",
        code: "PROFILE_WITHOUT_DATUM",
        message: "Profile without datums controls form only — confirm intent",
      });
    }

    // --- Summary ---
    const summary = {
      errors: issues.filter((x) => x.severity === "error").length,
      warnings: issues.filter((x) => x.severity === "warning").length,
      info: issues.filter((x) => x.severity === "info").length,
    };
    return {
      valid: summary.errors === 0,
      issues,
      summary,
    };
  }

  getStats(): { rules_applied: string[]; reference: string } {
    return {
      rules_applied: [
        "form tolerance must not reference datums",
        "orientation/runout/position require datums",
        "diameter prefix only on position/concentricity/runout",
        "material modifier only on features of size",
        "composite refinement ≤ primary tolerance",
        "concentricity + symmetry deprecated (Y14.5-2018)",
      ],
      reference: "ASME Y14.5-2018, ISO 1101:2017",
    };
  }
}

function isDatumModifierValid(mod: MaterialModifier, sym: GDTSymbol): boolean {
  // Datum modifiers allowed where the datum is a feature-of-size
  return MMC_VALID_SYMBOLS.includes(sym);
}

export const fcfSyntaxValidatorEngine = new FCFSyntaxValidatorEngineImpl();
export type { FCFSyntaxValidatorEngineImpl };
