/**
 * WEDM toolpath-type registry (Phase A1 of the print->program pipeline).
 * Verifies the registry is complete + well-formed and the envelope feasibility
 * gate rejects out-of-envelope jobs.
 */
import { describe, it, expect } from "vitest";
import {
  WEDM_TOOLPATH_TYPES,
  JM_FA10S_ENVELOPE,
  getToolpathType,
  listToolpathTypes,
  validateAgainstEnvelope,
} from "../data/wedm-toolpath-types.js";

describe("WEDM toolpath-type registry", () => {
  it("covers all 11 wire-EDM toolpath types with well-formed entries", () => {
    expect(WEDM_TOOLPATH_TYPES.length).toBe(11);
    const ids = WEDM_TOOLPATH_TYPES.map((t) => t.id);
    expect(new Set(ids).size).toBe(11); // unique ids
    for (const t of WEDM_TOOLPATH_TYPES) {
      expect(typeof t.id).toBe("string");
      expect(t.label.length).toBeGreaterThan(3);
      expect(t.owning_engine.length).toBeGreaterThan(3);
      expect(Array.isArray(t.params)).toBe(true);
      expect(t.params.length).toBeGreaterThan(0);
      expect(["wired", "partial", "build"]).toContain(t.status);
      expect(t.provenance.length).toBeGreaterThan(3);
      for (const p of t.params) {
        expect(p.name.length).toBeGreaterThan(0);
        expect(["number", "enum", "boolean"]).toContain(p.type);
        expect(p.source.length).toBeGreaterThan(0); // every param grounded
      }
    }
  });

  it("includes the crux types: straight/taper/cannelure/micro/no-core", () => {
    const ids = new Set(listToolpathTypes());
    for (const id of ["straight_profile_multipass", "taper_uv", "closely_spaced_cannelure", "micro_fine_wire", "no_core_slug_retention"]) {
      expect(ids.has(id)).toBe(true);
    }
  });

  it("getToolpathType resolves known ids and returns undefined for unknown", () => {
    expect(getToolpathType("taper_uv")?.e_code_family).toBe("E28XX_TAPER_5PASS");
    expect(getToolpathType("not_a_type")).toBeUndefined();
  });

  it("listToolpathTypes filters by status — A3 closed the 2 'build' gaps to 'partial'", () => {
    expect(listToolpathTypes().length).toBe(11);
    // A3 (wedm-build-strategies.ts) shipped the cannelure + micro strategy math,
    // so no type is status:"build" anymore. The two are now "partial" (strategy
    // logic exists; named owning engine classes not yet dispatcher-wired).
    expect(listToolpathTypes("build")).toEqual([]);
    const partial = new Set(listToolpathTypes("partial"));
    expect(partial.has("closely_spaced_cannelure")).toBe(true);
    expect(partial.has("micro_fine_wire")).toBe(true);
  });

  it("validateAgainstEnvelope rejects over-height / over-taper / off-inventory wire", () => {
    expect(validateAgainstEnvelope("taper_uv", { taper_angle_deg: 35 }).feasible).toBe(false);
    expect(validateAgainstEnvelope("straight_profile_multipass", { thickness_mm: 250 }).blockers[0]).toMatch(/215/);
    expect(validateAgainstEnvelope("straight_profile_multipass", { wire_diameter_mm: 0.1 }).feasible).toBe(false);
  });

  it("validateAgainstEnvelope passes an in-envelope job + flags unknown type", () => {
    const ok = validateAgainstEnvelope("straight_profile_multipass", { thickness_mm: 80, wire_diameter_mm: 0.25 });
    expect(ok.feasible).toBe(true);
    expect(ok.blockers).toEqual([]);
    expect(validateAgainstEnvelope("ghost_type", {}).feasible).toBe(false);
  });

  it("envelope matches the JM FA-10S spec (height 215 / taper 30 / UV 80 / wire 0.25+0.20)", () => {
    expect(JM_FA10S_ENVELOPE.max_workpiece_height_mm).toBe(215);
    expect(JM_FA10S_ENVELOPE.max_taper_deg).toBe(30);
    expect(JM_FA10S_ENVELOPE.uv_travel_mm).toBe(80);
    expect([...JM_FA10S_ENVELOPE.wire_diameters_on_hand_mm]).toEqual([0.25, 0.2]);
  });
});
