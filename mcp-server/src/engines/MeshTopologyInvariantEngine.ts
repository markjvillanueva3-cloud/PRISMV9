/**
 * MeshTopologyInvariantEngine — Algebraic-Topology Invariants for Triangle Meshes
 *
 * Given a simplicial 2-complex (vertex count + triangular faces) — or, in
 * "graph mode," a bare vertex+edge 1-complex — computes the combinatorial
 * topology invariants: Euler characteristic, connected components (b0),
 * manifoldness, watertightness, orientability, genus, and Betti numbers.
 *
 * Pure combinatorics — no coordinates are required (a mesh's vertex
 * *positions* are irrelevant to these invariants; only incidence matters).
 *
 * Algorithms:
 *   - Euler characteristic: chi = V - E + F (Euler 1758 / Poincaré 1895).
 *   - Connected components (b0): union-find (disjoint-set) over the
 *     vertex-adjacency graph induced by the mesh edges.
 *   - Manifoldness: every edge is incident to at most 2 faces
 *     (Hoffmann, "Geometric and Solid Modeling," 1989, Ch. 3).
 *   - Watertightness: every edge is incident to EXACTLY 2 faces (no boundary).
 *   - Orientability: for every interior (2-face) edge, the two faces induce
 *     opposite directed traversals of that edge (standard consistent-winding
 *     test; Guibas & Stolfi 1985, quad-edge / half-edge orientation).
 *   - Genus (closed orientable surfaces only): g = b0 - chi/2, the
 *     b0-component generalization of the classical single-surface identity
 *     g = (2 - chi) / 2 (Massey, "Algebraic Topology," 1991, Thm. 6.5).
 *   - Betti numbers via the Euler–Poincaré formula chi = b0 - b1 + b2
 *     (valid for any finite CW/simplicial complex of dimension <= 2):
 *       b2 = b0 for a closed orientable manifold (each connected closed
 *            orientable component contributes exactly one Z to H2);
 *       b2 = 0  for a manifold with boundary, or a closed non-orientable
 *            manifold (no free 2-cycles under either coefficient system);
 *       b2 = null for a non-manifold complex (H2 is not this trivial without
 *            a full simplicial chain-complex rank computation — out of scope,
 *            reported honestly as unknown rather than guessed);
 *       b1 = b0 - chi + b2 whenever b2 is known, else null.
 *     In graph mode (no faces, F=0, b2=0 trivially) this reduces to the
 *     familiar cyclomatic number b1 = E - V + b0.
 *
 * Literature:
 *   - Euler, L. (1758). "Elementa doctrinae solidorum."
 *   - Poincaré, H. (1895). "Analysis situs."
 *   - Massey, W.S. (1991). "A Basic Course in Algebraic Topology," Ch. 6 (classification
 *     of closed surfaces: chi = 2 - 2g orientable, chi = 2 - k non-orientable).
 *   - Hoffmann, C.M. (1989). "Geometric and Solid Modeling," Ch. 3 (Euler operators,
 *     manifold boundary representations).
 *   - Guibas, L. & Stolfi, J. (1985). "Primitives for the manipulation of general
 *     subdivisions and the computation of Voronoi diagrams" (quad-edge orientation).
 *   - Tarjan, R.E. (1975). "Efficiency of a good but not linear set union algorithm"
 *     (union-find with path compression + union by rank).
 *
 * Candidate wiring: prism_cad (`cad_mesh_topology_invariants`) / prism_calc
 * (`topology_invariants`) — see dispatcher-wiring spec in the companion
 * unit report. Not yet wired (engines never import dispatchers — see
 * `mcp-server/src/engines/CLAUDE.md` §8: "Never import from dispatchers").
 *
 * @module MeshTopologyInvariantEngine
 */

import { z } from "zod";

// ============================================================================
// TYPES
// ============================================================================

/** Vertex set: either an explicit count, or any array whose length IS the count
 *  (positions are never read — only cardinality matters for these invariants). */
export type VertexSpec = number | ReadonlyArray<unknown>;

/** Triangular face: exactly 3 distinct vertex indices, in winding order. */
export type MeshFace = readonly [number, number, number];

/** Undirected graph edge: 2 distinct vertex indices. */
export type MeshEdge = readonly [number, number];

/**
 * Mesh input. Provide exactly one of:
 *   - `faces` (triangulated 2-complex — the primary, full-invariant path), or
 *   - `edges` (bare 1-complex / graph — "graph mode": F=0, no manifold/genus
 *     concepts apply, only V, E, chi, b0, b1 are computed).
 * Omitting both is valid too (a 0-complex of isolated points).
 */
export interface MeshTopologyInput {
  vertices: VertexSpec;
  faces?: ReadonlyArray<MeshFace>;
  edges?: ReadonlyArray<MeshEdge>;
}

/** Betti numbers b0 (components), b1 (independent loops / handles), b2 (voids). */
export interface BettiNumbers {
  b0: number;
  b1: number | null;
  b2: number | null;
}

export interface MeshTopologyResult {
  /** V — vertex count. */
  numVertices: number;
  /** E — unique undirected edge count. */
  numEdges: number;
  /** F — face count (0 in graph mode). */
  numFaces: number;
  /** chi = V - E + F. */
  eulerCharacteristic: number;
  /** b0 — connected components, via union-find. */
  components: number;
  /** Every edge incident to <= 2 faces. `null` in graph mode (not applicable). */
  isManifold: boolean | null;
  /** Manifold AND every edge incident to exactly 2 faces (no boundary). `null` in graph mode. */
  isWatertight: boolean | null;
  /** Every interior (2-face) edge has opposite directed windings in its 2 faces.
   *  `null` in graph mode or when non-manifold (concept not well-defined there). */
  isOrientable: boolean | null;
  /** g = b0 - chi/2, defined only for a watertight + manifold + orientable mesh
   *  with an integer, non-negative result. `null` otherwise. */
  genus: number | null;
  /** Betti numbers via the Euler–Poincaré identity chi = b0 - b1 + b2. */
  betti: BettiNumbers;
  /** Count of edges incident to exactly 1 face (boundary/open edges). */
  boundaryEdgeCount: number;
  /** Count of edges incident to > 2 faces (non-manifold edges). */
  nonManifoldEdgeCount: number;
  /** Non-fatal observations (e.g. "chi is odd; genus formula skipped"). */
  warnings: string[];
}

// ============================================================================
// Zod schemas
// ============================================================================

const FaceSchema = z.tuple([
  z.number().int().nonnegative(),
  z.number().int().nonnegative(),
  z.number().int().nonnegative(),
]);

const EdgeSchema = z.tuple([
  z.number().int().nonnegative(),
  z.number().int().nonnegative(),
]);

export const MeshTopologyInputSchema = z.object({
  vertices: z.union([z.number().int().nonnegative(), z.array(z.unknown())]),
  faces: z.array(FaceSchema).optional(),
  edges: z.array(EdgeSchema).optional(),
});

// ============================================================================
// Internal helpers
// ============================================================================

/** Disjoint-set (union-find) with path compression + union by rank. Tarjan 1975. */
class UnionFind {
  private readonly parent: number[];
  private readonly rank: number[];

  constructor(n: number) {
    this.parent = new Array(n);
    this.rank = new Array(n).fill(0);
    for (let i = 0; i < n; i++) this.parent[i] = i;
  }

  find(x: number): number {
    let root = x;
    while (this.parent[root] !== root) root = this.parent[root];
    // Path compression.
    let cur = x;
    while (this.parent[cur] !== root) {
      const next = this.parent[cur];
      this.parent[cur] = root;
      cur = next;
    }
    return root;
  }

  union(a: number, b: number): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) return;
    if (this.rank[ra] < this.rank[rb]) {
      this.parent[ra] = rb;
    } else if (this.rank[ra] > this.rank[rb]) {
      this.parent[rb] = ra;
    } else {
      this.parent[rb] = ra;
      this.rank[ra]++;
    }
  }

  countComponents(): number {
    const roots = new Set<number>();
    for (let i = 0; i < this.parent.length; i++) roots.add(this.find(i));
    return roots.size;
  }
}

/** Per-undirected-edge bookkeeping: incidence count + the directed traversals seen. */
interface EdgeEntry {
  count: number;
  directed: Array<[number, number]>;
}

function edgeKey(u: number, v: number): string {
  return u < v ? `${u}-${v}` : `${v}-${u}`;
}

// ============================================================================
// ENGINE
// ============================================================================

/**
 * Instance engine: stateless. Mesh (or graph) combinatorics in, invariants out.
 */
export class MeshTopologyInvariantEngine {

  /**
   * Compute the full set of topology invariants for a mesh (triangular
   * 2-complex) or a bare graph (1-complex).
   *
   * @param mesh Vertex count/array plus exactly one of `faces` or `edges`
   *             (both may be omitted for a trivial 0-complex of isolated points).
   * @returns V, E, F, chi, components, manifold/watertight/orientable flags,
   *          genus, and Betti numbers (b0, b1, b2).
   * @throws when vertex count is invalid, a face/edge references an
   *         out-of-range or repeated vertex index, or both `faces` and
   *         `edges` are supplied simultaneously (ambiguous mode).
   */
  computeInvariants(mesh: MeshTopologyInput): MeshTopologyResult {
    const numVertices = MeshTopologyInvariantEngine.resolveVertexCount(mesh.vertices);
    if (mesh.faces && mesh.edges) {
      throw new Error(
        "MeshTopologyInvariantEngine: supply either `faces` (mesh mode) or " +
        "`edges` (graph mode), not both — the two modes compute different invariants."
      );
    }

    const warnings: string[] = [];

    if (mesh.faces) {
      return MeshTopologyInvariantEngine.analyzeFaceMesh(numVertices, mesh.faces, warnings);
    }
    if (mesh.edges) {
      return MeshTopologyInvariantEngine.analyzeGraph(numVertices, mesh.edges, warnings);
    }
    // Neither provided: trivial 0-complex of isolated points.
    return MeshTopologyInvariantEngine.analyzeGraph(numVertices, [], warnings);
  }

  // ── Internal: input resolution ─────────────────────────────────────────

  private static resolveVertexCount(vertices: VertexSpec): number {
    const n = typeof vertices === "number" ? vertices : vertices.length;
    if (!Number.isInteger(n) || n < 0) {
      throw new Error(
        `MeshTopologyInvariantEngine: vertex count must be a non-negative integer, got ${n}`
      );
    }
    return n;
  }

  private static validateFace(face: MeshFace, index: number, numVertices: number): void {
    if (face.length !== 3) {
      throw new Error(
        `MeshTopologyInvariantEngine: face[${index}] has ${face.length} vertices, ` +
        `expected exactly 3 (triangular faces only)`
      );
    }
    const [a, b, c] = face;
    for (const v of [a, b, c]) {
      if (!Number.isInteger(v) || v < 0 || v >= numVertices) {
        throw new Error(
          `MeshTopologyInvariantEngine: face[${index}] references vertex ${v}, ` +
          `out of range [0, ${numVertices})`
        );
      }
    }
    if (a === b || b === c || a === c) {
      throw new Error(
        `MeshTopologyInvariantEngine: face[${index}] = (${a}, ${b}, ${c}) is degenerate ` +
        `(repeated vertex index)`
      );
    }
  }

  private static validateEdge(edge: MeshEdge, index: number, numVertices: number): void {
    if (edge.length !== 2) {
      throw new Error(
        `MeshTopologyInvariantEngine: edge[${index}] has ${edge.length} endpoints, expected 2`
      );
    }
    const [a, b] = edge;
    for (const v of [a, b]) {
      if (!Number.isInteger(v) || v < 0 || v >= numVertices) {
        throw new Error(
          `MeshTopologyInvariantEngine: edge[${index}] references vertex ${v}, ` +
          `out of range [0, ${numVertices})`
        );
      }
    }
    if (a === b) {
      throw new Error(
        `MeshTopologyInvariantEngine: edge[${index}] = (${a}, ${b}) is a self-loop (not supported)`
      );
    }
  }

  // ── Internal: face-mesh (2-complex) path ───────────────────────────────

  private static analyzeFaceMesh(
    numVertices: number,
    faces: ReadonlyArray<MeshFace>,
    warnings: string[]
  ): MeshTopologyResult {
    const edgeMap = new Map<string, EdgeEntry>();
    const uf = new UnionFind(numVertices);

    faces.forEach((face, i) => {
      MeshTopologyInvariantEngine.validateFace(face, i, numVertices);
      const [a, b, c] = face;
      const pairs: Array<[number, number]> = [[a, b], [b, c], [c, a]];
      for (const [u, v] of pairs) {
        const key = edgeKey(u, v);
        const entry = edgeMap.get(key) ?? { count: 0, directed: [] };
        entry.count++;
        entry.directed.push([u, v]);
        edgeMap.set(key, entry);
        uf.union(u, v);
      }
    });

    const numFaces = faces.length;
    const numEdges = edgeMap.size;
    const components = uf.countComponents();
    const eulerCharacteristic = numVertices - numEdges + numFaces;

    let boundaryEdgeCount = 0;
    let nonManifoldEdgeCount = 0;
    let orientable = true;
    for (const entry of edgeMap.values()) {
      if (entry.count === 1) {
        boundaryEdgeCount++;
      } else if (entry.count > 2) {
        nonManifoldEdgeCount++;
      } else {
        // count === 2: interior edge — orientability requires opposite winding.
        const [[u0, v0], [u1, v1]] = entry.directed;
        if (!(u0 === v1 && v0 === u1)) orientable = false;
      }
    }

    const isManifold = nonManifoldEdgeCount === 0;
    const isWatertight = isManifold && boundaryEdgeCount === 0;
    const isOrientable = isManifold ? orientable : null;

    // b2 via Euler–Poincaré (see module doc): closed-orientable -> b0;
    // has-boundary or closed-non-orientable manifold -> 0; non-manifold -> unknown.
    let b2: number | null;
    if (!isManifold) {
      b2 = null;
      warnings.push(
        `${nonManifoldEdgeCount} non-manifold edge(s) found (incident to >2 faces); ` +
        `H2 rank is not determined by this engine for non-manifold complexes`
      );
    } else if (isWatertight && isOrientable) {
      b2 = components;
    } else {
      b2 = 0;
    }

    const b1 = b2 !== null ? components - eulerCharacteristic + b2 : null;

    let genus: number | null = null;
    if (isManifold && isWatertight && isOrientable) {
      const chiHalf = eulerCharacteristic / 2;
      if (!Number.isInteger(chiHalf)) {
        warnings.push(
          `Euler characteristic ${eulerCharacteristic} is odd for a claimed closed ` +
          `orientable manifold — genus formula skipped (invalid combinatorial surface)`
        );
      } else {
        const g = components - chiHalf;
        if (g < 0 || !Number.isInteger(g)) {
          warnings.push(`Computed genus ${g} is not a non-negative integer — skipped`);
        } else {
          genus = g;
        }
      }
    }

    return {
      numVertices,
      numEdges,
      numFaces,
      eulerCharacteristic,
      components,
      isManifold,
      isWatertight,
      isOrientable,
      genus,
      betti: { b0: components, b1, b2 },
      boundaryEdgeCount,
      nonManifoldEdgeCount,
      warnings,
    };
  }

  // ── Internal: graph (1-complex / 0-complex) path ───────────────────────

  private static analyzeGraph(
    numVertices: number,
    edges: ReadonlyArray<MeshEdge>,
    warnings: string[]
  ): MeshTopologyResult {
    const uf = new UnionFind(numVertices);
    edges.forEach((edge, i) => {
      MeshTopologyInvariantEngine.validateEdge(edge, i, numVertices);
      uf.union(edge[0], edge[1]);
    });

    const numEdges = edges.length;
    const components = uf.countComponents();
    const eulerCharacteristic = numVertices - numEdges; // F = 0
    // Graph mode: no 2-cells, so H2 = 0 trivially (not "unknown" — genuinely zero).
    const b2 = 0;
    const b1 = components - eulerCharacteristic + b2; // = E - V + b0, the cyclomatic number

    return {
      numVertices,
      numEdges,
      numFaces: 0,
      eulerCharacteristic,
      components,
      isManifold: null,
      isWatertight: null,
      isOrientable: null,
      genus: null,
      betti: { b0: components, b1, b2 },
      boundaryEdgeCount: 0,
      nonManifoldEdgeCount: 0,
      warnings,
    };
  }
}

/** Singleton instance. */
export const meshtopologyinvariantEngine = new MeshTopologyInvariantEngine();
