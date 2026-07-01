/**
 * Batch 22 Engines -- Unit Tests
 * TopologyEngine + AcoSequencerEngine
 * @milestone AUDIT-FT-B22
 */
import { describe, it, expect } from "vitest";
import { topologyEngine } from "../engines/TopologyEngine.js";
import { acoSequencerEngine } from "../engines/AcoSequencerEngine.js";

// ============================================================================
// TopologyEngine
// ============================================================================

describe("TopologyEngine", () => {
  describe("createSimplex", () => {
    it("sorts vertices and sets dimension", () => {
      const s = topologyEngine.createSimplex([3, 1, 2], 0.5);
      expect(s.vertices).toEqual([1, 2, 3]);
      expect(s.dimension).toBe(2);
      expect(s.key).toBe("1,2,3");
      expect(s.filtration).toBe(0.5);
    });
  });

  describe("createSimplicialComplex", () => {
    it("builds from triangle mesh", () => {
      const mesh = {
        vertices: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0.5, y: 1 }],
        faces: [[0, 1, 2]],
      };
      const c = topologyEngine.createSimplicialComplex(mesh);
      expect(c.vertices.length).toBe(3);
      expect(c.edges.length).toBe(3);
      expect(c.triangles.length).toBe(1);
    });
  });

  describe("createRipsComplex", () => {
    it("builds from equilateral triangle points", () => {
      const pts = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0.5, y: 0.866 }];
      const c = topologyEngine.createRipsComplex(pts, 2);
      expect(c.vertices.length).toBe(3);
      expect(c.edges.length).toBe(3);
      expect(c.triangles.length).toBe(1);
    });

    it("no edges beyond epsilon", () => {
      const pts = [{ x: 0, y: 0 }, { x: 100, y: 0 }];
      const c = topologyEngine.createRipsComplex(pts, 1);
      expect(c.edges.length).toBe(0);
    });
  });

  describe("computeHomology", () => {
    it("single triangle: β₀=1, β₁=0", () => {
      const mesh = {
        vertices: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0.5, y: 1 }],
        faces: [[0, 1, 2]],
      };
      const h = topologyEngine.computeHomology(topologyEngine.createSimplicialComplex(mesh));
      expect(h.beta0).toBe(1);
      expect(h.beta1).toBe(0);
    });

    it("filled square: β₀=1, β₁=0", () => {
      const mesh = {
        vertices: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }],
        faces: [[0, 1, 2], [0, 2, 3]],
      };
      const h = topologyEngine.computeHomology(topologyEngine.createSimplicialComplex(mesh));
      expect(h.beta0).toBe(1);
      expect(h.beta1).toBe(0);
    });

    it("two separate triangles: β₀=2", () => {
      const mesh = {
        vertices: [
          { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0.5, y: 1 },
          { x: 10, y: 0 }, { x: 11, y: 0 }, { x: 10.5, y: 1 },
        ],
        faces: [[0, 1, 2], [3, 4, 5]],
      };
      const h = topologyEngine.computeHomology(topologyEngine.createSimplicialComplex(mesh));
      expect(h.beta0).toBe(2);
    });

    it("euler characteristic consistent", () => {
      const mesh = {
        vertices: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }],
        faces: [[0, 1, 2], [0, 2, 3]],
      };
      const h = topologyEngine.computeHomology(topologyEngine.createSimplicialComplex(mesh));
      expect(h.eulerCharacteristic).toBe(h.beta0 - h.beta1 + h.beta2);
    });
  });

  describe("getBettiNumbers", () => {
    it("returns [1,0,0] for simple triangle", () => {
      const b = topologyEngine.getBettiNumbers({
        vertices: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0.5, y: 1 }],
        faces: [[0, 1, 2]],
      });
      expect(b[0]).toBe(1);
      expect(b[1]).toBe(0);
    });
  });

  describe("computePersistence", () => {
    it("computes persistence for collinear points", () => {
      const pts = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }];
      const r = topologyEngine.computePersistence(pts, { maxEpsilon: 2 });
      expect(r.diagram).toBeDefined();
      expect(r.summary).toBeDefined();
      expect(r.pointCount).toBe(4);
    });
  });

  describe("validateFeatures", () => {
    it("validates matching topology", () => {
      const mesh = {
        vertices: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }],
        faces: [[0, 1, 2], [0, 2, 3]],
      };
      const r = topologyEngine.validateFeatures(mesh, { components: 1, holes: 0 });
      expect(r.valid).toBe(true);
      expect(r.discrepancies.length).toBe(0);
    });

    it("detects mismatch", () => {
      const mesh = {
        vertices: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0.5, y: 1 }],
        faces: [[0, 1, 2]],
      };
      const r = topologyEngine.validateFeatures(mesh, { components: 2 });
      expect(r.valid).toBe(false);
      expect(r.discrepancies.length).toBe(1);
    });
  });
});

// ============================================================================
// AcoSequencerEngine
// ============================================================================

describe("AcoSequencerEngine", () => {
  describe("initializePheromones", () => {
    it("creates NxN matrix with zero diagonal", () => {
      const p = acoSequencerEngine.initializePheromones(3);
      expect(p.length).toBe(3);
      expect(p[0][0]).toBe(0);
      expect(p[0][1]).toBe(1);
    });
  });

  describe("calculateDistanceMatrix", () => {
    it("correct Euclidean distances", () => {
      const f = [{ x: 0, y: 0 }, { x: 3, y: 4 }];
      const d = acoSequencerEngine.calculateDistanceMatrix(f);
      expect(d[0][1]).toBeCloseTo(5);
      expect(d[0][0]).toBe(Infinity);
    });
  });

  describe("calculateToolChangeMatrix", () => {
    it("penalizes different tools", () => {
      const f = [{ toolId: "T1" }, { toolId: "T2" }, { toolId: "T1" }];
      const m = acoSequencerEngine.calculateToolChangeMatrix(f, 30);
      expect(m[0][1]).toBe(30);
      expect(m[0][2]).toBe(0);
    });
  });

  describe("optimizeSequence", () => {
    it("optimizes 5-feature square+center", () => {
      const features = [
        { x: 0, y: 0 }, { x: 100, y: 0 },
        { x: 100, y: 100 }, { x: 0, y: 100 }, { x: 50, y: 50 },
      ];
      const r = acoSequencerEngine.optimizeSequence(features, { iterations: 20 });
      expect(r.success).toBe(true);
      expect(r.sequence.length).toBe(5);
      expect(new Set(r.sequence).size).toBe(5);
    });

    it("handles single feature", () => {
      const r = acoSequencerEngine.optimizeSequence([{ x: 0, y: 0 }]);
      expect(r.sequence).toEqual([0]);
    });
  });

  describe("optimizeHoleSequence", () => {
    it("optimizes line of holes", () => {
      const holes = Array.from({ length: 8 }, (_, i) => ({ x: i * 10, y: 0 }));
      const r = acoSequencerEngine.optimizeHoleSequence(holes, { iterations: 30 });
      expect(r.success).toBe(true);
      expect(r.cost).toBeLessThan(100);
    });
  });

  describe("optimizeWithToolChanges", () => {
    it("minimizes tool changes", () => {
      const features = [
        { x: 0, y: 0, toolId: "T1" },
        { x: 10, y: 0, toolId: "T2" },
        { x: 20, y: 0, toolId: "T1" },
        { x: 30, y: 0, toolId: "T2" },
      ];
      const r = acoSequencerEngine.optimizeWithToolChanges(features, { iterations: 30 });
      expect(r.success).toBe(true);
      expect(r.toolChanges).toBeDefined();
      expect(r.toolChanges!).toBeLessThanOrEqual(3);
    });
  });

  describe("optimizeByToolGroups", () => {
    it("groups by tool then optimizes", () => {
      const features = [
        { x: 0, y: 0, toolId: "T1" },
        { x: 10, y: 0, toolId: "T2" },
        { x: 5, y: 5, toolId: "T1" },
      ];
      const r = acoSequencerEngine.optimizeByToolGroups(features, { iterations: 10 });
      expect(r.success).toBe(true);
      expect(r.sequence.length).toBe(3);
    });
  });

  describe("estimateTimeSavings", () => {
    it("calculates savings", () => {
      const r = acoSequencerEngine.estimateTimeSavings(500, 300, 10000);
      expect(r.distanceSaved).toBe(200);
      expect(r.timeSavedSeconds).toBeCloseTo(1.2);
      expect(r.percentImprovement).toBe("40.00%");
    });
  });
});
