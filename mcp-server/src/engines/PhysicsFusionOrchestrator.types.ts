/**
 * PhysicsFusionOrchestrator — Type Definitions
 *
 * Foundation types for the Physics Fusion system. Every downstream
 * computation depends on these interfaces. 24 plugins implement
 * PhysicsPlugin; the registry topologically sorts them; the convergence
 * engine iterates the nested FTW/FES/FDT loops.
 *
 * INTERFACE FREEZE GATE: This file is LOCKED after session 0-D-FUSION-2
 * starts. Any change after that requires mandatory impact analysis on
 * all 8 downstream fusion sessions.
 *
 * References:
 *   - Altintas (2012) "Manufacturing Automation" — force/stability/thermal models
 *   - Kienzle (1952) — specific cutting force
 *   - Taylor (1907) — tool life
 *   - Loewen & Shaw (1954) — cutting temperature
 *   - Tlusty & Polacek (1963) — stability lobes
 *
 * @module engines/PhysicsFusionOrchestrator.types
 * @see PhysicsPluginRegistry — registers plugins, topological sort, tier filtering
 * @see PhysicsFusionConvergenceEngine — nested FTW/FES/FDT iteration (FUSION-2)
 * @see PhysicsFusionOrchestratorEngine — tier routing, Jacobian, cache (FUSION-3)
 */

import type { ISOGroup } from "../physics/constants.js";

// ============================================================================
// FUSION TIER
// ============================================================================

/**
 * Fusion computation tier — determines which plugins run and how.
 *
 * Tier 1: Single-pass. Kienzle force + surface finish. No iteration.
 *         Fastest, for quick estimates and novice users.
 * Tier 2: Full plugin chain with convergence (FTW+FES+FDT loops).
 *         Standard for production recommendations.
 * Tier 3: Tier 2 + Anderson acceleration + Monte Carlo uncertainty.
 *         For critical operations requiring confidence intervals.
 * Tier 4: Tier 3 + per-block Jacobian variability + adaptive mesh.
 *         For per-line G-code optimization with converged physics.
 */
export type FusionTier = 1 | 2 | 3 | 4;

// ============================================================================
// PLUGIN LEVEL
// ============================================================================

/**
 * Physics computation level — determines execution ordering.
 * Lower levels execute first; higher levels depend on lower ones.
 *
 * L1: Force models (Kienzle, engagement-corrected)
 * L2: Thermal models (cutting temperature, heat partition)
 * L3: Wear models (Taylor life, Usui coupled wear)
 * L4: Deflection models (tool, workpiece, thermal growth) — also caches stiffness k=3EI/L^3
 * L5: Stability models (chatter lobes, forced vibration) — uses stiffness from L4 for G(jw)
 * L6: Surface models (finish prediction, residual stress)
 * L7: Economic models (cost optimization, tool change scheduling)
 * L8: Safety models (collision, force limits, thermal damage)
 */
export type PluginLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

// ============================================================================
// PLUGIN DESCRIPTOR
// ============================================================================

/**
 * Static metadata describing a physics plugin. Registered once at startup.
 * The registry uses this for topological sorting and tier filtering.
 */
export interface PhysicsPluginDescriptor {
  /** Unique plugin identifier (e.g. "kienzle_force", "cutting_temperature") */
  id: string;

  /** Human-readable name (e.g. "Kienzle Force Model") */
  name: string;

  /** Computation level — determines coarse execution order */
  level: PluginLevel;

  /** Minimum fusion tier required for this plugin to execute */
  min_tier: FusionTier;

  /**
   * Feed-forward dependencies: plugin IDs that MUST execute before this one.
   * Used by topological sort for execution ordering.
   * MUST NOT overlap with feedback_from — an edge cannot be both acyclic and cyclic.
   * Example: ["kienzle_force"] — needs force before computing temperature.
   */
  depends_on: string[];

  /**
   * Feedback dependencies: plugin IDs whose outputs this plugin reads
   * during convergence iterations. NOT used for topological sort —
   * these create cycles that the convergence engine resolves iteratively.
   * MUST NOT overlap with depends_on for the same plugin.
   * Example: ["cutting_temperature"] — wear rate depends on temperature,
   * but temperature also depends on force which depends on wear.
   */
  feedback_from: string[];

  /**
   * Which convergence loop this plugin participates in.
   * Used by the convergence engine to partition plugins into nested loops.
   * Omit for plugins outside any feedback loop (single-pass only).
   */
  loop?: "FTW" | "FES" | "FDT";

  /**
   * Output keys this plugin produces in FusionState.values.
   * Used by the registry to verify dependency satisfaction.
   * Example: ["Fc_N", "Ff_N", "Fp_N", "torque_Nm", "power_kW"]
   */
  outputs: string[];

  /**
   * Confidence penalty (0.0–1.0) applied to overall_confidence
   * when this plugin is skipped due to missing inputs or tier filtering.
   * Higher penalty = more critical plugin.
   * Example: 0.30 for Kienzle force (critical), 0.08 for surface finish.
   */
  skip_penalty: number;

  /** Optional description of what this plugin computes. */
  description?: string;
}

// ============================================================================
// PLUGIN CONTEXT & OUTPUT
// ============================================================================

/**
 * Context passed to a plugin's compute() method.
 * Contains the accumulated FusionState plus resolved input data.
 */
export interface PluginContext {
  /** Current accumulated physics state from prior plugins */
  state: FusionState;

  /** Current fusion tier (determines detail level) */
  tier: FusionTier;

  /** Current convergence iteration index (0 on first pass) */
  iteration: number;

  /** ISO material group for the workpiece */
  iso_group: ISOGroup;

  /** Relaxation factor alpha for this iteration (0 < alpha <= 1) */
  alpha: number;

  /**
   * Raw input parameters from the orchestrator.
   * Contains everything from OrchestratorInput plus resolved values.
   * Plugins read what they need; type assertion is the plugin's responsibility.
   */
  params: Record<string, unknown>;
}

/**
 * Output from a single plugin execution.
 * Values are merged into FusionState.values after each plugin runs.
 */
export interface PluginOutput {
  /** Key-value pairs of computed quantities. Keys must match descriptor.outputs. */
  values: Record<string, number>;

  /** Confidence in this plugin's output (0.0–1.0) */
  confidence: number;

  /** Formulas used (for traceability) */
  formulas_used?: string[];

  /** Warnings generated during computation */
  warnings?: string[];

  /**
   * Whether this plugin's outputs changed significantly from the
   * previous iteration. Used by convergence engine to assess convergence.
   * If undefined, the convergence engine computes this from value deltas.
   */
  converged?: boolean;
}

// ============================================================================
// PHYSICS PLUGIN INTERFACE
// ============================================================================

/**
 * The core plugin contract. Each of the 24 physics plugins implements this.
 *
 * Lifecycle:
 *   1. Registry calls canRun() to check if inputs are available
 *   2. If canRun() -> true, orchestrator calls compute()
 *   3. PluginOutput.values are merged into FusionState
 *   4. On subsequent convergence iterations, compute() is called again
 *      with updated FusionState (feedback loop values change)
 */
export interface PhysicsPlugin {
  /** Static descriptor — registered once at plugin creation */
  readonly descriptor: PhysicsPluginDescriptor;

  /**
   * Check if this plugin can execute given the current state.
   * Returns false if required inputs are missing (graceful degradation).
   */
  canRun(ctx: PluginContext): boolean;

  /**
   * Execute the physics computation.
   *
   * MUST be deterministic for a given (ctx.state, ctx.params) pair —
   * the convergence engine assumes repeatable results for the same inputs.
   * Stochastic behavior (Monte Carlo) belongs in a separate Tier 3+ wrapper.
   */
  compute(ctx: PluginContext): PluginOutput;
}

// ============================================================================
// FUSION STATE
// ============================================================================

/**
 * Accumulated physics state flowing through the plugin chain.
 * Each plugin reads from and writes to this shared state.
 *
 * The convergence engine creates a fresh FusionState for each
 * convergence attempt and feeds it through the plugin chain repeatedly
 * until all feedback loops converge.
 */
export interface FusionState {
  /** Accumulated physics values. Keys are plugin output names. */
  values: Record<string, number>;

  /** Per-plugin confidence scores. Key = plugin ID. */
  plugin_confidence: Record<string, number>;

  /** Plugins that were skipped (canRun -> false or tier filtering). */
  skipped_plugins: SkippedPlugin[];

  /** Formulas used across all plugins (for traceability). */
  formulas_used: string[];

  /** Warnings accumulated across all plugins. */
  warnings: string[];

  /** Plugin execution order as actually executed. */
  execution_order: string[];
}

/**
 * Record of a skipped plugin for traceability and confidence scoring.
 */
export interface SkippedPlugin {
  plugin_id: string;
  reason: "missing_inputs" | "below_tier" | "canRun_false" | "error";
  penalty: number;
  /** Missing input keys (if reason is missing_inputs) */
  missing_inputs?: string[];
}

// ============================================================================
// CONVERGENCE CONFIGURATION
// ============================================================================

/**
 * Configuration for the nested convergence loops (FTW/FES/FDT).
 * Material-specific defaults provided; can be overridden per-call.
 *
 * Three nested loops:
 *   FDT (outermost): Force-Deflection-Tolerance — 2x2 Jacobian
 *   FES (middle):    Force-Engagement-Stability  — 2x2 Jacobian
 *   FTW (innermost): Force-Temperature-Wear      — 3x3 Jacobian
 *
 * Spectral radius computed PER-LOOP, each loop gets its own alpha:
 *   alpha_FTW = min(max_alpha, 0.8 / rho_FTW)
 *   alpha_FES = min(max_alpha, 0.8 / rho_FES)
 *   alpha_FDT = min(max_alpha, 0.8 / rho_FDT)
 *
 * Worst-case iteration budget: 15 * 12 * 20 = 3,600 convergence passes.
 * With 24 plugins: up to 86,400 plugin evaluations. Performance-critical.
 */
export interface ConvergenceConfig {
  /** Maximum outer (FDT) loop iterations */
  max_fdt_iterations: number;
  /** Maximum middle (FES) loop iterations */
  max_fes_iterations: number;
  /** Maximum inner (FTW) loop iterations */
  max_ftw_iterations: number;

  /**
   * Initial relaxation factor alpha (0 < alpha <= 1).
   * Material-specific defaults:
   *   ISO N (aluminum): 0.85
   *   ISO P (steel), K (cast iron): 0.70
   *   ISO M (stainless): 0.50
   *   ISO H (hardened): 0.25
   *   ISO S (superalloys): 0.20
   */
  initial_alpha: number;

  /** Maximum allowed alpha (caps spectral-radius-based alpha) */
  max_alpha: number;

  /**
   * Relative convergence tolerance per variable.
   * |x_new - x_old| / max(|x_old|, epsilon) < tol -> converged.
   */
  tolerance: number;

  /** Epsilon floor for relative convergence denominator */
  epsilon: number;

  /**
   * Per-loop tolerance overrides. If provided, these override `tolerance`
   * for the specific loop. Useful because temperature uncertainty (~10-20%)
   * is much higher than deflection precision (micron-level).
   */
  tolerance_ftw?: number;
  tolerance_fes?: number;
  tolerance_fdt?: number;

  /**
   * Number of recent residuals for oscillation detection.
   * Must be >= 4 for windowed spectral analysis.
   */
  oscillation_window: number;

  /**
   * Oscillation frequency threshold (0-0.5, normalized).
   * If dominant frequency in last `oscillation_window` residuals exceeds
   * this threshold, oscillation is detected and alpha is halved.
   * Default: 0.25 (Nyquist-relative, detects period-2 and period-4 patterns).
   */
  oscillation_frequency_threshold: number;

  /** Divergence factor: residual > best * factor -> divergence handling */
  divergence_factor: number;

  /** Degenerate guard: ae/ap < threshold * initial -> "degenerate" status */
  degenerate_threshold: number;

  /** Anderson acceleration depth for Tier 3+ (typically m=3) */
  anderson_m: number;

  /**
   * Stall count for Anderson -> Broyden fallback.
   * If residual doesn't decrease for this many iterations,
   * switch from Anderson to Broyden quasi-Newton.
   */
  anderson_stall_count: number;
}

/**
 * Material-specific default convergence parameters.
 * Empirical: stronger thermal-wear coupling -> lower initial alpha.
 */
export const DEFAULT_CONVERGENCE: Record<ISOGroup, Partial<ConvergenceConfig>> = {
  P: { initial_alpha: 0.70 },   // Steel — moderate coupling
  M: { initial_alpha: 0.50 },   // Stainless — strong work hardening
  K: { initial_alpha: 0.70 },   // Cast iron — weak thermal feedback
  N: { initial_alpha: 0.85 },   // Aluminum — weak coupling, fast convergence
  S: { initial_alpha: 0.20 },   // Superalloys — very strong thermal-wear coupling
  H: { initial_alpha: 0.25 },   // Hardened steel — strong force-wear coupling
};

/** Full default convergence config (merged with material-specific overrides) */
export const BASE_CONVERGENCE_CONFIG: ConvergenceConfig = {
  max_fdt_iterations: 15,
  max_fes_iterations: 12,
  max_ftw_iterations: 20,
  initial_alpha: 0.70,
  max_alpha: 0.90,
  tolerance: 1e-3,
  epsilon: 1e-12,
  oscillation_window: 8,
  oscillation_frequency_threshold: 0.25,
  divergence_factor: 3.0,
  degenerate_threshold: 0.05,
  anderson_m: 3,
  anderson_stall_count: 5,
};

// ============================================================================
// CONVERGENCE STATUS & HISTORY
// ============================================================================

/** Convergence outcome for a single loop execution. */
export type ConvergenceStatus =
  | "converged"
  | "max_iterations"
  | "degenerate"
  | "diverged"
  | "oscillating";

/** Single convergence iteration record for traceability. */
export interface ConvergenceIteration {
  index: number;
  residual: number;
  alpha: number;
  snapshot: Record<string, number>;
  acceleration: "none" | "anderson" | "broyden";
}

/** Complete convergence report for one loop (FTW, FES, or FDT). */
export interface LoopConvergenceReport {
  loop: "FTW" | "FES" | "FDT";
  status: ConvergenceStatus;
  iterations: number;
  final_residual: number;
  spectral_radius?: number;
  history?: ConvergenceIteration[];
}

// ============================================================================
// FUSION DETAIL (extends OrchestratorResult)
// ============================================================================

/**
 * Detailed fusion output — appended to OrchestratorResult when
 * fusion_tier >= 2. Contains convergence metadata, per-plugin
 * breakdown, and traceability information.
 */
export interface FusionDetail {
  /** Fusion tier that was actually executed */
  tier_executed: FusionTier;

  /** Whether the tier was auto-selected or user-specified */
  tier_source: "user" | "auto";

  /** Final accumulated FusionState */
  final_state: FusionState;

  /** Overall confidence (product of plugin confidences minus skip penalties) */
  overall_confidence: number;

  /** Convergence reports for each active loop */
  convergence: LoopConvergenceReport[];

  /** Total convergence iterations across all loops */
  total_iterations: number;

  /** Wall-clock time for fusion computation (ms) */
  compute_time_ms: number;

  /** Per-plugin execution details */
  plugin_details: PluginExecutionDetail[];

  /**
   * Jacobian snapshot (Tier 4): partial derivatives of outputs w.r.t.
   * key inputs (ae, ap, Vc, fz). Computed via central finite differences
   * (8 extra convergence runs). Used for per-block variability without
   * re-convergence.
   *
   * Validity: if any |delta_input / input| > 0.30, full re-convergence required.
   */
  jacobian?: JacobianSnapshot;

  /** Uncertainty quantification (Tier 3+): MC or FOSM results. */
  uncertainty?: FusionUncertainty;
}

/** Execution detail for a single plugin within the fusion chain. */
export interface PluginExecutionDetail {
  plugin_id: string;
  status: "ok" | "skipped" | "error";
  time_ms: number;
  outputs: Record<string, number>;
  confidence: number;
  skip_reason?: string;
  error?: string;
}

/**
 * Jacobian snapshot for per-block variability (Tier 4).
 * J[i][j] = d(output_i) / d(input_j) via central finite differences.
 *
 * For a new engagement condition at block k:
 *   delta_output = J * delta_input
 */
export interface JacobianSnapshot {
  input_keys: string[];
  output_keys: string[];
  /** Row-major: matrix[i][j] = d(output_keys[i]) / d(input_keys[j]) */
  matrix: number[][];
  /** Operating point where Jacobian was computed */
  operating_point: Record<string, number>;
  /** Max relative input perturbation before Jacobian is invalid (default 0.30) */
  validity_threshold: number;
}

/** Uncertainty quantification from Tier 3+ fusion. */
export interface FusionUncertainty {
  method: "monte_carlo" | "fosm" | "pce";
  n_samples?: number;
  outputs: Record<string, UncertaintyEstimate>;
}

/** Uncertainty estimate for a single output variable. */
export interface UncertaintyEstimate {
  mean: number;
  std_dev: number;
  cv_pct: number;
  ci_95: [number, number];
  ci_99?: [number, number];
}

// ============================================================================
// FACTORY HELPERS
// ============================================================================

/** Create an empty FusionState for starting a new fusion computation. */
export function createFusionState(): FusionState {
  return {
    values: {},
    plugin_confidence: {},
    skipped_plugins: [],
    formulas_used: [],
    warnings: [],
    execution_order: [],
  };
}

/**
 * Build a full ConvergenceConfig by merging material-specific defaults
 * with user overrides on top of the base config.
 */
export function buildConvergenceConfig(
  iso_group: ISOGroup,
  overrides?: Partial<ConvergenceConfig>,
): ConvergenceConfig {
  const materialDefaults = DEFAULT_CONVERGENCE[iso_group] ?? {};
  return {
    ...BASE_CONVERGENCE_CONFIG,
    ...materialDefaults,
    ...overrides,
  };
}
