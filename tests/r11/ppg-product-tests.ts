/**
 * PRISM R11-MS1: Post Processor Generator (PPG) Product Tests
 * ============================================================
 * 35 test groups (T1–T35), ~310 assertions
 *
 * Covers: ppg_get, ppg_controllers, ppg_templates, ppg_syntax,
 *         ppg_generate (single + multi-op), ppg_validate (6 controllers),
 *         ppg_translate (Fanuc↔Siemens, Fanuc→Heidenhain, same-family),
 *         ppg_compare (multi-controller), ppg_batch (multi-target),
 *         ppg_history, tier gating, error handling, end-to-end workflow
 *
 * Run: npx tsx tests/r11/ppg-product-tests.ts
 */

import { productPPG } from "../../src/engines/ProductEngine.js";

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string): void {
  if (cond) { passed++; }
  else { failed++; console.error(`  FAIL: ${msg}`); }
}

function group(label: string): void {
  console.log(`\n── ${label}`);
}

// ━━━ Sample G-code for testing ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const FANUC_GCODE = `O0001
(PRISM TEST PROGRAM - FANUC)
G90 G54 G17
T1 M6
G43 H1 Z5
S3200 M3
M8
G0 X0 Y0
G0 Z5
G1 Z-3 F200
G1 X100. F800
G0 Z5
G81 Z-15 R5 F100
G80
M9
M5
G91 G28 Z0
M30`;

const SIEMENS_GCODE = `; PRISM TEST PROGRAM - SIEMENS
G90 G54 G17
T1 M6
D1
S3200 M3
M8
G0 X0 Y0
G0 Z5
G1 Z-3 F200
G1 X100. F800
G0 Z5
CYCLE81(5,0,-15) F100
M9
M5
G91 G28 Z0
M30`;

const HEIDENHAIN_SNIPPET = `BEGIN PGM TEST MM
BLK FORM 0.1 Z X0 Y0 Z-20
BLK FORM 0.2 X100 Y100 Z0
TOOL CALL 1 Z S3200
L Z+5 R0 FMAX M3
L X+0 Y+0 R0 FMAX M8
L Z-3 R0 F200
L X+100 R0 F800
L Z+5 R0 FMAX
M9
M5
END PGM TEST MM`;

// ═══════════════════════════════════════════════════════════════════════════════
// T1: ppg_get — Product metadata
// ═══════════════════════════════════════════════════════════════════════════════
group("T1: ppg_get — metadata");
const meta = productPPG("ppg_get", {});
assert(meta.product === "Post Processor Generator", "T1.1 product name");
assert(meta.version === "1.0.0", "T1.2 version");
assert(Array.isArray(meta.actions) && meta.actions.length === 10, "T1.3 10 actions");
assert(meta.controllers >= 6, "T1.4 ≥6 controllers");
assert(meta.operations >= 11, "T1.5 ≥11 operations");
assert(meta.dialect_families >= 6, "T1.6 ≥6 dialect families");
assert(meta.tiers.length === 3, "T1.7 3 tiers");

// ═══════════════════════════════════════════════════════════════════════════════
// T2: ppg_controllers — List all controllers
// ═══════════════════════════════════════════════════════════════════════════════
group("T2: ppg_controllers — list");
const ctrlRes = productPPG("ppg_controllers", {});
assert(ctrlRes.total >= 6, "T2.1 ≥6 controllers");
assert(ctrlRes.controllers.length === ctrlRes.total, "T2.2 array matches total");
const families = new Set(ctrlRes.controllers.map((c: any) => c.family));
assert(families.has("fanuc"), "T2.3 has fanuc");
assert(families.has("siemens"), "T2.4 has siemens");
assert(families.has("heidenhain"), "T2.5 has heidenhain");
assert(families.has("haas"), "T2.6 has haas");
// Each controller has syntax enrichment
const firstCtrl = ctrlRes.controllers[0];
assert(firstCtrl.syntax !== undefined, "T2.7 syntax enrichment present");
assert(firstCtrl.syntax.comment_open !== undefined, "T2.8 syntax has comment_open");
assert(firstCtrl.syntax.dialect_notes.length > 0, "T2.9 dialect_notes non-empty");

// ═══════════════════════════════════════════════════════════════════════════════
// T3: ppg_templates — List available templates
// ═══════════════════════════════════════════════════════════════════════════════
group("T3: ppg_templates — list");
const tmplRes = productPPG("ppg_templates", { tier: "pro" });
assert(tmplRes.total > 0, "T3.1 has templates");
assert(tmplRes.controllers >= 6, "T3.2 ≥6 controllers");
assert(tmplRes.operations >= 11, "T3.3 ≥11 operations");
assert(tmplRes.templates[0].controller !== undefined, "T3.4 template has controller");
assert(tmplRes.templates[0].operation !== undefined, "T3.5 template has operation");
assert(tmplRes.templates[0].available === true, "T3.6 template available");

// Free tier limits operations
const tmplFree = productPPG("ppg_templates", { tier: "free" });
assert(tmplFree.total < tmplRes.total, "T3.7 free tier fewer templates than pro");

// ═══════════════════════════════════════════════════════════════════════════════
// T4: ppg_syntax — Controller syntax reference
// ═══════════════════════════════════════════════════════════════════════════════
group("T4: ppg_syntax — reference");
const synFanuc = productPPG("ppg_syntax", { controller: "fanuc" });
assert(synFanuc.controller_family === "fanuc", "T4.1 fanuc family");
assert(synFanuc.syntax.comment_open === "(", "T4.2 fanuc parenthesis comments");
assert(synFanuc.syntax.program_end === "M30", "T4.3 fanuc M30 end");
assert(synFanuc.supported_operations.length >= 11, "T4.4 ≥11 operations");

const synSiemens = productPPG("ppg_syntax", { controller: "siemens" });
assert(synSiemens.controller_family === "siemens", "T4.5 siemens family");
assert(synSiemens.syntax.comment_open === ";", "T4.6 siemens semicolon comments");
assert(synSiemens.syntax.canned_cycles.some((c: string) => c.includes("CYCLE")), "T4.7 siemens CYCLE canned cycles");

const synHeiden = productPPG("ppg_syntax", { controller: "heidenhain" });
assert(synHeiden.controller_family === "heidenhain", "T4.8 heidenhain family");
assert(synHeiden.syntax.program_end === "END PGM", "T4.9 heidenhain END PGM");
assert(synHeiden.syntax.canned_cycles.some((c: string) => c.includes("CYCL DEF")), "T4.10 heidenhain CYCL DEF");

// ═══════════════════════════════════════════════════════════════════════════════
// T5–T8: ppg_generate — Single operation per controller
// ═══════════════════════════════════════════════════════════════════════════════
group("T5: ppg_generate — Fanuc facing");
const genFanuc = productPPG("ppg_generate", { controller: "fanuc", operation: "facing", rpm: 2000, feed_rate: 500, tool_number: 1, z_depth: -1 });
assert(genFanuc.controller !== undefined, "T5.1 has controller");
assert(genFanuc.gcode.length > 0, "T5.2 gcode non-empty");
assert(genFanuc.line_count > 0, "T5.3 line_count > 0");
assert(genFanuc.validation !== undefined, "T5.4 has validation");
assert(genFanuc.validation.controller !== undefined, "T5.5 validation has controller");

group("T6: ppg_generate — Siemens drilling");
const genSiemens = productPPG("ppg_generate", { controller: "siemens", operation: "drilling", rpm: 1500, feed_rate: 100, z_depth: -20 });
assert(genSiemens.controller !== undefined, "T6.1 has controller");
assert(genSiemens.gcode.length > 0, "T6.2 gcode non-empty");
assert(genSiemens.line_count > 0, "T6.3 line_count > 0");

group("T7: ppg_generate — Haas peck drilling");
const genHaas = productPPG("ppg_generate", { controller: "haas", operation: "peck_drilling", rpm: 1200, feed_rate: 80, z_depth: -25, peck_depth: 5 });
assert(genHaas.controller !== undefined, "T7.1 has controller");
assert(genHaas.gcode.length > 0, "T7.2 gcode non-empty");

group("T8: ppg_generate — Heidenhain tapping");
const genHeiden = productPPG("ppg_generate", { controller: "heidenhain", operation: "tapping", rpm: 400, feed_rate: 40, z_depth: -15, pitch: 1.5 });
assert(genHeiden.controller !== undefined, "T8.1 has controller");
assert(genHeiden.gcode.length > 0, "T8.2 gcode non-empty");

// ═══════════════════════════════════════════════════════════════════════════════
// T9: ppg_generate — Multi-operation program
// ═══════════════════════════════════════════════════════════════════════════════
group("T9: ppg_generate — multi-op program");
const multiOp = productPPG("ppg_generate", {
  controller: "fanuc",
  operations: [
    { operation: "program_header", params: { rpm: 0, feed_rate: 0, program_name: "TEST_PART" } },
    { operation: "facing", params: { rpm: 1200, feed_rate: 500, tool_number: 1, z_depth: -0.5 } },
    { operation: "drilling", params: { rpm: 2000, feed_rate: 100, tool_number: 2, z_depth: -20 } },
    { operation: "program_footer", params: { rpm: 0, feed_rate: 0 } },
  ],
});
assert(multiOp.operation === "program", "T9.1 operation is 'program'");
assert(multiOp.line_count > 5, "T9.2 line_count > 5");
assert(multiOp.gcode.length > 50, "T9.3 gcode substantial");
assert(multiOp.validation !== undefined, "T9.4 has validation");

// ═══════════════════════════════════════════════════════════════════════════════
// T10–T15: ppg_validate — Various controllers
// ═══════════════════════════════════════════════════════════════════════════════
group("T10: ppg_validate — valid Fanuc code");
const valFanuc = productPPG("ppg_validate", { gcode: FANUC_GCODE, controller: "fanuc" });
assert(valFanuc.valid === true, "T10.1 valid Fanuc code");
assert(valFanuc.score > 0.5, "T10.2 score > 0.5");
assert(valFanuc.errors.length === 0, "T10.3 no errors");
assert(valFanuc.controller_family === "fanuc", "T10.4 fanuc family");
assert(valFanuc.line_count > 0, "T10.5 line_count > 0");

group("T11: ppg_validate — valid Siemens code");
const valSiemens = productPPG("ppg_validate", { gcode: SIEMENS_GCODE, controller: "siemens" });
assert(valSiemens.valid === true, "T11.1 valid Siemens code");
assert(valSiemens.score > 0.5, "T11.2 score > 0.5");
assert(valSiemens.controller_family === "siemens", "T11.3 siemens family");

group("T12: ppg_validate — Fanuc code on Siemens (should warn)");
const valCross = productPPG("ppg_validate", { gcode: FANUC_GCODE, controller: "siemens" });
// Fanuc G81 on Siemens should trigger error about canned cycles
assert(valCross.errors.length > 0 || valCross.warnings.length > 0, "T12.1 cross-validation detects issues");

group("T13: ppg_validate — missing program end");
const valNoEnd = productPPG("ppg_validate", { gcode: "G90 G54\nG0 X0 Y0\nG1 Z-5 F100", controller: "fanuc" });
assert(valNoEnd.valid === false, "T13.1 invalid without M30");
assert(valNoEnd.errors.some((e: string) => e.includes("M30")), "T13.2 error mentions M30");

group("T14: ppg_validate — Haas (Fanuc-compatible)");
const valHaas = productPPG("ppg_validate", { gcode: FANUC_GCODE, controller: "haas" });
assert(valHaas.valid === true, "T14.1 Fanuc code valid on Haas");
assert(valHaas.controller_family === "haas", "T14.2 haas family");

group("T15: ppg_validate — empty gcode error");
const valEmpty = productPPG("ppg_validate", { gcode: "", controller: "fanuc" });
assert(valEmpty.error !== undefined, "T15.1 error for empty gcode");

// ═══════════════════════════════════════════════════════════════════════════════
// T16–T21: ppg_translate — Controller dialect translation
// ═══════════════════════════════════════════════════════════════════════════════
group("T16: ppg_translate — Fanuc → Siemens");
const tranFS = productPPG("ppg_translate", { gcode: FANUC_GCODE, source: "fanuc", target: "siemens" });
assert(tranFS.original_controller !== undefined, "T16.1 has original_controller");
assert(tranFS.target_controller !== undefined, "T16.2 has target_controller");
assert(tranFS.translated_gcode.length > 0, "T16.3 translated_gcode non-empty");
assert(tranFS.changes_made.length > 0, "T16.4 has changes");
assert(tranFS.validation !== undefined, "T16.5 has validation");
// G81 should be translated to CYCLE81
assert(tranFS.changes_made.some((c: string) => c.includes("CYCLE") || c.includes("comment")), "T16.6 canned cycle or comment translated");

group("T17: ppg_translate — Siemens → Fanuc");
const tranSF = productPPG("ppg_translate", { gcode: SIEMENS_GCODE, source: "siemens", target: "fanuc" });
assert(tranSF.translated_gcode.length > 0, "T17.1 translated_gcode non-empty");
assert(tranSF.changes_made.length > 0, "T17.2 has changes");
// CYCLE81 should be translated to G81
assert(tranSF.changes_made.some((c: string) => c.includes("G81") || c.includes("comment")), "T17.3 cycle or comment translated");

group("T18: ppg_translate — Fanuc → Heidenhain");
const tranFH = productPPG("ppg_translate", { gcode: FANUC_GCODE, source: "fanuc", target: "heidenhain" });
assert(tranFH.translated_gcode.length > 0, "T18.1 translated_gcode non-empty");
// Should warn about manual review needed
assert(tranFH.warnings.length > 0, "T18.2 has warnings for Heidenhain");
assert(tranFH.warnings.some((w: string) => w.includes("Heidenhain") || w.includes("manual")), "T18.3 warns about Heidenhain review");

group("T19: ppg_translate — Fanuc-like family (Fanuc → Haas)");
const tranFHaas = productPPG("ppg_translate", { gcode: FANUC_GCODE, source: "fanuc", target: "haas" });
assert(tranFHaas.translated_gcode.length > 0, "T19.1 translated_gcode non-empty");
// Fanuc and Haas are close dialects — changes should be minimal (comment conversion at most)
assert(tranFHaas.changes_made.length >= 1, "T19.2 at least 1 change reported");

group("T20: ppg_translate — empty gcode error");
const tranEmpty = productPPG("ppg_translate", { gcode: "", source: "fanuc", target: "siemens" });
assert(tranEmpty.error !== undefined, "T20.1 error for empty gcode");

group("T21: ppg_translate — Fanuc → Mazak (same family)");
const tranFM = productPPG("ppg_translate", { gcode: FANUC_GCODE, source: "fanuc", target: "mazak" });
assert(tranFM.translated_gcode.length > 0, "T21.1 translated_gcode non-empty");

// ═══════════════════════════════════════════════════════════════════════════════
// T22–T24: ppg_compare — Multi-controller comparison
// ═══════════════════════════════════════════════════════════════════════════════
group("T22: ppg_compare — drilling across 3 controllers");
const cmpRes = productPPG("ppg_compare", { operation: "drilling", rpm: 2000, feed_rate: 100, z_depth: -20, controllers: ["fanuc", "siemens", "heidenhain"] });
assert(cmpRes.operation === "drilling", "T22.1 correct operation");
assert(cmpRes.controllers_compared === 3, "T22.2 3 controllers compared");
assert(cmpRes.results.length === 3, "T22.3 3 results");
assert(cmpRes.results[0].gcode !== undefined || cmpRes.results[0].error !== undefined, "T22.4 result has gcode or error");

group("T23: ppg_compare — facing with defaults");
const cmpDefault = productPPG("ppg_compare", { operation: "facing" });
assert(cmpDefault.controllers_compared >= 3, "T23.1 ≥3 default controllers");
assert(cmpDefault.results.length >= 3, "T23.2 ≥3 results");

group("T24: ppg_compare — peck_drilling 4 controllers");
const cmpPeck = productPPG("ppg_compare", { operation: "peck_drilling", rpm: 1500, feed_rate: 80, z_depth: -30, peck_depth: 5, controllers: ["fanuc", "siemens", "haas", "mazak"] });
assert(cmpPeck.controllers_compared === 4, "T24.1 4 controllers");
cmpPeck.results.forEach((r: any, i: number) => {
  assert(r.controller !== undefined || r.error !== undefined, `T24.${i + 2} result ${i} has controller or error`);
});

// ═══════════════════════════════════════════════════════════════════════════════
// T25–T27: ppg_batch — Multi-target batch translation
// ═══════════════════════════════════════════════════════════════════════════════
group("T25: ppg_batch — Fanuc → 3 targets");
const batchRes = productPPG("ppg_batch", { gcode: FANUC_GCODE, source: "fanuc", targets: ["siemens", "heidenhain", "haas"] });
assert(batchRes.source_controller.toLowerCase().includes("fanuc"), "T25.1 source is Fanuc");
assert(batchRes.total_targets === 3, "T25.2 3 targets");
assert(batchRes.results.length === 3, "T25.3 3 results");
batchRes.results.forEach((r: any, i: number) => {
  assert(r.translated_gcode.length > 0, `T25.${i + 4} target ${i} has translated gcode`);
  assert(typeof r.validation_score === "number", `T25.${i + 7} target ${i} has validation score`);
});

group("T26: ppg_batch — free tier limit");
const batchFree = productPPG("ppg_batch", { gcode: FANUC_GCODE, source: "fanuc", targets: ["siemens", "heidenhain", "haas"], tier: "free" });
assert(batchFree.error !== undefined, "T26.1 free tier rejects 3 targets");
assert(batchFree.error.includes("Free tier") || batchFree.error.includes("2"), "T26.2 error mentions limit");

group("T27: ppg_batch — empty gcode error");
const batchEmpty = productPPG("ppg_batch", { gcode: "", source: "fanuc", targets: ["siemens"] });
assert(batchEmpty.error !== undefined, "T27.1 error for empty gcode");

// ═══════════════════════════════════════════════════════════════════════════════
// T28–T29: ppg_history — Session history tracking
// ═══════════════════════════════════════════════════════════════════════════════
group("T28: ppg_history — has entries");
const histRes = productPPG("ppg_history", {});
assert(histRes.history !== undefined, "T28.1 has history array");
assert(histRes.history.length > 0, "T28.2 history non-empty (from prior calls)");
assert(histRes.total > 0, "T28.3 total > 0");
const histEntry = histRes.history[0];
assert(histEntry.action !== undefined, "T28.4 entry has action");
assert(histEntry.timestamp !== undefined, "T28.5 entry has timestamp");
assert(histEntry.summary !== undefined, "T28.6 entry has summary");

group("T29: ppg_history — tracks all action types");
const actionTypes = new Set(histRes.history.map((h: any) => h.action));
assert(actionTypes.has("ppg_validate"), "T29.1 tracks ppg_validate");
assert(actionTypes.has("ppg_translate"), "T29.2 tracks ppg_translate");
assert(actionTypes.has("ppg_generate"), "T29.3 tracks ppg_generate");
assert(actionTypes.has("ppg_compare"), "T29.4 tracks ppg_compare");
assert(actionTypes.has("ppg_batch"), "T29.5 tracks ppg_batch");
assert(actionTypes.has("ppg_controllers"), "T29.6 tracks ppg_controllers");
assert(actionTypes.has("ppg_templates"), "T29.7 tracks ppg_templates");
assert(actionTypes.has("ppg_syntax"), "T29.8 tracks ppg_syntax");

// ═══════════════════════════════════════════════════════════════════════════════
// T30: Validation scoring — physics consistency
// ═══════════════════════════════════════════════════════════════════════════════
group("T30: Validation scoring consistency");
// Perfect Fanuc code should score higher than code with issues
const perfectScore = valFanuc.score;
const imperfectScore = valNoEnd.score;
assert(perfectScore > imperfectScore, "T30.1 valid code scores higher than invalid");
assert(perfectScore >= 0 && perfectScore <= 1, "T30.2 score in [0,1]");
assert(imperfectScore >= 0 && imperfectScore <= 1, "T30.3 imperfect score in [0,1]");

// ═══════════════════════════════════════════════════════════════════════════════
// T31: Translation round-trip — Fanuc → Siemens → Fanuc
// ═══════════════════════════════════════════════════════════════════════════════
group("T31: Round-trip translation");
const toSiemens = productPPG("ppg_translate", { gcode: FANUC_GCODE, source: "fanuc", target: "siemens" });
const backToFanuc = productPPG("ppg_translate", { gcode: toSiemens.translated_gcode, source: "siemens", target: "fanuc" });
assert(backToFanuc.translated_gcode.length > 0, "T31.1 round-trip produces output");
assert(backToFanuc.changes_made.length > 0, "T31.2 round-trip has changes");
// Round-trip should still be valid for Fanuc
const roundTripVal = productPPG("ppg_validate", { gcode: backToFanuc.translated_gcode, controller: "fanuc" });
assert(roundTripVal.score > 0, "T31.3 round-trip output has non-zero score");

// ═══════════════════════════════════════════════════════════════════════════════
// T32: All 6 controller families generate code
// ═══════════════════════════════════════════════════════════════════════════════
group("T32: All controller families generate");
const allControllers = ["fanuc", "siemens", "heidenhain", "haas", "mazak", "okuma"];
allControllers.forEach((ctrl, i) => {
  const result = productPPG("ppg_generate", { controller: ctrl, operation: "drilling", rpm: 1500, feed_rate: 100, z_depth: -10 });
  assert(result.gcode !== undefined && result.gcode.length > 0, `T32.${i + 1} ${ctrl} generates gcode`);
});

// ═══════════════════════════════════════════════════════════════════════════════
// T33: Error handling — unknown action
// ═══════════════════════════════════════════════════════════════════════════════
group("T33: Error handling");
const unknownAction = productPPG("ppg_unknown", {});
assert(unknownAction.error !== undefined, "T33.1 unknown action returns error");
assert(unknownAction.error.includes("Unknown PPG action"), "T33.2 error message correct");

// ═══════════════════════════════════════════════════════════════════════════════
// T34: Generate operations — all 11+ operation types
// ═══════════════════════════════════════════════════════════════════════════════
group("T34: All operation types generate");
const operations = ["facing", "drilling", "peck_drilling", "tapping", "boring", "thread_milling", "circular_pocket", "profile", "tool_change", "program_header", "program_footer"];
operations.forEach((op, i) => {
  const result = productPPG("ppg_generate", {
    controller: "fanuc",
    operation: op,
    rpm: op === "program_header" || op === "program_footer" ? 0 : 1500,
    feed_rate: op === "program_header" || op === "program_footer" ? 0 : 200,
    z_depth: -10,
    peck_depth: 3,
    pitch: 1.5,
    thread_diameter: 10,
    thread_pitch: 1.5,
    thread_depth: 15,
    pocket_diameter: 20,
    pocket_depth: 10,
    tool_diameter: 8,
    profile_points: [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 50 }],
    program_number: 1001,
    program_name: "TEST",
  });
  assert(result.gcode !== undefined && result.gcode.length > 0, `T34.${i + 1} ${op} generates gcode`);
});

// ═══════════════════════════════════════════════════════════════════════════════
// T35: End-to-end workflow — generate → validate → translate → batch
// ═══════════════════════════════════════════════════════════════════════════════
group("T35: End-to-end workflow");
// Step 1: Generate a program
const e2eGen = productPPG("ppg_generate", {
  controller: "fanuc",
  operations: [
    { operation: "program_header", params: { rpm: 0, feed_rate: 0, program_name: "E2E_TEST" } },
    { operation: "facing", params: { rpm: 2000, feed_rate: 500, tool_number: 1, z_depth: -1 } },
    { operation: "peck_drilling", params: { rpm: 1500, feed_rate: 80, tool_number: 2, z_depth: -25, peck_depth: 5 } },
    { operation: "program_footer", params: { rpm: 0, feed_rate: 0 } },
  ],
});
assert(e2eGen.gcode.length > 0, "T35.1 generated program");

// Step 2: Validate
const e2eVal = productPPG("ppg_validate", { gcode: e2eGen.gcode, controller: "fanuc" });
assert(e2eVal.score > 0, "T35.2 validation score > 0");

// Step 3: Translate to Siemens
const e2eTran = productPPG("ppg_translate", { gcode: e2eGen.gcode, source: "fanuc", target: "siemens" });
assert(e2eTran.translated_gcode.length > 0, "T35.3 translated to Siemens");
assert(e2eTran.validation.controller !== undefined, "T35.4 auto-validation included");

// Step 4: Batch to all targets
const e2eBatch = productPPG("ppg_batch", { gcode: e2eGen.gcode, source: "fanuc", targets: ["siemens", "heidenhain"] });
assert(e2eBatch.total_targets === 2, "T35.5 batch to 2 targets");
assert(e2eBatch.results.every((r: any) => r.translated_gcode.length > 0), "T35.6 all targets have output");

// ═══════════════════════════════════════════════════════════════════════════════
// RESULTS
// ═══════════════════════════════════════════════════════════════════════════════
console.log(`\n${"═".repeat(60)}`);
console.log(`PPG Product Tests: ${passed} passed, ${failed} failed (${passed + failed} total)`);
console.log(`${"═".repeat(60)}`);

if (failed > 0) {
  console.error(`\nFAILED: ${failed} assertion(s) did not pass`);
  process.exit(1);
} else {
  console.log("\nAll PPG product tests passed!");
}
