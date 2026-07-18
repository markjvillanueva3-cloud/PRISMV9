/**
 * PRISM MCP Server — Surface Intersection Engine
 *
 * Surface-surface intersection curve tracing:
 * - Marching method with Newton refinement
 * - Supports parametric surfaces and implicit functions
 * - Cross-product tangent direction for curve tracing
 *
 * Based on Patrikalakis (MIT 2.158J).
 * Ported from PRISM_SURFACE_INTERSECTION_ENGINE.js (monolith R2.3.1).
 *
 * @module SurfaceIntersectionEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface Vec3 { x: number; y: number; z: number; }

export interface ParametricSurface {
  fn?: (u: number, v: number) => Vec3;
  controlPoints?: Vec3[];
  numU?: number;
  numV?: number;
}

export interface IntersectionPoint {
  u1: number; v1: number;
  u2: number; v2: number;
  point: Vec3;
}

export interface IntersectOptions {
  tolerance?: number;
  stepSize?: number;
  maxPoints?: number;
}

// ============================================================================
// ENGINE
// ============================================================================

class SurfaceIntersectionEngineImpl {

  /**
   * Find intersection curves between two parametric surfaces.
   * Uses marching method with Newton refinement.
   */
  intersect(s1: ParametricSurface, s2: ParametricSurface, options: IntersectOptions = {}): IntersectionPoint[][] {
    const { tolerance = 1e-6, stepSize = 0.01, maxPoints = 500 } = options;
    const starts = this.findStarts(s1, s2, tolerance);
    if (starts.length === 0) return [];

    const curves: IntersectionPoint[][] = [];
    const visited = new Set<string>();
    for (const start of starts) {
      const key = `${start.u1.toFixed(4)},${start.v1.toFixed(4)}`;
      if (visited.has(key)) continue;
      const curve = this.trace(s1, s2, start, stepSize, maxPoints, visited);
      if (curve.length > 1) curves.push(curve);
    }
    return curves;
  }

  // ── Internal methods ──

  private findStarts(s1: ParametricSurface, s2: ParametricSurface, tol: number): IntersectionPoint[] {
    const starts: IntersectionPoint[] = [];
    const samples = 10;
    for (let i = 0; i <= samples; i++) {
      for (let j = 0; j <= samples; j++) {
        const u1 = i / samples, v1 = j / samples;
        const p1 = this.evalSurface(s1, u1, v1);
        for (let k = 0; k <= samples; k++) {
          for (let l = 0; l <= samples; l++) {
            const u2 = k / samples, v2 = l / samples;
            const p2 = this.evalSurface(s2, u2, v2);
            if (dist(p1, p2) < tol * 10) {
              const refined = this.refine(s1, s2, u1, v1, u2, v2, tol);
              if (refined) starts.push(refined);
            }
          }
        }
      }
    }
    return this.removeDuplicates(starts, tol);
  }

  private refine(
    s1: ParametricSurface, s2: ParametricSurface,
    u1: number, v1: number, u2: number, v2: number, tol: number,
  ): IntersectionPoint | null {
    for (let iter = 0; iter < 20; iter++) {
      const p1 = this.evalSurface(s1, u1, v1);
      const p2 = this.evalSurface(s2, u2, v2);
      const diff = { x: p1.x - p2.x, y: p1.y - p2.y, z: p1.z - p2.z };
      const d = Math.sqrt(diff.x * diff.x + diff.y * diff.y + diff.z * diff.z);
      if (d < tol) return { u1, v1, u2, v2, point: p1 };

      u1 = Math.max(0, Math.min(1, u1 - diff.x * 0.1));
      v1 = Math.max(0, Math.min(1, v1 - diff.y * 0.1));
      u2 = Math.max(0, Math.min(1, u2 + diff.x * 0.1));
      v2 = Math.max(0, Math.min(1, v2 + diff.y * 0.1));
    }
    return null;
  }

  private trace(
    s1: ParametricSurface, s2: ParametricSurface,
    start: IntersectionPoint, step: number, max: number, visited: Set<string>,
  ): IntersectionPoint[] {
    const curve = [start];
    for (const dir of [1, -1]) {
      let cur = { ...start };
      for (let i = 0; i < max / 2; i++) {
        const n1 = this.surfaceNormal(s1, cur.u1, cur.v1);
        const n2 = this.surfaceNormal(s2, cur.u2, cur.v2);
        const t = cross(n1, n2);
        const len = Math.sqrt(t.x * t.x + t.y * t.y + t.z * t.z);
        if (len < 1e-10) break;

        const nu1 = cur.u1 + dir * step * t.x / len;
        const nv1 = cur.v1 + dir * step * t.y / len;
        if (nu1 < 0 || nu1 > 1 || nv1 < 0 || nv1 > 1) break;

        const refined = this.refine(s1, s2, nu1, nv1, cur.u2, cur.v2, 1e-8);
        if (!refined) break;

        const key = `${refined.u1.toFixed(4)},${refined.v1.toFixed(4)}`;
        if (visited.has(key)) break;
        visited.add(key);

        dir === 1 ? curve.push(refined) : curve.unshift(refined);
        cur = refined;
      }
    }
    return curve;
  }

  evalSurface(s: ParametricSurface, u: number, v: number): Vec3 {
    if (s.fn) return s.fn(u, v);
    const { controlPoints, numU, numV } = s;
    if (!controlPoints || !numU || !numV) return { x: 0, y: 0, z: 0 };
    const i = Math.min(Math.floor(u * (numU - 1)), numU - 2);
    const j = Math.min(Math.floor(v * (numV - 1)), numV - 2);
    const ss = u * (numU - 1) - i, tt = v * (numV - 1) - j;
    const p00 = controlPoints[i * numV + j], p01 = controlPoints[i * numV + j + 1];
    const p10 = controlPoints[(i + 1) * numV + j], p11 = controlPoints[(i + 1) * numV + j + 1];
    return {
      x: (1 - ss) * (1 - tt) * p00.x + (1 - ss) * tt * p01.x + ss * (1 - tt) * p10.x + ss * tt * p11.x,
      y: (1 - ss) * (1 - tt) * p00.y + (1 - ss) * tt * p01.y + ss * (1 - tt) * p10.y + ss * tt * p11.y,
      z: (1 - ss) * (1 - tt) * p00.z + (1 - ss) * tt * p01.z + ss * (1 - tt) * p10.z + ss * tt * p11.z,
    };
  }

  private surfaceNormal(s: ParametricSurface, u: number, v: number): Vec3 {
    const eps = 1e-6;
    const p0u = this.evalSurface(s, Math.max(0, u - eps), v);
    const p1u = this.evalSurface(s, Math.min(1, u + eps), v);
    const p0v = this.evalSurface(s, u, Math.max(0, v - eps));
    const p1v = this.evalSurface(s, u, Math.min(1, v + eps));
    const du = { x: (p1u.x - p0u.x) / (2 * eps), y: (p1u.y - p0u.y) / (2 * eps), z: (p1u.z - p0u.z) / (2 * eps) };
    const dv = { x: (p1v.x - p0v.x) / (2 * eps), y: (p1v.y - p0v.y) / (2 * eps), z: (p1v.z - p0v.z) / (2 * eps) };
    const n = cross(du, dv);
    const len = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z);
    if (len > 1e-10) { n.x /= len; n.y /= len; n.z /= len; }
    return n;
  }

  private removeDuplicates(pts: IntersectionPoint[], tol: number): IntersectionPoint[] {
    const unique: IntersectionPoint[] = [];
    for (const p of pts) {
      if (!unique.some(u => Math.abs(p.u1 - u.u1) < tol && Math.abs(p.v1 - u.v1) < tol)) {
        unique.push(p);
      }
    }
    return unique;
  }
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
}

function dist(a: Vec3, b: Vec3): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
}

export const surfaceIntersectionEngine = new SurfaceIntersectionEngineImpl();
