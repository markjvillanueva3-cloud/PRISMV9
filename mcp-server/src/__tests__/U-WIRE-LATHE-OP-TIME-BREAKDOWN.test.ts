/**
 * U-WIRE-LATHE-OP-TIME-BREAKDOWN — wiring-gate test
 * ===================================================
 *
 * Verifies `lathe_op_time_compute` + `lathe_op_time_aggregate` +
 * `lathe_op_time_stats` route to LatheOpTimeBreakdownEngine
 * compute/aggregate/getStats respectively.
 *
 * @module __tests__/U-WIRE-LATHE-OP-TIME-BREAKDOWN
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  latheOpTimeBreakdownEngine,
  type LatheOpSummary,
  type LatheOpTimeBreakdown,
} from "../engines/LatheOpTimeBreakdownEngine.js";
import { TURNING_ACTION_SCHEMAS } from "../schemas/turningActionSchemas.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DISPATCHER_SRC = readFileSync(
  join(__dirname, "..", "tools", "dispatchers", "turningDispatcher.ts"),
  "utf-8"
);
const SCHEMA_MAP = TURNING_ACTION_SCHEMAS as Record<string, { safeParse: (v: unknown) => { success: boolean } }>;

const ROUGH_OP: LatheOpSummary = {
  cut_length_mm: 200,
  feed_mm_min: 250,
  pass_count: 3,
  rapid_travel_mm: 60,
  tool_changes: 1,
  spindle_rpm: 1800,
};

const FINISH_OP: LatheOpSummary = {
  cut_length_mm: 80,
  feed_mm_min: 120,
  pass_count: 1,
  rapid_travel_mm: 30,
  tool_changes: 1,
  thread_cycles: 1,
  probe_sequences: 1,
  spindle_rpm: 3000,
};

describe("U-WIRE-LATHE-OP-TIME-BREAKDOWN — turning-dispatcher wiring", () => {
  it("registers all 3 actions in TURNING_ACTION_SCHEMAS", () => {
    for (const a of ["lathe_op_time_compute", "lathe_op_time_aggregate", "lathe_op_time_stats"]) {
      if (!SCHEMA_MAP[a]) throw new Error(`${a} missing from TURNING_ACTION_SCHEMAS`);
    }
  });

  it("compute schema accepts canonical input", () => {
    expect(SCHEMA_MAP["lathe_op_time_compute"]!.safeParse(ROUGH_OP).success).toBe(true);
  });

  it("compute schema rejects zero/negative cut_length_mm and feed_mm_min", () => {
    expect(SCHEMA_MAP["lathe_op_time_compute"]!.safeParse({ ...ROUGH_OP, cut_length_mm: 0 }).success).toBe(false);
    expect(SCHEMA_MAP["lathe_op_time_compute"]!.safeParse({ ...ROUGH_OP, feed_mm_min: -1 }).success).toBe(false);
  });

  it("compute schema rejects non-integer pass_count", () => {
    expect(SCHEMA_MAP["lathe_op_time_compute"]!.safeParse({ ...ROUGH_OP, pass_count: 2.5 }).success).toBe(false);
  });

  it("aggregate schema requires non-empty ops array + positive integer lot_size", () => {
    const goodOp = latheOpTimeBreakdownEngine.compute(ROUGH_OP);
    expect(SCHEMA_MAP["lathe_op_time_aggregate"]!.safeParse({ ops: [goodOp], lot_size: 10 }).success).toBe(true);
    expect(SCHEMA_MAP["lathe_op_time_aggregate"]!.safeParse({ ops: [], lot_size: 10 }).success).toBe(false);
    expect(SCHEMA_MAP["lathe_op_time_aggregate"]!.safeParse({ ops: [goodOp], lot_size: 0 }).success).toBe(false);
    expect(SCHEMA_MAP["lathe_op_time_aggregate"]!.safeParse({ ops: [goodOp], lot_size: 5.5 }).success).toBe(false);
  });

  // Dispatcher source surface
  it("dispatcher contains action + case for all 3 actions", () => {
    for (const a of ["lathe_op_time_compute", "lathe_op_time_aggregate", "lathe_op_time_stats"]) {
      expect(DISPATCHER_SRC.includes(`"${a}"`)).toBe(true);
      expect(DISPATCHER_SRC.includes(`case "${a}":`)).toBe(true);
    }
  });

  function caseBlock(action: string): string {
    const startIdx = DISPATCHER_SRC.indexOf(`case "${action}":`);
    if (startIdx < 0) throw new Error(`${action} case missing`);
    const endIdx = DISPATCHER_SRC.indexOf('case "', startIdx + `case "${action}":`.length);
    return DISPATCHER_SRC.slice(startIdx, endIdx > 0 ? endIdx : startIdx + 4000);
  }

  it("compute case routes to .compute (negatively guards against aggregate/getStats)", () => {
    const block = caseBlock("lathe_op_time_compute");
    expect(block.includes("latheOpTimeBreakdownEngine.compute(")).toBe(true);
    if (block.includes("latheOpTimeBreakdownEngine.aggregate(") || block.includes("latheOpTimeBreakdownEngine.getStats(")) {
      throw new Error("compute case wired to sibling method");
    }
  });

  it("aggregate case routes to .aggregate (negatively guards against compute/getStats)", () => {
    const block = caseBlock("lathe_op_time_aggregate");
    expect(block.includes("latheOpTimeBreakdownEngine.aggregate(")).toBe(true);
    if (block.includes("latheOpTimeBreakdownEngine.compute(") || block.includes("latheOpTimeBreakdownEngine.getStats(")) {
      throw new Error("aggregate case wired to sibling method");
    }
  });

  it("stats case routes to .getStats (negatively guards against compute/aggregate)", () => {
    const block = caseBlock("lathe_op_time_stats");
    expect(block.includes("latheOpTimeBreakdownEngine.getStats(")).toBe(true);
    if (block.includes("latheOpTimeBreakdownEngine.compute(") || block.includes("latheOpTimeBreakdownEngine.aggregate(")) {
      throw new Error("stats case wired to sibling method");
    }
  });
});

describe("U-WIRE-LATHE-OP-TIME-BREAKDOWN — engine semantic round-trip", () => {
  it("compute returns all 9 buckets summing to total_sec (definitional invariant)", () => {
    const r: LatheOpTimeBreakdown = latheOpTimeBreakdownEngine.compute(ROUGH_OP);
    const buckets =
      r.cutting_sec +
      r.air_rapid_sec +
      r.tool_change_sec +
      r.thread_sec +
      r.probe_sec +
      r.chip_conveyor_pause_sec +
      r.spindle_start_stop_sec +
      r.load_unload_sec +
      r.fixed_overhead_sec;
    expect(r.total_sec).toBeCloseTo(buckets, 0);
  });

  it("productive_fraction = cutting_sec / total_sec (definitional invariant)", () => {
    const r = latheOpTimeBreakdownEngine.compute(ROUGH_OP);
    expect(r.productive_fraction).toBeCloseTo(r.cutting_sec / r.total_sec, 2);
  });

  it("bottleneck identifies the largest bucket", () => {
    const r = latheOpTimeBreakdownEngine.compute(ROUGH_OP);
    // ROUGH_OP: cut_length=200 × passes=3 ÷ feed=250 × 60 = 144 cutting_sec, way more than other buckets.
    expect(r.bottleneck).toBe("cutting");
  });

  it("more passes -> proportionally more cutting time (monotonicity)", () => {
    const one = latheOpTimeBreakdownEngine.compute({ ...ROUGH_OP, pass_count: 1 });
    const five = latheOpTimeBreakdownEngine.compute({ ...ROUGH_OP, pass_count: 5 });
    expect(five.cutting_sec).toBeCloseTo(one.cutting_sec * 5, 1);
  });

  it("aggregate sums per-piece across ops and multiplies by lot_size", () => {
    const r1 = latheOpTimeBreakdownEngine.compute(ROUGH_OP);
    const r2 = latheOpTimeBreakdownEngine.compute(FINISH_OP);
    const agg = latheOpTimeBreakdownEngine.aggregate([r1, r2], 50);
    expect(agg.per_piece_sec).toBeCloseTo(r1.total_sec + r2.total_sec, 0);
    expect(agg.lot_sec).toBeCloseTo(agg.per_piece_sec * 50, 0);
    expect(agg.lot_hours).toBeCloseTo(agg.lot_sec / 3600, 2);
  });

  it("getStats returns 9-bucket list + canonical default constants", () => {
    const s = latheOpTimeBreakdownEngine.getStats();
    expect(s.buckets.length).toBe(9);
    expect(s.defaults["tool_change_sec"]).toBe(4);
    expect(s.defaults["thread_cycle_sec"]).toBe(2);
    expect(s.defaults["spindle_accel_rps2"]).toBe(150);
  });
});
