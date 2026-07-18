/**
 * U-WIRE-LATHE-PART-COST — wiring-gate test
 * ===========================================
 *
 * Verifies `lathe_part_cost_compute` + `lathe_part_cost_stats` are exposed
 * on the turning dispatcher and route correctly to the matching
 * `LathePartCostModelEngine` methods.
 *
 * @module __tests__/U-WIRE-LATHE-PART-COST
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  lathePartCostModelEngine,
  type LathePartCostInput,
  type LathePartCostResult,
} from "../engines/LathePartCostModelEngine.js";
import { TURNING_ACTION_SCHEMAS } from "../schemas/turningActionSchemas.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DISPATCHER_SRC = readFileSync(
  join(__dirname, "..", "tools", "dispatchers", "turningDispatcher.ts"),
  "utf-8"
);
const SCHEMA_MAP = TURNING_ACTION_SCHEMAS as Record<string, { safeParse: (v: unknown) => { success: boolean } }>;

// Canonical small-batch JM Die part: 2-min cycle, 2 ops, $90/hr loaded rate, $4/kg 4140, scrap 2%.
const CANONICAL_INPUT: LathePartCostInput = {
  cycle_time_s: 120,
  machine_rate_per_hr: 90,
  operations: [
    { op: "rough_turn", cycle_time_s: 70, tool_life_s: 3600, insert_cost: 8, edges_per_insert: 4 },
    { op: "finish_turn", cycle_time_s: 50, tool_life_s: 7200, insert_cost: 12, edges_per_insert: 4 },
  ],
  part_mass_kg: 0.5,
  waste_mass_kg: 0.15,
  material_price_per_kg: 4,
  setup_time_s: 1800,
  setup_rate_per_hr: 60,
  batch_size: 50,
  scrap_rate: 0.02,
  spindle_power_kw: 5,
  energy_price_per_kwh: 0.12,
};

describe("U-WIRE-LATHE-PART-COST — turning-dispatcher wiring", () => {
  it("registers lathe_part_cost_compute with working safeParse on canonical input", () => {
    const schema = SCHEMA_MAP["lathe_part_cost_compute"];
    if (!schema) throw new Error("lathe_part_cost_compute missing from TURNING_ACTION_SCHEMAS");
    expect(schema.safeParse(CANONICAL_INPUT).success).toBe(true);
  });

  it("registers lathe_part_cost_stats with working safeParse on empty input", () => {
    const schema = SCHEMA_MAP["lathe_part_cost_stats"];
    if (!schema) throw new Error("lathe_part_cost_stats missing");
    expect(schema.safeParse({}).success).toBe(true);
  });

  it("rejects compute input with batch_size = 0 (engine throws on this — schema must catch first)", () => {
    expect(SCHEMA_MAP["lathe_part_cost_compute"]!.safeParse({ ...CANONICAL_INPUT, batch_size: 0 }).success).toBe(false);
  });

  it("rejects compute input with non-integer batch_size", () => {
    expect(SCHEMA_MAP["lathe_part_cost_compute"]!.safeParse({ ...CANONICAL_INPUT, batch_size: 1.5 }).success).toBe(false);
  });

  it("rejects compute input with scrap_rate out of [0,1]", () => {
    expect(SCHEMA_MAP["lathe_part_cost_compute"]!.safeParse({ ...CANONICAL_INPUT, scrap_rate: -0.1 }).success).toBe(false);
    expect(SCHEMA_MAP["lathe_part_cost_compute"]!.safeParse({ ...CANONICAL_INPUT, scrap_rate: 1.5 }).success).toBe(false);
  });

  it("rejects compute input missing required operations array", () => {
    const bad: Partial<LathePartCostInput> = { ...CANONICAL_INPUT };
    delete (bad as { operations?: unknown }).operations;
    expect(SCHEMA_MAP["lathe_part_cost_compute"]!.safeParse(bad).success).toBe(false);
  });

  it("rejects an operation with zero edges_per_insert (would crash engine division)", () => {
    const bad: LathePartCostInput = {
      ...CANONICAL_INPUT,
      operations: [{ op: "x", cycle_time_s: 10, tool_life_s: 60, insert_cost: 5, edges_per_insert: 0 }],
    };
    expect(SCHEMA_MAP["lathe_part_cost_compute"]!.safeParse(bad).success).toBe(false);
  });

  // Dispatcher source surface
  it("dispatcher contains BOTH action name AND case block for lathe_part_cost_compute", () => {
    expect(DISPATCHER_SRC.includes('"lathe_part_cost_compute"')).toBe(true);
    expect(DISPATCHER_SRC.includes('case "lathe_part_cost_compute":')).toBe(true);
  });

  it("dispatcher contains BOTH action name AND case block for lathe_part_cost_stats", () => {
    expect(DISPATCHER_SRC.includes('"lathe_part_cost_stats"')).toBe(true);
    expect(DISPATCHER_SRC.includes('case "lathe_part_cost_stats":')).toBe(true);
  });

  it("compute case routes to .compute (not the sibling getStats)", () => {
    const startIdx = DISPATCHER_SRC.indexOf('case "lathe_part_cost_compute":');
    if (startIdx < 0) throw new Error("compute case missing");
    const endIdx = DISPATCHER_SRC.indexOf('case "', startIdx + 'case "lathe_part_cost_compute":'.length);
    const block = DISPATCHER_SRC.slice(startIdx, endIdx > 0 ? endIdx : startIdx + 4000);
    expect(block.includes("lathePartCostModelEngine.compute(")).toBe(true);
    if (block.includes("lathePartCostModelEngine.getStats(")) {
      throw new Error("compute case wired to getStats — must call compute");
    }
  });

  it("stats case routes to .getStats (not the sibling compute)", () => {
    const startIdx = DISPATCHER_SRC.indexOf('case "lathe_part_cost_stats":');
    if (startIdx < 0) throw new Error("stats case missing");
    const endIdx = DISPATCHER_SRC.indexOf('case "', startIdx + 'case "lathe_part_cost_stats":'.length);
    const block = DISPATCHER_SRC.slice(startIdx, endIdx > 0 ? endIdx : startIdx + 4000);
    expect(block.includes("lathePartCostModelEngine.getStats(")).toBe(true);
    if (block.includes("lathePartCostModelEngine.compute(")) {
      throw new Error("stats case wired to compute — must call getStats");
    }
  });
});

describe("U-WIRE-LATHE-PART-COST — engine semantic round-trip", () => {
  it("produces all 7 buckets with non-negative numeric values", () => {
    const r: LathePartCostResult = lathePartCostModelEngine.compute(CANONICAL_INPUT);
    const buckets: Array<keyof LathePartCostResult["buckets"]> = ["machine", "tool", "material", "setup", "quality", "energy", "secondary"];
    for (const b of buckets) {
      expect(typeof r.buckets[b]).toBe("number");
      expect(r.buckets[b]).toBeGreaterThanOrEqual(0);
    }
  });

  it("total_cost = sum of 6 non-quality buckets (definitional invariant)", () => {
    const r = lathePartCostModelEngine.compute(CANONICAL_INPUT);
    const expected = r.buckets.machine + r.buckets.tool + r.buckets.material + r.buckets.setup + r.buckets.energy + r.buckets.secondary;
    expect(r.total_cost).toBeCloseTo(expected, 2);
  });

  it("total_cost_with_scrap >= total_cost (quality bucket is always non-negative)", () => {
    const r = lathePartCostModelEngine.compute(CANONICAL_INPUT);
    expect(r.total_cost_with_scrap_amortized).toBeGreaterThanOrEqual(r.total_cost);
  });

  it("breakdown_pct totals approximately 100 across all 7 buckets (definitional invariant)", () => {
    const r = lathePartCostModelEngine.compute(CANONICAL_INPUT);
    const sum = Object.values(r.breakdown_pct).reduce((s, v) => s + v, 0);
    expect(sum).toBeCloseTo(100, 0);
  });

  it("higher scrap_rate produces higher quality bucket (monotonicity)", () => {
    const lowScrap = lathePartCostModelEngine.compute({ ...CANONICAL_INPUT, scrap_rate: 0.01 });
    const highScrap = lathePartCostModelEngine.compute({ ...CANONICAL_INPUT, scrap_rate: 0.10 });
    if (highScrap.buckets.quality <= lowScrap.buckets.quality) {
      throw new Error(`quality bucket did not increase with scrap_rate — low=${lowScrap.buckets.quality} high=${highScrap.buckets.quality}`);
    }
  });

  it("larger batch_size lowers setup bucket per-piece (amortization invariant)", () => {
    const smallBatch = lathePartCostModelEngine.compute({ ...CANONICAL_INPUT, batch_size: 10 });
    const largeBatch = lathePartCostModelEngine.compute({ ...CANONICAL_INPUT, batch_size: 1000 });
    if (largeBatch.buckets.setup >= smallBatch.buckets.setup) {
      throw new Error(`setup per-piece did not drop with batch size — small=${smallBatch.buckets.setup} large=${largeBatch.buckets.setup}`);
    }
  });

  it("per_op_tool_cost is keyed by op name and summed equals tool bucket", () => {
    const r = lathePartCostModelEngine.compute(CANONICAL_INPUT);
    expect(Object.keys(r.per_op_tool_cost).sort()).toEqual(["finish_turn", "rough_turn"]);
    const sumPerOp = Object.values(r.per_op_tool_cost).reduce((s, v) => s + v, 0);
    // per_op_tool_cost is rounded to 2dp per-op while tool bucket is rounded to 4dp — allow loose tolerance.
    expect(sumPerOp).toBeCloseTo(r.buckets.tool, 1);
  });

  it("getStats returns canonical 7-bucket list + reference string", () => {
    const s = lathePartCostModelEngine.getStats();
    expect(s.buckets).toEqual(["machine", "tool", "material", "setup", "quality", "energy", "secondary"]);
    expect(s.reference.length).toBeGreaterThan(0);
  });
});
