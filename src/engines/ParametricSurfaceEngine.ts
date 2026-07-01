/**
 * ParametricSurfaceEngine — Parametric surface generation and analysis
 *
 * Creates and evaluates parametric surfaces: planes, cylinders, cones,
 * spheres, tori, and freeform surfaces. Computes surface properties
 * (normals, curvature, area).
 *
 * Manufacturing use: workpiece modeling, fixture surface definition,
 * tool contact analysis, surface quality assessment.
 *
 * @module ParametricSurfaceEngine
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SurfacePoint {
  position: [number, number, number];
  normal: [number, number, number];
  u: number;
  v: number;
}

export interface SurfaceCurvature {
  gaussian: number;     // K = κ₁ × κ₂
  mean: number;         // H = (κ₁ + κ₂) / 2
  principal: [number, number];  // [κ₁, κ₂]
  classification: string;  // "elliptic" | "hyperbolic" | "parabolic" | "planar"
}

export interface SurfaceMesh {
  vertices: [number, number, number][];
  normals: [number, number, number][];
  triangles: [number, number, number][];
  uvCoords: [number, number][];
  area: number;
}

export type SurfaceType = "plane" | "cylinder" | "cone" | "sphere" | "torus";

export interface SurfaceParams {
  type: SurfaceType;
  origin?: [number, number, number];
  axis?: [number, number, number];
  radius?: number;
  minorRadius?: number;  // For torus
  halfAngle?: number;    // For cone (radians)
  width?: number;        // For plane
  height?: number;       // For plane/cylinder
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

class ParametricSurfaceEngineImpl {

  /**
   * Evaluate a parametric surface at (u, v).
   */
  evaluate(params: SurfaceParams, u: number, v: number): SurfacePoint {
    const origin = params.origin ?? [0, 0, 0];

    switch (params.type) {
      case "plane":
        return this._evalPlane(origin, params.width ?? 10, params.height ?? 10, u, v);
      case "cylinder":
        return this._evalCylinder(origin, params.radius ?? 1, params.height ?? 10, u, v);
      case "cone":
        return this._evalCone(origin, params.radius ?? 1, params.height ?? 10, params.halfAngle ?? Math.PI / 6, u, v);
      case "sphere":
        return this._evalSphere(origin, params.radius ?? 1, u, v);
      case "torus":
        return this._evalTorus(origin, params.radius ?? 5, params.minorRadius ?? 1, u, v);
      default:
        return this._evalPlane(origin, 10, 10, u, v);
    }
  }

  /**
   * Generate a triangle mesh of the surface.
   */
  tessellate(params: SurfaceParams, uSteps = 20, vSteps = 20): SurfaceMesh {
    const vertices: [number, number, number][] = [];
    const normals: [number, number, number][] = [];
    const uvCoords: [number, number][] = [];
    const triangles: [number, number, number][] = [];

    // Generate vertices
    for (let i = 0; i <= uSteps; i++) {
      for (let j = 0; j <= vSteps; j++) {
        const u = i / uSteps;
        const v = j / vSteps;
        const pt = this.evaluate(params, u, v);
        vertices.push(pt.position);
        normals.push(pt.normal);
        uvCoords.push([u, v]);
      }
    }

    // Generate triangles
    for (let i = 0; i < uSteps; i++) {
      for (let j = 0; j < vSteps; j++) {
        const idx = i * (vSteps + 1) + j;
        triangles.push([idx, idx + 1, idx + vSteps + 1]);
        triangles.push([idx + 1, idx + vSteps + 2, idx + vSteps + 1]);
      }
    }

    // Approximate surface area
    let area = 0;
    for (const [a, b, c] of triangles) {
      area += this._triangleArea(vertices[a], vertices[b], vertices[c]);
    }

    return { vertices, normals, triangles, uvCoords, area };
  }

  /**
   * Compute surface curvature at (u, v).
   */
  curvature(params: SurfaceParams, u: number, v: number): SurfaceCurvature {
    const h = 1e-5;

    // First fundamental form coefficients via finite differences
    const p = this.evaluate(params, u, v).position;
    const pu = this.evaluate(params, u + h, v).position;
    const pv = this.evaluate(params, u, v + h).position;
    const puu = this.evaluate(params, u + h, v);
    const pvv = this.evaluate(params, u, v + h);
    const puv = this.evaluate(params, u + h, v + h);

    const du: [number, number, number] = [
      (pu[0] - p[0]) / h, (pu[1] - p[1]) / h, (pu[2] - p[2]) / h
    ];
    const dv: [number, number, number] = [
      (pv[0] - p[0]) / h, (pv[1] - p[1]) / h, (pv[2] - p[2]) / h
    ];

    const E = this._dot3(du, du);
    const F = this._dot3(du, dv);
    const G = this._dot3(dv, dv);

    // Normal
    const n = this._normalize3(this._cross3(du, dv));

    // Second fundamental form (simplified)
    const duu: [number, number, number] = [
      (this.evaluate(params, u + h, v).position[0] - 2 * p[0] + this.evaluate(params, u - h, v).position[0]) / (h * h),
      (this.evaluate(params, u + h, v).position[1] - 2 * p[1] + this.evaluate(params, u - h, v).position[1]) / (h * h),
      (this.evaluate(params, u + h, v).position[2] - 2 * p[2] + this.evaluate(params, u - h, v).position[2]) / (h * h),
    ];
    const dvv: [number, number, number] = [
      (this.evaluate(params, u, v + h).position[0] - 2 * p[0] + this.evaluate(params, u, v - h).position[0]) / (h * h),
      (this.evaluate(params, u, v + h).position[1] - 2 * p[1] + this.evaluate(params, u, v - h).position[1]) / (h * h),
      (this.evaluate(params, u, v + h).position[2] - 2 * p[2] + this.evaluate(params, u, v - h).position[2]) / (h * h),
    ];

    const L = this._dot3(duu, n);
    const N = this._dot3(dvv, n);

    // Principal curvatures from shape operator eigenvalues
    const denom = E * G - F * F;
    if (Math.abs(denom) < 1e-12) {
      return { gaussian: 0, mean: 0, principal: [0, 0], classification: "planar" };
    }

    const K = (L * N) / denom;  // Gaussian curvature
    const H = (E * N + G * L) / (2 * denom);  // Mean curvature

    const disc = Math.max(0, H * H - K);
    const k1 = H + Math.sqrt(disc);
    const k2 = H - Math.sqrt(disc);

    let classification: string;
    if (Math.abs(K) < 1e-8 && Math.abs(H) < 1e-8) classification = "planar";
    else if (K > 1e-8) classification = "elliptic";
    else if (K < -1e-8) classification = "hyperbolic";
    else classification = "parabolic";

    return { gaussian: K, mean: H, principal: [k1, k2], classification };
  }

  /**
   * Compute approximate surface area.
   */
  area(params: SurfaceParams, uSteps = 50, vSteps = 50): number {
    const mesh = this.tessellate(params, uSteps, vSteps);
    return mesh.area;
  }

  /**
   * Find closest point on surface to a query point (approximate).
   */
  closestPoint(
    params: SurfaceParams, query: [number, number, number],
    uSteps = 30, vSteps = 30
  ): { point: SurfacePoint; distance: number } {
    let bestDist = Infinity;
    let bestPt: SurfacePoint | null = null;

    for (let i = 0; i <= uSteps; i++) {
      for (let j = 0; j <= vSteps; j++) {
        const u = i / uSteps;
        const v = j / vSteps;
        const pt = this.evaluate(params, u, v);
        const d = Math.sqrt(
          (pt.position[0] - query[0]) ** 2 +
          (pt.position[1] - query[1]) ** 2 +
          (pt.position[2] - query[2]) ** 2
        );
        if (d < bestDist) {
          bestDist = d;
          bestPt = pt;
        }
      }
    }

    return { point: bestPt!, distance: bestDist };
  }

  // -------------------------------------------------------------------------
  // Surface evaluators
  // -------------------------------------------------------------------------

  private _evalPlane(
    o: [number, number, number], w: number, h: number, u: number, v: number
  ): SurfacePoint {
    return {
      position: [o[0] + (u - 0.5) * w, o[1] + (v - 0.5) * h, o[2]],
      normal: [0, 0, 1],
      u, v,
    };
  }

  private _evalCylinder(
    o: [number, number, number], r: number, h: number, u: number, v: number
  ): SurfacePoint {
    const theta = u * 2 * Math.PI;
    const x = o[0] + r * Math.cos(theta);
    const y = o[1] + r * Math.sin(theta);
    const z = o[2] + v * h;
    return {
      position: [x, y, z],
      normal: [Math.cos(theta), Math.sin(theta), 0],
      u, v,
    };
  }

  private _evalCone(
    o: [number, number, number], r: number, h: number,
    halfAngle: number, u: number, v: number
  ): SurfacePoint {
    const theta = u * 2 * Math.PI;
    const t = v; // 0 at base, 1 at apex
    const rAt = r * (1 - t);
    const x = o[0] + rAt * Math.cos(theta);
    const y = o[1] + rAt * Math.sin(theta);
    const z = o[2] + t * h;
    const nLen = Math.sqrt(r * r + h * h);
    return {
      position: [x, y, z],
      normal: [
        h * Math.cos(theta) / nLen,
        h * Math.sin(theta) / nLen,
        r / nLen,
      ],
      u, v,
    };
  }

  private _evalSphere(
    o: [number, number, number], r: number, u: number, v: number
  ): SurfacePoint {
    const theta = u * 2 * Math.PI;
    const phi = v * Math.PI;
    const sp = Math.sin(phi);
    const x = o[0] + r * sp * Math.cos(theta);
    const y = o[1] + r * sp * Math.sin(theta);
    const z = o[2] + r * Math.cos(phi);
    const nx = sp * Math.cos(theta);
    const ny = sp * Math.sin(theta);
    const nz = Math.cos(phi);
    return { position: [x, y, z], normal: [nx, ny, nz], u, v };
  }

  private _evalTorus(
    o: [number, number, number], R: number, r: number, u: number, v: number
  ): SurfacePoint {
    const theta = u * 2 * Math.PI;
    const phi = v * 2 * Math.PI;
    const x = o[0] + (R + r * Math.cos(phi)) * Math.cos(theta);
    const y = o[1] + (R + r * Math.cos(phi)) * Math.sin(theta);
    const z = o[2] + r * Math.sin(phi);
    const nx = Math.cos(phi) * Math.cos(theta);
    const ny = Math.cos(phi) * Math.sin(theta);
    const nz = Math.sin(phi);
    return { position: [x, y, z], normal: [nx, ny, nz], u, v };
  }

  // -------------------------------------------------------------------------
  // Vector utilities
  // -------------------------------------------------------------------------

  private _dot3(a: [number, number, number], b: [number, number, number]): number {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }

  private _cross3(a: [number, number, number], b: [number, number, number]): [number, number, number] {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0],
    ];
  }

  private _normalize3(v: [number, number, number]): [number, number, number] {
    const len = Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2);
    return len > 1e-10 ? [v[0] / len, v[1] / len, v[2] / len] : [0, 0, 1];
  }

  private _triangleArea(
    a: [number, number, number], b: [number, number, number], c: [number, number, number]
  ): number {
    const ab: [number, number, number] = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const ac: [number, number, number] = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const cross = this._cross3(ab, ac);
    return 0.5 * Math.sqrt(cross[0] ** 2 + cross[1] ** 2 + cross[2] ** 2);
  }
}

export const parametricSurfaceEngine = new ParametricSurfaceEngineImpl();
