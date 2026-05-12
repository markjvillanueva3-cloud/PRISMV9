/**
 * PrismEnhancedGDTEngine
 * =======================
 *
 * Rescued + adapted from `extracted_modules/complete_extraction/PRISM_ENHANCED_GDT_ENGINE.js`
 * (a JS monolith fork sitting in extracted/ per [[reference_monolith_extraction]]).
 *
 * Enriches the base FCF parser (`gdtCalloutParserEngine`) with:
 *   1. Symbol metadata — per-symbol description / application / measurement-method
 *      strings (useful for operator UI, drawing review, training corpus)
 *   2. CAM strategy interpretation — maps a parsed FCF to recommended machining
 *      strategy (drilling/facing/turning) with tolerance-based branching
 *      (PRECISION_BORE vs REAM vs DRILL; GRINDING vs PRECISION_FACE vs STANDARD_FACE;
 *      PRECISION_TURN vs STANDARD_TURN)
 *   3. Bonus tolerance calculation — MMC/LMC bonus computation for features of size
 *   4. Position deviation formula — 2*sqrt(dx^2 + dy^2 + dz^2) per ASME Y14.5
 *
 * Composition (does NOT replace base parser):
 *   - Delegates FCF parsing to `gdtCalloutParserEngine.parse()`
 *   - Adds enrichment + CAM-side reasoning on top
 *
 * **Symbols + modifiers coverage:**
 *   - 14 GD&T symbols (form/orientation/location/profile/runout) — metadata + CAM
 *     interpretation; matches base parser recognition.
 *   - 9 material/state modifier metadata blocks per ASME Y14.5-2018 (M, L, RFS, P,
 *     F, T, ST, CF, UZ). The BASE PARSER currently recognizes 4 of these in callout
 *     text (M / L / F / RFS — see `MaterialModifier` type). The remaining 5
 *     (P / T / ST / CF / UZ) are metadata-only at this layer; extending parser
 *     coverage is future work (logged in MS1 handoff).
 *
 * **Error policy:** all methods return errors-in-result, NOT thrown. This matches
 * the peer engines (`GDTCalloutParserEngine`, `FCFSyntaxValidatorEngine`) so that
 * a dispatcher action chain doesn't surface unhandled throws as 500s.
 *
 * Canonical references:
 *   - ASME Y14.5-2018 (Dimensioning & Tolerancing)
 *   - ISO 1101:2017 (Geometrical tolerancing)
 *
 * @module engines/PrismEnhancedGDTEngine
 * @milestone BLUEPRINT-OCR-TRAINING-MS1/U1
 */

import {
  gdtCalloutParserEngine,
  type FCF,
  type GDTSymbol,
  type MaterialModifier,
} from "./GDTCalloutParserEngine.js";

/** Categories per ASME Y14.5-2018 §3 */
export type GDTCategory = "form" | "orientation" | "location" | "profile" | "runout";

/** Operator-facing metadata block for a GD&T symbol. */
export interface SymbolMetadata {
  symbol: GDTSymbol;
  glyph: string;
  unicode: string;
  category: GDTCategory;
  /** Datum requirement: false = no datums allowed; true = required; "optional" = profile rule */
  requires_datum: boolean | "optional";
  description: string;
  application: string;
  measurement: string;
}

/**
 * Material/state modifier metadata block.
 * Covers all 9 ASME Y14.5-2018 modifiers; base parser only recognizes 4 (M/L/F/RFS)
 * in callout text — see module doc.
 */
export type ExtendedModifierCode = MaterialModifier | "P" | "T" | "ST" | "CF" | "UZ";

export interface ModifierMetadata {
  code: ExtendedModifierCode;
  glyph: string;
  unicode?: string;
  name: string;
  description: string;
  application?: string;
  /** True if the base FCF parser recognizes this modifier in callout text */
  parser_recognized: boolean;
}

/** CAM strategy tiers — ordered tightest-first. */
export type DrillingStrategy = "PRECISION_BORE" | "REAM" | "DRILL";
export type FacingStrategy = "GRINDING" | "PRECISION_FACE" | "STANDARD_FACE";
export type TurningStrategy = "PRECISION_TURN" | "STANDARD_TURN";
export type CAMStrategy =
  | DrillingStrategy
  | FacingStrategy
  | TurningStrategy
  | "REVIEW"
  | "PARSE_FAILED";

export interface CAMRecommendation {
  operation: string;
  requirement: string;
  tolerance_mm: number;
  strategy: CAMStrategy;
  /** Symbol the recommendation was derived from (for debugging / audit trail) */
  symbol?: GDTSymbol;
}

export interface EnhancedFCF {
  /** Parsed FCF (from base parser) */
  fcf: FCF;
  /** Metadata block for the FCF's symbol — null only on hard parse failure */
  metadata: SymbolMetadata | null;
  /** CAM strategy recommendations (one per applicable operation) */
  cam_recommendations: CAMRecommendation[];
  /** True if the callout failed to parse a recognizable symbol + tolerance */
  parse_failed: boolean;
}

export interface BonusToleranceInput {
  /** Tolerance applies at this material condition */
  condition: "MMC" | "LMC" | "RFS";
  /** Measured feature size (mm) */
  actual_size: number;
  /** Base FCF tolerance value (mm) */
  base_tolerance: number;
  /** Required for condition="MMC" */
  mmc_size?: number;
  /** Required for condition="LMC" */
  lmc_size?: number;
}

export interface BonusToleranceResult {
  bonus: number;
  effective_tolerance: number;
  /** Set when the inputs were inconsistent with the requested condition */
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tolerance thresholds (mm) — drawn from the monolith fork's CAM heuristic.
// Named constants so future review can update without hunting magic numbers.
// ─────────────────────────────────────────────────────────────────────────────
const POSITION_TIGHT_MM = 0.05;
const POSITION_MEDIUM_MM = 0.15;
const FLATNESS_TIGHT_MM = 0.025;
const FLATNESS_MEDIUM_MM = 0.05;
const CIRCULARITY_TIGHT_MM = 0.01;

/**
 * ASME Y14.5 position deviation conversion factor.
 * Position tolerance is expressed as a *diametral* tolerance zone (Ø tol); a measured
 * axis-to-true-position offset is a *radial* offset. Multiplying by 2 converts radial
 * offset → diameter of the tolerance zone for comparison against the FCF spec.
 *
 * (Reviewer-B P2 noted this could be centralized in `physics/constants.ts`; deferred
 * — physics/constants.ts holds cutting-physics constants (Kienzle, Taylor), and a
 * lone GD&T geometric factor would dilute its scope. Tracked in MS1 handoff.)
 */
const POSITION_DIM_3D_FACTOR = 2;

/**
 * Hard parse failures — the base parser was unable to extract a usable
 * (symbol, tolerance) pair. These suppress CAM recommendations and metadata.
 * Distinct from VALIDATION errors (e.g., "Form tolerance must not reference
 * datums"), which leave the FCF semantically usable for CAM planning even
 * though the drawing itself would be rejected at review.
 */
const HARD_PARSE_FAILURE_PATTERNS: RegExp[] = [
  /^Unrecognized GD&T symbol/i,
  /^empty callout/i,
  /^Tolerance value missing or not parseable/i,
];

// ─────────────────────────────────────────────────────────────────────────────
// Symbol metadata table (14 symbols)
// ─────────────────────────────────────────────────────────────────────────────
const SYMBOL_METADATA: Record<GDTSymbol, SymbolMetadata> = {
  flatness: {
    symbol: "flatness", glyph: "⏥", unicode: "U+23E5", category: "form", requires_datum: false,
    description: "All surface points within tolerance zone between two parallel planes",
    application: "Mating surfaces, sealing surfaces, reference planes",
    measurement: "Surface plate with indicator, CMM plane fit",
  },
  straightness: {
    symbol: "straightness", glyph: "⏤", unicode: "U+23E4", category: "form", requires_datum: false,
    description: "Line elements within tolerance zone between two parallel lines/cylinder",
    application: "Shafts, edges, centerlines",
    measurement: "V-blocks with indicator, CMM line fit",
  },
  roundness: {
    symbol: "roundness", glyph: "○", unicode: "U+25CB", category: "form", requires_datum: false,
    description: "All points equidistant from center within radial tolerance",
    application: "Bearing journals, seals, O-ring grooves",
    measurement: "Roundness tester, CMM circle fit",
  },
  cylindricity: {
    symbol: "cylindricity", glyph: "⌭", unicode: "U+232D", category: "form", requires_datum: false,
    description: "All surface points within two concentric cylinders",
    application: "Precision bores, hydraulic cylinders",
    measurement: "CMM cylinder fit, roundness at multiple heights",
  },
  perpendicularity: {
    symbol: "perpendicularity", glyph: "⟂", unicode: "U+27C2", category: "orientation", requires_datum: true,
    description: "Feature at 90° to datum within tolerance zone",
    application: "Mounting surfaces, holes perpendicular to face",
    measurement: "Height gauge from datum, CMM",
  },
  parallelism: {
    symbol: "parallelism", glyph: "∥", unicode: "U+2225", category: "orientation", requires_datum: true,
    description: "Feature parallel to datum within tolerance zone",
    application: "Bearing surfaces, way covers, parallel shafts",
    measurement: "Indicator sweep parallel to datum",
  },
  angularity: {
    symbol: "angularity", glyph: "∠", unicode: "U+2220", category: "orientation", requires_datum: true,
    description: "Feature at specified angle to datum within tolerance zone",
    application: "Tapers, chamfers, angled holes",
    measurement: "Sine bar setup, CMM angular measurement",
  },
  position: {
    symbol: "position", glyph: "⌖", unicode: "U+2316", category: "location", requires_datum: true,
    description: "True position within cylindrical/spherical tolerance zone",
    application: "Hole patterns, pin locations, fastener clearance",
    measurement: "CMM, functional gauge",
  },
  concentricity: {
    symbol: "concentricity", glyph: "◎", unicode: "U+25CE", category: "location", requires_datum: true,
    description: "All median points within cylindrical tolerance zone (deprecated in Y14.5-2018; prefer position or runout)",
    application: "Rotating parts requiring balance (legacy callouts)",
    measurement: "CMM median point analysis",
  },
  symmetry: {
    symbol: "symmetry", glyph: "⌯", unicode: "U+232F", category: "location", requires_datum: true,
    description: "Median points equidistant from datum center plane (deprecated in Y14.5-2018)",
    application: "Keyways, slots requiring centering (legacy)",
    measurement: "Indicator from both sides",
  },
  profile_of_line: {
    symbol: "profile_of_line", glyph: "⌒", unicode: "U+2312", category: "profile", requires_datum: "optional",
    description: "2D profile elements within bilateral tolerance zone",
    application: "Cam profiles, 2D contours",
    measurement: "CMM 2D scan, optical comparator",
  },
  profile_of_surface: {
    symbol: "profile_of_surface", glyph: "⌓", unicode: "U+2313", category: "profile", requires_datum: "optional",
    description: "3D surface within bilateral tolerance zone",
    application: "Freeform surfaces, airfoils, mold cavities",
    measurement: "CMM 3D surface scan",
  },
  circular_runout: {
    symbol: "circular_runout", glyph: "↗", unicode: "U+2197", category: "runout", requires_datum: true,
    description: "FIM at any single cross-section when rotated about the datum axis",
    application: "Shaft surfaces, rotating seals",
    measurement: "Indicator while rotating on datums",
  },
  total_runout: {
    symbol: "total_runout", glyph: "⌰", unicode: "U+2330", category: "runout", requires_datum: true,
    description: "FIM over the entire feature surface when rotated about the datum axis",
    application: "Bearing journals, full surface control",
    measurement: "Indicator traverse while rotating",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Modifier metadata table (9 modifiers from the monolith fork)
// `parser_recognized` flags which of the 9 the base parser currently understands
// in callout text — the rest are metadata-only at this layer.
// ─────────────────────────────────────────────────────────────────────────────
const MODIFIER_METADATA: readonly ModifierMetadata[] = [
  { code: "M", glyph: "Ⓜ", unicode: "U+24C2", name: "Maximum Material Condition",
    description: "Tolerance applies at maximum material (shaft largest, hole smallest); bonus tolerance as feature departs from MMC.",
    application: "Clearance holes, assembly fits", parser_recognized: true },
  { code: "L", glyph: "Ⓛ", unicode: "U+24C1", name: "Least Material Condition",
    description: "Tolerance applies at minimum material (shaft smallest, hole largest); ensures minimum wall thickness.",
    application: "Thin walls, minimum edge distances", parser_recognized: true },
  { code: "RFS", glyph: "Ⓢ", unicode: "U+24C8", name: "Regardless of Feature Size",
    description: "Tolerance applies regardless of actual size — default condition in Y14.5-2018.",
    parser_recognized: true },
  { code: "P", glyph: "Ⓟ", unicode: "U+24C5", name: "Projected Tolerance Zone",
    description: "Tolerance zone projects beyond the feature.",
    application: "Press-fit pins, threaded holes for studs", parser_recognized: false },
  { code: "F", glyph: "Ⓕ", unicode: "U+24BB", name: "Free State",
    description: "Measurement in unconstrained condition.",
    application: "Flexible parts, sheet metal", parser_recognized: true },
  { code: "T", glyph: "Ⓣ", unicode: "U+24C9", name: "Tangent Plane",
    description: "Tolerance applies to the tangent plane of the surface.",
    application: "Fastener seating surfaces", parser_recognized: false },
  { code: "ST", glyph: "ST", name: "Statistical Tolerance",
    description: "Tolerance may be exceeded if statistically validated.",
    application: "High-volume production with SPC", parser_recognized: false },
  { code: "CF", glyph: "CF", name: "Continuous Feature",
    description: "Multiple features treated as a single feature.",
    application: "Interrupted bores, slotted shafts", parser_recognized: false },
  { code: "UZ", glyph: "UZ", name: "Unequal Bilateral",
    description: "Unequal distribution of profile tolerance about the true profile.",
    parser_recognized: false },
];

class PrismEnhancedGDTEngineImpl {
  /** Returns the metadata block for a given symbol, or `null` if unknown. */
  getSymbolMetadata(symbol: GDTSymbol): SymbolMetadata | null {
    return SYMBOL_METADATA[symbol] ?? null;
  }

  /** Returns all 14 symbols' metadata (alphabetical by symbol name). */
  listSymbols(): SymbolMetadata[] {
    return Object.values(SYMBOL_METADATA).sort((a, b) => a.symbol.localeCompare(b.symbol));
  }

  /** Returns all 9 modifiers' metadata (frozen reference — do not mutate). */
  listModifiers(): readonly ModifierMetadata[] {
    return MODIFIER_METADATA;
  }

  /** Returns the metadata block for a given modifier code, or `null` if unknown. */
  getModifierMetadata(code: ExtendedModifierCode): ModifierMetadata | null {
    return MODIFIER_METADATA.find((m) => m.code === code) ?? null;
  }

  /**
   * Hard parse failure detection — true when the base parser was unable to
   * extract a usable (symbol, tolerance) pair from the callout text.
   * Distinct from VALIDATION errors (form-with-datum, invalid-diameter-prefix,
   * etc.) which leave the FCF semantically usable for CAM planning.
   */
  hasParseFailure(fcf: FCF): boolean {
    return fcf.errors.some((e) => HARD_PARSE_FAILURE_PATTERNS.some((p) => p.test(e)));
  }

  /**
   * Parse a callout string and enrich with metadata + CAM recommendations.
   * Composes `gdtCalloutParserEngine.parse()`. On hard parse failure, sets
   * `parse_failed: true` and empties metadata + recommendations.
   */
  parseEnhanced(callout: string): EnhancedFCF {
    const fcf = gdtCalloutParserEngine.parse(callout);
    const parse_failed = this.hasParseFailure(fcf);
    const metadata = parse_failed ? null : this.getSymbolMetadata(fcf.symbol);
    const cam_recommendations = parse_failed ? [] : this.interpretForCAM(fcf);
    return { fcf, metadata, cam_recommendations, parse_failed };
  }

  /**
   * Map an FCF (or callout string) to CAM strategy recommendations.
   * Returns one recommendation per applicable operation. On hard parse failure
   * returns a single PARSE_FAILED recommendation so the caller has an audit
   * trail — never silently empty.
   */
  interpretForCAM(fcfOrCallout: FCF | string): CAMRecommendation[] {
    const fcf: FCF =
      typeof fcfOrCallout === "string" ? gdtCalloutParserEngine.parse(fcfOrCallout) : fcfOrCallout;

    if (this.hasParseFailure(fcf)) {
      return [{
        operation: "process-planning",
        requirement: `Callout could not be parsed: ${fcf.errors.join("; ")}`,
        tolerance_mm: fcf.tolerance_mm,
        strategy: "PARSE_FAILED",
      }];
    }

    const tol = fcf.tolerance_mm;

    switch (fcf.symbol) {
      case "position":
        return [{
          operation: "drilling",
          requirement: "Use precision boring or reaming for tight position tolerance",
          tolerance_mm: tol,
          symbol: fcf.symbol,
          strategy:
            tol < POSITION_TIGHT_MM
              ? "PRECISION_BORE"
              : tol < POSITION_MEDIUM_MM
              ? "REAM"
              : "DRILL",
        }];

      case "flatness":
        return [{
          operation: "facing",
          requirement: "Light finishing passes with fly cutter or face mill",
          tolerance_mm: tol,
          symbol: fcf.symbol,
          strategy:
            tol < FLATNESS_TIGHT_MM
              ? "GRINDING"
              : tol < FLATNESS_MEDIUM_MM
              ? "PRECISION_FACE"
              : "STANDARD_FACE",
        }];

      // Runout is grouped with roundness/cylindricity here for parity with the
      // monolith JS heuristic (which is for OPERATION SELECTION, not precision
      // quoting). Runout is technically a composite tolerance — a 0.005 mm
      // circular runout is tighter than 0.005 mm roundness because it must hold
      // while rotated about a datum. Concentricity is included (deprecated per
      // Y14.5-2018) for legacy-drawing handling. P1-A noted: consider a tighter
      // threshold for runout in a future refinement.
      case "roundness":
      case "cylindricity":
      case "circular_runout":
      case "total_runout":
      case "concentricity":
        return [{
          operation: "turning/boring",
          requirement: "Single setup, minimal tool pressure",
          tolerance_mm: tol,
          symbol: fcf.symbol,
          strategy: tol < CIRCULARITY_TIGHT_MM ? "PRECISION_TURN" : "STANDARD_TURN",
        }];

      case "perpendicularity":
      case "parallelism":
      case "angularity":
      case "straightness":
      case "symmetry":
      case "profile_of_line":
      case "profile_of_surface":
        return [{
          operation: "process-planning",
          requirement: `${fcf.symbol} requires explicit toolpath + fixturing review (no automated mapping)`,
          tolerance_mm: tol,
          symbol: fcf.symbol,
          strategy: "REVIEW",
        }];

      default: {
        // Defensive: if a new GDTSymbol is ever added to the base parser and
        // not handled here, surface it via REVIEW rather than silently empty.
        // This branch is unreachable under current type narrowing.
        const unmapped: GDTSymbol = fcf.symbol;
        return [{
          operation: "process-planning",
          requirement: `No CAM mapping for symbol ${unmapped} — operator review required`,
          tolerance_mm: tol,
          symbol: unmapped,
          strategy: "REVIEW",
        }];
      }
    }
  }

  /**
   * Bonus tolerance per ASME Y14.5-2018:
   *   - MMC: bonus = |actual - MMC_size|  → effective = base_tolerance + bonus
   *   - LMC: bonus = |LMC_size - actual|  → effective = base_tolerance + bonus
   *   - RFS: no bonus
   *
   * Returns errors-in-result (does NOT throw) for consistency with the peer
   * GD&T engines. Missing required-input → `error: "..."`, `bonus: 0`,
   * `effective_tolerance: base_tolerance`.
   *
   * Note: this formula matches the monolith JS source and ASME Y14.5 §3.2.5.
   * It does not currently validate the *direction* of departure (P2-A): for a
   * hole, actual > MMC_size, and for a shaft, actual < MMC_size. Asymmetric
   * sign-checking is a future refinement.
   */
  calculateBonusTolerance(args: BonusToleranceInput): BonusToleranceResult {
    const { actual_size, condition, base_tolerance, mmc_size, lmc_size } = args;
    if (condition === "MMC") {
      if (mmc_size === undefined) {
        return {
          bonus: 0,
          effective_tolerance: base_tolerance,
          error: 'calculateBonusTolerance: condition "MMC" requires mmc_size',
        };
      }
      const bonus = Math.abs(actual_size - mmc_size);
      return { bonus, effective_tolerance: base_tolerance + bonus };
    }
    if (condition === "LMC") {
      if (lmc_size === undefined) {
        return {
          bonus: 0,
          effective_tolerance: base_tolerance,
          error: 'calculateBonusTolerance: condition "LMC" requires lmc_size',
        };
      }
      const bonus = Math.abs(lmc_size - actual_size);
      return { bonus, effective_tolerance: base_tolerance + bonus };
    }
    return { bonus: 0, effective_tolerance: base_tolerance };
  }

  /**
   * True-position deviation per ASME Y14.5:
   *   deviation = 2 * sqrt(dx^2 + dy^2 + dz^2)
   * The factor of 2 converts measured radial offset (axis-to-true-position) to
   * the diameter of the tolerance zone for comparison against the FCF spec.
   */
  calculatePositionDeviation(dx: number, dy: number, dz: number = 0): number {
    return POSITION_DIM_3D_FACTOR * Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  getStats(): {
    symbols_supported: number;
    modifiers_supported: number;
    modifiers_parser_recognized: number;
    cam_strategies: CAMStrategy[];
    reference: string;
  } {
    return {
      symbols_supported: Object.keys(SYMBOL_METADATA).length,
      modifiers_supported: MODIFIER_METADATA.length,
      modifiers_parser_recognized: MODIFIER_METADATA.filter((m) => m.parser_recognized).length,
      cam_strategies: [
        "PRECISION_BORE", "REAM", "DRILL",
        "GRINDING", "PRECISION_FACE", "STANDARD_FACE",
        "PRECISION_TURN", "STANDARD_TURN",
        "REVIEW", "PARSE_FAILED",
      ],
      reference: "ASME Y14.5-2018, ISO 1101:2017",
    };
  }
}

export const prismEnhancedGdtEngine = new PrismEnhancedGDTEngineImpl();
export type { PrismEnhancedGDTEngineImpl };
