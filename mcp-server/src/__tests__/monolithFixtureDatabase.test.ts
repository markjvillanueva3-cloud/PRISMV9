/**
 * MonolithFixtureDatabaseEngine tests.
 * JULIETT-DB-BRIDGE-MS0/U-DB-MONOLITH-FIXTURE-LOADER.
 *
 * Verifies the TS-typed port of PRISM_FIXTURE_DATABASE.js carries the full
 * 7 categories + 16 stiffness + 10 friction + 6 safety records from the
 * monolith extraction, and all query surfaces are fail-soft.
 */

import { describe, it, expect } from "vitest";
import {
  MonolithFixtureDatabaseEngine,
  monolithFixtureDatabaseEngine,
} from "../engines/MonolithFixtureDatabaseEngine.js";

const engine = monolithFixtureDatabaseEngine;

describe("MonolithFixtureDatabaseEngine — data integrity", () => {
  it("exports a singleton matching the class", () => {
    expect(engine).toBeInstanceOf(MonolithFixtureDatabaseEngine);
  });

  it("stats() reports correct counts (7 cat / 16 stiff / 10 friction / 6 safety / 5 mfr)", () => {
    const s = engine.stats();
    expect(s.categories).toBe(7);
    expect(s.stiffness_defaults).toBe(16);
    expect(s.friction_coefficients).toBe(10);
    expect(s.safety_factors).toBe(6);
    expect(s.manufacturer_slots).toBe(5);
  });

  it("listCategories returns 7 records", () => {
    expect(engine.listCategories()).toHaveLength(7);
  });

  it("listStiffness returns 16 records", () => {
    expect(engine.listStiffness()).toHaveLength(16);
  });

  it("listFrictions returns 10 records", () => {
    expect(engine.listFrictions()).toHaveLength(10);
  });

  it("listSafetyFactors returns 6 records", () => {
    expect(engine.listSafetyFactors()).toHaveLength(6);
  });

  it("listManufacturers returns 5 named slots", () => {
    expect(engine.listManufacturers()).toEqual([
      "kurt", "schunk", "lang", "jergens", "fifth_axis",
    ]);
  });

  it("all 7 categories have unique codes (VIS/CHK/PLT/TMB/CLP/COL/5AX)", () => {
    const codes = engine.listCategories().map((c) => c.code).sort();
    expect(codes).toEqual(["5AX", "CHK", "CLP", "COL", "PLT", "TMB", "VIS"]);
  });

  it("specific monolith values preserved (vise_6in kx=150 ky=200 kz=300)", () => {
    const v = engine.getStiffness("vise_6in");
    expect(v?.kx).toBe(150);
    expect(v?.ky).toBe(200);
    expect(v?.kz).toBe(300);
  });

  it("chuck stiffness scales (6in radial=150, 12in radial=280)", () => {
    expect(engine.getStiffness("chuck_6in")?.radial).toBe(150);
    expect(engine.getStiffness("chuck_12in")?.radial).toBe(280);
  });

  it("zero-point stiffness highest (kx=ky=400 kz=800)", () => {
    const zp = engine.getStiffness("zero_point");
    expect(zp?.kx).toBe(400);
    expect(zp?.ky).toBe(400);
    expect(zp?.kz).toBe(800);
  });

  it("fixture plate per-inch values (aluminum 50, steel 150, cast_iron 175)", () => {
    expect(engine.getStiffness("plate_aluminum")?.kz_per_inch).toBe(50);
    expect(engine.getStiffness("plate_steel")?.kz_per_inch).toBe(150);
    expect(engine.getStiffness("plate_cast_iron")?.kz_per_inch).toBe(175);
  });

  it("friction coefficients preserved (diamond_jaws=0.35 highest jaw)", () => {
    expect(engine.getFriction("diamond_jaws")).toBe(0.35);
    expect(engine.getFriction("serrated_jaws")).toBe(0.25);
    expect(engine.getFriction("carbide_jaws")).toBe(0.30);
  });

  it("material-pair frictions preserved", () => {
    expect(engine.getFriction("steel_on_steel_dry")).toBe(0.15);
    expect(engine.getFriction("steel_on_steel_oily")).toBe(0.10);
    expect(engine.getFriction("rubber_pads")).toBe(0.40);
  });

  it("safety factors monotonic with operation severity", () => {
    expect(engine.getSafetyFactor("finishing")).toBe(1.5);
    expect(engine.getSafetyFactor("semi_finishing")).toBe(2.0);
    expect(engine.getSafetyFactor("roughing")).toBe(2.5);
    expect(engine.getSafetyFactor("heavy_roughing")).toBe(3.0);
    expect(engine.getSafetyFactor("interrupted_cut")).toBe(3.5);
  });

  it("VISE category has 7 subcategories", () => {
    expect(engine.getCategory("VISE")?.subcategories).toHaveLength(7);
  });

  it("CHUCK category has 7 subcategories", () => {
    expect(engine.getCategory("CHUCK")?.subcategories).toHaveLength(7);
  });

  it("FIVE_AXIS category has 4 subcategories including zero_point", () => {
    const fa = engine.getCategory("FIVE_AXIS");
    expect(fa?.subcategories).toHaveLength(4);
    expect(fa?.subcategories).toContain("zero_point");
  });
});

describe("MonolithFixtureDatabaseEngine — get* surface", () => {
  it("getCategory returns null on unknown id", () => {
    expect(engine.getCategory("ZZZ")).toBeNull();
  });

  it("getCategoryByCode returns the matching category (case-insensitive)", () => {
    expect(engine.getCategoryByCode("VIS")?.id).toBe("VISE");
    expect(engine.getCategoryByCode("vis")?.id).toBe("VISE");
    expect(engine.getCategoryByCode("5AX")?.id).toBe("FIVE_AXIS");
  });

  it("getCategoryByCode returns null on unknown code", () => {
    expect(engine.getCategoryByCode("ZZZ")).toBeNull();
    expect(engine.getCategoryByCode("")).toBeNull();
  });

  it("getStiffness returns null on unknown id", () => {
    expect(engine.getStiffness("ZZZ_UNKNOWN")).toBeNull();
    expect(engine.getStiffness("")).toBeNull();
  });

  it("getFriction returns null on unknown id", () => {
    expect(engine.getFriction("ZZZ")).toBeNull();
    expect(engine.getFriction("")).toBeNull();
  });

  it("getSafetyFactor returns null on unknown op", () => {
    expect(engine.getSafetyFactor("ZZZ")).toBeNull();
    expect(engine.getSafetyFactor("")).toBeNull();
  });

  it("get methods are null-safe on non-string input (R12)", () => {
    expect(engine.getCategory(123 as unknown as string)).toBeNull();
    expect(engine.getStiffness(null as unknown as string)).toBeNull();
    expect(engine.getFriction(undefined as unknown as string)).toBeNull();
    expect(engine.getSafetyFactor(null as unknown as string)).toBeNull();
    expect(engine.getCategoryByCode(123 as unknown as string)).toBeNull();
  });
});

describe("MonolithFixtureDatabaseEngine — search()", () => {
  it("matches category (search 'VISE' finds it)", () => {
    const hits = engine.search("VISE");
    expect(hits.some((h) => h._kind === "category" && h.record.id === "VISE")).toBe(true);
  });

  it("matches stiffness (search 'chuck' finds multiple chuck entries)", () => {
    const hits = engine.search("chuck");
    const chuckStiffness = hits.filter((h) => h._kind === "stiffness");
    expect(chuckStiffness.length).toBeGreaterThanOrEqual(5);
  });

  it("matches friction (search 'jaws' finds diamond/carbide/serrated/smooth/soft)", () => {
    const hits = engine.search("jaws");
    const frictionHits = hits.filter((h) => h._kind === "friction");
    expect(frictionHits.length).toBeGreaterThanOrEqual(5);
  });

  it("matches safety (search 'roughing' finds roughing + heavy_roughing)", () => {
    const hits = engine.search("roughing");
    const safetyHits = hits.filter((h) => h._kind === "safety");
    expect(safetyHits.length).toBeGreaterThanOrEqual(2);
  });

  it("case-insensitive", () => {
    expect(engine.search("vise").length).toBe(engine.search("VISE").length);
  });

  it("returns [] on empty / whitespace", () => {
    expect(engine.search("")).toEqual([]);
    expect(engine.search("   ")).toEqual([]);
  });

  it("returns [] on non-string (adversarial)", () => {
    expect(engine.search(123 as unknown as string)).toEqual([]);
    expect(engine.search(null as unknown as string)).toEqual([]);
  });

  it("respects limit cap", () => {
    expect(engine.search("e", 3).length).toBeLessThanOrEqual(3);
  });

  it("rejects invalid limit", () => {
    expect(engine.search("vise", 0)).toEqual([]);
    expect(engine.search("vise", -1)).toEqual([]);
    expect(engine.search("vise", 1.5)).toEqual([]);
  });

  it("returns [] when no match found", () => {
    expect(engine.search("zz_no_match_zz")).toEqual([]);
  });
});

describe("MonolithFixtureDatabaseEngine — immutability", () => {
  it("listCategories returns fresh array (mutation does not affect store)", () => {
    const a = engine.listCategories();
    const initialLen = a.length;
    a.pop();
    expect(engine.listCategories().length).toBe(initialLen);
  });

  it("listStiffness returns fresh array", () => {
    const a = engine.listStiffness();
    a.pop();
    expect(engine.listStiffness().length).toBe(16);
  });
});
