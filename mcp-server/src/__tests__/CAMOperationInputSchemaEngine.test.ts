/**
 * CAMOperationInputSchemaEngine tests — CAM-AI-TRAINING-MS0/U-CAMT-B02
 *
 * Asserts:
 *   - schema returns vendor-documented parameter rows for the 3 covered systems
 *     (Fusion 360 / Mastercam / hyperMILL) across 3 op families (milling / drilling / turning)
 *   - system-specific deltas appear ONLY for the targeted (op, system) pair
 *   - validateValues catches missing-required, unknown-key, out-of-range,
 *     wrong-type, bad-enum
 *   - coverage stats are consistent with the taxonomy
 *
 * Per [[feedback_engine_tests_in_tests_dir]], lives in src/__tests__/.
 */
import { describe, it, expect } from "vitest";
import {
  CAMOperationInputSchemaEngine,
  type InputParameter,
} from "../engines/CAMOperationInputSchemaEngine.js";

const engine = new CAMOperationInputSchemaEngine();

function paramById(params: ReadonlyArray<InputParameter>, id: string): InputParameter | undefined {
  return params.find((p) => p.id === id);
}

describe("CAMOperationInputSchemaEngine v1", () => {

  it("getSchema('face','fusion360') returns the 12 documented milling-common params with Fusion native name", () => {
    const s = engine.getSchema("face", "fusion360");
    expect(s?.op).toBe("face");
    expect(s?.system).toBe("fusion360");
    expect(s?.nativeName).toBe("Face");
    expect(s?.schemaVersion).toBe("1.0.0");
    expect(s?.parameters.length).toBe(12);
    const ids = (s?.parameters ?? []).map((p) => p.id);
    expect(ids).toEqual([
      "tool", "wcs", "spindle_rpm", "feed_xy", "feed_plunge",
      "stepover", "stepdown", "stock_to_leave", "coolant",
      "lead_in_radius", "lead_out_radius", "retract_height",
    ]);
  });

  it("getSchema('adaptive_clearing_3d','fusion360') adds fine_stepdown delta + 2 adaptive extras", () => {
    const s = engine.getSchema("adaptive_clearing_3d", "fusion360");
    expect(s?.parameters.length).toBe(12 + 2 + 1); // 12 common + 2 adaptive + 1 Fusion delta = 15
    const ids = (s?.parameters ?? []).map((p) => p.id);
    expect(ids).toContain("optimal_load");
    expect(ids).toContain("min_cutting_radius");
    expect(ids).toContain("fine_stepdown");
    const fineStepdown = paramById(s?.parameters ?? [], "fine_stepdown");
    expect(fineStepdown?.label).toBe("Fine Stepdown");
    expect(fineStepdown?.defaultValue).toBe(0.5);
    expect(fineStepdown?.source).toMatch(/F360 Adaptive/);
  });

  it("getSchema('adaptive_clearing_2d','mastercam') adds Mastercam stepover_pct delta", () => {
    const s = engine.getSchema("adaptive_clearing_2d", "mastercam");
    expect(s?.system).toBe("mastercam");
    expect(s?.nativeName).toBe("Dynamic Mill");
    const stepoverPct = paramById(s?.parameters ?? [], "stepover_pct");
    expect(stepoverPct?.defaultValue).toBe(25);
    expect(stepoverPct?.min).toBe(1);
    expect(stepoverPct?.max).toBe(100);
    expect(stepoverPct?.source).toMatch(/Mastercam Dynamic Mill/);
  });

  it("getSchema('swarf_5axis','hypermill') adds hyperMILL swarf_priority delta + 5-axis extras", () => {
    const s = engine.getSchema("swarf_5axis", "hypermill");
    expect(s?.nativeName).toBe("5-Axis Tangent Plane");
    const ids = (s?.parameters ?? []).map((p) => p.id);
    expect(ids).toContain("tool_axis_mode");
    expect(ids).toContain("tilt_limit_min");
    expect(ids).toContain("tilt_limit_max");
    expect(ids).toContain("swarf_priority");
    const swarfPriority = paramById(s?.parameters ?? [], "swarf_priority");
    expect(swarfPriority?.enumValues).toEqual(["top", "bottom", "alternating"]);
    expect(swarfPriority?.defaultValue).toBe("bottom");
  });

  it("getSchema('swarf_5axis','fusion360') has 5-axis extras but NOT the hyperMILL swarf_priority delta", () => {
    const s = engine.getSchema("swarf_5axis", "fusion360");
    const ids = (s?.parameters ?? []).map((p) => p.id);
    expect(ids).toContain("tool_axis_mode");
    expect(ids.includes("swarf_priority")).toBe(false);
  });

  it("getSchema('drill','fusion360') returns drilling-family params (no XY feed, has peck)", () => {
    const s = engine.getSchema("drill", "fusion360");
    expect(s?.nativeName).toBe("Drill");
    const ids = (s?.parameters ?? []).map((p) => p.id);
    expect(ids).toContain("tool");
    expect(ids).toContain("spindle_rpm");
    expect(ids).toContain("feed_z");
    expect(ids).toContain("depth");
    expect(ids).toContain("peck_depth");
    expect(ids).toContain("coolant");
    // Should NOT carry the milling-specific lateral feed
    expect(ids.includes("feed_xy")).toBe(false);
    expect(ids.includes("stepover")).toBe(false);
  });

  it("getSchema('turn_rough','mastercam') returns turning-family params w/ feed_rev unit", () => {
    const s = engine.getSchema("turn_rough", "mastercam");
    expect(s?.nativeName).toBe("Rough");
    const ids = (s?.parameters ?? []).map((p) => p.id);
    expect(ids).toContain("feed_rev");
    expect(ids).toContain("depth_of_cut");
    const feedRev = paramById(s?.parameters ?? [], "feed_rev");
    expect(feedRev?.unit).toBe("mm/rev");
    expect(feedRev?.defaultValue).toBe(0.25);
  });

  it("getSchema('wedm_2axis','mastercam') is null — taxonomy says Mastercam doesn't support WEDM", () => {
    const s = engine.getSchema("wedm_2axis", "mastercam");
    expect(s).toBeNull();
  });

  it("getSchema('face','vericut') is null — Vericut is verification-only, supports no ops", () => {
    const s = engine.getSchema("face", "vericut");
    expect(s).toBeNull();
  });

  it("validateValues catches missing required (no tool)", () => {
    const r = engine.validateValues("face", "fusion360", {
      wcs: "G54",
      spindle_rpm: 10000,
      feed_xy: 1500,
      feed_plunge: 500,
      coolant: "flood",
      retract_height: 5,
    });
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => /missing required: tool/.test(i))).toBe(true);
  });

  it("validateValues catches out-of-range (spindle_rpm above max)", () => {
    const r = engine.validateValues("face", "fusion360", {
      tool: "EM-12-4FL",
      wcs: "G54",
      spindle_rpm: 999999, // > max 60000
      feed_xy: 1500,
      feed_plunge: 500,
      coolant: "flood",
      retract_height: 5,
    });
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => /spindle_rpm.*999999.*max 60000/.test(i))).toBe(true);
  });

  it("validateValues catches wrong type (feed as string)", () => {
    const r = engine.validateValues("face", "fusion360", {
      tool: "EM-12-4FL",
      wcs: "G54",
      spindle_rpm: 10000,
      feed_xy: "fast" as unknown as number,
      feed_plunge: 500,
      coolant: "flood",
      retract_height: 5,
    });
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => /feed_xy.*expected finite number/.test(i))).toBe(true);
  });

  it("validateValues catches bad enum (coolant=bath)", () => {
    const r = engine.validateValues("face", "fusion360", {
      tool: "EM-12-4FL",
      wcs: "G54",
      spindle_rpm: 10000,
      feed_xy: 1500,
      feed_plunge: 500,
      coolant: "bath",
      retract_height: 5,
    });
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => /coolant.*must be one of/.test(i))).toBe(true);
  });

  it("validateValues catches unknown-key (cosmetic_param)", () => {
    const r = engine.validateValues("face", "fusion360", {
      tool: "EM-12-4FL",
      wcs: "G54",
      spindle_rpm: 10000,
      feed_xy: 1500,
      feed_plunge: 500,
      coolant: "flood",
      retract_height: 5,
      cosmetic_param: 42,
    });
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => /unknown parameter: cosmetic_param/.test(i))).toBe(true);
  });

  it("validateValues catches adversarial input (NaN spindle_rpm)", () => {
    const r = engine.validateValues("face", "fusion360", {
      tool: "EM-12-4FL",
      wcs: "G54",
      spindle_rpm: Number.NaN,
      feed_xy: 1500,
      feed_plunge: 500,
      coolant: "flood",
      retract_height: 5,
    });
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => /spindle_rpm.*expected finite number/.test(i))).toBe(true);
  });

  it("validateValues catches adversarial input (Infinity feed_xy)", () => {
    const r = engine.validateValues("face", "fusion360", {
      tool: "EM-12-4FL",
      wcs: "G54",
      spindle_rpm: 10000,
      feed_xy: Number.POSITIVE_INFINITY,
      feed_plunge: 500,
      coolant: "flood",
      retract_height: 5,
    });
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => /feed_xy.*expected finite number/.test(i))).toBe(true);
  });

  it("validateValues accepts a clean realistic face-mill bag (no issues)", () => {
    const r = engine.validateValues("face", "fusion360", {
      tool: "EM-12-4FL-uncoated",
      wcs: "G54",
      spindle_rpm: 8000,
      feed_xy: 1200,
      feed_plunge: 400,
      stepover: 4.0,
      stepdown: 2.0,
      stock_to_leave: 0.2,
      coolant: "flood",
      lead_in_radius: 2.0,
      lead_out_radius: 2.0,
      retract_height: 5.0,
    });
    expect(r.ok).toBe(true);
    expect(r.issues).toEqual([]);
  });

  it("validateValues rejects unsupported (op, system) with the specific reason", () => {
    const r = engine.validateValues("wedm_2axis", "mastercam", {});
    expect(r.ok).toBe(false);
    expect(r.issues[0]).toMatch(/unsupported \(op,system\): wedm_2axis \/ mastercam/);
  });

  it("listParams('drill','mastercam') returns the drilling-family param ids in order", () => {
    const ids = engine.listParams("drill", "mastercam");
    expect(ids).toEqual([
      "tool", "wcs", "spindle_rpm", "feed_z", "depth",
      "peck_depth", "dwell_at_bottom", "coolant", "retract_height",
    ]);
  });

  it("listParams returns [] for unsupported (face, vericut)", () => {
    expect(engine.listParams("face", "vericut")).toEqual([]);
  });

  it("coverage() returns one row per CAM system with supportedOps ≤ 67", () => {
    const cov = engine.coverage();
    expect(cov.length).toBe(25);
    for (const row of cov) {
      expect(row.supportedOps).toBeGreaterThanOrEqual(0);
      expect(row.supportedOps).toBeLessThanOrEqual(67);
      // v1 invariant: every supported op has a schema (OP_PARAMS covers all ops)
      expect(row.withSchema).toBe(row.supportedOps);
    }
  });

  it("coverage().find('fusion360') reports ≥10 supportedOps (Fusion supports broad milling+drill+turn)", () => {
    const cov = engine.coverage();
    const f = cov.find((r) => r.system === "fusion360");
    expect(f?.system).toBe("fusion360");
    expect((f?.supportedOps ?? 0) >= 10).toBe(true);
  });

  it("coverage().find('vericut') reports 0 supportedOps (verification-only)", () => {
    const cov = engine.coverage();
    const v = cov.find((r) => r.system === "vericut");
    expect(v?.system).toBe("vericut");
    expect(v?.supportedOps).toBe(0);
    expect(v?.withSchema).toBe(0);
  });

  it("getCapabilities() exposes get_schema, validate, list_params, coverage", () => {
    const caps = engine.getCapabilities();
    const names = caps.map((c) => c.name);
    expect(names).toEqual(expect.arrayContaining(["get_schema", "validate", "list_params", "coverage"]));
  });

  it("validate() (BaseEngine input shape) rejects non-object input", () => {
    expect(engine.validate(null)).toMatch(/object/);
    expect(engine.validate("string")).toMatch(/object/);
    expect(engine.validate({})).toBeNull();
  });

  it("Parameter rows all carry source provenance (real-data discipline)", () => {
    const schema = engine.getSchema("pocket_2d", "fusion360");
    expect(schema?.parameters.length).toBeGreaterThan(0);
    for (const p of schema?.parameters ?? []) {
      expect(typeof p.source).toBe("string");
      expect(p.source.length).toBeGreaterThan(0);
    }
  });

  it("Parameter rows have non-empty descriptions (no stub fields)", () => {
    const schema = engine.getSchema("swarf_5axis", "hypermill");
    for (const p of schema?.parameters ?? []) {
      expect(p.description.length).toBeGreaterThan(10);
    }
  });
});
