/**
 * node-card-prefetch-inject.test.mjs — verifies the prefetch hook's INTENT:
 *   1. detection fires ONLY on whitelisted node-id prefixes and IGNORES noisy
 *      code/prose dotted tokens (fs.readFileSync, version 2.5, schema.org) —
 *      so the common prompt never even triggers a seek,
 *   2. trailing punctuation / dedup / cap handled,
 *   3. buildPrefetchContext injects cards ONLY for ids that resolve to REAL
 *      nodes in the (fixture) offset index; a whitelisted-but-nonexistent id
 *      injects nothing; no candidate -> null,
 *   4. the K cap bounds how many cards inject,
 *   5. it never throws on junk input.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  detectNodeIds, buildPrefetchContext, renderCard, TRIGGER_PREFIXES,
} from "./node-card-prefetch-inject.mjs";
import { buildCardOffsetIndex, writeCardOffsetIndex } from "../../scripts/lib/node-card-offset-lib.mjs";

const NODES = [
  { id: "eng.mill", label: "mill", layer: "L5", status: "stub", info: "Mill domain engine",
    knowledge: { wikiEntries: ["H:/prism/knowledge/wiki/architecture/mill.md"], memoryEntries: ["reference_mill_one"] } },
  { id: "ghost.galaxy.wedm", label: "🌌 wedm", layer: "L7", status: "galaxy_federation", info: "WEDM roost" },
  { id: "formula.kienzle", label: "Kienzle", layer: "L9", status: "built", info: "specific cutting force" },
];

/** Build a fresh fixture offset index in a temp dir; return seek paths. */
function fixturePaths(d) {
  const graph = path.join(d, "system-graph.json");
  fs.writeFileSync(graph, "POISON — seekCard must never read this");
  const g = fs.statSync(graph);
  const cardOffsets = path.join(d, "node-card-offsets.json");
  const cardJsonl = path.join(d, "node-cards.jsonl");
  const built = buildCardOffsetIndex(NODES);
  writeCardOffsetIndex(built, {
    jsonlPath: cardJsonl, offsetsPath: cardOffsets,
    meta: { sourceMtimeMs: g.mtimeMs, sourceSizeBytes: g.size },
  });
  return { cardOffsets, cardJsonl, graph };
}

test("detectNodeIds: fires on whitelisted prefixes, dedups, strips trailing punctuation", () => {
  const ids = detectNodeIds("look at eng.mill and ghost.galaxy.wedm, then eng.mill. again — formula.kienzle!");
  assert.deepEqual(ids, ["eng.mill", "ghost.galaxy.wedm", "formula.kienzle"]);
});

test("detectNodeIds: IGNORES noisy code/prose dotted tokens (no seek would fire)", () => {
  const ids = detectNodeIds("use fs.readFileSync and path.join; version 2.5; schema.org; test.foo; git.config");
  assert.deepEqual(ids, [], "fs/path/schema/test/git are NOT trigger prefixes");
});

test("detectNodeIds: empty / non-string -> []", () => {
  assert.deepEqual(detectNodeIds(""), []);
  assert.deepEqual(detectNodeIds(null), []);
  assert.deepEqual(detectNodeIds(42), []);
});

test("TRIGGER_PREFIXES excludes the noisy namespaces by design", () => {
  for (const noisy of ["fs", "test", "git", "core", "script", "vault", "datacat"]) {
    assert.equal(TRIGGER_PREFIXES.includes(noisy), false, `${noisy} must NOT be a trigger prefix`);
  }
  assert.equal(TRIGGER_PREFIXES.includes("eng"), true);
});

test("buildPrefetchContext: injects cards for REAL nodes named in the prompt", () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "prefetch-real-"));
  try {
    const paths = fixturePaths(d);
    const ctx = buildPrefetchContext("explain eng.mill and formula.kienzle please", { paths });
    assert.ok(ctx, "injected");
    assert.match(ctx, /zero tool call/);
    assert.match(ctx, /\*\*eng\.mill\*\*/);
    assert.match(ctx, /Mill domain engine/);
    assert.match(ctx, /knowledge\/wiki\/architecture\/mill\.md/);
    assert.match(ctx, /\*\*formula\.kienzle\*\*/);
  } finally {
    fs.rmSync(d, { recursive: true, force: true });
  }
});

test("buildPrefetchContext: a whitelisted-but-nonexistent id injects nothing", () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "prefetch-miss-"));
  try {
    const paths = fixturePaths(d);
    assert.equal(buildPrefetchContext("tell me about eng.does-not-exist", { paths }), null);
  } finally {
    fs.rmSync(d, { recursive: true, force: true });
  }
});

test("buildPrefetchContext: no node id in prompt -> null (no seek, no injection)", () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "prefetch-none-"));
  try {
    const paths = fixturePaths(d);
    assert.equal(buildPrefetchContext("just a normal prompt about fs.readFileSync and milling", { paths }), null);
  } finally {
    fs.rmSync(d, { recursive: true, force: true });
  }
});

test("buildPrefetchContext: K cap bounds injected cards", () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "prefetch-cap-"));
  try {
    const paths = fixturePaths(d);
    const ctx = buildPrefetchContext("eng.mill ghost.galaxy.wedm formula.kienzle", { paths, k: 2 });
    const cardLines = (ctx.match(/^- \*\*/gm) || []).length;
    assert.equal(cardLines, 2, "only k=2 cards injected");
  } finally {
    fs.rmSync(d, { recursive: true, force: true });
  }
});

test("BUDGET INVARIANT: node in full sidecar but NO offset index -> advisory + NO bulk-parse", () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "prefetch-budget-"));
  try {
    const graph = path.join(d, "system-graph.json");
    fs.writeFileSync(graph, "POISON — must never be read");
    const g = fs.statSync(graph);
    // a VALID, FRESH full system-graph-index carrying eng.mill — but NO offset index.
    const graphIndex = path.join(d, "system-graph-index.json");
    fs.writeFileSync(graphIndex, JSON.stringify({
      schemaVersion: "1.0.0", sourceMtimeMs: g.mtimeMs, sourceSizeBytes: g.size,
      nodes: [{ id: "eng.mill", label: "mill", layer: "L5", status: "stub", info: "Mill" }],
    }));
    // offset index ABSENT. seekCard must return null and the hook must NOT fall
    // back to the 193MB full-sidecar path (which WOULD find eng.mill + inject).
    // If a future refactor adds a heavy fallback to seekCard, this test goes red.
    const paths = {
      graphIndex, graph,
      cardOffsets: path.join(d, "absent-offsets.json"),
      cardJsonl: path.join(d, "absent-cards.jsonl"),
    };
    const ctx = buildPrefetchContext("explain eng.mill", { paths });
    // SEEK-ONLY invariant: must NOT bulk-parse the full sidecar to find eng.mill.
    assert.ok(!/Mill domain engine|\*\*eng\.mill\*\*/.test(ctx || ""),
      "no card content injected -> no 193MB-sidecar bulk-parse fallback");
    // R12: surface a degraded-index advisory instead of silent zero-injection.
    assert.match(ctx, /offset index unavailable/);
    assert.match(ctx, /absent/);
    assert.match(ctx, /build-card-offset-index/);
  } finally {
    fs.rmSync(d, { recursive: true, force: true });
  }
});

test("buildPrefetchContext: STALE offset index + named id -> advisory (R12, not silent)", () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "prefetch-stale-"));
  try {
    const paths = fixturePaths(d); // FRESH index recorded against the current graph stat
    // Make it STALE: rewrite the graph to a different size so freshnessOf flags
    // graph-size-changed (the recorded sourceSizeBytes no longer matches the live graph).
    fs.writeFileSync(paths.graph, "POISON -- resized so the offset index reads STALE for sure");
    const ctx = buildPrefetchContext("explain eng.mill", { paths });
    assert.ok(!/Mill domain engine/.test(ctx || ""), "stale -> seekCard unavailable, no card served");
    assert.match(ctx, /offset index unavailable/);
    assert.match(ctx, /stale/);
  } finally {
    fs.rmSync(d, { recursive: true, force: true });
  }
});

test("renderCard: compact line carries id, tags, info, doc pointers", () => {
  const line = renderCard({
    id: "eng.mill", kind: "eng", layer: "L5", status: "stub", info: "Mill domain",
    wikiEntries: ["knowledge/wiki/architecture/mill.md"], memoryEntries: ["reference_mill_one"],
    docTotals: { wiki: 5, memory: 1 },
  });
  assert.match(line, /\*\*eng\.mill\*\* \[eng · L5 · stub\]/);
  assert.match(line, /Mill domain/);
  assert.match(line, /wiki: knowledge\/wiki\/architecture\/mill\.md \(\+4\)/);
  assert.match(line, /mem: reference_mill_one/);
});
