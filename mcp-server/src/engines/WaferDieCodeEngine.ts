/**
 * WaferDieCodeEngine — ARC-MS6 / muS-C23
 *
 * Wafer die-code decoder: parses a shop wafer-die filename code such as
 * `WAFER880X334X145.MIN` into structured parametric geometry — a prefix,
 * an ordered list of dimension tokens mapped to named axes, and the file
 * extension.
 *
 * Wafer dies (thin fastener-tooling dies) are stored under a compact code
 * convention: an alphabetic family prefix, then 1..N numeric dimension
 * tokens separated by `X` (or `x`), then an optional `.EXT`.  This engine
 * reverses that code into geometry a downstream planner can consume.
 *
 * Scope note: this is the REVERSE PARSER (decode).  ARC-MS7 / muS-C60..C63
 * `WaferDieCodeEngine` adds the forward `generate()` method to THIS SAME
 * engine class — `decode()` is deliberately the first method so the
 * parametric generator extends it rather than duplicating a sibling engine.
 *
 * Unit semantics: the numeric tokens are decoded verbatim as "code units".
 * The real-world dimension depends on a shop-specific scale that this
 * engine does NOT assume — pass `unit_scale` + `unit` to get a labelled
 * scaled view; otherwise `scaled` is omitted and the raw code values stand.
 * (Fail-loud: the engine never invents a unit.)
 *
 * References:
 *   - JM Die wafer-die archive naming convention (PRISM-UNIFIED-ROADMAP-v2.md
 *     ARC-MS6 / Electrode Pipeline Intelligence).
 *   - 3-number geometry codes follow the universal length × width × height
 *     ordering (ISO/ASME drawing convention).
 */

import { z } from "zod";

// ============================================================================
// TYPES
// ============================================================================

export interface DecodedDimension {
  /** Axis label — length / width / height by default, dim4.. beyond. */
  axis: string;
  /** Numeric value exactly as it appears in the code ("code units"). */
  code_value: number;
  /** Position in the code, 1-based. */
  index: number;
}

export interface ScaledDimension {
  axis: string;
  /** code_value × unit_scale. */
  value: number;
  /** Unit label supplied by the caller. */
  unit: string;
}

export interface WaferDieCodeDecodeResult {
  /** The exact code string that was decoded (basename, path stripped). */
  code: string;
  /** Leading alphabetic family prefix (e.g. "WAFER"). */
  prefix: string;
  /** Ordered decoded dimensions in "code units". */
  dimensions: DecodedDimension[];
  /** Number of dimension tokens found. */
  dimension_count: number;
  /** File extension without the dot, or null when the code has none. */
  extension: string | null;
  /** Scaled dimensions — present only when unit_scale + unit were supplied. */
  scaled?: ScaledDimension[];
  /**
   * True when the code is structurally sound: non-empty prefix, ≥1 numeric
   * dimension, every dimension token numeric.
   */
  valid: boolean;
  notes: string[];
  warnings: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default axis labels for the first three dimensions (L×W×H convention). */
const DEFAULT_AXIS_LABELS = ["length", "width", "height"];

const MAX_CODE_LENGTH = 256; // a filename code far beyond any real shop code

// ============================================================================
// SCHEMA
// ============================================================================

const waferDieCodeInputSchema = z
  .object({
    /** The wafer-die code / filename, e.g. "WAFER880X334X145.MIN". */
    code: z.string().min(1).max(MAX_CODE_LENGTH),
    /** Multiply each code value by this to get a real dimension. */
    unit_scale: z
      .number()
      .refine(Number.isFinite, { message: "must be finite" })
      .positive()
      .optional(),
    /** Unit label for the scaled view (required reading alongside unit_scale). */
    unit: z.string().min(1).max(16).optional(),
    /** Override the default length/width/height axis labels. */
    axis_labels: z.array(z.string().min(1)).min(1).max(16).optional(),
  })
  .strict();

export type WaferDieCodeInput = z.infer<typeof waferDieCodeInputSchema>;

// ============================================================================
// ENGINE
// ============================================================================

/** Decoder for wafer die-code filenames → parametric geometry. */
export class WaferDieCodeEngine {
  /**
   * Decode a wafer-die code string into prefix + dimensions + extension.
   *
   * @param rawInput The code string + optional scale / axis-label overrides.
   * @returns Structured decode; `valid=false` (with warnings) for malformed
   *          codes — the engine never throws on a merely-malformed code,
   *          only on schema-invalid input.
   * @throws Error (engine-named) when the input object fails validation.
   */
  decode(rawInput: unknown): WaferDieCodeDecodeResult {
    const parsed = waferDieCodeInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("; ");
      throw new Error(`WaferDieCodeEngine: invalid input — ${issues}`);
    }
    const input = parsed.data;

    const notes: string[] = [];
    const warnings: string[] = [];

    // Strip any directory path — decode the basename only.
    const basename = input.code.split(/[\\/]/).pop() ?? input.code;
    if (basename !== input.code) {
      notes.push("Input contained a path — decoded the basename only.");
    }

    // Split off the extension at the LAST dot — but only when the suffix
    // contains a letter. A purely-numeric suffix (e.g. the ".5" of a
    // "14.5" decimal dimension) is a fraction, NOT a file extension.
    let stem = basename;
    let extension: string | null = null;
    const lastDot = basename.lastIndexOf(".");
    if (lastDot > 0 && lastDot < basename.length - 1) {
      const candidateExt = basename.slice(lastDot + 1);
      if (/[A-Za-z]/.test(candidateExt)) {
        stem = basename.slice(0, lastDot);
        extension = candidateExt;
      }
    }

    // Leading alphabetic run = the family prefix.
    const prefixMatch = stem.match(/^[A-Za-z]+/);
    const prefix = prefixMatch ? prefixMatch[0] : "";
    if (!prefix) {
      warnings.push("No alphabetic prefix found — code may be non-standard.");
    }

    // Everything after the prefix is the dimension string.
    const dimString = stem.slice(prefix.length);
    // Split on X / x. Filter empties from leading/trailing/double separators.
    const rawTokens = dimString.split(/[Xx]/).filter((t) => t.length > 0);

    const axisLabels = input.axis_labels ?? DEFAULT_AXIS_LABELS;
    const dimensions: DecodedDimension[] = [];
    let allNumeric = true;

    rawTokens.forEach((tok, i) => {
      const axis = axisLabels[i] ?? `dim${i + 1}`;
      // Accept integers and decimals; reject anything else.
      if (!/^[0-9]+(\.[0-9]+)?$/.test(tok)) {
        allNumeric = false;
        warnings.push(
          `Dimension token ${i + 1} ("${tok}") is not numeric — skipped.`,
        );
        return;
      }
      dimensions.push({
        axis,
        code_value: Number(tok),
        index: i + 1,
      });
    });

    if (dimensions.length === 0) {
      warnings.push("No numeric dimension tokens decoded.");
    }
    if (dimensions.length > 0 && dimensions.length !== 3) {
      notes.push(
        `${dimensions.length} dimension token(s) found — the length×width×height ` +
          "convention assumes 3; verify the axis mapping.",
      );
    }

    const valid = prefix.length > 0 && dimensions.length > 0 && allNumeric;

    // Scaled view — only when BOTH unit_scale and unit are supplied.
    let scaled: ScaledDimension[] | undefined;
    if (input.unit_scale !== undefined && input.unit !== undefined) {
      scaled = dimensions.map((d) => ({
        axis: d.axis,
        value: round4(d.code_value * input.unit_scale!),
        unit: input.unit!,
      }));
    } else if (input.unit_scale !== undefined || input.unit !== undefined) {
      notes.push(
        "unit_scale and unit must BOTH be supplied to produce a scaled view — " +
          "scaled view omitted; raw code values stand.",
      );
    }

    return {
      code: basename,
      prefix,
      dimensions,
      dimension_count: dimensions.length,
      extension,
      ...(scaled ? { scaled } : {}),
      valid,
      notes,
      warnings,
    };
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function round4(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.round(v * 10000) / 10000;
}

// ============================================================================
// SINGLETON
// ============================================================================

export const waferDieCodeEngine = new WaferDieCodeEngine();
