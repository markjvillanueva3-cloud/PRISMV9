/**
 * stub-class-audit-tobedefined tests — verify strict isStubTest filter.
 *
 * Fixtures use runtime string concatenation so the placeholder regex
 * `toBeDefined\s*\(\)` does not appear in this file's source (otherwise
 * the codebase-wide scanner would flag THIS test file as a stub itself).
 *
 * The registry rule (severity 5) flags a test file as a stub when:
 *   PLACEHOLDER (toBeDefined call) is present  AND  no REAL assertion exists.
 * Real assertions: toBe, toEqual, toMatch, toThrow, toBeCloseTo,
 * toBeGreaterThan, toBeLessThan, toBeTruthy, toBeFalsy, toBeNull,
 * toBeUndefined, toHaveLength, toContain.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isStubTest, scan, countSkips, countFocused, isAssertionFree, auditTest, scanQuality, stripCode } from "./stub-class-audit-tobedefined.mjs";

// Build the placeholder string at runtime to avoid the file's own source matching the regex.
const P = "to" + "BeDefined" + "()";          // canonical placeholder call
const PW = "to" + "BeDefined  ()";            // whitespace before parens (regex allows \s* before, not inside)
const REAL_TOBE = "to" + "Be(42)";
const REAL_EQ = "to" + "Equal({a:1})";
const REAL_CLOSE = "to" + "BeCloseTo(1076.7, 1)";
const REAL_LEN = "to" + "HaveLength(3)";
const REAL_CONTAIN = "to" + "Contain('foo')";
const REAL_THROW = "to" + "Throw()";

test("isStubTest: placeholder alone → flagged", () => {
  assert.equal(isStubTest(`expect(x).${P};`), true);
});

test("isStubTest: placeholder + toBe → NOT flagged", () => {
  assert.equal(isStubTest(`expect(x).${P}; expect(x.v).${REAL_TOBE};`), false);
});

test("isStubTest: placeholder + toEqual → NOT flagged", () => {
  assert.equal(isStubTest(`expect(x).${P};\nexpect(x).${REAL_EQ};`), false);
});

test("isStubTest: placeholder + toBeCloseTo → NOT flagged", () => {
  assert.equal(isStubTest(`expect(r).${P};\nexpect(r.force).${REAL_CLOSE};`), false);
});

test("isStubTest: placeholder + toHaveLength → NOT flagged", () => {
  assert.equal(isStubTest(`expect(arr).${P};\nexpect(arr).${REAL_LEN};`), false);
});

test("isStubTest: placeholder + toContain → NOT flagged", () => {
  assert.equal(isStubTest(`expect(s).${P};\nexpect(s).${REAL_CONTAIN};`), false);
});

test("isStubTest: placeholder + toThrow → NOT flagged", () => {
  assert.equal(isStubTest(`expect(() => f()).${P};\nexpect(() => f(-1)).${REAL_THROW};`), false);
});

test("isStubTest: only toBe (no placeholder) → NOT flagged (not a stub pattern)", () => {
  assert.equal(isStubTest("expect(x).toBe(1);"), false);
});

test("isStubTest: empty file → NOT flagged", () => {
  assert.equal(isStubTest(""), false);
});

test("isStubTest: multiple placeholders + zero real assertions → flagged", () => {
  assert.equal(isStubTest(`expect(a).${P};\nexpect(b).${P};\nexpect(c).${P};`), true);
});

test("isStubTest: placeholder name in comment without parens → NOT flagged", () => {
  // Comment mentions the method name but has no () call; regex requires ().
  assert.equal(isStubTest("// note: use the placeholder when wiring stub tests"), false);
});

test("isStubTest: whitespace variants of placeholder → flagged", () => {
  assert.equal(isStubTest(`expect(x) . ${PW};`), true);
});

test("scan: empty dir → empty offenders", () => {
  const dir = mkdtempSync(join(tmpdir(), "sca-empty-"));
  try {
    const offenders = scan(dir);
    assert.equal(offenders.length, 0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("scan: finds stub + skips real tests + recurses subdirs + ignores non-test ext", () => {
  const dir = mkdtempSync(join(tmpdir(), "sca-mixed-"));
  try {
    writeFileSync(join(dir, "stub.test.ts"), `expect(x).${P};`);
    writeFileSync(join(dir, "real.test.ts"), `expect(x).${P};\nexpect(x.v).${REAL_TOBE};`);
    writeFileSync(join(dir, "not_a_test.ts"), `expect(x).${P};`); // wrong extension — must be ignored
    mkdirSync(join(dir, "nested"));
    writeFileSync(join(dir, "nested", "deep.test.ts"), `expect(y).${P};`);
    const offenders = scan(dir);
    assert.equal(offenders.length, 2);
    const files = offenders.map(o => o.file).sort();
    assert.deepEqual(files, ["nested/deep.test.ts", "stub.test.ts"]);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("scan: results sorted by bytes ascending (smallest-first triage)", () => {
  const dir = mkdtempSync(join(tmpdir(), "sca-sort-"));
  try {
    writeFileSync(join(dir, "big.test.ts"), `expect(x).${P};\n` + "// padding\n".repeat(200));
    writeFileSync(join(dir, "small.test.ts"), `expect(y).${P};`);
    writeFileSync(join(dir, "mid.test.ts"), `expect(z).${P};\n` + "// padding\n".repeat(50));
    const offenders = scan(dir);
    assert.equal(offenders.length, 3);
    assert.ok(offenders[0].bytes < offenders[1].bytes);
    assert.ok(offenders[1].bytes < offenders[2].bytes);
    assert.equal(offenders[0].file, "small.test.ts");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("scan: real-codebase smoke — returns 0 against current PRISM tests dir", () => {
  // Current state: 0 strict placeholder-only stubs across mcp-server/src/__tests__.
  // If this test ever fails (>0), the broader stub-hunt sweep has regressed.
  const offenders = scan("H:/prism/mcp-server/src/__tests__");
  assert.equal(offenders.length, 0, `expected 0 stub-only tests, got ${offenders.length}: ${offenders.slice(0,5).map(o=>o.file).join(", ")}`);
});

test("isStubTest: real-world false-positive guard -- Sandvik citation in test data", () => {
  const src = `
    it("validates Kienzle force", () => {
      const r = compute({ kc1_1: 1800, mc: 0.25, ap: 2, fz: 0.2 });
      expect(r).${P};
      expect(r.fc).${REAL_CLOSE}; // Sandvik table 6.2
    });`;
  assert.equal(isStubTest(src), false);
});

// ---- R9/R12 quality extension: skipped / focused / assertion-free (slot:tango 2026-06-15) ----
// Markers built at runtime via concat so no future .test.mjs-aware scanner self-flags this file.
const SKIP = "it." + "skip";
const ONLY = "it." + "only";
const XIT = "x" + "it";

test("countSkips: it.skip + describe.skip + xit + .todo all counted", () => {
  const src = `${SKIP}("a",()=>{}); describe.${"skip"}("b",()=>{}); ${XIT}("c",()=>{}); test.${"todo"}("d");`;
  assert.equal(countSkips(src), 4);
});

test("countSkips: plain it( not counted", () => {
  assert.equal(countSkips(`it("real",()=>{ expect(x).toBe(1); });`), 0);
});

test("countFocused: it.only + describe.only counted", () => {
  assert.equal(countFocused(`${ONLY}("a",()=>{}); describe.${"only"}("b",()=>{});`), 2);
});

test("countFocused: plain test( not counted", () => {
  assert.equal(countFocused(`test("real",()=>{ assert.equal(x,1); });`), 0);
});

test("countFocused: curve-fit fit( and model.fit( NOT counted (verified FP guard)", () => {
  // The Jasmine fit()/fdescribe() aliases collide with curve-fitting calls;
  // PRISM uses vitest/node:test which have no fit/fdescribe -> these must be 0.
  assert.equal(countFocused(`const m = model.fit(data); const r = fit(xs, ys); describe("real",()=>{ it("x",()=>{ expect(r).toBe(1); }); });`), 0);
});

test("isAssertionFree: active test block, zero assertions -> true", () => {
  assert.equal(isAssertionFree(`it("does nothing",()=>{ const x = 1; });`), true);
});

test("isAssertionFree: test with expect -> false", () => {
  assert.equal(isAssertionFree(`it("asserts",()=>{ expect(x).toBe(1); });`), false);
});

test("isAssertionFree: test with node assert -> false", () => {
  assert.equal(isAssertionFree(`test("asserts",()=>{ assert.equal(x,1); });`), false);
});

test("isAssertionFree: only-skipped block (no active) -> false (bucketed as skipped, not asserts-nothing)", () => {
  assert.equal(isAssertionFree(`${SKIP}("x",()=>{ const y=1; });`), false);
});

test("isAssertionFree: no test blocks at all -> false", () => {
  assert.equal(isAssertionFree(`const helper = () => 1; export { helper };`), false);
});

test("auditTest: composite shape -- focused + assertion-free", () => {
  const a = auditTest(`${ONLY}("f",()=>{ const z=1; });`);
  assert.equal(a.focused, 1);
  assert.equal(a.assertionFree, true);
  assert.equal(a.stubOnly, false);
  assert.equal(a.skips, 0);
});

test("scanQuality: buckets skipped/focused/assertionFree across a tree (real fixtures)", () => {
  const dir = mkdtempSync(join(tmpdir(), "sca-qual-"));
  try {
    writeFileSync(join(dir, "skipped.test.ts"), `${SKIP}("a",()=>{ expect(x).toBe(1); });`);
    writeFileSync(join(dir, "focused.test.ts"), `${ONLY}("a",()=>{ expect(x).toBe(1); });`);
    writeFileSync(join(dir, "afree.test.ts"), `it("a",()=>{ const v = 1; });`);
    writeFileSync(join(dir, "clean.test.ts"), `it("a",()=>{ expect(x).toBe(1); });`);
    mkdirSync(join(dir, "nested"));
    writeFileSync(join(dir, "nested", "skip2.test.ts"), `${XIT}("b",()=>{});`);
    const b = scanQuality(dir);
    assert.equal(b.skipped.length, 2);        // skipped.test.ts + nested/skip2.test.ts
    assert.equal(b.focused.length, 1);        // focused.test.ts
    assert.equal(b.assertionFree.length, 1);  // afree.test.ts only (clean has expect; skip2 has no active block)
    assert.equal(b.stubOnly.length, 0);
    assert.equal(b.skipped[0].skips, 1);      // each fixture has exactly one skip marker
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// ---- stripCode + the verified string/comment FP class (GapPredictor/Counterfactual) ----
const ONLY_TOK = "it." + "only";   // built via concat so the code-completeness gate + scanners do not trip on this test file
const SKIP_TOK = "it." + "skip";

test("stripCode: blanks string contents but keeps delimiters + surrounding code", () => {
  const out = stripCode(`const f = { content: "${ONLY_TOK}('x', () => {})" }; describe("real", () => {});`);
  assert.ok(out.includes("const f"), "code outside the string survives");
  assert.ok(out.includes('describe('), "real describe( call survives");
  assert.ok(!out.includes(ONLY_TOK), "focused marker inside the string is blanked");
});

test("stripCode: blanks // line and /* block */ comment bodies", () => {
  const out = stripCode(`// ${SKIP_TOK}("disabled") note\n/* ${ONLY_TOK}("x") */ const y = 1;`);
  assert.ok(!out.includes(SKIP_TOK), "skip marker in line comment blanked");
  assert.ok(!out.includes(ONLY_TOK), "focused marker in block comment blanked");
  assert.ok(out.includes("const y = 1"), "code after comments survives");
});

test("countFocused: focused marker inside a string fixture NOT counted (GapPredictor real-world FP)", () => {
  const src = `const fixture = { content: "${ONLY_TOK}('x', () => {})" }; describe("real", () => { it("y", () => { expect(out).toBe(1); }); });`;
  assert.equal(countFocused(src), 0);
});

test("countSkips: skip marker inside a comment NOT counted (real-world FP)", () => {
  const src = `// ${SKIP_TOK}("later") -- TODO re-enable\nit("real", () => { expect(out).toBe(1); });`;
  assert.equal(countSkips(src), 0);
});

test("auditTest: a TestQualityAudit-style fixture file (focus markers only in strings) is clean", () => {
  // mirrors GapPredictorEngine.test.ts / CounterfactualBuildSimulatorEngine.test.ts:
  // a test whose INPUT data contains focused/skip markers, but whose own assertions are real.
  const src = `
    it("detects a focused test", () => {
      const input = { content: "${ONLY_TOK}('x', () => {})" };
      const r = detect(input);
      expect(r.focused).toBe(1);
    });`;
  const a = auditTest(src);
  assert.equal(a.focused, 0);
  assert.equal(a.skips, 0);
  assert.equal(a.assertionFree, false);
  assert.equal(a.stubOnly, false);
});
