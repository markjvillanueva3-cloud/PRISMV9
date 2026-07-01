/**
 * GeodesicDistanceEngine — geodesic distance on triangle meshes
 *
 * Computes single- and multi-source shortest-path distances on a triangle
 * mesh, plus iso-distance curves and back-traced geodesic paths.
 *
 * Algorithms:
 *   - Dijkstra on the vertex graph with Euclidean edge weights — fast, exact
 *     on the graph, an upper bound on the continuous geodesic.
 *   - Fast Marching Method (FMM) — per-triangle quadratic update giving a
 *     better continuous-geodesic approximation (Sethian / Kimmel-Sethian).
 *   - Path back-trace: greedy descent on the Dijkstra field from `start`.
 *   - Iso-curve extraction: piecewise-linear marching across triangle edges.
 *
 * Ported from PRISM_GEODESIC_DISTANCE_ENGINE.js (monolith R2.3.1).
 *
 * Literature:
 *   - Dijkstra, E.W. (1959). "A note on two problems in connexion with graphs."
 *   - Mitchell, Mount, Papadimitriou (1987). "The discrete geodesic problem."
 *   - Kimmel & Sethian (1998). "Computing geodesic paths on manifolds."
 *   - Crane, Weischedel, Wardetzky (2017). "The Heat Method for Distance Computation."
 *
 * @module GeodesicDistanceEngine
 */

import { z } from "zod";

// ============================================================================
// TYPES
// ============================================================================

/** 3D vertex. */
export interface Vec3D { x: number; y: number; z: number; }

/** Triangle mesh: flat XYZ vertex buffer + index list, 3 indices per triangle. */
export interface TriangleMesh {
  vertices: number[] | Float32Array | Float64Array;
  indices: number[] | Uint32Array | Uint16Array;
}

/** Result of a geodesic path back-trace. */
export interface GeodesicPathResult {
  /** Vertex indices from `start` toward `end`. May terminate early if disconnected. */
  path: number[];
  /** Geodesic distance at `start` (i.e. dist[start]) — Infinity if unreachable. */
  distance: number;
  /** True iff the back-trace reached `end`. */
  reached: boolean;
}

/** Iso-distance curve: ordered 3D points lying on an iso-level of the distance field. */
export interface IsoCurve {
  level: number;
  /** Edge-crossing points in face order. */
  points: Vec3D[];
}

interface AdjacencyEntry { neighbor: number; weight: number; }
interface FaceData { vertices: [number, number, number]; }
interface HeapNode { vertex: number; distance: number; }

// ============================================================================
// Zod schemas
// ============================================================================

const TriangleMeshSchema = z.object({
  vertices: z.union([z.array(z.number()), z.instanceof(Float32Array), z.instanceof(Float64Array)]),
  indices: z.union([z.array(z.number().int()), z.instanceof(Uint32Array), z.instanceof(Uint16Array)]),
});

export const DijkstraInputSchema = z.object({
  mesh: TriangleMeshSchema,
  sourceVertices: z.array(z.number().int().nonnegative()).min(1),
});

export const FastMarchingInputSchema = DijkstraInputSchema;

export const PathInputSchema = z.object({
  mesh: TriangleMeshSchema,
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
});

export const IsoCurvesInputSchema = z.object({
  mesh: TriangleMeshSchema,
  sourceVertices: z.array(z.number().int().nonnegative()).min(1),
  levels: z.array(z.number().nonnegative()).min(1),
});

// ============================================================================
// CONSTANTS
// ============================================================================

const COORDS_PER_VERTEX = 3;
const VERTS_PER_TRIANGLE = 3;
const FMM_EPS = 1e-10;

// ============================================================================
// ENGINE
// ============================================================================

/**
 * Static-method engine: stateless. Mesh in, distance field out.
 */
export class GeodesicDistanceEngine {

  // ── Public API ───────────────────────────────────────────────────────────

  /**
   * Single-/multi-source Dijkstra geodesic distance on the vertex graph.
   * @param mesh Triangle mesh.
   * @param sourceVertices One or more starting vertex indices.
   * @returns Per-vertex shortest-path distance from any source.
   *          Unreachable vertices stay at +Infinity.
   * @throws when sourceVertices is empty or contains out-of-range indices.
   */
  static computeDijkstra(mesh: TriangleMesh, sourceVertices: number[]): number[] {
    GeodesicDistanceEngine.validateMesh(mesh);
    const numVertices = mesh.vertices.length / COORDS_PER_VERTEX;
    GeodesicDistanceEngine.validateSources(sourceVertices, numVertices);

    const adjacency = GeodesicDistanceEngine.buildWeightedAdjacency(mesh);
    const distances = new Float64Array(numVertices);
    distances.fill(Infinity);
    const visited = new Uint8Array(numVertices);
    const heap: HeapNode[] = [];

    for (const src of sourceVertices) {
      distances[src] = 0;
      GeodesicDistanceEngine.heapPush(heap, { vertex: src, distance: 0 });
    }

    while (heap.length > 0) {
      const top = GeodesicDistanceEngine.heapPop(heap);
      if (!top) break;
      const u = top.vertex;
      if (visited[u]) continue;
      visited[u] = 1;
      for (const { neighbor: v, weight } of adjacency[u]) {
        if (visited[v]) continue;
        const newDist = top.distance + weight;
        if (newDist < distances[v]) {
          distances[v] = newDist;
          GeodesicDistanceEngine.heapPush(heap, { vertex: v, distance: newDist });
        }
      }
    }
    return Array.from(distances);
  }

  /**
   * Fast Marching Method — per-triangle quadratic update.
   * Generally a tighter continuous-geodesic approximation than Dijkstra,
   * at higher per-iteration cost.
   */
  static computeFastMarching(mesh: TriangleMesh, sourceVertices: number[]): number[] {
    GeodesicDistanceEngine.validateMesh(mesh);
    const numVertices = mesh.vertices.length / COORDS_PER_VERTEX;
    GeodesicDistanceEngine.validateSources(sourceVertices, numVertices);

    const faces = GeodesicDistanceEngine.buildFaceData(mesh);
    const distances = new Float64Array(numVertices);
    distances.fill(Infinity);
    const status: Uint8Array = new Uint8Array(numVertices); // 0=FAR, 1=TRIAL, 2=DONE
    const heap: HeapNode[] = [];

    for (const src of sourceVertices) {
      distances[src] = 0;
      status[src] = 1;
      GeodesicDistanceEngine.heapPush(heap, { vertex: src, distance: 0 });
    }

    while (heap.length > 0) {
      const top = GeodesicDistanceEngine.heapPop(heap);
      if (!top) break;
      const u = top.vertex;
      if (status[u] === 2) continue;
      status[u] = 2;
      for (const face of faces[u]) {
        for (const v of face.vertices) {
          if (v === u || status[v] === 2) continue;
          const newDist = GeodesicDistanceEngine.updateFMM(mesh, distances, u, v, face);
          if (newDist < distances[v]) {
            distances[v] = newDist;
            status[v] = 1;
            GeodesicDistanceEngine.heapPush(heap, { vertex: v, distance: newDist });
          }
        }
      }
    }
    return Array.from(distances);
  }

  /**
   * Back-trace the shortest path from `start` to `end` via greedy descent
   * on the Dijkstra distance field rooted at `end`.
   * @returns `path` (vertex indices), `distance` (geodesic dist at start),
   *          `reached` (true iff end was reached).
   */
  static computePath(mesh: TriangleMesh, start: number, end: number): GeodesicPathResult {
    GeodesicDistanceEngine.validateMesh(mesh);
    const numVertices = mesh.vertices.length / COORDS_PER_VERTEX;
    if (start < 0 || start >= numVertices) {
      throw new Error(`GeodesicDistanceEngine: start vertex ${start} out of range [0, ${numVertices})`);
    }
    if (end < 0 || end >= numVertices) {
      throw new Error(`GeodesicDistanceEngine: end vertex ${end} out of range [0, ${numVertices})`);
    }

    const distances = GeodesicDistanceEngine.computeDijkstra(mesh, [end]);
    const adjacency = GeodesicDistanceEngine.buildWeightedAdjacency(mesh);
    const path = [start];
    let current = start;
    // Cycle-guard: a finite mesh visits at most N vertices.
    const safetyMax = numVertices;

    for (let step = 0; step < safetyMax; step++) {
      if (current === end) {
        return { path, distance: distances[start], reached: true };
      }
      let bestNext = -1;
      let bestDist = distances[current];
      for (const { neighbor } of adjacency[current]) {
        if (distances[neighbor] < bestDist) {
          bestDist = distances[neighbor];
          bestNext = neighbor;
        }
      }
      if (bestNext === -1) break;
      path.push(bestNext);
      current = bestNext;
    }
    return {
      path,
      distance: distances[start],
      reached: current === end,
    };
  }

  /**
   * Extract piecewise-linear iso-distance curves for each level.
   * @param levels Distance values at which to extract iso-curves.
   */
  static computeIsoCurves(
    mesh: TriangleMesh,
    sourceVertices: number[],
    levels: number[]
  ): IsoCurve[] {
    const distances = GeodesicDistanceEngine.computeFastMarching(mesh, sourceVertices);
    const curves: IsoCurve[] = [];
    for (const level of levels) {
      curves.push({ level, points: GeodesicDistanceEngine.extractIsoCurve(mesh, distances, level) });
    }
    return curves;
  }

  // ── Validation ───────────────────────────────────────────────────────────

  /** @throws when the mesh is malformed. */
  static validateMesh(mesh: TriangleMesh): void {
    if (!mesh || typeof mesh !== "object") {
      throw new Error("GeodesicDistanceEngine: mesh must be an object");
    }
    if (!mesh.vertices || mesh.vertices.length % COORDS_PER_VERTEX !== 0) {
      throw new Error(
        `GeodesicDistanceEngine: mesh.vertices.length (${mesh.vertices?.length ?? "undefined"}) must be a multiple of ${COORDS_PER_VERTEX}`
      );
    }
    if (!mesh.indices || mesh.indices.length % VERTS_PER_TRIANGLE !== 0) {
      throw new Error(
        `GeodesicDistanceEngine: mesh.indices.length (${mesh.indices?.length ?? "undefined"}) must be a multiple of ${VERTS_PER_TRIANGLE}`
      );
    }
  }

  /** @throws when sourceVertices is empty or out-of-range. */
  static validateSources(sources: number[], numVertices: number): void {
    if (!Array.isArray(sources) || sources.length === 0) {
      throw new Error("GeodesicDistanceEngine: sourceVertices must be a non-empty array");
    }
    for (const s of sources) {
      if (s < 0 || s >= numVertices || !Number.isInteger(s)) {
        throw new Error(
          `GeodesicDistanceEngine: source vertex ${s} out of range [0, ${numVertices})`
        );
      }
    }
  }

  // ── Graph builders ───────────────────────────────────────────────────────

  /** Build per-vertex weighted adjacency list (deduplicated edges). */
  static buildWeightedAdjacency(mesh: TriangleMesh): AdjacencyEntry[][] {
    const numVertices = mesh.vertices.length / COORDS_PER_VERTEX;
    const adjacency: AdjacencyEntry[][] = Array.from({ length: numVertices }, () => []);
    const added = new Set<string>();
    const indices = mesh.indices;
    for (let i = 0; i < indices.length; i += VERTS_PER_TRIANGLE) {
      const a = indices[i];
      const b = indices[i + 1];
      const c = indices[i + 2];
      for (const [v1, v2] of [[a, b], [b, c], [c, a]] as Array<[number, number]>) {
        const lo = Math.min(v1, v2);
        const hi = Math.max(v1, v2);
        const key = `${lo},${hi}`;
        if (!added.has(key)) {
          const weight = GeodesicDistanceEngine.edgeLength(mesh, v1, v2);
          adjacency[v1].push({ neighbor: v2, weight });
          adjacency[v2].push({ neighbor: v1, weight });
          added.add(key);
        }
      }
    }
    return adjacency;
  }

  /** Build per-vertex incident-face list. */
  static buildFaceData(mesh: TriangleMesh): FaceData[][] {
    const numVertices = mesh.vertices.length / COORDS_PER_VERTEX;
    const faces: FaceData[][] = Array.from({ length: numVertices }, () => []);
    const indices = mesh.indices;
    for (let i = 0; i < indices.length; i += VERTS_PER_TRIANGLE) {
      const a = indices[i];
      const b = indices[i + 1];
      const c = indices[i + 2];
      const faceData: FaceData = { vertices: [a, b, c] };
      faces[a].push(faceData);
      faces[b].push(faceData);
      faces[c].push(faceData);
    }
    return faces;
  }

  // ── FMM update (per-triangle quadratic) ──────────────────────────────────

  /**
   * Per-triangle FMM update for vertex `update`, given a `known` vertex and
   * a face containing both. Falls back to the edge-step Dijkstra value when
   * the quadratic update is undefined.
   */
  static updateFMM(
    mesh: TriangleMesh,
    distances: Float64Array,
    known: number,
    update: number,
    face: FaceData
  ): number {
    const others = face.vertices.filter(v => v !== update);
    if (others.length < 2) {
      return distances[known] + GeodesicDistanceEngine.edgeLength(mesh, known, update);
    }
    const v1 = others[0];
    const v2 = others[1];
    const d1 = distances[v1];
    const d2 = distances[v2];
    if (!Number.isFinite(d1) || !Number.isFinite(d2)) {
      return distances[known] + GeodesicDistanceEngine.edgeLength(mesh, known, update);
    }
    const va = GeodesicDistanceEngine.getVertex(mesh.vertices, update);
    const vb = GeodesicDistanceEngine.getVertex(mesh.vertices, v1);
    const vc = GeodesicDistanceEngine.getVertex(mesh.vertices, v2);
    const a = GeodesicDistanceEngine.distance(vb, vc);
    const b = GeodesicDistanceEngine.distance(va, vc);
    const c = GeodesicDistanceEngine.distance(va, vb);
    if (a < FMM_EPS) {
      return Math.min(d1 + c, d2 + b);
    }
    const cosB = (a * a + c * c - b * b) / (2 * a * c);
    const cosC = (a * a + b * b - c * c) / (2 * a * b);
    const u = d2 - d1;
    const f = c * cosB;
    const A = a * a + f * f - 2 * a * f * cosC;
    const B = 2 * u * f - 2 * a * (d1 - d2 * cosC + f * cosC);
    const C = u * u - a * a * (1 - cosC * cosC) + 2 * a * d1 * cosC - d1 * d1;
    const discriminant = B * B - 4 * A * C;
    if (discriminant < 0 || Math.abs(A) < FMM_EPS) {
      return Math.min(d1 + c, d2 + b);
    }
    const t = (-B + Math.sqrt(discriminant)) / (2 * A);
    if (t >= 0 && t <= 1) {
      return d1 + t * u + Math.sqrt(A) * t;
    }
    return Math.min(d1 + c, d2 + b);
  }

  // ── Iso-curve extraction ────────────────────────────────────────────────

  /** Extract iso-curve segments at `level` from a per-vertex distance field. */
  static extractIsoCurve(
    mesh: TriangleMesh,
    distances: number[] | Float64Array,
    level: number
  ): Vec3D[] {
    const points: Vec3D[] = [];
    const indices = mesh.indices;
    for (let i = 0; i < indices.length; i += VERTS_PER_TRIANGLE) {
      const a = indices[i];
      const b = indices[i + 1];
      const c = indices[i + 2];
      const da = distances[a];
      const db = distances[b];
      const dc = distances[c];
      const edges: Array<[number, number, number, number]> = [
        [a, b, da, db],
        [b, c, db, dc],
        [c, a, dc, da],
      ];
      const crossings: Vec3D[] = [];
      for (const [v1, v2, d1, d2] of edges) {
        if ((d1 - level) * (d2 - level) < 0) {
          const t = (level - d1) / (d2 - d1);
          const p1 = GeodesicDistanceEngine.getVertex(mesh.vertices, v1);
          const p2 = GeodesicDistanceEngine.getVertex(mesh.vertices, v2);
          crossings.push({
            x: p1.x + t * (p2.x - p1.x),
            y: p1.y + t * (p2.y - p1.y),
            z: p1.z + t * (p2.z - p1.z),
          });
        }
      }
      if (crossings.length >= 2) {
        points.push(crossings[0], crossings[1]);
      }
    }
    return points;
  }

  // ── Linear-algebra utilities ────────────────────────────────────────────

  /** Euclidean edge length between two vertex indices. */
  static edgeLength(mesh: TriangleMesh, v1: number, v2: number): number {
    return GeodesicDistanceEngine.distance(
      GeodesicDistanceEngine.getVertex(mesh.vertices, v1),
      GeodesicDistanceEngine.getVertex(mesh.vertices, v2)
    );
  }

  /** Read vertex `idx` from a flat XYZ buffer. */
  static getVertex(
    vertices: number[] | Float32Array | Float64Array,
    idx: number
  ): Vec3D {
    const base = idx * COORDS_PER_VERTEX;
    return {
      x: Number(vertices[base]),
      y: Number(vertices[base + 1]),
      z: Number(vertices[base + 2]),
    };
  }

  /** Euclidean distance between two 3D points. */
  static distance(a: Vec3D, b: Vec3D): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  // ── Min-heap (private) ───────────────────────────────────────────────────

  static heapPush(heap: HeapNode[], item: HeapNode): void {
    heap.push(item);
    let i = heap.length - 1;
    while (i > 0) {
      const parent = (i - 1) >>> 1;
      if (heap[parent].distance <= heap[i].distance) break;
      const tmp = heap[parent];
      heap[parent] = heap[i];
      heap[i] = tmp;
      i = parent;
    }
  }

  static heapPop(heap: HeapNode[]): HeapNode | null {
    if (heap.length === 0) return null;
    const root = heap[0];
    const last = heap.pop();
    if (last === undefined) return root;
    if (heap.length > 0) {
      heap[0] = last;
      let i = 0;
      const n = heap.length;
      for (;;) {
        const left = 2 * i + 1;
        const right = 2 * i + 2;
        let smallest = i;
        if (left < n && heap[left].distance < heap[smallest].distance) smallest = left;
        if (right < n && heap[right].distance < heap[smallest].distance) smallest = right;
        if (smallest === i) break;
        const tmp = heap[i];
        heap[i] = heap[smallest];
        heap[smallest] = tmp;
        i = smallest;
      }
    }
    return root;
  }
}

/** Singleton-style ergonomic export. */
export const geodesicDistanceEngine = GeodesicDistanceEngine;
