/**
 * PRISM MCP Server -- B-Spline Engine
 *
 * B-Spline and NURBS curve/surface evaluation:
 * - Cox-de Boor basis functions with knot span search
 * - B-spline and NURBS curve evaluation
 * - B-spline and NURBS surface evaluation (grid-based control points)
 * - Surface normal via central differences
 *
 * Ported from PRISM_BSPLINE_ENGINE.js (monolith R2.3.1).
 *
 * @module BSplineEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface Vec3 { x: number; y: number; z: number; }

export interface BSplineCurve {
  controlPoints: Vec3[];
  degree: number;
  knots: number[];
  weights?: number[];
}

export interface BSplineSurface {
  controlGrid: Vec3[][];
  degreeU: number;
  degreeV: number;
  knotsU: number[];
  knotsV: number[];
  weightsGrid?: number[][];
}

// ============================================================================
// ENGINE
// ============================================================================

const EPS = 1e-10;

class BSplineEngineImpl {

  /** Binary search for knot span index. */
  findKnotSpan(n: number, degree: number, t: number, knots: number[]): number {
    if (t >= knots[n + 1]) return n;
    if (t <= knots[degree]) return degree;

    let low = degree, high = n + 1, mid = Math.floor((low + high) / 2);
    while (t < knots[mid] || t >= knots[mid + 1]) {
      if (t < knots[mid]) high = mid;
      else low = mid;
      mid = Math.floor((low + high) / 2);
    }
    return mid;
  }

  /** Compute basis functions using Cox-de Boor recursion. */
  basisFunctions(span: number, t: number, degree: number, knots: number[]): number[] {
    const N = new Array(degree + 1).fill(0);
    const left = new Array(degree + 1).fill(0);
    const right = new Array(degree + 1).fill(0);
    N[0] = 1.0;

    for (let j = 1; j <= degree; j++) {
      left[j] = t - knots[span + 1 - j];
      right[j] = knots[span + j] - t;
      let saved = 0.0;
      for (let r = 0; r < j; r++) {
        const denom = right[r + 1] + left[j - r];
        const temp = denom > EPS ? N[r] / denom : 0;
        N[r] = saved + right[r + 1] * temp;
        saved = left[j - r] * temp;
      }
      N[j] = saved;
    }
    return N;
  }

  /** Evaluate B-spline curve at parameter t. */
  evaluateCurve(curve: BSplineCurve, t: number): Vec3 {
    const { controlPoints, degree, knots } = curve;
    const n = controlPoints.length - 1;
    const span = this.findKnotSpan(n, degree, t, knots);
    const N = this.basisFunctions(span, t, degree, knots);

    const point: Vec3 = { x: 0, y: 0, z: 0 };
    for (let i = 0; i <= degree; i++) {
      const cp = controlPoints[span - degree + i];
      point.x += N[i] * cp.x;
      point.y += N[i] * cp.y;
      point.z += N[i] * cp.z;
    }
    return point;
  }

  /** Evaluate NURBS (rational B-spline) curve at parameter t. */
  evaluateNURBSCurve(curve: BSplineCurve, t: number): Vec3 {
    const { controlPoints, degree, knots, weights } = curve;
    if (!weights) return this.evaluateCurve(curve, t);

    const n = controlPoints.length - 1;
    const span = this.findKnotSpan(n, degree, t, knots);
    const N = this.basisFunctions(span, t, degree, knots);

    const point: Vec3 = { x: 0, y: 0, z: 0 };
    let w = 0;
    for (let i = 0; i <= degree; i++) {
      const idx = span - degree + i;
      const Nw = N[i] * weights[idx];
      point.x += Nw * controlPoints[idx].x;
      point.y += Nw * controlPoints[idx].y;
      point.z += Nw * controlPoints[idx].z;
      w += Nw;
    }
    if (Math.abs(w) > EPS) { point.x /= w; point.y /= w; point.z /= w; }
    return point;
  }

  /** Evaluate B-spline surface at (u, v). Grid-based control points. */
  evaluateSurface(surface: BSplineSurface, u: number, v: number): Vec3 {
    const { controlGrid, degreeU, degreeV, knotsU, knotsV } = surface;
    const nU = controlGrid.length - 1;
    const nV = controlGrid[0].length - 1;

    const spanU = this.findKnotSpan(nU, degreeU, u, knotsU);
    const spanV = this.findKnotSpan(nV, degreeV, v, knotsV);
    const Nu = this.basisFunctions(spanU, u, degreeU, knotsU);
    const Nv = this.basisFunctions(spanV, v, degreeV, knotsV);

    const point: Vec3 = { x: 0, y: 0, z: 0 };
    for (let i = 0; i <= degreeU; i++) {
      for (let j = 0; j <= degreeV; j++) {
        const cp = controlGrid[spanU - degreeU + i][spanV - degreeV + j];
        const basis = Nu[i] * Nv[j];
        point.x += basis * cp.x;
        point.y += basis * cp.y;
        point.z += basis * cp.z;
      }
    }
    return point;
  }

  /** Evaluate NURBS surface at (u, v) with weights grid. */
  evaluateNURBSSurface(surface: BSplineSurface, u: number, v: number): Vec3 {
    const { controlGrid, degreeU, degreeV, knotsU, knotsV, weightsGrid } = surface;
    if (!weightsGrid) return this.evaluateSurface(surface, u, v);

    const nU = controlGrid.length - 1;
    const nV = controlGrid[0].length - 1;

    const spanU = this.findKnotSpan(nU, degreeU, u, knotsU);
    const spanV = this.findKnotSpan(nV, degreeV, v, knotsV);
    const Nu = this.basisFunctions(spanU, u, degreeU, knotsU);
    const Nv = this.basisFunctions(spanV, v, degreeV, knotsV);

    const point: Vec3 = { x: 0, y: 0, z: 0 };
    let w = 0;
    for (let i = 0; i <= degreeU; i++) {
      for (let j = 0; j <= degreeV; j++) {
        const idxU = spanU - degreeU + i;
        const idxV = spanV - degreeV + j;
        const cp = controlGrid[idxU][idxV];
        const basis = Nu[i] * Nv[j] * weightsGrid[idxU][idxV];
        point.x += basis * cp.x;
        point.y += basis * cp.y;
        point.z += basis * cp.z;
        w += basis;
      }
    }
    if (Math.abs(w) > EPS) { point.x /= w; point.y /= w; point.z /= w; }
    return point;
  }

  /** Compute surface normal via central finite differences. */
  evaluateSurfaceNormal(surface: BSplineSurface, u: number, v: number): Vec3 {
    const eps = 1e-5;
    const evalFn = surface.weightsGrid
      ? (uu: number, vv: number) => this.evaluateNURBSSurface(surface, uu, vv)
      : (uu: number, vv: number) => this.evaluateSurface(surface, uu, vv);

    const u1 = Math.max(0, u - eps), u2 = Math.min(1, u + eps);
    const v1 = Math.max(0, v - eps), v2 = Math.min(1, v + eps);

    const pU1 = evalFn(u1, v), pU2 = evalFn(u2, v);
    const pV1 = evalFn(u, v1), pV2 = evalFn(u, v2);

    const du = { x: (pU2.x - pU1.x) / (u2 - u1), y: (pU2.y - pU1.y) / (u2 - u1), z: (pU2.z - pU1.z) / (u2 - u1) };
    const dv = { x: (pV2.x - pV1.x) / (v2 - v1), y: (pV2.y - pV1.y) / (v2 - v1), z: (pV2.z - pV1.z) / (v2 - v1) };

    const n: Vec3 = {
      x: du.y * dv.z - du.z * dv.y,
      y: du.z * dv.x - du.x * dv.z,
      z: du.x * dv.y - du.y * dv.x,
    };
    const len = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z);
    if (len > EPS) { n.x /= len; n.y /= len; n.z /= len; }
    return n;
  }

  /** Generate uniform open knot vector for given n control points and degree. */
  uniformKnots(numControlPoints: number, degree: number): number[] {
    const n = numControlPoints - 1;
    const m = n + degree + 1;
    const knots: number[] = [];
    for (let i = 0; i <= m; i++) {
      if (i <= degree) knots.push(0);
      else if (i >= m - degree) knots.push(1);
      else knots.push((i - degree) / (m - 2 * degree));
    }
    return knots;
  }
}

export const bSplineEngine = new BSplineEngineImpl();
