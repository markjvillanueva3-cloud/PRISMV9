// Tests for generate-post-pdf-corpus-features.mjs (added with U-VIZ-ROOST-BRIDGE-RESOLVE-POSTPDF).
// Run direct: `node scripts/generate-post-pdf-corpus-features.test.mjs`.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generate, ROOST_ID, SCHEMA_VERSION, CROSS_DOMAIN_PEERS } from "./generate-post-pdf-corpus-features.mjs";
import { makeOracleResolver } from "./lib/class-name-node-resolver.mjs";

// minimal fixture: 1 source, no chapters, 2 engine bridges (one real, one un-graphed).
const parsedCorpora = [{ summary: { chapters: 0, sections: 0, lines: 0 }, chapters: [] }];
const sources = [{
  slug: "test-book", book: "Test Book", pdfPath: "x.pdf", extractFile: "x.txt",
  engines: ["MasterPostProcessorEngine", "FakeUngraphedXyzEngine"],
}];
const bridges = (r) => r.newEdges.filter((e) => e.kind === "bridge-pdf-engine");
const peers = (r) => r.newEdges.filter((e) => e.kind !== "bridge-pdf-engine");

describe("post-pdf: constants", () => {
  it("ROOST_ID equals ghost.post_writing_corpus", () => {
    assert.equal(ROOST_ID, "ghost.post_writing_corpus");
  });
  it("SCHEMA_VERSION equals 1.0.0", () => {
    assert.equal(SCHEMA_VERSION, "1.0.0");
  });
});

describe("post-pdf: nodes + bridge edges", () => {
  it("emits roost + 1 pivot = 2 nodes (no chapters)", () => {
    assert.equal(generate(parsedCorpora, sources, []).newNodes.length, 2);
  });
  it("roost is first node and ghost-roost", () => {
    const n = generate(parsedCorpora, sources, []).newNodes[0];
    assert.equal(n.id, ROOST_ID);
    assert.equal(n.kind, "ghost-roost");
  });
  it("emits 2 bridge-pdf-engine edges (one per engine)", () => {
    assert.equal(bridges(generate(parsedCorpora, sources, [])).length, 2);
  });
});

describe("post-pdf: bridge-edge resolution (U-VIZ-ROOST-BRIDGE-RESOLVE)", () => {
  it("no resolver -> bare class names preserved (back-compat)", () => {
    const r = generate(parsedCorpora, sources, []);
    const b = bridges(r);
    assert.equal(b.length, 2);
    assert.ok(b.every((e) => /Engine$/.test(e.to)), "to should be bare class names");
    assert.equal(r.stats.bridgesResolved, 0);
  });

  it("with resolver -> resolves to: node-id; un-graphed engine dropped (never a dangler)", () => {
    const map = { MasterPostProcessorEngine: "eng.cam.masterpostprocessorengine" };
    const idSet = new Set(Object.values(map));
    const resolver = { idSet, resolve: (ref, ids) => (ids.has(ref) ? ref : map[ref] || null) };
    const r = generate(parsedCorpora, sources, [], resolver);
    const b = bridges(r);
    assert.equal(b.length, 1, "the un-graphed FakeUngraphedXyzEngine edge is dropped");
    assert.equal(b[0].to, "eng.cam.masterpostprocessorengine");
    assert.equal(r.stats.bridgesResolved, 1);
    assert.equal(r.stats.bridgesDropped, 1);
  });

  it("resolver leaves the cross-domain PEER edges (site 2) untouched -- they already use node-ids", () => {
    const map = { MasterPostProcessorEngine: "eng.cam.masterpostprocessorengine" };
    const resolver = { idSet: new Set(Object.values(map)), resolve: (ref, ids) => (ids.has(ref) ? ref : map[ref] || null) };
    const withR = peers(generate(parsedCorpora, sources, [], resolver));
    const noR = peers(generate(parsedCorpora, sources, []));
    assert.equal(withR.length, CROSS_DOMAIN_PEERS.length, "one peer-edge set per source, unaffected by resolver");
    assert.deepEqual(withR.map((e) => e.to), noR.map((e) => e.to), "peer edge targets identical with/without resolver");
  });

  it("REAL oracle resolver (no mock): emitted bridge edges are eng.* node-ids, >=1 resolved", () => {
    const r = generate(parsedCorpora, sources, [], makeOracleResolver());
    const b = bridges(r);
    assert.ok(b.every((e) => e.to.startsWith("eng.")), "no bare class name survives folding");
    assert.ok(r.stats.bridgesResolved >= 1, "MasterPostProcessorEngine resolves against the live oracle");
  });
});
