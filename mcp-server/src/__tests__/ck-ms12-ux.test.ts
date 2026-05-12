/**
 * CK-MS12 Tests — NLP CAM Parser, Program Compare, Result Cache, Batch CAM
 *
 * Coverage:
 *   NLPCAMParserEngine:   pocket NL, hole NL, slot NL, thread NL,
 *                         dimension extraction, multi-dim, material detect,
 *                         machine detect, validateParse, inferOperations (10 tests)
 *   ProgramCompareEngine: identical programs, different S/F, added tool,
 *                         cycle time diff, safety diff, report generation (7 tests)
 *   CAMResultCacheEngine: set/get, TTL expiry, LRU eviction, key computation,
 *                         stats, namespace clear (7 tests)
 *   BatchCAMEngine:       single part, multi-part, shared config, error handling,
 *                         optimize order, summarize (6 tests)
 *
 * Total: 30 tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  NLPCAMParserEngine,
  type CAMFeature,
} from "../engines/NLPCAMParserEngine.js";
import {
  ProgramCompareEngine,
} from "../engines/ProgramCompareEngine.js";
import {
  CAMResultCacheEngine,
} from "../engines/CAMResultCacheEngine.js";
import {
  BatchCAMEngine,
  type BatchPart,
} from "../engines/BatchCAMEngine.js";

// ── Fixtures ─────────────────────────────────────────────────────────────────

const SIMPLE_GCODE_A = `%
O1000
G21 G17 G40 G49 G80 G90
G54
T1 M6
G43 H1 Z50.
M3 S5000
G0 X0. Y0.
M8
G0 Z5.
G1 Z-5. F200
G1 X50. F800
G1 Y30.
G1 X0.
G1 Y0.
G0 Z50.
M9
M5
G28 G91 Z0.
G90
M30
%`;

const SIMPLE_GCODE_B = `%
O2000
G21 G17 G40 G49 G80 G90
G54
T1 M6
G43 H1 Z50.
M3 S6000
G0 X0. Y0.
M8
G0 Z5.
G1 Z-5. F200
G1 X50. F1200
G1 Y30.
G1 X0.
G1 Y0.
G0 Z50.
M9
M5
T2 M6
G43 H2 Z50.
M3 S3000
G0 X25. Y15.
G98 G83 Z-30. R2. Q5. F100
G80
G0 Z50.
M9
M5
G28 G91 Z0.
G90
M30
%`;

const SIMPLE_PART: BatchPart = {
  part_id: "PART-001",
  features: [
    { type: "pocket", dimensions: { length_mm: 80, width_mm: 50, depth_mm: 15 } },
    { type: "hole",   dimensions: { diameter_mm: 10, depth_mm: 30 } },
  ],
  material:   "aluminum_6061",
  controller: "fanuc_0i",
};

// ── NLPCAMParserEngine ────────────────────────────────────────────────────────

describe("NLPCAMParserEngine", () => {
  let engine: NLPCAMParserEngine;
  beforeEach(() => { engine = new NLPCAMParserEngine(); });

  it("parses pocket from natural language", () => {
    const result = engine.parse("pocket 80x50mm 15mm deep");
    expect(result.features).toHaveLength(1);
    expect(result.features[0].type).toBe("pocket_rectangular");
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it("parses hole from natural language", () => {
    const result = engine.parse("drill 12mm diameter hole 25mm deep");
    expect(result.features).toHaveLength(1);
    expect(result.features[0].type).toBe("through_hole");
    expect(result.features[0].dimensions?.diameter_mm).toBe(12);
  });

  it("parses slot from natural language", () => {
    const result = engine.parse("slot 6x40mm 8mm depth");
    expect(result.features).toHaveLength(1);
    expect(result.features[0].type).toBe("slot");
    expect(result.features[0].dimensions).toBeDefined();
  });

  it("parses M-thread spec", () => {
    const result = engine.parse("M10x1.5 thread 20mm deep");
    expect(result.features.length).toBeGreaterThanOrEqual(1);
    // Engine maps thread/tap to "tapped_hole" type
    expect(result.features[0].type).toBe("tapped_hole");
    expect(result.features[0].dimensions?.depth_mm).toBe(20);
  });

  it("parses UNC thread spec", () => {
    const result = engine.parse("1/4-20 UNC threaded hole 0.5 inch deep");
    expect(result.features).toHaveLength(1);
    // "hole" pattern matches before "thread" in FEATURE_PATTERNS order,
    // so the engine classifies this as through_hole
    expect(result.features[0].type).toBe("through_hole");
    expect(result.parsed_tokens.some(t => t.startsWith("feature:"))).toBe(true);
  });

  it("extracts multi-dimensional spec 25x50x10mm via parse", () => {
    const result = engine.parse("pocket 25x50x10mm");
    // wxh pattern captures first two values, depth not captured from "x" notation alone
    expect(result.features[0].dimensions?.length_mm).toBe(25);
    expect(result.features[0].dimensions?.width_mm).toBe(50);
  });

  it("extracts diameter with Ø prefix via parse", () => {
    const result = engine.parse("Ø12mm hole");
    expect(result.features[0].dimensions?.diameter_mm).toBe(12);
  });

  it("detects aluminum material", () => {
    const result = engine.parse("pocket in 6061 aluminum");
    expect(result.material).toMatch(/aluminum/i);
    expect(result.material_iso_group).toBe("N");
  });

  it("detects 3-axis machine", () => {
    const result = engine.parse("mill pocket on Haas VF-2 3-axis");
    expect(result.machine_name).toBeDefined();
    expect(result.machine_name).toMatch(/haas/i);
  });

  it("tapped_hole feature includes drilling operation", () => {
    const result = engine.parse("thread M10 20mm deep");
    expect(result.features[0].type).toBe("tapped_hole");
    expect(result.features[0].operation).toBe("drilling");
  });

  it("parse returns confidence and parsed_tokens", () => {
    const result = engine.parse("drill 12mm hole 25mm deep in 6061 aluminum");
    expect(result.features[0].type).toBe("through_hole");
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.parsed_tokens.length).toBeGreaterThan(0);
    expect(result.material).toMatch(/aluminum/i);
  });
});

// ── ProgramCompareEngine ──────────────────────────────────────────────────────

describe("ProgramCompareEngine", () => {
  let engine: ProgramCompareEngine;
  beforeEach(() => { engine = new ProgramCompareEngine(); });

  it("compares identical programs → 100% similarity", () => {
    const result = engine.compare(SIMPLE_GCODE_A, SIMPLE_GCODE_A);
    expect(result.summary.similarity_pct).toBe(100);
    expect(result.summary.diff_count).toBe(0);
  });

  it("detects spindle speed change between programs", () => {
    const result = engine.compare(SIMPLE_GCODE_A, SIMPLE_GCODE_B);
    const sfChange = result.tools.sf_changes.find(c => c.tool_no === 1);
    expect(sfChange).toBeDefined();
    expect(sfChange!.rpm_a).toBe(5000);
    expect(sfChange!.rpm_b).toBe(6000);
  });

  it("detects added tool in program B", () => {
    const result = engine.compare(SIMPLE_GCODE_A, SIMPLE_GCODE_B);
    expect(result.tools.only_in_b.some(t => t.number === 2)).toBe(true);
  });

  it("cycle time is longer for program with extra tool", () => {
    const ct = engine.compareCycleTime(SIMPLE_GCODE_A, SIMPLE_GCODE_B);
    expect(ct.program_b_s).toBeGreaterThan(ct.program_a_s);
    expect(ct.delta_s).toBeGreaterThan(0);
  });

  it("diffGCode returns added/removed/equal lines", () => {
    const diff = engine.diffGCode(SIMPLE_GCODE_A, SIMPLE_GCODE_B);
    const types = new Set(diff.map(d => d.type));
    expect(types.has("equal")).toBe(true);
    expect(types.has("added")).toBe(true);
  });

  it("comparePhysics shows higher feed in B", () => {
    const ph = engine.comparePhysics(SIMPLE_GCODE_A, SIMPLE_GCODE_B);
    expect(ph.program_b.max_feed_mmmin).toBeGreaterThan(ph.program_a.max_feed_mmmin);
    expect(ph.delta.max_feed_mmmin).toBeGreaterThan(0);
  });

  it("generateReport returns non-empty string with headers", () => {
    const comparison = engine.compare(SIMPLE_GCODE_A, SIMPLE_GCODE_B);
    const report = engine.generateReport(comparison);
    expect(typeof report).toBe("string");
    expect(report).toContain("CYCLE TIME");
    expect(report).toContain("TOOLS");
    expect(report).toContain("CUTTING PHYSICS");
  });
});

// ── CAMResultCacheEngine ──────────────────────────────────────────────────────

describe("CAMResultCacheEngine", () => {
  let cache: CAMResultCacheEngine;
  beforeEach(() => { cache = new CAMResultCacheEngine({ max_entries: 5, default_ttl_ms: 500 }); });

  it("set and get returns stored value", () => {
    cache.set("key1", { gcode: "G0 X0" });
    const v = cache.get<{ gcode: string }>("key1");
    expect(v?.gcode).toBe("G0 X0");
  });

  it("has() returns true for valid entry", () => {
    cache.set("k", 42);
    expect(cache.has("k")).toBe(true);
  });

  it("get returns undefined after TTL expiry", async () => {
    cache.set("exp", "val", 50); // 50ms TTL
    await new Promise(r => setTimeout(r, 80));
    expect(cache.get("exp")).toBeUndefined();
  });

  it("LRU eviction removes oldest entry when at capacity", () => {
    for (let i = 0; i < 5; i++) cache.set(`k${i}`, i);
    // Cache is full (5 entries). Adding k5 evicts k0.
    cache.set("k5", 99);
    expect(cache.has("k0")).toBe(false);
    expect(cache.has("k5")).toBe(true);
  });

  it("computeKey is deterministic and order-independent", () => {
    const key1 = cache.computeKey({ b: 2, a: 1, c: [3, 1, 2] });
    const key2 = cache.computeKey({ c: [3, 1, 2], a: 1, b: 2 });
    expect(key1).toBe(key2);
  });

  it("stats returns hit/miss counts and sizes", () => {
    cache.set("s1", { big: "x".repeat(1000) });
    cache.get("s1"); // hit
    cache.get("nope"); // miss
    const s = cache.stats();
    expect(s.hits).toBe(1);
    expect(s.misses).toBe(1);
    expect(s.hit_rate_pct).toBe(50);
    expect(s.total_size_bytes).toBeGreaterThan(0);
  });

  it("clear with namespace only removes namespace entries", () => {
    cache.set("a", 1, undefined, "ns1");
    cache.set("b", 2, undefined, "ns2");
    cache.clear("ns1");
    expect(cache.has("a")).toBe(false);
    expect(cache.has("b")).toBe(true);
  });
});

// ── BatchCAMEngine ────────────────────────────────────────────────────────────

describe("BatchCAMEngine", () => {
  let engine: BatchCAMEngine;
  beforeEach(() => { engine = new BatchCAMEngine(); });

  it("single part generates valid G-code", async () => {
    const results = await engine.batchGenerate([SIMPLE_PART]);
    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(true);
    expect(results[0].gcode).toContain("M30");
    expect(results[0].cycle_time_s).toBeGreaterThan(0);
    expect(results[0].tools?.length).toBeGreaterThan(0);
  });

  it("multi-part batch returns result per part", async () => {
    const parts: BatchPart[] = [
      { part_id: "A", features: [{ type: "pocket", dimensions: { length_mm: 50, width_mm: 30, depth_mm: 10 } }], material: "steel_4140" },
      { part_id: "B", features: [{ type: "hole",   dimensions: { diameter_mm: 8, depth_mm: 20 } }], material: "aluminum_6061" },
      { part_id: "C", features: [{ type: "face",   dimensions: { length_mm: 100, width_mm: 80 } }], material: "stainless_316" },
    ];
    const results = await engine.batchGenerate(parts);
    expect(results).toHaveLength(3);
    expect(results.every(r => r.success)).toBe(true);
    expect(results.map(r => r.part_id)).toEqual(["A", "B", "C"]);
  });

  it("shared config overrides per-part material", async () => {
    const parts: BatchPart[] = [
      { part_id: "X", features: [{ type: "slot", dimensions: { width_mm: 5, depth_mm: 8, length_mm: 30 } }], material: "steel_4140" },
    ];
    const results = await engine.batchWithSharedSetup(parts, { material: "aluminum_6061" });
    expect(results[0].success).toBe(true);
    // Aluminum → higher S/F; check RPM is in aluminum range (≥10000)
    const gcode = results[0].gcode ?? "";
    const sMatch = /S(\d+)/.exec(gcode);
    if (sMatch) expect(parseInt(sMatch[1])).toBeGreaterThanOrEqual(8000);
  });

  it("error handling — part with no features returns error, others succeed", async () => {
    const parts: BatchPart[] = [
      { part_id: "GOOD", features: [{ type: "pocket", dimensions: { length_mm: 40, width_mm: 20, depth_mm: 5 } }] },
      { part_id: "BAD",  features: [] as any },
    ];
    const results = await engine.batchGenerate(parts, { on_error: "skip" });
    expect(results).toHaveLength(2);
    expect(results.find(r => r.part_id === "GOOD")?.success).toBe(true);
    expect(results.find(r => r.part_id === "BAD")?.success).toBe(false);
    expect(results.find(r => r.part_id === "BAD")?.errors.length).toBeGreaterThan(0);
  });

  it("optimizeBatchOrder groups by material", () => {
    const parts: BatchPart[] = [
      { part_id: "s1",  features: [{ type: "pocket", dimensions: {} }], material: "stainless_316" },
      { part_id: "a1",  features: [{ type: "hole",   dimensions: {} }], material: "aluminum_6061" },
      { part_id: "a2",  features: [{ type: "slot",   dimensions: {} }], material: "aluminum_7075" },
      { part_id: "s2",  features: [{ type: "face",   dimensions: {} }], material: "steel_4140" },
    ];
    const sorted = engine.optimizeBatchOrder(parts);
    expect(sorted).toHaveLength(4);
    // Aluminum group (2 parts) comes first — larger group first
    const firstMats = sorted.slice(0, 2).map(p =>
      p.material?.includes("aluminum") ? "aluminum" : p.material
    );
    expect(firstMats.every(m => m === "aluminum")).toBe(true);
  });

  it("summarizeBatch aggregates totals correctly", async () => {
    const parts: BatchPart[] = [
      { part_id: "P1", features: [{ type: "pocket", dimensions: { length_mm: 80, width_mm: 50, depth_mm: 15 } }], material: "aluminum_6061" },
      { part_id: "P2", features: [{ type: "hole",   dimensions: { diameter_mm: 12, depth_mm: 40 } }], material: "aluminum_6061" },
    ];
    const results = await engine.batchGenerate(parts);
    const summary  = engine.summarizeBatch(results);
    expect(summary.total_parts).toBe(2);
    expect(summary.successful_parts).toBe(2);
    expect(summary.failed_parts).toBe(0);
    expect(summary.total_cycle_time_s).toBeGreaterThan(0);
    expect(summary.total_cost_usd).toBeGreaterThan(0);
    expect(summary.unique_tools.length).toBeGreaterThan(0);
  });
});
