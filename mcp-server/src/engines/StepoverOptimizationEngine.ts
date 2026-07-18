/**
 * StepoverOptimizationEngine — Curvature-adaptive stepover computation
 * =====================================================================
 * Given target scallop height (Ra), surface curvature field, and cutter
 * geometry: computes optimal stepover at each point. Adaptive: reduces
 * stepover in high-curvature regions, increases in flat regions.
 *
 * Cutter formulas:
 * - Ball:   ae = 2·sqrt(2·R·h)  [Choi & Jerard, 1998]
 * - Barrel: ae = 2·sqrt(2·R_barrel·h)  [hyperMILL hm-104 barrel cutter]
 * - Flat:   ae = D (constant, no cusp on flat surfaces)
 * - Bull:   ae = 2·sqrt(2·r_corner·h)
 *
 * Curvature correction: R_eff = 1/(1/R_tool - κ_cross)
 *   where κ_cross = curvature in stepover direction
 *
 * Integration targets: CFSF (constant-force), AMEF (morphed engagement)
 *
 * @module engines/StepoverOptimizationEngine
 * @version 1.0.0
 * @milestone CAMK-MS0/U04
 */

import { cutterContactEngine, type SurfaceDefinition } from "./CutterContactEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export type CutterKind = "ball" | "flat" | "bull_nose" | "barrel";

export interface StepoverCutter {
  type: CutterKind;
  diameter_mm: number;
  corner_radius_mm?: number;
  barrel_radius_mm?: number;
}

/** A point on the surface with local curvature */
export interface SurfacePoint {
  /** Position parameter along toolpath (0..1 or mm) */
  position: number;
  /** Principal curvature κ₁ (1/mm) — along feed direction */
  kappa1: number;
  /** Principal curvature κ₂ (1/mm) — across feed (stepover direction) */
  kappa2: number;
  /** Surface normal angle from Z (degrees) — for engagement angle */
  surface_angle_deg?: number;
}

export interface StepoverInput {
  cutter: StepoverCutter;
  /** Target scallop height in mm */
  target_scallop_mm: number;
  /** Surface curvature field */
  surface_points: SurfacePoint[];
  /** Maximum allowed stepover (% of diameter) */
  max_stepover_pct?: number;
  /** Minimum allowed stepover (mm) */
  min_stepover_mm?: number;
  /** Force constraint: max cutting force (N). Reduces stepover in high-force regions */
  max_force_n?: number;
  /** Material-specific cutting force coefficient (N/mm²) */
  kc_n_per_mm2?: number;
  /** Axial depth of cut for force calculation (mm) */
  ap_mm?: number;
}

export interface StepoverResult {
  /** Stepover at each surface point (mm) */
  stepovers_mm: number[];
  /** Average stepover across all points (mm) */
  avg_stepover_mm: number;
  /** Min/max stepover (mm) */
  min_stepover_mm: number;
  max_stepover_mm: number;
  /** Scallop height at each point (mm) — should all be ≤ target */
  scallop_heights_mm: number[];
  /** Estimated pass count reduction vs constant stepover (%) */
  efficiency_gain_pct: number;
  /** Warnings */
  warnings: string[];
}

/**
 * Input for optimizeFromSurface -- the curvature-source WIRING that chains
 * CutterContactEngine.evaluateSurface (REAL geometric principal curvatures) into
 * the curvature-adaptive stepover optimizer, instead of hand-supplied kappa values.
 */
export interface SurfaceStepoverInput {
  /** Analytical surface (plane/cylinder/cone/sphere/torus) -- CutterContactEngine.SurfaceDefinition. */
  surface: SurfaceDefinition;
  cutter: StepoverCutter;
  /** Target scallop (cusp) height in mm. Must be > 0. */
  target_scallop_mm: number;
  /** Explicit (u,v) parameter locations to sample on the surface (length >= 1). */
  sample_uv: Array<{ u: number; v: number }>;
  /**
   * Which geometric principal curvature feeds the stepover CROSS-feed term.
   * evaluateSurface returns kappa1 and kappa2; the optimizer's effective radius
   * uses the curvature ACROSS the feed (stepover) direction. Default "kappa2".
   * Override to "kappa1" when the toolpath feeds along the kappa2 principal
   * direction -- the u/v <-> kappa mapping differs by surface type (a torus swaps
   * them vs a cylinder), so the caller declares which principal is cross-feed.
   */
  cross_feed_curvature?: "kappa1" | "kappa2";
  // passthrough limits (forwarded verbatim to optimizeStepover)
  max_stepover_pct?: number;
  min_stepover_mm?: number;
  max_force_n?: number;
  kc_n_per_mm2?: number;
  ap_mm?: number;
}

/** One sampled surface location with the curvature evaluated from geometry. */
export interface SampledCurvaturePoint {
  u: number;
  v: number;
  /** Geometric principal curvatures straight from evaluateSurface (1/mm). */
  kappa1: number;
  kappa2: number;
  /** The principal curvature selected as cross-feed and fed to the optimizer (1/mm). */
  cross_feed_kappa: number;
  /** Surface normal angle from +Z at (u,v), degrees in [0, 90]. */
  surface_angle_deg: number;
}

export interface SurfaceStepoverResult extends StepoverResult {
  /** The curvature actually sampled from geometry and fed to the optimizer (provenance). */
  sampled_points: SampledCurvaturePoint[];
  /** Which principal curvature was used as cross-feed. */
  cross_feed_source: "kappa1" | "kappa2";
  source: string;
}

const SURFACE_TYPES = new Set(["plane", "cylinder", "cone", "sphere", "torus"]);

function isFiniteVec3(v: unknown): boolean {
  const p = v as { x?: unknown; y?: unknown; z?: unknown } | null | undefined;
  return !!p && Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z);
}

/**
 * Curved surfaces carry geometry-defining parameters that evaluateSurface would otherwise
 * SILENTLY default (e.g. sphere radius_mm ?? 25, cone half_angle ?? 15). Require them so a
 * missing/zero value fails loud instead of fabricating a plausible-but-wrong curvature. A
 * plane needs none. Throws with a descriptive message on the first missing parameter.
 */
function requireSurfaceGeometry(surface: SurfaceDefinition): void {
  const t = surface.type;
  const pos = (v: unknown): boolean => typeof v === "number" && Number.isFinite(v) && v > 0;
  if ((t === "cylinder" || t === "cone" || t === "sphere" || t === "torus") && !pos(surface.radius_mm)) {
    throw new Error(`optimizeFromSurface: surface.radius_mm must be a positive number for a ${t}`);
  }
  if (t === "torus" && !pos(surface.radius2_mm)) {
    throw new Error("optimizeFromSurface: surface.radius2_mm (torus minor radius) must be a positive number");
  }
  // A ring torus needs major > minor; minor >= major is a self-intersecting horn/spindle torus
  // whose cross-feed curvature is singular (denominator majorR + minorR*cos(phi) crosses zero).
  if (t === "torus" && (surface.radius_mm as number) <= (surface.radius2_mm as number)) {
    throw new Error("optimizeFromSurface: torus radius_mm (major) must exceed radius2_mm (minor) -- a self-intersecting torus has singular curvature");
  }
  if (t === "cone") {
    const a = surface.half_angle_deg;
    if (!(typeof a === "number" && Number.isFinite(a) && a > 0 && a < 90)) {
      throw new Error("optimizeFromSurface: surface.half_angle_deg must be in (0, 90) degrees for a cone");
    }
  }
}

// ============================================================================
// CORE FORMULAS
// ============================================================================

/**
 * Get tool's nominal radius for scallop computation
 */
function getToolRadius(cutter: StepoverCutter): number {
  switch (cutter.type) {
    case "ball":
      return cutter.diameter_mm / 2;
    case "flat":
      return cutter.diameter_mm * 50; // effectively infinite → tiny scallop
    case "bull_nose":
      return cutter.corner_radius_mm ?? 1;
    case "barrel":
      return cutter.barrel_radius_mm ?? cutter.diameter_mm * 5;
    default:
      return cutter.diameter_mm / 2;
  }
}

/**
 * Compute effective radius with curvature correction
 * R_eff = 1/(1/R_tool - κ_cross)
 *
 * Positive κ (convex surface) → R_eff > R_tool → larger stepover ok
 * Negative κ (concave surface) → R_eff < R_tool → smaller stepover needed
 * Zero κ (flat) → R_eff = R_tool
 */
function effectiveRadius(toolR: number, kappaCross: number): number {
  if (Math.abs(kappaCross) < 1e-10) return toolR;
  const invReff = 1 / toolR - kappaCross;
  if (invReff <= 0) return toolR * 100; // near-flat → very large
  return 1 / invReff;
}

/**
 * Compute stepover from target scallop height and effective radius
 * ae = 2·sqrt(2·R_eff·h)
 * Derived from: h = R_eff - sqrt(R_eff² - (ae/2)²)
 */
function stepoverFromScallop(rEff: number, targetH: number): number {
  if (rEff <= 0 || targetH <= 0) return 0;
  if (targetH >= rEff) return 2 * rEff; // max possible
  return 2 * Math.sqrt(2 * rEff * targetH);
}

/**
 * Compute scallop height from stepover and effective radius
 * h = R_eff - sqrt(R_eff² - (ae/2)²)
 */
function scallopFromStepover(rEff: number, ae: number): number {
  if (rEff <= 0) return 0;
  const half = ae / 2;
  if (half >= rEff) return rEff;
  return rEff - Math.sqrt(rEff ** 2 - half ** 2);
}

/**
 * Force-limited stepover: ae_max = F_max / (kc · ap · fz)
 * Simplified: ae_max = F_max / (kc · ap)  (per unit feed)
 */
function forceLimitedStepover(maxForce: number, kc: number, ap: number): number {
  if (kc <= 0 || ap <= 0) return Infinity;
  return maxForce / (kc * ap);
}

// ============================================================================
// MAIN ENGINE
// ============================================================================

/**
 * Compute curvature-adaptive stepover for each surface point
 */
function optimizeStepover(input: StepoverInput): StepoverResult {
  const { cutter, target_scallop_mm, surface_points } = input;
  const maxPct = input.max_stepover_pct ?? 75;
  const minAe = input.min_stepover_mm ?? 0.05;
  const maxAe = (cutter.diameter_mm * maxPct) / 100;
  const toolR = getToolRadius(cutter);
  const warnings: string[] = [];

  // Force limit
  let forceLimitAe = Infinity;
  if (input.max_force_n && input.kc_n_per_mm2 && input.ap_mm) {
    forceLimitAe = forceLimitedStepover(
      input.max_force_n,
      input.kc_n_per_mm2,
      input.ap_mm
    );
    if (forceLimitAe < maxAe) {
      warnings.push(
        `Force limit constrains stepover to ${forceLimitAe.toFixed(2)} mm`
      );
    }
  }

  const stepovers: number[] = [];
  const scallops: number[] = [];

  for (const pt of surface_points) {
    // Effective radius with cross-feed curvature
    const rEff = effectiveRadius(toolR, pt.kappa2);

    // Scallop-based stepover
    let ae = stepoverFromScallop(rEff, target_scallop_mm);

    // Apply limits
    ae = Math.min(ae, maxAe, forceLimitAe);
    ae = Math.max(ae, minAe);

    // Surface angle adjustment: steep walls may need reduced stepover
    if (pt.surface_angle_deg !== undefined && pt.surface_angle_deg < 30) {
      // Steep wall: reduce stepover by angle factor
      const angleFactor = 0.5 + 0.5 * (pt.surface_angle_deg / 30);
      ae *= angleFactor;
      ae = Math.max(ae, minAe);
    }

    stepovers.push(ae);

    // Actual scallop at this stepover
    const actualScallop = scallopFromStepover(rEff, ae);
    scallops.push(actualScallop);
  }

  // Statistics
  const avgAe = stepovers.reduce((a, b) => a + b, 0) / Math.max(stepovers.length, 1);
  const minStepover = Math.min(...stepovers);
  const maxStepover = Math.max(...stepovers);

  // Efficiency: compare adaptive total width vs constant (min stepover)
  // With constant stepover = min(stepovers), we'd need more passes
  const constantPassWidth = minStepover * stepovers.length;
  const adaptivePassWidth = stepovers.reduce((a, b) => a + b, 0);
  const efficiencyGain = constantPassWidth > 0
    ? ((adaptivePassWidth - constantPassWidth) / constantPassWidth) * 100
    : 0;

  // Check scallop compliance
  const exceedCount = scallops.filter(s => s > target_scallop_mm * 1.05).length;
  if (exceedCount > 0) {
    warnings.push(`${exceedCount} points exceed target scallop by >5%`);
  }

  return {
    stepovers_mm: stepovers,
    avg_stepover_mm: avgAe,
    min_stepover_mm: minStepover,
    max_stepover_mm: maxStepover,
    scallop_heights_mm: scallops,
    efficiency_gain_pct: efficiencyGain,
    warnings,
  };
}

/**
 * CURVATURE-SOURCE WIRING (U-CURVATURE-WIRE): sample an analytical surface with
 * CutterContactEngine.evaluateSurface to obtain REAL per-point principal curvatures,
 * then run the curvature-adaptive stepover optimizer. Previously the optimizer's
 * per-point kappa2 could only be hand-supplied (tests only) -- this closes the chain
 * geometry -> curvature -> stepover end to end.
 *
 * @param input SurfaceStepoverInput
 * @returns SurfaceStepoverResult -- the optimizeStepover result plus the sampled curvature provenance
 * @throws if input/surface/cutter is missing, surface.type is unknown, origin/axis are not
 *         finite vectors, the axis is degenerate (|axis| ~ 0), a curved surface is missing its
 *         radius/half-angle, target_scallop_mm <= 0, sample_uv is empty, a sample has non-finite
 *         u/v, or cross_feed_curvature is neither "kappa1" nor "kappa2"
 */
function optimizeFromSurface(input: SurfaceStepoverInput): SurfaceStepoverResult {
  if (!input || typeof input !== "object") {
    throw new Error("optimizeFromSurface: input object is required");
  }
  const { surface, cutter, target_scallop_mm, sample_uv } = input;
  if (!surface || typeof surface !== "object") {
    throw new Error("optimizeFromSurface: surface (SurfaceDefinition) is required");
  }
  const surfType = (surface as { type?: string }).type ?? "";
  if (!SURFACE_TYPES.has(surfType)) {
    throw new Error(
      `optimizeFromSurface: unknown surface.type "${surfType}" -- expected plane|cylinder|cone|sphere|torus`,
    );
  }
  if (!isFiniteVec3(surface.origin) || !isFiniteVec3(surface.axis)) {
    throw new Error("optimizeFromSurface: surface.origin and surface.axis must be finite {x,y,z} vectors");
  }
  // A zero/near-zero axis silently normalizes to +Z inside evaluateSurface -- reject it (fail loud).
  if (!(Math.hypot(surface.axis.x, surface.axis.y, surface.axis.z) > 1e-9)) {
    throw new Error("optimizeFromSurface: surface.axis must be a non-degenerate direction (|axis| > 0)");
  }
  requireSurfaceGeometry(surface);
  if (!cutter || typeof cutter !== "object") {
    throw new Error("optimizeFromSurface: cutter (StepoverCutter) is required");
  }
  if (!Number.isFinite(target_scallop_mm) || target_scallop_mm <= 0) {
    throw new Error("optimizeFromSurface: target_scallop_mm must be a positive finite number");
  }
  if (!Array.isArray(sample_uv) || sample_uv.length === 0) {
    throw new Error("optimizeFromSurface: sample_uv must be a non-empty array of {u,v}");
  }
  const crossSource = input.cross_feed_curvature ?? "kappa2";
  if (crossSource !== "kappa1" && crossSource !== "kappa2") {
    throw new Error('optimizeFromSurface: cross_feed_curvature must be "kappa1" or "kappa2"');
  }

  // Sample the geometry: each (u,v) yields real principal curvatures + a surface normal.
  const sampled: SampledCurvaturePoint[] = sample_uv.map((s, i) => {
    if (!s || !Number.isFinite(s.u) || !Number.isFinite(s.v)) {
      throw new Error(`optimizeFromSurface: sample_uv[${i}] must have finite u and v`);
    }
    const { normal, kappa1, kappa2 } = cutterContactEngine.evaluateSurface(surface, s.u, s.v);
    const cross_feed_kappa = crossSource === "kappa1" ? kappa1 : kappa2;
    const nz = Math.min(1, Math.abs(normal.z)); // normal is unit-length from evaluateSurface
    const surface_angle_deg = (Math.acos(nz) * 180) / Math.PI;
    return { u: s.u, v: s.v, kappa1, kappa2, cross_feed_kappa, surface_angle_deg };
  });

  // Map into the optimizer's SurfacePoint field convention: kappa2 = CROSS-feed (what it reads),
  // kappa1 = ALONG-feed (informational). Only kappa2 drives effectiveRadius.
  const surface_points: SurfacePoint[] = sampled.map((p, i) => {
    const alongKappa = crossSource === "kappa1" ? p.kappa2 : p.kappa1;
    const sp: SurfacePoint = {
      position: sampled.length > 1 ? i / (sampled.length - 1) : 0,
      kappa1: alongKappa,
      kappa2: p.cross_feed_kappa,
    };
    return sp;
  });

  const result = optimizeStepover({
    cutter,
    target_scallop_mm,
    surface_points,
    max_stepover_pct: input.max_stepover_pct,
    min_stepover_mm: input.min_stepover_mm,
    max_force_n: input.max_force_n,
    kc_n_per_mm2: input.kc_n_per_mm2,
    ap_mm: input.ap_mm,
  });

  // Safety: warn when the cutter cannot follow a convex feature -- cross-feed curvature >= tool
  // curvature makes the effective radius saturate, so the stepover clamps to its max with no cut
  // fidelity (the ball is too big for the feature). This is otherwise silent in optimizeStepover.
  const invToolR = 1 / getToolRadius(cutter);
  const fitWarnings: string[] = [];
  for (const p of sampled) {
    if (p.cross_feed_kappa > 0 && p.cross_feed_kappa >= invToolR) {
      fitWarnings.push(
        `Cutter cannot follow convex feature at (u=${p.u}, v=${p.v}): cross-feed curvature ` +
        `${p.cross_feed_kappa.toFixed(4)}/mm >= tool curvature ${invToolR.toFixed(4)}/mm (stepover saturated)`,
      );
    }
  }

  return {
    ...result,
    warnings: [...result.warnings, ...fitWarnings],
    sampled_points: sampled,
    cross_feed_source: crossSource,
    source: "surface-curvature-stepover-bridge",
  };
}

/**
 * Quick stepover for a single point (no array overhead)
 */
function quickStepover(
  cutter: StepoverCutter,
  targetScallop: number,
  kappaCross = 0
): number {
  const toolR = getToolRadius(cutter);
  const rEff = effectiveRadius(toolR, kappaCross);
  return stepoverFromScallop(rEff, targetScallop);
}

/**
 * Compare cutter types for optimal scallop performance
 */
function compareCutters(
  cutters: StepoverCutter[],
  targetScallop: number,
  kappaCross = 0
): Array<{ cutter: StepoverCutter; stepover_mm: number; ratio_to_ball: number }> {
  const results = cutters.map(c => ({
    cutter: c,
    stepover_mm: quickStepover(c, targetScallop, kappaCross),
    ratio_to_ball: 0,
  }));

  // Find ball cutter baseline
  const ballResult = results.find(r => r.cutter.type === "ball");
  const ballAe = ballResult?.stepover_mm ?? results[0].stepover_mm;

  for (const r of results) {
    r.ratio_to_ball = ballAe > 0 ? r.stepover_mm / ballAe : 1;
  }

  return results.sort((a, b) => b.stepover_mm - a.stepover_mm);
}

// ============================================================================
// ENGINE EXPORT
// ============================================================================

export const stepoverOptimizationEngine = {
  optimize: optimizeStepover,
  optimizeFromSurface,
  quickStepover,
  compareCutters,
  stepoverFromScallop,
  scallopFromStepover,
  effectiveRadius,
  getToolRadius,
};
