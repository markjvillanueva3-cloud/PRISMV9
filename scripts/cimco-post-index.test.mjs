// cimco-post-index.test.mjs — real-behavior tests for the CIMCO post/controller indexer.
// Run: node --test scripts/cimco-post-index.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, writeFileSync, rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseJsPost, buildPostIndex, DEFAULT_POSTS, DEFAULT_RPOST } from "./cimco-post-index.mjs";

test("parseJsPost: extracts PostInfo + globals from a CIMCO-style .js post (temp fixture)", () => {
  const dir = mkdtempSync(join(tmpdir(), "cimco-post-"));
  const f = join(dir, "demo.js");
  writeFileSync(
    f,
    `globals = { decimalMark: ".", xDiameterProg: true, xAxisName: "X", zAxisName: "Z" };
PostInfo = { title: 'ISO Turning', summary: 'Generic turning Post.', author: 'CIMCO A/S', version: "1.0", type: POST_TYPE_TURN };`
  );
  try {
    const p = parseJsPost(f);
    assert.equal(p.parsed, true);
    assert.equal(p.title, "ISO Turning");
    assert.equal(p.type, "POST_TYPE_TURN");
    assert.equal(p.version, "1.0");
    assert.equal(p.author, "CIMCO A/S");
    assert.equal(p.diameterProgramming, true);
    assert.equal(p.xAxisName, "X");
    assert.equal(p.zAxisName, "Z");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("parseJsPost: a file with no PostInfo block is flagged parsed:false (no throw, no false data)", () => {
  const dir = mkdtempSync(join(tmpdir(), "cimco-post-"));
  const f = join(dir, "nopi.js");
  writeFileSync(f, "// just a comment, no PostInfo\nvar x = 1;\n");
  try {
    const p = parseJsPost(f);
    assert.equal(p.parsed, false);
    assert.match(p.error, /no PostInfo/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("parseJsPost: a missing file returns parsed:false (graceful, never throws)", () => {
  const p = parseJsPost("Z:/no/such/post.js");
  assert.equal(p.parsed, false);
  assert.ok(p.error);
});

const corpusPresent = existsSync(DEFAULT_POSTS);

test("integration: indexes the real .js posts with a 100% parse rate", (t) => {
  if (!corpusPresent) return t.skip("CIMCO corpus not present on this machine");
  const idx = buildPostIndex();
  assert.equal(idx.schemaVersion, "1.0.0");
  assert.ok(idx.jsPostCount >= 20, `expected >=20 js posts, got ${idx.jsPostCount}`);
  assert.equal(idx.jsParsedCount, idx.jsPostCount, "every .js post must parse (regex must not silently miss)");
  assert.ok((idx.byType.POST_TYPE_TURN || 0) >= 1);
  assert.ok((idx.byType.POST_TYPE_MILL || 0) >= 1);
  for (const p of idx.jsPosts) {
    if (p.parsed) assert.ok(p.type, `parsed post ${p.file} missing type`);
  }
});

test("integration: catalogs the .eRPost vendor controller defs (binary inventory)", (t) => {
  if (!existsSync(DEFAULT_RPOST)) return t.skip("CIMCO RPost corpus not present");
  const idx = buildPostIndex();
  assert.ok(idx.rpostCount >= 30, `expected >=30 controller defs, got ${idx.rpostCount}`);
  assert.ok(idx.vendorCount >= 5);
  for (const r of idx.rposts) {
    assert.equal(r.binary, true); // .eRPost is compiled — never claimed text-authorable
    assert.ok(r.vendor && r.name);
  }
});
