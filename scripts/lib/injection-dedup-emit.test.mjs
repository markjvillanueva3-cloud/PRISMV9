// injection-dedup-emit.test.mjs
// ------------------------------
// Tests the one-call dedup wrapper. Uses a temp sidecar so the real fleet cache
// is never touched. R9: each test fails if the gate logic breaks.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { dedupedContext } from "./injection-dedup-emit.mjs";

function tmpSidecar() {
  const dir = mkdtempSync(join(tmpdir(), "dedup-emit-"));
  return { dir, path: join(dir, "cache.json") };
}
const isMarker = (s) => typeof s === "string" && s.startsWith("🔁") && /dedup/.test(s);

test("first-emit returns the block and records it", () => {
  const { dir, path } = tmpSidecar();
  try {
    const out = dedupedContext("tagA", "BLOCK-CONTENT", "sessAAA1", { sidecar: path });
    assert.equal(out, "BLOCK-CONTENT", "first emit returns the block verbatim");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("second emit (same tag/sid/content) returns the dedup marker (shorter than a realistic block)", () => {
  const { dir, path } = tmpSidecar();
  // realistic block length (a real injector block is hundreds of chars) so the
  // token-saving property (marker shorter than block) actually holds.
  const BLOCK = "## Domain block\n" + "x".repeat(400);
  try {
    const first = dedupedContext("tagB", BLOCK, "sessBBB2", { sidecar: path });
    assert.equal(first, BLOCK, "first → full block");
    const second = dedupedContext("tagB", BLOCK, "sessBBB2", { sidecar: path });
    assert.ok(isMarker(second), "repeat → marker");
    assert.ok(second.length < first.length, "marker shorter than the block (token-save)");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("content change re-emits (content-keyed, not call-count)", () => {
  const { dir, path } = tmpSidecar();
  try {
    assert.equal(dedupedContext("tagC", "V1", "sessCCC3", { sidecar: path }), "V1");
    assert.ok(isMarker(dedupedContext("tagC", "V1", "sessCCC3", { sidecar: path })), "identical → marker");
    assert.equal(dedupedContext("tagC", "V2-changed", "sessCCC3", { sidecar: path }), "V2-changed", "new content → re-emit");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("different sid is independent (no cross-session collision)", () => {
  const { dir, path } = tmpSidecar();
  try {
    assert.equal(dedupedContext("tagD", "X", "sidONE111", { sidecar: path }), "X", "sid ONE first-emit");
    // sid ONE repeat → marker; sid TWO with the SAME content → still first-emit (block)
    assert.ok(isMarker(dedupedContext("tagD", "X", "sidONE111", { sidecar: path })), "sid ONE repeat → marker");
    assert.equal(dedupedContext("tagD", "X", "sidTWO222", { sidecar: path }), "X", "different sid emits independently");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("PRISM_INJECTION_DEDUP_DISABLE=1 always returns the block", () => {
  const { dir, path } = tmpSidecar();
  const prev = process.env.PRISM_INJECTION_DEDUP_DISABLE;
  process.env.PRISM_INJECTION_DEDUP_DISABLE = "1";
  try {
    assert.equal(dedupedContext("tagE", "Y", "sessEEE5", { sidecar: path }), "Y");
    assert.equal(dedupedContext("tagE", "Y", "sessEEE5", { sidecar: path }), "Y", "still block when disabled");
  } finally {
    if (prev === undefined) delete process.env.PRISM_INJECTION_DEDUP_DISABLE; else process.env.PRISM_INJECTION_DEDUP_DISABLE = prev;
    rmSync(dir, { recursive: true, force: true });
  }
});

test("missing sid / empty block / missing hookTag → block unchanged (fail-open)", () => {
  const { dir, path } = tmpSidecar();
  try {
    assert.equal(dedupedContext("tagF", "Z", "", { sidecar: path }), "Z", "no sid → emit");
    assert.equal(dedupedContext("tagF", "Z", null, { sidecar: path }), "Z");
    assert.equal(dedupedContext("", "Z", "sessFFF6", { sidecar: path }), "Z", "no tag → emit");
    assert.equal(dedupedContext("tagF", "", "sessFFF6", { sidecar: path }), "", "empty block returned as-is");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("corrupt sidecar → treated as first-emit (fail-open), never throws", () => {
  const { dir, path } = tmpSidecar();
  try {
    writeFileSync(path, "{ not valid json", "utf8");
    const out = dedupedContext("tagG", "W", "sessGGG7", { sidecar: path });
    assert.equal(out, "W", "corrupt cache → emit full block");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
