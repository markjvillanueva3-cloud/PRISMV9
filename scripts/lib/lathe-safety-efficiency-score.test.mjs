/**
 * lathe-safety-efficiency-score.test.mjs -- slot:whiskey  [U-W2D tests]
 * Reference-value + invariant tests for the closed-loop safety/efficiency scorer.
 * Run: node scripts/lib/lathe-safety-efficiency-score.test.mjs
 *
 * R9: each test encodes WHY -- the never-soften safety doctrine is the contract.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreSafetyEfficiency } from "./lathe-safety-efficiency-score.mjs";

// A clean, fully-checkable program: collisions pass, rpm/power within limits,
// no critical warnings, boring in-tolerance, chatter stable.
function cleanProg() {
  return {
    operations: [
      { op_number: 1, operation_type: "od_rough", cutting_params: { spindle_rpm: 2000 }, physics: { power_kW: 5, mrr_mm3_min: 1200, tool_life_min: 45 } },
      { op_number: 2, operation_type: "od_finish", cutting_params: { spindle_rpm: 3000 }, physics: { power_kW: 3, mrr_mm3_min: 200, tool_life_min: 90 } },
    ],
    collision_checks: [{ check_type: "tool_chuck", passed: true, clearance_mm: 12, severity: "info" }],
    boring_bar_checks: [{ op_number: 2, ld_ratio: 3, deflection_mm: 0.01, within_tolerance: true }],
    chatter_checks: [{ op_number: 1, stable: true, rpm: 2000, ap_mm: 2 }],
    warnings: [{ stage: "plan", severity: "info", message: "ok" }],
    estimated_cycle_time_sec: 180,
  };
}
const LIMITS = { max_spindle_rpm: 4000, max_power_kW: 15 };

// ---- TOOL-LIFE ECONOMY (U-W-TOOLLIFE-ECONOMY) --------------------------
test("tool_life_economical: true when the dominant op life >= the Gilbert T_econ floor", () => {
  const v = scoreSafetyEfficiency(cleanProg(), LIMITS); // ops 45 + 90 min, no per-op cycle -> min-life path
  assert.equal(v.efficiency.tool_life_economical, true);
  // The floor is now the Gilbert economic-optimum life (~7.81 min for P/n0.25 + default JM economics), NOT 15.
  assert.ok(v.efficiency.economical_tool_life_min > 7 && v.efficiency.economical_tool_life_min < 9);
  assert.ok(v.efficiency.economic_optimum_life_min > 7 && v.efficiency.economic_optimum_life_min < 9);
});

// ---- RECALIBRATE (U-W-ECONOMY-FLAG-RECALIBRATE): dominant-consumption op vs Gilbert T_econ ----
test("RECALIBRATE: a LIGHT finish op with 1-min life does NOT drive the flag (dominant rough op governs)", () => {
  // rough: 100s cut, 8-min life (>= T_econ ~7.81) -> dominant tool-cost op -> economical.
  // finish: 8s cut, 1-min raw life -> negligible consumption -> must NOT flag the part (the old artifact).
  const prog = {
    operations: [
      { operation_type: "od_rough", cutting_params: { spindle_rpm: 2000 }, cycle_time_sec: 100, physics: { power_kW: 5, tool_life_min: 8 } },
      { operation_type: "od_finish", cutting_params: { spindle_rpm: 3000 }, cycle_time_sec: 8, physics: { power_kW: 3, tool_life_min: 1 } },
    ],
    collision_checks: [{ check_type: "tool_chuck", passed: true, severity: "info" }],
  };
  const v = scoreSafetyEfficiency(prog, LIMITS);
  assert.equal(v.efficiency.dominant_tool_cost_op_life_min, 8); // rough drives it, NOT the 1-min finish
  assert.equal(v.efficiency.min_tool_life_min, 1);              // raw min is still the finish op
  assert.equal(v.efficiency.tool_life_economical, true);       // 8 >= T_econ ~7.81 -> economical
});

test("RECALIBRATE: dominant op BELOW T_econ + high tool-cost share -> uneconomical", () => {
  const prog = {
    operations: [
      { operation_type: "od_rough", cutting_params: { spindle_rpm: 2000 }, cycle_time_sec: 100, physics: { power_kW: 5, tool_life_min: 4 } },
    ],
    collision_checks: [{ check_type: "tool_chuck", passed: true, severity: "info" }],
  };
  const partCost = { buckets: { tool: 3.0 }, total_cost_with_scrap_amortized: 5.0 }; // 60% >= 20%
  const v = scoreSafetyEfficiency(prog, { ...LIMITS, partCost });
  assert.equal(v.efficiency.dominant_tool_cost_op_life_min, 4);
  assert.equal(v.efficiency.tool_life_economical, false); // 4 < ~7.81 AND tool share 60% -> over-driven
});

test("RECALIBRATE: dominant op below T_econ but LOW tool share -> economical (machine-dominated)", () => {
  const prog = {
    operations: [
      { operation_type: "od_rough", cutting_params: { spindle_rpm: 2000 }, cycle_time_sec: 100, physics: { power_kW: 5, tool_life_min: 4 } },
    ],
    collision_checks: [{ check_type: "tool_chuck", passed: true, severity: "info" }],
  };
  const partCost = { buckets: { tool: 0.20 }, total_cost_with_scrap_amortized: 10.0 }; // 2% < 20%
  const v = scoreSafetyEfficiency(prog, { ...LIMITS, partCost });
  assert.equal(v.efficiency.tool_life_economical, true); // below optimum but cheap tooling -> aggressive is fine
});

test("RECALIBRATE: never-soften -- an uneconomical flag never changes the SAFE verdict", () => {
  const prog = {
    operations: [
      { operation_type: "od_rough", cutting_params: { spindle_rpm: 2000 }, cycle_time_sec: 100, physics: { power_kW: 5, tool_life_min: 2 } },
    ],
    collision_checks: [{ check_type: "tool_chuck", passed: true, severity: "info" }],
  };
  const partCost = { buckets: { tool: 4.0 }, total_cost_with_scrap_amortized: 5.0 };
  const v = scoreSafetyEfficiency(prog, { ...LIMITS, partCost });
  assert.equal(v.efficiency.tool_life_economical, false);
  assert.equal(v.verdict, "SAFE"); // the efficiency flag must NOT touch the safety verdict
});

test("RECALIBRATE: legacy fallback -- no per-op cycle -> min-life-vs-floor path (back-compat)", () => {
  // cleanProg ops carry no cycle_time_sec -> _domLife null -> falls back to min-life (45) vs T_econ floor.
  const v = scoreSafetyEfficiency(cleanProg(), LIMITS);
  assert.equal(v.efficiency.dominant_tool_cost_op_life_min, null); // no per-op cycle -> no dominant op
  assert.equal(v.efficiency.tool_life_economical, true);           // min-life 45 >= ~7.81
});
test("tool_life_economical: false when an op life is below the economical floor (advisory, NOT a safety veto)", () => {
  const prog = cleanProg();
  prog.operations[0].physics.tool_life_min = 1; // 1-min Taylor life on an aggressive cut
  const v = scoreSafetyEfficiency(prog, LIMITS);
  assert.equal(v.efficiency.tool_life_economical, false);
  assert.equal(v.efficiency.min_tool_life_min, 1);
  assert.equal(v.verdict, "SAFE"); // never-soften the OTHER way: a cost/efficiency flag must not change SAFE
});
test("tool_life_economical: null when no op carries tool_life (cannot assess)", () => {
  const prog = cleanProg();
  prog.operations.forEach((o) => { delete o.physics.tool_life_min; });
  const v = scoreSafetyEfficiency(prog, LIMITS);
  assert.equal(v.efficiency.tool_life_economical, null);
});
test("tool_life_economical COST-AWARE: short life BUT machine-dominated (low tool share) -> economical (not flagged)", () => {
  const prog = cleanProg();
  prog.operations[0].physics.tool_life_min = 1; // 1-min Taylor life
  const partCost = { buckets: { tool: 0.20 }, total_cost_with_scrap_amortized: 5.0 }; // 4% < 20% floor
  const v = scoreSafetyEfficiency(prog, { ...LIMITS, partCost });
  assert.equal(v.efficiency.tool_cost_share, 0.04);
  assert.equal(v.efficiency.tool_life_economical, true); // aggressive Vc is cost-optimal here -> NOT uneconomical
});
test("tool_life_economical COST-AWARE: short life AND tool-cost-dominated (high share) -> uneconomical", () => {
  const prog = cleanProg();
  prog.operations[0].physics.tool_life_min = 1;
  const partCost = { buckets: { tool: 3.0 }, total_cost_with_scrap_amortized: 5.0 }; // 60% >= 20% floor
  const v = scoreSafetyEfficiency(prog, { ...LIMITS, partCost });
  assert.equal(v.efficiency.tool_cost_share, 0.6);
  assert.equal(v.efficiency.tool_life_economical, false);
});
test("tool_cost_share: malformed negative tool bucket -> null share -> safe fallback to raw floor", () => {
  const prog = cleanProg();
  prog.operations[0].physics.tool_life_min = 1;
  const partCost = { buckets: { tool: -0.5 }, total_cost_with_scrap_amortized: 5.0 }; // garbage
  const v = scoreSafetyEfficiency(prog, { ...LIMITS, partCost });
  assert.equal(v.efficiency.tool_cost_share, null);     // negative bucket rejected (>= 0 guard)
  assert.equal(v.efficiency.tool_life_economical, false); // falls back to raw floor: short life -> uneconomical
});

// ---- HAPPY PATH --------------------------------------------------------
test("clean program within all limits -> SAFE, 0 violations", () => {
  const r = scoreSafetyEfficiency(cleanProg(), LIMITS);
  assert.equal(r.verdict, "SAFE");
  assert.equal(r.safety_violations, 0);
  assert.equal(r.unknowns.length, 0);
  assert.equal(r.efficiency.cycle_time_sec, 180);
  assert.equal(r.efficiency.total_operations, 2);
  assert.equal(r.efficiency.avg_mrr_mm3_min, 700);   // (1200+200)/2
  assert.equal(r.efficiency.min_tool_life_min, 45);  // min(45,90)
  assert.equal(r.breakdown.overspeed_ops, 0);
  assert.equal(r.breakdown.overpower_ops, 0);
});

// ---- FAILURE MODE 1: overspeed op (G50 violation) ----------------------
test("UNSAFE: an op above the spindle RPM cap is a violation (never soften)", () => {
  const p = cleanProg();
  p.operations[1].cutting_params.spindle_rpm = 5000; // > max 4000
  const r = scoreSafetyEfficiency(p, LIMITS);
  assert.equal(r.verdict, "UNSAFE");
  assert.ok(r.safety_violations >= 1);
  assert.equal(r.breakdown.overspeed_ops, 1);
});

// ---- FAILURE MODE 2: overpower op (machine overload) -------------------
test("UNSAFE: an op above the machine power limit is a violation", () => {
  const p = cleanProg();
  p.operations[0].physics.power_kW = 20; // > max 15
  const r = scoreSafetyEfficiency(p, LIMITS);
  assert.equal(r.verdict, "UNSAFE");
  assert.equal(r.breakdown.overpower_ops, 1);
});

// ---- FAILURE MODE 3: critical collision failure ------------------------
test("UNSAFE: a critical collision-check failure is a violation", () => {
  const p = cleanProg();
  p.collision_checks = [{ check_type: "tailstock", passed: false, clearance_mm: -2, severity: "critical" }];
  const r = scoreSafetyEfficiency(p, LIMITS);
  assert.equal(r.verdict, "UNSAFE");
  assert.equal(r.breakdown.collision_critical_fails, 1);
});

// ---- FAILURE MODE 3b: a FAILED collision at "warning" severity also vetoes (3-of-3 arm C P1) ----
test("UNSAFE: a FAILED collision check vetoes SAFE even at severity 'warning' (never-soften)", () => {
  const p = cleanProg();
  // LatheCollisionZoneEngine emits passed:false / severity:"warning" for REAL conflicts
  // (live-tool-vs-tailstock, grooving overhang). Gating only on "critical" used to grade this SAFE.
  p.collision_checks = [{ check_type: "live_tool_tailstock", passed: false, clearance_mm: -1, severity: "warning" }];
  const r = scoreSafetyEfficiency(p, LIMITS);
  assert.equal(r.verdict, "UNSAFE");                      // FAILS before the fix (was SAFE)
  assert.ok(r.safety_violations >= 1);
  assert.equal(r.breakdown.collision_veto_fails, 1);
  assert.equal(r.breakdown.collision_critical_fails, 0);  // warning-severity, not critical
});

// ---- FAILURE MODE 4: critical warning + boring out-of-tolerance --------
test("UNSAFE: critical warning OR boring-bar out-of-tolerance each count", () => {
  const p1 = cleanProg();
  p1.warnings = [{ stage: "safety", severity: "critical", message: "chuck force exceeded" }];
  assert.equal(scoreSafetyEfficiency(p1, LIMITS).verdict, "UNSAFE");
  const p2 = cleanProg();
  p2.boring_bar_checks = [{ op_number: 2, ld_ratio: 8, deflection_mm: 0.5, within_tolerance: false }];
  const r2 = scoreSafetyEfficiency(p2, LIMITS);
  assert.equal(r2.verdict, "UNSAFE");
  assert.equal(r2.breakdown.boring_bar_out_of_tolerance, 1);
});

// ---- NEVER assert SAFE on an unchecked axis (R12) ----------------------
test("PARTIAL: no limits + no collision_checks -> cannot claim SAFE", () => {
  const p = cleanProg();
  delete p.collision_checks;
  const r = scoreSafetyEfficiency(p, {}); // no machine limits
  assert.equal(r.verdict, "PARTIAL");           // NOT "SAFE"
  assert.equal(r.safety_violations, 0);
  assert.deepEqual(r.unknowns.sort(), ["collision_checks", "max_power_kW", "max_spindle_rpm"]);
  assert.equal(r.breakdown.overspeed_ops, null); // null = not checkable, NOT 0-pass
  assert.equal(r.breakdown.overpower_ops, null);
});
test("a violation on a checkable axis is UNSAFE even with other axes unknown", () => {
  const p = cleanProg();
  delete p.collision_checks;
  p.operations[0].physics.power_kW = 99;
  const r = scoreSafetyEfficiency(p, { max_power_kW: 15 }); // rpm unknown, power checkable
  assert.equal(r.verdict, "UNSAFE"); // a real violation always wins over PARTIAL
  assert.equal(r.breakdown.overpower_ops, 1);
});

// ---- ADVERSARIAL 1: undefined / empty program -> no crash --------------
test("ADVERSARIAL: undefined prog -> no crash, PARTIAL, empty efficiency", () => {
  const r = scoreSafetyEfficiency(undefined, {});
  assert.equal(r.verdict, "PARTIAL");
  assert.equal(r.safety_violations, 0);
  assert.equal(r.efficiency.total_operations, 0);
  assert.equal(r.efficiency.avg_mrr_mm3_min, null); // no ops -> null, never NaN
  assert.equal(r.efficiency.cycle_time_sec, null);
});
// ---- ADVERSARIAL 2: NaN/Infinity power + rpm are not in-limit ----------
test("ADVERSARIAL: NaN/Infinity op fields do not falsely pass or crash", () => {
  const p = {
    operations: [
      { op_number: 1, operation_type: "od_rough", cutting_params: { spindle_rpm: NaN }, physics: { power_kW: Infinity, mrr_mm3_min: NaN, tool_life_min: NaN } },
    ],
    collision_checks: [],
  };
  const r = scoreSafetyEfficiency(p, { max_spindle_rpm: 4000, max_power_kW: 15 });
  // NaN rpm / Infinity power are non-finite -> not counted as a > limit violation
  // (isNum guard), and not counted as a pass either. avg/min stay null (no finite vals).
  assert.equal(r.breakdown.overspeed_ops, 0);   // NaN is not > 4000 (not a violation)
  assert.equal(r.breakdown.overpower_ops, 0);    // Infinity filtered by isNum guard (not a violation)
  assert.equal(r.efficiency.avg_mrr_mm3_min, null);
  assert.equal(r.efficiency.min_tool_life_min, null);
  // A present-but-non-finite op physics value is UNVERIFIABLE -> unknown axis -> PARTIAL, never SAFE.
  assert.equal(r.verdict, "PARTIAL");
  assert.ok(r.unknowns.includes("op_physics_nonfinite"));
});
