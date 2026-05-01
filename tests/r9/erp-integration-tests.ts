/**
 * R9-MS4 ERP Integration Engine Tests
 * =====================================
 * Validates: work order import, PRISM plan generation, cost feedback,
 * quality import, tool inventory, dispatcher routing.
 */

import {
  erpIntegration, importWorkOrder, recordCostFeedback, importQualityData,
} from "../../src/engines/ERPIntegrationEngine.js";

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) { passed++; }
  else { failed++; console.error(`  FAIL: ${msg}`); }
}

// ─── T1: erp_import_wo — basic work order ───────────────────────────────────
console.log("T1: erp_import_wo — basic");
{
  const r = erpIntegration("erp_import_wo", {
    wo_number: "WO-1001",
    part_number: "BRACKET-A",
    material: "6061 Aluminum",
    quantity: 25,
    due_date: "2026-03-01",
    routing: [
      { step: 10, operation: "Rough Milling", work_center: "Haas-VF2" },
      { step: 20, operation: "Finish Milling", work_center: "Haas-VF2" },
      { step: 30, operation: "Deburr", work_center: "Bench" },
    ],
  });
  assert(r.wo_number === "WO-1001", "T1.1 wo number");
  assert(r.part_number === "BRACKET-A", "T1.2 part number");
  assert(r.quantity === 25, "T1.3 quantity");
  assert(r.routing.length === 3, "T1.4 3 routing steps");
  assert(r.total_cycle_time_min > 0, "T1.5 cycle time > 0");
  assert(r.estimated_cost.total > 0, "T1.6 estimated cost > 0");
  assert(r.estimated_cost.per_part > 0, "T1.7 per-part cost > 0");
  assert(r.recommendations.length > 0, "T1.8 has recommendations");
}

// ─── T2: erp_import_wo — parameters in routing ─────────────────────────────
console.log("T2: erp_import_wo — routing parameters");
{
  const r = erpIntegration("erp_import_wo", {
    wo_number: "WO-1002",
    part_number: "HOUSING-B",
    material: "Steel",
    quantity: 10,
    routing: [
      { step: 10, operation: "Rough Milling", work_center: "DMG-DMU50", estimated_time_min: 15 },
    ],
  });
  const step = r.routing[0];
  assert(step.parameters.rpm > 0, "T2.1 step has rpm");
  assert(step.parameters.feed_mmmin > 0, "T2.2 step has feed");
  assert(step.parameters.doc_mm > 0, "T2.3 step has doc");
  assert(step.parameters.strategy !== undefined, "T2.4 step has strategy");
  assert(step.tool_recommendation.length > 0, "T2.5 step has tool rec");
}

// ─── T3: erp_import_wo — cost breakdown ─────────────────────────────────────
console.log("T3: erp_import_wo — cost breakdown");
{
  const r = erpIntegration("erp_import_wo", {
    wo_number: "WO-1003",
    part_number: "SHAFT-C",
    material: "4140 Steel",
    quantity: 50,
    routing: [
      { step: 10, operation: "Turning", work_center: "Lathe-01" },
      { step: 20, operation: "Milling", work_center: "Mill-02" },
    ],
  });
  const cost = r.estimated_cost;
  assert(cost.machine_time > 0, "T3.1 machine cost > 0");
  assert(cost.labor > 0, "T3.2 labor cost > 0");
  assert(cost.tooling > 0, "T3.3 tooling cost > 0");
  assert(cost.material > 0, "T3.4 material cost > 0");
  assert(cost.overhead > 0, "T3.5 overhead cost > 0");
  assert(Math.abs(cost.total - (cost.machine_time + cost.labor + cost.tooling + cost.material + cost.overhead)) < 1, "T3.6 total = sum of categories");
}

// ─── T4: erp_get_plan — retrieve plan ───────────────────────────────────────
console.log("T4: erp_get_plan — retrieve");
{
  const r = erpIntegration("erp_get_plan", { wo_number: "WO-1001" });
  assert(r.wo_number === "WO-1001", "T4.1 found plan");
  assert(r.routing.length === 3, "T4.2 routing steps");
}

// ─── T5: erp_get_plan — not found ──────────────────────────────────────────
console.log("T5: erp_get_plan — not found");
{
  const r = erpIntegration("erp_get_plan", { wo_number: "WO-NONEXISTENT" });
  assert(r.error !== undefined, "T5.1 error for missing plan");
}

// ─── T6: erp_cost_feedback — record actual costs ────────────────────────────
console.log("T6: erp_cost_feedback — actual vs estimated");
{
  const r = erpIntegration("erp_cost_feedback", {
    wo_number: "WO-1001",
    actual_machine_cost: 500,
    actual_labor_cost: 300,
    actual_tooling_cost: 45,
    actual_material_cost: 625,
    actual_overhead: 120,
    quantity: 25,
  });
  assert(r.wo_number === "WO-1001", "T6.1 wo number");
  assert(r.variance !== undefined, "T6.2 has variance");
  assert(typeof r.variance.total_pct === "number", "T6.3 total variance pct");
  assert(r.variance.by_category !== undefined, "T6.4 has category variances");
  assert(r.actual.total > 0, "T6.5 actual total > 0");
}

// ─── T7: erp_cost_history — retrieve history ────────────────────────────────
console.log("T7: erp_cost_history");
{
  const r = erpIntegration("erp_cost_history", {});
  assert(r.total >= 1, "T7.1 at least 1 feedback record");
  assert(typeof r.avg_variance_pct === "number", "T7.2 has avg variance");
}

// ─── T8: erp_quality_import — all in spec ───────────────────────────────────
console.log("T8: erp_quality_import — all in spec");
{
  const r = erpIntegration("erp_quality_import", {
    wo_number: "WO-1001",
    part_number: "BRACKET-A",
    measurements: [
      { feature: "Length", nominal: 100, tolerance_plus: 0.1, tolerance_minus: -0.1, actual: 100.05, unit: "mm", in_spec: false },
      { feature: "Width", nominal: 50, tolerance_plus: 0.05, tolerance_minus: -0.05, actual: 50.02, unit: "mm", in_spec: false },
      { feature: "Hole Dia", nominal: 10, tolerance_plus: 0.02, tolerance_minus: -0.02, actual: 10.01, unit: "mm", in_spec: false },
    ],
    inspector: "John",
  });
  assert(r.pass === true, "T8.1 all in spec → pass");
  assert(r.analysis.out_of_spec === 0, "T8.2 0 out of spec");
  assert(r.analysis.total_features === 3, "T8.3 total features = 3");
}

// ─── T9: erp_quality_import — some out of spec ─────────────────────────────
console.log("T9: erp_quality_import — out of spec");
{
  const r = erpIntegration("erp_quality_import", {
    wo_number: "WO-1002",
    measurements: [
      { feature: "Length", nominal: 100, tolerance_plus: 0.1, tolerance_minus: -0.1, actual: 100.3, unit: "mm", in_spec: false },
      { feature: "Width", nominal: 50, tolerance_plus: 0.05, tolerance_minus: -0.05, actual: 50.02, unit: "mm", in_spec: false },
    ],
  });
  assert(r.pass === false, "T9.1 out of spec → fail");
  assert(r.analysis.out_of_spec === 1, "T9.2 1 out of spec");
  assert(r.analysis.deviations.length === 1, "T9.3 1 deviation");
  assert(r.analysis.deviations[0].feature === "Length", "T9.4 length is out of spec");
}

// ─── T10: erp_quality_history ───────────────────────────────────────────────
console.log("T10: erp_quality_history");
{
  const r = erpIntegration("erp_quality_history", {});
  assert(r.total >= 2, "T10.1 at least 2 quality records");
  assert(typeof r.pass_rate === "number", "T10.2 has pass rate");
}

// ─── T11: erp_quality_history — filter by WO ────────────────────────────────
console.log("T11: erp_quality_history — filter");
{
  const r = erpIntegration("erp_quality_history", { wo_number: "WO-1001" });
  assert(r.total >= 1, "T11.1 found WO-1001 records");
}

// ─── T12: erp_tool_inventory — list all ─────────────────────────────────────
console.log("T12: erp_tool_inventory — list all");
{
  const r = erpIntegration("erp_tool_inventory", {});
  assert(r.total >= 6, "T12.1 at least 6 tools");
  assert(Array.isArray(r.items), "T12.2 items is array");
  assert(r.items[0].tool_id !== undefined, "T12.3 first has tool_id");
  assert(typeof r.need_reorder === "number", "T12.4 has reorder count");
}

// ─── T13: erp_tool_inventory — search ───────────────────────────────────────
console.log("T13: erp_tool_inventory — search");
{
  const r = erpIntegration("erp_tool_inventory", { query: "drill" });
  assert(r.total >= 1, "T13.1 found drill tools");
}

// ─── T14: erp_tool_update — update quantity ─────────────────────────────────
console.log("T14: erp_tool_update");
{
  const r = erpIntegration("erp_tool_update", { tool_id: "TI-001", quantity_on_hand: 15 });
  assert(r.quantity_on_hand === 15, "T14.1 updated quantity");
  assert(r.available === 15 - r.quantity_allocated, "T14.2 available recalculated");
}

// ─── T15: erp_tool_update — not found ───────────────────────────────────────
console.log("T15: erp_tool_update — not found");
{
  const r = erpIntegration("erp_tool_update", { tool_id: "TI-NOPE" });
  assert(r.error !== undefined, "T15.1 error for missing tool");
}

// ─── T16: erp_systems — list ERP systems ────────────────────────────────────
console.log("T16: erp_systems");
{
  const r = erpIntegration("erp_systems", {});
  assert(r.total >= 7, "T16.1 at least 7 systems");
  const ids = r.systems.map((s: any) => s.id);
  assert(ids.includes("jobboss"), "T16.2 has jobboss");
  assert(ids.includes("epicor"), "T16.3 has epicor");
  assert(ids.includes("sap"), "T16.4 has sap");
}

// ─── T17: erp_wo_list — list work orders ────────────────────────────────────
console.log("T17: erp_wo_list");
{
  const r = erpIntegration("erp_wo_list", {});
  assert(r.total >= 3, "T17.1 at least 3 work orders");
  assert(r.work_orders[0].wo_number !== undefined, "T17.2 first has wo number");
}

// ─── T18: erp_import_wo — defaults ─────────────────────────────────────────
console.log("T18: erp_import_wo — defaults");
{
  const r = erpIntegration("erp_import_wo", {});
  assert(r.wo_number !== undefined, "T18.1 auto-generated wo number");
  assert(r.routing.length === 3, "T18.2 default 3-step routing");
}

// ─── T19: Direct API — importWorkOrder ──────────────────────────────────────
console.log("T19: Direct API — importWorkOrder");
{
  const plan = importWorkOrder({
    wo_number: "WO-DIRECT",
    part_number: "TEST",
    revision: "A",
    material: "Titanium",
    quantity: 5,
    due_date: "2026-04-01",
    status: "pending",
    routing: [{ step: 10, operation: "Milling", work_center: "Mill-03" }],
  });
  assert(plan.wo_number === "WO-DIRECT", "T19.1 direct import works");
  assert(plan.material === "Titanium", "T19.2 material titanium");
}

// ─── T20: Edge — unknown action ─────────────────────────────────────────────
console.log("T20: Edge — unknown action");
{
  const r = erpIntegration("erp_nonexistent", {});
  assert(r.error !== undefined, "T20.1 unknown action returns error");
}

// ─── Summary ────────────────────────────────────────────────────────────────
console.log(`\n${"=".repeat(60)}`);
console.log(`R9-MS4 ERP Integration: ${passed} passed, ${failed} failed out of ${passed + failed}`);
console.log(`${"=".repeat(60)}`);
process.exit(failed > 0 ? 1 : 0);
