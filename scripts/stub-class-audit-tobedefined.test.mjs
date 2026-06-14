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
import { isStubTest, scan } from "./stub-class-audit-tobedefined.mjs";

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

test("isStubTest: real-world false-positive guard — Sandvik citation in test data", () => {
  const src = `
    it("validates Kienzle force", () => {
      const r = compute({ kc1_1: 1800, mc: 0.25, ap: 2, fz: 0.2 });
      expect(r).${P};
      expect(r.fc).${REAL_CLOSE}; // Sandvik table 6.2
    });`;
  assert.equal(isStubTest(src), false);
});
