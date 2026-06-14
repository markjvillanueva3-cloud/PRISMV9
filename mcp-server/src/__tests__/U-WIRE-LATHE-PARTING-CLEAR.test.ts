/**
 * U-WIRE-LATHE-PARTING-CLEAR — wiring-gate test
 * ===============================================
 *
 * Verifies `lathe_parting_clearance_evaluate` + `lathe_parting_clearance_stats`
 * are exposed on the turning dispatcher and route correctly to the matching
 * `LathePartingChipClearanceEngine` methods.
 *
 * @module __tests__/U-WIRE-LATHE-PARTING-CLEAR
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  lathePartingChipClearanceEngine,
  type PartingChipInput,
  type PartingChipResult,
} from "../engines/LathePartingChipClearanceEngine.js";
import { TURNING_ACTION_SCHEMAS } from "../schemas/turningActionSchemas.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DISPATCHER_SRC = readFileSync(
  join(__dirname, "..", "tools", "dispatchers", "turningDispatcher.ts"),
  "utf-8"
);
const SCHEMA_MAP = TURNING_ACTION_SCHEMAS as Record<string, { safeParse: (v: unknown) => { success: boolean } }>;

// Severe path: 3.18mm blade in a 50mm deep slot on stainless with weak coolant
// (AR ≈ 16, jet reach insufficient at 1 bar × 1mm nozzle generic flood, M-group stickiness).
// Engine formula: Lj = 40 × sqrt(P) × d × reachFactor — with P=1, d=1, factor=0.4 → reach=16mm < 50mm slot.
const SEVERE_INPUT: PartingChipInput = {
  blade_width_mm: 3.18,
  slot_depth_mm: 50,
  bar_od_mm: 100,
  feed_mm_rev: 0.12,
  vc_m_min: 100,
  coolant_pressure_bar: 1,
  nozzle_diameter_mm: 1.0,
  coolant_targeted: false,
  material_iso_group: "M",
};

// Safe path: shallow, high-pressure targeted coolant, K-group (cast iron — brittle chips).
const SAFE_INPUT: PartingChipInput = {
  blade_width_mm: 4,
  slot_depth_mm: 8,
  bar_od_mm: 40,
  feed_mm_rev: 0.08,
  vc_m_min: 150,
  coolant_pressure_bar: 70,
  nozzle_diameter_mm: 3,
  coolant_targeted: true,
  material_iso_group: "K",
};

describe("U-WIRE-LATHE-PARTING-CLEAR — turning-dispatcher wiring", () => {
  it("registers lathe_parting_clearance_evaluate with working safeParse on a severe input", () => {
    const schema = SCHEMA_MAP["lathe_parting_clearance_evaluate"];
    if (!schema) throw new Error("lathe_parting_clearance_evaluate missing from TURNING_ACTION_SCHEMAS");
    expect(schema.safeParse(SEVERE_INPUT).success).toBe(true);
  });

  it("registers lathe_parting_clearance_stats with working safeParse on empty input", () => {
    const schema = SCHEMA_MAP["lathe_parting_clearance_stats"];
    if (!schema) throw new Error("lathe_parting_clearance_stats missing");
    expect(schema.safeParse({}).success).toBe(true);
  });

  it("rejects evaluate input with non-positive blade_width_mm", () => {
    expect(SCHEMA_MAP["lathe_parting_clearance_evaluate"]!.safeParse({ ...SEVERE_INPUT, blade_width_mm: 0 }).success).toBe(false);
    expect(SCHEMA_MAP["lathe_parting_clearance_evaluate"]!.safeParse({ ...SEVERE_INPUT, blade_width_mm: -1 }).success).toBe(false);
  });

  it("rejects evaluate input with unknown material_iso_group", () => {
    const bad = { ...SEVERE_INPUT, material_iso_group: "X" as unknown as PartingChipInput["material_iso_group"] };
    expect(SCHEMA_MAP["lathe_parting_clearance_evaluate"]!.safeParse(bad).success).toBe(false);
  });

  it("accepts evaluate input with zero coolant_pressure_bar (dry parting is legitimate)", () => {
    expect(SCHEMA_MAP["lathe_parting_clearance_evaluate"]!.safeParse({ ...SEVERE_INPUT, coolant_pressure_bar: 0 }).success).toBe(true);
  });

  it("rejects evaluate input missing required slot_depth_mm", () => {
    const bad: Partial<PartingChipInput> = { ...SEVERE_INPUT };
    delete (bad as { slot_depth_mm?: unknown }).slot_depth_mm;
    expect(SCHEMA_MAP["lathe_parting_clearance_evaluate"]!.safeParse(bad).success).toBe(false);
  });

  // Dispatcher source surface
  it("dispatcher contains BOTH the action name and the case block for lathe_parting_clearance_evaluate", () => {
    expect(DISPATCHER_SRC.includes('"lathe_parting_clearance_evaluate"')).toBe(true);
    expect(DISPATCHER_SRC.includes('case "lathe_parting_clearance_evaluate":')).toBe(true);
  });

  it("dispatcher contains BOTH the action name and the case block for lathe_parting_clearance_stats", () => {
    expect(DISPATCHER_SRC.includes('"lathe_parting_clearance_stats"')).toBe(true);
    expect(DISPATCHER_SRC.includes('case "lathe_parting_clearance_stats":')).toBe(true);
  });

  it("evaluate case routes to .evaluate (not the sibling getStats)", () => {
    const startIdx = DISPATCHER_SRC.indexOf('case "lathe_parting_clearance_evaluate":');
    if (startIdx < 0) throw new Error("evaluate case missing");
    const endIdx = DISPATCHER_SRC.indexOf('case "', startIdx + 'case "lathe_parting_clearance_evaluate":'.length);
    const block = DISPATCHER_SRC.slice(startIdx, endIdx > 0 ? endIdx : startIdx + 4000);
    expect(block.includes("lathePartingChipClearanceEngine.evaluate(")).toBe(true);
    if (block.includes("lathePartingChipClearanceEngine.getStats(")) {
      throw new Error("evaluate case wired to getStats — must call evaluate");
    }
  });

  it("stats case routes to .getStats (not the sibling evaluate)", () => {
    const startIdx = DISPATCHER_SRC.indexOf('case "lathe_parting_clearance_stats":');
    if (startIdx < 0) throw new Error("stats case missing");
    const endIdx = DISPATCHER_SRC.indexOf('case "', startIdx + 'case "lathe_parting_clearance_stats":'.length);
    const block = DISPATCHER_SRC.slice(startIdx, endIdx > 0 ? endIdx : startIdx + 4000);
    expect(block.includes("lathePartingChipClearanceEngine.getStats(")).toBe(true);
    if (block.includes("lathePartingChipClearanceEngine.evaluate(")) {
      throw new Error("stats case wired to evaluate — must call getStats");
    }
  });
});

describe("U-WIRE-LATHE-PARTING-CLEAR — engine semantic round-trip", () => {
  it("severe input lands in high_risk or unsafe verdict with non-empty risk_factors", () => {
    const r: PartingChipResult = lathePartingChipClearanceEngine.evaluate(SEVERE_INPUT);
    if (r.verdict !== "high_risk" && r.verdict !== "unsafe") {
      throw new Error(`expected high_risk|unsafe on severe input — got ${r.verdict}`);
    }
    expect(r.risk_factors.length).toBeGreaterThan(0);
    expect(r.coolant_adequate).toBe(false); // 1 bar × 1mm × 0.4 reachFactor = 16mm jet < 50mm slot
  });

  it("safe input lands in safe or marginal verdict with adequate coolant", () => {
    const r: PartingChipResult = lathePartingChipClearanceEngine.evaluate(SAFE_INPUT);
    if (r.verdict !== "safe" && r.verdict !== "marginal") {
      throw new Error(`expected safe|marginal on safe input — got ${r.verdict}`);
    }
    expect(r.coolant_adequate).toBe(true);
  });

  it("coolant pressure upgrade (5 → 70 bar) lengthens jet reach (monotonicity)", () => {
    const low = lathePartingChipClearanceEngine.evaluate(SEVERE_INPUT);
    const high = lathePartingChipClearanceEngine.evaluate({ ...SEVERE_INPUT, coolant_pressure_bar: 70 });
    if (high.coolant_reach_mm <= low.coolant_reach_mm) {
      throw new Error(`coolant_reach did not increase with pressure — low=${low.coolant_reach_mm} high=${high.coolant_reach_mm}`);
    }
  });

  it("aspect_ratio matches depth/width to the engine's rounding precision", () => {
    const r = lathePartingChipClearanceEngine.evaluate(SEVERE_INPUT);
    expect(r.aspect_ratio).toBeCloseTo(50 / 3.18, 1);
  });

  it("peck-count is at least 1 even on shallow slots (definitional invariant)", () => {
    const r = lathePartingChipClearanceEngine.evaluate(SAFE_INPUT);
    expect(r.recommended_peck_count).toBeGreaterThanOrEqual(1);
  });

  it("getStats returns model + iso_groups_supported + formulas array", () => {
    const s = lathePartingChipClearanceEngine.getStats();
    expect(s.model.length).toBeGreaterThan(0);
    expect(s.iso_groups_supported).toEqual(["P", "M", "K", "N", "S", "H"]);
    expect(s.formulas.length).toBeGreaterThanOrEqual(4);
  });
});
