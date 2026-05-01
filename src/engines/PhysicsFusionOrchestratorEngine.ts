/**
 * PhysicsFusionOrchestratorEngine — Tier-Routed Multi-Model Physics Fusion
 *
 * Wires the complete Physics Fusion pipeline:
 *   1. Registers 5 core plugins (Kienzle, Temperature, Deflection, Stability, Finish)
 *   2. Routes to appropriate tier (1-4) based on input quality or user request
 *   3. Tier 1: single-pass through plugins, no convergence (fast estimates)
 *   4. Tier 2: full FTW/FES/FDT convergence via PhysicsFusionConvergenceEngine
 *   5. Tier 3: Tier 2 + Anderson/Broyden acceleration (handled by convergence engine)
 *   6. Tier 4: Tier 3 + Jacobian via central finite differences for per-block variability
 *
 * After this engine, a call to SpeedFeedOrchestrator with fusion_tier >= 2 gets
 * converged multi-model physics instead of single-pass estimates.
 *
 * Per-block chip-thinning (Tier 1+):
 *   fz_adjusted = fz_nominal / sqrt(1 - (1 - 2·ae/D)²)
 *   Gives novice users per-block variability without full convergence.
 *
 * Jacobian delta (Tier 4):
 *   δ_output ≈ J · δ_input  where J computed via central finite differences
 *   8 perturbation runs (±5% on 4 inputs: ae, ap, Vc, fz)
 *   Valid while |δ_input/input| < 0.30 — beyond that, full re-convergence required.
 *
 * References:
 *   - Altintas (2012) "Manufacturing Automation" — multi-model coupling
 *   - Kienzle (1952) — specific cutting force (plugin L1)
 *   - Loewen & Shaw (1954) — cutting temperature (plugin L2)
 *   - Tlusty & Polacek (1963) — stability lobes (plugin L5)
 *   - Brammertz (1961) — kinematic surface roughness (plugin L6)
 *
 * @module engines/PhysicsFusionOrchestratorEngine
 * @see PhysicsFusionOrchestrator.types — all type definitions (frozen)
 * @see PhysicsFusionConvergenceEngine — nested FTW/FES/FDT iteration (FUSION-2)
 * @see PhysicsPluginRegistry — plugin ordering, tier filtering
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
  LoopConvergenceReport,
  PluginExecutionDetail,
  FusionDetail,
  JacobianSnapshot,
  SkippedPlugin,
} from "./PhysicsFusionOrchestrator.types.js";
import {
  createFusionState,
  buildConvergenceConfig,
} from "./PhysicsFusionOrchestrator.types.js";
import { PhysicsPluginRegistry } from "./PhysicsPluginRegistry.js";
import {
  physicsFusionConvergenceEngine,
  type ConvergenceInput,
  type ConvergenceResult,
} from "./PhysicsFusionConvergenceEngine.js";
import { kienzleForcePlugin } from "./plugins/KienzleForcePlugin.js";
import { cuttingTemperaturePlugin } from "./plugins/CuttingTemperaturePlugin.js";
import { toolDeflectionPlugin } from "./plugins/ToolDeflectionPlugin.js";
import { chatterStabilityPlugin } from "./plugins/ChatterStabilityPlugin.js";
import { surfaceFinishPlugin } from "./plugins/SurfaceFinishPlugin.js";

// ============================================================================
// INPUT / OUTPUT TYPES
// ============================================================================

/**
 * Input to the fusion orchestrator.
 * Accepts resolved material + tool + cutting parameters from SpeedFeedOrchestrator
 * or directly from a physics_fusion dispatcher action.
 */
export interface FusionOrchestratorInput {
  // ── Material (required) ──
  iso_group: ISOGroup;
  kc1_1: number;                       // Specific cutting force [N/mm²]
  mc: number;                          // Kienzle exponent

  // ── Tool (required) ──
  tool_diameter_mm: number;
  flutes: number;

  // ── Cutting conditions (required) ──
  cutting_speed_mpm: number;           // Vc [m/min]
  feed_per_tooth_mm: number;           // fz [mm/tooth]
  spindle_rpm: number;                 // N [rev/min]
  axial_depth_mm: number;              // ap [mm]
  radial_depth_mm: number;             // ae [mm]

  // ── Tool (optional) ──
  tool_material?: string;              // "carbide"|"hss"|... default "carbide"
  tool_stickout_mm?: number;           // Overhang [mm]
  corner_radius_mm?: number;           // r_e [mm]
  tool_coating?: string;               // "TiAlN"|"TiN"|...
  helix_angle_deg?: number;
  edge_radius_mm?: number;
  flute_length_mm?: number;

  // ── Machine (optional) ──
  machine_max_rpm?: number;
  machine_power_kw?: number;
  natural_frequency_hz?: number;
  damping_ratio?: number;
  system_stiffness_n_um?: number;

  // ── Environment (optional) ──
  coolant_type?: string;               // "flood"|"mist"|"MQL"|"dry"|"cryogenic"
  approach_angle_deg?: number;         // κ_r, default 90
  rake_angle_deg?: number;             // γ, default 6
  flank_wear_mm?: number;              // VB [mm]
  feature_tolerance_mm?: number;

  // ── Material name for logging ──
  material?: string;

  // ── Tier control ──
  fusion_tier?: FusionTier;            // 1-4; auto-selected if omitted
  convergence_overrides?: Partial<ConvergenceConfig>;

  // ── Per-block variability (Tier 4) ──
  block_engagements?: BlockEngagement[];

  // ── Serialization round-trip ──
  previous_state_json?: string;        // JSON-serialized FusionState from prior op
}

/** Per-block engagement for Jacobian delta variability */
export interface BlockEngagement {
  ae_mm: number;
  ap_mm: number;
  fz_mm?: number;
  Vc_mpm?: number;
}

/**
 * Output from the fusion orchestrator.
 * Primary physics values + full FusionDetail metadata.
 */
export interface FusionOrchestratorResult {
  // ── Primary physics results ──
  Fc_N: number;
  Ff_N: number;
  Fp_N: number;
  torque_Nm: number;
  power_kW: number;

  // ── Extended results (Tier 2+ or single-pass if available) ──
  interface_temp_C: number | null;
  deflection_um: number | null;
  max_stable_ap_mm: number | null;
  predicted_Ra_um: number | null;

  // ── Chip thinning (all tiers) ──
  chip_thinning_factor: number;
  adjusted_fz_mm: number;

  // ── Fusion metadata ──
  fusion_detail: FusionDetail;

  // ── Per-block variability (Tier 4) ──
  block_results?: Array<Record<string, number>>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Jacobian input keys — 4 controllable parameters */
const JACOBIAN_INPUT_KEYS = ["radial_depth_mm", "axial_depth_mm", "cutting_speed_mpm", "feed_per_tooth_mm"];

/** Jacobian output keys — physics quantities of interest */
const JACOBIAN_OUTPUT_KEYS = ["Fc_N", "power_kW", "deflection_um", "predicted_Ra_um", "interface_temp_C"];

/** Relative perturbation size for finite differences */
const JACOBIAN_PERTURBATION = 0.05; // 5%

/** Jacobian validity threshold — beyond this, full re-convergence needed */
const JACOBIAN_VALIDITY = 0.30; // 30%

/** Minimum input thresholds for tier auto-selection scoring */
const TIER_SCORE_WEIGHTS: Record<string, number> = {
  // Having these fields adds to the tier score
  kc1_1: 1, mc: 1, tool_diameter_mm: 1, flutes: 1,
  cutting_speed_mpm: 1, feed_per_tooth_mm: 1, axial_depth_mm: 1, radial_depth_mm: 1,
  tool_material: 0.5, tool_stickout_mm: 0.5, corner_radius_mm: 0.5,
  tool_coating: 0.3, coolant_type: 0.3,
  natural_frequency_hz: 1, damping_ratio: 0.5, system_stiffness_n_um: 1,
  machine_max_rpm: 0.3, feature_tolerance_mm: 0.3,
};

// ============================================================================
// ORCHESTRATOR ENGINE
// ============================================================================

export class PhysicsFusionOrchestratorEngine {
  private _registry: PhysicsPluginRegistry;
  private _pluginsRegistered = false;

  constructor() {
    this._registry = new PhysicsPluginRegistry();
  }

  // ── Plugin Registration ──────────────────────────────────────────

  /**
   * Register the 5 core plugins. Idempotent — only registers once.
   * Uses static imports (no circular deps — plugins are leaf modules).
   */
  private _ensurePluginsRegistered(): void {
    if (this._pluginsRegistered) return;

    this._registry.register(kienzleForcePlugin);
    this._registry.register(cuttingTemperaturePlugin);
    this._registry.register(toolDeflectionPlugin);
    this._registry.register(chatterStabilityPlugin);
    this._registry.register(surfaceFinishPlugin);

    this._pluginsRegistered = true;
  }

  /**
   * Register an additional plugin (for extensibility).
   * Must be called before compute().
   */
  registerPlugin(plugin: PhysicsPlugin): void {
    this._ensurePluginsRegistered();
    this._registry.register(plugin);
  }

  /** Access the internal registry (for testing) */
  get registry(): PhysicsPluginRegistry {
    this._ensurePluginsRegistered();
    return this._registry;
  }

  // ── Main Entry Point ─────────────────────────────────────────────

  /**
   * Compute fused physics for a cutting operation.
   *
   * Routes to the appropriate tier, manages plugin execution,
   * builds the FusionDetail, and optionally computes per-block
   * Jacobian variability.
   */
  compute(input: FusionOrchestratorInput): FusionOrchestratorResult {
    const startTime = performance.now();
    this._ensurePluginsRegistered();

    // ── Validate required inputs ──
    this._validateInput(input);

    // ── Determine tier ──
    const tierSource: "user" | "auto" = input.fusion_tier !== undefined ? "user" : "auto";
    const tier: FusionTier = input.fusion_tier ?? this._autoSelectTier(input);

    // ── Build params record for plugin context ──
    const params = this._buildParams(input);

    // ── Get execution plan from registry ──
    const plan = this._registry.getExecutionOrder([], tier);
    const plugins = plan.ordered;
    const skipPenalty = plan.total_penalty;

    // ── Chip thinning (all tiers) ──
    const chipThinFactor = this._chipThinningFactor(input.radial_depth_mm, input.tool_diameter_mm);
    const adjustedFz = input.feed_per_tooth_mm * chipThinFactor;
    // Update params with chip-thinning adjusted feed
    params.adjusted_fz_mm = adjustedFz;

    // ── Handle empty plugin set ──
    if (plugins.length === 0) {
      const emptyState = createFusionState();
      emptyState.warnings.push("No plugins available for this tier — all skipped");
      emptyState.skipped_plugins = plan.skipped;
      return this._buildEmptyResult(emptyState, tier, tierSource, skipPenalty, chipThinFactor, adjustedFz, startTime, plan.skipped);
    }

    // ── Deserialize previous state if provided (for multi-op continuity) ──
    let initialState: FusionState;
    if (input.previous_state_json) {
      try {
        initialState = this.deserializeFusionState(input.previous_state_json);
      } catch {
        initialState = createFusionState();
        initialState.warnings.push("Failed to deserialize previous state — starting fresh");
      }
    } else {
      initialState = createFusionState();
    }

    // ── Convergence config ──
    const config = buildConvergenceConfig(input.iso_group, input.convergence_overrides);

    // ── Execute based on tier ──
    let finalState: FusionState;
    let convergence: LoopConvergenceReport[] = [];
    let totalIterations = 0;
    let pluginDetails: PluginExecutionDetail[] = [];
    let overallStatus: ConvergenceStatus = "converged";

    if (tier === 1) {
      // Single-pass: no convergence loops
      const result = this._executeTier1(plugins, initialState, params, input.iso_group, tier);
      finalState = result.state;
      pluginDetails = result.pluginDetails;
    } else {
      // Tier 2/3/4: full convergence
      const convResult = this._executeTier2Plus(
        plugins, initialState, params, input.iso_group, tier, config,
      );
      finalState = convResult.state;
      convergence = convResult.convergence;
      totalIterations = convResult.totalIterations;
      pluginDetails = convResult.pluginDetails;
      overallStatus = convResult.overallStatus;
    }

    // ── Add skipped plugins from execution plan ──
    for (const sk of plan.skipped) {
      if (!finalState.skipped_plugins.find(s => s.plugin_id === sk.plugin_id)) {
        finalState.skipped_plugins.push(sk);
      }
    }

    // ── Tier 4: Jacobian computation ──
    let jacobian: JacobianSnapshot | undefined;
    let blockResults: Array<Record<string, number>> | undefined;

    if (tier === 4 && overallStatus === "converged") {
      jacobian = this._computeJacobian(plugins, params, input.iso_group, tier, config, finalState);

      // Apply Jacobian to per-block engagements if provided
      if (input.block_engagements && input.block_engagements.length > 0 && jacobian) {
        blockResults = [];
        for (const block of input.block_engagements) {
          const delta = this._applyJacobianDelta(jacobian, finalState, block, params);
          if (delta !== null) {
            blockResults.push(delta);
          }
        }
      }
    }

    // ── Build FusionDetail ──
    const fusionDetail = this._buildFusionDetail(
      tier, tierSource, finalState, convergence, totalIterations,
      pluginDetails, startTime, jacobian, skipPenalty,
    );

    // ── Extract primary results from state ──
    const v = finalState.values;

    // ── Publish event (lazy-load EventBus) ──
    this._publishEvent(fusionDetail, input);

    // ── Cache result (lazy-load ComputationCache) ──
    this._cacheResult(input, fusionDetail);

    return {
      Fc_N: v.Fc_N ?? 0,
      Ff_N: v.Ff_N ?? 0,
      Fp_N: v.Fp_N ?? 0,
      torque_Nm: v.torque_Nm ?? 0,
      power_kW: v.power_kW ?? 0,
      interface_temp_C: v.interface_temp_C ?? null,
      deflection_um: v.deflection_um ?? null,
      max_stable_ap_mm: v.max_stable_ap_mm ?? null,
      predicted_Ra_um: v.predicted_Ra_um ?? null,
      chip_thinning_factor: chipThinFactor,
      adjusted_fz_mm: adjustedFz,
      fusion_detail: fusionDetail,
      block_results: blockResults,
    };
  }

  // ── Input Validation ─────────────────────────────────────────────

  /**
   * Validate required inputs. Throws on invalid data.
   * Boundary checks per engineering rigor requirements.
   */
  private _validateInput(input: FusionOrchestratorInput): void {
    if (!input.iso_group || !["P", "M", "K", "N", "S", "H"].includes(input.iso_group)) {
      throw new Error(`Invalid iso_group: ${input.iso_group}. Must be P|M|K|N|S|H.`);
    }
    if (input.kc1_1 <= 0 || input.kc1_1 > 10000) {
      throw new Error(`kc1_1 out of range: ${input.kc1_1}. Expected 1-10000 N/mm².`);
    }
    if (input.mc < 0 || input.mc > 1) {
      throw new Error(`mc out of range: ${input.mc}. Expected 0-1.`);
    }
    if (input.tool_diameter_mm <= 0 || input.tool_diameter_mm > 500) {
      throw new Error(`tool_diameter_mm out of range: ${input.tool_diameter_mm}. Expected 0.1-500 mm.`);
    }
    if (input.flutes < 1 || input.flutes > 20) {
      throw new Error(`flutes out of range: ${input.flutes}. Expected 1-20.`);
    }
    if (input.cutting_speed_mpm <= 0) {
      throw new Error(`cutting_speed_mpm must be positive: ${input.cutting_speed_mpm}`);
    }
    if (input.feed_per_tooth_mm <= 0) {
      throw new Error(`feed_per_tooth_mm must be positive: ${input.feed_per_tooth_mm}`);
    }
    if (input.axial_depth_mm <= 0) {
      throw new Error(`axial_depth_mm must be positive: ${input.axial_depth_mm}`);
    }
    if (input.radial_depth_mm <= 0) {
      throw new Error(`radial_depth_mm must be positive: ${input.radial_depth_mm}`);
    }
    if (input.fusion_tier !== undefined && ![1, 2, 3, 4].includes(input.fusion_tier)) {
      throw new Error(`fusion_tier must be 1-4, got: ${input.fusion_tier}`);
    }
  }

  // ── Tier Auto-Selection ──────────────────────────────────────────

  /**
   * Score available inputs to auto-select the appropriate tier.
   *
   * Scoring:
   *   - Each known field adds its weight to the score
   *   - Score < 8:  Tier 1 (basic inputs only)
   *   - Score 8-10: Tier 2 (adequate for convergence)
   *   - Score 10-12: Tier 3 (rich inputs, worth acceleration)
   *   - Score > 12: Tier 4 (full data, Jacobian worthwhile)
   */
  private _autoSelectTier(input: FusionOrchestratorInput): FusionTier {
    let score = 0;
    const inputRecord = input as unknown as Record<string, unknown>;

    for (const [key, weight] of Object.entries(TIER_SCORE_WEIGHTS)) {
      const val = inputRecord[key];
      if (val !== undefined && val !== null) {
        score += weight;
      }
    }

    if (score >= 12) return 4;
    if (score >= 10) return 3;
    if (score >= 8) return 2;
    return 1;
  }

  // ── Params Builder ───────────────────────────────────────────────

  /**
   * Convert FusionOrchestratorInput to the flat Record<string, unknown>
   * that plugins read from PluginContext.params.
   */
  private _buildParams(input: FusionOrchestratorInput): Record<string, unknown> {
    const p: Record<string, unknown> = {};

    // Required fields
    p.iso_group = input.iso_group;
    p.kc1_1 = input.kc1_1;
    p.mc = input.mc;
    p.tool_diameter_mm = input.tool_diameter_mm;
    p.flutes = input.flutes;
    p.cutting_speed_mpm = input.cutting_speed_mpm;
    p.feed_per_tooth_mm = input.feed_per_tooth_mm;
    p.spindle_rpm = input.spindle_rpm;
    p.axial_depth_mm = input.axial_depth_mm;
    p.radial_depth_mm = input.radial_depth_mm;

    // Optional fields — only set if provided
    if (input.tool_material !== undefined) p.tool_material = input.tool_material;
    if (input.tool_stickout_mm !== undefined) p.tool_stickout_mm = input.tool_stickout_mm;
    if (input.corner_radius_mm !== undefined) p.corner_radius_mm = input.corner_radius_mm;
    if (input.tool_coating !== undefined) p.tool_coating = input.tool_coating;
    if (input.helix_angle_deg !== undefined) p.helix_angle_deg = input.helix_angle_deg;
    if (input.edge_radius_mm !== undefined) p.edge_radius_mm = input.edge_radius_mm;
    if (input.flute_length_mm !== undefined) p.flute_length_mm = input.flute_length_mm;
    if (input.machine_max_rpm !== undefined) p.machine_max_rpm = input.machine_max_rpm;
    if (input.machine_power_kw !== undefined) p.machine_power_kw = input.machine_power_kw;
    if (input.natural_frequency_hz !== undefined) p.natural_frequency_hz = input.natural_frequency_hz;
    if (input.damping_ratio !== undefined) p.damping_ratio = input.damping_ratio;
    if (input.system_stiffness_n_um !== undefined) p.system_stiffness_n_um = input.system_stiffness_n_um;
    if (input.coolant_type !== undefined) p.coolant_type = input.coolant_type;
    if (input.approach_angle_deg !== undefined) p.approach_angle_deg = input.approach_angle_deg;
    if (input.rake_angle_deg !== undefined) p.rake_angle_deg = input.rake_angle_deg;
    if (input.flank_wear_mm !== undefined) p.flank_wear_mm = input.flank_wear_mm;
    if (input.feature_tolerance_mm !== undefined) p.feature_tolerance_mm = input.feature_tolerance_mm;
    if (input.material !== undefined) p.material = input.material;

    // Computed: feed rate
    p.feed_rate_mmmin = input.feed_per_tooth_mm * input.flutes * input.spindle_rpm;

    return p;
  }

  // ── Tier 1: Single-Pass Execution ────────────────────────────────

  /**
   * Execute plugins in a single pass without convergence loops.
   * Each plugin runs once; no iteration, no relaxation.
   *
   * Tier 1 is for quick estimates and novice users.
   */
  private _executeTier1(
    plugins: PhysicsPlugin[],
    initialState: FusionState,
    params: Record<string, unknown>,
    isoGroup: ISOGroup,
    tier: FusionTier,
  ): { state: FusionState; pluginDetails: PluginExecutionDetail[] } {
    const state: FusionState = {
      values: { ...initialState.values },
      plugin_confidence: { ...initialState.plugin_confidence },
      skipped_plugins: [...initialState.skipped_plugins],
      formulas_used: [...initialState.formulas_used],
      warnings: [...initialState.warnings],
      execution_order: [...initialState.execution_order],
    };
    const details: PluginExecutionDetail[] = [];

    for (const plugin of plugins) {
      const pluginStart = performance.now();
      const ctx: PluginContext = {
        state: { ...state, values: { ...state.values } },
        tier,
        iteration: 0,
        iso_group: isoGroup,
        alpha: 1.0, // No relaxation for Tier 1
        params,
      };

      if (!plugin.canRun(ctx)) {
        state.skipped_plugins.push({
          plugin_id: plugin.descriptor.id,
          reason: "canRun_false",
          penalty: plugin.descriptor.skip_penalty,
        });
        details.push({
          plugin_id: plugin.descriptor.id,
          status: "skipped",
          time_ms: performance.now() - pluginStart,
          outputs: {},
          confidence: 0,
          skip_reason: "canRun() returned false — missing inputs",
        });
        continue;
      }

      try {
        const output: PluginOutput = plugin.compute(ctx);

        // Merge outputs into state (no relaxation for Tier 1)
        for (const [key, val] of Object.entries(output.values)) {
          if (Number.isFinite(val)) {
            state.values[key] = val;
          } else {
            state.warnings.push(`${plugin.descriptor.id}: non-finite value for ${key}, skipped`);
          }
        }

        state.plugin_confidence[plugin.descriptor.id] = output.confidence;
        state.execution_order.push(plugin.descriptor.id);
        if (output.formulas_used) state.formulas_used.push(...output.formulas_used);
        if (output.warnings) state.warnings.push(...output.warnings);

        details.push({
          plugin_id: plugin.descriptor.id,
          status: "ok",
          time_ms: performance.now() - pluginStart,
          outputs: output.values,
          confidence: output.confidence,
        });
      } catch (e: any) {
        state.warnings.push(`${plugin.descriptor.id} error: ${e.message}`);
        state.skipped_plugins.push({
          plugin_id: plugin.descriptor.id,
          reason: "error",
          penalty: plugin.descriptor.skip_penalty,
        });
        details.push({
          plugin_id: plugin.descriptor.id,
          status: "error",
          time_ms: performance.now() - pluginStart,
          outputs: {},
          confidence: 0,
          error: e.message,
        });
      }
    }

    return { state, pluginDetails: details };
  }

  // ── Tier 2+: Convergence Execution ───────────────────────────────

  /**
   * Execute plugins with full FTW/FES/FDT convergence.
   * Delegates to PhysicsFusionConvergenceEngine.
   */
  private _executeTier2Plus(
    plugins: PhysicsPlugin[],
    initialState: FusionState,
    params: Record<string, unknown>,
    isoGroup: ISOGroup,
    tier: FusionTier,
    config: ConvergenceConfig,
  ): {
    state: FusionState;
    convergence: LoopConvergenceReport[];
    totalIterations: number;
    pluginDetails: PluginExecutionDetail[];
    overallStatus: ConvergenceStatus;
  } {
    const convInput: ConvergenceInput = {
      plugins,
      initial_state: initialState,
      config,
      tier,
      iso_group: isoGroup,
      params,
    };

    try {
      const result: ConvergenceResult = physicsFusionConvergenceEngine.converge(convInput);
      return {
        state: result.final_state,
        convergence: result.convergence,
        totalIterations: result.total_iterations,
        pluginDetails: result.plugin_details,
        overallStatus: result.overall_status,
      };
    } catch (e: unknown) {
      // Convergence engine internal failure — fall back to single-pass
      const msg = e instanceof Error ? e.message : String(e);
      const fallback = this._executeTier1(plugins, initialState, params, isoGroup, tier);
      fallback.state.warnings.push(`Convergence engine error (fell back to single-pass): ${msg}`);
      return {
        state: fallback.state,
        convergence: [],
        totalIterations: 0,
        pluginDetails: fallback.pluginDetails,
        overallStatus: "converged" as ConvergenceStatus,
      };
    }
  }

  // ── Tier 4: Jacobian Computation ─────────────────────────────────

  /**
   * Compute the Jacobian matrix via central finite differences.
   *
   * For each of 4 input parameters (ae, ap, Vc, fz):
   *   - Perturb by +h and -h (h = 5% of nominal)
   *   - Run full convergence at each perturbation point
   *   - J[i][j] = (f_i(x + h_j) - f_i(x - h_j)) / (2 × h_j)
   *
   * Total: 8 extra convergence runs (2 per input × 4 inputs).
   *
   * Reference: Altintas (2012) Ch. 2 — sensitivity analysis via finite differences
   */
  private _computeJacobian(
    plugins: PhysicsPlugin[],
    baseParams: Record<string, unknown>,
    isoGroup: ISOGroup,
    tier: FusionTier,
    config: ConvergenceConfig,
    baseState: FusionState,
  ): JacobianSnapshot {
    const inputKeys = JACOBIAN_INPUT_KEYS;
    const outputKeys = JACOBIAN_OUTPUT_KEYS.filter(k => baseState.values[k] !== undefined);

    // Operating point
    const operatingPoint: Record<string, number> = {};
    for (const k of inputKeys) {
      operatingPoint[k] = baseParams[k] as number;
    }

    // Initialize matrix
    const matrix: number[][] = [];
    for (let i = 0; i < outputKeys.length; i++) {
      matrix.push(new Array(inputKeys.length).fill(0));
    }

    // Central finite differences
    for (let j = 0; j < inputKeys.length; j++) {
      const key = inputKeys[j];
      const x0 = baseParams[key] as number;
      if (x0 === undefined || x0 === 0) continue;

      const h = Math.abs(x0 * JACOBIAN_PERTURBATION);
      if (h === 0) continue;

      // Forward perturbation
      const paramsPlus = { ...baseParams, [key]: x0 + h };
      const plusResult = this._executeTier2Plus(
        plugins, createFusionState(), paramsPlus, isoGroup, tier, config,
      );

      // Backward perturbation
      const paramsMinus = { ...baseParams, [key]: x0 - h };
      const minusResult = this._executeTier2Plus(
        plugins, createFusionState(), paramsMinus, isoGroup, tier, config,
      );

      // Compute partial derivatives
      for (let i = 0; i < outputKeys.length; i++) {
        const oKey = outputKeys[i];
        const fPlus = plusResult.state.values[oKey] ?? 0;
        const fMinus = minusResult.state.values[oKey] ?? 0;
        matrix[i][j] = (fPlus - fMinus) / (2 * h);
      }
    }

    return {
      input_keys: inputKeys,
      output_keys: outputKeys,
      matrix,
      operating_point: operatingPoint,
      validity_threshold: JACOBIAN_VALIDITY,
    };
  }

  // ── Jacobian Delta Application ───────────────────────────────────

  /**
   * Apply Jacobian delta for per-block variability.
   *
   *   δ_output ≈ J × δ_input
   *
   * Returns the adjusted output values for a block, or null if the
   * delta exceeds the validity threshold (requires full re-convergence).
   */
  private _applyJacobianDelta(
    jacobian: JacobianSnapshot,
    baseState: FusionState,
    block: BlockEngagement,
    baseParams: Record<string, unknown>,
  ): Record<string, number> | null {
    const deltaInput: number[] = [];
    const blockValues: Record<string, number | undefined> = {
      radial_depth_mm: block.ae_mm,
      axial_depth_mm: block.ap_mm,
      cutting_speed_mpm: block.Vc_mpm,
      feed_per_tooth_mm: block.fz_mm,
    };

    // Check validity: |δx/x| < threshold for all inputs
    for (let j = 0; j < jacobian.input_keys.length; j++) {
      const key = jacobian.input_keys[j];
      const x0 = jacobian.operating_point[key];
      const xNew = blockValues[key] ?? x0;
      const dx = xNew - x0;
      deltaInput.push(dx);

      if (x0 !== 0 && Math.abs(dx / x0) > jacobian.validity_threshold) {
        return null; // Delta too large — need full re-convergence
      }
    }

    // δ_output = J × δ_input
    const result: Record<string, number> = {};
    for (let i = 0; i < jacobian.output_keys.length; i++) {
      const oKey = jacobian.output_keys[i];
      const baseVal = baseState.values[oKey] ?? 0;
      let delta = 0;
      for (let j = 0; j < jacobian.input_keys.length; j++) {
        delta += jacobian.matrix[i][j] * deltaInput[j];
      }
      result[oKey] = baseVal + delta;
    }

    return result;
  }

  // ── Chip Thinning ────────────────────────────────────────────────

  /**
   * Compute chip-thinning feed adjustment factor.
   *
   * For partial radial engagement (ae < D), the actual chip thickness
   * is less than fz. To maintain the target chip load:
   *   fz_adjusted = fz_nominal / sqrt(1 - (1 - 2·ae/D)²)
   *
   * This factor is always >= 1.0 (feed increases for lighter engagement).
   *
   * Reference: Sandvik Coromant "Milling" guide — chip thinning compensation
   */
  private _chipThinningFactor(ae: number, D: number): number {
    if (D <= 0 || ae <= 0) return 1.0;
    if (ae >= D / 2) return 1.0; // No thinning at ≥50% engagement (Sandvik guideline)

    const ratio = ae / D;
    const inner = 1 - 2 * ratio;
    const denominator = Math.sqrt(1 - inner * inner);

    if (denominator <= 0.01) return 1.0; // Avoid division by near-zero
    return 1.0 / denominator;
  }

  // ── Confidence Scoring ───────────────────────────────────────────

  /**
   * Compute overall confidence from per-plugin confidences minus skip penalties.
   *
   * Method: geometric mean of plugin confidences × (1 - total_skip_penalty)
   * This penalizes both low-confidence plugins and missing plugins.
   */
  private _computeConfidence(state: FusionState, skipPenalty: number): number {
    const confidences = Object.values(state.plugin_confidence);
    if (confidences.length === 0) return 0;

    // Geometric mean of plugin confidences
    const logSum = confidences.reduce((sum, c) => sum + Math.log(Math.max(c, 0.01)), 0);
    const geoMean = Math.exp(logSum / confidences.length);

    // Penalty for skipped plugins
    const adjusted = geoMean * (1 - Math.min(skipPenalty, 0.95));

    return Math.max(0, Math.min(1, adjusted));
  }

  // ── FusionDetail Builder ─────────────────────────────────────────

  /**
   * Build the FusionDetail metadata object.
   */
  private _buildFusionDetail(
    tier: FusionTier,
    tierSource: "user" | "auto",
    state: FusionState,
    convergence: LoopConvergenceReport[],
    totalIterations: number,
    pluginDetails: PluginExecutionDetail[],
    startTime: number,
    jacobian: JacobianSnapshot | undefined,
    skipPenalty: number,
  ): FusionDetail {
    return {
      tier_executed: tier,
      tier_source: tierSource,
      final_state: state,
      overall_confidence: this._computeConfidence(state, skipPenalty),
      convergence,
      total_iterations: totalIterations,
      compute_time_ms: performance.now() - startTime,
      plugin_details: pluginDetails,
      jacobian,
    };
  }

  // ── Empty Result Builder ─────────────────────────────────────────

  /**
   * Build a result when no plugins are available (all skipped).
   */
  private _buildEmptyResult(
    state: FusionState,
    tier: FusionTier,
    tierSource: "user" | "auto",
    skipPenalty: number,
    chipThinFactor: number,
    adjustedFz: number,
    startTime: number,
    skipped: SkippedPlugin[],
  ): FusionOrchestratorResult {
    const detail = this._buildFusionDetail(
      tier, tierSource, state, [], 0, [], startTime, undefined, skipPenalty,
    );

    return {
      Fc_N: 0, Ff_N: 0, Fp_N: 0, torque_Nm: 0, power_kW: 0,
      interface_temp_C: null, deflection_um: null,
      max_stable_ap_mm: null, predicted_Ra_um: null,
      chip_thinning_factor: chipThinFactor,
      adjusted_fz_mm: adjustedFz,
      fusion_detail: detail,
    };
  }

  // ── Serialization ────────────────────────────────────────────────

  /**
   * Serialize a FusionState to JSON for checkpoint/resume or multi-op continuity.
   * Round-trip guarantee: deserialize(serialize(state)) ≈ state within floating point.
   */
  serializeFusionState(state: FusionState): string {
    return JSON.stringify({
      v: 1, // Schema version for future compatibility
      values: state.values,
      plugin_confidence: state.plugin_confidence,
      skipped_plugins: state.skipped_plugins,
      formulas_used: state.formulas_used,
      warnings: state.warnings,
      execution_order: state.execution_order,
    });
  }

  /**
   * Deserialize a FusionState from JSON.
   * Validates schema version and field presence.
   */
  deserializeFusionState(json: string): FusionState {
    const obj = JSON.parse(json);
    if (obj.v !== 1) {
      throw new Error(`Unknown FusionState schema version: ${obj.v}`);
    }
    return {
      values: obj.values ?? {},
      plugin_confidence: obj.plugin_confidence ?? {},
      skipped_plugins: obj.skipped_plugins ?? [],
      formulas_used: obj.formulas_used ?? [],
      warnings: obj.warnings ?? [],
      execution_order: obj.execution_order ?? [],
    };
  }

  // ── EventBus Integration ─────────────────────────────────────────

  /**
   * Publish physics_fusion_completed event via EventBus.
   * Lazy-loaded to avoid hard dependency.
   */
  private _publishEvent(detail: FusionDetail, input: FusionOrchestratorInput): void {
    try {
      const { eventBus } = require("./EventBus.js");
      eventBus.publish("physics_fusion_completed", {
        tier: detail.tier_executed,
        overall_confidence: detail.overall_confidence,
        total_iterations: detail.total_iterations,
        compute_time_ms: detail.compute_time_ms,
        iso_group: input.iso_group,
        material: input.material,
        status: detail.convergence.length > 0
          ? detail.convergence[detail.convergence.length - 1].status
          : "single_pass",
      }, {
        category: "calculation",
        priority: "normal",
        source: "PhysicsFusionOrchestratorEngine",
      });
    } catch {
      // EventBus not available — silently skip
    }
  }

  // ── Cache Integration ────────────────────────────────────────────

  /**
   * Cache the fusion result via ComputationCache.
   * Uses STANDARD tier (120s TTL).
   */
  private _cacheResult(input: FusionOrchestratorInput, detail: FusionDetail): void {
    try {
      const { computationCache } = require("./ComputationCache.js");
      const cacheKey = this._makeCacheKey(input);
      computationCache.set("physics_fusion", { _key: cacheKey, ...input }, detail, [
        "material_properties",
        "tool_geometry",
      ]);
    } catch {
      // Cache not available — skip
    }
  }

  /**
   * Build a deterministic cache key from input parameters.
   * Includes all physics-relevant fields; excludes metadata.
   */
  private _makeCacheKey(input: FusionOrchestratorInput): string {
    const keyFields = [
      input.iso_group, input.kc1_1, input.mc,
      input.tool_diameter_mm, input.flutes,
      input.cutting_speed_mpm, input.feed_per_tooth_mm, input.spindle_rpm,
      input.axial_depth_mm, input.radial_depth_mm,
      input.tool_material ?? "", input.tool_stickout_mm ?? "",
      input.corner_radius_mm ?? "", input.tool_coating ?? "",
      input.coolant_type ?? "", input.fusion_tier ?? "auto",
      // Additional physics-relevant fields (architect scrutiny fix)
      input.approach_angle_deg ?? "", input.rake_angle_deg ?? "",
      input.flank_wear_mm ?? "", input.helix_angle_deg ?? "",
      input.edge_radius_mm ?? "", input.feature_tolerance_mm ?? "",
      input.natural_frequency_hz ?? "", input.damping_ratio ?? "",
      input.machine_max_rpm ?? "", input.system_stiffness_n_um ?? "",
    ];
    return `fusion:${keyFields.join(":")}`;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const physicsFusionOrchestratorEngine = new PhysicsFusionOrchestratorEngine();
