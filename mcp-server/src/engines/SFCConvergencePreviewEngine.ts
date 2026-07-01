/**
 * SFCConvergencePreviewEngine -- READ-ONLY convergence preview (SFC-CONVERGENCE/U-SFC-PREVIEW).
 *
 * Shows, for any SFC input, exactly what enabling PRISM_SFC_CONVERGE would change:
 * production path (SpeedFeedOrchestratorEngine.compute) vs convergence path
 * (UltimateSpeedFeedEngine.calculate via orchestratorToUltimateInput adapter).
 *
 * SAFETY CONTRACT:
 *   - NEVER reads or mutates process.env.PRISM_SFC_CONVERGE.
 *   - NEVER writes cutting params to any store.
 *   - Pure computation: both paths are invoked in-process with no side effects.
 *   - The convergence path bypasses the orchestrator flag entirely -- we call
 *     ultimateSpeedFeedEngine.calculate(orchestratorToUltimateInput(input)) directly.
 *
 * Entry point: previewWith(rawInput, orchestrator, ultimate)
 * Dispatcher calls this with lazily-imported engine singletons (avoids circular imports,
 * enables clean unit testing with mocked engines).
 *
 * Output: { production, converged, delta, recommendation, safety_flags, readonly_mode: true }
 *
 * @module engines/SFCConvergencePreviewEngine
 * @milestone SFC-CONVERGENCE/U-SFC-PREVIEW (slot:oscar, 2026-06-22)
 */

import { z } from "zod";
import { orchestratorToUltimateInput } from "./lib/orchestrator-input-adapter.js";
import type { OrchestratorInput, OrchestratorResult } from "./SpeedFeedOrchestratorEngine.js";
import type { UltimateSpeedFeedInput, UltimateSpeedFeedResult } from "./UltimateSpeedFeedEngine.js";

/** AtomicValue<T> is the return wrapper SpeedFeedOrchestratorEngine.compute() uses. */
interface AtomicValue<T> { value: T; confidence?: number; source?: string; }

// ============================================================================
// THRESHOLDS (named constants -- no magic numbers in logic)
// ============================================================================

/** Tool life floor below which a case is flagged as safety-relevant (min) */
const TOOL_LIFE_FLOOR_MIN = 15;
/** Vc delta below this (%) means no significant speed change */
const VC_ALIGNED_PCT_THRESHOLD = 5;
/** Life delta below this (%) means no significant life change */
const LIFE_ALIGNED_PCT_THRESHOLD = 10;
/** Power increase above this (%) warrants a machine-capacity review flag */
const POWER_REVIEW_PCT_THRESHOLD = 200;
/** Cutting-force increase above this (%) warrants a workholding review flag */
const FORCE_REVIEW_PCT_THRESHOLD = 150;

// ============================================================================
// INPUT SCHEMA
// ============================================================================

/**
 * Input schema for sfc_convergence_preview.
 * Mirrors OrchestratorInput physics-relevant fields. Orchestrator-only resolution
 * fields (machine_name, cam_system, etc.) are accepted as pass-throughs so an
 * existing sf_orchestrate payload can be re-used unchanged.
 */
export const SFCConvergencePreviewInputSchema = z.object({
  // Material
  material:     z.string().optional(),
  iso_group:    z.enum(["P", "M", "K", "N", "S", "H"]).optional(),
  hardness_hb:  z.number().positive().optional(),
  hardness_hrc: z.number().positive().optional(),

  // Tool geometry
  tool_diameter_mm:  z.number().positive().optional(),
  flutes:            z.number().int().positive().optional(),
  tool_material:     z.enum(["carbide", "hss", "cermet", "ceramic", "cbn", "pcd"]).optional(),
  tool_coating:      z.string().optional(),
  helix_angle_deg:   z.number().min(0).max(90).optional(),
  corner_radius_mm:  z.number().min(0).optional(),
  flute_length_mm:   z.number().positive().optional(),
  overall_length_mm: z.number().positive().optional(),
  tool_stickout_mm:  z.number().positive().optional(),
  edge_radius_mm:    z.number().min(0).optional(),

  // Operation
  operation: z.enum([
    "milling", "turning", "drilling", "tapping", "reaming", "boring", "thread_milling",
  ]).optional(),
  cut_type: z.enum(["roughing", "semi_finishing", "finishing"]).optional(),
  strategy: z.enum([
    "conventional", "adaptive", "trochoidal", "hsm", "hpc", "plunge", "slot",
  ]).optional(),

  // Engagement
  axial_depth_mm:   z.number().positive().optional(),
  radial_depth_mm:  z.number().positive().optional(),
  radial_depth_pct: z.number().min(0).max(100).optional(),

  // Machine envelope
  machine_power_kw:      z.number().positive().optional(),
  machine_max_rpm:       z.number().positive().optional(),
  machine_max_torque_nm: z.number().positive().optional(),
  machine_rigidity:      z.enum(["low", "medium", "high"]).optional(),

  // Workpiece geometry
  workpiece_diameter_mm: z.number().positive().optional(),
  workpiece_length_mm:   z.number().positive().optional(),
  feature_tolerance_mm:  z.number().positive().optional(),

  // Dynamics
  system_stiffness_n_m: z.number().positive().optional(),
  natural_frequency_hz: z.number().positive().optional(),
  damping_ratio:        z.number().min(0).max(1).optional(),

  // Economics
  tool_cost_usd:        z.number().min(0).optional(),
  machine_cost_per_min: z.number().min(0).optional(),
  tool_change_time_min: z.number().min(0).optional(),

  // Mode
  optimize_for: z.enum([
    "tool_life", "productivity", "surface_finish", "balanced", "cost",
  ]).optional(),
  coolant_type: z.enum([
    "flood", "mist", "MQL", "dry", "cryogenic", "through_tool",
  ]).optional(),

  // Pass-through orchestrator-only fields (accepted, not forwarded to engine path)
  machine_name:     z.string().optional(),
  machine_type:     z.string().optional(),
  cam_system:       z.string().optional(),
  cam_strategy:     z.string().optional(),
  workholding_type: z.string().optional(),
  output_detail:    z.enum(["minimal", "standard", "full"]).optional(),
}).strict();

export type SFCConvergencePreviewInput = z.infer<typeof SFCConvergencePreviewInputSchema>;

// ============================================================================
// OUTPUT TYPES
// ============================================================================

export interface SFCPhysicsSnapshot {
  /** Cutting speed (m/min) */
  vc_mpm: number;
  /** Spindle RPM */
  rpm: number;
  /** Feed rate (mm/min) */
  feed_mmmin: number;
  /** Tangential cutting force Fc (N) */
  fc_N: number;
  /** Net power (kW) */
  power_kw: number;
  /** Torque (Nm) */
  torque_Nm: number;
  /** Taylor tool life (min) */
  tool_life_min: number;
  /** Surface roughness Ra (um) */
  ra_um: number;
}

export interface SFCQuantityDelta {
  /** Absolute difference (converged - production) */
  abs: number;
  /** Percentage change relative to production: (converged - production) / |production| * 100 */
  pct: number;
}

export interface SFCConvergenceDelta {
  vc:         SFCQuantityDelta;
  rpm:        SFCQuantityDelta;
  feed_mmmin: SFCQuantityDelta;
  fc_N:       SFCQuantityDelta;
  power_kw:   SFCQuantityDelta;
  torque_Nm:  SFCQuantityDelta;
  tool_life:  SFCQuantityDelta;
  ra_um:      SFCQuantityDelta;
}

export interface SFCSafetyFlag {
  field:    string;
  severity: "warning" | "review";
  message:  string;
}

export interface SFCConvergencePreviewResult {
  /** Current production path: SpeedFeedOrchestratorEngine.compute() */
  production: SFCPhysicsSnapshot;
  /** Convergence path: UltimateSpeedFeedEngine.calculate(orchestratorToUltimateInput(input)) */
  converged: SFCPhysicsSnapshot;
  /** Per-quantity deltas (converged minus production) */
  delta: SFCConvergenceDelta;
  /** Human-readable recommendation note */
  recommendation: string;
  /** Safety-relevant flags (over-speed fixes, hotter-running cases needing review) */
  safety_flags: SFCSafetyFlag[];
  /** Always true -- env is never mutated by this action */
  readonly_mode: true;
}

export type SFCConvergencePreviewError = { success: false; error: string };
export type SFCConvergencePreviewOutput = SFCConvergencePreviewResult | SFCConvergencePreviewError;

// ============================================================================
// PURE HELPERS
// ============================================================================

/** Safe pct delta: (converged - production) / |production| * 100. Returns 0 on non-finite. */
function pctDelta(production: number, converged: number): number {
  if (!isFinite(production) || !isFinite(converged)) return 0;
  if (production === 0) return converged === 0 ? 0 : Infinity;
  return ((converged - production) / Math.abs(production)) * 100;
}

function quantityDelta(prod: number, conv: number): SFCQuantityDelta {
  return { abs: conv - prod, pct: pctDelta(prod, conv) };
}

/** Extract the 8-quantity physics snapshot from an OrchestratorResult. */
function snapshotFromOrchestrator(r: OrchestratorResult): SFCPhysicsSnapshot {
  return {
    vc_mpm:        r.cutting_speed_mpm,
    rpm:           r.spindle_rpm,
    feed_mmmin:    r.feed_rate_mmmin,
    fc_N:          r.tangential_force_N,
    power_kw:      r.power_kw,
    torque_Nm:     r.torque_Nm,
    tool_life_min: r.tool_life_min,
    ra_um:         r.surface_finish_Ra_um,
  };
}

/**
 * Extract the 8-quantity physics snapshot from a UltimateSpeedFeedResult.
 * Every core parameter is an OptimizedValue read via `.value` -- the engine
 * already resolves spindle_rpm + feed_rate, so there is no re-derivation here.
 */
function snapshotFromUltimate(r: UltimateSpeedFeedResult): SFCPhysicsSnapshot {
  return {
    vc_mpm:        r.cutting_speed?.value ?? 0,
    rpm:           r.spindle_rpm?.value ?? 0,
    feed_mmmin:    r.feed_rate?.value ?? 0,
    fc_N:          r.forces?.tangential_force_N?.value ?? 0,
    power_kw:      r.power?.required_power_kw?.value ?? 0,
    torque_Nm:     r.forces?.torque_Nm?.value ?? 0,
    tool_life_min: r.tool_life?.life_minutes?.value ?? 0,
    ra_um:         r.surface_finish?.practical_ra_um?.value ?? 0,
  };
}

/** Determine whether a snapshot contains any non-finite values. */
function findNonFiniteField(snap: SFCPhysicsSnapshot): string | null {
  for (const [k, v] of Object.entries(snap)) {
    if (!isFinite(v as number)) return k;
  }
  return null;
}

/** Build safety flags by comparing the two snapshots. */
function buildSafetyFlags(
  prod: SFCPhysicsSnapshot,
  conv: SFCPhysicsSnapshot,
): SFCSafetyFlag[] {
  const flags: SFCSafetyFlag[] = [];

  // Over-speed fix: production life too short, engine fixes it
  if (prod.tool_life_min < TOOL_LIFE_FLOOR_MIN && conv.tool_life_min >= TOOL_LIFE_FLOOR_MIN) {
    flags.push({
      field:    "tool_life_min",
      severity: "warning",
      message:  `OVER-SPEED FIX: production life ${prod.tool_life_min.toFixed(0)}min < ${TOOL_LIFE_FLOOR_MIN}min floor; engine ${conv.tool_life_min.toFixed(0)}min (safer)`,
    });
  }

  // Convergence runs hotter: engine life below floor AND below production
  if (conv.tool_life_min < TOOL_LIFE_FLOOR_MIN && conv.tool_life_min < prod.tool_life_min) {
    flags.push({
      field:    "tool_life_min",
      severity: "review",
      message:  `engine life ${conv.tool_life_min.toFixed(0)}min < ${TOOL_LIFE_FLOOR_MIN}min floor and below production ${prod.tool_life_min.toFixed(0)}min -- review`,
    });
  }

  // Large power jump: flag for machine capacity review
  const powerPct = pctDelta(prod.power_kw, conv.power_kw);
  if (powerPct > POWER_REVIEW_PCT_THRESHOLD) {
    flags.push({
      field:    "power_kw",
      severity: "review",
      message:  `power increase ${powerPct.toFixed(0)}% (${prod.power_kw.toFixed(2)} -> ${conv.power_kw.toFixed(2)} kW) -- verify machine capacity`,
    });
  }

  // Large force jump: flag for workholding review
  const fcPct = pctDelta(prod.fc_N, conv.fc_N);
  if (fcPct > FORCE_REVIEW_PCT_THRESHOLD) {
    flags.push({
      field:    "fc_N",
      severity: "review",
      message:  `cutting force increase ${fcPct.toFixed(0)}% (${prod.fc_N.toFixed(0)} -> ${conv.fc_N.toFixed(0)} N) -- verify workholding`,
    });
  }

  return flags;
}

/** Build a human-readable recommendation string. */
function buildRecommendation(
  input: SFCConvergencePreviewInput,
  prod: SFCPhysicsSnapshot,
  conv: SFCPhysicsSnapshot,
  flags: SFCSafetyFlag[],
): string {
  const op  = input.operation ?? "milling";
  const mat = input.material ?? (input.iso_group ? `ISO-${input.iso_group}` : "unknown material");
  const vcPct   = pctDelta(prod.vc_mpm,        conv.vc_mpm);
  const lifePct = pctDelta(prod.tool_life_min, conv.tool_life_min);

  const hasOverspeedFix = flags.some(f => f.message.includes("OVER-SPEED FIX"));
  const hasReview       = flags.some(f => f.severity === "review");

  if (hasOverspeedFix) {
    return `${mat} ${op}: convergence FIXES an over-speed case -- production life ${prod.tool_life_min.toFixed(0)}min (below ${TOOL_LIFE_FLOOR_MIN}min floor); engine ${conv.tool_life_min.toFixed(0)}min (safer). Vc ${vcPct.toFixed(0)}% change.`;
  }
  if (hasReview) {
    return `${mat} ${op}: convergence runs hotter -- engine life ${conv.tool_life_min.toFixed(0)}min vs production ${prod.tool_life_min.toFixed(0)}min. Review before approving.`;
  }
  if (Math.abs(vcPct) < VC_ALIGNED_PCT_THRESHOLD && Math.abs(lifePct) < LIFE_ALIGNED_PCT_THRESHOLD) {
    return `${mat} ${op}: production and convergence are closely aligned (Vc delta ${vcPct.toFixed(1)}%, life delta ${lifePct.toFixed(0)}%). No significant change expected.`;
  }
  const vcDir = vcPct > 0
    ? `+${vcPct.toFixed(0)}% Vc productivity gain`
    : `${vcPct.toFixed(0)}% Vc reduction`;
  return `${mat} ${op}: convergence would apply ${vcDir} with ${lifePct.toFixed(0)}% life change.`;
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class SFCConvergencePreviewEngine {
  /**
   * Compute the convergence preview with injected engine singletons.
   *
   * The dispatcher lazy-imports both engines and passes them here, which avoids
   * circular imports at module load time and allows clean unit testing with mocks.
   *
   * Process.env is NEVER read or mutated by this method.
   *
   * @param rawInput    - raw params object from the dispatcher (validated internally)
   * @param orchestrator - SpeedFeedOrchestratorEngine singleton
   * @param ultimate     - UltimateSpeedFeedEngine singleton
   * @returns SFCConvergencePreviewResult on success, or { success: false, error } on failure
   */
  previewWith(
    rawInput: unknown,
    orchestrator: { compute: (i: OrchestratorInput) => AtomicValue<OrchestratorResult> },
    ultimate:     { calculate: (i: UltimateSpeedFeedInput) => UltimateSpeedFeedResult },
  ): SFCConvergencePreviewOutput {
    // --- Input validation (Zod) ---
    const parsed = SFCConvergencePreviewInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: `Invalid input: ${parsed.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
      };
    }
    const input = parsed.data as OrchestratorInput;

    // --- Physics-meaningful minimums ---
    if (!input.material && !input.iso_group) {
      return { success: false, error: "material or iso_group is required for a physics-meaningful preview" };
    }
    const isTurning = input.operation === "turning";
    if (!isTurning && (input.tool_diameter_mm == null || input.tool_diameter_mm <= 0)) {
      return { success: false, error: "tool_diameter_mm > 0 is required for non-turning operations" };
    }

    // --- Production path: orchestrator.compute() returns AtomicValue<OrchestratorResult> ---
    let prodResult: OrchestratorResult;
    try {
      const wrapped = orchestrator.compute(input);
      if (!wrapped || typeof wrapped.value !== "object") {
        return { success: false, error: "Production path returned malformed result (missing .value wrapper)" };
      }
      prodResult = wrapped.value;
    } catch (err) {
      return { success: false, error: `Production path (orchestrator) failed: ${String(err)}` };
    }

    // --- Convergence path: adapter -> ultimate.calculate() (env NOT touched) ---
    let convResult: UltimateSpeedFeedResult;
    try {
      const engineInput = orchestratorToUltimateInput(input);
      convResult = ultimate.calculate(engineInput);
    } catch (err) {
      return { success: false, error: `Convergence path (engine) failed: ${String(err)}` };
    }

    // --- Extract snapshots ---
    const prod = snapshotFromOrchestrator(prodResult);
    const conv = snapshotFromUltimate(convResult);

    // --- Guard: non-finite values in production path means physics resolution failed ---
    const badField = findNonFiniteField(prod);
    if (badField !== null) {
      return { success: false, error: `Production path returned non-finite value for ${badField}` };
    }

    // --- Compute deltas, flags, recommendation ---
    const delta: SFCConvergenceDelta = {
      vc:         quantityDelta(prod.vc_mpm,        conv.vc_mpm),
      rpm:        quantityDelta(prod.rpm,           conv.rpm),
      feed_mmmin: quantityDelta(prod.feed_mmmin,    conv.feed_mmmin),
      fc_N:       quantityDelta(prod.fc_N,          conv.fc_N),
      power_kw:   quantityDelta(prod.power_kw,      conv.power_kw),
      torque_Nm:  quantityDelta(prod.torque_Nm,     conv.torque_Nm),
      tool_life:  quantityDelta(prod.tool_life_min, conv.tool_life_min),
      ra_um:      quantityDelta(prod.ra_um,         conv.ra_um),
    };

    const safety_flags  = buildSafetyFlags(prod, conv);
    const recommendation = buildRecommendation(input, prod, conv, safety_flags);

    return {
      production:    prod,
      converged:     conv,
      delta,
      recommendation,
      safety_flags,
      readonly_mode: true,
    };
  }
}

export const sfcConvergencePreviewEngine = new SFCConvergencePreviewEngine();
