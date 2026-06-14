#!/usr/bin/env node
/**
 * Tests for generate-wiki-tribal-features.mjs (/goal synergy iter 9, echo).
 *
 * Coverage:
 *   - wikiMissingNodeId: deterministic, link-only identity, unicode disambig
 *   - generate: roost emitted, topN clamped, hostile-payload safe, real-data
 *
 * Run: node --test scripts/generate-wiki-tribal-features.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import {
  wikiMissingNodeId,
  generate,
  SCHEMA_VERSION,
  ROOST_ID,
  PLANNED_PARENT,
  ROOST_LAYER,
  PATH_LAYER,
  DEFAULT_TOPN,
  HARD_TOPN_CAP,
} from "./generate-wiki-tribal-features.mjs";

// ───────────────────────── wikiMissingNodeId ─────────────────────────

test("wikiMissingNodeId: deterministic, ghost prefix invariant", () => {
  const a = wikiMissingNodeId("lessons/foo.md");
  const b = wikiMissingNodeId("lessons/foo.md");
  assert.equal(a, b);
  assert.ok(a.startsWith("ghost.wiki_tribal_missing."));
});

test("wikiMissingNodeId: link-only identity (no source-hash trap)", () => {
  // Iter-6 P1-1 lesson absorbed: same path → same id, always.
  assert.equal(wikiMissingNodeId("lessons/x.md"), wikiMissingNodeId("lessons/x.md"));
});

test("wikiMissingNodeId: distinct unicode-only paths disambiguate via FNV", () => {
  const a = wikiMissingNodeId("αβγ.md");
  const b = wikiMissingNodeId("δεζ.md");
  assert.notEqual(a, b);
});

test("wikiMissingNodeId: empty/null → 'x' fallback", () => {
  assert.ok(wikiMissingNodeId("").startsWith("ghost.wiki_tribal_missing.x."));
  assert.ok(wikiMissingNodeId(null).startsWith("ghost.wiki_tribal_missing.x."));
});

test("wikiMissingNodeId: 48-char linkPart cap", () => {
  const id = wikiMissingNodeId("a".repeat(200));
  const parts = id.split(".");
  assert.equal(parts.length, 4);
  assert.ok(parts[2].length <= 48);
});

// ───────────────────────── generate ─────────────────────────

const SAMPLE_AUDIT = {
  schemaVersion: "1.0.0",
  stats: { wikiFiles: 1000, missing: 500, stale: 0, coverage: 0.5 },
  missingFromTribal: ["lessons/a.md", "lessons/b.md", "lessons/c.md"],
};

test("generate: emits roost + N children, deterministic", () => {
  const r1 = generate(SAMPLE_AUDIT, [], 3);
  const r2 = generate(SAMPLE_AUDIT, [], 3);
  assert.deepEqual(r1, r2);
  assert.equal(r1.stats.roostEmitted, 1);
  assert.equal(r1.stats.childrenEmitted, 3);
  assert.equal(r1.newNodes.length, 4);
  assert.equal(r1.newNodes[0].id, ROOST_ID);
  assert.equal(r1.newNodes[0].layer, ROOST_LAYER);
  assert.equal(r1.newNodes[0].parent, PLANNED_PARENT);
  for (let i = 1; i < 4; i++) {
    assert.equal(r1.newNodes[i].parent, ROOST_ID);
    assert.equal(r1.newNodes[i].kind, "missing-coverage");
    assert.equal(r1.newNodes[i].layer, PATH_LAYER);
    assert.ok(r1.newNodes[i].label.startsWith("MISSING:"));
  }
});

test("generate: topN clamped to [0, HARD_TOPN_CAP]", () => {
  const big = {
    stats: { wikiFiles: 10000, missing: 5000, coverage: 0.5 },
    missingFromTribal: Array.from({ length: 500 }, (_, i) => `p/${i}.md`),
  };
  assert.equal(generate(big, [], 1000).stats.topN, HARD_TOPN_CAP);
  assert.equal(generate(big, [], -5).stats.topN, 0);
  assert.equal(generate(big, [], NaN).stats.topN, 0);
  // topN=0 still emits the roost
  const r0 = generate(big, [], 0);
  assert.equal(r0.stats.roostEmitted, 1);
  assert.equal(r0.stats.childrenEmitted, 0);
});

test("generate: existingNodeIds skip-list — roost + children skipped", () => {
  const existing = new Set([ROOST_ID]);
  const r = generate(SAMPLE_AUDIT, existing, 3);
  assert.equal(r.stats.roostEmitted, 0);
  assert.equal(r.stats.childrenEmitted, 3);
});

test("generate: hostile-payload safe", () => {
  assert.equal(generate({}, [], 10).stats.missingCount, 0);
  assert.equal(generate({ stats: null }, [], 10).stats.missingCount, 0);
  assert.equal(generate({ missingFromTribal: "not-array", stats: { missing: 5 } }, [], 10).stats.childrenEmitted, 0);
  assert.equal(generate(null, [], 10).stats.missingCount, 0);
});

test("generate: coverage clamped to [0,1] (defends against pathological audit)", () => {
  const a = { stats: { wikiFiles: 100, missing: 50, coverage: -0.5 }, missingFromTribal: [] };
  const r = generate(a, [], 0);
  assert.ok(r.stats.coverage >= 0 && r.stats.coverage <= 1);

  const b = { stats: { wikiFiles: 100, missing: 50, coverage: 1.5 }, missingFromTribal: [] };
  const r2 = generate(b, [], 0);
  assert.ok(r2.stats.coverage >= 0 && r2.stats.coverage <= 1);
});

test("generate: iter-7 numbers render properly (99.2% gap)", () => {
  const a = {
    stats: { wikiFiles: 23992, missing: 23802, stale: 0, coverage: 0.008 },
    missingFromTribal: ["a.md"],
  };
  const r = generate(a, [], 50);
  assert.equal(r.stats.missingCount, 23802);
  assert.equal(r.stats.wikiFiles, 23992);
  assert.equal(r.stats.coverage, 0.008);
});

test("generate: empty missingFromTribal → roost only", () => {
  const a = { stats: { wikiFiles: 100, missing: 50, coverage: 0.5 }, missingFromTribal: [] };
  const r = generate(a, [], 10);
  assert.equal(r.stats.roostEmitted, 1);
  assert.equal(r.stats.childrenEmitted, 0);
});

test("generate: labels use MISSING: prefix (no literal wikilinks)", () => {
  const a = { stats: { wikiFiles: 100, missing: 1, coverage: 0.99 }, missingFromTribal: ["x.md"] };
  const r = generate(a, [], 1);
  assert.ok(r.newNodes[1].label.startsWith("MISSING:"));
  assert.ok(!/\[\[.*\]\]/.test(r.newNodes[1].label));
  assert.ok(!/\[\[.*\]\]/.test(r.newNodes[0].info));
});

test("generate: SCHEMA_VERSION exported and stable", () => {
  assert.equal(SCHEMA_VERSION, "1.0.0");
});

// ───────────────────────── real-data E2E ─────────────────────────

test("real-data E2E: live audit JSON → roost + 50 children", () => {
  const live = "H:/prism/state/shared/.wiki-tribal-cross-ref-audit.json";
  if (!existsSync(live)) {
    console.log("  SKIP: live audit missing");
    return;
  }
  const audit = JSON.parse(readFileSync(live, "utf8"));
  const r = generate(audit, [], DEFAULT_TOPN);
  assert.equal(r.stats.roostEmitted, 1);
  assert.equal(r.stats.topN, DEFAULT_TOPN);
  assert.ok(r.stats.missingCount >= 1, "real missing count");
  assert.ok(r.stats.wikiFiles >= 100, "real wiki total");
  assert.ok(r.stats.coverage >= 0 && r.stats.coverage <= 1, "coverage in [0,1]");
  // First child shape check
  if (r.stats.childrenEmitted > 0) {
    const firstChild = r.newNodes[1];
    assert.ok(firstChild.id.startsWith("ghost.wiki_tribal_missing."));
    assert.equal(firstChild.parent, ROOST_ID);
    assert.equal(firstChild.kind, "missing-coverage");
    assert.ok(firstChild.label.startsWith("MISSING:"));
  }
});
