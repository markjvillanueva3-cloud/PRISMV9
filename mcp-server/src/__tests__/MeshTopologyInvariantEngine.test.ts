/**
 * MeshTopologyInvariantEngine — algebraic-topology mesh invariant tests.
 *
 * Reference geometry (all exact integers — combinatorial topology, no floats):
 *   - Tetrahedron (convex hull of 4 points): V=4, E=6, F=4 -> chi=2, genus=0,
 *     Betti=(1,0,1), watertight + manifold + orientable.
 *   - Cube triangulated (12 triangles, 2 per quad face): V=8, E=18, F=12 -> chi=2.
 *   - 3x3 periodic grid torus (standard flat-torus triangulation, m=n=3,
 *     minimum grid size without multi-edges): V=9, E=27, F=18 -> chi=0, genus=1,
 *     Betti=(1,2,1).
 *   - Single triangle: V=3, E=3, F=1 -> chi=1; every edge is a boundary edge
 *     (incident to only 1 face) -> not watertight.
 *   - Two disjoint tetrahedra (no shared vertices/edges): b0=2, V=8, E=12, F=8
 *     -> chi=4.
 *   - One edge shared by 3 faces (a "book" of 3 pages) -> not manifold.
 *
 * Tests verify intent (R9): exact Euler characteristic / genus / Betti numbers
 * against known closed-form results for standard triangulated surfaces (Massey,
 * "A Basic Course in Algebraic Topology," Ch. 6), not just "a number came back."
 */

import { describe, it, expect } from "vitest";
import {
  MeshTopologyInvariantEngine,
  meshtopologyinvariantEngine,
  type MeshFace,
  type MeshTopologyInput,
} from "../engines/MeshTopologyInvariantEngine";

// ─── Reference geometry ─────────────────────────────────────────────────────

/**
 * Standard tetrahedron face list (vertices 0..3), CCW-outward winding:
 * faces opposite each vertex, verified by hand (module doc / unit report)
 * to have every shared edge traversed in opposite directions by its two
 * incident faces (globally orientable).
 */
function tetrahedronFaces(offset = 0): MeshFace[] {
  const o = offset;
  return [
    [o + 1, o + 2, o + 3],
    [o + 0, o + 3, o + 2],
    [o + 0, o + 1, o + 3],
    [o + 0, o + 2, o + 1],
  ];
}

/** Unit cube, 8 vertices, 6 quad faces each split into 2 CCW-outward triangles. */
function cubeMesh(): MeshTopologyInput {
  const quads: MeshFace[][] = [
    // Bottom (z=0): outward -z
    [[0, 3, 2], [0, 2, 1]],
    // Top (z=1): outward +z
    [[4, 5, 6], [4, 6, 7]],
    // Front (y=0): outward -y
    [[0, 1, 5], [0, 5, 4]],
    // Back (y=1): outward +y
    [[2, 3, 7], [2, 7, 6]],
    // Left (x=0): outward -x
    [[0, 4, 7], [0, 7, 3]],
    // Right (x=1): outward +x
    [[1, 2, 6], [1, 6, 5]],
  ];
  const faces = quads.flat();
  return { vertices: 8, faces };
}

/**
 * Periodic m x n grid torus (standard flat-torus triangulation). For any
 * m,n >= 3 this yields V=mn, E=3mn, F=2mn, hence chi = mn - 3mn + 2mn = 0
 * identically — the classical combinatorial torus. m,n >= 3 avoids
 * multi-edges (wrap-around "next" and "prev" neighbors coincide only when
 * m or n < 3). Local triangulation is translation-invariant, which is
 * exactly why the whole grid is globally orientable (each interior edge
 * is always crossed by a "second-triangle" cell and the matching
 * "first-triangle" edge of its neighbor, in opposite directions — verified
 * by hand for the general translation pattern in the unit report).
 */
function gridTorusMesh(m: number, n: number): MeshTopologyInput {
  const id = (i: number, j: number) => (((i % m) + m) % m) * n + (((j % n) + n) % n);
  const faces: MeshFace[] = [];
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      const a = id(i, j);
      const b = id(i, j + 1);
      const c = id(i + 1, j);
      const d = id(i + 1, j + 1);
      faces.push([a, b, c]);
      faces.push([b, d, c]);
    }
  }
  return { vertices: m * n, faces };
}

// ─── Engine identity ─────────────────────────────────────────────────────────

describe("MeshTopologyInvariantEngine — singleton", () => {
  it("exports a singleton instance of the class", () => {
    expect(meshtopologyinvariantEngine).toBeInstanceOf(MeshTopologyInvariantEngine);
  });
});

// ─── Happy path ──────────────────────────────────────────────────────────────

describe("MeshTopologyInvariantEngine — closed orientable surfaces", () => {
  it("tetrahedron: V=4,E=6,F=4 -> chi=2, genus=0, Betti=(1,0,1), watertight+manifold", () => {
    const result = meshtopologyinvariantEngine.computeInvariants({
      vertices: 4,
      faces: tetrahedronFaces(),
    });
    expect(result.numVertices).toBe(4);
    expect(result.numEdges).toBe(6);
    expect(result.numFaces).toBe(4);
    expect(result.eulerCharacteristic).toBe(2);
    expect(result.components).toBe(1);
    expect(result.isManifold).toBe(true);
    expect(result.isWatertight).toBe(true);
    expect(result.isOrientable).toBe(true);
    expect(result.genus).toBe(0);
    expect(result.betti).toEqual({ b0: 1, b1: 0, b2: 1 });
    expect(result.boundaryEdgeCount).toBe(0);
    expect(result.nonManifoldEdgeCount).toBe(0);
  });

  it("cube (12 triangles): V=8,E=18,F=12 -> chi=2, genus=0, watertight+manifold", () => {
    const result = meshtopologyinvariantEngine.computeInvariants(cubeMesh());
    expect(result.numVertices).toBe(8);
    expect(result.numEdges).toBe(18);
    expect(result.numFaces).toBe(12);
    expect(result.eulerCharacteristic).toBe(2);
    expect(result.components).toBe(1);
    expect(result.isManifold).toBe(true);
    expect(result.isWatertight).toBe(true);
    expect(result.isOrientable).toBe(true);
    expect(result.genus).toBe(0);
    expect(result.betti).toEqual({ b0: 1, b1: 0, b2: 1 });
  });

  it("3x3 periodic grid torus: V=9,E=27,F=18 -> chi=0, genus=1, Betti=(1,2,1)", () => {
    const result = meshtopologyinvariantEngine.computeInvariants(gridTorusMesh(3, 3));
    expect(result.numVertices).toBe(9);
    expect(result.numEdges).toBe(27);
    expect(result.numFaces).toBe(18);
    expect(result.eulerCharacteristic).toBe(0);
    expect(result.components).toBe(1);
    expect(result.isManifold).toBe(true);
    expect(result.isWatertight).toBe(true);
    expect(result.isOrientable).toBe(true);
    expect(result.genus).toBe(1);
    expect(result.betti).toEqual({ b0: 1, b1: 2, b2: 1 });
  });

  it("4x5 periodic grid torus (different size, same identity): chi=0, genus=1", () => {
    // Independent cross-check that chi=0/genus=1 holds for ANY m,n>=3 grid torus,
    // not an artifact of the 3x3 case.
    const result = meshtopologyinvariantEngine.computeInvariants(gridTorusMesh(4, 5));
    expect(result.numVertices).toBe(20);
    expect(result.numEdges).toBe(60); // 3*m*n
    expect(result.numFaces).toBe(40); // 2*m*n
    expect(result.eulerCharacteristic).toBe(0);
    expect(result.isWatertight).toBe(true);
    expect(result.isOrientable).toBe(true);
    expect(result.genus).toBe(1);
    expect(result.betti).toEqual({ b0: 1, b1: 2, b2: 1 });
  });
});

// ─── Edge cases (>= 3 required) ──────────────────────────────────────────────

describe("MeshTopologyInvariantEngine — edge cases", () => {
  it("single triangle: has boundary edges -> not watertight (still manifold)", () => {
    const result = meshtopologyinvariantEngine.computeInvariants({
      vertices: 3,
      faces: [[0, 1, 2]],
    });
    expect(result.numVertices).toBe(3);
    expect(result.numEdges).toBe(3);
    expect(result.numFaces).toBe(1);
    expect(result.eulerCharacteristic).toBe(1);
    expect(result.isManifold).toBe(true);
    expect(result.isWatertight).toBe(false);
    expect(result.boundaryEdgeCount).toBe(3);
    expect(result.genus).toBeNull(); // not closed -> genus formula does not apply
    // Euler-Poincare still holds for the disk: b2=0 (has boundary), b1 = b0-chi+b2 = 1-1+0 = 0.
    expect(result.betti).toEqual({ b0: 1, b1: 0, b2: 0 });
  });

  it("two disjoint tetrahedra: b0=2, chi=4 (V=8,E=12,F=8)", () => {
    const faces = [...tetrahedronFaces(0), ...tetrahedronFaces(4)];
    const result = meshtopologyinvariantEngine.computeInvariants({ vertices: 8, faces });
    expect(result.components).toBe(2);
    expect(result.numVertices).toBe(8);
    expect(result.numEdges).toBe(12);
    expect(result.numFaces).toBe(8);
    expect(result.eulerCharacteristic).toBe(4);
    expect(result.isWatertight).toBe(true);
    expect(result.isManifold).toBe(true);
    expect(result.genus).toBe(0); // b0 - chi/2 = 2 - 2 = 0 (each component genus 0)
  });

  it("trivial 0-complex: N isolated vertices, no edges/faces -> chi=N, b0=N", () => {
    const result = meshtopologyinvariantEngine.computeInvariants({ vertices: 5 });
    expect(result.numVertices).toBe(5);
    expect(result.numEdges).toBe(0);
    expect(result.numFaces).toBe(0);
    expect(result.eulerCharacteristic).toBe(5);
    expect(result.components).toBe(5);
    expect(result.betti).toEqual({ b0: 5, b1: 0, b2: 0 });
    // Graph-mode concepts (manifold/watertight/orientable) do not apply.
    expect(result.isManifold).toBeNull();
    expect(result.isWatertight).toBeNull();
    expect(result.isOrientable).toBeNull();
  });

  it("graph mode (edges only, no faces): triangle cycle graph -> b1=1 (cyclomatic number)", () => {
    const result = meshtopologyinvariantEngine.computeInvariants({
      vertices: 3,
      edges: [[0, 1], [1, 2], [2, 0]],
    });
    expect(result.numVertices).toBe(3);
    expect(result.numEdges).toBe(3);
    expect(result.numFaces).toBe(0);
    expect(result.eulerCharacteristic).toBe(0); // V - E = 3 - 3
    expect(result.components).toBe(1);
    expect(result.betti).toEqual({ b0: 1, b1: 1, b2: 0 }); // one independent cycle
    expect(result.isManifold).toBeNull();
  });

  it("vertices supplied as an array (position-carrying), count derived from length", () => {
    const result = meshtopologyinvariantEngine.computeInvariants({
      vertices: [{ x: 0 }, { x: 1 }, { x: 2 }],
      faces: [[0, 1, 2]],
    });
    expect(result.numVertices).toBe(3);
    expect(result.eulerCharacteristic).toBe(1);
  });
});

// ─── Adversarial cases (>= 2 required) ───────────────────────────────────────

describe("MeshTopologyInvariantEngine — adversarial cases", () => {
  it("non-manifold edge (3 faces sharing one edge) -> isManifold=false, Betti unknown", () => {
    // Edge {0,1} shared by 3 "book pages" (2, 3, 4).
    const result = meshtopologyinvariantEngine.computeInvariants({
      vertices: 5,
      faces: [
        [0, 1, 2],
        [0, 1, 3],
        [0, 1, 4],
      ],
    });
    expect(result.numVertices).toBe(5);
    expect(result.numFaces).toBe(3);
    expect(result.isManifold).toBe(false);
    expect(result.isWatertight).toBe(false);
    expect(result.nonManifoldEdgeCount).toBe(1);
    expect(result.genus).toBeNull();
    expect(result.betti.b2).toBeNull();
    expect(result.betti.b1).toBeNull();
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("inconsistent winding (both faces traverse the shared edge the same direction) -> not orientable", () => {
    // Two triangles glued along edge {1,2}, but the second face is NOT
    // wound oppositely (both traverse 1->2), so the shared edge fails the
    // orientability test even though the mesh is manifold (each edge <=2 faces)
    // and has boundary (not watertight, so genus stays null — orientability
    // is checked independently of watertightness).
    const result = meshtopologyinvariantEngine.computeInvariants({
      vertices: 4,
      faces: [
        [0, 1, 2],
        [3, 1, 2], // shares directed edge (1,2) with face 0 instead of (2,1)
      ],
    });
    expect(result.isManifold).toBe(true);
    expect(result.isOrientable).toBe(false);
    expect(result.genus).toBeNull(); // orientable is required for the genus formula
  });

  it("throws on an out-of-range vertex index in a face", () => {
    expect(() =>
      meshtopologyinvariantEngine.computeInvariants({
        vertices: 3,
        faces: [[0, 1, 3]], // 3 is out of range for a 3-vertex mesh
      })
    ).toThrow(/out of range/);
  });

  it("throws on a degenerate face (repeated vertex index)", () => {
    expect(() =>
      meshtopologyinvariantEngine.computeInvariants({
        vertices: 3,
        faces: [[0, 0, 1]],
      })
    ).toThrow(/degenerate/);
  });

  it("throws when both faces and edges are supplied (ambiguous mode)", () => {
    expect(() =>
      meshtopologyinvariantEngine.computeInvariants({
        vertices: 3,
        faces: [[0, 1, 2]],
        edges: [[0, 1]],
      })
    ).toThrow(/either .faces. .*or .edges./);
  });

  it("throws on a negative vertex count", () => {
    expect(() =>
      meshtopologyinvariantEngine.computeInvariants({ vertices: -1 })
    ).toThrow(/non-negative integer/);
  });

  it("throws on a self-loop edge in graph mode", () => {
    expect(() =>
      meshtopologyinvariantEngine.computeInvariants({
        vertices: 2,
        edges: [[0, 0]],
      })
    ).toThrow(/self-loop/);
  });
});
