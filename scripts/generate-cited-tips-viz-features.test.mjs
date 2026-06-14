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
