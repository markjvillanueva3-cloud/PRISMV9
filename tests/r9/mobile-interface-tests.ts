/**
 * R9-MS3 Mobile Interface Engine Tests
 * ======================================
 * Validates: quick lookup, voice query, alarm decode, tool life timers,
 * offline cache, mobile display formatting.
 */

import {
  mobileInterface, quickLookup, processVoiceQuery, decodeAlarm,
  startToolTimer, checkToolTimer, resetToolTimer, listToolTimers,
  generateOfflineCache,
} from "../../src/engines/MobileInterfaceEngine.js";

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) { passed++; }
  else { failed++; console.error(`  FAIL: ${msg}`); }
}

// ─── T1: mobile_lookup — basic quick lookup ─────────────────────────────────
console.log("T1: mobile_lookup — aluminum roughing");
{
  const r = mobileInterface("mobile_lookup", {
    material: "aluminum",
    tool_diameter_mm: 10,
    operation: "roughing",
  });
  assert(r.rpm > 12000, "T1.1 aluminum rpm > 12000");
  assert(r.feed_mmmin > 0, "T1.2 feed > 0");
  assert(r.feed_ipm > 0, "T1.3 feed_ipm > 0");
  assert(r.doc_mm > 0, "T1.4 doc > 0");
  assert(r.display.primary.includes("RPM"), "T1.5 display primary has RPM");
  assert(r.display.secondary.includes("IPM"), "T1.6 display secondary has IPM");
  assert(r.display.font_size === "xlarge", "T1.7 xlarge font");
  assert(r.display.status_color === "green", "T1.8 green status");
}

// ─── T2: mobile_lookup — stainless finishing ────────────────────────────────
console.log("T2: mobile_lookup — stainless finishing");
{
  const r = mobileInterface("mobile_lookup", {
    material: "stainless",
    tool_diameter_mm: 8,
    operation: "finishing",
  });
  assert(r.rpm > 0, "T2.1 rpm > 0");
  assert(r.operation === "finishing", "T2.2 operation echoed");
  assert(r.display.safety_indicator === "SAFE" || r.display.safety_indicator === "REVIEW", "T2.3 has safety indicator");
}

// ─── T3: mobile_voice — voice query parsing ─────────────────────────────────
console.log("T3: mobile_voice — aluminum half inch");
{
  const r = mobileInterface("mobile_voice", {
    query: "What speed for aluminum with a half inch rougher?"
  });
  assert(r.interpreted.includes("aluminum"), "T3.1 interpreted aluminum");
  assert(r.confidence > 0.7, "T3.2 confidence > 0.7");
  assert(r.parameters !== null, "T3.3 has parameters");
  assert(r.parameters!.rpm > 0, "T3.4 parameters have rpm");
  assert(r.spoken_response.includes("RPM"), "T3.5 spoken response has RPM");
}

// ─── T4: mobile_voice — stainless steel ─────────────────────────────────────
console.log("T4: mobile_voice — 316 stainless");
{
  const r = mobileInterface("mobile_voice", {
    query: "Hey PRISM, what speed for 316 stainless with a three-quarter rougher?"
  });
  assert(r.interpreted.includes("stainless"), "T4.1 interpreted stainless");
  assert(r.confidence > 0.8, "T4.2 high confidence");
  assert(r.parameters!.rpm > 0, "T4.3 has rpm");
}

// ─── T5: mobile_voice — titanium with mm ────────────────────────────────────
console.log("T5: mobile_voice — titanium 10mm");
{
  const r = mobileInterface("mobile_voice", {
    query: "Speed for titanium with a 10mm end mill finishing"
  });
  assert(r.interpreted.includes("titanium"), "T5.1 interpreted titanium");
  assert(r.interpreted.includes("finishing"), "T5.2 interpreted finishing");
}

// ─── T6: mobile_alarm — known alarm code ────────────────────────────────────
console.log("T6: mobile_alarm — known alarm");
{
  const r = mobileInterface("mobile_alarm", { code: "200" });
  assert(r.plain_english.toLowerCase().includes("spindle"), "T6.1 spindle in description");
  assert(r.severity === "critical", "T6.2 critical severity");
  assert(r.fix_steps.length >= 2, "T6.3 has fix steps");
  assert(r.estimated_downtime_min > 0, "T6.4 has downtime estimate");
  assert(r.color === "red", "T6.5 red color");
}

// ─── T7: mobile_alarm — tool change timeout ─────────────────────────────────
console.log("T7: mobile_alarm — tool change");
{
  const r = mobileInterface("mobile_alarm", { code: "300" });
  assert(r.plain_english.toLowerCase().includes("tool change"), "T7.1 tool change in description");
  assert(r.severity === "warning", "T7.2 warning severity");
  assert(r.fix_steps.some((s: string) => s.toLowerCase().includes("air pressure")), "T7.3 mentions air pressure");
}

// ─── T8: mobile_alarm — unknown alarm ───────────────────────────────────────
console.log("T8: mobile_alarm — unknown alarm");
{
  const r = mobileInterface("mobile_alarm", { code: "9999" });
  assert(r.plain_english.includes("Unknown"), "T8.1 says unknown");
  assert(r.severity === "warning", "T8.2 default warning severity");
  assert(r.fix_steps.length > 0, "T8.3 has generic fix steps");
}

// ─── T9: mobile_alarm — e-stop ──────────────────────────────────────────────
console.log("T9: mobile_alarm — e-stop");
{
  const r = mobileInterface("mobile_alarm", { code: "700" });
  assert(r.severity === "emergency", "T9.1 emergency severity");
  assert(r.fix_steps.some((s: string) => s.toLowerCase().includes("e-stop")), "T9.2 mentions e-stop");
}

// ─── T10: mobile_timer_start — start timer ──────────────────────────────────
console.log("T10: mobile_timer_start");
{
  const r = mobileInterface("mobile_timer_start", {
    tool: "T03",
    estimated_life_min: 45,
    warning_pct: 80,
  });
  assert(r.timer_id.startsWith("TLT-"), "T10.1 timer ID format");
  assert(r.state === "running", "T10.2 running state");
  assert(r.estimated_life_min === 45, "T10.3 estimated life 45min");
  assert(r.remaining_min === 45, "T10.4 remaining = estimated at start");
  assert(r.tool === "T03", "T10.5 tool echoed");
}

// ─── T11: mobile_timer_check — check timer ──────────────────────────────────
console.log("T11: mobile_timer_check");
{
  // Start a timer and immediately check it
  const started = mobileInterface("mobile_timer_start", { tool: "T05", estimated_life_min: 30 });
  const checked = mobileInterface("mobile_timer_check", { id: started.timer_id });
  assert(checked.state === "running", "T11.1 still running");
  assert(checked.remaining_min <= 30, "T11.2 remaining ≤ 30");
  assert(checked.elapsed_min >= 0, "T11.3 elapsed ≥ 0");
}

// ─── T12: mobile_timer_reset — reset timer ──────────────────────────────────
console.log("T12: mobile_timer_reset");
{
  const started = mobileInterface("mobile_timer_start", { tool: "T07", estimated_life_min: 20 });
  const reset = mobileInterface("mobile_timer_reset", { id: started.timer_id });
  assert(reset.state === "running", "T12.1 back to running");
  assert(reset.remaining_min === 20, "T12.2 remaining reset to 20");
  assert(reset.elapsed_min === 0, "T12.3 elapsed reset to 0");
}

// ─── T13: mobile_timer_list — list timers ───────────────────────────────────
console.log("T13: mobile_timer_list");
{
  const r = mobileInterface("mobile_timer_list", {});
  assert(r.total >= 3, "T13.1 at least 3 timers from earlier tests");
  assert(Array.isArray(r.timers), "T13.2 timers is array");
}

// ─── T14: mobile_timer_check — not found ────────────────────────────────────
console.log("T14: mobile_timer_check — not found");
{
  const r = mobileInterface("mobile_timer_check", { id: "TLT-999" });
  assert(r.error !== undefined, "T14.1 error for missing timer");
}

// ─── T15: mobile_cache — offline cache bundle ───────────────────────────────
console.log("T15: mobile_cache — offline bundle");
{
  const r = mobileInterface("mobile_cache", {});
  assert(r.entries.length >= 50, "T15.1 at least 50 cache entries (5 mats × 6 dias × 2 ops = 60)");
  assert(r.total_bytes > 0, "T15.2 total bytes > 0");
  assert(r.version === "1.0", "T15.3 version 1.0");
  // Check one entry
  const entry = r.entries[0];
  assert(entry.material !== undefined, "T15.4 entry has material");
  assert(entry.result.rpm > 0, "T15.5 entry result has rpm");
}

// ─── T16: Direct API — quickLookup ──────────────────────────────────────────
console.log("T16: Direct API — quickLookup");
{
  const r = quickLookup({ material: "steel", tool_diameter_mm: 16, operation: "roughing" });
  assert(r.rpm > 0, "T16.1 rpm > 0");
  assert(r.sfm > 0, "T16.2 sfm > 0");
}

// ─── T17: Direct API — processVoiceQuery ────────────────────────────────────
console.log("T17: Direct API — processVoiceQuery");
{
  const r = processVoiceQuery("what speed for inconel with a 12mm mill?");
  assert(r.interpreted.includes("inconel"), "T17.1 parsed inconel");
  assert(r.parameters!.rpm > 0, "T17.2 has rpm");
}

// ─── T18: Direct API — decodeAlarm ──────────────────────────────────────────
console.log("T18: Direct API — decodeAlarm");
{
  const r = decodeAlarm("400");
  assert(r.plain_english.toLowerCase().includes("coolant"), "T18.1 coolant alarm");
  assert(r.severity === "info", "T18.2 info severity");
}

// ─── T19: mobile_lookup — all materials ─────────────────────────────────────
console.log("T19: mobile_lookup — all materials");
{
  const materials = ["aluminum", "steel", "stainless", "titanium", "inconel"];
  for (const m of materials) {
    const r = mobileInterface("mobile_lookup", { material: m, tool_diameter_mm: 10, operation: "roughing" });
    assert(r.rpm > 0, `T19 ${m} rpm > 0`);
    assert(r.display.primary.includes("RPM"), `T19 ${m} has RPM display`);
  }
}

// ─── T20: mobile_alarm — all known codes ────────────────────────────────────
console.log("T20: mobile_alarm — all known codes");
{
  const codes = ["100", "101", "102", "108", "200", "300", "400", "500", "600", "700", "1000", "2000"];
  for (const code of codes) {
    const r = mobileInterface("mobile_alarm", { code });
    assert(r.plain_english.length > 0, `T20 alarm ${code} has description`);
    assert(r.fix_steps.length > 0, `T20 alarm ${code} has fix steps`);
  }
}

// ─── T21: Edge — unknown action ─────────────────────────────────────────────
console.log("T21: Edge — unknown action");
{
  const r = mobileInterface("mobile_nonexistent", {});
  assert(r.error !== undefined, "T21.1 unknown action returns error");
}

// ─── Summary ────────────────────────────────────────────────────────────────
console.log(`\n${"=".repeat(60)}`);
console.log(`R9-MS3 Mobile Interface: ${passed} passed, ${failed} failed out of ${passed + failed}`);
console.log(`${"=".repeat(60)}`);
process.exit(failed > 0 ? 1 : 0);
