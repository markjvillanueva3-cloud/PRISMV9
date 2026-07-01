/**
 * Batch 16 Engines -- Unit Tests
 * FilletingEngine + MeshDecimationEngine
 * @milestone AUDIT-FT-B16
 */
import { describe, it, expect } from "vitest";
import { filletingEngine } from "../engines/FilletingEngine.js";
import { meshDecimationEngine } from "../engines/MeshDecimationEngine.js";
import type { BRepSolid } from "../engines/FilletingEngine.js";

// ============================================================================
// FilletingEngine
// ============================================================================

/** Simple cube-like solid for testing */
function makeSolid(): BRepSolid {
  return {
    vertices: [
      { x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 },
      { x: 10, y: 10, z: 0 }, { x: 0, y: 10, z: 0 },
    ],
    edges: [
      { startVertex: 0, endVertex: 1 },
      { startVertex: 1, endVertex: 2 },
      { startVertex: 2, endVertex: 3 },
      { startVertex: 3, endVertex: 0 },
    ],
    faces: [
      { type: "planar", edges: [0, 1], width: 10 },
      { type: "planar", edges: [1, 2], width: 10 },
      { type: "planar", edges: [2, 3], width: 10 },
      { type: "planar", edges: [3, 0], width: 10 },
    ],
  };
}

describe("FilletingEngine", () => {
  describe("filletEdges", () => {
    it("fillets a valid edge", () => {
      const r = filletingEngine.filletEdges(makeSolid(), [0], 1);
      expect(r.success).toBe(true);
      expect(r.filletedEdges).toContain(0);
      expect(r.solid!.edges[0].filleted).toBe(true);
      expect(r.solid!.edges[0].filletRadius).toBe(1);
    });

    it("rejects zero radius", () => {
      const r = filletingEngine.filletEdges(makeSolid(), [0], 0);
      expect(r.success).toBe(false);
      expect(r.errors.length).toBeGreaterThan(0);
    });

    it("rejects radius exceeding max", () => {
      const r = filletingEngine.filletEdges(makeSolid(), [0], 100);
      expect(r.success).toBe(false);
      expect(r.errors[0]).toContain("exceeds maximum");
    });

    it("adds fillet faces to solid", () => {
      const solid = makeSolid();
      const origFaces = solid.faces.length;
      const r = filletingEngine.filletEdges(solid, [0], 1);
      expect(r.solid!.faces.length).toBeGreaterThan(origFaces);
      const filletFaces = r.solid!.faces.filter(f => f.type === "fillet");
      expect(filletFaces.length).toBeGreaterThan(0);
    });

    it("fillets multiple edges", () => {
      const r = filletingEngine.filletEdges(makeSolid(), [0, 1], 1);
      expect(r.filletedEdges.length).toBe(2);
    });
  });

  describe("variableRadiusFillet", () => {
    it("creates variable radius fillet", () => {
      const r = filletingEngine.variableRadiusFillet(makeSolid(), 0, 0.5, 1.5);
      expect(r.success).toBe(true);
      expect(r.solid!.edges[0].filleted).toBe(true);
    });

    it("rejects missing edge", () => {
      const r = filletingEngine.variableRadiusFillet(makeSolid(), 99, 1, 2);
      expect(r.success).toBe(false);
      expect(r.error).toContain("Edge not found");
    });
  });

  describe("chamferEdges", () => {
    it("applies symmetric chamfer", () => {
      const r = filletingEngine.chamferEdges(makeSolid(), [0], 1);
      expect(r.success).toBe(true);
      expect(r.chamferedEdges).toContain(0);
      expect(r.solid!.edges[0].chamfered).toBe(true);
    });

    it("applies asymmetric chamfer", () => {
      const r = filletingEngine.chamferEdges(makeSolid(), [0], 1, 2);
      expect(r.success).toBe(true);
      expect(r.solid!.edges[0].chamferDistances).toEqual([1, 2]);
    });
  });

  describe("previewFillet", () => {
    it("valid preview for small radius", () => {
      const p = filletingEngine.previewFillet(makeSolid(), [0], 1);
      expect(p.valid).toBe(true);
      expect(p.curves.length).toBe(1);
      expect(p.curves[0].radius).toBe(1);
    });

    it("invalid preview for large radius", () => {
      const p = filletingEngine.previewFillet(makeSolid(), [0], 100);
      expect(p.valid).toBe(false);
      expect(p.curves[0].error).toContain("exceeds maximum");
    });
  });

  describe("calculateMaxRadius", () => {
    it("respects edge length and face width", () => {
      const s = makeSolid();
      const adj = filletingEngine.getAdjacentFaces(s, 0);
      const maxR = filletingEngine.calculateMaxRadius(s, s.edges[0], adj);
      expect(maxR).toBeGreaterThan(0);
      expect(maxR).toBeLessThan(10); // edge length is 10, max = 5 * 0.9 = 4.5
    });
  });
});

// ============================================================================
// MeshDecimationEngine
// ============================================================================

describe("MeshDecimationEngine", () => {
  // A simple mesh: 2 triangles forming a quad in XY plane
  const quadMesh = {
    vertices: [0, 0, 0, 10, 0, 0, 10, 10, 0, 0, 10, 0],
    indices: [0, 1, 2, 0, 2, 3],
  };

  // A mesh with 4 triangles (diamond shape)
  const diamondMesh = {
    vertices: [
      0, 0, 0,   10, 0, 0,   5, 10, 0,   5, -10, 0,
      5, 0, 5,
    ],
    indices: [
      0, 1, 4,
      1, 2, 4,
      2, 0, 4,
      0, 3, 1,
    ],
  };

  describe("decimate", () => {
    it("returns original when already below target", () => {
      const r = meshDecimationEngine.decimate(quadMesh, 10);
      expect(r.resultTriangles).toBe(2);
      expect(r.reductionRatio).toBe(0);
    });

    it("reduces triangle count", () => {
      const r = meshDecimationEngine.decimate(diamondMesh, 2);
      expect(r.resultTriangles).toBeLessThanOrEqual(2);
      expect(r.reductionRatio).toBeGreaterThan(0);
    });

    it("output has valid vertex/index arrays", () => {
      const r = meshDecimationEngine.decimate(diamondMesh, 2);
      expect(r.vertices).toBeInstanceOf(Float32Array);
      expect(r.indices).toBeInstanceOf(Uint32Array);
      expect(r.vertices.length % 3).toBe(0);
      expect(r.indices.length % 3).toBe(0);
    });
  });

  describe("computePlane", () => {
    it("computes correct plane for XY triangle", () => {
      const p = meshDecimationEngine.computePlane(
        { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 },
      );
      expect(Math.abs(p.c)).toBeCloseTo(1, 4);
      expect(p.d).toBeCloseTo(0, 4);
    });
  });

  describe("quadric operations", () => {
    it("zeroQuadric has 10 zeros", () => {
      const q = meshDecimationEngine.zeroQuadric();
      expect(q.a.length).toBe(10);
      for (let i = 0; i < 10; i++) expect(q.a[i]).toBe(0);
    });

    it("evaluateQuadric returns 0 for point on plane", () => {
      const plane = { a: 0, b: 0, c: 1, d: 0 }; // z=0 plane
      const Q = meshDecimationEngine.planeQuadric(plane);
      const err = meshDecimationEngine.evaluateQuadric(Q, { x: 5, y: 3, z: 0 });
      expect(err).toBeCloseTo(0, 8);
    });

    it("evaluateQuadric returns positive for point off plane", () => {
      const plane = { a: 0, b: 0, c: 1, d: 0 };
      const Q = meshDecimationEngine.planeQuadric(plane);
      const err = meshDecimationEngine.evaluateQuadric(Q, { x: 0, y: 0, z: 5 });
      expect(err).toBeGreaterThan(0);
    });
  });

  describe("findOptimalPosition", () => {
    it("returns midpoint for zero quadric", () => {
      const Q = meshDecimationEngine.zeroQuadric();
      const pos = meshDecimationEngine.findOptimalPosition(Q, { x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 });
      expect(pos.x).toBeCloseTo(5, 4);
      expect(pos.y).toBeCloseTo(0, 4);
    });
  });

  describe("det3x3", () => {
    it("identity matrix has determinant 1", () => {
      expect(meshDecimationEngine.det3x3([[1, 0, 0], [0, 1, 0], [0, 0, 1]])).toBeCloseTo(1);
    });

    it("singular matrix has determinant 0", () => {
      expect(meshDecimationEngine.det3x3([[1, 0, 0], [0, 0, 0], [0, 0, 1]])).toBeCloseTo(0);
    });
  });
});
