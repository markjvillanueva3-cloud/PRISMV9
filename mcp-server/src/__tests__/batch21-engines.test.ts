/**
 * Batch 21 Engines -- Unit Tests
 * SolidEditingEngine + SurfaceReconstructionEngine
 * @milestone AUDIT-FT-B21
 */
import { describe, it, expect } from "vitest";
import { solidEditingEngine } from "../engines/SolidEditingEngine.js";
import { surfaceReconstructionEngine } from "../engines/SurfaceReconstructionEngine.js";

// ============================================================================
// SolidEditingEngine
// ============================================================================

describe("SolidEditingEngine", () => {
  const face = (): any => ({
    id: "f1", type: "planar",
    normal: { x: 0, y: 0, z: 1 },
    center: { x: 5, y: 5, z: 0 },
    vertices: [{ x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 }, { x: 10, y: 10, z: 0 }, { x: 0, y: 10, z: 0 }],
  });
  const body = (): any => ({
    id: "b1",
    vertices: [{ x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 }, { x: 5, y: 10, z: 0 }],
    faces: [face()],
  });

  describe("pressPull", () => {
    it("offsets planar face along normal", () => {
      const r = solidEditingEngine.pressPull(face(), 5);
      expect(r.success).toBe(true);
      expect(r.result.vertices[0].z).toBe(5);
      expect(r.result.center!.z).toBe(5);
    });

    it("fails for unknown face type", () => {
      const f = face();
      f.type = "cylindrical";
      expect(solidEditingEngine.pressPull(f, 5).success).toBe(false);
    });
  });

  describe("createShell", () => {
    it("processes non-removed faces", () => {
      const r = solidEditingEngine.createShell(body(), [], 2, "inside");
      expect(r.success).toBe(true);
      expect(r.facesProcessed).toBe(1);
    });
  });

  describe("createDraft", () => {
    it("applies draft angle to faces", () => {
      const f = face();
      const r = solidEditingEngine.createDraft([f], { x: 0, y: 0, z: 1 }, 5);
      expect(r.success).toBe(true);
      expect(r.draftedCount).toBe(1);
    });
  });

  describe("scaleBody", () => {
    it("uniform scale doubles coordinates", () => {
      const r = solidEditingEngine.scaleBody(body(), { x: 0, y: 0, z: 0 }, 2);
      expect(r.success).toBe(true);
      expect(r.scaledVertices[1].x).toBe(20);
    });

    it("non-uniform scale", () => {
      const r = solidEditingEngine.scaleBody(body(), { x: 0, y: 0, z: 0 }, { x: 1, y: 2, z: 3 });
      expect(r.scaledVertices[2].y).toBe(20); // 10 * 2
    });
  });

  describe("combineBodies", () => {
    it("join merges vertices", () => {
      const r = solidEditingEngine.combineBodies(body(), [body()], "join");
      expect(r.success).toBe(true);
      expect(r.resultVertexCount).toBe(6); // 3 + 3
    });

    it("cut fails closed until a real boolean kernel is wired", () => {
      const r = solidEditingEngine.combineBodies(body(), [body()], "cut");
      expect(r.success).toBe(false);
      expect(r.errors?.some(e => /not implemented/i.test(e))).toBe(true);
    });

    it("intersect fails closed until a real boolean kernel is wired", () => {
      const r = solidEditingEngine.combineBodies(body(), [body()], "intersect");
      expect(r.success).toBe(false);
      expect(r.warnings?.some(w => /real CSG kernel/i.test(w))).toBe(true);
    });
  });

  describe("splitBody", () => {
    it("produces 2^n bodies for n tools", () => {
      expect(solidEditingEngine.splitBody(body(), 3).resultCount).toBe(8);
    });
  });

  describe("moveBody", () => {
    it("translates vertices", () => {
      const r = solidEditingEngine.moveBody(body(), { type: "translate", translation: { x: 5, y: 0, z: 0 } });
      expect(r.resultVertices[0].x).toBe(5);
      expect(r.isCopy).toBe(false);
    });

    it("point to point", () => {
      const r = solidEditingEngine.moveBody(body(), {
        type: "point_to_point",
        fromPoint: { x: 0, y: 0, z: 0 },
        toPoint: { x: 10, y: 10, z: 10 },
      });
      expect(r.resultVertices[0].x).toBe(10);
      expect(r.resultVertices[0].y).toBe(10);
    });
  });

  describe("matrix operations", () => {
    it("identity preserves coordinates", () => {
      const mat = solidEditingEngine.identityMatrix();
      const verts = [{ x: 1, y: 2, z: 3 }];
      const r = solidEditingEngine.transformVertices(verts, mat);
      expect(r[0]).toEqual({ x: 1, y: 2, z: 3 });
    });

    it("translation shifts coordinates", () => {
      const mat = solidEditingEngine.translationMatrix({ x: 10, y: 20, z: 30 });
      const r = solidEditingEngine.transformVertices([{ x: 0, y: 0, z: 0 }], mat);
      expect(r[0]).toEqual({ x: 10, y: 20, z: 30 });
    });

    it("multiply identity returns same", () => {
      const id = solidEditingEngine.identityMatrix();
      const t = solidEditingEngine.translationMatrix({ x: 5, y: 0, z: 0 });
      const r = solidEditingEngine.multiplyMatrices(id, t);
      expect(r[0][3]).toBe(5);
    });
  });
});

// ============================================================================
// SurfaceReconstructionEngine
// ============================================================================

describe("SurfaceReconstructionEngine", () => {
  // Simple triangle of points
  const triPoints = [
    { x: 0, y: 0, z: 0 },
    { x: 10, y: 0, z: 0 },
    { x: 5, y: 10, z: 0 },
  ];

  describe("distance3D", () => {
    it("calculates correctly", () => {
      expect(surfaceReconstructionEngine.distance3D(
        { x: 0, y: 0, z: 0 }, { x: 3, y: 4, z: 0 },
      )).toBeCloseTo(5);
    });
  });

  describe("triangleNormal", () => {
    it("returns unit Z for XY plane triangle", () => {
      const n = surfaceReconstructionEngine.triangleNormal(triPoints[0], triPoints[1], triPoints[2]);
      expect(Math.abs(n.z)).toBeCloseTo(1);
      expect(n.x).toBeCloseTo(0);
    });
  });

  describe("triangleArea", () => {
    it("computes area of right triangle", () => {
      const area = surfaceReconstructionEngine.triangleArea(
        { x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 }, { x: 0, y: 10, z: 0 },
      );
      expect(area).toBeCloseTo(50);
    });
  });

  describe("triangleCircumradius", () => {
    it("equilateral triangle circumradius", () => {
      const s = 10;
      const pts = [
        { x: 0, y: 0, z: 0 },
        { x: s, y: 0, z: 0 },
        { x: s / 2, y: s * Math.sqrt(3) / 2, z: 0 },
      ];
      const R = surfaceReconstructionEngine.triangleCircumradius(pts[0], pts[1], pts[2]);
      expect(R).toBeCloseTo(s / Math.sqrt(3), 3);
    });
  });

  describe("triangleCircumcenter", () => {
    it("equidistant from all vertices of equilateral triangle", () => {
      const s = 10;
      const eqPts = [
        { x: 0, y: 0, z: 0 },
        { x: s, y: 0, z: 0 },
        { x: s / 2, y: s * Math.sqrt(3) / 2, z: 0 },
      ];
      const cc = surfaceReconstructionEngine.triangleCircumcenter(eqPts[0], eqPts[1], eqPts[2]);
      const d0 = surfaceReconstructionEngine.distance3D(cc, eqPts[0]);
      const d1 = surfaceReconstructionEngine.distance3D(cc, eqPts[1]);
      const d2 = surfaceReconstructionEngine.distance3D(cc, eqPts[2]);
      expect(d0).toBeCloseTo(d1, 3);
      expect(d1).toBeCloseTo(d2, 3);
    });
  });

  describe("estimateBallRadius", () => {
    it("returns positive radius", () => {
      const pts = Array.from({ length: 20 }, (_, i) => ({
        x: Math.cos(i * 0.3) * 5, y: Math.sin(i * 0.3) * 5, z: 0,
      }));
      const r = surfaceReconstructionEngine.estimateBallRadius(pts);
      expect(r).toBeGreaterThan(0);
    });
  });

  describe("ballCenter", () => {
    it("returns center above triangle", () => {
      const c = surfaceReconstructionEngine.ballCenter(triPoints[0], triPoints[1], triPoints[2], 50);
      expect(c).not.toBeNull();
      expect(c!.z).toBeGreaterThan(0); // above XY plane
    });

    it("returns null when circumradius > ball radius", () => {
      const c = surfaceReconstructionEngine.ballCenter(triPoints[0], triPoints[1], triPoints[2], 0.1);
      expect(c).toBeNull();
    });
  });

  describe("findSeedTriangle", () => {
    it("finds seed from close points", () => {
      const pts = [
        { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 },
        { x: 0.5, y: 1, z: 0 }, { x: 10, y: 10, z: 10 },
      ];
      const seed = surfaceReconstructionEngine.findSeedTriangle(pts, 5);
      expect(seed).not.toBeNull();
      expect(new Set([seed!.i, seed!.j, seed!.k]).size).toBe(3);
    });
  });

  describe("ballPivoting", () => {
    it("returns empty for < 3 points", () => {
      const r = surfaceReconstructionEngine.ballPivoting([{ x: 0, y: 0, z: 0 }]);
      expect(r.triangleCount).toBe(0);
    });

    it("reconstructs simple point cloud", () => {
      const pts = [
        { x: 0, y: 0, z: 0 }, { x: 5, y: 0, z: 0 },
        { x: 2.5, y: 5, z: 0 }, { x: 5, y: 5, z: 0 },
        { x: 0, y: 5, z: 0 },
      ];
      const r = surfaceReconstructionEngine.ballPivoting(pts, { radius: 10 });
      expect(r.vertexCount).toBe(5);
      expect(r.triangleCount).toBeGreaterThanOrEqual(1);
    });
  });
});
