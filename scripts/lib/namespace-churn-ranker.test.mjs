#!/usr/bin/env node
/**
 * namespace-churn-ranker.test.mjs — tests for SYSTEM-VIZ-FS-COVERAGE-MS1/U-MS1-CHURN-RANKER
 *
 * Hermetic: injects fsStat + nowMs. No filesystem touches except loadNamespacesFromGraph
 * which uses a tmp file. Real-value assertions throughout (no .toBeDefined stubs).
 *
 * Run: node --test scripts/lib/namespace-churn-ranker.test.mjs
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  computeChurnScore,
  rankNamespacesByChurn,
  selectTopNForRewalk,
  loadNamespacesFromGraph,
  extractRootFromKey,
  defaultFsStat,
  DEFAULT_MAX_STALENESS_MS,
  DEFAULT_TRUNCATION_BOOST,
  DEFAULT_CAPPED_BOOST,
  DEFAULT_STALENESS_BOOST,
  DEFAULT_TOP_N,
  MIN_AGE_MS,
} from "./namespace-churn-ranker.mjs";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const NOW = 1715800000000; // fixed ms epoch — every test refers to this

// ─────────────────────────────────────────────────────────────────────────────
// computeChurnScore — pure function
// ─────────────────────────────────────────────────────────────────────────────
describe("computeChurnScore", () => {
  test("missing lastWalkedAt → Infinity (top priority)", () => {
    const r = computeChurnScore({ lastWalkedAtMs: 0, dirMtimeMs: NOW, truncated: false, coverageRatio: 1, nowMs: NOW });
    assert.equal(r.score, Number.POSITIVE_INFINITY);
    assert.equal(r.reason, "never walked");
  });

  test("NaN lastWalkedAt → Infinity", () => {
    const r = computeChurnScore({ lastWalkedAtMs: NaN, dirMtimeMs: NOW, truncated: false, coverageRatio: 1, nowMs: NOW });
    assert.equal(r.score, Number.POSITIVE_INFINITY);
  });

  test("fresh — no activity, coverage full, age within staleness → 0", () => {
    const r = computeChurnScore({
      lastWalkedAtMs: NOW - HOUR, dirMtimeMs: NOW - 2 * HOUR, // mtime BEFORE walk
      truncated: false, coverageRatio: 1.0, nowMs: NOW,
    });
    assert.equal(r.score, 0);
    assert.equal(r.reason, "fresh — no activity since walk");
  });

  test("activity since walk → positive score", () => {
    const r = computeChurnScore({
      lastWalkedAtMs: NOW - 2 * HOUR, dirMtimeMs: NOW - HOUR, // 1h activity after walk
      truncated: false, coverageRatio: 1.0, nowMs: NOW,
    });
    // score = (1h activity) / (2h age) = 0.5
    assert.ok(r.score > 0.4 && r.score < 0.6, `expected ~0.5, got ${r.score}`);
    assert.match(r.reason, /activity/);
  });

  test("truncated=true → +truncationBoost", () => {
    const r = computeChurnScore({
      lastWalkedAtMs: NOW - HOUR, dirMtimeMs: NOW - 2 * HOUR,
      truncated: true, coverageRatio: 1.0, nowMs: NOW,
    });
    // No activity but truncated → still gets boost (overdue retry)
    assert.ok(r.score >= DEFAULT_TRUNCATION_BOOST, `expected >= ${DEFAULT_TRUNCATION_BOOST}, got ${r.score}`);
    assert.match(r.reason, /truncated/);
  });

  test("coverageRatio < 1.0 → +cappedBoost", () => {
    const r = computeChurnScore({
      lastWalkedAtMs: NOW - HOUR, dirMtimeMs: NOW - 2 * HOUR,
      truncated: false, coverageRatio: 0.8, nowMs: NOW,
    });
    assert.ok(r.score >= DEFAULT_CAPPED_BOOST);
    assert.match(r.reason, /coverage<1/);
  });

  test("lastWalkAge > maxStaleness → +stalenessBoost", () => {
    const r = computeChurnScore({
      lastWalkedAtMs: NOW - 2 * DAY, dirMtimeMs: NOW - 3 * DAY, // walk older than staleness window
      truncated: false, coverageRatio: 1.0, nowMs: NOW,
    });
    assert.ok(r.score >= DEFAULT_STALENESS_BOOST, `expected >= ${DEFAULT_STALENESS_BOOST}, got ${r.score}`);
    assert.match(r.reason, /stale/);
  });

  test("clock skew — dirMtime in the future, age clamped to MIN_AGE_MS", () => {
    const r = computeChurnScore({
      lastWalkedAtMs: NOW + 1000, dirMtimeMs: NOW + HOUR, // walk in the future
      truncated: false, coverageRatio: 1.0, nowMs: NOW,
    });
    // lastWalkAgeMs clamped to MIN_AGE_MS=1 → score = 1h / 1ms = huge
    assert.ok(r.score > 1_000_000, `expected huge score from clock skew, got ${r.score}`);
  });

  test("all three boosts compound", () => {
    const r = computeChurnScore({
      lastWalkedAtMs: NOW - 2 * DAY, dirMtimeMs: NOW - HOUR, // activity 47h after walk
      truncated: true, coverageRatio: 0.5, nowMs: NOW,
    });
    // base = ~47h/48h ≈ 0.98; + 0.5 truncation + 0.3 capped + 1.0 staleness = ~2.78
    assert.ok(r.score > 2.5, `expected stacked boosts, got ${r.score}`);
    assert.match(r.reason, /activity/);
    assert.match(r.reason, /truncated/);
    assert.match(r.reason, /coverage/);
    assert.match(r.reason, /stale/);
  });

  test("custom opts override defaults", () => {
    const r = computeChurnScore({
      lastWalkedAtMs: NOW - HOUR, dirMtimeMs: NOW - 2 * HOUR,
      truncated: true, coverageRatio: 1.0, nowMs: NOW,
    }, { truncationBoost: 5.0 });
    assert.ok(r.score >= 5.0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// rankNamespacesByChurn — orchestration + sort
// ─────────────────────────────────────────────────────────────────────────────
describe("rankNamespacesByChurn", () => {
  const stubStat = (paths) => (absPath) => {
    if (paths[absPath] === null) return null; // root missing
    if (paths[absPath] === "throw") throw new Error("stat-failed");
    return { mtimeMs: paths[absPath] };
  };

  test("empty input → []", () => {
    const r = rankNamespacesByChurn([], { fsStat: stubStat({}) });
    assert.deepEqual(r, []);
  });

  test("missing deps.fsStat → throws", () => {
    assert.throws(() => rankNamespacesByChurn([{ namespace: "a", root: "/a" }], {}));
  });

  test("root missing → skipReason=root-missing, score=-1", () => {
    const r = rankNamespacesByChurn(
      [{ namespace: "ghost", root: "/nope", lastWalkedAt: new Date(NOW - HOUR).toISOString(), truncated: false, coverageRatio: 1, filesRepresented: 100 }],
      { fsStat: stubStat({ "/nope": null }), nowMs: NOW }
    );
    assert.equal(r[0].churnScore, -1);
    assert.equal(r[0].skipReason, "root-missing");
  });

  test("stat throws → skipReason=stat-failed, score=-1", () => {
    const r = rankNamespacesByChurn(
      [{ namespace: "boom", root: "/x", lastWalkedAt: new Date(NOW - HOUR).toISOString(), truncated: false, coverageRatio: 1, filesRepresented: 0 }],
      { fsStat: stubStat({ "/x": "throw" }), nowMs: NOW }
    );
    assert.equal(r[0].churnScore, -1);
    assert.match(r[0].skipReason, /stat-failed/);
  });

  test("sorts highest churn first; ties broken by namespace ASC", () => {
    const ranked = rankNamespacesByChurn(
      [
        { namespace: "b-busy", root: "/b", lastWalkedAt: new Date(NOW - HOUR).toISOString(), truncated: false, coverageRatio: 1, filesRepresented: 1000 },
        { namespace: "a-fresh", root: "/a", lastWalkedAt: new Date(NOW - HOUR).toISOString(), truncated: false, coverageRatio: 1, filesRepresented: 1000 },
        { namespace: "c-fresh", root: "/c", lastWalkedAt: new Date(NOW - HOUR).toISOString(), truncated: false, coverageRatio: 1, filesRepresented: 1000 },
      ],
      { fsStat: stubStat({ "/a": NOW - 2 * HOUR, "/b": NOW - 30 * 60 * 1000, "/c": NOW - 2 * HOUR }), nowMs: NOW }
    );
    assert.equal(ranked[0].namespace, "b-busy"); // active mtime
    assert.equal(ranked[1].namespace, "a-fresh"); // tied score=0; ASC
    assert.equal(ranked[2].namespace, "c-fresh");
  });

  test("Infinity (never walked) sorts before finite scores", () => {
    const ranked = rankNamespacesByChurn(
      [
        { namespace: "finite", root: "/f", lastWalkedAt: new Date(NOW - HOUR).toISOString(), truncated: true, coverageRatio: 0.5, filesRepresented: 10 },
        { namespace: "never", root: "/n", lastWalkedAt: null, truncated: false, coverageRatio: 0, filesRepresented: 0 },
      ],
      { fsStat: stubStat({ "/f": NOW - 2 * HOUR, "/n": NOW - HOUR }), nowMs: NOW }
    );
    assert.equal(ranked[0].namespace, "never");
    assert.equal(ranked[0].churnScore, Number.POSITIVE_INFINITY);
  });

  test("deterministic across runs (same input → same output)", () => {
    const entries = [
      { namespace: "x", root: "/x", lastWalkedAt: new Date(NOW - 10 * HOUR).toISOString(), truncated: true, coverageRatio: 0.9, filesRepresented: 500 },
      { namespace: "y", root: "/y", lastWalkedAt: new Date(NOW - 5 * HOUR).toISOString(), truncated: false, coverageRatio: 1, filesRepresented: 200 },
    ];
    const deps = { fsStat: stubStat({ "/x": NOW - HOUR, "/y": NOW - 2 * HOUR }), nowMs: NOW };
    const r1 = rankNamespacesByChurn(entries, deps);
    const r2 = rankNamespacesByChurn(entries, deps);
    assert.deepEqual(r1, r2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// selectTopNForRewalk
// ─────────────────────────────────────────────────────────────────────────────
describe("selectTopNForRewalk", () => {
  test("filters out score === 0 (fresh) and score < 0 (errors)", () => {
    const ranked = [
      { namespace: "a", churnScore: 5 },
      { namespace: "b", churnScore: 0 },
      { namespace: "c", churnScore: -1, skipReason: "root-missing" },
      { namespace: "d", churnScore: 2 },
    ];
    const sel = selectTopNForRewalk(ranked, 5);
    assert.equal(sel.length, 2);
    assert.equal(sel[0].namespace, "a");
    assert.equal(sel[1].namespace, "d");
  });

  test("caps at N", () => {
    const ranked = Array.from({ length: 20 }, (_, i) => ({ namespace: `n${i}`, churnScore: i + 1 }));
    const sel = selectTopNForRewalk(ranked, 3);
    assert.equal(sel.length, 3);
  });

  test("invalid N falls back to DEFAULT_TOP_N", () => {
    const ranked = Array.from({ length: 20 }, (_, i) => ({ namespace: `n${i}`, churnScore: 10 - i }));
    const sel = selectTopNForRewalk(ranked, NaN);
    assert.equal(sel.length, DEFAULT_TOP_N);
  });

  test("non-array input → []", () => {
    assert.deepEqual(selectTopNForRewalk(null, 5), []);
    assert.deepEqual(selectTopNForRewalk(undefined, 5), []);
    assert.deepEqual(selectTopNForRewalk("not array", 5), []);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// loadNamespacesFromGraph + extractRootFromKey
// ─────────────────────────────────────────────────────────────────────────────
describe("loadNamespacesFromGraph", () => {
  const tmp = path.join(os.tmpdir(), `churn-ranker-test-${Date.now()}.json`);

  test("missing file → []", () => {
    assert.deepEqual(loadNamespacesFromGraph("/nope/missing.json"), []);
  });

  test("invalid JSON → []", () => {
    fs.writeFileSync(tmp, "{ not json");
    try { assert.deepEqual(loadNamespacesFromGraph(tmp), []); }
    finally { fs.unlinkSync(tmp); }
  });

  test("missing meta.fsCoverage → []", () => {
    fs.writeFileSync(tmp, JSON.stringify({ nodes: [], edges: [], meta: {} }));
    try { assert.deepEqual(loadNamespacesFromGraph(tmp), []); }
    finally { fs.unlinkSync(tmp); }
  });

  test("happy path — extracts all entries", () => {
    const graph = {
      nodes: [], edges: [],
      meta: {
        fsCoverage: {
          ".claude::H:/prism/.claude": { walkRoot: "H:/prism/.claude", lastWalkedAt: "2026-05-15T20:37:29Z", truncated: false, coverageRatio: 1, filesRepresented: 77614 },
          "JM DIE::H:/prism/JM DIE": { walkRoot: "H:/prism/JM DIE", lastWalkedAt: "2026-05-15T18:41:06Z", truncated: true, coverageRatio: 0.4, filesRepresented: 79994 },
        },
      },
    };
    fs.writeFileSync(tmp, JSON.stringify(graph));
    try {
      const entries = loadNamespacesFromGraph(tmp);
      assert.equal(entries.length, 2);
      assert.equal(entries[0].namespace, ".claude::H:/prism/.claude");
      assert.equal(entries[0].truncated, false);
      assert.equal(entries[1].truncated, true);
      assert.equal(entries[1].coverageRatio, 0.4);
    } finally { fs.unlinkSync(tmp); }
  });

  test("non-string input → []", () => {
    assert.deepEqual(loadNamespacesFromGraph(null), []);
    assert.deepEqual(loadNamespacesFromGraph(undefined), []);
    assert.deepEqual(loadNamespacesFromGraph(42), []);
  });
});

describe("extractRootFromKey", () => {
  test("namespace::path format", () => {
    assert.equal(extractRootFromKey(".claude::H:/prism/.claude"), "H:/prism/.claude");
    assert.equal(extractRootFromKey("JM DIE::H:/prism/JM DIE"), "H:/prism/JM DIE");
  });
  test("path with multiple colons (Windows drive)", () => {
    assert.equal(extractRootFromKey("ns::C:/Users/me/dir"), "C:/Users/me/dir");
  });
  test("no separator → returns key as-is", () => {
    assert.equal(extractRootFromKey("no-sep"), "no-sep");
  });
  test("non-string → null", () => {
    assert.equal(extractRootFromKey(null), null);
    assert.equal(extractRootFromKey(undefined), null);
    assert.equal(extractRootFromKey(42), null);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// defaultFsStat — real fs touch (the only place we touch the actual FS)
// ─────────────────────────────────────────────────────────────────────────────
describe("defaultFsStat", () => {
  test("existing path returns mtimeMs", () => {
    const r = defaultFsStat(os.tmpdir());
    assert.ok(r && typeof r.mtimeMs === "number" && r.mtimeMs > 0);
  });
  test("ENOENT returns null", () => {
    assert.equal(defaultFsStat("/this/path/does/not/exist/nowhere"), null);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Edge case: real-world graph shape (3 PRISM namespaces)
// ─────────────────────────────────────────────────────────────────────────────
describe("real-world end-to-end", () => {
  test("3-namespace PRISM scenario — truncated JM DIE ranks above fresh .claude", () => {
    const entries = [
      { namespace: ".claude::H:/prism/.claude", root: "/claude", lastWalkedAt: new Date(NOW - HOUR).toISOString(), truncated: false, coverageRatio: 1.0, filesRepresented: 77614 },
      { namespace: "JM DIE::H:/prism/JM DIE", root: "/jmdie", lastWalkedAt: new Date(NOW - 4 * HOUR).toISOString(), truncated: true, coverageRatio: 0.4, filesRepresented: 79994 },
      { namespace: "Docustrata::H:/prism/Docustrata", root: "/docu", lastWalkedAt: new Date(NOW - 2 * HOUR).toISOString(), truncated: true, coverageRatio: 0.9, filesRepresented: 179971 },
    ];
    const ranked = rankNamespacesByChurn(entries, {
      fsStat: (p) => ({ mtimeMs: NOW - 30 * 60 * 1000 }), // recent dir mtime on all
      nowMs: NOW,
    });
    assert.equal(ranked[0].namespace, "JM DIE::H:/prism/JM DIE"); // oldest walk + truncated + low coverage
    assert.equal(ranked[1].namespace, "Docustrata::H:/prism/Docustrata");
    assert.equal(ranked[2].namespace, ".claude::H:/prism/.claude");
    assert.ok(ranked[0].churnScore > ranked[1].churnScore);
    assert.ok(ranked[1].churnScore > ranked[2].churnScore);
  });
});
