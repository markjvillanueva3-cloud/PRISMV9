// Tests for the pure core of the AI test-rigor judge. No live model required.
// Run directly: `node test-rigor-judge-core.test.mjs`.
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {
  extractRelativeImports,
  resolveSutPath,
  buildJudgePrompt,
  parseJudgeResponse,
} from "./test-rigor-judge-core.mjs";

// -- extractRelativeImports --------------------------------------------------
test("extractRelativeImports returns relative specifiers in order, ignores bare", () => {
  const src = [
    'import { A } from "../engines/AEngine";',
    'import { describe, it } from "vitest";',
    'import B from "./b.js";',
    'import x from "lodash";',
  ].join("\n");
  assert.deepEqual(extractRelativeImports(src), ["../engines/AEngine", "./b.js"]);
});

test("extractRelativeImports handles empty/garbage without throwing", () => {
  assert.deepEqual(extractRelativeImports(""), []);
  assert.deepEqual(extractRelativeImports(undefined), []);
});

// -- resolveSutPath (virtual fs via injected exists) -------------------------
test("resolveSutPath picks the import whose basename matches the test basename", () => {
  const testPath = "H:/p/src/__tests__/SpeedFeedEngine.test.ts";
  const content = [
    'import { describe, it } from "vitest";',
    'import { helper } from "../util/helpers/format";',
    'import { SpeedFeedEngine } from "../engines/SpeedFeedEngine";',
  ].join("\n");
  const real = path.resolve("H:/p/src/__tests__", "../engines/SpeedFeedEngine") + ".ts";
  const exists = (p) => p.replace(/\\/g, "/") === real.replace(/\\/g, "/");
  assert.equal(resolveSutPath(testPath, content, exists), real.replace(/\\/g, "/"));
});

test("resolveSutPath ignores vitest/setup/mock imports", () => {
  const testPath = "H:/p/src/__tests__/Thing.test.ts";
  const content = 'import { it } from "vitest";\nimport "./setup";\nimport { mockThing } from "./mock-thing";';
  assert.equal(resolveSutPath(testPath, content, () => true), null, "no real SUT import -> null");
});

test("resolveSutPath maps a TS NodeNext `.js` specifier to the real `.ts` source", () => {
  const testPath = "H:/p/src/__tests__/X.test.ts";
  const content = 'import { X } from "../engines/X.js";'; // .js specifier, .ts on disk
  const real = (path.resolve("H:/p/src/__tests__", "../engines/X") + ".ts").replace(/\\/g, "/");
  const exists = (p) => p.replace(/\\/g, "/") === real;
  assert.equal(resolveSutPath(testPath, content, exists), real);
});

test("resolveSutPath returns null when nothing resolves on disk", () => {
  const content = 'import { X } from "../engines/X";';
  assert.equal(resolveSutPath("H:/p/__tests__/X.test.ts", content, () => false), null);
});

test("resolveSutPath falls back to first non-framework import when no name match", () => {
  const testPath = "H:/p/__tests__/weird-name.test.ts";
  const content = 'import { it } from "vitest";\nimport { Engine } from "../EngineThing";';
  const real = path.resolve("H:/p/__tests__", "../EngineThing") + ".ts";
  const exists = (p) => p.replace(/\\/g, "/") === real.replace(/\\/g, "/");
  assert.equal(resolveSutPath(testPath, content, exists), real.replace(/\\/g, "/"));
});

// -- buildJudgePrompt --------------------------------------------------------
test("buildJudgePrompt embeds SOURCE + TEST and demands a JSON verdict", () => {
  const p = buildJudgePrompt("TESTBODY_TOKEN", "SUTBODY_TOKEN");
  assert.ok(p.includes("SUTBODY_TOKEN"), "contains source");
  assert.ok(p.includes("TESTBODY_TOKEN"), "contains test");
  assert.ok(p.includes("rigorScore"), "asks for the JSON schema");
  assert.ok(p.includes("wouldCatchRegression"));
});

test("buildJudgePrompt clips oversized inputs to the budget", () => {
  const huge = "x".repeat(50000);
  const p = buildJudgePrompt(huge, huge, { maxSutChars: 100, maxTestChars: 100 });
  assert.ok(p.includes("truncated for prompt budget"), "long content truncated");
  assert.ok(p.length < 5000, "prompt bounded");
});

// -- parseJudgeResponse: happy + 3 failure + 2 adversarial -------------------
test("HAPPY: parses a bare JSON verdict and clamps/normalizes", () => {
  const r = parseJudgeResponse('{"rigorScore": 85, "wouldCatchRegression": true, "verdict": "rigorous", "missingCoverage": [], "rationale": "good"}');
  assert.equal(r.ok, true);
  assert.equal(r.verdict.rigorScore, 85);
  assert.equal(r.verdict.wouldCatchRegression, true);
  assert.equal(r.verdict.verdict, "rigorous");
});

test("HAPPY: parses a ```json fenced verdict with surrounding prose", () => {
  const r = parseJudgeResponse('Here is my assessment:\n```json\n{"rigorScore": 30, "wouldCatchRegression": false, "verdict": "weak", "missingCoverage": ["NaN feed", "negative depth"], "rationale": "happy-path only"}\n```\nThanks.');
  assert.equal(r.ok, true);
  assert.equal(r.verdict.verdict, "weak");
  assert.deepEqual(r.verdict.missingCoverage, ["NaN feed", "negative depth"]);
});

test("FAILURE-1: empty/whitespace response -> ok:false empty", () => {
  assert.equal(parseJudgeResponse("").ok, false);
  assert.equal(parseJudgeResponse("   \n ").ok, false);
});

test("FAILURE-2: no JSON object in text -> ok:false", () => {
  assert.equal(parseJudgeResponse("the test looks fine to me").ok, false);
});

test("FAILURE-3: malformed/unbalanced JSON -> ok:false, never throws", () => {
  assert.doesNotThrow(() => parseJudgeResponse('{"rigorScore": 50, "verdict":'));
  assert.equal(parseJudgeResponse('{"rigorScore": 50, "verdict":').ok, false);
});

test("ADVERSARIAL-1: score out of range / non-numeric is clamped, verdict derived", () => {
  const hi = parseJudgeResponse('{"rigorScore": 999}');
  assert.equal(hi.verdict.rigorScore, 100);
  assert.equal(hi.verdict.verdict, "rigorous");
  const bad = parseJudgeResponse('{"rigorScore": "not-a-number", "verdict": "bogus"}');
  assert.equal(bad.verdict.rigorScore, 0);
  assert.equal(bad.verdict.verdict, "weak", "out-of-set verdict derived from score band");
});

test("ADVERSARIAL-2: braces inside string literals do not break balance scan", () => {
  const r = parseJudgeResponse('{"rigorScore": 60, "rationale": "covers {a} and } edge", "verdict": "shallow"}');
  assert.equal(r.ok, true);
  assert.equal(r.verdict.rigorScore, 60);
  assert.equal(r.verdict.rationale.includes("}"), true);
});

test("ADVERSARIAL-2b: a string value ending in escaped backslashes still parses (parity)", () => {
  // raw JSON: {"rationale": "ends C:\\", "rigorScore": 75}  (two backslashes = one literal)
  const r = parseJudgeResponse('{"rationale": "ends C:\\\\", "rigorScore": 75, "verdict": "shallow"}');
  assert.equal(r.ok, true, "even backslash run must close the string");
  assert.equal(r.verdict.rigorScore, 75);
});

test("ADVERSARIAL-3: non-string / object inputs fail safe", () => {
  assert.equal(parseJudgeResponse(null).ok, false);
  assert.equal(parseJudgeResponse(42).ok, false);
  assert.equal(parseJudgeResponse('[1,2,3]').ok, false, "array (no object) -> not-an-object/no-json");
});
