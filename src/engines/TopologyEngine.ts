/**
 * PRISM MCP Server -- Topology Engine
 *
 * Computational topology for mesh analysis:
 * - Simplicial complexes from mesh / Rips complex from point cloud
 * - Boundary matrices (mod 2), matrix reduction
 * - Homology computation (Betti numbers: β₀, β₁, β₂)
 * - Persistent homology via filtration
 * - CAM feature validation (hole/component/void verification)
 *
 * Based on Stanford CS 468, Kazhdan Poisson.
 * Ported from PRISM_TOPOLOGY_ENGINE.js (monolith R2.3.1).
 *
 * @module TopologyEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface Point3D { x: number; y: number; z?: number; }

export interface Simplex {
  vertices: number[];
  dimension: number;
  filtration: number;
  key: string;
}

export interface SimplicialComplex {
  vertices: Simplex[];
  edges: Simplex[];
  triangles: Simplex[];
  simplexMap: Map<string, Simplex>;
  vertexPositions: Point3D[];
}

export interface BoundaryMatrix {
  rows: number;
  cols: number;
  entries: Array<{ row: number; col: number; value: number }>;
}

export interface HomologyResult {
  betti: [number, number, number];
  beta0: number;
  beta1: number;
  beta2: number;
  eulerCharacteristic: number;
  counts: { vertices: number; edges: number; triangles: number };
  ranks: { rank1: number; rank2: number };
}

export interface PersistenceEntry {
  birth: number;
  death: number;
  persistence: number;
  significant: boolean;
}

export interface PersistenceResult {
  diagram: {
    dimension0: PersistenceEntry[];
    dimension1: PersistenceEntry[];
    dimension2: PersistenceEntry[];
  };
  summary: {
    significantComponents: number;
    significantHoles: number;
    significantVoids: number;
    maxPersistence0: number;
    maxPersistence1: number;
    maxPersistence2: number;
  };
  maxEpsilon: number;
  pointCount: number;
  simplexCount: number;
}

export interface FeatureValidation {
  valid: boolean;
  discrepancies: Array<{ feature: string; expected: number; found: number; difference: number }>;
  topology: HomologyResult;
  recommendations?: string[];
}

// ============================================================================
// CONFIG
// ============================================================================

const CONFIG = {
  MIN_PERSISTENCE: 0.01,
  DEFAULT_FILTRATION_STEPS: 50,
};

// ============================================================================
// ENGINE
// ============================================================================

class TopologyEngineImpl {

  /** Create a simplex with sorted vertices. */
  createSimplex(vertices: number[], filtrationValue: number = 0): Simplex {
    const sorted = [...vertices].sort((a, b) => a - b);
    return { vertices: sorted, dimension: sorted.length - 1, filtration: filtrationValue, key: sorted.join(",") };
  }

  /** Create simplicial complex from mesh with vertices and faces. */
  createSimplicialComplex(mesh: { vertices: Array<Point3D | number[]>; faces: Array<number[] | { a: number; b: number; c: number }> }): SimplicialComplex {
    const complex: SimplicialComplex = { vertices: [], edges: [], triangles: [], simplexMap: new Map(), vertexPositions: [] };
    const edgeSet = new Set<string>();

    for (let i = 0; i < mesh.vertices.length; i++) {
      const s = this.createSimplex([i], 0);
      complex.vertices.push(s);
      complex.simplexMap.set(s.key, s);
      const v = mesh.vertices[i];
      complex.vertexPositions.push(
        Array.isArray(v) ? { x: v[0] ?? 0, y: v[1] ?? 0, z: v[2] ?? 0 } : { x: (v as Point3D).x ?? 0, y: (v as Point3D).y ?? 0, z: (v as Point3D).z ?? 0 },
      );
    }

    for (const face of mesh.faces) {
      const fv = Array.isArray(face) ? face : [face.a, face.b, face.c];
      if (fv.length >= 3) {
        const ts = this.createSimplex([fv[0], fv[1], fv[2]], 0);
        if (!complex.simplexMap.has(ts.key)) { complex.triangles.push(ts); complex.simplexMap.set(ts.key, ts); }
      }
      for (let i = 0; i < fv.length; i++) {
        const j = (i + 1) % fv.length;
        const ek = [Math.min(fv[i], fv[j]), Math.max(fv[i], fv[j])].join(",");
        if (!edgeSet.has(ek)) {
          edgeSet.add(ek);
          const es = this.createSimplex([fv[i], fv[j]], 0);
          complex.edges.push(es);
          complex.simplexMap.set(es.key, es);
        }
      }
    }
    return complex;
  }

  /** Create Rips complex from a point cloud with epsilon distance threshold. */
  createRipsComplex(points: Point3D[], epsilon: number): SimplicialComplex {
    const complex: SimplicialComplex = { vertices: [], edges: [], triangles: [], simplexMap: new Map(), vertexPositions: [...points] };
    const n = points.length;
    const dist = (i: number, j: number) => {
      const dx = points[i].x - points[j].x, dy = points[i].y - points[j].y;
      const dz = (points[i].z ?? 0) - (points[j].z ?? 0);
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    };

    for (let i = 0; i < n; i++) {
      const s = this.createSimplex([i], 0);
      complex.vertices.push(s);
      complex.simplexMap.set(s.key, s);
    }
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const d = dist(i, j);
        if (d <= epsilon) {
          const s = this.createSimplex([i, j], d);
          complex.edges.push(s);
          complex.simplexMap.set(s.key, s);
        }
      }
    }
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (!complex.simplexMap.has(`${i},${j}`)) continue;
        for (let k = j + 1; k < n; k++) {
          if (!complex.simplexMap.has(`${i},${k}`) || !complex.simplexMap.has(`${j},${k}`)) continue;
          const maxEdge = Math.max(dist(i, j), dist(i, k), dist(j, k));
          const s = this.createSimplex([i, j, k], maxEdge);
          complex.triangles.push(s);
          complex.simplexMap.set(s.key, s);
        }
      }
    }
    return complex;
  }

  /** Compute boundary matrix for dimension k (k=1: edges→vertices, k=2: triangles→edges). */
  computeBoundaryMatrix(complex: SimplicialComplex, dimension: number): BoundaryMatrix {
    const simplicesK = dimension === 1 ? complex.edges : dimension === 2 ? complex.triangles : [];
    const simplicesKm1 = dimension === 1 ? complex.vertices : dimension === 2 ? complex.edges : [];
    if (simplicesK.length === 0) return { rows: 0, cols: 0, entries: [] };

    const indexMap = new Map<string, number>();
    simplicesKm1.forEach((s, i) => indexMap.set(s.key, i));

    const entries: BoundaryMatrix["entries"] = [];
    for (let j = 0; j < simplicesK.length; j++) {
      const verts = simplicesK[j].vertices;
      for (let i = 0; i < verts.length; i++) {
        const face = [...verts];
        face.splice(i, 1);
        const rowIdx = indexMap.get(face.join(","));
        if (rowIdx !== undefined) {
          entries.push({ row: rowIdx, col: j, value: i % 2 === 0 ? 1 : -1 });
        }
      }
    }
    return { rows: simplicesKm1.length, cols: simplicesK.length, entries };
  }

  /** Reduce boundary matrix mod 2 (persistence algorithm). Returns pivot info. */
  reduceMatrixMod2(bm: BoundaryMatrix): { pivots: number[]; low: number[] } {
    const cols: Set<number>[] = Array.from({ length: bm.cols }, () => new Set());
    for (const e of bm.entries) { if (e.value % 2 !== 0) cols[e.col].add(e.row); }

    const low = cols.map(c => c.size > 0 ? Math.max(...c) : -1);
    const pivots = new Array(bm.cols).fill(-1);

    for (let j = 0; j < bm.cols; j++) {
      while (low[j] >= 0) {
        let found = -1;
        for (let i = 0; i < j; i++) { if (low[i] === low[j]) { found = i; break; } }
        if (found < 0) break;
        for (const r of cols[found]) { if (cols[j].has(r)) cols[j].delete(r); else cols[j].add(r); }
        low[j] = cols[j].size > 0 ? Math.max(...cols[j]) : -1;
      }
      if (low[j] >= 0) pivots[j] = low[j];
    }
    return { pivots, low };
  }

  /** Compute homology (Betti numbers) of a simplicial complex. */
  computeHomology(complex: SimplicialComplex): HomologyResult {
    const counts = { vertices: complex.vertices.length, edges: complex.edges.length, triangles: complex.triangles.length };

    const r1 = this.reduceMatrixMod2(this.computeBoundaryMatrix(complex, 1));
    const r2 = this.reduceMatrixMod2(this.computeBoundaryMatrix(complex, 2));

    const rank1 = r1.pivots.filter(p => p >= 0).length;
    const rank2 = r2.pivots.filter(p => p >= 0).length;

    const beta0 = counts.vertices - rank1;
    const beta1 = (counts.edges - rank1) - rank2;
    const beta2 = counts.triangles - rank2;

    return {
      betti: [beta0, beta1, beta2],
      beta0, beta1, beta2,
      eulerCharacteristic: beta0 - beta1 + beta2,
      counts,
      ranks: { rank1, rank2 },
    };
  }

  /** Convenience: get Betti numbers from mesh directly. */
  getBettiNumbers(mesh: { vertices: Array<Point3D | number[]>; faces: Array<number[] | { a: number; b: number; c: number }> }): [number, number, number] {
    return this.computeHomology(this.createSimplicialComplex(mesh)).betti;
  }

  /** Compute persistent homology from a point cloud. */
  computePersistence(points: Point3D[], options: { maxEpsilon?: number; steps?: number } = {}): PersistenceResult {
    const maxEps = options.maxEpsilon ?? this._estimateMaxEpsilon(points);
    const steps = options.steps ?? CONFIG.DEFAULT_FILTRATION_STEPS;
    const n = points.length;

    const dist = (i: number, j: number) => {
      const dx = points[i].x - points[j].x, dy = points[i].y - points[j].y;
      const dz = (points[i].z ?? 0) - (points[j].z ?? 0);
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    };

    // Build filtered simplex list
    const allSimplices: Array<{ vertices: number[]; dimension: number; birth: number; key: string }> = [];
    const birthMap = new Map<string, number>();

    for (let i = 0; i < n; i++) {
      const k = `${i}`;
      birthMap.set(k, 0);
      allSimplices.push({ vertices: [i], dimension: 0, birth: 0, key: k });
    }

    const edges: Array<{ i: number; j: number; d: number }> = [];
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++) {
        const d = dist(i, j);
        if (d <= maxEps) edges.push({ i, j, d });
      }
    edges.sort((a, b) => a.d - b.d);

    for (const { i, j, d } of edges) {
      const k = `${i},${j}`;
      birthMap.set(k, d);
      allSimplices.push({ vertices: [i, j], dimension: 1, birth: d, key: k });
    }

    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++) {
        if (!birthMap.has(`${i},${j}`)) continue;
        for (let k = j + 1; k < n; k++) {
          if (!birthMap.has(`${i},${k}`) || !birthMap.has(`${j},${k}`)) continue;
          const birth = Math.max(birthMap.get(`${i},${j}`)!, birthMap.get(`${i},${k}`)!, birthMap.get(`${j},${k}`)!);
          if (birth <= maxEps) {
            const key = `${i},${j},${k}`;
            birthMap.set(key, birth);
            allSimplices.push({ vertices: [i, j, k], dimension: 2, birth, key });
          }
        }
      }

    allSimplices.sort((a, b) => a.birth !== b.birth ? a.birth - b.birth : a.dimension - b.dimension);

    const pairs = this._computePersistencePairs(allSimplices, maxEps);

    const dim0: PersistenceEntry[] = [], dim1: PersistenceEntry[] = [], dim2: PersistenceEntry[] = [];
    for (const p of pairs) {
      const pers = p.death - p.birth;
      const entry: PersistenceEntry = { birth: p.birth, death: p.death, persistence: pers, significant: pers > CONFIG.MIN_PERSISTENCE };
      if (p.dimension === 0) dim0.push(entry);
      else if (p.dimension === 1) dim1.push(entry);
      else dim2.push(entry);
    }

    return {
      diagram: { dimension0: dim0, dimension1: dim1, dimension2: dim2 },
      summary: {
        significantComponents: dim0.filter(p => p.significant).length,
        significantHoles: dim1.filter(p => p.significant).length,
        significantVoids: dim2.filter(p => p.significant).length,
        maxPersistence0: Math.max(0, ...dim0.map(p => p.persistence)),
        maxPersistence1: Math.max(0, ...dim1.map(p => p.persistence)),
        maxPersistence2: Math.max(0, ...dim2.map(p => p.persistence)),
      },
      maxEpsilon: maxEps,
      pointCount: n,
      simplexCount: allSimplices.length,
    };
  }

  /** Validate mesh features against expected topology. */
  validateFeatures(mesh: { vertices: Array<Point3D | number[]>; faces: Array<number[] | { a: number; b: number; c: number }> }, expected: { components?: number; holes?: number; voids?: number } = {}): FeatureValidation {
    const complex = this.createSimplicialComplex(mesh);
    const homology = this.computeHomology(complex);
    const result: FeatureValidation = { valid: true, discrepancies: [], topology: homology };

    if (expected.components !== undefined && homology.beta0 !== expected.components) {
      result.valid = false;
      result.discrepancies.push({ feature: "components", expected: expected.components, found: homology.beta0, difference: homology.beta0 - expected.components });
    }
    if (expected.holes !== undefined && homology.beta1 !== expected.holes) {
      result.valid = false;
      result.discrepancies.push({ feature: "holes", expected: expected.holes, found: homology.beta1, difference: homology.beta1 - expected.holes });
    }
    if (expected.voids !== undefined && homology.beta2 !== expected.voids) {
      result.valid = false;
      result.discrepancies.push({ feature: "voids", expected: expected.voids, found: homology.beta2, difference: homology.beta2 - expected.voids });
    }

    if (homology.beta1 > 0) {
      result.recommendations = result.recommendations ?? [];
      result.recommendations.push(`Part contains ${homology.beta1} through-hole(s) - drilling operations required`);
    }
    if (homology.beta0 > 1) {
      result.recommendations = result.recommendations ?? [];
      result.recommendations.push(`Part has ${homology.beta0} separate components - verify multi-part assembly`);
    }

    return result;
  }

  // ── Private helpers ──

  private _estimateMaxEpsilon(points: Point3D[]): number {
    if (points.length < 2) return 1;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const p of points) {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
      minZ = Math.min(minZ, p.z ?? 0); maxZ = Math.max(maxZ, p.z ?? 0);
    }
    return Math.sqrt((maxX - minX) ** 2 + (maxY - minY) ** 2 + (maxZ - minZ) ** 2) / 2;
  }

  private _computePersistencePairs(
    simplices: Array<{ vertices: number[]; dimension: number; birth: number; key: string }>,
    maxEpsilon: number,
  ): Array<{ dimension: number; birth: number; death: number }> {
    const pairs: Array<{ dimension: number; birth: number; death: number }> = [];
    const n = simplices.length;
    const indexMap = new Map<string, number>();
    simplices.forEach((s, i) => indexMap.set(s.key, i));

    const columns: Set<number>[] = simplices.map(s => {
      const boundary = new Set<number>();
      if (s.dimension > 0) {
        for (let i = 0; i < s.vertices.length; i++) {
          const face = [...s.vertices];
          face.splice(i, 1);
          const fi = indexMap.get(face.join(","));
          if (fi !== undefined) boundary.add(fi);
        }
      }
      return boundary;
    });

    const low = columns.map(c => c.size > 0 ? Math.max(...c) : -1);
    const paired = new Set<number>();

    for (let j = 0; j < n; j++) {
      while (low[j] >= 0) {
        let found = -1;
        for (let i = 0; i < j; i++) { if (low[i] === low[j] && !paired.has(i)) { found = i; break; } }
        if (found < 0) break;
        for (const r of columns[found]) { if (columns[j].has(r)) columns[j].delete(r); else columns[j].add(r); }
        low[j] = columns[j].size > 0 ? Math.max(...columns[j]) : -1;
      }
      if (low[j] >= 0) {
        paired.add(low[j]);
        paired.add(j);
        pairs.push({ dimension: simplices[low[j]].dimension, birth: simplices[low[j]].birth, death: simplices[j].birth });
      }
    }

    for (let i = 0; i < n; i++) {
      if (!paired.has(i) && simplices[i].dimension === 0) {
        pairs.push({ dimension: 0, birth: simplices[i].birth, death: maxEpsilon });
      }
    }
    return pairs;
  }
}

export const topologyEngine = new TopologyEngineImpl();
