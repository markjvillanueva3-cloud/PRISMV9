import { describe, it, expect } from "vitest";
import { ACTION_CAD_SCHEMAS } from "../schemas/cadActionSchemas.js";

/*
 * Schemas for the 5 coverage-meter cad actions (delta 2026-06-26). The cadDispatcher BLOCKS on invalid
 * params, so the load-bearing property is: a VALID call (the exact shape each engine's apply() accepts)
 * must NEVER be rejected. These tests pin that (regression guard) + confirm gross type errors are caught.
 */
const ACTIONS = ["cad_feature_subtract", "cad_feature_pattern", "cad_datum_create", "cad_die_design", "cad_boolean", "cad_mate", "cad_weldment", "cad_sheetmetal", "cad_drawing_generate"];
const ok = (action: string, params: unknown) => ACTION_CAD_SCHEMAS[action].safeParse(params).success;

describe("cadActionSchemas — 5 coverage-meter actions: valid calls pass, gross errors caught", () => {
  it("all 5 actions are registered as functioning Zod schemas (parse a valid input)", () => {
    expect(ok("cad_feature_subtract", { op: "cut_hole", base_volume_mm3: 1000, diameter_mm: 5, depth_mm: 3 })).toBe(true);
    expect(ok("cad_feature_pattern", { kind: "linear", count: 5, spacing_mm: 10 })).toBe(true);
    expect(ok("cad_datum_create", { kind: "point", x: 1, y: 2, z: 3 })).toBe(true);
    expect(ok("cad_die_design", { mode: "blank", feature_dim_mm: 10, thickness_mm: 2, clearance_pct_per_side: 5 })).toBe(true);
    expect(ok("cad_boolean", { op: "union", volume_a_mm3: 100, volume_b_mm3: 50 })).toBe(true);
  });

  it("cad_feature_subtract: valid cut_hole/pocket/groove calls pass; bad op/type rejected", () => {
    expect(ok("cad_feature_subtract", { op: "cut_hole", base_volume_mm3: 1000, diameter_mm: 5, depth_mm: 3 })).toBe(true);
    expect(ok("cad_feature_subtract", { operation: "pocket", base_volume_mm3: 1000, width_mm: 4, length_mm: 8, depth_mm: 2 })).toBe(true);
    expect(ok("cad_feature_subtract", { op: "drill" })).toBe(false);            // not a valid op
    expect(ok("cad_feature_subtract", { op: "groove", depth_mm: "deep" })).toBe(false); // non-numeric
  });

  it("cad_feature_pattern: valid linear/circular/mirror pass", () => {
    expect(ok("cad_feature_pattern", { kind: "linear", count: 5, spacing_mm: 10, feature_volume_mm3: 100 })).toBe(true);
    expect(ok("cad_feature_pattern", { pattern: "circular", count: 6, radius_mm: 20 })).toBe(true);
    expect(ok("cad_feature_pattern", { kind: "mirror", plane: "XY" })).toBe(true);
    expect(ok("cad_feature_pattern", { kind: "grid" })).toBe(false);
  });

  it("cad_datum_create: valid plane/axis/point pass; LOWERCASE base_plane MUST pass (engine upper-cases)", () => {
    expect(ok("cad_datum_create", { kind: "plane", base_plane: "XY", offset_mm: 10 })).toBe(true);
    // REGRESSION GUARD: the engine accepts lowercase (it upper-cases); a z.enum would wrongly reject this.
    expect(ok("cad_datum_create", { kind: "plane", base_plane: "xy", offset_mm: -5 })).toBe(true);
    expect(ok("cad_datum_create", { kind: "axis", p1: [0, 0, 0], p2: [3, 4, 0] })).toBe(true);
    expect(ok("cad_datum_create", { datum: "point", x: 1, y: 2, z: 3 })).toBe(true);
    expect(ok("cad_datum_create", { kind: "csys" })).toBe(false);
  });

  it("cad_die_design: valid blank/pierce pass; bad mode/type rejected", () => {
    expect(ok("cad_die_design", { mode: "blank", feature_dim_mm: 10, thickness_mm: 2, clearance_pct_per_side: 5 })).toBe(true);
    expect(ok("cad_die_design", { mode: "pierce", feature_dim_mm: 8, thickness_mm: 2, clearance_pct_per_side: 5 })).toBe(true);
    expect(ok("cad_die_design", { mode: "draw" })).toBe(false);
    expect(ok("cad_die_design", { mode: "blank", thickness_mm: "thin" })).toBe(false);
  });

  it("cad_boolean: valid union/subtract/intersect (volumes or solid ids) pass; bad op rejected", () => {
    expect(ok("cad_boolean", { op: "union", volume_a_mm3: 100, volume_b_mm3: 50 })).toBe(true);
    expect(ok("cad_boolean", { operation: "subtract", solid_a: "s1", solid_b: "s2", validate_geometry: true })).toBe(true);
    expect(ok("cad_boolean", { op: "carve", volume_a_mm3: 1, volume_b_mm3: 1 })).toBe(false);
  });

  it("cad_mate: valid coincident/concentric/distance/angle/parallel pass; bad mate rejected", () => {
    expect(ok("cad_mate", { mate_type: "coincident" })).toBe(true);
    expect(ok("cad_mate", { mate: "distance", distance_mm: 10 })).toBe(true);
    expect(ok("cad_mate", { type: "angle", angle_deg: 30 })).toBe(true);
    expect(ok("cad_mate", { mate_type: "concentric" })).toBe(true);
    expect(ok("cad_mate", { mate_type: "weld" })).toBe(false);
  });

  it("cad_weldment: valid member/gusset/weld_bead pass; bad op rejected", () => {
    expect(ok("cad_weldment", { op: "member", section_area_mm2: 400, length_mm: 1000 })).toBe(true);
    expect(ok("cad_weldment", { weldment: "gusset", leg_a_mm: 50, leg_b_mm: 50, thickness_mm: 6 })).toBe(true);
    expect(ok("cad_weldment", { type: "weld_bead", leg_mm: 6, length_mm: 100 })).toBe(true);
    expect(ok("cad_weldment", { op: "rivet" })).toBe(false);
  });

  it("cad_sheetmetal: valid bend_allowance/flat_pattern pass; bad op rejected", () => {
    expect(ok("cad_sheetmetal", { op: "bend_allowance", thickness_mm: 2, bend_angle_deg: 90, inside_radius_mm: 3 })).toBe(true);
    expect(ok("cad_sheetmetal", { operation: "flat_pattern", leg_lengths_mm: [50, 50], bend_angles_deg: [90] })).toBe(true);
    expect(ok("cad_sheetmetal", { op: "hem" })).toBe(false);
  });

  it("cad_drawing_generate: valid ortho_views + projection pass; bad op/projection rejected", () => {
    expect(ok("cad_drawing_generate", { op: "ortho_views", projection: "third_angle", view_spacing_mm: 100 })).toBe(true);
    expect(ok("cad_drawing_generate", { projection: "first_angle" })).toBe(true);
    expect(ok("cad_drawing_generate", { op: "iso_view" })).toBe(false);
    expect(ok("cad_drawing_generate", { projection: "isometric" })).toBe(false);
  });

  it("numeric-string coercion is accepted (mirrors the engines' Number() -> no regression)", () => {
    // engines do Number(params.x); z.coerce.number accepts "5" too, so a string-number call still passes
    expect(ok("cad_die_design", { mode: "blank", feature_dim_mm: "10", thickness_mm: "2", clearance_pct_per_side: "5" })).toBe(true);
  });

  it("passthrough: extra keys are allowed (the dispatcher passes the full normalized params)", () => {
    expect(ok("cad_boolean", { op: "union", volume_a_mm3: 1, volume_b_mm3: 1, _routing: "x", extra: 99 })).toBe(true);
  });

  it("empty object passes every schema (all fields optional -> engine handles the missing-input failure)", () => {
    for (const a of ACTIONS) expect(ok(a, {})).toBe(true);
  });
});
