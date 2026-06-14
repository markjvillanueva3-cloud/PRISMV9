/**
 * MonolithWorkholdingDatabaseEngine tests.
 * JULIETT-DB-BRIDGE-MS0/U-DB-MONOLITH-WORKHOLDING-LOADER.
 *
 * Verifies the TS-typed port of PRISM_WORKHOLDING_DATABASE.js carries the
 * full 13 fixture types + 5 products from the monolith extraction, and
 * that all query surfaces are fail-soft on bad input (never throw).
 */

import { describe, it, expect } from "vitest";
import {
  MonolithWorkholdingDatabaseEngine,
  monolithWorkholdingDatabaseEngine,
} from "../engines/MonolithWorkholdingDatabaseEngine.js";

const engine = monolithWorkholdingDatabaseEngine;

describe("MonolithWorkholdingDatabaseEngine — data integrity", () => {
  it("exports a singleton matching the class", () => {
    expect(engine).toBeInstanceOf(MonolithWorkholdingDatabaseEngine);
  });

  it("loads exactly 12 fixture types from the monolith (full coverage)", () => {
    // Ground truth: 12 fixture-type IDs in extracted/workholding/PRISM_WORKHOLDING_DATABASE.js
    // (toe_clamps is a clampingMethod VALUE of fixture_plate, not its own type — the
    // monolith's fixtureTypes block has 12 keys, verified line-by-line against source).
    const types = engine.listFixtureTypes();
    expect(types).toHaveLength(12);
  });

  it("loads exactly 5 specific products from the monolith", () => {
    const products = engine.listProducts();
    expect(products).toHaveLength(5);
  });

  it("stats() reports correct totals (12 + 5 = 17)", () => {
    const s = engine.stats();
    expect(s.fixture_types).toBe(12);
    expect(s.products).toBe(5);
    expect(s.total).toBe(17);
  });

  it("every fixture type has the full schema populated (no nulls in required fields)", () => {
    for (const ft of engine.listFixtureTypes()) {
      expect(typeof ft.id).toBe("string");
      expect(ft.id.length).toBeGreaterThan(0);
      expect(typeof ft.name).toBe("string");
      expect(ft.baseRigidity).toBeGreaterThanOrEqual(0);
      expect(ft.baseRigidity).toBeLessThanOrEqual(1);
      expect(ft.baseDamping).toBeGreaterThanOrEqual(0);
      expect(ft.baseDamping).toBeLessThanOrEqual(1);
      expect(ft.typicalClampingForce.min).toBeLessThanOrEqual(ft.typicalClampingForce.max);
      expect(ft.setupTime).toBeGreaterThan(0);
      expect(ft.repeatability).toBeGreaterThan(0);
    }
  });

  it("every product has manufacturer + model + numeric specs (no nulls in required fields)", () => {
    for (const p of engine.listProducts()) {
      expect(typeof p.id).toBe("string");
      expect(p.manufacturer.length).toBeGreaterThan(0);
      expect(p.model.length).toBeGreaterThan(0);
      expect(p.jawWidth).toBeGreaterThan(0);
      expect(p.maxOpening).toBeGreaterThan(0);
      expect(p.clampingForce).toBeGreaterThan(0);
      expect(p.weight).toBeGreaterThan(0);
      expect(p.rigidityFactor).toBeGreaterThanOrEqual(0);
      expect(p.rigidityFactor).toBeLessThanOrEqual(1);
    }
  });

  it("named fixture types from monolith exist (sentinel keys present)", () => {
    // 12 fixture-type IDs from PRISM_WORKHOLDING_DATABASE.js fixtureTypes block.
    // toe_clamps intentionally EXCLUDED — it's a clampingMethod value of
    // fixture_plate, not its own type record.
    const required = [
      "vise", "hydraulic_vise", "chuck_3jaw", "chuck_6jaw", "collet_chuck",
      "vacuum", "magnetic", "fixture_plate", "tombstone",
      "pallet", "soft_jaws", "expanding_mandrel",
    ];
    for (const id of required) {
      const ft = engine.getFixtureType(id);
      expect(ft).not.toBeNull();
      expect(ft?.id).toBe(id);
    }
    expect(required).toHaveLength(12);
  });

  it("toe_clamps is NOT a fixture type (it's a clampingMethod value of fixture_plate)", () => {
    // R8 anti-regression: a future contributor reading the monolith may
    // mistake toe_clamps for a fixture type. This test pins the boundary.
    expect(engine.getFixtureType("toe_clamps")).toBeNull();
    const fp = engine.getFixtureType("fixture_plate");
    expect(fp?.clampingMethod).toBe("toe_clamps");
  });

  it("named products from monolith exist (sentinel keys present)", () => {
    const required = [
      "kurt_dl640", "kurt_anglock", "schunk_kontec_ks",
      "lang_makro_grip", "miteebite_pitbull",
    ];
    for (const id of required) {
      const p = engine.getProduct(id);
      expect(p).not.toBeNull();
      expect(p?.id).toBe(id);
    }
  });

  it("specific monolith values are preserved (kurt_dl640 has clampingForce=40000)", () => {
    const kurt = engine.getProduct("kurt_dl640");
    expect(kurt).not.toBeNull();
    expect(kurt?.clampingForce).toBe(40000);
    expect(kurt?.manufacturer).toBe("Kurt");
    expect(kurt?.jawWidth).toBe(152);
  });

  it("Schunk hydraulic vise has the right type+force from monolith", () => {
    const schunk = engine.getProduct("schunk_kontec_ks");
    expect(schunk?.type).toBe("hydraulic_vise");
    expect(schunk?.clampingForce).toBe(55000);
  });

  it("Lang Makro-Grip 5-axis flag preserved", () => {
    const lang = engine.getProduct("lang_makro_grip");
    expect(lang?.fiveAxisCapable).toBe(true);
  });

  it("Mitee-Bite lowProfile flag preserved", () => {
    const mb = engine.getProduct("miteebite_pitbull");
    expect(mb?.lowProfile).toBe(true);
  });
});

describe("MonolithWorkholdingDatabaseEngine — get* surface", () => {
  it("getFixtureType returns null on unknown id (no throw)", () => {
    expect(engine.getFixtureType("ZZZ_UNKNOWN")).toBeNull();
  });

  it("getProduct returns null on unknown id (no throw)", () => {
    expect(engine.getProduct("ZZZ_UNKNOWN")).toBeNull();
  });

  it("getFixtureType returns null on empty string", () => {
    expect(engine.getFixtureType("")).toBeNull();
  });
});

describe("MonolithWorkholdingDatabaseEngine — search()", () => {
  it("returns hits for known fixture type word", () => {
    const hits = engine.search("vacuum");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => h._kind === "fixture_type" && h.id === "vacuum")).toBe(true);
  });

  it("returns hits for known manufacturer", () => {
    const hits = engine.search("Kurt");
    expect(hits.length).toBeGreaterThanOrEqual(2);
    expect(hits.every((h) => h._kind === "product" || h._kind === "fixture_type")).toBe(true);
  });

  it("is case-insensitive", () => {
    const upper = engine.search("KURT");
    const lower = engine.search("kurt");
    expect(upper.length).toBe(lower.length);
  });

  it("returns [] on empty query", () => {
    expect(engine.search("")).toEqual([]);
    expect(engine.search("   ")).toEqual([]);
  });

  it("returns [] on non-string input (R12 adversarial)", () => {
    expect(engine.search(123 as unknown as string)).toEqual([]);
    expect(engine.search(null as unknown as string)).toEqual([]);
    expect(engine.search(undefined as unknown as string)).toEqual([]);
  });

  it("respects limit cap", () => {
    const hits = engine.search("a", 3);
    expect(hits.length).toBeLessThanOrEqual(3);
  });

  it("rejects invalid limit (≤0 or non-integer) by returning []", () => {
    expect(engine.search("vise", 0)).toEqual([]);
    expect(engine.search("vise", -1)).toEqual([]);
    expect(engine.search("vise", 1.5)).toEqual([]);
  });

  it("returns [] when no match found", () => {
    expect(engine.search("zz_definitely_no_match_zz")).toEqual([]);
  });

  it("each hit carries a _kind discriminator", () => {
    const hits = engine.search("chuck");
    for (const h of hits) {
      expect(h._kind === "fixture_type" || h._kind === "product").toBe(true);
    }
  });
});

describe("MonolithWorkholdingDatabaseEngine — category + manufacturer filters", () => {
  it("listByCategory('turning') returns 3 fixture types (3jaw + 6jaw + collet)", () => {
    const turning = engine.listByCategory("turning");
    expect(turning).toHaveLength(3);
    const ids = turning.map((t) => t.id).sort();
    expect(ids).toEqual(["chuck_3jaw", "chuck_6jaw", "collet_chuck"]);
  });

  it("listByCategory('specialty') returns vacuum + magnetic", () => {
    const specialty = engine.listByCategory("specialty");
    expect(specialty.map((t) => t.id).sort()).toEqual(["magnetic", "vacuum"]);
  });

  it("listByManufacturer is case-insensitive", () => {
    const upper = engine.listByManufacturer("KURT");
    const lower = engine.listByManufacturer("kurt");
    expect(upper.length).toBe(lower.length);
    expect(upper.length).toBe(2); // kurt_dl640 + kurt_anglock
  });

  it("listByManufacturer returns [] on empty/whitespace input", () => {
    expect(engine.listByManufacturer("")).toEqual([]);
    expect(engine.listByManufacturer("   ")).toEqual([]);
  });

  it("listByManufacturer returns [] on unknown manufacturer", () => {
    expect(engine.listByManufacturer("UnknownCo")).toEqual([]);
  });
});

describe("MonolithWorkholdingDatabaseEngine — immutability check", () => {
  it("listFixtureTypes returns fresh array (mutation does not affect store)", () => {
    const a = engine.listFixtureTypes();
    const initialLen = a.length;
    a.pop(); // mutate the returned array
    const b = engine.listFixtureTypes();
    expect(b.length).toBe(initialLen);
  });

  it("listProducts returns fresh array (mutation does not affect store)", () => {
    const a = engine.listProducts();
    const initialLen = a.length;
    a.pop();
    const b = engine.listProducts();
    expect(b.length).toBe(initialLen);
  });
});
