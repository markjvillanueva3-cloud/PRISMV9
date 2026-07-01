/**
 * R8-MS7 UserAssistanceSkillsEngine Tests
 * =========================================
 * 80 tests across 12 test sections (T1-T12)
 *
 * T1:      Skill registry (all 10 skills present)
 * T2-T3:   Individual skill structure validation
 * T4:      Skill search
 * T5-T6:   Skill matching (trigger patterns + regex)
 * T7:      Category filtering
 * T8:      Physics explanations
 * T9:      Confidence assessment
 * T10:     Common mistakes
 * T11:     Safety reports
 * T12:     Dispatcher integration + edge cases
 */

import {
  userAssistanceSkills,
  getAllAssistanceSkills,
  getAssistanceSkillById,
  searchAssistanceSkills,
  matchAssistanceSkill,
  explainPhysics,
  assessConfidence,
  getCommonMistakes,
  generateSafetyReport,
} from "../../src/engines/UserAssistanceSkillsEngine.js";

// ─── Test Harness ───────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
let total = 0;

function assert(condition: boolean, msg: string): void {
  total++;
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: ${msg}`);
  }
}

// ─── T1: Skill registry ───────────────────────────────────────────────────

console.log("\nT1: Skill registry");
{
  const skills = getAllAssistanceSkills();
  assert(skills.length === 10, "T1.1 exactly 10 skills");

  const ids = skills.map(s => s.id);
  assert(ids.includes("explain-physics"), "T1.2 has explain-physics");
  assert(ids.includes("explain-recommendations"), "T1.3 has explain-recommendations");
  assert(ids.includes("confidence-communication"), "T1.4 has confidence-communication");
  assert(ids.includes("alternative-explorer"), "T1.5 has alternative-explorer");
  assert(ids.includes("feedback-integration"), "T1.6 has feedback-integration");
  assert(ids.includes("safety-verification"), "T1.7 has safety-verification");
  assert(ids.includes("documentation-setup"), "T1.8 has documentation-setup");
  assert(ids.includes("decision-flow-diagrams"), "T1.9 has decision-flow-diagrams");
  assert(ids.includes("anti-machining-mistakes"), "T1.10 has anti-machining-mistakes");
  assert(ids.includes("onboarding"), "T1.11 has onboarding");
}

// ─── T2: Skill structure — explain-physics ──────────────────────────────────

console.log("\nT2: Skill structure — explain-physics");
{
  const skill = getAssistanceSkillById("explain-physics")!;
  assert(skill !== null, "T2.1 skill found");
  assert(skill.name === "Explain Physics", "T2.2 correct name");
  assert(skill.category === "explain", "T2.3 category is explain");
  assert(skill.trigger_patterns.length >= 3, "T2.4 has trigger patterns");
  assert(skill.trigger_regex.length >= 2, "T2.5 has trigger regex");
  assert(skill.data_sources.length >= 2, "T2.6 has data sources");
  assert(typeof skill.response_template === "string", "T2.7 has response template");
  assert(typeof skill.persona_adaptation.machinist === "string", "T2.8 machinist adaptation");
  assert(typeof skill.persona_adaptation.programmer === "string", "T2.9 programmer adaptation");
  assert(typeof skill.persona_adaptation.manager === "string", "T2.10 manager adaptation");
}

// ─── T3: Skill structure — all skills have required fields ─────────────────

console.log("\nT3: Skill structure validation");
{
  const skills = getAllAssistanceSkills();
  for (const skill of skills) {
    assert(skill.id.length > 0, `T3.${skill.id} has id`);
    assert(skill.name.length > 0, `T3.${skill.id} has name`);
    assert(skill.description.length > 0, `T3.${skill.id} has description`);
    assert(["explain", "verify", "document", "learn"].includes(skill.category), `T3.${skill.id} valid category`);
    assert(skill.trigger_patterns.length > 0, `T3.${skill.id} has patterns`);
    assert(skill.trigger_regex.length > 0, `T3.${skill.id} has regex`);
    assert(skill.data_sources.length > 0, `T3.${skill.id} has data sources`);
    assert(typeof skill.response_template === "string", `T3.${skill.id} has template`);
    assert(skill.persona_adaptation.machinist !== undefined, `T3.${skill.id} machinist persona`);
    assert(skill.persona_adaptation.programmer !== undefined, `T3.${skill.id} programmer persona`);
    assert(skill.persona_adaptation.manager !== undefined, `T3.${skill.id} manager persona`);
  }
}

// ─── T4: Skill search ──────────────────────────────────────────────────────

console.log("\nT4: Skill search");
{
  const r1 = searchAssistanceSkills("physics");
  assert(r1.length >= 1, "T4.1 found physics skills");
  assert(r1.some(s => s.id === "explain-physics"), "T4.2 found explain-physics");

  const r2 = searchAssistanceSkills("safety");
  assert(r2.length >= 1, "T4.3 found safety skills");

  const r3 = searchAssistanceSkills("mistake");
  assert(r3.length >= 1, "T4.4 found mistake skills");

  const r4 = searchAssistanceSkills("nonexistent_xyzzy");
  assert(r4.length === 0, "T4.5 no results for garbage");

  const r5 = searchAssistanceSkills("explain");
  assert(r5.length >= 2, "T4.6 multiple explain skills");
}

// ─── T5: Skill matching — trigger phrases ──────────────────────────────────

console.log("\nT5: Skill matching — trigger phrases");
{
  const m1 = matchAssistanceSkill("why this speed?");
  assert(m1 !== null, "T5.1 matched speed query");
  assert(m1!.skill.id === "explain-physics", "T5.2 correct skill");
  assert(m1!.confidence >= 0.7, "T5.3 good confidence");

  const m2 = matchAssistanceSkill("how sure are you about this?");
  assert(m2 !== null, "T5.4 matched confidence query");
  assert(m2!.skill.id === "confidence-communication", "T5.5 correct skill");

  const m3 = matchAssistanceSkill("common mistakes for steel");
  assert(m3 !== null, "T5.6 matched mistakes query");
  assert(m3!.skill.id === "anti-machining-mistakes", "T5.7 correct skill");

  const m4 = matchAssistanceSkill("is this safe to run?");
  assert(m4 !== null, "T5.8 matched safety query");
  assert(m4!.skill.id === "safety-verification", "T5.9 correct skill");
}

// ─── T6: Skill matching — regex patterns ───────────────────────────────────

console.log("\nT6: Skill matching — regex patterns");
{
  const m1 = matchAssistanceSkill("why that feed rate?");
  assert(m1 !== null, "T6.1 regex match — physics");
  assert(m1!.skill.id === "explain-physics", "T6.2 correct skill");

  const m2 = matchAssistanceSkill("why did you choose that approach?");
  assert(m2 !== null, "T6.3 regex match — recommendations");
  assert(m2!.skill.id === "explain-recommendations", "T6.4 correct skill");

  const m3 = matchAssistanceSkill("that didn't work at all");
  assert(m3 !== null, "T6.5 regex match — feedback");
  assert(m3!.skill.id === "feedback-integration", "T6.6 correct skill");

  const m4 = matchAssistanceSkill("what could go wrong here?");
  assert(m4 !== null, "T6.7 regex match — safety");
  assert(m4!.skill.id === "safety-verification", "T6.8 correct skill");

  const m5 = matchAssistanceSkill("hello world weather forecast");
  assert(m5 === null, "T6.9 no match for irrelevant query");
}

// ─── T7: Category filtering ────────────────────────────────────────────────

console.log("\nT7: Category filtering");
{
  const explain = getAllAssistanceSkills().filter(s => s.category === "explain");
  assert(explain.length >= 3, "T7.1 explain skills >= 3");

  const verify = getAllAssistanceSkills().filter(s => s.category === "verify");
  assert(verify.length >= 2, "T7.2 verify skills >= 2");

  const doc = getAllAssistanceSkills().filter(s => s.category === "document");
  assert(doc.length >= 1, "T7.3 document skills >= 1");

  const learn = getAllAssistanceSkills().filter(s => s.category === "learn");
  assert(learn.length >= 1, "T7.4 learn skills >= 1");
}

// ─── T8: Physics explanations ──────────────────────────────────────────────

console.log("\nT8: Physics explanations");
{
  const e1 = explainPhysics({ parameter: "cutting_speed", value: 200, material: "Steel" });
  assert(e1.parameter === "cutting_speed", "T8.1 parameter name");
  assert(e1.value === 200, "T8.2 value preserved");
  assert(e1.unit === "m/min", "T8.3 correct unit");
  assert(e1.explanation.length > 20, "T8.4 explanation not empty");
  assert(e1.factors.length >= 2, "T8.5 has factors");
  assert(e1.simplified.length > 10, "T8.6 has simplified version");
  assert(e1.simplified.includes("Steel"), "T8.7 simplified mentions material");

  const e2 = explainPhysics({ parameter: "feed_per_tooth", value: 0.15, material: "Aluminum" });
  assert(e2.parameter === "feed_per_tooth", "T8.8 feed parameter");
  assert(e2.unit === "mm/tooth", "T8.9 feed unit");
  assert(e2.simplified.includes("Aluminum"), "T8.10 mentions aluminum");

  const e3 = explainPhysics({ parameter: "axial_depth", value: 5 });
  assert(e3.parameter === "axial_depth", "T8.11 axial_depth parameter");
  assert(e3.unit === "mm", "T8.12 depth unit");

  // Default parameter
  const e4 = explainPhysics({});
  assert(e4.parameter === "cutting_speed", "T8.13 defaults to cutting_speed");
}

// ─── T9: Confidence assessment ─────────────────────────────────────────────

console.log("\nT9: Confidence assessment");
{
  // Full data
  const c1 = assessConfidence({ material: "4140", machine: "DMU 50", tool: "Carbide endmill" });
  assert(c1.overall_confidence >= 0.8, "T9.1 high confidence with all data");
  assert(c1.data_quality === "high", "T9.2 high quality");
  assert(c1.factors.length >= 3, "T9.3 has factors");
  assert(c1.uncertainty_bounds.length >= 3, "T9.4 has uncertainty bounds");
  assert(c1.recommendation.includes("confidence"), "T9.5 has recommendation");

  // Partial data — material only
  const c2 = assessConfidence({ material: "Ti-6Al-4V" });
  assert(c2.overall_confidence >= 0.6, "T9.6 medium confidence with material");
  assert(c2.overall_confidence < 0.85, "T9.7 not high without machine/tool");
  assert(c2.data_quality === "medium", "T9.8 medium quality");

  // No data
  const c3 = assessConfidence({});
  assert(c3.overall_confidence === 0.5, "T9.9 base confidence with no data");
  assert(c3.data_quality === "low", "T9.10 low quality");

  // Confidence capped at 0.95
  const c4 = assessConfidence({ material: "Steel", machine: "Mazak", tool: "Insert" });
  assert(c4.overall_confidence <= 0.95, "T9.11 confidence capped");
}

// ─── T10: Common mistakes ──────────────────────────────────────────────────

console.log("\nT10: Common mistakes");
{
  // Stainless steel mistakes
  const m1 = getCommonMistakes({ material: "316" });
  assert(m1.length >= 1, "T10.1 found stainless mistakes");
  assert(m1.some(m => m.id === "CM01"), "T10.2 CM01 for stainless");

  // Titanium mistakes
  const m2 = getCommonMistakes({ material: "Ti-6Al-4V" });
  assert(m2.length >= 1, "T10.3 found titanium mistakes");
  assert(m2.some(m => m.id === "CM02"), "T10.4 CM02 for titanium");

  // All material (generic)
  const m3 = getCommonMistakes({ material: "generic" });
  assert(m3.length >= 4, "T10.5 generic gets 'all' tagged mistakes");

  // Operation filter
  const m4 = getCommonMistakes({ operation: "drilling" });
  assert(m4.length >= 1, "T10.6 drilling mistakes found");
  assert(m4.some(m => m.id === "CM05"), "T10.7 CM05 for drilling");

  // Inconel
  const m5 = getCommonMistakes({ material: "Inconel 718" });
  assert(m5.length >= 1, "T10.8 Inconel mistakes found");
  assert(m5.some(m => m.id === "CM06"), "T10.9 CM06 for Inconel");

  // No match (but 'all' tag catches generic ones)
  const m6 = getCommonMistakes({ material: "all" });
  assert(m6.length >= 5, "T10.10 'all' tag returns many");
}

// ─── T11: Safety reports ───────────────────────────────────────────────────

console.log("\nT11: Safety reports");
{
  // Safe
  const s1 = generateSafetyReport({ safety_score: 0.95 });
  assert(s1.grade === "SAFE", "T11.1 SAFE grade");
  assert(s1.score === 0.95, "T11.2 score preserved");
  assert(s1.limits_checked.length >= 4, "T11.3 limits checked");
  assert(s1.recommendation.includes("confidence"), "T11.4 safe recommendation");

  // Caution
  const s2 = generateSafetyReport({ safety_score: 0.75 });
  assert(s2.grade === "CAUTION", "T11.5 CAUTION grade");
  assert(s2.recommendation.includes("Monitor"), "T11.6 caution recommendation");

  // Warning
  const s3 = generateSafetyReport({ safety_score: 0.55 });
  assert(s3.grade === "WARNING", "T11.7 WARNING grade");

  // Danger
  const s4 = generateSafetyReport({ safety_score: 0.3 });
  assert(s4.grade === "DANGER", "T11.8 DANGER grade");
  assert(s4.recommendation.includes("STOP"), "T11.9 danger recommendation");

  // With risk factors
  const s5 = generateSafetyReport({ safety_score: 0.7, force_ratio: 0.9, deflection_mm: 0.1, temperature_C: 900 });
  assert(s5.risks.length >= 3, "T11.10 detected 3 risk factors");
  assert(s5.risks.some(r => r.name.includes("force")), "T11.11 force risk");
  assert(s5.risks.some(r => r.name.includes("deflection")), "T11.12 deflection risk");
  assert(s5.risks.some(r => r.name.includes("temperature")), "T11.13 temperature risk");

  // No risks — gets default "within limits"
  const s6 = generateSafetyReport({ safety_score: 0.92 });
  assert(s6.risks.length >= 1, "T11.14 always has at least 1 risk entry");
  assert(s6.risks[0].severity === "low", "T11.15 default risk is low");
}

// ─── T12: Dispatcher integration + edge cases ──────────────────────────────

console.log("\nT12: Dispatcher integration + edge cases");
{
  // assist_list
  const list = userAssistanceSkills("assist_list", {});
  assert(list.total === 10, "T12.1 list total = 10");
  assert(list.skills.length === 10, "T12.2 10 skills in array");

  // assist_list with category filter
  const catList = userAssistanceSkills("assist_list", { category: "verify" });
  assert(catList.total >= 2, "T12.3 verify category filter");

  // assist_get
  const get = userAssistanceSkills("assist_get", { skill_id: "safety-verification" });
  assert(get.id === "safety-verification", "T12.4 get returns correct skill");

  // assist_get — not found
  const getErr = userAssistanceSkills("assist_get", { skill_id: "nonexistent" });
  assert(getErr.error !== undefined, "T12.5 not found returns error");

  // assist_search
  const search = userAssistanceSkills("assist_search", { query: "confidence" });
  assert(search.total >= 1, "T12.6 search finds confidence");

  // assist_match
  const match = userAssistanceSkills("assist_match", { query: "why this speed?" });
  assert(match.matched === true, "T12.7 match found");
  assert(match.skill_id === "explain-physics", "T12.8 correct skill");

  // assist_match — no match
  const noMatch = userAssistanceSkills("assist_match", { query: "weather forecast tomorrow" });
  assert(noMatch.matched === false, "T12.9 no match for irrelevant");

  // assist_explain
  const explain = userAssistanceSkills("assist_explain", { parameter: "cutting_speed", value: 150 });
  assert(explain.parameter === "cutting_speed", "T12.10 explain returns parameter");

  // assist_confidence
  const conf = userAssistanceSkills("assist_confidence", { material: "Steel" });
  assert(conf.overall_confidence >= 0.6, "T12.11 confidence returned");

  // assist_mistakes
  const mistakes = userAssistanceSkills("assist_mistakes", { material: "titanium" });
  assert(mistakes.total >= 1, "T12.12 mistakes returned");

  // assist_safety
  const safety = userAssistanceSkills("assist_safety", { safety_score: 0.85 });
  assert(safety.grade === "CAUTION", "T12.13 safety grade returned");

  // Unknown action throws
  let threw = false;
  try {
    userAssistanceSkills("bad_action", {});
  } catch {
    threw = true;
  }
  assert(threw, "T12.14 unknown action throws");

  // Empty search
  const empty = userAssistanceSkills("assist_search", { query: "zzzzz_no_match" });
  assert(empty.total === 0, "T12.15 empty search returns 0");
}

// ─── Summary ────────────────────────────────────────────────────────────────

console.log("\n" + "=".repeat(60));
console.log(`R8-MS7 UserAssistanceSkillsEngine: ${passed}/${total} passed, ${failed} failed`);
console.log("=".repeat(60));

if (failed > 0) process.exit(1);
