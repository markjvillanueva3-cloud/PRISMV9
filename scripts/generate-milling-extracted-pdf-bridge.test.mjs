// Tests for generate-milling-extracted-pdf-bridge.mjs (VIZ-XGAL-MILL-PDF-WIRE, slot:sierra).
// Hermetic: loadPeerAug cases use a tmp dir; generate() cases use in-memory mocks -- no
// dependency on the live graph, the whiskey ledger, or the peer augmentation. Run directly:
// `node scripts/generate-milling-extracted-pdf-bridge.test.mjs` (node:test auto-runs on exit;
// `node --test` reports 0 in this env per the harness note). Importing the module does NOT run
// main() (the isMain guard sees the test file as argv[1], not the generator).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { __test } from "./generate-milling-extracted-pdf-bridge.mjs";

const { loadPeerAug, generate, safeSlug, CURRICULUM_ENGINE_ID, MILL_FACADE_ENGINE_ID, ROOST_ID } = __test;

// --- loadPeerAug: the crash-prevention hardening (the whole point of the wire) ---

test("loadPeerAug: MISSING file -> fail-soft {newNodes:[]} (does NOT throw -> regen never crashes)", () => {
  const missing = path.join(os.tmpdir(), `prism-mxpb-missing-${process.pid}.json`);
  try { fs.unlinkSync(missing); } catch { /* ensure absent */ }
  const r = loadPeerAug(missing);
  assert.deepEqual(r, { newNodes: [] }, "absent peer aug must yield an empty bridge, not a thrown error");
});

test("loadPeerAug: CORRUPT json -> fail-soft {newNodes:[]} (try/catch, no throw)", () => {
  const p = path.join(os.tmpdir(), `prism-mxpb-corrupt-${process.pid}.json`);
  fs.writeFileSync(p, "{ this is : not json ]");
  try {
    const r = loadPeerAug(p);
    assert.deepEqual(r, { newNodes: [] }, "unparseable peer aug must fail soft");
  } finally { try { fs.unlinkSync(p); } catch { /* ignore */ } }
});

test("loadPeerAug: VALID json -> parsed object returned verbatim", () => {
  const p = path.join(os.tmpdir(), `prism-mxpb-valid-${process.pid}.json`);
  fs.writeFileSync(p, JSON.stringify({ newNodes: [{ id: "x" }], extra: 1 }));
  try {
    const r = loadPeerAug(p);
    assert.equal(r.newNodes.length, 1);
    assert.equal(r.extra, 1);
  } finally { try { fs.unlinkSync(p); } catch { /* ignore */ } }
});

// --- generate(): node/edge emission + the canonical-edge-id regression lock ---

const peerNode = (suffix) => ({ id: `${ROOST_ID}.${suffix}` });
const extraction = (slug, over = {}) => ({ slug, rows: 3, pages: 5, title: slug, ...over });

test("generate: matched parent -> 1 L11 node + 3 edges with correct shape", () => {
  const { newNodes, newEdges, stats } = generate([extraction("op-manual")], [peerNode("mill.op-manual")]);
  assert.equal(newNodes.length, 1);
  assert.equal(stats.bridged, 1);
  assert.equal(stats.unmatched, 0);
  const n = newNodes[0];
  assert.equal(n.id, `${ROOST_ID}.mill.op-manual.extracted`);
  assert.equal(n.layer, "L11");
  assert.equal(n.parent, `${ROOST_ID}.mill.op-manual`);
  assert.equal(n.kind, "extracted-pages");
  assert.equal(n.pages, 5);
  assert.equal(n.rows, 3);
  assert.equal(newEdges.length, 3);
});

test("generate: REGRESSION LOCK -- edges target the REAL eng.* node ids, never engine.<PascalCase>", () => {
  // This is the defect that made the whole bridge cosmetic: the original consumed-by /
  // feeds-wizard edges pointed at engine.KnowledgeCurriculumBridgeEngine (no such graph node),
  // so all downstream edges dangled. Lock the corrected canonical ids.
  const { newEdges } = generate([extraction("x")], [peerNode("mill.x")]);
  const byKind = Object.fromEntries(newEdges.map((e) => [e.kind, e.to]));
  assert.equal(byKind["page-extracts"], `${ROOST_ID}.mill.x.extracted`);
  assert.equal(byKind["consumed-by"], CURRICULUM_ENGINE_ID);
  assert.equal(byKind["feeds-wizard"], MILL_FACADE_ENGINE_ID);
  assert.match(CURRICULUM_ENGINE_ID, /^eng\./, "must be the eng.* convention, not engine.<PascalCase>");
  assert.match(MILL_FACADE_ENGINE_ID, /^eng\./, "must be the eng.* convention, not engine.<PascalCase>");
});

test("generate: UNMATCHED slug -> stats.unmatched++, no node, slug recorded in unmatchedSlugs (failure mode)", () => {
  const { newNodes, stats } = generate([extraction("nowhere")], [peerNode("mill.something-else")]);
  assert.equal(newNodes.length, 0);
  assert.equal(stats.bridged, 0);
  assert.equal(stats.unmatched, 1);
  // The unmatched slug must be surfaced as an inspectable gap (the actionable list for echo's
  // corpus ingestion), not silently dropped.
  assert.deepEqual(stats.unmatchedSlugs, ["nowhere"]);
});

test("generate: unmatchedSlugs is sorted + count-consistent with stats.unmatched (multi)", () => {
  // candidates probe mill..lathe; none of these slugs have a peer parent -> all unmatched.
  const { stats } = generate(
    [extraction("zeta"), extraction("alpha"), extraction("mike")],
    [peerNode("mill.unrelated")],
  );
  assert.equal(stats.unmatched, 3);
  assert.equal(stats.unmatchedSlugs.length, stats.unmatched, "list length must equal the count");
  assert.deepEqual(stats.unmatchedSlugs, ["alpha", "mike", "zeta"], "deterministic sorted output");
});

test("generate: EMPTY extractions -> 0 nodes / 0 edges (edge case)", () => {
  const { newNodes, newEdges, stats } = generate([], [peerNode("mill.x")]);
  assert.equal(newNodes.length, 0);
  assert.equal(newEdges.length, 0);
  assert.equal(stats.extractions_total, 0);
});

test("generate: ADVERSARIAL candidate order -- mill parent wins over cam when both exist", () => {
  // candidates are probed mill -> cam -> reference -> post -> cad -> lathe; first hit wins.
  const peers = [peerNode("cam.dual"), peerNode("mill.dual")];
  const { newNodes } = generate([extraction("dual")], peers);
  assert.equal(newNodes[0].parent, `${ROOST_ID}.mill.dual`, "mill is probed before cam");
});

test("generate: ADVERSARIAL -- only a lathe parent exists -> still bridges via the last candidate", () => {
  const { newNodes, stats } = generate([extraction("only-lathe")], [peerNode("lathe.only-lathe")]);
  assert.equal(stats.bridged, 1);
  assert.equal(newNodes[0].parent, `${ROOST_ID}.lathe.only-lathe`);
});

// --- safeSlug: adversarial sanitization ---

test("safeSlug: special chars collapse to single dashes + lowercase", () => {
  assert.equal(safeSlug("Hello World!.PDF"), "hello-world-pdf");
  assert.equal(safeSlug("a___b---c"), "a___b-c"); // runs of dashes collapse; underscores kept
});

test("safeSlug: empty/null -> 'x' fallback (never empty)", () => {
  assert.equal(safeSlug(""), "x");
  assert.equal(safeSlug(null), "x");
  assert.equal(safeSlug(undefined), "x");
});

test("safeSlug: truncates to 60 chars", () => {
  const long = "a".repeat(200);
  assert.equal(safeSlug(long).length, 60);
});
