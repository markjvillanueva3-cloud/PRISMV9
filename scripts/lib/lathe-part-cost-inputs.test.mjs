/**
 * Tests for the lathe closed-loop COST leg pure cores (U-W-COST-WIRE):
 *   lathe-jm-cost-rates.mjs  + lathe-part-cost-inputs.mjs
 * Run: node scripts/lib/lathe-part-cost-inputs.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { LATHE_JM_COST_RATES, materialFor, insertFor } from "./lathe-jm-cost-rates.mjs";
import {
  cylinderVolumeMm3,
  partAndStockVolumeMm3,
  massKg,
  buildLathePartCostInput,
} from "./lathe-part-cost-inputs.mjs";

const approx = (a, b, eps = 1e-3) => Math.abs(a - b) <= eps;

// ---------------- rates module ----------------
test("rates: canonical machine rate present + frozen", () => {
  assert.equal(LATHE_JM_COST_RATES.machine_rate_per_hr, 85);
  assert.ok(Object.isFrozen(LATHE_JM_COST_RATES));
  // mutation is a no-op on a frozen object (never throws in sloppy mode, value unchanged)
  try { LATHE_JM_COST_RATES.machine_rate_per_hr = 999; } catch { /* strict-mode throw is also fine */ }
  assert.equal(LATHE_JM_COST_RATES.machine_rate_per_hr, 85);
});

test("materialFor: ISO group resolution + default", () => {
  assert.equal(materialFor("P").density_kg_mm3, 7.85e-6);
  assert.equal(materialFor("m").price_per_kg, 4.5); // case-insensitive
  assert.equal(materialFor("N").density_kg_mm3, 2.7e-6); // aluminum
  assert.equal(materialFor(undefined).price_per_kg, materialFor("P").price_per_kg); // default P
  assert.equal(materialFor("ZZZ").price_per_kg, materialFor("P").price_per_kg); // unknown -> P
});

test("insertFor: op-class mapping + default", () => {
  assert.equal(insertFor("rough_turn").insert_cost, LATHE_JM_COST_RATES.insert.rough.insert_cost);
  assert.equal(insertFor("single_point_thread").edges_per_insert, 3);
  assert.equal(insertFor("part_off").insert_cost, 18.0);
  assert.equal(insertFor("od_finish").insert_cost, 14.0);
  assert.equal(insertFor("center_drill").insert_cost, 10.0);
  assert.equal(insertFor("id_boring").insert_cost, 14.0);
  assert.deepEqual(insertFor(null), LATHE_JM_COST_RATES.insert.default);
});

// ---------------- geometry helpers ----------------
test("cylinderVolumeMm3: exact reference value", () => {
  // dia=20, len=100 -> pi*10^2*100 = 31415.926...
  assert.ok(approx(cylinderVolumeMm3(20, 100), Math.PI * 100 * 100, 1e-6));
  assert.equal(cylinderVolumeMm3(0, 100), 0);
  assert.equal(cylinderVolumeMm3(20, -5), 0);
  assert.equal(cylinderVolumeMm3(NaN, 100), 0);
});

test("partAndStockVolumeMm3: stock>=part, bore subtracts, waste = stock-part", () => {
  const v = partAndStockVolumeMm3({ bar_stock_od_mm: 25.4, finished_od_mm: 20, part_length_mm: 50, bore_id_mm: 10 });
  const stock = Math.PI * (25.4 / 2) ** 2 * 50;
  const partOuter = Math.PI * 10 ** 2 * 50;
  const bore = Math.PI * 5 ** 2 * 50;
  assert.ok(approx(v.stock_mm3, stock, 1e-3));
  assert.ok(approx(v.part_mm3, partOuter - bore, 1e-3));
  assert.ok(approx(v.waste_mm3, stock - (partOuter - bore), 1e-3));
  assert.ok(v.stock_mm3 >= v.part_mm3); // invariant: stock never less than part
});

test("partAndStockVolumeMm3: missing finished_od falls back to stock OD (no OD removal)", () => {
  const v = partAndStockVolumeMm3({ bar_stock_od_mm: 30, part_length_mm: 40 });
  assert.ok(approx(v.part_mm3, v.stock_mm3, 1e-6)); // no finished OD -> part == stock
  assert.ok(approx(v.waste_mm3, 0, 1e-6));
});

test("massKg: reference + guards", () => {
  assert.ok(approx(massKg(31415.926, 7.85e-6), 0.24661, 1e-4)); // ~0.2466 kg steel
  assert.equal(massKg(-1, 7.85e-6), 0);
  assert.equal(massKg(1000, 0), 0);
});

// ---------------- input builder ----------------
const PROG = {
  estimated_cycle_time_sec: 120,
  operations: [
    { operation_type: "rough_turn", physics: { tool_life_min: 30, power_kW: 5.0 } },
    { operation_type: "finish_turn", physics: { tool_life_min: 45, power_kW: 2.0 } },
  ],
};
const FEAT = { bar_stock_od_mm: 25.4, finished_od_mm: 20, part_length_mm: 50, bore_id_mm: 0 };

test("buildLathePartCostInput: happy path produces a valid engine input", () => {
  const inp = buildLathePartCostInput({ prog: PROG, feat: FEAT, isoGroup: "P" });
  assert.equal(inp.cycle_time_s, 120);
  assert.equal(inp.machine_rate_per_hr, 85);
  assert.equal(inp.operations.length, 2);
  assert.equal(inp.operations[0].cycle_time_s, 60); // even split 120/2
  assert.equal(inp.operations[0].tool_life_s, 1800); // 30min * 60
  assert.ok(inp.part_mass_kg > 0, "geometry -> non-zero part mass");
  assert.equal(inp.material_price_per_kg, materialFor("P").price_per_kg);
  assert.ok(approx(inp.spindle_power_kw, 3.5, 1e-6)); // (5+2)/2
  assert.match(inp._basis, /material/);
});

test("buildLathePartCostInput: no geometry -> material bucket zero + honest basis (R12)", () => {
  const inp = buildLathePartCostInput({ prog: PROG, isoGroup: "P" });
  assert.equal(inp.part_mass_kg, 0);
  assert.equal(inp.waste_mass_kg, 0);
  assert.match(inp._basis, /material bucket 0/);
});

test("buildLathePartCostInput: missing tool_life -> tool_life_s 0 (engine skips tool bucket)", () => {
  const prog = { estimated_cycle_time_sec: 60, operations: [{ operation_type: "rough_turn", physics: {} }] };
  const inp = buildLathePartCostInput({ prog, feat: FEAT });
  assert.equal(inp.operations[0].tool_life_s, 0);
});

test("buildLathePartCostInput: adversarial empty/null inputs never throw", () => {
  const a = buildLathePartCostInput({ prog: { operations: [] }, feat: FEAT });
  assert.equal(a.operations.length, 0);
  assert.equal(a.cycle_time_s, 0);
  const b = buildLathePartCostInput({});
  assert.equal(b.operations.length, 0);
  assert.equal(b.part_mass_kg, 0);
  assert.equal(b.machine_rate_per_hr, 85); // rates still applied
});

// ---- U-W-COST-PEROP-CYCLE: real per-op cycle time (fixes the finish-op tool-cost inflation) ----
test("buildLathePartCostInput: uses REAL per-op cycle_time_sec when present (not even-split)", () => {
  // A LIGHT finish op (8 s real cycle) must NOT be charged the even-split half (54 s) -- the even split
  // inflated its tool consumption (cycle / tool_life), the root of the closed-loop "uneconomical" artifact.
  const prog = {
    estimated_cycle_time_sec: 108,
    operations: [
      { operation_type: "od_rough", cycle_time_sec: 100, physics: { tool_life_min: 6, power_kW: 5 } },
      { operation_type: "od_finish", cycle_time_sec: 8, physics: { tool_life_min: 1, power_kW: 2 } },
    ],
  };
  const inp = buildLathePartCostInput({ prog, feat: FEAT });
  assert.equal(inp.operations[0].cycle_time_s, 100); // real per-op, NOT even-split (54)
  assert.equal(inp.operations[1].cycle_time_s, 8);   // light finish charged its true 8 s, not 54 s
  assert.notEqual(inp.operations[1].cycle_time_s, 54); // the inflation the fix removes
  assert.match(inp._basis, /real per-op cycle_time_sec/);
});

test("buildLathePartCostInput: falls back to even-split for an op that lacks cycle_time_sec", () => {
  const prog = {
    estimated_cycle_time_sec: 120,
    operations: [
      { operation_type: "od_rough", cycle_time_sec: 90, physics: { tool_life_min: 6 } },
      { operation_type: "od_finish", physics: { tool_life_min: 1 } }, // no cycle_time_sec -> fallback
    ],
  };
  const inp = buildLathePartCostInput({ prog, feat: FEAT });
  assert.equal(inp.operations[0].cycle_time_s, 90); // real per-op
  assert.equal(inp.operations[1].cycle_time_s, 60); // even-split fallback (120/2)
  assert.match(inp._basis, /real per-op cycle_time_sec/); // at least one op carried it
});
