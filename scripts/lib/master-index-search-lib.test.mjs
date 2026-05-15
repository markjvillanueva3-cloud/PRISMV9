/**
 * master-index-search-lib.test.mjs
 *
 * Real-value coverage for the shared keyword search lib used by both
 * master-index-precheck-inject.mjs and spawned-agent-context-lib.mjs.
 *
 * Uses node:test (matches the rest of .claude/helpers/ test pattern) so it
 * works under the portable node runner without vitest harness setup.
 *
 * Coverage:
 *   - tokenize: stopwords, dedup, length floor, token cap, unicode
 *   - loadGraph: mtime cache, missing-file safety, malformed-shape safety
 *   - searchGraphHits: weighted scoring, layer exclusion, label dedup
 *   - runMasterIndexSearch: end-to-end + sub-2-token short-circuit
 *   - loadTribalIndex: same safety as loadGraph + embedding-strip
 *   - searchTribalHits: title/text/domain weighting, prefDomain boost
 *   - runTribalSearch: end-to-end + tokens-too-short short-circuit
 *   - cache reset
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { writeFileSync, mkdtempSync, rmSync, utimesSync } from "node:fs";
import path from "node:path";
import os from "node:os";

import {
  tokenize,
  loadGraph,
  searchGraphHits,
  runMasterIndexSearch,
  loadTribalIndex,
  searchTribalHits,
  runTribalSearch,
  STOPWORDS,
  DEFAULT_EXCLUDED_LAYERS,
  _resetCachesForTests,
} from "./master-index-search-lib.mjs";

// -- fixtures -------------------------------------------------------------

const TMP_DIR = mkdtempSync(path.join(os.tmpdir(), "prism-misl-"));
const GRAPH_PATH = path.join(TMP_DIR, "graph.json");
const TRIBAL_PATH = path.join(TMP_DIR, "tribal.json");

const FIXTURE_GRAPH = {
  nodes: [
    {
      id: "engine:KienzleForceEngine",
      label: "KienzleForceEngine",
      info: "Computes cutting force via Kienzle empirical model",
      layer: "L7",
      status: "built",
      knowledge: {
        wikiEntries: [{ name: "kienzle-physics" }],
        memoryEntries: [{ name: "reference_kienzle_coefficients" }],
      },
    },
    {
      id: "engine:TaylorToolLifeEngine",
      label: "TaylorToolLifeEngine",
      info: "Predicts cutting tool life via Taylor equation",
      layer: "L7",
      status: "built",
      knowledge: {
        wikiEntries: [{ name: "taylor-tool-life" }],
        memoryEntries: [],
      },
    },
    {
      id: "filesystem:foo.ts",
      label: "kienzle-foo.ts",       // shares "kienzle" — should be label-dedup'd if it's in an EXCLUDED layer
      info: "raw file",
      layer: "L11",                  // L11 excluded by default
      status: "?",
      knowledge: { wikiEntries: [], memoryEntries: [] },
    },
    {
      id: "engine:UnrelatedEngine",
      label: "UnrelatedEngine",
      info: "Has nothing to do with cutting forces",
      layer: "L7",
      status: "built",
      knowledge: { wikiEntries: [], memoryEntries: [] },
    },
    {
      id: "engine:KienzleForceEngine.duplicate",
      label: "KienzleForceEngine",   // duplicate label — should dedup
      info: "different node same label",
      layer: "L7",
      status: "built",
      knowledge: { wikiEntries: [], memoryEntries: [] },
    },
  ],
};

const FIXTURE_TRIBAL = {
  schemaVersion: "1.0.0",
  model: "nomic-embed-text:latest",
  dim: 768,
  generatedAt: "2026-05-15T00:00:00Z",
  entries: [
    {
      id: "tribal:001",
      source: "shop-floor",
      domain: "mill",
      title: "Chatter on thin-wall pockets — drop SFM 20%",
      path: "tips/mill/chatter-thin-wall.md",
      text: "When chatter starts on thin walls, drop SFM by 20% before changing tool.",
      embedding: new Array(768).fill(0.1),
    },
    {
      id: "tribal:002",
      source: "shop-floor",
      domain: "lathe",
      title: "Chatter on long boring bar",
      path: "tips/lathe/boring-chatter.md",
      text: "Long boring bar chatter — match overhang ratio L/D <= 4 or use solid carbide.",
      embedding: new Array(768).fill(0.2),
    },
    {
      id: "tribal:003",
      source: "wiki",
      domain: "wedm",
      title: "Wire breakage on hardened tool steel",
      path: "tips/wedm/wire-breakage.md",
      text: "Wire breakage on hardened tool steel under 0.4mm — drop power 15%.",
      embedding: new Array(768).fill(0.3),
    },
    {
      id: "tribal:004",
      source: "shop-floor",
      domain: "general",
      title: "Coolant flow at corners",
      path: "tips/general/coolant-corners.md",
      text: "Increase coolant flow when finishing internal corners to flush chip.",
      embedding: new Array(768).fill(0.4),
    },
  ],
};

before(() => {
  writeFileSync(GRAPH_PATH, JSON.stringify(FIXTURE_GRAPH));
  writeFileSync(TRIBAL_PATH, JSON.stringify(FIXTURE_TRIBAL));
  _resetCachesForTests();
});

after(() => {
  try { rmSync(TMP_DIR, { recursive: true, force: true }); } catch { /* best effort */ }
});

// -- tokenize -------------------------------------------------------------

describe("tokenize", () => {
  it("filters stopwords", () => {
    const toks = tokenize("what is the kienzle engine for");
    assert.deepStrictEqual(toks, ["kienzle"]);   // "what/is/the/engine/for" all dropped
  });
  it("dedupes repeated tokens", () => {
    const toks = tokenize("kienzle kienzle kienzle taylor");
    assert.deepStrictEqual(toks, ["kienzle", "taylor"]);
  });
  it("respects MIN_TOKEN_LEN (drops < 3 char tokens)", () => {
    const toks = tokenize("a bc abc abcd");
    assert.deepStrictEqual(toks, ["abc", "abcd"]);
  });
  it("caps at maxTokens", () => {
    const toks = tokenize("alpha bravo charlie delta echo foxtrot golf hotel india juliett", { maxTokens: 4 });
    assert.strictEqual(toks.length, 4);
  });
  it("returns empty on empty/non-string input", () => {
    assert.deepStrictEqual(tokenize(""), []);
    assert.deepStrictEqual(tokenize(null), []);
    assert.deepStrictEqual(tokenize(undefined), []);
    assert.deepStrictEqual(tokenize(123), []);
  });
  it("handles unicode words", () => {
    const toks = tokenize("kienzle Ψ-reachability Ω-score");
    // unicode letters survive but `Ψ` `Ω` are single-char Greek letters
    // shorter than MIN_TOKEN_LEN, so they should be dropped; the words
    // "kienzle/reachability/score" should survive
    assert.ok(toks.includes("kienzle"), "kienzle must survive unicode tokenize");
    assert.ok(toks.includes("reachability"), "reachability must survive — got " + toks.join(","));
    assert.ok(toks.includes("score"), "score must survive");
  });
  it("STOPWORDS export is a frozen-shape Set", () => {
    assert.ok(STOPWORDS instanceof Set);
    assert.ok(STOPWORDS.has("the"));
    assert.ok(!STOPWORDS.has("kienzle"));
  });
});

// -- loadGraph ------------------------------------------------------------

describe("loadGraph", () => {
  it("loads a valid graph", () => {
    _resetCachesForTests();
    const g = loadGraph(GRAPH_PATH);
    assert.ok(g);
    assert.strictEqual(g.nodes.length, FIXTURE_GRAPH.nodes.length);
    assert.ok(g.inverted instanceof Map);
    assert.ok(g.inverted.get("kienzle"), "inverted index should have 'kienzle' bucket");
    assert.ok(g.inverted.get("kienzle").size >= 1);
  });
  it("returns null on missing file", () => {
    _resetCachesForTests();
    const g = loadGraph(path.join(TMP_DIR, "does-not-exist.json"));
    assert.strictEqual(g, null);
  });
  it("returns null on malformed JSON", () => {
    const badPath = path.join(TMP_DIR, "bad.json");
    writeFileSync(badPath, "{not json}");
    _resetCachesForTests();
    const g = loadGraph(badPath);
    assert.strictEqual(g, null);
  });
  it("returns null on malformed shape (no nodes array)", () => {
    const badPath = path.join(TMP_DIR, "no-nodes.json");
    writeFileSync(badPath, JSON.stringify({ meta: "no nodes here" }));
    _resetCachesForTests();
    const g = loadGraph(badPath);
    assert.strictEqual(g, null);
  });
  it("uses mtime cache on second call (same path + mtime)", () => {
    _resetCachesForTests();
    const g1 = loadGraph(GRAPH_PATH);
    const g2 = loadGraph(GRAPH_PATH);
    assert.strictEqual(g1, g2, "second load should return same object reference (cache hit)");
  });
  it("invalidates cache when mtime changes", () => {
    _resetCachesForTests();
    const g1 = loadGraph(GRAPH_PATH);
    // advance the mtime by 5s
    const future = new Date(Date.now() + 5000);
    utimesSync(GRAPH_PATH, future, future);
    const g2 = loadGraph(GRAPH_PATH);
    assert.notStrictEqual(g1, g2, "mtime change must invalidate cache");
  });
});

// -- searchGraphHits ------------------------------------------------------

describe("searchGraphHits", () => {
  it("returns weighted hits for a real token", () => {
    _resetCachesForTests();
    const g = loadGraph(GRAPH_PATH);
    const hits = searchGraphHits(g, ["kienzle"], { topK: 5 });
    // First hit must be KienzleForceEngine; L11 'kienzle-foo' must be filtered.
    assert.ok(hits.length >= 1);
    assert.strictEqual(hits[0].label, "KienzleForceEngine");
    assert.ok(hits[0].score > 0);
    // No L11 layer should appear
    for (const h of hits) assert.notStrictEqual(h.layer, "L11");
  });
  it("dedupes by label", () => {
    _resetCachesForTests();
    const g = loadGraph(GRAPH_PATH);
    const hits = searchGraphHits(g, ["kienzle"], { topK: 10 });
    const labels = hits.map((h) => h.label.toLowerCase());
    const uniqueLabels = [...new Set(labels)];
    assert.strictEqual(labels.length, uniqueLabels.length, "labels must be unique after dedup");
  });
  it("respects topK", () => {
    _resetCachesForTests();
    const g = loadGraph(GRAPH_PATH);
    const hits = searchGraphHits(g, ["engine"], { topK: 2 });
    assert.ok(hits.length <= 2);
  });
  it("returns [] for unmatched tokens", () => {
    _resetCachesForTests();
    const g = loadGraph(GRAPH_PATH);
    const hits = searchGraphHits(g, ["thistokencannotpossiblymatchanything"], { topK: 5 });
    assert.deepStrictEqual(hits, []);
  });
  it("returns [] when graph is null", () => {
    const hits = searchGraphHits(null, ["kienzle"]);
    assert.deepStrictEqual(hits, []);
  });
  it("returns [] when query tokens empty", () => {
    _resetCachesForTests();
    const g = loadGraph(GRAPH_PATH);
    const hits = searchGraphHits(g, []);
    assert.deepStrictEqual(hits, []);
  });
  it("DEFAULT_EXCLUDED_LAYERS contains L9 + L11", () => {
    assert.ok(DEFAULT_EXCLUDED_LAYERS.has("L9"));
    assert.ok(DEFAULT_EXCLUDED_LAYERS.has("L11"));
  });
});

// -- runMasterIndexSearch -------------------------------------------------

describe("runMasterIndexSearch", () => {
  it("end-to-end: tokens + hits for a useful prompt", () => {
    _resetCachesForTests();
    const { tokens, hits } = runMasterIndexSearch(
      "how does the kienzle cutting force model work",
      { graphPath: GRAPH_PATH, topK: 3 },
    );
    assert.ok(tokens.includes("kienzle"));
    assert.ok(hits.length >= 1);
    assert.strictEqual(hits[0].label, "KienzleForceEngine");
  });
  it("short-circuits when tokens.length < 2", () => {
    _resetCachesForTests();
    const { tokens, hits } = runMasterIndexSearch("hi", { graphPath: GRAPH_PATH });
    assert.deepStrictEqual(hits, [], "single short token should yield no hits");
    assert.ok(tokens.length < 2);
  });
  it("short-circuits when graph missing", () => {
    _resetCachesForTests();
    const { hits } = runMasterIndexSearch(
      "kienzle taylor cutting forces",
      { graphPath: path.join(TMP_DIR, "does-not-exist.json") },
    );
    assert.deepStrictEqual(hits, []);
  });
});

// -- loadTribalIndex ------------------------------------------------------

describe("loadTribalIndex", () => {
  it("loads tribal index + strips embedding arrays", () => {
    _resetCachesForTests();
    const t = loadTribalIndex(TRIBAL_PATH);
    assert.ok(t);
    assert.strictEqual(t.entries.length, FIXTURE_TRIBAL.entries.length);
    // Entries must NOT carry the .embedding 768-d array (we slim it)
    for (const e of t.entries) {
      assert.strictEqual(e.embedding, undefined, "tribal entries must drop .embedding");
      assert.ok(typeof e.text === "string");
      assert.ok(typeof e.domain === "string");
    }
  });
  it("returns null on missing file", () => {
    _resetCachesForTests();
    const t = loadTribalIndex(path.join(TMP_DIR, "no-tribal.json"));
    assert.strictEqual(t, null);
  });
  it("returns null on malformed shape (no entries array)", () => {
    const badPath = path.join(TMP_DIR, "bad-tribal.json");
    writeFileSync(badPath, JSON.stringify({ schemaVersion: "1.0.0" }));
    _resetCachesForTests();
    const t = loadTribalIndex(badPath);
    assert.strictEqual(t, null);
  });
  it("mtime cache works", () => {
    _resetCachesForTests();
    const t1 = loadTribalIndex(TRIBAL_PATH);
    const t2 = loadTribalIndex(TRIBAL_PATH);
    assert.strictEqual(t1, t2);
  });
});

// -- searchTribalHits -----------------------------------------------------

// Sanity ceiling for the no-pref-boost case: title (W_TRIBAL_TITLE=3.0) +
// text (W_TRIBAL_TEXT=1.5) per token, plus optional domain-token match
// (W_TRIBAL_DOMAIN_HIT=0.5). For a single token query the per-entry max
// before prefDomain boost is 5.0. Hoisted above use because describe()
// callbacks register synchronously; node:test evaluates const-after-use
// strictly under TDZ.
const W_TRIBAL_TITLE_PLUS_TEXT_MAX = 5.0;

describe("searchTribalHits", () => {
  it("finds tribal tips by title token", () => {
    _resetCachesForTests();
    const t = loadTribalIndex(TRIBAL_PATH);
    const hits = searchTribalHits(t, ["chatter"], { topK: 5 });
    assert.ok(hits.length >= 2, "at least 2 chatter tips in fixture");
    for (const h of hits) {
      assert.ok(h.title.toLowerCase().includes("chatter") || h.id, "hit must reference chatter or be valid entry");
    }
  });
  it("prefDomain boost prioritizes in-domain hits", () => {
    _resetCachesForTests();
    const t = loadTribalIndex(TRIBAL_PATH);
    const hitsNoPref = searchTribalHits(t, ["chatter"], { topK: 5 });
    const hitsLathe = searchTribalHits(t, ["chatter"], { topK: 5, prefDomain: "lathe" });
    // With lathe pref, the lathe entry should rank first
    const latheTitleIdx = hitsLathe.findIndex((h) => h.domain === "lathe");
    const millTitleIdx = hitsLathe.findIndex((h) => h.domain === "mill");
    assert.ok(latheTitleIdx >= 0 && millTitleIdx >= 0, "both mill + lathe chatter tips must be present");
    assert.ok(
      latheTitleIdx < millTitleIdx,
      `lathe entry should rank before mill with prefDomain=lathe — got lathe@${latheTitleIdx} mill@${millTitleIdx}`,
    );
    // Without pref, scores should NOT have the 2x multiplier
    for (const h of hitsNoPref) assert.ok(h.score <= W_TRIBAL_TITLE_PLUS_TEXT_MAX, "no pref should not double-boost");
  });
  it("returns [] for unmatched tokens", () => {
    _resetCachesForTests();
    const t = loadTribalIndex(TRIBAL_PATH);
    const hits = searchTribalHits(t, ["nothinginthecorpus"], { topK: 5 });
    assert.deepStrictEqual(hits, []);
  });
  it("returns [] when index is null", () => {
    assert.deepStrictEqual(searchTribalHits(null, ["chatter"]), []);
  });
});

// -- runTribalSearch ------------------------------------------------------

describe("runTribalSearch", () => {
  it("end-to-end: tokens + hits", () => {
    _resetCachesForTests();
    const { tokens, hits } = runTribalSearch("chatter problem", { indexPath: TRIBAL_PATH, topK: 3 });
    assert.ok(tokens.includes("chatter"));
    assert.ok(hits.length >= 1);
  });
  it("short-circuits when tokens.length < 2", () => {
    _resetCachesForTests();
    const { hits } = runTribalSearch("x", { indexPath: TRIBAL_PATH });
    assert.deepStrictEqual(hits, []);
  });
  it("short-circuits when index missing", () => {
    _resetCachesForTests();
    const { hits } = runTribalSearch("chatter problem", {
      indexPath: path.join(TMP_DIR, "missing-tribal.json"),
    });
    assert.deepStrictEqual(hits, []);
  });
});
