/**
 * UnitOfMeasureDisambiguationEngine — CAD-COMPLETE-MS0 / U-AI-03
 * ===============================================================
 *
 * Resolves dimensional values — explicit ("0.5\"", "12.7 mm") OR implicit
 * (a bare number "0.5") — to a canonical unit (millimetres) for the CAD
 * agent. The agent receives free-text dimensions from voice, blueprints,
 * and chat; a wrong mm/inch guess scraps parts, so this engine NEVER
 * silently guesses: an implicit value with no usable context returns a
 * low-confidence best-guess flagged `clarificationNeeded`.
 *
 * Disambiguation strategy (in priority order):
 *   1. Explicit unit token in the input        → confidence 0.98
 *   2. Document default unit from context      → confidence 0.85
 *   3. Consistency with prior resolved values  → confidence 0.70
 *   4. Magnitude heuristic (shop conventions)  → confidence 0.45–0.55, ambiguous
 *
 * @module engines/UnitOfMeasureDisambiguationEngine
 * @version 1.0.0
 */

/** Exact unit definitions (international inch, 1959 — definitional, not measured). */
const MM_PER_INCH = 25.4;
const MM_PER_FOOT = 304.8; // 12 × 25.4
const MM_PER_THOU = 0.0254; // 1 thou = 0.001 in
const MM_PER_CM = 10;
const MM_PER_M = 1000;

/** Confidence ceilings for the last-resort magnitude heuristic. All are < 0.5
 *  so that a consumer thresholding on confidence alone (not just the
 *  `ambiguous` flag) still rejects an explicitly-ambiguous unit guess. */
const HEURISTIC_CONFIDENCE = { highDecimals: 0.49, subUnit: 0.42, coarse: 0.45 } as const;

export type UnitSystem = "metric" | "imperial";
export type CanonicalUnit = "mm" | "in";
/** Unit tokens this engine recognises in raw input. */
export type UnitToken = "mm" | "cm" | "m" | "in" | "ft" | "thou";

/** Context that disambiguates an implicit (unit-less) value. */
export interface UoMContext {
  /** Declared default unit system of the drawing / CAD document. */
  documentUnit?: UnitSystem;
  /** Unit system of values already resolved this session — drives consistency inference. */
  priorUnitSystem?: UnitSystem;
}

/** Outcome of resolving one dimensional value. */
export interface UoMResolution {
  rawInput: string;
  /** Parsed numeric magnitude, in the detected unit (not yet mm). null if unparseable. */
  parsedValue: number | null;
  /** Canonical value in millimetres. null if unparseable. */
  valueMm: number | null;
  detectedUnit: CanonicalUnit | null;
  unitSystem: UnitSystem | null;
  /** How the unit was determined. */
  basis: "explicit" | "document-default" | "prior-consistency" | "magnitude-heuristic" | "unparseable";
  /** 0..1 — drops sharply when the unit had to be inferred. */
  confidence: number;
  ambiguous: boolean;
  clarificationNeeded: boolean;
  suggestedClarification?: string;
  reasoning: string[];
}

/** Per-token → canonical-unit + mm-factor table. Longest tokens first so "mm" beats "m". */
const UNIT_TOKENS: ReadonlyArray<{ rx: RegExp; unit: UnitToken; mmFactor: number; system: UnitSystem }> = [
  { rx: /^(?:millimet(?:re|er)s?|mm)$/i, unit: "mm", mmFactor: 1, system: "metric" },
  { rx: /^(?:centimet(?:re|er)s?|cm)$/i, unit: "cm", mmFactor: MM_PER_CM, system: "metric" },
  { rx: /^(?:met(?:re|er)s?|m)$/i, unit: "m", mmFactor: MM_PER_M, system: "metric" },
  { rx: /^(?:inch(?:es)?|in|″|”|")$/i, unit: "in", mmFactor: MM_PER_INCH, system: "imperial" },
  { rx: /^(?:feet|foot|ft|′|’|')$/i, unit: "ft", mmFactor: MM_PER_FOOT, system: "imperial" },
  { rx: /^(?:thou|mil|mils|thousandths?)$/i, unit: "thou", mmFactor: MM_PER_THOU, system: "imperial" },
];

export class UnitOfMeasureDisambiguationEngine {
  /** Resolve one dimensional value to canonical millimetres. */
  resolve(input: string | number, ctx: UoMContext = {}): UoMResolution {
    const raw = typeof input === "number" ? String(input) : String(input ?? "").trim();
    const reasoning: string[] = [];

    const parsed = this.parseToken(raw);
    if (parsed === null) {
      return {
        rawInput: raw,
        parsedValue: null,
        valueMm: null,
        detectedUnit: null,
        unitSystem: null,
        basis: "unparseable",
        confidence: 0,
        ambiguous: true,
        clarificationNeeded: true,
        suggestedClarification: `Could not read a dimensional value from "${raw}". Please supply a number with a unit (e.g. "12.7 mm" or "0.5 in").`,
        reasoning: [`Input "${raw}" contained no parseable numeric magnitude.`],
      };
    }

    // Surface input traits that could silently distort the magnitude.
    if (raw.includes(",")) {
      reasoning.push(
        "Input contained a comma — read as a decimal separator; if it was a thousands separator the magnitude is 1000× off.",
      );
    }
    if (parsed.value < 0) {
      reasoning.push("Value is negative — unusual for a machined dimension; verify the input.");
    }

    // --- 1. Explicit unit token wins outright ---
    if (parsed.token) {
      const spec = UNIT_TOKENS.find((t) => t.unit === parsed.token)!;
      const valueMm = parsed.value * spec.mmFactor;
      reasoning.push(`Explicit unit token "${parsed.token}" detected → ${spec.system}.`);
      reasoning.push(`${parsed.value} ${parsed.token} × ${spec.mmFactor} = ${this.round(valueMm)} mm.`);
      return {
        rawInput: raw,
        parsedValue: parsed.value,
        valueMm: this.round(valueMm),
        detectedUnit: spec.system === "metric" ? "mm" : "in",
        unitSystem: spec.system,
        basis: "explicit",
        confidence: 0.98,
        ambiguous: false,
        clarificationNeeded: false,
        reasoning,
      };
    }

    // --- Implicit: no unit token in the input ---
    reasoning.push(`Input "${raw}" has no explicit unit — disambiguating from context.`);

    // 2. Document default unit.
    if (ctx.documentUnit) {
      const sys = ctx.documentUnit;
      const valueMm = sys === "metric" ? parsed.value : parsed.value * MM_PER_INCH;
      reasoning.push(`Document default unit is ${sys} → interpreting ${parsed.value} as ${sys === "metric" ? "mm" : "in"}.`);
      return this.implicit(raw, parsed.value, sys, valueMm, "document-default", 0.85, false, reasoning);
    }

    // 3. Consistency with prior resolved values.
    if (ctx.priorUnitSystem) {
      const sys = ctx.priorUnitSystem;
      const valueMm = sys === "metric" ? parsed.value : parsed.value * MM_PER_INCH;
      reasoning.push(`No document default; prior values this session were ${sys} → staying consistent.`);
      return this.implicit(raw, parsed.value, sys, valueMm, "prior-consistency", 0.7, false, reasoning);
    }

    // 4. Magnitude heuristic — last resort, always ambiguous.
    const guess = this.magnitudeHeuristic(parsed.value, parsed.rawDecimals);
    reasoning.push(guess.reason);
    const valueMm = guess.system === "metric" ? parsed.value : parsed.value * MM_PER_INCH;
    return this.implicit(
      raw,
      parsed.value,
      guess.system,
      valueMm,
      "magnitude-heuristic",
      guess.confidence,
      true,
      reasoning,
      `"${raw}" has no unit. Best guess: ${guess.system} (${this.round(valueMm)} mm) — please confirm mm vs inch.`,
    );
  }

  /** Resolve a batch; later values inherit the unit system inferred for earlier ones. */
  resolveBatch(inputs: Array<string | number>, ctx: UoMContext = {}): UoMResolution[] {
    const out: UoMResolution[] = [];
    let runningSystem: UnitSystem | undefined = ctx.priorUnitSystem;
    for (const input of inputs) {
      const r = this.resolve(input, { ...ctx, priorUnitSystem: runningSystem });
      out.push(r);
      // A high-confidence (explicit / document) result anchors the system for the rest.
      if (r.unitSystem && (r.basis === "explicit" || r.basis === "document-default")) {
        runningSystem = r.unitSystem;
      } else if (r.unitSystem && !runningSystem) {
        runningSystem = r.unitSystem;
      }
    }
    return out;
  }

  /** Explicit numeric conversion between mm and inch. */
  convert(value: number, from: CanonicalUnit, to: CanonicalUnit): number {
    if (!Number.isFinite(value)) throw new Error("convert: value must be finite");
    if (from === to) return this.round(value);
    const mm = from === "mm" ? value : value * MM_PER_INCH;
    return this.round(to === "mm" ? mm : mm / MM_PER_INCH);
  }

  /**
   * Parse a raw string into { value, token }. Handles signed decimals,
   * simple fractions ("1/2"), unicode prime marks, and trailing unit words.
   * Returns null when no numeric magnitude is present.
   */
  parseToken(raw: string): { value: number; token: UnitToken | null; rawDecimals: number } | null {
    if (raw.length === 0) return null;
    // Normalise comma decimal separator and collapse internal whitespace.
    let s = raw.replace(/,(\d)/g, ".$1").trim();

    // Detect a trailing unit token (everything after the numeric part).
    let token: UnitToken | null = null;
    const unitMatch = s.match(/[a-zA-Z″”′’"']+\s*$/);
    if (unitMatch) {
      const tail = unitMatch[0].trim();
      const spec = UNIT_TOKENS.find((t) => t.rx.test(tail));
      if (spec) {
        token = spec.unit;
        s = s.slice(0, s.length - unitMatch[0].length).trim();
      } else {
        // Trailing letters that are not a known unit → unparseable rather than mis-guess.
        return null;
      }
    }

    // Fraction form: "1/2", "-3 / 8".
    const frac = s.match(/^([+-]?\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
    if (frac) {
      const num = Number(frac[1]);
      const den = Number(frac[2]);
      if (den === 0 || !Number.isFinite(num) || !Number.isFinite(den)) return null;
      return { value: num / den, token, rawDecimals: 0 };
    }

    // Mixed number: "1 1/2".
    const mixed = s.match(/^([+-]?\d+)\s+(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
    if (mixed) {
      const whole = Number(mixed[1]);
      const num = Number(mixed[2]);
      const den = Number(mixed[3]);
      if (den === 0) return null;
      const fracPart = num / den;
      return { value: whole < 0 ? whole - fracPart : whole + fracPart, token, rawDecimals: 0 };
    }

    // Plain (possibly scientific-notation) decimal.
    if (/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(s)) {
      const v = Number(s);
      if (Number.isFinite(v)) {
        // Decimal count from the RAW string — a parsed float drops trailing
        // zeros ("1.250" → 1.25), losing the thou-precision signal.
        const mantissa = s.replace(/[eE].*$/, "");
        const dot = mantissa.indexOf(".");
        const rawDecimals = dot < 0 ? 0 : mantissa.length - dot - 1;
        return { value: v, token, rawDecimals };
      }
    }
    return null;
  }

  // --- internal helpers ---

  private implicit(
    raw: string,
    parsedValue: number,
    system: UnitSystem,
    valueMm: number,
    basis: UoMResolution["basis"],
    confidence: number,
    ambiguous: boolean,
    reasoning: string[],
    clarification?: string,
  ): UoMResolution {
    return {
      rawInput: raw,
      parsedValue,
      valueMm: this.round(valueMm),
      detectedUnit: system === "metric" ? "mm" : "in",
      unitSystem: system,
      basis,
      confidence,
      ambiguous,
      clarificationNeeded: ambiguous,
      suggestedClarification: clarification,
      reasoning,
    };
  }

  /**
   * Last-resort heuristic for a bare number with zero context. Shop
   * conventions: imperial machinists carry ≥3 decimal places (thou-level
   * "0.005", "1.250"); plain whole / 1-decimal numbers skew metric. The
   * result is always flagged ambiguous — this only picks a best guess.
   */
  private magnitudeHeuristic(
    value: number,
    decimals: number,
  ): { system: UnitSystem; confidence: number; reason: string } {
    const abs = Math.abs(value);
    if (decimals >= 3) {
      return {
        system: "imperial",
        confidence: HEURISTIC_CONFIDENCE.highDecimals,
        reason: `Value carries ${decimals} decimal places — thou-level precision skews imperial (ambiguous).`,
      };
    }
    if (abs > 0 && abs < 1 && decimals <= 2) {
      return {
        system: "imperial",
        confidence: HEURISTIC_CONFIDENCE.subUnit,
        reason: `Sub-1 value "${value}" with ≤2 decimals is plausibly a fractional inch (ambiguous).`,
      };
    }
    return {
      system: "metric",
      confidence: HEURISTIC_CONFIDENCE.coarse,
      reason: `Whole / coarse value "${value}" weakly skews metric (ambiguous — confirm).`,
    };
  }

  /** Round to 6 decimals to kill binary-float noise without losing thou precision. */
  private round(n: number): number {
    return Math.round(n * 1e6) / 1e6;
  }
}

export const unitOfMeasureDisambiguationEngine = new UnitOfMeasureDisambiguationEngine();
