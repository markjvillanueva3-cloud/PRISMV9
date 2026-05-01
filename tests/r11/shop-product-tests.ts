/**
 * PRISM R11-MS2: Shop Manager / Quoting Product Tests
 * =====================================================
 * 30 test groups (T1–T30), ~180 assertions
 *
 * Covers: shop_get, shop_materials, shop_job, shop_cost, shop_quote,
 *         shop_schedule, shop_dashboard, shop_report, shop_compare,
 *         shop_history, tier gating, error handling, end-to-end workflow
 *
 * Run: npx tsx tests/r11/shop-product-tests.ts
 */

import { productShop } from "../../src/engines/ProductEngine.js";

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string): void {
  if (cond) { passed++; }
  else { failed++; console.error(`  FAIL: ${msg}`); }
}

function group(label: string): void {
  console.log(`\n── ${label}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// T1: shop_get — Product metadata
// ═══════════════════════════════════════════════════════════════════════════════
group("T1: shop_get — metadata");
const meta = productShop("shop_get", {});
assert(meta.product === "Shop Manager", "T1.1 product name");
assert(meta.version === "1.0.0", "T1.2 version");
assert(Array.isArray(meta.actions) && meta.actions.length === 10, "T1.3 10 actions");
assert(meta.machines >= 7, "T1.4 ≥7 machines");
assert(meta.materials >= 17, "T1.5 ≥17 materials");
assert(meta.tiers.length === 3, "T1.6 3 tiers");
assert(meta.labor_categories >= 4, "T1.7 ≥4 labor categories");

// ═══════════════════════════════════════════════════════════════════════════════
// T2: shop_materials — List materials with machinability
// ═══════════════════════════════════════════════════════════════════════════════
group("T2: shop_materials — list");
const matRes = productShop("shop_materials", {});
assert(matRes.total >= 17, "T2.1 ≥17 materials");
assert(matRes.materials.length === matRes.total, "T2.2 array matches total");
const firstMat = matRes.materials[0];
assert(firstMat.id !== undefined, "T2.3 has id");
assert(firstMat.name !== undefined, "T2.4 has name");
assert(firstMat.hardness_hb > 0, "T2.5 has hardness");
assert(["excellent", "good", "moderate", "difficult"].includes(firstMat.machinability), "T2.6 valid machinability");

// ═══════════════════════════════════════════════════════════════════════════════
// T3–T5: shop_job — Job planning
// ═══════════════════════════════════════════════════════════════════════════════
group("T3: shop_job — single feature");
const job1 = productShop("shop_job", {
  material: "4140",
  features: [{ feature: "pocket", depth: 15, width: 60, length: 80 }],
});
assert(job1.material === "4140", "T3.1 correct material");
assert(job1.operations.length === 1, "T3.2 1 operation");
assert(job1.total_cycle_time_min > 0, "T3.3 cycle time > 0");
assert(job1.min_tool_life_min > 0, "T3.4 tool life > 0");
assert(job1.parts_per_tool_edge >= 1, "T3.5 parts/edge ≥ 1");
assert(job1.average_safety_score > 0, "T3.6 safety > 0");
const op1 = job1.operations[0];
assert(op1.step === 1, "T3.7 step number");
assert(op1.cutting_speed > 0, "T3.8 cutting speed > 0");
assert(op1.feed_rate > 0, "T3.9 feed rate > 0");
assert(op1.mrr > 0, "T3.10 MRR > 0");

group("T4: shop_job — multi-feature");
const job2 = productShop("shop_job", {
  material: "6061",
  features: [
    { feature: "pocket", depth: 10, width: 50, length: 100 },
    { feature: "drilling", depth: 20, width: 10, length: 10 },
    { feature: "finishing", depth: 2, width: 50, length: 100 },
  ],
});
assert(job2.operations.length === 3, "T4.1 3 operations");
assert(job2.total_cycle_time_min > 0, "T4.2 total cycle time > 0");
// Aluminum should be faster than steel
assert(job2.operations[0].cutting_speed > job1.operations[0].cutting_speed, "T4.3 aluminum faster than alloy steel");

group("T5: shop_job — batch size");
const job3 = productShop("shop_job", {
  material: "304",
  features: [{ feature: "pocket", depth: 10 }],
  batch_size: 50,
});
assert(job3.batch_size === 50, "T5.1 batch_size = 50");

// ═══════════════════════════════════════════════════════════════════════════════
// T6–T8: shop_cost — Cost breakdown
// ═══════════════════════════════════════════════════════════════════════════════
group("T6: shop_cost — basic");
const cost1 = productShop("shop_cost", {
  material: "4140",
  features: [{ feature: "pocket", depth: 15, width: 60, length: 80 }],
});
assert(cost1.cost_per_part > 0, "T6.1 cost > 0");
assert(cost1.price_per_part > cost1.cost_per_part, "T6.2 price > cost (margin applied)");
assert(cost1.breakdown !== undefined, "T6.3 has breakdown");
assert(cost1.breakdown.machine_cost > 0, "T6.4 machine_cost > 0");
assert(cost1.breakdown.tool_cost > 0, "T6.5 tool_cost > 0");
assert(cost1.breakdown.material_cost > 0, "T6.6 material_cost > 0");
assert(cost1.breakdown.setup_cost > 0, "T6.7 setup_cost > 0");
assert(cost1.cycle_time_min > 0, "T6.8 cycle_time > 0");
assert(cost1.machine.name !== undefined, "T6.9 has machine name");

group("T7: shop_cost — batch amortization");
const costBatch = productShop("shop_cost", {
  material: "4140",
  features: [{ feature: "pocket", depth: 15, width: 60, length: 80 }],
  batch_size: 100,
});
// Setup cost per part should be lower with larger batch
assert(costBatch.breakdown.setup_cost < cost1.breakdown.setup_cost, "T7.1 batch setup < single setup");
assert(costBatch.batch_size === 100, "T7.2 batch = 100");
assert(costBatch.batch_total > 0, "T7.3 batch_total > 0");

group("T8: shop_cost — 5-axis machine");
const cost5axis = productShop("shop_cost", {
  material: "Ti-6Al-4V",
  features: [{ feature: "pocket", depth: 10, width: 30, length: 40 }],
  machine: "5axis_mill",
});
assert(cost5axis.machine.rate_per_hour === 150, "T8.1 5-axis rate = $150/hr");
assert(cost5axis.cost_per_part > 0, "T8.2 cost > 0");

// ═══════════════════════════════════════════════════════════════════════════════
// T9–T11: shop_quote — Professional quote generation
// ═══════════════════════════════════════════════════════════════════════════════
group("T9: shop_quote — basic");
const quote = productShop("shop_quote", {
  material: "4140",
  features: [{ feature: "pocket", depth: 15 }],
  customer: "Acme Corp",
  part_name: "Bracket A1",
  batch_size: 25,
});
assert(quote.quote_number !== undefined, "T9.1 has quote_number");
assert(quote.date !== undefined, "T9.2 has date");
assert(quote.valid_until !== undefined, "T9.3 has valid_until");
assert(quote.customer === "Acme Corp", "T9.4 correct customer");
assert(quote.part.name === "Bracket A1", "T9.5 correct part name");
assert(quote.pricing.unit_price > 0, "T9.6 unit_price > 0");
assert(quote.pricing.quantity === 25, "T9.7 quantity = 25");
assert(quote.pricing.subtotal > 0, "T9.8 subtotal > 0");
assert(quote.lead_time_days > 0, "T9.9 lead time > 0");
assert(quote.notes.length > 0, "T9.10 has notes");

group("T10: shop_quote — free tier blocked");
const quoteFree = productShop("shop_quote", { tier: "free", material: "4140", features: [{ feature: "pocket", depth: 10 }] });
assert(quoteFree.error !== undefined, "T10.1 free tier rejected");
assert(quoteFree.error.includes("Pro"), "T10.2 mentions Pro tier");

group("T11: shop_quote — large batch");
const quoteLarge = productShop("shop_quote", {
  material: "6061",
  features: [{ feature: "pocket", depth: 5 }],
  batch_size: 500,
});
assert(quoteLarge.pricing.quantity === 500, "T11.1 quantity = 500");
assert(quoteLarge.notes.some((n: string) => n.includes("Volume") || n.includes("volume") || n.includes("discount")), "T11.2 volume note for large batch");

// ═══════════════════════════════════════════════════════════════════════════════
// T12–T14: shop_schedule — Production scheduling
// ═══════════════════════════════════════════════════════════════════════════════
group("T12: shop_schedule — basic");
const sched = productShop("shop_schedule", {
  material: "4140",
  features: [{ feature: "pocket", depth: 15 }],
  batch_size: 50,
});
assert(sched.batch_size === 50, "T12.1 batch = 50");
assert(sched.production_days > 0, "T12.2 production_days > 0");
assert(sched.parts_per_day > 0, "T12.3 parts_per_day > 0");
assert(sched.start_date !== undefined, "T12.4 has start_date");
assert(sched.end_date !== undefined, "T12.5 has end_date");
assert(sched.milestones.length >= 4, "T12.6 ≥4 milestones");

group("T13: shop_schedule — custom parameters");
const sched2 = productShop("shop_schedule", {
  material: "4140",
  features: [{ feature: "pocket", depth: 15 }],
  batch_size: 100,
  hours_per_day: 16,
  efficiency: 0.90,
});
assert(sched2.hours_per_day === 16, "T13.1 16 hours/day");
assert(sched2.efficiency_pct === 90, "T13.2 90% efficiency");
// 16hrs/day should complete faster than 8hrs/day
assert(sched2.production_days <= sched.production_days, "T13.3 longer shift = fewer days");

group("T14: shop_schedule — milestones");
const milestones = sched.milestones;
assert(milestones[0].phase === "Setup", "T14.1 first milestone is Setup");
assert(milestones[milestones.length - 1].phase === "QC/Ship", "T14.2 last milestone is QC/Ship");

// ═══════════════════════════════════════════════════════════════════════════════
// T15: shop_dashboard — Shop floor overview
// ═══════════════════════════════════════════════════════════════════════════════
group("T15: shop_dashboard — overview");
const dash = productShop("shop_dashboard", {});
assert(dash.machines.length >= 7, "T15.1 ≥7 machines");
assert(dash.summary.total_machines >= 7, "T15.2 summary total ≥7");
assert(dash.summary.average_utilization_pct > 0, "T15.3 utilization > 0");
assert(dash.labor_rates !== undefined, "T15.4 has labor_rates");
assert(dash.timestamp !== undefined, "T15.5 has timestamp");

// ═══════════════════════════════════════════════════════════════════════════════
// T16–T17: shop_report — Sustainability & cost report
// ═══════════════════════════════════════════════════════════════════════════════
group("T16: shop_report — basic");
const report = productShop("shop_report", {
  material: "4140",
  features: [{ feature: "pocket", depth: 15, width: 60, length: 80 }],
  batch_size: 10,
});
assert(report.cost_summary.cost_per_part > 0, "T16.1 cost > 0");
assert(report.energy.kwh_per_part > 0, "T16.2 energy > 0");
assert(report.sustainability.co2_kg_per_part > 0, "T16.3 CO2 > 0");
assert(report.sustainability.recyclable_pct > 0, "T16.4 recyclable > 0");
assert(report.breakdown !== undefined, "T16.5 has breakdown");

group("T17: shop_report — free tier blocked");
const reportFree = productShop("shop_report", { tier: "free", material: "4140", features: [{ feature: "pocket", depth: 10 }] });
assert(reportFree.error !== undefined, "T17.1 free tier rejected");

// ═══════════════════════════════════════════════════════════════════════════════
// T18–T20: shop_compare — Machine comparison
// ═══════════════════════════════════════════════════════════════════════════════
group("T18: shop_compare — 2 machines");
const cmpRes = productShop("shop_compare", {
  material: "4140",
  features: [{ feature: "pocket", depth: 15 }],
  machines: ["3axis_vertical", "5axis_mill"],
});
assert(cmpRes.results.length === 2, "T18.1 2 results");
assert(cmpRes.recommendation !== undefined, "T18.2 has recommendation");
// 3-axis should be cheaper than 5-axis for simple pocket
assert(cmpRes.results[0].cost_per_part <= cmpRes.results[1].cost_per_part, "T18.3 sorted by cost");

group("T19: shop_compare — 3 machines");
const cmpRes3 = productShop("shop_compare", {
  material: "6061",
  features: [{ feature: "pocket", depth: 10 }],
  machines: ["3axis_vertical", "3axis_horizontal", "5axis_mill"],
});
assert(cmpRes3.results.length === 3, "T19.1 3 results");
cmpRes3.results.forEach((r: any, i: number) => {
  assert(r.machine.name !== undefined, `T19.${i + 2} result ${i} has machine name`);
  assert(r.cost_per_part > 0, `T19.${i + 5} result ${i} cost > 0`);
});

group("T20: shop_compare — defaults");
const cmpDefault = productShop("shop_compare", { material: "4140", features: [{ feature: "pocket", depth: 10 }] });
assert(cmpDefault.results.length >= 2, "T20.1 ≥2 default machines");

// ═══════════════════════════════════════════════════════════════════════════════
// T21–T22: shop_history — Session tracking
// ═══════════════════════════════════════════════════════════════════════════════
group("T21: shop_history — has entries");
const hist = productShop("shop_history", {});
assert(hist.history.length > 0, "T21.1 history non-empty");
assert(hist.total > 0, "T21.2 total > 0");

group("T22: shop_history — tracks action types");
const actionTypes = new Set(hist.history.map((h: any) => h.action));
assert(actionTypes.has("shop_job"), "T22.1 tracks shop_job");
assert(actionTypes.has("shop_cost"), "T22.2 tracks shop_cost");
assert(actionTypes.has("shop_quote"), "T22.3 tracks shop_quote");
assert(actionTypes.has("shop_schedule"), "T22.4 tracks shop_schedule");
assert(actionTypes.has("shop_dashboard"), "T22.5 tracks shop_dashboard");
assert(actionTypes.has("shop_compare"), "T22.6 tracks shop_compare");
assert(actionTypes.has("shop_materials"), "T22.7 tracks shop_materials");

// ═══════════════════════════════════════════════════════════════════════════════
// T23–T25: Cross-material physics consistency
// ═══════════════════════════════════════════════════════════════════════════════
group("T23: Cross-material — cost ordering");
// Use larger volume to ensure cycle time differences survive rounding
const costAluminum = productShop("shop_cost", { material: "6061", features: [{ feature: "pocket", depth: 25, width: 100, length: 100 }] });
const costSteel = productShop("shop_cost", { material: "4140", features: [{ feature: "pocket", depth: 25, width: 100, length: 100 }] });
const costTitanium = productShop("shop_cost", { material: "Ti-6Al-4V", features: [{ feature: "pocket", depth: 25, width: 100, length: 100 }] });
// Titanium should cost more than steel, steel more than aluminum (generally)
assert(costAluminum.cycle_time_min < costTitanium.cycle_time_min, "T23.1 aluminum faster than titanium");
assert(costSteel.cycle_time_min < costTitanium.cycle_time_min, "T23.2 steel faster than titanium");

group("T24: Cross-material — cutting speed ordering");
const jobAl = productShop("shop_job", { material: "6061", features: [{ feature: "pocket", depth: 10 }] });
const jobSt = productShop("shop_job", { material: "4140", features: [{ feature: "pocket", depth: 10 }] });
const jobTi = productShop("shop_job", { material: "Ti-6Al-4V", features: [{ feature: "pocket", depth: 10 }] });
assert(jobAl.operations[0].cutting_speed > jobSt.operations[0].cutting_speed, "T24.1 Al Vc > Steel Vc");
assert(jobSt.operations[0].cutting_speed > jobTi.operations[0].cutting_speed, "T24.2 Steel Vc > Ti Vc");

group("T25: Multiple materials job plan");
const materials = ["4140", "6061", "304", "Ti-6Al-4V", "Inconel 718", "PEEK", "C360"];
materials.forEach((mat, i) => {
  const plan = productShop("shop_job", { material: mat, features: [{ feature: "pocket", depth: 10 }] });
  assert(plan.total_cycle_time_min > 0, `T25.${i + 1} ${mat} cycle time > 0`);
});

// ═══════════════════════════════════════════════════════════════════════════════
// T26–T27: Error handling
// ═══════════════════════════════════════════════════════════════════════════════
group("T26: Error handling — unknown action");
const unknownAction = productShop("shop_unknown", {});
assert(unknownAction.error !== undefined, "T26.1 unknown action returns error");
assert(unknownAction.error.includes("Unknown Shop action"), "T26.2 error message correct");

group("T27: Error handling — defaults for missing params");
const jobDefault = productShop("shop_job", {});
assert(jobDefault.operations.length >= 1, "T27.1 uses default features");
assert(jobDefault.total_cycle_time_min > 0, "T27.2 cycle time > 0 with defaults");

// ═══════════════════════════════════════════════════════════════════════════════
// T28: All 7 machine types in comparison
// ═══════════════════════════════════════════════════════════════════════════════
group("T28: All machine types");
const allMachines = ["3axis_vertical", "3axis_horizontal", "5axis_mill", "cnc_lathe", "mill_turn", "wire_edm", "surface_grinder"];
const cmpAll = productShop("shop_compare", {
  material: "4140",
  features: [{ feature: "pocket", depth: 10 }],
  machines: allMachines,
});
assert(cmpAll.results.length === 7, "T28.1 7 results");
cmpAll.results.forEach((r: any, i: number) => {
  assert(r.cost_per_part > 0, `T28.${i + 2} machine ${i} cost > 0`);
});

// ═══════════════════════════════════════════════════════════════════════════════
// T29: Batch size scaling
// ═══════════════════════════════════════════════════════════════════════════════
group("T29: Batch scaling");
const batch1 = productShop("shop_cost", { material: "4140", features: [{ feature: "pocket", depth: 10 }], batch_size: 1 });
const batch100 = productShop("shop_cost", { material: "4140", features: [{ feature: "pocket", depth: 10 }], batch_size: 100 });
const batch1000 = productShop("shop_cost", { material: "4140", features: [{ feature: "pocket", depth: 10 }], batch_size: 1000 });
// Cost per part should decrease with batch size (setup amortization)
assert(batch1.cost_per_part > batch100.cost_per_part, "T29.1 batch 100 cheaper per part than batch 1");
assert(batch100.cost_per_part > batch1000.cost_per_part, "T29.2 batch 1000 cheaper per part than batch 100");

// ═══════════════════════════════════════════════════════════════════════════════
// T30: End-to-end workflow
// ═══════════════════════════════════════════════════════════════════════════════
group("T30: End-to-end workflow");
// Step 1: Plan the job
const e2eJob = productShop("shop_job", {
  material: "4140",
  features: [
    { feature: "pocket", depth: 15, width: 60, length: 80 },
    { feature: "drilling", depth: 25, width: 12, length: 12 },
  ],
  batch_size: 25,
});
assert(e2eJob.operations.length === 2, "T30.1 2 operations planned");

// Step 2: Get cost
const e2eCost = productShop("shop_cost", {
  material: "4140",
  features: [
    { feature: "pocket", depth: 15, width: 60, length: 80 },
    { feature: "drilling", depth: 25, width: 12, length: 12 },
  ],
  batch_size: 25,
});
assert(e2eCost.cost_per_part > 0, "T30.2 cost calculated");

// Step 3: Generate quote
const e2eQuote = productShop("shop_quote", {
  material: "4140",
  features: [
    { feature: "pocket", depth: 15, width: 60, length: 80 },
    { feature: "drilling", depth: 25, width: 12, length: 12 },
  ],
  batch_size: 25,
  customer: "Test Corp",
  part_name: "E2E Bracket",
});
assert(e2eQuote.quote_number !== undefined, "T30.3 quote generated");

// Step 4: Schedule
const e2eSched = productShop("shop_schedule", {
  material: "4140",
  features: [
    { feature: "pocket", depth: 15, width: 60, length: 80 },
    { feature: "drilling", depth: 25, width: 12, length: 12 },
  ],
  batch_size: 25,
});
assert(e2eSched.production_days > 0, "T30.4 schedule created");

// Step 5: Report
const e2eReport = productShop("shop_report", {
  material: "4140",
  features: [
    { feature: "pocket", depth: 15, width: 60, length: 80 },
    { feature: "drilling", depth: 25, width: 12, length: 12 },
  ],
  batch_size: 25,
});
assert(e2eReport.sustainability.co2_kg_per_part > 0, "T30.5 sustainability report");

// ═══════════════════════════════════════════════════════════════════════════════
// RESULTS
// ═══════════════════════════════════════════════════════════════════════════════
console.log(`\n${"═".repeat(60)}`);
console.log(`Shop Manager Tests: ${passed} passed, ${failed} failed (${passed + failed} total)`);
console.log(`${"═".repeat(60)}`);

if (failed > 0) {
  console.error(`\nFAILED: ${failed} assertion(s) did not pass`);
  process.exit(1);
} else {
  console.log("\nAll Shop Manager product tests passed!");
}
