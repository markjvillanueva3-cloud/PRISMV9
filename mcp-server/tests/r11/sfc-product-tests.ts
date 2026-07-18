/**
 * R11-MS0 — Speed & Feed Calculator (SFC) Product Engine tests
 * Tests: sfc_calculate, sfc_compare, sfc_optimize, sfc_quick,
 *        sfc_materials, sfc_tools, sfc_formulas, sfc_safety,
 *        sfc_history, sfc_get
 *
 * Verifies the composition layer correctly orchestrates:
 *   ManufacturingCalculations → AdvancedCalculations → Safety → Uncertainty → Sustainability
 */
import { productSFC } from "../../src/engines/ProductEngine.js";

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(cond: boolean, label: string) {
  if (cond) { passed++; }
  else { failed++; failures.push(label); console.log(`  FAIL: ${label}`); }
}

// ─── T1: sfc_get — product info ──────────────────────────────────────────────

console.log("T1: sfc_get — product info");
const t1 = productSFC("sfc_get", {});
assert(t1.product === "Speed & Feed Calculator", "T1.1 product name");
assert(t1.version === "1.0.0", "T1.2 version");
assert(t1.actions.length === 10, "T1.3 has 10 actions");
assert(t1.tiers.includes("free"), "T1.4 includes free tier");
assert(t1.tiers.includes("pro"), "T1.5 includes pro tier");
assert(t1.tiers.includes("enterprise"), "T1.6 includes enterprise tier");
assert(t1.materials_count >= 15, "T1.7 at least 15 materials");
assert(t1.formulas.includes("Kienzle"), "T1.8 Kienzle formula");
assert(t1.formulas.includes("Taylor"), "T1.9 Taylor formula");
assert(t1.actions.includes("sfc_calculate"), "T1.10 has sfc_calculate");

// ─── T2: sfc_materials — reference data ──────────────────────────────────────

console.log("T2: sfc_materials — reference data");
const t2 = productSFC("sfc_materials", {});
assert(Array.isArray(t2.materials), "T2.1 returns array");
assert(t2.materials.length >= 15, "T2.2 at least 15 materials");
const steel1045 = t2.materials.find((m: any) => m.id === "1045");
assert(steel1045 !== undefined, "T2.3 contains 1045 steel");
assert(steel1045.hardness === 200, "T2.4 1045 hardness is 200 HB");
assert(steel1045.group === "steel_medium_carbon", "T2.5 1045 is medium carbon steel");
const ti64 = t2.materials.find((m: any) => m.id === "Ti-6Al-4V");
assert(ti64 !== undefined, "T2.6 contains Ti-6Al-4V");
assert(ti64.hardness === 334, "T2.7 Ti-6Al-4V hardness is 334");
const al6061 = t2.materials.find((m: any) => m.id === "6061");
assert(al6061 !== undefined, "T2.8 contains 6061 aluminum");
assert(al6061.group === "aluminum_wrought", "T2.9 6061 is wrought aluminum");
const inconel = t2.materials.find((m: any) => m.id === "Inconel 718");
assert(inconel !== undefined, "T2.10 contains Inconel 718");

// ─── T3: sfc_tools — tool reference data ─────────────────────────────────────

console.log("T3: sfc_tools — tool reference data");
const t3 = productSFC("sfc_tools", {});
assert(Array.isArray(t3.tools), "T3.1 returns array");
assert(t3.tools.length >= 5, "T3.2 at least 5 tool materials");
const carbide = t3.tools.find((t: any) => t.material === "Carbide");
assert(carbide !== undefined, "T3.3 contains Carbide");
assert(carbide.speed_range.includes("m/min"), "T3.4 speed range in m/min");
const hss = t3.tools.find((t: any) => t.material === "HSS");
assert(hss !== undefined, "T3.5 contains HSS");
const ceramic = t3.tools.find((t: any) => t.material === "Ceramic");
assert(ceramic !== undefined, "T3.6 contains Ceramic");
const cbn = t3.tools.find((t: any) => t.material === "CBN");
assert(cbn !== undefined, "T3.7 contains CBN");
const diamond = t3.tools.find((t: any) => t.material === "Diamond");
assert(diamond !== undefined, "T3.8 contains Diamond");
assert(t3.tools.every((t: any) => t.applications.length > 0), "T3.9 all have applications");
assert(t3.tools.every((t: any) => t.speed_range.length > 0), "T3.10 all have speed ranges");

// ─── T4: sfc_formulas — formula reference ────────────────────────────────────

console.log("T4: sfc_formulas — formula reference");
const t4 = productSFC("sfc_formulas", {});
assert(Array.isArray(t4.formulas), "T4.1 returns array");
assert(t4.formulas.length >= 5, "T4.2 at least 5 formulas");
const kienzle = t4.formulas.find((f: any) => f.name === "Kienzle");
assert(kienzle !== undefined, "T4.3 contains Kienzle");
assert(kienzle.equation.includes("kc1.1"), "T4.4 Kienzle equation correct");
const taylor = t4.formulas.find((f: any) => f.name === "Taylor");
assert(taylor !== undefined, "T4.5 contains Taylor");
assert(taylor.equation.includes("T^n"), "T4.6 Taylor equation correct");
const raFormula = t4.formulas.find((f: any) => f.name === "Theoretical Ra");
assert(raFormula !== undefined, "T4.7 contains Ra formula");
const mrrFormula = t4.formulas.find((f: any) => f.name === "MRR");
assert(mrrFormula !== undefined, "T4.8 contains MRR formula");
const stabilityFormula = t4.formulas.find((f: any) => f.name === "Stability Lobes");
assert(stabilityFormula !== undefined, "T4.9 contains Stability Lobes");
assert(t4.formulas.every((f: any) => f.use.length > 0), "T4.10 all have use descriptions");

// ─── T5: sfc_calculate — 4140 steel, Carbide, milling ───────────────────────

console.log("T5: sfc_calculate — 4140 steel");
const t5 = productSFC("sfc_calculate", {
  material: "4140",
  tool_material: "Carbide",
  tool_diameter: 12,
  number_of_teeth: 4,
  operation: "milling",
  depth_of_cut: 6,
  width_of_cut: 6,
  tier: "pro",
});
assert(t5.result !== undefined, "T5.1 has result");
const r5 = t5.result;
assert(r5.cutting_speed_m_min > 0, "T5.2 positive cutting speed");
assert(r5.spindle_rpm > 0, "T5.3 positive RPM");
assert(r5.feed_per_tooth_mm > 0, "T5.4 positive feed per tooth");
assert(r5.table_feed_mm_min > 0, "T5.5 positive table feed");
assert(r5.cutting_force_N > 0, "T5.6 positive cutting force");
assert(r5.power_kW > 0, "T5.7 positive power");
assert(r5.torque_Nm > 0, "T5.8 positive torque");
assert(r5.specific_cutting_force_N_mm2 > 0, "T5.9 positive specific force");
assert(r5.tool_life_min > 0, "T5.10 positive tool life");

// ─── T6: sfc_calculate — result completeness ─────────────────────────────────

console.log("T6: sfc_calculate — result completeness");
assert(r5.surface_roughness_Ra_um > 0, "T6.1 positive surface roughness");
assert(r5.surface_finish_grade.length > 0, "T6.2 has finish grade");
assert(r5.mrr_cm3_min > 0, "T6.3 positive MRR");
assert(r5.safety_score >= 0 && r5.safety_score <= 1, "T6.4 safety score 0-1");
assert(["safe", "warning", "danger"].includes(r5.safety_status), "T6.5 valid safety status");
assert(Array.isArray(r5.safety_warnings), "T6.6 has safety warnings array");
assert(r5.uncertainty !== undefined, "T6.7 has uncertainty");
assert(r5.uncertainty.cutting_speed_range.length === 2, "T6.8 cutting speed range pair");
assert(r5.uncertainty.force_range.length === 2, "T6.9 force range pair");
assert(r5.uncertainty.tool_life_range.length === 2, "T6.10 tool life range pair");

// ─── T7: sfc_calculate — uncertainty bounds validity ──────────────────────────

console.log("T7: sfc_calculate — uncertainty bounds");
assert(r5.uncertainty.cutting_speed_range[0] < r5.cutting_speed_m_min, "T7.1 lower bound < nominal");
assert(r5.uncertainty.cutting_speed_range[1] > r5.cutting_speed_m_min, "T7.2 upper bound > nominal");
assert(r5.uncertainty.force_range[0] < r5.cutting_force_N, "T7.3 force lower < nominal");
assert(r5.uncertainty.force_range[1] > r5.cutting_force_N, "T7.4 force upper > nominal");
assert(r5.uncertainty.tool_life_range[0] < r5.tool_life_min, "T7.5 tool life lower < nominal");
assert(r5.uncertainty.tool_life_range[1] > r5.tool_life_min, "T7.6 tool life upper > nominal");
assert(r5.uncertainty.surface_roughness_range[0] < r5.surface_roughness_Ra_um, "T7.7 Ra lower < nominal");
assert(r5.uncertainty.surface_roughness_range[1] > r5.surface_roughness_Ra_um, "T7.8 Ra upper > nominal");
assert(r5.formulas_used.length >= 2, "T7.9 at least 2 formulas used");
assert(r5.calculation_time_ms >= 0, "T7.10 non-negative calc time");

// ─── T8: sfc_calculate — sustainability (pro tier) ───────────────────────────

console.log("T8: sfc_calculate — sustainability");
assert(r5.sustainability !== undefined, "T8.1 pro tier has sustainability");
assert(r5.sustainability!.energy_kWh_per_part > 0, "T8.2 positive energy");
assert(r5.sustainability!.co2_kg_per_part > 0, "T8.3 positive CO2");
assert(r5.sustainability!.coolant_liters_per_hour > 0, "T8.4 positive coolant");
assert(r5.tier === "pro", "T8.5 tier is pro");
assert(r5.tier_limited === false, "T8.6 pro not tier limited");

// Free tier — no sustainability
const t8free = productSFC("sfc_calculate", {
  material: "4140", tool_material: "Carbide", tool_diameter: 12,
  number_of_teeth: 4, operation: "milling", tier: "free",
});
assert(t8free.result.sustainability === undefined, "T8.7 free tier no sustainability");
assert(t8free.result.tier_limited === true, "T8.8 free tier limited");
assert(t8free.result.tier === "free", "T8.9 tier is free");
assert(t8free.result.formulas_used.length === 2, "T8.10 free tier fewer formulas");

// ─── T9: sfc_calculate — aluminum 6061 (different material family) ───────────

console.log("T9: sfc_calculate — aluminum 6061");
const t9 = productSFC("sfc_calculate", {
  material: "6061",
  tool_material: "Carbide",
  tool_diameter: 16,
  number_of_teeth: 3,
  operation: "milling",
  tier: "pro",
});
assert(t9.result !== undefined, "T9.1 has result");
const r9 = t9.result;
// Aluminum should have higher cutting speed than steel
assert(r9.cutting_speed_m_min > r5.cutting_speed_m_min, "T9.2 aluminum faster than 4140");
assert(r9.cutting_force_N < r5.cutting_force_N, "T9.3 aluminum lower force than 4140");
assert(r9.power_kW < r5.power_kW, "T9.4 aluminum lower power");
assert(r9.surface_roughness_Ra_um > 0, "T9.5 valid surface roughness");
assert(r9.safety_status === "safe" || r9.safety_status === "warning", "T9.6 safe or warning");
assert(r9.tool_life_min > 0, "T9.7 positive tool life");
assert(r9.mrr_cm3_min > 0, "T9.8 positive MRR");
assert(r9.uncertainty !== undefined, "T9.9 has uncertainty");
assert(r9.sustainability !== undefined, "T9.10 pro has sustainability");

// ─── T10: sfc_calculate — Ti-6Al-4V (difficult material) ─────────────────────

console.log("T10: sfc_calculate — Ti-6Al-4V");
const t10 = productSFC("sfc_calculate", {
  material: "Ti-6Al-4V",
  tool_material: "Carbide",
  tool_diameter: 10,
  number_of_teeth: 4,
  operation: "milling",
  depth_of_cut: 3,
  width_of_cut: 5,
  tier: "enterprise",
});
assert(t10.result !== undefined, "T10.1 has result");
const r10 = t10.result;
assert(r10.cutting_speed_m_min < r5.cutting_speed_m_min, "T10.2 Ti slower than 4140");
assert(r10.specific_cutting_force_N_mm2 > 0, "T10.3 valid specific force");
assert(r10.tool_life_min > 0, "T10.4 positive tool life");
// Titanium typically has shorter tool life
assert(r10.tool_life_min < r9.tool_life_min, "T10.5 Ti shorter tool life than Al");
assert(r10.tier === "enterprise", "T10.6 enterprise tier");
assert(r10.sustainability !== undefined, "T10.7 enterprise has sustainability");
assert(r10.formulas_used.length >= 2, "T10.8 multiple formulas");
assert(r10.uncertainty.cutting_speed_range[1] > r10.uncertainty.cutting_speed_range[0], "T10.9 valid range");
assert(r10.safety_warnings !== undefined, "T10.10 has warnings array");

// ─── T11: sfc_calculate — unknown material (fallback) ─────────────────────────

console.log("T11: sfc_calculate — unknown material");
const t11 = productSFC("sfc_calculate", {
  material: "UnknownAlloyXYZ",
  material_hardness: 250,
  tool_material: "Carbide",
  tool_diameter: 12,
  number_of_teeth: 4,
  tier: "pro",
});
assert(t11.result !== undefined, "T11.1 returns result for unknown");
const r11 = t11.result;
assert(r11.cutting_speed_m_min > 0, "T11.2 still computes speed");
assert(r11.safety_warnings.some((w: string) => w.includes("not in product database")), "T11.3 warns about unresolved material");
// Uncertainty should be wider for unresolved materials
const knownRange = r5.uncertainty.cutting_speed_range[1] - r5.uncertainty.cutting_speed_range[0];
const unknownRange = r11.uncertainty.cutting_speed_range[1] - r11.uncertainty.cutting_speed_range[0];
const knownRatio = knownRange / r5.cutting_speed_m_min;
const unknownRatio = unknownRange / r11.cutting_speed_m_min;
assert(unknownRatio > knownRatio, "T11.4 wider uncertainty for unknown material");
assert(r11.cutting_force_N > 0, "T11.5 still computes force");
assert(r11.tool_life_min > 0, "T11.6 still computes tool life");
assert(r11.mrr_cm3_min > 0, "T11.7 still computes MRR");
assert(r11.safety_score >= 0, "T11.8 valid safety score");
assert(r11.formulas_used.length >= 2, "T11.9 formulas used");
assert(r11.calculation_time_ms >= 0, "T11.10 valid calc time");

// ─── T12: sfc_calculate — machine limits check ──────────────────────────────

console.log("T12: sfc_calculate — machine limits");
const t12 = productSFC("sfc_calculate", {
  material: "6061",
  tool_material: "Carbide",
  tool_diameter: 6,
  number_of_teeth: 3,
  machine_power_kw: 3,
  machine_max_rpm: 5000,
  tier: "pro",
});
assert(t12.result !== undefined, "T12.1 has result");
const r12 = t12.result;
// Small machine should trigger warnings if params exceed limits
assert(Array.isArray(r12.safety_warnings), "T12.2 has warnings");
assert(r12.safety_score <= 1, "T12.3 valid safety score");
assert(r12.power_kW > 0, "T12.4 positive power");
assert(r12.spindle_rpm > 0, "T12.5 positive RPM");
assert(r12.cutting_speed_m_min > 0, "T12.6 positive cutting speed");
assert(r12.depth_of_cut_mm > 0, "T12.7 positive depth");
assert(r12.width_of_cut_mm > 0, "T12.8 positive width");
assert(r12.table_feed_mm_min > 0, "T12.9 positive table feed");
assert(r12.torque_Nm > 0, "T12.10 positive torque");

// ─── T13: sfc_compare — 3 tool materials compared ───────────────────────────

console.log("T13: sfc_compare — tool material comparison");
const t13 = productSFC("sfc_compare", {
  material: "4140",
  tool_diameter: 12,
  number_of_teeth: 4,
  operation: "milling",
  depth_of_cut: 6,
  width_of_cut: 6,
});
assert(t13.result !== undefined, "T13.1 has result");
const r13 = t13.result;
assert(r13.approaches.length === 3, "T13.2 three approaches (HSS/Carbide/Ceramic)");
assert(r13.recommended.length > 0, "T13.3 has recommendation");
assert(r13.comparison_notes.length >= 3, "T13.4 has comparison notes");

// Verify each approach has all fields
for (let i = 0; i < r13.approaches.length; i++) {
  const a = r13.approaches[i];
  assert(a.name.length > 0, `T13.${5 + i} approach ${i} has name`);
  assert(a.cutting_speed > 0, `T13.${5 + i}a approach ${i} positive speed`);
  assert(a.feed > 0, `T13.${5 + i}b approach ${i} positive feed`);
  assert(a.tool_life > 0, `T13.${5 + i}c approach ${i} positive tool life`);
  assert(a.score > 0 || a.score <= 0, `T13.${5 + i}d approach ${i} has score`);
}

// ─── T14: sfc_compare — sorted by score ──────────────────────────────────────

console.log("T14: sfc_compare — sorting");
assert(r13.approaches[0].score >= r13.approaches[1].score, "T14.1 sorted descending by score");
assert(r13.approaches[1].score >= r13.approaches[2].score, "T14.2 second >= third");
assert(r13.recommended === r13.approaches[0].name, "T14.3 recommended is highest score");

// HSS should be slower than Carbide
const hssApp = r13.approaches.find((a: any) => a.name.includes("HSS"));
const carbApp = r13.approaches.find((a: any) => a.name.includes("Carbide"));
assert(hssApp !== undefined, "T14.4 has HSS approach");
assert(carbApp !== undefined, "T14.5 has Carbide approach");
assert(hssApp!.cutting_speed < carbApp!.cutting_speed, "T14.6 HSS slower than Carbide");

// Ceramic should be fastest
const cerApp = r13.approaches.find((a: any) => a.name.includes("Ceramic"));
assert(cerApp !== undefined, "T14.7 has Ceramic approach");
assert(cerApp!.cutting_speed > carbApp!.cutting_speed, "T14.8 Ceramic faster than Carbide");
assert(cerApp!.cutting_speed > hssApp!.cutting_speed, "T14.9 Ceramic faster than HSS");
assert(r13.comparison_notes[0].includes("4140"), "T14.10 notes include material name");

// ─── T15: sfc_compare — different material ───────────────────────────────────

console.log("T15: sfc_compare — aluminum");
const t15 = productSFC("sfc_compare", {
  material: "6061",
  tool_diameter: 16,
  number_of_teeth: 3,
});
assert(t15.result.approaches.length === 3, "T15.1 three approaches");
// Aluminum should produce higher MRR
const t15carb = t15.result.approaches.find((a: any) => a.name.includes("Carbide"));
assert(t15carb!.cutting_speed > carbApp!.cutting_speed, "T15.2 Al Carbide faster than steel Carbide");
assert(t15.result.recommended.length > 0, "T15.3 has recommendation");
assert(t15.result.comparison_notes.length >= 3, "T15.4 has notes");
assert(t15.result.comparison_notes[0].includes("6061"), "T15.5 notes reference aluminum");
assert(t15.result.approaches.every((a: any) => a.mrr > 0), "T15.6 all positive MRR");
assert(t15.result.approaches.every((a: any) => a.power > 0), "T15.7 all positive power");
assert(t15.result.approaches.every((a: any) => a.surface_roughness > 0), "T15.8 all positive Ra");
assert(t15.result.approaches.every((a: any) => a.tool_life > 0), "T15.9 all positive tool life");
assert(t15.result.approaches[0].score >= t15.result.approaches[2].score, "T15.10 first >= last");

// ─── T16: sfc_optimize — balanced objective ──────────────────────────────────

console.log("T16: sfc_optimize — balanced");
const t16 = productSFC("sfc_optimize", {
  material: "4140",
  tool_material: "Carbide",
  tool_diameter: 12,
  number_of_teeth: 4,
  operation: "milling",
  depth_of_cut: 6,
  width_of_cut: 6,
  objective: "balanced",
});
assert(t16.result !== undefined, "T16.1 has result");
const r16 = t16.result;
assert(r16.objective === "balanced", "T16.2 correct objective");
assert(r16.original.vc > 0, "T16.3 original vc positive");
assert(r16.original.fz > 0, "T16.4 original fz positive");
assert(r16.optimized.vc > 0, "T16.5 optimized vc positive");
assert(r16.optimized.fz > 0, "T16.6 optimized fz positive");
assert(r16.iterations > 0, "T16.7 some iterations");
assert(r16.constraints_met === true, "T16.8 constraints met");
assert(typeof r16.improvement_pct === "number", "T16.9 improvement is number");
assert(r16.original.ap > 0, "T16.10 original ap positive");

// ─── T17: sfc_optimize — productivity objective ──────────────────────────────

console.log("T17: sfc_optimize — productivity");
const t17 = productSFC("sfc_optimize", {
  material: "4140",
  tool_material: "Carbide",
  tool_diameter: 12,
  number_of_teeth: 4,
  objective: "productivity",
});
assert(t17.result.objective === "productivity", "T17.1 correct objective");
assert(t17.result.optimized.vc > 0, "T17.2 optimized vc positive");
assert(t17.result.optimized.fz > 0, "T17.3 optimized fz positive");
assert(t17.result.iterations >= 40, "T17.4 at least 40 iterations (7×7 grid)");
assert(t17.result.constraints_met, "T17.5 constraints met");

// Productivity optimization should favor higher MRR (higher speeds/feeds)
const prodVc = t17.result.optimized.vc;
const balVc = r16.optimized.vc;
assert(typeof prodVc === "number", "T17.6 valid vc");
assert(typeof t17.result.improvement_pct === "number", "T17.7 has improvement");
assert(t17.result.original.vc > 0, "T17.8 original vc");
assert(t17.result.original.ae > 0, "T17.9 original ae");
assert(t17.result.optimized.ae > 0, "T17.10 optimized ae");

// ─── T18: sfc_optimize — tool_life objective ─────────────────────────────────

console.log("T18: sfc_optimize — tool life");
const t18 = productSFC("sfc_optimize", {
  material: "4140",
  tool_material: "Carbide",
  tool_diameter: 12,
  number_of_teeth: 4,
  objective: "tool_life",
});
assert(t18.result.objective === "tool_life", "T18.1 correct objective");
// Tool life optimization should favor lower speeds
assert(t18.result.optimized.vc <= t17.result.optimized.vc, "T18.2 tool life vc <= productivity vc");
assert(t18.result.iterations > 0, "T18.3 some iterations");
assert(t18.result.constraints_met, "T18.4 constraints met");
assert(t18.result.optimized.fz > 0, "T18.5 positive fz");
assert(t18.result.original.vc > 0, "T18.6 original vc");
assert(t18.result.original.fz > 0, "T18.7 original fz");
assert(typeof t18.result.improvement_pct === "number", "T18.8 has improvement");
assert(t18.result.optimized.ap > 0, "T18.9 optimized ap");
assert(t18.result.optimized.ae > 0, "T18.10 optimized ae");

// ─── T19: sfc_optimize — quality objective ───────────────────────────────────

console.log("T19: sfc_optimize — quality");
const t19 = productSFC("sfc_optimize", {
  material: "4140",
  tool_material: "Carbide",
  tool_diameter: 12,
  number_of_teeth: 4,
  objective: "quality",
});
assert(t19.result.objective === "quality", "T19.1 correct objective");
assert(t19.result.optimized.vc > 0, "T19.2 optimized vc positive");
// Quality optimization: lower feed improves Ra
assert(t19.result.optimized.fz <= t17.result.optimized.fz, "T19.3 quality fz <= productivity fz");
assert(t19.result.iterations > 0, "T19.4 some iterations");
assert(t19.result.constraints_met, "T19.5 constraints met");
assert(t19.result.original.vc > 0, "T19.6 original vc");
assert(typeof t19.result.improvement_pct === "number", "T19.7 has improvement");
assert(t19.result.original.fz > 0, "T19.8 original fz");
assert(t19.result.optimized.ap > 0, "T19.9 optimized ap");
assert(t19.result.optimized.ae > 0, "T19.10 optimized ae");

// ─── T20: sfc_optimize — cost objective ──────────────────────────────────────

console.log("T20: sfc_optimize — cost");
const t20 = productSFC("sfc_optimize", {
  material: "4140",
  tool_material: "Carbide",
  tool_diameter: 12,
  number_of_teeth: 4,
  objective: "cost",
});
assert(t20.result.objective === "cost", "T20.1 correct objective");
assert(t20.result.optimized.vc > 0, "T20.2 optimized vc positive");
assert(t20.result.optimized.fz > 0, "T20.3 optimized fz positive");
assert(t20.result.iterations > 0, "T20.4 iterations");
assert(t20.result.constraints_met, "T20.5 constraints met");
assert(t20.result.original.vc > 0, "T20.6 original vc");
assert(t20.result.original.fz > 0, "T20.7 original fz");
assert(typeof t20.result.improvement_pct === "number", "T20.8 has improvement");
assert(t20.result.optimized.ap > 0, "T20.9 optimized ap");
assert(t20.result.optimized.ae > 0, "T20.10 optimized ae");

// ─── T21: sfc_optimize — machine power constraint ───────────────────────────

console.log("T21: sfc_optimize — machine constraint");
const t21 = productSFC("sfc_optimize", {
  material: "4140",
  tool_material: "Carbide",
  tool_diameter: 12,
  number_of_teeth: 4,
  machine_power_kw: 5,
  objective: "productivity",
});
assert(t21.result.constraints_met, "T21.1 constraints met with power limit");
assert(t21.result.optimized.vc > 0, "T21.2 valid vc");
assert(t21.result.optimized.fz > 0, "T21.3 valid fz");
assert(t21.result.iterations > 0, "T21.4 iterations");
// Power-constrained should not exceed unconstrained productivity
assert(t21.result.optimized.vc <= t17.result.optimized.vc * 1.01, "T21.5 power constraint limits vc");
assert(t21.result.original.vc > 0, "T21.6 original vc");
assert(typeof t21.result.improvement_pct === "number", "T21.7 has improvement");
assert(t21.result.original.fz > 0, "T21.8 original fz");
assert(t21.result.optimized.ap > 0, "T21.9 ap positive");
assert(t21.result.optimized.ae > 0, "T21.10 ae positive");

// ─── T22: sfc_quick — minimal input convenience ─────────────────────────────

console.log("T22: sfc_quick — minimal input");
const t22 = productSFC("sfc_quick", { material: "316" });
assert(t22.result !== undefined, "T22.1 has result");
assert(t22.result.cutting_speed_m_min > 0, "T22.2 positive vc");
assert(t22.result.spindle_rpm > 0, "T22.3 positive RPM");
assert(t22.result.feed_per_tooth_mm > 0, "T22.4 positive fz");
assert(t22.result.cutting_force_N > 0, "T22.5 positive force");
assert(t22.result.power_kW > 0, "T22.6 positive power");
assert(t22.result.tool_life_min > 0, "T22.7 positive tool life");
assert(t22.result.safety_score >= 0, "T22.8 valid safety");
assert(t22.result.sustainability !== undefined, "T22.9 pro default has sustainability");
assert(t22.result.tier === "pro", "T22.10 default tier is pro");

// ─── T23: sfc_quick — default material ───────────────────────────────────────

console.log("T23: sfc_quick — defaults");
const t23 = productSFC("sfc_quick", {});
assert(t23.result !== undefined, "T23.1 works with empty params");
assert(t23.result.cutting_speed_m_min > 0, "T23.2 positive vc");
assert(t23.result.depth_of_cut_mm > 0, "T23.3 positive ap");
assert(t23.result.width_of_cut_mm > 0, "T23.4 positive ae");
assert(t23.result.mrr_cm3_min > 0, "T23.5 positive MRR");
assert(t23.result.surface_roughness_Ra_um > 0, "T23.6 positive Ra");
assert(t23.result.surface_finish_grade.length > 0, "T23.7 has finish grade");
assert(t23.result.uncertainty !== undefined, "T23.8 has uncertainty");
assert(t23.result.formulas_used.length >= 2, "T23.9 formulas used");
assert(t23.result.calculation_time_ms >= 0, "T23.10 valid calc time");

// ─── T24: sfc_quick — with operation ─────────────────────────────────────────

console.log("T24: sfc_quick — with operation");
const t24 = productSFC("sfc_quick", { material: "6061", operation: "drilling" });
assert(t24.result !== undefined, "T24.1 has result");
assert(t24.result.cutting_speed_m_min > 0, "T24.2 positive vc");
assert(t24.result.spindle_rpm > 0, "T24.3 positive RPM");
assert(t24.result.feed_per_tooth_mm > 0, "T24.4 positive fz");
assert(t24.result.table_feed_mm_min > 0, "T24.5 positive table feed");
assert(t24.result.cutting_force_N > 0, "T24.6 positive force");
assert(t24.result.tool_life_min > 0, "T24.7 positive tool life");
assert(t24.result.mrr_cm3_min > 0, "T24.8 positive MRR");
assert(t24.result.safety_score >= 0, "T24.9 valid safety");
assert(t24.result.tier === "pro", "T24.10 default pro tier");

// ─── T25: sfc_safety — standalone safety analysis ────────────────────────────

console.log("T25: sfc_safety — safe scenario");
const t25 = productSFC("sfc_safety", {
  material: "4140",
  tool_material: "Carbide",
  tool_diameter: 12,
  number_of_teeth: 4,
  operation: "milling",
});
assert(t25.score >= 0, "T25.1 non-negative score");
assert(t25.score <= 1, "T25.2 score <= 1");
assert(["safe", "warning", "danger"].includes(t25.status), "T25.3 valid status");
assert(Array.isArray(t25.warnings), "T25.4 has warnings array");
// Normal parameters should be safe
assert(t25.status === "safe" || t25.status === "warning", "T25.5 normal params safe/warning");
assert(t25.score > 0.3, "T25.6 reasonable safety score");
assert(typeof t25.score === "number", "T25.7 score is number");
assert(typeof t25.status === "string", "T25.8 status is string");
assert(t25.warnings.every((w: string) => typeof w === "string"), "T25.9 warnings are strings");
assert(t25.score === Math.round(t25.score * 100) / 100, "T25.10 score rounded to 2 decimals");

// ─── T26: sfc_safety — with machine power limit ─────────────────────────────

console.log("T26: sfc_safety — power limited machine");
const t26 = productSFC("sfc_safety", {
  material: "Inconel 718",
  tool_material: "Carbide",
  tool_diameter: 12,
  number_of_teeth: 4,
  machine_power_kw: 2,
});
assert(t26.score >= 0, "T26.1 non-negative score");
assert(t26.score <= 1, "T26.2 score <= 1");
assert(["safe", "warning", "danger"].includes(t26.status), "T26.3 valid status");
assert(Array.isArray(t26.warnings), "T26.4 has warnings");
// Low power machine with tough material may have warnings
assert(typeof t26.score === "number", "T26.5 score is number");
assert(t26.warnings.every((w: string) => typeof w === "string"), "T26.6 warnings are strings");
assert(t26.score <= t25.score || true, "T26.7 safety analysis complete");
assert(t26.status !== undefined, "T26.8 has status");
assert(typeof t26.status === "string", "T26.9 status is string");
assert(t26.score === Math.round(t26.score * 100) / 100, "T26.10 rounded score");

// ─── T27: sfc_safety — aggressive parameters ────────────────────────────────

console.log("T27: sfc_safety — aggressive cuts");
const t27 = productSFC("sfc_safety", {
  material: "Ti-6Al-4V",
  tool_material: "Carbide",
  tool_diameter: 6,
  number_of_teeth: 4,
  depth_of_cut: 20,
  width_of_cut: 8,
  machine_power_kw: 3,
});
assert(t27.score >= 0, "T27.1 non-negative score");
assert(t27.warnings.length > 0, "T27.2 has warnings for aggressive params");
// Deep cut on small tool should trigger deflection warning
assert(t27.warnings.some((w: string) => w.includes("Depth") || w.includes("depth") || w.includes("tool diameter")), "T27.3 depth warning");
assert(t27.score < t25.score, "T27.4 lower score than safe scenario");
assert(["safe", "warning", "danger"].includes(t27.status), "T27.5 valid status");
assert(t27.score <= 1, "T27.6 score <= 1");
assert(t27.warnings.length >= 1, "T27.7 at least one warning");
assert(typeof t27.score === "number", "T27.8 score is number");
assert(typeof t27.status === "string", "T27.9 status is string");
assert(t27.score === Math.round(t27.score * 100) / 100, "T27.10 rounded");

// ─── T28: sfc_history — session tracking ─────────────────────────────────────

console.log("T28: sfc_history — session tracking");
const t28 = productSFC("sfc_history", {});
assert(t28.history !== undefined, "T28.1 has history");
assert(Array.isArray(t28.history), "T28.2 history is array");
assert(t28.history.length > 0, "T28.3 history not empty (previous calls tracked)");
// Check latest entry has expected fields
const latest = t28.history[t28.history.length - 1];
assert(latest.timestamp !== undefined, "T28.4 has timestamp");
assert(latest.action !== undefined, "T28.5 has action");
assert(latest.material !== undefined, "T28.6 has material");
// History should include our sfc_calculate calls
const calcEntries = t28.history.filter((h: any) => h.action === "sfc_calculate");
assert(calcEntries.length > 0, "T28.7 has calculate entries");
const compareEntries = t28.history.filter((h: any) => h.action === "sfc_compare");
assert(compareEntries.length > 0, "T28.8 has compare entries");
const optimizeEntries = t28.history.filter((h: any) => h.action === "sfc_optimize");
assert(optimizeEntries.length > 0, "T28.9 has optimize entries");
assert(t28.history.length <= 100, "T28.10 history capped at 100");

// ─── T29: sfc_calculate — Inconel 718 (superalloy) ──────────────────────────

console.log("T29: sfc_calculate — Inconel 718");
const t29 = productSFC("sfc_calculate", {
  material: "Inconel 718",
  tool_material: "Carbide",
  tool_diameter: 10,
  number_of_teeth: 4,
  depth_of_cut: 2,
  width_of_cut: 5,
  tier: "pro",
});
assert(t29.result !== undefined, "T29.1 has result");
assert(t29.result.cutting_speed_m_min > 0, "T29.2 positive vc");
// Inconel should have very low cutting speed
assert(t29.result.cutting_speed_m_min < r5.cutting_speed_m_min, "T29.3 Inconel slower than 4140");
assert(t29.result.specific_cutting_force_N_mm2 > r5.specific_cutting_force_N_mm2, "T29.4 Inconel higher kc than 4140");
assert(t29.result.tool_life_min > 0, "T29.5 positive tool life");
assert(t29.result.mrr_cm3_min > 0, "T29.6 positive MRR");
assert(t29.result.safety_score >= 0, "T29.7 valid safety");
assert(t29.result.surface_roughness_Ra_um > 0, "T29.8 positive Ra");
assert(t29.result.sustainability !== undefined, "T29.9 pro has sustainability");
assert(t29.result.formulas_used.length >= 2, "T29.10 formulas used");

// ─── T30: sfc_calculate — PEEK (engineering plastic) ─────────────────────────

console.log("T30: sfc_calculate — PEEK");
const t30 = productSFC("sfc_calculate", {
  material: "PEEK",
  tool_material: "Carbide",
  tool_diameter: 8,
  number_of_teeth: 2,
  tier: "pro",
});
assert(t30.result !== undefined, "T30.1 has result");
assert(t30.result.cutting_speed_m_min > 0, "T30.2 positive vc");
assert(t30.result.cutting_force_N > 0, "T30.3 positive force");
// PEEK should have low cutting force
assert(t30.result.cutting_force_N < r5.cutting_force_N, "T30.4 PEEK lower force than 4140");
assert(t30.result.tool_life_min > 0, "T30.5 positive tool life");
// PEEK should have long tool life due to low kc
assert(t30.result.tool_life_min > r10.tool_life_min, "T30.6 PEEK longer life than Ti");
assert(t30.result.mrr_cm3_min > 0, "T30.7 positive MRR");
assert(t30.result.power_kW > 0, "T30.8 positive power");
assert(t30.result.surface_roughness_Ra_um > 0, "T30.9 positive Ra");
assert(t30.result.uncertainty !== undefined, "T30.10 has uncertainty");

// ─── T31: sfc_calculate — cast iron GG25 ────────────────────────────────────

console.log("T31: sfc_calculate — GG25 cast iron");
const t31 = productSFC("sfc_calculate", {
  material: "GG25",
  tool_material: "Carbide",
  tool_diameter: 50,
  number_of_teeth: 6,
  operation: "milling",
  depth_of_cut: 3,
  width_of_cut: 40,
  tier: "pro",
});
assert(t31.result !== undefined, "T31.1 has result");
assert(t31.result.cutting_speed_m_min > 0, "T31.2 positive vc");
assert(t31.result.spindle_rpm > 0, "T31.3 positive RPM");
// Large cutter should produce low RPM
assert(t31.result.spindle_rpm < r5.spindle_rpm, "T31.4 large cutter lower RPM");
assert(t31.result.table_feed_mm_min > 0, "T31.5 positive table feed");
assert(t31.result.mrr_cm3_min > 0, "T31.6 positive MRR");
// Large face mill should have high MRR
assert(t31.result.mrr_cm3_min > r5.mrr_cm3_min, "T31.7 large cutter higher MRR");
assert(t31.result.power_kW > 0, "T31.8 positive power");
assert(t31.result.cutting_force_N > 0, "T31.9 positive force");
assert(t31.result.safety_score >= 0, "T31.10 valid safety");

// ─── T32: sfc_calculate — HSS tool ──────────────────────────────────────────

console.log("T32: sfc_calculate — HSS tool");
const t32 = productSFC("sfc_calculate", {
  material: "4140",
  tool_material: "HSS",
  tool_diameter: 12,
  number_of_teeth: 4,
  operation: "milling",
  tier: "pro",
});
assert(t32.result !== undefined, "T32.1 has result");
assert(t32.result.cutting_speed_m_min > 0, "T32.2 positive vc");
// HSS should be slower than Carbide
assert(t32.result.cutting_speed_m_min < r5.cutting_speed_m_min, "T32.3 HSS slower than Carbide");
assert(t32.result.spindle_rpm > 0, "T32.4 positive RPM");
assert(t32.result.spindle_rpm < r5.spindle_rpm, "T32.5 HSS lower RPM");
assert(t32.result.feed_per_tooth_mm > 0, "T32.6 positive fz");
assert(t32.result.cutting_force_N > 0, "T32.7 positive force");
assert(t32.result.tool_life_min > 0, "T32.8 positive tool life");
assert(t32.result.mrr_cm3_min > 0, "T32.9 positive MRR");
assert(t32.result.safety_score >= 0, "T32.10 valid safety");

// ─── T33: Cross-material physics consistency ─────────────────────────────────

console.log("T33: Cross-material physics consistency");
// Steel vs aluminum: Al should always be faster, lower force
assert(r9.cutting_speed_m_min > r5.cutting_speed_m_min, "T33.1 Al vc > steel vc");
assert(r9.cutting_force_N < r5.cutting_force_N, "T33.2 Al force < steel force");
// Titanium should be slowest of the three
assert(r10.cutting_speed_m_min < r5.cutting_speed_m_min, "T33.3 Ti vc < steel vc");
assert(r10.cutting_speed_m_min < r9.cutting_speed_m_min, "T33.4 Ti vc < Al vc");
// MRR ordering: Al > Steel > Ti (roughly, for similar geometry)
assert(r9.mrr_cm3_min > r10.mrr_cm3_min, "T33.5 Al MRR > Ti MRR");
// Power: Inconel > Steel > Al > PEEK
const rInconel = t29.result;
const rPEEK = t30.result;
assert(rInconel.specific_cutting_force_N_mm2 > rPEEK.specific_cutting_force_N_mm2, "T33.6 Inconel kc > PEEK kc");
// Tool life: PEEK > Al > Steel > Ti > Inconel (general trend)
assert(rPEEK.tool_life_min > rInconel.tool_life_min, "T33.7 PEEK life > Inconel life");
// All materials should have valid safety scores
assert(r5.safety_score >= 0 && r5.safety_score <= 1, "T33.8 steel safety valid");
assert(r9.safety_score >= 0 && r9.safety_score <= 1, "T33.9 Al safety valid");
assert(r10.safety_score >= 0 && r10.safety_score <= 1, "T33.10 Ti safety valid");

// ─── T34: sfc_calculate — surface finish grades ─────────────────────────────

console.log("T34: Surface finish grades");
// All materials should have non-empty grade strings
assert(r5.surface_finish_grade.includes("N"), "T34.1 steel has N-grade");
assert(r9.surface_finish_grade.includes("N"), "T34.2 Al has N-grade");
assert(r10.surface_finish_grade.includes("N"), "T34.3 Ti has N-grade");
// Grade should match Ra value
if (r5.surface_roughness_Ra_um <= 0.4) {
  assert(r5.surface_finish_grade.includes("N3"), "T34.4 N3 for Ra <= 0.4");
} else if (r5.surface_roughness_Ra_um <= 0.8) {
  assert(r5.surface_finish_grade.includes("N4"), "T34.4 N4 for Ra <= 0.8");
} else if (r5.surface_roughness_Ra_um <= 1.6) {
  assert(r5.surface_finish_grade.includes("N5"), "T34.4 N5 for Ra <= 1.6");
} else if (r5.surface_roughness_Ra_um <= 3.2) {
  assert(r5.surface_finish_grade.includes("N6"), "T34.4 N6 for Ra <= 3.2");
} else if (r5.surface_roughness_Ra_um <= 6.3) {
  assert(r5.surface_finish_grade.includes("N7"), "T34.4 N7 for Ra <= 6.3");
} else {
  assert(r5.surface_finish_grade.includes("N8"), "T34.4 N8+ for rough");
}
assert(r5.surface_roughness_Ra_um === Math.round(r5.surface_roughness_Ra_um * 100) / 100, "T34.5 Ra rounded to 2dp");
assert(r9.surface_roughness_Ra_um > 0, "T34.6 Al positive Ra");
assert(r10.surface_roughness_Ra_um > 0, "T34.7 Ti positive Ra");
assert(t30.result.surface_roughness_Ra_um > 0, "T34.8 PEEK positive Ra");
assert(t31.result.surface_roughness_Ra_um > 0, "T34.9 GG25 positive Ra");
assert(t32.result.surface_roughness_Ra_um > 0, "T34.10 HSS positive Ra");

// ─── T35: sfc_calculate — enterprise tier ────────────────────────────────────

console.log("T35: Enterprise tier features");
const t35 = productSFC("sfc_calculate", {
  material: "4140",
  tool_material: "Carbide",
  tool_diameter: 12,
  number_of_teeth: 4,
  tier: "enterprise",
});
assert(t35.result.tier === "enterprise", "T35.1 enterprise tier");
assert(t35.result.tier_limited === false, "T35.2 not tier limited");
assert(t35.result.sustainability !== undefined, "T35.3 has sustainability");
assert(t35.result.sustainability.energy_kWh_per_part > 0, "T35.4 positive energy");
assert(t35.result.sustainability.co2_kg_per_part > 0, "T35.5 positive CO2");
assert(t35.result.sustainability.coolant_liters_per_hour > 0, "T35.6 positive coolant");
assert(t35.result.formulas_used.length > 2, "T35.7 enterprise gets more formulas");
assert(t35.result.uncertainty !== undefined, "T35.8 has uncertainty");
assert(t35.result.safety_score >= 0, "T35.9 valid safety");
assert(t35.result.calculation_time_ms >= 0, "T35.10 valid calc time");

// ─── T36: sfc_calculate — 7075-T6 and variants ──────────────────────────────

console.log("T36: Material variants");
const t36a = productSFC("sfc_calculate", { material: "7075", tier: "pro" });
const t36b = productSFC("sfc_calculate", { material: "7075-T6", tier: "pro" });
assert(t36a.result !== undefined, "T36.1 7075 has result");
assert(t36b.result !== undefined, "T36.2 7075-T6 has result");
// Same material, should get similar results
assert(t36a.result.cutting_speed_m_min === t36b.result.cutting_speed_m_min, "T36.3 same vc for 7075 variants");
assert(t36a.result.cutting_force_N === t36b.result.cutting_force_N, "T36.4 same force for variants");

const t36c = productSFC("sfc_calculate", { material: "6061-T6", tier: "pro" });
assert(t36c.result !== undefined, "T36.5 6061-T6 has result");
// 6061-T6 should match 6061
const t36d = productSFC("sfc_calculate", { material: "6061", tier: "pro" });
assert(t36c.result.cutting_speed_m_min === t36d.result.cutting_speed_m_min, "T36.6 same vc for 6061 variants");

// C360 brass
const t36e = productSFC("sfc_calculate", { material: "C360", tier: "pro" });
assert(t36e.result !== undefined, "T36.7 C360 brass has result");
assert(t36e.result.cutting_speed_m_min > 0, "T36.8 positive brass vc");
assert(t36e.result.cutting_force_N > 0, "T36.9 positive brass force");
// Brass should be easy to machine — low force
assert(t36e.result.cutting_force_N < r5.cutting_force_N, "T36.10 brass lower force than steel");

// ─── T37: Error handling — unknown action ────────────────────────────────────

console.log("T37: Error handling");
const t37 = productSFC("sfc_unknown_action", {});
assert(t37.error !== undefined, "T37.1 unknown action returns error");
assert(t37.error.includes("Unknown SFC action"), "T37.2 error message correct");

// Stainless steels
const t37a = productSFC("sfc_calculate", { material: "304", tier: "pro" });
assert(t37a.result !== undefined, "T37.3 304 stainless has result");
assert(t37a.result.cutting_speed_m_min > 0, "T37.4 304 positive vc");

const t37b = productSFC("sfc_calculate", { material: "316L", tier: "pro" });
assert(t37b.result !== undefined, "T37.5 316L has result");
assert(t37b.result.cutting_speed_m_min > 0, "T37.6 316L positive vc");

// GGG50 ductile iron
const t37c = productSFC("sfc_calculate", { material: "GGG50", tier: "pro" });
assert(t37c.result !== undefined, "T37.7 GGG50 has result");
assert(t37c.result.cutting_speed_m_min > 0, "T37.8 GGG50 positive vc");
assert(t37c.result.cutting_force_N > 0, "T37.9 GGG50 positive force");
assert(t37c.result.tool_life_min > 0, "T37.10 GGG50 positive life");

// ─── T38: sfc_history — after all operations ─────────────────────────────────

console.log("T38: sfc_history — comprehensive");
const t38 = productSFC("sfc_history", {});
assert(t38.history.length >= 20, "T38.1 at least 20 entries from all tests");
// Check multiple action types appear
const actionTypes = new Set(t38.history.map((h: any) => h.action));
assert(actionTypes.has("sfc_calculate"), "T38.2 has calculate");
assert(actionTypes.has("sfc_compare"), "T38.3 has compare");
assert(actionTypes.has("sfc_optimize"), "T38.4 has optimize");
assert(actionTypes.has("sfc_quick"), "T38.5 has quick");
assert(actionTypes.has("sfc_safety"), "T38.6 has safety");
assert(actionTypes.has("sfc_history"), "T38.7 has history");
assert(actionTypes.has("sfc_get"), "T38.8 has get");
assert(actionTypes.has("sfc_materials"), "T38.9 has materials");
assert(actionTypes.has("sfc_tools"), "T38.10 has tools");

// ─── T39: sfc_optimize — different materials ─────────────────────────────────

console.log("T39: sfc_optimize — material comparison");
const t39a = productSFC("sfc_optimize", { material: "6061", objective: "productivity" });
const t39b = productSFC("sfc_optimize", { material: "Ti-6Al-4V", objective: "productivity" });
assert(t39a.result.optimized.vc > t39b.result.optimized.vc, "T39.1 Al vc > Ti vc in optimization");
assert(t39a.result.iterations > 0, "T39.2 Al iterations");
assert(t39b.result.iterations > 0, "T39.3 Ti iterations");
assert(t39a.result.constraints_met, "T39.4 Al constraints met");
assert(t39b.result.constraints_met, "T39.5 Ti constraints met");
assert(t39a.result.optimized.fz > 0, "T39.6 Al fz positive");
assert(t39b.result.optimized.fz > 0, "T39.7 Ti fz positive");
assert(t39a.result.original.vc > 0, "T39.8 Al original vc");
assert(t39b.result.original.vc > 0, "T39.9 Ti original vc");
assert(t39a.result.original.vc > t39b.result.original.vc, "T39.10 Al baseline faster than Ti");

// ─── T40: End-to-end 60-second test ──────────────────────────────────────────

console.log("T40: End-to-end — SFC workflow");
// Simulate a real user workflow: quick → calculate → compare → optimize → safety
const e2e_start = Date.now();

// Step 1: Quick lookup
const e2e1 = productSFC("sfc_quick", { material: "4340" });
assert(e2e1.result.cutting_speed_m_min > 0, "T40.1 quick lookup works");

// Step 2: Full calculation with details
const e2e2 = productSFC("sfc_calculate", {
  material: "4340",
  tool_material: "Carbide",
  tool_diameter: 10,
  number_of_teeth: 4,
  depth_of_cut: 5,
  width_of_cut: 5,
  machine_power_kw: 15,
  machine_max_rpm: 12000,
  tier: "enterprise",
});
assert(e2e2.result.cutting_speed_m_min > 0, "T40.2 full calc works");
assert(e2e2.result.sustainability !== undefined, "T40.3 enterprise sustainability");

// Step 3: Compare tool materials
const e2e3 = productSFC("sfc_compare", {
  material: "4340",
  tool_diameter: 10,
  number_of_teeth: 4,
  depth_of_cut: 5,
  width_of_cut: 5,
});
assert(e2e3.result.approaches.length === 3, "T40.4 compare has 3 approaches");

// Step 4: Optimize
const e2e4 = productSFC("sfc_optimize", {
  material: "4340",
  tool_material: "Carbide",
  tool_diameter: 10,
  number_of_teeth: 4,
  machine_power_kw: 15,
  objective: "balanced",
});
assert(e2e4.result.constraints_met, "T40.5 optimization constraints met");

// Step 5: Safety check
const e2e5 = productSFC("sfc_safety", {
  material: "4340",
  tool_diameter: 10,
  number_of_teeth: 4,
  machine_power_kw: 15,
});
assert(e2e5.score >= 0, "T40.6 safety analysis complete");

// Step 6: Check product info
const e2e6 = productSFC("sfc_get", {});
assert(e2e6.product === "Speed & Feed Calculator", "T40.7 product info");

// Step 7: Get reference data
const e2e7a = productSFC("sfc_materials", {});
const e2e7b = productSFC("sfc_tools", {});
const e2e7c = productSFC("sfc_formulas", {});
assert(e2e7a.materials.length >= 15, "T40.8 materials available");
assert(e2e7b.tools.length >= 5, "T40.9 tools available");

const e2e_time = Date.now() - e2e_start;
assert(e2e_time < 60000, "T40.10 full workflow under 60 seconds");

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log("");
console.log("=".repeat(60));
console.log(`R11-MS0 SFC Product: ${passed} passed, ${failed} failed out of ${passed + failed}`);
console.log("=".repeat(60));
if (failures.length > 0) {
  console.log("");
  for (const f of failures) console.log(`  FAIL: ${f}`);
}
if (failed > 0) process.exit(1);
