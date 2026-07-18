/**
 * PRISM MCP Server — Offset Surface Engine
 *
 * Mesh offset and shelling operations:
 * - Normal-based mesh offset (smooth or face normals)
 * - Shell creation (inner + outer + caps)
 *
 * Based on Maekawa 1999 (MIT 2.158J).
 * Ported from PRISM_OFFSET_SURFACE_ENGINE.js (monolith R2.3.1).
 *
 * @module OffsetSurfaceEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface Vec3 { x: number; y: number; z: number; }

export interface TriangleMesh {
  vertices: number[];   // flat [x0,y0,z0, x1,y1,z1, ...]
  indices: number[];    // triangle indices
}

export interface OffsetOptions {
  smoothNormals?: boolean;
}

// ============================================================================
// ENGINE
// ============================================================================

class OffsetSurfaceEngineImpl {

  /** Offset mesh vertices along normals by a signed distance. */
  offsetMesh(mesh: TriangleMesh, distance: number, options: OffsetOptions = {}): TriangleMesh {
    const { smoothNormals = true } = options;
    const n = mesh.vertices.length / 3;
    const normals = smoothNormals ? this.computeSmoothNormals(mesh) : this.computeFaceNormals(mesh);
    const newVerts = new Float64Array(n * 3);

    for (let i = 0; i < n; i++) {
      newVerts[i * 3] = mesh.vertices[i * 3] + distance * normals[i].x;
      newVerts[i * 3 + 1] = mesh.vertices[i * 3 + 1] + distance * normals[i].y;
      newVerts[i * 3 + 2] = mesh.vertices[i * 3 + 2] + distance * normals[i].z;
    }
    return { vertices: Array.from(newVerts), indices: [...mesh.indices] };
  }

  /** Create a shell (hollow solid) from a mesh by offsetting inward and outward. */
  createShell(mesh: TriangleMesh, thickness: number, options: OffsetOptions & { capOpenEdges?: boolean } = {}): TriangleMesh {
    const { capOpenEdges = true } = options;
    const outer = this.offsetMesh(mesh, thickness / 2, options);
    const inner = this.offsetMesh(mesh, -thickness / 2, options);

    // Flip inner triangle winding
    const flippedInnerIndices: number[] = [];
    for (let i = 0; i < inner.indices.length; i += 3) {
      flippedInnerIndices.push(inner.indices[i], inner.indices[i + 2], inner.indices[i + 1]);
    }

    const outerVertCount = outer.vertices.length / 3;
    const combined: TriangleMesh = {
      vertices: [...outer.vertices, ...inner.vertices],
      indices: [...outer.indices, ...flippedInnerIndices.map(idx => idx + outerVertCount)],
    };

    if (capOpenEdges) {
      const caps = this.createCaps(mesh, outerVertCount);
      combined.indices.push(...caps);
    }
    return combined;
  }

  // ── Normals ──

  computeSmoothNormals(mesh: TriangleMesh): Vec3[] {
    const n = mesh.vertices.length / 3;
    const normals: Vec3[] = Array.from({ length: n }, () => ({ x: 0, y: 0, z: 0 }));

    for (let f = 0; f < mesh.indices.length; f += 3) {
      const a = mesh.indices[f], b = mesh.indices[f + 1], c = mesh.indices[f + 2];
      const va = getV(mesh.vertices, a), vb = getV(mesh.vertices, b), vc = getV(mesh.vertices, c);
      const fn = faceNormal(va, vb, vc);
      normals[a].x += fn.x; normals[a].y += fn.y; normals[a].z += fn.z;
      normals[b].x += fn.x; normals[b].y += fn.y; normals[b].z += fn.z;
      normals[c].x += fn.x; normals[c].y += fn.y; normals[c].z += fn.z;
    }

    for (let i = 0; i < n; i++) normalize(normals[i]);
    return normals;
  }

  computeFaceNormals(mesh: TriangleMesh): Vec3[] {
    const n = mesh.vertices.length / 3;
    const normals: Vec3[] = Array.from({ length: n }, () => ({ x: 0, y: 0, z: 0 }));
    const counts = new Array(n).fill(0);

    for (let f = 0; f < mesh.indices.length; f += 3) {
      const a = mesh.indices[f], b = mesh.indices[f + 1], c = mesh.indices[f + 2];
      const va = getV(mesh.vertices, a), vb = getV(mesh.vertices, b), vc = getV(mesh.vertices, c);
      const fn = faceNormal(va, vb, vc);
      normalize(fn);
      for (const v of [a, b, c]) {
        normals[v].x += fn.x; normals[v].y += fn.y; normals[v].z += fn.z;
        counts[v]++;
      }
    }

    for (let i = 0; i < n; i++) {
      if (counts[i] > 0) {
        normals[i].x /= counts[i]; normals[i].y /= counts[i]; normals[i].z /= counts[i];
      }
    }
    return normals;
  }

  private createCaps(mesh: TriangleMesh, outerVertOffset: number): number[] {
    const caps: number[] = [];
    const edgeCount = new Map<string, number>();
    for (let i = 0; i < mesh.indices.length; i += 3) {
      const a = mesh.indices[i], b = mesh.indices[i + 1], c = mesh.indices[i + 2];
      for (const [v1, v2] of [[a, b], [b, c], [c, a]]) {
        const key = `${Math.min(v1, v2)},${Math.max(v1, v2)}`;
        edgeCount.set(key, (edgeCount.get(key) ?? 0) + 1);
      }
    }

    for (const [key, count] of edgeCount) {
      if (count === 1) {
        const [v1, v2] = key.split(",").map(Number);
        caps.push(v1, v2, v2 + outerVertOffset);
        caps.push(v1, v2 + outerVertOffset, v1 + outerVertOffset);
      }
    }
    return caps;
  }
}

function getV(v: number[], i: number): Vec3 {
  return { x: v[i * 3], y: v[i * 3 + 1], z: v[i * 3 + 2] };
}

function faceNormal(a: Vec3, b: Vec3, c: Vec3): Vec3 {
  const e1 = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
  const e2 = { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z };
  return { x: e1.y * e2.z - e1.z * e2.y, y: e1.z * e2.x - e1.x * e2.z, z: e1.x * e2.y - e1.y * e2.x };
}

function normalize(v: Vec3): void {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (len > 1e-10) { v.x /= len; v.y /= len; v.z /= len; }
}

export const offsetSurfaceEngine = new OffsetSurfaceEngineImpl();
