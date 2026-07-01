/**
 * feature-gap-dedup-win-reconciler.e2e.test.mjs — real-data integration tests
 * ============================================================================
 *
 * U-FEATURE-GAP-DEDUP-WIN-RECONCILER (FEATURE-GAP-AUDIT-MS0, slot india, 2026-05-19).
 *
 * The hermetic unit-test suite (feature-gap-classifier.test.mjs) verifies the
 * pure classifier with injected `fakeFs`. This suite is the SIBLING real-data
 * E2E that catches the "hermetic fakes don't prove production wiring" class:
 * the `makeRealFs` reader bag must produce verdicts that match observed
 * codebase reality for engines we KNOW the state of.
 *
 * Doctrine references:
 *   - reference_u_dispatcher_2026_05_16 (MockMCPServer bypassed SDK z.enum)
 *   - reference_fleet_reaper_ms1 (hermetic fakes hid `docker` top-level shape)
 *
 * Run: node --test scripts/feature-gap-dedup-win-reconciler.e2e.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { makeRealFs } from "./feature-gap-dedup-win-reconciler.mjs";
import { classifyUnit, VERDICTS } from "./lib/feature-gap-classifier.mjs";

// Build the real fs reader once for the whole suite — disk-read cost is paid
// per CLI run anyway; sharing across tests is the production shape too.
const realFs = makeRealFs();

// ─────────────────────────────────────────────────────────────────────
// Anchor engines — these are R8-verified live in the codebase as of
// 2026-05-19 india slot session. If any of these fails, EITHER the
// reconciler regressed OR the engine was deleted (in which case the
// reconciler's verdict is the correct R12 fail-loud signal).
// ─────────────────────────────────────────────────────────────────────

test("E2E: BackplotEngine resolves on disk", () => {
  // Anchor for U-GAP-POST-GCODE-BACKPLOT. R8-confirmed this session.
  const file = realFs.findEngineFile("BackplotEngine");
  assert.ok(file, "BackplotEngine must exist on disk (R8 anchor)");
  assert.match(file, /BackplotEngine\.ts$/);
});

test("E2E: BackplotEngine is wired in at least one dispatcher", () => {
  const refs = realFs.countDispatcherRefs("BackplotEngine");
  assert.ok(refs > 0, `BackplotEngine must be dispatcher-wired (got ${refs} refs)`);
});

test("E2E: BackplotEngine has at least one test file", () => {
  const tests = realFs.findTestFiles("BackplotEngine");
  assert.ok(tests.length > 0, `BackplotEngine must be tested (got ${tests.length} test files)`);
});

test("E2E: U-GAP-POST-GCODE-BACKPLOT classifies as DEDUP-WIN against real fs", () => {
  // End-to-end: real audit-unit title + real disk reader → must produce the
  // verdict the R8 manual inspection found this session.
  const r = classifyUnit({
    unit_id: "U-GAP-POST-GCODE-BACKPLOT",
    domain: "post",
    title: "Re-modularize PRISM_GCODE_BACKPLOT_ENGINE from v8.89 monolith",
  }, realFs);
  assert.equal(r.verdict, VERDICTS.DEDUP_WIN,
    `expected DEDUP-WIN, got ${r.verdict}. findings=[${r.findings.join("; ")}]`);
});

test("E2E: U-GAP-POST-RL-POSTPROCESSOR classifies as DEDUP-WIN against real fs", () => {
  // Sibling R8 anchor — `RLPostProcessorEngine` is on disk + wired + tested
  // per this session's recon.
  const r = classifyUnit({
    unit_id: "U-GAP-POST-RL-POSTPROCESSOR",
    domain: "post",
    title: "Re-modularize PRISM_RL_POST_PROCESSOR from v8.89 monolith",
  }, realFs);
  assert.equal(r.verdict, VERDICTS.DEDUP_WIN,
    `expected DEDUP-WIN, got ${r.verdict}. findings=[${r.findings.join("; ")}]`);
});

test("E2E: U-GAP-POST-JMDIE-LEARNING classifies as DEDUP-WIN against real fs", () => {
  // Third R8 anchor — `JMDieProgramLearningEngine` is on disk + wired + tested.
  const r = classifyUnit({
    unit_id: "U-GAP-POST-JMDIE-LEARNING",
    domain: "post",
    title: "Re-modularize PRISM_JMDIE_PROGRAM_LEARNING from v8.89 monolith",
  }, realFs);
  assert.equal(r.verdict, VERDICTS.DEDUP_WIN,
    `expected DEDUP-WIN, got ${r.verdict}. findings=[${r.findings.join("; ")}]`);
});

// ─────────────────────────────────────────────────────────────────────
// WIRE-EXEMPT detection on a real engine
// ─────────────────────────────────────────────────────────────────────

test("E2E: hasWireExempt detects a real `// WIRE-EXEMPT:` tag", () => {
  // OkumaRunLogParserEngine carries a real WIRE-EXEMPT tag on line 1 per the
  // session-start recon. If a future engine refactor drops the tag the
  // reconciler would misclassify it; if the tag detection regex breaks the
  // reconciler would close-out exempt engines as wired-but-untested.
  const exempt = realFs.hasWireExempt("OkumaRunLogParserEngine");
  assert.equal(exempt, true,
    "OkumaRunLogParserEngine must be detected as WIRE-EXEMPT (line 1 has the tag)");
});

test("E2E: hasWireExempt returns false for a non-exempt engine", () => {
  // BackplotEngine is wired-and-tested, NOT exempt — verify the negative
  // path so the regex isn't accidentally matching everywhere.
  assert.equal(realFs.hasWireExempt("BackplotEngine"), false);
});

// ─────────────────────────────────────────────────────────────────────
// Negative anchor — a fabricated engine must NOT be on disk
// ─────────────────────────────────────────────────────────────────────

test("E2E: a fabricated engine name yields GENUINE-GAP", () => {
  // R12 fail-loud — a name that cannot exist on disk MUST classify as
  // GENUINE-GAP, never silently dedup-win.
  const r = classifyUnit({
    unit_id: "U-FAKE",
    title: "Re-modularize PRISM_ABSOLUTELY_NONEXISTENT_FAKEROO_ENGINE from v8.89 monolith",
  }, realFs);
  assert.equal(r.verdict, VERDICTS.GENUINE_GAP);
  assert.equal(r.matched_engines.length, 0);
});

// ─────────────────────────────────────────────────────────────────────
// Reader-bag shape contract — production fs MUST match the bag the
// classifier expects (this is the "hermetic fakes don't prove wiring" guard)
// ─────────────────────────────────────────────────────────────────────

test("E2E: makeRealFs exposes the exact 4-method reader-bag interface", () => {
  // If the bag shape ever drifts the classifier silently breaks. Pin every
  // method by name AND prove it returns the right type for one real value.
  assert.equal(typeof realFs.findEngineFile, "function");
  assert.equal(typeof realFs.countDispatcherRefs, "function");
  assert.equal(typeof realFs.findTestFiles, "function");
  assert.equal(typeof realFs.hasWireExempt, "function");
  // Type contract:
  assert.equal(typeof realFs.findEngineFile("BackplotEngine"), "string");
  assert.equal(typeof realFs.countDispatcherRefs("BackplotEngine"), "number");
  assert.equal(Array.isArray(realFs.findTestFiles("BackplotEngine")), true);
  assert.equal(typeof realFs.hasWireExempt("BackplotEngine"), "boolean");
});

test("E2E: missing engine returns null from findEngineFile (not undefined or empty string)", () => {
  // Contract: the classifier branches on `if (!file) continue` — both null
  // and undefined are falsy, but pinning null is what the JSDoc claims.
  const result = realFs.findEngineFile("ThisEngineMustNotExistAnywhere");
  assert.equal(result, null);
});
