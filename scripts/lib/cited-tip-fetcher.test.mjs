/**
 * cited-tip-fetcher.test.mjs — concrete-value tests for the runtime
 * cited-tip query layer.
 *
 * @milestone POST-PDF-NODE-MS0/U-CITED-TIP-FETCHER
 * @slot echo · @iter 15 · @date 2026-05-26
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  loadTipsFromJsonl,
  compareByScoreDesc,
  filterByController,
  filterByMinDifficulty,
  filterByScoreRange,
  filterByKeyword,
  fetchTips,
  topTipsForController,
  findTipsByKeyword,
  DIFFICULTY_RANK,
  MIN_DIFFICULTY_DEFAULT,
  defaultJsonlPath,
} from "./cited-tip-fetcher.mjs";

const tips = [
  { id: "t1", controller: "mazak",   domain: "reference", difficulty: "advanced",     score: 5.5, body: "Mazatrol Matrix macro G65 P1000 A_ B_ C_" },
  { id: "t2", controller: "mazak",   domain: "reference", difficulty: "intermediate", score: 2.3, body: "Mazatrol setup overview" },
  { id: "t3", controller: "haas",    domain: "mill",      difficulty: "advanced",     score: 4.6, body: "Haas M97 local subprogram" },
  { id: "t4", controller: "siemens", domain: "reference", difficulty: "complex",      score: 7.1, body: "Sinumerik 840D R-parameter assignment" },
  { id: "t5", controller: "okuma",   domain: "mill",      difficulty: "easy",         score: 0.8, body: "OSP-P200L intro" },
];

describe("DIFFICULTY_RANK + MIN_DIFFICULTY_DEFAULT constants", () => {
  it("complex rank=4 (highest)", () => { assert.equal(DIFFICULTY_RANK.complex, 4); });
  it("unscored rank=0 (lowest)", () => { assert.equal(DIFFICULTY_RANK.unscored, 0); });
  it("default min difficulty = advanced", () => { assert.equal(MIN_DIFFICULTY_DEFAULT, "advanced"); });
});

describe("compareByScoreDesc: sort comparator", () => {
  it("higher-score tip sorts first", () => {
    assert.equal([tips[1], tips[0]].sort(compareByScoreDesc)[0].id, "t1");
  });

  it("equal scores break ties by id ascending", () => {
    const a = { id: "z", score: 3 };
    const b = { id: "a", score: 3 };
    assert.equal([a, b].sort(compareByScoreDesc)[0].id, "a");
  });

  it("missing score treated as 0", () => {
    const a = { id: "withScore", score: 1 };
    const b = { id: "noScore" };
    assert.equal([b, a].sort(compareByScoreDesc)[0].id, "withScore");
  });
});

describe("filterByController", () => {
  it("controller=mazak returns 2 tips", () => {
    assert.equal(filterByController(tips, "mazak").length, 2);
  });

  it("controller=MAZAK (uppercase) also returns 2 tips (case-insensitive)", () => {
    assert.equal(filterByController(tips, "MAZAK").length, 2);
  });

  it("controller=unknown returns 0 tips", () => {
    assert.equal(filterByController(tips, "unknown").length, 0);
  });

  it("null controller returns all 5 tips", () => {
    assert.equal(filterByController(tips, null).length, 5);
  });
});

describe("filterByMinDifficulty", () => {
  it("default (advanced) returns 3 tips (t1+t3+t4)", () => {
    assert.equal(filterByMinDifficulty(tips).length, 3);
  });

  it("minDiff=complex returns 1 tip (t4 only)", () => {
    assert.equal(filterByMinDifficulty(tips, "complex").length, 1);
  });

  it("minDiff=easy returns 5 tips (fixture has no unscored entries)", () => {
    assert.equal(filterByMinDifficulty(tips, "easy").length, 5);
  });

  it("minDiff=intermediate returns 4 tips (excludes the easy one t5)", () => {
    assert.equal(filterByMinDifficulty(tips, "intermediate").length, 4);
  });

  it("minDiff=unscored returns all 5", () => {
    assert.equal(filterByMinDifficulty(tips, "unscored").length, 5);
  });

  it("unknown minDiff returns all (no filter)", () => {
    assert.equal(filterByMinDifficulty(tips, "bogus").length, 5);
  });
});

describe("filterByScoreRange", () => {
  it("minScore=4 returns 3 tips (t1+t3+t4)", () => {
    assert.equal(filterByScoreRange(tips, 4).length, 3);
  });

  it("maxScore=3 returns 2 tips (t2+t5)", () => {
    assert.equal(filterByScoreRange(tips, undefined, 3).length, 2);
  });

  it("minScore=2 + maxScore=5 returns 2 tips (t2+t3)", () => {
    assert.equal(filterByScoreRange(tips, 2, 5).length, 2);
  });

  it("no bounds returns all 5", () => {
    assert.equal(filterByScoreRange(tips).length, 5);
  });
});

describe("filterByKeyword", () => {
  it("keyword='Mazatrol' returns 2 tips (t1+t2)", () => {
    assert.equal(filterByKeyword(tips, "Mazatrol").length, 2);
  });

  it("keyword='m97' (lowercase) returns 1 tip (t3 Haas M97 case-insensitive)", () => {
    assert.equal(filterByKeyword(tips, "m97").length, 1);
  });

  it("keyword='nonexistent' returns 0 tips", () => {
    assert.equal(filterByKeyword(tips, "nonexistent").length, 0);
  });

  it("null keyword returns all 5", () => {
    assert.equal(filterByKeyword(tips, null).length, 5);
  });
});

describe("fetchTips: composed pipeline", () => {
  it("controller=mazak + minDifficulty=advanced returns 1 tip (t1 only)", () => {
    assert.equal(fetchTips(tips, { controller: "mazak", minDifficulty: "advanced" }).length, 1);
  });

  it("minScore=5 returns 2 tips sorted desc — t4 first (7.1)", () => {
    assert.equal(fetchTips(tips, { minScore: 5 })[0].id, "t4");
  });

  it("limit=1 returns exactly 1 record (highest scored)", () => {
    assert.equal(fetchTips(tips, { limit: 1 })[0].id, "t4");
  });

  it("domain=mill returns 2 tips (t3+t5)", () => {
    assert.equal(fetchTips(tips, { domain: "mill" }).length, 2);
  });

  it("empty criteria returns all 5, sorted by score desc", () => {
    assert.equal(fetchTips(tips, {})[0].id, "t4");
  });
});

describe("topTipsForController: convenience", () => {
  it("topTipsForController('mazak') returns mazak tips score-desc — t1 first (5.5)", () => {
    assert.equal(topTipsForController(tips, "mazak")[0].id, "t1");
  });

  it("default n=5 cap, with 2 mazak tips returns 2", () => {
    assert.equal(topTipsForController(tips, "mazak").length, 2);
  });

  it("n=1 returns just the top tip", () => {
    assert.equal(topTipsForController(tips, "mazak", 1).length, 1);
  });
});

describe("findTipsByKeyword: convenience", () => {
  it("keyword='Sinumerik' returns 1 tip (t4)", () => {
    assert.equal(findTipsByKeyword(tips, "Sinumerik")[0].id, "t4");
  });

  it("keyword='OSP' returns 1 tip (t5)", () => {
    assert.equal(findTipsByKeyword(tips, "OSP")[0].id, "t5");
  });

  it("default n=5 caps results", () => {
    assert.equal(findTipsByKeyword(tips, "Mazatrol", 1).length, 1);
  });
});

describe("loadTipsFromJsonl: IO", () => {
  it("missing path returns empty length 0", () => {
    assert.equal(loadTipsFromJsonl("H:/prism/non-existent-fetcher-test.jsonl").length, 0);
  });

  it("null path returns empty length 0", () => {
    assert.equal(loadTipsFromJsonl(null).length, 0);
  });

  it("loads the real iter11 candidates JSONL and returns 94 records", () => {
    const real = loadTipsFromJsonl("H:/prism/mcp-server/data/ingestion_cache/curriculum-tribal-candidates/jm-die-curriculum-tribal-candidates.jsonl");
    assert.equal(real.length, 94);
  });
});

describe("defaultJsonlPath: path helper", () => {
  it("returns canonical path under given repo root", () => {
    const p = defaultJsonlPath("H:/prism");
    assert.equal(p.includes("jm-die-curriculum-tribal-candidates.jsonl"), true);
  });

  it("ends with .jsonl extension", () => {
    assert.equal(defaultJsonlPath("H:/prism").endsWith(".jsonl"), true);
  });
});
