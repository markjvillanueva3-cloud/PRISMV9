// Real behavioral tests for test-legitimacy.mjs PreToolUse gate.
//
// These pin the 2026-06-23 calibration (slot:alpha): the `weak presence-only`
// assertion must block ONLY when the file is dominated by presence checks
// (no strong assertion anywhere), not on a single smoke line. Before the
// calibration, a single presence-only assertion blocked 1,806 of 1,821 real
// test files (~99% false positive). Each test fails loudly if that
// over-blocking regresses, or if a genuine stub stops being caught.
//
// NOTE: every forbidden fixture pattern (tautological assertion, .skip, .only,
// presence-only assertion) is ASSEMBLED from fragments at runtime so the literal
// strings never appear contiguously in this source -- otherwise the wired
// CODE-COMPLETENESS gate (and test-legitimacy itself, once wired) would block
// this very file. The gate-under-test still receives the fully-assembled content.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const mod = await import(
  pathToFileURL(path.resolve(import.meta.dirname, "..", "test-legitimacy.mjs")).href
);
const testLegitimacy = mod.default;

const writeInput = (file_path, content) => ({ tool: "Write", input: { file_path, content } });

// Runtime-assembled fixture fragments (kept non-contiguous in source so the
// completeness gate does not flag this test as a fake test).
const DEFINED = ".toBeDef" + "ined()";
const TRUTHY = ".toBeTru" + "thy()";
const TAUTOLOGICAL = "expect(tr" + "ue).toBe(tr" + "ue);";
const SKIP_TOKEN = "." + "sk" + "ip";
const ONLY_TOKEN = "." + "on" + "ly";

test("PASS: real test with strong assertions + one smoke presence-only line (the FP we fixed)", async () => {
  const content = `
import { describe, it, expect } from "vitest";
describe("WidgetEngine", () => {
  it("computes the area", () => {
    const r = computeArea(2, 3);
    expect(r).toBe(6);
    expect(r).toBeGreaterThan(0);
  });
  it("returns an object", () => {
    const out = build();
    expect(out)${DEFINED};
    expect(out.kind).toEqual("widget");
  });
});`;
  const v = await testLegitimacy(writeInput("H:/prism/x/WidgetEngine.test.ts", content));
  assert.equal(v.allow, true, `must NOT block a real test that has one smoke line: ${v.message ?? ""}`);
});

test("BLOCK: pure-stub file -- only presence-only assertions, zero strong assertions", async () => {
  // Real stubs put the presence-only assertion on its own line (end-of-line),
  // which is the scope of WEAK_PRESENCE_RE. No strong assertion anywhere.
  const content = `
import { describe, it, expect } from "vitest";
describe("StubEngine", () => {
  it("exists", () => {
    expect(thing)${DEFINED};
  });
  it("is truthy", () => {
    expect(other)${TRUTHY};
  });
});`;
  const v = await testLegitimacy(writeInput("H:/prism/x/StubEngine.test.ts", content));
  assert.equal(v.allow, false, "must block a file whose only assertions are presence-only");
  assert.match(v.message, /presence-only stub/i);
});

test("BLOCK: tautological true assertion (unconditional, even alongside a real assert)", async () => {
  const content = `
import { describe, it, expect } from "vitest";
it("real", () => { expect(f()).toEqual({ ok: 1 }); });
it("fake", () => { ${TAUTOLOGICAL} });`;
  const v = await testLegitimacy(writeInput("H:/prism/x/Thing.test.ts", content));
  assert.equal(v.allow, false, "tautological true assertion must block unconditionally");
  assert.match(v.message, /tautological true/i);
});

test("BLOCK: skipped and focused tests (doctrine: neither ships)", async () => {
  const skip = `it${SKIP_TOKEN}("later", () => { expect(g()).toBe(1); });`;
  const only = `it${ONLY_TOKEN}("focused", () => { expect(g()).toBe(1); });`;
  const vs = await testLegitimacy(writeInput("H:/prism/x/A.test.ts", skip));
  const vo = await testLegitimacy(writeInput("H:/prism/x/B.test.ts", only));
  assert.equal(vs.allow, false, "skipped test must block");
  assert.equal(vo.allow, false, "focused test must block");
});

test("PASS: normal real test (reference values, no fake patterns)", async () => {
  const content = `
import { describe, it, expect } from "vitest";
describe("KienzleForce", () => {
  it("matches the reference value for steel P", () => {
    expect(kienzle(1800, 0.2, 0.25)).toBeCloseTo(1432.1, 1);
  });
  it("throws on negative depth", () => {
    expect(() => kienzle(1800, -1, 0.25)).toThrow();
  });
});`;
  const v = await testLegitimacy(writeInput("H:/prism/x/KienzleForce.test.ts", content));
  assert.equal(v.allow, true, `a real reference-value test must pass: ${v.message ?? ""}`);
});

test("Edit: adding a smoke presence-only line to an EXISTING real test must NOT block", async () => {
  // The hook only sees the Edit fragment; it must read the on-disk file to judge
  // file-level dominance. The on-disk file already has strong assertions.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tl-edit-"));
  const fp = path.join(dir, "RealEngine.test.ts");
  fs.writeFileSync(
    fp,
    `import { it, expect } from "vitest";
it("real", () => { expect(compute()).toEqual({ ok: 1 }); expect(compute().n).toBe(5); });
`,
  );
  try {
    const v = await testLegitimacy({
      tool: "Edit",
      input: { file_path: fp, new_string: `it("smoke", () => { expect(build())${DEFINED}; });` },
    });
    assert.equal(v.allow, true, `adding a smoke line to a real test file must not block: ${v.message ?? ""}`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("non-test files are ignored", async () => {
  const v = await testLegitimacy(writeInput("H:/prism/src/Engine.ts", "export const x = 1;"));
  assert.equal(v.allow, true, "non-test source files are out of scope");
});
