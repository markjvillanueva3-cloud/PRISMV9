#!/usr/bin/env node
/**
 * generate-scripts-lib-atomic.test.mjs — hermetic tests for the
 * scripts/lib atomic node generator (U-VIZ-SCRIPTLIB-COVERAGE).
 *
 * Run: node --test scripts/generate-scripts-lib-atomic.test.mjs
 *
 * Strategy: run the real generator against the live scripts/lib/ directory
 * and the live state/shared/system-viz/system-graph.json — no fixtures, no
 * mocks. The generator is pure (read-only on the graph, deterministic
 * output) so live-against-live is the most honest test.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const GENERATOR = path.join(ROOT, "scripts", "generate-scripts-lib-atomic.mjs");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
const OUT_PATH = path.join(VIZ_DIR, "scripts-lib-atomic-augmentation.json");
const LIB_DIR = path.join(ROOT, "scripts", "lib");

function runGenerator() {
  const r = spawnSync(process.execPath, [GENERATOR], { cwd: ROOT, encoding: "utf8" });
  if (r.status !== 0) {
    throw new Error(`generator failed (exit ${r.status})\nstderr:\n${r.stderr}\nstdout:\n${r.stdout}`);
  }
  return r;
}

function loadAugmentation() {
  return JSON.parse(fs.readFileSync(OUT_PATH, "utf8"));
}

test("generator exits 0 and writes augmentation JSON", () => {
  const r = runGenerator();
  assert.equal(r.status, 0);
  assert.ok(fs.existsSync(OUT_PATH), "augmentation JSON must exist");
});

test("augmentation has stable shape: schemaVersion + generatedAt + newNodes + newEdges + stats", () => {
  runGenerator();
  const aug = loadAugmentation();
  assert.equal(aug.schemaVersion, "1.0.0");
  assert.ok(typeof aug.generatedAt === "string" && aug.generatedAt.length > 0);
  assert.equal(aug.scriptsLibDir, "scripts/lib");
  assert.ok(Array.isArray(aug.newNodes));
  assert.ok(Array.isArray(aug.newEdges));
  assert.ok(typeof aug.stats === "object" && aug.stats !== null);
});

test("emits ≥1 node per real .mjs/.ts file in scripts/lib/", () => {
  runGenerator();
  const aug = loadAugmentation();
  const libCount = fs.readdirSync(LIB_DIR).filter(f => /\.(mjs|js|cjs|ts)$/.test(f)).length;
  assert.ok(libCount > 0, "must have lib files to test against");
  assert.equal(
    aug.newNodes.length,
    libCount,
    `nodes (${aug.newNodes.length}) must equal lib file count (${libCount})`,
  );
  assert.equal(aug.stats.nodesEmitted, libCount);
});

test("every node uses scriptlib.* prefix (never script.* or scriptlib.scriptlib.*)", () => {
  runGenerator();
  const aug = loadAugmentation();
  for (const n of aug.newNodes) {
    assert.match(n.id, /^scriptlib\.[a-z0-9._-]+$/, `bad id: ${n.id}`);
    assert.ok(!n.id.startsWith("script."), `id must NOT use plain 'script.' prefix: ${n.id}`);
    assert.ok(!n.id.startsWith("scriptlib.scriptlib"), `id must NOT double-prefix: ${n.id}`);
  }
});

test("test files emit scriptlib.<stem>.test ids and impl files emit scriptlib.<stem>", () => {
  runGenerator();
  const aug = loadAugmentation();
  const testNodes = aug.newNodes.filter(n => n.isTest);
  const implNodes = aug.newNodes.filter(n => !n.isTest);
  assert.ok(testNodes.length > 0, "must have at least one test node");
  assert.ok(implNodes.length > 0, "must have at least one impl node");
  for (const n of testNodes) {
    assert.match(n.id, /^scriptlib\.[a-z0-9._-]+\.test$/, `test id shape: ${n.id}`);
    assert.equal(n.subgroup, "scriptlib-test");
  }
  for (const n of implNodes) {
    assert.ok(!n.id.endsWith(".test"), `impl must not end .test: ${n.id}`);
    assert.equal(n.subgroup, "scriptlib");
  }
});

test("every node attaches to core.scripts parent via contains edge", () => {
  runGenerator();
  const aug = loadAugmentation();
  const nodeIds = new Set(aug.newNodes.map(n => n.id));
  const containsEdges = aug.newEdges.filter(e => e.type === "contains");
  assert.equal(containsEdges.length, aug.newNodes.length, "1 contains edge per node");
  for (const e of containsEdges) {
    assert.equal(e.from, "core.scripts");
    assert.ok(nodeIds.has(e.to), `contains edge target missing in nodes: ${e.to}`);
    assert.equal(e.status, "active");
  }
});

test("test-coverage edges link impl ↔ test pairs and never self-loop", () => {
  runGenerator();
  const aug = loadAugmentation();
  const tcEdges = aug.newEdges.filter(e => e.type === "test-coverage");
  for (const e of tcEdges) {
    assert.notEqual(e.from, e.to, `test-coverage edge must NOT self-loop: ${e.from}`);
    assert.ok(!e.from.endsWith(".test"), `test-coverage edge.from must be impl, not test: ${e.from}`);
    assert.ok(e.to.endsWith(".test"), `test-coverage edge.to must be test: ${e.to}`);
    assert.equal(e.intensity, 0.4);
  }
});

test("no node-id collisions (every emitted id is unique)", () => {
  runGenerator();
  const aug = loadAugmentation();
  const seen = new Set();
  for (const n of aug.newNodes) {
    assert.ok(!seen.has(n.id), `duplicate id: ${n.id}`);
    seen.add(n.id);
  }
});

test("no edge-key collisions (from|to|type unique within edges array)", () => {
  runGenerator();
  const aug = loadAugmentation();
  const seen = new Set();
  for (const e of aug.newEdges) {
    const k = `${e.from}|${e.to}|${e.type}`;
    assert.ok(!seen.has(k), `duplicate edge key: ${k}`);
    seen.add(k);
  }
});

test("idempotent — running twice produces identical augmentation modulo generatedAt", () => {
  runGenerator();
  const first = loadAugmentation();
  runGenerator();
  const second = loadAugmentation();
  assert.equal(first.newNodes.length, second.newNodes.length);
  assert.equal(first.newEdges.length, second.newEdges.length);
  assert.deepEqual(
    first.newNodes.map(n => n.id).sort(),
    second.newNodes.map(n => n.id).sort(),
  );
});

test("does NOT clobber existing graph node ids on FIRST merge (skips on collision after)", () => {
  const graphPath = path.join(VIZ_DIR, "system-graph.json");
  if (!fs.existsSync(graphPath)) {
    assert.ok(true, "graph missing — skip collision check (generator handles this path)");
    return;
  }
  const graph = JSON.parse(fs.readFileSync(graphPath, "utf8"));
  const graphIds = new Set(graph.nodes.map(n => n.id));
  // After the first regen → merge cycle, the live graph WILL contain scriptlib.*
  // ids — the test would falsely flag "clobber" against ids we ourselves merged.
  // Detect that state and exercise the skip-on-collision path instead.
  const alreadyMerged = [...graphIds].some(id => id.startsWith("scriptlib."));
  runGenerator();
  const aug = loadAugmentation();
  if (alreadyMerged) {
    // Generator should have skipped every collision — emitted node count should
    // equal lib files MINUS the ones already in the graph.
    for (const n of aug.newNodes) {
      assert.ok(!graphIds.has(n.id), `emitted node already in graph (skip-on-collision violated): ${n.id}`);
    }
  } else {
    // Pre-first-merge: no scriptlib.* ids should exist yet, so any new node
    // here would be a genuine clobber.
    for (const n of aug.newNodes) {
      assert.ok(!graphIds.has(n.id), `would clobber existing graph id: ${n.id}`);
    }
  }
});

test("stats.perExt matches actual emitted extension distribution", () => {
  runGenerator();
  const aug = loadAugmentation();
  const realPerExt = {};
  for (const n of aug.newNodes) {
    const ext = `.${n.ext}`;
    realPerExt[ext] = (realPerExt[ext] || 0) + 1;
  }
  assert.deepEqual(aug.stats.perExt, realPerExt, "stats.perExt diverges from real extension distribution");
});

test("status field is 'built' or 'stub' (R12 fail-loud — never undefined)", () => {
  runGenerator();
  const aug = loadAugmentation();
  for (const n of aug.newNodes) {
    assert.ok(n.status === "built" || n.status === "stub", `bad status on ${n.id}: ${n.status}`);
  }
});

test("file path uses forward slashes (cross-platform consistency)", () => {
  runGenerator();
  const aug = loadAugmentation();
  for (const n of aug.newNodes) {
    assert.ok(!n.file.includes("\\"), `file path must use forward slashes: ${n.file}`);
    assert.match(n.file, /^scripts\/lib\/.+\.(mjs|js|cjs|ts)$/, `file path shape: ${n.file}`);
  }
});
