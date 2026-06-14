/**
 * training-curriculum-query.test.mjs — concrete-value tests for the
 * page-by-page training curriculum query layer.
 *
 * Every assertion is exact-value equality.
 *
 * @milestone POST-PDF-NODE-MS0/U-JM-TRAINING-CURRICULUM-QUERY
 * @slot echo · @iter 10 · @date 2026-05-26
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DIFFICULTY_ORDER,
  parseJsonl,
  filterRecords,
  loadCurriculum,
  topN,
  bottomN,
  summarize,
  groupByFilename,
  parseCriteriaArgv,
} from "./training-curriculum-query.mjs";

const fixture = [
  { rank: 1, filename: "a.pdf", domain: "mill",      controller: "haas",  pageNum: 1, difficulty: "easy",         score: 0.1 },
  { rank: 2, filename: "a.pdf", domain: "mill",      controller: "haas",  pageNum: 2, difficulty: "easy",         score: 0.5 },
  { rank: 3, filename: "b.pdf", domain: "cam",       controller: null,    pageNum: 1, difficulty: "intermediate", score: 2.0 },
  { rank: 4, filename: "b.pdf", domain: "cam",       controller: null,    pageNum: 2, difficulty: "advanced",     score: 4.5 },
  { rank: 5, filename: "c.pdf", domain: "reference", controller: null,    pageNum: 1, difficulty: "complex",      score: 7.0 },
];

describe("DIFFICULTY_ORDER: canonical bucket order", () => {
  it("first bucket is unscored", () => { assert.equal(DIFFICULTY_ORDER[0], "unscored"); });
  it("last bucket is complex", () => { assert.equal(DIFFICULTY_ORDER[4], "complex"); });
  it("has exactly 5 buckets", () => { assert.equal(DIFFICULTY_ORDER.length, 5); });
});

describe("parseJsonl: stream parser", () => {
  it("two-line JSONL returns 2 records", () => {
    assert.equal(parseJsonl('{"a":1}\n{"a":2}').length, 2);
  });

  it("first record value preserved", () => {
    assert.equal(parseJsonl('{"a":1}\n{"a":2}')[0].a, 1);
  });

  it("blank line skipped", () => {
    assert.equal(parseJsonl('{"a":1}\n\n{"a":2}').length, 2);
  });

  it("malformed line skipped silently", () => {
    assert.equal(parseJsonl('{"a":1}\nnot-json\n{"a":2}').length, 2);
  });

  it("empty string returns empty array length 0", () => {
    assert.equal(parseJsonl("").length, 0);
  });

  it("null returns empty array length 0", () => {
    assert.equal(parseJsonl(null).length, 0);
  });

  it("trailing newline does not add phantom record", () => {
    assert.equal(parseJsonl('{"a":1}\n').length, 1);
  });
});

describe("filterRecords: criteria filter", () => {
  it("no criteria returns all 5", () => {
    assert.equal(filterRecords(fixture).length, 5);
  });

  it("domain=mill returns 2", () => {
    assert.equal(filterRecords(fixture, { domain: "mill" }).length, 2);
  });

  it("domain=cam returns 2", () => {
    assert.equal(filterRecords(fixture, { domain: "cam" }).length, 2);
  });

  it("domain array [mill,cam] returns 4", () => {
    assert.equal(filterRecords(fixture, { domain: ["mill", "cam"] }).length, 4);
  });

  it("controller=haas returns 2", () => {
    assert.equal(filterRecords(fixture, { controller: "haas" }).length, 2);
  });

  it("difficulty=easy returns 2", () => {
    assert.equal(filterRecords(fixture, { difficulty: "easy" }).length, 2);
  });

  it("minScore=2 returns 3 (records with score >= 2)", () => {
    assert.equal(filterRecords(fixture, { minScore: 2 }).length, 3);
  });

  it("maxScore=1 returns 2 (records with score <= 1)", () => {
    assert.equal(filterRecords(fixture, { maxScore: 1 }).length, 2);
  });

  it("minScore=2 + maxScore=5 returns 2 (intermediate + advanced)", () => {
    assert.equal(filterRecords(fixture, { minScore: 2, maxScore: 5 }).length, 2);
  });

  it("filename substring 'a' matches a.pdf records (2)", () => {
    assert.equal(filterRecords(fixture, { filename: "a.pdf" }).length, 2);
  });

  it("non-array input returns empty length 0", () => {
    assert.equal(filterRecords(null).length, 0);
  });
});

describe("topN / bottomN: window selectors", () => {
  it("topN(records, 2) returns 2 records", () => {
    assert.equal(topN(fixture, 2).length, 2);
  });

  it("topN(records, 2)[0] is rank=1 record", () => {
    assert.equal(topN(fixture, 2)[0].rank, 1);
  });

  it("topN defaults to 10 on invalid n", () => {
    assert.equal(topN(fixture, 0).length, 5);
  });

  it("bottomN(records, 2) returns 2 records", () => {
    assert.equal(bottomN(fixture, 2).length, 2);
  });

  it("bottomN(records, 2)[1] is rank=5 record (hardest)", () => {
    assert.equal(bottomN(fixture, 2)[1].rank, 5);
  });

  it("bottomN on empty array returns 0", () => {
    assert.equal(bottomN([], 5).length, 0);
  });
});

describe("summarize: aggregate stats", () => {
  it("total=5", () => { assert.equal(summarize(fixture).total, 5); });
  it("byDifficulty.easy=2", () => { assert.equal(summarize(fixture).byDifficulty.easy, 2); });
  it("byDifficulty.complex=1", () => { assert.equal(summarize(fixture).byDifficulty.complex, 1); });
  it("byDifficulty.unscored=0 (initialized)", () => { assert.equal(summarize(fixture).byDifficulty.unscored, 0); });
  it("byDomain.mill=2", () => { assert.equal(summarize(fixture).byDomain.mill, 2); });
  it("byDomain.cam=2", () => { assert.equal(summarize(fixture).byDomain.cam, 2); });
  it("byController.haas=2", () => { assert.equal(summarize(fixture).byController.haas, 2); });
  it("empty input total=0", () => { assert.equal(summarize([]).total, 0); });
});

describe("groupByFilename: bucket by source", () => {
  it("3 unique filenames", () => { assert.equal(groupByFilename(fixture).size, 3); });
  it("a.pdf has 2 records", () => { assert.equal(groupByFilename(fixture).get("a.pdf").length, 2); });
  it("c.pdf has 1 record", () => { assert.equal(groupByFilename(fixture).get("c.pdf").length, 1); });
});

describe("parseCriteriaArgv: argv → criteria object", () => {
  it("--domain=mill yields {domain:'mill'}", () => {
    assert.equal(parseCriteriaArgv(["--domain=mill"]).domain, "mill");
  });

  it("--domain mill (space-separated) yields {domain:'mill'}", () => {
    assert.equal(parseCriteriaArgv(["--domain", "mill"]).domain, "mill");
  });

  it("--domain=mill,cam yields array length 2", () => {
    assert.equal(parseCriteriaArgv(["--domain=mill,cam"]).domain.length, 2);
  });

  it("--min-score=1.5 yields {minScore:1.5}", () => {
    assert.equal(parseCriteriaArgv(["--min-score=1.5"]).minScore, 1.5);
  });

  it("--limit=20 yields {limit:20}", () => {
    assert.equal(parseCriteriaArgv(["--limit=20"]).limit, 20);
  });

  it("--bottom=true yields {bottom:true}", () => {
    assert.equal(parseCriteriaArgv(["--bottom=true"]).bottom, true);
  });

  it("empty argv yields empty object (no keys)", () => {
    assert.equal(Object.keys(parseCriteriaArgv([])).length, 0);
  });

  it("--difficulty=easy,complex yields array length 2", () => {
    assert.equal(parseCriteriaArgv(["--difficulty=easy,complex"]).difficulty.length, 2);
  });
});

describe("loadCurriculum: file IO", () => {
  it("missing file returns empty array length 0", () => {
    assert.equal(loadCurriculum("H:/prism/non-existent-curriculum-file.jsonl").length, 0);
  });

  it("null path returns empty length 0", () => {
    assert.equal(loadCurriculum(null).length, 0);
  });

  it("loads the real iter9 curriculum and returns >100 records", () => {
    const real = loadCurriculum("H:/prism/mcp-server/data/ingestion_cache/training-curriculum/jm-die-easy-to-complex.jsonl");
    assert.equal(real.length > 100, true);
  });
});
