/**
 * PDFBlueprintPatternRescueEngine — additive regex patterns for US engineering
 * drawing conventions absent from PDFBlueprintDimensionExtractorEngine.
 *
 * BLUEPRINT-OCR-TRAINING-MS1 / U2 RESCUE (2026-05-16, slot bravo)
 * ============================================================================
 * Rescued value-add from the v8.89.002 monolith fork PRISM_OCR_ENGINE.js
 * (sister copy at extracted_modules/complete_extraction/, byte-identical regex
 * library). The Tesseract.js browser orchestration is OBSOLETE in server-side
 * context (BlueprintVisionOCREngine + ImageOCRPipelineEngine + BlueprintOCREngine
 * already cover image -> text). What the monolith uniquely contributed was a
 * regex pattern library for US engineering drawing conventions absent from the
 * prior extractors:
 *   1. Fractional dimensions   - "1/2"", "3/8", "1-1/2""  (US inch convention)
 *   2. Limit-pair dimensions   - "1.000/1.002"            (US bilateral form)
 *   3. ISO 1302 N-grade Ra     - "N4..N12" lookup         (older Euro drawings)
 *   4. Standalone microinch    - "32 uin", "125 microinch" without Ra prefix
 *
 * Composition with the sister engine (PDFBlueprintDimensionExtractorEngine):
 *   cadDispatcher merges rescue.extract() output into the existing
 *   pdfBlueprintDimensionExtractorEngine.extractDimensions() result, producing
 *   one combined DimensionExtractionResult-compatible payload. The rescue
 *   engine never overwrites the sister engine's findings; only appends.
 *
 * Wiring: prism_cad action cad_pdf_pattern_rescue_extract (new) +
 *         prism_cad action cad_pdf_blueprint_extract (composed in dispatcher
 *         case-block - additive only; the result shape grows, never shrinks).
 *
 * Action surface lives in cadDispatcher.ts; this engine is a pure-transform
 * engine (no fs, no network, no shared state).
 */

import type {
  ExtractedDimension,
  SurfaceFinish,
} from "./PDFBlueprintDimensionExtractorEngine.js";

// ============================================================================
// CONSTANTS — every numeric extracted to a named constant per CLAUDE.md
// ============================================================================

/**
 * US fractional-dimension convention — powers of 2 up to 64ths.
 * Any other denominator is unrealistic for an engineering callout (typically
 * a date, ratio, version, page count, or thread TPI).
 */
const FRACTIONAL_DENOM_WHITELIST: ReadonlySet<number> = new Set([2, 4, 8, 16, 32, 64]);

/**
 * ISO 1302 N-grade roughness comparator -> Ra in micrometers.
 * Source: ISO 1302:2002 Annex F (Geometrical product specifications - surface
 * texture indication). Mirrored in ASME Y14.36M.
 */
const N_GRADE_RA_UM: Readonly<Record<number, number>> = {
  1: 0.025,
  2: 0.05,
  3: 0.1,
  4: 0.2,
  5: 0.4,
  6: 0.8,
  7: 1.6,
  8: 3.2,
  9: 6.3,
  10: 12.5,
  11: 25,
  12: 50,
};

/**
 * N-grade is ambiguous (also matches part numbers like "N4" in identifiers).
 * Require a surface-finish-related token within this many characters of the
 * match, on either side, to accept the N-grade as a callout.
 */
const N_GRADE_CONTEXT_WINDOW_CHARS = 40;
const N_GRADE_CONTEXT_REGEX = /SURFACE|FINISH|ROUGHNESS|Ra\b|ISO\s*1302|N-?grade/i;

/**
 * Limit-pair dimensions ("1.000/1.002") - heuristics to distinguish from
 * coincidental decimal/decimal pairs (ratios, two unrelated numbers,
 * sub-millimeter pure-tolerance pairs, version strings).
 */
const LIMIT_DIM_MIN_UPPER_VALUE = 0.1;        // both values < this => likely tolerance pair, not limits
const LIMIT_DIM_MAX_RELATIVE_BAND = 0.5;      // (upper-lower)/mean > this => unlikely a limit pair
const LIMIT_DIM_EPSILON = 1e-9;               // degenerate-pair floor

/**
 * Cap output to bound runtime + memory on adversarial input. A real blueprint
 * has O(10^2) callouts; a malicious blob can produce O(10^6) regex matches.
 */
const RESCUE_MAX_DIMS = 1000;
const RESCUE_MAX_FINISHES = 500;

// ============================================================================
// RESULT TYPE
// ============================================================================

export interface RescuedExtractionResult {
  /** Fractional + limit-pair dimensions, shape-compatible with sister engine */
  dimensions: ExtractedDimension[];
  /** N-grade + standalone-microinch surface finishes */
  surface_finishes: SurfaceFinish[];
  /**
   * Per-method counts (for diagnostic / scrutiny — never load-bearing).
   * Kept tiny so consumers can log it cheaply.
   */
  rescue_counts: {
    fractional: number;
    limit_pair: number;
    n_grade: number;
    standalone_microinch: number;
  };
}

// ============================================================================
// ENGINE
// ============================================================================

export class PDFBlueprintPatternRescueEngine {

  /**
   * Run all 4 rescued pattern extractors against the input text. Pure-
   * transform: same input -> same output, no side effects.
   *
   * @param input.text_content - raw OCR/PDF text. Empty/non-string -> empty result.
   * @returns RescuedExtractionResult with dims + finishes + per-method counts.
   */
  extract(input: { text_content: string; default_unit?: "mm" | "inch" }): RescuedExtractionResult {
    const text = typeof input?.text_content === "string" ? input.text_content : "";
    const defaultUnit: "mm" | "inch" = input?.default_unit === "inch" ? "inch" : "mm";

    const fractional = this._extractFractionalDimensions(text);
    const limitPair = this._extractLimitDimensions(text, defaultUnit);
    const nGrade = this._extractNGradeSurfaceFinishes(text);
    const standaloneMicroinch = this._extractStandaloneMicroinch(text);

    // Cap totals — adversarial input safety
    const dims = [...fractional, ...limitPair].slice(0, RESCUE_MAX_DIMS);
    const finishes = [...nGrade, ...standaloneMicroinch].slice(0, RESCUE_MAX_FINISHES);

    return {
      dimensions: dims,
      surface_finishes: finishes,
      rescue_counts: {
        fractional: fractional.length,
        limit_pair: limitPair.length,
        n_grade: nGrade.length,
        standalone_microinch: standaloneMicroinch.length,
      },
    };
  }

  // ==========================================================================
  // 1. Fractional dimensions — `1/2"`, `3/8`, `1-1/2"`, `1 1/2`
  // ==========================================================================

  /**
   * Extract US-style fractional dimensions. Recognized forms:
   *   `1/2`, `1/2"`, `1/2 in`, `3/8`, `1-1/2"`, `1 1/2`
   *
   * Denominator must be a power of 2 in {2,4,8,16,32,64}. Anything else is
   * rejected (dates `1/4/2026`, page numbers `Page 1/4`, scales `1:2`,
   * version `v1/2`, TPI `20`).
   *
   * Context filters (skip if any matches):
   *   - Preceded by `#` (numbered thread `#10-32`)
   *   - Followed by `-\d+\s*(UNC|UNF|UNEF|UN|NPT|NPTF|BSPT|BSPP|TPI)` (thread spec)
   *   - Followed by `/\d` (slash chain = date / version / sheet count)
   *   - Followed by `:` (ratio or scale)
   *   - Preceded by `M\s*` (metric thread pitch)
   *   - Inside a literal word like `Page`, `Sheet`, `Rev`, `Scale`, `Version`
   *
   * Unit: always "inch" (fractional dims are inch convention).
   */
  private _extractFractionalDimensions(text: string): ExtractedDimension[] {
    if (text.length === 0) return [];
    const out: ExtractedDimension[] = [];

    // Lookbehind (not consuming-class) avoids the off-by-one cascade in the
    // earlier draft and keeps `m.index` aligned to the actual fraction start.
    // `(?<![#\d\/.\-A-Za-z])` rejects fractions glued onto identifiers (`PN-1/4`)
    // and numbers (`12 3/4` still matches because space resets the boundary).
    const re = /(?<![#\d\/.\-A-Za-z])(?:(\d{1,3})[\s-])?(\d{1,3})\/(\d{1,3})(?:\s*(["']|in|IN))?/g;

    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const wholeStr = m[1];
      const numStr = m[2];
      const denStr = m[3];

      const whole = wholeStr ? parseInt(wholeStr, 10) : 0;
      const num = parseInt(numStr, 10);
      const den = parseInt(denStr, 10);
      if (!Number.isFinite(whole) || !Number.isFinite(num) || !Number.isFinite(den)) continue;
      if (den === 0) continue;
      if (!FRACTIONAL_DENOM_WHITELIST.has(den)) continue;
      if (num === 0) continue;             // 0/4 is degenerate
      if (num >= den) continue;            // 5/4 is improper; usually a typo or version

      // Look-behind: tight 16-char window before the match for PAGE/SHEET/etc.
      // veto. Lookbehind means `m.index` is exact; this slice is correct.
      const before = text.slice(Math.max(0, m.index - 16), m.index).toUpperCase();
      if (/(?:PAGE|SHEET|REV|SCALE|VERSION|VER|VOL|FIG|TABLE|CHAPTER|CH\.|#)\s*$/.test(before)) continue;

      // Look-ahead: skip if followed by thread spec or slash chain (date/version/ratio).
      const afterIdx = m.index + m[0].length;
      const after = text.slice(afterIdx, afterIdx + 16).toUpperCase();
      if (/^\s*-\s*\d+\s*(UNC|UNF|UNEF|UN\b|NPT|NPTF|BSPT|BSPP|TPI)/.test(after)) continue;
      if (/^\s*\/\s*\d/.test(after)) continue;             // 1/4/2026 (date)
      if (/^\s*:\s*\d/.test(after)) continue;              // 1/4:2 (ratio)

      const decimal = whole + num / den;
      // raw_text = the matched substring trimmed — no slice arithmetic, no
      // silent fallback. With lookbehind, m[0] IS the fraction span.
      const rawText = m[0].trim();

      out.push({
        type: "linear",
        nominal: decimal,
        tolerance_plus: 0,
        tolerance_minus: 0,
        unit: "inch",
        raw_text: rawText,
      });

      if (out.length >= RESCUE_MAX_DIMS) break;
    }

    return out;
  }

  // ==========================================================================
  // 2. Limit-pair dimensions — `1.000/1.002`
  // ==========================================================================

  /**
   * Extract US limit-pair dimensions (`1.000/1.002`). Both values must be
   * decimal (rules out `1/4` fractions). Computes nominal = (lower+upper)/2;
   * tolerance_plus = upper-nominal, tolerance_minus = lower-nominal (negative).
   *
   * Rejected when:
   *   - Either value < LIMIT_DIM_MIN_UPPER_VALUE (likely a tolerance pair, not limits)
   *   - Band/mean > LIMIT_DIM_MAX_RELATIVE_BAND (likely unrelated numbers)
   *   - Preceded by `M` (metric thread pitch like `M10x1.0/1.25`)
   *   - Followed by `x` (likely a `WxH` size or `1.0/1.25 x 45deg` chamfer)
   *   - Bands degenerate (upper-lower < epsilon)
   *
   * Unit assumed "mm" — limit-pair convention is unit-agnostic but defaults
   * to mm for consistency with sister engine's defaultUnit behavior. Caller
   * may override via _detectUnits if integrated through dispatcher.
   */
  private _extractLimitDimensions(text: string, defaultUnit: "mm" | "inch"): ExtractedDimension[] {
    if (text.length === 0) return [];
    const out: ExtractedDimension[] = [];

    const re = /(\d+\.\d+)\s*\/\s*(\d+\.\d+)/g;

    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const a = parseFloat(m[1]);
      const b = parseFloat(m[2]);
      if (!Number.isFinite(a) || !Number.isFinite(b)) continue;

      // Reject metric thread pitch context (wider 16-char window to catch
      // "METRIC THREAD M10 X 1.0/1.25" forms with intervening spaces).
      const prevSlice = text.slice(Math.max(0, m.index - 16), m.index);
      if (/M\d+(?:\.\d+)?\s*[xX*]?\s*$/.test(prevSlice)) continue;

      // Reject chamfer/size context (wider 8-char ahead window):
      // "0.250/0.260 X 45deg" forms with intervening spaces.
      const afterIdx = m.index + m[0].length;
      const afterSlice = text.slice(afterIdx, afterIdx + 8);
      if (/^\s*[xX*]\s*\d/.test(afterSlice)) continue;

      const lower = Math.min(a, b);
      const upper = Math.max(a, b);

      if (upper < LIMIT_DIM_MIN_UPPER_VALUE) continue;          // tolerance pair, not limits
      if (upper - lower < LIMIT_DIM_EPSILON) continue;          // degenerate
      const mean = (lower + upper) / 2;
      if (mean > 0 && (upper - lower) / mean > LIMIT_DIM_MAX_RELATIVE_BAND) continue; // not a limit pair

      const nominal = mean;
      out.push({
        type: "linear",
        nominal,
        tolerance_plus: upper - nominal,
        tolerance_minus: lower - nominal,   // negative
        unit: defaultUnit,
        raw_text: m[0],
      });

      if (out.length >= RESCUE_MAX_DIMS) break;
    }

    return out;
  }

  // ==========================================================================
  // 3. ISO 1302 N-grade surface finish — `N4..N12`
  // ==========================================================================

  /**
   * Extract N-grade roughness callouts and map to Ra in micrometers via the
   * ISO 1302 comparator table. Requires a surface-finish context token within
   * N_GRADE_CONTEXT_WINDOW_CHARS of the match (otherwise N4 might be a part
   * number suffix like "PN-N4").
   */
  private _extractNGradeSurfaceFinishes(text: string): SurfaceFinish[] {
    if (text.length === 0) return [];
    const out: SurfaceFinish[] = [];

    const re = /\bN([1-9]|1[0-2])\b/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const n = parseInt(m[1], 10);
      const ra = N_GRADE_RA_UM[n];
      if (ra === undefined) continue;

      // Look in a window around the match for surface-finish context.
      const windowStart = Math.max(0, m.index - N_GRADE_CONTEXT_WINDOW_CHARS);
      const windowEnd = Math.min(text.length, m.index + m[0].length + N_GRADE_CONTEXT_WINDOW_CHARS);
      const ctx = text.slice(windowStart, windowEnd);
      if (!N_GRADE_CONTEXT_REGEX.test(ctx)) continue;

      out.push({
        ra,
        unit: "um",
        location: `N-grade=N${n}`,
      });

      if (out.length >= RESCUE_MAX_FINISHES) break;
    }

    return out;
  }

  // ==========================================================================
  // 4. Standalone microinch — `32 µin`, `125 microinch` without Ra prefix
  // ==========================================================================

  /**
   * Extract standalone microinch surface-finish callouts. The sister engine's
   * _extractSurfaceFinishes recognizes `Ra 32 µin` (with Ra prefix); this
   * picks up `32 µin` / `125 microinch` / `RMS 63 µin` without explicit Ra.
   *
   * Caller is responsible for dedupe against sister-engine output (cadDispatcher
   * merges in additive-only fashion; tests assert no double-count via raw_text
   * comparison).
   */
  private _extractStandaloneMicroinch(text: string): SurfaceFinish[] {
    if (text.length === 0) return [];
    const out: SurfaceFinish[] = [];

    // Match: decimal value followed by micro-inch unit (multiple Unicode variants).
    // Regex `(\d+(?:\.\d+)?)` (no ambiguous `\d+\.?\d*`) avoids polynomial
    // backtracking + the `parseFloat("3.")===3` ghost-match defect.
    const re = /(\d+(?:\.\d+)?)\s*(?:µin|μin|uin|microinch)\b/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const ra = parseFloat(m[1]);
      if (!Number.isFinite(ra) || ra <= 0) continue;

      // Skip if a Ra prefix appears before (sister engine captures Ra-prefixed
      // forms). Window widened to 10 chars to catch `Ra = 32 µin` / `Ra: 32 µin`
      // and other separator variants the earlier 6-char window missed.
      const before = text.slice(Math.max(0, m.index - 10), m.index);
      if (/Ra\s*[=:]?\s*$/i.test(before)) continue;

      out.push({
        ra,
        unit: "uin",
      });

      if (out.length >= RESCUE_MAX_FINISHES) break;
    }

    return out;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const pdfBlueprintPatternRescueEngine = new PDFBlueprintPatternRescueEngine();
