/**
 * CAMTemplateGeneratorEngine tests — CAM-AI-TRAINING-MS0/U-CAMT-B03
 *
 * End-to-end Phase-B composition test: B01 taxonomy + B02 input schema →
 * concrete CAM template w/ defaults filled in.
 *
 * Per [[feedback_engine_tests_in_tests_dir]], lives in src/__tests__/.
 */
import { describe, it, expect } from "vitest";
import { CAMTemplateGeneratorEngine } from "../engines/CAMTemplateGeneratorEngine.js";

const engine = new CAMTemplateGeneratorEngine();

describe("CAMTemplateGeneratorEngine v1", () => {

  it("generate('face','fusion360','face') returns a fully-filled template", () => {
    const t = engine.generate("face", "fusion360", "face");
    expect(t?.id).toBe("face__fusion360__face");
    expect(t?.op).toBe("face");
    expect(t?.system).toBe("fusion360");
    expect(t?.nativeName).toBe("Face");
    expect(t?.featureClass).toBe("face");
    expect(t?.synthetic).toBe(false);
    expect(t?.parameters.length).toBe(12);
    const ids = (t?.parameters ?? []).map((p) => p.id);
    expect(ids).toEqual([
      "tool", "wcs", "spindle_rpm", "feed_xy", "feed_plunge",
      "stepover", "stepdown", "stock_to_leave", "coolant",
      "lead_in_radius", "lead_out_radius", "retract_height",
    ]);
  });

  it("generated template carries the documented defaults from B02", () => {
    const t = engine.generate("face", "fusion360", "face");
    const byId = new Map((t?.parameters ?? []).map((p) => [p.id, p]));
    expect(byId.get("spindle_rpm")?.value).toBe(8000);
    expect(byId.get("feed_xy")?.value).toBe(1200);
    expect(byId.get("coolant")?.value).toBe("flood");
    expect(byId.get("retract_height")?.value).toBe(5.0);
    expect(byId.get("spindle_rpm")?.unit).toBe("rpm");
    expect(byId.get("feed_xy")?.unit).toBe("mm/min");
  });

  it("generate('drill_peck','mastercam','deep_hole') applies feature_override for depth + peck + spindle", () => {
    const t = engine.generate("drill_peck", "mastercam", "deep_hole");
    expect(t?.featureClass).toBe("deep_hole");
    const byId = new Map((t?.parameters ?? []).map((p) => [p.id, p]));
    const depth = byId.get("depth");
    const peck = byId.get("peck_depth");
    const rpm = byId.get("spindle_rpm");
    expect(depth?.value).toBe(60.0);
    expect(depth?.origin).toBe("feature_override");
    expect(peck?.value).toBe(1.5);
    expect(peck?.origin).toBe("feature_override");
    expect(rpm?.value).toBe(750);
    expect(rpm?.origin).toBe("feature_override");
  });

  it("generate('drill','fusion360','thru_hole') sets depth=25mm via thru_hole override", () => {
    const t = engine.generate("drill", "fusion360", "thru_hole");
    const depth = (t?.parameters ?? []).find((p) => p.id === "depth");
    expect(depth?.value).toBe(25.0);
    expect(depth?.origin).toBe("feature_override");
  });

  it("explicit override beats feature_override beats B02 default", () => {
    const t = engine.generate("drill_peck", "mastercam", "deep_hole", { overrides: { depth: 100, spindle_rpm: 500 } });
    const byId = new Map((t?.parameters ?? []).map((p) => [p.id, p]));
    expect(byId.get("depth")?.value).toBe(100);
    expect(byId.get("depth")?.origin).toBe("default"); // explicit overrides flagged as default
    expect(byId.get("spindle_rpm")?.value).toBe(500);
  });

  it("generate('impeller_blade_5axis','hypermill','impeller_blade') uses tight stepover + 5-axis extras", () => {
    const t = engine.generate("impeller_blade_5axis", "hypermill", "impeller_blade");
    expect(t?.nativeName).toBe("5-Axis Impeller");
    const byId = new Map((t?.parameters ?? []).map((p) => [p.id, p]));
    expect(byId.get("stepover")?.value).toBe(0.2);
    expect(byId.get("stock_to_leave")?.value).toBe(0.05);
    // 5-axis extras are present
    expect(byId.has("tool_axis_mode")).toBe(true);
    expect(byId.has("tilt_limit_min")).toBe(true);
    expect(byId.has("tilt_limit_max")).toBe(true);
  });

  it("generate refuses (op, system) when taxonomy says unsupported (face@vericut)", () => {
    expect(engine.generate("face", "vericut", "face")).toBeNull();
  });

  it("generate refuses incompatible feature class (drill with 'ruled_surface')", () => {
    // drill op spec has featureClasses=["hole","thru_hole","blind_hole"]; ruled_surface is not in that list.
    expect(engine.generate("drill", "fusion360", "ruled_surface")).toBeNull();
  });

  it("generate refuses (op, system) when system has no parameter schema (wedm@mastercam)", () => {
    expect(engine.generate("wedm_2axis", "mastercam", "thru_profile")).toBeNull();
  });

  it("template aggregates source labels from every parameter row (real-data provenance)", () => {
    const t = engine.generate("face", "fusion360", "face");
    expect(t?.sources.length).toBeGreaterThan(0);
    // Sources are sorted (deterministic) and unique.
    const sorted = [...(t?.sources ?? [])].sort();
    expect(t?.sources).toEqual(sorted);
    expect(new Set(t?.sources).size).toBe(t?.sources.length);
  });

  it("generateForOp('face','face') returns one template per CAM system that supports face", () => {
    const ts = engine.generateForOp("face", "face");
    expect(ts.length).toBeGreaterThanOrEqual(10);
    const systems = new Set(ts.map((t) => t.system));
    expect(systems.has("fusion360")).toBe(true);
    expect(systems.has("mastercam")).toBe(true);
    expect(systems.has("hypermill")).toBe(true);
    expect(systems.has("solidcam")).toBe(true);
    expect(systems.has("vericut")).toBe(false);
  });

  it("generateForOp emits unique template ids", () => {
    const ts = engine.generateForOp("pocket_2d", "pocket");
    const ids = new Set(ts.map((t) => t.id));
    expect(ids.size).toBe(ts.length);
  });

  it("generateAll produces a corpus of templates with per-system and per-op aggregation", () => {
    const all = engine.generateAll();
    expect(all.total).toBeGreaterThan(50);
    // Every system/op in the breakdown comes from the taxonomy
    for (const [sys, n] of Object.entries(all.perSystem)) {
      expect(n).toBeGreaterThan(0);
      expect(typeof sys).toBe("string");
    }
    // Sum of perSystem equals total
    const sysSum = Object.values(all.perSystem).reduce((a, b) => a + b, 0);
    expect(sysSum).toBe(all.total);
    // Sum of perOp equals total
    const opSum = Object.values(all.perOp).reduce((a, b) => a + b, 0);
    expect(opSum).toBe(all.total);
  });

  it("stats() returns the same totals as generateAll() without retaining templates", () => {
    const s = engine.stats();
    const all = engine.generateAll();
    expect(s.total).toBe(all.total);
    expect(s.systems).toBe(Object.keys(all.perSystem).length);
    expect(s.ops).toBe(Object.keys(all.perOp).length);
  });

  it("generated template id follows '<op>__<system>__<feature>' convention", () => {
    const t = engine.generate("adaptive_clearing_3d", "mastercam", "3d_pocket");
    expect(t?.id).toBe("adaptive_clearing_3d__mastercam__3d_pocket");
  });

  it("generated template carries the canonical op spec from B01", () => {
    const t = engine.generate("swarf_5axis", "fusion360", "ruled_surface");
    expect(t?.spec.id).toBe("swarf_5axis");
    expect(t?.spec.family).toBe("milling_5axis");
    expect(t?.spec.axisCount).toBe("5");
    expect(t?.spec.strategy).toBe("finishing");
  });

  it("getCapabilities() exposes generate/generate_for_op/generate_all/stats", () => {
    const caps = engine.getCapabilities();
    const names = caps.map((c) => c.name);
    expect(names).toEqual(expect.arrayContaining(["generate", "generate_for_op", "generate_all", "stats"]));
  });

  it("validate() rejects non-object input", () => {
    expect(engine.validate(null)).toMatch(/object/);
    expect(engine.validate(42)).toMatch(/object/);
    expect(engine.validate({})).toBeNull();
  });

  it("every generated template enforces synthetic=false (operator constraint)", () => {
    const t1 = engine.generate("face", "fusion360", "face");
    const t2 = engine.generate("drill", "mastercam", "thru_hole");
    const t3 = engine.generate("swarf_5axis", "hypermill", "side_wall");
    expect(t1?.synthetic).toBe(false);
    expect(t2?.synthetic).toBe(false);
    expect(t3?.synthetic).toBe(false);
  });
});
