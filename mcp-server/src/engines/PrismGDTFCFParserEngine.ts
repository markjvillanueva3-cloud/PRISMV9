/**
 * PrismGDTFCFParserEngine
 * =========================
 *
 * Rescued + adapted from `extracted_modules/complete_extraction/PRISM_GDT_FCF_PARSER.js`
 * (a JS monolith fork sitting in extracted/ per [[reference_monolith_extraction]]).
 *
 * The base `GDTCalloutParserEngine` already handles single + two-segment composite
 * FCF parsing (`parse`, `parseComposite(line1, line2)`). This engine adds the
 * capabilities the base parser does NOT have, drawn from the monolith JS source:
 *
 *   1. **Structured composite output**: `parseComposite(input)` returns
 *      `{primary, refinement, errors}` — a clearer interface than the base
 *      parser's embedded `composite_refinement` field (which leaves the primary
 *      and refinement glued together inside one FCF object).
 *
 *   2. **Multi-tier composite parsing** per Y14.5 §10: an FCF stack of N tiers
 *      (1 PLTZF — pattern-locating tolerance zone framework — plus 1+ FRTZFs —
 *      feature-relating tolerance zone frameworks). Each tier must share the
 *      same geometric characteristic symbol; each successive tier must be
 *      tighter than the preceding one.
 *
 *   3. **Round-trip serialization**: `serialize(fcf)` emits a pipe-delimited
 *      ASME Y14.5 callout that the base parser can re-parse. The monolith's
 *      `generateFCF` is the source of this capability.
 *      **Round-trip contract:** for a VALID FCF (`fcf.errors` empty, internally
 *      Y14.5-consistent), `gdtCalloutParserEngine.parse(serialize(x).callout)`
 *      yields an FCF structurally equal to `x` (modulo error array). For inputs
 *      that violate Y14.5 (e.g., synthesized with `material_modifier:"M"` on
 *      `flatness`), the serializer emits the form faithfully but populates
 *      `warnings[]` so callers know the re-parse will flag a validation error.
 *
 *   4. **`roundTrip(callout)`**: convenience that parses then serializes back —
 *      useful for canonicalizing a callout's textual form.
 *
 * Composition (does NOT replace the base parser):
 *   - All single-FCF parsing → `gdtCalloutParserEngine.parse()`
 *   - Two-segment composite parsing → `gdtCalloutParserEngine.parseComposite()`
 *   - Symbol-glyph lookup → `prismEnhancedGdtEngine.getSymbolMetadata(s)?.glyph`
 *     (single source of truth — the metadata table in PrismEnhancedGDTEngine)
 *
 * **Error policy:** errors-in-result throughout, matching peer engines. The
 * serializer additionally exposes `warnings` for Y14.5-validity concerns the
 * caller should know about even though the textual output is faithful.
 *
 * **Hard parse failure detection** is delegated to `prismEnhancedGdtEngine.hasParseFailure`
 * so the precedence rule (hard parse failure wins over validation errors) stays
 * coherent across both enhancement engines.
 *
 * Canonical references:
 *   - ASME Y14.5-2018 §10 (Composite FCFs — PLTZF + FRTZF hierarchy)
 *   - ISO 1101:2017 (Geometrical tolerancing — FCF syntax)
 *
 * @module engines/PrismGDTFCFParserEngine
 * @milestone BLUEPRINT-OCR-TRAINING-MS1/U1
 */

import {
  gdtCalloutParserEngine,
  type FCF,
  type DatumRef,
  type MaterialModifier,
} from "./GDTCalloutParserEngine.js";
import { prismEnhancedGdtEngine } from "./PrismEnhancedGDTEngine.js";

/** Result of serializing an FCF. */
export interface SerializedFCF {
  /** Pipe-delimited callout (faithful to source FCF). */
  callout: string;
  /** Serializer-side warnings — Y14.5-validity concerns surfaced even though
   *  the output is emitted faithfully. Examples: material modifier on a form
   *  symbol other than `straightness`; non-finite tolerance value; symbol not
   *  in the canonical metadata table. The output WILL re-parse but the re-parse
   *  will flag validation errors corresponding to these warnings. */
  warnings: string[];
}

/** Result of `roundTrip(callout)`. */
export interface RoundTripFCFResult {
  /** Canonical pipe-delimited form produced by the serializer. */
  callout: string;
  /** Parser output from the input callout. */
  source: FCF;
  /** Serializer warnings (see `SerializedFCF`). */
  warnings: string[];
}

/** Two-tier composite FCF result (Y14.5 §10: PLTZF + FRTZF). */
export interface CompositeFCFResult {
  /** Pattern-locating tier (upper line — typically looser tolerance, all 3 datums). */
  primary: FCF | null;
  /** Feature-relating tier (lower line — typically tighter refinement, fewer datums). */
  refinement: FCF | null;
  /** Parse + validation errors (refinement errors prefixed with REFINEMENT_). */
  errors: string[];
}

/** N-tier composite FCF result per Y14.5 §10. */
export interface MultiTierFCFResult {
  /** Each tier in order; tier 0 = PLTZF; tier 1..N = FRTZFs. */
  tiers: FCF[];
  /** Parse + validation errors across tiers. */
  errors: string[];
}

/**
 * Max composite tiers supported. Y14.5-2018 §10 places no hard ceiling on FRTZFs
 * but production drawings rarely exceed 3 tiers. We accept up to MAX_COMPOSITE_TIERS
 * and reject larger stacks as drawing-review red flags.
 */
const MAX_COMPOSITE_TIERS = 4;

/** Datum-level modifier glyphs for serializer output (parentheses preserved per Y14.5). */
const DATUM_MODIFIER_GLYPH: Record<Exclude<MaterialModifier, "RFS">, string> = {
  M: "(M)",
  L: "(L)",
  F: "(F)",
};

/**
 * Symbols on which the BASE PARSER (`GDTCalloutParserEngine.parse`) rejects a
 * non-RFS material modifier on the FCF tolerance segment. The serializer's
 * contract is to surface a warning when the re-parse WILL emit a validation
 * error — so this list must exactly mirror the base parser's rejector set:
 *
 *   `["flatness", "straightness"]` — see `GDTCalloutParserEngine.ts` line 183-185.
 *
 * Y14.5 §3.3.5 actually permits MMC on axial straightness of a feature of size,
 * which means the base parser is over-rejecting `straightness`. That nuance is
 * a job for `FCFSyntaxValidatorEngine` (which downgrades the case to a warning
 * via its `is_feature_of_size` input). This serializer mirrors the base parser
 * faithfully — divergence between the parser's behavior and Y14.5 is reconciled
 * elsewhere.
 *
 * Symbols NOT in this list (roundness, cylindricity, others) — the base parser
 * accepts MMC on them silently, so the serializer must NOT warn about them.
 * `FCFSyntaxValidatorEngine.MMC_ON_FORM` will catch the Y14.5 violation in a
 * separate pass.
 */
const FORM_SYMBOLS_REJECTING_MODIFIER: ReadonlyArray<FCF["symbol"]> = [
  "flatness",
  "straightness",
];

class PrismGDTFCFParserEngineImpl {
  /**
   * Two-tier composite FCF parsing with structured output.
   *
   * Accepts either:
   *   - a single string with both lines separated by `\n` (newline), OR
   *   - an explicit `{primary, refinement}` object.
   *
   * **Why newline-only delimiter (not `|`):** `|` is the FCF intra-segment
   * separator in Y14.5 pipe-delimited form. The monolith JS used `|` as a
   * composite-line splitter too, which is ambiguous and produced silent
   * mis-parses on `|⌖|0.5|A|B|C|` (which is a SINGLE FCF, not a composite).
   * Newline is unambiguous.
   *
   * On a single-line input (no `\n`), parses as primary-only and leaves
   * `refinement: null` with no errors.
   */
  parseComposite(
    input: string | { primary: string; refinement: string }
  ): CompositeFCFResult {
    let primaryLine: string;
    let refinementLine: string;

    if (typeof input === "string") {
      const lines = input.split("\n");
      primaryLine = lines[0] ?? "";
      refinementLine = lines[1] ?? "";
    } else {
      primaryLine = input.primary;
      refinementLine = input.refinement;
    }

    const primary = gdtCalloutParserEngine.parse(primaryLine);
    const errors: string[] = [];
    for (const e of primary.errors) errors.push(e);

    if (!refinementLine.trim()) {
      return { primary, refinement: null, errors };
    }

    const refinement = gdtCalloutParserEngine.parse(refinementLine);
    for (const e of refinement.errors) errors.push(`REFINEMENT_${e}`);

    // Y14.5 §10 rules — skip if either tier had a hard parse failure (placeholder
    // symbol would emit spurious mismatch errors).
    if (
      !prismEnhancedGdtEngine.hasParseFailure(primary) &&
      !prismEnhancedGdtEngine.hasParseFailure(refinement)
    ) {
      if (primary.symbol !== refinement.symbol) {
        errors.push(
          `COMPOSITE_SYMBOL_MISMATCH: refinement symbol (${refinement.symbol}) must match primary (${primary.symbol})`
        );
      }
      if (refinement.tolerance_mm > primary.tolerance_mm) {
        errors.push(
          `COMPOSITE_REFINEMENT_LOOSER: refinement tolerance (${refinement.tolerance_mm}) must be <= primary (${primary.tolerance_mm})`
        );
      }
    }

    return { primary, refinement, errors };
  }

  /**
   * N-tier composite parsing per Y14.5 §10.
   *
   * Tier 0 = PLTZF; tiers 1..N = FRTZFs. Each subsequent tier must share the
   * primary's symbol, and tolerances must be monotonically non-increasing.
   *
   * Rejects empty inputs and stacks above {@link MAX_COMPOSITE_TIERS}.
   */
  parseMultiTier(callouts: string[]): MultiTierFCFResult {
    if (callouts.length === 0) {
      return { tiers: [], errors: ["MULTI_TIER_EMPTY: no callouts supplied"] };
    }
    if (callouts.length > MAX_COMPOSITE_TIERS) {
      return {
        tiers: [],
        errors: [
          `MULTI_TIER_TOO_DEEP: got ${callouts.length} tiers, max ${MAX_COMPOSITE_TIERS}`,
        ],
      };
    }

    const tiers: FCF[] = [];
    const errors: string[] = [];

    callouts.forEach((line, idx) => {
      const fcf = gdtCalloutParserEngine.parse(line);
      tiers.push(fcf);
      for (const e of fcf.errors) errors.push(`TIER_${idx}_${e}`);
    });

    const primary = tiers[0]!;
    if (!prismEnhancedGdtEngine.hasParseFailure(primary)) {
      for (let i = 1; i < tiers.length; i++) {
        const t = tiers[i]!;
        if (prismEnhancedGdtEngine.hasParseFailure(t)) continue;
        if (t.symbol !== primary.symbol) {
          errors.push(
            `TIER_${i}_SYMBOL_MISMATCH: ${t.symbol} must match primary ${primary.symbol}`
          );
        }
        const prev = tiers[i - 1]!;
        if (t.tolerance_mm > prev.tolerance_mm) {
          errors.push(
            `TIER_${i}_LOOSER_THAN_PRECEDING: tolerance ${t.tolerance_mm} > tier ${i - 1} ${prev.tolerance_mm}`
          );
        }
      }
    }

    return { tiers, errors };
  }

  /**
   * Round-trip serializer. Emits a pipe-delimited ASME Y14.5 callout
   * (`|⌖|⌀0.025|A|B(M)|C|`) that the base parser can re-parse to an equivalent FCF.
   *
   * Output preserves: symbol (canonical Unicode glyph), diameter prefix,
   * tolerance value, material modifier on the tolerance (parser-recognized form
   * `(M)`/`(L)`/`(F)` — CAM-systems convention; canonical drawing form uses a
   * standalone glyph segment but the parser accepts both), datum references
   * with per-datum modifiers.
   *
   * Output is FAITHFUL to the input — invalid Y14.5 combinations are emitted
   * verbatim. Warnings surface concerns: non-finite tolerance, unknown symbol,
   * material modifier on a form symbol that the base parser rejects.
   *
   * Tolerance precision: `toFixed(10)` then trailing-zero strip — tolerances
   * below ~5e-11 mm floor to "0" (well below the practical Y14.5 range of
   * 0.0001 mm to 1.0 mm).
   *
   * Composite refinement is NOT serialized here — use `serializeComposite`.
   */
  serialize(fcf: FCF): SerializedFCF {
    const warnings: string[] = [];

    // Symbol — fetch glyph from the single source of truth in PrismEnhancedGDTEngine.
    const glyph = prismEnhancedGdtEngine.getSymbolMetadata(fcf.symbol)?.glyph;
    let symbolSegment: string;
    if (glyph) {
      symbolSegment = glyph;
    } else {
      warnings.push(
        `SERIALIZE_UNKNOWN_SYMBOL: '${fcf.symbol}' has no metadata glyph; emitting sentinel '[?${fcf.symbol}]'`
      );
      symbolSegment = `[?${fcf.symbol}]`;
    }

    // Tolerance segment: optional Ø, value, optional FCF-level material modifier.
    let toleranceSeg = "";
    if (fcf.diameter) toleranceSeg += "⌀";

    if (!Number.isFinite(fcf.tolerance_mm)) {
      warnings.push(
        `SERIALIZE_INVALID_TOLERANCE: tolerance_mm = ${fcf.tolerance_mm} is not finite; emitting 'NaN' sentinel`
      );
      toleranceSeg += "NaN";
    } else {
      toleranceSeg += this.formatTolerance(fcf.tolerance_mm);
    }

    if (fcf.material_modifier !== "RFS") {
      // Warn when the modifier WILL be rejected by the base parser on re-parse.
      if (FORM_SYMBOLS_REJECTING_MODIFIER.includes(fcf.symbol)) {
        warnings.push(
          `SERIALIZE_INVALID_MODIFIER_ON_FORM: material_modifier '${fcf.material_modifier}' on '${fcf.symbol}' will be flagged by base parser on re-parse (Y14.5: form tolerances do not accept M/L modifiers)`
        );
      }
      toleranceSeg += DATUM_MODIFIER_GLYPH[fcf.material_modifier];
    }

    const segments: string[] = [symbolSegment, toleranceSeg];

    // Datum references — each its own segment, modifier appended in parens.
    for (const d of fcf.datums) {
      segments.push(this.formatDatum(d));
    }

    return {
      callout: "|" + segments.join("|") + "|",
      warnings,
    };
  }

  /**
   * Serializes a composite FCF as two `\n`-separated callout lines.
   *
   * Round-trips through `parseComposite(serializeComposite(result).callout)`.
   * Aggregates warnings from both serialize calls.
   *
   * **Edge case:** if `primary: null` but `refinement` is present (a degenerate
   * post-hard-fail state), emits `\n<refinement_callout>` so the data is
   * preserved (NOT silently dropped). The empty leading line round-trips
   * through `parseComposite` as a primary-only "empty callout" failure.
   */
  serializeComposite(result: CompositeFCFResult): {
    callout: string;
    warnings: string[];
  } {
    const allWarnings: string[] = [];
    let primaryLine = "";
    if (result.primary) {
      const out = this.serialize(result.primary);
      primaryLine = out.callout;
      for (const w of out.warnings) allWarnings.push(w);
    } else if (result.refinement) {
      // Surface the dropped-primary case explicitly so the caller can decide
      // whether to discard or salvage the refinement.
      allWarnings.push(
        "SERIALIZE_COMPOSITE_NULL_PRIMARY: emitting refinement only; round-trip will hard-fail on the empty primary line"
      );
    }

    if (!result.refinement) {
      return { callout: primaryLine, warnings: allWarnings };
    }

    const refOut = this.serialize(result.refinement);
    for (const w of refOut.warnings) allWarnings.push(`REFINEMENT_${w}`);
    return {
      callout: `${primaryLine}\n${refOut.callout}`,
      warnings: allWarnings,
    };
  }

  /**
   * Convenience: parse a callout via the base parser, then serialize back to
   * canonical pipe-delimited form. Useful for input normalization.
   */
  roundTrip(callout: string): RoundTripFCFResult {
    const source = gdtCalloutParserEngine.parse(callout);
    const out = this.serialize(source);
    return { callout: out.callout, source, warnings: out.warnings };
  }

  getStats(): {
    max_composite_tiers: number;
    capabilities: string[];
    reference: string;
  } {
    return {
      max_composite_tiers: MAX_COMPOSITE_TIERS,
      capabilities: [
        "parseComposite (newline-delimited 2-tier with structured output)",
        "parseMultiTier (N-tier PLTZF + FRTZFs per Y14.5 §10)",
        "serialize (round-trip pipe-delimited callout with serializer warnings)",
        "serializeComposite (2-line composite callout)",
        "roundTrip (parse → serialize convenience)",
      ],
      reference: "ASME Y14.5-2018 §10, ISO 1101:2017",
    };
  }

  // ── private helpers ───────────────────────────────────────────────────────

  /**
   * Format a tolerance as a parser-friendly decimal string.
   * `toFixed(10)` then trims trailing zeros. Tolerances below ~5e-11 collapse
   * to "0" — outside the practical Y14.5 range.
   */
  private formatTolerance(tol: number): string {
    const s = tol.toFixed(10);
    const trimmed = s.replace(/\.?0+$/, "");
    return trimmed === "" || trimmed === "-" ? "0" : trimmed;
  }

  private formatDatum(d: DatumRef): string {
    if (d.modifier && d.modifier !== "RFS") {
      return `${d.label}${DATUM_MODIFIER_GLYPH[d.modifier]}`;
    }
    return d.label;
  }
}

export const prismGdtFcfParserEngine = new PrismGDTFCFParserEngineImpl();
export type { PrismGDTFCFParserEngineImpl };
