/**
 * generate-cited-tips-viz-features.test.mjs — concrete-value tests for
 * the system-viz augmentation generator.
 *
 * @milestone POST-PDF-NODE-MS0/U-CITED-TIPS-VIZ
 * @slot echo · @iter 17 · @date 2026-05-26
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generate, ROOST_ID, SCHEMA_VERSION } from "./generate-cited-tips-viz-features.mjs";
import { makeOracleResolver } from "./lib/class-name-node-resolver.mjs";

describe("constants", () => {
  it("ROOST_ID equals ghost.jm_die_cited_tips_corpus", () => {
    assert.equal(ROOST_ID, "ghost.jm_die_cited_tips_corpus");
  });

  it("SCHEMA_VERSION equals 1.0.0", () => {
    assert.equal(SCHEMA_VERSION, "1.0.0");
  });
});

describe("generate: nodes + edges", () => {
  const fileList = [
    { file: "haas-cited-tips.ts",  controller: "haas",  tips: 1,  bytes: 2400 },
    { file: "mazak-cited-tips.ts", controller: "mazak", tips: 38, bytes: 66600 },
    { file: "siemens-cited-tips.ts", controller: "siemens", tips: 14, bytes: 23200 },
  ];

  it("emits roost + 3 pivots + 3 leaves = 7 nodes", () => {
    assert.equal(generate(fileList, []).newNodes.length, 7);
  });

  it("roost is the first node", () => {
    assert.equal(generate(fileList, []).newNodes[0].id, "ghost.jm_die_cited_tips_corpus");
  });

  it("roost is L8", () => {
    assert.equal(generate(fileList, []).newNodes[0].layer, "L8");
  });

  it("mazak pivot is L9", () => {
    const nodes = generate(fileList, []).newNodes;
    const mazakPivot = nodes.find((n) => n.id === "ghost.jm_die_cited_tips_corpus.mazak");
    assert.equal(mazakPivot.layer, "L9");
  });

  it("mazak file leaf is L10", () => {
    const nodes = generate(fileList, []).newNodes;
    const leaf = nodes.find((n) => n.id === "ghost.jm_die_cited_tips_corpus.mazak.file");
    assert.equal(leaf.layer, "L10");
  });

  it("haas bridges to 2 engines (MasterPostProcessorEngine + UnifiedAGI)", () => {
    const edges = generate(fileList, []).newEdges;
    const haasEdges = edges.filter((e) => e.from === "ghost.jm_die_cited_tips_corpus.haas.file");
    assert.equal(haasEdges.length, 2);
  });

  it("file without controller is skipped", () => {
    const noController = [{ file: "x-cited-tips.ts", controller: null, tips: 1, bytes: 100 }];
    assert.equal(generate(noController, []).newNodes.length, 1);
  });

  it("existing roost id in set: roost not re-emitted", () => {
    const seen = new Set(["ghost.jm_die_cited_tips_corpus"]);
    const result = generate(fileList, seen);
    const roostHits = result.newNodes.filter((n) => n.id === "ghost.jm_die_cited_tips_corpus").length;
    assert.equal(roostHits, 0);
  });

  it("stats.filesProcessed echoes input length", () => {
    assert.equal(generate(fileList, []).stats.filesProcessed, 3);
  });

  it("stats.pivots = 3 (one per controller)", () => {
    assert.equal(generate(fileList, []).stats.pivots, 3);
  });
});

describe("generate: bridge-edge resolution (U-VIZ-ROOST-BRIDGE-RESOLVE)", () => {
  // haas -> [MasterPostProcessorEngine, MasterPostProcessorUnifiedAGIEngine]
  const haasFile = [{ file: "haas-cited-tips.ts", controller: "haas", tips: 1, bytes: 2400 }];
  const LEAF = "ghost.jm_die_cited_tips_corpus.haas.file";

  it("no resolver -> bare class names preserved (back-compat)", () => {
    const edges = generate(haasFile, []).newEdges.filter((e) => e.from === LEAF);
    assert.equal(edges.length, 2);
    assert.ok(edges.every((e) => /Engine$/.test(e.to)), "to should be bare class names");
    assert.equal(generate(haasFile, []).stats.bridgesResolved, 0);
  });

  it("with resolver -> resolves the to: node-id; un-graphed engine dropped (never a dangler)", () => {
    const map = { MasterPostProcessorEngine: "eng.cam.masterpostprocessorengine" };
    const idSet = new Set(Object.values(map));
    const resolver = { idSet, resolve: (ref, ids) => (ids.has(ref) ? ref : map[ref] || null) };
    const r = generate(haasFile, [], resolver);
    const edges = r.newEdges.filter((e) => e.from === LEAF);
    assert.equal(edges.length, 1, "the un-resolvable engine's edge is dropped");
    assert.equal(edges[0].to, "eng.cam.masterpostprocessorengine");
    assert.equal(r.stats.bridgesResolved, 1);
    assert.equal(r.stats.bridgesDropped, 1);
  });

  it("resolver pass-through (endpoint already a valid id) keeps the edge, no false drop", () => {
    const idSet = new Set(["MasterPostProcessorEngine", "MasterPostProcessorUnifiedAGIEngine"]);
    const resolver = { idSet, resolve: (ref, ids) => (ids.has(ref) ? ref : null) };
    const r = generate(haasFile, [], resolver);
    const edges = r.newEdges.filter((e) => e.from === LEAF);
    assert.equal(edges.length, 2, "both pass through, none dropped");
    assert.equal(r.stats.bridgesDropped, 0);
  });

  it("REAL oracle resolver (no mock) resolves haas bridge targets to eng.* node-ids", () => {
    // integration: exercise the production makeOracleResolver against the live node-card oracle,
    // so the resolution path is verified end-to-end (not only the mock contract above).
    const r = generate(haasFile, [], makeOracleResolver());
    const edges = r.newEdges.filter((e) => e.from === LEAF);
    assert.ok(edges.length >= 1, "at least one haas bridge resolves against the live oracle");
    assert.ok(edges.every((e) => e.to.startsWith("eng.")), "resolved targets are eng.* node-ids");
    assert.equal(r.stats.bridgesDropped, 0, "both haas targets (MasterPostProcessor[UnifiedAGI]Engine) are graphed");
  });
});
