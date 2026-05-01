/**
 * R8-MS6 UserWorkflowSkillsEngine Tests
 * ========================================
 * 80 tests across 12 test sections (T1-T12)
 *
 * T1:      Skill registry (all 12 skills present)
 * T2-T3:   Individual skill structure validation
 * T4:      Skill search
 * T5-T6:   Skill matching (trigger patterns + regex)
 * T7:      Category filtering
 * T8:      Skill steps
 * T9:      Persona adaptation
 * T10-T11: Dispatcher integration
 * T12:     Edge cases
 */

import {
  userWorkflowSkills,
  getAllSkills,
  getSkillById,
  searchSkills,
  matchSkill,
  getSkillsByCategory,
  getSkillSteps,
  getSkillForPersona,
} from "../../src/engines/UserWorkflowSkillsEngine.js";

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
  const skills = getAllSkills();
  assert(skills.length === 12, "T1.1 exactly 12 skills");

  const ids = skills.map(s => s.id);
  assert(ids.includes("material-guide"), "T1.2 has material-guide");
  assert(ids.includes("speed-feed-wizard"), "T1.3 has speed-feed-wizard");
  assert(ids.includes("tool-select"), "T1.4 has tool-select");
  assert(ids.includes("machine-setup"), "T1.5 has machine-setup");
  assert(ids.includes("toolpath-advisor"), "T1.6 has toolpath-advisor");
  assert(ids.includes("troubleshoot"), "T1.7 has troubleshoot");
  assert(ids.includes("quality-analysis"), "T1.8 has quality-analysis");
  assert(ids.includes("cost-optimization"), "T1.9 has cost-optimization");
  assert(ids.includes("post-debug"), "T1.10 has post-debug");
  assert(ids.includes("fixture-selection"), "T1.11 has fixture-selection");
  assert(ids.includes("cycle-time-optimize"), "T1.12 has cycle-time-optimize");
  assert(ids.includes("quoting-assistance"), "T1.13 has quoting-assistance");
}

// ─── T2: Skill structure — material-guide ──────────────────────────────────

console.log("\nT2: Skill structure — material-guide");
{
  const skill = getSkillById("material-guide")!;
  assert(skill !== null, "T2.1 skill found");
  assert(skill.name === "Material Guide", "T2.2 correct name");
  assert(skill.trigger_patterns.length >= 3, "T2.3 has trigger patterns");
  assert(skill.trigger_regex.length >= 2, "T2.4 has trigger regex");
  assert(skill.required_actions.includes("material_search"), "T2.5 requires material_search");
  assert(skill.steps.length === 3, "T2.6 has 3 steps");
  assert(skill.steps[0].id === "identify", "T2.7 first step is identify");
  assert(skill.steps[1].depends_on === "identify", "T2.8 step 2 depends on step 1");
  assert(skill.category === "parameter", "T2.9 category is parameter");
  assert(typeof skill.fallback_behavior === "string", "T2.10 has fallback");
}

// ─── T3: Skill structure — all skills have required fields ─────────────────

console.log("\nT3: Skill structure validation");
{
  const skills = getAllSkills();
  for (const skill of skills) {
    assert(skill.id.length > 0, `T3.${skill.id} has id`);
    assert(skill.name.length > 0, `T3.${skill.id} has name`);
    assert(skill.description.length > 0, `T3.${skill.id} has description`);
    assert(skill.trigger_patterns.length > 0, `T3.${skill.id} has patterns`);
    assert(skill.trigger_regex.length > 0, `T3.${skill.id} has regex`);
    assert(skill.required_actions.length > 0, `T3.${skill.id} has actions`);
    assert(skill.steps.length > 0, `T3.${skill.id} has steps`);
    assert(skill.persona_adaptation.machinist !== undefined, `T3.${skill.id} has machinist persona`);
    assert(skill.persona_adaptation.programmer !== undefined, `T3.${skill.id} has programmer persona`);
    assert(skill.persona_adaptation.manager !== undefined, `T3.${skill.id} has manager persona`);
  }
}

// ─── T4: Skill search ──────────────────────────────────────────────────────

console.log("\nT4: Skill search");
{
  const results1 = searchSkills("speed");
  assert(results1.length >= 1, "T4.1 found speed skills");
  assert(results1.some(s => s.id === "speed-feed-wizard"), "T4.2 found speed-feed-wizard");

  const results2 = searchSkills("cost");
  assert(results2.length >= 1, "T4.3 found cost skills");

  const results3 = searchSkills("diagnosis");
  assert(results3.length >= 1, "T4.4 found diagnosis skills");

  const results4 = searchSkills("nonexistent_xyzzy");
  assert(results4.length === 0, "T4.5 no results for garbage");
}

// ─── T5: Skill matching — trigger phrases ──────────────────────────────────

console.log("\nT5: Skill matching — trigger phrases");
{
  const m1 = matchSkill("what speed and feed for 4140?");
  assert(m1 !== null, "T5.1 matched speed query");
  assert(m1!.skill.id === "speed-feed-wizard", "T5.2 correct skill");
  assert(m1!.confidence >= 0.7, "T5.3 good confidence");

  const m2 = matchSkill("what tool should I use for titanium?");
  assert(m2 !== null, "T5.4 matched tool query");
  assert(m2!.skill.id === "tool-select", "T5.5 correct skill");

  const m3 = matchSkill("getting chatter on my part");
  assert(m3 !== null, "T5.6 matched troubleshoot");
  assert(m3!.skill.id === "troubleshoot", "T5.7 correct skill");

  const m4 = matchSkill("cost per part for this bracket?");
  assert(m4 !== null, "T5.8 matched quoting");
  assert(m4!.skill.id === "quoting-assistance", "T5.9 correct skill");
}

// ─── T6: Skill matching — regex patterns ───────────────────────────────────

console.log("\nT6: Skill matching — regex patterns");
{
  const m1 = matchSkill("how to machine inconel");
  assert(m1 !== null, "T6.1 regex match — material guide");
  assert(m1!.skill.id === "material-guide", "T6.2 correct skill");

  const m2 = matchSkill("best strategy for deep pockets");
  assert(m2 !== null, "T6.3 regex match — toolpath advisor");
  assert(m2!.skill.id === "toolpath-advisor", "T6.4 correct skill");

  const m3 = matchSkill("alarm code 1234 on my Fanuc");
  assert(m3 !== null, "T6.5 regex match — post debug");
  assert(m3!.skill.id === "post-debug", "T6.6 correct skill");

  const m4 = matchSkill("how long will this take?");
  assert(m4 !== null, "T6.7 regex match — cycle time");
  assert(m4!.skill.id === "cycle-time-optimize", "T6.8 correct skill");
}

// ─── T7: Category filtering ────────────────────────────────────────────────

console.log("\nT7: Category filtering");
{
  const param = getSkillsByCategory("parameter");
  assert(param.length >= 3, "T7.1 parameter skills >= 3");

  const diag = getSkillsByCategory("diagnosis");
  assert(diag.length >= 2, "T7.2 diagnosis skills >= 2");

  const cost = getSkillsByCategory("cost");
  assert(cost.length >= 2, "T7.3 cost skills >= 2");

  const setup = getSkillsByCategory("setup");
  assert(setup.length >= 1, "T7.4 setup skills >= 1");

  const strategy = getSkillsByCategory("strategy");
  assert(strategy.length >= 1, "T7.5 strategy skills >= 1");
}

// ─── T8: Skill steps ──────────────────────────────────────────────────────

console.log("\nT8: Skill steps");
{
  const steps = getSkillSteps("troubleshoot");
  assert(steps.length === 3, "T8.1 troubleshoot has 3 steps");
  assert(steps[0].action === "failure_diagnose", "T8.2 first step is diagnose");
  assert(steps[1].depends_on === "diagnose", "T8.3 step 2 depends on step 1");
  assert(steps[2].depends_on === "analyze", "T8.4 step 3 depends on step 2");

  const empty = getSkillSteps("nonexistent");
  assert(empty.length === 0, "T8.5 no steps for missing skill");
}

// ─── T9: Persona adaptation ───────────────────────────────────────────────

console.log("\nT9: Persona adaptation");
{
  const mac = getSkillForPersona("speed-feed-wizard", "machinist");
  assert(mac !== null, "T9.1 machinist persona found");
  assert(mac!.adaptation.detail_level === "standard", "T9.2 machinist standard detail");
  assert(mac!.adaptation.focus.includes("RPM"), "T9.3 machinist focuses on RPM");

  const prog = getSkillForPersona("speed-feed-wizard", "programmer");
  assert(prog !== null, "T9.4 programmer persona found");
  assert(prog!.adaptation.detail_level === "detailed", "T9.5 programmer detailed");

  const mgr = getSkillForPersona("speed-feed-wizard", "manager");
  assert(mgr !== null, "T9.6 manager persona found");
  assert(mgr!.adaptation.detail_level === "minimal", "T9.7 manager minimal detail");

  // Quoting — manager gets detailed (cost is their domain)
  const qMgr = getSkillForPersona("quoting-assistance", "manager");
  assert(qMgr !== null && qMgr.adaptation.detail_level === "detailed", "T9.8 quoting manager detailed");
}

// ─── T10: Dispatcher — list & get ──────────────────────────────────────────

console.log("\nT10: Dispatcher — list & get");
{
  const list = userWorkflowSkills("skill_list", {});
  assert(list.total === 12, "T10.1 list total = 12");
  assert(list.skills.length === 12, "T10.2 12 skills in array");
  assert(list.skills[0].id !== undefined, "T10.3 skill has id");

  const catList = userWorkflowSkills("skill_list", { category: "diagnosis" });
  assert(catList.total >= 2, "T10.4 diagnosis category filter");

  const get = userWorkflowSkills("skill_get", { skill_id: "tool-select" });
  assert(get.id === "tool-select", "T10.5 get returns correct skill");
  assert(get.steps.length === 3, "T10.6 has steps");
}

// ─── T11: Dispatcher — search, match, steps, persona ───────────────────────

console.log("\nT11: Dispatcher — search, match, steps, persona");
{
  const search = userWorkflowSkills("skill_search", { query: "fixture" });
  assert(search.total >= 1, "T11.1 search finds fixture");

  const match = userWorkflowSkills("skill_match", { query: "what speed for aluminum?" });
  assert(match.matched === true, "T11.2 match found");
  assert(match.skill_id === "speed-feed-wizard", "T11.3 correct skill matched");

  const steps = userWorkflowSkills("skill_steps", { skill_id: "material-guide" });
  assert(steps.steps.length === 3, "T11.4 steps returned");

  const persona = userWorkflowSkills("skill_for_persona", { skill_id: "troubleshoot", persona: "machinist" });
  assert(persona.detail_level === "standard", "T11.5 persona detail level");
  assert(persona.focus.includes("machine"), "T11.6 persona focus");
}

// ─── T12: Edge cases ──────────────────────────────────────────────────────

console.log("\nT12: Edge cases");
{
  // Not found
  const get = userWorkflowSkills("skill_get", { skill_id: "nonexistent" });
  assert(get.error !== undefined, "T12.1 not found returns error");

  // No match
  const match = userWorkflowSkills("skill_match", { query: "hello world weather forecast" });
  assert(match.matched === false, "T12.2 no match for irrelevant query");

  // Missing persona skill
  const persona = userWorkflowSkills("skill_for_persona", { skill_id: "nonexistent", persona: "machinist" });
  assert(persona.error !== undefined, "T12.3 missing skill returns error");

  // Unknown action
  let threw = false;
  try {
    userWorkflowSkills("bad_action", {});
  } catch {
    threw = true;
  }
  assert(threw, "T12.4 unknown action throws");

  // Empty search
  const empty = userWorkflowSkills("skill_search", { query: "zzzzz_no_match" });
  assert(empty.total === 0, "T12.5 empty search returns 0");
}

// ─── Summary ────────────────────────────────────────────────────────────────

console.log("\n" + "=".repeat(60));
console.log(`R8-MS6 UserWorkflowSkillsEngine: ${passed}/${total} passed, ${failed} failed`);
console.log("=".repeat(60));

if (failed > 0) process.exit(1);
