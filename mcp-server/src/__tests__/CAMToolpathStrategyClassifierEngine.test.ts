/**
 * CAMToolpathStrategyClassifierEngine tests — CAM-AI-TRAINING-MS0/U-CAMT-STRATEGY
 */
import { describe, it, expect } from "vitest";
import { CAMToolpathStrategyClassifierEngine } from "../engines/CAMToolpathStrategyClassifierEngine.js";

const engine = new CAMToolpathStrategyClassifierEngine();

describe("CAMToolpathStrategyClassifierEngine", () => {

  it("face rough → adaptive_clear", () => {
    const r = engine.classify({ featureClass: "face", axisCount: "3", roughOrFinish: "rough" });
    expect(r.strategy).toBe("adaptive_clear");
  });

  it("face finish → parallel", () => {
    const r = engine.classify({ featureClass: "face", axisCount: "3", roughOrFinish: "finish" });
    expect(r.strategy).toBe("parallel");
  });

  it("pocket_2d rough → adaptive_clear", () => {
    const r = engine.classify({ featureClass: "pocket_2d", axisCount: "3", roughOrFinish: "rough" });
    expect(r.strategy).toBe("adaptive_clear");
  });

  it("pocket_2d finish → contour", () => {
    const r = engine.classify({ featureClass: "pocket_2d", axisCount: "3", roughOrFinish: "finish" });
    expect(r.strategy).toBe("contour");
  });

  it("contour_2d finish → profile", () => {
    const r = engine.classify({ featureClass: "contour_2d", axisCount: "3", roughOrFinish: "finish" });
    expect(r.strategy).toBe("profile");
  });

  it("chamfer finish → chamfer_pass", () => {
    const r = engine.classify({ featureClass: "chamfer", axisCount: "3", roughOrFinish: "finish" });
    expect(r.strategy).toBe("chamfer_pass");
  });

  it("thru_hole rough → drill_canned", () => {
    const r = engine.classify({ featureClass: "thru_hole", axisCount: "3", roughOrFinish: "rough" });
    expect(r.strategy).toBe("drill_canned");
  });

  it("deep_hole rough → drill_canned (peck)", () => {
    const r = engine.classify({ featureClass: "deep_hole", axisCount: "3", roughOrFinish: "rough" });
    expect(r.strategy).toBe("drill_canned");
    expect(r.rationale).toMatch(/peck|G83/i);
  });

  it("thread finish → thread_mill", () => {
    const r = engine.classify({ featureClass: "thread", axisCount: "3", roughOrFinish: "finish" });
    expect(r.strategy).toBe("thread_mill");
  });

  it("ruled_surface finish on 3-axis → scallop", () => {
    const r = engine.classify({ featureClass: "ruled_surface", axisCount: "3", roughOrFinish: "finish" });
    expect(r.strategy).toBe("scallop");
  });

  it("ruled_surface finish on 5-axis → swarf override", () => {
    const r = engine.classify({ featureClass: "ruled_surface", axisCount: "5", roughOrFinish: "finish" });
    expect(r.strategy).toBe("swarf");
  });

  it("impeller_blade finish on 5-axis → swarf", () => {
    const r = engine.classify({ featureClass: "impeller_blade", axisCount: "5", roughOrFinish: "finish" });
    expect(r.strategy).toBe("swarf");
  });

  it("impeller_blade rough on 5-axis → adaptive_clear", () => {
    const r = engine.classify({ featureClass: "impeller_blade", axisCount: "5", roughOrFinish: "rough" });
    expect(r.strategy).toBe("adaptive_clear");
  });

  it("3+2 positional wraps base strategy", () => {
    const r = engine.classify({ featureClass: "pocket_2d", axisCount: "3+2", roughOrFinish: "rough" });
    expect(r.strategy).toBe("3plus2");
    expect(r.alternatives).toContain("adaptive_clear"); // base strategy in alternatives
  });

  it("unknown feature + 2-axis → profile fallback", () => {
    const r = engine.classify({ featureClass: "datum", axisCount: "2", roughOrFinish: "finish" });
    expect(r.strategy).toBe("profile");
  });

  it("unknown feature + 3-axis rough → adaptive_clear fallback", () => {
    const r = engine.classify({ featureClass: "datum", axisCount: "3", roughOrFinish: "rough" });
    expect(r.strategy).toBe("adaptive_clear");
  });

  it("unknown feature + 3-axis finish → scallop fallback", () => {
    const r = engine.classify({ featureClass: "datum", axisCount: "3", roughOrFinish: "finish" });
    expect(r.strategy).toBe("scallop");
  });

  it("external_profile rough → profile", () => {
    const r = engine.classify({ featureClass: "external_profile", axisCount: "2", roughOrFinish: "rough" });
    expect(r.strategy).toBe("profile");
  });

  it("strategies() returns all 18 ToolpathStrategy values", () => {
    const s = engine.strategies();
    expect(s.length).toBe(18);
    expect(s).toContain("adaptive_clear");
    expect(s).toContain("swarf");
    expect(s).toContain("drill_canned");
    expect(s).toContain("3plus2");
  });

  it("rationale is non-empty + informative for every primary branch", () => {
    expect(engine.classify({ featureClass: "face", axisCount: "3", roughOrFinish: "rough" }).rationale.length).toBeGreaterThan(10);
    expect(engine.classify({ featureClass: "impeller_blade", axisCount: "5", roughOrFinish: "finish" }).rationale).toMatch(/swarf|tangent/i);
  });

  it("validate rejects non-object input", () => {
    expect(engine.validate(null)).toMatch(/object/);
    expect(engine.validate({})).toBeNull();
  });

  it("getCapabilities exposes classify + strategies", () => {
    const names = engine.getCapabilities().map((c) => c.name);
    expect(names).toContain("classify");
    expect(names).toContain("strategies");
  });
});
