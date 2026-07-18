/**
 * R10-Rev2 Inverse Problem Solving Tests
 * ========================================
 * Validates: surface finish, tool life, dimensional, chatter, and general
 * inverse solvers — physics-based root cause analysis from symptoms.
 */

import { inverseSolver } from "../../src/engines/InverseSolverEngine.js";

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) { passed++; }
  else { failed++; console.error(`  FAIL: ${msg}`); }
}

// ─── T1: inverse_surface — high feed cause ───────────────────────────────────
console.log("T1: inverse_surface — high feed");
{
  const r = inverseSolver("inverse_surface", {
    material: "steel",
    tool_diameter_mm: 10,
    flutes: 4,
    rpm: 3000,
    feed_mmmin: 2400, // fz = 0.2mm → high
    measured_ra_um: 3.2,
    expected_ra_um: 0.8,
  });
  assert(r.problem_id.startsWith("INV-SF-"), "T1.1 ID format");
  assert(r.problem_type === "surface_finish", "T1.2 problem type");
  assert(r.root_causes.length >= 3, "T1.3 at least 3 causes");
  assert(r.root_causes[0].probability > 0.5, "T1.4 primary cause probability > 0.5");
  assert(r.root_causes[0].fixes.length >= 1, "T1.5 primary cause has fixes");
  assert(r.root_causes[0].physics_basis.length > 20, "T1.6 has physics basis");
  assert(["low", "medium", "high", "very_high"].includes(r.confidence), "T1.7 valid confidence");
  assert(r.symptom_summary.includes("3.2"), "T1.8 symptom mentions measured Ra");
}

// ─── T2: inverse_surface — BUE detection ─────────────────────────────────────
console.log("T2: inverse_surface — BUE at low speed");
{
  const r = inverseSolver("inverse_surface", {
    material: "aluminum",
    tool_diameter_mm: 10,
    flutes: 3,
    rpm: 1000, // very low for aluminum (Vc = 31 m/min vs recommended 200+)
    feed_mmmin: 300,
    measured_ra_um: 6.0,
    expected_ra_um: 1.6,
  });
  const bueCause = r.root_causes.find((c: any) => c.cause.includes("Built-Up Edge"));
  assert(bueCause !== undefined, "T2.1 BUE cause identified");
  assert(bueCause!.probability >= 0.5, "T2.2 BUE probability significant");
  assert(bueCause!.fixes.some((f: any) => f.action.includes("speed")), "T2.3 fix recommends speed increase");
}

// ─── T3: inverse_surface — chatter suspected ─────────────────────────────────
console.log("T3: inverse_surface — chatter marks");
{
  const r = inverseSolver("inverse_surface", {
    material: "steel",
    tool_diameter_mm: 10,
    flutes: 4,
    rpm: 3000,
    feed_mmmin: 600, // fz = 0.05mm → low feed → theoretical Ra is low
    measured_ra_um: 5.0, // but measured Ra is 5x worse → chatter
    expected_ra_um: 1.6,
  });
  const chatterCause = r.root_causes.find((c: any) => c.cause.includes("Chatter"));
  assert(chatterCause !== undefined, "T3.1 chatter cause identified");
  assert(chatterCause!.severity === "high", "T3.2 chatter severity is high");
}

// ─── T4: inverse_tool_life — speed too high ──────────────────────────────────
console.log("T4: inverse_tool_life — speed too high");
{
  const r = inverseSolver("inverse_tool_life", {
    material: "inconel",
    tool_diameter_mm: 10,
    flutes: 4,
    rpm: 5000, // Vc = 157 m/min — WAY too fast for Inconel (max 60)
    feed_mmmin: 800,
    tool_life_min: 3,
    expected_tool_life_min: 45,
  });
  assert(r.problem_type === "tool_life", "T4.1 problem type");
  assert(r.symptom_summary.includes("3 min"), "T4.2 symptom mentions actual life");
  const speedCause = r.root_causes.find((c: any) => c.cause.includes("speed too high"));
  assert(speedCause !== undefined, "T4.3 speed cause identified");
  assert(speedCause!.probability > 0.7, "T4.4 high probability for speed");
  assert(speedCause!.severity === "critical" || speedCause!.severity === "high", "T4.5 critical/high severity");
}

// ─── T5: inverse_tool_life — thin chip rubbing ───────────────────────────────
console.log("T5: inverse_tool_life — thin chip");
{
  const r = inverseSolver("inverse_tool_life", {
    material: "steel",
    tool_diameter_mm: 10,
    flutes: 4,
    rpm: 3000,
    feed_mmmin: 120, // fz = 0.01mm → way too thin
    tool_life_min: 15,
    expected_tool_life_min: 45,
  });
  const rubbingCause = r.root_causes.find((c: any) => c.cause.includes("rubbing") || c.cause.includes("thin"));
  assert(rubbingCause !== undefined, "T5.1 rubbing/thin chip cause identified");
  assert(rubbingCause!.fixes.some((f: any) => f.action.toLowerCase().includes("feed")), "T5.2 fix recommends feed increase");
}

// ─── T6: inverse_tool_life — wrong grade for abrasive material ───────────────
console.log("T6: inverse_tool_life — wrong grade");
{
  const r = inverseSolver("inverse_tool_life", {
    material: "inconel",
    tool_diameter_mm: 10,
    flutes: 4,
    rpm: 1200, // Vc ≈ 38 m/min — reasonable speed
    feed_mmmin: 480,
    tool_life_min: 8,
    expected_tool_life_min: 30,
  });
  const gradeCause = r.root_causes.find((c: any) => c.cause.includes("grade"));
  assert(gradeCause !== undefined, "T6.1 wrong grade cause identified for Inconel");
  assert(gradeCause!.explanation.includes("abrasive"), "T6.2 mentions abrasiveness");
}

// ─── T7: inverse_dimensional — undersize (tool deflection) ───────────────────
console.log("T7: inverse_dimensional — undersize");
{
  const r = inverseSolver("inverse_dimensional", {
    material: "steel",
    tool_diameter_mm: 8,
    doc_mm: 2,
    woc_mm: 4,
    dimensional_error_mm: 0.05,
    error_direction: "undersize",
  });
  assert(r.problem_type === "dimensional", "T7.1 problem type");
  assert(r.symptom_summary.includes("undersize"), "T7.2 mentions undersize");
  const deflCause = r.root_causes.find((c: any) => c.cause.includes("deflection"));
  assert(deflCause !== undefined, "T7.3 deflection cause identified");
  assert(deflCause!.fixes.some((f: any) => f.action.includes("spring pass")), "T7.4 recommends spring pass");
}

// ─── T8: inverse_dimensional — inconsistent (thermal growth) ─────────────────
console.log("T8: inverse_dimensional — inconsistent");
{
  const r = inverseSolver("inverse_dimensional", {
    material: "steel",
    dimensional_error_mm: 0.03,
    error_direction: "inconsistent",
  });
  const thermalCause = r.root_causes.find((c: any) => c.cause.includes("thermal"));
  assert(thermalCause !== undefined, "T8.1 thermal growth cause identified");
  assert(thermalCause!.probability >= 0.7, "T8.2 high probability for inconsistent + thermal");
}

// ─── T9: inverse_dimensional — oversize + stainless (springback) ─────────────
console.log("T9: inverse_dimensional — stainless springback");
{
  const r = inverseSolver("inverse_dimensional", {
    material: "stainless",
    dimensional_error_mm: 0.02,
    error_direction: "undersize",
  });
  const springCause = r.root_causes.find((c: any) => c.cause.includes("springback"));
  assert(springCause !== undefined, "T9.1 springback cause identified for stainless");
}

// ─── T10: inverse_chatter — basic diagnosis ──────────────────────────────────
console.log("T10: inverse_chatter — basic");
{
  const r = inverseSolver("inverse_chatter", {
    material: "steel",
    tool_diameter_mm: 12,
    flutes: 4,
    rpm: 4000,
    doc_mm: 3,
  });
  assert(r.problem_type === "chatter", "T10.1 problem type");
  assert(r.root_causes.length >= 3, "T10.2 at least 3 causes");
  const regenCause = r.root_causes.find((c: any) => c.cause.includes("Regenerative"));
  assert(regenCause !== undefined, "T10.3 regenerative chatter identified");
  assert(regenCause!.probability >= 0.6, "T10.4 high probability");
  assert(regenCause!.fixes.some((f: any) => f.action.includes("RPM")), "T10.5 fix recommends RPM change");
}

// ─── T11: inverse_chatter — with frequency data ──────────────────────────────
console.log("T11: inverse_chatter — with frequency");
{
  const r = inverseSolver("inverse_chatter", {
    rpm: 6000,
    flutes: 2,
    tool_diameter_mm: 6,
    doc_mm: 2,
    chatter_frequency_hz: 100, // matches spindle frequency (6000/60 = 100 Hz)
  });
  const forcedCause = r.root_causes.find((c: any) => c.cause.includes("Forced") || c.cause.includes("unbalanced"));
  assert(forcedCause !== undefined, "T11.1 forced vibration identified");
  assert(forcedCause!.probability >= 0.7, "T11.2 high probability when freq matches spindle");
}

// ─── T12: inverse_troubleshoot — blue chips ──────────────────────────────────
console.log("T12: inverse_troubleshoot — blue chips");
{
  const r = inverseSolver("inverse_troubleshoot", {
    symptoms: ["blue_chips"],
  });
  assert(r.problem_type === "general", "T12.1 general type");
  assert(r.root_causes.length >= 1, "T12.2 has causes");
  assert(r.root_causes[0].cause.includes("temperature"), "T12.3 identifies temperature issue");
  assert(r.root_causes[0].probability >= 0.8, "T12.4 high probability");
}

// ─── T13: inverse_troubleshoot — multiple symptoms ───────────────────────────
console.log("T13: inverse_troubleshoot — multiple symptoms");
{
  const r = inverseSolver("inverse_troubleshoot", {
    symptoms: ["vibration", "poor_finish"],
  });
  assert(r.root_causes.length >= 2, "T13.1 at least 2 causes for 2 symptoms");
}

// ─── T14: inverse_troubleshoot — tool breakage ───────────────────────────────
console.log("T14: inverse_troubleshoot — tool breakage");
{
  const r = inverseSolver("inverse_troubleshoot", {
    symptoms: ["tool_breakage"],
  });
  assert(r.root_causes[0].severity === "critical", "T14.1 tool breakage is critical");
  assert(r.root_causes[0].fixes.some((f: any) => f.action.includes("Reduce")), "T14.2 recommends reducing params");
}

// ─── T15: inverse_troubleshoot — no symptoms ─────────────────────────────────
console.log("T15: inverse_troubleshoot — no symptoms");
{
  const r = inverseSolver("inverse_troubleshoot", { symptoms: [] });
  assert(r.additional_data_needed !== undefined, "T15.1 asks for more data");
  assert(r.additional_data_needed!.length > 0, "T15.2 specifies what data needed");
}

// ─── T16: inverse_solve — route by problem_type ──────────────────────────────
console.log("T16: inverse_solve — routing");
{
  const r1 = inverseSolver("inverse_solve", { problem_type: "surface_finish", measured_ra_um: 3.0, expected_ra_um: 1.0 });
  assert(r1.problem_type === "surface_finish", "T16.1 routed to surface solver");

  const r2 = inverseSolver("inverse_solve", { problem_type: "tool_life", tool_life_min: 5, expected_tool_life_min: 30 });
  assert(r2.problem_type === "tool_life", "T16.2 routed to tool life solver");

  const r3 = inverseSolver("inverse_solve", { problem_type: "dimensional", dimensional_error_mm: 0.05, error_direction: "undersize" });
  assert(r3.problem_type === "dimensional", "T16.3 routed to dimensional solver");

  const r4 = inverseSolver("inverse_solve", { problem_type: "chatter", rpm: 5000, flutes: 4, doc_mm: 3 });
  assert(r4.problem_type === "chatter", "T16.4 routed to chatter solver");
}

// ─── T17: inverse_history — accumulated solutions ────────────────────────────
console.log("T17: inverse_history");
{
  const r = inverseSolver("inverse_history", {});
  assert(r.total >= 15, "T17.1 accumulated solutions from earlier tests");
  assert(r.by_type.surface_finish >= 3, "T17.2 surface finish count");
  assert(r.by_type.tool_life >= 3, "T17.3 tool life count");
  assert(r.by_type.dimensional >= 3, "T17.4 dimensional count");
  assert(r.by_type.chatter >= 2, "T17.5 chatter count");
  assert(r.by_type.general >= 3, "T17.6 general count");
}

// ─── T18: inverse_get — retrieve specific ────────────────────────────────────
console.log("T18: inverse_get");
{
  const r = inverseSolver("inverse_get", { problem_id: "INV-SF-0001" });
  assert(r.problem_id === "INV-SF-0001", "T18.1 found solution");
  assert(r.problem_type === "surface_finish", "T18.2 correct type");
}

// ─── T19: inverse_get — not found ────────────────────────────────────────────
console.log("T19: inverse_get — not found");
{
  const r = inverseSolver("inverse_get", { problem_id: "INV-NOPE-0000" });
  assert(r.error !== undefined, "T19.1 error for missing solution");
}

// ─── T20: Fix quality — effectiveness & difficulty ───────────────────────────
console.log("T20: Fix quality checks");
{
  const r = inverseSolver("inverse_surface", {
    material: "titanium",
    tool_diameter_mm: 10,
    rpm: 2000,
    feed_mmmin: 400,
    flutes: 4,
    measured_ra_um: 4.0,
    expected_ra_um: 1.6,
  });
  for (const cause of r.root_causes) {
    for (const fix of cause.fixes) {
      assert(fix.effectiveness >= 0 && fix.effectiveness <= 1, `T20 fix "${fix.action}" effectiveness valid`);
      assert(["easy", "moderate", "hard"].includes(fix.difficulty), `T20 fix "${fix.action}" difficulty valid`);
      assert(["low", "medium", "high"].includes(fix.cost), `T20 fix "${fix.action}" cost valid`);
      assert(fix.details.length > 10, `T20 fix "${fix.action}" has details`);
    }
  }
}

// ─── T21: inverse_surface — all materials produce valid output ───────────────
console.log("T21: inverse_surface — all materials");
{
  const materials = ["aluminum", "steel", "stainless", "titanium", "inconel", "cast_iron"];
  for (const mat of materials) {
    const r = inverseSolver("inverse_surface", {
      material: mat,
      measured_ra_um: 4.0,
      expected_ra_um: 1.6,
      tool_diameter_mm: 10,
      flutes: 4,
      rpm: 2000,
      feed_mmmin: 800,
    });
    assert(r.root_causes.length >= 2, `T21 ${mat} has ≥2 causes`);
    assert(r.primary_cause.length > 0, `T21 ${mat} has primary cause`);
  }
}

// ─── T22: Edge — unknown action ──────────────────────────────────────────────
console.log("T22: Edge — unknown action");
{
  const r = inverseSolver("inverse_nonexistent", {});
  assert(r.error !== undefined, "T22.1 unknown action returns error");
}

// ─── Summary ────────────────────────────────────────────────────────────────
console.log(`\n${"=".repeat(60)}`);
console.log(`R10-Rev2 Inverse Solver: ${passed} passed, ${failed} failed out of ${passed + failed}`);
console.log(`${"=".repeat(60)}`);
process.exit(failed > 0 ? 1 : 0);
