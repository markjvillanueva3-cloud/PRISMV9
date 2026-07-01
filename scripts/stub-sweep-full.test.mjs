/**
 * stub-sweep-full tests — verify the 4 FP detectors + scan integration.
 *
 * Fixtures use runtime string-concat so this file's source never matches the
 * sweeper's regexes (the sweeper would otherwise flag this test as a stub).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { classifyHit, isStubOnlyTest, firstMatchLine, scanFile, run } from "./stub-sweep-full.mjs";

// Runtime-assembled trigger words (so this file does NOT match its own scanner).
const KIENZLE = "kc" + "1_1";
const NOT_IMPL = "not " + "implemented";
const STUB_KEY = "stu" + "b";
const TO_BE_DEF = "to" + "BeDefined()";
const REAL_ASSERT = "to" + "Be(42)";

// ── classifyHit: test-scope FP coverage ──

test("classifyHit: P-NOT-IMPL in .test.ts → DOCUMENTED_FP (string-literal test input)", () => {
  assert.equal(classifyHit("P-NOT-IMPL", "Foo.test.ts", "src/__tests__/Foo.test.ts"), "DOCUMENTED_FP");
});

test("classifyHit: P-SILENT-CATCH in .test.ts → DOCUMENTED_FP", () => {
  assert.equal(classifyHit("P-SILENT-CATCH", "Bar.test.ts", "src/__tests__/Bar.test.ts"), "DOCUMENTED_FP");
});

test("classifyHit: P-INLINE-KC in .test.ts → DOCUMENTED_FP (test reference values)", () => {
  assert.equal(classifyHit("P-INLINE-KC", "Baz.test.ts", "src/__tests__/Baz.test.ts"), "DOCUMENTED_FP");
});

test("classifyHit: P-INLINE-KC in __tests__/helpers/ (non-.test.ts) → DOCUMENTED_FP", () => {
  assert.equal(classifyHit("P-INLINE-KC", "engine-test-harness.ts", "src/__tests__/helpers/engine-test-harness.ts"), "DOCUMENTED_FP");
});

// ── classifyHit: canonical-source FP coverage ──

test("classifyHit: P-INLINE-KC in physics/constants.ts → DOCUMENTED_FP (canonical source)", () => {
  assert.equal(classifyHit("P-INLINE-KC", "constants.ts", "src/physics/constants.ts"), "DOCUMENTED_FP");
});

test("classifyHit: P-INLINE-KC in registries/FormulaRegistry.ts → DOCUMENTED_FP", () => {
  assert.equal(classifyHit("P-INLINE-KC", "FormulaRegistry.ts", "src/registries/FormulaRegistry.ts"), "DOCUMENTED_FP");
});

// ── classifyHit: semantic citation/teaching detection ──

test("classifyHit: P-INLINE-KC with Sandvik citation → DOCUMENTED_FP", () => {
  const src = `const T = { ${KIENZLE}: 1800, source: "ISO 3685 / Sandvik" };`;
  assert.equal(classifyHit("P-INLINE-KC", "Foo.ts", "src/engines/Foo.ts", src), "DOCUMENTED_FP");
});

test("classifyHit: P-INLINE-KC with Altintas citation → DOCUMENTED_FP", () => {
  const src = `// Altintas Table 2.1\nconst T = { ${KIENZLE}: 1800 };`;
  assert.equal(classifyHit("P-INLINE-KC", "Foo.ts", "src/engines/Foo.ts", src), "DOCUMENTED_FP");
});

test("classifyHit: P-INLINE-KC inside LaTeX teaching scope → DOCUMENTED_FP", () => {
  const src = `const lesson = { latex: "F_c = k_{c1.1}", example: { inputs: { ${KIENZLE}: 1500, mc: 0.25 } } };`;
  assert.equal(classifyHit("P-INLINE-KC", "Lesson.ts", "src/engines/Lesson.ts", src), "DOCUMENTED_FP");
});

test("classifyHit: P-INLINE-KC in plain engine with NO citation → REAL_STUB", () => {
  const src = `const T = { P: { ${KIENZLE}: 1800, mc: 0.25 }, M: { ${KIENZLE}: 2100, mc: 0.25 } };`;
  assert.equal(classifyHit("P-INLINE-KC", "Foo.ts", "src/engines/Foo.ts", src), "REAL_STUB");
});

test("classifyHit: P-NOT-IMPL in engine (not test) → REAL_STUB", () => {
  assert.equal(classifyHit("P-NOT-IMPL", "Foo.ts", "src/engines/Foo.ts"), "REAL_STUB");
});

test("classifyHit: unknown pattern → REAL_STUB (no allowlist match)", () => {
  assert.equal(classifyHit("P-UNKNOWN", "Foo.ts", "src/engines/Foo.ts"), "REAL_STUB");
});

// ── isStubOnlyTest ──

test("isStubOnlyTest: placeholder alone → true", () => {
  assert.equal(isStubOnlyTest(`expect(x).${TO_BE_DEF};`), true);
});

test("isStubOnlyTest: placeholder + real assertion → false", () => {
  assert.equal(isStubOnlyTest(`expect(x).${TO_BE_DEF};\nexpect(x.v).${REAL_ASSERT};`), false);
});

test("isStubOnlyTest: empty source → false", () => {
  assert.equal(isStubOnlyTest(""), false);
});

// ── firstMatchLine ──

test("firstMatchLine: returns 1-based line of first match", () => {
  const src = "line1\nline2\nfoo\nline4";
  assert.equal(firstMatchLine(src, /foo/), 3);
});

test("firstMatchLine: returns null on no match", () => {
  assert.equal(firstMatchLine("abc\ndef", /xyz/), null);
});

test("firstMatchLine: match on line 1", () => {
  assert.equal(firstMatchLine("matchhere\nlater", /match/), 1);
});

// ── scanFile + run: integration ──

test("scanFile: real stub engine returns REAL_STUB hit", () => {
  const dir = mkdtempSync(join(tmpdir(), "sweep-real-"));
  try {
    const file = join(dir, "FooEngine.ts");
    writeFileSync(file, `const T = { ${KIENZLE}: 1800 };`); // no citation
    const hits = scanFile({ path: file, bytes: 32, isTest: false });
    assert.equal(hits.length, 1);
    assert.equal(hits[0].patternId, "P-INLINE-KC");
    assert.equal(hits[0].category, "REAL_STUB");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("scanFile: cited engine returns DOCUMENTED_FP hit", () => {
  const dir = mkdtempSync(join(tmpdir(), "sweep-cited-"));
  try {
    const file = join(dir, "FooEngine.ts");
    writeFileSync(file, `// per Altintas Table 2.1\nconst T = { ${KIENZLE}: 1800 };`);
    const hits = scanFile({ path: file, bytes: 60, isTest: false });
    assert.equal(hits.length, 1);
    assert.equal(hits[0].category, "DOCUMENTED_FP");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("scanFile: missing file returns empty array (fail-soft)", () => {
  const hits = scanFile({ path: "/nonexistent/path/Foo.ts", bytes: 0, isTest: false });
  assert.deepEqual(hits, []);
});

test("scanFile: stub-only test file → placeholder-pattern hit flagged", () => {
  const dir = mkdtempSync(join(tmpdir(), "sweep-tobe-"));
  try {
    const file = join(dir, "Foo.test.ts");
    writeFileSync(file, `expect(x).${TO_BE_DEF};`);
    const hits = scanFile({ path: file, bytes: 30, isTest: true });
    const pHit = hits.find(h => h.patternId === "P-TOBEDEFINED");
    assert.ok(pHit, "should flag placeholder pattern");
    assert.equal(pHit.category, "REAL_STUB");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("run: real codebase smoke — real-stub count must not exceed baseline (16)", () => {
  // Baseline 2026-05-27 after INLINE-KC-RESCUE-MS0/U-INLINE-KC-RESCUE-03-07:
  //   23 → 16 (2 fixes: IntegratedVerification, RealTimeMachineIntelligence
  //            + 3 allowlisted FPs: ManufacturingGenome, PipelineRegistryBridge, SpeedFeedAutopilot).
  // If this rises, a new silent-inlining engine was added — fix it BEFORE it ships.
  const r = run();
  assert.equal(r.ok, true);
  assert.ok(r.filesScanned > 8000, `expected to scan 8k+ files, got ${r.filesScanned}`);
  assert.ok(r.realStubCount <= 16, `real-stub count ${r.realStubCount} > baseline 16 — new silent-inlining detected: ${r.realStubs.slice(0, 5).map(h => h.filename).join(", ")}`);
});

test("run: all real hits are P-INLINE-KC (other patterns are clean)", () => {
  // After all 4 FP filters, the only remaining true positives are silent kc-inlining engines.
  // If any other pattern surfaces, the corresponding scope check needs review.
  const r = run();
  const nonKc = r.realStubs.filter(h => h.patternId !== "P-INLINE-KC");
  assert.equal(nonKc.length, 0, `unexpected non-KC real stub: ${JSON.stringify(nonKc[0] ?? null)}`);
});

// ── testQuality wiring: scanQuality now runs inside the standing sweep ──

test("run: testQuality surfaces a skipped test (scanQuality wired into the standing sweep)", () => {
  const dir = mkdtempSync(join(tmpdir(), "sweep-tq-"));
  try {
    const tdir = join(dir, "mcp-server", "src", "__tests__");
    mkdirSync(tdir, { recursive: true });
    const SKIP = "it." + "skip";   // concat so this test file is not self-flagged as skipped/focused
    writeFileSync(join(tdir, "skipped.test.ts"), `${SKIP}("a", () => { expect(x).${REAL_ASSERT}; });`);
    writeFileSync(join(tdir, "clean.test.ts"), `it("b", () => { expect(y).${REAL_ASSERT}; });`);
    writeFileSync(join(tdir, "afree.test.ts"), `it("c", () => { const z = 1; return z; });`);
    const r = run({ root: dir });
    assert.ok(r.testQuality, "run() exposes a testQuality object");
    assert.equal(r.testQuality.skipped.length, 1, "the skipped test is detected");
    assert.equal(r.testQuality.focused.length, 0, "no focused tests in fixtures");
    assert.equal(r.testQuality.assertionFree.length, 1, "the zero-assertion test is detected");
    assert.equal(r.testQualityCounts.skipped, 1);
    assert.equal(r.testQualityCounts.assertionFree, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("run: testQuality is fail-soft + present on the real codebase", () => {
  const r = run();
  assert.ok(r.testQuality && Array.isArray(r.testQuality.skipped), "testQuality.skipped is an array");
  assert.ok(Array.isArray(r.testQuality.focused) && Array.isArray(r.testQuality.assertionFree));
  assert.equal(typeof r.testQualityCounts.skipped, "number");
});
