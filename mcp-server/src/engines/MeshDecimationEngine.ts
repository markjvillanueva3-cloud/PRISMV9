/**
 * PRISM MCP Server -- Mesh Decimation Engine
 *
 * Quadric Error Metrics (QEM) mesh simplification:
 * - Garland & Heckbert 1997 (Stanford CS 468)
 * - Plane quadrics, edge-collapse with min-heap
 * - Optimal vertex placement via Cramer's rule
 *
 * Ported from PRISM_MESH_DECIMATION_ENGINE.js (monolith R2.3.1).
 *
 * @module MeshDecimationEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface Vec3 { x: number; y: number; z: number; }

export interface TriangleMesh {
  vertices: number[] | Float32Array;
  indices: number[] | Uint32Array;
}

export interface DecimatedMesh {
  vertices: Float32Array;
  indices: Uint32Array;
  originalTriangles: number;
  resultTriangles: number;
  reductionRatio: number;
}

interface InternalVertex extends Vec3 { deleted: boolean; }
interface InternalTriangle { v0: number; v1: number; v2: number; }
interface Quadric { a: Float64Array; }

interface HeapEdge {
  v1: number;
  v2: number;
  error: number;
  position: Vec3;
  collapsed: boolean;
  triangles: number[];
}

// ============================================================================
// ENGINE
// ============================================================================

class MeshDecimationEngineImpl {

  /**
   * Decimate mesh using Quadric Error Metrics.
   * Collapses edges in order of minimum error until target triangle count.
   */
  decimate(mesh: TriangleMesh, targetTriangles: number): DecimatedMesh {
    const vertices = this.parseVertices(mesh.vertices);
    const triangles = this.parseTriangles(mesh.indices);
    const originalCount = triangles.length;

    if (triangles.length <= targetTriangles) {
      return {
        vertices: new Float32Array(mesh.vertices),
        indices: new Uint32Array(mesh.indices),
        originalTriangles: originalCount,
        resultTriangles: originalCount,
        reductionRatio: 0,
      };
    }

    const quadrics = this.computeInitialQuadrics(vertices, triangles);
    const edges = this.buildEdgeList(triangles);
    const heap = this.buildEdgeHeap(edges, vertices, quadrics);

    const currentTriangles = new Set(triangles.map((_, i) => i));
    let triCount = triangles.length;

    while (triCount > targetTriangles && heap.length > 0) {
      const minEdge = this.heapPop(heap);
      if (!minEdge || minEdge.collapsed) continue;

      const result = this.collapseEdge(minEdge, vertices, triangles, quadrics, currentTriangles);
      if (result.success) {
        triCount -= result.removedTriangles;
        this.updateAffectedEdges(result.affectedVertices, edges, vertices, quadrics, heap);
      }
    }

    const out = this.buildOutputMesh(vertices, triangles, currentTriangles);
    const resultCount = out.indices.length / 3;
    return {
      ...out,
      originalTriangles: originalCount,
      resultTriangles: resultCount,
      reductionRatio: 1 - resultCount / originalCount,
    };
  }

  /** Compute quadric error for collapsing edge (v1,v2). */
  computeEdgeError(v1Idx: number, v2Idx: number, vertices: Vec3[], quadrics: Quadric[]): { error: number; position: Vec3 } {
    const Q = this.addQuadrics(quadrics[v1Idx], quadrics[v2Idx]);
    const pos = this.findOptimalPosition(Q, vertices[v1Idx], vertices[v2Idx]);
    return { error: this.evaluateQuadric(Q, pos), position: pos };
  }

  /** Compute initial quadric (sum of face plane quadrics) per vertex. */
  computeInitialQuadrics(vertices: InternalVertex[], triangles: InternalTriangle[]): Quadric[] {
    const quadrics = vertices.map(() => this.zeroQuadric());
    for (const tri of triangles) {
      const plane = this.computePlane(vertices[tri.v0], vertices[tri.v1], vertices[tri.v2]);
      const K = this.planeQuadric(plane);
      this.addQuadricInPlace(quadrics[tri.v0], K);
      this.addQuadricInPlace(quadrics[tri.v1], K);
      this.addQuadricInPlace(quadrics[tri.v2], K);
    }
    return quadrics;
  }

  // ── Optimal position ──

  findOptimalPosition(Q: Quadric, v1: Vec3, v2: Vec3): Vec3 {
    const a = Q.a;
    const A = [
      [a[0], a[1], a[2]],
      [a[1], a[4], a[5]],
      [a[2], a[5], a[7]],
    ];
    const b = [-a[3], -a[6], -a[8]];

    const det = this.det3x3(A);
    if (Math.abs(det) < 1e-10) {
      return { x: (v1.x + v2.x) / 2, y: (v1.y + v2.y) / 2, z: (v1.z + v2.z) / 2 };
    }

    return {
      x: this.det3x3([[b[0], A[0][1], A[0][2]], [b[1], A[1][1], A[1][2]], [b[2], A[2][1], A[2][2]]]) / det,
      y: this.det3x3([[A[0][0], b[0], A[0][2]], [A[1][0], b[1], A[1][2]], [A[2][0], b[2], A[2][2]]]) / det,
      z: this.det3x3([[A[0][0], A[0][1], b[0]], [A[1][0], A[1][1], b[1]], [A[2][0], A[2][1], b[2]]]) / det,
    };
  }

  // ── Quadric math ──

  zeroQuadric(): Quadric { return { a: new Float64Array(10) }; }

  planeQuadric(plane: { a: number; b: number; c: number; d: number }): Quadric {
    const { a, b, c, d } = plane;
    return { a: new Float64Array([a*a, a*b, a*c, a*d, b*b, b*c, b*d, c*c, c*d, d*d]) };
  }

  addQuadricInPlace(Q1: Quadric, Q2: Quadric): void {
    for (let i = 0; i < 10; i++) Q1.a[i] += Q2.a[i];
  }

  addQuadrics(Q1: Quadric, Q2: Quadric): Quadric {
    const r = { a: new Float64Array(10) };
    for (let i = 0; i < 10; i++) r.a[i] = Q1.a[i] + Q2.a[i];
    return r;
  }

  evaluateQuadric(Q: Quadric, v: Vec3): number {
    const a = Q.a;
    return (
      a[0] * v.x * v.x + 2 * a[1] * v.x * v.y + 2 * a[2] * v.x * v.z + 2 * a[3] * v.x +
      a[4] * v.y * v.y + 2 * a[5] * v.y * v.z + 2 * a[6] * v.y +
      a[7] * v.z * v.z + 2 * a[8] * v.z + a[9]
    );
  }

  computePlane(v0: Vec3, v1: Vec3, v2: Vec3): { a: number; b: number; c: number; d: number } {
    const e1 = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z };
    const e2 = { x: v2.x - v0.x, y: v2.y - v0.y, z: v2.z - v0.z };
    const n = { x: e1.y * e2.z - e1.z * e2.y, y: e1.z * e2.x - e1.x * e2.z, z: e1.x * e2.y - e1.y * e2.x };
    const len = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z);
    if (len < 1e-10) return { a: 0, b: 0, c: 1, d: 0 };
    const a = n.x / len, b = n.y / len, c = n.z / len;
    return { a, b, c, d: -(a * v0.x + b * v0.y + c * v0.z) };
  }

  det3x3(m: number[][]): number {
    return (
      m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
      m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
      m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
    );
  }

  // ── Mesh parsing ──

  parseVertices(arr: number[] | Float32Array): InternalVertex[] {
    const out: InternalVertex[] = [];
    for (let i = 0; i < arr.length; i += 3) {
      out.push({ x: arr[i], y: arr[i + 1], z: arr[i + 2], deleted: false });
    }
    return out;
  }

  parseTriangles(arr: number[] | Uint32Array): InternalTriangle[] {
    const out: InternalTriangle[] = [];
    for (let i = 0; i < arr.length; i += 3) {
      out.push({ v0: arr[i], v1: arr[i + 1], v2: arr[i + 2] });
    }
    return out;
  }

  // ── Edge operations ──

  private buildEdgeList(triangles: InternalTriangle[]): HeapEdge[] {
    const map = new Map<string, HeapEdge>();
    for (let i = 0; i < triangles.length; i++) {
      const t = triangles[i];
      this.addEdge(map, t.v0, t.v1, i);
      this.addEdge(map, t.v1, t.v2, i);
      this.addEdge(map, t.v2, t.v0, i);
    }
    return Array.from(map.values());
  }

  private addEdge(map: Map<string, HeapEdge>, a: number, b: number, triIdx: number): void {
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (!map.has(key)) {
      map.set(key, { v1: Math.min(a, b), v2: Math.max(a, b), error: 0, position: { x: 0, y: 0, z: 0 }, collapsed: false, triangles: [] });
    }
    map.get(key)!.triangles.push(triIdx);
  }

  private buildEdgeHeap(edges: HeapEdge[], vertices: InternalVertex[], quadrics: Quadric[]): HeapEdge[] {
    const heap: HeapEdge[] = [];
    for (const edge of edges) {
      const { error, position } = this.computeEdgeError(edge.v1, edge.v2, vertices, quadrics);
      edge.error = error;
      edge.position = position;
      this.heapPush(heap, edge);
    }
    return heap;
  }

  private collapseEdge(
    edge: HeapEdge, vertices: InternalVertex[], triangles: InternalTriangle[],
    quadrics: Quadric[], currentTriangles: Set<number>,
  ): { success: boolean; removedTriangles: number; affectedVertices: Set<number> } {
    const { v1, v2, position } = edge;
    if (vertices[v1].deleted || vertices[v2].deleted) return { success: false, removedTriangles: 0, affectedVertices: new Set() };

    vertices[v1].x = position.x; vertices[v1].y = position.y; vertices[v1].z = position.z;
    this.addQuadricInPlace(quadrics[v1], quadrics[v2]);
    vertices[v2].deleted = true;

    let removed = 0;
    const affected = new Set([v1]);

    for (const triIdx of currentTriangles) {
      const tri = triangles[triIdx];
      let usesV2 = false;
      if (tri.v0 === v2) { tri.v0 = v1; usesV2 = true; }
      if (tri.v1 === v2) { tri.v1 = v1; usesV2 = true; }
      if (tri.v2 === v2) { tri.v2 = v1; usesV2 = true; }
      if (usesV2) { affected.add(tri.v0); affected.add(tri.v1); affected.add(tri.v2); }
      if (tri.v0 === tri.v1 || tri.v1 === tri.v2 || tri.v0 === tri.v2) {
        currentTriangles.delete(triIdx);
        removed++;
      }
    }
    return { success: true, removedTriangles: removed, affectedVertices: affected };
  }

  private updateAffectedEdges(
    affected: Set<number>, edges: HeapEdge[], vertices: InternalVertex[],
    quadrics: Quadric[], heap: HeapEdge[],
  ): void {
    for (const edge of edges) {
      if (edge.collapsed) continue;
      if (affected.has(edge.v1) || affected.has(edge.v2)) {
        if (vertices[edge.v1].deleted || vertices[edge.v2].deleted) {
          edge.collapsed = true;
        } else {
          const { error, position } = this.computeEdgeError(edge.v1, edge.v2, vertices, quadrics);
          edge.error = error;
          edge.position = position;
        }
      }
    }
    heap.length = 0;
    for (const edge of edges) {
      if (!edge.collapsed) this.heapPush(heap, edge);
    }
  }

  private buildOutputMesh(vertices: InternalVertex[], triangles: InternalTriangle[], currentTriangles: Set<number>): { vertices: Float32Array; indices: Uint32Array } {
    const vmap = new Map<number, number>();
    const newVerts: number[] = [];
    let idx = 0;
    for (let i = 0; i < vertices.length; i++) {
      if (!vertices[i].deleted) {
        vmap.set(i, idx++);
        newVerts.push(vertices[i].x, vertices[i].y, vertices[i].z);
      }
    }
    const newIndices: number[] = [];
    for (const triIdx of currentTriangles) {
      const t = triangles[triIdx];
      if (vmap.has(t.v0) && vmap.has(t.v1) && vmap.has(t.v2)) {
        newIndices.push(vmap.get(t.v0)!, vmap.get(t.v1)!, vmap.get(t.v2)!);
      }
    }
    return { vertices: new Float32Array(newVerts), indices: new Uint32Array(newIndices) };
  }

  // ── Min-heap ──

  private heapPush(heap: HeapEdge[], edge: HeapEdge): void {
    heap.push(edge);
    let i = heap.length - 1;
    while (i > 0) {
      const p = Math.floor((i - 1) / 2);
      if (heap[p].error <= heap[i].error) break;
      [heap[p], heap[i]] = [heap[i], heap[p]];
      i = p;
    }
  }

  private heapPop(heap: HeapEdge[]): HeapEdge | null {
    if (heap.length === 0) return null;
    if (heap.length === 1) return heap.pop()!;
    const result = heap[0];
    heap[0] = heap.pop()!;
    let i = 0;
    while (true) {
      const l = 2 * i + 1, r = 2 * i + 2;
      let s = i;
      if (l < heap.length && heap[l].error < heap[s].error) s = l;
      if (r < heap.length && heap[r].error < heap[s].error) s = r;
      if (s === i) break;
      [heap[i], heap[s]] = [heap[s], heap[i]];
      i = s;
    }
    return result;
  }
}

export const meshDecimationEngine = new MeshDecimationEngineImpl();
