/**
 * PRISM MCP Server — NURBS Engine
 *
 * NURBS and B-Spline evaluation for CAM operations:
 * - Basis functions (Cox-de Boor recursive + efficient span-based)
 * - Curve evaluation, tangent, curvature, tessellation
 * - Surface evaluation, normal, curvatures, tessellation, closest point
 * - Utilities (uniform knots, rational circle)
 *
 * Ported from PRISM_NURBS_LIBRARY.js (monolith R2.0.2).
 *
 * @module NURBSEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface Point3D { x: number; y: number; z: number; }

export interface NURBSCurve {
  degree: number;
  controlPoints: Point3D[];
  knots: number[];
  weights?: number[];
}

export interface NURBSSurface {
  degreeU: number;
  degreeV: number;
  controlPoints: Point3D[][];
  knotsU: number[];
  knotsV: number[];
  weights?: number[][];
}

export interface BasisResult {
  span: number;
  values: number[];
}

export interface SurfaceTessellation {
  vertices: Point3D[];
  normals: Point3D[];
  uvs: Array<{ u: number; v: number }>;
  indices: number[];
}

export interface SurfaceCurvatures {
  k1: number;
  k2: number;
  gaussian: number;
  mean: number;
}

export interface ClosestPointResult {
  u: number;
  v: number;
  point: Point3D;
}

// ============================================================================
// ENGINE
// ============================================================================

class NURBSEngineImpl {

  // ── Basis functions ──

  /** Cox-de Boor recursive basis function N_{i,p}(u). */
  basisFunction(i: number, p: number, u: number, knots: number[]): number {
    if (p === 0) return (u >= knots[i] && u < knots[i + 1]) ? 1.0 : 0.0;
    const left = knots[i + p] - knots[i];
    const right = knots[i + p + 1] - knots[i + 1];
    let result = 0.0;
    if (left !== 0) result += ((u - knots[i]) / left) * this.basisFunction(i, p - 1, u, knots);
    if (right !== 0) result += ((knots[i + p + 1] - u) / right) * this.basisFunction(i + 1, p - 1, u, knots);
    return result;
  }

  /** Efficient span-based basis functions (de Boor algorithm). */
  basisFunctions(u: number, p: number, knots: number[]): BasisResult {
    const n = knots.length - p - 2;
    let span = p;
    for (let i = p; i < n + 1; i++) {
      if (u >= knots[i] && u < knots[i + 1]) { span = i; break; }
    }
    if (u >= knots[n + 1]) span = n;

    const N = new Array(p + 1).fill(0);
    N[0] = 1.0;
    const left = new Array(p + 1).fill(0);
    const right = new Array(p + 1).fill(0);

    for (let j = 1; j <= p; j++) {
      left[j] = u - knots[span + 1 - j];
      right[j] = knots[span + j] - u;
      let saved = 0.0;
      for (let r = 0; r < j; r++) {
        const temp = N[r] / (right[r + 1] + left[j - r]);
        N[r] = saved + right[r + 1] * temp;
        saved = left[j - r] * temp;
      }
      N[j] = saved;
    }
    return { span, values: N };
  }

  // ── Curve operations ──

  /** Evaluate NURBS curve at parameter u ∈ [0, 1]. */
  curveEvaluate(curve: NURBSCurve, u: number): Point3D {
    const { degree, controlPoints, knots, weights } = curve;
    const n = controlPoints.length - 1;
    const uMin = knots[degree], uMax = knots[n + 1];
    const uActual = uMin + u * (uMax - uMin);
    const { span, values } = this.basisFunctions(uActual, degree, knots);

    let point: Point3D = { x: 0, y: 0, z: 0 };
    let sumW = 0;
    for (let i = 0; i <= degree; i++) {
      const idx = span - degree + i;
      const cp = controlPoints[idx];
      const w = weights ? weights[idx] : 1.0;
      const basis = values[i] * w;
      point.x += basis * cp.x;
      point.y += basis * cp.y;
      point.z += (cp.z ?? 0) * basis;
      sumW += basis;
    }
    if (weights && sumW > 0) { point.x /= sumW; point.y /= sumW; point.z /= sumW; }
    return point;
  }

  /** Unit tangent vector at parameter u. */
  curveTangent(curve: NURBSCurve, u: number): Point3D {
    const eps = 0.001;
    const p1 = this.curveEvaluate(curve, Math.max(0, u - eps));
    const p2 = this.curveEvaluate(curve, Math.min(1, u + eps));
    const d = { x: p2.x - p1.x, y: p2.y - p1.y, z: p2.z - p1.z };
    const len = Math.sqrt(d.x * d.x + d.y * d.y + d.z * d.z);
    return len > 1e-10 ? { x: d.x / len, y: d.y / len, z: d.z / len } : { x: 1, y: 0, z: 0 };
  }

  /** Curvature magnitude at parameter u. */
  curveCurvature(curve: NURBSCurve, u: number): number {
    const eps = 0.001;
    const p0 = this.curveEvaluate(curve, Math.max(0, u - eps));
    const p1 = this.curveEvaluate(curve, u);
    const p2 = this.curveEvaluate(curve, Math.min(1, u + eps));
    const d1 = { x: p1.x - p0.x, y: p1.y - p0.y, z: p1.z - p0.z };
    const d2 = { x: p2.x - p1.x, y: p2.y - p1.y, z: p2.z - p1.z };
    const cross = {
      x: d1.y * d2.z - d1.z * d2.y,
      y: d1.z * d2.x - d1.x * d2.z,
      z: d1.x * d2.y - d1.y * d2.x,
    };
    const crossMag = Math.sqrt(cross.x * cross.x + cross.y * cross.y + cross.z * cross.z);
    const d1Mag = Math.sqrt(d1.x * d1.x + d1.y * d1.y + d1.z * d1.z);
    return d1Mag > 1e-10 ? crossMag / Math.pow(d1Mag, 3) : 0;
  }

  /** Tessellate curve into points. */
  curveTessellate(curve: NURBSCurve, steps = 50): Array<Point3D & { u: number }> {
    const points: Array<Point3D & { u: number }> = [];
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const pt = this.curveEvaluate(curve, u);
      points.push({ ...pt, u });
    }
    return points;
  }

  // ── Surface operations ──

  /** Evaluate NURBS surface at (u, v) ∈ [0, 1]². */
  surfaceEvaluate(surface: NURBSSurface, u: number, v: number): Point3D {
    const { degreeU, degreeV, controlPoints, knotsU, knotsV, weights } = surface;
    const uCount = controlPoints.length, vCount = controlPoints[0].length;
    const uMin = knotsU[degreeU], uMax = knotsU[uCount];
    const vMin = knotsV[degreeV], vMax = knotsV[vCount];
    const uActual = uMin + u * (uMax - uMin);
    const vActual = vMin + v * (vMax - vMin);

    const basisU = this.basisFunctions(uActual, degreeU, knotsU);
    const basisV = this.basisFunctions(vActual, degreeV, knotsV);

    let point: Point3D = { x: 0, y: 0, z: 0 };
    let sumW = 0;
    for (let i = 0; i <= degreeU; i++) {
      const ui = basisU.span - degreeU + i;
      for (let j = 0; j <= degreeV; j++) {
        const vj = basisV.span - degreeV + j;
        if (ui >= 0 && ui < uCount && vj >= 0 && vj < vCount) {
          const cp = controlPoints[ui][vj];
          const w = weights ? weights[ui][vj] : 1.0;
          const basis = basisU.values[i] * basisV.values[j] * w;
          point.x += basis * cp.x;
          point.y += basis * cp.y;
          point.z += basis * cp.z;
          sumW += basis;
        }
      }
    }
    if (weights && sumW > 0) { point.x /= sumW; point.y /= sumW; point.z /= sumW; }
    return point;
  }

  /** Surface normal at (u, v). */
  surfaceNormal(surface: NURBSSurface, u: number, v: number): Point3D {
    const eps = 0.001;
    const p = this.surfaceEvaluate(surface, u, v);
    const pu = this.surfaceEvaluate(surface, Math.min(u + eps, 1), v);
    const pv = this.surfaceEvaluate(surface, u, Math.min(v + eps, 1));
    const du = { x: (pu.x - p.x) / eps, y: (pu.y - p.y) / eps, z: (pu.z - p.z) / eps };
    const dv = { x: (pv.x - p.x) / eps, y: (pv.y - p.y) / eps, z: (pv.z - p.z) / eps };
    const normal = {
      x: du.y * dv.z - du.z * dv.y,
      y: du.z * dv.x - du.x * dv.z,
      z: du.x * dv.y - du.y * dv.x,
    };
    const len = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
    if (len > 1e-10) { normal.x /= len; normal.y /= len; normal.z /= len; }
    else { normal.x = 0; normal.y = 0; normal.z = 1; }
    return normal;
  }

  /** Surface curvatures at (u, v). */
  surfaceCurvatures(surface: NURBSSurface, u: number, v: number): SurfaceCurvatures {
    const eps = 0.001;
    const p = this.surfaceEvaluate(surface, u, v);
    const n = this.surfaceNormal(surface, u, v);
    const pu = this.surfaceEvaluate(surface, Math.min(u + eps, 1), v);
    const pv = this.surfaceEvaluate(surface, u, Math.min(v + eps, 1));
    const puu = this.surfaceEvaluate(surface, Math.min(u + 2 * eps, 1), v);
    const pvv = this.surfaceEvaluate(surface, u, Math.min(v + 2 * eps, 1));
    const puv = this.surfaceEvaluate(surface, Math.min(u + eps, 1), Math.min(v + eps, 1));

    const Su = { x: (pu.x - p.x) / eps, y: (pu.y - p.y) / eps, z: (pu.z - p.z) / eps };
    const Sv = { x: (pv.x - p.x) / eps, y: (pv.y - p.y) / eps, z: (pv.z - p.z) / eps };
    const Suu = { x: (puu.x - 2 * pu.x + p.x) / (eps * eps), y: (puu.y - 2 * pu.y + p.y) / (eps * eps), z: (puu.z - 2 * pu.z + p.z) / (eps * eps) };
    const Svv = { x: (pvv.x - 2 * pv.x + p.x) / (eps * eps), y: (pvv.y - 2 * pv.y + p.y) / (eps * eps), z: (pvv.z - 2 * pv.z + p.z) / (eps * eps) };
    const Suv = { x: (puv.x - pu.x - pv.x + p.x) / (eps * eps), y: (puv.y - pu.y - pv.y + p.y) / (eps * eps), z: (puv.z - pu.z - pv.z + p.z) / (eps * eps) };

    const E = dot3(Su, Su);
    const F = dot3(Su, Sv);
    const G = dot3(Sv, Sv);
    const L = dot3(Suu, n);
    const M = dot3(Suv, n);
    const N_coeff = dot3(Svv, n);

    const denom = E * G - F * F;
    const K = denom > 1e-12 ? (L * N_coeff - M * M) / denom : 0;
    const H = denom > 1e-12 ? (E * N_coeff - 2 * F * M + G * L) / (2 * denom) : 0;

    const disc = Math.sqrt(Math.max(H * H - K, 0));
    return { k1: H + disc, k2: H - disc, gaussian: K, mean: H };
  }

  /** Tessellate surface into triangle mesh. */
  surfaceTessellate(surface: NURBSSurface, uDivs = 20, vDivs = 20): SurfaceTessellation {
    const vertices: Point3D[] = [];
    const normals: Point3D[] = [];
    const uvs: Array<{ u: number; v: number }> = [];
    const indices: number[] = [];

    for (let i = 0; i <= uDivs; i++) {
      const u = i / uDivs;
      for (let j = 0; j <= vDivs; j++) {
        const v = j / vDivs;
        vertices.push(this.surfaceEvaluate(surface, u, v));
        normals.push(this.surfaceNormal(surface, u, v));
        uvs.push({ u, v });
      }
    }
    for (let i = 0; i < uDivs; i++) {
      for (let j = 0; j < vDivs; j++) {
        const idx = i * (vDivs + 1) + j;
        indices.push(idx, idx + 1, idx + vDivs + 1);
        indices.push(idx + 1, idx + vDivs + 2, idx + vDivs + 1);
      }
    }
    return { vertices, normals, uvs, indices };
  }

  /** Find closest point on surface to a given point (Newton iteration). */
  surfaceClosestPoint(surface: NURBSSurface, point: Point3D, tolerance = 0.0001, maxIter = 100): ClosestPointResult {
    let u = 0.5, v = 0.5;
    for (let iter = 0; iter < maxIter; iter++) {
      const p = this.surfaceEvaluate(surface, u, v);
      const eps = 0.001;
      const pu = this.surfaceEvaluate(surface, Math.min(u + eps, 1), v);
      const pv = this.surfaceEvaluate(surface, u, Math.min(v + eps, 1));
      const Su = { x: (pu.x - p.x) / eps, y: (pu.y - p.y) / eps, z: (pu.z - p.z) / eps };
      const Sv = { x: (pv.x - p.x) / eps, y: (pv.y - p.y) / eps, z: (pv.z - p.z) / eps };
      const r = { x: point.x - p.x, y: point.y - p.y, z: point.z - p.z };

      const a11 = dot3(Su, Su);
      const a12 = dot3(Su, Sv);
      const a22 = dot3(Sv, Sv);
      const b1 = dot3(r, Su);
      const b2 = dot3(r, Sv);
      const det = a11 * a22 - a12 * a12;
      if (Math.abs(det) < 1e-12) break;

      const du = (a22 * b1 - a12 * b2) / det;
      const dv = (a11 * b2 - a12 * b1) / det;
      u = Math.max(0, Math.min(1, u + du));
      v = Math.max(0, Math.min(1, v + dv));
      if (Math.abs(du) < tolerance && Math.abs(dv) < tolerance) break;
    }
    return { u, v, point: this.surfaceEvaluate(surface, u, v) };
  }

  // ── Utilities ──

  /** Generate uniform (clamped) knot vector for n control points of given degree. */
  uniformKnots(n: number, degree: number): number[] {
    const knots: number[] = [];
    for (let i = 0; i <= degree; i++) knots.push(0);
    for (let i = 1; i < n - degree; i++) knots.push(i / (n - degree));
    for (let i = 0; i <= degree; i++) knots.push(1);
    return knots;
  }

  /** Create a rational NURBS circle (degree 2, 9 control points). */
  createCircle(center: Point3D, radius: number): NURBSCurve {
    const sqrt2 = Math.sqrt(2) / 2;
    const controlPoints: Point3D[] = [
      { x: radius, y: 0, z: 0 }, { x: radius, y: radius, z: 0 },
      { x: 0, y: radius, z: 0 }, { x: -radius, y: radius, z: 0 },
      { x: -radius, y: 0, z: 0 }, { x: -radius, y: -radius, z: 0 },
      { x: 0, y: -radius, z: 0 }, { x: radius, y: -radius, z: 0 },
      { x: radius, y: 0, z: 0 },
    ].map(p => ({ x: p.x + center.x, y: p.y + center.y, z: p.z + (center.z ?? 0) }));
    const weights = [1, sqrt2, 1, sqrt2, 1, sqrt2, 1, sqrt2, 1];
    const knots = [0, 0, 0, 0.25, 0.25, 0.5, 0.5, 0.75, 0.75, 1, 1, 1];
    return { degree: 2, controlPoints, weights, knots };
  }
}

function dot3(a: Point3D, b: Point3D): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export const nurbsEngine = new NURBSEngineImpl();
