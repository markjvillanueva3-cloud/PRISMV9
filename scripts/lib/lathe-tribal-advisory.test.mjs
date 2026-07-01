#!/usr/bin/env node
/**
 * Tests for lathe-tribal-advisory.mjs.
 * Run: node scripts/lib/lathe-tribal-advisory.test.mjs
 * R9: real relevance values + topic-weight + filter/dedup/sort invariants.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildQueryKeywords, relevantTips } from "./lathe-tribal-advisory.mjs";

const TIPS = [
  { tip: "Use spiral-point taps for efficient tapping in various materials.", topic: "Tapping", source: "H:/r/cat.pdf" },
  { tip: "For boring bars, keep L/D under 4 in steel to avoid chatter.", topic: "Boring", source: "x/boring.pdf" },
  { tip: "Ensure the machine is not powered from a noisy electrical source.", topic: "Safety", source: "y/osp.pdf" },
  { tip: "Use a wider parting blade for large bar diameters to keep rigidity.", topic: "Parting", source: "z/part.pdf" },
];

// ---- buildQueryKeywords ---------------------------------------------------
test("buildQueryKeywords: op-type expands to keywords + material tokens (>=3 chars)", () => {
  const kw = buildQueryKeywords(["od_thread"], "1018 Steel");
  assert.ok(kw.includes("thread"));
  assert.ok(kw.includes("tapping"));
  assert.ok(kw.includes("1018"));
  assert.ok(kw.includes("steel"));
  assert.ok(!kw.includes("1"), "short tokens dropped");
});
test("buildQueryKeywords: empty ops + empty material -> []", () => {
  assert.deepEqual(buildQueryKeywords([], ""), []);
  assert.deepEqual(buildQueryKeywords(undefined, undefined), []);
});

// ---- relevantTips: relevance routing -------------------------------------
test("threading op surfaces the tapping tip (topic-weighted)", () => {
  const r = relevantTips(TIPS, { opTypes: ["od_thread"] }, 3);
  assert.ok(r.length >= 1);
  assert.equal(r[0].topic, "Tapping");        // topic "Tapping" matches "tapping" (+2) + text (+1)
  assert.ok(r[0].score >= 3);
  assert.equal(r[0].source, "cat.pdf");        // basename only
});
test("boring op surfaces the boring tip, NOT the safety tip", () => {
  const r = relevantTips(TIPS, { opTypes: ["bore_rough"] }, 3);
  assert.equal(r[0].topic, "Boring");
  assert.ok(!r.some((t) => t.topic === "Safety"), "irrelevant safety tip excluded (score 0)");
});
test("part_off op surfaces the parting tip", () => {
  const r = relevantTips(TIPS, { opTypes: ["part_off"] }, 3);
  assert.equal(r[0].topic, "Parting");
  assert.ok(r[0].score >= 3); // "Parting"(+2) + "parting"(+1) + "blade"(+1)
});

// ---- filtering / topN / dedup / determinism ------------------------------
test("score-0 tips are filtered out (only relevant surface)", () => {
  // a query with no op + only a material that no tip mentions -> nothing scores
  const r = relevantTips(TIPS, { opTypes: ["face_finish"], materialName: "inconel" }, 3);
  assert.equal(r.length, 0); // no tip mentions face/facing/inconel
});

// WORD-BOUNDARY: short tokens (od/id) must NOT false-match inside words (method/fluids). [scrutiny P2]
test("short tokens od/id do not substring-match inside words", () => {
  const collide = [
    { tip: "Always check coolant fluids and follow the recommended method.", topic: "Coolants", source: "c.pdf" },
  ];
  // id_rough expands to bore/boring/internal/id -- "fluids" contains 'id', "method" contains 'od' (od is not in id_rough),
  // but with word boundaries neither matches -> excluded.
  assert.equal(relevantTips(collide, { opTypes: ["id_rough"] }, 3).length, 0);
  // a genuine standalone "ID" token DOES still match (word boundary holds for the real term).
  const real = [{ tip: "Bore the ID to size with a boring bar.", topic: "Boring", source: "b.pdf" }];
  assert.ok(relevantTips(real, { opTypes: ["id_rough"] }, 3).length >= 1);
});
test("topN caps the result count", () => {
  const r = relevantTips(TIPS, { opTypes: ["od_rough", "bore_rough", "part_off", "od_thread"] }, 2);
  assert.equal(r.length, 2);
});
test("identical tip text is de-duplicated (same advice from multiple catalogs)", () => {
  const dup = [
    { tip: "Use a wider parting blade for large bars.", topic: "Parting", source: "a.pdf" },
    { tip: "Use a wider parting blade for large bars.", topic: "Parting", source: "b.pdf" },
  ];
  const r = relevantTips(dup, { opTypes: ["part_off"] }, 5);
  assert.equal(r.length, 1);
});
test("results sorted by score descending", () => {
  const r = relevantTips(TIPS, { opTypes: ["od_rough", "bore_rough", "part_off"] }, 5);
  for (let i = 1; i < r.length; i++) assert.ok(r[i - 1].score >= r[i].score);
});

// ---- adversarial ---------------------------------------------------------
test("empty/null corpus and malformed tips -> [] (no throw)", () => {
  assert.deepEqual(relevantTips([], { opTypes: ["part_off"] }), []);
  assert.deepEqual(relevantTips(null, { opTypes: ["part_off"] }), []);
  const malformed = [{ topic: "X" }, { tip: "" }, null, { tip: "   ", topic: "Y" }];
  assert.deepEqual(relevantTips(malformed, { opTypes: ["part_off"] }), []);
});
