/**
 * PhysicsFusionConvergenceEngine — Nested FTW/FES/FDT Convergence Loops
 *
 * The mathematical heart of the Physics Fusion system. Manages three nested
 * feedback loops that must converge reliably for ALL materials:
 *
 *   FDT (outermost): Force-Deflection-Tolerance  — 2×2 Jacobian
 *   FES (middle):    Force-Engagement-Stability   — 2×2 Jacobian
 *   FTW (innermost): Force-Temperature-Wear       — 3×3 Jacobian
 *
 * Features:
 *   - Adaptive relaxation with per-loop spectral radius estimation
 *   - Material-specific initial alpha (ISO N=0.85 → ISO S=0.20)
 *   - Anderson acceleration (m=3, Tier 3+) with Broyden fallback
 *   - Oscillation detection: windowed DFT primary, sign-alternation fallback
 *   - Divergence handling: best-so-far tracker, alpha halving
 *   - NaN/Infinity guard: replace with last-known-good
 *   - Degenerate solution guard: ae/ap near-zero detection
 *
 * Worst-case iteration budget: 15 × 12 × 20 = 3,600 convergence passes.
 * With 24 plugins: up to 86,400 plugin evaluations. Performance-critical.
 *
 * Under-relaxation: v_new = v_old + alpha × (v_computed - v_old)
 * Spectral radius:  alpha_loop = min(max_alpha, 0.8 / rho_loop)
 *
 * References:
 *   - Walker & Ni (2011) — Anderson acceleration for fixed-point iteration
 *   - Broyden (1965) — A class of methods for solving nonlinear equations
 *   - Altintas (2012) "Manufacturing Automation" Ch. 3 — stability & convergence
 *
 * @module engines/PhysicsFusionConvergenceEngine
 * @see PhysicsFusionOrchestrator.types — all type definitions
 * @see PhysicsPluginRegistry — plugin ordering, feedback edges
 * @see PhysicsFusionOrchestratorEngine — tier routing, Jacobian (FUSION-3)
 */

import type { ISOGroup } from "../physics/constants.js";
import type {
  PhysicsPlugin,
  PluginContext,
  PluginOutput,
  FusionState,
  FusionTier,
  ConvergenceConfig,
  ConvergenceStatus,
  ConvergenceIteration,
  LoopConvergenceReport,
  PluginExecutionDetail,
  SkippedPlugin,
} from "./PhysicsFusionOrchestrator.types.js";

// ============================================================================
// LOCAL TYPES
// ============================================================================

/** Input to the convergence engine */
export interface ConvergenceInput {
  /** Plugins in topological execution order (from registry) */
  plugins: PhysicsPlugin[];
  /** Initial fusion state (from createFusionState()) */
  initial_state: FusionState;
  /** Convergence configuration (from buildConvergenceConfig()) */
  config: ConvergenceConfig;
  /** Fusion tier */
  tier: FusionTier;
  /** ISO material group */
  iso_group: ISOGroup;
  /** Raw orchestrator input parameters */
  params: Record<string, unknown>;
}

/** Output from the convergence engine */
export interface ConvergenceResult {
  /** Final accumulated FusionState */
  final_state: FusionState;
  /** Per-loop convergence reports */
  convergence: LoopConvergenceReport[];
  /** Overall convergence status (worst of all loops) */
  overall_status: ConvergenceStatus;
  /** Total iterations across all loops */
  total_iterations: number;
  /** Per-plugin execution details */
  plugin_details: PluginExecutionDetail[];
}

/** Per-loop tracking state */
interface LoopState {
  loop: "FTW" | "FES" | "FDT";
  alpha: number;
  best_residual: number;
  best_values: Record<string, number>;
  residual_history: number[];
  iteration_history: ConvergenceIteration[];
  spectral_radius: number;
  /** Anderson acceleration state */
  anderson_iterates: Record<string, number>[];
  anderson_residuals: Record<string, number>[];
  anderson_stall_count: number;
  /** Broyden state */
  broyden_active: boolean;
  broyden_B: number[][] | null; // Approximate Jacobian
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/** Deep clone a values record */
function cloneValues(values: Record<string, number>): Record<string, number> {
  return { ...values };
}

/** Deep clone a FusionState */
function cloneState(state: FusionState): FusionState {
  return {
    values: { ...state.values },
    plugin_confidence: { ...state.plugin_confidence },
    skipped_plugins: [...state.skipped_plugins],
    formulas_used: [...state.formulas_used],
    warnings: [...state.warnings],
    execution_order: [...state.execution_order],
  };
}

/** Check if a value is finite (not NaN, not Infinity) */
function isFiniteNum(v: number): boolean {
  return Number.isFinite(v);
}

/** Get output keys for plugins in a given loop */
function getLoopOutputKeys(plugins: PhysicsPlugin[], loop: "FTW" | "FES" | "FDT"): string[] {
  const keys: string[] = [];
  for (const p of plugins) {
    if (p.descriptor.loop === loop) {
      keys.push(...p.descriptor.outputs);
    }
  }
  return keys;
}

/** Create a fresh LoopState */
function createLoopState(loop: "FTW" | "FES" | "FDT", initialAlpha: number): LoopState {
  return {
    loop,
    alpha: initialAlpha,
    best_residual: Infinity,
    best_values: {},
    residual_history: [],
    iteration_history: [],
    spectral_radius: 1.0,
    anderson_iterates: [],
    anderson_residuals: [],
    anderson_stall_count: 0,
    broyden_active: false,
    broyden_B: null,
  };
}

// ============================================================================
// CONVERGENCE ENGINE
// ============================================================================

export class PhysicsFusionConvergenceEngine {

  /**
   * Main entry point: converge the physics plugin chain.
   *
   * Runs three nested loops (FDT → FES → FTW) until all converge or
   * failure conditions are met. Handles all failure modes gracefully.
   */
  converge(input: ConvergenceInput): ConvergenceResult {
    const { plugins, initial_state, config, tier, iso_group, params } = input;
    const state = cloneState(initial_state);
    const pluginDetails: PluginExecutionDetail[] = [];
    let totalIterations = 0;

    // Partition plugins by loop assignment
    const ftwPlugins = plugins.filter(p => p.descriptor.loop === "FTW");
    const fesPlugins = plugins.filter(p => p.descriptor.loop === "FES");
    const fdtPlugins = plugins.filter(p => p.descriptor.loop === "FDT");
    const singlePass = plugins.filter(p => !p.descriptor.loop);

    // Run single-pass plugins once (no convergence loop)
    for (const plugin of singlePass) {
      const ctx = this._buildContext(state, tier, 0, iso_group, 1.0, params);
      const detail = this._executePlugin(plugin, ctx, state);
      pluginDetails.push(detail);
    }

    // If no loop plugins, return immediately
    if (ftwPlugins.length === 0 && fesPlugins.length === 0 && fdtPlugins.length === 0) {
      return {
        final_state: state,
        convergence: [],
        overall_status: "converged",
        total_iterations: 0,
        plugin_details: pluginDetails,
      };
    }

    // Get output keys per loop
    const ftwKeys = getLoopOutputKeys(plugins, "FTW");
    const fesKeys = getLoopOutputKeys(plugins, "FES");
    const fdtKeys = getLoopOutputKeys(plugins, "FDT");

    // Initialize per-loop state
    const ftwState = createLoopState("FTW", config.initial_alpha);
    const fesState = createLoopState("FES", config.initial_alpha);
    const fdtState = createLoopState("FDT", config.initial_alpha);

    // Per-loop tolerance (with overrides)
    const tolFTW = config.tolerance_ftw ?? config.tolerance;
    const tolFES = config.tolerance_fes ?? config.tolerance;
    const tolFDT = config.tolerance_fdt ?? config.tolerance;

    // Track last-known-good for NaN recovery
    let lastKnownGood = cloneValues(state.values);

    // ── Nested Loop Iteration ─────────────────────────────────────────

    let fdtStatus: ConvergenceStatus = "max_iterations";
    let fdtFinalResidual = Infinity;
    // Lifted status trackers for report building (updated each inner loop run)
    let lastFtwStatus: ConvergenceStatus = "max_iterations";
    let lastFesStatus: ConvergenceStatus = "max_iterations";

    for (let fdtIter = 0; fdtIter < config.max_fdt_iterations; fdtIter++) {
      const snapshotFDT = cloneValues(state.values);

      let fesStatus: ConvergenceStatus = "max_iterations";
      let fesFinalResidual = Infinity;

      for (let fesIter = 0; fesIter < config.max_fes_iterations; fesIter++) {
        const snapshotFES = cloneValues(state.values);

        let ftwStatus: ConvergenceStatus = "max_iterations";
        let ftwFinalResidual = Infinity;

        // ── FTW Inner Loop ──────────────────────────────────────
        for (let ftwIter = 0; ftwIter < config.max_ftw_iterations; ftwIter++) {
          const snapshotFTW = cloneValues(state.values);

          // Run all FTW plugins with relaxation
          for (const plugin of ftwPlugins) {
            const ctx = this._buildContext(
              state, tier, ftwIter, iso_group, ftwState.alpha, params,
            );
            const detail = this._executePlugin(plugin, ctx, state);
            if (ftwIter === 0 && fesIter === 0 && fdtIter === 0) {
              pluginDetails.push(detail);
            }
          }

          // Apply under-relaxation
          this._applyRelaxation(state, snapshotFTW, ftwKeys, ftwState.alpha);

          // NaN guard
          if (this._handleNaN(state, lastKnownGood, ftwState)) {
            continue; // retry with halved alpha
          }
          lastKnownGood = cloneValues(state.values);

          // Compute residual
          const residual = this._computeResidual(
            snapshotFTW, state.values, ftwKeys, config,
          );
          ftwFinalResidual = residual;
          totalIterations++;

          // Bootstrap iteration (no comparable keys) — skip checks, continue
          if (!Number.isFinite(residual)) {
            continue;
          }

          // Record iteration (only finite residuals)
          const acceleration = this._getAccelerationMethod(ftwState, tier);
          ftwState.iteration_history.push({
            index: ftwIter,
            residual,
            alpha: ftwState.alpha,
            snapshot: this._extractKeys(state.values, ftwKeys),
            acceleration,
          });
          ftwState.residual_history.push(residual);

          // Degenerate check
          if (this._checkDegenerate(state, params, config)) {
            ftwStatus = "degenerate";
            break;
          }

          // Convergence check
          if (residual < tolFTW) {
            ftwStatus = "converged";
            break;
          }

          // Divergence check
          const divResult = this._handleDivergence(
            residual, ftwState, state, config,
          );
          if (divResult === "diverged") {
            ftwStatus = "diverged";
            break;
          }

          // Oscillation check
          if (this._detectOscillation(ftwState.residual_history, config)) {
            const nextAlpha = ftwState.alpha / 2;
            if (nextAlpha < 0.01) {
              ftwStatus = "oscillating";
              break;
            }
            ftwState.alpha = nextAlpha;
          }

          // Spectral radius update
          this._updateSpectralRadius(ftwState, config);

          // Anderson acceleration (Tier 3+)
          if (tier >= 3) {
            this._applyAcceleration(state, ftwState, ftwKeys, config);
          }

          // Update best-so-far
          if (residual < ftwState.best_residual) {
            ftwState.best_residual = residual;
            ftwState.best_values = this._extractKeys(state.values, ftwKeys);
          }
        }
        lastFtwStatus = ftwStatus;

        // ── FES Plugins ──────────────────────────────────────────
        if (fesPlugins.length > 0) {
          for (const plugin of fesPlugins) {
            const ctx = this._buildContext(
              state, tier, fesIter, iso_group, fesState.alpha, params,
            );
            const detail = this._executePlugin(plugin, ctx, state);
            if (fesIter === 0 && fdtIter === 0) {
              pluginDetails.push(detail);
            }
          }

          // Apply under-relaxation for FES
          this._applyRelaxation(state, snapshotFES, fesKeys, fesState.alpha);

          // NaN guard
          if (this._handleNaN(state, lastKnownGood, fesState)) {
            continue;
          }
          lastKnownGood = cloneValues(state.values);

          // Compute FES residual
          const residual = this._computeResidual(
            snapshotFES, state.values, fesKeys, config,
          );
          fesFinalResidual = residual;
          totalIterations++;

          // Bootstrap iteration — skip checks
          if (!Number.isFinite(residual)) {
            continue;
          }

          // Record FES iteration
          const acceleration = this._getAccelerationMethod(fesState, tier);
          fesState.iteration_history.push({
            index: fesIter,
            residual,
            alpha: fesState.alpha,
            snapshot: this._extractKeys(state.values, fesKeys),
            acceleration,
          });
          fesState.residual_history.push(residual);

          // FES convergence
          if (residual < tolFES) {
            fesStatus = "converged";
            break;
          }

          // FES divergence/oscillation
          const divResult = this._handleDivergence(
            residual, fesState, state, config,
          );
          if (divResult === "diverged") {
            fesStatus = "diverged";
            break;
          }
          if (this._detectOscillation(fesState.residual_history, config)) {
            const nextAlpha = fesState.alpha / 2;
            if (nextAlpha < 0.01) {
              fesStatus = "oscillating";
              break;
            }
            fesState.alpha = nextAlpha;
          }
          this._updateSpectralRadius(fesState, config);
          if (tier >= 3) {
            this._applyAcceleration(state, fesState, fesKeys, config);
          }
          if (residual < fesState.best_residual) {
            fesState.best_residual = residual;
            fesState.best_values = this._extractKeys(state.values, fesKeys);
          }
        } else {
          // No FES plugins — check FTW failure before trivial convergence
          if (ftwStatus === "diverged" || ftwStatus === "degenerate" || ftwStatus === "oscillating") {
            fesStatus = ftwStatus;
            break;
          }
          fesStatus = "converged";
          fesFinalResidual = 0;
          break;
        }

        // Propagate FTW failure upward
        if (ftwStatus === "diverged" || ftwStatus === "degenerate" || ftwStatus === "oscillating") {
          fesStatus = ftwStatus;
          break;
        }
      }
      lastFesStatus = fesStatus;

      // Propagate FES/FTW failure before FDT processing
      if (fesStatus === "diverged" || fesStatus === "degenerate" || fesStatus === "oscillating") {
        fdtStatus = fesStatus;
        break;
      }

      // ── FDT Plugins ──────────────────────────────────────────
      if (fdtPlugins.length > 0) {
        for (const plugin of fdtPlugins) {
          const ctx = this._buildContext(
            state, tier, fdtIter, iso_group, fdtState.alpha, params,
          );
          const detail = this._executePlugin(plugin, ctx, state);
          if (fdtIter === 0) {
            pluginDetails.push(detail);
          }
        }

        // Apply under-relaxation for FDT
        this._applyRelaxation(state, snapshotFDT, fdtKeys, fdtState.alpha);

        // NaN guard
        if (this._handleNaN(state, lastKnownGood, fdtState)) {
          continue;
        }
        lastKnownGood = cloneValues(state.values);

        // Compute FDT residual
        const residual = this._computeResidual(
          snapshotFDT, state.values, fdtKeys, config,
        );
        fdtFinalResidual = residual;
        totalIterations++;

        // Bootstrap iteration — skip checks
        if (!Number.isFinite(residual)) {
          continue;
        }

        // Record FDT iteration
        const acceleration = this._getAccelerationMethod(fdtState, tier);
        fdtState.iteration_history.push({
          index: fdtIter,
          residual,
          alpha: fdtState.alpha,
          snapshot: this._extractKeys(state.values, fdtKeys),
          acceleration,
        });
        fdtState.residual_history.push(residual);

        // FDT convergence
        if (residual < tolFDT) {
          fdtStatus = "converged";
          break;
        }

        // FDT divergence/oscillation
        const divResult = this._handleDivergence(
          residual, fdtState, state, config,
        );
        if (divResult === "diverged") {
          fdtStatus = "diverged";
          break;
        }
        if (this._detectOscillation(fdtState.residual_history, config)) {
          const nextAlpha = fdtState.alpha / 2;
          if (nextAlpha < 0.01) {
            fdtStatus = "oscillating";
            break;
          }
          fdtState.alpha = nextAlpha;
        }
        this._updateSpectralRadius(fdtState, config);
        if (tier >= 3) {
          this._applyAcceleration(state, fdtState, fdtKeys, config);
        }
        if (residual < fdtState.best_residual) {
          fdtState.best_residual = residual;
          fdtState.best_values = this._extractKeys(state.values, fdtKeys);
        }
      } else {
        // No FDT plugins — inner failure already propagated above
        fdtStatus = "converged";
        fdtFinalResidual = 0;
        break;
      }
    }

    // ── Build Reports ─────────────────────────────────────────────────

    const convergence: LoopConvergenceReport[] = [];

    if (ftwPlugins.length > 0) {
      const ftwReport = ftwState.iteration_history.length > 0
        ? ftwState.iteration_history[ftwState.iteration_history.length - 1]
        : null;
      convergence.push({
        loop: "FTW",
        status: lastFtwStatus,
        iterations: ftwState.iteration_history.length,
        final_residual: ftwReport?.residual ?? 0,
        spectral_radius: ftwState.spectral_radius !== 1.0
          ? ftwState.spectral_radius : undefined,
        history: ftwState.iteration_history,
      });
    }

    if (fesPlugins.length > 0) {
      const fesReport = fesState.iteration_history.length > 0
        ? fesState.iteration_history[fesState.iteration_history.length - 1]
        : null;
      convergence.push({
        loop: "FES",
        status: lastFesStatus,
        iterations: fesState.iteration_history.length,
        final_residual: fesReport?.residual ?? 0,
        spectral_radius: fesState.spectral_radius !== 1.0
          ? fesState.spectral_radius : undefined,
        history: fesState.iteration_history,
      });
    }

    if (fdtPlugins.length > 0) {
      convergence.push({
        loop: "FDT",
        status: fdtStatus,
        iterations: fdtState.iteration_history.length,
        final_residual: fdtFinalResidual,
        spectral_radius: fdtState.spectral_radius !== 1.0
          ? fdtState.spectral_radius : undefined,
        history: fdtState.iteration_history,
      });
    }

    // Overall status: worst of all loops
    const overallStatus = this._worstStatus(convergence);

    return {
      final_state: state,
      convergence,
      overall_status: overallStatus,
      total_iterations: totalIterations,
      plugin_details: pluginDetails,
    };
  }

  // ── Plugin Execution ─────────────────────────────────────────────────

  /**
   * Execute a single plugin with canRun() guard.
   * Returns PluginExecutionDetail for traceability.
   */
  private _executePlugin(
    plugin: PhysicsPlugin,
    ctx: PluginContext,
    state: FusionState,
  ): PluginExecutionDetail {
    const id = plugin.descriptor.id;
    const start = Date.now();

    // canRun check — convergence engine's responsibility
    if (!plugin.canRun(ctx)) {
      const detail: PluginExecutionDetail = {
        plugin_id: id,
        status: "skipped",
        time_ms: Date.now() - start,
        outputs: {},
        confidence: 0,
        skip_reason: "canRun returned false",
      };
      state.skipped_plugins.push({
        plugin_id: id,
        reason: "canRun_false",
        penalty: plugin.descriptor.skip_penalty,
      });
      return detail;
    }

    try {
      const output: PluginOutput = plugin.compute(ctx);

      // Merge outputs into state
      for (const [key, value] of Object.entries(output.values)) {
        state.values[key] = value;
      }
      state.plugin_confidence[id] = output.confidence;
      if (output.formulas_used) {
        state.formulas_used.push(...output.formulas_used);
      }
      if (output.warnings) {
        state.warnings.push(...output.warnings);
      }
      if (!state.execution_order.includes(id)) {
        state.execution_order.push(id);
      }

      return {
        plugin_id: id,
        status: "ok",
        time_ms: Date.now() - start,
        outputs: { ...output.values },
        confidence: output.confidence,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      state.warnings.push(`Plugin "${id}" error: ${msg}`);
      return {
        plugin_id: id,
        status: "error",
        time_ms: Date.now() - start,
        outputs: {},
        confidence: 0,
        error: msg,
      };
    }
  }

  /** Build a PluginContext for a given iteration */
  private _buildContext(
    state: FusionState,
    tier: FusionTier,
    iteration: number,
    iso_group: ISOGroup,
    alpha: number,
    params: Record<string, unknown>,
  ): PluginContext {
    return { state, tier, iteration, iso_group, alpha, params };
  }

  // ── Relaxation ────────────────────────────────────────────────────────

  /**
   * Apply under-relaxation to state values.
   * v_new = v_old + alpha × (v_computed - v_old)
   *
   * Only relaxes keys that existed in the snapshot (pre-iteration values).
   * New keys introduced by plugins pass through unrelaxed.
   */
  private _applyRelaxation(
    state: FusionState,
    snapshot: Record<string, number>,
    keys: string[],
    alpha: number,
  ): void {
    for (const key of keys) {
      const oldVal = snapshot[key];
      const newVal = state.values[key];
      if (oldVal !== undefined && newVal !== undefined) {
        state.values[key] = oldVal + alpha * (newVal - oldVal);
      }
    }
  }

  // ── Residual Computation ──────────────────────────────────────────────

  /**
   * Compute relative residual (max-norm) over specified keys.
   * residual = max_k |v_new[k] - v_old[k]| / max(|v_old[k]|, epsilon)
   *
   * Only compares keys present in BOTH old and new values.
   * Returns Infinity if no keys are comparable (bootstrap iteration).
   */
  private _computeResidual(
    oldValues: Record<string, number>,
    newValues: Record<string, number>,
    keys: string[],
    config: ConvergenceConfig,
  ): number {
    let maxResidual = 0;
    let comparableCount = 0;
    for (const key of keys) {
      const oldV = oldValues[key];
      const newV = newValues[key];
      if (oldV !== undefined && newV !== undefined) {
        comparableCount++;
        const denom = Math.max(Math.abs(oldV), config.epsilon);
        const rel = Math.abs(newV - oldV) / denom;
        if (rel > maxResidual) maxResidual = rel;
      }
    }
    // No comparable keys = bootstrap iteration → not converged
    if (comparableCount === 0 && keys.length > 0) return Infinity;
    return maxResidual;
  }

  // ── Spectral Radius ───────────────────────────────────────────────────

  /**
   * Estimate spectral radius from residual history and update alpha.
   *
   * Method: ratio of successive residual norms, smoothed over last 3.
   * alpha = min(max_alpha, 0.8 / smoothed_rho)
   */
  private _updateSpectralRadius(ls: LoopState, config: ConvergenceConfig): void {
    const hist = ls.residual_history;
    if (hist.length < 2) return;

    // Compute ratio from last 2 residuals
    const prev = hist[hist.length - 2];
    const curr = hist[hist.length - 1];
    if (prev <= 0) return;

    const rho = curr / prev;

    // Smooth over last 3 ratios
    if (hist.length >= 3) {
      const prevPrev = hist[hist.length - 3];
      if (prevPrev > 0) {
        const rho2 = prev / prevPrev;
        ls.spectral_radius = (rho + rho2) / 2; // 2-point average
      } else {
        ls.spectral_radius = rho;
      }
    } else {
      ls.spectral_radius = rho;
    }

    // Update alpha: alpha = min(max_alpha, 0.8 / rho)
    if (ls.spectral_radius > 0) {
      const newAlpha = Math.min(config.max_alpha, 0.8 / ls.spectral_radius);
      // Don't let alpha drop below 0.01 from spectral radius alone
      ls.alpha = Math.max(0.01, newAlpha);
    }
  }

  // ── Oscillation Detection ─────────────────────────────────────────────

  /**
   * Detect oscillation in residual history.
   *
   * Primary: Windowed DFT on last `oscillation_window` residuals.
   * If dominant frequency > oscillation_frequency_threshold → oscillation.
   *
   * Fallback (< 4 residuals): sign alternation check.
   * ≥ 3 sign changes in last 4 residual deltas → oscillation.
   */
  private _detectOscillation(
    residualHistory: number[],
    config: ConvergenceConfig,
  ): boolean {
    const len = residualHistory.length;
    if (len < 3) return false;

    // Fallback: sign alternation for short histories
    if (len < config.oscillation_window) {
      return this._signAlternationCheck(residualHistory);
    }

    // Primary: Windowed DFT
    const window = residualHistory.slice(-config.oscillation_window);
    return this._dftOscillationCheck(window, config.oscillation_frequency_threshold);
  }

  /**
   * Sign alternation fallback: count sign changes in consecutive deltas.
   * ≥ 3 sign changes in last 4 deltas → oscillation.
   */
  private _signAlternationCheck(history: number[]): boolean {
    const n = Math.min(history.length, 5);
    if (n < 3) return false;

    const recent = history.slice(-n);
    let signChanges = 0;
    for (let i = 2; i < recent.length; i++) {
      const d1 = recent[i - 1] - recent[i - 2];
      const d2 = recent[i] - recent[i - 1];
      if ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) {
        signChanges++;
      }
    }
    // Threshold scales with window: 2 for short (3-4), 3 for longer (5+)
    const threshold = n <= 4 ? 2 : 3;
    return signChanges >= threshold;
  }

  /**
   * Windowed DFT oscillation detection.
   * Computes DFT magnitudes, finds dominant frequency (excluding DC).
   * If dominant_freq / (W/2) > threshold → oscillation.
   */
  private _dftOscillationCheck(window: number[], threshold: number): boolean {
    const W = window.length;
    if (W < 4) return false;

    // Remove DC component (mean)
    const mean = window.reduce((s, v) => s + v, 0) / W;
    const centered = window.map(v => v - mean);

    // DFT: compute magnitudes for frequencies k=1..W/2
    let maxMag = 0;
    let maxK = 0;
    for (let k = 1; k <= Math.floor(W / 2); k++) {
      let re = 0;
      let im = 0;
      for (let n = 0; n < W; n++) {
        const angle = (2 * Math.PI * k * n) / W;
        re += centered[n] * Math.cos(angle);
        im -= centered[n] * Math.sin(angle);
      }
      const mag = Math.sqrt(re * re + im * im);
      if (mag > maxMag) {
        maxMag = mag;
        maxK = k;
      }
    }

    // Normalized frequency: maxK / W ∈ [0, 0.5]
    const normalizedFreq = maxK / W;
    return normalizedFreq > threshold;
  }

  // ── Anderson Acceleration ─────────────────────────────────────────────

  /**
   * Apply acceleration (Anderson or Broyden) to state values.
   * Anderson is PRIMARY for Tier 3+. Broyden is FALLBACK.
   */
  private _applyAcceleration(
    state: FusionState,
    ls: LoopState,
    keys: string[],
    config: ConvergenceConfig,
  ): void {
    const currentValues = this._extractKeys(state.values, keys);

    // Compute residual vector (g(x) - x where g is the fixed-point map)
    // We use the difference between current output and the state before relaxation
    // as an approximation of the residual
    const residualVec: Record<string, number> = {};
    if (ls.iteration_history.length > 0) {
      const lastSnapshot = ls.iteration_history[ls.iteration_history.length - 1].snapshot;
      for (const k of keys) {
        residualVec[k] = (currentValues[k] ?? 0) - (lastSnapshot[k] ?? 0);
      }
    } else {
      return; // Need at least one iteration
    }

    // Store iterate and residual
    ls.anderson_iterates.push({ ...currentValues });
    ls.anderson_residuals.push({ ...residualVec });

    // Trim to m+1 entries
    const m = config.anderson_m;
    while (ls.anderson_iterates.length > m + 1) {
      ls.anderson_iterates.shift();
      ls.anderson_residuals.shift();
    }

    // Check for Anderson stall → Broyden fallback
    if (ls.residual_history.length >= 2) {
      const curr = ls.residual_history[ls.residual_history.length - 1];
      const prev = ls.residual_history[ls.residual_history.length - 2];
      if (curr >= prev) {
        ls.anderson_stall_count++;
      } else {
        ls.anderson_stall_count = 0;
        ls.broyden_active = false; // Reset Broyden if Anderson is working
      }
    }

    if (ls.broyden_active) {
      this._broydenStep(state, ls, keys);
    } else if (ls.anderson_stall_count >= config.anderson_stall_count) {
      // Switch to Broyden
      ls.broyden_active = true;
      this._initBroyden(ls, keys);
      this._broydenStep(state, ls, keys);
    } else if (ls.anderson_iterates.length >= 2) {
      this._andersonStep(state, ls, keys);
    }
  }

  /**
   * Anderson mixing step.
   *
   * Given m+1 iterates x_{k-m}...x_k and residuals r_{k-m}...r_k:
   *   ΔX = [x_{k-m+1}-x_{k-m}, ..., x_k-x_{k-1}]
   *   ΔR = [r_{k-m+1}-r_{k-m}, ..., r_k-r_{k-1}]
   *   θ* = argmin ||r_k - ΔR·θ||_2
   *   x_{k+1} = x_k + r_k - (ΔX + ΔR)·θ*
   */
  private _andersonStep(
    state: FusionState,
    ls: LoopState,
    keys: string[],
  ): void {
    const n = ls.anderson_iterates.length;
    if (n < 2) return;

    const m = n - 1; // Number of differences

    // Build ΔR matrix (each column = r_{i+1} - r_i)
    const deltaR: number[][] = [];
    for (let i = 0; i < m; i++) {
      const col: number[] = [];
      for (const k of keys) {
        const ri = ls.anderson_residuals[i][k] ?? 0;
        const ri1 = ls.anderson_residuals[i + 1][k] ?? 0;
        col.push(ri1 - ri);
      }
      deltaR.push(col);
    }

    // Current residual vector
    const rk: number[] = keys.map(k => ls.anderson_residuals[n - 1][k] ?? 0);

    // Solve ΔR^T · ΔR · θ = ΔR^T · rk (normal equations)
    const theta = this._solveNormalEquations(deltaR, rk);
    if (!theta) return; // Singular — skip acceleration

    // Build ΔX matrix
    const deltaX: number[][] = [];
    for (let i = 0; i < m; i++) {
      const col: number[] = [];
      for (const k of keys) {
        const xi = ls.anderson_iterates[i][k] ?? 0;
        const xi1 = ls.anderson_iterates[i + 1][k] ?? 0;
        col.push(xi1 - xi);
      }
      deltaX.push(col);
    }

    // x_{k+1} = x_k + r_k - (ΔX + ΔR) · θ
    for (let j = 0; j < keys.length; j++) {
      const k = keys[j];
      let correction = rk[j];
      for (let i = 0; i < m; i++) {
        correction -= (deltaX[i][j] + deltaR[i][j]) * theta[i];
      }
      const xk = ls.anderson_iterates[n - 1][k] ?? 0;
      const newVal = xk + correction;
      if (isFiniteNum(newVal)) {
        state.values[k] = newVal;
      }
    }
  }

  /**
   * Solve normal equations: (A^T A) θ = A^T b
   * A is given as array of column vectors.
   * Returns θ or null if singular.
   */
  private _solveNormalEquations(
    columns: number[][],
    b: number[],
  ): number[] | null {
    const m = columns.length;
    if (m === 0) return null;
    const n = b.length;

    // Build A^T A (m×m)
    const AtA: number[][] = Array.from({ length: m }, () => new Array(m).fill(0));
    const Atb: number[] = new Array(m).fill(0);

    for (let i = 0; i < m; i++) {
      for (let j = 0; j < m; j++) {
        let sum = 0;
        for (let k = 0; k < n; k++) {
          sum += columns[i][k] * columns[j][k];
        }
        AtA[i][j] = sum;
      }
      let sum = 0;
      for (let k = 0; k < n; k++) {
        sum += columns[i][k] * b[k];
      }
      Atb[i] = sum;
    }

    // Solve via Gaussian elimination with partial pivoting
    return this._gaussianElimination(AtA, Atb);
  }

  /** Gaussian elimination with partial pivoting for small systems */
  private _gaussianElimination(A: number[][], b: number[]): number[] | null {
    const n = A.length;
    // Augmented matrix
    const aug = A.map((row, i) => [...row, b[i]]);

    for (let col = 0; col < n; col++) {
      // Partial pivoting
      let maxRow = col;
      let maxVal = Math.abs(aug[col][col]);
      for (let row = col + 1; row < n; row++) {
        if (Math.abs(aug[row][col]) > maxVal) {
          maxVal = Math.abs(aug[row][col]);
          maxRow = row;
        }
      }
      if (maxVal < 1e-15) return null; // Singular

      // Swap rows
      if (maxRow !== col) {
        [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
      }

      // Eliminate below
      for (let row = col + 1; row < n; row++) {
        const factor = aug[row][col] / aug[col][col];
        for (let j = col; j <= n; j++) {
          aug[row][j] -= factor * aug[col][j];
        }
      }
    }

    // Back substitution
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      let sum = aug[i][n];
      for (let j = i + 1; j < n; j++) {
        sum -= aug[i][j] * x[j];
      }
      if (Math.abs(aug[i][i]) < 1e-15) return null;
      x[i] = sum / aug[i][i];
    }
    return x;
  }

  // ── Broyden Fallback ──────────────────────────────────────────────────

  /** Initialize Broyden from recent history */
  private _initBroyden(ls: LoopState, keys: string[]): void {
    const n = keys.length;
    // B0 = Identity matrix
    ls.broyden_B = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
    );
  }

  /**
   * Broyden quasi-Newton step.
   * B_{k+1} = B_k + (Δf - B_k·Δs)·Δs^T / (Δs^T·Δs)
   * s = -B^{-1}·f
   */
  private _broydenStep(
    state: FusionState,
    ls: LoopState,
    keys: string[],
  ): void {
    if (!ls.broyden_B || ls.anderson_iterates.length < 2) return;

    const n = keys.length;
    const m = ls.anderson_iterates.length;

    // Δs = x_k - x_{k-1}
    const ds: number[] = [];
    for (const k of keys) {
      ds.push(
        (ls.anderson_iterates[m - 1][k] ?? 0) -
        (ls.anderson_iterates[m - 2][k] ?? 0),
      );
    }

    // Δf = r_k - r_{k-1}
    const df: number[] = [];
    for (const k of keys) {
      df.push(
        (ls.anderson_residuals[m - 1][k] ?? 0) -
        (ls.anderson_residuals[m - 2][k] ?? 0),
      );
    }

    // Δs^T · Δs
    let dsTds = 0;
    for (let i = 0; i < n; i++) dsTds += ds[i] * ds[i];
    if (dsTds < 1e-30) return; // Too small, skip

    // B·Δs
    const Bds: number[] = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        Bds[i] += ls.broyden_B![i][j] * ds[j];
      }
    }

    // Update: B += (Δf - B·Δs)·Δs^T / (Δs^T·Δs)
    for (let i = 0; i < n; i++) {
      const num = df[i] - Bds[i];
      for (let j = 0; j < n; j++) {
        ls.broyden_B![i][j] += (num * ds[j]) / dsTds;
      }
    }

    // Current residual
    const fk: number[] = keys.map(k => ls.anderson_residuals[m - 1][k] ?? 0);

    // Solve B·step = -f via direct inverse (small matrix)
    const negF = fk.map(v => -v);
    const step = this._gaussianElimination(
      ls.broyden_B!.map(row => [...row]),
      negF,
    );
    if (!step) return; // Singular

    // Apply step
    for (let j = 0; j < keys.length; j++) {
      const k = keys[j];
      const newVal = (ls.anderson_iterates[m - 1][k] ?? 0) + step[j];
      if (isFiniteNum(newVal)) {
        state.values[k] = newVal;
      }
    }
  }

  // ── NaN Handling ──────────────────────────────────────────────────────

  /**
   * Check for NaN/Infinity in state values, replace with last-known-good.
   * Returns true if NaN was found (caller should continue/retry).
   */
  private _handleNaN(
    state: FusionState,
    lastKnownGood: Record<string, number>,
    ls: LoopState,
  ): boolean {
    let found = false;
    for (const [key, value] of Object.entries(state.values)) {
      if (!isFiniteNum(value)) {
        const good = lastKnownGood[key];
        state.values[key] = good !== undefined && isFiniteNum(good) ? good : 0;
        found = true;
      }
    }
    if (found) {
      ls.alpha = Math.max(0.01, ls.alpha / 2);
      state.warnings.push(
        `NaN/Infinity detected in ${ls.loop} loop — restored last-known-good, ` +
        `alpha halved to ${ls.alpha.toFixed(3)}`,
      );
    }
    return found;
  }

  // ── Divergence Handling ───────────────────────────────────────────────

  /**
   * Check for divergence: residual > best * divergence_factor.
   * Restores best-so-far state and halves alpha.
   * Returns "diverged" if alpha drops below 0.01.
   */
  private _handleDivergence(
    residual: number,
    ls: LoopState,
    state: FusionState,
    config: ConvergenceConfig,
  ): ConvergenceStatus | null {
    if (ls.best_residual === Infinity) {
      // First iteration — just record
      ls.best_residual = residual;
      return null;
    }

    if (residual > ls.best_residual * config.divergence_factor) {
      // Diverging — restore best-so-far
      for (const [key, value] of Object.entries(ls.best_values)) {
        state.values[key] = value;
      }
      const nextAlpha = ls.alpha / 2;
      state.warnings.push(
        `Divergence in ${ls.loop} loop (residual ${residual.toExponential(2)} > ` +
        `${(ls.best_residual * config.divergence_factor).toExponential(2)}) — ` +
        `restored best-so-far, alpha halved to ${nextAlpha.toFixed(3)}`,
      );
      if (nextAlpha < 0.01) {
        return "diverged";
      }
      ls.alpha = nextAlpha;
    }
    return null;
  }

  // ── Degenerate Check ──────────────────────────────────────────────────

  /**
   * Check for degenerate solution: ae/ap near zero.
   * If ae < threshold * initial_ae or ap < threshold * initial_ap → degenerate.
   */
  private _checkDegenerate(
    state: FusionState,
    params: Record<string, unknown>,
    config: ConvergenceConfig,
  ): boolean {
    const ae = state.values["ae_mm"] ?? state.values["radial_depth_mm"];
    const ap = state.values["ap_mm"] ?? state.values["axial_depth_mm"];
    const initialAe = (params["ae_mm"] ?? params["radial_depth_mm"]) as number | undefined;
    const initialAp = (params["ap_mm"] ?? params["axial_depth_mm"]) as number | undefined;

    if (ae !== undefined && initialAe !== undefined && initialAe > 0) {
      if (ae < config.degenerate_threshold * initialAe) return true;
    }
    if (ap !== undefined && initialAp !== undefined && initialAp > 0) {
      if (ap < config.degenerate_threshold * initialAp) return true;
    }
    return false;
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  /** Extract specific keys from a values record */
  private _extractKeys(
    values: Record<string, number>,
    keys: string[],
  ): Record<string, number> {
    const result: Record<string, number> = {};
    for (const k of keys) {
      if (values[k] !== undefined) result[k] = values[k];
    }
    return result;
  }

  /** Determine acceleration method label for iteration record */
  private _getAccelerationMethod(
    ls: LoopState,
    tier: FusionTier,
  ): "none" | "anderson" | "broyden" {
    if (tier < 3) return "none";
    if (ls.broyden_active) return "broyden";
    if (ls.anderson_iterates.length >= 2) return "anderson";
    return "none";
  }

  /** Determine overall status: worst across all loops */
  private _worstStatus(reports: LoopConvergenceReport[]): ConvergenceStatus {
    if (reports.length === 0) return "converged";

    const priority: Record<ConvergenceStatus, number> = {
      diverged: 4,
      degenerate: 3,
      oscillating: 2,
      max_iterations: 1,
      converged: 0,
    };

    let worst: ConvergenceStatus = "converged";
    for (const r of reports) {
      if (priority[r.status] > priority[worst]) {
        worst = r.status;
      }
    }
    return worst;
  }
}

/** Singleton instance */
export const physicsFusionConvergenceEngine = new PhysicsFusionConvergenceEngine();
