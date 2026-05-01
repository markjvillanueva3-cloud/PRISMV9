/**
 * R9-MS1 CAM Integration Engine Tests
 * =====================================
 * Validates: parameter calculation, format export (Fusion 360, Mastercam, CSV),
 * operation analysis, tool library, dispatcher routing.
 */

import {
  camIntegration, searchToolLibrary, getToolFromLibrary, getAllTools,
} from "../../src/engines/CAMIntegrationEngine.js";

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) { passed++; }
  else { failed++; console.error(`  FAIL: ${msg}`); }
}

// ─── T1: cam_recommend — basic parameter calculation ────────────────────────
console.log("T1: cam_recommend — parameter calculation");
{
  const r = camIntegration("cam_recommend", {
    material: "aluminum",
    operation: "roughing",
    tool_diameter_mm: 10,
  });
  assert(r.recommended !== undefined, "T1.1 has recommended block");
  assert(r.recommended.rpm > 0, "T1.2 rpm > 0");
  assert(r.recommended.feed_mmmin > 0, "T1.3 feed > 0");
  assert(r.recommended.ap_mm > 0, "T1.4 ap > 0");
  assert(r.recommended.ae_mm > 0, "T1.5 ae > 0");
  // Aluminum Vc=400 m/min, D=10 → RPM = (400*1000)/(π*10) ≈ 12732
  assert(r.recommended.rpm > 12000 && r.recommended.rpm < 13500, "T1.6 rpm in expected range for aluminum");
  assert(r.operation === "roughing", "T1.7 operation echoed");
  assert(r.material === "aluminum", "T1.8 material echoed");
}

// ─── T2: cam_recommend — titanium finishing ─────────────────────────────────
console.log("T2: cam_recommend — titanium finishing");
{
  const r = camIntegration("cam_recommend", {
    material: "titanium",
    operation: "finishing",
    tool_diameter_mm: 6,
  });
  assert(r.recommended.rpm > 0, "T2.1 rpm > 0");
  // Titanium Vc=60 * 1.2(finishing) = 72 m/min, D=6 → RPM ≈ 3820
  assert(r.recommended.rpm > 3500 && r.recommended.rpm < 4200, "T2.2 rpm in expected range for titanium finishing");
  // Finishing: ap = 0.5mm (vs roughing ap = 1.0 * D)
  assert(r.recommended.ap_mm <= 1.0, "T2.3 finishing ap ≤ 1.0mm");
  assert(r.recommended.ae_mm <= r.recommended.ap_mm * 2, "T2.4 finishing ae reasonable");
}

// ─── T3: cam_recommend — steel with custom diameter ─────────────────────────
console.log("T3: cam_recommend — steel with custom diameter");
{
  const r = camIntegration("cam_recommend", {
    material: "steel",
    operation: "pocketing",
    tool_diameter_mm: 20,
  });
  assert(r.recommended.rpm > 0, "T3.1 rpm > 0");
  // Steel Vc=200, D=20 → RPM ≈ 3183
  assert(r.recommended.rpm > 3000 && r.recommended.rpm < 3400, "T3.2 rpm range for steel D20");
}

// ─── T4: cam_recommend — inconel material ───────────────────────────────────
console.log("T4: cam_recommend — inconel");
{
  const r = camIntegration("cam_recommend", {
    material: "inconel",
    operation: "roughing",
    tool_diameter_mm: 12,
  });
  // Inconel Vc=35 → RPM ≈ 928
  assert(r.recommended.rpm > 800 && r.recommended.rpm < 1100, "T4.1 rpm range for inconel");
}

// ─── T5: cam_recommend — unknown material defaults ──────────────────────────
console.log("T5: cam_recommend — unknown material defaults");
{
  const r = camIntegration("cam_recommend", {
    material: "unobtanium",
    operation: "roughing",
    tool_diameter_mm: 10,
  });
  // Default Vc=200 (steel default), D=10 → RPM ≈ 6366
  assert(r.recommended.rpm > 0, "T5.1 falls back to default");
  assert(r.recommended.rpm > 6000 && r.recommended.rpm < 6700, "T5.2 rpm in default range");
}

// ─── T6: cam_export — Fusion 360 JSON format ────────────────────────────────
console.log("T6: cam_export — Fusion 360 JSON");
{
  const r = camIntegration("cam_export", {
    material: "aluminum",
    operation: "roughing",
    tool_diameter_mm: 10,
    target_system: "fusion360",
  });
  assert(r.format === "fusion360_json", "T6.1 format is fusion360_json");
  assert(typeof r.content === "string", "T6.2 content is string");
  const parsed = JSON.parse(r.content);
  assert(parsed.unitSystem === "metric", "T6.3 unitSystem metric");
  const op0 = parsed.operations[0];
  assert(op0.spindleSpeed > 0, "T6.4 has spindleSpeed");
  assert(op0.feedRate > 0, "T6.5 has feedRate");
  assert(op0.axialDepth > 0, "T6.6 has axialDepth");
  assert(op0.radialDepth > 0, "T6.7 has radialDepth");
  assert(parsed.format === "fusion360", "T6.8 format is fusion360");
}

// ─── T7: cam_export — Mastercam XML format ──────────────────────────────────
console.log("T7: cam_export — Mastercam XML");
{
  const r = camIntegration("cam_export", {
    material: "stainless",
    operation: "finishing",
    tool_diameter_mm: 8,
    target_system: "mastercam",
  });
  assert(r.format === "mastercam_xml", "T7.1 format is mastercam_xml");
  assert(r.content.includes("<PRISMParameters"), "T7.2 has XML root");
  assert(r.content.includes("<SpindleSpeed>"), "T7.3 has SpindleSpeed tag");
  assert(r.content.includes("<FeedRate>"), "T7.4 has FeedRate tag");
  assert(r.content.includes('material="stainless"'), "T7.5 material in XML attribute");
}

// ─── T8: cam_export — Generic CSV format ────────────────────────────────────
console.log("T8: cam_export — Generic CSV");
{
  const r = camIntegration("cam_export", {
    material: "steel",
    operation: "drilling",
    tool_diameter_mm: 12,
    target_system: "generic",
  });
  assert(r.format === "generic_csv", "T8.1 format is generic_csv");
  const lines = r.content.split("\n");
  assert(lines.length >= 2, "T8.2 has header + data rows");
  assert(lines[0].includes("Operation"), "T8.3 header has Operation column");
  assert(lines[0].includes("RPM"), "T8.4 header has RPM column");
}

// ─── T9: cam_export — default system (generic) ─────────────────────────────
console.log("T9: cam_export — default system");
{
  const r = camIntegration("cam_export", {
    material: "aluminum",
    operation: "roughing",
    tool_diameter_mm: 10,
  });
  assert(r.format === "generic_csv", "T9.1 defaults to generic_csv");
}

// ─── T10: cam_analyze_op — operation analysis ───────────────────────────────
console.log("T10: cam_analyze_op — operation analysis");
{
  const r = camIntegration("cam_analyze_op", {
    operation: {
      id: "OP-001",
      name: "Side Milling",
      type: "roughing",
      tool: { type: "end_mill", diameter_mm: 10, flutes: 4 },
      material: "aluminum",
      parameters: {
        rpm: 10000,
        feed_mmmin: 2000,
        ap_mm: 5,
        ae_mm: 3,
      },
    },
  });
  assert(r.operation_id === "OP-001", "T10.1 echoes operation id");
  assert(r.recommended !== undefined, "T10.2 has recommended");
  assert(typeof r.match_pct === "number", "T10.3 has match_pct");
  assert(r.match_pct >= 0 && r.match_pct <= 100, "T10.4 match_pct in 0-100");
  assert(Array.isArray(r.issues), "T10.5 issues is array");
}

// ─── T11: cam_analyze_op — perfect match ────────────────────────────────────
console.log("T11: cam_analyze_op — near-perfect parameters");
{
  // Get PRISM recommended first
  const rec = camIntegration("cam_recommend", {
    material: "aluminum",
    operation: "roughing",
    tool_diameter_mm: 10,
  });
  // Feed PRISM's own recommended values back as an operation
  const r = camIntegration("cam_analyze_op", {
    operation: {
      id: "OP-002",
      name: "Roughing Match",
      type: "roughing",
      tool: { type: "end_mill", diameter_mm: 10, flutes: 4 },
      material: "aluminum",
      parameters: {
        rpm: rec.recommended.rpm,
        feed_mmmin: rec.recommended.feed_mmmin,
        ap_mm: rec.recommended.ap_mm,
        ae_mm: rec.recommended.ae_mm,
      },
    },
  });
  assert(r.match_pct >= 90, "T11.1 match_pct ≥ 90% for PRISM's own values");
  assert(r.issues.length === 0, "T11.2 no issues for matching parameters");
}

// ─── T12: cam_analyze_op — severely off parameters ──────────────────────────
console.log("T12: cam_analyze_op — off parameters");
{
  const r = camIntegration("cam_analyze_op", {
    operation: {
      id: "OP-003",
      name: "Bad Params",
      type: "roughing",
      tool: { type: "end_mill", diameter_mm: 10, flutes: 4 },
      material: "aluminum",
      parameters: {
        rpm: 1000,       // Way too low for aluminum D10
        feed_mmmin: 100, // Very low
        ap_mm: 25,       // Absurdly deep
        ae_mm: 15,       // Wider than tool
      },
    },
  });
  assert(r.match_pct < 50, "T12.1 match_pct < 50% for bad params");
  assert(r.issues.length > 0, "T12.2 has issues flagged");
}

// ─── T13: cam_tool_library — list tools ─────────────────────────────────────
console.log("T13: cam_tool_library — list all");
{
  const r = camIntegration("cam_tool_library", {});
  assert(r.total >= 5, "T13.1 at least 5 tools");
  assert(Array.isArray(r.tools), "T13.2 tools array");
  assert(r.tools[0].id !== undefined, "T13.3 first tool has id");
  assert(r.tools[0].diameter_mm > 0, "T13.4 first tool has diameter");
}

// ─── T14: cam_tool_library — search by query ────────────────────────────────
console.log("T14: cam_tool_library — search");
{
  const r = camIntegration("cam_tool_library", { query: "ball" });
  assert(r.total >= 1, "T14.1 found at least 1 ball nose");
  assert(r.tools.every((t: any) =>
    t.type.includes("ball") || t.name.toLowerCase().includes("ball")
  ), "T14.2 all results match ball");
}

// ─── T15: cam_tool_get — get specific tool ──────────────────────────────────
console.log("T15: cam_tool_get — specific tool");
{
  const r = camIntegration("cam_tool_get", { id: "TL001" });
  assert(r.id === "TL001", "T15.1 returns TL001");
  assert(r.diameter_mm > 0, "T15.2 has diameter");
  assert(r.vendor !== undefined, "T15.3 has vendor");
}

// ─── T16: cam_tool_get — not found ──────────────────────────────────────────
console.log("T16: cam_tool_get — not found");
{
  const r = camIntegration("cam_tool_get", { id: "NONEXISTENT" });
  assert(r.error !== undefined || r.id === undefined, "T16.1 returns error or null for missing tool");
}

// ─── T17: cam_systems — list supported systems ──────────────────────────────
console.log("T17: cam_systems — supported systems");
{
  const r = camIntegration("cam_systems", {});
  assert(Array.isArray(r.systems), "T17.1 systems is array");
  assert(r.systems.length >= 3, "T17.2 at least 3 systems");
  const names = r.systems.map((s: any) => s.id || s.name || s);
  assert(names.includes("fusion360") || names.some((n: string) => n.includes("fusion")), "T17.3 includes fusion360");
  assert(names.includes("mastercam") || names.some((n: string) => n.includes("mastercam")), "T17.4 includes mastercam");
}

// ─── T18: Direct API — searchToolLibrary ────────────────────────────────────
console.log("T18: Direct API — searchToolLibrary");
{
  const tools = searchToolLibrary("end");
  assert(tools.length >= 1, "T18.1 found end mill tools");
}

// ─── T19: Direct API — getToolFromLibrary ───────────────────────────────────
console.log("T19: Direct API — getToolFromLibrary");
{
  const tool = getToolFromLibrary("TL002");
  assert(tool !== null, "T19.1 found TL002");
  assert(tool!.id === "TL002", "T19.2 correct id");
}

// ─── T20: Direct API — getAllTools ──────────────────────────────────────────
console.log("T20: Direct API — getAllTools");
{
  const all = getAllTools();
  assert(all.length >= 5, "T20.1 at least 5 tools");
}

// ─── T21: cam_recommend — all operation types ───────────────────────────────
console.log("T21: cam_recommend — multiple operation types");
{
  const ops: string[] = ["roughing", "finishing", "drilling", "pocketing", "profiling"];
  for (const op of ops) {
    const r = camIntegration("cam_recommend", {
      material: "steel",
      operation: op,
      tool_diameter_mm: 10,
    });
    assert(r.recommended.rpm > 0, `T21 ${op} has rpm > 0`);
    assert(r.recommended.feed_mmmin > 0, `T21 ${op} has feed > 0`);
  }
}

// ─── T22: cam_export — all format systems ───────────────────────────────────
console.log("T22: cam_export — all format systems");
{
  const systems = ["fusion360", "mastercam", "generic"];
  for (const sys of systems) {
    const r = camIntegration("cam_export", {
      material: "aluminum",
      operation: "roughing",
      tool_diameter_mm: 10,
      target_system: sys,
    });
    assert(typeof r.content === "string" && r.content.length > 0, `T22 ${sys} has content`);
  }
}

// ─── T23: cam_recommend — stainless material ────────────────────────────────
console.log("T23: cam_recommend — stainless");
{
  const r = camIntegration("cam_recommend", {
    material: "stainless",
    operation: "roughing",
    tool_diameter_mm: 10,
  });
  // Stainless Vc=120, D=10 → RPM ≈ 3820
  assert(r.recommended.rpm > 3500 && r.recommended.rpm < 4200, "T23.1 rpm range for stainless");
}

// ─── T24: Edge — missing params ─────────────────────────────────────────────
console.log("T24: Edge — missing params");
{
  const r = camIntegration("cam_recommend", {});
  assert(r.error !== undefined || r.recommended !== undefined, "T24.1 handles missing params gracefully");
}

// ─── T25: Edge — unknown action ─────────────────────────────────────────────
console.log("T25: Edge — unknown action");
{
  const r = camIntegration("cam_nonexistent", {});
  assert(r.error !== undefined, "T25.1 unknown action returns error");
}

// ─── Summary ────────────────────────────────────────────────────────────────
console.log(`\n${"=".repeat(60)}`);
console.log(`R9-MS1 CAM Integration: ${passed} passed, ${failed} failed out of ${passed + failed}`);
console.log(`${"=".repeat(60)}`);
process.exit(failed > 0 ? 1 : 0);
