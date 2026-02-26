/**
 * R8-MS3 OnboardingEngine Tests
 * ===============================
 * 60 tests across 15 test sections (T1-T15)
 *
 * T1-T2:   Welcome message generation
 * T3-T5:   Progressive disclosure levels (0-4)
 * T6-T7:   Interaction tracking
 * T8-T9:   Disclosure suggestions
 * T10:     Session management (reset)
 * T11:     Common materials tracking
 * T12-T13: Dispatcher integration
 * T14:     Edge cases
 * T15:     Multi-session isolation
 */

import {
  generateWelcome,
  getDisclosureSuggestion,
  recordInteraction,
  getOnboardingState,
  resetSession,
  getCommonMaterials,
  onboardingEngine,
} from "../../src/engines/OnboardingEngine.js";

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

// Reset state before each section
function freshSession(): string {
  const id = `test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  return id;
}

// ─── T1: Welcome message (no profile) ──────────────────────────────────────

console.log("\nT1: Welcome message (no profile)");
{
  const w = generateWelcome();
  assert(typeof w.greeting === "string" && w.greeting.length > 10, "T1.1 greeting is non-empty string");
  assert(w.greeting.includes("PRISM"), "T1.2 greeting mentions PRISM");
  assert(w.suggestions.length === 3, "T1.3 has 3 example queries");
  assert(w.capabilities_hint.includes("3,500"), "T1.4 mentions material count");
  assert(w.capabilities_hint.includes("alarm"), "T1.5 mentions alarms");
}

// ─── T2: Welcome message (with profile) ────────────────────────────────────

console.log("\nT2: Welcome message (with profile)");
{
  const w = generateWelcome({ name: "Dave", role: "machinist" });
  assert(w.greeting.includes("Dave"), "T2.1 greeting includes user name");
  assert(w.suggestions.length === 3, "T2.2 still has 3 suggestions");
}

// ─── T3: Disclosure level 0 (first query) ──────────────────────────────────

console.log("\nT3: Disclosure level 0");
{
  const sid = freshSession();
  const state = getOnboardingState(sid);
  assert(state.interaction_count === 0, "T3.1 starts at 0 interactions");
  assert(state.disclosure_level === 0, "T3.2 starts at level 0");
  assert(state.has_profile === false, "T3.3 no profile");
  assert(state.first_query_answered === false, "T3.4 first query not answered");

  // No suggestion at level 0
  const suggestion = getDisclosureSuggestion(sid);
  assert(suggestion === null, "T3.5 no suggestion at level 0");
}

// ─── T4: Disclosure level 1 (after 2 queries) ──────────────────────────────

console.log("\nT4: Disclosure level 1");
{
  const sid = freshSession();
  recordInteraction(sid, { material: "4140" });
  recordInteraction(sid, { material: "7075" });
  const state = getOnboardingState(sid);
  assert(state.interaction_count === 2, "T4.1 count = 2");
  assert(state.disclosure_level === 1, "T4.2 level = 1");
  assert(state.first_query_answered === true, "T4.3 first query answered");

  const suggestion = getDisclosureSuggestion(sid);
  assert(suggestion !== null, "T4.4 has suggestion at level 1");
  assert(suggestion!.level === 1, "T4.5 suggestion level = 1");
  assert(suggestion!.is_followup === true, "T4.6 is followup");
}

// ─── T5: Disclosure levels 2, 3, 4 ─────────────────────────────────────────

console.log("\nT5: Disclosure levels 2, 3, 4");
{
  const sid = freshSession();

  // Advance to level 2 (5 interactions)
  for (let i = 0; i < 5; i++) recordInteraction(sid);
  assert(getOnboardingState(sid).disclosure_level === 2, "T5.1 level 2 at 5 interactions");

  // Advance to level 3 (10 interactions)
  for (let i = 0; i < 5; i++) recordInteraction(sid);
  assert(getOnboardingState(sid).disclosure_level === 3, "T5.2 level 3 at 10 interactions");

  // Advance to level 4 (20 interactions)
  for (let i = 0; i < 10; i++) recordInteraction(sid);
  assert(getOnboardingState(sid).disclosure_level === 4, "T5.3 level 4 at 20 interactions");

  // Level 4 stays at 4 even with more
  for (let i = 0; i < 5; i++) recordInteraction(sid);
  assert(getOnboardingState(sid).disclosure_level === 4, "T5.4 level 4 stays at 4");
}

// ─── T6: Material tracking ──────────────────────────────────────────────────

console.log("\nT6: Material tracking");
{
  const sid = freshSession();
  recordInteraction(sid, { material: "Inconel 718" });
  recordInteraction(sid, { material: "7075-T6" });
  recordInteraction(sid, { material: "Inconel 718" }); // duplicate

  const state = getOnboardingState(sid);
  assert(state.materials_seen.length === 2, "T6.1 unique materials = 2");
  assert(state.materials_seen.includes("Inconel 718"), "T6.2 includes Inconel");
  assert(state.materials_seen.includes("7075-T6"), "T6.3 includes 7075");
}

// ─── T7: Machine and operation tracking ─────────────────────────────────────

console.log("\nT7: Machine and operation tracking");
{
  const sid = freshSession();
  recordInteraction(sid, { machine: "DMU 50", operation: "pocket_roughing" });
  recordInteraction(sid, { machine: "Haas VF2", operation: "drilling" });
  recordInteraction(sid, { machine: "DMU 50" }); // duplicate machine

  const state = getOnboardingState(sid);
  assert(state.machines_seen.length === 2, "T7.1 unique machines = 2");
  assert(state.operations_seen.length === 2, "T7.2 unique operations = 2");
}

// ─── T8: Suggestion rotation ───────────────────────────────────────────────

console.log("\nT8: Suggestion rotation");
{
  const sid = freshSession();
  // Get to level 1
  recordInteraction(sid);
  recordInteraction(sid);

  const s1 = getDisclosureSuggestion(sid);
  recordInteraction(sid); // count=3, still level 1
  const s2 = getDisclosureSuggestion(sid);

  assert(s1 !== null, "T8.1 first suggestion exists");
  assert(s2 !== null, "T8.2 second suggestion exists");
  // They may or may not be different depending on rotation
  assert(typeof s1!.message === "string", "T8.3 message is string");
  assert(typeof s2!.message === "string", "T8.4 message is string");
}

// ─── T9: Level-appropriate suggestions ──────────────────────────────────────

console.log("\nT9: Level-appropriate suggestions");
{
  // Level 2 mentions optimization
  const sid2 = freshSession();
  for (let i = 0; i < 5; i++) recordInteraction(sid2);
  const s2 = getDisclosureSuggestion(sid2);
  assert(s2 !== null && s2.level === 2, "T9.1 level 2 suggestion");

  // Level 3 mentions shop profile
  const sid3 = freshSession();
  for (let i = 0; i < 10; i++) recordInteraction(sid3);
  const s3 = getDisclosureSuggestion(sid3);
  assert(s3 !== null && s3.level === 3, "T9.2 level 3 suggestion");

  // Level 4 mentions outcome tracking
  const sid4 = freshSession();
  for (let i = 0; i < 20; i++) recordInteraction(sid4);
  const s4 = getDisclosureSuggestion(sid4);
  assert(s4 !== null && s4.level === 4, "T9.3 level 4 suggestion");
}

// ─── T10: Session reset ─────────────────────────────────────────────────────

console.log("\nT10: Session reset");
{
  const sid = freshSession();
  recordInteraction(sid, { material: "Steel" });
  recordInteraction(sid, { material: "Aluminum" });
  assert(getOnboardingState(sid).interaction_count === 2, "T10.1 count = 2 before reset");

  resetSession(sid);
  const state = getOnboardingState(sid);
  assert(state.interaction_count === 0, "T10.2 count = 0 after reset");
  assert(state.disclosure_level === 0, "T10.3 level = 0 after reset");
  assert(state.materials_seen.length === 0, "T10.4 materials cleared");
}

// ─── T11: Common materials helper ───────────────────────────────────────────

console.log("\nT11: Common materials helper");
{
  const sid = freshSession();
  recordInteraction(sid, { material: "4140" });
  recordInteraction(sid, { material: "316SS" });
  recordInteraction(sid, { material: "Ti-6Al-4V" });

  const materials = getCommonMaterials(sid);
  assert(materials.length === 3, "T11.1 3 common materials");
  assert(materials.includes("4140"), "T11.2 includes 4140");
  assert(materials.includes("Ti-6Al-4V"), "T11.3 includes Ti");
}

// ─── T12: Dispatcher — onboarding_welcome ───────────────────────────────────

console.log("\nT12: Dispatcher — onboarding_welcome");
{
  const r = onboardingEngine("onboarding_welcome", {});
  assert(typeof r.greeting === "string", "T12.1 has greeting");
  assert(typeof r.full_message === "string", "T12.2 has full_message");
  assert(r.full_message.includes("PRISM"), "T12.3 full_message mentions PRISM");
  assert(r.suggestions.length === 3, "T12.4 has 3 suggestions");
}

// ─── T13: Dispatcher — onboarding_record & state ────────────────────────────

console.log("\nT13: Dispatcher — record & state");
{
  const sid = `dispatch-test-${Date.now()}`;

  // Record
  const r1 = onboardingEngine("onboarding_record", {
    session_id: sid,
    material: "Inconel 718",
    operation: "milling",
  });
  assert(r1.interaction_count === 1, "T13.1 count = 1 after record");
  assert(r1.disclosure_level === 0, "T13.2 level 0 after 1 interaction");

  // Record more to get suggestions
  onboardingEngine("onboarding_record", { session_id: sid });
  const r3 = onboardingEngine("onboarding_record", { session_id: sid });
  assert(r3.interaction_count === 3, "T13.3 count = 3");
  assert(r3.disclosure_level === 1, "T13.4 level 1 at 3 interactions");

  // State
  const s = onboardingEngine("onboarding_state", { session_id: sid });
  assert(s.interaction_count === 3, "T13.5 state matches");

  // Suggestion
  const sg = onboardingEngine("onboarding_suggestion", { session_id: sid });
  assert(sg.level === 1, "T13.6 suggestion level = 1");
  assert(typeof sg.message === "string", "T13.7 has suggestion message");

  // Reset
  const rr = onboardingEngine("onboarding_reset", { session_id: sid });
  assert(rr.reset === true, "T13.8 reset confirmed");
  const s2 = onboardingEngine("onboarding_state", { session_id: sid });
  assert(s2.interaction_count === 0, "T13.9 count = 0 after reset");
}

// ─── T14: Edge cases ────────────────────────────────────────────────────────

console.log("\nT14: Edge cases");
{
  // Unknown action
  let threw = false;
  try {
    onboardingEngine("bad_action", {});
  } catch (e: any) {
    threw = true;
  }
  assert(threw, "T14.1 unknown action throws");

  // Default session_id
  const r = onboardingEngine("onboarding_state", {});
  assert(typeof r.interaction_count === "number", "T14.2 default session works");

  // Record with no context
  const sid = freshSession();
  const r2 = recordInteraction(sid);
  assert(r2.interaction_count === 1, "T14.3 record with no context works");
  assert(r2.materials_seen.length === 0, "T14.4 no materials tracked");
}

// ─── T15: Multi-session isolation ───────────────────────────────────────────

console.log("\nT15: Multi-session isolation");
{
  const sid1 = freshSession();
  const sid2 = freshSession();

  recordInteraction(sid1, { material: "Steel" });
  recordInteraction(sid1, { material: "Aluminum" });
  recordInteraction(sid2, { material: "Titanium" });

  assert(getOnboardingState(sid1).interaction_count === 2, "T15.1 session 1 count = 2");
  assert(getOnboardingState(sid2).interaction_count === 1, "T15.2 session 2 count = 1");
  assert(getOnboardingState(sid1).materials_seen.length === 2, "T15.3 session 1 materials = 2");
  assert(getOnboardingState(sid2).materials_seen.length === 1, "T15.4 session 2 materials = 1");

  // Reset one doesn't affect other
  resetSession(sid1);
  assert(getOnboardingState(sid1).interaction_count === 0, "T15.5 session 1 reset");
  assert(getOnboardingState(sid2).interaction_count === 1, "T15.6 session 2 unaffected");
}

// ─── Summary ────────────────────────────────────────────────────────────────

console.log("\n" + "=".repeat(60));
console.log(`R8-MS3 OnboardingEngine: ${passed}/${total} passed, ${failed} failed`);
console.log("=".repeat(60));

if (failed > 0) process.exit(1);
