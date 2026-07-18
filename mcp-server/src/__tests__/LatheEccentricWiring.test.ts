/**
 * LATHE-WIRE-MS0/U-LATHE-ECCENTRIC-WIRE — real-behavior tests for the eccentric-turning surface.
 *
 * WIRING unit: exposes the EXISTING EccentricTurningEngine (generate/validateInput/getSupportedControllers)
 * on prism_turning (was unwired). The engine uses CANONICAL_MATERIAL_DB + Kienzle (no inline physics
 * constants). Tests drive the real engine: the 3 concrete validateInput rules, a clean pass, and a real
 * async generate over the generic-polygon path. The generate dispatcher action also surfaces
 * validateInput problems (safety-first — the >3000 RPM polar-interp limit can't be silently skipped).
 */
import { describe, it, expect } from "vitest";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { eccentricTurningEngine as ecc } from "../engines/EccentricTurningEngine.js";

const ds = (...p: string[]) => path.resolve(__dirname, "..", ...p);

const validPolygon = {
  part_number: "TEST-ECC-1",
  profile_type: "polygon" as const,
  total_length_in: 1.0,
  workpiece_material: "steel",
  target_finish_Ra_um: 1.6,
  max_spindle_rpm: 2000,
  controller: "OSP-P300L-R" as const,
  tool_position: 1,
  tool_nose_radius_in: 0.0156,
  finish_passes: 1,
  finish_stock_in: 0.005,
  use_css: true,
  max_radius_in: 0.5,
  min_radius_in: 0.4,
  lobe_count: 3,
};

describe("U-LATHE-ECCENTRIC-WIRE — engine behavior (real EccentricTurningEngine)", () => {
  it("getSupportedControllers returns the 3 Okuma OSP dialects", () => {
    expect(ecc.getSupportedControllers()).toEqual(["OSP-P300L-R", "OSP-P300LA-E", "OSP-P300SA"]);
  });

  it("validateInput flags a trilobe profile that is missing trilobe_stages", () => {
    const problems = ecc.validateInput({ ...validPolygon, profile_type: "trilobe", trilobe_stages: undefined });
    expect(problems).toContain("Trilobe profile requires trilobe_stages");
  });

  it("validateInput flags a non-trilobe profile that is missing max_radius_in", () => {
    const problems = ecc.validateInput({ ...validPolygon, max_radius_in: undefined });
    expect(problems).toContain("Non-trilobe profiles require max_radius_in");
  });

  it("validateInput flags an unsafe spindle RPM (>3000 — polar-interpolation safety limit)", () => {
    const problems = ecc.validateInput({ ...validPolygon, max_spindle_rpm: 5000 });
    expect(problems.some((p) => /3000/.test(p))).toBe(true);
  });

  it("validateInput returns NO problems for a clean polygon input (≤3000 RPM, max_radius_in set)", () => {
    expect(ecc.validateInput(validPolygon)).toEqual([]);
  });

  it("generate produces an eccentric program with physics from the canonical material DB", async () => {
    const out = await ecc.generate(validPolygon);
    expect(out.job_id.startsWith("ECCENTRIC-")).toBe(true);
    expect(out.profile_summary.type).toBe("polygon");
    expect(out.controller).toBe("OSP-P300L-R");
    expect(typeof out.gcode).toBe("string");
    expect(Number.isFinite(out.physics.max_cutting_force_N)).toBe(true);
    expect(out.physics.max_cutting_force_N).toBeGreaterThanOrEqual(0);
    expect(out.profile_summary.sections_generated).toBeGreaterThanOrEqual(0);
  });

  it("generate on an OFF-DB material (graphite — the engine's own documented material) falls back to 1045 instead of throwing (regression: dead 'steel_1045' key → TypeError)", async () => {
    // "graphite" matches no CANONICAL_MATERIAL_DB.name → hits the fallback. Pre-fix this threw
    // TypeError reading kc1_1 of undefined (DB keyed "1045", old code referenced .steel_1045).
    const out = await ecc.generate({ ...validPolygon, workpiece_material: "graphite" });
    expect(out.job_id.startsWith("ECCENTRIC-")).toBe(true);
    expect(Number.isFinite(out.physics.max_cutting_force_N)).toBe(true);
    expect(out.physics.max_cutting_force_N).toBeGreaterThan(0); // 1045 fallback gives a real force
  });
});

describe("U-LATHE-ECCENTRIC-WIRE — dispatcher + schema wiring", () => {
  it("turningDispatcher has ACTIONS entries + the grouped case for all 3 eccentric actions", async () => {
    const src = await fsp.readFile(ds("tools", "dispatchers", "turningDispatcher.ts"), "utf8");
    for (const a of ["lathe_eccentric_generate", "lathe_eccentric_validate", "lathe_eccentric_controllers"]) {
      expect(src.includes(`"${a}",`)).toBe(true);
      expect(src.includes(`case "${a}":`)).toBe(true);
    }
    // generate surfaces validation problems alongside the program (safety-first composition)
    expect(src.includes("validation_problems: eccentricTurningEngine.validateInput(p)")).toBe(true);
  });

  it("schemas: generate is strict (required fields), validate + controllers are permissive", async () => {
    const { TURNING_ACTION_SCHEMAS } = await import("../schemas/turningActionSchemas.js");
    const m = TURNING_ACTION_SCHEMAS as Record<string, { safeParse: (v: unknown) => { success: boolean } }>;

    expect(m.lathe_eccentric_generate!.safeParse(validPolygon).success).toBe(true);
    expect(m.lathe_eccentric_generate!.safeParse({}).success).toBe(false); // missing required
    expect(m.lathe_eccentric_generate!.safeParse({ ...validPolygon, profile_type: "nonsense" }).success).toBe(false); // bad enum
    expect(m.lathe_eccentric_validate!.safeParse({}).success).toBe(true); // permissive pre-flight
    expect(m.lathe_eccentric_controllers!.safeParse({}).success).toBe(true); // no params
  });
});
