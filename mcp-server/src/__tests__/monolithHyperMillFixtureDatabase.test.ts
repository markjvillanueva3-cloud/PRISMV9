/**
 * MonolithHyperMillFixtureDatabaseEngine round-trip tests.
 * JULIETT-DB-BRIDGE-MS0/U-DB-MONOLITH-HYPERMILL-FIXTURE-LOADER.
 *
 * Pins the monolith data (PRISM_HYPERMILL_FIXTURE_DATABASE.js) byte-for-byte
 * so a future contributor noticing the source file CAN'T silently drift from
 * the typed port. All assertions check concrete values.
 */

import { describe, it, expect } from "vitest";
import {
  MonolithHyperMillFixtureDatabaseEngine,
  monolithHyperMillFixtureDatabaseEngine,
} from "../engines/MonolithHyperMillFixtureDatabaseEngine.js";

const engine = monolithHyperMillFixtureDatabaseEngine;

describe("MonolithHyperMillFixtureDatabaseEngine — data integrity (monolith-faithful)", () => {
  it("ships exactly 6 vises (3 centric + 3 standard) per source lines 4-15", () => {
    const v = engine.listVises();
    expect(v).toHaveLength(6);
    expect(v.filter((x) => x.family === "centric")).toHaveLength(3);
    expect(v.filter((x) => x.family === "standard")).toHaveLength(3);
  });

  it("ships exactly 7 chucks (3 three-jaw + 1 four-jaw + 3 collet) per source lines 16-30", () => {
    const c = engine.listChucks();
    expect(c).toHaveLength(7);
    expect(c.filter((x) => x.family === "three_jaw")).toHaveLength(3);
    expect(c.filter((x) => x.family === "four_jaw")).toHaveLength(1);
    expect(c.filter((x) => x.family === "collet")).toHaveLength(3);
  });

  it("ships exactly 3 clamp families (step + simple + toe) per source lines 31-48", () => {
    const cl = engine.listClamps();
    expect(cl).toHaveLength(3);
    expect(cl.map((x) => x.family).sort()).toEqual(["simple", "step", "toe"]);
  });

  it("Centric_6-500 preserves monolith fields exactly", () => {
    const v = engine.getVise("Centric_6-500");
    expect(v).toEqual({
      id: "Centric_6-500", family: "centric", type: "Centric Vise",
      jawWidth: 120, minY: 300, maxY: 500, baseHeight: 50,
    });
  });

  it("Standard_8-200 preserves monolith fields exactly", () => {
    const v = engine.getVise("Standard_8-200");
    expect(v).toEqual({
      id: "Standard_8-200", family: "standard", type: "Standard Vise",
      jawWidth: 200, maxOpening: 200, baseHeight: 60,
    });
  });

  it("5C_Collet preserves monolith fields exactly (minDia=1, maxDia=26.5)", () => {
    const c = engine.getChuck("5C_Collet");
    expect(c?.colletType).toBe("5C");
    expect(c?.minDia).toBe(1);
    expect(c?.maxDia).toBe(26.5);
  });

  it("3_Jaw_Chuck_20-600 preserves monolith fields exactly", () => {
    const c = engine.getChuck("3_Jaw_Chuck_20-600");
    expect(c).toEqual({
      id: "3_Jaw_Chuck_20-600", family: "three_jaw", type: "3-Jaw Chuck",
      minDia: 20, maxDia: 600, jawStroke: 20,
    });
  });

  it("step clamps carry 7 sizes + 4 projections + Hardened Steel + Black Oxide", () => {
    const step = engine.listClamps().find((c) => c.family === "step");
    expect(step?.sizes).toHaveLength(7);
    expect(step?.projections).toHaveLength(4);
    expect(step?.material).toBe("Hardened Steel");
    expect(step?.finish).toBe("Black Oxide");
  });

  it("toe clamps carry application string and 3 sizes (no projections — projection key omitted)", () => {
    const toe = engine.listClamps().find((c) => c.family === "toe");
    expect(toe?.application).toBe("Low-profile clamping");
    expect(toe?.sizes).toEqual(["Small", "Medium", "Large"]);
    expect(Object.prototype.hasOwnProperty.call(toe ?? {}, "projections")).toBe(false);
  });
});

describe("MonolithHyperMillFixtureDatabaseEngine — autoSelect (monolith selection logic)", () => {
  it("selectVise: ≤200 → Centric_6-200 (boundary)", () => {
    expect(engine.selectVise({ x: 200, y: 150, z: 50 })).toBe("Centric_6-200");
    expect(engine.selectVise({ x: 0, y: 0, z: 0 })).toBe("Centric_6-200");
  });

  it("selectVise: 201..300 → Centric_6-300", () => {
    expect(engine.selectVise({ x: 250, y: 100, z: 50 })).toBe("Centric_6-300");
    expect(engine.selectVise({ x: 100, y: 300, z: 50 })).toBe("Centric_6-300");
  });

  it("selectVise: >300 → Centric_6-500", () => {
    expect(engine.selectVise({ x: 400, y: 100, z: 50 })).toBe("Centric_6-500");
    expect(engine.selectVise({ x: 100, y: 500, z: 50 })).toBe("Centric_6-500");
  });

  it("selectChuck: ≤150 → 3_Jaw_Chuck_20-150", () => {
    expect(engine.selectChuck({ x: 100, y: 100, z: 50 })).toBe("3_Jaw_Chuck_20-150");
  });

  it("selectChuck: 151..400 → 3_Jaw_Chuck_20-400", () => {
    expect(engine.selectChuck({ x: 300, y: 200, z: 50 })).toBe("3_Jaw_Chuck_20-400");
  });

  it("selectChuck: >400 → 3_Jaw_Chuck_20-600", () => {
    expect(engine.selectChuck({ x: 500, y: 100, z: 50 })).toBe("3_Jaw_Chuck_20-600");
  });

  it("selectClamp: ≤48 → 080-020 / 06-48", () => {
    expect(engine.selectClamp({ x: 100, y: 100, z: 25 })).toEqual({
      size: "080-020", projection: "06-48",
    });
  });

  it("selectClamp: 49..112 → 080-040 / 70-112", () => {
    expect(engine.selectClamp({ x: 100, y: 100, z: 100 })).toEqual({
      size: "080-040", projection: "70-112",
    });
  });

  it("selectClamp: >112 → 120-050 / 120-267", () => {
    expect(engine.selectClamp({ x: 100, y: 100, z: 200 })).toEqual({
      size: "120-050", projection: "120-267",
    });
  });

  it("autoSelect: composite for representative die part (250×150×80)", () => {
    const r = engine.autoSelect({ x: 250, y: 150, z: 80 });
    expect(r.vise).toBe("Centric_6-300");
    expect(r.chuck).toBe("3_Jaw_Chuck_20-400");
    expect(r.clamp).toEqual({ size: "080-040", projection: "70-112" });
  });

  it("autoSelect: NaN dims → all-null result (R12 fail-soft, never throws)", () => {
    const r = engine.autoSelect({ x: NaN, y: NaN, z: NaN });
    expect(r).toEqual({ vise: null, chuck: null, clamp: null });
  });

  it("autoSelect: negative dims → all-null (R12 adversarial)", () => {
    const r = engine.autoSelect({ x: -10, y: -10, z: -5 });
    expect(r).toEqual({ vise: null, chuck: null, clamp: null });
  });

  it("autoSelect: x/y valid but z invalid → vise+chuck set, clamp null (per-axis isolation)", () => {
    const r = engine.autoSelect({ x: 100, y: 100, z: NaN });
    expect(r.vise).toBe("Centric_6-200");
    expect(r.chuck).toBe("3_Jaw_Chuck_20-150");
    expect(r.clamp).toBe(null);
  });
});

describe("MonolithHyperMillFixtureDatabaseEngine — get* + search", () => {
  it("getVise unknown id returns null", () => {
    expect(engine.getVise("NONEXISTENT")).toBe(null);
  });

  it("getVise empty/whitespace returns null", () => {
    expect(engine.getVise("")).toBe(null);
    expect(engine.getVise("   ")).toBe(null);
  });

  it("getChuck unknown id returns null", () => {
    expect(engine.getChuck("NONEXISTENT")).toBe(null);
  });

  it("search 'centric' matches all 3 centric vises", () => {
    const hits = engine.search("centric");
    expect(hits.filter((h) => h._kind === "vise")).toHaveLength(3);
  });

  it("search 'collet' matches all 3 collet chucks", () => {
    const hits = engine.search("collet");
    expect(hits.filter((h) => h._kind === "chuck")).toHaveLength(3);
  });

  it("search '5C' matches the 5C collet chuck via colletType field", () => {
    const hits = engine.search("5C");
    const ids = hits.map((h) => h.id);
    expect(ids).toContain("5C_Collet");
  });

  it("search respects limit cap", () => {
    const hits = engine.search("c", 3);
    expect(hits.length).toBeLessThanOrEqual(3);
  });

  it("search empty/whitespace returns []", () => {
    expect(engine.search("")).toEqual([]);
    expect(engine.search("   ")).toEqual([]);
  });

  it("search invalid limit returns []", () => {
    expect(engine.search("centric", 0)).toEqual([]);
    expect(engine.search("centric", -1)).toEqual([]);
    expect(engine.search("centric", 3.5)).toEqual([]);
  });

  it("search no-match returns []", () => {
    expect(engine.search("ZZZ_NONEXISTENT_FIXTURE_FAMILY")).toEqual([]);
  });
});

describe("MonolithHyperMillFixtureDatabaseEngine — stats + immutability", () => {
  it("stats returns 6 vises + 7 chucks + 3 clamps + total 16", () => {
    expect(engine.stats()).toEqual({
      vises: 6, chucks: 7, clamp_families: 3, total: 16,
    });
  });

  it("fresh instance returns identical stats (data is module-scoped, not instance)", () => {
    const fresh = new MonolithHyperMillFixtureDatabaseEngine();
    expect(fresh.stats()).toEqual(engine.stats());
    expect(fresh.listVises()).toEqual(engine.listVises());
  });

  it("immutability: mutating returned vise list doesn't affect store", () => {
    const a = engine.listVises();
    a.pop();
    expect(engine.listVises()).toHaveLength(6);
  });

  it("immutability: mutating returned clamp list doesn't affect store", () => {
    const a = engine.listClamps();
    a.pop();
    expect(engine.listClamps()).toHaveLength(3);
  });
});
