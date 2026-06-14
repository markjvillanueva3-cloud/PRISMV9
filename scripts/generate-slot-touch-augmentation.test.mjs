// generate-slot-touch-augmentation.test.mjs
// Run: node --test H:/prism/scripts/generate-slot-touch-augmentation.test.mjs
//
// Real-value assertions only. No git, no fs reads of the 405 MB live graph.
// Covers slugify / normalizeRel / resolveFsNodeId pure helpers + generate()
// against fixture graphs + fixture slotCommits.
//
// ≥3 failure modes (graph-missing, slot-commits-missing, slot-names-missing)
// ≥2 adversarial (unresolved touches, slot-id collision via existingIds,
//   non-array commits, null fields)
// ≥3 spanning configurations (touches only the deep dir; touches that ONLY
//   resolve to a parent dir; mixed resolved+unresolved; multi-slot overlap)

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  slugify, normalizeRel, resolveFsNodeId, generate,
} from "./generate-slot-touch-augmentation.mjs";

// ── fixtures ──────────────────────────────────────────────────────────────
const GHOST_SYNERGY = { id: "ghost.slot_synergy", layer: "L8", parent: "ghost.planned_features" };
const FS_PRISM = { id: "fs.deep.prism", layer: "L9" };
const FS_PRISM_MCP = { id: "fs.deep.prism_mcp-server", layer: "L10" };
const FS_PRISM_MCP_SRC = { id: "fs.deep.prism_mcp-server_src", layer: "L11" };
const FS_PRISM_MCP_SRC_CAM = { id: "fs.deep.prism_mcp-server_src_cam", layer: "L12" };
const FS_PRISM_SCRIPTS = { id: "fs.deep.prism_scripts", layer: "L10" };

const BASE_GRAPH = {
  nodes: [
    GHOST_SYNERGY, FS_PRISM, FS_PRISM_MCP, FS_PRISM_MCP_SRC, FS_PRISM_MCP_SRC_CAM, FS_PRISM_SCRIPTS,
  ],
};

// ── slugify ───────────────────────────────────────────────────────────────
test("slugify: matches fs-deep-inventory convention", () => {
  assert.equal(slugify("MCP-Server"), "mcp-server");
  assert.equal(slugify("Wire EDM"), "wire_edm");
  assert.equal(slugify("foo.ts"), "foo.ts"); // dots + .ts preserved
});
test("slugify: collapses runs, trims edges", () => {
  assert.equal(slugify("A  B//C"), "a_b_c");
  assert.equal(slugify("///x///"), "x");
});
test("slugify: null/undefined/number safe", () => {
  assert.equal(slugify(null), "");
  assert.equal(slugify(undefined), "");
  assert.equal(slugify(42), "42");
});

// ── normalizeRel ──────────────────────────────────────────────────────────
test("normalizeRel: backslash → forward, strip drive letter", () => {
  assert.equal(normalizeRel("H:\\prism\\mcp-server\\src\\foo.ts"), "prism/mcp-server/src/foo.ts");
  assert.equal(normalizeRel("C:/foo/bar"), "foo/bar");
});
test("normalizeRel: strip leading slash on git-relative paths", () => {
  assert.equal(normalizeRel("/mcp-server/src/foo.ts"), "mcp-server/src/foo.ts");
});
test("normalizeRel: null/undefined → empty", () => {
  assert.equal(normalizeRel(null), "");
  assert.equal(normalizeRel(undefined), "");
});

// ── resolveFsNodeId ───────────────────────────────────────────────────────
test("resolveFsNodeId: returns deepest matching fs.deep.* node", () => {
  const ids = new Set(BASE_GRAPH.nodes.map((n) => n.id));
  // mcp-server/src/cam/ exists in graph → wins over mcp-server/src
  assert.equal(resolveFsNodeId("mcp-server/src/cam/foo.ts", ids), "fs.deep.prism_mcp-server_src_cam");
});
test("resolveFsNodeId: climbs to ancestor when leaf dir not in graph", () => {
  const ids = new Set(BASE_GRAPH.nodes.map((n) => n.id));
  // mcp-server/src/quality/ NOT in graph → climbs to mcp-server/src/ → present
  assert.equal(resolveFsNodeId("mcp-server/src/quality/foo.ts", ids), "fs.deep.prism_mcp-server_src");
});
test("resolveFsNodeId: returns null when NO ancestor exists", () => {
  const ids = new Set(["ghost.something"]); // no fs.deep.prism at all
  assert.equal(resolveFsNodeId("mcp-server/src/foo.ts", ids), null);
});
test("resolveFsNodeId: does NOT fall back to bare fs.deep.prism root", () => {
  // The repo-root climb is intentionally disabled: every touch would resolve
  // there, producing false fleet-overlap signal in the heat map. Operators
  // need specificity — "this slot touched fs.deep.prism_scripts" is useful;
  // "this slot touched fs.deep.prism" is noise.
  const ids = new Set(["fs.deep.prism"]);
  assert.equal(resolveFsNodeId("scripts/foo.ts", ids), null);
});
test("resolveFsNodeId: file with single parent dir resolves to that dir", () => {
  const ids = new Set(["fs.deep.prism", "fs.deep.prism_scripts"]);
  assert.equal(resolveFsNodeId("scripts/foo.ts", ids), "fs.deep.prism_scripts");
});
test("resolveFsNodeId: empty/null path → null", () => {
  const ids = new Set(["fs.deep.prism"]);
  assert.equal(resolveFsNodeId("", ids), null);
  assert.equal(resolveFsNodeId(null, ids), null);
});
test("resolveFsNodeId: single-segment path (no parent) → null", () => {
  const ids = new Set(["fs.deep.prism"]);
  // "README.md" has zero parent dirs after dropping the filename — needs ≥2 segs total.
  assert.equal(resolveFsNodeId("README.md", ids), null);
});

// ── generate: happy path ──────────────────────────────────────────────────
test("generate: emits roost + per-slot node + per-dir edges", () => {
  const slotCommits = {
    sierra: [
      { sha: "abc123def456", files: ["mcp-server/src/cam/foo.ts", "mcp-server/src/cam/bar.ts"] },
    ],
  };
  const r = generate({ graph: BASE_GRAPH, slotCommits, slotNames: ["sierra"] });
  assert.equal(r.error, undefined);
  const roost = r.newNodes.find((n) => n.id === "ghost.slot_activity");
  assert.ok(roost, "roost emitted");
  assert.equal(roost.layer, "L8", "layer copied from ghost.slot_synergy");
  assert.equal(roost.parent, "ghost.planned_features", "parent copied from ghost.slot_synergy");
  assert.equal(r.stats.parentCreated, true);

  const sierra = r.newNodes.find((n) => n.id === "slot.activity.sierra");
  assert.ok(sierra, "sierra slot-activity node emitted");
  assert.equal(sierra.parent, "ghost.slot_activity");
  assert.equal(sierra.touchesResolved, 2);
  assert.equal(sierra.touchesUnresolved, 0);
  assert.equal(sierra.dirCount, 1);

  // 1 edge — both touches collapse to the same dir node
  const edges = r.newEdges.filter((e) => e.from === "slot.activity.sierra" && e.type === "touched-fs");
  assert.equal(edges.length, 1);
  assert.equal(edges[0].to, "fs.deep.prism_mcp-server_src_cam");
  assert.equal(edges[0].count, 2);
  assert.equal(edges[0].lastSha, "abc123def456");
  // intensity = log10(3)*0.1 ≈ 0.0477 → clamped to 0.05 floor
  assert.ok(edges[0].intensity >= 0.05 && edges[0].intensity <= 0.5);
  assert.equal(r.stats.edgesEmitted, 1);
});

test("generate: deterministic edge order (sorted by fsId)", () => {
  const slotCommits = {
    alpha: [
      { sha: "111", files: [
        "scripts/foo.mjs",                  // → fs.deep.prism_scripts
        "mcp-server/src/cam/x.ts",          // → fs.deep.prism_mcp-server_src_cam
        "mcp-server/src/quality/y.ts",      // → fs.deep.prism_mcp-server_src
      ] },
    ],
  };
  const r = generate({ graph: BASE_GRAPH, slotCommits, slotNames: ["alpha"] });
  const alphaEdges = r.newEdges.filter((e) => e.from === "slot.activity.alpha");
  // Sorted ASC by fsId.
  const ids = alphaEdges.map((e) => e.to);
  const sorted = [...ids].sort();
  assert.deepEqual(ids, sorted, "edges sorted by destination fs id");
});

test("generate: skips slots with NO commits", () => {
  const slotCommits = { sierra: [{ sha: "a", files: ["mcp-server/src/cam/foo.ts"] }] };
  const r = generate({ graph: BASE_GRAPH, slotCommits, slotNames: ["alpha", "sierra"] });
  // alpha has no entry in slotCommits → no slot.activity.alpha emitted
  assert.equal(r.newNodes.find((n) => n.id === "slot.activity.alpha"), undefined);
  assert.equal(r.newNodes.find((n) => n.id === "slot.activity.sierra") !== undefined, true);
  assert.equal(r.stats.slotsScanned, 2);
  assert.equal(r.stats.slotsEmitted, 1);
});

test("generate: skips slots whose touches ALL fail to resolve", () => {
  const slotCommits = {
    alpha: [{ sha: "ghost", files: ["not-in-graph/dir/file.ts"] }],
  };
  const r = generate({ graph: BASE_GRAPH, slotCommits, slotNames: ["alpha"] });
  // alpha touched only unresolvable paths → no node emitted (no value)
  assert.equal(r.newNodes.find((n) => n.id === "slot.activity.alpha"), undefined);
  assert.equal(r.stats.touchesUnresolved, 1);
  assert.equal(r.stats.touchesResolved, 0);
  assert.equal(r.stats.edgesEmitted, 0);
});

test("generate: mixed resolved + unresolved touches — node still emitted", () => {
  const slotCommits = {
    bravo: [{ sha: "mixedHash", files: [
      "mcp-server/src/cam/ok.ts",     // → fs.deep.prism_mcp-server_src_cam
      "ghost-path/nope.ts",           // unresolved
    ] }],
  };
  const r = generate({ graph: BASE_GRAPH, slotCommits, slotNames: ["bravo"] });
  const node = r.newNodes.find((n) => n.id === "slot.activity.bravo");
  assert.ok(node);
  assert.equal(node.touchesResolved, 1);
  assert.equal(node.touchesUnresolved, 1);
});

test("generate: idempotent — slot.activity.<name> already in graph is skipped", () => {
  const graph = { nodes: [...BASE_GRAPH.nodes, { id: "slot.activity.sierra", layer: "L9" }] };
  const slotCommits = { sierra: [{ sha: "a", files: ["mcp-server/src/cam/foo.ts"] }] };
  const r = generate({ graph, slotCommits, slotNames: ["sierra"] });
  assert.equal(r.newNodes.find((n) => n.id === "slot.activity.sierra"), undefined,
    "existing graph node not re-emitted");
  assert.equal(r.stats.slotsEmitted, 0);
});

test("generate: roost NOT re-created when ghost.slot_activity already in graph", () => {
  const graph = { nodes: [...BASE_GRAPH.nodes, { id: "ghost.slot_activity", layer: "L8" }] };
  const slotCommits = { sierra: [{ sha: "a", files: ["mcp-server/src/cam/foo.ts"] }] };
  const r = generate({ graph, slotCommits, slotNames: ["sierra"] });
  assert.equal(r.stats.parentCreated, false);
  assert.equal(r.newNodes.find((n) => n.id === "ghost.slot_activity"), undefined);
});

test("generate: multi-slot overlap — both slots get edges to same fs node", () => {
  const slotCommits = {
    alpha:  [{ sha: "alphaSha",  files: ["mcp-server/src/cam/x.ts"] }],
    bravo:  [{ sha: "bravoSha",  files: ["mcp-server/src/cam/y.ts"] }],
  };
  const r = generate({ graph: BASE_GRAPH, slotCommits, slotNames: ["alpha", "bravo"] });
  const aE = r.newEdges.find((e) => e.from === "slot.activity.alpha");
  const bE = r.newEdges.find((e) => e.from === "slot.activity.bravo");
  assert.ok(aE && bE, "both slots emit edges");
  assert.equal(aE.to, "fs.deep.prism_mcp-server_src_cam");
  assert.equal(bE.to, "fs.deep.prism_mcp-server_src_cam");
  // Overlap is encoded as two edges with the SAME destination — viewer
  // computes the set intersection. This is the operator-value lift.
});

test("generate: fallback layer L8 when graph has no ghost.* node", () => {
  const graph = { nodes: [FS_PRISM_MCP_SRC_CAM] };
  const slotCommits = { sierra: [{ sha: "a", files: ["mcp-server/src/cam/foo.ts"] }] };
  const r = generate({ graph, slotCommits, slotNames: ["sierra"] });
  assert.equal(r.newNodes.find((n) => n.id === "ghost.slot_activity").layer, "L8");
});

// ── failure modes ─────────────────────────────────────────────────────────
test("generate: graph missing → graph-missing-or-malformed", () => {
  const r = generate({ graph: undefined, slotCommits: {}, slotNames: ["a"] });
  assert.equal(r.error, "graph-missing-or-malformed");
  assert.deepEqual(r.newNodes, []);
});
test("generate: graph without nodes array → graph-missing-or-malformed", () => {
  const r = generate({ graph: { nodes: "not-an-array" }, slotCommits: {}, slotNames: ["a"] });
  assert.equal(r.error, "graph-missing-or-malformed");
});
test("generate: slotCommits missing → slot-commits-missing", () => {
  const r = generate({ graph: BASE_GRAPH, slotCommits: null, slotNames: ["a"] });
  assert.equal(r.error, "slot-commits-missing");
});
test("generate: slotNames missing → slot-names-missing", () => {
  const r = generate({ graph: BASE_GRAPH, slotCommits: {} });
  assert.equal(r.error, "slot-names-missing");
});
test("generate: empty slotNames → slot-names-missing", () => {
  const r = generate({ graph: BASE_GRAPH, slotCommits: {}, slotNames: [] });
  assert.equal(r.error, "slot-names-missing");
});

// ── adversarial ───────────────────────────────────────────────────────────
test("generate: non-array commits for a slot → silently skip (no crash)", () => {
  const slotCommits = { sierra: "not-an-array", alpha: [{ sha: "a", files: ["mcp-server/src/cam/x.ts"] }] };
  const r = generate({ graph: BASE_GRAPH, slotCommits, slotNames: ["sierra", "alpha"] });
  // sierra ignored; alpha emits normally
  assert.equal(r.newNodes.find((n) => n.id === "slot.activity.sierra"), undefined);
  assert.ok(r.newNodes.find((n) => n.id === "slot.activity.alpha"));
});
test("generate: commit with non-array files → silently skip files", () => {
  const slotCommits = { sierra: [{ sha: "a", files: null }, { sha: "b", files: ["mcp-server/src/cam/y.ts"] }] };
  const r = generate({ graph: BASE_GRAPH, slotCommits, slotNames: ["sierra"] });
  const node = r.newNodes.find((n) => n.id === "slot.activity.sierra");
  assert.ok(node, "second commit produces a node");
  assert.equal(node.touchesResolved, 1);
});
test("generate: commit with empty sha → still recorded as touch", () => {
  const slotCommits = { sierra: [{ sha: "", files: ["mcp-server/src/cam/x.ts"] }] };
  const r = generate({ graph: BASE_GRAPH, slotCommits, slotNames: ["sierra"] });
  const edge = r.newEdges.find((e) => e.from === "slot.activity.sierra");
  assert.ok(edge);
  assert.equal(edge.lastSha, null, "empty sha normalized to null");
});
test("generate: augmentation envelope has merge-augmentations contract shape", () => {
  const slotCommits = { sierra: [{ sha: "a", files: ["mcp-server/src/cam/x.ts"] }] };
  const r = generate({ graph: BASE_GRAPH, slotCommits, slotNames: ["sierra"] });
  assert.equal(r.schemaVersion, "1.0.0");
  assert.ok(typeof r.generatedAt === "string");
  assert.equal(r.windowDays, 7);
  assert.ok(Array.isArray(r.newNodes) && Array.isArray(r.newEdges));
  assert.ok(r.stats && typeof r.stats === "object");
});
test("generate: intensity is clamped to [0.05, 0.5]", () => {
  // Stress: 10,000 touches → log10(10001)*0.1 ≈ 0.4 (under cap)
  const files = Array.from({ length: 10000 }, () => "mcp-server/src/cam/x.ts");
  const slotCommits = { sierra: [{ sha: "a", files }] };
  const r = generate({ graph: BASE_GRAPH, slotCommits, slotNames: ["sierra"] });
  const edge = r.newEdges.find((e) => e.from === "slot.activity.sierra");
  assert.ok(edge.intensity >= 0.05 && edge.intensity <= 0.5,
    `intensity ${edge.intensity} out of [0.05, 0.5]`);
});
