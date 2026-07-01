/**
 * node-card-read.test.mjs — verifies the token-cheap reader's INTENT:
 *   1. SEEK path: when the offset index is present + fresh, readCard seeks ONE
 *      record (source "node-card-offsets") WITHOUT parsing the sidecar — proven
 *      with a POISON (unparseable) system-graph-index that buildIndex would
 *      throw on, so a successful hit means the bulk parse was bypassed,
 *   2. seek MISS on a fresh index returns null without the full parse (poison
 *      index again as the no-bulk-parse witness),
 *   3. a STALE / corrupt offset index degrades to the full-sidecar path,
 *   4. full-sidecar path: prefers the FRESH, richer system-graph-index, falls
 *      back to find-cache when the index is absent,
 *   5. it NEVER reads the 644MB graph (poison-pill graph fixture),
 *   6. it flags staleness instead of silently triggering the expensive path,
 *   7. it fails loud when NO compact sidecar exists, + batch + miss semantics.
 *
 * NOTE: opts.paths is merged onto DEFAULT_PATHS, so a test MUST supply a COMPLETE
 * path set (graphIndex + findCache + cardOffsets + cardJsonl + graph) to fully
 * isolate from the real sidecars — writeFixture returns the complete set.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { readCard, readCards, cardCount, seekCard, _resetCacheForTest } from "./node-card-read.mjs";
import { buildCardOffsetIndex, writeCardOffsetIndex } from "./node-card-offset-lib.mjs";

let dir;
let paths;
const POISON = "POISON — this fixture must NEVER be read/parsed by the cheap reader";

// The compact index nodes — shared by the graph-index fixture AND the offset
// index so a seek and a full-parse resolve the SAME record.
const INDEX_NODES = [
  { id: "eng.mill", label: "mill\n(64)", layer: "L5", status: "stub", info: "Mill domain",
    knowledge: { wikiEntries: ["H:/prism/knowledge/wiki/architecture/mill.md", "H:/prism/knowledge/wiki/x/a.md"], memoryEntries: ["reference_mill_one"] } },
  { id: "p.operator", label: "Operator", layer: "L0", status: "built", info: "Shop floor",
    knowledge: { wikiEntries: [], memoryEntries: [] } },
];

/**
 * Write a complete fixture set in `d`; return its paths object. `opts`:
 *   indexPpresent:false       — omit system-graph-index
 *   indexStale / indexPoison  — stale stamps / unparseable JSON
 *   findCachePresent:false / findCacheStale
 *   offsetIndexPresent:true   — emit the seek pair (fresh unless offsetStale)
 *   offsetStale:true          — emit the seek pair with stale graph stamps
 */
function writeFixture(d, opts = {}) {
  const graph = path.join(d, "system-graph.json");
  fs.writeFileSync(graph, POISON);
  const g = fs.statSync(graph);
  const freshStamps = { sourceMtimeMs: g.mtimeMs, sourceSizeBytes: g.size };

  const graphIndex = path.join(d, "system-graph-index.json");
  if (opts.indexPresent !== false) {
    fs.writeFileSync(
      graphIndex,
      opts.indexPoison
        ? POISON
        : JSON.stringify({
            schemaVersion: "1.0.0",
            ...(opts.indexStale ? { sourceMtimeMs: 1, sourceSizeBytes: 999999999 } : freshStamps),
            nodeCount: INDEX_NODES.length,
            nodes: INDEX_NODES,
          }),
    );
  }

  const findCache = path.join(d, "find-cache.json");
  if (opts.findCachePresent !== false) {
    fs.writeFileSync(
      findCache,
      JSON.stringify({
        schemaVersion: 1,
        ...(opts.findCacheStale ? { sourceMtimeMs: 1, sourceSize: 999999999 } : { sourceMtimeMs: g.mtimeMs, sourceSize: g.size }),
        nodes: [
          { id: "eng.mill", label: "mill\n(64 engines)", info: "Mill (find-cache)", subgroup: "unwired", layer: "L5", noteCount: 16 },
          { id: "ghost.galaxy.wedm", label: "🌌 wedm", info: "WEDM roost", subgroup: "galaxy_federation", layer: "L7", noteCount: 3 },
        ],
      }),
    );
  }

  const cardOffsets = path.join(d, "node-card-offsets.json");
  const cardJsonl = path.join(d, "node-cards.jsonl");
  if (opts.offsetIndexPresent) {
    const built = buildCardOffsetIndex(INDEX_NODES);
    writeCardOffsetIndex(built, {
      jsonlPath: cardJsonl, offsetsPath: cardOffsets,
      meta: opts.offsetStale ? { sourceMtimeMs: 1, sourceSizeBytes: 999999999 } : { sourceMtimeMs: g.mtimeMs, sourceSizeBytes: g.size },
    });
  }

  return { graphIndex, findCache, cardOffsets, cardJsonl, graph };
}

before(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "node-card-test-"));
  paths = writeFixture(dir);
  _resetCacheForTest();
});

after(() => {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* best-effort */ }
});

// ─── SEEK PATH ────────────────────────────────────────────────────────────────

test("SEEK: fresh offset index serves the card via seek (source node-card-offsets)", () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "node-card-seek-"));
  try {
    // POISON the system-graph-index: if the reader ever fell to the bulk parse
    // it would throw on the unparseable JSON. A clean hit proves seek-first.
    const p = writeFixture(d, { indexPoison: true, offsetIndexPresent: true });
    _resetCacheForTest();
    const r = readCard("eng.mill", { paths: p });
    assert.ok(r, "hit");
    assert.equal(r.source, "node-card-offsets", "served by the seek path, NOT the bulk sidecar");
    assert.equal(r.card.id, "eng.mill");
    assert.equal(r.card.status, "stub", "same makeCard projection as the full path");
    assert.deepEqual(r.card.wikiEntries, ["knowledge/wiki/architecture/mill.md", "knowledge/wiki/x/a.md"]);
    assert.equal(r.stale, false, "a fresh offset index is the freshest source");
  } finally {
    fs.rmSync(d, { recursive: true, force: true });
  }
});

test("SEEK: fresh index + absent id -> null WITHOUT the bulk parse (poison index witness)", () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "node-card-seekmiss-"));
  try {
    const p = writeFixture(d, { indexPoison: true, offsetIndexPresent: true });
    _resetCacheForTest();
    // If this fell through to buildIndex, the poison graphIndex would THROW.
    assert.equal(readCard("eng.does-not-exist", { paths: p }), null);
  } finally {
    fs.rmSync(d, { recursive: true, force: true });
  }
});

test("SEEK: a STALE offset index degrades to the full sidecar (source system-graph-index)", () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "node-card-seekstale-"));
  try {
    const p = writeFixture(d, { offsetIndexPresent: true, offsetStale: true });
    _resetCacheForTest();
    const r = readCard("eng.mill", { paths: p });
    assert.equal(r.source, "system-graph-index", "stale seek -> full-sidecar path");
    assert.equal(r.card.status, "stub");
  } finally {
    fs.rmSync(d, { recursive: true, force: true });
  }
});

test("SEEK: a corrupt offset (bad byte range) degrades to the full sidecar, never wrong data", () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "node-card-seekcorrupt-"));
  try {
    const p = writeFixture(d, { offsetIndexPresent: true });
    // tamper: point eng.mill at a wildly out-of-range slice
    const doc = JSON.parse(fs.readFileSync(p.cardOffsets, "utf8"));
    doc.offsets["eng.mill"] = [999999, 50];
    fs.writeFileSync(p.cardOffsets, JSON.stringify(doc));
    _resetCacheForTest();
    const r = readCard("eng.mill", { paths: p });
    assert.ok(r, "still resolves");
    assert.equal(r.source, "system-graph-index", "corrupt seek -> safe full-sidecar fallback");
    assert.equal(r.card.id, "eng.mill");
  } finally {
    fs.rmSync(d, { recursive: true, force: true });
  }
});

test("SEEK: a TORN pair (jsonl size != recorded jsonlBytes) degrades to the full sidecar", () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "node-card-torn-"));
  try {
    const p = writeFixture(d, { offsetIndexPresent: true });
    // simulate a stale/mismatched jsonl: append a byte so size != doc.jsonlBytes
    fs.appendFileSync(p.cardJsonl, "X");
    _resetCacheForTest();
    const r = readCard("eng.mill", { paths: p });
    assert.ok(r, "still resolves");
    assert.equal(r.source, "system-graph-index", "torn pair -> safe full-sidecar fallback");
    assert.equal(r.card.id, "eng.mill");
  } finally {
    fs.rmSync(d, { recursive: true, force: true });
  }
});

// ─── seekCard (hook-safe seek-only) ────────────────────────────────────────────

test("seekCard: hit via fresh offset index", () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "node-card-seekfn-"));
  try {
    const p = writeFixture(d, { offsetIndexPresent: true });
    _resetCacheForTest();
    const r = seekCard("eng.mill", { paths: p });
    assert.ok(r, "hit");
    assert.equal(r.source, "node-card-offsets");
    assert.equal(r.card.id, "eng.mill");
    assert.equal(r.card.status, "stub");
  } finally {
    fs.rmSync(d, { recursive: true, force: true });
  }
});

test("seekCard: NO offset index -> null WITHOUT the bulk parse (poison index never read)", () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "node-card-seekfn-nofb-"));
  try {
    // poison graphIndex + no offset index: seekCard must NOT parse the sidecar
    // (it would throw on POISON) — it returns null because it never falls back.
    const p = writeFixture(d, { indexPoison: true });
    _resetCacheForTest();
    assert.equal(seekCard("eng.mill", { paths: p }), null);
  } finally {
    fs.rmSync(d, { recursive: true, force: true });
  }
});

test("seekCard: bad id -> null (never throws, hook-safe)", () => {
  _resetCacheForTest();
  assert.equal(seekCard("", { paths }), null);
  assert.equal(seekCard(42, { paths }), null);
  assert.equal(seekCard(null, { paths }), null);
});

// ─── FULL-SIDECAR PATH (offset index absent) ───────────────────────────────────

test("prefers the FRESH system-graph-index (richer: carries knowledge doc pointers)", () => {
  _resetCacheForTest();
  const r = readCard("eng.mill", { paths });
  assert.ok(r, "hit");
  assert.equal(r.source, "system-graph-index", "fresh index preferred over find-cache");
  assert.equal(r.card.id, "eng.mill");
  assert.equal(r.card.status, "stub", "status from the index record");
  assert.equal(r.card.kind, "eng", "kind from id-prefix");
  assert.equal(r.card.wikiPath, undefined, "no wikiPath without cap-index");
  assert.deepEqual(r.card.wikiEntries, ["knowledge/wiki/architecture/mill.md", "knowledge/wiki/x/a.md"], "documenting wiki docs from index.knowledge, relativized");
  assert.deepEqual(r.card.memoryEntries, ["reference_mill_one"]);
  assert.equal(r.stale, false);
});

test("falls back to find-cache when the index is absent", () => {
  const d2 = fs.mkdtempSync(path.join(os.tmpdir(), "node-card-fallback-"));
  try {
    const p2 = writeFixture(d2, { indexPresent: false });
    _resetCacheForTest();
    const r = readCard("ghost.galaxy.wedm", { paths: p2 });
    assert.equal(r.source, "find-cache");
    assert.equal(r.card.kind, "ghost", "id-prefix kind fallback (no capability pointer)");
    assert.equal(r.card.noteCount, 3);
    assert.equal(r.card.status, "galaxy_federation", "find-cache subgroup -> card.status");
  } finally {
    fs.rmSync(d2, { recursive: true, force: true });
  }
});

test("NO-GRAPH-LOAD — the poison-pill graph proves it is only stat-ed, never read", () => {
  _resetCacheForTest();
  assert.doesNotThrow(() => readCard("p.operator", { paths }));
  assert.equal(fs.readFileSync(paths.graph, "utf8"), POISON, "graph fixture untouched");
});

test("miss returns null; bad id throws", () => {
  _resetCacheForTest();
  assert.equal(readCard("eng.does-not-exist", { paths }), null);
  assert.throws(() => readCard("", { paths }), /non-empty string/);
  assert.throws(() => readCard(42, { paths }), /non-empty string/);
});

test("readCards batches with hit / notFound semantics", () => {
  _resetCacheForTest();
  const rows = readCards(["eng.mill", "eng.nope", "p.operator"], { paths });
  assert.equal(rows.length, 3);
  assert.equal(rows[0].card.id, "eng.mill");
  assert.equal(rows[1].notFound, true);
  assert.equal(rows[1].id, "eng.nope");
  assert.equal(rows[2].card.id, "p.operator");
});

test("cardCount equals the chosen-source node count", () => {
  _resetCacheForTest();
  assert.equal(cardCount({ paths }), 2);
});

test("staleness is flagged, NOT silently escalated to a graph load (both sources stale)", () => {
  const sd = fs.mkdtempSync(path.join(os.tmpdir(), "node-card-stale-"));
  try {
    const p = writeFixture(sd, { indexStale: true, findCacheStale: true });
    _resetCacheForTest();
    const r = readCard("eng.mill", { paths: p });
    assert.ok(r.card, "still returns the (stale) card");
    assert.equal(r.stale, true);
    assert.equal(r.staleReason, "graph-size-changed");
    assert.equal(fs.readFileSync(p.graph, "utf8"), POISON, "stale path STILL never reads the graph");
  } finally {
    fs.rmSync(sd, { recursive: true, force: true });
  }
});

test("NO compact sidecar present fails loud (refuses the 644MB fallback)", () => {
  const ed = fs.mkdtempSync(path.join(os.tmpdir(), "node-card-empty-"));
  try {
    const graph = path.join(ed, "system-graph.json");
    fs.writeFileSync(graph, POISON);
    _resetCacheForTest();
    assert.throws(
      () => readCard("eng.mill", {
        paths: {
          graphIndex: path.join(ed, "nope-index.json"),
          findCache: path.join(ed, "nope-fc.json"),
          cardOffsets: path.join(ed, "nope-offsets.json"),
          cardJsonl: path.join(ed, "nope-cards.jsonl"),
          graph,
        },
      }),
      /no compact sidecar/,
    );
  } finally {
    fs.rmSync(ed, { recursive: true, force: true });
  }
});
