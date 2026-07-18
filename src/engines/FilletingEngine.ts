/**
 * PRISM MCP Server -- Filleting Engine
 *
 * B-Rep edge modification operations:
 * - Constant radius fillet (rolling ball method)
 * - Variable radius fillet
 * - Chamfer (symmetric and asymmetric)
 * - Fillet preview / validation
 *
 * Ported from PRISM_FILLETING_ENGINE.js (monolith R2.3.1).
 *
 * @module FilletingEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface Vec3 { x: number; y: number; z: number; }

export interface BRepEdge {
  startVertex: number;
  endVertex: number;
  filleted?: boolean;
  filletRadius?: number;
  chamfered?: boolean;
  chamferDistances?: [number, number];
}

export interface BRepFace {
  type?: string;
  edges?: number[];
  vertices?: number[];
  width?: number;
  radius?: number;
  distances?: [number, number];
}

export interface BRepSolid {
  vertices: Vec3[];
  edges: BRepEdge[];
  faces: BRepFace[];
}

export interface FilletResult {
  success: boolean;
  solid: BRepSolid | null;
  filletedEdges: number[];
  errors: string[];
}

export interface VariableFilletResult {
  success: boolean;
  solid: BRepSolid | null;
  error: string | null;
}

export interface ChamferResult {
  success: boolean;
  solid: BRepSolid | null;
  chamferedEdges: number[];
  errors: string[];
}

export interface FilletPreview {
  curves: Array<{
    edgeIdx: number;
    radius?: number;
    start?: Vec3;
    end?: Vec3;
    error?: string;
  }>;
  valid: boolean;
}

interface FilletGeom {
  vertices: Vec3[];
  faces: Array<{ vertices: number[] }>;
  radius: number;
}

interface ChamferGeom {
  vertices: Vec3[];
  faces: Array<{ vertices: number[] }>;
  distances: [number, number];
}

// ============================================================================
// ENGINE
// ============================================================================

class FilletingEngineImpl {

  /** Apply constant radius fillet to edges. */
  filletEdges(solid: BRepSolid, edgeIndices: number[], radius: number): FilletResult {
    const result: FilletResult = { success: false, solid: null, filletedEdges: [], errors: [] };
    if (!solid || !edgeIndices || edgeIndices.length === 0) {
      result.errors.push("Invalid input: solid or edges missing");
      return result;
    }
    if (radius <= 0) {
      result.errors.push("Radius must be positive");
      return result;
    }
    result.solid = structuredClone(solid);

    for (const edgeIdx of edgeIndices) {
      const r = this.filletSingleEdge(result.solid, edgeIdx, radius);
      if (r.success) {
        result.filletedEdges.push(edgeIdx);
      } else {
        result.errors.push(`Failed to fillet edge ${edgeIdx}: ${r.error}`);
      }
    }
    result.success = result.filletedEdges.length > 0;
    return result;
  }

  /** Apply variable radius fillet to a single edge. */
  variableRadiusFillet(solid: BRepSolid, edgeIdx: number, radiusStart: number, radiusEnd: number): VariableFilletResult {
    const result: VariableFilletResult = { success: false, solid: null, error: null };
    if (!solid || edgeIdx == null) { result.error = "Invalid input"; return result; }

    result.solid = structuredClone(solid);
    const edge = result.solid.edges?.[edgeIdx];
    if (!edge) { result.error = "Edge not found"; return result; }

    const adjacentFaces = this.getAdjacentFaces(result.solid, edgeIdx);
    if (adjacentFaces.length !== 2) { result.error = "Edge must have exactly 2 adjacent faces"; return result; }

    const geom = this.generateVariableRadiusFillet(result.solid, edge, radiusStart, radiusEnd);
    if (geom) {
      this.insertFilletGeometry(result.solid, edgeIdx, geom);
      result.success = true;
    } else {
      result.error = "Failed to generate variable radius fillet";
    }
    return result;
  }

  /** Apply chamfer to edges. */
  chamferEdges(solid: BRepSolid, edgeIndices: number[], distance1: number, distance2?: number): ChamferResult {
    const d2 = distance2 ?? distance1;
    const result: ChamferResult = { success: false, solid: null, chamferedEdges: [], errors: [] };
    if (!solid || !edgeIndices) { result.errors.push("Invalid input"); return result; }

    result.solid = structuredClone(solid);

    for (const edgeIdx of edgeIndices) {
      const edge = result.solid.edges?.[edgeIdx];
      if (!edge) continue;
      const adj = this.getAdjacentFaces(result.solid, edgeIdx);
      if (adj.length !== 2) continue;

      const geom = this.generateChamfer(result.solid, edge, distance1, d2);
      if (geom) {
        this.insertChamferGeometry(result.solid, edgeIdx, geom);
        result.chamferedEdges.push(edgeIdx);
      }
    }
    result.success = result.chamferedEdges.length > 0;
    return result;
  }

  /** Preview fillet without modifying solid. */
  previewFillet(solid: BRepSolid, edgeIndices: number[], radius: number): FilletPreview {
    const preview: FilletPreview = { curves: [], valid: true };
    for (const edgeIdx of edgeIndices) {
      const edge = solid.edges?.[edgeIdx];
      if (!edge) continue;
      const adj = this.getAdjacentFaces(solid, edgeIdx);
      const maxR = this.calculateMaxRadius(solid, edge, adj);
      if (radius > maxR) {
        preview.valid = false;
        preview.curves.push({ edgeIdx, error: `Radius exceeds maximum ${maxR.toFixed(3)}` });
        continue;
      }
      const sv = solid.vertices[edge.startVertex];
      const ev = solid.vertices[edge.endVertex];
      if (sv && ev) {
        preview.curves.push({ edgeIdx, radius, start: { ...sv }, end: { ...ev } });
      }
    }
    return preview;
  }

  // ── Internal helpers ──

  getAdjacentFaces(solid: BRepSolid, edgeIdx: number): Array<{ faceIdx: number; face: BRepFace }> {
    const faces: Array<{ faceIdx: number; face: BRepFace }> = [];
    if (solid.faces) {
      solid.faces.forEach((face, faceIdx) => {
        if (face.edges && face.edges.includes(edgeIdx)) {
          faces.push({ faceIdx, face });
        }
      });
    }
    return faces;
  }

  calculateMaxRadius(solid: BRepSolid, edge: BRepEdge, adjacentFaces: Array<{ face: BRepFace }>): number {
    let minDist = Infinity;
    const sv = solid.vertices[edge.startVertex];
    const ev = solid.vertices[edge.endVertex];
    if (sv && ev) {
      const len = Math.sqrt((ev.x - sv.x) ** 2 + (ev.y - sv.y) ** 2 + (ev.z - sv.z) ** 2);
      minDist = Math.min(minDist, len / 2);
    }
    for (const { face } of adjacentFaces) {
      if (face.width) minDist = Math.min(minDist, face.width / 2);
    }
    return minDist * 0.9;
  }

  private filletSingleEdge(solid: BRepSolid, edgeIdx: number, radius: number): { success: boolean; error?: string } {
    const edge = solid.edges?.[edgeIdx];
    if (!edge) return { success: false, error: "Edge not found" };

    const adj = this.getAdjacentFaces(solid, edgeIdx);
    if (adj.length !== 2) return { success: false, error: `Edge has ${adj.length} faces, need exactly 2` };

    const maxR = this.calculateMaxRadius(solid, edge, adj);
    if (radius > maxR) return { success: false, error: `Radius ${radius} exceeds maximum ${maxR.toFixed(3)}` };

    const geom = this.generateRollingBallFillet(solid, edge, radius);
    if (!geom) return { success: false, error: "Failed to generate fillet geometry" };

    this.insertFilletGeometry(solid, edgeIdx, geom);
    return { success: true };
  }

  generateRollingBallFillet(solid: BRepSolid, edge: BRepEdge, radius: number): FilletGeom | null {
    const segments = 8;
    const vertices: Vec3[] = [];
    const faces: Array<{ vertices: number[] }> = [];

    const sv = solid.vertices[edge.startVertex];
    const ev = solid.vertices[edge.endVertex];
    if (!sv || !ev) return null;

    const edgeLen = Math.sqrt((ev.x - sv.x) ** 2 + (ev.y - sv.y) ** 2 + (ev.z - sv.z) ** 2);
    const numSteps = Math.max(3, Math.floor(edgeLen / radius) + 1);

    for (let i = 0; i <= numSteps; i++) {
      const t = i / numSteps;
      const base: Vec3 = {
        x: sv.x + t * (ev.x - sv.x),
        y: sv.y + t * (ev.y - sv.y),
        z: sv.z + t * (ev.z - sv.z),
      };
      for (let j = 0; j <= segments; j++) {
        const angle = (j / segments) * Math.PI / 2;
        vertices.push({
          x: base.x + radius * (Math.cos(angle) - 1),
          y: base.y,
          z: base.z + radius * (Math.sin(angle) - 1),
        });
      }
    }

    const stride = segments + 1;
    for (let i = 0; i < numSteps; i++) {
      for (let j = 0; j < segments; j++) {
        const v0 = i * stride + j;
        const v1 = i * stride + j + 1;
        const v2 = (i + 1) * stride + j + 1;
        const v3 = (i + 1) * stride + j;
        faces.push({ vertices: [v0, v1, v2] });
        faces.push({ vertices: [v0, v2, v3] });
      }
    }
    return { vertices, faces, radius };
  }

  private generateVariableRadiusFillet(solid: BRepSolid, edge: BRepEdge, rStart: number, rEnd: number): FilletGeom | null {
    const segments = 8;
    const vertices: Vec3[] = [];
    const faces: Array<{ vertices: number[] }> = [];

    const sv = solid.vertices[edge.startVertex];
    const ev = solid.vertices[edge.endVertex];
    if (!sv || !ev) return null;

    const edgeLen = Math.sqrt((ev.x - sv.x) ** 2 + (ev.y - sv.y) ** 2 + (ev.z - sv.z) ** 2);
    const numSteps = Math.max(5, Math.floor(edgeLen / Math.min(rStart, rEnd)) + 1);

    for (let i = 0; i <= numSteps; i++) {
      const t = i / numSteps;
      const r = rStart + t * (rEnd - rStart);
      const base: Vec3 = {
        x: sv.x + t * (ev.x - sv.x),
        y: sv.y + t * (ev.y - sv.y),
        z: sv.z + t * (ev.z - sv.z),
      };
      for (let j = 0; j <= segments; j++) {
        const angle = (j / segments) * Math.PI / 2;
        vertices.push({
          x: base.x + r * (Math.cos(angle) - 1),
          y: base.y,
          z: base.z + r * (Math.sin(angle) - 1),
        });
      }
    }

    const stride = segments + 1;
    for (let i = 0; i < numSteps; i++) {
      for (let j = 0; j < segments; j++) {
        const v0 = i * stride + j;
        const v1 = i * stride + j + 1;
        const v2 = (i + 1) * stride + j + 1;
        const v3 = (i + 1) * stride + j;
        faces.push({ vertices: [v0, v1, v2] });
        faces.push({ vertices: [v0, v2, v3] });
      }
    }
    return { vertices, faces, radius: (rStart + rEnd) / 2 };
  }

  private generateChamfer(solid: BRepSolid, edge: BRepEdge, d1: number, d2: number): ChamferGeom | null {
    const sv = solid.vertices[edge.startVertex];
    const ev = solid.vertices[edge.endVertex];
    if (!sv || !ev) return null;

    const vertices: Vec3[] = [
      { x: sv.x - d1, y: sv.y, z: sv.z },
      { x: sv.x, y: sv.y, z: sv.z - d2 },
      { x: ev.x - d1, y: ev.y, z: ev.z },
      { x: ev.x, y: ev.y, z: ev.z - d2 },
    ];
    const faces = [
      { vertices: [0, 1, 3] },
      { vertices: [0, 3, 2] },
    ];
    return { vertices, faces, distances: [d1, d2] };
  }

  private insertFilletGeometry(solid: BRepSolid, edgeIdx: number, geom: FilletGeom): void {
    const offset = solid.vertices.length;
    solid.vertices.push(...geom.vertices);
    for (const f of geom.faces) {
      solid.faces.push({
        type: "fillet",
        radius: geom.radius,
        vertices: f.vertices.map(v => v + offset),
      } as BRepFace);
    }
    if (solid.edges[edgeIdx]) {
      solid.edges[edgeIdx].filleted = true;
      solid.edges[edgeIdx].filletRadius = geom.radius;
    }
  }

  private insertChamferGeometry(solid: BRepSolid, edgeIdx: number, geom: ChamferGeom): void {
    const offset = solid.vertices.length;
    solid.vertices.push(...geom.vertices);
    for (const f of geom.faces) {
      solid.faces.push({
        type: "chamfer",
        distances: geom.distances,
        vertices: f.vertices.map(v => v + offset),
      } as BRepFace);
    }
    if (solid.edges[edgeIdx]) {
      solid.edges[edgeIdx].chamfered = true;
      solid.edges[edgeIdx].chamferDistances = geom.distances;
    }
  }
}

export const filletingEngine = new FilletingEngineImpl();
