/**
 * quoting-baseline-bootstrap.filter — iter9 unit test for extended NON_CUSTOMER_SUBDIRS regex.
 *
 * yolo-iter8 scan-archive surfaced "POST PROCESSORS" and "_PART LIBRARY" still
 * leaking through as fake customers. This test pins the iter9 extended filter +
 * the always-on customer-name positive cases so we never regress either direction.
 *
 * Run: node --test scripts/quoting-baseline-bootstrap.filter.test.mjs
 *
 * @milestone QUOTING-SYNERGY-MS0/U-QP-BOOTSTRAP-FILTER-EXTEND (charlie /goal-yolo iter9)
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { isLikelyCustomer, extractCustomer } from "./quoting-baseline-bootstrap.mjs";

// ---------- iter35: archive-walk-surfaced patterns (must reject) ----------
const ITER35_NEW_REJECTS = [
  "PRISM MODIFIED POST PROCESSORS",
  "PRISM_MODIFIED_POST_PROCESSORS",
  "PRISM-MODIFIED-POST-PROCESSORS",
  "HURCO CNC PROGRAMS",
  "HURCO-CNC-PROGRAMS",
  "HURCO_CNC_PROGRAMS",
  "CNC PROGRAMS",
  "CNC PROGRAM",
  "PROGRAMS",
  "PROGRAM",
];

// ---------- iter35: regression guard — customer names containing
// noise-substrings must STILL be accepted (no false-positive from regex
// extension). The conservative-alternates approach preserves the ^...$
// whole-segment anchor so substrings don't trigger.
const ITER35_MUST_STILL_ACCEPT = [
  "ALCOA POST OFFICE",        // contains "POST"
  "DOC HOLLIDAY",             // contains "DOC"
  "REFERENCE PARTS INC",      // starts with "REFERENCE"
  "PROGRAMA",                 // substring of "PROGRAM"
  "POSTAL SERVICES",          // contains "POSTAL"/"POSTS" substring
  "MANUAL DEXTERITY CORP",    // contains "MANUAL"
];

// ---------- iter40: NUMBERED-PRISM / workflow-stage non-customer dirs ----------
const ITER40_NUMBERED_PRISM_REJECTS = [
  "2. PRISM ENHANCED",     // iter39 live leakage
  "1. PRISM ORIGINAL",
  "3. PRISM REVISION",
  "PRISM CAD TESTING",     // iter34/iter38 leakage
  "PRISM ENHANCED",
  "PRISM MODIFIED",
  "PRISM TESTING",
  "PRISM DEV",
  "PRISM WIP",
  "PRISM DRAFT",
  "ORIGINAL",
  "REVISION",
  "REV 1",
  "WORKING COPY",
  "VERSION",
  "V1",
  "V2",
  "DRAFTS",
];

const ITER40_NUMBERED_PRISM_MUST_STILL_ACCEPT = [
  "Prismatic Industries",  // contains PRISM but not in the workflow-stage list
  "Vision Tech LLC",       // contains VISION substring; should still accept
  "Original Equipment Mfg", // contains ORIGINAL but compound name
  "PRISM PRECISION INC",   // hypothetical real customer with PRISM in name (compound)
  "DRAFT MASTERS LLC",     // contains DRAFT but compound name
];

// ---------- iter37 (b): MACHINE-COMPOUND non-customer dirs (must reject) ----------
const ITER37_MACHINE_REJECTS = [
  "WIRE EDM",            // iter37 live leakage
  "CNC OKUMA MULTUS",    // iter37 live leakage
  "CNC MILL HAAS",
  "HAAS-HURCO",
  "ROKU-ROKU",
  "OKUMA",
  "CNC LATHE",           // already worked but anchor it
  "MAZAK",
  "MATSUURA",
];

// ---------- iter37: HYBRID-NON-CUSTOMER (must reject) — `<name> programs?` patterns ----------
const ITER37_HYBRID_REJECTS = [
  "MATTHEW programs",       // primary iter34 leakage
  "Matthew Programs",       // case-insensitive
  "John Smith programs",
  "JM Die macros",          // <name> macros
  "Old setups",             // <name> setups
  "Reference manuals",      // <name> manuals
  "Project templates",
  "Legacy library",         // <name> library (singular)
  "Old libraries",
];

// ---------- iter37: anti-false-positive — real customers with these words mid-name ----------
const ITER37_HYBRID_MUST_STILL_ACCEPT = [
  "Acme Corp",
  "Holo-Krome",
  "ACUMENT GLOBAL TECHNOLOGIES",
  "AIR INDUSTRIES COMPANY",       // contains AIR but not ending in noise word
  "MANUFACTURING PROGRAMS LLC",   // PROGRAMS is mid-name not trailing
  "TEMPLATE INDUSTRIES",          // TEMPLATE prefix not trailing
];

// ---------- iter9: NEW non-customer patterns (must reject) ----------
const ITER9_NEW_REJECTS = [
  "POST PROCESSORS",
  "Post Processors",
  "post processors",
  "POSTPROCESSORS",
  "POST-PROCESSORS",
  "POST_PROCESSORS",
  "POSTS",
  "POST",
  "_PART LIBRARY",
  "PART LIBRARY",
  "Part Library",
  "PART_LIBRARY",
  "PART-LIBRARY",
  "PART LIBRARIES",
  "LIBRARY",
  "LIBRARIES",
  "MACROS",
  "MACRO",
  "TEMPLATES",
  "TEMPLATE",
  "MASTERS",
  "MASTER",
  "SETUPS",
  "SETUP",
  "SAMPLES",
  "SAMPLE",
  "EXAMPLES",
  "REFERENCE",
  "REFERENCES",
  "DOCS",
  "DOC",
  "DOCUMENTATION",
  "MANUALS",
  "MANUAL",
  "TUTORIALS",
  "TRAININGS",
  "TRAINING",
  "MISC",
  "MISCELLANEOUS",
  "_LIBRARY",
  "_MACROS",
  "_TEMPLATES",
];

// ---------- pre-iter9 non-customer patterns (must still reject — anti-regression) ----------
const LEGACY_REJECTS = [
  "MILL",
  "CNC MILL",
  "CNC-MILL",
  "LATHE",
  "WIRE",
  "EDM",
  "WEDM",
  "SINKER",
  "GRINDER",
  "AIR",
  "UTILITY",
  "TOOLING",
  "TOOL ROOM",
  "TOOL_ROOM",
  "FIXTURES",
  "FIXTURE",
  "GAGES",
  "GAGE",
  "SCRAP",
  "ARCHIVE",
  "OLD",
  "BACKUP",
  "TEMP",
  "TEST",
];

// ---------- positive: real JM Die customer-name shape (must accept) ----------
const REAL_CUSTOMERS = [
  "ALCOA",
  "ITW",
  "BRADY",
  "OPTIMAS",
  "SFS",
  "HOLO-KROME",
  "MATTHEW",
  "FONTANA",
  "ATF",
  "Acme",
  "Acme-Corp",
  "Some_Customer",
  "Customer 123",
];

// ---------- variability + edge cases ----------
test("iter35 rejects PRISM-MODIFIED / HURCO-CNC / PROGRAMS variants (archive-walk findings)", () => {
  for (const seg of ITER35_NEW_REJECTS) {
    assert.equal(
      isLikelyCustomer(seg),
      false,
      `iter35 regression: "${seg}" should be rejected as non-customer`,
    );
  }
});

test("iter35 anti-false-positive: customer names containing noise-substrings still accepted", () => {
  for (const seg of ITER35_MUST_STILL_ACCEPT) {
    assert.equal(
      isLikelyCustomer(seg),
      true,
      `false-positive regression: "${seg}" must remain a valid customer (regex extension must not loosen anchors)`,
    );
  }
});

test("iter35 path extract: PRISM MODIFIED POST PROCESSORS layered before real customer resolves to customer", () => {
  assert.equal(
    extractCustomer("H:/PRISM/JM DIE/PRISM MODIFIED POST PROCESSORS/ALCOA/p1.MIN"),
    "ALCOA",
    "must skip PRISM MODIFIED POST PROCESSORS and find ALCOA deeper in tree",
  );
});

test("iter35 path extract: HURCO CNC PROGRAMS layered before real customer resolves to customer", () => {
  assert.equal(
    extractCustomer("H:/PRISM/JM DIE/HURCO CNC PROGRAMS/ITW/p2.NC"),
    "ITW",
    "must skip HURCO CNC PROGRAMS and find ITW deeper in tree",
  );
});

test("iter40 rejects numbered-prefix PRISM-* + workflow-stage subdirs", () => {
  for (const seg of ITER40_NUMBERED_PRISM_REJECTS) {
    assert.equal(
      isLikelyCustomer(seg),
      false,
      `iter40: "${seg}" should be rejected — it's an operator working/staging dir, not a customer`,
    );
  }
});

test("iter40 anti-false-positive: compound names with PRISM/VISION/ORIGINAL/DRAFT substring still accept", () => {
  for (const seg of ITER40_NUMBERED_PRISM_MUST_STILL_ACCEPT) {
    assert.equal(
      isLikelyCustomer(seg),
      true,
      `iter40 false-positive: "${seg}" must remain a valid customer`,
    );
  }
});

test("iter37 rejects machine-compound names (WIRE EDM, CNC OKUMA MULTUS, HAAS-HURCO, etc.)", () => {
  for (const seg of ITER37_MACHINE_REJECTS) {
    assert.equal(
      isLikelyCustomer(seg),
      false,
      `iter37 machine regression: "${seg}" should be rejected — it's a machine-class top-level collection holding customer subdirs at depth=2`,
    );
  }
});

test("iter37 rejects `<name> programs?` and similar hybrid patterns", () => {
  for (const seg of ITER37_HYBRID_REJECTS) {
    assert.equal(
      isLikelyCustomer(seg),
      false,
      `iter37: "${seg}" should be rejected as hybrid-non-customer (trailing programs/macros/setups/templates/manuals/library)`,
    );
  }
});

test("iter37 anti-false-positive: real customers with similar substrings must still accept", () => {
  for (const seg of ITER37_HYBRID_MUST_STILL_ACCEPT) {
    assert.equal(
      isLikelyCustomer(seg),
      true,
      `iter37 false-positive: "${seg}" must remain a valid customer`,
    );
  }
});

test("iter37 path extract: JM DIE/MATTHEW programs/foo.MIN does NOT map to MATTHEW programs", () => {
  const r = extractCustomer("H:/PRISM/JM DIE/MATTHEW programs/foo.MIN");
  assert.notEqual(r, "MATTHEW programs", "iter37: MATTHEW programs must not leak as customer");
});

test("iter9 rejects POST PROCESSORS variants", () => {
  for (const seg of ITER9_NEW_REJECTS) {
    assert.equal(
      isLikelyCustomer(seg),
      false,
      `iter9 regression: "${seg}" should be rejected as non-customer`,
    );
  }
});

test("legacy iter7/iter8 non-customer patterns still rejected", () => {
  for (const seg of LEGACY_REJECTS) {
    assert.equal(
      isLikelyCustomer(seg),
      false,
      `anti-regression: "${seg}" should still be rejected`,
    );
  }
});

test("real customer names still accepted (no false-negative drift)", () => {
  for (const seg of REAL_CUSTOMERS) {
    assert.equal(
      isLikelyCustomer(seg),
      true,
      `false-negative: "${seg}" should be accepted as customer`,
    );
  }
});

test("edge: empty / short / long / non-string segments rejected", () => {
  assert.equal(isLikelyCustomer(""), false, "empty string");
  assert.equal(isLikelyCustomer("A"), false, "1-char too short");
  assert.equal(isLikelyCustomer("X".repeat(51)), false, "51-char too long");
  assert.equal(isLikelyCustomer(null), false, "null");
  assert.equal(isLikelyCustomer(undefined), false, "undefined");
  assert.equal(isLikelyCustomer(123), false, "number");
  assert.equal(isLikelyCustomer({}), false, "object");
});

test("boundary: 2-char accepted, 50-char accepted", () => {
  assert.equal(isLikelyCustomer("AB"), true, "2 chars is boundary-OK");
  assert.equal(isLikelyCustomer("X".repeat(50)), true, "50 chars is boundary-OK");
});

// ---------- extractCustomer integration: BOTH JM path layouts ----------
test("extractCustomer: layout A — JM DIE/CNC MILL/ALCOA/p1.MIN", () => {
  assert.equal(
    extractCustomer("H:/PRISM/JM DIE/CNC MILL/ALCOA/p1.MIN"),
    "ALCOA",
  );
});

test("extractCustomer: layout B — JM DIE/ALCOA/CNC MILL/p1.MIN", () => {
  assert.equal(
    extractCustomer("H:/PRISM/JM DIE/ALCOA/CNC MILL/p1.MIN"),
    "ALCOA",
  );
});

test("extractCustomer: iter9 — JM DIE/POST PROCESSORS/foo.MIN no longer maps to POST PROCESSORS", () => {
  // No real customer further down — should fall through and return undefined,
  // NOT return "POST PROCESSORS" as a fake customer.
  const r = extractCustomer("H:/PRISM/JM DIE/POST PROCESSORS/foo.MIN");
  assert.notEqual(r, "POST PROCESSORS", "must not leak POST PROCESSORS as customer");
});

test("extractCustomer: iter9 — JM DIE/_PART LIBRARY/wire/p.MIN no longer maps to _PART LIBRARY", () => {
  const r = extractCustomer("H:/PRISM/JM DIE/_PART LIBRARY/WIRE/p.MIN");
  assert.notEqual(r, "_PART LIBRARY");
  assert.notEqual(r, "WIRE");
});

test("extractCustomer: iter9 — POST PROCESSORS layered AHEAD of real customer resolves to customer", () => {
  assert.equal(
    extractCustomer("H:/PRISM/JM DIE/POST PROCESSORS/ALCOA/foo.MIN"),
    "ALCOA",
    "must skip POST PROCESSORS and find ALCOA",
  );
});

test("extractCustomer: case-insensitive — Post Processors / part library", () => {
  const r = extractCustomer("H:/PRISM/JM DIE/Post Processors/foo.MIN");
  assert.notEqual(r, "Post Processors");
  const r2 = extractCustomer("H:/PRISM/JM DIE/part library/foo.MIN");
  assert.notEqual(r2, "part library");
});

test("extractCustomer: returns undefined when path doesn't contain JM DIE", () => {
  assert.equal(extractCustomer("H:/random/path/foo.MIN"), undefined);
});

test("extractCustomer: handles backslash Windows paths", () => {
  assert.equal(
    extractCustomer("H:\\PRISM\\JM DIE\\ALCOA\\p1.MIN"),
    "ALCOA",
  );
});

test("extractCustomer: non-string input returns undefined (adversarial)", () => {
  assert.equal(extractCustomer(null), undefined);
  assert.equal(extractCustomer(undefined), undefined);
  assert.equal(extractCustomer(123), undefined);
  assert.equal(extractCustomer({}), undefined);
});

// ============================================================================
// iter41 (slot:charlie 2026-05-26) — close iter40 regen R12 findings.
// QUOTING-SYNERGY-MS0/U-QP-EXTEND-NON-CUSTOMER-FILTERS-V3.
//
// iter40 NUMBERED_PRISM_NON_CUSTOMER + earlier filters caught:
//   - "2. PRISM ENHANCED" (numbered-PRISM) — 0 leaks post-iter40 ✓
//   - "POST PROCESSORS" (utility dir) — 0 leaks ✓
// iter40 regen surfaced NEW R12 finding classes:
//   - "TRIBAL + WIKI" (15 records — internal corpus assembly dir)
//   - "TOOLING CAD FILES" (9 records — CAD library)
//   - "OldVersions" (camel-case version archive)
//   - "CHAT-GPT TEST PROMPT PARTS" (LLM regression fixtures)
//   - "mill-turn" (hyphenated machine-class — iter37 MACHINE_NON_CUSTOMER
//     pattern caught compound space/underscore separators but missed hyphen
//     + TURN/TURNING trailing alt)
// iter41 adds PROJECT_DIR_NON_CUSTOMER regex + extends MACHINE_NON_CUSTOMER
// trailing alt list. Conservative: specific tokens kept, no broad word lists
// so customer names with "OLD" / "TEST" / "TURN" don't false-positive.
// ============================================================================

const ITER41_NEW_REJECTS = [
  "TRIBAL + WIKI",
  "TRIBAL+WIKI",
  "TRIBAL  +  WIKI",
  "Tribal + Wiki",
  "TRIBAL_WIKI",
  "TOOLING CAD FILES",
  "TOOLING_CAD_FILES",
  "TOOLING-CAD-FILES",
  "tooling cad files",
  "TOOLING CAD FILE",       // singular variant
  "OldVersions",
  "OLD VERSIONS",
  "OLD_VERSIONS",
  "OLD-VERSIONS",
  "Old Version",
  "ARCHIVE COPIES",
  "BACKUP COPIES",
  "CAD FILES",
  "CAD LIBRARY",
  "CAD LIBRARIES",
  "CHAT-GPT TEST PROMPT PARTS",
  "CHAT GPT TEST PROMPT PARTS",
  "CHATGPT TEST PROMPT PARTS",
  "CHAT-GPT PROMPT PARTS",
  "LLM TEST PARTS",
  "TEST PROMPT PARTS",
  "TEST PROMPT PART",
  "TEST FIXTURES",
  "TEST FIXTURE",
  "REGRESSION TEST PARTS",
  "POSTS AND MACHINES",
  "Posts and Machines",
  "POSTS-AND-MACHINES",
  "POST AND MACHINE",
  "MACHINES AND POSTS",
  // iter41 machine-class extension: mill-turn variants
  "mill-turn",
  "MILL-TURN",
  "MILL TURN",
  "MILL_TURN",
  "MILLTURN",
  "lathe-turn",
  "LATHE TURN",
  "CNC MILL-TURN",
  "CNC MILL TURNING",
];

test("iter41: PROJECT_DIR + machine-turn variants all rejected", () => {
  for (const seg of ITER41_NEW_REJECTS) {
    assert.equal(
      isLikelyCustomer(seg),
      false,
      `expected NOT-a-customer for iter41 segment: ${seg}`,
    );
  }
});

// Conservative — these are LEGIT customer names with OLD/TEST/TURN/CAD
// substrings; iter41 must NOT false-positive on them.
const ITER41_FALSE_POSITIVE_GUARDS = [
  "HOLOTEST CORP",        // contains "TEST" but real customer
  "OLDFIELD INDUSTRIES",  // contains "OLD" — real customer
  "TURNTECH PRECISION",   // contains "TURN" — real customer
  "CADWORKS LLC",         // contains "CAD" — real customer
  "ALCOA",                // canonical baseline
  "JM DIE COMPANY",       // canonical real customer
  "AGRATI",
  "FONTANA FASTENERS",
  "AIR INDUSTRIES COMPANY",
];

test("iter41: legitimate customer names with OLD/TEST/TURN/CAD substrings still ADMIT", () => {
  for (const seg of ITER41_FALSE_POSITIVE_GUARDS) {
    assert.equal(
      isLikelyCustomer(seg),
      true,
      `iter41 must admit legitimate customer: ${seg}`,
    );
  }
});

test("iter41: extractCustomer skips PROJECT_DIR segment, finds real customer downstream", () => {
  // JM DIE/TRIBAL + WIKI/<real customer>/file.MIN should resolve to <real customer>
  assert.equal(
    extractCustomer("H:/PRISM/JM DIE/TRIBAL + WIKI/ALCOA/p1.MIN"),
    "ALCOA",
  );
  // JM DIE/CNC MILL/TOOLING CAD FILES/foo.MIN — both segments rejected,
  // falls through (no real customer) → undefined NOT "TOOLING CAD FILES"
  const r = extractCustomer("H:/PRISM/JM DIE/CNC MILL/TOOLING CAD FILES/foo.MIN");
  assert.notEqual(r, "TOOLING CAD FILES");
  assert.notEqual(r, "CNC MILL");
});

test("iter41: extractCustomer rejects MILL-TURN compound machine-class", () => {
  assert.equal(
    extractCustomer("H:/PRISM/JM DIE/MILL-TURN/ALCOA/p1.MIN"),
    "ALCOA",
    "must skip MILL-TURN and find ALCOA",
  );
});

test("iter41: extractCustomer rejects OldVersions camel-case", () => {
  const r = extractCustomer("H:/PRISM/JM DIE/OldVersions/test.MIN");
  assert.notEqual(r, "OldVersions");
});

// ============================================================================
// iter45 (slot:charlie 2026-05-26) — U-QP-BOOTSTRAP-REAL-DEFAULTS.
// QUOTING-SYNERGY-MS0/U-QP-BOOTSTRAP-REAL-DEFAULTS.
//
// Wires the MaterialBridgeEngine's ISO-group cost brackets into the bootstrap
// script so training-time records and runtime quote-time material lookups
// converge on the same defaults. iter45 adds path-based material detection:
// when the filename/path contains explicit material keywords (aluminum,
// inconel, titanium, steel, cast iron, hardened, stainless), the ISO group's
// $/kg drives material spend; falls back to MATERIAL_BY_CLASS otherwise.
// ============================================================================

import { detectMaterialFromPath, deriveRecordDefaults } from "./quoting-baseline-bootstrap.mjs";

const MATERIAL_DETECT_CASES = [
  // ISO-N: non-ferrous (Al, Cu, Brass)
  { path: "H:/PRISM/JM DIE/MILL/ALCOA/aluminum_6061_bracket.MIN", expect_iso: "N" },
  { path: "H:/PRISM/JM DIE/MILL/AGRATI/AL7075-T6-part.MIN", expect_iso: "N" },
  { path: "H:/PRISM/JM DIE/MILL/ALLFAST/brass-fitting.NC", expect_iso: "N" },
  { path: "H:/PRISM/JM DIE/MILL/ITW/copper-busbar.MIN", expect_iso: "N" },
  // ISO-S: superalloys
  { path: "H:/PRISM/JM DIE/MILL/AEROSPACE/inconel_718_blade.MIN", expect_iso: "S" },
  { path: "H:/PRISM/JM DIE/MILL/MEDICAL/titanium_implant.MIN", expect_iso: "S" },
  { path: "H:/PRISM/JM DIE/MILL/AERO/Ti-6Al-4V-bracket.MIN", expect_iso: "S" },
  { path: "H:/PRISM/JM DIE/MILL/HOT-SECTION/hastelloy-X-vane.MIN", expect_iso: "S" },
  // ISO-H: hardened
  { path: "H:/PRISM/JM DIE/MILL/TOOLING/D2_steel_punch.MIN", expect_iso: "H" },
  { path: "H:/PRISM/JM DIE/MILL/DIES/hardened-HRC55-block.MIN", expect_iso: "H" },
  // ISO-M: stainless
  { path: "H:/PRISM/JM DIE/MILL/FOOD/304-stainless-flange.MIN", expect_iso: "M" },
  { path: "H:/PRISM/JM DIE/MILL/CHEM/316-SS-pipe-fitting.MIN", expect_iso: "M" },
  { path: "H:/PRISM/JM DIE/MILL/ASSY/17-4PH-shaft.MIN", expect_iso: "M" },
  // ISO-K: cast iron
  { path: "H:/PRISM/JM DIE/MILL/AUTO/gray-iron-housing.MIN", expect_iso: "K" },
  { path: "H:/PRISM/JM DIE/MILL/HEAVY/ductile-iron-gear.MIN", expect_iso: "K" },
  // ISO-P: steel
  { path: "H:/PRISM/JM DIE/MILL/JOBS/4140-steel-shaft.MIN", expect_iso: "P" },
  { path: "H:/PRISM/JM DIE/MILL/JOBS/1018-mild-steel-plate.MIN", expect_iso: "P" },
];

test("iter45: detectMaterialFromPath classifies all 6 ISO groups from filename keywords", () => {
  for (const c of MATERIAL_DETECT_CASES) {
    const r = detectMaterialFromPath(c.path);
    assert.ok(r, `expected detection for ${c.path}`);
    assert.equal(r.iso, c.expect_iso, `expected ISO-${c.expect_iso} for ${c.path}`);
    assert.ok(r.usd_per_kg > 0, "usd_per_kg must be > 0");
    assert.ok(r.b2f > 1.0, "buy-to-fly must be > 1.0");
  }
});

test("iter45: detectMaterialFromPath returns null when no material keyword present", () => {
  const cases = [
    "H:/PRISM/JM DIE/MILL/ALCOA/generic_part.MIN",   // no material
    "H:/PRISM/JM DIE/LATHE/AGRATI/jobshop.NC",       // no material
    "H:/PRISM/JM DIE/WIRE EDM/job123.I",             // no material
  ];
  for (const path of cases) {
    assert.equal(detectMaterialFromPath(path), null, `expected null for ${path}`);
  }
});

test("iter45: detectMaterialFromPath safe on null/undefined/non-string", () => {
  assert.equal(detectMaterialFromPath(null), null);
  assert.equal(detectMaterialFromPath(undefined), null);
  assert.equal(detectMaterialFromPath(123), null);
  assert.equal(detectMaterialFromPath(""), null);
});

test("iter45: deriveRecordDefaults emits material_iso when material detected", () => {
  // Aluminum 6061 in MILL → ISO-N, mill rate, time bucket from size, material from iso table
  const r = deriveRecordDefaults("H:/PRISM/JM DIE/CNC MILL/ALCOA/AL6061_bracket.MIN", 100_000);
  assert.equal(r.machine_class, "mill");
  assert.equal(r.machine_rate_usd_per_hr, 95);
  assert.equal(r.material_iso, "N");
  // material spend = stock_kg_for_<500KB_bucket × b2f × $/kg = 1.2 × 3.0 × 5.00 = $18.00
  assert.ok(r.estimated_material_spend_usd > 0, "material spend > 0");
  assert.equal(r.estimated_material_spend_usd, 18.00);
});

test("iter45: deriveRecordDefaults material_iso is null when path lacks material keyword", () => {
  const r = deriveRecordDefaults("H:/PRISM/JM DIE/CNC MILL/ALCOA/generic_part_v3.MIN", 100_000);
  assert.equal(r.material_iso, null);
  // Falls back to MATERIAL_BY_CLASS — mill → $60
  assert.equal(r.estimated_material_spend_usd, 60);
});

test("iter45: ISO-S (Inconel) drives much higher material spend than ISO-N (Al)", () => {
  const al = deriveRecordDefaults("H:/PRISM/JM DIE/MILL/AGRATI/aluminum_6061_bracket.MIN", 100_000);
  const inc = deriveRecordDefaults("H:/PRISM/JM DIE/MILL/AERO/inconel_718_blade.MIN", 100_000);
  assert.equal(al.material_iso, "N");
  assert.equal(inc.material_iso, "S");
  // Inconel at $32/kg × 4.5 b2f >> Al at $5/kg × 3.0 b2f
  assert.ok(inc.estimated_material_spend_usd > al.estimated_material_spend_usd * 5,
    `Inconel ($${inc.estimated_material_spend_usd}) must be >>5x Al ($${al.estimated_material_spend_usd})`);
});

test("iter45: stock weight bucket scales material spend monotonically by file size", () => {
  // Same material (Al), different file sizes → monotonically increasing stock weight
  const small = deriveRecordDefaults("H:/PRISM/JM DIE/MILL/AL/aluminum_6061_small.MIN", 30_000);
  const med = deriveRecordDefaults("H:/PRISM/JM DIE/MILL/AL/aluminum_6061_med.MIN", 200_000);
  const large = deriveRecordDefaults("H:/PRISM/JM DIE/MILL/AL/aluminum_6061_large.MIN", 2_000_000);
  const huge = deriveRecordDefaults("H:/PRISM/JM DIE/MILL/AL/aluminum_6061_huge.MIN", 8_000_000);
  assert.ok(small.estimated_material_spend_usd < med.estimated_material_spend_usd);
  assert.ok(med.estimated_material_spend_usd < large.estimated_material_spend_usd);
  assert.ok(large.estimated_material_spend_usd < huge.estimated_material_spend_usd);
});
