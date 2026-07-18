/**
 * Tests for scripts/prune-stale-tribal-entries.mjs (U-VICTOR-C4).
 * Pure-core only.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalize,
  extractWikiPath,
  partitionPrune,
} from "./prune-stale-tribal-entries.mjs";

test("normalize strips knowledge/wiki/ prefix and lowercases", () => {
  assert.equal(normalize("knowledge/wiki/Concept/X.md"), "concept/x.md");
  assert.equal(normalize("KNOWLEDGE/WIKI/A.MD"), "a.md");
});

test("normalize rejects traversal", () => {
  assert.equal(normalize("knowledge/wiki/../etc"), "");
});

test("extractWikiPath: wiki: prefix", () => {
  assert.equal(extractWikiPath({ id: "wiki:knowledge/wiki/concept/a.md" }), "concept/a.md");
});

test("extractWikiPath: explicit path + source=wiki", () => {
  assert.equal(extractWikiPath({ id: "x", source: "wiki", path: "knowledge/wiki/architecture/b.md" }), "architecture/b.md");
});

test("extractWikiPath: external: scheme with knowledge/wiki/ segment", () => {
  assert.equal(extractWikiPath({ id: "external:H:/prism/knowledge/wiki/concept/c.md" }), "concept/c.md");
});

test("extractWikiPath: memory entry returns empty", () => {
  assert.equal(extractWikiPath({ id: "memory:something", source: "memory" }), "");
});

test("extractWikiPath: non-object input returns empty", () => {
  assert.equal(extractWikiPath(null), "");
  assert.equal(extractWikiPath(undefined), "");
  assert.equal(extractWikiPath("string"), "");
});

test("partitionPrune separates stale entries from keepers", () => {
  const entries = [
    { id: "wiki:knowledge/wiki/concept/keep.md" },
    { id: "wiki:knowledge/wiki/concept/stale1.md" },
    { id: "wiki:knowledge/wiki/architecture/stale2.md" },
    { id: "memory:foo" }, // not a wiki path — kept
  ];
  const stale = [
    "concept/stale1.md",
    "architecture/stale2.md",
  ];
  const { keep, prune } = partitionPrune(entries, stale);
  assert.equal(keep.length, 2);
  assert.equal(prune.length, 2);
  assert.ok(keep.some((e) => e.id.includes("keep.md")));
  assert.ok(prune.some((e) => e.id.includes("stale1.md")));
  assert.ok(prune.some((e) => e.id.includes("stale2.md")));
});

test("partitionPrune handles empty entries / stale arrays", () => {
  const r1 = partitionPrune([], ["x"]);
  assert.deepEqual(r1.keep, []);
  assert.deepEqual(r1.prune, []);

  const r2 = partitionPrune([{ id: "wiki:knowledge/wiki/a.md" }], []);
  assert.equal(r2.keep.length, 1);
  assert.equal(r2.prune.length, 0);
});

test("partitionPrune handles non-array input", () => {
  const r = partitionPrune(null, null);
  assert.deepEqual(r, { keep: [], prune: [] });
});

test("partitionPrune is case-insensitive (normalize lowercases)", () => {
  const entries = [{ id: "wiki:knowledge/wiki/Concept/Stale.md" }];
  const stale = ["concept/stale.md"];
  const r = partitionPrune(entries, stale);
  assert.equal(r.prune.length, 1);
});
