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
import { writeFileSync, readFileSync, mkdtempSync, rmSync, utimesSync } from "node:fs";
import path from "node:path";
import os from "node:os";

import {
  tokenize,
  loadGraph,
  searchGraphHits,
  explainNodeMatch,
  runMasterIndexSearch,
  loadTribalIndex,
  searchTribalHits,
  runTribalSearch,
  STOPWORDS,
  DEFAULT_EXCLUDED_LAYERS,
  _resetCachesForTests,
} from "./master-index-search-lib.mjs";
// U-MASTER-INDEX-SIDECAR: the offline sidecar generator (File 1) — used by the
// sidecar fast-path test block below to produce real sidecars for loadGraph.
import { generate as generateSidecar } from "../build-graph-index.mjs";

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
  it("skips malformed nodes mid-array without aborting the whole load (Reviewer C P0)", () => {
    // One bad node with non-array wikiEntries — used to crash .map().
    const badGraph = {
      nodes: [
        {
          id: "engine:Good1",
          label: "Good1",
          info: "ok",
          layer: "L7",
          status: "built",
          knowledge: { wikiEntries: [{ name: "good1" }], memoryEntries: [] },
        },
        {
          id: "engine:BadKnowledge",
          label: "BadKnowledge",
          info: "broken",
          layer: "L7",
          status: "built",
          knowledge: { wikiEntries: "not-an-array", memoryEntries: { not: "array" } },
        },
        {
          id: "engine:Good2",
          label: "Good2",
          info: "ok",
          layer: "L7",
          status: "built",
          knowledge: { wikiEntries: [], memoryEntries: [] },
        },
      ],
    };
    const badPath = path.join(TMP_DIR, "malformed-mid-array.json");
    writeFileSync(badPath, JSON.stringify(badGraph));
    _resetCachesForTests();
    const g = loadGraph(badPath);
    assert.ok(g, "load must succeed despite one malformed node");
    assert.strictEqual(g.nodes.length, 3, "all 3 nodes preserved in nodes list");
    // Inverted index should still have entries from the GOOD nodes
    assert.ok(g.inverted.get("good1"), "good1 token must still be indexed");
    assert.ok(g.inverted.get("good2"), "good2 token must still be indexed");
  });
  it("refuses graph files larger than PRISM_GRAPH_MAX_BYTES (Reviewer C P0)", () => {
    _resetCachesForTests();
    const origLimit = process.env.PRISM_GRAPH_MAX_BYTES;
    try {
      // Set limit to 100 bytes — fixture is way bigger
      process.env.PRISM_GRAPH_MAX_BYTES = "100";
      const g = loadGraph(GRAPH_PATH);
      assert.strictEqual(g, null, "oversized graph must return null");
    } finally {
      if (origLimit === undefined) delete process.env.PRISM_GRAPH_MAX_BYTES;
      else process.env.PRISM_GRAPH_MAX_BYTES = origLimit;
    }
  });
});

// -- loadGraph: JULIETT F1 fallback (2026-05-18) --------------------------
// When the primary system-graph.json exceeds PRISM_GRAPH_MAX_BYTES, the lib
// must fall back to a sibling architecture-graph.json instead of returning
// null (previous silent-degrade behavior). Knob: PRISM_GRAPH_FALLBACK_DISABLE=1
// restores the original null-on-overflow. Override: PRISM_GRAPH_FALLBACK_PATH.

describe("loadGraph: JULIETT F1 fallback", () => {
  const FB_TMP = mkdtempSync(path.join(os.tmpdir(), "prism-misl-fb-"));
  const PRIMARY = path.join(FB_TMP, "system-graph.json");
  const FALLBACK = path.join(FB_TMP, "architecture-graph.json");
  const BIG_BLOB = "x".repeat(5000); // ensures size > 200-byte test cap

  before(() => {
    writeFileSync(
      PRIMARY,
      JSON.stringify({ nodes: [{ id: "primary:big", label: "primary", info: BIG_BLOB }] }),
    );
    writeFileSync(
      FALLBACK,
      JSON.stringify({ nodes: [{ id: "fallback:arch", label: "ArchitectureNode", info: "fb-info" }] }),
    );
  });

  after(() => {
    try { rmSync(FB_TMP, { recursive: true, force: true }); } catch { /* swallow */ }
  });

  it("oversized system-graph + small architecture-graph → loads architecture (NOT null)", () => {
    _resetCachesForTests();
    const orig = process.env.PRISM_GRAPH_MAX_BYTES;
    process.env.PRISM_GRAPH_MAX_BYTES = "200";
    try {
      const g = loadGraph(PRIMARY);
      assert.notStrictEqual(g, null, "fallback must yield a wrapper, not null");
      const ids = g.nodes.map(n => n.id);
      assert.ok(ids.includes("fallback:arch"), "architecture-graph node must be loaded");
      assert.ok(!ids.includes("primary:big"), "oversized primary node must NOT appear");
    } finally {
      if (orig === undefined) delete process.env.PRISM_GRAPH_MAX_BYTES;
      else process.env.PRISM_GRAPH_MAX_BYTES = orig;
    }
  });

  it("PRISM_GRAPH_FALLBACK_DISABLE=1 → returns null on overflow (kill-switch works)", () => {
    _resetCachesForTests();
    const origLimit = process.env.PRISM_GRAPH_MAX_BYTES;
    const origDisable = process.env.PRISM_GRAPH_FALLBACK_DISABLE;
    process.env.PRISM_GRAPH_MAX_BYTES = "200";
    process.env.PRISM_GRAPH_FALLBACK_DISABLE = "1";
    try {
      const g = loadGraph(PRIMARY);
      assert.strictEqual(g, null, "disabled fallback must return null on overflow");
    } finally {
      if (origLimit === undefined) delete process.env.PRISM_GRAPH_MAX_BYTES;
      else process.env.PRISM_GRAPH_MAX_BYTES = origLimit;
      if (origDisable === undefined) delete process.env.PRISM_GRAPH_FALLBACK_DISABLE;
      else process.env.PRISM_GRAPH_FALLBACK_DISABLE = origDisable;
    }
  });

  it("non-system-graph basename → null (basename gate prevents accidental fallback)", () => {
    // GRAPH_PATH basename is "graph.json"; fallback must NOT trigger.
    _resetCachesForTests();
    const orig = process.env.PRISM_GRAPH_MAX_BYTES;
    process.env.PRISM_GRAPH_MAX_BYTES = "100";
    try {
      const g = loadGraph(GRAPH_PATH);
      assert.strictEqual(g, null, "non-system-graph basename must not invoke fallback");
    } finally {
      if (orig === undefined) delete process.env.PRISM_GRAPH_MAX_BYTES;
      else process.env.PRISM_GRAPH_MAX_BYTES = orig;
    }
  });

  it("oversized system-graph + MISSING architecture sibling → null (graceful)", () => {
    _resetCachesForTests();
    const isoDir = mkdtempSync(path.join(os.tmpdir(), "prism-misl-fb-iso-"));
    const lonePrimary = path.join(isoDir, "system-graph.json");
    writeFileSync(
      lonePrimary,
      JSON.stringify({ nodes: [{ id: "lone:big", info: BIG_BLOB }] }),
    );
    const orig = process.env.PRISM_GRAPH_MAX_BYTES;
    process.env.PRISM_GRAPH_MAX_BYTES = "200";
    try {
      const g = loadGraph(lonePrimary);
      assert.strictEqual(g, null, "missing fallback file must degrade to null, not throw");
    } finally {
      if (orig === undefined) delete process.env.PRISM_GRAPH_MAX_BYTES;
      else process.env.PRISM_GRAPH_MAX_BYTES = orig;
      try { rmSync(isoDir, { recursive: true, force: true }); } catch { /* swallow */ }
    }
  });

  it("PRISM_GRAPH_FALLBACK_PATH overrides sibling lookup", () => {
    _resetCachesForTests();
    const isoDir = mkdtempSync(path.join(os.tmpdir(), "prism-misl-fb-ovr-"));
    const lonePrimary = path.join(isoDir, "system-graph.json");
    const customFb = path.join(isoDir, "custom-fb.json");
    writeFileSync(
      lonePrimary,
      JSON.stringify({ nodes: [{ id: "lone:big", info: BIG_BLOB }] }),
    );
    writeFileSync(
      customFb,
      JSON.stringify({ nodes: [{ id: "custom:fb", label: "CustomFallback" }] }),
    );
    const origLimit = process.env.PRISM_GRAPH_MAX_BYTES;
    const origOverride = process.env.PRISM_GRAPH_FALLBACK_PATH;
    process.env.PRISM_GRAPH_MAX_BYTES = "200";
    process.env.PRISM_GRAPH_FALLBACK_PATH = customFb;
    try {
      const g = loadGraph(lonePrimary);
      assert.notStrictEqual(g, null, "PRISM_GRAPH_FALLBACK_PATH override must yield a wrapper");
      assert.ok(
        g.nodes.map(n => n.id).includes("custom:fb"),
        "custom fallback node must be loaded when override env is set",
      );
    } finally {
      if (origLimit === undefined) delete process.env.PRISM_GRAPH_MAX_BYTES;
      else process.env.PRISM_GRAPH_MAX_BYTES = origLimit;
      if (origOverride === undefined) delete process.env.PRISM_GRAPH_FALLBACK_PATH;
      else process.env.PRISM_GRAPH_FALLBACK_PATH = origOverride;
      try { rmSync(isoDir, { recursive: true, force: true }); } catch { /* swallow */ }
    }
  });

  it("oversized system-graph + OVERSIZED fallback → null (both fail cap)", () => {
    _resetCachesForTests();
    const isoDir = mkdtempSync(path.join(os.tmpdir(), "prism-misl-fb-both-"));
    const bigPrimary = path.join(isoDir, "system-graph.json");
    const bigFallback = path.join(isoDir, "architecture-graph.json");
    writeFileSync(bigPrimary, JSON.stringify({ nodes: [{ id: "big-p", info: BIG_BLOB }] }));
    writeFileSync(bigFallback, JSON.stringify({ nodes: [{ id: "big-fb", info: BIG_BLOB }] }));
    const orig = process.env.PRISM_GRAPH_MAX_BYTES;
    process.env.PRISM_GRAPH_MAX_BYTES = "200";
    try {
      const g = loadGraph(bigPrimary);
      assert.strictEqual(g, null, "both-oversized must degrade to null (no second recursion)");
    } finally {
      if (orig === undefined) delete process.env.PRISM_GRAPH_MAX_BYTES;
      else process.env.PRISM_GRAPH_MAX_BYTES = orig;
      try { rmSync(isoDir, { recursive: true, force: true }); } catch { /* swallow */ }
    }
  });
});

// -- loadGraph: U-MASTER-INDEX-SIDECAR fast-path --------------------------
// When a fresh `system-graph-index.json` sidecar sits beside the graph,
// loadGraph reconstructs the index from it (seconds, full coverage) instead
// of parsing the 372 MB graph (~138 s). Stale / schema-mismatched / malformed
// / knob-disabled / absent sidecar → byte-identical legacy behavior.
// Discriminator used throughout: a graph node carries an extra `x` field; the
// COMPACT sidecar node drops it — so `g.nodes[0].x === undefined` proves the
// sidecar path was taken, `=== 99` proves the legacy parse ran.

describe("loadGraph: sidecar fast-path", () => {
  // Build an isolated { graph, sidecar } pair in a fresh temp dir. The graph
  // basename MUST be `system-graph.json` (the sidecar path is derived from it).
  function makeSidecarFixture({ withSidecar = true, mutate = null } = {}) {
    const dir = mkdtempSync(path.join(os.tmpdir(), "prism-misl-sc-"));
    const graphPath = path.join(dir, "system-graph.json");
    const sidecarPath = path.join(dir, "system-graph-index.json");
    const graph = {
      nodes: [
        {
          id: "eng.kienzle", label: "Kienzle Engine", layer: "L7", status: "built",
          info: "computes cutting force constructor sample", x: 99,
        },
        {
          id: "eng.taylor", label: "Taylor Engine", layer: "L7", status: "built",
          info: "predicts cutting tool life", x: 7,
        },
      ],
    };
    writeFileSync(graphPath, JSON.stringify(graph));
    if (withSidecar) {
      generateSidecar({ graphPath, outPath: sidecarPath });
      if (mutate) {
        const sc = JSON.parse(readFileSync(sidecarPath, "utf8"));
        mutate(sc);
        writeFileSync(sidecarPath, JSON.stringify(sc));
      }
    }
    return { dir, graphPath, sidecarPath, graphNodeCount: graph.nodes.length };
  }

  it("fresh sidecar → loadGraph reconstructs the full index from it", () => {
    const fx = makeSidecarFixture();
    try {
      _resetCachesForTests();
      const g = loadGraph(fx.graphPath);
      assert.ok(g, "loadGraph returned a wrapper");
      assert.strictEqual(g.nodes.length, fx.graphNodeCount, "full node count from sidecar");
      assert.ok(g.inverted instanceof Map);
      assert.ok(g.inverted.get("kienzle"), "kienzle token indexed via the sidecar");
      assert.strictEqual(g.nodes[0].x, undefined, "compact sidecar nodes used (not the legacy parse)");
    } finally {
      rmSync(fx.dir, { recursive: true, force: true });
    }
  });

  it("stale sidecar (sourceMtimeMs < graph mtime) → ignored, legacy path", () => {
    const fx = makeSidecarFixture({ mutate: (sc) => { sc.sourceMtimeMs = 1; } });
    try {
      _resetCachesForTests();
      const g = loadGraph(fx.graphPath);
      assert.ok(g);
      assert.strictEqual(g.nodes[0].x, 99, "legacy parse used (graph node retains .x)");
    } finally {
      rmSync(fx.dir, { recursive: true, force: true });
    }
  });

  it("schemaVersion mismatch → sidecar ignored, legacy path", () => {
    const fx = makeSidecarFixture({ mutate: (sc) => { sc.schemaVersion = "9.9.9"; } });
    try {
      _resetCachesForTests();
      const g = loadGraph(fx.graphPath);
      assert.strictEqual(g.nodes[0].x, 99, "legacy parse used on schema mismatch");
    } finally {
      rmSync(fx.dir, { recursive: true, force: true });
    }
  });

  it("PRISM_GRAPH_SIDECAR_DISABLE=1 → sidecar skipped, legacy path", () => {
    const fx = makeSidecarFixture();
    const orig = process.env.PRISM_GRAPH_SIDECAR_DISABLE;
    process.env.PRISM_GRAPH_SIDECAR_DISABLE = "1";
    try {
      _resetCachesForTests();
      const g = loadGraph(fx.graphPath);
      assert.strictEqual(g.nodes[0].x, 99, "legacy parse used when the knob disables the sidecar");
    } finally {
      if (orig === undefined) delete process.env.PRISM_GRAPH_SIDECAR_DISABLE;
      else process.env.PRISM_GRAPH_SIDECAR_DISABLE = orig;
      rmSync(fx.dir, { recursive: true, force: true });
    }
  });

  // MASTER-INDEX-OOM-FIX (2026-06-09): a sidecar larger than the safe parse
  // ceiling for the live heap must be rejected so the caller falls through to
  // the smaller architecture-graph instead of OOM-killing the hook at the
  // fleet's 384 MB heap cap. PRISM_SIDECAR_MAX_BYTES overrides the 35%-of-heap
  // default; setting it to 1 forces every real sidecar over the ceiling.
  it("PRISM_SIDECAR_MAX_BYTES too small → sidecar skipped, legacy path (OOM guard)", () => {
    const fx = makeSidecarFixture();
    const orig = process.env.PRISM_SIDECAR_MAX_BYTES;
    process.env.PRISM_SIDECAR_MAX_BYTES = "1";
    try {
      _resetCachesForTests();
      const g = loadGraph(fx.graphPath);
      assert.ok(g, "loadGraph still returns a wrapper via the legacy parse");
      assert.strictEqual(g.nodes[0].x, 99, "legacy parse used when sidecar exceeds the heap ceiling");
    } finally {
      if (orig === undefined) delete process.env.PRISM_SIDECAR_MAX_BYTES;
      else process.env.PRISM_SIDECAR_MAX_BYTES = orig;
      rmSync(fx.dir, { recursive: true, force: true });
    }
  });

  it("PRISM_SIDECAR_MAX_BYTES generous → sidecar still used (guard does not over-reject)", () => {
    const fx = makeSidecarFixture();
    const orig = process.env.PRISM_SIDECAR_MAX_BYTES;
    process.env.PRISM_SIDECAR_MAX_BYTES = String(1024 * 1024 * 1024); // 1 GB ceiling
    try {
      _resetCachesForTests();
      const g = loadGraph(fx.graphPath);
      assert.ok(g);
      assert.strictEqual(g.nodes[0].x, undefined, "compact sidecar path taken when well under the ceiling");
    } finally {
      if (orig === undefined) delete process.env.PRISM_SIDECAR_MAX_BYTES;
      else process.env.PRISM_SIDECAR_MAX_BYTES = orig;
      rmSync(fx.dir, { recursive: true, force: true });
    }
  });

  // P1 guard (reviewer-caught): a non-numeric / 0 / NEGATIVE PRISM_SIDECAR_MAX_BYTES
  // must fall back to the heap-derived default, NOT (a) treat "0" as unset-then-default
  // silently when the operator meant "no ceiling", nor (b) be truthy at -1 and reject
  // EVERY sidecar (Number("-1")||x === -1, size > -1 always true). The fix validates
  // finite-and-positive; these assert the small test sidecar still loads (x===undefined).
  it("PRISM_SIDECAR_MAX_BYTES negative → ignored, sidecar still used (not always-rejected)", () => {
    const fx = makeSidecarFixture();
    const orig = process.env.PRISM_SIDECAR_MAX_BYTES;
    process.env.PRISM_SIDECAR_MAX_BYTES = "-1";
    try {
      _resetCachesForTests();
      const g = loadGraph(fx.graphPath);
      assert.ok(g);
      assert.strictEqual(g.nodes[0].x, undefined, "negative knob falls back to default; small sidecar fits and is used");
    } finally {
      if (orig === undefined) delete process.env.PRISM_SIDECAR_MAX_BYTES;
      else process.env.PRISM_SIDECAR_MAX_BYTES = orig;
      rmSync(fx.dir, { recursive: true, force: true });
    }
  });

  it("PRISM_SIDECAR_MAX_BYTES non-numeric → ignored, sidecar still used", () => {
    const fx = makeSidecarFixture();
    const orig = process.env.PRISM_SIDECAR_MAX_BYTES;
    process.env.PRISM_SIDECAR_MAX_BYTES = "not-a-number";
    try {
      _resetCachesForTests();
      const g = loadGraph(fx.graphPath);
      assert.ok(g);
      assert.strictEqual(g.nodes[0].x, undefined, "garbage knob falls back to default; small sidecar used");
    } finally {
      if (orig === undefined) delete process.env.PRISM_SIDECAR_MAX_BYTES;
      else process.env.PRISM_SIDECAR_MAX_BYTES = orig;
      rmSync(fx.dir, { recursive: true, force: true });
    }
  });

  it("no sidecar file → legacy parse, behavior unchanged (regression)", () => {
    const fx = makeSidecarFixture({ withSidecar: false });
    try {
      _resetCachesForTests();
      const g = loadGraph(fx.graphPath);
      assert.ok(g);
      assert.strictEqual(g.nodes.length, fx.graphNodeCount);
      assert.strictEqual(g.nodes[0].x, 99, "legacy parse — graph node retains .x");
      assert.ok(g.inverted.get("kienzle"), "kienzle token still indexed via the legacy parse");
    } finally {
      rmSync(fx.dir, { recursive: true, force: true });
    }
  });

  it("unparseable sidecar → ignored, legacy path", () => {
    const fx = makeSidecarFixture({ withSidecar: false });
    writeFileSync(fx.sidecarPath, "{ broken json");
    try {
      _resetCachesForTests();
      const g = loadGraph(fx.graphPath);
      assert.strictEqual(g.nodes[0].x, 99, "legacy parse used on an unparseable sidecar");
    } finally {
      rmSync(fx.dir, { recursive: true, force: true });
    }
  });

  it("malformed sidecar nodes (null / non-object) → search degrades, never throws", () => {
    const fx = makeSidecarFixture({
      mutate: (sc) => { sc.nodes.push(null); sc.nodes.push("badnode"); },
    });
    try {
      _resetCachesForTests();
      const g = loadGraph(fx.graphPath);
      assert.ok(g, "loadGraph still returns a wrapper for a malformed sidecar");
      // searchGraphHits must filter the null / non-object elements, not throw.
      const r = runMasterIndexSearch("cutting force", { graphPath: fx.graphPath });
      assert.ok(Array.isArray(r.hits), "search returned a hits array (did not throw)");
    } finally {
      rmSync(fx.dir, { recursive: true, force: true });
    }
  });

  it("sidecar path: a `constructor`-named token round-trips (Object.entries, not [tok])", () => {
    const fx = makeSidecarFixture();
    try {
      _resetCachesForTests();
      // "constructor" is in the kienzle node's info — it is a real own-key on
      // build-graph-index's null-proto inverted map; loadGraph must read it
      // back via Object.entries (a normal-object `inverted["constructor"]`
      // would collide with Object.prototype.constructor).
      const r = runMasterIndexSearch("constructor sample", { graphPath: fx.graphPath });
      assert.ok(r.hits.length >= 1, "constructor token round-tripped through the sidecar");
      assert.ok(r.hits.some((h) => h.id === "eng.kienzle"));
    } finally {
      rmSync(fx.dir, { recursive: true, force: true });
    }
  });

  it("sidecar-path search result is identical to the legacy-path result (parity)", () => {
    const fx = makeSidecarFixture();
    const origDisable = process.env.PRISM_GRAPH_SIDECAR_DISABLE;
    try {
      _resetCachesForTests();
      const viaSidecar = runMasterIndexSearch("cutting force", { graphPath: fx.graphPath });

      process.env.PRISM_GRAPH_SIDECAR_DISABLE = "1";
      _resetCachesForTests();
      const viaLegacy = runMasterIndexSearch("cutting force", { graphPath: fx.graphPath });

      assert.deepStrictEqual(
        viaSidecar.hits.map((h) => ({ id: h.id, score: h.score })),
        viaLegacy.hits.map((h) => ({ id: h.id, score: h.score })),
        "sidecar and legacy paths must produce identical ranked hits",
      );
      assert.ok(viaSidecar.hits.length >= 1, "the parity check is non-vacuous (hits exist)");
    } finally {
      if (origDisable === undefined) delete process.env.PRISM_GRAPH_SIDECAR_DISABLE;
      else process.env.PRISM_GRAPH_SIDECAR_DISABLE = origDisable;
      rmSync(fx.dir, { recursive: true, force: true });
    }
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
  it("attaches noteCount = full wiki+memory edge count (brain-coverage, not truncated)", () => {
    _resetCachesForTests();
    const g = loadGraph(GRAPH_PATH);
    const hits = searchGraphHits(g, ["kienzle"], { topK: 5 });
    // hits[0] is the DOCUMENTED KienzleForceEngine (1 wiki + 1 memory), which
    // out-scores the empty-knowledge duplicate-label node and survives dedup.
    assert.strictEqual(hits[0].label, "KienzleForceEngine");
    assert.strictEqual(hits[0].noteCount, 2, "1 wiki + 1 memory = 2 (the documented node, not the noteCount-0 dup)");
    // every hit carries a numeric noteCount >= 0 (additive field, always present)
    for (const h of hits) {
      assert.strictEqual(typeof h.noteCount, "number");
      assert.ok(h.noteCount >= 0);
    }
    // Deterministic inline graph (we control `inverted` + labels) so candidate
    // selection is independent of the tokenizer / STOPWORDS. Proves noteCount is
    // the FULL wiki+memory edge total even when it EXCEEDS the truncated
    // wiki(3)/memory(2) display arrays — the whole point of a separate field.
    const ig = {
      nodes: [
        { id: "e:doc", label: "WidgetDoc", layer: "L7",
          knowledge: { wikiEntries: [{ name: "w1" }, { name: "w2" }, { name: "w3" }, { name: "w4" }], memoryEntries: [{ name: "m1" }, { name: "m2" }] } }, // 4+2=6
        { id: "e:bare", label: "WidgetBare", layer: "L7", knowledge: { wikiEntries: [], memoryEntries: [] } },                                              // 0
        { id: "e:partial", label: "WidgetPartial", layer: "L7", knowledge: { wikiEntries: [{ name: "w1" }], memoryEntries: [] } },                          // 1
      ],
      inverted: new Map([["widget", new Set(["e:doc", "e:bare", "e:partial"])]]),
    };
    const ihits = searchGraphHits(ig, ["widget"], { topK: 10 });
    const byLabel = Object.fromEntries(ihits.map((h) => [h.label, h.noteCount]));
    assert.strictEqual(byLabel["WidgetDoc"], 6, "4 wiki + 2 memory = 6 (FULL count)");
    assert.strictEqual(byLabel["WidgetBare"], 0, "empty knowledge → 0");
    assert.strictEqual(byLabel["WidgetPartial"], 1, "1 wiki + 0 memory = 1");
    const doc = ihits.find((h) => h.label === "WidgetDoc");
    assert.strictEqual(doc.wiki.length, 3, "wiki display array still truncated to 3");
    assert.strictEqual(doc.memory.length, 2, "memory display array still truncated to 2");
    assert.ok(doc.noteCount > doc.wiki.length + doc.memory.length, "noteCount(6) > truncated arrays(5): proves full count, not array length");
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

  // HMEMV02 explainable retrieval (master-index surface) ------------------
  it("explainNodeMatch: reports matched tokens + which scored fields they hit", () => {
    const node = {
      id: "eng.kienzleforce", label: "KienzleForceEngine", info: "cutting force model",
      knowledge: { wikiEntries: [{ name: "kienzle-theory" }], memoryEntries: [] },
    };
    const e = explainNodeMatch(node, ["kienzle", "cutting", "missing"]);
    assert.deepStrictEqual(e.matchedTokens.sort(), ["cutting", "kienzle"]);
    // "kienzle" hits id+label+vault(wiki); "cutting" hits info -> all four fields
    assert.ok(e.fields.includes("id"));
    assert.ok(e.fields.includes("label"));
    assert.ok(e.fields.includes("info"));
    assert.ok(e.fields.includes("vault"));
  });
  it("explainNodeMatch: fail-soft on bad node / empty tokens", () => {
    assert.deepStrictEqual(explainNodeMatch(null, ["x"]), { matchedTokens: [], fields: [] });
    assert.deepStrictEqual(explainNodeMatch({ id: "a" }, []), { matchedTokens: [], fields: [] });
  });
  it("searchGraphHits: each hit carries explanation {matchedTokens, fields, corpus, score}", () => {
    const ig = {
      nodes: [
        { id: "e:widgetdoc", label: "WidgetDoc", layer: "L7", info: "a widget thing",
          knowledge: { wikiEntries: [], memoryEntries: [] } },
      ],
      inverted: new Map([["widget", new Set(["e:widgetdoc"])]]),
    };
    const hits = searchGraphHits(ig, ["widget"], { topK: 5 });
    assert.strictEqual(hits.length, 1);
    const ex = hits[0].explanation;
    assert.ok(ex, "hit carries an explanation object");
    assert.ok(ex.matchedTokens.includes("widget"));
    assert.ok(Array.isArray(ex.fields) && ex.fields.length >= 1, "at least one scored field matched");
    assert.strictEqual(ex.corpus, "L7", "corpus == node layer");
    assert.strictEqual(ex.score, hits[0].score, "explanation.score == hit score");
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
  it("skips malformed tribal entries without aborting the whole load (Reviewer C P0)", () => {
    const badTribal = {
      schemaVersion: "1.0.0",
      entries: [
        { id: "tribal:01", source: "shop", domain: "mill", title: "ok-one", text: "good content" },
        null,                                                                // bad entry
        "string-entry-not-object",                                           // bad entry
        { id: "tribal:02", source: "shop", domain: "lathe", title: "ok-two", text: "more good" },
      ],
    };
    const badPath = path.join(TMP_DIR, "tribal-mixed.json");
    writeFileSync(badPath, JSON.stringify(badTribal));
    _resetCachesForTests();
    const t = loadTribalIndex(badPath);
    assert.ok(t, "load must succeed despite 2 bad entries");
    // Only the 2 good entries should index
    assert.strictEqual(t.entries.length, 2, "only valid entries kept");
    assert.ok(t.inverted.get("good"), "'good' must be indexed from valid entries");
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
