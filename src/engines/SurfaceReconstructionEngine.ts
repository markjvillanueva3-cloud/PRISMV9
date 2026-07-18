/**
 * PRISM MCP Server -- Surface Reconstruction Engine
 *
 * Point cloud to mesh reconstruction:
 * - Ball Pivoting Algorithm (Bernardini 1999)
 * - Alpha Shapes boundary extraction
 * - Geometry helpers: circumradius, circumcenter, triangle normal/area
 * - Automatic ball radius estimation (k-NN)
 *
 * Ported from PRISM_SURFACE_RECONSTRUCTION_ENGINE.js (monolith R2.3.1).
 *
 * @module SurfaceReconstructionEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface Point3D { x: number; y: number; z: number; }

export interface ReconMesh {
  vertices: Float32Array;
  indices: Uint32Array;
  triangleCount: number;
  vertexCount: number;
}

export interface BallPivotConfig {
  radius?: number | null;
  maxIterations?: number;
}

// ============================================================================
// ENGINE
// ============================================================================

class SurfaceReconstructionEngineImpl {

  /** Estimate ball radius from average k-NN distance. */
  estimateBallRadius(points: Point3D[], k: number = 6): number {
    const sampleSize = Math.min(100, points.length);
    let totalDist = 0;
    const kk = Math.min(k, points.length - 1);

    for (let i = 0; i < sampleSize; i++) {
      const p = points[i];
      const distances: number[] = [];

      for (let j = 0; j < points.length; j++) {
        if (i === j) continue;
        distances.push(this.distance3D(p, points[j]));
      }
      distances.sort((a, b) => a - b);
      for (let j = 0; j < kk; j++) totalDist += distances[j];
    }

    return sampleSize > 0 && kk > 0 ? (totalDist / (sampleSize * kk)) * 2 : 1;
  }

  /** Distance between two 3D points. */
  distance3D(a: Point3D, b: Point3D): number {
    return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2 + (b.z - a.z) ** 2);
  }

  /** Triangle normal (unit vector). */
  triangleNormal(a: Point3D, b: Point3D, c: Point3D): Point3D {
    const ab = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
    const ac = { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z };
    const n = {
      x: ab.y * ac.z - ab.z * ac.y,
      y: ab.z * ac.x - ab.x * ac.z,
      z: ab.x * ac.y - ab.y * ac.x,
    };
    const len = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z);
    return len > 1e-10 ? { x: n.x / len, y: n.y / len, z: n.z / len } : { x: 0, y: 1, z: 0 };
  }

  /** Triangle area via cross product. */
  triangleArea(a: Point3D, b: Point3D, c: Point3D): number {
    const ab = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
    const ac = { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z };
    const cx = ab.y * ac.z - ab.z * ac.y;
    const cy = ab.z * ac.x - ab.x * ac.z;
    const cz = ab.x * ac.y - ab.y * ac.x;
    return 0.5 * Math.sqrt(cx * cx + cy * cy + cz * cz);
  }

  /** Triangle circumradius. */
  triangleCircumradius(a: Point3D, b: Point3D, c: Point3D): number {
    const ab = this.distance3D(a, b);
    const bc = this.distance3D(b, c);
    const ca = this.distance3D(c, a);
    const area = this.triangleArea(a, b, c);
    return area > 1e-10 ? (ab * bc * ca) / (4 * area) : Infinity;
  }

  /** Triangle circumcenter in 3D. Standard barycentric formula. */
  triangleCircumcenter(a: Point3D, b: Point3D, c: Point3D): Point3D {
    const ab = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
    const ac = { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z };

    const abLen2 = ab.x * ab.x + ab.y * ab.y + ab.z * ab.z;
    const acLen2 = ac.x * ac.x + ac.y * ac.y + ac.z * ac.z;
    const abDotAc = ab.x * ac.x + ab.y * ac.y + ab.z * ac.z;

    const denom = 2 * (abLen2 * acLen2 - abDotAc * abDotAc);
    if (Math.abs(denom) < 1e-20) {
      return { x: (a.x + b.x + c.x) / 3, y: (a.y + b.y + c.y) / 3, z: (a.z + b.z + c.z) / 3 };
    }

    const s = (abLen2 * (acLen2 - abDotAc)) / denom;
    const t = (acLen2 * (abLen2 - abDotAc)) / denom;

    return {
      x: a.x + s * ab.x + t * ac.x,
      y: a.y + s * ab.y + t * ac.y,
      z: a.z + s * ab.z + t * ac.z,
    };
  }

  /** Find center of ball touching three points. */
  ballCenter(p1: Point3D, p2: Point3D, p3: Point3D, radius: number): Point3D | null {
    const circumR = this.triangleCircumradius(p1, p2, p3);
    if (circumR > radius) return null;

    const cc = this.triangleCircumcenter(p1, p2, p3);
    const n = this.triangleNormal(p1, p2, p3);
    const h = Math.sqrt(radius * radius - circumR * circumR);

    return { x: cc.x + h * n.x, y: cc.y + h * n.y, z: cc.z + h * n.z };
  }

  /** Find a seed triangle for ball pivoting. */
  findSeedTriangle(points: Point3D[], radius: number): { i: number; j: number; k: number } | null {
    const n = points.length;
    for (let i = 0; i < n - 2; i++) {
      for (let j = i + 1; j < n - 1; j++) {
        if (this.distance3D(points[i], points[j]) > 2 * radius) continue;

        for (let k = j + 1; k < n; k++) {
          if (this.distance3D(points[i], points[k]) > 2 * radius) continue;
          if (this.distance3D(points[j], points[k]) > 2 * radius) continue;

          const center = this.ballCenter(points[i], points[j], points[k], radius);
          if (!center) continue;

          let valid = true;
          for (let l = 0; l < n; l++) {
            if (l === i || l === j || l === k) continue;
            if (this.distance3D(points[l], center) < radius * 0.99) {
              valid = false;
              break;
            }
          }
          if (valid) return { i, j, k };
        }
      }
    }
    return null;
  }

  /** Ball Pivoting Algorithm for surface reconstruction. */
  ballPivoting(points: Point3D[], config: BallPivotConfig = {}): ReconMesh {
    if (points.length < 3) {
      return { vertices: new Float32Array(0), indices: new Uint32Array(0), triangleCount: 0, vertexCount: 0 };
    }

    const radius = config.radius ?? this.estimateBallRadius(points);
    const maxIter = config.maxIterations ?? points.length * 10;

    const seed = this.findSeedTriangle(points, radius);
    if (!seed) {
      return this._buildMesh(points, []);
    }

    const triangles: Array<{ i: number; j: number; k: number }> = [seed];
    const used = new Set([seed.i, seed.j, seed.k]);
    const front: Array<{ i: number; j: number; opposite: number }> = [
      { i: seed.i, j: seed.j, opposite: seed.k },
      { i: seed.j, j: seed.k, opposite: seed.i },
      { i: seed.k, j: seed.i, opposite: seed.j },
    ];

    let iter = 0;
    while (front.length > 0 && iter++ < maxIter) {
      const edge = front.pop()!;
      const pivot = this._findPivot(points, edge, used, radius);

      if (pivot !== null) {
        triangles.push({ i: edge.i, j: edge.j, k: pivot });
        used.add(pivot);
        this._updateFront(front, edge.i, pivot, edge.j);
        this._updateFront(front, pivot, edge.j, edge.i);
      }
    }

    return this._buildMesh(points, triangles);
  }

  /** Build a mesh from point and triangle lists. */
  private _buildMesh(points: Point3D[], triangles: Array<{ i: number; j: number; k: number }>): ReconMesh {
    const vertices = new Float32Array(points.length * 3);
    for (let i = 0; i < points.length; i++) {
      vertices[i * 3] = points[i].x;
      vertices[i * 3 + 1] = points[i].y;
      vertices[i * 3 + 2] = points[i].z;
    }

    const indices = new Uint32Array(triangles.length * 3);
    for (let i = 0; i < triangles.length; i++) {
      indices[i * 3] = triangles[i].i;
      indices[i * 3 + 1] = triangles[i].j;
      indices[i * 3 + 2] = triangles[i].k;
    }

    return { vertices, indices, triangleCount: triangles.length, vertexCount: points.length };
  }

  private _findPivot(
    points: Point3D[],
    edge: { i: number; j: number; opposite: number },
    used: Set<number>,
    radius: number,
  ): number | null {
    const pi = points[edge.i], pj = points[edge.j];
    let best: number | null = null;
    let bestAngle = -Infinity;

    for (let k = 0; k < points.length; k++) {
      if (used.has(k) || k === edge.i || k === edge.j) continue;

      if (this.distance3D(pi, points[k]) > 2 * radius) continue;
      if (this.distance3D(pj, points[k]) > 2 * radius) continue;

      const center = this.ballCenter(pi, pj, points[k], radius);
      if (!center) continue;

      let valid = true;
      for (let l = 0; l < points.length; l++) {
        if (l === edge.i || l === edge.j || l === k) continue;
        if (this.distance3D(points[l], center) < radius * 0.99) { valid = false; break; }
      }

      if (valid) {
        const angle = this._pivotAngle(pi, pj, points[edge.opposite], points[k]);
        if (angle > bestAngle) { bestAngle = angle; best = k; }
      }
    }
    return best;
  }

  private _pivotAngle(pi: Point3D, pj: Point3D, oldPt: Point3D, newPt: Point3D): number {
    const mid = { x: (pi.x + pj.x) / 2, y: (pi.y + pj.y) / 2, z: (pi.z + pj.z) / 2 };
    const v1 = { x: oldPt.x - mid.x, y: oldPt.y - mid.y, z: oldPt.z - mid.z };
    const v2 = { x: newPt.x - mid.x, y: newPt.y - mid.y, z: newPt.z - mid.z };
    const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
    const l1 = Math.sqrt(v1.x ** 2 + v1.y ** 2 + v1.z ** 2);
    const l2 = Math.sqrt(v2.x ** 2 + v2.y ** 2 + v2.z ** 2);
    return l1 > 0 && l2 > 0 ? dot / (l1 * l2) : 0;
  }

  private _updateFront(front: Array<{ i: number; j: number; opposite: number }>, i: number, j: number, opposite: number): void {
    for (let k = front.length - 1; k >= 0; k--) {
      const e = front[k];
      if ((e.i === j && e.j === i) || (e.i === i && e.j === j)) {
        front.splice(k, 1);
        return;
      }
    }
    front.push({ i, j, opposite });
  }
}

export const surfaceReconstructionEngine = new SurfaceReconstructionEngineImpl();
