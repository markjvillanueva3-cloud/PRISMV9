#!/usr/bin/env node
/**
 * generate-gnn-embed-bridge-features.test.mjs — reference-value pins for the
 * system-viz GNN-bridge augmentation generator. Mirrors the convention of
 * generate-bridge-synergy-features.test.mjs but stays compact (one roost + one
 * stats child, not 26+16 bridge units).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  generate,
  readMeta,
  SCHEMA_VERSION,
  ROOST_ID,
} from "./generate-gnn-embed-bridge-features.mjs";

/* ---------- readMeta ---------- */

describe("readMeta", () => {
  it("parses the JSONL META header from the first line", () => {
    const r = readMeta("x.jsonl", {
      existsImpl: () => true,
      readFileImpl: () => `{"__meta":true,"model":"nomic","dim":768,"count":562}\n{"n":"a","q":[1,2]}\n`,
    });
    assert.equal(r.ok, true);
    assert.equal(r.meta.count, 562);
    assert.equal(r.meta.dim, 768);
    assert.equal(r.meta.model, "nomic");
  });
  it("returns ok:false when the file is missing", () => {
    const r = readMeta("x.jsonl", { existsImpl: () => false });
    assert.equal(r.ok, false);
    assert.equal(r.reason, "missing");
    assert.equal(r.meta, null);
  });
  it("returns ok:false when first line is not __meta", () => {
    const r = readMeta("x.jsonl", {
      existsImpl: () => true,
      readFileImpl: () => `{"n":"a","q":[1,2]}\n`,
    });
    assert.equal(r.ok, false);
    assert.match(r.reason, /not __meta/);
  });
  it("returns ok:false on malformed JSON (fail-soft)", () => {
    const r = readMeta("x.jsonl", {
      existsImpl: () => true,
      readFileImpl: () => `{not json\n`,
    });
    assert.equal(r.ok, false);
    assert.match(r.reason, /parse failed/);
  });
  it("returns ok:false on read error (fail-soft)", () => {
    const r = readMeta("x.jsonl", {
      existsImpl: () => true,
      readFileImpl: () => { throw new Error("EACCES"); },
    });
    assert.equal(r.ok, false);
    assert.match(r.reason, /read failed/);
  });
  it("handles a file with no trailing newline (single-line case)", () => {
    const r = readMeta("x.jsonl", {
      existsImpl: () => true,
      readFileImpl: () => `{"__meta":true,"dim":3,"count":1,"model":"test"}`,
    });
    assert.equal(r.ok, true);
    assert.equal(r.meta.count, 1);
  });
});

/* ---------- generate ---------- */

describe("generate (pure roost+stats builder)", () => {
  it("HAPPY: emits roost + stats child with built status when matched > 0", () => {
    const meta = { __meta: true, count: 562, dim: 768, model: "nomic-embed-text:latest", generatedAt: "2026-05-23T19:09:02Z" };
    const r = generate(meta);
    assert.equal(r.schemaVersion, SCHEMA_VERSION);
    assert.equal(r.newNodes.length, 2);
    assert.equal(r.newEdges.length, 2);
    assert.equal(r.stats.status, "built");
    assert.equal(r.stats.roostAdded, 1);
    assert.equal(r.stats.statsChildAdded, 1);
    const roost = r.newNodes.find((n) => n.id === ROOST_ID);
    assert.equal(roost.status, "built");
    assert.equal(roost.layer, "L8");
    assert.match(roost.info, /matched: 562/);
    assert.match(roost.info, /dim: 768/);
    const statsChild = r.newNodes.find((n) => n.id === ROOST_ID + ".stats");
    assert.equal(statsChild.status, "built");
    assert.match(statsChild.label, /matched=562/);
  });

  it("GHOST: surfaces ghost status when matched=0 (build never ran or 0-hit)", () => {
    const meta = { __meta: true, count: 0, dim: null, model: "unknown" };
    const r = generate(meta);
    assert.equal(r.stats.status, "ghost");
    const roost = r.newNodes.find((n) => n.id === ROOST_ID);
    assert.equal(roost.status, "ghost");
  });

  it("GHOST: handles a totally missing meta object (e.g. JSONL never built)", () => {
    const r = generate({});
    assert.equal(r.stats.status, "ghost");
    const roost = r.newNodes.find((n) => n.id === ROOST_ID);
    assert.equal(roost.status, "ghost");
    assert.match(roost.info, /matched: 0/);
  });

  it("DEDUPE: skips nodes already present in existingNodeIds", () => {
    const meta = { __meta: true, count: 100, dim: 768, model: "nomic" };
    const r = generate(meta, { existingNodeIds: new Set([ROOST_ID]) });
    assert.equal(r.stats.roostAdded, 0);
    assert.equal(r.stats.statsChildAdded, 1);
    assert.equal(r.newNodes.length, 1);
    assert.equal(r.newEdges.length, 1); // only the stats-child parent edge
  });

  it("DEDUPE: skips both nodes when both pre-exist", () => {
    const meta = { __meta: true, count: 100, dim: 768, model: "nomic" };
    const r = generate(meta, { existingNodeIds: new Set([ROOST_ID, ROOST_ID + ".stats"]) });
    assert.equal(r.newNodes.length, 0);
    assert.equal(r.newEdges.length, 0);
  });

  it("EDGES: every new edge is a parent-link from an in-tree node", () => {
    const meta = { __meta: true, count: 5, dim: 3, model: "test", generatedAt: "2026-05-23T00:00:00Z" };
    const r = generate(meta);
    for (const e of r.newEdges) {
      assert.equal(e.kind, "parent");
      assert.equal(typeof e.source, "string");
      assert.equal(typeof e.target, "string");
    }
    // The roost's parent is ghost.planned_features; the stats child's parent
    // is the roost itself. Each must appear exactly once.
    const roostEdge = r.newEdges.find((e) => e.target === ROOST_ID);
    assert.equal(roostEdge.source, "ghost.planned_features");
    const statsEdge = r.newEdges.find((e) => e.target === ROOST_ID + ".stats");
    assert.equal(statsEdge.source, ROOST_ID);
  });

  it("KNOWLEDGE: roost carries wiki + memory entries for hover surfacing", () => {
    const meta = { __meta: true, count: 1, dim: 1, model: "t" };
    const r = generate(meta);
    const roost = r.newNodes.find((n) => n.id === ROOST_ID);
    assert.ok(roost.knowledge && Array.isArray(roost.knowledge.wikiEntries));
    assert.ok(roost.knowledge.wikiEntries.length >= 1);
    assert.match(roost.knowledge.wikiEntries[0].path, /gnn-node-embedding-bridge\.md$/);
    assert.ok(Array.isArray(roost.knowledge.memoryEntries));
    assert.ok(roost.knowledge.memoryEntries.length >= 2);
  });

  it("VARIABILITY: counts label correctly across small/medium/large matches", () => {
    for (const count of [1, 10, 562, 10000]) {
      const r = generate({ __meta: true, count, dim: 768, model: "nomic" });
      const statsChild = r.newNodes.find((n) => n.id === ROOST_ID + ".stats");
      assert.match(statsChild.label, new RegExp(`matched=${count}\\b`));
    }
  });

  it("ADVERSARIAL: non-integer count is treated as 0 (ghost), no crash", () => {
    for (const bad of [NaN, "562", null, undefined, -5]) {
      const r = generate({ __meta: true, count: bad, dim: 768 });
      const roost = r.newNodes.find((n) => n.id === ROOST_ID);
      // -5 is integer but matched > 0 only — negative counts are stat artifacts
      // and the roost should NOT show "built" on a negative or non-integer
      // count. The current implementation Integer-checks AND positive-checks.
      if (Number.isInteger(bad) && bad > 0) {
        assert.equal(roost.status, "built");
      } else {
        assert.equal(roost.status, "ghost", `bad=${bad}`);
      }
    }
  });
});
