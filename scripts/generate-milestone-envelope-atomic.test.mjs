// generate-milestone-envelope-atomic.test.mjs
// Run: node --test H:/prism/scripts/generate-milestone-envelope-atomic.test.mjs
//
// Real-value assertions only. Covers slugify / envelopeStatus / readEnvelopes
// pure helpers + the generate() join against fixture graph + fixture
// milestones dirs (no 405 MB live graph needed). Happy path + ≥3 failure
// modes (graph missing, graph parse fail, malformed envelope) + ≥2
// adversarial inputs (slug collision, non-object JSON, null id) + ≥3
// spanning status configurations.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  slugify, envelopeStatus, readEnvelopes, generate,
} from "./generate-milestone-envelope-atomic.mjs";

// ── fixtures ──────────────────────────────────────────────────────────────
function tmp() {
  return mkdtempSync(join(tmpdir(), "ms-env-test-"));
}
function writeJson(dir, name, obj) {
  writeFileSync(join(dir, name), JSON.stringify(obj));
}
function writeGraph(dir, nodes) {
  const p = join(dir, "graph.json");
  writeFileSync(p, JSON.stringify({ nodes }));
  return p;
}
const CORE_SCRIPTS = { id: "core.scripts", layer: "L6", subgroup: "core", parent: "root.L6" };

// ── slugify ───────────────────────────────────────────────────────────────
test("slugify: lowercases and keeps id-safe chars", () => {
  assert.equal(slugify("CAMX-MS0.5"), "camx-ms0.5");
  assert.equal(slugify("SYSTEM-VIZ-HIGH-ROI-MS0"), "system-viz-high-roi-ms0");
});
test("slugify: collapses runs of unsafe chars to single underscore", () => {
  assert.equal(slugify("A  B//C"), "a_b_c");
});
test("slugify: trims leading/trailing underscores", () => {
  assert.equal(slugify("  weird name  "), "weird_name");
  assert.equal(slugify("///x///"), "x");
});
test("slugify: null/undefined/number do not throw", () => {
  assert.equal(slugify(null), "");
  assert.equal(slugify(undefined), "");
  assert.equal(slugify(42), "42");
});

// ── envelopeStatus ────────────────────────────────────────────────────────
test("envelopeStatus: completed_at is authoritative -> built", () => {
  assert.equal(envelopeStatus({ completed_at: "2026-05-01", status: "not_started" }), "built");
});
test("envelopeStatus: complete/done/shipped -> built", () => {
  assert.equal(envelopeStatus({ status: "complete" }), "built");
  assert.equal(envelopeStatus({ status: "DONE" }), "built");
  assert.equal(envelopeStatus({ status: "shipped" }), "built");
});
test("envelopeStatus: in_progress/active/building -> building", () => {
  assert.equal(envelopeStatus({ status: "in_progress" }), "building");
  assert.equal(envelopeStatus({ status: "in-progress" }), "building");
  assert.equal(envelopeStatus({ status: "active" }), "building");
});
test("envelopeStatus: unknown / missing / not_started -> pending", () => {
  assert.equal(envelopeStatus({ status: "not_started" }), "pending");
  assert.equal(envelopeStatus({}), "pending");
  assert.equal(envelopeStatus(null), "pending");
});
test("envelopeStatus: falls back to claimedStatus field", () => {
  assert.equal(envelopeStatus({ claimedStatus: "complete" }), "built");
});

// ── readEnvelopes ─────────────────────────────────────────────────────────
test("readEnvelopes: reads .json, skips non-json", () => {
  const d = tmp();
  try {
    writeJson(d, "A.json", { id: "A" });
    writeJson(d, "B.json", { id: "B" });
    writeFileSync(join(d, "notes.md"), "ignore me");
    const recs = readEnvelopes(d);
    assert.equal(recs.length, 2);
    assert.deepEqual(recs.map(r => r.file).sort(), ["A.json", "B.json"]);
  } finally { rmSync(d, { recursive: true, force: true }); }
});
test("readEnvelopes: malformed JSON yields a parseError record (not dropped)", () => {
  const d = tmp();
  try {
    writeFileSync(join(d, "bad.json"), "{not valid json");
    writeJson(d, "good.json", { id: "G" });
    const recs = readEnvelopes(d);
    assert.equal(recs.length, 2);
    assert.equal(recs.find(r => r.file === "bad.json").parseError, true);
    assert.ok(recs.find(r => r.file === "good.json").env);
  } finally { rmSync(d, { recursive: true, force: true }); }
});
test("readEnvelopes: non-object JSON (array, scalar) -> parseError", () => {
  const d = tmp();
  try {
    writeFileSync(join(d, "arr.json"), "[1,2,3]");
    writeFileSync(join(d, "num.json"), "7");
    const recs = readEnvelopes(d);
    assert.equal(recs.every(r => r.parseError === true), true);
  } finally { rmSync(d, { recursive: true, force: true }); }
});
test("readEnvelopes: missing dir -> []", () => {
  assert.deepEqual(readEnvelopes(join(tmpdir(), "definitely-not-here-xyz")), []);
  assert.deepEqual(readEnvelopes(undefined), []);
});

// ── generate: happy path ──────────────────────────────────────────────────
test("generate: emits core.milestones parent + one node + one edge per envelope", () => {
  const gd = tmp(), md = tmp();
  try {
    const graphPath = writeGraph(gd, [CORE_SCRIPTS]);
    writeJson(md, "ALPHA.json", { id: "ALPHA-MS0", title: "Alpha", status: "complete", total_units: 5 });
    writeJson(md, "BETA.json", { id: "BETA-MS1", title: "Beta", status: "in_progress", total_units: 3 });
    const r = generate({ graphPath, milestonesDir: md });
    assert.equal(r.error, undefined);
    const parent = r.newNodes.find(n => n.id === "core.milestones");
    assert.ok(parent, "core.milestones parent emitted");
    assert.equal(parent.layer, "L6", "layer copied from core.scripts");
    assert.equal(parent.parent, "root.L6", "parent copied from core.scripts");
    assert.equal(r.stats.parentCreated, true);
    assert.equal(r.stats.nodesEmitted, 2);
    const alpha = r.newNodes.find(n => n.id === "ms-envelope.alpha-ms0");
    assert.ok(alpha);
    assert.equal(alpha.status, "built");
    assert.equal(alpha.parent, "core.milestones");
    assert.equal(alpha.totalUnits, 5);
    assert.equal(alpha.file, "mcp-server/data/milestones/ALPHA.json");
    const beta = r.newNodes.find(n => n.id === "ms-envelope.beta-ms1");
    assert.equal(beta.status, "building");
    // one contains edge per envelope
    const edges = r.newEdges.filter(e => e.from === "core.milestones" && e.type === "contains");
    assert.equal(edges.length, 2);
    assert.equal(r.stats.byStatus.built, 1);
    assert.equal(r.stats.byStatus.building, 1);
  } finally { rmSync(gd, { recursive: true, force: true }); rmSync(md, { recursive: true, force: true }); }
});

test("generate: does NOT re-create parent when core.milestones already in graph", () => {
  const gd = tmp(), md = tmp();
  try {
    const graphPath = writeGraph(gd, [CORE_SCRIPTS, { id: "core.milestones", layer: "L6" }]);
    writeJson(md, "A.json", { id: "A-MS0", status: "complete" });
    const r = generate({ graphPath, milestonesDir: md });
    assert.equal(r.stats.parentCreated, false);
    assert.equal(r.newNodes.find(n => n.id === "core.milestones"), undefined);
    assert.equal(r.stats.nodesEmitted, 1);
  } finally { rmSync(gd, { recursive: true, force: true }); rmSync(md, { recursive: true, force: true }); }
});

test("generate: skips ms-envelope ids already present in the graph (idempotent re-run)", () => {
  const gd = tmp(), md = tmp();
  try {
    const graphPath = writeGraph(gd, [CORE_SCRIPTS, { id: "ms-envelope.a-ms0", layer: "L6" }]);
    writeJson(md, "A.json", { id: "A-MS0", status: "complete" });
    writeJson(md, "B.json", { id: "B-MS0", status: "complete" });
    const r = generate({ graphPath, milestonesDir: md });
    assert.equal(r.stats.nodesEmitted, 1, "only B is new; A already in graph");
    assert.equal(r.newNodes.find(n => n.id === "ms-envelope.b-ms0").milestoneId, "B-MS0");
  } finally { rmSync(gd, { recursive: true, force: true }); rmSync(md, { recursive: true, force: true }); }
});

test("generate: layer falls back to L6 when graph has no core.* node", () => {
  const gd = tmp(), md = tmp();
  try {
    const graphPath = writeGraph(gd, [{ id: "something.else", layer: "L3" }]);
    writeJson(md, "A.json", { id: "A-MS0", status: "complete" });
    const r = generate({ graphPath, milestonesDir: md });
    assert.equal(r.newNodes.find(n => n.id === "core.milestones").layer, "L6");
    assert.equal(r.newNodes.find(n => n.id === "ms-envelope.a-ms0").layer, "L6");
  } finally { rmSync(gd, { recursive: true, force: true }); rmSync(md, { recursive: true, force: true }); }
});

// ── generate: failure modes ───────────────────────────────────────────────
test("generate: missing graph -> error, no nodes", () => {
  const r = generate({ graphPath: join(tmpdir(), "no-such-graph.json"), milestonesDir: tmpdir() });
  assert.equal(r.error, "graph-missing");
  assert.deepEqual(r.newNodes, []);
});
test("generate: no graphPath arg -> graph-missing", () => {
  const r = generate({});
  assert.equal(r.error, "graph-missing");
});
test("generate: unparseable graph -> graph-parse-failed error", () => {
  const gd = tmp();
  try {
    const graphPath = join(gd, "graph.json");
    writeFileSync(graphPath, "{ broken");
    const r = generate({ graphPath, milestonesDir: tmpdir() });
    assert.match(r.error, /^graph-parse-failed/);
  } finally { rmSync(gd, { recursive: true, force: true }); }
});
test("generate: malformed envelope is counted, not crashed on", () => {
  const gd = tmp(), md = tmp();
  try {
    const graphPath = writeGraph(gd, [CORE_SCRIPTS]);
    writeFileSync(join(md, "bad.json"), "{not json");
    writeJson(md, "ok.json", { id: "OK-MS0", status: "complete" });
    const r = generate({ graphPath, milestonesDir: md });
    assert.equal(r.stats.parseErrors, 1);
    assert.equal(r.stats.nodesEmitted, 1);
    assert.equal(r.stats.envelopesScanned, 2);
  } finally { rmSync(gd, { recursive: true, force: true }); rmSync(md, { recursive: true, force: true }); }
});

// ── generate: adversarial ─────────────────────────────────────────────────
test("generate: intra-batch slug collision disambiguates with numeric suffix", () => {
  // Real-data condition: two envelope files can legitimately slug to the same
  // id (observed in live data: CPL.json + a milestone whose `id` field is
  // "cpl"). Both are real milestones — disambiguate with a numeric suffix
  // rather than dropping one or throwing. Sorted readdir → stable assignment.
  const gd = tmp(), md = tmp();
  try {
    const graphPath = writeGraph(gd, [CORE_SCRIPTS]);
    // "DUP MS0" → slug "dup_ms0"; "DUP/MS0" → slug "dup_ms0" (collision).
    writeJson(md, "one.json", { id: "DUP MS0", status: "complete" });
    writeJson(md, "two.json", { id: "DUP/MS0", status: "complete" });
    const r = generate({ graphPath, milestonesDir: md });
    assert.equal(r.error, undefined);
    assert.equal(r.stats.nodesEmitted, 2, "both colliding envelopes get a node");
    assert.equal(r.stats.slugCollisions, 1, "one collision was disambiguated");
    assert.ok(r.newNodes.find(n => n.id === "ms-envelope.dup_ms0"), "first claims base id");
    assert.ok(r.newNodes.find(n => n.id === "ms-envelope.dup_ms0-2"), "second gets -2 suffix");
    // Both edges from core.milestones still emitted (no envelope dropped).
    const edges = r.newEdges.filter(e => e.from === "core.milestones" && e.type === "contains");
    assert.equal(edges.length, 2);
  } finally { rmSync(gd, { recursive: true, force: true }); rmSync(md, { recursive: true, force: true }); }
});
test("generate: envelope with no id falls back to filename", () => {
  const gd = tmp(), md = tmp();
  try {
    const graphPath = writeGraph(gd, [CORE_SCRIPTS]);
    writeJson(md, "FALLBACK-MS9.json", { title: "no id here", status: "complete" });
    const r = generate({ graphPath, milestonesDir: md });
    assert.ok(r.newNodes.find(n => n.id === "ms-envelope.fallback-ms9"));
  } finally { rmSync(gd, { recursive: true, force: true }); rmSync(md, { recursive: true, force: true }); }
});
test("generate: empty milestones dir -> only parent node, no children", () => {
  const gd = tmp(), md = tmp();
  try {
    const graphPath = writeGraph(gd, [CORE_SCRIPTS]);
    const r = generate({ graphPath, milestonesDir: md });
    assert.equal(r.stats.nodesEmitted, 0);
    assert.equal(r.stats.parentCreated, true);
    assert.equal(r.newNodes.length, 1);
  } finally { rmSync(gd, { recursive: true, force: true }); rmSync(md, { recursive: true, force: true }); }
});
test("generate: total_units derived from units array length when total_units absent", () => {
  const gd = tmp(), md = tmp();
  try {
    const graphPath = writeGraph(gd, [CORE_SCRIPTS]);
    writeJson(md, "U.json", { id: "U-MS0", status: "complete", units: [1, 2, 3, 4] });
    const r = generate({ graphPath, milestonesDir: md });
    assert.equal(r.newNodes.find(n => n.id === "ms-envelope.u-ms0").totalUnits, 4);
  } finally { rmSync(gd, { recursive: true, force: true }); rmSync(md, { recursive: true, force: true }); }
});
test("generate: augmentation envelope has the merge-augmentations contract shape", () => {
  const gd = tmp(), md = tmp();
  try {
    const graphPath = writeGraph(gd, [CORE_SCRIPTS]);
    writeJson(md, "A.json", { id: "A-MS0", status: "complete" });
    const r = generate({ graphPath, milestonesDir: md });
    assert.equal(r.schemaVersion, "1.0.0");
    assert.ok(typeof r.generatedAt === "string");
    assert.ok(Array.isArray(r.newNodes) && Array.isArray(r.newEdges));
    assert.ok(r.stats && typeof r.stats === "object");
  } finally { rmSync(gd, { recursive: true, force: true }); rmSync(md, { recursive: true, force: true }); }
});
