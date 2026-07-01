import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { __test } from "./system-viz-graph.mjs";

const { readGraphMeta, extractTopLevelObject, extractTopLevelScalar } = __test;

// ---------------------------------------------------------------------------
// U-VIZ-HEADLINE-CHEAP-META (sierra) -- readGraphMeta bounded head-read.
// The `meta` object lives in the first few KB of system-graph.json (before the
// huge nodes/edges arrays); readGraphMeta extracts ONLY it without loading the
// ~870MB graph. These tests pin the extraction logic with real reference values,
// failure modes, and adversarial JSON (braces/quotes inside strings).
// ---------------------------------------------------------------------------

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const LIVE_GRAPH = path.join(ROOT, "state", "shared", "system-viz", "system-graph.json");
const HAVE_LIVE = fs.existsSync(LIVE_GRAPH);

function tmpGraph(name, body) {
  const p = path.join(os.tmpdir(), `prism-meta-test-${name}-${process.pid}.json`);
  fs.writeFileSync(p, body, "utf8");
  return p;
}
function cleanup(p) { try { fs.unlinkSync(p); } catch { /* best-effort */ } }

// A realistic graph head: schemaVersion + generatedAt scalars, then meta (with a
// nested counts/headline/totals + a roadmap with a string + array), then a HUGE
// nodes array we must NOT need to read.
const FIXTURE = JSON.stringify({
  schemaVersion: "2.29.0",
  generatedAt: "2026-06-23T10:14:42.341Z",
  meta: {
    counts: { engines: 3788, dispatchers: 108, actions: 10010, tests: 4731, formulas: 499 },
    headline: { built: 3697, unwired: 89, pendingFE: 2, drift: 192, wikiEntries: 56996 },
    totals: { nodes: 60588, edges: 183237, layers: 11 },
    roadmap: { principle: "Build atomic-first. Tier 0 -> Tier 5.", phases: [{ phase: 0, name: "x" }] },
  },
  nodes: Array.from({ length: 5000 }, (_, i) => ({ id: `n${i}`, label: `node ${i}`, info: "x".repeat(40) })),
  edges: [],
});

// ---- happy path -----------------------------------------------------------

test("readGraphMeta extracts meta + scalars from a fixture head (bounded, no node load)", () => {
  const p = tmpGraph("happy", FIXTURE);
  try {
    // maxBytes small enough to exclude the 5000-node array but include meta.
    const r = readGraphMeta(p, { maxBytes: 4096 });
    assert.equal(r.schemaVersion, "2.29.0");
    assert.equal(r.generatedAt, "2026-06-23T10:14:42.341Z");
    assert.equal(r.meta.counts.engines, 3788);
    assert.equal(r.meta.headline.built, 3697);
    assert.equal(r.meta.totals.nodes, 60588);
    assert.equal(r.meta.totals.edges, 183237);
    assert.equal(r.meta.roadmap.phases.length, 1);
    // The whole node array must NOT be present in the bounded slice -> meta only.
    assert.equal(r.meta.nodes, undefined);
  } finally { cleanup(p); }
});

test("readGraphMeta on the LIVE graph returns structurally-valid meta (reference values)", { skip: !HAVE_LIVE }, () => {
  const r = readGraphMeta(LIVE_GRAPH);
  assert.match(r.schemaVersion ?? "", /^\d+\.\d+\.\d+$/);
  assert.match(r.generatedAt ?? "", /^\d{4}-\d\d-\d\dT/);
  assert.ok(Number.isFinite(r.meta.counts.engines) && r.meta.counts.engines > 1000, `engines=${r.meta?.counts?.engines}`);
  assert.ok(Number.isFinite(r.meta.headline.built), "headline.built");
  assert.ok(r.meta.headline.built <= r.meta.counts.engines, "built must not exceed engines");
  assert.ok(Number.isFinite(r.meta.totals.nodes) && r.meta.totals.nodes > 0, "totals.nodes");
  assert.ok(Number.isFinite(r.meta.totals.edges) && r.meta.totals.edges > 0, "totals.edges");
});

// ---- failure modes (fail-loud) -------------------------------------------

test("readGraphMeta throws on a missing file (read-meta)", () => {
  assert.throws(
    () => readGraphMeta(path.join(os.tmpdir(), `does-not-exist-${process.pid}.json`)),
    /Cannot read-meta graph/
  );
});

test("readGraphMeta throws when meta is absent (parse-meta)", () => {
  const p = tmpGraph("nometa", JSON.stringify({ schemaVersion: "1.0.0", nodes: [] }));
  try {
    assert.throws(() => readGraphMeta(p, { maxBytes: 4096 }), /Cannot parse-meta graph/);
  } finally { cleanup(p); }
});

test("readGraphMeta throws when meta does not close within maxBytes (fail-loud, not silent partial)", () => {
  const p = tmpGraph("truncated", FIXTURE);
  try {
    // 30 bytes can't contain the closing brace of meta -> must throw, not return junk.
    assert.throws(() => readGraphMeta(p, { maxBytes: 30 }), /Cannot parse-meta graph/);
  } finally { cleanup(p); }
});

// ---- adversarial JSON -----------------------------------------------------

test("extractTopLevelObject balances braces/quotes INSIDE string values (does not stop early)", () => {
  // meta.note contains } and { and an escaped quote -- a naive brace counter
  // would close at the string's `}`. The extractor must skip string interiors.
  // NOTE_VAL is the literal string value (backslash + quote); it must round-trip
  // exactly through stringify -> extract -> parse.
  const NOTE_VAL = 'has } and { and a \\" quote';
  const body = JSON.stringify({
    schemaVersion: "1.0.0",
    meta: { note: NOTE_VAL, counts: { engines: 5 } },
    nodes: [{ id: "x" }],
  });
  const slice = extractTopLevelObject(body, "meta");
  assert.ok(slice, "meta slice not null");
  const parsed = JSON.parse(slice);
  // engines===5 proves the extractor did NOT stop at the in-string `}` (it
  // reached counts past the adversarial string).
  assert.equal(parsed.counts.engines, 5);
  // and the string content is preserved verbatim (round-trip).
  assert.equal(parsed.note, NOTE_VAL);
});

test("extractTopLevelObject returns null when key absent or object never closes", () => {
  assert.equal(extractTopLevelObject('{"a":1}', "meta"), null);
  // open meta brace but truncated (never closes)
  assert.equal(extractTopLevelObject('{"meta":{"a":1,"b":{', "meta"), null);
});

test("extractTopLevelObject handles nested objects + arrays correctly", () => {
  const body = '{"meta":{"roadmap":{"phases":[{"p":0},{"p":1}]},"counts":{"engines":7}},"nodes":[]}';
  const parsed = JSON.parse(extractTopLevelObject(body, "meta"));
  assert.equal(parsed.roadmap.phases.length, 2);
  assert.equal(parsed.counts.engines, 7);
});

test("extractTopLevelScalar extracts + un-escapes; undefined when absent", () => {
  assert.equal(extractTopLevelScalar('{"schemaVersion":"2.29.0"}', "schemaVersion"), "2.29.0");
  assert.equal(extractTopLevelScalar('{"k":"a\\"b"}', "k"), 'a"b');
  assert.equal(extractTopLevelScalar('{"a":1}', "missing"), undefined);
});
