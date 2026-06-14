#!/usr/bin/env node
/**
 * Tests for generate-vault-atomic.mjs -- the vault-namespace atomic node generator.
 * Real-value + invariant assertions (R9): they fail if the walk/emit logic regresses,
 * not just if a stub returns. Mixes pure-helper unit tests with a real-data
 * integration oracle over the live knowledge/ tree.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { generate, listNamespaces, slugify, extractTitle } from "./generate-vault-atomic.mjs";

test("slugify lowercases + collapses non-id chars", () => {
  assert.equal(slugify("Foo Bar.md"), "foo_bar.md");
  assert.equal(slugify("A/B  C"), "a_b_c");
  assert.equal(slugify("__weird__"), "weird");
  assert.equal(slugify("ALL-CAPS_Mix.99"), "all-caps_mix.99");
});

test("extractTitle prefers # heading, then frontmatter name/title", () => {
  assert.equal(extractTitle("# Hello World\n\nbody"), "Hello World");
  assert.equal(extractTitle("---\nname: my-slug\n---\nbody"), "my-slug");
  assert.equal(extractTitle("---\ntitle: My Title\n---\nbody"), "My Title");
  assert.equal(extractTitle("no heading at all"), null);
});

test("listNamespaces excludes the already-covered wiki + memories", () => {
  const ns = listNamespaces();
  assert.ok(Array.isArray(ns), "returns an array");
  assert.ok(!ns.includes("wiki"), "wiki must be excluded (already in-graph)");
  assert.ok(!ns.includes("memories"), "memories must be excluded (already in-graph)");
  // tribal is the big gap namespace -- it MUST be walked.
  assert.ok(ns.includes("tribal"), "tribal must be a walked namespace");
});

test("generate() emits the vault gap as atomic nodes (real-data oracle)", () => {
  const r = generate();
  assert.equal(r.schemaVersion, "1.0.0");
  assert.ok(Array.isArray(r.newNodes) && Array.isArray(r.newEdges));

  // Coverage regression oracle: the tribal corpus alone is ~4,247 files; the
  // total gap is ~4,460. If the walk breaks, this collapses toward 0.
  assert.ok(r.stats.nodesEmitted > 4000,
    `expected >4000 nodes, got ${r.stats.nodesEmitted} (walk regressed?)`);
  assert.ok((r.stats.perNamespace.tribal ?? 0) > 4000,
    `tribal coverage collapsed: ${r.stats.perNamespace.tribal}`);

  // Every leaf node is well-formed (no stub shapes).
  const parents = new Set(r.newNodes.filter(n => n.synthetic).map(n => n.id));
  assert.ok(parents.size >= 1, "at least one synthesized namespace parent");
  for (const n of r.newNodes) {
    assert.ok(typeof n.id === "string" && n.id.startsWith("vault_"), `bad id: ${n.id}`);
    assert.ok(n.layer === "L8", `bad layer on ${n.id}`);
    assert.ok(typeof n.label === "string" && n.label.length > 0, `empty label on ${n.id}`);
    if (!n.synthetic) {
      assert.equal(n.subgroup, "vault_entry");
      assert.ok(parents.has(n.parent), `leaf ${n.id} references unsynth parent ${n.parent}`);
      assert.ok(n.file.startsWith("knowledge/"), `bad file path on ${n.id}`);
    }
  }

  // Every contains-edge points from a synthesized parent to an emitted node.
  const ids = new Set(r.newNodes.map(n => n.id));
  for (const e of r.newEdges) {
    assert.equal(e.type, "contains");
    assert.ok(parents.has(e.from), `edge from non-parent ${e.from}`);
    assert.ok(ids.has(e.to), `edge to unknown node ${e.to}`);
  }

  // Ids are unique (no double-emit -> merge would silently keep first).
  assert.equal(ids.size, r.newNodes.length, "duplicate node ids emitted");
});

test("generate() never includes a wiki/ or memories/ file path (no double-coverage)", () => {
  const r = generate();
  for (const n of r.newNodes) {
    if (n.synthetic) continue;
    assert.ok(!n.file.startsWith("knowledge/wiki/"), `wiki leaked in: ${n.file}`);
    assert.ok(!n.file.startsWith("knowledge/memories/"), `memories leaked in: ${n.file}`);
  }
});
