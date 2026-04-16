/**
 * TrilobeDeformationEngine
 * ==========================
 *
 * Models "trilobe" deformation: a 3-jaw chuck applies 3 discrete clamping
 * forces around a cylindrical part, producing a 3-lobed cross-section
 * distortion instead of pure circular. The part relaxes back to round
 * AFTER release — so finish-machined bores come out oval in use.
 *
 * This engine:
 *   - Predicts lobe peak-to-valley deformation (μm)
 *   - Recommends compensation: oversize bore during finish by lobe amount
 *   - Flags when jaw count < 6 (trilobe worst with 3-jaw)
 *   - Computes clamped-vs-relaxed roundness delta
 *
 * Formulas (Beam-on-elastic-foundation approximation):
 *   δ_lobe = (F × r³) / (E × I) × (1 - cos(2π/n))
 *   where n = jaw count, I = wall bending stiffness
 *
 * Canonical reference:
 *   - Roark's Formulas for Stress and Strain 9th ed §9
 *   - Kakino Y., "Accuracy in Machine Tools" (1993)
 *
 * @module engines/TrilobeDeformationEngine
 * @milestone LATHE-PRO
 */

export interface TrilobeInput {
  /** Part bore radius being gripped (mm) */
  bore_radius_mm: number;
  /** Part wall thickness at grip zone (mm) */
  wall_thickness_mm: number;
  /** Part length at grip zone (mm) */
  grip_length_mm: number;
  /** Total chuck clamping force (N) — summed across all jaws */
  total_clamp_force_n: number;
  /** Number of jaws */
  jaw_count: number;
  /** Part Young's modulus (MPa) — default 205000 for steel */
  part_youngs_mpa?: number;
  /** Finish tolerance requirement (mm) — default 0.005 for precision bores */
  finish_tolerance_mm?: number;
}

export interface TrilobeResult {
  lobe_amplitude_um: number;
  per_jaw_force_n: number;
  is_trilobe_critical: boolean;
  recommended_oversize_mm: number;
  relaxed_error_um: number;
  safety_margin_vs_tolerance: number;
  warnings: string[];
  use_soft_jaws_recommended: boolean;
}

class TrilobeDeformationEngineImpl {
  analyze(input: TrilobeInput): TrilobeResult {
    const warnings: string[] = [];
    const E = input.part_youngs_mpa ?? 205000; // MPa
    const r = input.bore_radius_mm;
    const t = input.wall_thickness_mm;
    const L = input.grip_length_mm;
    const n = input.jaw_count;
    const F = input.total_clamp_force_n;
    const tolerance = input.finish_tolerance_mm ?? 0.005;

    const perJawForce = F / Math.max(1, n);

    // Wall bending stiffness per unit length (thin-wall approximation):
    //   I = L × t³ / 12
    const I_mm4 = (L * Math.pow(t, 3)) / 12;

    // Lobe peak-to-valley deformation (Roark chapter 9, ring with n point loads):
    //   δ = (F × r³) / (n × E × I) × (1 - cos(2π/n))
    // Factor (1 - cos 2π/n) goes 0 at n→∞ (uniform pressure) and max at n=3.
    const angleFactor = 1 - Math.cos((2 * Math.PI) / n);
    const delta_mm = (F * Math.pow(r, 3)) / (n * E * I_mm4) * angleFactor;
    const delta_um = delta_mm * 1000;

    // Relaxed-state error: lobe amplitude fully returns to round after release,
    // so bore finish-machined during clamp is out-of-round by same amount.
    const relaxed_error_um = delta_um;
    const recommended_oversize_mm = delta_mm; // compensate by oversizing during finish

    const safetyMargin = tolerance > 0 ? tolerance / (delta_mm || 1e-9) : Infinity;

    let isTrilobeCritical = false;
    if (n <= 3 && delta_um > 10) {
      isTrilobeCritical = true;
      warnings.push(
        `3-jaw chuck + ${delta_um.toFixed(1)} μm lobe deformation is critical. Consider 6-jaw or soft jaws with ring-distribution.`
      );
    }

    if (delta_mm > tolerance) {
      warnings.push(
        `Lobe deformation ${delta_um.toFixed(1)} μm exceeds tolerance ${(tolerance * 1000).toFixed(1)} μm — part will be out-of-round after release`
      );
    }

    if (n === 4) {
      warnings.push(
        `4-jaw chuck produces quadrilobe — better than trilobe but still discrete. 6+ jaws or hydraulic ring recommended for precision.`
      );
    }

    if (t < 3 && delta_um > 5) {
      warnings.push(
        `Thin wall (${t} mm) amplifies lobe deformation. Reduce clamp force or add support ring.`
      );
    }

    const useSoftJawsRecommended = isTrilobeCritical || delta_mm > tolerance * 0.5;

    return {
      lobe_amplitude_um: round2(delta_um),
      per_jaw_force_n: round2(perJawForce),
      is_trilobe_critical: isTrilobeCritical,
      recommended_oversize_mm: round4(recommended_oversize_mm),
      relaxed_error_um: round2(relaxed_error_um),
      safety_margin_vs_tolerance: round2(safetyMargin),
      warnings,
      use_soft_jaws_recommended: useSoftJawsRecommended,
    };
  }

  /**
   * Recommend a maximum clamping force that keeps lobe deformation under
   * the specified tolerance.
   */
  recommendMaxForce(
    boreRadiusMm: number,
    wallThicknessMm: number,
    gripLengthMm: number,
    jawCount: number,
    toleranceMm: number,
    partYoungsMpa = 205000
  ): { max_total_force_n: number } {
    const I_mm4 = (gripLengthMm * Math.pow(wallThicknessMm, 3)) / 12;
    const angleFactor = 1 - Math.cos((2 * Math.PI) / jawCount);
    // Invert: F_max = (δ × n × E × I) / (r³ × angleFactor)
    const maxForce =
      (toleranceMm * jawCount * partYoungsMpa * I_mm4) /
      (Math.pow(boreRadiusMm, 3) * angleFactor);
    return { max_total_force_n: round2(Math.max(0, maxForce)) };
  }

  getStats(): {
    formula: string;
    jaw_counts_analyzed: number[];
    mitigations: string[];
  } {
    return {
      formula: "δ = (F × r³) / (n × E × I) × (1 - cos(2π/n))",
      jaw_counts_analyzed: [2, 3, 4, 6, 8],
      mitigations: [
        "soft_jaws (ring distribution)",
        "increased_jaw_count (6+)",
        "reduced_clamp_force",
        "support_ring",
        "bore_oversize_compensation",
      ],
    };
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export const trilobeDeformationEngine = new TrilobeDeformationEngineImpl();
export type { TrilobeDeformationEngineImpl };
