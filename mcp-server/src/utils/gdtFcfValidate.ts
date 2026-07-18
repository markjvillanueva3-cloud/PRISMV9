/**
 * GD&T Feature-Control-Frame syntax validation for OCR-extracted frames.
 *
 * Bridges the blueprint-OCR output shape (`ExtractedGDT` from BlueprintOCREngine)
 * to the existing ASME Y14.5-2018 validator (`FCFSyntaxValidatorEngine`). It does NOT
 * reimplement any validation logic -- it adapts the OCR frame into the validator's `FCF`
 * input and forwards to `fcfSyntaxValidatorEngine.validate()` (R8: reuse, don't rebuild).
 *
 * The result is INFORMATIONAL only -- `fcf_valid` + human-readable `fcf_issues` ride on the
 * extracted frame so a consumer (or operator review) can see a datum-deficient / standards-
 * violating callout. It mutates NO cost/process-bearing field (sibling discipline to
 * U-XRAY-PART-DEFAULT-FINISH: never silently derive a value that drives a quote or a machining
 * pass; surface it as a signal instead).
 *
 * THE SUBTLE HAZARD this guards: the two `GDTSymbol` enums differ across the boundary --
 *   OCR side (BlueprintOCREngine):       circularity, profile_line,    profile_surface
 *   parser side (GDTCalloutParserEngine): roundness,   profile_of_line, profile_of_surface
 * A naive `symbol` pass-through would make the validator silently fail to recognize
 * `circularity` as a form tolerance (no FORM_WITH_DATUM flag) and the two `profile_*`
 * symbols as profile tolerances. The explicit map below translates BOTH naming vocabularies.
 */

import {
  fcfSyntaxValidatorEngine,
  type FCFValidationResult,
} from "../engines/FCFSyntaxValidatorEngine.js";
import type {
  FCF,
  GDTSymbol as ParserGDTSymbol,
  MaterialModifier,
} from "../engines/GDTCalloutParserEngine.js";

/** Exact inch -> mm unit conversion (definition, not a physics material constant). */
const MM_PER_INCH = 25.4;

// Translate an OCR-side (or parser-side) symbol name into the parser/validator vocabulary.
// Keys are lower-cased; BOTH naming conventions are accepted so a frame named either way
// validates. Anything not present -> the frame is NOT validated (never guessed -- R12).
const SYMBOL_TO_PARSER: Readonly<Record<string, ParserGDTSymbol>> = Object.freeze({
  // common to both vocabularies
  flatness: "flatness",
  straightness: "straightness",
  cylindricity: "cylindricity",
  parallelism: "parallelism",
  perpendicularity: "perpendicularity",
  angularity: "angularity",
  position: "position",
  concentricity: "concentricity",
  symmetry: "symmetry",
  circular_runout: "circular_runout",
  total_runout: "total_runout",
  // OCR-side names that DIFFER from the parser vocabulary
  circularity: "roundness",
  profile_line: "profile_of_line",
  profile_surface: "profile_of_surface",
  // parser-native aliases (accept either vocabulary)
  roundness: "roundness",
  profile_of_line: "profile_of_line",
  profile_of_surface: "profile_of_surface",
});

// OCR material_condition (MMC/LMC/RFS) -> parser material_modifier (M/L/F/RFS).
const MATERIAL_CONDITION_TO_MODIFIER: Readonly<Record<string, MaterialModifier>> = Object.freeze({
  MMC: "M",
  LMC: "L",
  RFS: "RFS",
});

/** The minimal OCR-frame shape this validator needs (structurally satisfied by ExtractedGDT). */
export interface ExtractedGdtLike {
  symbol?: string | null;
  tolerance_value?: number | null;
  tolerance_unit?: "mm" | "in" | null;
  material_condition?: string | null;
  datum_references?: string[] | null;
}

export interface GdtFcfValidation {
  /** true when the adapted FCF has zero ASME Y14.5 syntax ERRORS (warnings/info do not fail it). */
  fcf_valid: boolean;
  /** human-readable issues, e.g. "[error] POSITION_NO_DATUM: Position tolerance requires ...". */
  fcf_issues: string[];
}

/**
 * Validate a single OCR-extracted GD&T frame against ASME Y14.5-2018 syntax rules.
 * Pure. Returns `undefined` when the symbol is unrecognized (cannot validate without
 * guessing the control type -- R12), so the caller leaves the frame un-annotated rather
 * than emitting a misleading verdict.
 *
 * @param g an OCR frame (ExtractedGDT or any structurally-compatible object).
 * @returns `{ fcf_valid, fcf_issues }`, or `undefined` if the symbol is unknown.
 */
export function validateExtractedGdt(g: ExtractedGdtLike): GdtFcfValidation | undefined {
  const symKey = typeof g.symbol === "string" ? g.symbol.trim().toLowerCase() : "";
  const symbol = SYMBOL_TO_PARSER[symKey];
  if (!symbol) return undefined;

  // Tolerance -> mm. A missing/non-finite value becomes 0, which the validator correctly
  // flags ZERO_TOLERANCE (a frame whose tolerance the VLM failed to read IS review-worthy).
  const rawTol =
    typeof g.tolerance_value === "number" && Number.isFinite(g.tolerance_value)
      ? g.tolerance_value
      : 0;
  // No rounding: tolerance_mm feeds only the validator's >0 / sanity checks (it is never
  // surfaced), and rounding could truncate a real sub-0.00005mm tolerance to 0 -> a false
  // ZERO_TOLERANCE. Pass the exact converted magnitude.
  const tolerance_mm = g.tolerance_unit === "in" ? rawTol * MM_PER_INCH : rawTol;

  const material_modifier: MaterialModifier =
    (typeof g.material_condition === "string" &&
      MATERIAL_CONDITION_TO_MODIFIER[g.material_condition.trim().toUpperCase()]) ||
    "RFS";

  // datum labels -> DatumRef[]; drop blank/non-string entries so they never trip the
  // validator's DUPLICATE_DATUM check or mask a genuine missing-datum error.
  const datums = (Array.isArray(g.datum_references) ? g.datum_references : [])
    .filter((d): d is string => typeof d === "string" && d.trim().length > 0)
    .map((d) => ({ label: d.trim() }));

  const fcf: FCF = {
    symbol,
    tolerance_mm,
    // The OCR path does not capture whether the tolerance carried a diameter (O) prefix;
    // false avoids a false INVALID_DIAMETER_PREFIX (the validator only errors when true).
    diameter: false,
    material_modifier,
    datums,
    errors: [],
  };

  const result: FCFValidationResult = fcfSyntaxValidatorEngine.validate({ fcf });
  return {
    fcf_valid: result.valid,
    fcf_issues: result.issues.map((x) => `[${x.severity}] ${x.code}: ${x.message}`),
  };
}
