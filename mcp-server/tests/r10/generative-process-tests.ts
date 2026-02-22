/**
 * R10-Rev3 — Generative Process Planning tests
 * Tests: genplan_plan, genplan_features, genplan_setups, genplan_operations,
 *        genplan_optimize, genplan_tools, genplan_cycle, genplan_cost,
 *        genplan_risk, genplan_get
 */
import { generativeProcess } from "../../src/engines/GenerativeProcessEngine.js";

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(cond: boolean, label: string) {
  if (cond) { passed++; }
  else { failed++; failures.push(label); console.log(`  FAIL: ${label}`); }
}

// ─── Standard feature set for reuse ─────────────────────────────────────────

const STANDARD_FEATURES = [
  { type: "pocket" as const, dimensions: { length_mm: 80, width_mm: 40, depth_mm: 25 }, tolerance_mm: 0.05, surface_finish_um: 3.2, access_direction: "top" as const },
  { type: "hole" as const, dimensions: { diameter_mm: 10, depth_mm: 30 }, tolerance_mm: 0.025, through: true, count: 4, access_direction: "top" as const },
  { type: "bore" as const, dimensions: { diameter_mm: 38, depth_mm: 25 }, tolerance_mm: 0.01, surface_finish_um: 1.6, access_direction: "top" as const },
  { type: "face" as const, dimensions: { length_mm: 120, width_mm: 80 }, surface_finish_um: 1.6, access_direction: "top" as const },
  { type: "thread" as const, dimensions: { diameter_mm: 8, depth_mm: 15 }, thread_spec: "M8x1.25", access_direction: "top" as const },
  { type: "chamfer" as const, dimensions: { width_mm: 1, depth_mm: 1 }, access_direction: "top" as const },
  { type: "slot" as const, dimensions: { length_mm: 60, width_mm: 8, depth_mm: 12 }, access_direction: "top" as const },
  { type: "hole" as const, dimensions: { diameter_mm: 6, depth_mm: 20 }, through: true, count: 2, access_direction: "bottom" as const },
  { type: "face" as const, dimensions: { length_mm: 120, width_mm: 80 }, access_direction: "bottom" as const },
];

// ─── T1: genplan_plan — full plan generation ────────────────────────────────

console.log("T1: Plan — steel full plan");
const t1 = generativeProcess("genplan_plan", { material: "4140", features: STANDARD_FEATURES, part_name: "Test Bracket", batch_size: 100 });
assert(t1.plan_id !== undefined, "T1.1 has plan_id");
assert(t1.material === "AISI 4140 Steel", "T1.2 material name");
assert(t1.part_name === "Test Bracket", "T1.3 part name");
assert(t1.batch_size === 100, "T1.4 batch size");
assert((t1.feature_count as number) === 9, "T1.5 feature count");
assert((t1.setup_count as number) >= 1, "T1.6 at least 1 setup");
assert((t1.operation_count as number) >= 9, "T1.7 at least 9 operations");
assert((t1.tool_count as number) >= 3, "T1.8 at least 3 unique tools");
assert((t1.total_cycle_time_min as number) > 0, "T1.9 positive cycle time");
assert((t1.total_cost_usd as number) > 0, "T1.10 positive cost");
assert(t1.cost_breakdown !== undefined, "T1.11 has cost breakdown");
assert(t1.risk_summary !== undefined, "T1.12 has risk summary");
assert(Array.isArray(t1.setups), "T1.13 setups is array");
assert(Array.isArray(t1.operations), "T1.14 operations is array");
assert(Array.isArray(t1.tool_list), "T1.15 tool_list is array");

// ─── T2: genplan_plan — aluminum ────────────────────────────────────────────

console.log("T2: Plan — aluminum");
const t2 = generativeProcess("genplan_plan", {
  material: "7075",
  features: [
    { type: "pocket", dimensions: { length_mm: 60, width_mm: 30, depth_mm: 15 }, access_direction: "top" },
    { type: "hole", dimensions: { diameter_mm: 8, depth_mm: 20 }, through: true, count: 6, access_direction: "top" },
  ],
  batch_size: 50,
});
assert(t2.material === "Aluminum 7075-T6", "T2.1 aluminum material");
assert((t2.feature_count as number) === 2, "T2.2 feature count 2");
assert((t2.total_cycle_time_min as number) > 0, "T2.3 positive time");

// ─── T3: genplan_plan — titanium (harder material) ──────────────────────────

console.log("T3: Plan — titanium");
const t3 = generativeProcess("genplan_plan", {
  material: "titanium",
  features: [
    { type: "pocket", dimensions: { length_mm: 40, width_mm: 20, depth_mm: 10 }, tolerance_mm: 0.02, access_direction: "top" },
    { type: "contour", dimensions: { length_mm: 100, width_mm: 50, depth_mm: 5 }, surface_finish_um: 1.6, access_direction: "top" },
  ],
});
assert(t3.material === "Ti-6Al-4V", "T3.1 titanium material");
assert((t3.total_cycle_time_min as number) > 0, "T3.2 positive time");

// ─── T4: genplan_plan — unknown material ────────────────────────────────────

console.log("T4: Plan — unknown material");
const t4 = generativeProcess("genplan_plan", {
  material: "unobtanium",
  features: [{ type: "pocket", dimensions: { length_mm: 50, width_mm: 30, depth_mm: 10 }, access_direction: "top" }],
});
assert(t4.risk_summary !== undefined, "T4.1 has risk summary");
assert((t4.risk_summary as any).warnings?.length > 0, "T4.2 has warning about unknown material");

// ─── T5: genplan_plan — no features error ───────────────────────────────────

console.log("T5: Plan — no features");
const t5 = generativeProcess("genplan_plan", { material: "steel", features: [] });
assert(t5.error !== undefined, "T5.1 error for empty features");

// ─── T6: genplan_features — feature recognition ────────────────────────────

console.log("T6: Features — recognition");
const t6 = generativeProcess("genplan_features", { features: STANDARD_FEATURES });
assert((t6.feature_count as number) === 9, "T6.1 9 features recognized");
assert(t6.complexity_summary !== undefined, "T6.2 has complexity summary");
const cs = t6.complexity_summary as any;
assert(cs.simple >= 0, "T6.3 simple count");
assert(cs.moderate >= 0, "T6.4 moderate count");
assert(cs.complex >= 0, "T6.5 complex count");
assert(cs.simple + cs.moderate + cs.complex === 9, "T6.6 complexity sum equals 9");
assert(Array.isArray(t6.special_tooling_required), "T6.7 special tooling array");

// ─── T7: genplan_features — bore requires special tooling ───────────────────

console.log("T7: Features — bore special tooling");
const t7 = generativeProcess("genplan_features", {
  features: [{ type: "bore", dimensions: { diameter_mm: 50, depth_mm: 30 }, tolerance_mm: 0.01 }],
});
const specialTools = t7.special_tooling_required as any[];
assert(specialTools.length > 0, "T7.1 bore requires special tooling");
assert(specialTools[0].note.includes("boring bar"), "T7.2 mentions boring bar");

// ─── T8: genplan_features — deep pocket complexity ──────────────────────────

console.log("T8: Features — deep pocket");
const t8 = generativeProcess("genplan_features", {
  features: [{ type: "pocket", dimensions: { length_mm: 50, width_mm: 10, depth_mm: 60 } }],
});
const feats8 = t8.features as any[];
assert(feats8[0].complexity === "complex", "T8.1 deep pocket is complex");
assert(feats8[0].subtype.includes("deep"), "T8.2 subtype contains deep");

// ─── T9: genplan_features — no features error ──────────────────────────────

console.log("T9: Features — no features");
const t9 = generativeProcess("genplan_features", { features: [] });
assert(t9.error !== undefined, "T9.1 error for empty features");

// ─── T10: genplan_setups — multi-direction ──────────────────────────────────

console.log("T10: Setups — multi-direction");
const t10 = generativeProcess("genplan_setups", { features: STANDARD_FEATURES });
assert((t10.setup_count as number) === 2, "T10.1 2 setups (top+bottom)");
const setups10 = t10.setups as any[];
assert(setups10[0].access_direction === "top", "T10.2 first setup is top");
assert(setups10[1].access_direction === "bottom", "T10.3 second setup is bottom");
const dist = t10.feature_distribution as any[];
assert(dist[0].feature_count === 7, "T10.4 top has 7 features");
assert(dist[1].feature_count === 2, "T10.5 bottom has 2 features");

// ─── T11: genplan_setups — single direction ─────────────────────────────────

console.log("T11: Setups — single direction");
const t11 = generativeProcess("genplan_setups", {
  features: [
    { type: "pocket", dimensions: { length_mm: 50, width_mm: 30, depth_mm: 10 }, access_direction: "top" },
    { type: "hole", dimensions: { diameter_mm: 10, depth_mm: 20 }, access_direction: "top" },
  ],
});
assert((t11.setup_count as number) === 1, "T11.1 single setup");

// ─── T12: genplan_operations — sequencing ───────────────────────────────────

console.log("T12: Operations — sequencing");
const t12 = generativeProcess("genplan_operations", {
  material: "steel",
  features: STANDARD_FEATURES,
});
assert((t12.operation_count as number) >= 9, "T12.1 at least 9 operations");
const ops12 = t12.operations as any[];
assert(ops12[0].setup === 1, "T12.2 first op in setup 1");
assert(ops12.every((o: any) => o.id && o.feature && o.phase), "T12.3 all ops have id/feature/phase");

// ─── T13: genplan_operations — unknown material ─────────────────────────────

console.log("T13: Operations — unknown material");
const t13 = generativeProcess("genplan_operations", {
  material: "unobtanium",
  features: [{ type: "pocket", dimensions: { length_mm: 50, width_mm: 30, depth_mm: 10 } }],
});
assert(t13.error !== undefined, "T13.1 error for unknown material");

// ─── T14: genplan_optimize — parameter output ───────────────────────────────

console.log("T14: Optimize — parameters");
const t14 = generativeProcess("genplan_optimize", {
  material: "7075",
  features: [
    { type: "pocket", dimensions: { length_mm: 60, width_mm: 30, depth_mm: 15 }, access_direction: "top" },
    { type: "hole", dimensions: { diameter_mm: 10, depth_mm: 25 }, through: true, access_direction: "top" },
  ],
});
assert(t14.optimization_summary !== undefined, "T14.1 has summary");
const params14 = t14.parameters as any[];
assert(params14.length >= 2, "T14.2 at least 2 parameter sets");
assert(params14.every((p: any) => p.vc_m_min > 0 && p.rpm > 0 && p.strategy), "T14.3 all have vc/rpm/strategy");

// ─── T15: genplan_optimize — stainless lower Vc ─────────────────────────────

console.log("T15: Optimize — stainless vs aluminum Vc");
const t15a = generativeProcess("genplan_optimize", {
  material: "304",
  features: [{ type: "pocket", dimensions: { length_mm: 50, width_mm: 30, depth_mm: 10 }, access_direction: "top" }],
});
const t15b = generativeProcess("genplan_optimize", {
  material: "7075",
  features: [{ type: "pocket", dimensions: { length_mm: 50, width_mm: 30, depth_mm: 10 }, access_direction: "top" }],
});
const vc_304 = (t15a.parameters as any[])[0].vc_m_min;
const vc_7075 = (t15b.parameters as any[])[0].vc_m_min;
assert(vc_304 < vc_7075, "T15.1 stainless Vc lower than aluminum");

// ─── T16: genplan_tools — tool list ─────────────────────────────────────────

console.log("T16: Tools — tool list");
const t16 = generativeProcess("genplan_tools", {
  material: "steel",
  features: STANDARD_FEATURES,
});
assert((t16.tool_count as number) >= 3, "T16.1 at least 3 tools");
const tools16 = t16.tools as any[];
assert(tools16.every((t: any) => t.tool_number > 0 && t.diameter_mm > 0), "T16.2 all tools have number/diameter");
assert((t16.tool_change_count as number) > 0, "T16.3 has tool changes");
assert((t16.estimated_tool_change_time_min as number) > 0, "T16.4 positive tool change time");

// ─── T17: genplan_cycle — time breakdown ────────────────────────────────────

console.log("T17: Cycle — time breakdown");
const t17 = generativeProcess("genplan_cycle", {
  material: "steel",
  features: STANDARD_FEATURES,
});
assert((t17.cutting_time_min as number) > 0, "T17.1 positive cutting time");
assert((t17.tool_change_time_min as number) > 0, "T17.2 positive tool change time");
assert((t17.total_cycle_time_min as number) > (t17.cutting_time_min as number), "T17.3 total > cutting (includes tool changes)");
const bySetup17 = t17.by_setup as any[];
assert(bySetup17.length >= 1, "T17.4 by_setup has entries");
assert(bySetup17.every((s: any) => s.time_min >= 0), "T17.5 all setup times non-negative");
const byPhase = t17.by_phase as any;
assert(byPhase.roughing_min >= 0, "T17.6 roughing time");
assert(byPhase.finishing_min >= 0, "T17.7 finishing time");

// ─── T18: genplan_cost — cost breakdown ─────────────────────────────────────

console.log("T18: Cost — breakdown");
const t18 = generativeProcess("genplan_cost", {
  material: "steel",
  features: STANDARD_FEATURES,
  batch_size: 200,
});
assert((t18.batch_size as number) === 200, "T18.1 batch size 200");
const cb = t18.cost_breakdown as any;
assert(cb.machine_time_cost_usd > 0, "T18.2 machine time cost > 0");
assert(cb.tool_cost_usd >= 0, "T18.3 tool cost >= 0");
assert(cb.material_cost_usd > 0, "T18.4 material cost > 0");
assert(cb.total_per_part_usd > 0, "T18.5 total per part > 0");
assert(cb.total_batch_usd > cb.total_per_part_usd, "T18.6 batch > per part");
assert(cb.total_batch_usd === cb.total_per_part_usd * 200, "T18.7 batch = per_part * 200");

// ─── T19: genplan_cost — titanium more expensive ────────────────────────────

console.log("T19: Cost — titanium vs steel");
const t19s = generativeProcess("genplan_cost", {
  material: "steel",
  features: [{ type: "pocket", dimensions: { length_mm: 50, width_mm: 30, depth_mm: 10 }, access_direction: "top" }],
  batch_size: 1,
});
const t19t = generativeProcess("genplan_cost", {
  material: "titanium",
  features: [{ type: "pocket", dimensions: { length_mm: 50, width_mm: 30, depth_mm: 10 }, access_direction: "top" }],
  batch_size: 1,
});
assert((t19t.cost_breakdown as any).total_per_part_usd > (t19s.cost_breakdown as any).total_per_part_usd, "T19.1 titanium costs more than steel");

// ─── T20: genplan_risk — risk assessment ────────────────────────────────────

console.log("T20: Risk — assessment");
const t20 = generativeProcess("genplan_risk", {
  material: "steel",
  features: STANDARD_FEATURES,
});
const rs20 = t20.risk_summary as any;
assert(["low", "medium", "high"].includes(rs20.overall_risk), "T20.1 valid overall risk");
assert(rs20.high_risk_operations >= 0, "T20.2 high risk count");
assert(rs20.medium_risk_operations >= 0, "T20.3 medium risk count");

// ─── T21: genplan_risk — tight tolerance creates risk ───────────────────────

console.log("T21: Risk — tight tolerance");
const t21 = generativeProcess("genplan_risk", {
  material: "steel",
  features: [
    { type: "bore", dimensions: { diameter_mm: 30, depth_mm: 40 }, tolerance_mm: 0.005, surface_finish_um: 0.8, access_direction: "top" },
  ],
});
const rs21 = t21.risk_summary as any;
assert(rs21.overall_risk === "high" || rs21.high_risk_operations > 0, "T21.1 tight bore creates high risk");

// ─── T22: genplan_get — stored plan retrieval ───────────────────────────────

console.log("T22: Get — stored plan");
const planId = t1.plan_id as string;
const t22 = generativeProcess("genplan_get", { plan_id: planId });
assert(t22.plan_id === planId, "T22.1 retrieved correct plan");
assert(t22.material === "AISI 4140 Steel", "T22.2 material matches");

// ─── T23: genplan_get — not found ───────────────────────────────────────────

console.log("T23: Get — not found");
const t23 = generativeProcess("genplan_get", { plan_id: "PP-nonexistent" });
assert(t23.error !== undefined, "T23.1 error for not found");

// ─── T24: genplan_get — missing plan_id ─────────────────────────────────────

console.log("T24: Get — missing plan_id");
const t24 = generativeProcess("genplan_get", {});
assert(t24.error !== undefined, "T24.1 error for missing plan_id");

// ─── T25: Unknown action ────────────────────────────────────────────────────

console.log("T25: Unknown action");
const t25 = generativeProcess("genplan_unknown", {});
assert(t25.error !== undefined, "T25.1 error for unknown action");
assert(Array.isArray(t25.available_actions), "T25.2 lists available actions");

// ─── T26: Feature types — all types recognized ─────────────────────────────

console.log("T26: Feature types — all types");
const allTypes = ["pocket", "hole", "bore", "slot", "thread", "contour", "face", "chamfer", "fillet", "boss"];
for (const ft of allTypes) {
  const r = generativeProcess("genplan_features", {
    features: [{ type: ft, dimensions: { length_mm: 50, width_mm: 30, depth_mm: 10, diameter_mm: 20 }, access_direction: "top", thread_spec: "M10x1.5" }],
  });
  assert((r.feature_count as number) === 1, `T26.${ft} recognized`);
  const f = (r.features as any[])[0];
  assert(f.type === ft, `T26.${ft} type correct`);
  assert(f.operations_needed.length > 0, `T26.${ft} has operations`);
}

// ─── T27: Operation dependencies — drill before ream ────────────────────────

console.log("T27: Operation dependencies");
const t27 = generativeProcess("genplan_operations", {
  material: "steel",
  features: [{ type: "hole", dimensions: { diameter_mm: 10, depth_mm: 20 }, tolerance_mm: 0.01, through: true, access_direction: "top" }],
});
const ops27 = t27.operations as any[];
const drillIdx = ops27.findIndex((o: any) => o.description.includes("drill") && !o.description.includes("center"));
const reamIdx = ops27.findIndex((o: any) => o.description.includes("ream"));
if (drillIdx >= 0 && reamIdx >= 0) {
  assert(drillIdx < reamIdx, "T27.1 drill before ream");
}

// ─── T28: Thread operations — center drill, tap drill, tap sequence ─────────

console.log("T28: Thread — operation sequence");
const t28 = generativeProcess("genplan_operations", {
  material: "steel",
  features: [{ type: "thread", dimensions: { diameter_mm: 8, depth_mm: 15 }, thread_spec: "M8x1.25", access_direction: "top" }],
});
const ops28 = t28.operations as any[];
assert(ops28.length >= 3, "T28.1 at least 3 ops (center, drill, tap)");
const centerIdx = ops28.findIndex((o: any) => o.description.includes("center_drill"));
const tapDrillIdx = ops28.findIndex((o: any) => o.description.includes("tap_drill"));
const tapIdx = ops28.findIndex((o: any) => o.description.includes("— tap") && !o.description.includes("drill"));
assert(centerIdx < tapDrillIdx, "T28.2 center drill before tap drill");
assert(tapDrillIdx < tapIdx, "T28.3 tap drill before tap");

// ─── T29: Tool deduplication ────────────────────────────────────────────────

console.log("T29: Tool deduplication");
const t29 = generativeProcess("genplan_tools", {
  material: "steel",
  features: [
    { type: "hole", dimensions: { diameter_mm: 10, depth_mm: 20 }, through: true, access_direction: "top" },
    { type: "hole", dimensions: { diameter_mm: 10, depth_mm: 20 }, through: true, access_direction: "top" },
  ],
});
// Same hole size should use same tool
const tools29 = t29.tools as any[];
const drills29 = tools29.filter((t: any) => t.tool_type === "drill" && t.diameter_mm === 10);
assert(drills29.length <= 1, "T29.1 same-size drills deduplicated");

// ─── T30: Multi-setup operations — correct setup assignment ─────────────────

console.log("T30: Multi-setup operations");
const t30 = generativeProcess("genplan_plan", {
  material: "steel",
  features: [
    { type: "pocket", dimensions: { length_mm: 50, width_mm: 30, depth_mm: 10 }, access_direction: "top" },
    { type: "pocket", dimensions: { length_mm: 40, width_mm: 20, depth_mm: 8 }, access_direction: "bottom" },
    { type: "hole", dimensions: { diameter_mm: 10, depth_mm: 20 }, access_direction: "left" },
  ],
});
assert((t30.setup_count as number) === 3, "T30.1 3 setups for 3 directions");
const ops30 = t30.operations as any[];
const setupNums = [...new Set(ops30.map((o: any) => o.setup))];
assert(setupNums.length === 3, "T30.2 operations spread across 3 setups");

// ─── T31: Boring bar selection ──────────────────────────────────────────────

console.log("T31: Boring bar selection");
const t31 = generativeProcess("genplan_tools", {
  material: "steel",
  features: [{ type: "bore", dimensions: { diameter_mm: 50, depth_mm: 30 }, tolerance_mm: 0.01, access_direction: "top" }],
});
const tools31 = t31.tools as any[];
const boringBars = tools31.filter((t: any) => t.tool_type === "boring_bar");
assert(boringBars.length >= 1, "T31.1 includes boring bar");
assert(boringBars[0].holder === "Boring head", "T31.2 boring head holder");

// ─── T32: Strategies per phase ──────────────────────────────────────────────

console.log("T32: Strategies per phase");
const t32 = generativeProcess("genplan_optimize", {
  material: "steel",
  features: [{ type: "pocket", dimensions: { length_mm: 60, width_mm: 30, depth_mm: 15 }, tolerance_mm: 0.02, surface_finish_um: 3.2, access_direction: "top" }],
});
const params32 = t32.parameters as any[];
const roughOp = params32.find((p: any) => p.phase === "roughing");
const finishOp = params32.find((p: any) => p.phase === "finishing");
if (roughOp && finishOp) {
  assert(roughOp.strategy.includes("clearing") || roughOp.strategy.includes("rough"), "T32.1 roughing uses clearing/roughing strategy");
  assert(finishOp.strategy.includes("finish") || finishOp.strategy.includes("contour"), "T32.2 finishing uses finish/contour strategy");
  assert(roughOp.ae_mm > finishOp.ae_mm, "T32.3 roughing has wider ae than finishing");
}

// ─── T33: Cast iron material ────────────────────────────────────────────────

console.log("T33: Cast iron material");
const t33 = generativeProcess("genplan_plan", {
  material: "cast_iron",
  features: [{ type: "face", dimensions: { length_mm: 100, width_mm: 80 }, access_direction: "top" }],
});
assert(t33.material === "Gray Cast Iron FC250", "T33.1 cast iron name");
assert((t33.total_cycle_time_min as number) > 0, "T33.2 positive cycle time");

// ─── T34: Fillet requires ball endmill ──────────────────────────────────────

console.log("T34: Fillet — ball endmill");
const t34 = generativeProcess("genplan_tools", {
  material: "steel",
  features: [{ type: "fillet", dimensions: { width_mm: 3, depth_mm: 3 }, access_direction: "top" }],
});
const tools34 = t34.tools as any[];
const ballMills = tools34.filter((t: any) => t.tool_type === "ball_endmill");
assert(ballMills.length >= 1, "T34.1 fillet uses ball endmill");

// ─── T35: Boss feature recognition ─────────────────────────────────────────

console.log("T35: Boss feature");
const t35 = generativeProcess("genplan_features", {
  features: [{ type: "boss", dimensions: { length_mm: 30, width_mm: 30, depth_mm: 10 }, access_direction: "top" }],
});
const feats35 = t35.features as any[];
assert(feats35[0].subtype === "raised_boss", "T35.1 boss subtype");
assert(feats35[0].operations_needed.includes("roughing"), "T35.2 boss needs roughing");

// ─── T36: Custom feature IDs ────────────────────────────────────────────────

console.log("T36: Custom feature IDs");
const t36 = generativeProcess("genplan_features", {
  features: [
    { id: "POCKET-A", type: "pocket", dimensions: { length_mm: 50, width_mm: 30, depth_mm: 10 } },
    { id: "HOLE-B", type: "hole", dimensions: { diameter_mm: 10, depth_mm: 20 } },
  ],
});
const feats36 = t36.features as any[];
assert(feats36[0].feature_id === "POCKET-A", "T36.1 custom ID preserved");
assert(feats36[1].feature_id === "HOLE-B", "T36.2 custom ID preserved");

// ─── T37: WCS assignment ────────────────────────────────────────────────────

console.log("T37: WCS assignment");
const t37 = generativeProcess("genplan_setups", {
  features: [
    { type: "pocket", dimensions: { length_mm: 50, width_mm: 30, depth_mm: 10 }, access_direction: "top" },
    { type: "pocket", dimensions: { length_mm: 40, width_mm: 20, depth_mm: 8 }, access_direction: "bottom" },
  ],
});
const setups37 = t37.setups as any[];
assert(setups37[0].wcs === "G54", "T37.1 first setup G54");
assert(setups37[1].wcs === "G55", "T37.2 second setup G55");

// ─── T38: Through hole vs blind hole ────────────────────────────────────────

console.log("T38: Through vs blind hole");
const t38 = generativeProcess("genplan_features", {
  features: [
    { type: "hole", dimensions: { diameter_mm: 10, depth_mm: 20 }, through: true },
    { type: "hole", dimensions: { diameter_mm: 10, depth_mm: 20 }, through: false },
  ],
});
const feats38 = t38.features as any[];
assert(feats38[0].subtype.includes("through"), "T38.1 through hole subtype");
assert(feats38[1].subtype.includes("blind"), "T38.2 blind hole subtype");

// ─── T39: Precision hole needs reaming ──────────────────────────────────────

console.log("T39: Precision hole needs ream");
const t39 = generativeProcess("genplan_features", {
  features: [{ type: "hole", dimensions: { diameter_mm: 10, depth_mm: 20 }, tolerance_mm: 0.01, through: true }],
});
const feats39 = t39.features as any[];
assert(feats39[0].operations_needed.includes("ream"), "T39.1 precision hole gets reamed");
assert(feats39[0].subtype.includes("precision"), "T39.2 precision subtype");

// ─── T40: 6061 aluminum variant ─────────────────────────────────────────────

console.log("T40: 6061 aluminum");
const t40 = generativeProcess("genplan_plan", {
  material: "6061",
  features: [{ type: "pocket", dimensions: { length_mm: 50, width_mm: 30, depth_mm: 10 }, access_direction: "top" }],
});
assert(t40.material === "Aluminum 6061-T6", "T40.1 6061 material name");

// ─── Summary ────────────────────────────────────────────────────────────────

console.log("");
console.log("=".repeat(60));
if (failed > 0) {
  console.log(`R10-Rev3 Generative Process: ${passed} passed, ${failed} failed out of ${passed + failed}`);
  console.log("=".repeat(60));
  console.log("");
  for (const f of failures) console.log(`  FAIL: ${f}`);
} else {
  console.log(`R10-Rev3 Generative Process: ${passed} passed, ${failed} failed out of ${passed + failed}`);
  console.log("=".repeat(60));
}

if (failed > 0) process.exit(1);
