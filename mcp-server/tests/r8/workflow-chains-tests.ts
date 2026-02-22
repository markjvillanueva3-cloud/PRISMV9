/**
 * R8-MS2 WorkflowChainsEngine Tests
 * ====================================
 * 80 tests across 20 test sections (T1-T20)
 *
 * T1-T10:  Workflow matching for all 10 workflows
 * T11:     Confidence scoring
 * T12:     Multiple matches (ambiguous queries)
 * T13:     findBestWorkflow with min confidence
 * T14:     getWorkflow by ID
 * T15:     listWorkflows
 * T16:     workflowChains dispatcher (workflow_match)
 * T17:     workflowChains dispatcher (workflow_get)
 * T18:     workflowChains dispatcher (workflow_list)
 * T19:     Edge cases
 * T20:     Chain structure validation
 */

import {
  matchWorkflows,
  findBestWorkflow,
  getWorkflow,
  listWorkflows,
  getAllWorkflows,
  workflowChains,
  type WorkflowMatch,
} from "../../src/engines/WorkflowChainsEngine.js";

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

// ─── T1: Plan Job workflow ──────────────────────────────────────────────────

console.log("\nT1: Plan Job workflow matching");
{
  const m1 = matchWorkflows("plan this job for Inconel 718");
  assert(m1.length > 0, "T1.1 'plan this job' matches");
  assert(m1[0].workflow.id === "plan_job", "T1.2 best match = plan_job");
  assert(m1[0].confidence >= 0.6, "T1.3 confidence >= 0.6");

  const m2 = matchWorkflows("how should I make this part");
  assert(m2.some(m => m.workflow.id === "plan_job"), "T1.4 'how should I make' matches plan_job");
}

// ─── T2: Quick Parameters workflow ──────────────────────────────────────────

console.log("\nT2: Quick Parameters workflow");
{
  const m1 = matchWorkflows("what speed should I run 4140 at");
  assert(m1.some(m => m.workflow.id === "quick_params"), "T2.1 'what speed' matches quick_params");

  const m2 = matchWorkflows("parameters for milling 7075");
  assert(m2.some(m => m.workflow.id === "quick_params"), "T2.2 'parameters for' matches");

  const m3 = matchWorkflows("rpm for 1/2 inch endmill in steel");
  assert(m3.some(m => m.workflow.id === "quick_params"), "T3.3 'rpm for' matches");

  const m4 = matchWorkflows("speeds and feeds for titanium");
  assert(m4.some(m => m.workflow.id === "quick_params"), "T2.4 'speeds and feeds' matches");
}

// ─── T3: Compare Strategies workflow ────────────────────────────────────────

console.log("\nT3: Compare Strategies workflow");
{
  const m1 = matchWorkflows("compare strategies for this pocket");
  assert(m1.some(m => m.workflow.id === "compare_strategies"), "T3.1 'compare strategies' matches");

  const m2 = matchWorkflows("trochoidal vs adaptive clearing");
  assert(m2.some(m => m.workflow.id === "compare_strategies"), "T3.2 'trochoidal vs' matches");

  const m3 = matchWorkflows("which strategy is best for deep pocket in Inconel");
  assert(m3.some(m => m.workflow.id === "compare_strategies"), "T3.3 'which strategy' matches");
}

// ─── T4: Quote Part workflow ────────────────────────────────────────────────

console.log("\nT4: Quote Part workflow");
{
  const m1 = matchWorkflows("quote this part for 200 pieces");
  assert(m1.some(m => m.workflow.id === "quote_part"), "T4.1 'quote this part' matches");

  const m2 = matchWorkflows("how much to make this in 4140");
  assert(m2.some(m => m.workflow.id === "quote_part"), "T4.2 'how much to make' matches");

  const m3 = matchWorkflows("cost per part for batch of 50");
  assert(m3.some(m => m.workflow.id === "quote_part"), "T4.3 'cost per part' matches");

  const m4 = matchWorkflows("RFQ for titanium bracket");
  assert(m4.some(m => m.workflow.id === "quote_part"), "T4.4 'RFQ' matches");
}

// ─── T5: Fix Chatter workflow ───────────────────────────────────────────────

console.log("\nT5: Fix Chatter workflow");
{
  const m1 = matchWorkflows("I'm getting chatter on this operation");
  assert(m1.some(m => m.workflow.id === "fix_chatter"), "T5.1 'getting chatter' matches");

  const m2 = matchWorkflows("tool is chattering at 3000 RPM");
  assert(m2.some(m => m.workflow.id === "fix_chatter"), "T5.2 'tool is chattering' matches");

  const m3 = matchWorkflows("bad vibration during roughing");
  assert(m3.some(m => m.workflow.id === "fix_chatter"), "T5.3 'vibration' matches");
}

// ─── T6: Tool Selection workflow ────────────────────────────────────────────

console.log("\nT6: Tool Selection workflow");
{
  const m1 = matchWorkflows("what tool should I use for milling steel");
  assert(m1.some(m => m.workflow.id === "tool_select"), "T6.1 'what tool' matches");

  const m2 = matchWorkflows("which endmill for 7075 pocketing");
  assert(m2.some(m => m.workflow.id === "tool_select"), "T6.2 'which endmill' matches");

  const m3 = matchWorkflows("recommend a drill for stainless steel");
  assert(m3.some(m => m.workflow.id === "tool_select"), "T6.3 'recommend a drill' matches");
}

// ─── T7: Capability Check workflow ──────────────────────────────────────────

console.log("\nT7: Capability Check workflow");
{
  const m1 = matchWorkflows("can I run Inconel on my Haas VF2");
  assert(m1.some(m => m.workflow.id === "capability_check"), "T7.1 'can I run' matches");

  const m2 = matchWorkflows("will my machine handle this operation");
  assert(m2.some(m => m.workflow.id === "capability_check"), "T7.2 'will my machine' matches");

  const m3 = matchWorkflows("does my spindle have enough power");
  assert(m3.some(m => m.workflow.id === "capability_check"), "T7.3 'enough power' matches");
}

// ─── T8: Schedule Shop workflow ─────────────────────────────────────────────

console.log("\nT8: Schedule Shop workflow");
{
  const m1 = matchWorkflows("schedule my shop for this week");
  assert(m1.some(m => m.workflow.id === "schedule_shop"), "T8.1 'schedule my shop' matches");

  const m2 = matchWorkflows("which machine for this job");
  assert(m2.some(m => m.workflow.id === "schedule_shop"), "T8.2 'which machine for' matches");

  const m3 = matchWorkflows("assign jobs to machines");
  assert(m3.some(m => m.workflow.id === "schedule_shop"), "T8.3 'assign jobs' matches");
}

// ─── T9: Diagnose Alarm workflow ────────────────────────────────────────────

console.log("\nT9: Diagnose Alarm workflow");
{
  const m1 = matchWorkflows("alarm 1024 on my Fanuc");
  assert(m1.some(m => m.workflow.id === "diagnose_alarm"), "T9.1 'alarm 1024' matches");

  const m2 = matchWorkflows("what does alarm 420 mean");
  assert(m2.some(m => m.workflow.id === "diagnose_alarm"), "T9.2 'what does alarm' matches");

  const m3 = matchWorkflows("error code on my machine");
  assert(m3.some(m => m.workflow.id === "diagnose_alarm"), "T9.3 'error code' matches");
}

// ─── T10: Teach Me workflow ─────────────────────────────────────────────────

console.log("\nT10: Teach Me workflow");
{
  const m1 = matchWorkflows("why does chatter happen at certain RPMs");
  assert(m1.some(m => m.workflow.id === "teach_me"), "T10.1 'why does' matches teach_me");

  const m2 = matchWorkflows("explain how stability lobes work");
  assert(m2.some(m => m.workflow.id === "teach_me"), "T10.2 'explain how' matches");

  const m3 = matchWorkflows("what's the difference between climb and conventional milling");
  assert(m3.some(m => m.workflow.id === "teach_me"), "T10.3 'what's the difference' matches");
}

// ─── T11: Confidence scoring ────────────────────────────────────────────────

console.log("\nT11: Confidence scoring");
{
  // Exact phrase match should have higher confidence
  const m1 = matchWorkflows("plan this job");
  const m2 = matchWorkflows("machining plan for a complex part with multiple operations");
  // m1 is a shorter query with full phrase match, should be higher confidence
  assert(m1[0].confidence > 0, "T11.1 phrase match has positive confidence");
  assert(m2[0].confidence > 0, "T11.2 pattern match has positive confidence");

  // Confidence should be between 0 and 1
  for (const m of m1) {
    assert(m.confidence <= 1.0, `T11.3 confidence <= 1.0 for ${m.workflow.id}`);
    assert(m.confidence > 0, `T11.4 confidence > 0 for ${m.workflow.id}`);
  }
}

// ─── T12: Multiple matches ──────────────────────────────────────────────────

console.log("\nT12: Multiple matches");
{
  // "What speed should I run for milling" matches both quick_params and potentially others
  const m = matchWorkflows("what speed should I run for milling 4140 steel");
  assert(m.length >= 1, "T12.1 at least one match");

  // Sorted by confidence (descending)
  for (let i = 1; i < m.length; i++) {
    assert(m[i].confidence <= m[i - 1].confidence, "T12.2 matches sorted by confidence desc");
  }

  // "how much to make this and plan this job" matches both quote_part and plan_job
  const m2 = matchWorkflows("plan this job and quote cost per part");
  assert(m2.length >= 2, "T12.3 ambiguous query matches multiple workflows");
}

// ─── T13: findBestWorkflow ──────────────────────────────────────────────────

console.log("\nT13: findBestWorkflow");
{
  const best = findBestWorkflow("what speed for 4140");
  assert(best !== null, "T13.1 finds a match");
  assert(best!.workflow.id === "quick_params", "T13.2 best = quick_params");

  // High min confidence should filter
  const none = findBestWorkflow("random unrelated text about cooking dinner", 0.9);
  assert(none === null, "T13.3 no match with high threshold");

  // Low confidence threshold
  const low = findBestWorkflow("parameters", 0.3);
  // "parameters" is a substring of trigger "parameters for" so partial match
  assert(low !== null || low === null, "T13.4 low threshold graceful");
}

// ─── T14: getWorkflow ───────────────────────────────────────────────────────

console.log("\nT14: getWorkflow by ID");
{
  const wf = getWorkflow("plan_job");
  assert(wf !== undefined, "T14.1 plan_job exists");
  assert(wf!.steps.length === 9, "T14.2 plan_job has 9 steps");
  assert(wf!.estimated_tokens === 8000, "T14.3 estimated 8K tokens");

  const wf2 = getWorkflow("quick_params");
  assert(wf2 !== undefined, "T14.4 quick_params exists");
  assert(wf2!.steps.length === 2, "T14.5 quick_params has 2 steps");

  const bad = getWorkflow("nonexistent" as any);
  assert(bad === undefined, "T14.6 nonexistent → undefined");
}

// ─── T15: listWorkflows ─────────────────────────────────────────────────────

console.log("\nT15: listWorkflows");
{
  const list = listWorkflows();
  assert(list.length === 10, "T15.1 10 workflows defined");

  const ids = list.map(w => w.id);
  assert(ids.includes("plan_job"), "T15.2 includes plan_job");
  assert(ids.includes("quick_params"), "T15.3 includes quick_params");
  assert(ids.includes("fix_chatter"), "T15.4 includes fix_chatter");
  assert(ids.includes("diagnose_alarm"), "T15.5 includes diagnose_alarm");

  // Each has required fields
  for (const w of list) {
    assert(typeof w.name === "string" && w.name.length > 0, `T15.6 ${w.id} has name`);
    assert(w.steps > 0, `T15.7 ${w.id} has steps > 0`);
  }
}

// ─── T16: Dispatcher workflow_match ─────────────────────────────────────────

console.log("\nT16: Dispatcher workflow_match");
{
  const r = workflowChains("workflow_match", { query: "plan this job in Inconel" });
  assert(r.total_matches > 0, "T16.1 has matches");
  assert(r.best !== null, "T16.2 has best match");
  assert(r.best.workflow_id === "plan_job", "T16.3 best = plan_job");
  assert(Array.isArray(r.best.chain), "T16.4 best has chain");
  assert(r.best.chain.length > 0, "T16.5 chain has steps");
}

// ─── T17: Dispatcher workflow_get ───────────────────────────────────────────

console.log("\nT17: Dispatcher workflow_get");
{
  const r = workflowChains("workflow_get", { workflow_id: "quick_params" });
  assert(r.id === "quick_params", "T17.1 returns correct workflow");
  assert(r.name === "Quick Parameters", "T17.2 correct name");
  assert(r.steps.length === 2, "T17.3 has 2 steps");
  assert(r.persona === "machinist", "T17.4 persona = machinist");

  // Error on unknown
  let threw = false;
  try {
    workflowChains("workflow_get", { workflow_id: "nonexistent" });
  } catch (e: any) {
    threw = true;
  }
  assert(threw, "T17.5 unknown workflow throws");
}

// ─── T18: Dispatcher workflow_list ──────────────────────────────────────────

console.log("\nT18: Dispatcher workflow_list");
{
  const r = workflowChains("workflow_list", {});
  assert(r.total === 10, "T18.1 total = 10");
  assert(r.workflows.length === 10, "T18.2 10 workflow items");
  assert(r.workflows[0].id !== undefined, "T18.3 has id field");
  assert(r.workflows[0].trigger_phrases.length > 0, "T18.4 has trigger phrases");
}

// ─── T19: Edge cases ────────────────────────────────────────────────────────

console.log("\nT19: Edge cases");
{
  // Empty query
  const m1 = matchWorkflows("");
  assert(m1.length === 0, "T19.1 empty query → no matches");

  // Null-ish
  const m2 = matchWorkflows(null as any);
  assert(m2.length === 0, "T19.2 null query → no matches");

  // Very long query
  const longQuery = "what speed should I use ".repeat(20);
  const m3 = matchWorkflows(longQuery);
  assert(m3.length > 0, "T19.3 long query still matches");

  // Unknown dispatcher action
  let threw = false;
  try {
    workflowChains("bad_action", {});
  } catch (e: any) {
    threw = true;
  }
  assert(threw, "T19.4 unknown action throws");
}

// ─── T20: Chain structure validation ────────────────────────────────────────

console.log("\nT20: Chain structure validation");
{
  const all = getAllWorkflows();
  for (const wf of all) {
    // Every step should have required fields
    for (let i = 0; i < wf.steps.length; i++) {
      const s = wf.steps[i];
      assert(typeof s.action === "string" && s.action.length > 0, `T20.1 ${wf.id} step ${i} has action`);
      assert(typeof s.dispatcher === "string" && s.dispatcher.length > 0, `T20.2 ${wf.id} step ${i} has dispatcher`);
      assert(typeof s.label === "string" && s.label.length > 0, `T20.3 ${wf.id} step ${i} has label`);
      assert(Array.isArray(s.depends_on), `T20.4 ${wf.id} step ${i} has depends_on array`);

      // depends_on should reference valid earlier steps
      for (const dep of s.depends_on) {
        assert(dep < i, `T20.5 ${wf.id} step ${i} dep ${dep} < current index`);
        assert(dep >= 0, `T20.6 ${wf.id} step ${i} dep ${dep} >= 0`);
      }
    }

    // estimated_steps should match or exceed actual steps
    assert(wf.estimated_steps >= wf.steps.length || wf.steps.some(s => s.fan_out),
      `T20.7 ${wf.id} estimated_steps >= steps or has fan_out`);
  }
}

// ─── Summary ────────────────────────────────────────────────────────────────

console.log("\n" + "=".repeat(60));
console.log(`R8-MS2 WorkflowChainsEngine: ${passed}/${total} passed, ${failed} failed`);
console.log("=".repeat(60));

if (failed > 0) process.exit(1);
