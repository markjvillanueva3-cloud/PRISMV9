/**
 * R8-MS5 ConversationalMemoryEngine Tests
 * =========================================
 * 65 tests across 13 test sections (T1-T13)
 *
 * T1-T2:   State machine basics
 * T3-T4:   State transitions (auto-detect and manual)
 * T5-T6:   Job context creation and updates
 * T7:      Job search and resume
 * T8:      Job completion
 * T9:      Response style per state
 * T10:     Recent jobs list
 * T11-T12: Dispatcher integration
 * T13:     Edge cases & session isolation
 */

import {
  conversationalMemory,
  detectTransition,
  transitionState,
  startJob,
  updateJob,
  findJob,
  resumeJob,
  getActiveJob,
  getConversationContext,
  getRecentJobs,
  completeJob,
  resetConversation,
} from "../../src/engines/ConversationalMemoryEngine.js";

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

function freshSession(): string {
  const id = `test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  return id;
}

// ─── T1: Initial state ────────────────────────────────────────────────────

console.log("\nT1: Initial state");
{
  const sid = freshSession();
  const ctx = getConversationContext(sid);
  assert(ctx.current_state === "idle", "T1.1 starts idle");
  assert(ctx.active_job === null, "T1.2 no active job");
  assert(ctx.recent_jobs.length === 0, "T1.3 no recent jobs");
  assert(ctx.response_style.verbosity === "normal", "T1.4 normal verbosity");
  assert(ctx.response_style.focus === "general", "T1.5 general focus");
}

// ─── T2: State values ────────────────────────────────────────────────────

console.log("\nT2: State values");
{
  const sid = freshSession();
  // Start a job to get to exploring
  startJob(sid, { material: "Steel" });
  const ctx = getConversationContext(sid);
  assert(ctx.current_state === "exploring", "T2.1 exploring after job start");

  // Transition to planning
  transitionState(sid, "planning");
  assert(getConversationContext(sid).current_state === "planning", "T2.2 planning state");

  // Transition to executing
  transitionState(sid, "executing");
  assert(getConversationContext(sid).current_state === "executing", "T2.3 executing state");

  // Transition to reviewing
  transitionState(sid, "reviewing");
  assert(getConversationContext(sid).current_state === "reviewing", "T2.4 reviewing state");

  // Back to idle
  transitionState(sid, "idle");
  assert(getConversationContext(sid).current_state === "idle", "T2.5 idle state");
}

// ─── T3: Auto-detect transitions ────────────────────────────────────────

console.log("\nT3: Auto-detect transitions");
{
  // idle → exploring
  assert(detectTransition("idle", "what speed for aluminum?") === "exploring", "T3.1 idle→exploring on question");
  assert(detectTransition("idle", "how do I machine titanium?") === "exploring", "T3.2 idle→exploring on how");

  // exploring → planning
  assert(detectTransition("exploring", "let's go with this material for my job") === "planning", "T3.3 exploring→planning");
  assert(detectTransition("exploring", "I'm going to use this part") === "planning", "T3.4 exploring→planning on commit");

  // planning → executing
  assert(detectTransition("planning", "I'm running it now") === "executing", "T3.5 planning→executing");
  assert(detectTransition("planning", "at the machine, starting now") === "executing", "T3.6 planning→executing");

  // executing → reviewing
  assert(detectTransition("executing", "just finished the part") === "reviewing", "T3.7 executing→reviewing");
  assert(detectTransition("executing", "surface finish was rough") === "reviewing", "T3.8 executing→reviewing");

  // reviewing → idle
  assert(detectTransition("reviewing", "new job coming up") === "idle", "T3.9 reviewing→idle");
}

// ─── T4: No-transition cases ────────────────────────────────────────────

console.log("\nT4: No-transition cases");
{
  // Random text shouldn't transition
  assert(detectTransition("idle", "hello there") === null, "T4.1 no transition on greeting");
  assert(detectTransition("exploring", "this looks interesting") === null, "T4.2 no transition on neutral");
  assert(detectTransition("executing", "checking temperature") === null, "T4.3 no transition during executing");
}

// ─── T5: Job context creation ───────────────────────────────────────────

console.log("\nT5: Job context creation");
{
  const sid = freshSession();
  const job = startJob(sid, {
    material: "Inconel 718",
    machine: "DMU 50",
    part_description: "Turbine blade",
  });
  assert(job.id.startsWith("JOB-"), "T5.1 job ID format");
  assert(job.material === "Inconel 718", "T5.2 material set");
  assert(job.machine === "DMU 50", "T5.3 machine set");
  assert(job.part_description === "Turbine blade", "T5.4 part description");
  assert(job.state === "exploring", "T5.5 initial job state");
  assert(job.tools.length === 0, "T5.6 empty tools");
  assert(job.operations.length === 0, "T5.7 empty operations");

  // Active job should be set
  const active = getActiveJob(sid);
  assert(active !== null, "T5.8 has active job");
  assert(active!.id === job.id, "T5.9 active job matches");
}

// ─── T6: Job updates ───────────────────────────────────────────────────

console.log("\nT6: Job updates");
{
  const sid = freshSession();
  startJob(sid, { material: "7075-T6" });

  // Add tool
  updateJob(sid, { tool: "1/2 inch carbide endmill" });
  let job = getActiveJob(sid)!;
  assert(job.tools.length === 1, "T6.1 tool added");
  assert(job.tools[0] === "1/2 inch carbide endmill", "T6.2 correct tool");

  // Add duplicate tool (should not duplicate)
  updateJob(sid, { tool: "1/2 inch carbide endmill" });
  job = getActiveJob(sid)!;
  assert(job.tools.length === 1, "T6.3 no duplicate tool");

  // Add operation
  updateJob(sid, { operation: { type: "roughing", parameters: { Vc: 200 } } });
  job = getActiveJob(sid)!;
  assert(job.operations.length === 1, "T6.4 operation added");

  // Add issue
  updateJob(sid, { issue: "Chatter detected at 8000 RPM" });
  job = getActiveJob(sid)!;
  assert(job.issues.length === 1, "T6.5 issue added");

  // Add note
  updateJob(sid, { note: "Customer wants Ra < 1.6" });
  job = getActiveJob(sid)!;
  assert(job.notes.length === 1, "T6.6 note added");

  // Add recommendation
  updateJob(sid, { recommendation: { action: "speed_feed", result_summary: "Vc=200" } });
  job = getActiveJob(sid)!;
  assert(job.recommendations.length === 1, "T6.7 recommendation tracked");

  // Update material
  updateJob(sid, { material: "6061-T6" });
  job = getActiveJob(sid)!;
  assert(job.material === "6061-T6", "T6.8 material updated");
}

// ─── T7: Job search and resume ──────────────────────────────────────────

console.log("\nT7: Job search and resume");
{
  const sid = freshSession();
  const job = startJob(sid, { material: "Ti-6Al-4V", part_description: "bracket" });

  // Find by material
  const found = findJob("Ti-6Al");
  assert(found !== null, "T7.1 found by material");
  assert(found!.material === "Ti-6Al-4V", "T7.2 correct material");

  // Find by part description
  const found2 = findJob("bracket");
  assert(found2 !== null, "T7.3 found by part description");

  // Not found
  const notFound = findJob("nonexistent-xyzzy-42");
  assert(notFound === null, "T7.4 not found returns null");

  // Complete the job and resume it
  completeJob(sid);
  const sid2 = freshSession();
  const resumed = resumeJob(sid2, job.id);
  assert(resumed !== null, "T7.5 resumed successfully");
  assert(resumed!.material === "Ti-6Al-4V", "T7.6 resumed material correct");
}

// ─── T8: Job completion ────────────────────────────────────────────────

console.log("\nT8: Job completion");
{
  const sid = freshSession();
  startJob(sid, { material: "4140" });
  updateJob(sid, { tool: "Drill 8mm" });

  const completed = completeJob(sid);
  assert(completed !== null, "T8.1 completion returns job");
  assert(completed!.material === "4140", "T8.2 material preserved");
  assert(completed!.tools.length === 1, "T8.3 tools preserved");

  // No active job after completion
  const active = getActiveJob(sid);
  assert(active === null, "T8.4 no active job after complete");

  // State back to idle
  const ctx = getConversationContext(sid);
  assert(ctx.current_state === "idle", "T8.5 idle after complete");
}

// ─── T9: Response style per state ──────────────────────────────────────

console.log("\nT9: Response style per state");
{
  const sid = freshSession();

  // Idle
  let style = getConversationContext(sid).response_style;
  assert(style.verbosity === "normal", "T9.1 idle → normal verbosity");

  // Exploring
  startJob(sid);
  style = getConversationContext(sid).response_style;
  assert(style.verbosity === "detailed", "T9.2 exploring → detailed");
  assert(style.include_alternatives === true, "T9.3 exploring → alternatives");

  // Planning
  transitionState(sid, "planning");
  style = getConversationContext(sid).response_style;
  assert(style.verbosity === "detailed", "T9.4 planning → detailed");
  assert(style.focus === "productivity", "T9.5 planning → productivity focus");
  assert(style.include_alternatives === false, "T9.6 planning → no alternatives");

  // Executing
  transitionState(sid, "executing");
  style = getConversationContext(sid).response_style;
  assert(style.verbosity === "terse", "T9.7 executing → terse");
  assert(style.focus === "safety", "T9.8 executing → safety focus");

  // Reviewing
  transitionState(sid, "reviewing");
  style = getConversationContext(sid).response_style;
  assert(style.focus === "quality", "T9.9 reviewing → quality focus");
  assert(style.include_alternatives === true, "T9.10 reviewing → alternatives");
}

// ─── T10: Recent jobs list ─────────────────────────────────────────────

console.log("\nT10: Recent jobs list");
{
  const sid = freshSession();
  startJob(sid, { material: "Steel" });
  completeJob(sid);
  startJob(sid, { material: "Aluminum" });
  completeJob(sid);
  startJob(sid, { material: "Titanium" });

  const recent = getRecentJobs(sid);
  assert(recent.length === 3, "T10.1 3 recent jobs");
  assert(recent[0].material === "Titanium", "T10.2 most recent first");
  assert(recent[2].material === "Steel", "T10.3 oldest last");
}

// ─── T11: Dispatcher — context & transition ────────────────────────────

console.log("\nT11: Dispatcher — context & transition");
{
  const sid = `disp-${Date.now()}`;

  // Get context
  const ctx = conversationalMemory("conversation_context", { session_id: sid });
  assert(ctx.current_state === "idle", "T11.1 initial idle");

  // Start job via dispatcher
  const job = conversationalMemory("job_start", {
    session_id: sid,
    material: "316SS",
    machine: "Haas VF2",
  });
  assert(job.material === "316SS", "T11.2 job material");

  // Auto-detect transition
  const t1 = conversationalMemory("conversation_transition", {
    session_id: sid,
    message: "let's go with this material for my part",
  });
  assert(t1.transition_detected === true, "T11.3 transition detected");
  assert(t1.current_state === "planning", "T11.4 now planning");

  // Force transition
  const t2 = conversationalMemory("conversation_transition", {
    session_id: sid,
    target_state: "executing",
  });
  assert(t2.current_state === "executing", "T11.5 forced to executing");
}

// ─── T12: Dispatcher — job operations ──────────────────────────────────

console.log("\nT12: Dispatcher — job operations");
{
  const sid = `disp2-${Date.now()}`;

  // Start + update
  conversationalMemory("job_start", { session_id: sid, material: "Inconel 718" });
  const updated = conversationalMemory("job_update", {
    session_id: sid,
    tool: "Ball nose 6mm",
    note: "Tight tolerance feature",
  });
  assert(updated.tools.length === 1, "T12.1 tool added via dispatcher");

  // Find
  const found = conversationalMemory("job_find", { query: "Inconel" });
  assert(found.id !== undefined, "T12.2 found via dispatcher");

  // Complete
  const completed = conversationalMemory("job_complete", { session_id: sid });
  assert(completed.material === "Inconel 718", "T12.3 completed via dispatcher");

  // List recent
  const recent = conversationalMemory("job_list_recent", { session_id: sid });
  assert(recent.recent.length >= 1, "T12.4 recent list via dispatcher");

  // Resume
  const job = conversationalMemory("job_start", { session_id: sid, material: "Test" });
  conversationalMemory("job_complete", { session_id: sid });
  const resumed = conversationalMemory("job_resume", { session_id: sid, job_id: job.id });
  assert(resumed.id === job.id, "T12.5 resume via dispatcher");
}

// ─── T13: Edge cases & session isolation ────────────────────────────────

console.log("\nT13: Edge cases & session isolation");
{
  // Session isolation
  const sid1 = freshSession();
  const sid2 = freshSession();
  startJob(sid1, { material: "Steel" });
  startJob(sid2, { material: "Aluminum" });

  assert(getActiveJob(sid1)!.material === "Steel", "T13.1 session 1 has Steel");
  assert(getActiveJob(sid2)!.material === "Aluminum", "T13.2 session 2 has Aluminum");

  // Reset one doesn't affect other
  resetConversation(sid1);
  assert(getActiveJob(sid1) === null, "T13.3 session 1 reset");
  assert(getActiveJob(sid2)!.material === "Aluminum", "T13.4 session 2 unaffected");

  // Update with no active job returns null
  const sid3 = freshSession();
  const result = updateJob(sid3, { material: "Nothing" });
  assert(result === null, "T13.5 update with no job returns null");

  // Complete with no active job returns null
  const result2 = completeJob(sid3);
  assert(result2 === null, "T13.6 complete with no job returns null");

  // Unknown action throws
  let threw = false;
  try {
    conversationalMemory("bad_action", {});
  } catch {
    threw = true;
  }
  assert(threw, "T13.7 unknown action throws");

  // Default session works
  const ctx = conversationalMemory("conversation_context", {});
  assert(typeof ctx.current_state === "string", "T13.8 default session works");
}

// ─── Summary ────────────────────────────────────────────────────────────────

console.log("\n" + "=".repeat(60));
console.log(`R8-MS5 ConversationalMemoryEngine: ${passed}/${total} passed, ${failed} failed`);
console.log("=".repeat(60));

if (failed > 0) process.exit(1);
