/**
 * ToolpathIntegrationEngine — CPL-MS1 Pipeline Integration (P1-U08/U09/U11)
 *
 * Bundles three pipeline integration features:
 *
 *  1. Toolpath Tolerance Verification (P1-U08)
 *     Post-smoothing tolerance check — compare smoothed coordinates against
 *     original path within a specified tolerance band. Adaptive smoothing
 *     reduction where violations occur.
 *
 *  2. Within-Operation Cut Reordering (P1-U09)
 *     TSP-like rapid traverse minimization within operations. Nearest-neighbor
 *     heuristic + 2-opt improvement for both general cuts and hole patterns.
 *
 *  3. SelfLearning Pipeline Integration (P1-U11)
 *     Wire SelfLearningCAMEngine correction factors into pipeline blocks.
 *     Safety-capped at ±30% of original values. Prediction recording for
 *     closed-loop feedback.
 *
 * Algorithms:
 *  - Point-to-segment distance: d = ||(P−A) × (B−A)|| / ||B−A||
 *  - Nearest-neighbor TSP: O(n²) greedy heuristic
 *  - 2-opt local search: iterative swap improvement until no gain
 *  - Blend factor: f_blend = min(1, tolerance / deviation) for adaptive reduction
 *
 * References:
 *  - Lin & Kernighan (1973): Effective heuristic for the TSP
 *  - Helsgaun (2000): Effective implementation of the LKH algorithm
 *  - Piegl & Tiller (1997): NURBS Book, tolerance-constrained fitting
 *
 * Actions: verify_tolerance, adaptive_smoothing, reorder_cuts,
 *          reorder_holes, apply_corrections, record_predictions
 *          (toolpathDispatcher)
 *
 * @module ToolpathIntegrationEngine
 */

// ── Types ──────────────────────────────────────────────────────────────────

/** 3D coordinate */
export interface Point3D {
  x: number;
  y: number;
  z: number;
}

/** A single cut segment with start/end positions */
export interface CutSegment {
  id: number;
  start: Point3D;
  end: Point3D;
  type: string;
}

/** SelfLearning correction factors */
export interface CorrectionFactors {
  speedFactor: number;
  feedFactor: number;
  depthFactor: number;
}

/** A G-code block with optional kinematic fields */
export interface ToolpathBlock {
  x?: number;
  y?: number;
  z?: number;
  feed_mm_min?: number;
  spindle_rpm?: number;
  depth_of_cut_mm?: number;
  [key: string]: unknown;
}

/** Result of tolerance verification */
export interface ToleranceVerificationResult {
  points_checked: number;
  violations: number;
  max_deviation_mm: number;
  avg_deviation_mm: number;
  within_tolerance: boolean;
  violation_indices: number[];
  deviations_mm: number[];
  formula: string;
}

/** Result of adaptive smoothing reduction */
export interface AdaptiveSmoothingResult {
  corrected_points: Point3D[];
  adjustments_made: number;
  max_residual_deviation_mm: number;
  original_violations: number;
  remaining_violations: number;
  formula: string;
}

/** Result of cut reordering */
export interface CutReorderResult {
  reordered: CutSegment[];
  original_rapid_mm: number;
  optimized_rapid_mm: number;
  savings_pct: number;
  iterations_2opt: number;
  formula: string;
}

/** Result of hole reordering */
export interface HoleReorderResult {
  ordered_holes: Point3D[];
  original_rapid_mm: number;
  optimized_rapid_mm: number;
  savings_pct: number;
  iterations_2opt: number;
  formula: string;
}

/** Result of applying learning corrections */
export interface CorrectionResult {
  blocks: ToolpathBlock[];
  corrections_applied: number;
  blocks_modified: number;
  safety_capped: number;
  applied_factors: CorrectionFactors;
  formula: string;
}

/** Prediction record for closed-loop comparison */
export interface PredictionRecord {
  predictions: {
    force_N: number | null;
    ra_um: number | null;
    tool_life_min: number | null;
    cpk: number | null;
  };
  pipeline_id: string;
  timestamp: string;
  source_stages: string[];
}

// ── Engine ──────────────────────────────────────────────────────────────────

export class ToolpathIntegrationEngine {
  // ── Vector math (private) ──────────────────────────────────────────────

  /** Subtract two 3D vectors */
  private sub(a: Point3D, b: Point3D): Point3D {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  }

  /** Add two 3D vectors */
  private add(a: Point3D, b: Point3D): Point3D {
    return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
  }

  /** Scale a 3D vector */
  private scale(v: Point3D, s: number): Point3D {
    return { x: v.x * s, y: v.y * s, z: v.z * s };
  }

  /** Cross product of two 3D vectors */
  private cross(a: Point3D, b: Point3D): Point3D {
    return {
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x,
    };
  }

  /** Dot product */
  private dot(a: Point3D, b: Point3D): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }

  /** Euclidean magnitude */
  private mag(v: Point3D): number {
    return Math.sqrt(v.x ** 2 + v.y ** 2 + v.z ** 2);
  }

  /** Euclidean distance between two points */
  private dist(a: Point3D, b: Point3D): number {
    return this.mag(this.sub(a, b));
  }

  /** Lerp between two points */
  private lerp(a: Point3D, b: Point3D, t: number): Point3D {
    return this.add(this.scale(a, 1 - t), this.scale(b, t));
  }

  // ── Tolerance helpers ──────────────────────────────────────────────────

  /**
   * Minimum distance from point P to line segment A→B.
   * d = ||(P−A) × (B−A)|| / ||B−A||, clamped to segment endpoints.
   */
  private pointToSegmentDist(p: Point3D, a: Point3D, b: Point3D): number {
    const ab = this.sub(b, a);
    const abLen = this.mag(ab);
    if (abLen < 1e-12) return this.dist(p, a);

    // Project P onto line, clamp parameter t ∈ [0, 1]
    let t = this.dot(this.sub(p, a), ab) / (abLen * abLen);
    t = Math.max(0, Math.min(1, t));
    const closest = this.add(a, this.scale(ab, t));
    return this.dist(p, closest);
  }

  /**
   * Minimum distance from point P to the polyline defined by segments.
   * Checks every consecutive segment and returns the smallest distance.
   */
  private pointToPolylineDist(p: Point3D, polyline: Point3D[]): number {
    if (polyline.length === 0) return Infinity;
    if (polyline.length === 1) return this.dist(p, polyline[0]);

    let minDist = Infinity;
    for (let i = 0; i < polyline.length - 1; i++) {
      const d = this.pointToSegmentDist(p, polyline[i], polyline[i + 1]);
      if (d < minDist) minDist = d;
    }
    return minDist;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 1. TOOLPATH TOLERANCE VERIFICATION (P1-U08)
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Verify that smoothed points lie within a tolerance band of the original path.
   *
   * For each smoothed point, computes the minimum distance to the nearest
   * original path segment. Points exceeding tolerance_mm are flagged.
   *
   * @param originalPoints - Original discrete toolpath points
   * @param smoothedPoints - Points after smoothing (B-spline, Bezier, etc.)
   * @param tolerance_mm   - Allowable deviation in mm (default 0.01)
   * @returns Verification result with violation details
   */
  verifyToleranceBand(
    originalPoints: Point3D[],
    smoothedPoints: Point3D[],
    tolerance_mm: number = 0.01,
  ): ToleranceVerificationResult {
    if (originalPoints.length < 2) {
      return {
        points_checked: 0, violations: 0, max_deviation_mm: 0,
        avg_deviation_mm: 0, within_tolerance: true, violation_indices: [],
        deviations_mm: [],
        formula: "d_min(P, polyline) = min_i ||P − proj(P, seg_i)||",
      };
    }

    const deviations: number[] = [];
    const violationIndices: number[] = [];
    let totalDev = 0;
    let maxDev = 0;

    for (let i = 0; i < smoothedPoints.length; i++) {
      const d = this.pointToPolylineDist(smoothedPoints[i], originalPoints);
      deviations.push(d);
      totalDev += d;
      if (d > maxDev) maxDev = d;
      if (d > tolerance_mm) {
        violationIndices.push(i);
      }
    }

    const avgDev = smoothedPoints.length > 0
      ? totalDev / smoothedPoints.length
      : 0;

    return {
      points_checked: smoothedPoints.length,
      violations: violationIndices.length,
      max_deviation_mm: maxDev,
      avg_deviation_mm: avgDev,
      within_tolerance: violationIndices.length === 0,
      violation_indices: violationIndices,
      deviations_mm: deviations,
      formula: "d_min(P, polyline) = min_i ||P − proj(P, seg_i)||",
    };
  }

  /**
   * Reduce smoothing locally where tolerance violations occur.
   *
   * For each violating point, blends between the smoothed position and
   * the nearest original-path position using:
   *   blend = min(1, tolerance / deviation)
   *   corrected = lerp(original_nearest, smoothed, blend)
   *
   * @param originalPoints - Original discrete toolpath points
   * @param smoothedPoints - Points after smoothing
   * @param tolerance_mm   - Allowable deviation in mm (default 0.01)
   * @returns Corrected points and adjustment statistics
   */
  adaptiveSmoothingReduction(
    originalPoints: Point3D[],
    smoothedPoints: Point3D[],
    tolerance_mm: number = 0.01,
  ): AdaptiveSmoothingResult {
    if (originalPoints.length < 2 || smoothedPoints.length === 0) {
      return {
        corrected_points: [...smoothedPoints],
        adjustments_made: 0, max_residual_deviation_mm: 0,
        original_violations: 0, remaining_violations: 0,
        formula: "blend = min(1, tol / dev); P' = lerp(P_orig, P_smooth, blend)",
      };
    }

    // First pass: identify violations
    const verification = this.verifyToleranceBand(
      originalPoints, smoothedPoints, tolerance_mm,
    );

    if (verification.violations === 0) {
      return {
        corrected_points: [...smoothedPoints],
        adjustments_made: 0,
        max_residual_deviation_mm: verification.max_deviation_mm,
        original_violations: 0, remaining_violations: 0,
        formula: "blend = min(1, tol / dev); P' = lerp(P_orig, P_smooth, blend)",
      };
    }

    // Second pass: correct violating points
    const corrected: Point3D[] = [...smoothedPoints];
    let adjustments = 0;

    for (const idx of verification.violation_indices) {
      const sp = smoothedPoints[idx];
      const dev = verification.deviations_mm[idx];

      // Find nearest point on original polyline for blend target
      const nearestOrig = this.findNearestOnPolyline(sp, originalPoints);

      // Blend factor: 1 = keep smoothed, 0 = snap to original
      const blend = Math.min(1, tolerance_mm / dev);
      corrected[idx] = this.lerp(nearestOrig, sp, blend);
      adjustments++;
    }

    // Verify residual
    const residual = this.verifyToleranceBand(
      originalPoints, corrected, tolerance_mm,
    );

    return {
      corrected_points: corrected,
      adjustments_made: adjustments,
      max_residual_deviation_mm: residual.max_deviation_mm,
      original_violations: verification.violations,
      remaining_violations: residual.violations,
      formula: "blend = min(1, tol / dev); P' = lerp(P_orig, P_smooth, blend)",
    };
  }

  /**
   * Find the nearest point on a polyline to a query point.
   * Returns the closest projected point (on a segment or at a vertex).
   */
  private findNearestOnPolyline(p: Point3D, polyline: Point3D[]): Point3D {
    if (polyline.length === 1) return { ...polyline[0] };

    let bestDist = Infinity;
    let bestPoint: Point3D = polyline[0];

    for (let i = 0; i < polyline.length - 1; i++) {
      const a = polyline[i];
      const b = polyline[i + 1];
      const ab = this.sub(b, a);
      const abLen = this.mag(ab);
      if (abLen < 1e-12) continue;

      let t = this.dot(this.sub(p, a), ab) / (abLen * abLen);
      t = Math.max(0, Math.min(1, t));
      const proj = this.add(a, this.scale(ab, t));
      const d = this.dist(p, proj);
      if (d < bestDist) {
        bestDist = d;
        bestPoint = proj;
      }
    }

    return bestPoint;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 2. WITHIN-OPERATION CUT REORDERING (P1-U09)
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Reorder cut segments to minimize rapid traverse distance.
   *
   * Uses nearest-neighbor TSP heuristic followed by 2-opt local improvement.
   * The distance matrix is computed between the end of each cut and the start
   * of every other cut to capture actual rapid moves.
   *
   * @param cuts       - Array of cut segments with start/end positions
   * @param startPoint - Machine position before the first cut
   * @returns Reordered cuts with savings statistics
   */
  reorderCuts(cuts: CutSegment[], startPoint: Point3D): CutReorderResult {
    if (cuts.length <= 1) {
      return {
        reordered: [...cuts],
        original_rapid_mm: 0, optimized_rapid_mm: 0,
        savings_pct: 0, iterations_2opt: 0,
        formula: "TSP nearest-neighbor + 2-opt",
      };
    }

    // Compute original rapid traverse distance
    const originalRapid = this.computeRapidDistance(cuts, startPoint);

    // Nearest-neighbor heuristic
    const order = this.nearestNeighborCuts(cuts, startPoint);

    // 2-opt improvement
    const { improved, iterations } = this.twoOptCuts(order, startPoint);

    // Compute optimized distance
    const optimizedRapid = this.computeRapidDistance(improved, startPoint);
    const savings = originalRapid > 0
      ? ((originalRapid - optimizedRapid) / originalRapid) * 100
      : 0;

    return {
      reordered: improved,
      original_rapid_mm: originalRapid,
      optimized_rapid_mm: optimizedRapid,
      savings_pct: savings,
      iterations_2opt: iterations,
      formula: "TSP nearest-neighbor + 2-opt; Δd = Σ ||end_i − start_{i+1}||",
    };
  }

  /**
   * Reorder hole positions for minimum traverse distance.
   *
   * Special case for drilling/tapping/boring cycles where each "cut"
   * is a single point (holes have identical start/end).
   *
   * @param holes      - Array of hole center positions
   * @param startPoint - Machine position before the first hole
   * @returns Ordered holes with savings statistics
   */
  reorderHolePattern(holes: Point3D[], startPoint: Point3D): HoleReorderResult {
    if (holes.length <= 1) {
      return {
        ordered_holes: [...holes],
        original_rapid_mm: 0, optimized_rapid_mm: 0,
        savings_pct: 0, iterations_2opt: 0,
        formula: "TSP nearest-neighbor + 2-opt (hole pattern)",
      };
    }

    // Convert holes to CutSegments with start == end
    const cuts: CutSegment[] = holes.map((h, i) => ({
      id: i, start: { ...h }, end: { ...h }, type: "hole",
    }));

    const result = this.reorderCuts(cuts, startPoint);

    return {
      ordered_holes: result.reordered.map((c) => ({ ...c.start })),
      original_rapid_mm: result.original_rapid_mm,
      optimized_rapid_mm: result.optimized_rapid_mm,
      savings_pct: result.savings_pct,
      iterations_2opt: result.iterations_2opt,
      formula: "TSP nearest-neighbor + 2-opt (hole pattern)",
    };
  }

  /** Compute total rapid traverse distance for a sequence of cuts */
  private computeRapidDistance(cuts: CutSegment[], start: Point3D): number {
    let total = 0;
    let current = start;
    for (const cut of cuts) {
      total += this.dist(current, cut.start);
      current = cut.end;
    }
    return total;
  }

  /** Nearest-neighbor greedy ordering of cuts */
  private nearestNeighborCuts(
    cuts: CutSegment[],
    startPoint: Point3D,
  ): CutSegment[] {
    const remaining = [...cuts];
    const order: CutSegment[] = [];
    let current = startPoint;

    while (remaining.length > 0) {
      let bestIdx = 0;
      let bestDist = Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const d = this.dist(current, remaining[i].start);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }

      const chosen = remaining.splice(bestIdx, 1)[0];
      order.push(chosen);
      current = chosen.end;
    }

    return order;
  }

  /**
   * 2-opt local search improvement on cut ordering.
   * Iteratively reverses sub-sequences to reduce total rapid distance.
   * Stops when no improvement found or max 1000 iterations.
   */
  private twoOptCuts(
    cuts: CutSegment[],
    startPoint: Point3D,
  ): { improved: CutSegment[]; iterations: number } {
    const route = [...cuts];
    const n = route.length;
    let improved = true;
    let iterations = 0;
    const maxIter = Math.min(1000, n * n);

    while (improved && iterations < maxIter) {
      improved = false;
      iterations++;

      for (let i = 0; i < n - 1; i++) {
        for (let j = i + 1; j < n; j++) {
          const delta = this.twoOptDelta(route, startPoint, i, j);
          if (delta < -1e-9) {
            // Reverse the sub-sequence [i, j]
            this.reverseSegment(route, i, j);
            improved = true;
          }
        }
      }
    }

    return { improved: route, iterations };
  }

  /**
   * Calculate the change in rapid distance from a 2-opt swap at (i, j).
   * A negative delta means the swap is beneficial.
   */
  private twoOptDelta(
    route: CutSegment[],
    startPoint: Point3D,
    i: number,
    j: number,
  ): number {
    const n = route.length;

    // Current position before cut i
    const prevI = i === 0 ? startPoint : route[i - 1].end;
    // Current position after cut j (start of j+1 or end)
    const nextJ = j < n - 1 ? route[j + 1].start : null;

    // Current edges: prevI→route[i].start + route[j].end→nextJ
    const oldDist =
      this.dist(prevI, route[i].start) +
      (nextJ ? this.dist(route[j].end, nextJ) : 0);

    // After reversing [i..j]: prevI→route[j].start + route[i].end→nextJ
    // Note: when reversed, the cut at position j becomes position i, etc.
    // For cuts the segment direction matters, but rapids connect end→start
    const newDist =
      this.dist(prevI, route[j].start) +
      (nextJ ? this.dist(route[i].end, nextJ) : 0);

    // Also need to account for changed internal rapids
    let oldInternal = 0;
    let newInternal = 0;
    for (let k = i; k < j; k++) {
      oldInternal += this.dist(route[k].end, route[k + 1].start);
    }
    // After reversal, internal sequence is reversed
    for (let k = j; k > i; k--) {
      newInternal += this.dist(route[k].end, route[k - 1].start);
    }

    return (newDist + newInternal) - (oldDist + oldInternal);
  }

  /** Reverse a sub-array in place */
  private reverseSegment(arr: CutSegment[], i: number, j: number): void {
    let lo = i;
    let hi = j;
    while (lo < hi) {
      const tmp = arr[lo];
      arr[lo] = arr[hi];
      arr[hi] = tmp;
      lo++;
      hi--;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 3. SELFLEARNING PIPELINE INTEGRATION (P1-U11)
  // ═══════════════════════════════════════════════════════════════════════

  /** Safety cap: corrections limited to ±30% of original */
  private static readonly MAX_CORRECTION = 0.30;

  /**
   * Apply SelfLearningCAMEngine correction factors to toolpath blocks.
   *
   * Corrections are safety-capped to ±30% of original values:
   *   rpm_new = rpm_old × clamp(speedFactor, 0.70, 1.30)
   *   feed_new = feed_old × clamp(feedFactor, 0.70, 1.30)
   *   ap_new = ap_old × clamp(depthFactor, 0.70, 1.30)
   *
   * @param blocks            - Toolpath blocks to modify (copies are made)
   * @param correctionFactors - Factors from SelfLearningCAMEngine
   * @returns Modified blocks with correction statistics
   */
  applyLearningCorrections(
    blocks: ToolpathBlock[],
    correctionFactors: CorrectionFactors,
  ): CorrectionResult {
    const lo = 1 - ToolpathIntegrationEngine.MAX_CORRECTION;
    const hi = 1 + ToolpathIntegrationEngine.MAX_CORRECTION;

    // Clamp factors
    const sf = Math.max(lo, Math.min(hi, correctionFactors.speedFactor));
    const ff = Math.max(lo, Math.min(hi, correctionFactors.feedFactor));
    const df = Math.max(lo, Math.min(hi, correctionFactors.depthFactor));

    const wasCapped =
      (sf !== correctionFactors.speedFactor ? 1 : 0) +
      (ff !== correctionFactors.feedFactor ? 1 : 0) +
      (df !== correctionFactors.depthFactor ? 1 : 0);

    let blocksModified = 0;
    let correctionsApplied = 0;

    const modifiedBlocks: ToolpathBlock[] = blocks.map((block) => {
      const b = { ...block };
      let modified = false;

      if (b.spindle_rpm != null && sf !== 1) {
        b.spindle_rpm = Math.round(b.spindle_rpm * sf);
        correctionsApplied++;
        modified = true;
      }
      if (b.feed_mm_min != null && ff !== 1) {
        b.feed_mm_min = Math.round(b.feed_mm_min * ff * 10) / 10;
        correctionsApplied++;
        modified = true;
      }
      if (b.depth_of_cut_mm != null && df !== 1) {
        b.depth_of_cut_mm = Math.round(b.depth_of_cut_mm * df * 1000) / 1000;
        correctionsApplied++;
        modified = true;
      }

      if (modified) blocksModified++;
      return b;
    });

    return {
      blocks: modifiedBlocks,
      corrections_applied: correctionsApplied,
      blocks_modified: blocksModified,
      safety_capped: wasCapped,
      applied_factors: { speedFactor: sf, feedFactor: ff, depthFactor: df },
      formula: "V' = V × clamp(factor, 0.70, 1.30); cap = ±30%",
    };
  }

  /**
   * Record predictions from a pipeline output for later comparison with actuals.
   *
   * Extracts predicted force, surface roughness, tool life, and Cpk from
   * pipeline stage outputs and packages them as a prediction record suitable
   * for SelfLearningCAMEngine feedback.
   *
   * @param pipelineOutput - Output object from a pipeline run
   * @returns Prediction record with extracted values and metadata
   */
  recordPredictions(pipelineOutput: Record<string, unknown>): PredictionRecord {
    const stages: string[] = [];

    // Extract force prediction
    let force: number | null = null;
    const forceData = this.extractNested(pipelineOutput, [
      "force_N", "cutting_force_N", "Fc_N", "force",
    ]);
    if (forceData != null) {
      force = Number(forceData);
      stages.push("force");
    }

    // Extract surface roughness
    let ra: number | null = null;
    const raData = this.extractNested(pipelineOutput, [
      "ra_um", "Ra_um", "surface_roughness_um", "ra",
    ]);
    if (raData != null) {
      ra = Number(raData);
      stages.push("surface_finish");
    }

    // Extract tool life
    let toolLife: number | null = null;
    const lifeData = this.extractNested(pipelineOutput, [
      "tool_life_min", "taylor_life_min", "life_minutes", "tool_life",
    ]);
    if (lifeData != null) {
      toolLife = Number(lifeData);
      stages.push("tool_life");
    }

    // Extract Cpk
    let cpk: number | null = null;
    const cpkData = this.extractNested(pipelineOutput, [
      "cpk", "Cpk", "process_capability",
    ]);
    if (cpkData != null) {
      cpk = Number(cpkData);
      stages.push("capability");
    }

    // Generate pipeline ID from timestamp + hash
    const ts = new Date().toISOString();
    const pipelineId = `pred_${ts.replace(/[^0-9]/g, "").slice(0, 14)}`;

    return {
      predictions: {
        force_N: force,
        ra_um: ra,
        tool_life_min: toolLife,
        cpk: cpk,
      },
      pipeline_id: pipelineId,
      timestamp: ts,
      source_stages: stages,
    };
  }

  /**
   * Search an object (potentially nested) for the first matching key.
   * Returns the value if found, null otherwise.
   */
  private extractNested(
    obj: Record<string, unknown>,
    keys: string[],
    depth: number = 3,
  ): unknown | null {
    if (depth <= 0 || obj == null || typeof obj !== "object") return null;

    for (const key of keys) {
      if (key in obj && obj[key] != null) {
        const val = obj[key];
        if (typeof val === "number" && !isNaN(val)) return val;
        if (typeof val === "string" && !isNaN(Number(val))) return Number(val);
      }
    }

    // Recurse into nested objects
    for (const val of Object.values(obj)) {
      if (val != null && typeof val === "object" && !Array.isArray(val)) {
        const found = this.extractNested(
          val as Record<string, unknown>, keys, depth - 1,
        );
        if (found != null) return found;
      }
    }

    return null;
  }
}

/** Singleton instance */
export const toolpathIntegrationEngine = new ToolpathIntegrationEngine();
