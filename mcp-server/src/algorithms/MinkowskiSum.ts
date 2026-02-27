/**
 * Minkowski Sum — Fixture Accessibility & Collision Envelope
 *
 * Computes the Minkowski sum of two 2D polygons to determine fixture accessibility
 * zones and collision-free approach paths. Used for automated fixture design where
 * tool access must be guaranteed around clamped workpieces.
 *
 * The Minkowski sum P ⊕ Q = { p + q | p ∈ P, q ∈ Q } creates the swept region
 * that represents all positions of Q's reference point when Q slides around P.
 *
 * Manufacturing uses: fixture accessibility analysis, gripper clearance,
 * automated clamping zone verification, robot reach envelope.
 *
 * References:
 * - Lozano-Pérez, T. (1983). "Spatial Planning: A Configuration Space Approach"
 * - de Berg et al. (2008). "Computational Geometry: Algorithms and Applications"
 *
 * @module algorithms/MinkowskiSum
 */

import type {
  Algorithm, AlgorithmMeta, ValidationResult, ValidationIssue, WithWarnings,
} from "./types.js";

export interface Point2D {
  x: number;
  y: number;
}

export interface MinkowskiSumInput {
  /** First convex polygon vertices (CCW order). */
  polygon_a: Point2D[];
  /** Second convex polygon vertices (CCW order). */
  polygon_b: Point2D[];
  /** Whether to compute the Minkowski difference (for interior accessibility). Default false. */
  compute_difference?: boolean;
  /** Tolerance for degeneracy checks [mm]. Default 1e-8. */
  tolerance?: number;
}

export interface MinkowskiSumOutput extends WithWarnings {
  /** Resulting Minkowski sum polygon vertices (CCW). */
  sum_polygon: Point2D[];
  /** Area of the sum polygon [mm²]. */
  sum_area: number;
  /** Area of polygon A [mm²]. */
  area_a: number;
  /** Area of polygon B [mm²]. */
  area_b: number;
  /** Perimeter of sum polygon [mm]. */
  sum_perimeter: number;
  /** Minkowski difference polygon (if requested). */
  difference_polygon: Point2D[];
  /** Whether the difference is non-empty (accessibility exists). */
  accessible: boolean;
  /** Centroid of sum polygon. */
  centroid: Point2D;
  /** Number of vertices in result. */
  n_vertices: number;
  calculation_method: string;
}

export class MinkowskiSum implements Algorithm<MinkowskiSumInput, MinkowskiSumOutput> {

  validate(input: MinkowskiSumInput): ValidationResult {
    const issues: ValidationIssue[] = [];
    if (!input.polygon_a?.length || input.polygon_a.length < 3) {
      issues.push({ field: "polygon_a", message: "At least 3 vertices required", severity: "error" });
    }
    if (!input.polygon_b?.length || input.polygon_b.length < 3) {
      issues.push({ field: "polygon_b", message: "At least 3 vertices required", severity: "error" });
    }
    if (input.polygon_a?.length > 500 || input.polygon_b?.length > 500) {
      issues.push({ field: "polygon_a", message: "Max 500 vertices per polygon", severity: "warning" });
    }
    // Check convexity
    if (input.polygon_a?.length >= 3 && !this.isConvex(input.polygon_a)) {
      issues.push({ field: "polygon_a", message: "Polygon must be convex", severity: "error" });
    }
    if (input.polygon_b?.length >= 3 && !this.isConvex(input.polygon_b)) {
      issues.push({ field: "polygon_b", message: "Polygon must be convex", severity: "error" });
    }
    return { valid: issues.filter(i => i.severity === "error").length === 0, issues };
  }

  calculate(input: MinkowskiSumInput): MinkowskiSumOutput {
    const warnings: string[] = [];
    const tol = input.tolerance ?? 1e-8;
    const computeDiff = input.compute_difference ?? false;

    // Ensure CCW orientation
    const a = this.ensureCCW(input.polygon_a);
    const b = this.ensureCCW(input.polygon_b);

    // Compute Minkowski sum via rotating calipers
    const sumPoly = this.computeSum(a, b);

    // Remove degenerate collinear points
    const cleaned = this.removeCollinear(sumPoly, tol);

    const areaA = this.polygonArea(a);
    const areaB = this.polygonArea(b);
    const sumArea = this.polygonArea(cleaned);
    const sumPerimeter = this.polygonPerimeter(cleaned);
    const centroid = this.polygonCentroid(cleaned);

    // Minkowski difference: A ⊖ B = A ⊕ (-B)
    let diffPoly: Point2D[] = [];
    let accessible = false;
    if (computeDiff) {
      const negB = b.map(p => ({ x: -p.x, y: -p.y }));
      const negBCCW = this.ensureCCW(negB);
      diffPoly = this.removeCollinear(this.computeSum(a, negBCCW), tol);
      accessible = this.polygonArea(diffPoly) > tol;
    }

    return {
      sum_polygon: cleaned,
      sum_area: sumArea,
      area_a: areaA,
      area_b: areaB,
      sum_perimeter: sumPerimeter,
      difference_polygon: diffPoly,
      accessible,
      centroid,
      n_vertices: cleaned.length,
      warnings,
      calculation_method: `Minkowski sum (rotating calipers, |A|=${a.length}, |B|=${b.length})`,
    };
  }

  private computeSum(a: Point2D[], b: Point2D[]): Point2D[] {
    // Find bottom-most points (starting vertices)
    let ai = 0, bi = 0;
    for (let i = 1; i < a.length; i++) {
      if (a[i].y < a[ai].y || (a[i].y === a[ai].y && a[i].x < a[ai].x)) ai = i;
    }
    for (let i = 1; i < b.length; i++) {
      if (b[i].y < b[bi].y || (b[i].y === b[bi].y && b[i].x < b[bi].x)) bi = i;
    }

    const na = a.length, nb = b.length;
    const result: Point2D[] = [];
    let ia = 0, ib = 0;

    while (ia < na || ib < nb) {
      const pa = a[(ai + ia) % na];
      const pb = b[(bi + ib) % nb];
      result.push({ x: pa.x + pb.x, y: pa.y + pb.y });

      // Edge vectors
      const ea = this.edgeVector(a, (ai + ia) % na);
      const eb = this.edgeVector(b, (bi + ib) % nb);
      const cross = ea.x * eb.y - ea.y * eb.x;

      if (ia < na && (ib >= nb || cross > 0)) {
        ia++;
      } else if (ib < nb && (ia >= na || cross < 0)) {
        ib++;
      } else {
        ia++;
        ib++;
      }
    }

    return result;
  }

  private edgeVector(poly: Point2D[], i: number): Point2D {
    const j = (i + 1) % poly.length;
    return { x: poly[j].x - poly[i].x, y: poly[j].y - poly[i].y };
  }

  private isConvex(poly: Point2D[]): boolean {
    const n = poly.length;
    let sign = 0;
    for (let i = 0; i < n; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % n];
      const c = poly[(i + 2) % n];
      const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
      if (Math.abs(cross) < 1e-10) continue;
      if (sign === 0) sign = cross > 0 ? 1 : -1;
      else if ((cross > 0 ? 1 : -1) !== sign) return false;
    }
    return true;
  }

  private ensureCCW(poly: Point2D[]): Point2D[] {
    const area = this.signedArea(poly);
    return area >= 0 ? [...poly] : [...poly].reverse();
  }

  private signedArea(poly: Point2D[]): number {
    let area = 0;
    for (let i = 0; i < poly.length; i++) {
      const j = (i + 1) % poly.length;
      area += poly[i].x * poly[j].y - poly[j].x * poly[i].y;
    }
    return area / 2;
  }

  private polygonArea(poly: Point2D[]): number {
    return Math.abs(this.signedArea(poly));
  }

  private polygonPerimeter(poly: Point2D[]): number {
    let p = 0;
    for (let i = 0; i < poly.length; i++) {
      const j = (i + 1) % poly.length;
      p += Math.sqrt((poly[j].x - poly[i].x) ** 2 + (poly[j].y - poly[i].y) ** 2);
    }
    return p;
  }

  private polygonCentroid(poly: Point2D[]): Point2D {
    let cx = 0, cy = 0, a = 0;
    for (let i = 0; i < poly.length; i++) {
      const j = (i + 1) % poly.length;
      const f = poly[i].x * poly[j].y - poly[j].x * poly[i].y;
      cx += (poly[i].x + poly[j].x) * f;
      cy += (poly[i].y + poly[j].y) * f;
      a += f;
    }
    a /= 2;
    return { x: cx / (6 * a), y: cy / (6 * a) };
  }

  private removeCollinear(poly: Point2D[], tol: number): Point2D[] {
    const result: Point2D[] = [];
    const n = poly.length;
    for (let i = 0; i < n; i++) {
      const a = poly[(i - 1 + n) % n];
      const b = poly[i];
      const c = poly[(i + 1) % n];
      const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
      if (Math.abs(cross) > tol) result.push(b);
    }
    return result.length >= 3 ? result : poly;
  }

  getMetadata(): AlgorithmMeta {
    return {
      id: "minkowski-sum",
      name: "Minkowski Sum (Fixture Accessibility)",
      description: "Convex polygon Minkowski sum/difference for fixture accessibility analysis",
      formula: "P ⊕ Q = { p + q | p ∈ P, q ∈ Q }; rotating calipers O(n+m)",
      reference: "Lozano-Pérez (1983); de Berg et al. (2008)",
      safety_class: "critical",
      domain: "collision",
      inputs: { polygon_a: "Convex polygon vertices", polygon_b: "Tool/fixture polygon vertices" },
      outputs: { sum_polygon: "Minkowski sum polygon", accessible: "Whether fixture access is possible" },
    };
  }
}
