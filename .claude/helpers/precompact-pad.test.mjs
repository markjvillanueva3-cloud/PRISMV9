// Regression tests for padFileToBytes() in precompact-handoff.mjs
// Run: node --test H:/prism/.claude/helpers/precompact-pad.test.mjs

import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const { padFileToBytes } = await import(`file:///${path.resolve("H:/prism/.claude/helpers/precompact-handoff.mjs").replace(/\\/g, "/")}?t=${Date.now()}`);

const TMP_DIR = path.join(os.tmpdir(), `precompact-pad-test-${process.pid}-${Date.now()}`);

before(() => { fs.mkdirSync(TMP_DIR, { recursive: true }); });
after(() => { try { fs.rmSync(TMP_DIR, { recursive: true, force: true }); } catch {} });

let counter = 0;
function tmpFile(content) {
  const p = path.join(TMP_DIR, `f-${counter++}.md`);
  fs.writeFileSync(p, content);
  return p;
}

describe("padFileToBytes — exact-size invariant", () => {
  it("pads a small file to exactly the target", () => {
    const f = tmpFile("hi");  // 2 bytes
    const status = padFileToBytes(f, 4096);
    assert.match(status, /^padded=/);
    const size = fs.statSync(f).size;
    assert.equal(size, 4096);
  });
  it("pads a medium file to exactly the target", () => {
    const f = tmpFile("a".repeat(2000));
    padFileToBytes(f, 4096);
    assert.equal(fs.statSync(f).size, 4096);
  });
  it("pads to alternate sizes (8192, 16384)", () => {
    const a = tmpFile("seed");
    padFileToBytes(a, 8192);
    assert.equal(fs.statSync(a).size, 8192);
    const b = tmpFile("seed");
    padFileToBytes(b, 16384);
    assert.equal(fs.statSync(b).size, 16384);
  });
  it("skip-oversize: file already larger than target stays unchanged", () => {
    const f = tmpFile("x".repeat(5000));
    const before = fs.readFileSync(f, "utf-8");
    const status = padFileToBytes(f, 4096);
    assert.match(status, /^pad-skipped-oversize/);
    assert.equal(fs.statSync(f).size, 5000);
    assert.equal(fs.readFileSync(f, "utf-8"), before);
  });
  it("skip-oversize: file exactly equal to target stays unchanged", () => {
    const f = tmpFile("x".repeat(4096));
    const status = padFileToBytes(f, 4096);
    assert.match(status, /^pad-skipped-oversize/);
    assert.equal(fs.statSync(f).size, 4096);
  });
});

describe("padFileToBytes — content preservation", () => {
  it("preserves original RESUME content intact", () => {
    const original = "## RESUME\nDo the thing in foo.ts line 42.\n## STATE\n(test)\n";
    const f = tmpFile(original);
    padFileToBytes(f, 4096);
    const content = fs.readFileSync(f, "utf-8");
    assert.ok(content.startsWith(original), "original content must be at start of padded file");
    // RESUME extraction regex should still match
    const m = content.match(/## RESUME\n([\s\S]*?)(?=\n##|\n$)/);
    assert.ok(m);
    assert.equal(m[1].trim(), "Do the thing in foo.ts line 42.");
  });
  it("padding is inside an HTML comment (invisible to markdown)", () => {
    const f = tmpFile("hi");
    padFileToBytes(f, 4096);
    const content = fs.readFileSync(f, "utf-8");
    assert.match(content, /<!-- pad: x+ -->/);
  });
  it("padding does not break the RESUME extractor with multi-section handoff", () => {
    const original = [
      "## RESUME",
      "real resume directive here",
      "",
      "## STATE",
      "(test)",
      "",
      "## CONTEXT",
      "extra context block",
      "",
    ].join("\n");
    const f = tmpFile(original);
    padFileToBytes(f, 4096);
    const content = fs.readFileSync(f, "utf-8");
    const m = content.match(/## RESUME\n([\s\S]*?)(?=\n##|\n$)/);
    assert.ok(m);
    assert.equal(m[1].trim(), "real resume directive here");
  });
});

describe("padFileToBytes — edge cases", () => {
  it("returns pad-skipped-missing on nonexistent file", () => {
    const status = padFileToBytes(path.join(TMP_DIR, "does-not-exist.md"), 4096);
    assert.equal(status, "pad-skipped-missing");
  });
  it("handles deficit smaller than fence size (bare-spaces padding)", () => {
    // fence = "\n\n<!-- pad: " (12) + " -->\n" (5) = 17 bytes reserved
    // Make file 4090 bytes; target 4096; deficit 6 — too small for fence
    const f = tmpFile("a".repeat(4090));
    const status = padFileToBytes(f, 4096);
    assert.match(status, /^padded=\d+-bare/);
    assert.equal(fs.statSync(f).size, 4096);
  });
  it("size 0 file pads to target", () => {
    const f = tmpFile("");
    padFileToBytes(f, 4096);
    assert.equal(fs.statSync(f).size, 4096);
  });
  it("two consecutive pad-calls are idempotent (skip-oversize on 2nd)", () => {
    const f = tmpFile("hi");
    padFileToBytes(f, 4096);
    assert.equal(fs.statSync(f).size, 4096);
    const second = padFileToBytes(f, 4096);
    assert.match(second, /^pad-skipped-oversize/);
    assert.equal(fs.statSync(f).size, 4096);
  });
});

describe("padFileToBytes — determinism across N handoffs", () => {
  it("five different-size source files all pad to identical target size", () => {
    const sources = ["a", "ab".repeat(100), "x".repeat(500), "y".repeat(1500), "z".repeat(3000)];
    const target = 4096;
    const finalSizes = sources.map(s => {
      const f = tmpFile(s);
      padFileToBytes(f, target);
      return fs.statSync(f).size;
    });
    for (const sz of finalSizes) assert.equal(sz, target);
  });
});
