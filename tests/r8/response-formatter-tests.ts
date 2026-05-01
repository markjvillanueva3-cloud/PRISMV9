/**
 * R8-MS1 ResponseFormatterEngine Tests
 * =====================================
 * 80 tests across 20 test sections (T1-T20)
 *
 * T1-T3:   Persona detection from query patterns
 * T4-T6:   Unit detection and formatting
 * T7-T9:   Machinist (Dave) formatter
 * T10-T12: Programmer (Sarah) formatter
 * T13-T15: Manager (Mike) formatter
 * T16-T17: Auto persona + unit detection
 * T18:     Edge cases (empty/null/minimal data)
 * T19:     Dispatcher integration (format_response action)
 * T20:     Cross-persona consistency
 */

import {
  formatForPersona,
  responseFormatter,
  detectPersona as detectResponsePersona,
  detectUnits,
  type FormatOptions,
  type FormattedResponse,
} from "../../src/engines/ResponseFormatterEngine.js";

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

function assertIncludes(haystack: string, needle: string, msg: string): void {
  assert(haystack.includes(needle), `${msg} — expected "${needle}" in output`);
}

function assertNotIncludes(haystack: string, needle: string, msg: string): void {
  assert(!haystack.includes(needle), `${msg} — expected "${needle}" NOT in output`);
}

// ─── Shared Test Data ───────────────────────────────────────────────────────

const INCONEL_JOB_PLAN = {
  material: { name: "Inconel 718", iso_group: "S" },
  machine: { name: "DMU 50" },
  operation: "pocket_roughing",
  tool: { type: "carbide endmill", diameter: 12.7, flutes: 4 },
  cutting_speed: 47,       // m/min
  feed_per_tooth: 0.038,   // mm
  axial_depth: 1.0,        // mm
  radial_depth: 3.2,       // mm
  strategy: "Trochoidal",
  coolant: "Through-tool HPC",
  stability: { is_stable: true, critical_depth_mm: 1.8 },
  tool_life_min: 25,
  cycle_time: { total_min: 18.2 },
  mrr_cm3_min: 1.44,
  cutting_force_N: 890,
  surface_finish: { Ra: 2.1, Rz: 12.5 },
  deflection: { max_deflection_mm: 0.018 },
  thermal: { max_temperature_C: 680 },
  confidence: 0.85,
};

const STEEL_SPEED_FEED = {
  material: "AISI 4140",
  iso_group: "P",
  cutting_speed: 200,
  feed_per_tooth: 0.15,
  axial_depth: 2.0,
  radial_depth: 8.0,
  tool: { type: "endmill", diameter: 16, flutes: 4 },
  tool_life_min: 45,
  cycle_time: { total_min: 8.5 },
  mrr_cm3_min: 4.8,
  cutting_force_N: 1200,
  stability: { is_stable: true, critical_depth_mm: 3.5 },
};

// ─── T1: Machinist persona detection ────────────────────────────────────────

console.log("\nT1: Machinist persona detection");
{
  assert(detectResponsePersona("what speed should I run") === "machinist", "T1.1 'what speed' → machinist");
  assert(detectResponsePersona("what feed for this") === "machinist", "T1.2 'what feed' → machinist");
  assert(detectResponsePersona("give me RPM") === "machinist", "T1.3 'RPM' → machinist");
  assert(detectResponsePersona("I'm getting chatter") === "machinist", "T1.4 'chatter' → machinist");
}

// ─── T2: Programmer persona detection ───────────────────────────────────────

console.log("\nT2: Programmer persona detection");
{
  assert(detectResponsePersona("compare trochoidal vs adaptive strategy for this pocket with detailed cycle time and tool life analysis") === "programmer", "T2.1 long strategy query → programmer");
  assert(detectResponsePersona("optimize toolpath strategy tradeoffs") === "programmer", "T2.2 'optimize strategy' → programmer");
  assert(detectResponsePersona("what g-code should I use for the controller") === "programmer", "T2.3 'g-code controller' → programmer");
  assert(detectResponsePersona("cycle time analysis for this operation") === "programmer", "T2.4 'cycle time analysis' → programmer");
}

// ─── T3: Manager persona detection ──────────────────────────────────────────

console.log("\nT3: Manager persona detection");
{
  assert(detectResponsePersona("what will this cost per part") === "manager", "T3.1 'cost per part' → manager");
  assert(detectResponsePersona("quote this RFQ for 200 parts") === "manager", "T3.2 'quote RFQ' → manager");
  assert(detectResponsePersona("should we outsource or run in-house") === "manager", "T3.3 'outsource' → manager");
  assert(detectResponsePersona("ROI on this new tool investment") === "manager", "T3.4 'ROI' → manager");
}

// ─── T4: Unit detection from query ──────────────────────────────────────────

console.log("\nT4: Unit detection from query");
{
  assert(detectUnits("I need speed in SFM and feed in IPM") === "imperial", "T4.1 SFM/IPM → imperial");
  assert(detectUnits("Vc in m/min, fz in mm/rev") === "metric", "T4.2 m/min → metric");
  assert(detectUnits("cut at 200 mm depth") === "metric", "T4.3 mm → metric");
  assert(detectUnits("use 1/2 inch endmill") === "imperial", "T4.4 inch → imperial");
}

// ─── T5: Imperial unit formatting ───────────────────────────────────────────

console.log("\nT5: Imperial unit formatting (Dave)");
{
  const r = formatForPersona(INCONEL_JOB_PLAN, "job_plan", { persona: "machinist", units: "imperial" });
  assert(r.units === "imperial", "T5.1 units = imperial");
  assertIncludes(r.formatted, "RPM", "T5.2 shows RPM");
  assertIncludes(r.formatted, "SETUP SHEET", "T5.3 has SETUP SHEET header");
  assertIncludes(r.formatted, "Inconel 718", "T5.4 shows material name");
}

// ─── T6: Metric unit formatting ────────────────────────────────────────────

console.log("\nT6: Metric unit formatting (Sarah)");
{
  const r = formatForPersona(INCONEL_JOB_PLAN, "job_plan", { persona: "programmer", units: "metric" });
  assert(r.units === "metric", "T6.1 units = metric");
  assertIncludes(r.formatted, "m/min", "T6.2 shows m/min");
  assertIncludes(r.formatted, "mm/tooth", "T6.3 shows mm/tooth");
  assertIncludes(r.formatted, "JOB PLAN", "T6.4 has JOB PLAN header");
}

// ─── T7: Machinist formatter — full Inconel result ─────────────────────────

console.log("\nT7: Machinist formatter — Inconel pocket");
{
  const r = formatForPersona(INCONEL_JOB_PLAN, "job_plan", { persona: "machinist", units: "imperial" });
  assert(r.persona === "machinist", "T7.1 persona = machinist");
  assert(r.sections.length >= 3, "T7.2 has >= 3 sections");
  assertIncludes(r.formatted, "POCKET ROUGHING", "T7.3 operation label uppercase");
  assertIncludes(r.formatted, "DMU 50", "T7.4 shows machine");
  assertIncludes(r.formatted, "Trochoidal", "T7.5 shows strategy");
  assertIncludes(r.formatted, "Tool Life", "T7.6 shows tool life");
}

// ─── T8: Machinist practical notes ─────────────────────────────────────────

console.log("\nT8: Machinist practical notes");
{
  const r = formatForPersona(INCONEL_JOB_PLAN, "job_plan", { persona: "machinist", units: "imperial" });
  // Should have superalloy-specific warnings
  assertIncludes(r.formatted, "work-hardens", "T8.1 Inconel work-hardening warning");
  assertIncludes(r.formatted, "chatter", "T8.2 chatter advice");
  assertIncludes(r.formatted, "Replace tool", "T8.3 tool replacement note");
}

// ─── T9: Machinist with unstable params ─────────────────────────────────────

console.log("\nT9: Machinist with unstable parameters");
{
  const unstable = {
    ...STEEL_SPEED_FEED,
    stability: { is_stable: false, critical_depth_mm: 1.2 },
  };
  const r = formatForPersona(unstable, "speed_feed", { persona: "machinist", units: "imperial" });
  assertIncludes(r.formatted, "CHATTER WARNING", "T9.1 unstable → CHATTER WARNING");
  assertIncludes(r.formatted, "Reduce DOC", "T9.2 suggests reducing DOC");
}

// ─── T10: Programmer formatter — dual units ─────────────────────────────────

console.log("\nT10: Programmer formatter — dual units");
{
  const r = formatForPersona(INCONEL_JOB_PLAN, "job_plan", { persona: "programmer", units: "metric" });
  assert(r.persona === "programmer", "T10.1 persona = programmer");
  // Should show metric primary with imperial in parens
  assertIncludes(r.formatted, "mm", "T10.2 shows mm");
  assertIncludes(r.formatted, "Vc =", "T10.3 shows Vc notation");
  assertIncludes(r.formatted, "fz =", "T10.4 shows fz notation");
}

// ─── T11: Programmer chatter analysis ───────────────────────────────────────

console.log("\nT11: Programmer chatter analysis");
{
  const r = formatForPersona(INCONEL_JOB_PLAN, "job_plan", { persona: "programmer", units: "metric" });
  assertIncludes(r.formatted, "CHATTER ANALYSIS", "T11.1 has chatter section");
  assertIncludes(r.formatted, "STABLE", "T11.2 shows stability status");
}

// ─── T12: Programmer surface integrity ──────────────────────────────────────

console.log("\nT12: Programmer surface integrity");
{
  const r = formatForPersona(INCONEL_JOB_PLAN, "job_plan", { persona: "programmer", units: "metric" });
  assertIncludes(r.formatted, "SURFACE INTEGRITY", "T12.1 has surface section");
  assertIncludes(r.formatted, "Ra", "T12.2 shows Ra");
  assertIncludes(r.formatted, "deflection", "T12.3 shows deflection");
  assertIncludes(r.formatted, "temperature", "T12.4 shows temperature");
}

// ─── T13: Manager formatter — cost breakdown ───────────────────────────────

console.log("\nT13: Manager cost breakdown");
{
  const r = formatForPersona(INCONEL_JOB_PLAN, "job_plan", {
    persona: "manager",
    units: "imperial",
    batch_size: 50,
    machine_rate_per_hr: 185,
    tool_cost: 40,
    programming_hours: 2,
    setup_time_min: 45,
  });
  assert(r.persona === "manager", "T13.1 persona = manager");
  assertIncludes(r.formatted, "COST ANALYSIS", "T13.2 has cost header");
  assertIncludes(r.formatted, "Per-Part Cost Breakdown", "T13.3 shows per-part");
  assertIncludes(r.formatted, "Machine time", "T13.4 shows machine time cost");
  assertIncludes(r.formatted, "TOTAL:", "T13.5 shows total");
  assertIncludes(r.formatted, "$185", "T13.6 uses provided rate");
}

// ─── T14: Manager quote recommendation ──────────────────────────────────────

console.log("\nT14: Manager quote recommendation");
{
  const r = formatForPersona(INCONEL_JOB_PLAN, "job_plan", {
    persona: "manager",
    batch_size: 50,
    machine_rate_per_hr: 150,
    tool_cost: 30,
  });
  assertIncludes(r.formatted, "QUOTE RECOMMENDATION", "T14.1 has quote section");
  assertIncludes(r.formatted, "25-35% margin", "T14.2 shows margin range");
}

// ─── T15: Manager risk factors ──────────────────────────────────────────────

console.log("\nT15: Manager risk factors");
{
  const r = formatForPersona(INCONEL_JOB_PLAN, "job_plan", {
    persona: "manager",
    batch_size: 50,
  });
  assertIncludes(r.formatted, "RISK FACTORS", "T15.1 has risk section");
  assertIncludes(r.formatted, "scrap rate", "T15.2 superalloy scrap warning");
}

// ─── T16: Auto persona detection ────────────────────────────────────────────

console.log("\nT16: Auto persona detection");
{
  // Machinist query
  const r1 = formatForPersona(STEEL_SPEED_FEED, "speed_feed", {
    persona: "auto",
    query: "what RPM should I run for this",
  });
  assert(r1.persona === "machinist", "T16.1 RPM query → machinist persona");
  assertIncludes(r1.formatted, "SETUP SHEET", "T16.2 machinist format");

  // Programmer query
  const r2 = formatForPersona(STEEL_SPEED_FEED, "speed_feed", {
    persona: "auto",
    query: "optimize the toolpath strategy with cycle time tradeoff analysis",
  });
  assert(r2.persona === "programmer", "T16.3 strategy optimize → programmer");
  assertIncludes(r2.formatted, "JOB PLAN", "T16.4 programmer format");

  // Manager query
  const r3 = formatForPersona(STEEL_SPEED_FEED, "speed_feed", {
    persona: "auto",
    query: "cost per part quote for batch of 200",
  });
  assert(r3.persona === "manager", "T16.5 cost quote → manager");
  assertIncludes(r3.formatted, "COST ANALYSIS", "T16.6 manager format");
}

// ─── T17: Auto unit detection ───────────────────────────────────────────────

console.log("\nT17: Auto unit detection");
{
  const r1 = formatForPersona(STEEL_SPEED_FEED, "speed_feed", {
    persona: "machinist",
    units: "auto",
    query: "speed in SFM",
  });
  assert(r1.units === "imperial", "T17.1 SFM query → imperial units");

  const r2 = formatForPersona(STEEL_SPEED_FEED, "speed_feed", {
    persona: "programmer",
    units: "auto",
    query: "Vc in m/min",
  });
  assert(r2.units === "metric", "T17.2 m/min query → metric units");

  // Default (no indicators)
  const r3 = formatForPersona(STEEL_SPEED_FEED, "speed_feed", {
    persona: "machinist",
    units: "auto",
    query: "just tell me the parameters",
  });
  // machinist defaults imperial when auto
  assert(r3.units === "imperial", "T17.3 machinist default → imperial");

  const r4 = formatForPersona(STEEL_SPEED_FEED, "speed_feed", {
    persona: "programmer",
    units: "auto",
    query: "just parameters",
  });
  assert(r4.units === "metric", "T17.4 programmer default → metric");
}

// ─── T18: Edge cases ────────────────────────────────────────────────────────

console.log("\nT18: Edge cases");
{
  // Empty result
  const r1 = formatForPersona({}, "unknown", { persona: "machinist" });
  assert(r1.persona === "machinist", "T18.1 empty result still returns persona");
  assert(r1.sections.length >= 1, "T18.2 at least header section");

  // Null result
  const r2 = formatForPersona(null, "unknown", { persona: "programmer" });
  assert(r2.persona === "programmer", "T18.3 null result returns programmer");

  // Minimal data
  const r3 = formatForPersona({ material: "Steel" }, "speed_feed", { persona: "machinist" });
  assertIncludes(r3.formatted, "Steel", "T18.4 minimal data shows material");

  // No query for auto
  const r4 = formatForPersona(STEEL_SPEED_FEED, "speed_feed", { persona: "auto" });
  assert(["machinist", "programmer", "manager"].includes(r4.persona), "T18.5 auto without query picks valid persona");
}

// ─── T19: Dispatcher integration (format_response action) ───────────────────

console.log("\nT19: Dispatcher integration");
{
  // Basic call
  const r1 = responseFormatter("format_response", {
    result: INCONEL_JOB_PLAN,
    source_action: "job_plan",
    persona: "machinist",
    units: "imperial",
  });
  assert(r1.persona === "machinist", "T19.1 dispatcher returns persona");
  assert(r1.units === "imperial", "T19.2 dispatcher returns units");
  assert(typeof r1.formatted_text === "string", "T19.3 has formatted_text string");
  assert(r1.section_count > 0, "T19.4 has sections");

  // Auto persona via query
  const r2 = responseFormatter("format_response", {
    result: STEEL_SPEED_FEED,
    source_action: "speed_feed",
    persona: "auto",
    query: "what's the cost for a batch of 100 parts",
  });
  assert(r2.persona === "manager", "T19.5 auto + cost query → manager");

  // Missing result → error
  let threw = false;
  try {
    responseFormatter("format_response", {});
  } catch (e: any) {
    threw = true;
    assert(e.message.includes("result"), "T19.6 error mentions 'result'");
  }
  assert(threw, "T19.7 missing result throws");

  // Unknown action → error
  let threw2 = false;
  try {
    responseFormatter("bad_action" as any, {});
  } catch (e: any) {
    threw2 = true;
  }
  assert(threw2, "T19.8 unknown action throws");
}

// ─── T20: Cross-persona consistency ─────────────────────────────────────────

console.log("\nT20: Cross-persona consistency");
{
  // Same result, three personas — all should produce valid output
  const personas: Array<"machinist" | "programmer" | "manager"> = ["machinist", "programmer", "manager"];
  for (const p of personas) {
    const r = formatForPersona(INCONEL_JOB_PLAN, "job_plan", { persona: p, units: "metric" });
    assert(r.persona === p, `T20.${personas.indexOf(p) + 1} ${p} returns correct persona`);
    assert(r.formatted.length > 50, `T20.${personas.indexOf(p) + 4} ${p} produces substantial output`);
    assert(r.sections.length >= 2, `T20.${personas.indexOf(p) + 7} ${p} has >= 2 sections`);
  }

  // Machinist always has SETUP SHEET, Programmer has JOB PLAN, Manager has COST ANALYSIS
  const rm = formatForPersona(INCONEL_JOB_PLAN, "job_plan", { persona: "machinist" });
  const rp = formatForPersona(INCONEL_JOB_PLAN, "job_plan", { persona: "programmer" });
  const rmgr = formatForPersona(INCONEL_JOB_PLAN, "job_plan", { persona: "manager" });
  assertIncludes(rm.formatted, "SETUP SHEET", "T20.10 machinist → SETUP SHEET");
  assertIncludes(rp.formatted, "JOB PLAN", "T20.11 programmer → JOB PLAN");
  assertIncludes(rmgr.formatted, "COST ANALYSIS", "T20.12 manager → COST ANALYSIS");
}

// ─── Summary ────────────────────────────────────────────────────────────────

console.log("\n" + "=".repeat(60));
console.log(`R8-MS1 ResponseFormatterEngine: ${passed}/${total} passed, ${failed} failed`);
console.log("=".repeat(60));

if (failed > 0) process.exit(1);
