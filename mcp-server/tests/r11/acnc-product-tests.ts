/**
 * R11-MS3: Auto CNC Programmer (ACNC) Product Tests
 * ==================================================
 * Tests the 7-step ACNC pipeline:
 *   1. Feature recognition  (acnc_feature)
 *   2. Strategy selection    (acnc_strategy)
 *   3. Tool selection        (acnc_tools)
 *   4. Parameter calculation (acnc_program — embedded)
 *   5. G-code generation     (acnc_output)
 *   6. Simulation            (acnc_simulate)
 *   7. Complete output       (acnc_program — full pipeline)
 *
 * Plus: acnc_validate, acnc_batch, acnc_history, acnc_get
 */

import { productACNC } from "../../src/engines/ProductEngine.js";

let passed = 0;
let failed = 0;

function assert(cond: boolean, label: string): void {
  if (cond) { passed++; }
  else { failed++; process.stderr.write(`  FAIL: ${label}\n`); }
}

function group(label: string): void {
  process.stderr.write(`\n── ${label}\n`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// T1: Metadata
// ═══════════════════════════════════════════════════════════════════════════════
group("T1: acnc_get — metadata");
const meta = productACNC("acnc_get", {});
assert(meta.product === "Auto CNC Programmer", "T1.1 product name");
assert(meta.version === "1.0.0", "T1.2 version");
assert(meta.pipeline_steps === 7, "T1.3 7-step pipeline");
assert(meta.supported_features >= 8, "T1.4 ≥8 features");
assert(meta.supported_materials >= 15, "T1.5 ≥15 materials");
assert(meta.supported_controllers === 6, "T1.6 6 controllers");
assert(meta.actions.length === 10, "T1.7 10 actions");

// ═══════════════════════════════════════════════════════════════════════════════
// T2-T6: Feature Recognition (Step 1)
// ═══════════════════════════════════════════════════════════════════════════════
group("T2: acnc_feature — natural language pocket");
const feat1 = productACNC("acnc_feature", { description: "pocket 50mm deep, 100x80mm" });
assert(feat1.feature === "pocket", "T2.1 recognized pocket");
assert(feat1.dimensions.depth === 50, "T2.2 depth 50");
assert(feat1.dimensions.width === 100, "T2.3 width 100");
assert(feat1.dimensions.length === 80, "T2.4 length 80");
assert(feat1.operations.length >= 1, "T2.5 has operations");
assert(feat1.recognized_from === "natural_language", "T2.6 NL source");

group("T3: acnc_feature — natural language slot");
const feat2 = productACNC("acnc_feature", { description: "slot 20mm deep" });
assert(feat2.feature === "slot", "T3.1 recognized slot");
assert(feat2.dimensions.depth === 20, "T3.2 depth 20");

group("T4: acnc_feature — natural language hole");
const feat3 = productACNC("acnc_feature", { description: "drill hole diameter 12mm, 30mm deep" });
assert(feat3.feature === "hole", "T4.1 recognized hole");
assert(feat3.dimensions.depth === 30, "T4.2 depth 30");
assert(feat3.dimensions.diameter === 12, "T4.3 diameter 12");

group("T5: acnc_feature — natural language thread");
const feat4 = productACNC("acnc_feature", { description: "thread M10 15mm deep" });
assert(feat4.feature === "thread", "T5.1 recognized thread");
assert(feat4.dimensions.depth === 15, "T5.2 depth 15");

group("T6: acnc_feature — structured input");
const feat5 = productACNC("acnc_feature", { feature: "profile", depth: 8, width: 60, length: 120 });
assert(feat5.feature === "profile", "T6.1 profile from structured");
assert(feat5.dimensions.depth === 8, "T6.2 depth 8");
assert(feat5.recognized_from === "structured", "T6.3 structured source");

// ═══════════════════════════════════════════════════════════════════════════════
// T7-T9: Strategy Selection (Step 2)
// ═══════════════════════════════════════════════════════════════════════════════
group("T7: acnc_strategy — pocket aluminum");
const strat1 = productACNC("acnc_strategy", { feature: "pocket", material: "6061" });
assert(typeof strat1.strategy === "string" && strat1.strategy.length > 0, "T7.1 has strategy");
assert(typeof strat1.entry_method === "string", "T7.2 has entry method");
assert(strat1.confidence > 0.5, "T7.3 confidence > 0.5");
assert(Array.isArray(strat1.reasoning), "T7.4 has reasoning");
assert(Array.isArray(strat1.alternatives), "T7.5 has alternatives");

group("T8: acnc_strategy — hole steel");
const strat2 = productACNC("acnc_strategy", { feature: "hole", material: "4140" });
assert(typeof strat2.strategy === "string", "T8.1 has strategy");

group("T9: acnc_strategy — face titanium");
const strat3 = productACNC("acnc_strategy", { feature: "face", material: "Ti-6Al-4V" });
assert(typeof strat3.strategy === "string", "T9.1 has strategy");
assert(strat3.confidence > 0, "T9.2 confidence > 0");

// ═══════════════════════════════════════════════════════════════════════════════
// T10-T12: Tool Selection (Step 3)
// ═══════════════════════════════════════════════════════════════════════════════
group("T10: acnc_tools — roughing aluminum");
const tool1 = productACNC("acnc_tools", { material: "6061", operation: "roughing", feature: "pocket" });
assert(typeof tool1.tool_type === "string" && tool1.tool_type.length > 0, "T10.1 has tool type");
assert(typeof tool1.coating === "string", "T10.2 has coating");
assert(typeof tool1.holder_type === "string", "T10.3 has holder");
assert(tool1.diameter > 0, "T10.4 diameter > 0");
assert(tool1.teeth > 0, "T10.5 teeth > 0");
assert(tool1.confidence > 0, "T10.6 confidence > 0");

group("T11: acnc_tools — finishing steel");
const tool2 = productACNC("acnc_tools", { material: "4140", operation: "finishing", feature: "profile" });
assert(typeof tool2.tool_type === "string", "T11.1 has tool type");

group("T12: acnc_tools — drilling superalloy");
const tool3 = productACNC("acnc_tools", { material: "Inconel 718", operation: "drilling", feature: "hole" });
assert(typeof tool3.tool_type === "string", "T12.1 has tool type");
assert(tool3.confidence > 0, "T12.2 confidence > 0");

// ═══════════════════════════════════════════════════════════════════════════════
// T13-T15: G-code Output (Step 5)
// ═══════════════════════════════════════════════════════════════════════════════
group("T13: acnc_output — Fanuc pocket");
const out1 = productACNC("acnc_output", { feature: "pocket", controller: "fanuc", material: "4140" });
assert(typeof out1.gcode === "string" && out1.gcode.length > 10, "T13.1 has G-code");
assert(out1.controller_family === "fanuc", "T13.2 fanuc family");
assert(out1.validation.valid === true || out1.validation.score > 0.3, "T13.3 validation exists");

group("T14: acnc_output — Siemens hole");
const out2 = productACNC("acnc_output", { feature: "hole", controller: "siemens", material: "6061" });
assert(typeof out2.gcode === "string", "T14.1 has G-code");
assert(out2.controller_family === "siemens", "T14.2 siemens family");

group("T15: acnc_output — Heidenhain profile");
const out3 = productACNC("acnc_output", { feature: "profile", controller: "heidenhain", material: "Ti-6Al-4V" });
assert(typeof out3.gcode === "string", "T15.1 has G-code");
assert(out3.controller_family === "heidenhain", "T15.2 heidenhain family");

// ═══════════════════════════════════════════════════════════════════════════════
// T16-T18: Simulation (Step 6)
// ═══════════════════════════════════════════════════════════════════════════════
group("T16: acnc_simulate — basic");
const sim1 = productACNC("acnc_simulate", {
  material: "4140", tool_diameter: 12, depth: 15, width: 50, length: 80,
  cutting_speed: 120, feed_per_tooth: 0.1, axial_depth: 5, radial_depth: 7, mrr: 80,
});
assert(typeof sim1.safety_score === "number", "T16.1 has safety score");
assert(["safe", "warning", "danger"].includes(sim1.safety_status), "T16.2 valid status");
assert(sim1.estimated_cycle_time_min > 0, "T16.3 cycle time > 0");
assert(typeof sim1.collision_check === "string", "T16.4 has collision check");
assert(sim1.simulation_method === "analytical_estimate", "T16.5 method");

group("T17: acnc_simulate — aggressive (potential warning)");
const sim2 = productACNC("acnc_simulate", {
  material: "Ti-6Al-4V", cutting_speed: 200, feed_per_tooth: 0.3, axial_depth: 15, radial_depth: 10,
  tool_diameter: 12, mrr: 150,
});
assert(typeof sim2.safety_status === "string", "T17.1 has status");
assert(Array.isArray(sim2.safety_warnings), "T17.2 has warnings array");

group("T18: acnc_simulate — defaults");
const sim3 = productACNC("acnc_simulate", {});
assert(typeof sim3.safety_score === "number", "T18.1 works with defaults");
assert(sim3.estimated_cycle_time_min > 0, "T18.2 cycle time > 0");

// ═══════════════════════════════════════════════════════════════════════════════
// T19: Validation
// ═══════════════════════════════════════════════════════════════════════════════
group("T19: acnc_validate — valid Fanuc code");
const FANUC_GCODE = `O1001
(POCKET ROUGHING)
T01 M6
G54 G90 G17
S5000 M3
G43 H01 Z5.0
G81 X0 Y0 Z-10 R2 F200
M30`;
const val1 = productACNC("acnc_validate", { gcode: FANUC_GCODE, controller: "fanuc" });
assert(typeof val1.score === "number", "T19.1 has score");
assert(val1.score > 0.5, "T19.2 score > 0.5");
assert(typeof val1.valid === "boolean", "T19.3 has valid flag");

group("T20: acnc_validate — missing gcode");
const val2 = productACNC("acnc_validate", { controller: "fanuc" });
assert(val2.error !== undefined, "T20.1 error for missing gcode");

// ═══════════════════════════════════════════════════════════════════════════════
// T21-T24: Full Pipeline (acnc_program — Step 7)
// ═══════════════════════════════════════════════════════════════════════════════
group("T21: acnc_program — aluminum pocket (full pipeline)");
const prog1 = productACNC("acnc_program", {
  description: "pocket 25mm deep, 80x60mm",
  material: "6061",
  controller: "fanuc",
});
assert(prog1.pipeline_steps === 7, "T21.1 7 steps");
assert(prog1.feature.feature === "pocket", "T21.2 recognized pocket");
assert(typeof prog1.strategy.strategy === "string", "T21.3 has strategy");
assert(typeof prog1.tool.tool_type === "string", "T21.4 has tool");
assert(prog1.parameters.cutting_speed_m_min > 0, "T21.5 cutting speed > 0");
assert(prog1.parameters.spindle_rpm > 0, "T21.6 RPM > 0");
assert(prog1.parameters.feed_rate_mm_min > 0, "T21.7 feed rate > 0");
assert(prog1.parameters.mrr_cm3_min > 0, "T21.8 MRR > 0");
assert(prog1.parameters.tool_life_min > 0, "T21.9 tool life > 0");
assert(typeof prog1.gcode.gcode === "string" && prog1.gcode.gcode.length > 10, "T21.10 has G-code");
assert(typeof prog1.simulation.safety_score === "number", "T21.11 has safety score");
assert(Array.isArray(prog1.tool_list), "T21.12 has tool list");
assert(typeof prog1.setup_sheet === "object", "T21.13 has setup sheet");
assert(typeof prog1.ready_to_run === "boolean", "T21.14 has ready flag");
assert(prog1.cycle_time_min > 0, "T21.15 cycle time > 0");

group("T22: acnc_program — steel profile, Siemens");
const prog2 = productACNC("acnc_program", {
  feature: "profile",
  material: "4140",
  controller: "siemens",
  depth: 10,
  width: 40,
  length: 100,
});
assert(prog2.feature.feature === "profile", "T22.1 profile");
assert(prog2.gcode.controller_family === "siemens", "T22.2 Siemens");
assert(prog2.parameters.cutting_speed_m_min > 0, "T22.3 vc > 0");

group("T23: acnc_program — titanium hole, Heidenhain");
const prog3 = productACNC("acnc_program", {
  description: "drill hole 15mm deep",
  material: "Ti-6Al-4V",
  controller: "heidenhain",
});
assert(prog3.feature.feature === "hole", "T23.1 hole");
assert(prog3.gcode.controller_family === "heidenhain", "T23.2 Heidenhain");
assert(prog3.safety_score > 0, "T23.3 safety score > 0");

group("T24: acnc_program — with program number");
const prog4 = productACNC("acnc_program", {
  feature: "face",
  material: "1045",
  controller: "haas",
  program_number: 5001,
});
assert(prog4.gcode.program_number === 5001, "T24.1 program number 5001");
assert(prog4.feature.feature === "face", "T24.2 face feature");

// ═══════════════════════════════════════════════════════════════════════════════
// T25-T27: Batch
// ═══════════════════════════════════════════════════════════════════════════════
group("T25: acnc_batch — 2 features (free tier)");
const batch1 = productACNC("acnc_batch", {
  material: "6061",
  controller: "fanuc",
  features: ["pocket 10mm deep 50x50mm", "hole 20mm deep"],
  tier: "free",
});
assert(batch1.batch_size === 2, "T25.1 2 programs");
assert(batch1.total_cycle_time_min > 0, "T25.2 total cycle time > 0");
assert(Array.isArray(batch1.unique_tools), "T25.3 has unique tools");
assert(typeof batch1.all_ready === "boolean", "T25.4 has all_ready");

group("T26: acnc_batch — free tier blocked");
const batch2 = productACNC("acnc_batch", {
  features: ["pocket", "slot", "hole"],
  tier: "free",
});
assert(batch2.tier_blocked === true, "T26.1 free tier blocked for 3");

group("T27: acnc_batch — pro tier");
const batch3 = productACNC("acnc_batch", {
  material: "4140",
  controller: "siemens",
  features: ["pocket 10mm deep", "slot 5mm deep", "profile 8mm deep"],
  tier: "pro",
});
assert(batch3.batch_size === 3, "T27.1 3 programs (pro)");
assert(batch3.programs.length === 3, "T27.2 3 program results");
assert(batch3.total_cycle_time_min > 0, "T27.3 total cycle time > 0");

// ═══════════════════════════════════════════════════════════════════════════════
// T28: History
// ═══════════════════════════════════════════════════════════════════════════════
group("T28: acnc_history");
const hist = productACNC("acnc_history", {});
assert(Array.isArray(hist.history), "T28.1 has history array");
assert(hist.history.length > 0, "T28.2 history not empty");
assert(hist.total > 0, "T28.3 total > 0");

// ═══════════════════════════════════════════════════════════════════════════════
// T29: Cross-material physics consistency
// ═══════════════════════════════════════════════════════════════════════════════
group("T29: Cross-material — cutting speed ordering");
const alProg = productACNC("acnc_program", { feature: "pocket", material: "6061", controller: "fanuc" });
const stProg = productACNC("acnc_program", { feature: "pocket", material: "4140", controller: "fanuc" });
const tiProg = productACNC("acnc_program", { feature: "pocket", material: "Ti-6Al-4V", controller: "fanuc" });
assert(alProg.parameters.cutting_speed_m_min > stProg.parameters.cutting_speed_m_min, "T29.1 Al vc > Steel vc");
assert(stProg.parameters.cutting_speed_m_min > tiProg.parameters.cutting_speed_m_min, "T29.2 Steel vc > Ti vc");
assert(alProg.parameters.tool_life_min > tiProg.parameters.tool_life_min, "T29.3 Al tool life > Ti tool life");

// ═══════════════════════════════════════════════════════════════════════════════
// T30: Error handling
// ═══════════════════════════════════════════════════════════════════════════════
group("T30: Error handling");
const err1 = productACNC("acnc_unknown", {});
assert(err1.error !== undefined, "T30.1 unknown action returns error");
assert(Array.isArray(err1.available), "T30.2 lists available actions");

// ═══════════════════════════════════════════════════════════════════════════════
// T31: All feature types
// ═══════════════════════════════════════════════════════════════════════════════
group("T31: All feature types");
const features = ["pocket", "slot", "profile", "face", "hole", "thread", "3d_surface", "chamfer", "bore"];
for (const f of features) {
  const result = productACNC("acnc_feature", { feature: f });
  assert(result.feature === f, `T31.${f} recognized`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// T32: Multiple controllers
// ═══════════════════════════════════════════════════════════════════════════════
group("T32: All controllers");
const controllers = ["fanuc", "siemens", "heidenhain", "haas", "mazak", "okuma"];
for (const c of controllers) {
  const result = productACNC("acnc_output", { feature: "pocket", controller: c, material: "4140" });
  assert(typeof result.gcode === "string" && result.gcode.length > 5, `T32.${c} generates G-code`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// T33: Setup sheet completeness
// ═══════════════════════════════════════════════════════════════════════════════
group("T33: Setup sheet completeness");
const fullProg = productACNC("acnc_program", { description: "pocket 20mm deep 60x40mm", material: "316", controller: "fanuc" });
const ss = fullProg.setup_sheet;
assert(ss.material === "316", "T33.1 material in setup sheet");
assert(typeof ss.material_group === "string", "T33.2 material group");
assert(ss.hardness_hb > 0, "T33.3 hardness > 0");
assert(typeof ss.work_offset === "string", "T33.4 work offset");
assert(typeof ss.coolant === "object", "T33.5 coolant info");

// ═══════════════════════════════════════════════════════════════════════════════
// T34: Tool list completeness
// ═══════════════════════════════════════════════════════════════════════════════
group("T34: Tool list completeness");
const tl = fullProg.tool_list;
assert(tl.length >= 1, "T34.1 ≥1 tool");
assert(tl[0].position === 1, "T34.2 position 1");
assert(typeof tl[0].type === "string", "T34.3 has type");
assert(tl[0].diameter > 0, "T34.4 diameter > 0");
assert(typeof tl[0].coating === "string", "T34.5 has coating");
assert(tl[0].estimated_life_min > 0, "T34.6 estimated life > 0");

// ═══════════════════════════════════════════════════════════════════════════════
// T35: End-to-end workflow
// ═══════════════════════════════════════════════════════════════════════════════
group("T35: End-to-end workflow");
// 1. Recognize feature
const e2e_feat = productACNC("acnc_feature", { description: "pocket 30mm deep 100x80mm tolerance 0.05mm" });
assert(e2e_feat.feature === "pocket", "T35.1 recognized pocket");
assert(e2e_feat.tolerance === 0.05, "T35.2 tolerance captured");
// 2. Select strategy
const e2e_strat = productACNC("acnc_strategy", { feature: "pocket", material: "7075" });
assert(typeof e2e_strat.strategy === "string", "T35.3 strategy selected");
// 3. Select tool
const e2e_tool = productACNC("acnc_tools", { material: "7075", operation: "roughing", feature: "pocket" });
assert(typeof e2e_tool.tool_type === "string", "T35.4 tool selected");
// 4. Generate program
const e2e_prog = productACNC("acnc_program", {
  description: "pocket 30mm deep 100x80mm",
  material: "7075",
  controller: "mazak",
});
assert(e2e_prog.ready_to_run !== undefined, "T35.5 has ready flag");
// 5. Validate output
const e2e_val = productACNC("acnc_validate", { gcode: e2e_prog.gcode.gcode, controller: "mazak" });
assert(typeof e2e_val.score === "number", "T35.6 validation score");

// ═══════════════════════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════════════════════
process.stderr.write(`\n${"═".repeat(60)}\n`);
process.stderr.write(`ACNC Product Tests: ${passed} passed, ${failed} failed (${passed + failed} total)\n`);
process.stderr.write(`${"═".repeat(60)}\n\n`);

if (failed > 0) {
  process.stderr.write("FAILED: " + failed + " assertion(s) did not pass\n");
  process.exit(1);
} else {
  process.stderr.write("All ACNC product tests passed!\n");
}
