#!/usr/bin/env node
import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  parseTipLine, collectExtractedPdfPaths, pdfLeaf, generate, SCHEMA_VERSION,
  ROOST_ID, EXTRACTED_PIVOT_ID, PENDING_PIVOT_ID, PLANNED_PARENT,
  ROOST_LAYER, PIVOT_LAYER, LEAF_LAYER, MAX_LABEL,
} from "./generate-pdf-coverage-features.mjs";

const tip1 = { id: "x1", tip: "y", source: { pdf_path: "H:/PRISM/x.pdf" }, bridge_engines: ["a"] };
const tip2 = { id: "x2", tip: "z", source: { pdf_path: "H:/PRISM/y.pdf" } };

const pdfA = { slug: "a", id: "a.pdf", kind: "blueprint-pdf", source: "H:/PRISM/x.pdf", source_type: "pdf", classification: { cad: true, cam: false } };
const pdfB = { slug: "b", id: "b.pdf", kind: "manual-pdf", source: "H:/PRISM/b.pdf", source_type: "pdf", classification: { cad: false, cam: true } };
const pdfC = { slug: "c", id: "c.pdf", kind: "resource-catalog", source: "H:/PRISM/y.pdf", source_type: "pdf", classification: { cad: true, cam: true } };
const courseD = { slug: "d", id: "d", kind: "mit-ocw", source: "courses/d", source_type: "course", classification: { cad: false, cam: false } };

test("parseTipLine parses valid tip line", () => {
  const r = parseTipLine(JSON.stringify(tip1));
  assert.equal(r.id, "x1");
  assert.equal(r.source.pdf_path, "H:/PRISM/x.pdf");
});

test("parseTipLine returns null on empty/blank", () => {
  assert.equal(parseTipLine(""), null);
  assert.equal(parseTipLine("   "), null);
  assert.equal(parseTipLine(null), null);
});

test("parseTipLine returns null on malformed json", () => {
  assert.equal(parseTipLine("not json"), null);
});

test("parseTipLine returns null when missing required fields", () => {
  assert.equal(parseTipLine(JSON.stringify({ id: "x" })), null);
  assert.equal(parseTipLine(JSON.stringify({ tip: "y" })), null);
  assert.equal(parseTipLine(JSON.stringify({ id: "x", tip: "y" })), null);
  assert.equal(parseTipLine(JSON.stringify({ id: "x", tip: "y", source: {} })), null);
});

test("collectExtractedPdfPaths gathers unique pdf paths", () => {
  const text = [JSON.stringify(tip1), JSON.stringify(tip2), JSON.stringify(tip1)].join("\n");
  const s = collectExtractedPdfPaths([text]);
  assert.equal(s.size, 2);
  assert.ok(s.has("H:/PRISM/x.pdf"));
  assert.ok(s.has("H:/PRISM/y.pdf"));
});

test("collectExtractedPdfPaths handles multiple files", () => {
  const s = collectExtractedPdfPaths([JSON.stringify(tip1), JSON.stringify(tip2)]);
  assert.equal(s.size, 2);
});

test("pdfLeaf with extracted=true points to extracted pivot + green status", () => {
  const n = pdfLeaf(pdfA, true);
  assert.equal(n.parent, EXTRACTED_PIVOT_ID);
  assert.equal(n.status, "ghost");
  assert.match(n.label, /^\[✓\]/);
});

test("pdfLeaf with extracted=false points to pending pivot + pending status", () => {
  const n = pdfLeaf(pdfB, false);
  assert.equal(n.parent, PENDING_PIVOT_ID);
  assert.equal(n.status, "ghost-pending");
  assert.match(n.label, /^\[○\]/);
});

test("pdfLeaf audience routing — cad-only → delta", () => {
  assert.match(pdfLeaf(pdfA, false).info, /→delta/);
});

test("pdfLeaf audience routing — cam-only → kilo", () => {
  assert.match(pdfLeaf(pdfB, false).info, /→kilo/);
});

test("pdfLeaf audience routing — both → delta+kilo", () => {
  assert.match(pdfLeaf(pdfC, false).info, /→delta\+kilo/);
});

test("generate emits roost + 2 pivots + leaf per PDF entry", () => {
  const r = generate({ cad: [pdfA, pdfC], cam: [pdfB, pdfC] }, new Set(["H:/PRISM/x.pdf"]), []);
  assert.equal(r.stats.roostEmitted, 1);
  assert.equal(r.stats.extractedPivot, 1);
  assert.equal(r.stats.pendingPivot, 1);
  // 3 unique PDFs (A, B, C — C dedup'd)
  assert.equal(r.stats.totalPdfs, 3);
  assert.equal(r.stats.extractedLeaves, 1); // pdfA matched
  assert.equal(r.stats.pendingLeaves, 2);   // pdfB + pdfC
});

test("generate dedupes entries by slug (cad+cam dual entries)", () => {
  const r = generate({ cad: [pdfC], cam: [pdfC], both: [pdfC] }, new Set(), []);
  // 1 unique PDF (C appears in cad+cam+both, deduped)
  assert.equal(r.stats.totalPdfs, 1);
});

test("generate skips non-PDF entries (course folders)", () => {
  const r = generate({ cad: [pdfA, courseD], cam: [] }, new Set(), []);
  assert.equal(r.stats.totalPdfs, 1);
});

test("generate is idempotent (existingNodeIds suppresses re-emit)", () => {
  const seeded = new Set([ROOST_ID, EXTRACTED_PIVOT_ID, PENDING_PIVOT_ID, "pdf-coverage.a"]);
  const r = generate({ cad: [pdfA, pdfB], cam: [] }, new Set(), seeded);
  assert.equal(r.stats.roostEmitted, 0);
  assert.equal(r.stats.extractedPivot, 0);
  assert.equal(r.stats.pendingPivot, 0);
  assert.equal(r.stats.skipped, 1); // pdfA's leaf was already in graph
});

test("generate handles empty corpus without crashing", () => {
  const r = generate({ cad: [], cam: [] }, new Set(), []);
  assert.equal(r.stats.totalPdfs, 0);
  assert.equal(r.newNodes.length, 3); // scaffolding only
});

test("generate handles null/missing corpus arrays", () => {
  const r = generate({}, new Set(), []);
  assert.equal(r.stats.totalPdfs, 0);
});

test("roost parents to ghost.planned_features at L8", () => {
  const r = generate({ cad: [pdfA], cam: [] }, new Set(), []);
  const roost = r.newNodes.find(n => n.id === ROOST_ID);
  assert.equal(roost.parent, PLANNED_PARENT);
  assert.equal(roost.layer, ROOST_LAYER);
});

test("pivots both parent to roost at L9", () => {
  const r = generate({ cad: [pdfA], cam: [] }, new Set(), []);
  const ext = r.newNodes.find(n => n.id === EXTRACTED_PIVOT_ID);
  const pend = r.newNodes.find(n => n.id === PENDING_PIVOT_ID);
  assert.equal(ext.parent, ROOST_ID);
  assert.equal(pend.parent, ROOST_ID);
  assert.equal(ext.layer, PIVOT_LAYER);
  assert.equal(pend.layer, PIVOT_LAYER);
});

test("leaves all at L10 with kind 'pdf-coverage'", () => {
  const r = generate({ cad: [pdfA, pdfB], cam: [] }, new Set(["H:/PRISM/x.pdf"]), []);
  const leaves = r.newNodes.filter(n => n.kind === "pdf-coverage");
  assert.equal(leaves.length, 2);
  for (const l of leaves) assert.equal(l.layer, LEAF_LAYER);
});

test("Set vs Array existingNodeIds both work", () => {
  const r1 = generate({ cad: [pdfA], cam: [] }, ["H:/PRISM/x.pdf"], [ROOST_ID]);
  const r2 = generate({ cad: [pdfA], cam: [] }, new Set(["H:/PRISM/x.pdf"]), new Set([ROOST_ID]));
  assert.equal(r1.stats.roostEmitted, 0);
  assert.equal(r2.stats.roostEmitted, 0);
});

test("byte-stable on repeat (idempotent generate)", () => {
  const r1 = generate({ cad: [pdfA, pdfB], cam: [] }, new Set(["H:/PRISM/x.pdf"]), []);
  const r2 = generate({ cad: [pdfA, pdfB], cam: [] }, new Set(["H:/PRISM/x.pdf"]), []);
  assert.deepEqual(r1.newNodes, r2.newNodes);
});

test("SCHEMA_VERSION is semver-like", () => {
  assert.match(SCHEMA_VERSION, /^\d+\.\d+\.\d+$/);
});

test("leaf label truncated to MAX_LABEL", () => {
  const longSlug = "x".repeat(200);
  const long = { ...pdfA, slug: longSlug };
  const n = pdfLeaf(long, false);
  assert.ok(n.label.length <= MAX_LABEL);
});

test("newEdges array empty by design (parent links carry hierarchy)", () => {
  const r = generate({ cad: [pdfA], cam: [] }, new Set(), []);
  assert.ok(Array.isArray(r.newEdges));
  assert.equal(r.newEdges.length, 0);
});
