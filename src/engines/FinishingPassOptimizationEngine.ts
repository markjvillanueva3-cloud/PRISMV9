/**
 * FinishingPassOptimizationEngine — Spring pass & finishing strategy optimization
 *
 * Models: Euler-Bernoulli beam deflection, geometric surface finish (f²/32r),
 *         iterative deflection convergence for spring passes
 * References: Altintas (2012), Tlusty (2000), Sandvik Coromant Handbook
 * Safety: Critical for achieving target tolerances and surface quality
 */

// ─── Types ─────────────────────────────────────────────────────────

export type ToolType = "endmill" | "turning_insert" | "boring_bar" | "face_mill";
/** Tool Material Finish type definition.
 */
export type ToolMaterialFinish = "carbide" | "hss" | "ceramic" | "cbn";

/** Finishing Pass Input configuration/data structure.
 */
export interface FinishingPassInput {
  tool_diameter_mm: number;
  tool_overhang_mm: number;
  tool_type?: ToolType;                  // default endmill
  tool_material?: ToolMaterialFinish;    // default carbide
  tool_nose_radius_mm: number;
  flutes?: number;                       // default 2
  feed_mm_rev: number;                   // current/roughing feed
  depth_of_cut_mm: number;              // roughing depth
  target_Ra_um: number;
  workpiece_hardness_hrc?: number;       // default 30
  material_kc1_1?: number;              // specific cutting force (N/mm²)
  material_mc?: number;                 // Kienzle exponent
  shank_modulus_GPa?: number;           // override Young's modulus
}

/** Atomic Value configuration/data structure.
 */
export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
  warning?: string;
}

/** Finishing Pass Result configuration/data structure.
 */
export interface FinishingPassResult {
  roughing_deflection_um: AtomicValue;
  spring_pass_depth_mm: AtomicValue;
  finishing_feed_mm_rev: AtomicValue;
  number_of_passes: AtomicValue;
  predicted_Ra_um: AtomicValue;
  total_finishing_time_factor: AtomicValue;
  dimension_error_after_um: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// ─── Constants ─────────────────────────────────────────────────────

/** Young's modulus by tool material (GPa) */
const MODULUS: Record<ToolMaterialFinish, number> = {
  carbide: 600, // QA-MS3 FIX: canonical CANONICAL_TOOL_MODULUS (was 580)
  hss: 210,
  ceramic: 370,
  cbn: 680,
};

/** Estimate kc1_1 from hardness */
const estimateKc = (hrc: number): { kc1_1: number; mc: number } => {
  if (hrc <= 20) return { kc1_1: 1200, mc: 0.25 };
  if (hrc <= 35) return { kc1_1: 1800, mc: 0.25 };
  if (hrc <= 45) return { kc1_1: 2200, mc: 0.24 };
  if (hrc <= 55) return { kc1_1: 2800, mc: 0.22 };
  return { kc1_1: 3500, mc: 0.20 };
};

// ─── Engine ────────────────────────────────────────────────────────

/** Finishing Pass Optimization Engine engine/manager.
 */
export class FinishingPassOptimizationEngine {
  calculate(input: FinishingPassInput): FinishingPassResult {
    const {
      tool_diameter_mm: d,
      tool_overhang_mm: L,
      tool_type: type = "endmill",
      tool_material: mat = "carbide",
      tool_nose_radius_mm: r,
      feed_mm_rev: f,
      depth_of_cut_mm: ap,
      target_Ra_um: targetRa,
      workpiece_hardness_hrc: hrc = 30,
    } = input;

    const recs: string[] = [];

    // ── 1. Material properties ──
    const kc_data = {
      kc1_1: input.material_kc1_1 ?? estimateKc(hrc).kc1_1,
      mc: input.material_mc ?? estimateKc(hrc).mc,
    };
    const E = (input.shank_modulus_GPa ?? MODULUS[mat]) * 1000; // GPa → MPa

    // ── 2. Second moment of area: I = πd⁴/64 ──
    const I = (Math.PI * Math.pow(d, 4)) / 64; // mm⁴

    // ── 3. Cutting force (Kienzle): F = kc × f × ap ──
    const h = Math.max(f * 0.5, 0.01);
    const kc = kc_data.kc1_1 * Math.pow(h, -kc_data.mc);
    const F_roughing = kc * f * ap; // N

    // ── 4. Tool deflection (cantilever): δ = F×L³/(3EI) ──
    const deflection_mm = E > 0 && I > 0
      ? (F_roughing * Math.pow(L, 3)) / (3 * E * I)
      : 0;
    const deflection_um = deflection_mm * 1000;

    // ── 5. Spring pass depth = roughing deflection ──
    const springPassDepth = deflection_mm;

    // ── 6. Optimal finishing feed for target Ra ──
    // Ra = f²/(32r) → f = √(32×r×Ra)
    const finishingFeed = r > 0
      ? Math.sqrt(32 * r * (targetRa / 1000)) // Ra in mm
      : f * 0.3;

    // ── 7. Iterative spring pass convergence ──
    // Each pass: ap = residual, F = kc × f_finish × residual, δ_new = F×L³/(3EI)
    let residual = deflection_mm;
    let passes = 0;
    const maxPasses = 5;
    const targetResidual = targetRa / 1000 * 0.5; // half of target Ra in mm

    /** While.
     * @param residual - residual
     * @returns void
     */
    while (residual > targetResidual && passes < maxPasses) {
      const F_pass = kc * finishingFeed * Math.max(residual, 0.001);
      residual = E > 0 && I > 0
        ? (F_pass * Math.pow(L, 3)) / (3 * E * I)
        : 0;
      passes++;
    }
    passes = Math.max(1, passes);

    // ── 8. Predicted surface finish ──
    const theoreticalRa = r > 0
      ? (Math.pow(finishingFeed, 2) / (32 * r)) * 1000 // µm
      : targetRa;

    // Vibration/deflection degrades finish
    const vibFactor = 1.0 + Math.min(1.0, residual * 1000 / 5);
    const predictedRa = theoreticalRa * vibFactor;

    // ── 9. Cycle time factor (finishing time relative to roughing) ──
    const timeFactor = finishingFeed > 0 && ap > 0
      ? passes * (f / finishingFeed) * (springPassDepth / ap)
      : passes;

    // ── 10. Final dimension error ──
    const finalError = residual * 1000; // µm

    // ── 11. Safety ──
    const isSafe = finalError < targetRa * 2 && passes <= 3;

    // ── 12. Recommendations ──
    /** If.
     * @param deflection_um - deflection_um
     * @returns void
     */
    if (deflection_um > 100) {
      recs.push(
        `SAFETY: Deflection ${deflection_um.toFixed(0)}µm exceeds safe limit. `
        + `Tool may chatter or break. Reduce depth of cut or use stiffer tool`
      );
    } else if (deflection_um > 50) {
      recs.push(
        `WARNING: Roughing deflection ${deflection_um.toFixed(1)}µm is large. `
        + `Consider shorter overhang or larger tool diameter`
      );
    }

    /** If.
     * @param passes - passes
     * @returns void
     */
    if (passes > 2) {
      recs.push(
        `${passes} spring passes needed — indicates excessive deflection. `
        + `Consider: (1) reduce overhang, (2) larger tool, (3) reduce roughing depth`
      );
    }

    /** If.
     * @param finishingFeed - finishing feed
     * @returns void
     */
    if (finishingFeed < 0.02) {
      recs.push(
        `Very fine finishing feed ${finishingFeed.toFixed(4)} mm/rev — `
        + `risk of rubbing instead of cutting. Ensure sharp tool edge`
      );
    }

    /** If.
     * @param predictedRa - predicted ra
     * @returns void
     */
    if (predictedRa > targetRa) {
      recs.push(
        `Predicted Ra ${predictedRa.toFixed(3)}µm exceeds target ${targetRa}µm — `
        + `consider larger nose radius or reducing overhang`
      );
    }

    /** If.
     * @param type - type identifier
     * @returns void
     */
    if (type === "boring_bar" && L / d > 4) {
      recs.push(
        `Boring bar L/D ratio ${(L / d).toFixed(1)} exceeds 4:1 — `
        + `significant deflection expected. Consider carbide shank or damped bar`
      );
    }

    /** If.
     * @param recs.length - recs.length
     * @returns void
     */
    if (recs.length === 0) {
      recs.push(
        `Finishing strategy nominal — ${passes} pass(es) at `
        + `f=${finishingFeed.toFixed(3)} mm/rev, predicted Ra ${predictedRa.toFixed(3)}µm`
      );
    }

    return {
      roughing_deflection_um: {
        value: Math.round(deflection_um * 10) / 10,
        unit: "µm",
        uncertainty: Math.round(deflection_um * 0.15 * 10) / 10,
        source: "euler_bernoulli_beam",
      },
      spring_pass_depth_mm: {
        value: Math.round(springPassDepth * 10000) / 10000,
        unit: "mm",
        uncertainty: Math.round(springPassDepth * 0.15 * 10000) / 10000,
        source: "deflection_recovery",
      },
      finishing_feed_mm_rev: {
        value: Math.round(finishingFeed * 10000) / 10000,
        unit: "mm/rev",
        uncertainty: Math.round(finishingFeed * 0.10 * 10000) / 10000,
        source: "geometric_surface_finish",
      },
      number_of_passes: {
        value: passes,
        unit: "passes",
        uncertainty: 1,
        source: "iterative_convergence",
      },
      predicted_Ra_um: {
        value: Math.round(predictedRa * 1000) / 1000,
        unit: "µm",
        uncertainty: Math.round(predictedRa * 0.20 * 1000) / 1000,
        source: "geometric_with_deflection",
        warning: predictedRa > targetRa ? "Target Ra may not be achieved" : undefined,
      },
      total_finishing_time_factor: {
        value: Math.round(timeFactor * 100) / 100,
        unit: "×",
        uncertainty: Math.round(timeFactor * 0.10 * 100) / 100,
        source: "feed_ratio_model",
      },
      dimension_error_after_um: {
        value: Math.round(finalError * 100) / 100,
        unit: "µm",
        uncertainty: Math.round(finalError * 0.25 * 100) / 100,
        source: "iterative_convergence",
      },
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

/** Finishing Pass Optimization Engine constant.
 */
export const finishingPassOptimizationEngine = new FinishingPassOptimizationEngine();
