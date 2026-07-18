/**
 * PRISM MCP Server — Curvature Analysis Engine
 *
 * Discrete differential geometry for triangle meshes:
 * - Gaussian curvature (angle defect method)
 * - Mean curvature (Laplace-Beltrami / cotangent weights)
 * - Principal curvatures, shape index, curvedness
 * - Surface type classification
 *
 * Based on Meyer et al. 2003, Stanford CS 468.
 * Ported from PRISM_CURVATURE_ANALYSIS_ENGINE.js (monolith R2.3.1).
 *
 * @module CurvatureAnalysisEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface TriangleMesh {
  vertices: number[];   // flat [x0,y0,z0, x1,y1,z1, ...]
  indices: number[];    // triangle indices [a,b,c, ...]
}

interface Vec3 { x: number; y: number; z: number; }

export interface CurvatureResult {
  gaussian: number[];
  mean: number[];
  principalMax: number[];
  principalMin: number[];
  shapeIndex: number[];
  curvedness: number[];
}

export type SurfaceType =
  | "planar" | "cylindrical_convex" | "cylindrical_concave"
  | "elliptic_convex" | "elliptic_concave" | "hyperbolic"
  | "minimal_surface" | "unknown";

export interface VertexClassification {
  type: SurfaceType;
  gaussian: number;
  mean: number;
  shapeIndex: number;
}

// ============================================================================
// ENGINE
// ============================================================================

class CurvatureAnalysisEngineImpl {

  /** Compute all curvature types for a triangle mesh. */
  computeAll(mesh: TriangleMesh): CurvatureResult {
    const gaussian = this.computeGaussian(mesh);
    const mean = this.computeMean(mesh);
    const principal = this.computePrincipal(gaussian, mean);
    return {
      gaussian,
      mean,
      principalMax: principal.max,
      principalMin: principal.min,
      shapeIndex: principal.shapeIndex,
      curvedness: principal.curvedness,
    };
  }

  /** Gaussian curvature via angle defect: K = (2π - Σθ) / A_mixed. */
  computeGaussian(mesh: TriangleMesh): number[] {
    const numVerts = mesh.vertices.length / 3;
    const curvature = new Float64Array(numVerts);
    const areas = this.computeMixedVoronoiAreas(mesh);

    for (let i = 0; i < numVerts; i++) curvature[i] = 2 * Math.PI;

    for (let i = 0; i < mesh.indices.length; i += 3) {
      const a = mesh.indices[i], b = mesh.indices[i + 1], c = mesh.indices[i + 2];
      const va = getVertex(mesh.vertices, a);
      const vb = getVertex(mesh.vertices, b);
      const vc = getVertex(mesh.vertices, c);
      const angles = triangleAngles(va, vb, vc);
      curvature[a] -= angles[0];
      curvature[b] -= angles[1];
      curvature[c] -= angles[2];
    }

    for (let i = 0; i < numVerts; i++) {
      if (areas[i] > 1e-10) curvature[i] /= areas[i];
    }
    return Array.from(curvature);
  }

  /** Mean curvature via Laplace-Beltrami operator with cotangent weights. */
  computeMean(mesh: TriangleMesh): number[] {
    const numVerts = mesh.vertices.length / 3;
    const curvature = new Float64Array(numVerts);
    const areas = this.computeMixedVoronoiAreas(mesh);
    const cotWeights = this.computeCotangentWeights(mesh);

    for (let i = 0; i < numVerts; i++) {
      const vi = getVertex(mesh.vertices, i);
      let lx = 0, ly = 0, lz = 0;
      for (const { neighbor, weight } of cotWeights[i]) {
        const vj = getVertex(mesh.vertices, neighbor);
        lx += weight * (vj.x - vi.x);
        ly += weight * (vj.y - vi.y);
        lz += weight * (vj.z - vi.z);
      }
      const mag = Math.sqrt(lx * lx + ly * ly + lz * lz);
      if (areas[i] > 1e-10) curvature[i] = mag / (2 * areas[i]);
    }
    return Array.from(curvature);
  }

  /** Principal curvatures from Gaussian (K = k1·k2) and Mean (H = (k1+k2)/2). */
  computePrincipal(gaussian: number[], mean: number[]) {
    const n = gaussian.length;
    const max = new Float64Array(n);
    const min = new Float64Array(n);
    const shapeIndex = new Float64Array(n);
    const curvedness = new Float64Array(n);

    for (let i = 0; i < n; i++) {
      const K = gaussian[i];
      const H = mean[i];
      const disc = Math.sqrt(Math.max(H * H - K, 0));
      max[i] = H + disc;
      min[i] = H - disc;
      if (Math.abs(max[i] - min[i]) > 1e-10) {
        shapeIndex[i] = (2 / Math.PI) * Math.atan((max[i] + min[i]) / (max[i] - min[i]));
      }
      curvedness[i] = Math.sqrt((max[i] * max[i] + min[i] * min[i]) / 2);
    }

    return {
      max: Array.from(max),
      min: Array.from(min),
      shapeIndex: Array.from(shapeIndex),
      curvedness: Array.from(curvedness),
    };
  }

  /** Classify surface type at each vertex. */
  classifySurface(curvatureData: CurvatureResult): VertexClassification[] {
    const { gaussian, mean, shapeIndex } = curvatureData;
    const result: VertexClassification[] = [];
    const eps = 1e-6;

    for (let i = 0; i < gaussian.length; i++) {
      const K = gaussian[i], H = mean[i];
      let type: SurfaceType;

      if (Math.abs(K) < eps && Math.abs(H) < eps) type = "planar";
      else if (Math.abs(K) < eps && H > eps) type = "cylindrical_convex";
      else if (Math.abs(K) < eps && H < -eps) type = "cylindrical_concave";
      else if (K > eps && H > eps) type = "elliptic_convex";
      else if (K > eps && H < -eps) type = "elliptic_concave";
      else if (K < -eps) type = "hyperbolic";
      else if (Math.abs(H) < eps) type = "minimal_surface";
      else type = "unknown";

      result.push({ type, gaussian: K, mean: H, shapeIndex: shapeIndex[i] });
    }
    return result;
  }

  // ── Internal helpers ──

  private computeMixedVoronoiAreas(mesh: TriangleMesh): Float64Array {
    const numVerts = mesh.vertices.length / 3;
    const areas = new Float64Array(numVerts);

    for (let i = 0; i < mesh.indices.length; i += 3) {
      const a = mesh.indices[i], b = mesh.indices[i + 1], c = mesh.indices[i + 2];
      const va = getVertex(mesh.vertices, a);
      const vb = getVertex(mesh.vertices, b);
      const vc = getVertex(mesh.vertices, c);
      const angles = triangleAngles(va, vb, vc);
      const isObtuse = angles.some(ang => ang > Math.PI / 2);

      if (isObtuse) {
        const faceArea = triangleArea(va, vb, vc);
        const idxs = [a, b, c];
        for (let j = 0; j < 3; j++) {
          areas[idxs[j]] += angles[j] > Math.PI / 2 ? faceArea / 2 : faceArea / 4;
        }
      } else {
        const cotA = cotangent(angles[0]);
        const cotB = cotangent(angles[1]);
        const cotC = cotangent(angles[2]);
        const ab2 = distSq(va, vb);
        const bc2 = distSq(vb, vc);
        const ca2 = distSq(vc, va);
        areas[a] += (ab2 * cotC + ca2 * cotB) / 8;
        areas[b] += (ab2 * cotC + bc2 * cotA) / 8;
        areas[c] += (bc2 * cotA + ca2 * cotB) / 8;
      }
    }
    return areas;
  }

  private computeCotangentWeights(mesh: TriangleMesh): Array<Array<{ neighbor: number; weight: number }>> {
    const numVerts = mesh.vertices.length / 3;
    const weights: Array<Array<{ neighbor: number; weight: number }>> = Array.from({ length: numVerts }, () => []);
    const edgeWeights = new Map<string, number>();

    for (let i = 0; i < mesh.indices.length; i += 3) {
      const indices = [mesh.indices[i], mesh.indices[i + 1], mesh.indices[i + 2]];
      const verts = indices.map(idx => getVertex(mesh.vertices, idx));

      for (let j = 0; j < 3; j++) {
        const a = indices[j];
        const b = indices[(j + 1) % 3];
        const ca = sub(verts[j], verts[(j + 2) % 3]);
        const cb = sub(verts[(j + 1) % 3], verts[(j + 2) % 3]);
        const d = dot(ca, cb);
        const cr = cross(ca, cb);
        const crossLen = Math.sqrt(dot(cr, cr));
        const cotW = crossLen > 1e-10 ? d / crossLen : 0;

        const key = `${Math.min(a, b)},${Math.max(a, b)}`;
        edgeWeights.set(key, (edgeWeights.get(key) ?? 0) + Math.max(0, cotW) / 2);
      }
    }

    for (const [key, weight] of edgeWeights) {
      const [a, b] = key.split(",").map(Number);
      weights[a].push({ neighbor: b, weight });
      weights[b].push({ neighbor: a, weight });
    }
    return weights;
  }
}

// ── Vector helpers ──

function getVertex(vertices: number[], idx: number): Vec3 {
  return { x: vertices[idx * 3], y: vertices[idx * 3 + 1], z: vertices[idx * 3 + 2] };
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
}

function distSq(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
}

function angleBetween(a: Vec3, b: Vec3): number {
  const d = dot(a, b);
  const la = Math.sqrt(dot(a, a));
  const lb = Math.sqrt(dot(b, b));
  if (la < 1e-10 || lb < 1e-10) return 0;
  return Math.acos(Math.max(-1, Math.min(1, d / (la * lb))));
}

function triangleAngles(a: Vec3, b: Vec3, c: Vec3): [number, number, number] {
  return [
    angleBetween(sub(b, a), sub(c, a)),
    angleBetween(sub(a, b), sub(c, b)),
    angleBetween(sub(a, c), sub(b, c)),
  ];
}

function triangleArea(a: Vec3, b: Vec3, c: Vec3): number {
  const cr = cross(sub(b, a), sub(c, a));
  return Math.sqrt(dot(cr, cr)) / 2;
}

function cotangent(angle: number): number {
  const s = Math.sin(angle);
  return s > 1e-10 ? Math.cos(angle) / s : 0;
}

export const curvatureAnalysisEngine = new CurvatureAnalysisEngineImpl();
