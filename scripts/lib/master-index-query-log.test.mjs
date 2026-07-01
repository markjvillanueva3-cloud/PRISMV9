// SYSTEM-VIZ-HIGH-ROI-AUDIT-2026-05-20 G2 tests — node:test, hermetic tmpdir.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  buildQueryRecord,
  recordQuery,
  aggregateQueryLog,
  loadAndAggregate,
} from "./master-index-query-log.mjs";

function freshTmp() {
  return mkdtempSync(join(tmpdir(), "midx-log-"));
}

// ---- buildQueryRecord ---------------------------------------------------

test("buildQueryRecord: produces NDJSON line with required fields", () => {
  const line = buildQueryRecord({
    ts: "2026-05-20T09:00:00.000Z",
    terms: ["wedm", "feed"],
    k: 5,
    hitsReturned: 3,
    topScore: 7.5,
    source: "graph",
  });
  assert.ok(line.endsWith("\n"));
  const rec = JSON.parse(line.trim());
  assert.equal(rec.ts, "2026-05-20T09:00:00.000Z");
  assert.deepEqual(rec.terms, ["wedm", "feed"]);
  assert.equal(rec.k, 5);
  assert.equal(rec.hitsReturned, 3);
  assert.equal(rec.topScore, 7.5);
  assert.equal(rec.source, "graph");
  assert.equal(rec.v, "1.0.0");
});

test("buildQueryRecord: defaults ts to now()", () => {
  const before = Date.now();
  const line = buildQueryRecord({ terms: ["x", "y"], k: 5, hitsReturned: 0, topScore: null, source: "tribal" });
  const rec = JSON.parse(line.trim());
  const after = Date.now();
  const recTime = new Date(rec.ts).getTime();
  assert.ok(recTime >= before && recTime <= after);
});

test("buildQueryRecord: topScore null when no hits", () => {
  const rec = JSON.parse(buildQueryRecord({
    terms: ["x"], k: 5, hitsReturned: 0, topScore: null, source: "graph",
  }).trim());
  assert.equal(rec.topScore, null);
});

test("buildQueryRecord: clamps terms to 16", () => {
  const terms = Array.from({ length: 30 }, (_, i) => `t${i}`);
  const rec = JSON.parse(buildQueryRecord({
    terms, k: 5, hitsReturned: 0, topScore: null, source: "graph",
  }).trim());
  assert.equal(rec.terms.length, 16);
  assert.equal(rec.terms[0], "t0");
});

test("buildQueryRecord: throws when q is null", () => {
  assert.throws(() => buildQueryRecord(null), /q required/);
});

test("buildQueryRecord: throws when terms is not array", () => {
  assert.throws(() => buildQueryRecord({ terms: "x", source: "graph" }), /terms\[\] required/);
});

test("buildQueryRecord: throws when source missing", () => {
  assert.throws(() => buildQueryRecord({ terms: ["x"], source: "" }), /source required/);
});

test("buildQueryRecord: non-finite topScore coerced to null", () => {
  const rec = JSON.parse(buildQueryRecord({
    terms: ["x"], k: 5, hitsReturned: 1, topScore: NaN, source: "graph",
  }).trim());
  assert.equal(rec.topScore, null);
});

// ---- recordQuery: I/O path ----------------------------------------------

test("recordQuery: appends one line to log file", () => {
  const dir = freshTmp();
  const logPath = join(dir, "q.jsonl");
  const ok = recordQuery({
    terms: ["wedm", "speed"], k: 5, hitsReturned: 2, topScore: 6, source: "graph",
  }, { logPath });
  assert.equal(ok, true);
  const text = readFileSync(logPath, "utf8");
  const lines = text.split("\n").filter(Boolean);
  assert.equal(lines.length, 1);
  const rec = JSON.parse(lines[0]);
  assert.equal(rec.source, "graph");
});

test("recordQuery: appends multiple lines", () => {
  const dir = freshTmp();
  const logPath = join(dir, "q.jsonl");
  for (let i = 0; i < 5; i++) {
    recordQuery({ terms: [`tok${i}`, "common"], k: 5, hitsReturned: i, topScore: i, source: "graph" }, { logPath });
  }
  const lines = readFileSync(logPath, "utf8").split("\n").filter(Boolean);
  assert.equal(lines.length, 5);
});

test("recordQuery: PRISM_MASTER_INDEX_QUERY_LOG_DISABLE skips write", () => {
  const dir = freshTmp();
  const logPath = join(dir, "q.jsonl");
  process.env.PRISM_MASTER_INDEX_QUERY_LOG_DISABLE = "1";
  try {
    const ok = recordQuery({
      terms: ["x", "y"], k: 5, hitsReturned: 1, topScore: 5, source: "graph",
    }, { logPath });
    assert.equal(ok, false);
    assert.equal(existsSync(logPath), false);
  } finally {
    delete process.env.PRISM_MASTER_INDEX_QUERY_LOG_DISABLE;
  }
});

test("recordQuery: bad input → false, never throws", () => {
  const dir = freshTmp();
  const logPath = join(dir, "q.jsonl");
  const ok = recordQuery({ terms: null, source: "graph" }, { logPath });
  assert.equal(ok, false);
});

test("recordQuery: rotates when over maxBytes", () => {
  const dir = freshTmp();
  const logPath = join(dir, "q.jsonl");
  recordQuery({ terms: ["pre"], k: 5, hitsReturned: 0, topScore: null, source: "graph" }, { logPath });
  const sizeBefore = statSync(logPath).size;
  assert.ok(sizeBefore > 0);
  // Rotate threshold below current size → next write triggers rotation
  recordQuery({ terms: ["post"], k: 5, hitsReturned: 0, topScore: null, source: "graph" }, { logPath, maxBytes: sizeBefore - 1 });
  assert.equal(existsSync(logPath + ".1"), true);
  const newCurrent = readFileSync(logPath, "utf8").trim();
  const archived = readFileSync(logPath + ".1", "utf8").trim();
  assert.ok(newCurrent.includes("post"));
  assert.ok(archived.includes("pre"));
});

// ---- aggregateQueryLog: pure aggregator ---------------------------------

test("aggregateQueryLog: counts queries and parse errors", () => {
  const lines = [
    JSON.stringify({ ts: "2026-05-20T01:00:00Z", terms: ["a", "b"], k: 5, hitsReturned: 2, topScore: 5, source: "graph", v: "1.0.0" }),
    JSON.stringify({ ts: "2026-05-20T02:00:00Z", terms: ["c"], k: 5, hitsReturned: 0, topScore: null, source: "graph", v: "1.0.0" }),
    "not-json",
    "",
    JSON.stringify({ no: "terms" }),
  ];
  const r = aggregateQueryLog(lines);
  assert.equal(r.validQueries, 2);
  assert.equal(r.parseErrors, 2); // "not-json" + the no-terms record
  assert.equal(r.sourceCounts.graph, 2);
});

test("aggregateQueryLog: topQueried sorted by frequency", () => {
  const lines = [];
  for (let i = 0; i < 5; i++) lines.push(JSON.stringify({ terms: ["popular"], k: 5, hitsReturned: 1, topScore: 5, source: "graph" }));
  for (let i = 0; i < 2; i++) lines.push(JSON.stringify({ terms: ["rare"], k: 5, hitsReturned: 1, topScore: 5, source: "graph" }));
  const r = aggregateQueryLog(lines);
  assert.equal(r.topQueried[0].query, "popular");
  assert.equal(r.topQueried[0].count, 5);
  assert.equal(r.topQueried[1].query, "rare");
});

test("aggregateQueryLog: topZeroHit surfaces doc-debt", () => {
  const lines = [
    JSON.stringify({ terms: ["missing", "wiki"], k: 5, hitsReturned: 0, topScore: null, source: "graph" }),
    JSON.stringify({ terms: ["missing", "wiki"], k: 5, hitsReturned: 0, topScore: null, source: "graph" }),
    JSON.stringify({ terms: ["found"], k: 5, hitsReturned: 3, topScore: 7, source: "graph" }),
  ];
  const r = aggregateQueryLog(lines);
  assert.equal(r.topZeroHit.length, 1);
  assert.equal(r.topZeroHit[0].query, "missing wiki");
  assert.equal(r.topZeroHit[0].count, 2);
});

test("aggregateQueryLog: topLowScore surfaces ranking-tuning candidates", () => {
  const lines = [
    JSON.stringify({ terms: ["meh"], k: 5, hitsReturned: 1, topScore: 2, source: "graph" }),
    JSON.stringify({ terms: ["meh"], k: 5, hitsReturned: 1, topScore: 3, source: "graph" }),
    JSON.stringify({ terms: ["strong"], k: 5, hitsReturned: 1, topScore: 8, source: "graph" }),
  ];
  const r = aggregateQueryLog(lines, { lowScoreThreshold: 5 });
  assert.equal(r.topLowScore.length, 1);
  assert.equal(r.topLowScore[0].query, "meh");
  assert.equal(r.topLowScore[0].avgTopScore, 2.5);
});

test("aggregateQueryLog: terms ordering does not split same query", () => {
  const lines = [
    JSON.stringify({ terms: ["wedm", "feed"], k: 5, hitsReturned: 1, topScore: 5, source: "graph" }),
    JSON.stringify({ terms: ["feed", "wedm"], k: 5, hitsReturned: 1, topScore: 5, source: "graph" }),
  ];
  const r = aggregateQueryLog(lines);
  assert.equal(r.topQueried.length, 1);
  assert.equal(r.topQueried[0].count, 2);
});

test("aggregateQueryLog: oldest/newest ts tracked across lines", () => {
  const lines = [
    JSON.stringify({ ts: "2026-05-20T05:00:00Z", terms: ["a"], k: 5, hitsReturned: 1, topScore: 5, source: "graph" }),
    JSON.stringify({ ts: "2026-05-20T03:00:00Z", terms: ["b"], k: 5, hitsReturned: 1, topScore: 5, source: "graph" }),
    JSON.stringify({ ts: "2026-05-20T07:00:00Z", terms: ["c"], k: 5, hitsReturned: 1, topScore: 5, source: "graph" }),
  ];
  const r = aggregateQueryLog(lines);
  assert.equal(r.oldestTs, "2026-05-20T03:00:00Z");
  assert.equal(r.newestTs, "2026-05-20T07:00:00Z");
});

test("aggregateQueryLog: empty input safe", () => {
  const r = aggregateQueryLog([]);
  assert.equal(r.validQueries, 0);
  assert.equal(r.topQueried.length, 0);
  assert.equal(r.topZeroHit.length, 0);
});

test("aggregateQueryLog: respects topQueriedN cap", () => {
  const lines = [];
  for (let i = 0; i < 80; i++) {
    for (let j = 0; j <= i % 5; j++) {
      lines.push(JSON.stringify({ terms: [`q${i}`, "common"], k: 5, hitsReturned: 1, topScore: 5, source: "graph" }));
    }
  }
  const r = aggregateQueryLog(lines, { topQueriedN: 10 });
  assert.equal(r.topQueried.length, 10);
});

// ---- loadAndAggregate: file → stats end-to-end --------------------------

test("loadAndAggregate: round-trip from real recordQuery writes", () => {
  const dir = freshTmp();
  const logPath = join(dir, "q.jsonl");
  recordQuery({ terms: ["wedm", "feed"], k: 5, hitsReturned: 0, topScore: null, source: "graph" }, { logPath });
  recordQuery({ terms: ["wedm", "feed"], k: 5, hitsReturned: 0, topScore: null, source: "graph" }, { logPath });
  recordQuery({ terms: ["mill", "tool"], k: 5, hitsReturned: 3, topScore: 8, source: "graph" }, { logPath });
  recordQuery({ terms: ["tribal", "tip"], k: 5, hitsReturned: 1, topScore: 4, source: "tribal" }, { logPath });
  const r = loadAndAggregate(logPath);
  assert.equal(r.validQueries, 4);
  assert.equal(r.sourceCounts.graph, 3);
  assert.equal(r.sourceCounts.tribal, 1);
  assert.equal(r.topZeroHit.length, 1);
  assert.equal(r.topZeroHit[0].count, 2);
  assert.equal(r.topLowScore[0].query, "tip tribal");
});

test("loadAndAggregate: missing file returns { error }", () => {
  const dir = freshTmp();
  const r = loadAndAggregate(join(dir, "does-not-exist.jsonl"));
  assert.equal(r.error, "no-log-files");
  assert.equal(r.lines.length, 0);
});

test("loadAndAggregate: reads rotation file .1", () => {
  const dir = freshTmp();
  const logPath = join(dir, "q.jsonl");
  writeFileSync(logPath + ".1", JSON.stringify({ terms: ["old"], k: 5, hitsReturned: 0, topScore: null, source: "graph" }) + "\n", "utf8");
  writeFileSync(logPath, JSON.stringify({ terms: ["new"], k: 5, hitsReturned: 0, topScore: null, source: "graph" }) + "\n", "utf8");
  const r = loadAndAggregate(logPath);
  assert.equal(r.validQueries, 2);
});

test("loadAndAggregate: includeRotation=false skips .1", () => {
  const dir = freshTmp();
  const logPath = join(dir, "q.jsonl");
  writeFileSync(logPath + ".1", JSON.stringify({ terms: ["old"], k: 5, hitsReturned: 0, topScore: null, source: "graph" }) + "\n", "utf8");
  writeFileSync(logPath, JSON.stringify({ terms: ["new"], k: 5, hitsReturned: 0, topScore: null, source: "graph" }) + "\n", "utf8");
  const r = loadAndAggregate(logPath, { includeRotation: false });
  assert.equal(r.validQueries, 1);
});
