/**
 * AdaptiveRefinementEngine — CAMK-MS3/U04
 * Error-driven toolpath densification along novel toolpath segments.
 *
 * Criteria:
 * 1. Curvature-based: insert points where chord error > tolerance
 * 2. Force-based: densify where force/deflection gradient is steep (PTDC)
 * 3. Thermal-based: densify near thermal zone boundaries (TGAR)
 * 4. Engagement-based: add points where MRR deviates > threshold (VCMR)
 *
 * Concept from adaptive mesh refinement (AMR) in FEA:
 * - Error estimator per segment
 * - Bisection refinement where error exceeds tolerance
 * - Iterative until convergence
 *
 * References:
 * - Zienkiewicz & Zhu (1987): A Simple Error Estimator for Adaptive Mesh Refinement
 * - Altintas (2012): Manufacturing Automation, Ch. 3 — Interpolation error
 */

// ── Types ──────────────────────────────────────────────────────────────────

interface SegmentPoint {
  x: number; y: number; z: number;
  ae_mm: number; ap_mm: number;
  rpm: number; feed_mmmin: number;
  force_N?: number;
  temperature_C?: number;
  deflection_um?: number;
}

interface RefinementInput {
  segments: SegmentPoint[];
  tolerance_mm?: number;            // chord error tolerance (default 0.01)
  max_iterations?: number;          // convergence limit (default 5)
  criteria?: ("curvature" | "force" | "thermal" | "engagement")[];
  force_gradient_threshold?: number;   // N/mm (default 50)
  thermal_gradient_threshold?: number; // °C/mm (default 20)
  engagement_deviation_pct?: number;   // % (default 10)
  tool_diameter_mm?: number;
}

interface RefinedSegment extends SegmentPoint {
  original_idx: number;              // index in original array
  is_inserted: boolean;              // true if this point was added by refinement
  refinement_reason?: string;
}

interface RefinementStats {
  original_count: number;
  refined_count: number;
  points_added: number;
  iterations: number;
  converged: boolean;
  max_chord_error_mm: number;
  max_force_gradient_N_mm: number;
  max_thermal_gradient_C_mm: number;
  max_engagement_deviation_pct: number;
  criteria_applied: string[];
}

interface RefinementResult {
  segments: RefinedSegment[];
  stats: RefinementStats;
  refinement_map: { original_idx: number; refined_indices: number[] }[];
}

// ── Engine ──────────────────────────────────────────────────────────────────

class AdaptiveRefinementEngine {
  private dist3D(a: SegmentPoint, b: SegmentPoint): number {
    return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2 + (b.z - a.z) ** 2);
  }

  /**
   * Chord error: distance from midpoint of line segment to the curved path.
   * For 3 consecutive points A-B-C, chord error at B is the perpendicular
   * distance from B to line AC.
   */
  chordError(a: SegmentPoint, b: SegmentPoint, c: SegmentPoint): number {
    // Vector AC
    const acx = c.x - a.x, acy = c.y - a.y, acz = c.z - a.z;
    const acLen = Math.sqrt(acx * acx + acy * acy + acz * acz);
    if (acLen < 1e-9) return 0;

    // Vector AB
    const abx = b.x - a.x, aby = b.y - a.y, abz = b.z - a.z;

    // Cross product AB × AC
    const cx = aby * acz - abz * acy;
    const cy = abz * acx - abx * acz;
    const cz = abx * acy - aby * acx;

    // Distance = |AB × AC| / |AC|
    return Math.sqrt(cx * cx + cy * cy + cz * cz) / acLen;
  }

  /**
   * Force gradient between consecutive segments (N/mm).
   */
  forceGradient(a: SegmentPoint, b: SegmentPoint): number {
    if (a.force_N === undefined || b.force_N === undefined) return 0;
    const dist = this.dist3D(a, b);
    if (dist < 1e-9) return 0;
    return Math.abs(b.force_N - a.force_N) / dist;
  }

  /**
   * Thermal gradient between consecutive segments (°C/mm).
   */
  thermalGradient(a: SegmentPoint, b: SegmentPoint): number {
    if (a.temperature_C === undefined || b.temperature_C === undefined) return 0;
    const dist = this.dist3D(a, b);
    if (dist < 1e-9) return 0;
    return Math.abs(b.temperature_C - a.temperature_C) / dist;
  }

  /**
   * Engagement deviation: how much ae×ap deviates from mean.
   */
  engagementDeviation(seg: SegmentPoint, meanMRRProxy: number): number {
    if (meanMRRProxy < 1e-9) return 0;
    const mrrProxy = seg.ae_mm * seg.ap_mm;
    return Math.abs(mrrProxy - meanMRRProxy) / meanMRRProxy * 100;
  }

  /**
   * Interpolate a new point between two segments.
   */
  interpolate(a: SegmentPoint, b: SegmentPoint, t: number = 0.5): SegmentPoint {
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      z: a.z + (b.z - a.z) * t,
      ae_mm: a.ae_mm + (b.ae_mm - a.ae_mm) * t,
      ap_mm: a.ap_mm + (b.ap_mm - a.ap_mm) * t,
      rpm: Math.round(a.rpm + (b.rpm - a.rpm) * t),
      feed_mmmin: a.feed_mmmin + (b.feed_mmmin - a.feed_mmmin) * t,
      force_N: (a.force_N !== undefined && b.force_N !== undefined)
        ? a.force_N + (b.force_N - a.force_N) * t : undefined,
      temperature_C: (a.temperature_C !== undefined && b.temperature_C !== undefined)
        ? a.temperature_C + (b.temperature_C - a.temperature_C) * t : undefined,
      deflection_um: (a.deflection_um !== undefined && b.deflection_um !== undefined)
        ? a.deflection_um + (b.deflection_um - a.deflection_um) * t : undefined,
    };
  }

  /**
   * Perform one refinement pass.
   * Returns the refined segment array and whether any points were added.
   */
  refinePass(
    segments: RefinedSegment[],
    criteria: Set<string>,
    tolerance_mm: number,
    forceThresh: number,
    thermalThresh: number,
    engagementPct: number,
  ): { refined: RefinedSegment[]; added: number } {
    if (segments.length < 2) return { refined: segments, added: 0 };

    const meanMRR = segments.reduce((s, p) => s + p.ae_mm * p.ap_mm, 0) / segments.length;
    const result: RefinedSegment[] = [segments[0]];
    let added = 0;

    for (let i = 1; i < segments.length; i++) {
      const prev = segments[i - 1];
      const curr = segments[i];
      let needsRefinement = false;
      let reason = "";

      // Curvature check (need 3 points)
      if (criteria.has("curvature") && i < segments.length - 1) {
        const err = this.chordError(prev, curr, segments[i + 1]);
        if (err > tolerance_mm) {
          needsRefinement = true;
          reason = `chord_error=${err.toFixed(4)}mm`;
        }
      }

      // Force gradient check
      if (criteria.has("force") && this.forceGradient(prev, curr) > forceThresh) {
        needsRefinement = true;
        reason = `force_gradient=${this.forceGradient(prev, curr).toFixed(1)}N/mm`;
      }

      // Thermal gradient check
      if (criteria.has("thermal") && this.thermalGradient(prev, curr) > thermalThresh) {
        needsRefinement = true;
        reason = `thermal_gradient=${this.thermalGradient(prev, curr).toFixed(1)}°C/mm`;
      }

      // Engagement deviation check
      if (criteria.has("engagement") && this.engagementDeviation(curr, meanMRR) > engagementPct) {
        needsRefinement = true;
        reason = `engagement_deviation=${this.engagementDeviation(curr, meanMRR).toFixed(1)}%`;
      }

      if (needsRefinement) {
        // Insert midpoint
        const mid = this.interpolate(prev, curr);
        result.push({
          ...mid,
          original_idx: prev.original_idx,
          is_inserted: true,
          refinement_reason: reason,
        });
        added++;
      }

      result.push(curr);
    }

    return { refined: result, added };
  }

  /**
   * Full adaptive refinement with iterative convergence.
   */
  refine(input: RefinementInput): RefinementResult {
    const {
      segments,
      tolerance_mm = 0.01,
      max_iterations = 5,
      criteria = ["curvature"],
      force_gradient_threshold = 50,
      thermal_gradient_threshold = 20,
      engagement_deviation_pct = 10,
    } = input;

    if (segments.length < 2) {
      const refined = segments.map((s, i) => ({
        ...s, original_idx: i, is_inserted: false,
      }));
      return {
        segments: refined,
        stats: {
          original_count: segments.length,
          refined_count: segments.length,
          points_added: 0,
          iterations: 0,
          converged: true,
          max_chord_error_mm: 0,
          max_force_gradient_N_mm: 0,
          max_thermal_gradient_C_mm: 0,
          max_engagement_deviation_pct: 0,
          criteria_applied: criteria,
        },
        refinement_map: segments.map((_, i) => ({ original_idx: i, refined_indices: [i] })),
      };
    }

    // Initialize refined segments
    let current: RefinedSegment[] = segments.map((s, i) => ({
      ...s, original_idx: i, is_inserted: false,
    }));

    const criteriaSet = new Set(criteria);
    let totalAdded = 0;
    let iterations = 0;
    let converged = false;

    for (let iter = 0; iter < max_iterations; iter++) {
      iterations++;
      const { refined, added } = this.refinePass(
        current, criteriaSet, tolerance_mm,
        force_gradient_threshold, thermal_gradient_threshold, engagement_deviation_pct,
      );
      current = refined;
      totalAdded += added;

      if (added === 0) {
        converged = true;
        break;
      }
    }

    // Compute final statistics
    let maxChordErr = 0, maxForceGrad = 0, maxThermalGrad = 0, maxEngDev = 0;
    const meanMRR = current.reduce((s, p) => s + p.ae_mm * p.ap_mm, 0) / current.length;

    for (let i = 1; i < current.length; i++) {
      if (i < current.length - 1) {
        maxChordErr = Math.max(maxChordErr, this.chordError(current[i - 1], current[i], current[i + 1]));
      }
      maxForceGrad = Math.max(maxForceGrad, this.forceGradient(current[i - 1], current[i]));
      maxThermalGrad = Math.max(maxThermalGrad, this.thermalGradient(current[i - 1], current[i]));
      maxEngDev = Math.max(maxEngDev, this.engagementDeviation(current[i], meanMRR));
    }

    // Build refinement map
    const refinementMap: { original_idx: number; refined_indices: number[] }[] = [];
    for (let origIdx = 0; origIdx < segments.length; origIdx++) {
      const indices = current
        .map((s, i) => s.original_idx === origIdx ? i : -1)
        .filter(i => i >= 0);
      refinementMap.push({ original_idx: origIdx, refined_indices: indices });
    }

    return {
      segments: current,
      stats: {
        original_count: segments.length,
        refined_count: current.length,
        points_added: totalAdded,
        iterations,
        converged,
        max_chord_error_mm: maxChordErr,
        max_force_gradient_N_mm: maxForceGrad,
        max_thermal_gradient_C_mm: maxThermalGrad,
        max_engagement_deviation_pct: maxEngDev,
        criteria_applied: criteria,
      },
      refinement_map: refinementMap,
    };
  }

  /**
   * Quick check: estimate how many refinement points are needed.
   */
  estimateRefinement(input: RefinementInput): { estimated_additions: number; needs_refinement: boolean } {
    const result = this.refine({ ...input, max_iterations: 1 });
    return {
      estimated_additions: result.stats.points_added,
      needs_refinement: result.stats.points_added > 0,
    };
  }
}

export const adaptiveRefinementEngine = new AdaptiveRefinementEngine();
export { AdaptiveRefinementEngine };
