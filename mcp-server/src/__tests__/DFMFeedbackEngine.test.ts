import { describe, it, expect } from "vitest";
import { DFMFeedbackEngine } from "../engines/DFMFeedbackEngine.js";

const engine = new DFMFeedbackEngine();

describe("DFMFeedbackEngine", () => {
  it("flags thin walls as critical", () => {
    const r = engine.analyze([{
      type: "pocket", wall_thickness_mm: 0.3,
    }]);
    expect(r.critical_count).toBeGreaterThan(0);
    expect(r.issues[0].category).toBe("thin_wall");
  });

  it("flags deep pockets", () => {
    const r = engine.analyze([{
      type: "pocket",
      dimensions: { depth_mm: 50, width_mm: 6 },
    }]);
    expect(r.issues.some(i => i.category === "deep_pocket")).toBe(true);
  });

  it("flags tight tolerances", () => {
    const r = engine.analyze([{
      type: "pocket", tolerance_mm: 0.003,
    }]);
    expect(r.critical_count).toBeGreaterThan(0);
    expect(r.issues[0].category).toBe("tight_tolerance");
  });

  it("flags fine surface finish", () => {
    const r = engine.analyze([{
      type: "contour", surface_finish_Ra: 0.1,
    }]);
    expect(r.issues.some(i => i.category === "surface_finish")).toBe(true);
  });

  it("flags deep holes", () => {
    const r = engine.analyze([{
      type: "drill_hole",
      dimensions: { diameter_mm: 3, depth_mm: 50 },
    }]);
    expect(r.issues.some(i => i.category === "deep_hole")).toBe(true);
  });

  it("rates easy parts as excellent", () => {
    const r = engine.analyze([{
      type: "pocket",
      dimensions: { length_mm: 50, width_mm: 30, depth_mm: 10 },
      tolerance_mm: 0.1,
    }]);
    expect(r.manufacturability).toBe("excellent");
    expect(r.score).toBeGreaterThanOrEqual(80);
  });

  it("rates difficult parts low", () => {
    const r = engine.analyze([
      { type: "pocket", wall_thickness_mm: 0.3, tolerance_mm: 0.002 },
      { type: "drill_hole", dimensions: { diameter_mm: 0.5, depth_mm: 20 } },
    ]);
    expect(r.manufacturability).toBe("difficult");
    expect(r.score).toBeLessThan(40);
  });

  it("warns on superalloy deep features", () => {
    const r = engine.analyze([{
      type: "pocket",
      dimensions: { depth_mm: 40, width_mm: 20 },
    }], "S");
    expect(r.issues.some(i => i.category === "material_concern")).toBe(true);
  });

  it("includes physics basis on critical issues", () => {
    const r = engine.analyze([{ type: "pocket", wall_thickness_mm: 0.3 }]);
    const crit = r.issues.find(i => i.severity === "critical");
    expect(crit?.physics_basis).toBeTruthy();
  });
});
