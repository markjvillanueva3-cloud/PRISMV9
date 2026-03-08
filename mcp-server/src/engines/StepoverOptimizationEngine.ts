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
  quickStepover,
  compareCutters,
  stepoverFromScallop,
  scallopFromStepover,
  effectiveRadius,
  getToolRadius,
};
