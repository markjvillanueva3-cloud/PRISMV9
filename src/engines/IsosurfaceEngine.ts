/**
 * PRISM MCP Server — Isosurface Engine
 *
 * Isosurface extraction from 3D scalar fields:
 * - Marching Cubes algorithm (Lorensen & Cline 1987)
 * - Implicit function grid generation
 *
 * Ported from PRISM_ISOSURFACE_ENGINE.js (monolith R2.3.1).
 *
 * @module IsosurfaceEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface Vec3 { x: number; y: number; z: number; }

export interface Bounds3D {
  min: Vec3;
  max: Vec3;
}

export interface GridSize { x: number; y: number; z: number; }

export interface ScalarGrid {
  data: number[][][];  // data[i][j][k]
  bounds: Bounds3D;
  size: GridSize;
}

export interface MarchingCubesResult {
  vertices: Vec3[];
  faces: [number, number, number][];
}

// ============================================================================
// ENGINE
// ============================================================================

class IsosurfaceEngineImpl {

  /**
   * Marching Cubes isosurface extraction.
   * Source: Lorensen & Cline, SIGGRAPH 1987.
   */
  marchingCubes(grid: ScalarGrid, isovalue = 0.0): MarchingCubesResult {
    const vertices: Vec3[] = [];
    const faces: [number, number, number][] = [];
    const vertexMap = new Map<string, number>();

    const { data, bounds, size } = grid;
    const dx = (bounds.max.x - bounds.min.x) / (size.x - 1);
    const dy = (bounds.max.y - bounds.min.y) / (size.y - 1);
    const dz = (bounds.max.z - bounds.min.z) / (size.z - 1);

    const interpVertex = (p1: Vec3, p2: Vec3, v1: number, v2: number): Vec3 => {
      if (Math.abs(isovalue - v1) < 1e-10) return p1;
      if (Math.abs(isovalue - v2) < 1e-10) return p2;
      if (Math.abs(v1 - v2) < 1e-10) return p1;
      const t = (isovalue - v1) / (v2 - v1);
      return {
        x: p1.x + t * (p2.x - p1.x),
        y: p1.y + t * (p2.y - p1.y),
        z: p1.z + t * (p2.z - p1.z),
      };
    };

    const addVertex = (v: Vec3): number => {
      const key = `${v.x.toFixed(6)},${v.y.toFixed(6)},${v.z.toFixed(6)}`;
      if (vertexMap.has(key)) return vertexMap.get(key)!;
      const idx = vertices.length;
      vertices.push(v);
      vertexMap.set(key, idx);
      return idx;
    };

    const edges: [number, number][] = [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7],
    ];

    for (let i = 0; i < size.x - 1; i++) {
      for (let j = 0; j < size.y - 1; j++) {
        for (let k = 0; k < size.z - 1; k++) {
          const v = [
            data[i][j][k],       data[i + 1][j][k],
            data[i + 1][j][k + 1], data[i][j][k + 1],
            data[i][j + 1][k],   data[i + 1][j + 1][k],
            data[i + 1][j + 1][k + 1], data[i][j + 1][k + 1],
          ];

          const p: Vec3[] = [
            { x: bounds.min.x + i * dx,       y: bounds.min.y + j * dy,       z: bounds.min.z + k * dz },
            { x: bounds.min.x + (i + 1) * dx, y: bounds.min.y + j * dy,       z: bounds.min.z + k * dz },
            { x: bounds.min.x + (i + 1) * dx, y: bounds.min.y + j * dy,       z: bounds.min.z + (k + 1) * dz },
            { x: bounds.min.x + i * dx,       y: bounds.min.y + j * dy,       z: bounds.min.z + (k + 1) * dz },
            { x: bounds.min.x + i * dx,       y: bounds.min.y + (j + 1) * dy, z: bounds.min.z + k * dz },
            { x: bounds.min.x + (i + 1) * dx, y: bounds.min.y + (j + 1) * dy, z: bounds.min.z + k * dz },
            { x: bounds.min.x + (i + 1) * dx, y: bounds.min.y + (j + 1) * dy, z: bounds.min.z + (k + 1) * dz },
            { x: bounds.min.x + i * dx,       y: bounds.min.y + (j + 1) * dy, z: bounds.min.z + (k + 1) * dz },
          ];

          let cubeIndex = 0;
          for (let c = 0; c < 8; c++) {
            if (v[c] < isovalue) cubeIndex |= (1 << c);
          }

          if (cubeIndex === 0 || cubeIndex === 255) continue;

          const edgeFlags = EDGE_TABLE[cubeIndex];
          if (edgeFlags === 0) continue;

          const edgeVerts: (Vec3 | null)[] = new Array(12).fill(null);
          for (let e = 0; e < 12; e++) {
            if (edgeFlags & (1 << e)) {
              const [e1, e2] = edges[e];
              edgeVerts[e] = interpVertex(p[e1], p[e2], v[e1], v[e2]);
            }
          }

          const tris = this.getTriangles(cubeIndex);
          for (const [e1, e2, e3] of tris) {
            if (edgeVerts[e1] && edgeVerts[e2] && edgeVerts[e3]) {
              faces.push([
                addVertex(edgeVerts[e1]!),
                addVertex(edgeVerts[e2]!),
                addVertex(edgeVerts[e3]!),
              ]);
            }
          }
        }
      }
    }

    return { vertices, faces };
  }

  /**
   * Create a scalar grid from an implicit function f(x,y,z).
   */
  createImplicitGrid(
    func: (x: number, y: number, z: number) => number,
    bounds: Bounds3D,
    resolution: number,
  ): ScalarGrid {
    const data: number[][][] = [];
    const dx = (bounds.max.x - bounds.min.x) / resolution;
    const dy = (bounds.max.y - bounds.min.y) / resolution;
    const dz = (bounds.max.z - bounds.min.z) / resolution;

    for (let i = 0; i <= resolution; i++) {
      const plane: number[][] = [];
      for (let j = 0; j <= resolution; j++) {
        const row: number[] = [];
        for (let k = 0; k <= resolution; k++) {
          row.push(func(
            bounds.min.x + i * dx,
            bounds.min.y + j * dy,
            bounds.min.z + k * dz,
          ));
        }
        plane.push(row);
      }
      data.push(plane);
    }

    return {
      data,
      bounds,
      size: { x: resolution + 1, y: resolution + 1, z: resolution + 1 },
    };
  }

  private getTriangles(cubeIndex: number): [number, number, number][] {
    const edgeFlags = EDGE_TABLE[cubeIndex];
    const activeEdges: number[] = [];
    for (let e = 0; e < 12; e++) {
      if (edgeFlags & (1 << e)) activeEdges.push(e);
    }
    const tris: [number, number, number][] = [];
    if (activeEdges.length >= 3) {
      for (let i = 1; i < activeEdges.length - 1; i++) {
        tris.push([activeEdges[0], activeEdges[i], activeEdges[i + 1]]);
      }
    }
    return tris;
  }
}

// Marching Cubes edge table (256 entries)
const EDGE_TABLE = new Uint16Array([
  0x0, 0x109, 0x203, 0x30a, 0x406, 0x50f, 0x605, 0x70c,
  0x80c, 0x905, 0xa0f, 0xb06, 0xc0a, 0xd03, 0xe09, 0xf00,
  0x190, 0x99, 0x393, 0x29a, 0x596, 0x49f, 0x795, 0x69c,
  0x99c, 0x895, 0xb9f, 0xa96, 0xd9a, 0xc93, 0xf99, 0xe90,
  0x230, 0x339, 0x33, 0x13a, 0x636, 0x73f, 0x435, 0x53c,
  0xa3c, 0xb35, 0x83f, 0x936, 0xe3a, 0xf33, 0xc39, 0xd30,
  0x3a0, 0x2a9, 0x1a3, 0xaa, 0x7a6, 0x6af, 0x5a5, 0x4ac,
  0xbac, 0xaa5, 0x9af, 0x8a6, 0xfaa, 0xea3, 0xda9, 0xca0,
  0x460, 0x569, 0x663, 0x76a, 0x66, 0x16f, 0x265, 0x36c,
  0xc6c, 0xd65, 0xe6f, 0xf66, 0x86a, 0x963, 0xa69, 0xb60,
  0x5f0, 0x4f9, 0x7f3, 0x6fa, 0x1f6, 0xff, 0x3f5, 0x2fc,
  0xdfc, 0xcf5, 0xfff, 0xef6, 0x9fa, 0x8f3, 0xbf9, 0xaf0,
  0x650, 0x759, 0x453, 0x55a, 0x256, 0x35f, 0x55, 0x15c,
  0xe5c, 0xf55, 0xc5f, 0xd56, 0xa5a, 0xb53, 0x859, 0x950,
  0x7c0, 0x6c9, 0x5c3, 0x4ca, 0x3c6, 0x2cf, 0x1c5, 0xcc,
  0xfcc, 0xec5, 0xdcf, 0xcc6, 0xbca, 0xac3, 0x9c9, 0x8c0,
  0x8c0, 0x9c9, 0xac3, 0xbca, 0xcc6, 0xdcf, 0xec5, 0xfcc,
  0xcc, 0x1c5, 0x2cf, 0x3c6, 0x4ca, 0x5c3, 0x6c9, 0x7c0,
  0x950, 0x859, 0xb53, 0xa5a, 0xd56, 0xc5f, 0xf55, 0xe5c,
  0x15c, 0x55, 0x35f, 0x256, 0x55a, 0x453, 0x759, 0x650,
  0xaf0, 0xbf9, 0x8f3, 0x9fa, 0xef6, 0xfff, 0xcf5, 0xdfc,
  0x2fc, 0x3f5, 0xff, 0x1f6, 0x6fa, 0x7f3, 0x4f9, 0x5f0,
  0xb60, 0xa69, 0x963, 0x86a, 0xf66, 0xe6f, 0xd65, 0xc6c,
  0x36c, 0x265, 0x16f, 0x66, 0x76a, 0x663, 0x569, 0x460,
  0xca0, 0xda9, 0xea3, 0xfaa, 0x8a6, 0x9af, 0xaa5, 0xbac,
  0x4ac, 0x5a5, 0x6af, 0x7a6, 0xaa, 0x1a3, 0x2a9, 0x3a0,
  0xd30, 0xc39, 0xf33, 0xe3a, 0x936, 0x83f, 0xb35, 0xa3c,
  0x53c, 0x435, 0x73f, 0x636, 0x13a, 0x33, 0x339, 0x230,
  0xe90, 0xf99, 0xc93, 0xd9a, 0xa96, 0xb9f, 0x895, 0x99c,
  0x69c, 0x795, 0x49f, 0x596, 0x29a, 0x393, 0x99, 0x190,
  0xf00, 0xe09, 0xd03, 0xc0a, 0xb06, 0xa0f, 0x905, 0x80c,
  0x70c, 0x605, 0x50f, 0x406, 0x30a, 0x203, 0x109, 0x0,
]);

export const isosurfaceEngine = new IsosurfaceEngineImpl();
