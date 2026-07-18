import { describe, it, expect } from "vitest";
import { sketchEngine } from "../engines/SketchEngine.js";

describe("SketchEngine", () => {
  // ── Sketch Creation ──

  describe("createSketch", () => {
    it("creates a sketch with defaults", () => {
      const s = sketchEngine.createSketch();
      expect(s.id).toBeTruthy();
      expect(s.plane).toBe("XY");
      expect(s.entities).toHaveLength(0);
      expect(s.constraints).toHaveLength(0);
    });

    it("creates a sketch on custom plane", () => {
      const s = sketchEngine.createSketch("Side Profile", "XZ");
      expect(s.name).toBe("Side Profile");
      expect(s.plane).toBe("XZ");
    });
  });

  // ── Entity Creation ──

  describe("addLine", () => {
    it("adds a line entity", () => {
      const s = sketchEngine.createSketch();
      const line = sketchEngine.addLine(s, { x: 0, y: 0 }, { x: 10, y: 0 });
      expect(line.type).toBe("line");
      expect(s.entities).toHaveLength(1);
      expect(line.params.x1).toBe(0);
      expect(line.params.x2).toBe(10);
    });
  });

  describe("addCircle", () => {
    it("adds a circle entity", () => {
      const s = sketchEngine.createSketch();
      const circle = sketchEngine.addCircle(s, { x: 0, y: 0 }, 25);
      expect(circle.type).toBe("circle");
      expect(circle.params.radius).toBe(25);
    });
  });

  describe("addRectangle", () => {
    it("adds a rectangle and marks sketch as closed", () => {
      const s = sketchEngine.createSketch();
      sketchEngine.addRectangle(s, { x: 0, y: 0 }, 100, 50);
      expect(s.closed).toBe(true);
      expect(s.entities).toHaveLength(1);
    });
  });

  describe("addPolygon", () => {
    it("adds a hexagon", () => {
      const s = sketchEngine.createSketch();
      const hex = sketchEngine.addPolygon(s, { x: 0, y: 0 }, 20, 6);
      expect(hex.type).toBe("polygon");
      expect(hex.params.sides).toBe(6);
    });
  });

  describe("addSlot", () => {
    it("adds a slot entity", () => {
      const s = sketchEngine.createSketch();
      const slot = sketchEngine.addSlot(s, { x: -20, y: 0 }, { x: 20, y: 0 }, 10);
      expect(slot.type).toBe("slot");
      expect(slot.params.width).toBe(10);
    });
  });

  describe("addEllipse", () => {
    it("adds an ellipse entity", () => {
      const s = sketchEngine.createSketch();
      const ell = sketchEngine.addEllipse(s, { x: 0, y: 0 }, 30, 15);
      expect(ell.type).toBe("ellipse");
      expect(ell.params.major_radius).toBe(30);
    });
  });

  describe("addArc", () => {
    it("adds an arc entity", () => {
      const s = sketchEngine.createSketch();
      const arc = sketchEngine.addArc(s, { x: 0, y: 0 }, 10, 0, 90);
      expect(arc.type).toBe("arc");
      expect(arc.params.start_angle).toBe(0);
      expect(arc.params.end_angle).toBe(90);
    });
  });

  // ── Constraints ──

  describe("addConstraint", () => {
    it("adds a dimensional constraint", () => {
      const s = sketchEngine.createSketch();
      const l = sketchEngine.addLine(s, { x: 0, y: 0 }, { x: 10, y: 0 });
      const c = sketchEngine.addConstraint(s, "distance", [l.id], 10);
      expect(c.type).toBe("distance");
      expect(c.value).toBe(10);
      expect(s.constraints).toHaveLength(1);
    });
  });

  // ── Profile Analysis ──

  describe("analyzeProfile", () => {
    it("computes circle area and perimeter", () => {
      const s = sketchEngine.createSketch();
      sketchEngine.addCircle(s, { x: 0, y: 0 }, 10);
      const p = sketchEngine.analyzeProfile(s);
      expect(p.area_mm2).toBeCloseTo(Math.PI * 100, 0);
      expect(p.perimeter_mm).toBeCloseTo(2 * Math.PI * 10, 0);
    });

    it("computes rectangle area", () => {
      const s = sketchEngine.createSketch();
      sketchEngine.addRectangle(s, { x: 0, y: 0 }, 100, 50);
      const p = sketchEngine.analyzeProfile(s);
      expect(p.area_mm2).toBe(5000);
      expect(p.perimeter_mm).toBe(300);
    });

    it("computes polygon area (hexagon)", () => {
      const s = sketchEngine.createSketch();
      sketchEngine.addPolygon(s, { x: 0, y: 0 }, 20, 6);
      const p = sketchEngine.analyzeProfile(s);
      expect(p.area_mm2).toBeGreaterThan(0);
      expect(p.perimeter_mm).toBeGreaterThan(0);
    });

    it("ignores construction entities", () => {
      const s = sketchEngine.createSketch();
      sketchEngine.addLine(s, { x: -50, y: 0 }, { x: 50, y: 0 }, true); // construction
      sketchEngine.addCircle(s, { x: 0, y: 0 }, 10);
      const p = sketchEngine.analyzeProfile(s);
      expect(p.entity_ids).toHaveLength(1); // only circle
    });

    it("computes ellipse area with Ramanujan perimeter", () => {
      const s = sketchEngine.createSketch();
      sketchEngine.addEllipse(s, { x: 0, y: 0 }, 30, 15);
      const p = sketchEngine.analyzeProfile(s);
      expect(p.area_mm2).toBeCloseTo(Math.PI * 30 * 15, 0);
      expect(p.perimeter_mm).toBeGreaterThan(0);
    });

    it("computes slot area", () => {
      const s = sketchEngine.createSketch();
      sketchEngine.addSlot(s, { x: -20, y: 0 }, { x: 20, y: 0 }, 10);
      const p = sketchEngine.analyzeProfile(s);
      // Slot = rectangle + full circle caps
      const expectedArea = 40 * 10 + Math.PI * 25; // len*w + pi*r^2
      expect(p.area_mm2).toBeCloseTo(expectedArea, 0);
    });
  });

  // ── 3D Features ──

  describe("feature creation", () => {
    it("creates extrude feature", () => {
      const f = sketchEngine.createExtrude("sk-1", 25);
      expect(f.type).toBe("extrude");
      expect(f.params.depth).toBe(25);
    });

    it("creates extrude cut with through_all", () => {
      const f = sketchEngine.createExtrudeCut("sk-1", 0, true);
      expect(f.type).toBe("extrude_cut");
      expect(f.params.through_all).toBe(true);
    });

    it("creates hole with counterbore", () => {
      const f = sketchEngine.createHole(6.8, 20, { x: 10, y: 10 }, undefined,
        { diameter: 12, depth: 6 });
      expect(f.type).toBe("hole");
      expect(f.params.counterbore?.diameter).toBe(12);
    });

    it("creates circular pattern", () => {
      const f = sketchEngine.createCircularPattern("ft-1", { x: 0, y: 0 }, 6);
      expect(f.type).toBe("pattern_circular");
      expect(f.params.count).toBe(6);
    });
  });

  // ── Part Builder ──

  describe("part templates", () => {
    it("creates a box part with volume", () => {
      const p = sketchEngine.createBoxPart("Block", 100, 50, 25);
      expect(p.name).toBe("Block");
      expect(p.sketches).toHaveLength(1);
      expect(p.features).toHaveLength(1);
      expect(p.estimated_volume_mm3).toBe(125000);
    });

    it("creates a cylinder part", () => {
      const p = sketchEngine.createCylinderPart("Pin", 20, 50);
      expect(p.estimated_volume_mm3).toBeCloseTo(Math.PI * 100 * 50, -1);
    });

    it("creates a flanged part with bolt holes", () => {
      const p = sketchEngine.createFlangedPart(
        "Pipe Flange", 150, 50, 20, 110, 8, 12);
      expect(p.sketches.length).toBeGreaterThanOrEqual(2);
      expect(p.features.length).toBeGreaterThanOrEqual(3); // disk + bore + hole + pattern
    });

    it("creates a bracket part", () => {
      const p = sketchEngine.createBracketPart(
        "L-Bracket", 80, 60, 10, 50, 10, 8);
      expect(p.features.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ── Volume Estimation ──

  describe("estimatePartVolume", () => {
    it("computes volume for extruded rectangle", () => {
      const part = sketchEngine.createPart("Test");
      const sk = sketchEngine.createSketch();
      sketchEngine.addRectangle(sk, { x: -25, y: -25 }, 50, 50);
      sketchEngine.addSketchToPart(part, sk);
      sketchEngine.addFeatureToPart(part, sketchEngine.createExtrude(sk.id, 10));
      const vol = sketchEngine.estimatePartVolume(part);
      expect(vol).toBe(25000); // 50*50*10
    });

    it("subtracts holes from volume", () => {
      const part = sketchEngine.createBoxPart("Drilled Block", 50, 50, 20);
      sketchEngine.addFeatureToPart(part,
        sketchEngine.createHole(10, 20, { x: 0, y: 0 }));
      const vol = sketchEngine.estimatePartVolume(part);
      const expected = 50 * 50 * 20 - Math.PI * 25 * 20;
      expect(vol).toBeCloseTo(expected, -1);
    });
  });

  // ── Code Generation ──

  describe("toCadQueryPython", () => {
    it("generates valid Python for box part", () => {
      const part = sketchEngine.createBoxPart("TestBox", 100, 50, 25);
      const code = sketchEngine.toCadQueryPython(part);
      expect(code).toContain("import cadquery as cq");
      expect(code).toContain(".rect(100, 50)");
      expect(code).toContain(".extrude(25)");
      expect(code).toContain('export(result, "output.step")');
    });

    it("generates Python for cylinder with hole", () => {
      const part = sketchEngine.createCylinderPart("Bushing", 30, 20);
      sketchEngine.addFeatureToPart(part,
        sketchEngine.createHole(10, 20, { x: 0, y: 0 }));
      const code = sketchEngine.toCadQueryPython(part);
      expect(code).toContain(".circle(15)");
      expect(code).toContain(".hole(10, 20)");
    });
  });

  // ── SVG Export ──

  describe("toSVG", () => {
    it("generates valid SVG for circle sketch", () => {
      const s = sketchEngine.createSketch();
      sketchEngine.addCircle(s, { x: 0, y: 0 }, 25);
      const svg = sketchEngine.toSVG(s);
      expect(svg).toContain("<svg");
      expect(svg).toContain("<circle");
      expect(svg).toContain('r="25"');
    });

    it("generates SVG for rectangle", () => {
      const s = sketchEngine.createSketch();
      sketchEngine.addRectangle(s, { x: -50, y: -25 }, 100, 50);
      const svg = sketchEngine.toSVG(s);
      expect(svg).toContain("<rect");
      expect(svg).toContain('width="100"');
    });

    it("generates SVG for polygon", () => {
      const s = sketchEngine.createSketch();
      sketchEngine.addPolygon(s, { x: 0, y: 0 }, 20, 6);
      const svg = sketchEngine.toSVG(s);
      expect(svg).toContain("<polygon");
    });
  });
});
