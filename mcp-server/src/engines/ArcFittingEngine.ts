/**
 * ArcFittingEngine — MIO-MS0/U-MIO20
 *
 * Converts linear point sequences to arc moves for G-code optimization.
 * Uses least-squares circle fitting with tolerance control.
 *
 * Algorithm:
 * 1. Detect potential arc regions (points with similar curvature)
 * 2. Fit circle using Kasa method (fast least-squares)
 * 3. Validate fit within tolerance
 * 4. Generate G02/G03 arc moves
 *
 * Benefits:
 * - Reduces G-code size 30-70%
 * - Smoother motion (continuous curvature)
 * - Faster execution (less block processing)
 *
 * @module engines/ArcFittingEngine
 * @milestone MIO-MS0
 */

import { log } from "../utils/Logger.js";

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface ArcFitParams {
  tolerance_mm: number;
  min_points: number;
  max_radius_mm: number;
  min_radius_mm: number;
  plane: "XY" | "XZ" | "YZ";
}

export interface FittedArc {
  start: Point3D;
  end: Point3D;
  center: { x: number; y: number };
  radius_mm: number;
  direction: "cw" | "ccw";
  angle_degrees: number;
  fit_error_mm: number;
  original_points: number;
}

export interface ArcFitResult {
  arcs: FittedArc[];
  remaining_points: Point3D[];
  original_count: number;
  arc_count: number;
  reduction_pct: number;
  total_fit_error_mm: number;
  ai_reasoning: string[];
}

export interface GCodeArc {
  code: "G02" | "G03";
  x: number;
  y: number;
  z?: number;
  i: number;
  j: number;
  f?: number;
}

const DEFAULT_PARAMS: ArcFitParams = {
  tolerance_mm: 0.005,
  min_points: 5,
  max_radius_mm: 5000,
  min_radius_mm: 0.5,
  plane: "XY",
};

class ArcFittingEngine {
  /**
   * Fit arcs to a sequence of points
   */
  fit(points: Point3D[], params?: Partial<ArcFitParams>): ArcFitResult {
    const p = { ...DEFAULT_PARAMS, ...params };
    const reasoning: string[] = [];
    const arcs: FittedArc[] = [];
    const remaining: Point3D[] = [];

    reasoning.push(`[ARC-FIT] Processing ${points.length} points, tolerance: ${p.tolerance_mm}mm`);

    if (points.length < p.min_points) {
      return {
        arcs: [],
        remaining_points: points,
        original_count: points.length,
        arc_count: 0,
        reduction_pct: 0,
        total_fit_error_mm: 0,
        ai_reasoning: ["Insufficient points for arc fitting"],
      };
    }

    let i = 0;
    while (i < points.length) {
      // Try to fit arc starting at point i
      const arcResult = this.tryFitArc(points, i, p);

      if (arcResult && arcResult.points_used >= p.min_points) {
        arcs.push(arcResult.arc);
        i += arcResult.points_used;
        reasoning.push(`[ARC-FIT] Arc found: R=${arcResult.arc.radius_mm.toFixed(2)}mm, ${arcResult.points_used} points, error=${arcResult.arc.fit_error_mm.toFixed(4)}mm`);
      } else {
        remaining.push(points[i]);
        i++;
      }
    }

    const reduction = ((points.length - remaining.length - arcs.length * 2) / points.length) * 100;
    const totalError = arcs.reduce((sum, a) => sum + a.fit_error_mm, 0);

    reasoning.push(`[ARC-FIT] Result: ${arcs.length} arcs, ${remaining.length} linear, ${reduction.toFixed(1)}% reduction`);

    return {
      arcs,
      remaining_points: remaining,
      original_count: points.length,
      arc_count: arcs.length,
      reduction_pct: Math.max(0, reduction),
      total_fit_error_mm: totalError,
      ai_reasoning: reasoning,
    };
  }

  /**
   * Try to fit an arc starting at index
   */
  private tryFitArc(
    points: Point3D[],
    startIdx: number,
    params: ArcFitParams
  ): { arc: FittedArc; points_used: number } | null {
    // Start with minimum points and expand
    for (let count = points.length - startIdx; count >= params.min_points; count--) {
      const segment = points.slice(startIdx, startIdx + count);
      const fit = this.fitCircle(segment, params.plane);

      if (!fit) continue;

      // Validate radius bounds
      if (fit.radius < params.min_radius_mm || fit.radius > params.max_radius_mm) continue;

      // Check tolerance
      if (fit.maxError <= params.tolerance_mm) {
        const start = segment[0];
        const end = segment[segment.length - 1];
        const direction = this.determineDirection(segment, fit.center, params.plane);
        const angle = this.calculateArcAngle(start, end, fit.center, params.plane);

        return {
          arc: {
            start,
            end,
            center: fit.center,
            radius_mm: fit.radius,
            direction,
            angle_degrees: angle,
            fit_error_mm: fit.maxError,
            original_points: count,
          },
          points_used: count,
        };
      }
    }

    return null;
  }

  /**
   * Fit a circle using Kasa method (algebraic least squares)
   */
  private fitCircle(
    points: Point3D[],
    plane: "XY" | "XZ" | "YZ"
  ): { center: { x: number; y: number }; radius: number; maxError: number } | null {
    if (points.length < 3) return null;

    // Extract 2D coordinates based on plane
    const coords = points.map(p => {
      if (plane === "XY") return { u: p.x, v: p.y };
      if (plane === "XZ") return { u: p.x, v: p.z };
      return { u: p.y, v: p.z };
    });

    // Kasa method: minimize sum of (u² + v² - 2au - 2bv - c)²
    // where center is (a,b) and c = r² - a² - b²
    const n = coords.length;
    let sumU = 0, sumV = 0, sumU2 = 0, sumV2 = 0, sumUV = 0;
    let sumU3 = 0, sumV3 = 0, sumU2V = 0, sumUV2 = 0;

    for (const { u, v } of coords) {
      sumU += u;
      sumV += v;
      sumU2 += u * u;
      sumV2 += v * v;
      sumUV += u * v;
      sumU3 += u * u * u;
      sumV3 += v * v * v;
      sumU2V += u * u * v;
      sumUV2 += u * v * v;
    }

    // Solve 2x2 system for center
    const A = n * sumU2 - sumU * sumU;
    const B = n * sumUV - sumU * sumV;
    const C = n * sumV2 - sumV * sumV;
    const D = 0.5 * (n * sumU3 + n * sumUV2 - sumU * sumU2 - sumU * sumV2);
    const E = 0.5 * (n * sumU2V + n * sumV3 - sumV * sumU2 - sumV * sumV2);

    const denom = A * C - B * B;
    if (Math.abs(denom) < 1e-10) return null;

    const a = (D * C - B * E) / denom;
    const b = (A * E - B * D) / denom;

    // Calculate radius
    let sumDist2 = 0;
    let maxError = 0;
    for (const { u, v } of coords) {
      const dist = Math.sqrt((u - a) ** 2 + (v - b) ** 2);
      sumDist2 += dist;
    }
    const radius = sumDist2 / n;

    // Calculate max error
    for (const { u, v } of coords) {
      const dist = Math.sqrt((u - a) ** 2 + (v - b) ** 2);
      const error = Math.abs(dist - radius);
      if (error > maxError) maxError = error;
    }

    return { center: { x: a, y: b }, radius, maxError };
  }

  /**
   * Determine arc direction (CW/CCW) from point sequence
   */
  private determineDirection(
    points: Point3D[],
    center: { x: number; y: number },
    plane: "XY" | "XZ" | "YZ"
  ): "cw" | "ccw" {
    if (points.length < 3) return "ccw";

    // Calculate cross product of vectors from center to consecutive points
    const getCoord = (p: Point3D) => {
      if (plane === "XY") return { u: p.x, v: p.y };
      if (plane === "XZ") return { u: p.x, v: p.z };
      return { u: p.y, v: p.z };
    };

    const p1 = getCoord(points[0]);
    const p2 = getCoord(points[Math.floor(points.length / 2)]);

    const v1u = p1.u - center.x;
    const v1v = p1.v - center.y;
    const v2u = p2.u - center.x;
    const v2v = p2.v - center.y;

    const cross = v1u * v2v - v1v * v2u;
    return cross > 0 ? "ccw" : "cw";
  }

  /**
   * Calculate arc angle in degrees
   */
  private calculateArcAngle(
    start: Point3D,
    end: Point3D,
    center: { x: number; y: number },
    plane: "XY" | "XZ" | "YZ"
  ): number {
    const getCoord = (p: Point3D) => {
      if (plane === "XY") return { u: p.x, v: p.y };
      if (plane === "XZ") return { u: p.x, v: p.z };
      return { u: p.y, v: p.z };
    };

    const s = getCoord(start);
    const e = getCoord(end);

    const startAngle = Math.atan2(s.v - center.y, s.u - center.x);
    const endAngle = Math.atan2(e.v - center.y, e.u - center.x);

    let angle = (endAngle - startAngle) * (180 / Math.PI);
    if (angle < 0) angle += 360;

    return angle;
  }

  /**
   * Convert fitted arcs to G-code
   */
  toGCode(arcs: FittedArc[], feedrate?: number): GCodeArc[] {
    return arcs.map(arc => ({
      code: arc.direction === "cw" ? "G02" : "G03",
      x: arc.end.x,
      y: arc.end.y,
      z: arc.end.z,
      i: arc.center.x - arc.start.x,
      j: arc.center.y - arc.start.y,
      f: feedrate,
    }));
  }

  /**
   * Quick arc detection check
   */
  quickCheck(points: Point3D[], tolerance_mm: number = 0.01): boolean {
    if (points.length < 5) return false;

    const fit = this.fitCircle(points, "XY");
    return fit !== null && fit.maxError <= tolerance_mm;
  }
}

export const arcFittingEngine = new ArcFittingEngine();
