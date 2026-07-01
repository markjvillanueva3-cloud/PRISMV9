/**
 * MonolithToolTypesDatabaseEngine tests.
 * JULIETT-DB-BRIDGE-MS0/U-DB-MONOLITH-TOOL-TYPES-LOADER.
 *
 * Verifies the TS-typed port of PRISM_TOOL_TYPES_COMPLETE.js carries the
 * full 55 tool-type records across 11 categories from the monolith
 * extraction, and that all query surfaces are fail-soft (never throw).
 */

import { describe, it, expect } from "vitest";
import {
  MonolithToolTypesDatabaseEngine,
  monolithToolTypesDatabaseEngine,
} from "../engines/MonolithToolTypesDatabaseEngine.js";

const engine = monolithToolTypesDatabaseEngine;

describe("MonolithToolTypesDatabaseEngine — data integrity", () => {
  it("exports a singleton matching the class", () => {
    expect(engine).toBeInstanceOf(MonolithToolTypesDatabaseEngine);
  });

  it("loads 55 tool types from the monolith (full coverage)", () => {
    expect(engine.list()).toHaveLength(55);
  });

  it("stats() reports total=55 with all 11 categories represented", () => {
    const s = engine.stats();
    expect(s.total).toBe(55);
    const expected = {
      endmill: 10, facemill: 5, shellmill: 1, drill: 15, reamer: 4,
      boring: 4, threadmill: 4, tap: 5, specialty: 6, engrave: 1,
    };
    for (const [cat, count] of Object.entries(expected)) {
      expect(s.by_category[cat]).toBe(count);
    }
  });

  it("category counts sum to 55 (no orphan records)", () => {
    const sum = Object.values(engine.stats().by_category)
      .reduce((a, b) => a + b, 0);
    expect(sum).toBe(55);
  });

  it("every record has a category + id (no nulls in required fields)", () => {
    for (const t of engine.list()) {
      expect(typeof t.id).toBe("string");
      expect(t.id.length).toBeGreaterThan(0);
      expect(typeof t.category).toBe("string");
    }
  });

  it("named tool types from monolith exist (sentinel keys present)", () => {
    const required = [
      "ENDMILL_FLAT", "ENDMILL_BALL", "ENDMILL_BULLNOSE", "ENDMILL_HIGHFEED",
      "FACEMILL_45", "FACEMILL_90", "SHELLMILL",
      "DRILL_TWIST", "DRILL_GUN", "DRILL_BTA", "DRILL_SPOT", "DRILL_COUNTERSINK",
      "REAMER_TAPER", "BORING_HEAD",
      "THREADMILL_SOLID", "TAP_SPIRAL_FLUTE", "TAP_THREAD_FORMING",
      "SLOT_DRILL", "DOVETAIL_CUTTER", "ENGRAVER", "FLY_CUTTER",
    ];
    for (const id of required) {
      const t = engine.get(id);
      expect(t).not.toBeNull();
      expect(t?.id).toBe(id);
    }
  });

  it("specific monolith values are preserved (ENDMILL_FLAT carries flutes + helix)", () => {
    const ef = engine.get("ENDMILL_FLAT");
    expect(ef?.flutes).toEqual([2, 3, 4, 5, 6]);
    expect(ef?.helix).toEqual([30, 35, 40, 45]);
    expect(ef?.geometry).toBe("flat");
  });

  it("DRILL_BTA has correct l_d_ratio=100 (deep-hole BTA drilling)", () => {
    expect(engine.get("DRILL_BTA")?.l_d_ratio).toBe(100);
  });

  it("DRILL_GUN has l_d_ratio=40 (gun-drilling depth class)", () => {
    expect(engine.get("DRILL_GUN")?.l_d_ratio).toBe(40);
  });

  it("REAMER_TAPER carries the morse/brown_sharpe taper enum", () => {
    expect(engine.get("REAMER_TAPER")?.tapers).toEqual(["morse", "brown_sharpe"]);
  });

  it("DRILL_TWIST has the 4 canonical point angles", () => {
    expect(engine.get("DRILL_TWIST")?.point_angles).toEqual([118, 130, 135, 140]);
  });

  it("ENDMILL_TAPERED has 5-value taper_per_side range", () => {
    expect(engine.get("ENDMILL_TAPERED")?.taper_per_side).toEqual([0.5, 1, 2, 3, 5]);
  });

  it("FACEMILL_45/75/90 carry their lead-angle invariant", () => {
    expect(engine.get("FACEMILL_45")?.lead_angle).toBe(45);
    expect(engine.get("FACEMILL_75")?.lead_angle).toBe(75);
    expect(engine.get("FACEMILL_90")?.lead_angle).toBe(90);
  });

  it("FACEMILL_ROUND carries the round-insert flag", () => {
    expect(engine.get("FACEMILL_ROUND")?.insert).toBe("round");
  });

  it("TAP_FORM is chipless, TAP_THREAD_FORMING is cold-forming", () => {
    expect(engine.get("TAP_FORM")?.chipless).toBe(true);
    expect(engine.get("TAP_THREAD_FORMING")?.cold_forming).toBe(true);
  });
});

describe("MonolithToolTypesDatabaseEngine — get* surface", () => {
  it("get returns null on unknown id (no throw)", () => {
    expect(engine.get("ZZZ_UNKNOWN")).toBeNull();
  });

  it("get returns null on empty string", () => {
    expect(engine.get("")).toBeNull();
  });

  it("get returns null on whitespace-only string", () => {
    expect(engine.get("   ")).toBeNull();
  });

  it("get returns null on non-string input (adversarial)", () => {
    expect(engine.get(123 as unknown as string)).toBeNull();
    expect(engine.get(null as unknown as string)).toBeNull();
  });
});

describe("MonolithToolTypesDatabaseEngine — search()", () => {
  it("returns hits for known category word", () => {
    const hits = engine.search("endmill");
    expect(hits.length).toBeGreaterThanOrEqual(10);
    expect(hits.every((h) => h.category === "endmill")).toBe(true);
  });

  it("is case-insensitive", () => {
    const upper = engine.search("DRILL");
    const lower = engine.search("drill");
    expect(upper.length).toBe(lower.length);
    expect(lower.length).toBeGreaterThanOrEqual(15);
  });

  it("returns [] on empty / whitespace query", () => {
    expect(engine.search("")).toEqual([]);
    expect(engine.search("   ")).toEqual([]);
  });

  it("returns [] on non-string input (R12 adversarial)", () => {
    expect(engine.search(123 as unknown as string)).toEqual([]);
    expect(engine.search(null as unknown as string)).toEqual([]);
    expect(engine.search(undefined as unknown as string)).toEqual([]);
  });

  it("respects limit cap", () => {
    const hits = engine.search("drill", 3);
    expect(hits.length).toBeLessThanOrEqual(3);
  });

  it("rejects invalid limit (≤0 or non-integer) by returning []", () => {
    expect(engine.search("endmill", 0)).toEqual([]);
    expect(engine.search("endmill", -1)).toEqual([]);
    expect(engine.search("endmill", 1.5)).toEqual([]);
  });

  it("returns [] when no match", () => {
    expect(engine.search("zz_no_match_zz")).toEqual([]);
  });

  it("matches geometry field (search 'ball' finds ENDMILL_BALL)", () => {
    const hits = engine.search("ball");
    expect(hits.some((h) => h.id === "ENDMILL_BALL")).toBe(true);
  });

  it("matches type field (search 'gun' finds DRILL_GUN)", () => {
    const hits = engine.search("gun");
    expect(hits.some((h) => h.id === "DRILL_GUN")).toBe(true);
  });
});

describe("MonolithToolTypesDatabaseEngine — filters", () => {
  it("listByCategory('drill') returns 15 records", () => {
    expect(engine.listByCategory("drill")).toHaveLength(15);
  });

  it("listByCategory('endmill') returns 10 records", () => {
    expect(engine.listByCategory("endmill")).toHaveLength(10);
  });

  it("listByCategory('specialty') returns 6 records", () => {
    expect(engine.listByCategory("specialty")).toHaveLength(6);
  });

  it("listCategories returns all 10 distinct categories sorted", () => {
    const cats = engine.listCategories();
    expect(cats).toEqual([
      "boring", "drill", "endmill", "engrave", "facemill",
      "reamer", "shellmill", "specialty", "tap", "threadmill",
    ]);
  });
});

describe("MonolithToolTypesDatabaseEngine — immutability", () => {
  it("list() returns fresh array (mutation does not affect store)", () => {
    const a = engine.list();
    const initialLen = a.length;
    a.pop();
    expect(engine.list().length).toBe(initialLen);
  });
});
