#!/usr/bin/env node
/**
 * graph-node-embedding-bridge.test.mjs — RAG-UPGRADE-MS0 / U-GNN-NODE-EMBED-BRIDGE
 *
 * Pin the bridge's intent (R9) and the int8-quantization protocol (matches the
 * existing graphsage-train-pipeline loader fixture, `q[i]/127` dequant). Real
 * reference values throughout — no `assert.ok(typeof x === 'object')` stubs.
 *
 * Coverage axes (per comprehensive-build-enforce floor):
 *   - HAPPY × 3 variability configs (dim=3 micro, dim=8 default-input, dim=768 nomic-real)
 *   - FAILURE MODES ≥ 3 (missing file, malformed json, dim mismatch, non-finite vec)
 *   - ADVERSARIAL ≥ 2 (zero vector, NaN/Infinity components, oversize input clamp)
 *   - WIRING: buildEmbeddingSource end-to-end via DI hooks (no real disk in test)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

import {
  wikiPathToIndexKey,
  l2Normalize,
  aggregateEmbeddings,
  quantizeInt8,
  buildIndexLookup,
  nodeToEmbeddingRow,
  buildEmbeddingSource,
  parseArgs,
  candidateBasenames,
  buildEngineWikiBasenameIndex,
} from "./graph-node-embedding-bridge.mjs";

/* ---------- wikiPathToIndexKey ---------- */

describe("wikiPathToIndexKey", () => {
  it("converts POSIX abs wiki path to the canonical id", () => {
    assert.equal(
      wikiPathToIndexKey("H:/prism/knowledge/wiki/architecture/foo.md"),
      "wiki:knowledge/wiki/architecture/foo.md",
    );
  });
  it("normalizes Windows backslashes", () => {
    assert.equal(
      wikiPathToIndexKey("H:\\prism\\knowledge\\wiki\\architecture\\bar.md"),
      "wiki:knowledge/wiki/architecture/bar.md",
    );
  });
  it("handles a different repo prefix", () => {
    assert.equal(
      wikiPathToIndexKey("/repo/prism/knowledge/wiki/x.md"),
      "wiki:knowledge/wiki/x.md",
    );
  });
  it("returns null for paths outside the wiki tree", () => {
    assert.equal(
      wikiPathToIndexKey("H:/prism/state/shared/foo.json"),
      null,
    );
    assert.equal(
      wikiPathToIndexKey("H:/prism/mcp-server/src/engines/Foo.ts"),
      null,
    );
  });
  it("returns null for non-string / empty / null input", () => {
    assert.equal(wikiPathToIndexKey(""), null);
    assert.equal(wikiPathToIndexKey(null), null);
    assert.equal(wikiPathToIndexKey(undefined), null);
    assert.equal(wikiPathToIndexKey(42), null);
    assert.equal(wikiPathToIndexKey({}), null);
  });
  it("preserves the wiki-subdir structure verbatim", () => {
    assert.equal(
      wikiPathToIndexKey("H:/prism/knowledge/wiki/code-tribal/learnings/x.md"),
      "wiki:knowledge/wiki/code-tribal/learnings/x.md",
    );
  });
});

/* ---------- l2Normalize ---------- */

describe("l2Normalize", () => {
  it("normalizes a unit-axis vector to itself", () => {
    const r = l2Normalize([1, 0, 0]);
    assert.deepEqual(Array.from(r), [1, 0, 0]);
  });
  it("normalizes [3, 4] to [0.6, 0.8] (3-4-5 triangle reference)", () => {
    const r = l2Normalize([3, 4]);
    assert.equal(r.length, 2);
    assert.ok(Math.abs(r[0] - 0.6) < 1e-12, `got ${r[0]}`);
    assert.ok(Math.abs(r[1] - 0.8) < 1e-12, `got ${r[1]}`);
  });
  it("returns null for a zero vector (cannot normalize)", () => {
    assert.equal(l2Normalize([0, 0, 0]), null);
  });
  it("throws on empty input (boundary)", () => {
    assert.throws(() => l2Normalize([]), /empty/);
  });
  it("throws on non-array input (boundary)", () => {
    assert.throws(() => l2Normalize(null), /array-like/);
    assert.throws(() => l2Normalize("abc"), /array-like/);
  });
  it("throws on NaN component (adversarial — fail loud, R12)", () => {
    assert.throws(() => l2Normalize([1, NaN, 0]), /non-finite/);
  });
  it("throws on Infinity component (adversarial)", () => {
    assert.throws(() => l2Normalize([Infinity, 0, 0]), /non-finite/);
  });
});

/* ---------- aggregateEmbeddings ---------- */

describe("aggregateEmbeddings", () => {
  it("returns a single normalized vector when given one input", () => {
    const r = aggregateEmbeddings([[3, 4]]);
    assert.equal(r.hits, 1);
    assert.equal(r.dim, 2);
    assert.ok(Math.abs(r.vector[0] - 0.6) < 1e-12);
    assert.ok(Math.abs(r.vector[1] - 0.8) < 1e-12);
  });
  it("averages two anti-parallel vectors to null (cancels — degenerate)", () => {
    const r = aggregateEmbeddings([[1, 0], [-1, 0]]);
    assert.equal(r, null); // mean=[0,0] → l2Normalize returns null
  });
  it("averages two orthogonal vectors to the bisector (reference)", () => {
    const r = aggregateEmbeddings([[1, 0], [0, 1]]);
    // mean = [0.5, 0.5] → normalize → [0.7071..., 0.7071...]
    assert.equal(r.hits, 2);
    assert.equal(r.dim, 2);
    const expected = 1 / Math.sqrt(2);
    assert.ok(Math.abs(r.vector[0] - expected) < 1e-12);
    assert.ok(Math.abs(r.vector[1] - expected) < 1e-12);
  });
  it("skips zero vectors but counts the rest", () => {
    const r = aggregateEmbeddings([[0, 0], [1, 0]]);
    assert.equal(r.hits, 1);
    assert.deepEqual(Array.from(r.vector), [1, 0]);
  });
  it("returns null when every input is degenerate", () => {
    assert.equal(aggregateEmbeddings([[0, 0], [0, 0]]), null);
  });
  it("throws on dim mismatch (corrupt index)", () => {
    assert.throws(() => aggregateEmbeddings([[1, 0], [1, 0, 0]]), /dim mismatch/);
  });
  it("throws on non-array input member", () => {
    assert.throws(() => aggregateEmbeddings([null]), /not array-like/);
  });
  it("throws on empty array (boundary)", () => {
    assert.throws(() => aggregateEmbeddings([]), /non-empty/);
  });
});

/* ---------- quantizeInt8 ---------- */

describe("quantizeInt8 (loader protocol: q[i] = round(v*127))", () => {
  it("matches the loader fixture: [1, 0, -1] → [127, 0, -127]", () => {
    assert.deepEqual(quantizeInt8([1, 0, -1]), [127, 0, -127]);
  });
  it("dequantizing via /127 round-trips within 1/127 (≈0.008)", () => {
    const orig = [0.5, -0.25, 0.0078, -0.99];
    const q = quantizeInt8(orig);
    const back = q.map((x) => x / 127);
    for (let i = 0; i < orig.length; i++) {
      assert.ok(Math.abs(back[i] - orig[i]) < 1 / 127 + 1e-9,
        `index ${i}: orig=${orig[i]} back=${back[i]} drift=${Math.abs(back[i] - orig[i])}`);
    }
  });
  it("clamps oversize input to [-127, 127] (adversarial, no overflow)", () => {
    assert.deepEqual(quantizeInt8([5, -5, 100, -100]), [127, -127, 127, -127]);
  });
  it("throws on non-finite input (adversarial)", () => {
    assert.throws(() => quantizeInt8([0.5, NaN]), /non-finite/);
    assert.throws(() => quantizeInt8([Infinity]), /non-finite/);
  });
  it("preserves length for the 768-d nomic case (variability config 3)", () => {
    const v = new Array(768).fill(0).map((_, i) => Math.sin(i) / 30);
    const q = quantizeInt8(v);
    assert.equal(q.length, 768);
    for (const x of q) assert.ok(Number.isInteger(x) && x >= -127 && x <= 127);
  });
});

/* ---------- buildIndexLookup ---------- */

describe("buildIndexLookup", () => {
  it("builds a usable Map from valid entries (variability: dim=3 micro)", () => {
    const r = buildIndexLookup([
      { id: "wiki:a", embedding: [1, 2, 3] },
      { id: "wiki:b", embedding: [4, 5, 6] },
    ]);
    assert.equal(r.dim, 3);
    assert.equal(r.lookup.size, 2);
    assert.deepEqual(r.lookup.get("wiki:a"), [1, 2, 3]);
    assert.equal(r.skipped, 0);
  });
  it("skips entries with missing/wrong-shape embedding (failure-mode tolerance)", () => {
    const r = buildIndexLookup([
      { id: "wiki:a", embedding: [1, 2, 3] },
      { id: "wiki:b" },                              // no embedding
      { id: "wiki:c", embedding: "not an array" },   // wrong type
      null,                                          // null entry
      { embedding: [1, 2, 3] },                      // no id
    ]);
    assert.equal(r.lookup.size, 1);
    assert.equal(r.skipped, 4);
  });
  it("skips dim-mismatched entries (transient model-swap state)", () => {
    const r = buildIndexLookup([
      { id: "wiki:a", embedding: [1, 2, 3] },     // sets dim=3
      { id: "wiki:b", embedding: [1, 2, 3, 4] },  // skipped
    ]);
    assert.equal(r.dim, 3);
    assert.equal(r.lookup.size, 1);
    assert.equal(r.skipped, 1);
  });
  it("throws on non-array entries (boundary)", () => {
    assert.throws(() => buildIndexLookup(null), /array/);
    assert.throws(() => buildIndexLookup({}), /array/);
  });
  it("handles an empty entries[] without crashing", () => {
    const r = buildIndexLookup([]);
    assert.equal(r.dim, null);
    assert.equal(r.lookup.size, 0);
    assert.equal(r.skipped, 0);
  });
});

/* ---------- nodeToEmbeddingRow ---------- */

describe("nodeToEmbeddingRow", () => {
  const lookup = new Map([
    ["wiki:knowledge/wiki/a.md", [1, 0, 0]],
    ["wiki:knowledge/wiki/b.md", [0, 1, 0]],
    ["wiki:knowledge/wiki/c.md", [0, 0, 1]],
  ]);

  it("aggregates 2 wiki hits into one int8-quantized row (happy path)", () => {
    const node = {
      id: "engine.Foo",
      knowledge: {
        wikiEntries: [
          { path: "H:/prism/knowledge/wiki/a.md" },
          { path: "H:/prism/knowledge/wiki/b.md" },
        ],
      },
    };
    const r = nodeToEmbeddingRow(node, lookup);
    assert.equal(r.n, "engine.Foo");
    assert.equal(r.hits, 2);
    assert.equal(r.dim, 3);
    // mean([1,0,0],[0,1,0]) = [0.5,0.5,0] → normalize → [0.707,0.707,0]
    // → q = round(0.707*127)=90 — exact for both first two dims
    assert.deepEqual(r.q, [90, 90, 0]);
  });

  it("emits exactly the loader's protocol shape (variability: dim=768)", () => {
    const e = new Array(768).fill(0).map((_, i) => Math.cos(i / 50));
    const big = new Map([["wiki:knowledge/wiki/big.md", e]]);
    const node = {
      id: "engine.Big",
      knowledge: { wikiEntries: [{ path: "H:\\prism\\knowledge\\wiki\\big.md" }] },
    };
    const r = nodeToEmbeddingRow(node, big);
    assert.equal(r.dim, 768);
    assert.equal(r.q.length, 768);
    assert.equal(r.hits, 1);
    for (const x of r.q) assert.ok(x >= -127 && x <= 127);
  });

  it("returns null for a node with 0 wiki entries (omitted, not crashed)", () => {
    const node = { id: "p.foo", knowledge: { wikiEntries: [] } };
    assert.equal(nodeToEmbeddingRow(node, lookup), null);
  });

  it("returns null for a node whose wiki entries are all unindexed", () => {
    const node = {
      id: "engine.Bar",
      knowledge: { wikiEntries: [{ path: "H:/prism/knowledge/wiki/never-embedded.md" }] },
    };
    assert.equal(nodeToEmbeddingRow(node, lookup), null);
  });

  it("returns null for a node with missing/odd knowledge field (no crash)", () => {
    assert.equal(nodeToEmbeddingRow({ id: "x" }, lookup), null);
    assert.equal(nodeToEmbeddingRow({ id: "x", knowledge: null }, lookup), null);
    assert.equal(nodeToEmbeddingRow({ id: "x", knowledge: { wikiEntries: "nope" } }, lookup), null);
  });

  it("dedupes duplicate wiki paths within one node (no double-weight)", () => {
    const node = {
      id: "engine.Dup",
      knowledge: {
        wikiEntries: [
          { path: "H:/prism/knowledge/wiki/a.md" },
          { path: "H:/prism/knowledge/wiki/a.md" }, // duplicate
          { path: "H:/prism/knowledge/wiki/a.md" }, // duplicate
        ],
      },
    };
    const r = nodeToEmbeddingRow(node, lookup);
    assert.equal(r.hits, 1); // dedup → single vector
    assert.deepEqual(r.q, [127, 0, 0]); // [1,0,0] dequant
  });

  it("returns null for a non-string-id node", () => {
    assert.equal(nodeToEmbeddingRow(null, lookup), null);
    assert.equal(nodeToEmbeddingRow({ id: 42 }, lookup), null);
  });

  it("filters mixed indexed + unindexed paths to the indexed subset", () => {
    const node = {
      id: "engine.Mixed",
      knowledge: {
        wikiEntries: [
          { path: "H:/prism/knowledge/wiki/a.md" },     // hit
          { path: "H:/prism/knowledge/wiki/missing.md" },// miss
          { path: "H:/prism/state/shared/foo.json" },   // outside wiki — null
        ],
      },
    };
    const r = nodeToEmbeddingRow(node, lookup);
    assert.equal(r.hits, 1);
    assert.deepEqual(r.q, [127, 0, 0]);
  });

  // U-NN-PREDICTOR-EMBED-WIRE-BRIDGE-EXPAND (2026-05-24, slot papa)
  it("basename-index resolves ghost.unwired.<X>Engine nodes that have no knowledge.wikiEntries", () => {
    // The exact data shape that produced hit=22/6000 on the live graph: a
    // ghost node with NO knowledge, joined via lowercased label → engine
    // wiki page basename. Pre-expansion: returned null (no wikiEntries).
    const ghost = { id: "ghost.unwired.AbstractionHierarchyEngine", label: "AbstractionHierarchyEngine" };
    const lookup = new Map([
      ["wiki:knowledge/wiki/architecture/engines/other/abstractionhierarchyengine.md", [1.0, 0.5, 0.0]],
    ]);
    const basenameIndex = new Map([
      ["abstractionhierarchyengine", "H:/prism/knowledge/wiki/architecture/engines/other/abstractionhierarchyengine.md"],
    ]);
    const r = nodeToEmbeddingRow(ghost, lookup, { basenameIndex });
    assert.ok(r, "ghost node with matching basename must produce a row");
    assert.equal(r.n, "ghost.unwired.AbstractionHierarchyEngine");
    assert.equal(r.hits, 1);
    assert.equal(r.dim, 3);
  });

  it("basename-index honors candidateBasenames priority (label → id-tail → strip-Engine)", () => {
    // Label is "FooEngine", wiki page is filed under "foo" (Engine suffix
    // dropped). Resolver must walk down through `Engine`-stripped variants.
    const ghost = { id: "ghost.unwired.FooEngine", label: "FooEngine" };
    const lookup = new Map([
      ["wiki:knowledge/wiki/architecture/engines/cam/foo.md", [0.1, 0.2, 0.3]],
    ]);
    const basenameIndex = new Map([
      ["foo", "H:/prism/knowledge/wiki/architecture/engines/cam/foo.md"],
    ]);
    const r = nodeToEmbeddingRow(ghost, lookup, { basenameIndex });
    assert.ok(r, "Engine-suffix-strip fallback must hit");
    assert.equal(r.hits, 1);
  });

  it("basename-index is strictly additive — Path 1 (wikiEntries) still wins when present", () => {
    // A node with wikiEntries[] must NOT fall through to the basename index
    // even when the basename would also match — preserves the canonical-data
    // wins invariant. (Path 2 is opportunistic recovery, never a default.)
    const node = {
      id: "engine.FooEngine",
      label: "FooEngine",
      knowledge: { wikiEntries: [{ path: "H:/prism/knowledge/wiki/architecture/engines/path1/foo.md" }] },
    };
    const path1Vec = [9.9, 9.9, 9.9];
    const path2Vec = [0.0, 0.0, 0.0];
    const lookup = new Map([
      ["wiki:knowledge/wiki/architecture/engines/path1/foo.md", path1Vec],
      ["wiki:knowledge/wiki/architecture/engines/path2/foo.md", path2Vec],
    ]);
    const basenameIndex = new Map([
      ["foo", "H:/prism/knowledge/wiki/architecture/engines/path2/foo.md"],
    ]);
    const r = nodeToEmbeddingRow(node, lookup, { basenameIndex });
    assert.ok(r);
    // Path 1's vec was [9.9, 9.9, 9.9] (all-positive, L2-normalized → all
    // components equal + positive). Path 2's vec was [0, 0, 0] which is a
    // degenerate zero vector. If Path 2 fired, aggregateEmbeddings would have
    // averaged with zeros (smaller magnitude post-normalization) OR returned
    // null on the all-zeros case. Verify Path 1 won by checking all components
    // are equal + positive + identical (the trade-mark of a single all-equal
    // input vector survived L2-normalize + quantize).
    assert.equal(r.hits, 1, "exactly one source vector must aggregate (Path 1's only)");
    assert.ok(r.q[0] > 0 && r.q[0] === r.q[1] && r.q[1] === r.q[2],
      `Path-1 [9.9,9.9,9.9] must produce all-positive equal-component output (got q=${r.q.join(",")})`);
  });

  it("basename-index miss returns null (NOT a partial match — honest fail)", () => {
    // No wikiEntries, basename not in index → null. Bridge correctly counts
    // this as `unmatched` rather than fabricating a half-baked row.
    const ghost = { id: "ghost.unwired.NeverHeardOfItEngine", label: "NeverHeardOfItEngine" };
    const lookup = new Map([
      ["wiki:knowledge/wiki/architecture/engines/other/abstractionhierarchyengine.md", [1.0, 0.5, 0.0]],
    ]);
    const basenameIndex = new Map([
      ["abstractionhierarchyengine", "H:/prism/knowledge/wiki/architecture/engines/other/abstractionhierarchyengine.md"],
    ]);
    const r = nodeToEmbeddingRow(ghost, lookup, { basenameIndex });
    assert.equal(r, null, "must NOT fabricate a hit for unrelated nodes");
  });

  it("candidateBasenames yields ordered, deduplicated lowercase candidates", () => {
    const got = candidateBasenames({ id: "ghost.unwired.FooEngine", label: "FooEngine" });
    assert.deepEqual(got, ["fooengine", "foo"]);
  });

  it("candidateBasenames degrades gracefully on a label-less / id-less node", () => {
    assert.deepEqual(candidateBasenames(null), []);
    assert.deepEqual(candidateBasenames({}), []);
    assert.deepEqual(candidateBasenames({ id: 42 }), []);
  });
});

/* ---------- buildEngineWikiBasenameIndex ---------- */

describe("buildEngineWikiBasenameIndex (Path-2 resolver scanner)", () => {
  it("scans nested wiki engine subfolders and indexes by lowercased basename", () => {
    const readdir = (dir) => {
      const norm = dir.replace(/\\/g, "/");
      if (norm.endsWith("/engines")) {
        return [
          { name: "ai", isDirectory: () => true },
          { name: "cam", isDirectory: () => true },
        ];
      }
      if (norm.endsWith("/ai")) {
        return [
          { name: "AbstractionHierarchyEngine.md", isDirectory: () => false },
          { name: "_INDEX.md", isDirectory: () => false },     // underscore → skipped
        ];
      }
      if (norm.endsWith("/cam")) {
        return [
          { name: "foo.md", isDirectory: () => false },
          { name: "notes.txt", isDirectory: () => false },    // not .md → skipped
        ];
      }
      return [];
    };
    const idx = buildEngineWikiBasenameIndex("H:/repo/knowledge/wiki/architecture/engines", { readdirSyncImpl: readdir });
    assert.equal(idx.size, 2);
    assert.equal(idx.get("abstractionhierarchyengine"), "H:/repo/knowledge/wiki/architecture/engines/ai/AbstractionHierarchyEngine.md");
    assert.equal(idx.get("foo"), "H:/repo/knowledge/wiki/architecture/engines/cam/foo.md");
    assert.equal(idx.has("_INDEX"), false);
    assert.equal(idx.has("notes"), false);
  });

  it("returns empty Map on missing engines root (R12 fail-soft)", () => {
    const readdir = () => { throw new Error("ENOENT"); };
    const idx = buildEngineWikiBasenameIndex("/nonexistent", { readdirSyncImpl: readdir });
    assert.ok(idx instanceof Map);
    assert.equal(idx.size, 0);
  });

  it("first-write-wins on basename collisions (stable across re-scans)", () => {
    const readdir = (dir) => {
      const norm = dir.replace(/\\/g, "/");
      if (norm.endsWith("/engines")) return [{ name: "cam", isDirectory: () => true }, { name: "lathe", isDirectory: () => true }];
      if (norm.endsWith("/cam")) return [{ name: "foo.md", isDirectory: () => false }];
      if (norm.endsWith("/lathe")) return [{ name: "foo.md", isDirectory: () => false }];
      return [];
    };
    const idx = buildEngineWikiBasenameIndex("H:/r/knowledge/wiki/architecture/engines", { readdirSyncImpl: readdir });
    assert.equal(idx.size, 1, "duplicates collapse to one entry");
    assert.match(idx.get("foo"), /cam\/foo\.md$/, "first walk wins (cam comes before lathe alphabetically)");
  });
});

/* ---------- buildEmbeddingSource (end-to-end via DI) ---------- */

describe("buildEmbeddingSource (end-to-end, fail-soft shell)", () => {
  function makeFixture() {
    const graph = {
      schemaVersion: "test",
      nodes: [
        {
          id: "engine.Foo",
          knowledge: {
            wikiEntries: [{ path: "H:/prism/knowledge/wiki/a.md" }],
          },
        },
        {
          id: "engine.Bar",
          knowledge: {
            wikiEntries: [
              { path: "H:/prism/knowledge/wiki/b.md" },
              { path: "H:/prism/knowledge/wiki/missing.md" },
            ],
          },
        },
        { id: "engine.Baz", knowledge: { wikiEntries: [] } }, // skipped
      ],
    };
    const index = {
      schemaVersion: "1.0.0",
      model: "nomic-embed-text:latest",
      dim: 3,
      entries: [
        { id: "wiki:knowledge/wiki/a.md", embedding: [1, 0, 0] },
        { id: "wiki:knowledge/wiki/b.md", embedding: [0, 1, 0] },
      ],
    };
    const files = new Map([
      ["graph.json", JSON.stringify(graph)],
      ["idx.json", JSON.stringify(index)],
    ]);
    const writes = new Map();
    return {
      graph,
      index,
      readFileImpl: (p) => {
        const key = path.basename(p);
        if (files.has(key)) return files.get(key);
        throw new Error("ENOENT: " + p);
      },
      writeFileImpl: (p, s) => { writes.set(p, s); },
      renameImpl: (a, b) => {
        if (!writes.has(a)) throw new Error("rename src missing: " + a);
        writes.set(b, writes.get(a));
        writes.delete(a);
      },
      writes,
    };
  }

  it("writes a valid JSONL with 2 rows, omits the 0-wiki-entry node", () => {
    const f = makeFixture();
    const r = buildEmbeddingSource({
      graphPath: "graph.json",
      indexPath: "idx.json",
      outPath: "out.jsonl",
      readFileImpl: f.readFileImpl,
      writeFileImpl: f.writeFileImpl,
      renameImpl: f.renameImpl,
    });
    assert.equal(r.ok, true);
    assert.equal(r.written, 1);
    assert.equal(r.nodeCount, 3);
    assert.equal(r.matched, 2);
    assert.equal(r.unmatched, 1);
    assert.equal(r.dim, 3);
    assert.equal(r.errors.length, 0);
    const body = f.writes.get("out.jsonl");
    const lines = body.trim().split("\n");
    assert.equal(lines.length, 3); // META + 2 rows
    const meta = JSON.parse(lines[0]);
    assert.equal(meta.__meta, true);
    assert.equal(meta.dim, 3);
    assert.equal(meta.count, 2);
    assert.equal(meta.model, "nomic-embed-text:latest");
    assert.equal(meta.source, "graph-node-bridge");
    const row0 = JSON.parse(lines[1]);
    assert.equal(row0.n, "engine.Foo");
    assert.deepEqual(row0.q, [127, 0, 0]);
    const row1 = JSON.parse(lines[2]);
    assert.equal(row1.n, "engine.Bar");
    assert.deepEqual(row1.q, [0, 127, 0]); // only b.md hit ([0,1,0] → quantize → [0,127,0])
  });

  it("emits JSONL the loader can parse (round-trip) — variability dim=3", () => {
    const f = makeFixture();
    const r = buildEmbeddingSource({
      graphPath: "graph.json",
      indexPath: "idx.json",
      outPath: "out.jsonl",
      readFileImpl: f.readFileImpl,
      writeFileImpl: f.writeFileImpl,
      renameImpl: f.renameImpl,
    });
    const body = f.writes.get("out.jsonl");
    // Mirror the loader fixture exactly: every row dequantizes via q[i]/127
    for (const line of body.trim().split("\n").slice(1)) {
      const row = JSON.parse(line);
      assert.equal(typeof row.n, "string");
      assert.ok(Array.isArray(row.q));
      assert.equal(row.q.length, 3);
      for (const x of row.q) {
        assert.ok(Number.isInteger(x));
        assert.ok(x >= -127 && x <= 127);
      }
    }
    assert.equal(r.indexSkipped, 0);
  });

  it("FAIL-LOUD: missing graph file lands in errors[], no throw", () => {
    const r = buildEmbeddingSource({
      graphPath: "nope.json",
      indexPath: "also-missing.json",
      outPath: "out.jsonl",
      readFileImpl: (_p) => { throw new Error("ENOENT"); },
      writeFileImpl: () => assert.fail("should not write"),
      renameImpl: () => assert.fail("should not rename"),
    });
    assert.equal(r.ok, false);
    assert.equal(r.written, 0);
    assert.ok(r.errors.length >= 1);
    assert.match(r.errors[0], /graph read failed/);
  });

  it("ERR_STRING_TOO_LONG: text-mode readFileImpl error falls through to streaming reader (U-NN-PREDICTOR-EMBED-WIRE follow-up 2026-05-24)", () => {
    // Write a real small graph to a tmp file so the streaming-fallback path
    // has a parseable target. The seam throws the V8 string-length error first;
    // bridge must catch e.code === ERR_STRING_TOO_LONG and retry via streaming.
    const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), "bridge-streaming-"));
    const graphPath = path.join(tmpdir, "graph.json");
    const indexPath = path.join(tmpdir, "idx.json");
    const outPath = path.join(tmpdir, "out.jsonl");
    fs.writeFileSync(graphPath, JSON.stringify({
      nodes: [{ id: "n1", path: "knowledge/wiki/architecture/engines/FooEngine.md" }],
      edges: [],
    }), "utf8");
    fs.writeFileSync(indexPath, JSON.stringify({
      entries: [
        { key: "wiki:knowledge/wiki/architecture/engines/FooEngine.md", dim: 3, vector: [1, 2, 3] },
      ],
    }), "utf8");

    const stringTooLongErr = Object.assign(new Error("Cannot create a string longer than 0x1fffffe8 characters"), {
      code: "ERR_STRING_TOO_LONG",
    });
    let graphReads = 0;
    const r = buildEmbeddingSource({
      graphPath, indexPath, outPath,
      readFileImpl: (p) => {
        if (path.basename(p) === "graph.json") {
          graphReads++;
          throw stringTooLongErr; // forces streaming fallback
        }
        return fs.readFileSync(p, "utf8");
      },
    });
    assert.equal(graphReads, 1, "the user-injected text reader must be tried first");
    assert.equal(r.ok, true, `streaming fallback must succeed (errors: ${JSON.stringify(r.errors)})`);
    assert.equal(r.written, 1);

    fs.rmSync(tmpdir, { recursive: true, force: true });
  });

  it("shard-aware index read: buildEmbeddingSource reads the SHARDED index with NO monolith present (U-GNN-BRIDGE-SHARD-AWARE 2026-06-10)", () => {
    // The tribal index sharded 2026-06-08 and the monolith was deleted. This
    // fixture writes ONLY the manifest + shard (the monolith idx.json is
    // intentionally absent), so the pre-fix readFile(indexPath)+JSON.parse path
    // would ENOENT -- the test PASSES only via the shard-aware loadTribalIndex
    // branch. Guards against a silent revert to the monolith-only read (R9).
    const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), "bridge-shard-"));
    const graphPath = path.join(tmpdir, "graph.json");
    const indexPath = path.join(tmpdir, "idx.json"); // intentionally NOT created
    const manifestPath = path.join(tmpdir, "idx.manifest.json");
    const shardPath = path.join(tmpdir, "idx.shard-000.json");
    const outPath = path.join(tmpdir, "out.jsonl");

    fs.writeFileSync(graphPath, JSON.stringify({
      nodes: [{ id: "n1", path: "knowledge/wiki/architecture/engines/FooEngine.md" }],
      edges: [],
    }), "utf8");
    const shardObj = { entries: [
      { id: "wiki:knowledge/wiki/architecture/engines/FooEngine.md", embedding: [1, 2, 3] },
    ] };
    fs.writeFileSync(shardPath, JSON.stringify(shardObj), "utf8");
    fs.writeFileSync(manifestPath, JSON.stringify({
      sharded: true, shardCount: 1, totalEntries: 1,
      shards: [{ file: "idx.shard-000.json", count: 1, bytes: Buffer.byteLength(JSON.stringify(shardObj)) }],
    }), "utf8");

    assert.equal(fs.existsSync(indexPath), false, "monolith must be absent (this is what proves the shard path)");
    const r = buildEmbeddingSource({ graphPath, indexPath, outPath });
    assert.equal(r.ok, true, `shard-aware read must succeed (errors: ${JSON.stringify(r.errors)})`);
    assert.equal(r.written, 1, "the single matching node must be written from the sharded index");

    fs.rmSync(tmpdir, { recursive: true, force: true });
  });

  it("ERR_STRING_TOO_LONG: catastrophic streaming failure surfaces a structured error (no throw)", () => {
    // Graph path doesn't exist — text throws ERR_STRING_TOO_LONG (forced via
    // the seam) → streaming fallback tries to open a missing file → its own
    // ENOENT must be caught + reported, NOT propagated.
    const stringTooLongErr = Object.assign(new Error("Cannot create a string longer than 0x1fffffe8 characters"), {
      code: "ERR_STRING_TOO_LONG",
    });
    const r = buildEmbeddingSource({
      graphPath: "C:/does-not-exist/graph.json",
      indexPath: "C:/does-not-exist/idx.json",
      outPath: "C:/does-not-exist/out.jsonl",
      readFileImpl: (_p) => { throw stringTooLongErr; },
      writeFileImpl: () => assert.fail("should not write"),
      renameImpl: () => assert.fail("should not rename"),
    });
    assert.equal(r.ok, false);
    assert.ok(r.errors.length >= 1);
    assert.match(r.errors[0], /streaming fallback/i);
  });

  it("FAIL-LOUD: malformed JSON in graph lands in errors[]", () => {
    const r = buildEmbeddingSource({
      graphPath: "graph.json",
      indexPath: "idx.json",
      outPath: "out.jsonl",
      readFileImpl: (p) => path.basename(p) === "graph.json" ? "{not json" : '{"entries":[]}',
      writeFileImpl: () => assert.fail("should not write"),
      renameImpl: () => assert.fail("should not rename"),
    });
    assert.equal(r.ok, false);
    assert.match(r.errors[0], /graph parse failed/);
  });

  it("FAIL-LOUD: index missing entries[] lands in errors[]", () => {
    const r = buildEmbeddingSource({
      graphPath: "graph.json",
      indexPath: "idx.json",
      outPath: "out.jsonl",
      readFileImpl: (p) => path.basename(p) === "graph.json"
        ? JSON.stringify({ nodes: [] })
        : JSON.stringify({ schemaVersion: 1 }), // no entries[]
      writeFileImpl: () => assert.fail("should not write"),
      renameImpl: () => assert.fail("should not rename"),
    });
    assert.equal(r.ok, false);
    assert.match(r.errors[0], /entries/);
  });

  it("BOUNDARY: missing required option lands in errors[], no read attempted", () => {
    let reads = 0;
    const r = buildEmbeddingSource({
      graphPath: "graph.json",
      indexPath: "idx.json",
      // outPath missing
      readFileImpl: () => { reads++; return ""; },
    });
    assert.equal(r.ok, false);
    assert.equal(reads, 0);
    assert.match(r.errors[0], /graphPath.*indexPath.*outPath/);
  });

  it("VARIABILITY 2: single-node graph with empty entries → 0 matched, valid META", () => {
    const f = {
      readFileImpl: (p) => path.basename(p) === "graph.json"
        ? JSON.stringify({ nodes: [{ id: "x", knowledge: { wikiEntries: [{ path: "H:/prism/knowledge/wiki/x.md" }] } }] })
        : JSON.stringify({ entries: [] }),
      writes: new Map(),
    };
    f.writeFileImpl = (p, s) => f.writes.set(p, s);
    f.renameImpl = (a, b) => { f.writes.set(b, f.writes.get(a)); f.writes.delete(a); };
    const r = buildEmbeddingSource({
      graphPath: "graph.json",
      indexPath: "idx.json",
      outPath: "out.jsonl",
      ...f,
    });
    assert.equal(r.ok, true);
    assert.equal(r.matched, 0);
    assert.equal(r.unmatched, 1);
    const lines = f.writes.get("out.jsonl").trim().split("\n");
    assert.equal(lines.length, 1); // just META
    const meta = JSON.parse(lines[0]);
    assert.equal(meta.count, 0);
    assert.equal(meta.dim, null); // honest — no rows means no proven dim
  });
});

/* ---------- parseArgs ---------- */

describe("parseArgs", () => {
  it("parses standard flags", () => {
    const r = parseArgs(["--graph", "g.json", "--index", "i.json", "--out", "o.jsonl"]);
    assert.equal(typeof r.graphPath, "string");
    assert.equal(typeof r.indexPath, "string");
    assert.equal(typeof r.outPath, "string");
    assert.equal(r.json, false);
  });
  it("honors --json", () => {
    const r = parseArgs(["--graph", "g", "--index", "i", "--out", "o", "--json"]);
    assert.equal(r.json, true);
  });
  it("honors --help / -h", () => {
    assert.equal(parseArgs(["--help"]).help, true);
    assert.equal(parseArgs(["-h"]).help, true);
  });
});
