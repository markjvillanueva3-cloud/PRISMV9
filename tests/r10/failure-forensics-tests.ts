/**
 * R10-Rev5 Failure Forensics Tests
 * =================================
 * Validates: tool autopsy, chip analysis, surface defect diagnosis,
 * crash investigation, knowledge bases, history/retrieval.
 */

import { failureForensics } from "../../src/engines/FailureForensicsEngine.js";

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) { passed++; }
  else { failed++; console.error(`  FAIL: ${msg}`); }
}

// ─── T1: Tool Autopsy — flank wear ─────────────────────────────────────────
console.log("T1: Tool autopsy — flank wear");
{
  const r = failureForensics("forensic_tool_autopsy", { failure_mode: "flank_wear" });
  assert(r.diagnosis_id.startsWith("FOR-TF-"), "T1.1 ID format");
  assert(r.category === "tool_autopsy", "T1.2 category");
  assert(r.failure_mode === "Flank Wear (VB)", "T1.3 failure mode name");
  assert(r.mechanism.includes("Abrasive"), "T1.4 mechanism mentions abrasive");
  assert(r.root_cause_chain.length >= 2, "T1.5 multiple root causes");
  assert(r.corrective_actions.length >= 2, "T1.6 multiple corrective actions");
  assert(r.corrective_actions[0].priority === 1, "T1.7 first action is priority 1");
  assert(r.prevention_measures.length >= 1, "T1.8 has prevention measures");
  assert(r.severity === "minor", "T1.9 flank wear is minor severity");
}

// ─── T2: Tool Autopsy — crater wear ────────────────────────────────────────
console.log("T2: Tool autopsy — crater wear");
{
  const r = failureForensics("forensic_tool_autopsy", { failure_mode: "crater_wear" });
  assert(r.failure_mode === "Crater Wear (KT)", "T2.1 correct mode");
  assert(r.mechanism.includes("diffusion"), "T2.2 diffusion mechanism");
  assert(r.severity === "moderate", "T2.3 severity");
}

// ─── T3: Tool Autopsy — catastrophic fracture ──────────────────────────────
console.log("T3: Tool autopsy — fracture");
{
  const r = failureForensics("forensic_tool_autopsy", { failure_mode: "fracture" });
  assert(r.failure_mode === "Catastrophic Fracture", "T3.1 correct mode");
  assert(r.severity === "critical", "T3.2 critical severity");
  assert(r.recurrence_risk === "high", "T3.3 high recurrence risk");
  assert(r.corrective_actions[0].action.includes("STOP"), "T3.4 first action is STOP machine");
}

// ─── T4: Tool Autopsy — BUE ────────────────────────────────────────────────
console.log("T4: Tool autopsy — BUE");
{
  const r = failureForensics("forensic_tool_autopsy", { failure_mode: "bue_adhesion" });
  assert(r.failure_mode === "Built-Up Edge (BUE)", "T4.1 correct mode");
  assert(r.corrective_actions.some((a: any) => a.action.includes("speed")), "T4.2 recommends speed increase");
}

// ─── T5: Tool Autopsy — all 8 failure modes produce valid output ───────────
console.log("T5: Tool autopsy — all modes");
{
  const modes = ["flank_wear", "crater_wear", "notch_wear", "edge_chipping",
                 "thermal_cracking", "plastic_deformation", "fracture", "bue_adhesion"];
  for (const mode of modes) {
    const r = failureForensics("forensic_tool_autopsy", { failure_mode: mode });
    assert(r.diagnosis_id.startsWith("FOR-TF-"), `T5 ${mode} has valid ID`);
    assert(r.category === "tool_autopsy", `T5 ${mode} correct category`);
    assert(r.corrective_actions.length >= 2, `T5 ${mode} has corrective actions`);
    assert(r.prevention_measures.length >= 1, `T5 ${mode} has prevention`);
    assert(["minor", "moderate", "severe", "critical"].includes(r.severity), `T5 ${mode} valid severity`);
  }
}

// ─── T6: Chip Analysis — blue chips ────────────────────────────────────────
console.log("T6: Chip analysis — blue chips");
{
  const r = failureForensics("forensic_chip_analysis", { chip_type: "blue_discolored" });
  assert(r.diagnosis_id.startsWith("FOR-CH-"), "T6.1 ID format");
  assert(r.category === "chip_analysis", "T6.2 category");
  assert(r.failure_mode === "Blue/Purple Chips", "T6.3 name");
  assert(r.mechanism.includes("300°C"), "T6.4 temperature threshold");
  assert(r.severity === "moderate", "T6.5 severity");
}

// ─── T7: Chip Analysis — normal curled ─────────────────────────────────────
console.log("T7: Chip analysis — normal curled");
{
  const r = failureForensics("forensic_chip_analysis", { chip_type: "normal_curled" });
  assert(r.failure_mode === "Normal Curled Chips (6-9 shape)", "T7.1 name");
  assert(r.severity === "minor", "T7.2 normal chips are minor");
}

// ─── T8: Chip Analysis — all 7 types ───────────────────────────────────────
console.log("T8: Chip analysis — all types");
{
  const types = ["blue_discolored", "long_stringy", "segmented", "birds_nest",
                 "powder", "normal_curled", "thick_irregular"];
  for (const t of types) {
    const r = failureForensics("forensic_chip_analysis", { chip_type: t });
    assert(r.diagnosis_id.startsWith("FOR-CH-"), `T8 ${t} has valid ID`);
    assert(r.category === "chip_analysis", `T8 ${t} correct category`);
    assert(r.corrective_actions.length >= 1, `T8 ${t} has corrective action`);
  }
}

// ─── T9: Surface Defect — chatter marks ────────────────────────────────────
console.log("T9: Surface defect — chatter marks");
{
  const r = failureForensics("forensic_surface_defect", { defect_type: "chatter_marks" });
  assert(r.diagnosis_id.startsWith("FOR-SD-"), "T9.1 ID format");
  assert(r.category === "surface_defect", "T9.2 category");
  assert(r.failure_mode === "Chatter Marks", "T9.3 name");
  assert(r.mechanism.includes("feedback"), "T9.4 physics mentions feedback loop");
  assert(r.corrective_actions[0].effectiveness === "high", "T9.5 primary action is high effectiveness");
}

// ─── T10: Surface Defect — heat discoloration ──────────────────────────────
console.log("T10: Surface defect — discoloration");
{
  const r = failureForensics("forensic_surface_defect", { defect_type: "discoloration" });
  assert(r.failure_mode === "Heat Discoloration", "T10.1 name");
  assert(r.severity === "severe", "T10.2 severe severity");
  assert(r.recurrence_risk === "high", "T10.3 high recurrence for severe");
}

// ─── T11: Surface Defect — all 8 types ─────────────────────────────────────
console.log("T11: Surface defect — all types");
{
  const defects = ["chatter_marks", "smeared_torn", "feed_marks", "scratches",
                   "discoloration", "waviness", "pitting", "burrs"];
  for (const d of defects) {
    const r = failureForensics("forensic_surface_defect", { defect_type: d });
    assert(r.diagnosis_id.startsWith("FOR-SD-"), `T11 ${d} has valid ID`);
    assert(r.category === "surface_defect", `T11 ${d} correct category`);
    assert(r.corrective_actions.length >= 1, `T11 ${d} has actions`);
    assert(r.prevention_measures.length >= 1, `T11 ${d} has prevention`);
  }
}

// ─── T12: Crash Investigation — tool into fixture ──────────────────────────
console.log("T12: Crash — tool into fixture");
{
  const r = failureForensics("forensic_crash", { crash_type: "tool_into_fixture" });
  assert(r.diagnosis_id.startsWith("FOR-CR-"), "T12.1 ID format");
  assert(r.category === "crash_investigation", "T12.2 category");
  assert(r.failure_mode === "Tool Crashed Into Fixture/Vise", "T12.3 name");
  assert(r.severity === "critical", "T12.4 all crashes are critical");
  assert(r.recurrence_risk === "high", "T12.5 high recurrence risk");
  assert(r.root_cause_chain.length >= 3, "T12.6 multiple common causes");
  assert(r.contributing_factors.length >= 2, "T12.7 has diagnosis questions");
}

// ─── T13: Crash Investigation — tool breakage in cut ───────────────────────
console.log("T13: Crash — tool breakage in cut");
{
  const r = failureForensics("forensic_crash", { crash_type: "tool_breakage_in_cut" });
  assert(r.failure_mode === "Tool Broke During Cutting", "T13.1 name");
  assert(r.prevention_measures.some((p: any) => p.includes("manufacturer")), "T13.2 mentions manufacturer recommendations");
}

// ─── T14: Crash Investigation — all 6 types ────────────────────────────────
console.log("T14: Crash — all types");
{
  const types = ["tool_into_fixture", "tool_into_part", "spindle_crash",
                 "axis_overtravel", "tool_breakage_in_cut", "collision_rapid"];
  for (const t of types) {
    const r = failureForensics("forensic_crash", { crash_type: t });
    assert(r.diagnosis_id.startsWith("FOR-CR-"), `T14 ${t} has valid ID`);
    assert(r.category === "crash_investigation", `T14 ${t} correct category`);
    assert(r.severity === "critical", `T14 ${t} is critical`);
    assert(r.corrective_actions.length >= 2, `T14 ${t} has actions`);
  }
}

// ─── T15: Knowledge Base — failure modes list ──────────────────────────────
console.log("T15: KB — failure modes");
{
  const r = failureForensics("forensic_failure_modes", {});
  assert(r.total === 8, "T15.1 8 failure modes");
  assert(r.modes.length === 8, "T15.2 modes array length");
  assert(r.modes[0].mode !== undefined, "T15.3 has mode field");
  assert(r.modes[0].name !== undefined, "T15.4 has name field");
  assert(r.modes[0].severity !== undefined, "T15.5 has severity field");
}

// ─── T16: Knowledge Base — chip types list ─────────────────────────────────
console.log("T16: KB — chip types");
{
  const r = failureForensics("forensic_chip_types", {});
  assert(r.total === 7, "T16.1 7 chip types");
  assert(r.types.length === 7, "T16.2 types array length");
  assert(r.types[0].type !== undefined, "T16.3 has type field");
}

// ─── T17: Knowledge Base — surface defect types ────────────────────────────
console.log("T17: KB — surface types");
{
  const r = failureForensics("forensic_surface_types", {});
  assert(r.total === 8, "T17.1 8 surface defect types");
  assert(r.types.length === 8, "T17.2 types array length");
}

// ─── T18: Knowledge Base — crash types ─────────────────────────────────────
console.log("T18: KB — crash types");
{
  const r = failureForensics("forensic_crash_types", {});
  assert(r.total === 6, "T18.1 6 crash types");
  assert(r.types.length === 6, "T18.2 types array length");
  assert(r.types[0].common_causes !== undefined, "T18.3 has common_causes count");
}

// ─── T19: Corrective Action Quality ────────────────────────────────────────
console.log("T19: Corrective action quality");
{
  const r = failureForensics("forensic_tool_autopsy", { failure_mode: "plastic_deformation" });
  for (const action of r.corrective_actions) {
    assert(["high", "medium", "low"].includes(action.effectiveness), `T19 "${action.action}" effectiveness valid`);
    assert(action.priority >= 1 && action.priority <= 10, `T19 "${action.action}" priority valid`);
    assert(action.details.length > 10, `T19 "${action.action}" has details`);
  }
}

// ─── T20: History — accumulated diagnoses ──────────────────────────────────
console.log("T20: History");
{
  const r = failureForensics("forensic_history", {});
  // We've done: 12 tool autopsies (T1+T2+T3+T4+8 in T5 + T19 = 12),
  // 9 chip analyses (T6+T7+7 in T8 = 9),
  // 10 surface defects (T9+T10+8 in T11 = 10),
  // 8 crash investigations (T12+T13+6 in T14 = 8)
  // total = 39
  assert(r.total >= 30, "T20.1 accumulated diagnoses");
  assert(r.by_category.tool_autopsy >= 10, "T20.2 tool autopsy count");
  assert(r.by_category.chip_analysis >= 7, "T20.3 chip analysis count");
  assert(r.by_category.surface_defect >= 8, "T20.4 surface defect count");
  assert(r.by_category.crash_investigation >= 6, "T20.5 crash investigation count");
}

// ─── T21: Get — retrieve specific diagnosis ────────────────────────────────
console.log("T21: Get specific diagnosis");
{
  const r = failureForensics("forensic_get", { diagnosis_id: "FOR-TF-0001" });
  assert(r.diagnosis_id === "FOR-TF-0001", "T21.1 found diagnosis");
  assert(r.category === "tool_autopsy", "T21.2 correct category");
}

// ─── T22: Get — not found ──────────────────────────────────────────────────
console.log("T22: Get — not found");
{
  const r = failureForensics("forensic_get", { diagnosis_id: "FOR-NOPE-0000" });
  assert(r.error !== undefined, "T22.1 error for missing diagnosis");
}

// ─── T23: Unknown action ───────────────────────────────────────────────────
console.log("T23: Unknown action");
{
  const r = failureForensics("forensic_nonexistent", {});
  assert(r.error !== undefined, "T23.1 unknown action returns error");
}

// ─── T24: Default parameter handling ───────────────────────────────────────
console.log("T24: Default params");
{
  // Should not crash when no failure_mode specified
  const r1 = failureForensics("forensic_tool_autopsy", {});
  assert(r1.diagnosis_id !== undefined, "T24.1 autopsy defaults work");

  const r2 = failureForensics("forensic_chip_analysis", {});
  assert(r2.diagnosis_id !== undefined, "T24.2 chip defaults work");

  const r3 = failureForensics("forensic_surface_defect", {});
  assert(r3.diagnosis_id !== undefined, "T24.3 surface defaults work");

  const r4 = failureForensics("forensic_crash", {});
  assert(r4.diagnosis_id !== undefined, "T24.4 crash defaults work");
}

// ─── T25: ID uniqueness ────────────────────────────────────────────────────
console.log("T25: ID uniqueness");
{
  const history = failureForensics("forensic_history", {});
  const ids = history.diagnoses.map((d: any) => d.diagnosis_id);
  const uniqueIds = new Set(ids);
  assert(uniqueIds.size === ids.length, "T25.1 all IDs are unique");
}

// ─── Summary ────────────────────────────────────────────────────────────────
console.log(`\n${"=".repeat(60)}`);
console.log(`R10-Rev5 Failure Forensics: ${passed} passed, ${failed} failed out of ${passed + failed}`);
console.log(`${"=".repeat(60)}`);
process.exit(failed > 0 ? 1 : 0);
