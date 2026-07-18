#!/usr/bin/env node
// tier: T4
import { test } from "node:test";
import { strict as assert } from "node:assert";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parsePointerFile, buildIndex } from "./build-node-capability-index.mjs";

const SAMPLE_POINTER = `---
name: node-algorithm-alg_kalmanfilter
description: Node-indexed pointer — algorithm Algorithm — KalmanFilter → wiki knowledge/wiki/architecture/algorithms/alg-kalmanfilter.md
metadata:
  type: reference
  node_kind: algorithm
  node_id: algorithm.alg_kalmanfilter
  wiki_path: knowledge/wiki/architecture/algorithms/alg-kalmanfilter.md
  generated_at: 2026-05-23
  generator: scripts/lib/emit-node-memory-pointer.mjs
---

# Node pointer — algorithm/alg_kalmanfilter
`;

test("parsePointerFile: valid pointer extracts all fields", () => {
  const r = parsePointerFile("dummy.md", SAMPLE_POINTER);
  assert.ok(r);
  assert.equal(r.nodeId, "algorithm.alg_kalmanfilter");
  assert.equal(r.kind, "algorithm");
  assert.equal(r.slug, "alg_kalmanfilter");
  assert.equal(r.wikiPath, "knowledge/wiki/architecture/algorithms/alg-kalmanfilter.md");
  // displayName strips "Algorithm" kind prefix in description
  assert.equal(r.displayName, "Algorithm — KalmanFilter");
});

test("parsePointerFile: empty/malformed returns null", () => {
  assert.equal(parsePointerFile("x", ""), null);
  assert.equal(parsePointerFile("x", "no frontmatter here"), null);
  assert.equal(parsePointerFile("x", "---\nincomplete"), null);
  // missing required fields
  assert.equal(parsePointerFile("x", "---\nname: x\n---\nbody"), null);
});

test("parsePointerFile: handles CRLF line endings", () => {
  const crlf = SAMPLE_POINTER.replace(/\n/g, "\r\n");
  const r = parsePointerFile("x", crlf);
  assert.ok(r);
  assert.equal(r.nodeId, "algorithm.alg_kalmanfilter");
});

test("buildIndex: missing directory returns empty index", () => {
  const idx = buildIndex("/nonexistent-path-zzz-12345");
  assert.equal(idx.count, 0);
  assert.deepEqual(idx.pointers, {});
  assert.deepEqual(idx.displayNameToId, {});
});

test("buildIndex: scans dir, indexes by nodeId + displayName + slug", () => {
  const dir = mkdtempSync(join(tmpdir(), "ncpi-test-"));
  try {
    writeFileSync(join(dir, "node_algorithm_alg_kalmanfilter.md"), SAMPLE_POINTER);
    writeFileSync(join(dir, "node_engine_kienzleforceengine.md"), `---
name: node-engine-kienzleforceengine
description: Node-indexed pointer — engine Engine — KienzleForceEngine → wiki knowledge/wiki/architecture/engines/eng-kienzleforce.md
metadata:
  type: reference
  node_kind: engine
  node_id: engine.kienzleforceengine
  wiki_path: knowledge/wiki/architecture/engines/eng-kienzleforce.md
  generated_at: 2026-05-23
  generator: scripts/lib/emit-node-memory-pointer.mjs
---
body
`);
    // non-pointer file should be skipped
    writeFileSync(join(dir, "ignored.md"), "ignored content");
    writeFileSync(join(dir, "node_garbage.md"), "no frontmatter");
    const idx = buildIndex(dir, { now: 7777 });
    assert.equal(idx.builtAt, 7777);
    assert.equal(idx.count, 2);
    assert.ok(idx.pointers["algorithm.alg_kalmanfilter"]);
    assert.ok(idx.pointers["engine.kienzleforceengine"]);
    // displayName lookup
    assert.equal(idx.displayNameToId["algorithm — kalmanfilter"], "algorithm.alg_kalmanfilter");
    // slug lookup
    assert.equal(idx.displayNameToId["alg_kalmanfilter"], "algorithm.alg_kalmanfilter");
    // prefix-stripped slug lookup (alg_ stripped)
    assert.equal(idx.displayNameToId["kalmanfilter"], "algorithm.alg_kalmanfilter");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("buildIndex: counts skipped files", () => {
  const dir = mkdtempSync(join(tmpdir(), "ncpi-skip-"));
  try {
    writeFileSync(join(dir, "node_bad1.md"), "no frontmatter");
    writeFileSync(join(dir, "node_bad2.md"), "---\nincomplete");
    writeFileSync(join(dir, "node_good.md"), SAMPLE_POINTER);
    const idx = buildIndex(dir);
    assert.equal(idx.count, 1);
    assert.equal(idx.skipped, 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
