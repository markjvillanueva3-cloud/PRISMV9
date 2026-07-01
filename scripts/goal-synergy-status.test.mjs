#!/usr/bin/env node
/**
 * Tests for goal-synergy-status.mjs (/goal synergy iter 10, echo).
 *
 * Run: node --test scripts/goal-synergy-status.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { extractMetrics, rollup, SCHEMA_VERSION } from "./goal-synergy-status.mjs";

// ───────────────────────── extractMetrics ─────────────────────────

test("extractMetrics: link-audit valid → normalized record", () => {
  const a = { generatedAt: "2026-05-21T00:00:00Z", stats: { linksTotal: 100, linksBroken: 4, filesScanned: 10 } };
  const r = extractMetrics(a, "link-audit");
  assert.equal(r.present, true);
  assert.equal(r.stats.linksTotal, 100);
  assert.equal(r.stats.linksBroken, 4);
  assert.equal(r.stats.brokenRatio, 0.04);
  assert.ok(r.summary.includes("4"));
  assert.ok(r.summary.includes("100"));
});

test("extractMetrics: wiki-tribal valid → normalized record", () => {
  const a = { generatedAt: "2026-05-21T00:00:00Z", stats: { wikiFiles: 1000, missing: 500, stale: 0, coverage: 0.5 } };
  const r = extractMetrics(a, "wiki-tribal");
  assert.equal(r.present, true);
  assert.equal(r.stats.wikiFiles, 1000);
  assert.equal(r.stats.coverage, 0.5);
  assert.ok(r.summary.includes("50.0%"));
});

test("extractMetrics: missing/null/wrong-shape → null (fail-soft)", () => {
  assert.equal(extractMetrics(null, "link-audit"), null);
  assert.equal(extractMetrics({}, "link-audit"), null);
  assert.equal(extractMetrics({ stats: null }, "link-audit"), null);
  assert.equal(extractMetrics({ stats: {} }, "unknown-kind"), null);
});

test("extractMetrics: link-audit zero-total → ratio 0 (no div-by-zero)", () => {
  const a = { stats: { linksTotal: 0, linksBroken: 0 } };
  assert.equal(extractMetrics(a, "link-audit").stats.brokenRatio, 0);
});

test("extractMetrics: wiki-tribal coverage clamped to [0,1]", () => {
  const a1 = { stats: { wikiFiles: 100, missing: 50, coverage: -0.5 } };
  assert.equal(extractMetrics(a1, "wiki-tribal").stats.coverage, 0);
  const a2 = { stats: { wikiFiles: 100, missing: 50, coverage: 1.5 } };
  assert.equal(extractMetrics(a2, "wiki-tribal").stats.coverage, 1);
  const a3 = { stats: { wikiFiles: 100, missing: 50, coverage: NaN } };
  assert.equal(extractMetrics(a3, "wiki-tribal").stats.coverage, 0);
});

// ───────────────────────── rollup ─────────────────────────

test("rollup: all three healthy → healthy=true, no drift surfaces", () => {
  const linkAudit = { stats: { linksTotal: 1000, linksBroken: 5 } }; // 0.5% < 2% threshold
  const wikiTribal = { stats: { wikiFiles: 100, missing: 5, coverage: 0.95 } }; // gap 0.05 < 0.10 threshold
  const aiMemoXref = { stats: { engineCount: 7, memoCount: 800, missing: 0, coverage: 1.0 } }; // gap 0 < 0.10
  const r = rollup({ linkAudit, wikiTribal, aiMemoXref });
  assert.equal(r.healthy, true);
  assert.deepEqual(r.driftSurfaces, []);
});

test("rollup: ai-memo-xref drift flags ai-memo-xref surface (kebab-case)", () => {
  // iter-17: prism-ai-memo substrate drifted (coverage 0.43 → gap 0.57 > 0.10).
  const linkAudit = { stats: { linksTotal: 1000, linksBroken: 5 } }; // healthy
  const wikiTribal = { stats: { wikiFiles: 100, missing: 5, coverage: 0.95 } }; // healthy
  const aiMemoXref = { stats: { engineCount: 7, memoCount: 863, missing: 4, coverage: 0.4286 } };
  const r = rollup({ linkAudit, wikiTribal, aiMemoXref });
  assert.equal(r.healthy, false, "one drifted substrate → not healthy");
  assert.deepEqual(r.driftSurfaces, ["ai-memo-xref"], "kebab-case drift kind");
  assert.equal(r.substrates.aiMemoXref.present, true);
  assert.ok(r.substrates.aiMemoXref.summary.includes("4 / 7"), "summary carries the iter-13 numbers");
});

test("rollup: ai-memo-xref missing → not healthy, absent from drift", () => {
  // A missing third audit cannot be certified healthy, but an absent audit
  // is not "drift" either (same rule as link-audit / wiki-tribal).
  const linkAudit = { stats: { linksTotal: 1000, linksBroken: 5 } };
  const wikiTribal = { stats: { wikiFiles: 100, missing: 5, coverage: 0.95 } };
  const r = rollup({ linkAudit, wikiTribal }); // aiMemoXref omitted
  assert.equal(r.healthy, false, "missing third audit blocks healthy=true");
  assert.equal(r.substrates.aiMemoXref.present, false);
  assert.deepEqual(r.driftSurfaces, [], "absent ai-memo audit is not a drift surface");
});

test("extractMetrics: ai-memo-xref valid → normalized record", () => {
  const a = { generatedAt: "2026-05-21T00:00:00Z", stats: { engineCount: 7, memoCount: 863, missing: 4, coverage: 0.4286 } };
  const r = extractMetrics(a, "ai-memo-xref");
  assert.equal(r.present, true);
  assert.equal(r.stats.engineCount, 7);
  assert.equal(r.stats.missing, 4);
  assert.equal(r.stats.coverage, 0.4286);
  assert.ok(r.summary.includes("4 / 7"));
  assert.ok(r.summary.includes("42.9%"));
});

test("extractMetrics: ai-memo-xref coverage clamped to [0,1]", () => {
  assert.equal(extractMetrics({ stats: { engineCount: 7, missing: 0, coverage: 1.5 } }, "ai-memo-xref").stats.coverage, 1);
  assert.equal(extractMetrics({ stats: { engineCount: 7, missing: 7, coverage: -0.2 } }, "ai-memo-xref").stats.coverage, 0);
  assert.equal(extractMetrics({ stats: { engineCount: 7, missing: 7, coverage: NaN } }, "ai-memo-xref").stats.coverage, 0);
});

test("rollup: link-audit drift triggers driftSurfaces", () => {
  const linkAudit = { stats: { linksTotal: 100, linksBroken: 5 } }; // 5% > 2%
  const wikiTribal = { stats: { wikiFiles: 100, missing: 5, coverage: 0.95 } }; // healthy
  const r = rollup({ linkAudit, wikiTribal });
  assert.equal(r.healthy, false);
  assert.deepEqual(r.driftSurfaces, ["link-audit"]);
});

test("rollup: both drifted (iter-4/iter-7 numbers) → both surfaces flagged", () => {
  const linkAudit = { stats: { linksTotal: 97673, linksBroken: 4136 } };
  const wikiTribal = { stats: { wikiFiles: 23992, missing: 23802, coverage: 0.008 } };
  const r = rollup({ linkAudit, wikiTribal });
  assert.equal(r.healthy, false);
  assert.deepEqual(r.driftSurfaces, ["link-audit", "wiki-tribal"]);
});

test("rollup: missing audit → present:false, NOT healthy (no audit ≠ clean)", () => {
  const r = rollup({ linkAudit: null, wikiTribal: null });
  assert.equal(r.healthy, false, "missing audits do NOT count as healthy");
  assert.equal(r.substrates.linkAudit.present, false);
  assert.equal(r.substrates.wikiTribal.present, false);
  assert.deepEqual(r.driftSurfaces, [], "absent audits aren't drift either");
});

test("rollup: one audit present + healthy, other missing → not healthy overall", () => {
  const linkAudit = { stats: { linksTotal: 1000, linksBroken: 1 } };
  const r = rollup({ linkAudit, wikiTribal: null });
  assert.equal(r.healthy, false);
  assert.equal(r.substrates.linkAudit.present, true);
  assert.equal(r.substrates.wikiTribal.present, false);
});

test("rollup: deterministic — same input twice → identical output", () => {
  const linkAudit = { stats: { linksTotal: 100, linksBroken: 5 } };
  const wikiTribal = { stats: { wikiFiles: 100, missing: 5, coverage: 0.95 } };
  assert.equal(JSON.stringify(rollup({ linkAudit, wikiTribal })), JSON.stringify(rollup({ linkAudit, wikiTribal })));
});

test("SCHEMA_VERSION exported and stable", () => {
  // iter-17: bumped 1.0.0 → 1.1.0 for the additive aiMemoXref substrate.
  assert.equal(SCHEMA_VERSION, "1.1.0");
});
