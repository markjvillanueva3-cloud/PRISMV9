/**
 * CAMOperationSelectorEngine tests — CAM-AI-TRAINING-MS0/U-CAMT-OPSELECT
 */
import { describe, it, expect } from "vitest";
import { CAMOperationSelectorEngine } from "../engines/CAMOperationSelectorEngine.js";

const engine = new CAMOperationSelectorEngine();

describe("CAMOperationSelectorEngine", () => {

  it("selects drill_deep over drill_peck for deep_hole (explicit priority)", () => {
    const r = engine.select("deep_hole");
    expect(r.best).toBe("drill_deep");
    const ops = r.candidates.map((c) => c.op);
    expect(ops).toContain("drill_peck");
  });

  it("selects tap_rigid for tapped_hole (priority 10 > thread_mill 5)", () => {
    const r = engine.select("tapped_hole");
    expect(r.best).toBe("tap_rigid");
  });

  it("selects impeller_blade_5axis for impeller_blade feature", () => {
    expect(engine.select("impeller_blade").best).toBe("impeller_blade_5axis");
  });

  it("selects wedm_2axis for thru_profile feature", () => {
    expect(engine.select("thru_profile").best).toBe("wedm_2axis");
  });

  it("selects turn_part for part_off feature", () => {
    expect(engine.select("part_off").best).toBe("turn_part");
  });

  it("selects probe_wcs for datum feature", () => {
    expect(engine.select("datum").best).toBe("probe_wcs");
  });

  it("selects face for face / top_surface features", () => {
    expect(engine.select("face").best).toBe("face");
    expect(engine.select("top_surface").best).toBe("face");
  });

  it("selects pocket_2d for closed_pocket (priority 10 > adaptive_clearing_2d for pocket=8)", () => {
    expect(engine.select("closed_pocket").best).toBe("pocket_2d");
  });

  it("selects adaptive_clearing_2d for open_pocket (priority 10)", () => {
    expect(engine.select("open_pocket").best).toBe("adaptive_clearing_2d");
  });

  it("selects adaptive_clearing_3d for 3d_pocket", () => {
    expect(engine.select("3d_pocket").best).toBe("adaptive_clearing_3d");
  });

  it("candidates list includes ALL ops whose spec.featureClasses contains the feature", () => {
    const r = engine.select("hole");
    const ops = r.candidates.map((c) => c.op);
    // hole feature is in featureClasses of drill, drill_peck, drill_deep
    expect(ops).toContain("drill");
  });

  it("returns best=null + empty candidates for an unknown feature class", () => {
    // 'unknown_feature' isn't in any op's spec.featureClasses
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = engine.select("unknown_feature" as any);
    expect(r.best).toBeNull();
    expect(r.candidates).toEqual([]);
  });

  it("candidates carry a reason string with 'feature-class-match' or 'explicit-priority'", () => {
    const r = engine.select("deep_hole");
    for (const c of r.candidates) {
      expect(c.reason).toMatch(/feature-class-match/);
    }
  });

  it("validate rejects non-object input", () => {
    expect(engine.validate(null)).toMatch(/object/);
    expect(engine.validate({})).toBeNull();
  });

  it("getCapabilities exposes select + candidates", () => {
    const names = engine.getCapabilities().map((c) => c.name);
    expect(names).toContain("select");
    expect(names).toContain("candidates");
  });
});
