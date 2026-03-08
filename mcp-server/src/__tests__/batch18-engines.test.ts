/**
 * Batch 18 Engines -- Unit Tests
 * AdaptiveTessellationEngine + AdaptiveClearingEngine
 * @milestone AUDIT-FT-B18
 */
import { describe, it, expect } from "vitest";
import { adaptiveTessellationEngine } from "../engines/AdaptiveTessellationEngine.js";
import { adaptiveClearingEngine } from "../engines/AdaptiveClearingEngine.js";

// ============================================================================
// AdaptiveTessellationEngine
// ============================================================================

describe("AdaptiveTessellationEngine", () => {
  describe("presets", () => {
    it("has 5 quality presets", () => {
      const keys = Object.keys(adaptiveTessellationEngine.presets);
      expect(keys).toContain("draft");
      expect(keys).toContain("high");
      expect(keys).toContain("step_equivalent");
      expect(keys.length).toBe(5);
    });

    it("draft has larger tolerance than ultra", () => {
      expect(adaptiveTessellationEngine.presets.draft.chordTolerance)
        .toBeGreaterThan(adaptiveTessellationEngine.presets.ultra.chordTolerance);
    });
  });

  describe("calculateSegments", () => {
    it("returns minSegments for zero radius", () => {
      expect(adaptiveTessellationEngine.calculateSegments(0, 10)).toBe(8);
    });

    it("more segments for tighter tolerance", () => {
      const loose = adaptiveTessellationEngine.calculateSegments(5, 10, { chordTolerance: 0.1 });
      const tight = adaptiveTessellationEngine.calculateSegments(5, 10, { chordTolerance: 0.001 });
      expect(tight).toBeGreaterThan(loose);
    });

    it("respects maxSegments", () => {
      const s = adaptiveTessellationEngine.calculateSegments(100, 1000, { maxSegments: 50, chordTolerance: 0.0001 });
      expect(s).toBeLessThanOrEqual(50);
    });
  });

  describe("subdivide", () => {
    // Simple triangle mesh
    const triMesh = {
      vertices: new Float32Array([0, 0, 0, 10, 0, 0, 5, 10, 0]),
      normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
      indices: new Uint32Array([0, 1, 2]),
    };

    it("produces 4x triangles", () => {
      const r = adaptiveTessellationEngine.subdivide(triMesh);
      expect(r.statistics.triangleCount).toBe(4);
    });

    it("produces 6 vertices from 1 triangle", () => {
      const r = adaptiveTessellationEngine.subdivide(triMesh);
      expect(r.statistics.vertexCount).toBe(6);
    });

    it("normals remain unit length", () => {
      const r = adaptiveTessellationEngine.subdivide(triMesh);
      for (let i = 0; i < r.normals.length; i += 3) {
        const len = Math.sqrt(r.normals[i] ** 2 + r.normals[i + 1] ** 2 + r.normals[i + 2] ** 2);
        expect(len).toBeCloseTo(1, 4);
      }
    });
  });

  describe("estimateTargetTriangles", () => {
    it("more triangles for tighter tolerance", () => {
      const mesh = { vertices: [], normals: [], indices: [], boundingBox: { dx: 100, dy: 100, dz: 50 } };
      const low = adaptiveTessellationEngine.estimateTargetTriangles(mesh as unknown as Parameters<typeof adaptiveTessellationEngine.estimateTargetTriangles>[0], adaptiveTessellationEngine.presets.draft);
      const high = adaptiveTessellationEngine.estimateTargetTriangles(mesh as unknown as Parameters<typeof adaptiveTessellationEngine.estimateTargetTriangles>[0], adaptiveTessellationEngine.presets.ultra);
      expect(high).toBeGreaterThan(low);
    });
  });
});

// ============================================================================
// AdaptiveClearingEngine
// ============================================================================

describe("AdaptiveClearingEngine", () => {
  // Square stock boundary
  const square = [
    { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 },
  ];

  describe("calculateEngagement", () => {
    it("returns zero for zero feed direction", () => {
      const r = adaptiveClearingEngine.calculateEngagement({ x: 50, y: 50 }, { x: 0, y: 0 }, square, 5);
      expect(r.angle).toBe(0);
    });

    it("calculates engagement for tool at stock edge", () => {
      // Tool at boundary edge — partial engagement
      const r = adaptiveClearingEngine.calculateEngagement(
        { x: 3, y: 50 }, { x: 1, y: 0 }, square, 5,
      );
      // Tool partially outside — should detect entry/exit
      expect(r.percentEngagement).toBeGreaterThanOrEqual(0);
    });
  });

  describe("chipThickness", () => {
    it("zero for zero engagement", () => {
      expect(adaptiveClearingEngine.chipThickness(0.1, 0)).toBeCloseTo(0, 8);
    });

    it("equals fz at 180 deg engagement (full slot)", () => {
      expect(adaptiveClearingEngine.chipThickness(0.1, Math.PI)).toBeCloseTo(0.1, 8);
    });
  });

  describe("generateTrochoidal", () => {
    const line = [{ x: 0, y: 0, z: 0 }, { x: 100, y: 0, z: 0 }];

    it("generates points along centerline", () => {
      const pts = adaptiveClearingEngine.generateTrochoidal(line, {
        trochoidRadius: 3, stepForward: 5, toolRadius: 5,
      });
      expect(pts.length).toBeGreaterThan(0);
      expect(pts[0].type).toBe("trochoidal");
    });

    it("returns empty for single point", () => {
      const pts = adaptiveClearingEngine.generateTrochoidal([{ x: 0, y: 0, z: 0 }], {
        trochoidRadius: 3, stepForward: 5, toolRadius: 5,
      });
      expect(pts.length).toBe(0);
    });
  });

  describe("optimizeTrochoidal", () => {
    it("returns valid parameters", () => {
      const p = adaptiveClearingEngine.optimizeTrochoidal(20, 10);
      expect(p.trochoidRadius).toBeGreaterThan(0);
      expect(p.stepForward).toBeGreaterThan(0);
      expect(p.estimatedAe).toBeGreaterThan(0);
    });
  });

  describe("calculateFeedrate", () => {
    it("no reduction below target engagement", () => {
      expect(adaptiveClearingEngine.calculateFeedrate(1000, 0.5, 1.0)).toBe(1000);
    });

    it("reduces feedrate above target", () => {
      const f = adaptiveClearingEngine.calculateFeedrate(1000, 2.0, 1.0);
      expect(f).toBeLessThan(1000);
      expect(f).toBeGreaterThan(0);
    });
  });

  describe("selectSlotStrategy", () => {
    it("plunge for narrow slot", () => {
      expect(adaptiveClearingEngine.selectSlotStrategy(10, 10)).toBe("plunge");
    });

    it("trochoidal for medium slot", () => {
      expect(adaptiveClearingEngine.selectSlotStrategy(13, 10)).toBe("trochoidal");
    });

    it("adaptive for wide slot", () => {
      expect(adaptiveClearingEngine.selectSlotStrategy(20, 10)).toBe("adaptive");
    });
  });
});
