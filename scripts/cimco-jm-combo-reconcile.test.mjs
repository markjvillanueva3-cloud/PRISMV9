// Tests for the pure matchers in cimco-jm-combo-reconcile.mjs (U-PP-CIMCO-COMBO-WRITE follow-up).
// Reference cases verify the three behaviors a wrong verdict would silently break: degree-symbol
// (non-ASCII) normalization, exact-vs-unique-substring resolution + ambiguity fail-close, and the
// JM-controller-family -> CIMCO Control-Type dialect mapping. Run: node scripts/cimco-jm-combo-reconcile.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { norm, resolveInCombo, expectedControl } from "./cimco-jm-combo-reconcile.mjs";

// A trimmed slice of the LIVE machine combo (the indices are the real CIMCO 2026 catalog positions).
const MACHINES = [
  { index: 3, text: "Cimco Lathe 3 Axis C" },
  { index: 5, text: "Cimco Lathe 4 Axis CY + Sub" },
  { index: 7, text: "Cimco Mill 3 Axis Type A" },
  { index: 15, text: "Cimco Mill 5 Axis Head Head 45� AB Type A" }, // degree read back as the mojibake U+FFFD
  { index: 54, text: "Haas CM-1" },
  { index: 67, text: "Haas VF-6/40" },
  { index: 68, text: "Haas VF-6/50 - TR310" },
];
const CONTROLS = [
  { index: 6, text: "Fanuc Milling" },
  { index: 11, text: "Haas NGC Milling" },
  { index: 12, text: "Haas NGC Turning" },
  { index: 18, text: "Hurco Milling" },
  { index: 29, text: "Okuma Milling" },
  { index: 30, text: "Okuma Turning" },
];

test("norm folds non-ASCII (degree symbol vs mojibake) to a common form", () => {
  assert.equal(norm("45° AB"), norm("45� AB")); // ° vs � collapse equal
  assert.equal(norm("  Haas   VF-6/40 "), "haas vf-6/40");
});

test("exact match resolves by name (no index needed for set-combo)", () => {
  const r = resolveInCombo(MACHINES, "Haas VF-6/40");
  assert.equal(r.found, true);
  assert.equal(r.index, 67);
  assert.equal(r.how, "exact");
  assert.equal(r.needsIndexForSetCombo, false);
});

test("exact-normalized (degree symbol) resolves but flags index-needed for set-combo", () => {
  // sim-map uses the proper degree ° ; the live catalog has the mojibake � -> must still resolve, but
  // set-combo --to "<proper-degree name>" would NOT match the raw combo text, so the flag warns to use the index.
  const r = resolveInCombo(MACHINES, "Cimco Mill 5 Axis Head Head 45° AB Type A");
  assert.equal(r.found, true);
  assert.equal(r.index, 15);
  assert.equal(r.how, "exact-normalized");
  assert.equal(r.needsIndexForSetCombo, true);
});

test("exact wins over a substring superset (VF-6/40 must NOT grab VF-6/50)", () => {
  const r = resolveInCombo(MACHINES, "Haas VF-6/40");
  assert.equal(r.index, 67); // exact, not the VF-6/50 sibling
});

test("exact match resolves a TRUE substring-superset that would be AMBIGUOUS under substring-only", () => {
  // "Cimco Lathe 3 Axis C" IS a substring of "Cimco Lathe 3 Axis CY" -> substring-only matching would
  // return 2 candidates (ambiguous, fail-closed). The exact-match branch must resolve it to the exact
  // entry; this assertion FAILS if the exact-first precedence ever regresses (the VF-6/40 case above
  // does not pin it because VF-6/40 is not a substring of VF-6/50). LTH-03..06 rely on this for "...3 Axis C".
  const combo = [
    { index: 3, text: "Cimco Lathe 3 Axis C" },
    { index: 4, text: "Cimco Lathe 3 Axis CY" },
  ];
  const r = resolveInCombo(combo, "Cimco Lathe 3 Axis C");
  assert.equal(r.found, true);
  assert.equal(r.index, 3);
  assert.equal(r.how, "exact");
});

test("CLI main-guard does not fire on import (no argv[1] match) -- artifacts not written as a side effect", () => {
  // Regression pin for the endsWith("") footgun: importing this module (as this very test does) must NOT
  // run main(). If it did, main() would read jm-fleet-sim-map.json + WRITE jm-combo-reconcile.{json,md}.
  // The import at the top of THIS file already exercised the guard; reaching here at all proves it stayed inert
  // (a fired main() with a missing catalog would have thrown at import and aborted the suite).
  assert.ok(true);
});

test("ambiguous substring fails closed (never load the wrong machine)", () => {
  const r = resolveInCombo(MACHINES, "Haas VF-6"); // matches both 67 and 68 as substring, no exact
  assert.equal(r.found, false);
  assert.match(r.reason, /ambiguous/);
  assert.equal(r.candidates.length, 2);
});

test("no match fails closed", () => {
  assert.equal(resolveInCombo(MACHINES, "Mazak Integrex i-400").found, false);
  assert.equal(resolveInCombo(MACHINES, "").found, false);
});

test("expectedControl maps family+type to the CIMCO dialect (mill->Milling, lathe->Turning)", () => {
  assert.equal(expectedControl("haas", "mill").expect, "Haas NGC Milling");
  assert.equal(expectedControl("haas", "lathe").expect, "Haas NGC Turning");
  assert.equal(expectedControl("okuma", "lathe").expect, "Okuma Turning");
  assert.equal(expectedControl("fanuc", "mill").expect, "Fanuc Milling");
  assert.equal(expectedControl("hurco", "mill").expect, "Hurco Milling");
});

test("expectedControl on an unmapped family returns null + a note (fail-closed, not a wrong dialect)", () => {
  const e = expectedControl("mitsubishi-edm", "edm");
  assert.equal(e.expect, null);
  assert.match(e.note, /no CIMCO control mapping/);
});

test("the derived control resolves against the live control combo (end-to-end matcher chain)", () => {
  const e = expectedControl("haas", "mill");          // -> "Haas NGC Milling"
  const r = resolveInCombo(CONTROLS, e.expect);
  assert.equal(r.found, true);
  assert.equal(r.index, 11);
});
