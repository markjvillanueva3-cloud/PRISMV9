/**
 * R10-Rev8 Sustainability Optimization Tests
 * ============================================
 * Validates: green mode, energy, carbon, coolant, near-net-shape,
 * report, materials, history, get, error paths.
 */

import { sustainabilityEngine } from "../../src/engines/SustainabilityEngine.js";

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) { passed++; }
  else { failed++; console.error(`  FAIL: ${msg}`); }
}

// ─── T1: Optimize — standard vs green for steel ──────────────────────────
console.log("T1: Optimize — steel");
{
  const r = sustainabilityEngine("sustain_optimize", { material: "steel" });
  assert(r.optimization_id.startsWith("SO-"), "T1.1 optimization ID");
  assert(r.mode === "green", "T1.2 green mode default");
  assert(r.material === "AISI 4140 Steel", "T1.3 material name");
  assert(r.standard !== undefined, "T1.4 has standard metrics");
  assert(r.green !== undefined, "T1.5 has green metrics");
  assert(r.savings !== undefined, "T1.6 has savings");
  assert(r.recommendations.length >= 1, "T1.7 has recommendations");
  // Green should have lower energy
  assert(r.green.energy.total_kwh <= r.standard.energy.total_kwh, "T1.8 green uses less energy");
  // Green should have lower carbon
  assert(r.green.carbon.total_kg_co2 <= r.standard.carbon.total_kg_co2, "T1.9 green less carbon");
  // Green should have longer tool life
  assert(r.green.tool_life_min > r.standard.tool_life_min, "T1.10 green longer tool life");
}

// ─── T2: Optimize — aluminum gets MQL recommendation ─────────────────────
console.log("T2: Optimize — aluminum MQL");
{
  const r = sustainabilityEngine("sustain_optimize", { material: "aluminum" });
  assert(r.green.coolant_strategy === "mql", "T2.1 green uses MQL for aluminum");
  assert(r.standard.coolant_strategy === "flood", "T2.2 standard uses flood");
  assert(r.savings.coolant_saved_pct > 50, "T2.3 significant coolant savings");
  assert(r.recommendations.some((rec: string) => rec.includes("MQL")), "T2.4 MQL recommendation");
}

// ─── T3: Optimize — cast iron gets dry recommendation ────────────────────
console.log("T3: Optimize — cast iron dry");
{
  const r = sustainabilityEngine("sustain_optimize", { material: "cast_iron" });
  assert(r.green.coolant_strategy === "dry", "T3.1 green uses dry for cast iron");
  assert(r.green.coolant_liters_per_part === 0, "T3.2 zero coolant in dry mode");
  assert(r.recommendations.some((rec: string) => rec.includes("dry")), "T3.3 dry machining recommendation");
}

// ─── T4: Optimize — titanium gets cryogenic recommendation ───────────────
console.log("T4: Optimize — titanium cryogenic");
{
  const r = sustainabilityEngine("sustain_optimize", { material: "titanium" });
  assert(r.green.coolant_strategy === "cryogenic", "T4.1 green uses cryogenic for titanium");
  assert(r.recommendations.some((rec: string) => rec.includes("cryogenic") || rec.includes("Cryogenic")), "T4.2 cryogenic recommendation");
}

// ─── T5: Optimize — ultra_green mode ─────────────────────────────────────
console.log("T5: Optimize — ultra_green");
{
  const r = sustainabilityEngine("sustain_optimize", { material: "steel", mode: "ultra_green" });
  assert(r.mode === "ultra_green", "T5.1 ultra_green mode");
  assert(r.green.tool_life_min > r.standard.tool_life_min, "T5.2 longer tool life in ultra mode");
}

// ─── T6: Optimize — unknown material ─────────────────────────────────────
console.log("T6: Optimize — unknown material");
{
  const r = sustainabilityEngine("sustain_optimize", { material: "unobtanium" });
  assert(r.error !== undefined, "T6.1 error for unknown material");
}

// ─── T7: Optimize — all materials produce valid output ───────────────────
console.log("T7: Optimize — all materials");
{
  const materials = ["aluminum", "steel", "stainless", "titanium", "inconel", "cast_iron"];
  for (const mat of materials) {
    const r = sustainabilityEngine("sustain_optimize", { material: mat });
    assert(r.standard.cost_per_part_usd > 0, `T7 ${mat} standard cost > 0`);
    assert(r.green.cost_per_part_usd > 0, `T7 ${mat} green cost > 0`);
    assert(r.savings.energy_saved_pct >= 0, `T7 ${mat} energy saved >= 0`);
    assert(r.savings.carbon_saved_pct >= 0, `T7 ${mat} carbon saved >= 0`);
    assert(r.savings.tool_life_gained_pct > 0, `T7 ${mat} tool life gained`);
    assert(r.recommendations.length >= 1, `T7 ${mat} has recommendations`);
  }
}

// ─── T8: Compare — all materials ─────────────────────────────────────────
console.log("T8: Compare");
{
  const r = sustainabilityEngine("sustain_compare", {});
  assert(r.total === 6, "T8.1 6 materials compared");
  assert(r.comparisons.length === 6, "T8.2 comparisons array");
  for (const c of r.comparisons) {
    assert(c.material.length > 3, `T8 ${c.key} has material name`);
    assert(c.standard_cost > 0, `T8 ${c.key} has standard cost`);
    assert(c.green_cost > 0, `T8 ${c.key} has green cost`);
    assert(c.energy_savings_pct >= 0, `T8 ${c.key} has energy savings`);
    assert(c.carbon_savings_pct >= 0, `T8 ${c.key} has carbon savings`);
    assert(c.chip_recyclability_pct > 0, `T8 ${c.key} has recyclability`);
  }
}

// ─── T9: Energy — detailed breakdown ─────────────────────────────────────
console.log("T9: Energy");
{
  const r = sustainabilityEngine("sustain_energy", { material: "steel" });
  assert(r.material === "AISI 4140 Steel", "T9.1 material");
  assert(r.standard_energy !== undefined, "T9.2 standard energy");
  assert(r.green_energy !== undefined, "T9.3 green energy");
  assert(r.standard_energy.cutting_kwh > 0, "T9.4 cutting energy");
  assert(r.standard_energy.total_kwh > 0, "T9.5 total energy");
  assert(r.savings_kwh > 0, "T9.6 positive savings");
  assert(r.savings_pct > 0, "T9.7 positive savings pct");
  assert(r.grid_co2_factor === 0.42, "T9.8 CO2 factor");
}

// ─── T10: Energy — unknown material ──────────────────────────────────────
console.log("T10: Energy — unknown");
{
  const r = sustainabilityEngine("sustain_energy", { material: "unobtanium" });
  assert(r.error !== undefined, "T10.1 error for unknown material");
}

// ─── T11: Carbon — detailed breakdown ────────────────────────────────────
console.log("T11: Carbon");
{
  const r = sustainabilityEngine("sustain_carbon", { material: "titanium" });
  assert(r.material === "Ti-6Al-4V", "T11.1 material");
  assert(r.carbon_intensity_per_kg === 36.0, "T11.2 titanium has high carbon intensity");
  assert(r.standard_carbon.total_kg_co2 > 0, "T11.3 standard carbon");
  assert(r.green_carbon.total_kg_co2 > 0, "T11.4 green carbon");
  assert(r.savings_kg_co2 > 0, "T11.5 positive savings");
  assert(r.annual_savings_at_1000_parts > 0, "T11.6 annual savings");
}

// ─── T12: Coolant — lifecycle analysis ───────────────────────────────────
console.log("T12: Coolant");
{
  const r = sustainabilityEngine("sustain_coolant", {
    current_type: "soluble_oil",
    job_mix: ["steel", "aluminum"],
    sump_liters: 200,
  });
  assert(r.current_type === "Soluble Oil (conventional)", "T12.1 current type");
  assert(r.recommended_type === "Semi-Synthetic", "T12.2 recommended type");
  assert(r.recommended_life_months > r.current_life_months, "T12.3 longer life");
  assert(r.annual_savings_usd > 0, "T12.4 positive savings");
  assert(r.disposal_cost_reduction_pct > 0, "T12.5 disposal reduction");
  assert(r.environmental_benefit.length > 10, "T12.6 has environmental benefit");
}

// ─── T13: Coolant — titanium job mix gets synthetic ──────────────────────
console.log("T13: Coolant — titanium");
{
  const r = sustainabilityEngine("sustain_coolant", {
    current_type: "soluble_oil",
    job_mix: ["titanium", "inconel"],
    sump_liters: 300,
  });
  assert(r.recommended_type === "Full Synthetic", "T13.1 synthetic for Ti/Inconel");
  assert(r.recommended_life_months >= 18, "T13.2 long life");
}

// ─── T14: Near-net-shape — steel part ────────────────────────────────────
console.log("T14: Near-net-shape — steel");
{
  const r = sustainabilityEngine("sustain_nearnet", {
    material: "steel",
    finished_weight_g: 500,
    dimensions_mm: { x: 100, y: 80, z: 50 },
  });
  assert(r.analysis_id.startsWith("NNS-"), "T14.1 analysis ID");
  assert(r.material === "AISI 4140 Steel", "T14.2 material");
  assert(r.finished_weight_g === 500, "T14.3 finished weight");
  assert(r.stock_options.length === 4, "T14.4 4 stock options");
  const types = r.stock_options.map((o: any) => o.stock_type);
  assert(types.includes("bar"), "T14.5 has bar option");
  assert(types.includes("forging"), "T14.6 has forging option");
  assert(types.includes("casting"), "T14.7 has casting option");
  assert(types.includes("additive"), "T14.8 has additive option");
  for (const o of r.stock_options) {
    assert(o.raw_weight_g > 0, `T14 ${o.stock_type} has raw weight`);
    assert(o.material_utilization_pct > 0 && o.material_utilization_pct <= 100, `T14 ${o.stock_type} valid utilization`);
    assert(o.total_cost_usd > 0, `T14 ${o.stock_type} has cost`);
    assert(o.carbon_footprint_kg > 0, `T14 ${o.stock_type} has carbon footprint`);
    assert(o.feasibility.length > 10, `T14 ${o.stock_type} has feasibility`);
  }
  assert(r.recommendation.length > 10, "T14.9 has recommendation");
  assert(r.best_option !== undefined, "T14.10 has best option");
}

// ─── T15: Near-net-shape — sorted by cost ────────────────────────────────
console.log("T15: Near-net-shape — sorted");
{
  const r = sustainabilityEngine("sustain_nearnet", { material: "steel", finished_weight_g: 500 });
  for (let i = 1; i < r.stock_options.length; i++) {
    assert(r.stock_options[i].total_cost_usd >= r.stock_options[i - 1].total_cost_usd,
      `T15.1 sorted by cost: ${r.stock_options[i - 1].stock_type} <= ${r.stock_options[i].stock_type}`);
  }
}

// ─── T16: Near-net-shape — unknown material ──────────────────────────────
console.log("T16: Near-net-shape — unknown");
{
  const r = sustainabilityEngine("sustain_nearnet", { material: "unobtanium" });
  assert(r.recommendation.includes("not found"), "T16.1 unknown material error");
}

// ─── T17: Report — comprehensive ─────────────────────────────────────────
console.log("T17: Report");
{
  const r = sustainabilityEngine("sustain_report", {
    material: "aluminum",
    batch_size: 200,
    tool_diameter_mm: 12,
    depth_mm: 8,
    width_mm: 30,
    length_mm: 150,
  });
  assert(r.material === "Aluminum 7075-T6", "T17.1 material");
  assert(r.batch_size === 200, "T17.2 batch size");
  assert(r.per_part.standard_cost > 0, "T17.3 per-part standard cost");
  assert(r.per_part.green_cost > 0, "T17.4 per-part green cost");
  assert(r.batch_totals.energy_saved_kwh > 0, "T17.5 batch energy saved");
  assert(r.batch_totals.carbon_saved_kg > 0, "T17.6 batch carbon saved");
  assert(r.batch_totals.coolant_saved_liters > 0, "T17.7 batch coolant saved");
  assert(r.recommendations.length >= 1, "T17.8 has recommendations");
  assert(r.coolant_strategy_change.length > 3, "T17.9 coolant strategy");
  assert(r.tool_life_improvement.length > 5, "T17.10 tool life improvement");
  assert(r.chip_recyclability_pct > 0, "T17.11 chip recyclability");
}

// ─── T18: Report — unknown material ──────────────────────────────────────
console.log("T18: Report — unknown");
{
  const r = sustainabilityEngine("sustain_report", { material: "unobtanium" });
  assert(r.error !== undefined, "T18.1 error for unknown material");
}

// ─── T19: Materials — list all ───────────────────────────────────────────
console.log("T19: Materials — list");
{
  const r = sustainabilityEngine("sustain_materials", {});
  assert(r.total === 6, "T19.1 6 materials");
  assert(r.materials.length === 6, "T19.2 materials array");
  for (const m of r.materials) {
    assert(m.name.length > 3, `T19 ${m.key} has name`);
    assert(m.chip_recyclability_pct > 0, `T19 ${m.key} has recyclability`);
    assert(m.carbon_intensity > 0, `T19 ${m.key} has carbon intensity`);
  }
}

// ─── T20: Materials — specific material ──────────────────────────────────
console.log("T20: Materials — specific");
{
  const r = sustainabilityEngine("sustain_materials", { material: "aluminum" });
  assert(r.name === "Aluminum 7075-T6", "T20.1 name");
  assert(r.density_g_cm3 === 2.81, "T20.2 density");
  assert(r.mql_suitable === true, "T20.3 MQL suitable");
  assert(r.dry_suitable === true, "T20.4 dry suitable");
  assert(r.chip_recyclability_pct === 95, "T20.5 recyclability");
  assert(r.carbon_intensity_kg_per_kg === 8.24, "T20.6 carbon intensity");
  assert(r.green_parameters.vc_reduction_pct > 0, "T20.7 Vc reduction");
  assert(r.green_parameters.tool_life_gain_pct > 0, "T20.8 tool life gain");
}

// ─── T21: Materials — unknown ────────────────────────────────────────────
console.log("T21: Materials — unknown");
{
  const r = sustainabilityEngine("sustain_materials", { material: "unobtanium" });
  assert(r.error !== undefined, "T21.1 error for unknown material");
}

// ─── T22: History — accumulated results ──────────────────────────────────
console.log("T22: History");
{
  const r = sustainabilityEngine("sustain_history", {});
  assert(r.total >= 6, "T22.1 accumulated optimizations (from T1-T7)");
  assert(r.optimizations.length === r.total, "T22.2 entries match total");
  assert(r.optimizations[0].optimization_id.startsWith("SO-"), "T22.3 ID format");
}

// ─── T23: Get — specific optimization ────────────────────────────────────
console.log("T23: Get — specific");
{
  const r = sustainabilityEngine("sustain_get", { optimization_id: "SO-0001" });
  assert(r.optimization_id === "SO-0001", "T23.1 correct ID");
  assert(r.material !== undefined, "T23.2 has material");
  assert(r.savings !== undefined, "T23.3 has savings");
}

// ─── T24: Get — not found ────────────────────────────────────────────────
console.log("T24: Get — not found");
{
  const r = sustainabilityEngine("sustain_get", { optimization_id: "SO-NOPE" });
  assert(r.error !== undefined, "T24.1 error for missing optimization");
}

// ─── T25: Get — missing param ────────────────────────────────────────────
console.log("T25: Get — no optimization_id");
{
  const r = sustainabilityEngine("sustain_get", {});
  assert(r.error !== undefined, "T25.1 error without optimization_id");
}

// ─── T26: Unknown action ─────────────────────────────────────────────────
console.log("T26: Unknown action");
{
  const r = sustainabilityEngine("sustain_nonexistent", {});
  assert(r.error !== undefined, "T26.1 unknown action returns error");
}

// ─── T27: Energy breakdown has all components ────────────────────────────
console.log("T27: Energy breakdown completeness");
{
  const r = sustainabilityEngine("sustain_optimize", { material: "steel" });
  const e = r.standard.energy;
  assert(e.cutting_kwh > 0, "T27.1 cutting energy");
  assert(e.spindle_idle_kwh >= 0, "T27.2 spindle idle");
  assert(e.rapid_move_kwh >= 0, "T27.3 rapid move");
  assert(e.coolant_pump_kwh >= 0, "T27.4 coolant pump");
  assert(e.total_kwh > 0, "T27.5 total energy");
  // Total should be sum of components
  const sum = e.cutting_kwh + e.spindle_idle_kwh + e.rapid_move_kwh + e.coolant_pump_kwh + e.compressed_air_kwh;
  assert(Math.abs(e.total_kwh - sum) < 0.001, "T27.6 total equals sum");
}

// ─── T28: Carbon breakdown has all components ────────────────────────────
console.log("T28: Carbon breakdown completeness");
{
  const r = sustainabilityEngine("sustain_optimize", { material: "steel" });
  const c = r.standard.carbon;
  assert(c.machining_kg_co2 > 0, "T28.1 machining CO2");
  assert(c.coolant_kg_co2 >= 0, "T28.2 coolant CO2");
  assert(c.tool_wear_kg_co2 >= 0, "T28.3 tool wear CO2");
  assert(c.chip_disposal_kg_co2 >= 0, "T28.4 chip disposal CO2");
  assert(c.total_kg_co2 > 0, "T28.5 total CO2");
  const sum = c.machining_kg_co2 + c.coolant_kg_co2 + c.tool_wear_kg_co2 + c.chip_disposal_kg_co2;
  assert(Math.abs(c.total_kg_co2 - sum) < 0.001, "T28.6 total equals sum");
}

// ─── T29: Titanium has highest carbon intensity ──────────────────────────
console.log("T29: Carbon intensity ranking");
{
  const ti = sustainabilityEngine("sustain_materials", { material: "titanium" });
  const al = sustainabilityEngine("sustain_materials", { material: "aluminum" });
  const st = sustainabilityEngine("sustain_materials", { material: "steel" });
  assert(ti.carbon_intensity_kg_per_kg > al.carbon_intensity_kg_per_kg, "T29.1 Ti > Al carbon intensity");
  assert(al.carbon_intensity_kg_per_kg > st.carbon_intensity_kg_per_kg, "T29.2 Al > Steel carbon intensity");
}

// ─── T30: Custom dimensions produce different results ────────────────────
console.log("T30: Custom dimensions");
{
  const r1 = sustainabilityEngine("sustain_optimize", { material: "steel", depth_mm: 5, width_mm: 20, length_mm: 100 });
  const r2 = sustainabilityEngine("sustain_optimize", { material: "steel", depth_mm: 10, width_mm: 40, length_mm: 200 });
  assert(r2.standard.energy.total_kwh > r1.standard.energy.total_kwh, "T30.1 larger part uses more energy");
  assert(r2.standard.chip_weight_g > r1.standard.chip_weight_g, "T30.2 larger part has more chips");
}

// ─── Summary ────────────────────────────────────────────────────────────
console.log(`\n${"=".repeat(60)}`);
console.log(`R10-Rev8 Sustainability: ${passed} passed, ${failed} failed out of ${passed + failed}`);
console.log(`${"=".repeat(60)}`);
process.exit(failed > 0 ? 1 : 0);
