// scripts/lib/edge-predict-candidates.test.mjs — node:test for path-A candidate generation.
import { test } from "node:test";
import assert from "node:assert/strict";
import { nodeType, edgeKey, loadExistingEdgeKeys, generateCandidates } from "./edge-predict-candidates.mjs";

// ── nodeType (id-prefix typing) ──────────────────────────────────────────────
test("nodeType → segment before first '.'", () => {
  assert.equal(nodeType("wiki.architecture.actions_cam_x"), "wiki");
  assert.equal(nodeType("memory_reference.foo_bar"), "memory_reference");
  assert.equal(nodeType("ghost.ms.ms2"), "ghost");
  assert.equal(nodeType("tribal-tip.foc14-006"), "tribal-tip");
});

test("nodeType bare id (no dot) → itself; empty/non-string → 'unknown'", () => {
  assert.equal(nodeType("bareid"), "bareid");
  assert.equal(nodeType(""), "unknown");
  assert.equal(nodeType(null), "unknown");
  assert.equal(nodeType(undefined), "unknown");
});

test("nodeType leading-dot id → '' (empty type, distinct from 'unknown'; documented edge)", () => {
  // indexOf('.')===0 → slice(0,0)==="" ; the length===0 guard does NOT fire (".foo".length>0).
  // An empty type never matches an explicit type filter, so such a node is silently
  // excluded from type-filtered runs (verified via generateCandidates below).
  assert.equal(nodeType(".foo"), "");
});

test("edgeKey is tab-joined and directional", () => {
  assert.equal(edgeKey("a", "b"), "a\tb");
  assert.notEqual(edgeKey("a", "b"), edgeKey("b", "a"));
});

// ── loadExistingEdgeKeys (both-direction set, honest ok flag) ─────────────────
const FAKE_EDGES = JSON.stringify({
  newEdges: [
    { from: "ghost.galaxy.mill", to: "memory_patterns.mill_synthesis", type: "documented-by" },
    { from: "eng.business", to: "ghost.chat_slot.hotel", type: "owned-by-slot" },
    { from: "bad-no-to" }, // missing `to` → skipped
  ],
});

test("loadExistingEdgeKeys → both-direction keys, correct count, ok=true", () => {
  const { set, edgeCount, ok } = loadExistingEdgeKeys("ignored", () => FAKE_EDGES);
  assert.equal(ok, true);
  assert.equal(edgeCount, 2); // the missing-`to` row skipped
  assert.ok(set.has("ghost.galaxy.mill\tmemory_patterns.mill_synthesis"));
  assert.ok(set.has("memory_patterns.mill_synthesis\tghost.galaxy.mill")); // reverse too
  assert.ok(set.has("eng.business\tghost.chat_slot.hotel"));
  assert.equal(set.size, 4); // 2 edges × 2 directions
});

test("loadExistingEdgeKeys malformed file → empty set + ok=false (read-failure ≠ no-edges, R12)", () => {
  const { set, edgeCount, ok } = loadExistingEdgeKeys("ignored", () => "{not valid json");
  assert.equal(set.size, 0);
  assert.equal(edgeCount, 0);
  assert.equal(ok, false);
});

test("loadExistingEdgeKeys file with no newEdges array → empty set, ok=true", () => {
  const { set, ok } = loadExistingEdgeKeys("ignored", () => JSON.stringify({ stats: {} }));
  assert.equal(set.size, 0);
  assert.equal(ok, true); // parsed fine, just no edges
});

// ── generateCandidates ───────────────────────────────────────────────────────
function fixture() {
  return new Map([
    ["ghost.a", [1, 0]],
    ["ghost.b", [0, 1]],
    ["wiki.x", [1, 1]],
    ["wiki.y", [1, -1]],
    ["memory_reference.m", [0.5, 0.5]],
  ]);
}

test("generateCandidates type-filters source × target (ghost→wiki = 2×2 = 4)", () => {
  const r = generateCandidates(fixture(), { sourceTypes: ["ghost"], targetTypes: ["wiki"] });
  assert.equal(r.srcCount, 2);
  assert.equal(r.tgtCount, 2);
  assert.equal(r.candidates.length, 4);
  assert.equal(r.excludedExisting, 0);
  assert.equal(r.capped, false);
  // every candidate is ghost→wiki
  for (const [u, v] of r.candidates) {
    assert.equal(nodeType(u), "ghost");
    assert.equal(nodeType(v), "wiki");
  }
});

test("generateCandidates excludes existing edges (both directions) + counts them", () => {
  const existing = new Set([edgeKey("ghost.a", "wiki.x"), edgeKey("wiki.x", "ghost.a")]);
  const r = generateCandidates(fixture(), {
    sourceTypes: ["ghost"],
    targetTypes: ["wiki"],
    existingEdges: existing,
  });
  assert.equal(r.candidates.length, 3); // 4 minus the one existing pair
  assert.equal(r.excludedExisting, 1);
  assert.ok(!r.candidates.some(([u, v]) => u === "ghost.a" && v === "wiki.x"));
});

test("generateCandidates no type filters → all×all minus self-pairs", () => {
  const r = generateCandidates(fixture()); // 5 nodes
  assert.equal(r.srcCount, 5);
  assert.equal(r.tgtCount, 5);
  assert.equal(r.candidates.length, 5 * 5 - 5); // 20, self-pairs removed
  assert.ok(!r.candidates.some(([u, v]) => u === v));
});

test("generateCandidates all×all EXCLUDES an existing edge in BOTH orderings + counts each (directional)", () => {
  // No type filter → both (ghost.a, wiki.x) and (wiki.x, ghost.a) are generated as
  // ordered candidates. ONE undirected existing edge (seeded both ways) suppresses
  // both orderings → excludedExisting === 2 (directional, per the documented contract).
  const existing = new Set([edgeKey("ghost.a", "wiki.x"), edgeKey("wiki.x", "ghost.a")]);
  const r = generateCandidates(fixture(), { existingEdges: existing }); // all×all
  assert.equal(r.excludedExisting, 2); // both ordered candidates removed + counted
  assert.equal(r.candidates.length, 5 * 5 - 5 - 2); // 20 minus the 2 excluded orderings = 18
  assert.ok(!r.candidates.some(([u, v]) => (u === "ghost.a" && v === "wiki.x") || (u === "wiki.x" && v === "ghost.a")));
});

test("generateCandidates maxCandidates cap → capped=true, length == cap (no silent truncation)", () => {
  const r = generateCandidates(fixture(), { maxCandidates: 3 });
  assert.equal(r.candidates.length, 3);
  assert.equal(r.capped, true);
});

test("generateCandidates non-Map input → empty result (fail-soft)", () => {
  const r = generateCandidates(null, { sourceTypes: ["ghost"] });
  assert.deepEqual(r.candidates, []);
  assert.equal(r.srcCount, 0);
  assert.equal(r.capped, false);
});

test("generateCandidates requesting a type with no nodes → empty candidates, honest counts", () => {
  const r = generateCandidates(fixture(), { sourceTypes: ["disp"], targetTypes: ["wiki"] });
  assert.equal(r.srcCount, 0); // no disp.* nodes in the knowledge corpus (the path-B gap)
  assert.equal(r.candidates.length, 0);
});
