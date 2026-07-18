/**
 * Tests for cam-part-program-planner.mjs — the offline part-program planning scaffold.
 * Uses the REAL matrix + optimization rules (not mocks). Verifies whole-part sequencing,
 * material-aware optimization, safety-gate aggregation, and canonical op-order validation.
 *
 *   node --test scripts/lib/cam-part-program-planner.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  loadMatrix, loadOptimizationRules, DEFAULT_MATRIX_PATH, DEFAULT_OPT_RULES_PATH,
} from "./cam-turning-recipe-resolver.mjs";
import { planPartProgram, planPartProgramFromDefaults, LATHE_OP_ORDER } from "./cam-part-program-planner.mjs";
import { DEFAULT_LEARNED_ORDER_PATH } from "./cam-learned-order-store.mjs";
import { existsSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MATRIX = resolve(__dirname, "../../state/shared/cam-drive/CAM-OP-TEMPLATE-MATRIX.json");
const RULES = resolve(__dirname, "../../state/shared/cam-drive/CAM-OPTIMIZATION-RULES.json");

// A realistic JM turned part in CORPUS-LEARNED canonical order (LATHE_OP_ORDER, U-CAM-LOOP-LEARN-ORDER):
// face datum → OD rough → center+drill → OD finish → ID bore → groove → thread → part-off. The corpus
// (16,558 real JM Okuma programs) disproved the prior drill-before-OD intuition at 92-100% confidence —
// JM turns the OD (rough→finish) BEFORE drilling/boring. ISO-H tool steel on LTH-02 (Okuma GENOS).
// (Fixture reordered to match the learned ranking so "canonical order → no sequence warnings" holds;
// the prior drill-first fixture went stale when commit 446dc68261 updated LATHE_OP_ORDER but not this.)
const JM_PART = {
  partNumber: "TEST-DIE-CASE",
  material_iso_group: "H",
  machineId: "LTH-02",
  machineModel: "Okuma_GENOS_L200E-M",
  operations: [
    { family: "facing", inputs: { diameter_in: 2.94 } },
    { family: "OD_roughing", inputs: { diameter_in: 2.94 } },
    { family: "drilling_centering", inputs: { diameter_in: 0.5 } },
    { family: "OD_finishing", inputs: { diameter_in: 2.94, finish: "finish" } },
    { family: "ID_boring", inputs: { diameter_in: 0.992, bore_depth_in: 1.5 } },
    { family: "grooving", inputs: { groove_width_in: 0.125, groove_depth_in: 0.2 } },
    { family: "threading", inputs: { thread_tpi: 16, diameter_in: 1.0 } },
    { family: "parting_cutoff", inputs: { diameter_in: 2.94 } },
  ],
};

test("plans a whole part: 8 ordered ops, each with strategy + optimization_plan + safety gates", () => {
  const m = loadMatrix(MATRIX);
  const rules = loadOptimizationRules(RULES);
  const plan = planPartProgram(m, rules, JM_PART);
  assert.equal(plan.op_count, 8);
  assert.equal(plan.ordered_ops.length, 8);
  for (const op of plan.ordered_ops) {
    assert.ok(op.fusion_strategy, `${op.family}: must carry a fusion_strategy`);
    assert.ok(op.safety_gates.length > 0, `${op.family}: must carry safety gates`);
    assert.ok(Array.isArray(op.optimization_plan), `${op.family}: must carry an optimization_plan`);
    assert.ok(op.cutting_condition_directive.delegate_to, `${op.family}: cutting must delegate to physics`);
  }
});

test("material KNOWN (H) → zero ops pending material; summary aggregates gates + ROI", () => {
  const plan = planPartProgram(loadMatrix(MATRIX), loadOptimizationRules(RULES), JM_PART);
  assert.equal(plan.material_iso_group, "H");
  assert.equal(plan.part_summary.material_resolved, true);
  assert.equal(plan.part_summary.ops_pending_material, 0);
  assert.ok(plan.part_summary.total_safety_gates > 8, "≥1 gate per op aggregated");
  assert.ok(plan.part_summary.optimization_moves_by_roi.time >= 1, "time-ROI moves present across the part");
  assert.ok(plan.part_summary.optimization_moves_by_roi.accuracy >= 1, "accuracy-ROI moves present across the part");
  // safety is enforced as GUARDS (non-negotiable constraints), not an optimization-move ROI
  assert.ok(plan.part_summary.unique_safety_gates >= 5, "broad safety-gate coverage across the part");
});

test("material UNKNOWN → ops with material-dependent rules flagged pending (no silent default)", () => {
  const noMat = { ...JM_PART, material_iso_group: undefined };
  const plan = planPartProgram(loadMatrix(MATRIX), loadOptimizationRules(RULES), noMat);
  assert.equal(plan.part_summary.material_resolved, false);
  assert.ok(plan.part_summary.ops_pending_material >= 4, "several families have material-dependent SFM rules");
});

test("canonical lathe order → no sequence warnings", () => {
  const plan = planPartProgram(loadMatrix(MATRIX), loadOptimizationRules(RULES), JM_PART);
  assert.deepEqual(plan.part_summary.sequence_warnings, []);
});

test("scrambled order (part-off FIRST) → sequence warning fires", () => {
  const scrambled = {
    ...JM_PART,
    operations: [
      { family: "parting_cutoff", inputs: { diameter_in: 2.94 } },
      { family: "facing", inputs: { diameter_in: 2.94 } },
    ],
  };
  const plan = planPartProgram(loadMatrix(MATRIX), loadOptimizationRules(RULES), scrambled);
  assert.ok(plan.part_summary.sequence_warnings.length >= 1, "parting-before-facing must warn");
  assert.match(plan.part_summary.sequence_warnings[0], /out of canonical lathe order/);
});

test("all ops honestly NOT ready_to_drive (fusion_strategy unverified) → flagged in summary", () => {
  const plan = planPartProgram(loadMatrix(MATRIX), loadOptimizationRules(RULES), JM_PART);
  assert.equal(plan.part_summary.ops_not_ready_to_drive, 8); // all 8 strategies unverified until live-checked
});

test("throws on a part with no operations", () => {
  assert.throws(() => planPartProgram(loadMatrix(MATRIX), loadOptimizationRules(RULES), { operations: [] }), /operations/);
});

test("LATHE_OP_ORDER ranks facing earliest and parting last", () => {
  assert.ok(LATHE_OP_ORDER.facing < LATHE_OP_ORDER.OD_roughing);
  assert.ok(LATHE_OP_ORDER.parting_cutoff > LATHE_OP_ORDER.threading);
});

test("planPartProgramFromDefaults loads real matrix+rules and plans", () => {
  assert.match(DEFAULT_MATRIX_PATH, /CAM-OP-TEMPLATE-MATRIX/);
  assert.match(DEFAULT_OPT_RULES_PATH, /CAM-OPTIMIZATION-RULES/);
  const plan = planPartProgramFromDefaults(JM_PART, MATRIX, RULES);
  assert.equal(plan.op_count, 8);
  assert.equal(plan.partNumber, "TEST-DIE-CASE");
});

// ── U-CAM-SELFLEARN-PERSIST: the planner now LOADS the learned order (closed loop) ──────────────
test("planPartProgram honors an INJECTED orderMap + labels order_source (the closed-loop hook)", () => {
  // a 'retrained' map: OD_roughing promoted to rank 5. The plan's ranks must reflect the INJECTED
  // map, not the hard-coded 20 — this is the mechanism that lets a retrain change behavior w/o code edit.
  const learned = { ...LATHE_OP_ORDER, OD_roughing: 5 };
  const plan = planPartProgram(loadMatrix(MATRIX), loadOptimizationRules(RULES), JM_PART, learned, "learned-artifact");
  assert.equal(plan.order_source, "learned-artifact");
  assert.equal(plan.ordered_ops.find((o) => o.family === "OD_roughing").order_rank, 5);
});

test("planPartProgram default order_source is builtin-default + uses the hard-coded ranks (3-arg back-compat)", () => {
  const plan = planPartProgram(loadMatrix(MATRIX), loadOptimizationRules(RULES), JM_PART);
  assert.equal(plan.order_source, "builtin-default");
  assert.equal(plan.ordered_ops.find((o) => o.family === "OD_roughing").order_rank, LATHE_OP_ORDER.OD_roughing);
});

test("planPartProgramFromDefaults LOADS the persisted learned-op-order.json → order_source learned-artifact (loop closed)", () => {
  // The artifact is shipped with this unit (cam-emit-learned-order.mjs persisted it). Its presence IS
  // the closed loop — if a future change removes it, this fails loudly (the loop reopened). R9 oracle.
  assert.ok(existsSync(DEFAULT_LEARNED_ORDER_PATH), "learned-op-order.json must ship with this unit");
  const plan = planPartProgramFromDefaults(JM_PART, MATRIX, RULES, DEFAULT_LEARNED_ORDER_PATH);
  assert.equal(plan.order_source, "learned-artifact");
});

test("planPartProgramFromDefaults falls back to builtin-default when the order artifact is absent (fail-soft)", () => {
  const plan = planPartProgramFromDefaults(JM_PART, MATRIX, RULES, resolve(__dirname, "__no_such_learned_order__.json"));
  assert.equal(plan.order_source, "default-fallback");
  assert.equal(plan.op_count, 8); // still plans correctly off the hard-coded fallback
});
