#!/usr/bin/env node
import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  parseTipsJsonl, bookSlug, generate, SCHEMA_VERSION,
  ROOST_ID, PLANNED_PARENT, ROOST_LAYER, PIVOT_LAYER, TIP_LAYER, MAX_LABEL,
} from "./generate-extracted-pdf-tips-features.mjs";

const t1 = { id: "foc-001", domain: "general", topic: "climb-vs-conventional", tip: "Climb on CNC always",
  source: { book: "Fundamentals of CNC Machining", pdf_path: "x.pdf" }, audience: ["alpha","delta"] };
const t2 = { id: "foc-002", domain: "mill", topic: "stepover", tip: "Roughing 50-80%",
  source: { book: "Fundamentals of CNC Machining" }, audience: ["kilo"] };
const t3 = { id: "sw-001", domain: "cad", topic: "extrude", tip: "Use Extrude Boss for solid features",
  source: { book: "Engineering Graphics with SOLIDWORKS 2021" }, audience: ["delta"] };

test("parseTipsJsonl parses valid jsonl lines", () => {
  const text = JSON.stringify(t1) + "\n" + JSON.stringify(t2) + "\n";
  const r = parseTipsJsonl(text);
  assert.equal(r.length, 2);
  assert.equal(r[0].id, "foc-001");
});

test("parseTipsJsonl skips blank lines + malformed JSON", () => {
  const text = JSON.stringify(t1) + "\n\nthis is not json\n" + JSON.stringify(t2) + "\n";
  const r = parseTipsJsonl(text);
  assert.equal(r.length, 2);
});

test("parseTipsJsonl skips objects missing id or tip", () => {
  const bad = JSON.stringify({ id: "x" }) + "\n" + JSON.stringify({ tip: "y" }) + "\n" + JSON.stringify(t1) + "\n";
  const r = parseTipsJsonl(bad);
  assert.equal(r.length, 1);
  assert.equal(r[0].id, "foc-001");
});

test("parseTipsJsonl handles empty + whitespace input", () => {
  assert.deepEqual(parseTipsJsonl(""), []);
  assert.deepEqual(parseTipsJsonl("   \n  \n"), []);
});

test("bookSlug produces kebab-case slugs", () => {
  assert.equal(bookSlug("Fundamentals of CNC Machining"), "fundamentals-of-cnc-machining");
  assert.equal(bookSlug("Engineering Graphics with SOLIDWORKS 2021"), "engineering-graphics-with-solidworks-2021");
});

test("bookSlug handles edge inputs", () => {
  assert.equal(bookSlug(""), "unknown-book");
  assert.equal(bookSlug(null), "unknown-book");
  assert.equal(bookSlug(undefined), "unknown-book");
  assert.equal(bookSlug("!!! special !!!"), "special");
});

test("bookSlug truncates at 60 chars", () => {
  const s = bookSlug("a".repeat(200));
  assert.ok(s.length <= 60);
});

test("generate emits roost + book pivots + tip leaves", () => {
  const { newNodes, stats } = generate([t1, t2, t3], []);
  // 1 roost + 2 book pivots + 3 tips = 6
  assert.equal(newNodes.length, 6);
  assert.equal(stats.roostEmitted, 1);
  assert.equal(stats.books, 2);
  assert.equal(stats.pivotsEmitted, 2);
  assert.equal(stats.tipsEmitted, 3);
  assert.equal(stats.tipsSkipped, 0);
});

test("roost parents to ghost.planned_features at L8", () => {
  const { newNodes } = generate([t1], []);
  const roost = newNodes.find(n => n.id === ROOST_ID);
  assert.ok(roost);
  assert.equal(roost.parent, PLANNED_PARENT);
  assert.equal(roost.layer, ROOST_LAYER);
  assert.equal(roost.kind, "ghost-roost");
});

test("book pivots parent to roost at L9", () => {
  const { newNodes } = generate([t1, t3], []);
  const pivots = newNodes.filter(n => n.layer === PIVOT_LAYER);
  assert.equal(pivots.length, 2);
  for (const p of pivots) {
    assert.equal(p.parent, ROOST_ID);
    assert.equal(p.kind, "ghost-roost");
  }
});

test("tip leaves parent to their book pivot at L10", () => {
  const { newNodes } = generate([t1, t2], []);
  const leaves = newNodes.filter(n => n.kind === "tribal-tip");
  assert.equal(leaves.length, 2);
  for (const l of leaves) {
    assert.equal(l.layer, TIP_LAYER);
    assert.ok(l.parent.startsWith(ROOST_ID + "."));
  }
});

test("tip info encodes audience routing", () => {
  const { newNodes } = generate([t1], []);
  const leaf = newNodes.find(n => n.kind === "tribal-tip");
  assert.match(leaf.info, /→alpha,delta/);
});

test("existing-id Set suppresses re-emission (idempotency)", () => {
  const seeded = new Set([ROOST_ID, `${ROOST_ID}.fundamentals-of-cnc-machining`, "tribal-tip.foc-001"]);
  const { newNodes, stats } = generate([t1, t2], seeded);
  assert.equal(stats.roostEmitted, 0);
  assert.equal(stats.pivotsEmitted, 0);
  assert.equal(stats.pivotsSkipped, 1);
  assert.equal(stats.tipsEmitted, 1);
  assert.equal(stats.tipsSkipped, 1);
});

test("handles empty tips array (still emits the roost)", () => {
  const { newNodes, stats } = generate([], []);
  assert.equal(newNodes.length, 1); // just the roost
  assert.equal(stats.tipsEmitted, 0);
  assert.equal(stats.books, 0);
});

test("handles tip missing source.book (falls back to 'Unknown Book')", () => {
  const orphan = { id: "x-1", topic: "y", tip: "z", source: {} };
  const { newNodes, stats } = generate([orphan], []);
  assert.equal(stats.books, 1);
  const pivot = newNodes.find(n => n.layer === PIVOT_LAYER);
  assert.match(pivot.label, /Unknown Book/);
});

test("labels truncated to MAX_LABEL", () => {
  const longTopic = "x".repeat(200);
  const long = { ...t1, id: "long", topic: longTopic };
  const { newNodes } = generate([long], []);
  const leaf = newNodes.find(n => n.id === "tribal-tip.long");
  assert.ok(leaf.label.length <= MAX_LABEL);
});

test("Set vs Array existingNodeIds both work", () => {
  const r1 = generate([t1], [ROOST_ID]);
  const r2 = generate([t1], new Set([ROOST_ID]));
  assert.equal(r1.stats.roostEmitted, 0);
  assert.equal(r2.stats.roostEmitted, 0);
});

test("re-running with identical input is byte-stable", () => {
  const r1 = generate([t1, t2, t3], []);
  const r2 = generate([t1, t2, t3], []);
  assert.deepEqual(r1.newNodes, r2.newNodes);
});

test("SCHEMA_VERSION is semver-like", () => {
  assert.match(SCHEMA_VERSION, /^\d+\.\d+\.\d+$/);
});

test("newEdges is an empty array by design (parent links carry hierarchy)", () => {
  const { newEdges } = generate([t1], []);
  assert.ok(Array.isArray(newEdges));
  assert.equal(newEdges.length, 0);
});
