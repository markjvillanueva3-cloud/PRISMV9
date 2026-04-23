/**
 * PRISM Algorithm Interface Types — Standard Pattern for Physics Models
 *
 * All manufacturing physics algorithms (Kienzle, Taylor, Johnson-Cook, etc.)
 * implement this interface to ensure consistent validation, calculation, and
 * metadata across the codebase.
 *
 * S1-MS2 P1-U01: Created 2026-04-12
 *
 * @module algorithms/types
 */

import type { ISOGroup, MaterialPhysics } from "../physics/constants.js";

// ─── Base Result Types ─────────────────────────────────────────────

/**
 * AtomicValue — standard wrapper for physics calculation outputs.
 * Ensures all values carry uncertainty, units, and provenance.
 */
export interface AtomicValue<T = number> {
  /** The computed value */
  value: T;
  /** SI or common engineering unit */
  unit: string;
  /** Absolute uncertainty (same unit as value) */
  uncertainty: T extends number ? number : undefined;
  /** Relative uncertainty as fraction (e.g., 0.05 = 5%) */
  uncertainty_pct?: number;
  /** Data source or formula reference */
  source: string;
  /** Confidence level 0-1 (1 = high confidence) */
  confidence: number;
  /** Optional formula string for traceability */
  formula?: string;
  /** Warning if value is near limits or extrapolated */
  warning?: string;
}

/**
 * Individual validation issue with field, message, and severity.
 * Used by AlgorithmEngine for detailed error reporting.
 */
export interface ValidationIssue {
  /** Field that has the issue */
  field: string;
  /** Description of the issue */
  message: string;
  /** Severity level */
  severity: "error" | "warning" | "info";
}

/**
 * Validation result from Algorithm.validate()
 */
export interface ValidationResult {
  /** Whether all inputs passed validation */
  valid: boolean;
  /** List of validation errors if any */
  errors: string[];
  /** List of validation warnings (non-blocking) */
  warnings: string[];
  /** Structured issues for AlgorithmEngine compatibility */
  issues: ValidationIssue[];
  /** Corrected/clamped input values if any were out of range */
  corrected?: Record<string, unknown>;
}

/**
 * Output type with warnings array (for AlgorithmEngine compatibility)
 */
export interface WithWarnings {
  /** Warnings generated during calculation */
  warnings: string[];
}

/**
 * Safety score from physics validation (S(x) in PRISM nomenclature)
 */
export interface SafetyScore {
  /** Overall safety score 0-1 (>= 0.70 required for safety-critical) */
  score: number;
  /** Component scores for transparency */
  components: {
    /** Physics validity (formula applicability) */
    physics: number;
    /** Input range validity */
    range: number;
    /** Material appropriateness */
    material: number;
    /** Process parameter sanity */
    process: number;
  };
  /** Whether this passes the safety threshold */
  passes: boolean;
  /** Safety threshold used (default 0.70) */
  threshold: number;
}

// ─── Algorithm Metadata ────────────────────────────────────────────

/**
 * Reference to published literature backing the algorithm
 */
export interface LiteratureReference {
  /** Author(s) */
  authors: string;
  /** Publication title */
  title: string;
  /** Journal/book/conference */
  publication: string;
  /** Year published */
  year: number;
  /** Page numbers or equation reference */
  pages?: string;
  /** DOI or ISBN if available */
  doi?: string;
}

/**
 * Algorithm metadata — describes the model, its domain, and limitations
 */
export interface AlgorithmMeta {
  /** Unique algorithm identifier (e.g., "kienzle_force") */
  id: string;
  /** Human-readable name */
  name: string;
  /** Algorithm version (semver) */
  version: string;
  /** Domain: physics, thermal, surface, stability, etc. */
  domain: "physics" | "thermal" | "surface" | "stability" | "constitutive" | "toolpath";
  /** Category within domain */
  category: string;
  /** Brief description */
  description: string;
  /** Primary equation in plain text */
  equation_plain: string;
  /** Primary equation in LaTeX */
  equation_latex?: string;
  /** Published references */
  references: LiteratureReference[];
  /** Known assumptions */
  assumptions: string[];
  /** Known limitations */
  limitations: string[];
  /** Valid input ranges */
  valid_ranges: Record<string, { min: number; max: number; unit: string }>;
  /** ISO material groups this algorithm applies to (empty = all) */
  applicable_materials: ISOGroup[];
  /** When this algorithm was last validated */
  last_validated: string;
  /** Validation score from last audit */
  validation_score?: number;
}

// ─── Algorithm Interface ───────────────────────────────────────────

/**
 * Base interface for algorithm inputs.
 * Concrete algorithms extend this with specific fields.
 */
export interface AlgorithmInput {
  /** Material ID or full material physics data */
  material?: string | MaterialPhysics;
  /** Optional ISO group override */
  iso_group?: ISOGroup;
}

/**
 * Base interface for algorithm outputs.
 * Concrete algorithms extend this with specific computed values.
 */
export interface AlgorithmOutput {
  /** Safety score for this calculation */
  safety: SafetyScore;
  /** Computation timestamp (ISO 8601) */
  computed_at: string;
  /** Algorithm version used */
  algorithm_version: string;
  /** Warnings generated during calculation */
  warnings: string[];
}

/**
 * Generic algorithm interface — all PRISM physics models implement this.
 *
 * @template I Input type extending AlgorithmInput
 * @template O Output type extending AlgorithmOutput
 */
export interface Algorithm<I extends AlgorithmInput, O extends AlgorithmOutput> {
  /**
   * Validate inputs before calculation.
   * Returns validation result with errors/warnings.
   * Does NOT throw — check result.valid instead.
   *
   * @param input Algorithm-specific input
   * @returns Validation result
   */
  validate(input: I): ValidationResult;

  /**
   * Perform the calculation.
   * MUST call validate() first — throws if inputs are invalid.
   *
   * @param input Validated algorithm input
   * @returns Algorithm-specific output with safety score
   * @throws Error if validate() was not called or inputs are invalid
   */
  calculate(input: I): O;

  /**
   * Get algorithm metadata including references and limitations.
   *
   * @returns Algorithm metadata
   */
  getMetadata(): AlgorithmMeta;
}

// ─── Common Input/Output Extensions ────────────────────────────────

/**
 * Cutting parameters common to many algorithms
 */
export interface CuttingParameters {
  /** Cutting speed [m/min] */
  Vc_m_min: number;
  /** Feed per tooth or feed per revolution [mm] */
  fz_mm?: number;
  /** Feed per revolution [mm/rev] */
  f_mm_rev?: number;
  /** Axial depth of cut [mm] */
  ap_mm: number;
  /** Radial depth of cut [mm] (for milling) */
  ae_mm?: number;
}

/**
 * Tool geometry common to many algorithms
 */
export interface ToolGeometry {
  /** Tool diameter [mm] */
  diameter_mm: number;
  /** Number of flutes/teeth */
  flutes: number;
  /** Helix angle [degrees] */
  helix_deg?: number;
  /** Rake angle [degrees] */
  rake_deg?: number;
  /** Tool nose radius [mm] */
  nose_radius_mm?: number;
  /** Tool stickout/overhang [mm] */
  stickout_mm?: number;
}

/**
 * Machine parameters for power/stability calculations
 */
export interface MachineParameters {
  /** Spindle power [kW] */
  spindle_power_kW: number;
  /** Max spindle speed [RPM] */
  max_rpm: number;
  /** Machine damping ratio (dimensionless) */
  damping_ratio?: number;
  /** Natural frequency [Hz] */
  natural_freq_Hz?: number;
}

// ─── Helper Functions ──────────────────────────────────────────────

/**
 * Create an AtomicValue with computed uncertainty
 *
 * @param value The computed value
 * @param unit The unit of measurement
 * @param uncertainty_pct Relative uncertainty as percentage (e.g., 5 for 5%)
 * @param source Source reference
 * @param confidence Confidence level 0-1
 * @param formula Optional formula string
 * @returns Properly structured AtomicValue
 */
export function createAtomicValue(
  value: number,
  unit: string,
  uncertainty_pct: number,
  source: string,
  confidence: number = 0.95,
  formula?: string
): AtomicValue<number> {
  return {
    value,
    unit,
    uncertainty: Math.abs(value * uncertainty_pct / 100),
    uncertainty_pct: uncertainty_pct / 100,
    source,
    confidence,
    formula,
  };
}

/**
 * Compute safety score from component scores
 *
 * @param physics Physics validity score 0-1
 * @param range Input range validity score 0-1
 * @param material Material appropriateness score 0-1
 * @param process Process parameter sanity score 0-1
 * @param threshold Safety threshold (default 0.70)
 * @returns SafetyScore object
 */
export function computeSafetyScore(
  physics: number,
  range: number,
  material: number,
  process: number,
  threshold: number = 0.70
): SafetyScore {
  // Weighted average: physics and material are most critical
  const score = 0.35 * physics + 0.25 * range + 0.25 * material + 0.15 * process;
  return {
    score,
    components: { physics, range, material, process },
    passes: score >= threshold,
    threshold,
  };
}

/**
 * Create a validation result helper
 */
export function createValidationResult(
  errors: string[] = [],
  warnings: string[] = [],
  corrected?: Record<string, unknown>
): ValidationResult {
  // Build issues array from errors and warnings for AlgorithmEngine compatibility
  const issues: ValidationIssue[] = [
    ...errors.map(msg => ({ field: "input", message: msg, severity: "error" as const })),
    ...warnings.map(msg => ({ field: "input", message: msg, severity: "warning" as const })),
  ];

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    issues,
    corrected,
  };
}
