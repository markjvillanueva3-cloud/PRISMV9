// scripts/ocr-al-queue-surface.test.mjs
// Real reference-value tests for the OCR active-learning-queue GOLD-verification surface.
// Run: node --test scripts/ocr-al-queue-surface.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { dedupRows, profileRow, goldReadiness, surfaceAlQueue, renderMarkdown } from "./ocr-al-queue-surface.mjs";

// A realistic AL-queue row (shape verified against the live corpus-train queue).
const row = (key, page, { corr = 0, amb = 0, hall = 0, conf = 0.99 } = {}) => ({
  key, page, part: `${key}#p${page}`, image: `H:/x/${key}`,
  reasons: [`${amb} ambiguous pair(s)`, `${hall} hallucination candidate(s)`],
  summary: {
    n_models: 2, models: ["qwen3-vl:8b-instruct", "qwen2.5vl:7b"], quorum: 2,
    n_clusters: corr + hall, n_corroborated: corr, n_singleton: hall,
    n_hallucination_candidates: hall, n_ambiguous_pairs: amb,
    mean_agreement_confidence_corroborated: conf, consensus_dim_count: corr,
  },
});

test("dedupRows: last-wins by key+page; counts dropped duplicates; ignores non-objects", () => {
  const rows = [row("a.pdf", 0, { corr: 3 }), row("a.pdf", 0, { corr: 9 }), row("a.pdf", 1, { corr: 1 }), null, "garbage"];
  const { deduped, dropped } = dedupRows(rows);
  assert.equal(deduped.length, 2, "a#0 and a#1 are the 2 distinct key+page");
  assert.equal(dropped, 3, "1 duplicate a#0 + 2 non-objects dropped");
  const a0 = deduped.find((r) => r.page === 0);
  assert.equal(a0.summary.n_corroborated, 9, "LAST a#0 row wins (corr 9, not 3) -- reaper-kill resume safety");
});

test("dedupRows: non-array input is safe (never throws)", () => {
  assert.deepEqual(dedupRows(null), { deduped: [], dropped: 0 });
  assert.deepEqual(dedupRows(undefined), { deduped: [], dropped: 0 });
});

test("profileRow: extracts GOLD-verification fields; missing summary collapses to 0 (no NaN)", () => {
  const p = profileRow(row("d22706-38.pdf", 0, { corr: 9, amb: 51, hall: 20, conf: 0.99 }));
  assert.equal(p.key, "d22706-38.pdf");
  assert.equal(p.corroborated, 9);
  assert.equal(p.ambiguous, 51);
  assert.equal(p.hallucination, 20);
  assert.equal(p.mean_conf, 0.99);
  // adversarial: a row with NO summary must not produce NaN
  const bare = profileRow({ key: "x.pdf", page: 2 });
  assert.equal(bare.corroborated, 0);
  assert.equal(bare.ambiguous, 0);
  assert.equal(Number.isNaN(bare.mean_conf), false);
  assert.equal(bare.page, 2);
});

test("goldReadiness: increases with corroborated dims, decreases with noise; noise-free == conf-weighted corrob", () => {
  const clean = goldReadiness({ corroborated: 10, mean_conf: 1, ambiguous: 0, hallucination: 0 });
  assert.equal(clean, 10, "noise-free, full-confidence print scores exactly its corroborated-dim count");
  const noisy = goldReadiness({ corroborated: 10, mean_conf: 1, ambiguous: 50, hallucination: 20 });
  assert.ok(noisy < clean, "same GOLD dims but heavy noise -> lower readiness");
  const fewer = goldReadiness({ corroborated: 4, mean_conf: 1, ambiguous: 0, hallucination: 0 });
  assert.ok(fewer < clean, "fewer corroborated dims -> lower readiness");
  // zero corroborated dims -> zero readiness regardless of noise
  assert.equal(goldReadiness({ corroborated: 0, mean_conf: 0, ambiguous: 5, hallucination: 5 }), 0);
});

test("surfaceAlQueue: aggregates GOLD/ambiguous/halluc pools and ranks densest-GOLD first", () => {
  const rows = [
    row("low.pdf", 0, { corr: 2, amb: 40, hall: 30 }),   // low readiness (few GOLD, much noise)
    row("high.pdf", 0, { corr: 12, amb: 1, hall: 0 }),    // high readiness (many GOLD, clean)
    row("mid.pdf", 0, { corr: 6, amb: 5, hall: 5 }),
  ];
  const s = surfaceAlQueue(rows);
  assert.equal(s.total_rows, 3);
  assert.equal(s.distinct_prints, 3);
  assert.equal(s.total_corroborated_dims, 20, "2 + 12 + 6 GOLD-candidate dims");
  assert.equal(s.total_ambiguous, 46);
  assert.equal(s.total_hallucination, 35);
  assert.equal(s.prints[0].key, "high.pdf", "densest clean GOLD ranked first (verify-first)");
  assert.equal(s.prints[2].key, "low.pdf", "noisy low-GOLD ranked last");
});

test("surfaceAlQueue: empty + malformed input is safe", () => {
  const s = surfaceAlQueue([]);
  assert.equal(s.distinct_prints, 0);
  assert.equal(s.total_corroborated_dims, 0);
  assert.deepEqual(surfaceAlQueue(null).prints, []);
});

test("renderMarkdown: surfaces headline GOLD-candidate count + a ranked table + honest read-only framing", () => {
  const s = surfaceAlQueue([row("p1.pdf", 0, { corr: 9, amb: 2, hall: 1 }), row("p2.pdf", 0, { corr: 3, amb: 0, hall: 0 })]);
  const md = renderMarkdown(s, { top: 10, generatedAt: "2026-06-16T00:00:00Z" });
  assert.match(md, /GOLD-candidate dims \(corroborated, ready to confirm\):\*\* 12/);
  assert.match(md, /\| p1\.pdf \| 0 \| 9 \|/, "p1 (9 GOLD) appears in the ranked table");
  assert.match(md, /READ-ONLY/, "honest framing: tool never writes GOLD");
  assert.match(md, /generated: 2026-06-16T00:00:00Z/);
});

test("renderMarkdown: --top truncates the table but headline totals stay full", () => {
  const rows = Array.from({ length: 8 }, (_, i) => row(`p${i}.pdf`, 0, { corr: 10 - i }));
  const s = surfaceAlQueue(rows);
  const md = renderMarkdown(s, { top: 3 });
  const tableRows = md.split("\n").filter((l) => /^\| \d+ \|/.test(l));
  assert.equal(tableRows.length, 3, "only top-3 rows shown");
  assert.match(md, /Distinct prints needing review:\*\* 8/, "headline still counts all 8");
});
