/**
 * PRISM MCP Server — Silhouette Engine
 *
 * Edge extraction for mesh visualization:
 * - Silhouette edges (front/back face boundary for a view direction)
 * - Crease edges (sharp dihedral angles)
 * - Boundary edges (single-face edges)
 * - Edge mesh generation (quads for rendering)
 *
 * Ported from PRISM_SILHOUETTE_ENGINE.js (monolith R2.3.1).
 *
 * @module SilhouetteEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface Vec3 { x: number; y: number; z: number; }

export interface CreaseEdge {
  edge: [number, number];
  angle: number;
}

export interface AllEdgesResult {
  silhouette: [number, number][];
  crease: CreaseEdge[];
  boundary: [number, number][];
}

export interface EdgeMesh {
  vertices: Vec3[];
  faces: [number, number, number][];
}

// ============================================================================
// ENGINE
// ============================================================================

class SilhouetteEngineImpl {

  /**
   * Extract silhouette edges for a given view direction.
   * Silhouette = edges where one adjacent face is front-facing, the other back-facing.
   */
  extractSilhouette(vertices: Vec3[], faces: number[][], viewDir: Vec3): [number, number][] {
    const nv = normalize(viewDir);

    const faceData = faces.map(face => {
      const normal = faceNormal(vertices[face[0]], vertices[face[1]], vertices[face[2]]);
      const d = normal.x * nv.x + normal.y * nv.y + normal.z * nv.z;
      return { frontFacing: d < 0 };
    });

    const edgeFaces = buildEdgeFaceMap(faces);
    const silhouetteEdges: [number, number][] = [];

    edgeFaces.forEach((faceList, key) => {
      if (faceList.length === 2) {
        if (faceData[faceList[0]].frontFacing !== faceData[faceList[1]].frontFacing) {
          silhouetteEdges.push(parseEdgeKey(key));
        }
      } else if (faceList.length === 1) {
        silhouetteEdges.push(parseEdgeKey(key));
      }
    });

    return silhouetteEdges;
  }

  /**
   * Extract crease (sharp) edges based on dihedral angle threshold.
   */
  extractCreaseEdges(vertices: Vec3[], faces: number[][], angleThreshold = 30): CreaseEdge[] {
    const thresholdRad = angleThreshold * Math.PI / 180;
    const faceNormals = faces.map(face =>
      faceNormal(vertices[face[0]], vertices[face[1]], vertices[face[2]]),
    );

    const edgeFaces = buildEdgeFaceMap(faces);
    const creaseEdges: CreaseEdge[] = [];

    edgeFaces.forEach((faceList, key) => {
      if (faceList.length === 2) {
        const n0 = faceNormals[faceList[0]];
        const n1 = faceNormals[faceList[1]];
        const d = n0.x * n1.x + n0.y * n1.y + n0.z * n1.z;
        const angle = Math.acos(Math.max(-1, Math.min(1, d)));
        if (angle > thresholdRad) {
          creaseEdges.push({ edge: parseEdgeKey(key), angle: angle * 180 / Math.PI });
        }
      }
    });

    return creaseEdges;
  }

  /**
   * Extract all visible edges: silhouette + crease + boundary.
   */
  extractAllEdges(vertices: Vec3[], faces: number[][], viewDir: Vec3, creaseAngle = 30): AllEdgesResult {
    const silhouette = this.extractSilhouette(vertices, faces, viewDir);
    const crease = this.extractCreaseEdges(vertices, faces, creaseAngle);

    const edgeCount = new Map<string, number>();
    for (const face of faces) {
      for (let i = 0; i < face.length; i++) {
        const v1 = face[i], v2 = face[(i + 1) % face.length];
        const key = v1 < v2 ? `${v1}-${v2}` : `${v2}-${v1}`;
        edgeCount.set(key, (edgeCount.get(key) ?? 0) + 1);
      }
    }

    const boundary: [number, number][] = [];
    edgeCount.forEach((count, key) => {
      if (count === 1) boundary.push(parseEdgeKey(key));
    });

    return { silhouette, crease, boundary };
  }

  /**
   * Generate edge mesh for rendering edges as screen-space quads.
   */
  generateEdgeMesh(vertices: Vec3[], edges: [number, number][], width = 0.01): EdgeMesh {
    const quadVertices: Vec3[] = [];
    const quadFaces: [number, number, number][] = [];

    for (const [v1, v2] of edges) {
      const p1 = vertices[v1];
      const p2 = vertices[v2];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dz = (p2.z ?? 0) - (p1.z ?? 0);
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (len < 1e-10) continue;

      const perpX = -dy / len;
      const perpY = dx / len;
      const hw = width / 2;
      const base = quadVertices.length;

      quadVertices.push(
        { x: p1.x + perpX * hw, y: p1.y + perpY * hw, z: p1.z ?? 0 },
        { x: p1.x - perpX * hw, y: p1.y - perpY * hw, z: p1.z ?? 0 },
        { x: p2.x - perpX * hw, y: p2.y - perpY * hw, z: p2.z ?? 0 },
        { x: p2.x + perpX * hw, y: p2.y + perpY * hw, z: p2.z ?? 0 },
      );

      quadFaces.push([base, base + 1, base + 2], [base, base + 2, base + 3]);
    }

    return { vertices: quadVertices, faces: quadFaces };
  }
}

// ── Helpers ──

function normalize(v: Vec3): Vec3 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + (v.z ?? 0) * (v.z ?? 0));
  if (len > 1e-10) return { x: v.x / len, y: v.y / len, z: (v.z ?? 0) / len };
  return { x: 0, y: 0, z: 1 };
}

function faceNormal(v0: Vec3, v1: Vec3, v2: Vec3): Vec3 {
  const e1 = { x: v1.x - v0.x, y: v1.y - v0.y, z: (v1.z ?? 0) - (v0.z ?? 0) };
  const e2 = { x: v2.x - v0.x, y: v2.y - v0.y, z: (v2.z ?? 0) - (v0.z ?? 0) };
  return normalize({
    x: e1.y * e2.z - e1.z * e2.y,
    y: e1.z * e2.x - e1.x * e2.z,
    z: e1.x * e2.y - e1.y * e2.x,
  });
}

function buildEdgeFaceMap(faces: number[][]): Map<string, number[]> {
  const map = new Map<string, number[]>();
  faces.forEach((face, fi) => {
    for (let i = 0; i < face.length; i++) {
      const v1 = face[i], v2 = face[(i + 1) % face.length];
      const key = v1 < v2 ? `${v1}-${v2}` : `${v2}-${v1}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(fi);
    }
  });
  return map;
}

function parseEdgeKey(key: string): [number, number] {
  const [a, b] = key.split("-").map(Number);
  return [a, b];
}

export const silhouetteEngine = new SilhouetteEngineImpl();
