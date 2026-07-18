// scripts/lib/dark-wiki-rank.test.mjs
// U-DARK-WIKI-RANK (2026-06-09, slot:alpha): the ranker must surface the
// DEMANDED-but-dark files (recall-count > 0) above the undemanded long tail,
// deterministically, with a clock injected (no Date.now in the pure path).
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  darkPathToRecallKey,
  recencyBonus,
  scoreDarkFile,
  rankDarkFiles,
  summarizeRanking,
  W_RECALL,
  RECENCY_MAX_BONUS,
} from "./dark-wiki-rank.mjs";

const NOW = Date.parse("2026-06-09T00:00:00.000Z");
const dayMs = 24 * 60 * 60 * 1000;

test("darkPathToRecallKey: maps a dark path to the recall-counts key shape", () => {
  assert.equal(darkPathToRecallKey("architecture/system-viz.md"), "wiki/architecture/system-viz");
  assert.equal(darkPathToRecallKey("architecture\\foo.md"), "wiki/architecture/foo", "backslashes normalized");
  assert.equal(darkPathToRecallKey("/lessons/bar.MD"), "wiki/lessons/bar", "leading slash + case-insensitive .md");
  assert.equal(darkPathToRecallKey(""), "");
  assert.equal(darkPathToRecallKey(null), "");
  assert.equal(darkPathToRecallKey(42), "");
});

test("recencyBonus: decays from max toward 0, clamps future and missing", () => {
  assert.equal(recencyBonus(NOW, NOW), RECENCY_MAX_BONUS, "age 0 -> max bonus");
  // one 30-day half-life -> half the max
  assert.ok(Math.abs(recencyBonus(NOW - 30 * dayMs, NOW) - RECENCY_MAX_BONUS / 2) < 1e-6);
  assert.ok(recencyBonus(NOW - 365 * dayMs, NOW) < 1, "very old -> ~0");
  assert.equal(recencyBonus(NOW + 5 * dayMs, NOW), RECENCY_MAX_BONUS, "future-stamped -> treated freshest");
  assert.equal(recencyBonus(null, NOW), 0, "missing lastSeen -> 0");
  assert.equal(recencyBonus(NOW, null), 0, "missing now -> 0");
});

test("scoreDarkFile: demanded files are tier 1; recall dominates recency", () => {
  const demanded = scoreDarkFile({ relPath: "architecture/a.md", recallCount: 3, lastSeenMs: NOW, nowMs: NOW });
  assert.equal(demanded.tier, 1);
  assert.equal(demanded.recallCount, 3);
  // 3 recalls + fresh bonus = 3*W_RECALL + RECENCY_MAX_BONUS
  assert.equal(demanded.score, 3 * W_RECALL + RECENCY_MAX_BONUS);

  const undemanded = scoreDarkFile({ relPath: "architecture/b.md", recallCount: 0, lastSeenMs: NOW, nowMs: NOW });
  assert.equal(undemanded.tier, 3);
  assert.equal(undemanded.score, 0, "no recall -> no recency bonus either (0 demand signal)");

  // a single recall outranks the maximum possible recency bonus -- recall dominates
  const oneStale = scoreDarkFile({ relPath: "c.md", recallCount: 1, lastSeenMs: NOW - 999 * dayMs, nowMs: NOW });
  assert.ok(oneStale.score >= W_RECALL, "1 recall (even stale) >= W_RECALL");
  assert.ok(W_RECALL > RECENCY_MAX_BONUS, "weights chosen so recall always beats recency");
});

test("rankDarkFiles: demanded files float to the top, sorted by recall then recency; deterministic", () => {
  const missing = [
    "architecture/never-recalled.md",
    "architecture/hot.md",
    "architecture/warm.md",
    "architecture/zzz-also-never.md",
  ];
  const recallByKey = {
    "wiki/architecture/hot": { count: 10, lastSeenIso: "2026-06-08T00:00:00.000Z" },
    "wiki/architecture/warm": { count: 2, lastSeenIso: "2026-05-01T00:00:00.000Z" },
    // never-recalled + zzz-also-never have NO entry -> tier 3
  };
  const ranked = rankDarkFiles({ missing, recallByKey, nowMs: NOW });
  assert.equal(ranked.length, 4);
  assert.equal(ranked[0].relPath, "architecture/hot.md", "10 recalls -> #1");
  assert.equal(ranked[1].relPath, "architecture/warm.md", "2 recalls -> #2");
  assert.equal(ranked[0].tier, 1);
  assert.equal(ranked[2].tier, 3, "undemanded after demanded");
  // deterministic tail: the two tier-3 files break ties alphabetically by relPath
  assert.equal(ranked[2].relPath, "architecture/never-recalled.md");
  assert.equal(ranked[3].relPath, "architecture/zzz-also-never.md");
});

test("rankDarkFiles: empty / malformed input never throws", () => {
  assert.deepEqual(rankDarkFiles({ missing: [], recallByKey: {}, nowMs: NOW }), []);
  assert.deepEqual(rankDarkFiles({ missing: null, nowMs: NOW }), []);
  // a recall entry with no count/iso degrades to tier 3, not a crash
  const r = rankDarkFiles({ missing: ["x.md"], recallByKey: { "wiki/x": {} }, nowMs: NOW });
  assert.equal(r[0].tier, 3);
  assert.equal(r[0].recallCount, 0);
});

test("summarizeRanking: counts the demanded set + total recall pressure", () => {
  const missing = ["a.md", "b.md", "c.md"];
  const recallByKey = {
    "wiki/a": { count: 5, lastSeenIso: "2026-06-08T00:00:00.000Z" },
    "wiki/b": { count: 1, lastSeenIso: "2026-06-01T00:00:00.000Z" },
  };
  const ranked = rankDarkFiles({ missing, recallByKey, nowMs: NOW });
  const s = summarizeRanking(ranked);
  assert.equal(s.totalDark, 3);
  assert.equal(s.demandedDark, 2, "a + b are demanded");
  assert.equal(s.undemandedDark, 1, "c is not");
  assert.equal(s.totalDemandedRecalls, 6, "5 + 1");
  assert.equal(s.topDemanded[0].relPath, "a.md");
});
