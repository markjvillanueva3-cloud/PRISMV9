/**
 * CAMOperationTaxonomyEngine tests — CAM-AI-TRAINING-MS0/U-CAMT-B01
 *
 * Behavior-focused tests asserting computed outputs against vendor-documented
 * values. No toBeDefined/toBeTruthy weak assertions, no mocking.
 *
 * Per [[feedback_engine_tests_in_tests_dir]], lives in src/__tests__/.
 */
import { describe, it, expect } from "vitest";
import {
  CAMOperationTaxonomyEngine,
  CAM_OPERATIONS,
  CAM_SYSTEMS,
} from "../engines/CAMOperationTaxonomyEngine.js";

const engine = new CAMOperationTaxonomyEngine();

describe("CAMOperationTaxonomyEngine v1 frozen taxonomy", () => {

  it("CAM_OPERATIONS array carries 67 unique ops in frozen order (face..chamfer_2d head)", () => {
    expect(CAM_OPERATIONS.length).toBe(67);
    expect(new Set(CAM_OPERATIONS).size).toBe(67);
    expect(CAM_OPERATIONS.slice(0, 7)).toEqual([
      "face", "contour_2d", "pocket_2d", "slot_2d", "engrave_2d", "trace_2d", "chamfer_2d",
    ]);
  });

  it("CAM_SYSTEMS array carries 25 unique softwares starting with fusion360..catia_machining", () => {
    expect(CAM_SYSTEMS.length).toBe(25);
    expect(new Set(CAM_SYSTEMS).size).toBe(25);
    expect(CAM_SYSTEMS.slice(0, 9)).toEqual([
      "fusion360", "mastercam", "hypermill", "solidcam", "inventor_hsm",
      "nx_cam", "powermill", "esprit", "catia_machining",
    ]);
  });

  it("getSpec('face') returns the documented face-mill contract", () => {
    const s = engine.getSpec("face");
    expect(s.id).toBe("face");
    expect(s.family).toBe("milling_2d");
    expect(s.axisCount).toBe("3");
    expect(s.defaultStock).toBe("billet");
    expect(s.strategy).toBe("roughing");
    expect(s.featureClasses).toEqual(expect.arrayContaining(["face", "top_surface"]));
    expect(s.description).toMatch(/Face milling/);
  });

  it("getSpec('adaptive_clearing_3d') returns the high-feed roughing contract", () => {
    const s = engine.getSpec("adaptive_clearing_3d");
    expect(s.family).toBe("milling_3d");
    expect(s.axisCount).toBe("3");
    expect(s.strategy).toBe("roughing");
    expect(s.defaultStock).toBe("billet");
    expect(s.featureClasses).toEqual(expect.arrayContaining(["3d_pocket"]));
  });

  it("getSpec('swarf_5axis') returns the 5-axis flute-side ruled-surface contract", () => {
    const s = engine.getSpec("swarf_5axis");
    expect(s.family).toBe("milling_5axis");
    expect(s.axisCount).toBe("5");
    expect(s.strategy).toBe("finishing");
    expect(s.featureClasses).toEqual(expect.arrayContaining(["ruled_surface", "side_wall"]));
  });

  it("getSpec('tilt_3plus2') returns the 3+2 indexing contract", () => {
    const s = engine.getSpec("tilt_3plus2");
    expect(s.axisCount).toBe("3+2");
    expect(s.family).toBe("milling_5axis");
    expect(s.strategy).toBe("mixed");
  });

  it("getSpec('impeller_blade_5axis') returns the 5-axis impeller-cycle contract", () => {
    const s = engine.getSpec("impeller_blade_5axis");
    expect(s.family).toBe("milling_5axis");
    expect(s.axisCount).toBe("5");
    expect(s.featureClasses).toEqual(expect.arrayContaining(["impeller_blade"]));
  });

  it("getSpec('turn_part') returns the bar-stock parting-off contract", () => {
    const s = engine.getSpec("turn_part");
    expect(s.family).toBe("turning");
    expect(s.axisCount).toBe("2");
    expect(s.defaultStock).toBe("bar");
    expect(s.strategy).toBe("specialty");
    expect(s.featureClasses).toEqual(expect.arrayContaining(["part_off"]));
  });

  it("getSpec('turn_rough') returns the bar-stock G71/G72 roughing contract", () => {
    const s = engine.getSpec("turn_rough");
    expect(s.family).toBe("turning");
    expect(s.strategy).toBe("roughing");
    expect(s.defaultStock).toBe("bar");
  });

  it("getSpec('wedm_2axis') returns the vertical-wire EDM contract", () => {
    const s = engine.getSpec("wedm_2axis");
    expect(s.family).toBe("edm");
    expect(s.axisCount).toBe("2");
    expect(s.defaultStock).toBe("billet");
  });

  it("getSpec('wedm_4axis_taper') returns the U/V-taper wire-EDM contract", () => {
    const s = engine.getSpec("wedm_4axis_taper");
    expect(s.axisCount).toBe("4");
    expect(s.featureClasses).toEqual(expect.arrayContaining(["tapered_thru"]));
  });

  it("getSpec('laser_cut') returns the sheet thru-cut contract", () => {
    const s = engine.getSpec("laser_cut");
    expect(s.family).toBe("laser");
    expect(s.defaultStock).toBe("sheet");
    expect(s.featureClasses).toEqual(expect.arrayContaining(["thru_profile"]));
  });

  it("getSpec('additive_deposition') returns the 5-axis no-stock DED contract", () => {
    const s = engine.getSpec("additive_deposition");
    expect(s.family).toBe("additive");
    expect(s.axisCount).toBe("5");
    expect(s.defaultStock).toBe("none");
  });

  it("getSpec returns a complete spec for every canonical op (re-computed count)", () => {
    let completeCount = 0;
    for (const op of CAM_OPERATIONS) {
      const s = engine.getSpec(op);
      if (
        s.id === op &&
        typeof s.family === "string" && s.family.length > 0 &&
        typeof s.axisCount === "string" && s.axisCount.length > 0 &&
        typeof s.strategy === "string" && s.strategy.length > 0 &&
        typeof s.defaultStock === "string" && s.defaultStock.length > 0 &&
        Array.isArray(s.featureClasses) && s.featureClasses.length > 0 &&
        typeof s.description === "string" && s.description.length > 20
      ) {
        completeCount++;
      }
    }
    expect(completeCount).toBe(CAM_OPERATIONS.length);
  });

  it("byFamily groups all 67 ops into mutually exclusive families summing to 67", () => {
    const g = engine.byFamily();
    const seen: string[] = [];
    for (const [, ops] of Object.entries(g)) for (const op of ops) seen.push(op);
    expect(seen.length).toBe(67);
    expect(new Set(seen).size).toBe(67);
  });

  it("byFamily milling_5axis bucket contains exactly the 9 documented 5-axis ops", () => {
    const g = engine.byFamily();
    expect(g.milling_5axis.length).toBe(9);
    expect(g.milling_5axis).toEqual(expect.arrayContaining([
      "swarf_5axis", "tilt_3plus2", "tilt_5axis_simultaneous",
      "morph_between_two_curves_5axis", "flow_5axis", "multi_axis_contour",
      "port_machining_5axis", "impeller_blade_5axis", "blade_hub_shroud_5axis",
    ]));
  });

  it("byFamily edm bucket contains exactly wedm_2axis, wedm_4axis_taper, sinker_edm", () => {
    const g = engine.byFamily();
    expect(g.edm.length).toBe(3);
    expect(g.edm).toEqual(expect.arrayContaining(["wedm_2axis", "wedm_4axis_taper", "sinker_edm"]));
  });

  it("byFamily probing bucket contains exactly 3 probe ops", () => {
    const g = engine.byFamily();
    expect(g.probing.length).toBe(3);
    expect(g.probing).toEqual(expect.arrayContaining([
      "probe_wcs", "probe_part_inspect", "probe_tool_measure",
    ]));
  });

  it("getPerSoftware returns vendor-documented native names for 12 representative (op, system) pairs", () => {
    expect(engine.getPerSoftware("face", "fusion360").nativeName).toBe("Face");
    expect(engine.getPerSoftware("pocket_2d", "fusion360").nativeName).toBe("2D Pocket");
    expect(engine.getPerSoftware("adaptive_clearing_3d", "fusion360").nativeName).toBe("Adaptive Clearing");
    expect(engine.getPerSoftware("adaptive_clearing_2d", "mastercam").nativeName).toBe("Dynamic Mill");
    expect(engine.getPerSoftware("adaptive_clearing_3d", "mastercam").nativeName).toBe("OptiRough");
    expect(engine.getPerSoftware("swarf_5axis", "hypermill").nativeName).toBe("5-Axis Tangent Plane");
    expect(engine.getPerSoftware("impeller_blade_5axis", "hypermill").nativeName).toBe("5-Axis Impeller");
    expect(engine.getPerSoftware("adaptive_clearing_2d", "solidcam").nativeName).toBe("iMachining 2D");
    expect(engine.getPerSoftware("adaptive_clearing_3d", "nx_cam").nativeName).toBe("Cavity Mill");
    expect(engine.getPerSoftware("adaptive_clearing_3d", "powermill").nativeName).toBe("Vortex");
    expect(engine.getPerSoftware("adaptive_clearing_3d", "esprit").nativeName).toBe("ProfitMilling 3D");
    expect(engine.getPerSoftware("adaptive_clearing_3d", "camworks").nativeName).toBe("VoluMill");
  });

  it("getPerSoftware returns supported=false + empty name for un-mapped pairs", () => {
    const m1 = engine.getPerSoftware("impeller_blade_5axis", "alphacam");
    expect(m1.supported).toBe(false);
    expect(m1.nativeName).toBe("");
    const m2 = engine.getPerSoftware("face", "vericut");
    expect(m2.supported).toBe(false);
    expect(m2.nativeName).toBe("");
  });

  it("coverage().find('face') shows ≥10 system support including the big 4 CAM softwares", () => {
    const cov = engine.coverage();
    const face = cov.find((c) => c.op === "face");
    // Hard-assert the entry exists by reading the property directly
    expect(face?.op).toBe("face");
    expect(face?.supportedBy ?? 0).toBeGreaterThanOrEqual(10);
    expect(face?.systems ?? []).toEqual(expect.arrayContaining([
      "fusion360", "mastercam", "hypermill", "solidcam",
    ]));
  });

  it("coverage().find('adaptive_clearing_3d') shows ≥6 system support including 6 documented vendors", () => {
    const cov = engine.coverage();
    const ac = cov.find((c) => c.op === "adaptive_clearing_3d");
    expect(ac?.op).toBe("adaptive_clearing_3d");
    expect(ac?.supportedBy ?? 0).toBeGreaterThanOrEqual(6);
    expect(ac?.systems ?? []).toEqual(expect.arrayContaining([
      "fusion360", "mastercam", "solidcam", "powermill", "esprit", "camworks",
    ]));
  });

  it("coverage().find('additive_deposition') has supportedBy=0 (taxonomy gap surfaced)", () => {
    const cov = engine.coverage();
    const add = cov.find((c) => c.op === "additive_deposition");
    expect(add?.op).toBe("additive_deposition");
    expect(add?.supportedBy).toBe(0);
    expect(add?.systems).toEqual([]);
  });

  it("coverage() length equals CAM_OPERATIONS length (one row per op)", () => {
    expect(engine.coverage().length).toBe(CAM_OPERATIONS.length);
  });

  it("stats() arithmetic: 67 ops × 25 systems = 1675 max mappings, % = ratio × 100", () => {
    const s = engine.stats();
    expect(s.totalOps).toBe(67);
    expect(s.totalSystems).toBe(25);
    expect(s.maxPossibleMappings).toBe(1675);
    expect(s.totalMappings).toBeGreaterThan(0);
    expect(s.coveragePct).toBeCloseTo((s.totalMappings / 1675) * 100, 6);
  });

  it("stats().uncoveredOps + covered count sum to totalOps (no double-count)", () => {
    const s = engine.stats();
    const cov = engine.coverage();
    const covered = cov.filter((c) => c.supportedBy > 0).length;
    expect(covered + s.uncoveredOps.length).toBe(s.totalOps);
    expect(s.uncoveredOps).toContain("additive_deposition");
  });

  it("getCapabilities() exposes the 5 dispatcher-wiring entry points", () => {
    const caps = engine.getCapabilities();
    expect(caps.map((c) => c.name)).toEqual(expect.arrayContaining([
      "operations", "spec", "by_family", "per_software", "coverage",
    ]));
  });

  it("validate() rejects non-object and accepts empty object", () => {
    expect(engine.validate(null)).toMatch(/object/);
    expect(engine.validate("string")).toMatch(/object/);
    expect(engine.validate(42)).toMatch(/object/);
    expect(engine.validate({})).toBeNull();
  });

  it("listOperations and listSystems return v1 frozen arrays (identity)", () => {
    expect(engine.listOperations()).toEqual(CAM_OPERATIONS);
    expect(engine.listSystems()).toEqual(CAM_SYSTEMS);
  });
});
