/**
 * U-WIRE-LATHE-PROG-COST — wiring-gate test
 * ===========================================
 *
 * Verifies 4 dispatcher actions for `LatheProgrammingCostEngine`:
 *   - lathe_programming_cost_estimate   → estimateProgrammingCost(style, complexity, lot, options?)
 *   - lathe_programming_cost_compare    → compareApproaches(input)
 *   - lathe_programming_cost_breakeven  → breakEvenAnalysis(macroHr, lotSizes, complexity?, options?)
 *   - lathe_programming_cost_stats      → getStats()
 *
 * @module __tests__/U-WIRE-LATHE-PROG-COST
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { latheProgrammingCostEngine } from "../engines/LatheProgrammingCostEngine.js";
import { TURNING_ACTION_SCHEMAS } from "../schemas/turningActionSchemas.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DISPATCHER_SRC = readFileSync(
  join(__dirname, "..", "tools", "dispatchers", "turningDispatcher.ts"),
  "utf-8"
);
const SCHEMA_MAP = TURNING_ACTION_SCHEMAS as Record<string, { safeParse: (v: unknown) => { success: boolean } }>;

describe("U-WIRE-LATHE-PROG-COST — turning-dispatcher wiring", () => {
  it("registers all 4 actions in TURNING_ACTION_SCHEMAS", () => {
    for (const a of ["lathe_programming_cost_estimate", "lathe_programming_cost_compare", "lathe_programming_cost_breakeven", "lathe_programming_cost_stats"]) {
      if (!SCHEMA_MAP[a]) throw new Error(`${a} missing from TURNING_ACTION_SCHEMAS`);
    }
  });

  it("estimate schema accepts a canonical request", () => {
    expect(SCHEMA_MAP["lathe_programming_cost_estimate"]!.safeParse({
      style: "cam", complexity: "moderate", lot_size: 50,
    }).success).toBe(true);
  });

  it("estimate schema rejects unknown style", () => {
    expect(SCHEMA_MAP["lathe_programming_cost_estimate"]!.safeParse({
      style: "voodoo", complexity: "moderate", lot_size: 50,
    }).success).toBe(false);
  });

  it("estimate schema rejects unknown complexity", () => {
    expect(SCHEMA_MAP["lathe_programming_cost_estimate"]!.safeParse({
      style: "cam", complexity: "ridiculous", lot_size: 50,
    }).success).toBe(false);
  });

  it("estimate schema rejects lot_size < 1", () => {
    expect(SCHEMA_MAP["lathe_programming_cost_estimate"]!.safeParse({
      style: "cam", complexity: "moderate", lot_size: 0,
    }).success).toBe(false);
  });

  it("compare schema accepts a canonical part-spec request", () => {
    expect(SCHEMA_MAP["lathe_programming_cost_compare"]!.safeParse({
      part_complexity: "complex", lot_size: 100, has_threading: true, has_live_tooling: false,
    }).success).toBe(true);
  });

  it("breakeven schema requires non-empty lot_sizes array of positive integers", () => {
    expect(SCHEMA_MAP["lathe_programming_cost_breakeven"]!.safeParse({
      macro_investment_hr: 2, lot_sizes: [10, 50, 100],
    }).success).toBe(true);
    expect(SCHEMA_MAP["lathe_programming_cost_breakeven"]!.safeParse({
      macro_investment_hr: 2, lot_sizes: [],
    }).success).toBe(false);
    expect(SCHEMA_MAP["lathe_programming_cost_breakeven"]!.safeParse({
      macro_investment_hr: 2, lot_sizes: [0, 50],
    }).success).toBe(false);
  });

  it("stats schema accepts empty input", () => {
    expect(SCHEMA_MAP["lathe_programming_cost_stats"]!.safeParse({}).success).toBe(true);
  });

  // Dispatcher source surface
  it("dispatcher source contains all 4 actions in enum AND case form", () => {
    for (const a of ["lathe_programming_cost_estimate", "lathe_programming_cost_compare", "lathe_programming_cost_breakeven", "lathe_programming_cost_stats"]) {
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

  it("estimate case routes to .estimateProgrammingCost (negative-guards siblings)", () => {
    const block = caseBlock("lathe_programming_cost_estimate");
    expect(block.includes("latheProgrammingCostEngine.estimateProgrammingCost(")).toBe(true);
    if (block.includes("latheProgrammingCostEngine.compareApproaches(") || block.includes("latheProgrammingCostEngine.breakEvenAnalysis(") || block.includes("latheProgrammingCostEngine.getStats(")) {
      throw new Error("estimate case wired to wrong sibling");
    }
  });

  it("compare case routes to .compareApproaches (negative-guards siblings)", () => {
    const block = caseBlock("lathe_programming_cost_compare");
    expect(block.includes("latheProgrammingCostEngine.compareApproaches(")).toBe(true);
    if (block.includes("latheProgrammingCostEngine.estimateProgrammingCost(") || block.includes("latheProgrammingCostEngine.breakEvenAnalysis(") || block.includes("latheProgrammingCostEngine.getStats(")) {
      throw new Error("compare case wired to wrong sibling");
    }
  });

  it("breakeven case routes to .breakEvenAnalysis (negative-guards siblings)", () => {
    const block = caseBlock("lathe_programming_cost_breakeven");
    expect(block.includes("latheProgrammingCostEngine.breakEvenAnalysis(")).toBe(true);
    if (block.includes("latheProgrammingCostEngine.estimateProgrammingCost(") || block.includes("latheProgrammingCostEngine.compareApproaches(") || block.includes("latheProgrammingCostEngine.getStats(")) {
      throw new Error("breakeven case wired to wrong sibling");
    }
  });

  it("stats case routes to .getStats (negative-guards siblings)", () => {
    const block = caseBlock("lathe_programming_cost_stats");
    expect(block.includes("latheProgrammingCostEngine.getStats(")).toBe(true);
    if (block.includes("latheProgrammingCostEngine.estimateProgrammingCost(") || block.includes("latheProgrammingCostEngine.compareApproaches(") || block.includes("latheProgrammingCostEngine.breakEvenAnalysis(")) {
      throw new Error("stats case wired to wrong sibling");
    }
  });
});

describe("U-WIRE-LATHE-PROG-COST — engine semantic round-trip", () => {
  it("estimate returns the canonical cost-breakdown shape with positive total", () => {
    const r = latheProgrammingCostEngine.estimateProgrammingCost("cam", "moderate", 50);
    expect(r.style).toBe("cam");
    expect(r.complexity).toBe("moderate");
    expect(r.lot_size).toBe(50);
    expect(typeof r.programming_hr).toBe("number");
    expect(typeof r.setup_hr).toBe("number");
    expect(typeof r.cycle_hr).toBe("number");
    expect(typeof r.cam_seat_hr).toBe("number");
    expect(typeof r.cost_breakdown.programming_labor).toBe("number");
    expect(r.total_cost).toBeGreaterThan(0);
    expect(r.per_part_cost).toBeCloseTo(r.total_cost / 50, 2);
  });

  it("estimate throws on lot_size < 1 (engine R12 invariant)", () => {
    expect(() => latheProgrammingCostEngine.estimateProgrammingCost("cam", "moderate", 0)).toThrow();
  });

  it("more complex parts produce higher programming_hr (monotonicity)", () => {
    const simple = latheProgrammingCostEngine.estimateProgrammingCost("cam", "simple", 10);
    const complex = latheProgrammingCostEngine.estimateProgrammingCost("cam", "very_complex", 10);
    if (complex.programming_hr <= simple.programming_hr) {
      throw new Error(`programming_hr did not grow with complexity — simple=${simple.programming_hr} complex=${complex.programming_hr}`);
    }
  });

  it("compare returns a ranked array of all 4 styles for a given part spec", () => {
    const r = latheProgrammingCostEngine.compareApproaches({
      part_complexity: "moderate", lot_size: 50,
    });
    expect(Array.isArray(r.ranked)).toBe(true);
    expect(r.ranked.length).toBe(4);
    // Ranked by per-part cost ascending — cheapest first.
    for (let i = 1; i < r.ranked.length; i++) {
      const prev = r.ranked[i - 1]!;
      const cur = r.ranked[i]!;
      if (cur.per_part_cost < prev.per_part_cost) {
        throw new Error(`ranking order violated at index ${i}: prev=${prev.per_part_cost} cur=${cur.per_part_cost}`);
      }
    }
  });

  it("breakeven returns one BreakEvenPoint per lot_size + break_even_lot_size + recommendation", () => {
    const r = latheProgrammingCostEngine.breakEvenAnalysis(4, [10, 50, 100, 500]);
    // Real shape per engine line 99-113: points[], lot_sizes_analyzed[], break_even_lot_size, recommendation.
    expect(Array.isArray(r.points)).toBe(true);
    expect(r.points.length).toBe(4);
    expect(r.lot_sizes_analyzed).toEqual([10, 50, 100, 500]);
    expect(typeof r.recommendation).toBe("string");
    for (const p of r.points) {
      expect(typeof p.lot_size).toBe("number");
      expect(typeof p.macro_total_cost).toBe("number");
      expect(typeof p.hardcode_total_cost).toBe("number");
      expect(typeof p.macro_is_cheaper).toBe("boolean");
    }
    // break_even_lot_size is number | null; verify the type
    if (r.break_even_lot_size !== null && typeof r.break_even_lot_size !== "number") {
      throw new Error(`break_even_lot_size must be number|null — got ${typeof r.break_even_lot_size}`);
    }
  });

  it("breakeven throws on negative macro_investment_hr (engine R12 invariant)", () => {
    expect(() => latheProgrammingCostEngine.breakEvenAnalysis(-1, [10])).toThrow();
  });

  it("getStats returns styles_supported=4 + default_cam_seat_rate + uses_shop_config flag", () => {
    const s = latheProgrammingCostEngine.getStats();
    expect(s.styles_supported).toBe(4);
    expect(typeof s.default_cam_seat_rate).toBe("number");
    expect(typeof s.uses_shop_config).toBe("boolean");
  });
});
