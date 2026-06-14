/**
 * Tests for galaxy-context-retrieval.mjs (AI-SYNERGY-AUDIT-MS0/U-AISYN-RAG).
 * The load-bearing tests prove this is REAL retrieval (ranking VARIES by question) and
 * that the relevance floor + per-source diversity hold. Scoring is delegated to the
 * shared lexical-rerank (tested separately); here we verify chunking + retrieval. Run:
 *   node --test scripts/lib/galaxy-context-retrieval.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { chunkMarkdown, scoreChunks, retrieveTopK } from "./galaxy-context-retrieval.mjs";

const DOC = `---
title: mill galaxy
---
# Speed and feed
Kienzle cutting force and chip thickness for milling. Spindle rpm from surface speed.

# Workholding
Vise and fixture clamping. Kurt DX6 jaw force for a steel block.

# Coolant
Through-spindle coolant pressure and flood for deep pockets.
`;

// --- chunkMarkdown ---
test("chunkMarkdown: splits on headings, strips frontmatter, tags source + heading", () => {
  const chunks = chunkMarkdown(DOC, "mill/CLAUDE.md");
  assert.equal(chunks.length, 3);
  assert.deepEqual(chunks.map((c) => c.heading), ["Speed and feed", "Workholding", "Coolant"]);
  assert.ok(chunks.every((c) => c.source === "mill/CLAUDE.md"));
  assert.ok(!chunks[0].text.includes("title:")); // frontmatter gone
});

test("chunkMarkdown: hard-splits an oversized section on blank lines", () => {
  const big = "# Big\n" + Array.from({ length: 6 }, (_, i) => `Para ${i} ${"x".repeat(300)}`).join("\n\n");
  const chunks = chunkMarkdown(big, "s", { maxChars: 500 });
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((c) => c.heading === "Big"));
  assert.ok(chunks.every((c) => c.text.length <= 900)); // bounded (one para can exceed slightly)
});

test("chunkMarkdown: ADVERSARIAL empty/whitespace/non-string -> []", () => {
  assert.deepEqual(chunkMarkdown("", "s"), []);
  assert.deepEqual(chunkMarkdown("   \n\n  ", "s"), []);
  assert.deepEqual(chunkMarkdown(null, "s"), []);
});

// --- THE LOAD-BEARING TESTS: ranking VARIES by question (real RAG, not a fixed dump) ---
test("scoreChunks: the top chunk DIFFERS by question (proves real retrieval)", () => {
  const chunks = chunkMarkdown(DOC, "mill/CLAUDE.md");
  const forQ1 = scoreChunks(chunks, "how do I compute cutting force and rpm?");
  const forQ2 = scoreChunks(chunks, "what clamps the workpiece, vise jaw force?");
  assert.equal(forQ1[0].heading, "Speed and feed");
  assert.equal(forQ2[0].heading, "Workholding");
  assert.notEqual(forQ1[0].heading, forQ2[0].heading); // ranking is query-dependent
});

test("scoreChunks: a heading-term match ranks that section top (labelHit via lexical-rerank)", () => {
  const chunks = chunkMarkdown(DOC, "s");
  const ranked = scoreChunks(chunks, "coolant pressure");
  assert.equal(ranked[0].heading, "Coolant");
  assert.ok(ranked[0].score > 0);
});

test("scoreChunks: ADVERSARIAL empty query or no chunks -> [] (no throw)", () => {
  assert.deepEqual(scoreChunks(chunkMarkdown(DOC, "s"), ""), []);
  assert.deepEqual(scoreChunks([], "force"), []);
  assert.deepEqual(scoreChunks(null, "force"), []);
});

test("scoreChunks: deterministic -- same inputs twice are byte-identical (PURE)", () => {
  const chunks = chunkMarkdown(DOC, "s");
  assert.deepEqual(scoreChunks(chunks, "force rpm"), scoreChunks(chunks, "force rpm"));
});

// --- retrieveTopK: diversity + floor ---
test("retrieveTopK: caps chunks per source so one doc cannot monopolize", () => {
  const many = [];
  for (let i = 0; i < 6; i++) many.push({ source: "A.md", heading: `force rpm h${i}`, text: `force rpm cutting section ${i}` });
  many.push({ source: "B.md", heading: "force rpm b", text: "force rpm cutting in B" });
  const top = retrieveTopK(many, "force rpm cutting", { k: 5, perSourceCap: 2 });
  const fromA = top.filter((c) => c.source === "A.md").length;
  assert.ok(fromA <= 2, `expected <=2 from A, got ${fromA}`);
  assert.ok(top.some((c) => c.source === "B.md"));
});

test("retrieveTopK: off-topic question returns FEWER/zero chunks (floor), not forced noise", () => {
  const chunks = chunkMarkdown(DOC, "s");
  const off = retrieveTopK(chunks, "quantum chromodynamics lepton baryon", { k: 5 });
  assert.equal(off.length, 0); // nothing relevant -> honest empty (vs a fixed dump)
  const on = retrieveTopK(chunks, "coolant", { k: 5 });
  assert.ok(on.length >= 1);
});

test("retrieveTopK: respects k", () => {
  const chunks = chunkMarkdown(DOC, "s");
  const top = retrieveTopK(chunks, "force vise coolant rpm jaw", { k: 2 });
  assert.ok(top.length <= 2);
});
