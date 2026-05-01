/**
 * R8-MS4 SetupSheetEngine Tests
 * ==============================
 * 60 tests across 12 test sections (T1-T12)
 *
 * T1-T2:   buildSetupSheet basics (header, operations)
 * T3-T4:   Printable format rendering
 * T5-T6:   Markdown format rendering
 * T7:      JSON format (data-only)
 * T8:      Unit system variants (imperial, metric, dual)
 * T9:      Tool consolidation
 * T10:     Dispatcher integration
 * T11:     Template generation
 * T12:     Edge cases
 */

import {
  buildSetupSheet,
  setupSheetEngine,
  type SetupSheet,
} from "../../src/engines/SetupSheetEngine.js";

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

// ─── Sample Data ────────────────────────────────────────────────────────────

function sampleRawData(): Record<string, any> {
  return {
    header: {
      part_description: "Bracket Assembly",
      material: "7075-T6",
      iso_group: "N",
      machine: "Haas VF2",
      date: "2026-02-21",
    },
    operations: [
      {
        sequence: 1,
        feature: "pocket_roughing",
        phases: [
          {
            type: "roughing",
            cutting_speed: 200,
            feed_per_tooth: 0.12,
            axial_depth: 4,
            radial_depth: 8,
            spindle_speed: 5300,
            feed_rate: 2544,
          },
        ],
        coolant: { strategy: "flood", pressure_bar: 20 },
        cycle_time_min: 8.5,
        safety_warnings: [],
      },
      {
        sequence: 2,
        feature: "pocket_finishing",
        phases: [
          {
            type: "finishing",
            cutting_speed: 250,
            feed_per_tooth: 0.06,
            axial_depth: 0.5,
            radial_depth: 6,
            spindle_speed: 6630,
            feed_rate: 1591,
          },
        ],
        coolant: { strategy: "mist", pressure_bar: 5 },
        cycle_time_min: 3.2,
        safety_warnings: ["Check tool runout before finishing pass"],
      },
      {
        sequence: 3,
        feature: "drilling",
        phases: [
          {
            type: "drilling",
            cutting_speed: 100,
            feed_per_tooth: 0.08,
            axial_depth: 20,
            radial_depth: 8.5,
            spindle_speed: 3750,
            feed_rate: 600,
          },
        ],
        coolant: { strategy: "through-spindle", pressure_bar: 40 },
        cycle_time_min: 2.1,
        safety_warnings: [],
      },
    ],
    tools: [
      { type: "End Mill", diameter_mm: 12, flutes: 4, material: "Carbide", holder: "ER32", stickout_mm: 40 },
      { type: "End Mill", diameter_mm: 8, flutes: 4, material: "Carbide", holder: "ER25", stickout_mm: 30 },
      { type: "Drill", diameter_mm: 8.5, flutes: 2, material: "HSS-Co", holder: "Drill chuck", stickout_mm: 50 },
    ],
    safety_notes: ["Check tool runout before finishing pass"],
    total_cycle_time_min: 13.8,
  };
}

// ─── T1: buildSetupSheet — header ──────────────────────────────────────────

console.log("\nT1: buildSetupSheet — header");
{
  const sheet = buildSetupSheet(sampleRawData());
  assert(sheet.header.part_description === "Bracket Assembly", "T1.1 part description");
  assert(sheet.header.material === "7075-T6", "T1.2 material");
  assert(sheet.header.iso_group === "N", "T1.3 iso group");
  assert(sheet.header.machine === "Haas VF2", "T1.4 machine");
  assert(sheet.header.job_id.startsWith("PRISM-"), "T1.5 auto-generated job_id");
  assert(sheet.header.date === "2026-02-21", "T1.6 date");
}

// ─── T2: buildSetupSheet — operations ──────────────────────────────────────

console.log("\nT2: buildSetupSheet — operations");
{
  const sheet = buildSetupSheet(sampleRawData());
  assert(sheet.operations.length === 3, "T2.1 3 operations");
  assert(sheet.operations[0].sequence === 1, "T2.2 op1 sequence");
  assert(sheet.operations[0].speed_rpm === 5300, "T2.3 op1 speed RPM");
  assert(sheet.operations[0].feed_mmpm === 2544, "T2.4 op1 feed mm/min");
  assert(sheet.operations[0].doc_mm === 4, "T2.5 op1 DOC mm");
  assert(sheet.operations[1].notes.length === 1, "T2.6 op2 has safety note");
  assert(sheet.operations[2].name.includes("drilling"), "T2.7 op3 name includes feature");
}

// ─── T3: Printable format — structure ──────────────────────────────────────

console.log("\nT3: Printable format — structure");
{
  const sheet = buildSetupSheet(sampleRawData(), { format: "printable" });
  assert(sheet.format === "printable", "T3.1 format is printable");
  assert(sheet.rendered.length > 100, "T3.2 rendered output is substantial");
  assert(sheet.rendered.includes("PRISM SETUP SHEET"), "T3.3 has title");
  assert(sheet.rendered.includes("Bracket Assembly"), "T3.4 has part name");
  assert(sheet.rendered.includes("7075-T6"), "T3.5 has material");
  assert(sheet.rendered.includes("OPERATION 1"), "T3.6 has operation header");
  assert(sheet.rendered.includes("OPERATION 2"), "T3.7 has operation 2");
  assert(sheet.rendered.includes("OPERATION 3"), "T3.8 has operation 3");
}

// ─── T4: Printable format — content detail ─────────────────────────────────

console.log("\nT4: Printable format — content detail");
{
  const sheet = buildSetupSheet(sampleRawData(), { format: "printable" });
  assert(sheet.rendered.includes("TOOL LIST"), "T4.1 has tool list section");
  assert(sheet.rendered.includes("SUMMARY"), "T4.2 has summary section");
  assert(sheet.rendered.includes("SAFETY NOTES"), "T4.3 has safety notes section");
  assert(sheet.rendered.includes("5300"), "T4.4 shows RPM value");
  assert(sheet.rendered.includes("WARNING"), "T4.5 shows safety warning");
  assert(sheet.rendered.includes("Generated by PRISM"), "T4.6 has attribution");
}

// ─── T5: Markdown format — structure ───────────────────────────────────────

console.log("\nT5: Markdown format — structure");
{
  const sheet = buildSetupSheet(sampleRawData(), { format: "markdown" });
  assert(sheet.format === "markdown", "T5.1 format is markdown");
  assert(sheet.rendered.includes("# PRISM Setup Sheet"), "T5.2 has H1 title");
  assert(sheet.rendered.includes("## Op 1"), "T5.3 has operation heading");
  assert(sheet.rendered.includes("## Tool List"), "T5.4 has tool list heading");
  assert(sheet.rendered.includes("## Summary"), "T5.5 has summary heading");
}

// ─── T6: Markdown format — tables ─────────────────────────────────────────

console.log("\nT6: Markdown format — tables");
{
  const sheet = buildSetupSheet(sampleRawData(), { format: "markdown" });
  assert(sheet.rendered.includes("| Field | Value |"), "T6.1 has header table");
  assert(sheet.rendered.includes("| Parameter | Value |"), "T6.2 has param table");
  assert(sheet.rendered.includes("| # | Description"), "T6.3 has tool table");
  assert(sheet.rendered.includes("| Metric | Value |"), "T6.4 has summary table");
  assert(sheet.rendered.includes("> **Warning:**"), "T6.5 has warning blockquote");
}

// ─── T7: JSON format ──────────────────────────────────────────────────────

console.log("\nT7: JSON format");
{
  const sheet = buildSetupSheet(sampleRawData(), { format: "json" });
  assert(sheet.format === "json", "T7.1 format is json");
  assert(sheet.rendered === "", "T7.2 rendered is empty (data is the output)");
  assert(sheet.header.job_id.startsWith("PRISM-"), "T7.3 has job_id");
  assert(sheet.tools.length >= 2, "T7.4 has tools array");
  assert(typeof sheet.summary.total_cycle_time_min === "number", "T7.5 has numeric cycle time");
  assert(typeof sheet.summary.estimated_part_cost_usd === "number", "T7.6 has numeric part cost");
}

// ─── T8: Unit system variants ──────────────────────────────────────────────

console.log("\nT8: Unit system variants");
{
  // Imperial
  const sheetImp = buildSetupSheet(sampleRawData(), { format: "printable", units: "imperial" });
  assert(sheetImp.rendered.includes("SFM"), "T8.1 imperial shows SFM");
  assert(sheetImp.rendered.includes("IPM"), "T8.2 imperial shows IPM");

  // Metric
  const sheetMet = buildSetupSheet(sampleRawData(), { format: "printable", units: "metric" });
  assert(sheetMet.rendered.includes("m/min"), "T8.3 metric shows m/min");
  assert(sheetMet.rendered.includes("mm/min"), "T8.4 metric shows mm/min");

  // Dual (default)
  const sheetDual = buildSetupSheet(sampleRawData(), { format: "printable" });
  assert(sheetDual.rendered.includes("SFM") && sheetDual.rendered.includes("m/min"), "T8.5 dual shows both speed units");

  // Markdown imperial
  const mdImp = buildSetupSheet(sampleRawData(), { format: "markdown", units: "imperial" });
  assert(mdImp.rendered.includes("SFM"), "T8.6 markdown imperial shows SFM");
  assert(!mdImp.rendered.includes("m/min"), "T8.7 markdown imperial no m/min");
}

// ─── T9: Tool consolidation ───────────────────────────────────────────────

console.log("\nT9: Tool consolidation");
{
  // Create data with duplicate tools
  const data = sampleRawData();
  // Add a 4th operation using the same tool as op 1
  data.operations.push({
    sequence: 4,
    feature: "contour",
    phases: [{ type: "finishing", cutting_speed: 220, feed_per_tooth: 0.08, axial_depth: 3, radial_depth: 6, spindle_speed: 5800, feed_rate: 1856 }],
    coolant: { strategy: "flood", pressure_bar: 20 },
    cycle_time_min: 4.0,
    safety_warnings: [],
  });
  data.tools.push(data.tools[0]); // Same tool as op 1

  const sheet = buildSetupSheet(data);
  // Tool consolidation should merge duplicate descriptions
  assert(sheet.tools.length === 3, "T9.1 consolidated to 3 unique tools");
  const firstTool = sheet.tools.find(t => t.number === 1);
  assert(firstTool !== undefined, "T9.2 tool 1 exists");
  assert(firstTool!.used_in_ops.includes(1), "T9.3 tool 1 used in op 1");
  assert(firstTool!.used_in_ops.includes(4), "T9.4 tool 1 also used in op 4");
}

// ─── T10: Dispatcher integration ───────────────────────────────────────────

console.log("\nT10: Dispatcher integration");
{
  // setup_sheet_format
  const r1 = setupSheetEngine("setup_sheet_format", {
    data: sampleRawData(),
    format: "markdown",
    units: "dual",
    programmer: "John",
    program_number: "O1234",
  });
  assert(r1.header.programmer === "John", "T10.1 programmer set");
  assert(r1.header.program_number === "O1234", "T10.2 program number set");
  assert(r1.format === "markdown", "T10.3 format is markdown");
  assert(r1.rendered.includes("John"), "T10.4 rendered includes programmer");

  // Printable format
  const r2 = setupSheetEngine("setup_sheet_format", {
    data: sampleRawData(),
    format: "printable",
  });
  assert(r2.format === "printable", "T10.5 printable format");
  assert(r2.rendered.includes("PRISM SETUP SHEET"), "T10.6 printable has title");
}

// ─── T11: Template generation ──────────────────────────────────────────────

console.log("\nT11: Template generation");
{
  const r = setupSheetEngine("setup_sheet_template", { format: "printable" });
  assert(typeof r.template === "string", "T11.1 has template string");
  assert(r.template.includes("PRISM SETUP SHEET"), "T11.2 template has title");
  assert(r.template.includes("[Part Description]"), "T11.3 template has placeholder");
  assert(r.format === "printable", "T11.4 format is printable");

  // Markdown template
  const r2 = setupSheetEngine("setup_sheet_template", { format: "markdown" });
  assert(r2.template.includes("# PRISM Setup Sheet"), "T11.5 markdown template");
}

// ─── T12: Edge cases ───────────────────────────────────────────────────────

console.log("\nT12: Edge cases");
{
  // Minimal data
  const sheet = buildSetupSheet({
    header: { material: "Steel" },
    operations: [{
      feature: "facing",
      phases: [{ type: "roughing", cutting_speed: 150 }],
      cycle_time_min: 5,
    }],
    tools: [{ diameter_mm: 10 }],
  });
  assert(sheet.header.material === "Steel", "T12.1 minimal data — material");
  assert(sheet.operations.length === 1, "T12.2 minimal data — 1 operation");
  assert(sheet.summary.total_cycle_time_min > 0, "T12.3 has cycle time");

  // Custom shop rate
  const sheet2 = buildSetupSheet(sampleRawData(), { shop_rate_per_hour: 120 });
  assert(sheet2.summary.estimated_part_cost_usd > 0, "T12.4 custom shop rate produces cost");

  // Unknown dispatcher action
  let threw = false;
  try {
    setupSheetEngine("bad_action", {});
  } catch (e: any) {
    threw = true;
  }
  assert(threw, "T12.5 unknown action throws");

  // No operations
  const sheet3 = buildSetupSheet({ header: { material: "Al" }, operations: [], tools: [] });
  assert(sheet3.operations.length === 0, "T12.6 empty operations array");
  assert(sheet3.summary.total_cycle_time_min === 0, "T12.7 zero cycle time for no ops");

  // Job ID auto-increment
  const s1 = buildSetupSheet(sampleRawData());
  const s2 = buildSetupSheet(sampleRawData());
  assert(s1.header.job_id !== s2.header.job_id, "T12.8 unique job IDs");
}

// ─── Summary ────────────────────────────────────────────────────────────────

console.log("\n" + "=".repeat(60));
console.log(`R8-MS4 SetupSheetEngine: ${passed}/${total} passed, ${failed} failed`);
console.log("=".repeat(60));

if (failed > 0) process.exit(1);
