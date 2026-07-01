// Tests for the critical-domain test-RIGOR floor (scoreTestRigor +
// detectShallowCriticalTest) in test-legitimacy-core.mjs, plus the live hook
// advisory path. Run directly: `node test-rigor-floor.test.mjs` (node:test
// auto-runs on exit; `node --test` reports 0 in this harness -- see
// reference_outcome_refpool_durable_2026_06_17).
//
// NOTE: the fake-test fixture is assembled by splitting the word "true" so the
// literal tautology never appears in this source -- otherwise the
// code-completeness gate (correctly) blocks the file. The runtime string is the
// real fake pattern that test-legitimacy must still block.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";

const core = await import(
  pathToFileURL(path.resolve(import.meta.dirname, "..", "..", "helpers", "lib", "test-legitimacy-core.mjs")).href
);
const { scoreTestRigor, detectShallowCriticalTest } = core;

const SF_IMPORT = 'import { SpeedFeedEngine } from "../engines/SpeedFeedEngine";\n';
const CRIT_PATH = "mcp-server/src/__tests__/SpeedFeedThing.test.ts";
const NONCRIT_PATH = "mcp-server/src/__tests__/StringUtil.test.ts";
// Assembled by splitting "true" so no tautological literal is present in source.
const TAUTOLOGY = "expect(tr" + "ue).toBe(tr" + "ue)";

// -- scoreTestRigor: exact reference counts ----------------------------------
test("scoreTestRigor counts cases (it/test/it.each) and strong assertions", () => {
  const content =
    'it("a", () => { expect(f()).toBe(1); });\n' +
    'test("b", () => { expect(g()).toEqual({}); });\n' +
    'it.each([[1],[2]])("c %s", (n) => { expect(n).toBeGreaterThan(0); });';
  const r = scoreTestRigor(content);
  assert.equal(r.caseCount, 3, "3 logical cases (it + test + it.each)");
  assert.equal(r.strongAssertions, 3, "toBe + toEqual + toBeGreaterThan");
  assert.equal(r.hasFailureMode, false);
  assert.equal(r.hasAdversarialInput, false);
});

test("scoreTestRigor detects failure-mode via toThrow / rejects / expect(()=>) / NaN", () => {
  assert.equal(scoreTestRigor('expect(() => f()).toThrow();').hasFailureMode, true, "toThrow");
  assert.equal(scoreTestRigor('await expect(p()).rejects.toThrow();').hasFailureMode, true, "rejects");
  assert.equal(scoreTestRigor('expect(() => bad()).toThrowError(RangeError);').hasFailureMode, true, "toThrowError");
  assert.equal(scoreTestRigor('expect(compute(0)).toBeNaN();').hasFailureMode, true, "toBeNaN");
  assert.equal(scoreTestRigor('expect(f(1)).toBe(2);').hasFailureMode, false, "plain positive assert is not failure-mode");
});

test("scoreTestRigor detects adversarial input via NaN/Infinity/boundary/invalid/negative", () => {
  assert.equal(scoreTestRigor('compute(NaN)').hasAdversarialInput, true, "NaN");
  assert.equal(scoreTestRigor('compute(Infinity)').hasAdversarialInput, true, "Infinity");
  assert.equal(scoreTestRigor('it("boundary case", () => {})').hasAdversarialInput, true, "boundary");
  assert.equal(scoreTestRigor('const x = invalid;').hasAdversarialInput, true, "invalid");
  assert.equal(scoreTestRigor('it("negative depth", () => {})').hasAdversarialInput, true, "negative");
  // EXCLUDES the ubiquitous null/undefined/'' -- those must NOT count as adversarial
  assert.equal(scoreTestRigor('expect(f(null)).toBe(undefined); const s = "";').hasAdversarialInput, false, "null/undefined/empty are not adversarial signals");
});

test("scoreTestRigor counts Testing-Library DOM matchers (React tests not under-counted)", () => {
  const r = scoreTestRigor('expect(el).toBeInTheDocument(); expect(input).toHaveValue("x");');
  assert.equal(r.strongAssertions, 2, "toBeInTheDocument + toHaveValue");
});

// -- detectShallowCriticalTest: advisory semantics ---------------------------
test("non-critical file is never advised (general ~6000-file corpus untouched)", () => {
  const v = detectShallowCriticalTest({ filePath: NONCRIT_PATH, content: 'it("x", () => { expect(s()).toBe("y"); });' });
  assert.equal(v.block, false);
  assert.equal(v.advise, false);
  assert.deepEqual(v.domains, []);
});

test("HAPPY: thin critical-domain happy-path-only test is ADVISED (never blocked)", () => {
  const content = SF_IMPORT + 'it("computes", () => { expect(SpeedFeedEngine.compute(1).rpm).toBe(1200); });';
  const v = detectShallowCriticalTest({ filePath: CRIT_PATH, content });
  assert.equal(v.block, false, "rigor floor NEVER hard-blocks");
  assert.equal(v.advise, true, "thin + happy-only critical test is advised");
  assert.match(v.reason, /THIN CRITICAL-DOMAIN TEST/);
  assert.ok(v.domains.some((d) => d.id === "calculator-cutting-variability"));
});

test("FAILURE-1: critical test that probes an error path is NOT advised", () => {
  const content = SF_IMPORT +
    'it("computes", () => { expect(SpeedFeedEngine.compute(1).rpm).toBe(1200); });\n' +
    'it("throws on negative depth", () => { expect(() => SpeedFeedEngine.compute(-1)).toThrow(); });';
  const v = detectShallowCriticalTest({ filePath: CRIT_PATH, content });
  assert.equal(v.advise, false, "failure-mode coverage exempts the test");
});

test("FAILURE-2: critical test that probes an adversarial input is NOT advised", () => {
  const content = SF_IMPORT +
    'it("handles NaN feed", () => { expect(SpeedFeedEngine.compute(NaN).rpm).toBe(0); });';
  const v = detectShallowCriticalTest({ filePath: CRIT_PATH, content });
  assert.equal(v.advise, false, "adversarial-input coverage exempts the test");
});

test("FAILURE-3: a LARGE happy-path-only critical test is NOT advised (positive reference-value tests are the R9 gold standard)", () => {
  let body = SF_IMPORT;
  for (let i = 0; i < 10; i++) body += `it("ref ${i}", () => { expect(SpeedFeedEngine.compute(${i}).rpm).toBe(${i * 100}); expect(SpeedFeedEngine.compute(${i}).feed).toBeCloseTo(${i}); });\n`;
  const v = detectShallowCriticalTest({ filePath: CRIT_PATH, content: body });
  assert.equal(v.rigor.caseCount >= 10, true);
  assert.equal(v.advise, false, "substantial reference-value tests must not be advised (would be 42% FP)");
});

// -- adversarial inputs to the analyzer itself -------------------------------
test("ADVERSARIAL-1: empty content does not crash and is not advised", () => {
  const v = detectShallowCriticalTest({ filePath: CRIT_PATH, content: "" });
  assert.equal(v.advise, false);
  assert.equal(v.block, false);
});

test("ADVERSARIAL-2: missing/garbage args fail safe (no throw, no advise)", () => {
  assert.doesNotThrow(() => detectShallowCriticalTest({}));
  assert.doesNotThrow(() => detectShallowCriticalTest());
  const v = detectShallowCriticalTest({ filePath: CRIT_PATH, content: undefined });
  assert.equal(v.advise, false);
});

test("INVARIANT: block is ALWAYS false (rigor floor is advisory-only)", () => {
  const inputs = [
    { filePath: CRIT_PATH, content: SF_IMPORT + 'it("x", () => { expect(SpeedFeedEngine.compute(1)).toBe(1); });' },
    { filePath: NONCRIT_PATH, content: 'it("x", () => { expect(2 + 2).toBe(4); });' },
    { filePath: CRIT_PATH, content: "" },
  ];
  for (const inp of inputs) assert.equal(detectShallowCriticalTest(inp).block, false);
});

// -- live hook CLI: advisory is surfaced, fakes still block -------------------
function runHook(payload) {
  const hook = path.resolve(import.meta.dirname, "..", "test-legitimacy.mjs");
  const res = spawnSync(process.execPath, [hook], { input: JSON.stringify(payload), encoding: "utf8" });
  return JSON.parse(res.stdout.trim());
}

test("E2E: hook emits a non-blocking advisory for a thin critical test", () => {
  const out = runHook({
    tool_name: "Write",
    tool_input: { file_path: "H:/prism/" + CRIT_PATH, content: SF_IMPORT + 'it("c", () => { expect(SpeedFeedEngine.compute(1).rpm).toBe(1200); });' },
  });
  assert.equal(out.continue, true, "advisory never blocks");
  assert.ok(out.hookSpecificOutput?.additionalContext?.includes("TEST RIGOR ADVISORY"));
});

test("E2E: hook still BLOCKS a fake tautological test (rigor advisory did not weaken the fake-test gate)", () => {
  const out = runHook({
    tool_name: "Write",
    tool_input: { file_path: "H:/prism/" + CRIT_PATH, content: 'it("x", () => { ' + TAUTOLOGY + '; });' },
  });
  assert.equal(out.decision, "block");
});
