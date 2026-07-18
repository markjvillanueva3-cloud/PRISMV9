/**
 * cited-tips-emitter.test.mjs — concrete-value tests for the cited-tips
 * TypeScript emitter.
 *
 * Every assertion is exact-value equality.
 *
 * @milestone POST-PDF-NODE-MS0/U-CITED-TIPS-EMIT
 * @slot echo · @iter 13 · @date 2026-05-26
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  truncateBody,
  escapeForTemplate,
  renderTipEntry,
  renderTipsFile,
  bucketByController,
  rankCandidatesForEmit,
} from "./cited-tips-emitter.mjs";

describe("truncateBody: char cap", () => {
  it("under cap returns body unchanged", () => {
    assert.equal(truncateBody("hello", 100), "hello");
  });

  it("over cap returns truncated marker", () => {
    const long = "a".repeat(2500);
    assert.equal(truncateBody(long).includes("[truncated 500 chars]"), true);
  });

  it("over custom cap with max=10 returns 10 chars + marker", () => {
    assert.equal(truncateBody("abcdefghijklmno", 10).startsWith("abcdefghij"), true);
  });

  it("null body returns empty string", () => {
    assert.equal(truncateBody(null, 100), "");
  });

  it("exact cap length returns unchanged", () => {
    const s = "a".repeat(2000);
    assert.equal(truncateBody(s).length, 2000);
  });
});

describe("escapeForTemplate: template-literal escape", () => {
  it("backtick is escaped", () => {
    assert.equal(escapeForTemplate("foo`bar"), "foo\\`bar");
  });

  it("backslash is doubled", () => {
    assert.equal(escapeForTemplate("foo\\bar"), "foo\\\\bar");
  });

  it("${...} interpolation is escaped", () => {
    assert.equal(escapeForTemplate("${x}"), "\\${x}");
  });

  it("plain text unchanged", () => {
    assert.equal(escapeForTemplate("plain text"), "plain text");
  });

  it("null returns empty string", () => {
    assert.equal(escapeForTemplate(null), "");
  });
});

describe("renderTipEntry: TS object literal", () => {
  const cand = {
    id: "cur-aaa",
    sourceId: "Manual.pdf",
    sourceTitle: "Manual",
    citation: "Manual.pdf p5",
    page: 5,
    domain: "mill",
    controller: "haas",
    vendor: "Haas",
    difficulty: "advanced",
    score: 5.5,
    body: "G01 X10 Y20 F100",
  };

  it("contains id field with exact value", () => {
    assert.equal(renderTipEntry(cand).includes('id: "cur-aaa"'), true);
  });

  it("contains citation field with exact value", () => {
    assert.equal(renderTipEntry(cand).includes('citation: "Manual.pdf p5"'), true);
  });

  it("controller=haas rendered as quoted string", () => {
    assert.equal(renderTipEntry(cand).includes('controller: "haas"'), true);
  });

  it("controller=null rendered as bare null literal", () => {
    const r = renderTipEntry({ ...cand, controller: null });
    assert.equal(r.includes("controller: null"), true);
  });

  it("score rendered as numeric literal (no quotes)", () => {
    assert.equal(renderTipEntry(cand).includes("score: 5.5"), true);
  });

  it("body wrapped in backticks", () => {
    assert.equal(renderTipEntry(cand).includes("body: `G01 X10 Y20 F100`"), true);
  });

  it("page=5 rendered as numeric literal", () => {
    assert.equal(renderTipEntry(cand).includes("page: 5"), true);
  });

  it("difficulty=advanced rendered as quoted string", () => {
    assert.equal(renderTipEntry(cand).includes('difficulty: "advanced"'), true);
  });
});

describe("renderTipsFile: full TS module", () => {
  const tips = [
    { id: "cur-aaa", sourceId: "a.pdf", sourceTitle: "A", citation: "a.pdf p1", page: 1, domain: "mill", controller: "haas", vendor: "Haas", difficulty: "easy", score: 1.0, body: "easy text" },
    { id: "cur-bbb", sourceId: "b.pdf", sourceTitle: "B", citation: "b.pdf p2", page: 2, domain: "mill", controller: "haas", vendor: "Haas", difficulty: "advanced", score: 5.0, body: "advanced text" },
  ];
  const out = renderTipsFile("haas", tips);

  it("contains AUTO-GENERATED header", () => {
    assert.equal(out.includes("AUTO-GENERATED"), true);
  });

  it("contains CitedTip interface declaration", () => {
    assert.equal(out.includes("export interface CitedTip"), true);
  });

  it("export const named after controller upper-case", () => {
    assert.equal(out.includes("export const HAAS_CITED_TIPS"), true);
  });

  it("readonly tuple type marker present", () => {
    assert.equal(out.includes("readonly CitedTip[]"), true);
  });

  it("STATS const declared", () => {
    assert.equal(out.includes("HAAS_CITED_TIPS_STATS"), true);
  });

  it("STATS count matches input length", () => {
    assert.equal(out.includes("count: 2,"), true);
  });

  it("both tip ids appear in output", () => {
    assert.equal(out.includes("cur-aaa") && out.includes("cur-bbb"), true);
  });

  it("controller name normalized to underscores in const", () => {
    const r = renderTipsFile("dmg mori", []);
    assert.equal(r.includes("DMG_MORI_CITED_TIPS"), true);
  });
});

describe("bucketByController: groups", () => {
  const cands = [
    { id: "1", controller: "haas" },
    { id: "2", controller: "haas" },
    { id: "3", controller: "mazak" },
    { id: "4", controller: null },
  ];

  it("3 distinct buckets (haas, mazak, unspecified)", () => {
    assert.equal(bucketByController(cands).size, 3);
  });

  it("haas bucket has 2 entries", () => {
    assert.equal(bucketByController(cands).get("haas").length, 2);
  });

  it("mazak bucket has 1 entry", () => {
    assert.equal(bucketByController(cands).get("mazak").length, 1);
  });

  it("null controller bucketed as 'unspecified'", () => {
    assert.equal(bucketByController(cands).get("unspecified").length, 1);
  });
});

describe("rankCandidatesForEmit: stable sort", () => {
  const cands = [
    { id: "x", score: 3 },
    { id: "y", score: 5 },
    { id: "z", score: 1 },
  ];

  it("sorted descending by score: first is y (5)", () => {
    assert.equal(rankCandidatesForEmit(cands)[0].id, "y");
  });

  it("sorted descending by score: last is z (1)", () => {
    assert.equal(rankCandidatesForEmit(cands)[2].id, "z");
  });

  it("tied scores sort by id ascending", () => {
    const tied = [{ id: "b", score: 5 }, { id: "a", score: 5 }];
    assert.equal(rankCandidatesForEmit(tied)[0].id, "a");
  });

  it("missing score treated as 0", () => {
    const mixed = [{ id: "m" }, { id: "n", score: 1 }];
    assert.equal(rankCandidatesForEmit(mixed)[0].id, "n");
  });

  it("non-array input returns empty length 0", () => {
    assert.equal(rankCandidatesForEmit(null).length, 0);
  });
});
