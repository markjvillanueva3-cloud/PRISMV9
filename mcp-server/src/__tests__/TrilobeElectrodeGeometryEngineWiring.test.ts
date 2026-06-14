/**
 * TrilobeElectrodeGeometryEngineWiring.test.ts
 *
 * BRIDGE-WIRING/U-WIRE-TRILOBE-ELECTRODE-GEOMETRY wiring-gate test.
 *
 * Asserts TrilobeElectrodeGeometryEngine is reachable via
 * prism_edm:trilobe_electrode_geometry (op-discriminator) and that the engine's
 * sync methods round-trip. The async generate() path includes an LLM call —
 * this test verifies its wiring/schema statically (source-grep) and exercises
 * the deterministic sync methods (getProfile/stats) + the pure geometry
 * functions for real behavior.
 *
 * Pattern mirror: the iter-1..4 op-discriminator wires. Lessons applied:
 * op = z.enum (NOT z.string); singleton (NOT new); case-scoped source-grep;
 * positional-agnostic ACTIONS membership.
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import {
  trilobeElectrodeGeometryEngine,
  TrilobeElectrodeGeometryEngine,
  calculateTrilobeProfile,
  calculateLobeRotation,
  interpolateDiameters,
} from "../engines/TrilobeElectrodeGeometryEngine.js";
import { EDM_ACTION_SCHEMAS } from "../schemas/edmActionSchemas.js";

const DISPATCHER_PATH = path.resolve(__dirname, "..", "tools", "dispatchers", "edmDispatcher.ts");
const DISPATCHER_SRC: string = fs.readFileSync(DISPATCHER_PATH, "utf8");

// Scope the source-grep to the trilobe_electrode_geometry case block. The
// edmDispatcher is 2.6k lines — an unscoped grep would false-WIRED match
// sibling electrode cases. End-anchor: the next outer `case "` after the start.
const TEG_CASE_BLOCK: string = (() => {
  const start = DISPATCHER_SRC.indexOf('case "trilobe_electrode_geometry":');
  if (start === -1) return "";
  // The next outer case after this block is "wire_settings" (the legacy action
  // that followed electrode_design before this insert). Bound on it.
  const nextIdx = DISPATCHER_SRC.indexOf('case "wire_settings":', start);
  return nextIdx === -1 ? DISPATCHER_SRC.slice(start, start + 4000) : DISPATCHER_SRC.slice(start, nextIdx);
})();

describe("TrilobeElectrodeGeometryEngine — dispatcher wiring gate", () => {
  it("ACTIONS enum contains 'trilobe_electrode_geometry' (positional-agnostic)", () => {
    expect(DISPATCHER_SRC).toMatch(/"trilobe_electrode_geometry"(,|\] as const;)/);
  });

  it("EDM_ACTION_SCHEMAS exports a 'trilobe_electrode_geometry' Zod schema", () => {
    expect(EDM_ACTION_SCHEMAS).toHaveProperty("trilobe_electrode_geometry");
    expect(typeof EDM_ACTION_SCHEMAS.trilobe_electrode_geometry.safeParse).toBe("function");
  });

  it("schema 'op' enum is exactly the 3-string contract", () => {
    const sch = EDM_ACTION_SCHEMAS.trilobe_electrode_geometry;
    expect(sch.parse({ op: "stats" }).op).toBe("stats");
    expect(sch.parse({ op: "get_profile", c_dia: 0.5, e_dia: 0.4 }).op).toBe("get_profile");
    expect(sch.parse({
      op: "generate", part_number: "P1",
      stages: [{ c_dia_in: 0.5, e_dia_in: 0.4, z_start_in: 0, z_end_in: 1 }],
      total_length_in: 1,
    }).op).toBe("generate");
    expect(() => sch.parse({ op: "invalid" })).toThrow();
    expect(() => sch.parse({})).toThrow();
  });

  it("schema rejects non-positive trilobe diameters", () => {
    const sch = EDM_ACTION_SCHEMAS.trilobe_electrode_geometry;
    expect(() => sch.parse({
      op: "generate", part_number: "P", total_length_in: 1,
      stages: [{ c_dia_in: 0, e_dia_in: 0.4, z_start_in: 0, z_end_in: 1 }],
    })).toThrow();
    // workpiece_material is a constrained enum, not a free string.
    expect(() => sch.parse({ op: "generate", part_number: "P", workpiece_material: "titanium" })).toThrow();
    expect(sch.parse({ op: "generate", part_number: "P", workpiece_material: "carbide" }).workpiece_material).toBe("carbide");
  });

  it("dispatcher case 'trilobe_electrode_geometry' branches into 3 inner ops", () => {
    expect(TEG_CASE_BLOCK).not.toBe("");
    expect(TEG_CASE_BLOCK).toContain('case "generate":');
    expect(TEG_CASE_BLOCK).toContain('case "get_profile":');
    expect(TEG_CASE_BLOCK).toContain('case "stats":');
    // Outer break before the next case — no fall-through into wire_settings.
    expect(TEG_CASE_BLOCK).toMatch(/break;\s*}\s*$/);
  });

  it("dispatcher case binds the singleton (not class instantiation)", () => {
    expect(TEG_CASE_BLOCK).toContain('await import("../../engines/TrilobeElectrodeGeometryEngine.js")');
    expect(TEG_CASE_BLOCK).toContain("{ trilobeElectrodeGeometryEngine }");
    expect(TEG_CASE_BLOCK).not.toMatch(/new\s+TrilobeElectrodeGeometryEngine\s*\(/);
  });

  it("dispatcher case fixes lobe_count to 3 (taptite invariant)", () => {
    // TrilobeInput types lobe_count as the literal 3 — the dispatcher must
    // supply it, not the caller. A regression accepting it from params would
    // break the type contract.
    expect(TEG_CASE_BLOCK).toContain("lobe_count: 3");
  });

  it("dispatcher case fails loud on missing generate/get_profile params", () => {
    expect(TEG_CASE_BLOCK).toContain('error: "generate requires {part_number, stages: [{c_dia_in,e_dia_in,z_start_in,z_end_in}], total_length_in, ...}"');
    expect(TEG_CASE_BLOCK).toContain('error: "get_profile requires {c_dia, e_dia, rotation_deg?}"');
    expect(TEG_CASE_BLOCK).toContain('unknown trilobe_electrode_geometry op:');
  });

  // ── Real-behavior: sync engine methods ───────────────────────────────
  it("getProfile() returns 360 points on the trilobe polar curve", () => {
    const e = new TrilobeElectrodeGeometryEngine();
    const profile = e.getProfile(0.5, 0.4);
    expect(profile).toHaveLength(360);
    // r(θ) = R_base + A·cos(3θ); R_base=(0.5+0.4)/4=0.225, A=(0.5-0.4)/4=0.025.
    // Every point radius must lie within [R_base-A, R_base+A] = [0.2, 0.25].
    for (const pt of profile) {
      const r = Math.hypot(pt.x, pt.y);
      expect(r).toBeGreaterThanOrEqual(0.2 - 1e-9);
      expect(r).toBeLessThanOrEqual(0.25 + 1e-9);
    }
  });

  it("calculateTrilobeProfile() crests reach the major radius 3 times per revolution", () => {
    // A trilobe has exactly 3 lobes — cos(3θ)=1 at θ = 0, 120°, 240°.
    const pts = calculateTrilobeProfile(0.6, 0.3, 360);
    const R_base = (0.6 + 0.3) / 4; // 0.225
    const A = (0.6 - 0.3) / 4;      // 0.075
    const crestR = R_base + A;      // 0.3
    let crests = 0;
    for (const pt of pts) {
      if (Math.abs(Math.hypot(pt.x, pt.y) - crestR) < 1e-3) crests++;
    }
    // 3 crest regions; each spans a couple of sample points near the peak.
    expect(crests).toBeGreaterThanOrEqual(3);
  });

  it("calculateLobeRotation() returns 0 for a straight (non-helical) trilobe", () => {
    expect(calculateLobeRotation(1.5, 0, 3)).toBe(0);
  });

  it("calculateLobeRotation() advances with Z for a helical trilobe", () => {
    const rotAtStart = calculateLobeRotation(0, 10, 3);
    const rotMid = calculateLobeRotation(0.5, 10, 3);
    expect(rotAtStart).toBe(0);
    expect(rotMid).toBeGreaterThan(0);
    expect(rotMid).toBeLessThan(360);
  });

  it("interpolateDiameters() returns the stage diameters for an in-range Z", () => {
    const stages = [
      { c_dia_in: 0.5, e_dia_in: 0.4, z_start_in: 0, z_end_in: 1 },
      { c_dia_in: 0.7, e_dia_in: 0.6, z_start_in: 1, z_end_in: 2 },
    ];
    expect(interpolateDiameters(0.5, stages)).toEqual({ c_dia: 0.5, e_dia: 0.4 });
    expect(interpolateDiameters(1.5, stages)).toEqual({ c_dia: 0.7, e_dia: 0.6 });
  });

  it("stats() reports the supported CAM-system count", () => {
    const e = new TrilobeElectrodeGeometryEngine();
    const s = e.stats();
    expect(s.jobs_generated).toBe(0);
    expect(s.cam_systems_supported).toBe(3);
  });

  it("singleton is exported and shares the TrilobeElectrodeGeometryEngine type", () => {
    expect(trilobeElectrodeGeometryEngine).toBeInstanceOf(TrilobeElectrodeGeometryEngine);
    // The singleton's getProfile is the same deterministic function.
    expect(trilobeElectrodeGeometryEngine.getProfile(0.5, 0.4)).toHaveLength(360);
  });
});
