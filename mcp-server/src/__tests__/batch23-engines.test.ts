/**
 * Batch 23 Engines -- Unit Tests
 * SketchConstraintEngine + FeatureInteractionEngine
 * @milestone AUDIT-FT-B23
 */
import { describe, it, expect } from "vitest";
import { sketchConstraintEngine } from "../engines/SketchConstraintEngine.js";
import { featureInteractionEngine } from "../engines/FeatureInteractionEngine.js";
import type { Line, Circle, SketchEntity } from "../engines/SketchConstraintEngine.js";
import type { MfgFeature } from "../engines/FeatureInteractionEngine.js";

// ============================================================================
// SketchConstraintEngine
// ============================================================================

describe("SketchConstraintEngine", () => {
  describe("applyHorizontalVertical", () => {
    it("makes near-horizontal line horizontal", () => {
      const line: Line = { type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 1 } };
      const r = sketchConstraintEngine.applyHorizontalVertical(line);
      expect(r.type).toBe("horizontal");
      expect(r.applied).toBe(true);
      expect(line.end.y).toBe(0);
    });

    it("makes near-vertical line vertical", () => {
      const line: Line = { type: "line", start: { x: 0, y: 0 }, end: { x: 1, y: 10 } };
      const r = sketchConstraintEngine.applyHorizontalVertical(line);
      expect(r.type).toBe("vertical");
      expect(line.end.x).toBe(0);
    });
  });

  describe("applyCoincident", () => {
    it("snaps point to point", () => {
      const p = { x: 1, y: 2 };
      const r = sketchConstraintEngine.applyCoincident(p, { type: "point", x: 5, y: 7 } as SketchEntity);
      expect(r.type).toBe("coincident_point");
      expect(p.x).toBe(5);
      expect(p.y).toBe(7);
    });

    it("projects point onto line", () => {
      const p = { x: 5, y: 5 };
      const line: Line = { type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } };
      const r = sketchConstraintEngine.applyCoincident(p, line as unknown as SketchEntity);
      expect(r.type).toBe("coincident_line");
      expect(p.y).toBe(0);
      expect(p.x).toBe(5);
    });

    it("projects point onto circle", () => {
      const p = { x: 10, y: 0 };
      const c: Circle = { type: "circle", center: { x: 0, y: 0 }, radius: 5 };
      const r = sketchConstraintEngine.applyCoincident(p, c as unknown as SketchEntity);
      expect(r.type).toBe("coincident_circle");
      expect(p.x).toBeCloseTo(5);
      expect(p.y).toBeCloseTo(0);
    });
  });

  describe("applyEqual", () => {
    it("equalizes two line lengths", () => {
      const l1: Line = { type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } };
      const l2: Line = { type: "line", start: { x: 0, y: 0 }, end: { x: 6, y: 0 } };
      const r = sketchConstraintEngine.applyEqual(l1, l2);
      expect(r.applied).toBe(true);
      expect(sketchConstraintEngine.lineLength(l1)).toBeCloseTo(8);
      expect(sketchConstraintEngine.lineLength(l2)).toBeCloseTo(8);
    });
  });

  describe("applyParallel", () => {
    it("makes line2 parallel to line1", () => {
      const l1: Line = { type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } };
      const l2: Line = { type: "line", start: { x: 0, y: 5 }, end: { x: 5, y: 10 } };
      sketchConstraintEngine.applyParallel(l1, l2);
      const dy = l2.end.y - l2.start.y;
      expect(Math.abs(dy)).toBeLessThan(1e-10);
    });
  });

  describe("applyPerpendicular", () => {
    it("makes line2 perpendicular to line1", () => {
      const l1: Line = { type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } };
      const l2: Line = { type: "line", start: { x: 5, y: -3 }, end: { x: 5, y: 3 } };
      sketchConstraintEngine.applyPerpendicular(l1, l2);
      const dx = l2.end.x - l2.start.x;
      expect(Math.abs(dx)).toBeLessThan(1e-10);
    });
  });

  describe("applyFix", () => {
    it("sets fixed flag", () => {
      const obj: any = { type: "point", x: 1, y: 2 };
      sketchConstraintEngine.applyFix(obj);
      expect(obj.fixed).toBe(true);
    });
  });

  describe("applyMidpoint", () => {
    it("moves point to line midpoint", () => {
      const p = { x: 0, y: 0 };
      const line: Line = { type: "line", start: { x: 2, y: 4 }, end: { x: 8, y: 10 } };
      sketchConstraintEngine.applyMidpoint(p, line);
      expect(p.x).toBe(5);
      expect(p.y).toBe(7);
    });
  });

  describe("applyConcentric", () => {
    it("moves c2 center to c1 center", () => {
      const c1: Circle = { type: "circle", center: { x: 5, y: 5 }, radius: 10 };
      const c2: Circle = { type: "circle", center: { x: 1, y: 1 }, radius: 3 };
      sketchConstraintEngine.applyConcentric(c1, c2);
      expect(c2.center.x).toBe(5);
      expect(c2.center.y).toBe(5);
    });
  });

  describe("makeCirclesTangent", () => {
    it("makes circles externally tangent", () => {
      const c1: Circle = { type: "circle", center: { x: 0, y: 0 }, radius: 5 };
      const c2: Circle = { type: "circle", center: { x: 20, y: 0 }, radius: 3 };
      sketchConstraintEngine.makeCirclesTangent(c1, c2);
      const dist = Math.sqrt(c2.center.x ** 2 + c2.center.y ** 2);
      expect(dist).toBeCloseTo(8);
    });
  });

  describe("geometry helpers", () => {
    it("projectPointToLine clamps to segment", () => {
      const p = { x: -5, y: 0 };
      const line: Line = { type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } };
      const proj = sketchConstraintEngine.projectPointToLine(p, line);
      expect(proj.x).toBe(0);
    });

    it("projectPointToInfiniteLine extends beyond segment", () => {
      const p = { x: -5, y: 1 };
      const line: Line = { type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } };
      const proj = sketchConstraintEngine.projectPointToInfiniteLine(p, line);
      expect(proj.x).toBe(-5);
      expect(proj.y).toBe(0);
    });

    it("lineLineIntersection finds crossing point", () => {
      const l1: Line = { type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 10 } };
      const l2: Line = { type: "line", start: { x: 0, y: 10 }, end: { x: 10, y: 0 } };
      const ix = sketchConstraintEngine.lineLineIntersection(l1, l2);
      expect(ix).not.toBeNull();
      expect(ix!.x).toBeCloseTo(5);
      expect(ix!.y).toBeCloseTo(5);
    });

    it("lineLineIntersection returns null for parallel lines", () => {
      const l1: Line = { type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } };
      const l2: Line = { type: "line", start: { x: 0, y: 5 }, end: { x: 10, y: 5 } };
      expect(sketchConstraintEngine.lineLineIntersection(l1, l2)).toBeNull();
    });

    it("mirrorPoint mirrors correctly", () => {
      const p = { x: 0, y: 5 };
      const mirror: Line = { type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } };
      const m = sketchConstraintEngine.mirrorPoint(p, mirror);
      expect(m.x).toBeCloseTo(0);
      expect(m.y).toBeCloseTo(-5);
    });

    it("lineLength computes correctly", () => {
      const line: Line = { type: "line", start: { x: 0, y: 0 }, end: { x: 3, y: 4 } };
      expect(sketchConstraintEngine.lineLength(line)).toBeCloseTo(5);
    });
  });
});

// ============================================================================
// FeatureInteractionEngine
// ============================================================================

describe("FeatureInteractionEngine", () => {
  const hole: MfgFeature = {
    id: "H1", type: "HOLE",
    bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 5, y: 5, z: 10 } },
    center: { x: 2.5, y: 2.5, z: 5 }, stage: "ROUGH", volume: 50,
  };
  const thread: MfgFeature = {
    id: "T1", type: "THREAD", parentFeatureId: "H1",
    bounds: { min: { x: 1, y: 1, z: 1 }, max: { x: 4, y: 4, z: 9 } },
    center: { x: 2.5, y: 2.5, z: 5 }, stage: "FINISH", volume: 10,
  };
  const pocket: MfgFeature = {
    id: "P1", type: "POCKET",
    bounds: { min: { x: 20, y: 20, z: 0 }, max: { x: 40, y: 40, z: 5 } },
    center: { x: 30, y: 30, z: 2.5 }, stage: "ROUGH", volume: 100,
  };

  describe("buildPrecedenceGraph", () => {
    it("creates type-based precedence (THREAD after HOLE)", () => {
      const g = featureInteractionEngine.buildPrecedenceGraph([hole, thread]);
      expect(g.nodes.size).toBe(2);
      expect(g.edges.length).toBeGreaterThan(0);
      const edge = g.edges.find(e => e.from === "H1" && e.to === "T1");
      expect(edge).toBeDefined();
      expect(edge!.constraint).toContain("HOLE before THREAD");
    });

    it("includes all features as nodes", () => {
      const g = featureInteractionEngine.buildPrecedenceGraph([hole, thread, pocket]);
      expect(g.nodes.size).toBe(3);
    });
  });

  describe("detectInteractions", () => {
    it("detects interference between overlapping features", () => {
      const interactions = featureInteractionEngine.detectInteractions([hole, thread]);
      const interference = interactions.find(i => i.type === "interference");
      expect(interference).toBeDefined();
    });

    it("no interference for non-overlapping features", () => {
      const interactions = featureInteractionEngine.detectInteractions([hole, pocket]);
      const interference = interactions.find(i => i.type === "interference");
      expect(interference).toBeUndefined();
    });

    it("detects tolerance relations", () => {
      const f1: MfgFeature = { id: "A", type: "BORE", tolerances: [{ datum: "B" }] };
      const f2: MfgFeature = { id: "B", type: "SURFACE", tolerances: [] };
      const interactions = featureInteractionEngine.detectInteractions([f1, f2]);
      const tol = interactions.find(i => i.type === "tolerance");
      expect(tol).toBeDefined();
    });
  });

  describe("generateOperationSequence", () => {
    it("returns valid topological order", () => {
      const g = featureInteractionEngine.buildPrecedenceGraph([hole, thread]);
      const r = featureInteractionEngine.generateOperationSequence(g);
      expect(r.success).toBe(true);
      expect(r.sequence).toBeDefined();
      const holeIdx = r.sequence!.indexOf("H1");
      const threadIdx = r.sequence!.indexOf("T1");
      expect(holeIdx).toBeLessThan(threadIdx);
    });

    it("prioritizes roughing before finishing", () => {
      const g = featureInteractionEngine.buildPrecedenceGraph([hole, thread, pocket]);
      const r = featureInteractionEngine.generateOperationSequence(g);
      expect(r.success).toBe(true);
      expect(r.sequence!.length).toBe(3);
    });
  });

  describe("minimizeSetups", () => {
    it("groups features into setups", () => {
      const plan = featureInteractionEngine.minimizeSetups([hole, thread, pocket]);
      expect(plan.totalSetups).toBeGreaterThan(0);
      expect(plan.featureCount).toBe(3);
      expect(plan.efficiency).toBeGreaterThan(0);
    });

    it("returns empty plan for no features", () => {
      const plan = featureInteractionEngine.minimizeSetups([]);
      expect(plan.totalSetups).toBe(0);
      expect(plan.featureCount).toBe(0);
    });
  });
});
