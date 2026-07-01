/**
 * training-difficulty-ranker.test.mjs — concrete-value tests for the
 * page-by-page training curriculum ranker.
 *
 * Every assertion is exact-value equality — no presence-only checks,
 * no toBeDefined()/toContain() stubs.
 *
 * @milestone POST-PDF-NODE-MS0/U-JM-TRAINING-CURRICULUM
 * @slot echo
 * @iter 9
 * @date 2026-05-26
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  splitPages,
  extractSignals,
  scorePage,
  rankPagesEasyToComplex,
  mergeCurricula,
  difficultyDistribution,
} from "./training-difficulty-ranker.mjs";

describe("splitPages: form-feed page delimiter", () => {
  it("two pages separated by \\f returns array length 2", () => {
    assert.equal(splitPages("page one\fpage two").length, 2);
  });

  it("no form-feed returns array length 1", () => {
    assert.equal(splitPages("single page").length, 1);
  });

  it("empty string returns array length 0", () => {
    assert.equal(splitPages("").length, 0);
  });

  it("null returns array length 0", () => {
    assert.equal(splitPages(null).length, 0);
  });

  it("undefined returns array length 0", () => {
    assert.equal(splitPages(undefined).length, 0);
  });

  it("first page content preserved exactly", () => {
    assert.equal(splitPages("abc\fdef")[0], "abc");
  });

  it("second page content preserved exactly", () => {
    assert.equal(splitPages("abc\fdef")[1], "def");
  });
});

describe("extractSignals: regex match counts", () => {
  it("G01 G02 G03 returns gCodes=3", () => {
    assert.equal(extractSignals("move via G01 then G02 then G03 done").gCodes, 3);
  });

  it("M03 M05 returns mCodes=2", () => {
    assert.equal(extractSignals("spindle M03 then M05 stop").mCodes, 2);
  });

  it("plain '5-axis' returns fiveAxisRefs=1", () => {
    assert.equal(extractSignals("this is 5-axis machining").fiveAxisRefs, 1);
  });

  it("'multiaxis' returns fiveAxisRefs=1", () => {
    assert.equal(extractSignals("perform multiaxis cuts").fiveAxisRefs, 1);
  });

  it("'macro' twice returns macroRefs=2", () => {
    assert.equal(extractSignals("the macro defines macro variables").macroRefs, 2);
  });

  it("'IF [' returns macroRefs=1", () => {
    assert.equal(extractSignals("conditional IF [#1 GT 0]").macroRefs, 1);
  });

  it("'introduction' returns easyTerms=1", () => {
    assert.equal(extractSignals("introduction to CNC").easyTerms, 1);
  });

  it("'lesson 1' + 'setup' returns easyTerms=2", () => {
    assert.equal(extractSignals("lesson 1 walks you through setup").easyTerms, 2);
  });

  it("'lesson 5' (digit-generalized) returns easyTerms=1", () => {
    assert.equal(extractSignals("lesson 5 advanced topics").easyTerms, 1);
  });

  it("'fundamentals' returns easyTerms=1", () => {
    assert.equal(extractSignals("fundamentals of CNC").easyTerms, 1);
  });

  it("'100 mm' and '5000 rpm' return unitRefs=2", () => {
    assert.equal(extractSignals("feed 100 mm spindle 5000 rpm").unitRefs, 2);
  });

  it("'3.14' returns numericRefs=1", () => {
    assert.equal(extractSignals("pi is 3.14 approximately").numericRefs, 1);
  });

  it("empty string returns wordCount=0", () => {
    assert.equal(extractSignals("").wordCount, 0);
  });

  it("'one two three' returns wordCount=3", () => {
    assert.equal(extractSignals("one two three").wordCount, 3);
  });
});

describe("scorePage: difficulty classification", () => {
  const easyText = "Introduction to CNC machining. This tutorial covers the basics of getting started with your first lesson 1 setup. Welcome and overview of prerequisites for beginners. Chapter 1 chapter overview tutorial setup begins.";
  const advancedText = "Multiaxis swarf machining with 5-axis kinematics. Custom macro subprogram uses parametric variable assignment IF [#1 GT 0] GOTO 100. Post customization for inverse kinematics with thermal comp and look-ahead smoothing. WHILE [#2 LT 10] DO1 macro variable assignment continues.";
  const noiseText = "p. 3";

  it("noise page (< 20 words) returns difficulty=noise", () => {
    assert.equal(scorePage(noiseText).difficulty, "noise");
  });

  it("noise page returns score=0", () => {
    assert.equal(scorePage(noiseText).score, 0);
  });

  it("noise page returns reason=below-min-words", () => {
    assert.equal(scorePage(noiseText).reason, "below-min-words");
  });

  it("low-signal prose page (no positive signals, no easy terms) returns difficulty=unscored", () => {
    const blandProse = "The cutting tool moves through the material under controlled motion. Operators read the program before running it. The workpiece is clamped in the vise. The spindle rotates. The coolant is applied. Material removal continues until the program completes.";
    assert.equal(scorePage(blandProse).difficulty, "unscored");
  });

  it("easy intro page returns difficulty=easy", () => {
    assert.equal(scorePage(easyText).difficulty, "easy");
  });

  it("easy intro page returns reason=easy-terms-dominant", () => {
    assert.equal(scorePage(easyText).reason, "easy-terms-dominant");
  });

  it("easy intro page returns score=1", () => {
    assert.equal(scorePage(easyText).score, 1);
  });

  it("advanced 5-axis+macro+post-custom page returns difficulty=complex", () => {
    assert.equal(scorePage(advancedText).difficulty, "complex");
  });

  it("advanced page returns reason=weighted-signals", () => {
    assert.equal(scorePage(advancedText).reason, "weighted-signals");
  });

  it("advanced page score >= 3.5", () => {
    assert.equal(scorePage(advancedText).score >= 3.5, true);
  });

  it("advanced page score <= 10", () => {
    assert.equal(scorePage(advancedText).score <= 10, true);
  });

  it("position bias: same content late in book scores higher than same content early", () => {
    const a = scorePage(advancedText, { pageNum: 1, totalPages: 100 });
    const b = scorePage(advancedText, { pageNum: 100, totalPages: 100 });
    assert.equal(b.score > a.score, true);
  });
});

describe("rankPagesEasyToComplex: sorted output", () => {
  const easyPage = "Introduction to CNC machining. This tutorial covers the basics of getting started with your first lesson 1 setup. Welcome and overview of prerequisites for beginners. Chapter 1 chapter overview tutorial setup begins.";
  const advancedPage = "Multiaxis swarf machining with 5-axis kinematics. Custom macro subprogram uses parametric variable assignment IF [#1 GT 0] GOTO 100. Post customization for inverse kinematics with thermal comp and look-ahead smoothing. WHILE [#2 LT 10] DO1 macro variable assignment continues.";
  const corpus = `${easyPage}\f${advancedPage}`;

  it("two-page corpus returns length 2", () => {
    assert.equal(rankPagesEasyToComplex(corpus, { filename: "t.pdf" }).length, 2);
  });

  it("first ranked page is the easy one", () => {
    const r = rankPagesEasyToComplex(corpus, { filename: "t.pdf" });
    assert.equal(r[0].difficulty, "easy");
  });

  it("last ranked page is the complex one (5-axis+macro+post-custom)", () => {
    const r = rankPagesEasyToComplex(corpus, { filename: "t.pdf" });
    assert.equal(r[1].difficulty, "complex");
  });

  it("ranked output filename echoed back", () => {
    const r = rankPagesEasyToComplex(corpus, { filename: "t.pdf" });
    assert.equal(r[0].filename, "t.pdf");
  });

  it("ranked output totalPages echoed back", () => {
    const r = rankPagesEasyToComplex(corpus, { filename: "t.pdf" });
    assert.equal(r[0].totalPages, 2);
  });

  it("noise page filtered out (3-page corpus, 1 noise)", () => {
    const c2 = `p. 1\f${easyPage}\f${advancedPage}`;
    const r = rankPagesEasyToComplex(c2, { filename: "t.pdf" });
    assert.equal(r.length, 2);
  });

  it("preview truncated to previewChars param", () => {
    const r = rankPagesEasyToComplex(easyPage, { filename: "t.pdf", previewChars: 50 });
    assert.equal(r[0].preview.length <= 50, true);
  });
});

describe("mergeCurricula: cross-source ranking", () => {
  const sourceA = [
    { filename: "a.pdf", pageNum: 1, difficulty: "easy", score: 1 },
    { filename: "a.pdf", pageNum: 2, difficulty: "advanced", score: 5 },
  ];
  const sourceB = [
    { filename: "b.pdf", pageNum: 1, difficulty: "intermediate", score: 2 },
    { filename: "b.pdf", pageNum: 2, difficulty: "complex", score: 7 },
  ];

  it("merged length is sum of sources", () => {
    assert.equal(mergeCurricula([sourceA, sourceB]).length, 4);
  });

  it("first merged element has lowest score (1)", () => {
    assert.equal(mergeCurricula([sourceA, sourceB])[0].score, 1);
  });

  it("last merged element has highest score (7)", () => {
    assert.equal(mergeCurricula([sourceA, sourceB])[3].score, 7);
  });

  it("second merged element score=2", () => {
    assert.equal(mergeCurricula([sourceA, sourceB])[1].score, 2);
  });

  it("third merged element score=5", () => {
    assert.equal(mergeCurricula([sourceA, sourceB])[2].score, 5);
  });

  it("empty input returns length 0", () => {
    assert.equal(mergeCurricula([]).length, 0);
  });

  it("null entries skipped", () => {
    assert.equal(mergeCurricula([null, sourceA]).length, 2);
  });

  it("tie-break: equal scores sorted by filename ascending", () => {
    const tied = [
      [{ filename: "b.pdf", pageNum: 1, difficulty: "easy", score: 0 }],
      [{ filename: "a.pdf", pageNum: 1, difficulty: "easy", score: 0 }],
    ];
    assert.equal(mergeCurricula(tied)[0].filename, "a.pdf");
  });

  it("tie-break: equal scores + same filename sorted by pageNum ascending", () => {
    const tied = [
      [{ filename: "a.pdf", pageNum: 5, difficulty: "easy", score: 0 }],
      [{ filename: "a.pdf", pageNum: 2, difficulty: "easy", score: 0 }],
    ];
    assert.equal(mergeCurricula(tied)[0].pageNum, 2);
  });
});

describe("difficultyDistribution: bucket counts", () => {
  const ranked = [
    { difficulty: "easy" }, { difficulty: "easy" },
    { difficulty: "intermediate" },
    { difficulty: "advanced" }, { difficulty: "advanced" }, { difficulty: "advanced" },
    { difficulty: "complex" },
  ];

  it("unscored bucket initialized to 0 for input without unscored entries", () => { assert.equal(difficultyDistribution(ranked).unscored, 0); });
  it("easy=2", () => { assert.equal(difficultyDistribution(ranked).easy, 2); });
  it("intermediate=1", () => { assert.equal(difficultyDistribution(ranked).intermediate, 1); });
  it("advanced=3", () => { assert.equal(difficultyDistribution(ranked).advanced, 3); });
  it("complex=1", () => { assert.equal(difficultyDistribution(ranked).complex, 1); });
  it("empty input easy=0", () => { assert.equal(difficultyDistribution([]).easy, 0); });
});
