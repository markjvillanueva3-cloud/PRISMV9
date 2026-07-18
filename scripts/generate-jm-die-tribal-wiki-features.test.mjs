// Tests for generate-jm-die-tribal-wiki-features.mjs (added with U-VIZ-ROOST-BRIDGE-RESOLVE-TRIBAL).
// Run direct: `node scripts/generate-jm-die-tribal-wiki-features.test.mjs`.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generate, ROOST_ID, SCHEMA_VERSION } from "./generate-jm-die-tribal-wiki-features.mjs";
import { makeOracleResolver } from "./lib/class-name-node-resolver.mjs";

describe("tribal-wiki: constants", () => {
  it("ROOST_ID equals ghost.jm_die_tribal_wiki_corpus", () => {
    assert.equal(ROOST_ID, "ghost.jm_die_tribal_wiki_corpus");
  });
  it("SCHEMA_VERSION equals 1.0.0", () => {
    assert.equal(SCHEMA_VERSION, "1.0.0");
  });
});

describe("tribal-wiki: nodes + edges", () => {
  const items = [
    { domain: "mill", filename: "haas-manual.pdf", tags: ["haas"] },
    { domain: "mill", filename: "mazak-guide.pdf", tags: ["mazak"] },
  ];

  it("emits roost + 1 mill pivot + 2 pdfs = 4 nodes", () => {
    assert.equal(generate(items, []).newNodes.length, 4);
  });
  it("roost is first node and L8", () => {
    const n = generate(items, []).newNodes[0];
    assert.equal(n.id, "ghost.jm_die_tribal_wiki_corpus");
    assert.equal(n.layer, "L8");
  });
  it("mill domain bridges each pdf to 4 engines (2 pdfs x 4 = 8 edges)", () => {
    assert.equal(generate(items, []).newEdges.length, 8);
  });
  it("stats.pdfsClassified echoes items length", () => {
    assert.equal(generate(items, []).stats.pdfsClassified, 2);
  });
});

describe("tribal-wiki: bridge-edge resolution (U-VIZ-ROOST-BRIDGE-RESOLVE)", () => {
  // mill -> [HurcoV11MillMasterPostEngine, MillMasterOrchestratorFacadeEngine, UltimateSpeedFeedEngine, AutoSpeedFeedEngine]
  const items = [{ domain: "mill", filename: "x.pdf", tags: [] }];
  const PDF = "ghost.jm_die_tribal_wiki_corpus.mill.x";

  it("no resolver -> bare class names preserved (back-compat)", () => {
    const edges = generate(items, []).newEdges.filter((e) => e.from === PDF);
    assert.equal(edges.length, 4);
    assert.ok(edges.every((e) => /Engine$/.test(e.to)), "to should be bare class names");
    assert.equal(generate(items, []).stats.bridgesResolved, 0);
  });

  it("with resolver -> resolves the to: node-id; un-graphed engines dropped (never danglers)", () => {
    const map = { HurcoV11MillMasterPostEngine: "eng.cam.hurcov11millmasterpostengine" };
    const idSet = new Set(Object.values(map));
    const resolver = { idSet, resolve: (ref, ids) => (ids.has(ref) ? ref : map[ref] || null) };
    const r = generate(items, [], resolver);
    const edges = r.newEdges.filter((e) => e.from === PDF);
    assert.equal(edges.length, 1, "only the mapped engine's edge survives; the other 3 dropped");
    assert.equal(edges[0].to, "eng.cam.hurcov11millmasterpostengine");
    assert.equal(r.stats.bridgesResolved, 1);
    assert.equal(r.stats.bridgesDropped, 3);
  });

  it("REAL oracle resolver (no mock): emitted edges are eng.* node-ids, >=1 resolved", () => {
    const r = generate(items, [], makeOracleResolver());
    const edges = r.newEdges.filter((e) => e.from === PDF);
    assert.ok(edges.every((e) => e.to.startsWith("eng.")), "no bare class name survives folding");
    assert.ok(r.stats.bridgesResolved >= 1, "at least one mill engine resolves against the live oracle");
  });
});
