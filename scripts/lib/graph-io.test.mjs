/**
 * scripts/lib/graph-io.test.mjs — round-trip tests for streaming graph I/O
 *
 * Verifies the streaming read+write is byte-equivalent to legacy
 * `JSON.parse(fs.readFileSync(...))` + `JSON.stringify(...)` on small graphs.
 * Adversarial cases probe the byte-walker's handling of nested structures,
 * escaped strings, edge cases (empty arrays, missing keys, unicode).
 *
 * Run: node --test scripts/lib/graph-io.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { writeGraphStreaming, writeGraphStreamingAtomic, readGraphStreaming, countGraphArrayStreaming, streamGraphArray, LARGE_ARRAY_KEYS, V8_MAX_STRING_BYTES, exceedsStringParseCap } from "./graph-io.mjs";

function tmpFile() {
  return path.join(os.tmpdir(), `graph-io-test-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
}

test("LARGE_ARRAY_KEYS includes nodes + edges", () => {
  assert.ok(LARGE_ARRAY_KEYS.has("nodes"));
  assert.ok(LARGE_ARRAY_KEYS.has("edges"));
});

test("exceedsStringParseCap: boundary at V8's 0x1fffffe8 string cap", () => {
  assert.equal(V8_MAX_STRING_BYTES, 0x1fffffe8);
  assert.equal(exceedsStringParseCap(V8_MAX_STRING_BYTES), false);     // exactly at cap -> ok
  assert.equal(exceedsStringParseCap(V8_MAX_STRING_BYTES - 1), false); // under -> ok
  assert.equal(exceedsStringParseCap(V8_MAX_STRING_BYTES + 1), true);  // over -> needs streaming
  assert.equal(exceedsStringParseCap(0), false);
  assert.equal(exceedsStringParseCap(416 * 1048576), false);           // obsidian-aug today (416MB)
  assert.equal(exceedsStringParseCap(550 * 1048576), true);            // a 550MB augmentation
  assert.equal(exceedsStringParseCap("not a number"), false);          // guard non-numeric
  assert.equal(exceedsStringParseCap(null), false);
});

test("round-trip preserves a simple graph", () => {
  const G = {
    schemaVersion: "2.29.0",
    meta: { generatedAt: "2026-05-23", count: 42 },
    nodes: [
      { id: "n1", label: "Engine A", layer: 5 },
      { id: "n2", label: "Engine B", layer: 5, ghost: true },
    ],
    edges: [
      { source: "n1", target: "n2", weight: 0.8 },
    ],
  };
  const p = tmpFile();
  try {
    writeGraphStreaming(p, G);
    const round = readGraphStreaming(p);
    assert.deepEqual(round, G);
  } finally { fs.unlinkSync(p); }
});

test("round-trip preserves empty nodes/edges arrays", () => {
  const G = { schemaVersion: "2.29.0", meta: {}, nodes: [], edges: [] };
  const p = tmpFile();
  try {
    writeGraphStreaming(p, G);
    const round = readGraphStreaming(p);
    assert.deepEqual(round, G);
  } finally { fs.unlinkSync(p); }
});

test("round-trip preserves escaped strings (quotes, backslashes, unicode)", () => {
  const G = {
    schemaVersion: "1.0.0",
    nodes: [
      { id: "n1", label: "Has \"quotes\" and \\backslash" },
      { id: "n2", label: "Unicode: 物理 ⚙️ 🔥" },
      { id: "n3", description: "Line 1\nLine 2\tTabbed" },
    ],
    edges: [],
  };
  const p = tmpFile();
  try {
    writeGraphStreaming(p, G);
    const round = readGraphStreaming(p);
    assert.deepEqual(round, G);
  } finally { fs.unlinkSync(p); }
});

test("round-trip preserves deeply-nested node values", () => {
  const G = {
    schemaVersion: "1.0.0",
    nodes: [
      { id: "n1", meta: { stats: { aggregate: { count: 7, items: ["a", "b", { x: 1 }] } } } },
    ],
    edges: [],
  };
  const p = tmpFile();
  try {
    writeGraphStreaming(p, G);
    const round = readGraphStreaming(p);
    assert.deepEqual(round, G);
  } finally { fs.unlinkSync(p); }
});

test("round-trip preserves non-array top-level values (e.g., scalars)", () => {
  const G = {
    schemaVersion: "1.2.3",
    generatedAtMs: 1716499200000,
    isClean: true,
    meta: { count: 5, name: "test" },
    nodes: [{ id: "n1" }],
    edges: [],
  };
  const p = tmpFile();
  try {
    writeGraphStreaming(p, G);
    const round = readGraphStreaming(p);
    assert.deepEqual(round, G);
  } finally { fs.unlinkSync(p); }
});

test("adversarial: a node string contains brackets/braces/commas", () => {
  const G = {
    schemaVersion: "1.0.0",
    nodes: [
      { id: "n1", label: "{not} [an array, but a string]" },
      { id: "n2", description: "],{},[" },
    ],
    edges: [],
  };
  const p = tmpFile();
  try {
    writeGraphStreaming(p, G);
    const round = readGraphStreaming(p);
    assert.deepEqual(round, G);
  } finally { fs.unlinkSync(p); }
});

test("adversarial: 100 nodes + 100 edges round-trip", () => {
  const nodes = Array.from({ length: 100 }, (_, i) => ({ id: `n${i}`, layer: i % 11, label: `Node ${i}` }));
  const edges = Array.from({ length: 100 }, (_, i) => ({ source: `n${i}`, target: `n${(i + 1) % 100}`, weight: i / 100 }));
  const G = { schemaVersion: "1.0.0", nodes, edges };
  const p = tmpFile();
  try {
    writeGraphStreaming(p, G);
    const round = readGraphStreaming(p);
    assert.equal(round.nodes.length, 100);
    assert.equal(round.edges.length, 100);
    assert.deepEqual(round.nodes[42], nodes[42]);
    assert.deepEqual(round.edges[78], edges[78]);
  } finally { fs.unlinkSync(p); }
});

test("output is parseable by standard JSON.parse (small enough to fit)", () => {
  const G = {
    schemaVersion: "1.0.0",
    nodes: [{ id: "n1", label: "x" }],
    edges: [],
  };
  const p = tmpFile();
  try {
    writeGraphStreaming(p, G);
    const text = fs.readFileSync(p, "utf8");
    const parsed = JSON.parse(text);
    assert.deepEqual(parsed, G);
  } finally { fs.unlinkSync(p); }
});

test("failure mode: read throws on file that doesn't start with '{'", () => {
  const p = tmpFile();
  try {
    fs.writeFileSync(p, "not json");
    assert.throws(() => readGraphStreaming(p), /expected '\{'/);
  } finally { fs.unlinkSync(p); }
});

test("failure mode: read throws on file with non-string key (e.g., bare number)", () => {
  const p = tmpFile();
  try {
    fs.writeFileSync(p, '{42: "value"}'); // invalid JSON but tests the key check
    assert.throws(() => readGraphStreaming(p), /expected string key/);
  } finally { fs.unlinkSync(p); }
});

// --- writeGraphStreamingAtomic (the crash-safe canonical-graph writer; the
//     merge-augmentations switch in U-VIZ-GRAPH-ATOMIC-WRITE depends on these) ---

test("atomic write round-trips and leaves NO .tmp orphan on success", () => {
  const G = {
    schemaVersion: "2.29.0",
    meta: { count: 3 },
    nodes: [{ id: "n1", label: "A" }, { id: "n2", label: "B" }],
    edges: [{ source: "n1", target: "n2", intensity: 0.3 }],
  };
  const p = tmpFile();
  try {
    writeGraphStreamingAtomic(p, G);
    assert.deepEqual(readGraphStreaming(p), G);
    // The whole point: tmp + rename. After success no `<file>.tmp-<pid>` may remain.
    const dir = path.dirname(p);
    const base = path.basename(p);
    const orphans = fs.readdirSync(dir).filter((f) => f.startsWith(base + ".tmp-"));
    assert.equal(orphans.length, 0, "atomic write must rename its tmp away, leaving no orphan");
  } finally { try { fs.unlinkSync(p); } catch { /* already gone */ } }
});

test("atomic write output is byte-identical to writeGraphStreaming", () => {
  // Proves the merge-augmentations switch is output-preserving (only crash-safety changes).
  const G = {
    schemaVersion: "1.0.0",
    meta: { x: 1 },
    nodes: [{ id: "a", label: "L" }, { id: "b", meta: { nested: [1, 2, 3] } }],
    edges: [{ source: "a", target: "b" }],
  };
  const p1 = tmpFile();
  const p2 = tmpFile();
  try {
    writeGraphStreaming(p1, G);
    writeGraphStreamingAtomic(p2, G);
    assert.equal(fs.readFileSync(p2, "utf8"), fs.readFileSync(p1, "utf8"));
  } finally {
    try { fs.unlinkSync(p1); } catch { /* gone */ }
    try { fs.unlinkSync(p2); } catch { /* gone */ }
  }
});

test("atomic write overwrites an existing target in place", () => {
  const p = tmpFile();
  try {
    writeGraphStreamingAtomic(p, { schemaVersion: "1", nodes: [{ id: "old" }], edges: [] });
    writeGraphStreamingAtomic(p, { schemaVersion: "2", nodes: [{ id: "new" }], edges: [] });
    const round = readGraphStreaming(p);
    assert.equal(round.schemaVersion, "2");
    assert.equal(round.nodes[0].id, "new");
  } finally { try { fs.unlinkSync(p); } catch { /* gone */ } }
});

// --- countGraphArrayStreaming (off-heap node count; the regen-viz orchestrator's
//     readGraphNodeCount uses this so it never OOMs on the post-merge graph) ---

test("countGraphArrayStreaming matches the materialized nodes/edges length", () => {
  const nodes = Array.from({ length: 137 }, (_, i) => ({ id: `n${i}`, meta: { nested: { deep: [1, 2, { x: i }] } } }));
  const edges = Array.from({ length: 89 }, (_, i) => ({ source: `n${i}`, target: `n${i + 1}` }));
  const G = { schemaVersion: "2.29.0", meta: { count: 1 }, nodes, edges };
  const p = tmpFile();
  try {
    writeGraphStreaming(p, G);
    // The whole point: nested objects/arrays inside an element must NOT inflate the count.
    assert.equal(countGraphArrayStreaming(p, "nodes"), 137);
    assert.equal(countGraphArrayStreaming(p, "edges"), 89);
    assert.equal(countGraphArrayStreaming(p, "nodes"), readGraphStreaming(p).nodes.length);
  } finally { fs.unlinkSync(p); }
});

test("countGraphArrayStreaming: empty array -> 0, missing key -> 0, missing file -> 0", () => {
  const p = tmpFile();
  try {
    writeGraphStreaming(p, { schemaVersion: "1", nodes: [], edges: [{ source: "a", target: "b" }] });
    assert.equal(countGraphArrayStreaming(p, "nodes"), 0);
    assert.equal(countGraphArrayStreaming(p, "missingKey"), 0);
  } finally { fs.unlinkSync(p); }
  assert.equal(countGraphArrayStreaming(tmpFile(), "nodes"), 0); // never written
});

test("countGraphArrayStreaming: a non-array 'nodes' value / decoy in meta does not mislocate the array", () => {
  // meta carries a STRING-valued "nodes" + a node label literally containing
  // `"nodes":[` -- the finder must skip both and count the REAL top-level array.
  const G = {
    schemaVersion: "1",
    meta: { nodes: "not-an-array decoy", note: "the word nodes appears here" },
    nodes: [{ id: "n1", label: '{"nodes":[99]}' }, { id: "n2" }, { id: "n3" }],
    edges: [],
  };
  const p = tmpFile();
  try {
    writeGraphStreaming(p, G);
    assert.equal(countGraphArrayStreaming(p, "nodes"), 3);
  } finally { fs.unlinkSync(p); }
});

test("countGraphArrayStreaming: array of scalars/strings counts elements (not just objects)", () => {
  const p = tmpFile();
  try {
    // writeGraphStreaming only element-streams nodes/edges; use a hand-written file
    // to exercise a scalar/string array under the target key.
    fs.writeFileSync(p, '{"schemaVersion":"1","nodes":["a","b","c",4,5],"edges":[]}');
    assert.equal(countGraphArrayStreaming(p, "nodes"), 5);
  } finally { fs.unlinkSync(p); }
});

test("countGraphArrayStreaming: escaped quotes/backslashes + structural chars inside string elements", () => {
  // JSON.stringify produces correctly-escaped JSON; the walk's BACKSLASH-skip +
  // inStr tracking must not let escaped quotes or in-string {}[], affect depth.
  const G = {
    schemaVersion: "1",
    nodes: [
      { id: "n1", l: 'a " quote' },        // escaped quote: \"
      { id: "n2", l: "c \\ backslash" },   // escaped backslash: \\
      { id: "n3", l: "}],[{ structural" }, // braces/brackets INSIDE a string
    ],
    edges: [],
  };
  const p = tmpFile();
  try {
    fs.writeFileSync(p, JSON.stringify(G));
    assert.equal(countGraphArrayStreaming(p, "nodes"), 3);
  } finally { fs.unlinkSync(p); }
});

test("countGraphArrayStreaming: UNBALANCED braces/brackets inside string elements don't corrupt depth", () => {
  // The function's subtlest logic: a `{`/`[` inside a quoted string must NOT
  // increment depth (else an unbalanced one swallows the rest of the array).
  const G = {
    schemaVersion: "1",
    nodes: [
      { id: "n1", l: "{ unclosed brace" },
      { id: "n2", l: "stray ] then [ bracket" },
      { id: "n3", l: "}}}}" },
    ],
    edges: [],
  };
  const p = tmpFile();
  try {
    fs.writeFileSync(p, JSON.stringify(G));
    assert.equal(countGraphArrayStreaming(p, "nodes"), 3);
  } finally { fs.unlinkSync(p); }
});

// --- streamGraphArray (off-heap per-element streaming; the augment-molecules
//     fix -- project a few fields per node without materializing the graph) ---

test("streamGraphArray: streams every element, parsed, in order, with index", () => {
  const G = {
    schemaVersion: "1",
    nodes: [
      { id: "n1", layer: "L5", domain: "Mill" },
      { id: "n2", layer: "L3", extra: { nested: [1, 2, 3] } },
      { id: "n3", layer: "L9" },
    ],
    edges: [{ source: "n1", target: "n2" }],
  };
  const p = tmpFile();
  try {
    fs.writeFileSync(p, JSON.stringify(G));
    const seen = [];
    const n = streamGraphArray(p, "nodes", (el, idx) => seen.push([idx, el]));
    assert.equal(n, 3);
    assert.deepEqual(seen[0], [0, { id: "n1", layer: "L5", domain: "Mill" }]);
    assert.deepEqual(seen[1][1].extra, { nested: [1, 2, 3] }); // nested struct preserved
    assert.equal(seen[2][0], 2);
    assert.equal(seen[2][1].id, "n3");
  } finally { fs.unlinkSync(p); }
});

test("streamGraphArray: parse-equivalent to readGraphStreaming(...).nodes", () => {
  const G = {
    schemaVersion: "1",
    nodes: Array.from({ length: 137 }, (_, i) => ({ id: `n${i}`, layer: i % 2 ? "L5" : "L3", w: i / 7 })),
    edges: Array.from({ length: 89 }, (_, i) => ({ source: `n${i}`, target: `n${i + 1}` })),
  };
  const p = tmpFile();
  try {
    fs.writeFileSync(p, JSON.stringify(G));
    const streamed = [];
    const count = streamGraphArray(p, "nodes", (el) => streamed.push(el));
    const materialized = readGraphStreaming(p).nodes;
    assert.equal(count, 137);
    assert.deepEqual(streamed, materialized);
    assert.equal(streamGraphArray(p, "edges", () => {}), 89); // edges array also streamable
  } finally { fs.unlinkSync(p); }
});

test("streamGraphArray: projection use (collect only L5 id+domain) keeps nothing else", () => {
  const G = {
    schemaVersion: "1",
    nodes: [
      { id: "e1", layer: "L5", domain: "Mill", heavy: "x".repeat(1000) },
      { id: "h1", layer: "L3" },
      { id: "e2", layer: "L5", domain: "Lathe", heavy: "y".repeat(1000) },
    ],
    edges: [],
  };
  const p = tmpFile();
  try {
    fs.writeFileSync(p, JSON.stringify(G));
    const l5 = [];
    streamGraphArray(p, "nodes", (n2) => { if (n2.layer === "L5" && n2.domain) l5.push({ id: n2.id, domain: n2.domain }); });
    assert.deepEqual(l5, [{ id: "e1", domain: "Mill" }, { id: "e2", domain: "Lathe" }]);
  } finally { fs.unlinkSync(p); }
});

test("streamGraphArray: structural chars + escaped quotes inside string values don't split an element", () => {
  const G = {
    schemaVersion: "1",
    nodes: [
      { id: "n1", info: 'has ] and } and , and [ inside' },
      { id: "n2", info: 'escaped \\" quote then } brace' },
      { id: "n3", info: "}}}],[{{" },
    ],
    edges: [],
  };
  const p = tmpFile();
  try {
    fs.writeFileSync(p, JSON.stringify(G));
    const ids = [];
    const n = streamGraphArray(p, "nodes", (el) => ids.push(el.id));
    assert.equal(n, 3);
    assert.deepEqual(ids, ["n1", "n2", "n3"]);
  } finally { fs.unlinkSync(p); }
});

test("streamGraphArray: array of scalars/strings streams each element", () => {
  const G = { schemaVersion: "1", nodes: [1, "two", 3.5, "fo,ur", 5], edges: [] };
  const p = tmpFile();
  try {
    fs.writeFileSync(p, JSON.stringify(G));
    const vals = [];
    const n = streamGraphArray(p, "nodes", (el) => vals.push(el));
    assert.equal(n, 5);
    assert.deepEqual(vals, [1, "two", 3.5, "fo,ur", 5]);
  } finally { fs.unlinkSync(p); }
});

test("streamGraphArray: empty array -> 0 (callback never fires), missing key -> 0, missing file -> 0", () => {
  const p = tmpFile();
  try {
    fs.writeFileSync(p, JSON.stringify({ schemaVersion: "1", nodes: [], edges: [] }));
    let fired = 0;
    assert.equal(streamGraphArray(p, "nodes", () => { fired++; }), 0);
    assert.equal(fired, 0);
    assert.equal(streamGraphArray(p, "missingKey", () => { fired++; }), 0);
    assert.equal(fired, 0);
  } finally { fs.unlinkSync(p); }
  assert.equal(streamGraphArray(tmpFile(), "nodes", () => {}), 0); // never written
});

test("streamGraphArray: a decoy key string in meta does not mislocate the array (shared finder)", () => {
  const G = {
    schemaVersion: "1",
    meta: { note: 'beware a fake \\"nodes\\": [ 1, 2 ] decoy in this string' },
    nodes: [{ id: "real1" }, { id: "real2" }, { id: "real3" }],
    edges: [],
  };
  const p = tmpFile();
  try {
    fs.writeFileSync(p, JSON.stringify(G));
    const ids = [];
    assert.equal(streamGraphArray(p, "nodes", (el) => ids.push(el.id)), 3);
    assert.deepEqual(ids, ["real1", "real2", "real3"]);
  } finally { fs.unlinkSync(p); }
});
