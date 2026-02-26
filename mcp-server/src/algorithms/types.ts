/**
 * PRISM Algorithm Interface Types
 *
 * Standard interface pattern for all standalone manufacturing physics algorithms.
 * Each algorithm implements Algorithm<I, O> with typed input/output,
 * validation, calculation, and metadata.
 *
 * Design rationale:
 * - Pure functions: no side effects, no registry lookups inside calculate()
 * - Caller resolves material/tool data from registries, passes as typed input
 * - validate() runs before calculate() — returns errors, never throws
 * - getMetadata() describes the model for documentation and traceability
 *
 * @module algorithms/types
 */

// ── Validation ──────────────────────────────────────────────────────

/** A single validation issue found in algorithm input. */
export interface ValidationIssue {
  /** Which input field has the problem. */
  field: string;
  /** What's wrong. */
  message: string;
  /** Severity: "error" blocks calculation, "warning" allows with caution. */
  severity: "error" | "warning";
}

/** Result of input validation. */
export interface ValidationResult {
  /** True if no errors (warnings are OK). */
  valid: boolean;
  /** All issues found. */
  issues: ValidationIssue[];
}

// ── Metadata ────────────────────────────────────────────────────────

/** Describes a model's identity and provenance. */
export interface AlgorithmMeta {
  /** Unique algorithm ID, e.g. "kienzle", "taylor", "johnson-cook". */
  id: string;
  /** Human-readable name. */
  name: string;
  /** One-line description. */
  description: string;
  /** The core formula in text form, e.g. "Fc = kc1.1 × b × h^(1-mc)". */
  formula: string;
  /** Academic/industry reference. */
  reference: string;
  /** Safety classification. */
  safety_class: "critical" | "standard" | "informational";
  /** Which physical domain. */
  domain: "force" | "tool_life" | "material" | "surface" | "stability" | "thermal" | "power" | "geometry";
  /** Input field names and units. */
  inputs: Record<string, string>;
  /** Output field names and units. */
  outputs: Record<string, string>;
}

// ── Core Algorithm Interface ────────────────────────────────────────

/**
 * Standard algorithm interface. All 8 ported algorithms implement this.
 *
 * Usage:
 * ```ts
 * const algo = new KienzleForceModel();
 * const validation = algo.validate(input);
 * if (!validation.valid) throw new Error(validation.issues[0].message);
 * const result = algo.calculate(input);
 * ```
 *
 * @typeParam I - Typed input (e.g. KienzleInput)
 * @typeParam O - Typed output (e.g. KienzleOutput)
 */
export interface Algorithm<I, O> {
  /** Validate input fields. Returns issues; never throws. */
  validate(input: I): ValidationResult;

  /** Run the calculation. Caller must validate() first. */
  calculate(input: I): O;

  /** Return model metadata for documentation and traceability. */
  getMetadata(): AlgorithmMeta;
}

// ── Shared Helper Types ─────────────────────────────────────────────

/** Common warning accumulator used across algorithm outputs. */
export interface WithWarnings {
  warnings: string[];
}

/** Uncertainty band for a computed value. */
export interface UncertaintyBand {
  nominal: number;
  low: number;
  high: number;
  confidence: number;
  source: string;
}
