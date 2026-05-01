/**
 * R10-Rev7 Machinist's Apprentice Tests
 * =======================================
 * Validates: explain mode, lessons, skill assessment, tribal knowledge capture,
 * challenge exercises, material guidance, history/retrieval.
 */

import { apprenticeEngine } from "../../src/engines/ApprenticeEngine.js";

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) { passed++; }
  else { failed++; console.error(`  FAIL: ${msg}`); }
}

// ─── T1: Explain — cutting speed for steel ──────────────────────────────────
console.log("T1: Explain — cutting speed steel");
{
  const r = apprenticeEngine("apprentice_explain", {
    parameter: "cutting_speed", material: "steel", value: "200 m/min", depth: "standard",
  });
  assert(r.parameter === "cutting_speed", "T1.1 parameter");
  assert(r.value === "200 m/min", "T1.2 value");
  assert(r.explanation.length > 20, "T1.3 has explanation");
  assert(r.factors.length >= 1, "T1.4 has factors");
  assert(r.depth === "standard", "T1.5 depth");
}

// ─── T2: Explain — feed for stainless with detail ───────────────────────────
console.log("T2: Explain — feed for stainless");
{
  const r = apprenticeEngine("apprentice_explain", {
    parameter: "feed", material: "stainless", depth: "detailed",
  });
  assert(r.explanation.includes("stainless") || r.explanation.includes("Stainless"), "T2.1 mentions material");
  assert(r.factors.some((f: any) => f.physics.includes("chip thickness") || f.physics.includes("work-hardened")), "T2.2 mentions chip thickness or work hardening");
}

// ─── T3: Explain — all materials produce valid output ───────────────────────
console.log("T3: Explain — all materials");
{
  const materials = ["aluminum", "steel", "stainless", "titanium", "inconel", "cast_iron"];
  for (const mat of materials) {
    const r = apprenticeEngine("apprentice_explain", { parameter: "cutting_speed", material: mat });
    assert(r.explanation.length > 20, `T3 ${mat} has explanation`);
    assert(r.factors.length >= 1, `T3 ${mat} has factors`);
  }
}

// ─── T4: Explain — coolant parameter ────────────────────────────────────────
console.log("T4: Explain — coolant");
{
  const r = apprenticeEngine("apprentice_explain", { parameter: "coolant", material: "cast_iron" });
  assert(r.factors.some((f: any) => f.physics.includes("Dry") || f.physics.includes("dry")), "T4.1 cast iron recommends dry");
}

// ─── T5: Lesson — get specific lesson ───────────────────────────────────────
console.log("T5: Lesson — specific");
{
  const r = apprenticeEngine("apprentice_lesson", { lesson_id: 1 });
  assert(r.id === 1, "T5.1 correct ID");
  assert(r.track === "fundamentals", "T5.2 track");
  assert(r.title === "What Determines Cutting Speed?", "T5.3 title");
  assert(r.duration_min === 5, "T5.4 duration");
  assert(r.concept.length > 20, "T5.5 has concept");
  assert(r.explanation.length > 50, "T5.6 has explanation");
  assert(r.key_formula !== undefined, "T5.7 has formula");
  assert(r.try_it.length > 20, "T5.8 has try-it exercise");
  assert(r.diagnostic.length > 20, "T5.9 has diagnostic exercise");
}

// ─── T6: Lesson — by track ─────────────────────────────────────────────────
console.log("T6: Lesson — by track");
{
  const r1 = apprenticeEngine("apprentice_lesson", { track: "fundamentals" });
  assert(r1.total === 7, "T6.1 fundamentals has 7 lessons");
  assert(r1.track === "fundamentals", "T6.2 track confirmed");

  const r2 = apprenticeEngine("apprentice_lesson", { track: "intermediate" });
  assert(r2.total === 6, "T6.3 intermediate has 6 lessons");

  const r3 = apprenticeEngine("apprentice_lesson", { track: "advanced" });
  assert(r3.total === 7, "T6.4 advanced has 7 lessons");
}

// ─── T7: Lessons — list all ─────────────────────────────────────────────────
console.log("T7: Lessons — list all");
{
  const r = apprenticeEngine("apprentice_lessons", {});
  assert(r.total === 20, "T7.1 total 20 lessons");
  assert(r.tracks.fundamentals.count === 7, "T7.2 fundamentals count");
  assert(r.tracks.intermediate.count === 6, "T7.3 intermediate count");
  assert(r.tracks.advanced.count === 7, "T7.4 advanced count");
}

// ─── T8: Lesson — all 20 lessons have required fields ───────────────────────
console.log("T8: Lesson — all 20 valid");
{
  for (let i = 1; i <= 20; i++) {
    const r = apprenticeEngine("apprentice_lesson", { lesson_id: i });
    assert(r.id === i, `T8 lesson ${i} has correct ID`);
    assert(r.title.length > 5, `T8 lesson ${i} has title`);
    assert(r.concept.length > 10, `T8 lesson ${i} has concept`);
    assert(r.explanation.length > 50, `T8 lesson ${i} has explanation`);
    assert(r.try_it.length > 10, `T8 lesson ${i} has try-it`);
    assert(r.diagnostic.length > 10, `T8 lesson ${i} has diagnostic`);
    assert(["fundamentals", "intermediate", "advanced"].includes(r.track), `T8 lesson ${i} valid track`);
  }
}

// ─── T9: Assess — beginner profile ──────────────────────────────────────────
console.log("T9: Assess — beginner");
{
  const r = apprenticeEngine("apprentice_assess", {
    answers: { cutting_speed: 20, chip_load: 10, tool_selection: 30, chatter: 15, work_offsets: 25, coolant: 20, setup_sheet: 35, toolpath: 10, surface_finish: 5, deflection: 10, material: 15 },
  });
  assert(r.assessment_id.startsWith("ASM-"), "T9.1 ID format");
  assert(r.level === "beginner", "T9.2 level is beginner");
  assert(r.total_score < 50, "T9.3 low total score");
  assert(r.gaps.length >= 5, "T9.4 many gaps identified");
  assert(r.recommended_lessons.length >= 5, "T9.5 many lessons recommended");
}

// ─── T10: Assess — advanced profile ─────────────────────────────────────────
console.log("T10: Assess — advanced");
{
  const r = apprenticeEngine("apprentice_assess", {
    answers: { cutting_speed: 90, chip_load: 85, tool_selection: 95, chatter: 80, work_offsets: 90, coolant: 85, setup_sheet: 92, toolpath: 88, surface_finish: 85, deflection: 82, material: 90 },
  });
  assert(r.level === "advanced", "T10.1 level is advanced");
  assert(r.total_score >= 80, "T10.2 high total score");
  assert(r.gaps.length === 0, "T10.3 no gaps");
}

// ─── T11: Assess — intermediate with specific gaps ──────────────────────────
console.log("T11: Assess — intermediate");
{
  const r = apprenticeEngine("apprentice_assess", {
    answers: { cutting_speed: 75, chip_load: 70, tool_selection: 65, chatter: 40, work_offsets: 80, coolant: 70, setup_sheet: 75, toolpath: 55, surface_finish: 30, deflection: 45, material: 60 },
  });
  assert(r.level === "intermediate", "T11.1 level is intermediate");
  assert(r.gaps.includes("chatter"), "T11.2 chatter is a gap");
  assert(r.gaps.includes("surface_finish"), "T11.3 surface_finish is a gap");
  assert(r.gaps.includes("deflection"), "T11.4 deflection is a gap");
  assert(r.recommended_lessons.includes(4), "T11.5 recommends chatter lesson");
  assert(r.recommended_lessons.includes(11), "T11.6 recommends surface finish lesson");
}

// ─── T12: Capture — tribal knowledge with physics validation ────────────────
console.log("T12: Capture — tribal knowledge");
{
  const r = apprenticeEngine("apprentice_capture", {
    source: "Dave", experience_years: 30,
    material: "17-4PH stainless",
    topic: "speed correction",
    insight: "Always run 17-4PH at low speed, 20% slower than 304",
    formalized_rule: "17-4PH: Apply Vc correction factor × 0.80 vs 304 baseline",
  });
  assert(r.knowledge_id.startsWith("TK-"), "T12.1 ID format");
  assert(r.source === "Dave", "T12.2 source");
  assert(r.experience_years === 30, "T12.3 experience");
  assert(r.confidence === "high", "T12.4 high confidence for 30yr experience");
  assert(r.physics_validation.length > 10, "T12.5 has physics validation");
}

// ─── T13: Capture — auto-validate aluminum BUE ─────────────────────────────
console.log("T13: Capture — auto-validate BUE");
{
  const r = apprenticeEngine("apprentice_capture", {
    source: "Junior machinist", experience_years: 2,
    material: "aluminum",
    topic: "speed",
    insight: "When I run aluminum at low speed, material builds up on the edge",
  });
  assert(r.confidence === "high", "T13.1 auto-validated BUE insight");
  assert(r.physics_validation.includes("CONFIRMED"), "T13.2 physics confirmed");
}

// ─── T14: Capture — low confidence for inexperienced ────────────────────────
console.log("T14: Capture — low confidence");
{
  const r = apprenticeEngine("apprentice_capture", {
    source: "Student", experience_years: 0,
    material: "general",
    topic: "general",
    insight: "I think faster is always better",
  });
  assert(r.confidence === "low", "T14.1 low confidence for no experience");
}

// ─── T15: Knowledge — list captured entries ─────────────────────────────────
console.log("T15: Knowledge list");
{
  const r = apprenticeEngine("apprentice_knowledge", {});
  assert(r.total >= 3, "T15.1 accumulated entries");
  assert(r.by_confidence.high >= 2, "T15.2 high confidence count");
  assert(r.entries.length === r.total, "T15.3 entries match total");
}

// ─── T16: Challenge — get by difficulty ─────────────────────────────────────
console.log("T16: Challenge — by difficulty");
{
  const r1 = apprenticeEngine("apprentice_challenge", { difficulty: "beginner" });
  assert(r1.total >= 1, "T16.1 beginner challenges exist");
  assert(r1.challenges.every((c: any) => c.difficulty === "beginner"), "T16.2 all beginner");

  const r2 = apprenticeEngine("apprentice_challenge", { difficulty: "advanced" });
  assert(r2.total >= 1, "T16.3 advanced challenges exist");
}

// ─── T17: Challenge — get specific ──────────────────────────────────────────
console.log("T17: Challenge — specific");
{
  const r = apprenticeEngine("apprentice_challenge", { challenge_id: "CH-001" });
  assert(r.challenge_id === "CH-001", "T17.1 correct ID");
  assert(r.scenario.length > 20, "T17.2 has scenario");
  assert(r.symptoms.length >= 1, "T17.3 has symptoms");
  assert(r.question.length > 10, "T17.4 has question");
  assert(r.answer.length > 20, "T17.5 has answer");
  assert(r.lesson_ref >= 1, "T17.6 references a lesson");
}

// ─── T18: Challenge — all challenges valid ──────────────────────────────────
console.log("T18: Challenge — all valid");
{
  const r = apprenticeEngine("apprentice_challenge", {});
  assert(r.total >= 5, "T18.1 at least 5 challenges");
  for (const c of r.challenges) {
    assert(c.challenge_id.startsWith("CH-"), `T18 ${c.challenge_id} has valid ID`);
    assert(c.scenario.length > 10, `T18 ${c.challenge_id} has scenario`);
    assert(c.answer.length > 10, `T18 ${c.challenge_id} has answer`);
    assert(["beginner", "intermediate", "advanced"].includes(c.difficulty), `T18 ${c.challenge_id} valid difficulty`);
  }
}

// ─── T19: Materials — specific material guidance ────────────────────────────
console.log("T19: Materials — specific");
{
  const r = apprenticeEngine("apprentice_materials", { material: "titanium" });
  assert(r.name === "Titanium", "T19.1 name");
  assert(r.thermal_conductivity.includes("7"), "T19.2 thermal conductivity");
  assert(r.key_challenge.length > 10, "T19.3 has challenge");
  assert(r.speed_reasoning.length > 20, "T19.4 has speed reasoning");
  assert(r.feed_reasoning.length > 20, "T19.5 has feed reasoning");
  assert(r.coolant_reasoning.length > 20, "T19.6 has coolant reasoning");
  assert(r.common_mistakes.length >= 2, "T19.7 has common mistakes");
}

// ─── T20: Materials — list all ──────────────────────────────────────────────
console.log("T20: Materials — list");
{
  const r = apprenticeEngine("apprentice_materials", {});
  assert(r.total === 6, "T20.1 6 materials");
  assert(r.materials.length === 6, "T20.2 materials array");
}

// ─── T21: Materials — all materials have complete guidance ──────────────────
console.log("T21: Materials — all complete");
{
  const mats = ["aluminum", "steel", "stainless", "titanium", "inconel", "cast_iron"];
  for (const mat of mats) {
    const r = apprenticeEngine("apprentice_materials", { material: mat });
    assert(r.name.length > 3, `T21 ${mat} has name`);
    assert(r.speed_reasoning.length > 20, `T21 ${mat} has speed reasoning`);
    assert(r.feed_reasoning.length > 20, `T21 ${mat} has feed reasoning`);
    assert(r.coolant_reasoning.length > 20, `T21 ${mat} has coolant reasoning`);
    assert(r.common_mistakes.length >= 2, `T21 ${mat} has mistakes`);
  }
}

// ─── T22: History ───────────────────────────────────────────────────────────
console.log("T22: History");
{
  const r = apprenticeEngine("apprentice_history", {});
  assert(r.total >= 3, "T22.1 assessments tracked");
  assert(r.knowledge_entries >= 3, "T22.2 knowledge entries tracked");
}

// ─── T23: Get — retrieve specific assessment ────────────────────────────────
console.log("T23: Get specific assessment");
{
  const r = apprenticeEngine("apprentice_get", { assessment_id: "ASM-0001" });
  assert(r.assessment_id === "ASM-0001", "T23.1 found assessment");
  assert(r.level !== undefined, "T23.2 has level");
}

// ─── T24: Get — not found ──────────────────────────────────────────────────
console.log("T24: Get — not found");
{
  const r = apprenticeEngine("apprentice_get", { assessment_id: "ASM-NOPE-0000" });
  assert(r.error !== undefined, "T24.1 error for missing assessment");
}

// ─── T25: Unknown action ───────────────────────────────────────────────────
console.log("T25: Unknown action");
{
  const r = apprenticeEngine("apprentice_nonexistent", {});
  assert(r.error !== undefined, "T25.1 unknown action returns error");
}

// ─── T26: Lesson — not found ───────────────────────────────────────────────
console.log("T26: Lesson — not found");
{
  const r = apprenticeEngine("apprentice_lesson", { lesson_id: 999 });
  assert(r.error !== undefined, "T26.1 error for missing lesson");
}

// ─── Summary ────────────────────────────────────────────────────────────────
console.log(`\n${"=".repeat(60)}`);
console.log(`R10-Rev7 Apprentice Engine: ${passed} passed, ${failed} failed out of ${passed + failed}`);
console.log(`${"=".repeat(60)}`);
process.exit(failed > 0 ? 1 : 0);
