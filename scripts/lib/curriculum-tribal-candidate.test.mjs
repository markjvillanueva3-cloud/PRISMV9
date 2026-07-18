/**
 * curriculum-tribal-candidate.test.mjs — concrete-value tests for the
 * curriculum → tribal-tip candidate joiner.
 *
 * Every assertion is exact-value equality.
 *
 * @milestone POST-PDF-NODE-MS0/U-JM-CURRICULUM-TRIBAL-CANDIDATES
 * @slot echo · @iter 11 · @date 2026-05-26
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  extractPageText,
  cleanPageText,
  candidateId,
  buildCandidate,
  selectHighSignalRecords,
  deduplicateCandidates,
  groupCandidatesByDomain,
} from "./curriculum-tribal-candidate.mjs";

describe("extractPageText: form-feed page extraction", () => {
  it("page 1 of 'a\\fb\\fc' returns 'a'", () => {
    assert.equal(extractPageText("a\fb\fc", 1), "a");
  });

  it("page 2 of 'a\\fb\\fc' returns 'b'", () => {
    assert.equal(extractPageText("a\fb\fc", 2), "b");
  });

  it("page 3 of 'a\\fb\\fc' returns 'c'", () => {
    assert.equal(extractPageText("a\fb\fc", 3), "c");
  });

  it("page 4 (out of range) returns empty string", () => {
    assert.equal(extractPageText("a\fb\fc", 4), "");
  });

  it("page 0 (invalid 1-based) returns empty string", () => {
    assert.equal(extractPageText("a\fb\fc", 0), "");
  });

  it("null text returns empty string", () => {
    assert.equal(extractPageText(null, 1), "");
  });

  it("non-integer pageNum returns empty string", () => {
    assert.equal(extractPageText("a\fb", 1.5), "");
  });
});

describe("cleanPageText: whitespace normalization", () => {
  it("collapses multiple spaces to one", () => {
    assert.equal(cleanPageText("a    b"), "a b");
  });

  it("collapses 3+ newlines to 2", () => {
    assert.equal(cleanPageText("a\n\n\n\nb"), "a\n\nb");
  });

  it("preserves single spaces", () => {
    assert.equal(cleanPageText("a b c"), "a b c");
  });

  it("preserves single newlines", () => {
    assert.equal(cleanPageText("a\nb"), "a\nb");
  });

  it("trims leading and trailing whitespace", () => {
    assert.equal(cleanPageText("  hello  "), "hello");
  });

  it("null returns empty string", () => {
    assert.equal(cleanPageText(null), "");
  });
});

describe("candidateId: deterministic hash id", () => {
  it("same seed produces same id", () => {
    assert.equal(candidateId("seed-a") === candidateId("seed-a"), true);
  });

  it("different seeds produce different ids", () => {
    assert.equal(candidateId("seed-a") === candidateId("seed-b"), false);
  });

  it("id starts with 'cur-'", () => {
    assert.equal(candidateId("anything").startsWith("cur-"), true);
  });

  it("id total length is 11 (cur- + 7 base36 chars)", () => {
    assert.equal(candidateId("anything").length, 11);
  });

  it("empty seed produces valid id", () => {
    assert.equal(candidateId("").startsWith("cur-"), true);
  });
});

describe("buildCandidate: full record assembly", () => {
  const record = {
    rank: 100,
    filename: "MillManual.pdf",
    domain: "mill",
    controller: "haas",
    vendor: "Haas",
    pageNum: 3,
    totalPages: 200,
    difficulty: "advanced",
    score: 5.5,
    signals: { gCodes: 12, mCodes: 4 },
  };
  const extract = "intro page one\fchapter prelude\fG01 X10 Y20 G02 macro IF [#1 GT 0] GOTO 100";
  const cand = buildCandidate(record, extract);

  it("id starts with 'cur-'", () => { assert.equal(cand.id.startsWith("cur-"), true); });
  it("sourceId echoes filename", () => { assert.equal(cand.sourceId, "MillManual.pdf"); });
  it("sourceTitle strips .pdf", () => { assert.equal(cand.sourceTitle, "MillManual"); });
  it("citation includes filename + page", () => { assert.equal(cand.citation, "MillManual.pdf p3"); });
  it("page echoes record.pageNum", () => { assert.equal(cand.page, 3); });
  it("domain echoes record.domain", () => { assert.equal(cand.domain, "mill"); });
  it("controller echoes record.controller", () => { assert.equal(cand.controller, "haas"); });
  it("difficulty echoes record.difficulty", () => { assert.equal(cand.difficulty, "advanced"); });
  it("score echoes record.score", () => { assert.equal(cand.score, 5.5); });
  it("body contains G01 (from page 3 text)", () => { assert.equal(cand.body.includes("G01"), true); });
  it("body does NOT contain 'intro page one' (page 1, not requested)", () => { assert.equal(cand.body.includes("intro page one"), false); });
  it("bodyLength matches body.length", () => { assert.equal(cand.bodyLength, cand.body.length); });

  it("missing controller defaults to null (not undefined)", () => {
    const r2 = { ...record, controller: null };
    assert.equal(buildCandidate(r2, extract).controller, null);
  });

  it("missing score defaults to 0", () => {
    const r2 = { ...record, score: undefined };
    assert.equal(buildCandidate(r2, extract).score, 0);
  });
});

describe("selectHighSignalRecords: advanced + complex only", () => {
  const records = [
    { difficulty: "unscored" }, { difficulty: "easy" },
    { difficulty: "intermediate" }, { difficulty: "intermediate" },
    { difficulty: "advanced" }, { difficulty: "advanced" }, { difficulty: "advanced" },
    { difficulty: "complex" },
  ];

  it("returns 4 (3 advanced + 1 complex)", () => {
    assert.equal(selectHighSignalRecords(records).length, 4);
  });

  it("first selected is advanced", () => {
    assert.equal(selectHighSignalRecords(records)[0].difficulty, "advanced");
  });

  it("last selected is complex", () => {
    assert.equal(selectHighSignalRecords(records)[3].difficulty, "complex");
  });

  it("non-array input returns empty length 0", () => {
    assert.equal(selectHighSignalRecords(null).length, 0);
  });

  it("empty input returns empty length 0", () => {
    assert.equal(selectHighSignalRecords([]).length, 0);
  });
});

describe("deduplicateCandidates: id-keyed dedup", () => {
  const a = { id: "cur-aaa", body: "v1" };
  const b = { id: "cur-bbb", body: "v2" };
  const c = { id: "cur-aaa", body: "v3" };

  it("3 candidates with 1 dup returns 2 unique", () => {
    assert.equal(deduplicateCandidates([a, b, c]).length, 2);
  });

  it("latest entry for duplicate id wins", () => {
    const out = deduplicateCandidates([a, b, c]);
    const dup = out.find((x) => x.id === "cur-aaa");
    assert.equal(dup.body, "v3");
  });

  it("null entries skipped", () => {
    assert.equal(deduplicateCandidates([null, a, undefined]).length, 1);
  });
});

describe("groupCandidatesByDomain: domain grouping", () => {
  const cands = [
    { id: "1", domain: "mill" },
    { id: "2", domain: "mill" },
    { id: "3", domain: "cam" },
    { id: "4", domain: "wire" },
  ];

  it("3 unique domains", () => {
    assert.equal(groupCandidatesByDomain(cands).size, 3);
  });

  it("mill domain has 2 candidates", () => {
    assert.equal(groupCandidatesByDomain(cands).get("mill").length, 2);
  });

  it("cam domain has 1 candidate", () => {
    assert.equal(groupCandidatesByDomain(cands).get("cam").length, 1);
  });

  it("candidate without domain defaults to 'reference' bucket", () => {
    const out = groupCandidatesByDomain([{ id: "5" }]);
    assert.equal(out.get("reference").length, 1);
  });
});
