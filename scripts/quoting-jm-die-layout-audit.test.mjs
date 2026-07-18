/**
 * quoting-jm-die-layout-audit.test — iter36 unit test for layout classifier.
 *
 * Run: node --test scripts/quoting-jm-die-layout-audit.test.mjs
 *
 * @milestone QUOTING-SYNERGY-MS0/U-QP-JM-DIE-LAYOUT-AUDIT (charlie /goal-yolo iter36)
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { classify, buildMarkdownReport, CONFIG_RE, MACHINE_RE, HYBRID_RE } from "./quoting-jm-die-layout-audit.mjs";

// ---------- classify() ----------

test("classify: known config names → 'config'", () => {
  const configs = [
    "POST PROCESSORS",
    "PRISM MODIFIED POST PROCESSORS",
    "SETUPS",
    "QUEUE",
    "REVERSE ENGINEERING",
    "_PART LIBRARY",
    "TEMPLATES",
    "MISC",
  ];
  for (const name of configs) {
    assert.equal(classify(name), "config", `"${name}" should classify as config`);
  }
});

test("classify: 2-word program/macro dirs → 'hybrid' (functionally LIKELY_CONFIG)", () => {
  // CONFIG_RE only allows one alternate; 2-word combos like "MACRO PROGRAMS"
  // fall through to HYBRID_RE. Both classifications map to LIKELY_CONFIG bucket,
  // so this is correct behavior — surfacing the distinction for transparency.
  const hybrids = ["MACRO PROGRAMS", "MATTHEW programs"];
  for (const name of hybrids) {
    assert.equal(classify(name), "hybrid", `"${name}" should classify as hybrid`);
  }
});

test("classify: machine-class names → 'machine'", () => {
  const machines = [
    "CNC LATHE",
    "CNC MILL HAAS",
    "LATHE",
    "WIRE EDM",
    "OKUMA",
    "HAAS-HURCO",
    "ROKU-ROKU",
    "MILL",
    "GRINDER",
  ];
  for (const name of machines) {
    assert.equal(classify(name), "machine", `"${name}" should classify as machine`);
  }
});

test("classify: vendor-prefixed program dirs → 'hybrid' (also covered by config)", () => {
  // HURCO CNC PROGRAMS is caught by config FIRST (vendor-prefix alternate is in CONFIG_RE)
  assert.equal(classify("HURCO CNC PROGRAMS"), "config");
  // But hybrid regex independently matches things like "FOO BAR PROGRAMS"
  assert.equal(classify("MATTHEW programs"), "hybrid", "matches HYBRID_RE because it ends in PROGRAMS but isn't a vendor-known config");
});

test("classify: real customer-shape names → 'unknown' (not config, not machine)", () => {
  const customers = ["ALCOA", "ITW", "BRADY", "OPTIMAS", "SFS", "HOLO-KROME", "JM DIE COMPANY", "BASEBALL PARTS", "GENERAL BANDAGES"];
  for (const name of customers) {
    const c = classify(name);
    assert.notEqual(c, "config", `"${name}" must NOT classify as config (would suppress real customer)`);
    assert.notEqual(c, "machine", `"${name}" must NOT classify as machine (might be customer)`);
  }
});

test("classify: anti-false-positive — customer names containing noise-substrings", () => {
  // These contain 'POST' / 'DOC' / 'MANUAL' etc as substrings but must NOT be classified config
  const sneaky = [
    "ALCOA POST OFFICE",         // contains POST
    "DOC HOLLIDAY",              // contains DOC
    "POSTAL SERVICES",           // contains POSTS substring
    "MANUAL DEXTERITY CORP",     // contains MANUAL
    "REFERENCE PARTS INC",       // contains REFERENCE
  ];
  for (const name of sneaky) {
    assert.notEqual(classify(name), "config", `"${name}" must not be falsely classified as config`);
  }
});

// ---------- buildMarkdownReport() shape ----------

test("buildMarkdownReport: emits expected section headers", () => {
  const results = [
    { name: "POST PROCESSORS", classification: "config", childDirs: 2, childFiles: 5, dominantType: "mixed", sampleChildDirs: ["a", "b"] },
    { name: "ALCOA", classification: "unknown", childDirs: 4, childFiles: 0, dominantType: "dir-heavy", sampleChildDirs: ["MILL", "LATHE", "EDM"] },
    { name: "CNC LATHE", classification: "machine", childDirs: 10, childFiles: 0, dominantType: "dir-heavy", sampleChildDirs: ["ITW", "SFS", "ALCOA"] },
  ];
  const md = buildMarkdownReport(results);
  assert.ok(md.includes("# JM DIE archive top-level layout audit"), "has title");
  assert.ok(md.includes("## Bucket counts"), "has bucket counts section");
  assert.ok(md.includes("LIKELY_CUSTOMER"), "names customer bucket");
  assert.ok(md.includes("LIKELY_MACHINE"), "names machine bucket");
  assert.ok(md.includes("LIKELY_CONFIG"), "names config bucket");
  assert.ok(md.includes("## Calibration hints for iter9 extractor"), "has calibration hints");
  assert.ok(md.includes("Recommended extractor policy"), "has policy recommendation");
});

test("buildMarkdownReport: ALCOA dir-heavy → LIKELY_CUSTOMER bucket", () => {
  const results = [
    { name: "ALCOA", classification: "unknown", childDirs: 4, childFiles: 0, dominantType: "dir-heavy", sampleChildDirs: ["MILL", "LATHE", "EDM"] },
  ];
  const md = buildMarkdownReport(results);
  // ALCOA should appear under LIKELY_CUSTOMER (dir-heavy + 2+ child dirs)
  const customerIdx = md.indexOf("## LIKELY_CUSTOMER");
  const alcoaIdx = md.indexOf("`ALCOA`");
  assert.ok(customerIdx >= 0, "LIKELY_CUSTOMER bucket section present");
  assert.ok(alcoaIdx > customerIdx, "ALCOA appears AFTER LIKELY_CUSTOMER header");
});

test("buildMarkdownReport: POST PROCESSORS → LIKELY_CONFIG bucket", () => {
  const results = [
    { name: "POST PROCESSORS", classification: "config", childDirs: 2, childFiles: 5, dominantType: "mixed", sampleChildDirs: ["a", "b"] },
  ];
  const md = buildMarkdownReport(results);
  const configIdx = md.indexOf("## LIKELY_CONFIG");
  const postIdx = md.indexOf("`POST PROCESSORS`");
  assert.ok(configIdx >= 0);
  assert.ok(postIdx > configIdx);
});

test("buildMarkdownReport: empty results still produces valid report", () => {
  const md = buildMarkdownReport([]);
  assert.ok(md.includes("Total top-level dirs scanned:** 0"));
  assert.ok(md.includes("LIKELY_CUSTOMER: 0"));
});

// ---------- regex coverage spot-checks ----------

test("CONFIG_RE: case-insensitive matching", () => {
  assert.match("post processors", CONFIG_RE);
  assert.match("Post Processors", CONFIG_RE);
  assert.match("POST PROCESSORS", CONFIG_RE);
});

test("MACHINE_RE: hyphenated vendor combos", () => {
  assert.match("HAAS-HURCO", MACHINE_RE);
  assert.match("ROKU-ROKU", MACHINE_RE);
  assert.match("CNC MILL HAAS", MACHINE_RE);
});

test("HYBRID_RE: vendor + PROGRAMS construction", () => {
  assert.match("HURCO CNC PROGRAMS", HYBRID_RE);
  assert.match("MATTHEW programs", HYBRID_RE);
});
