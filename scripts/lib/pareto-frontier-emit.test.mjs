/**
 * pareto-frontier-emit.test.mjs — concrete-value tests for the
 * Pareto frontier emit lib. Every assertion uses `.strictEqual` /
 * `.deepStrictEqual` on a hand-checked value. No `.ok(...)` stubs.
 *
 * Hand-checked dominance examples (all-minimize):
 *   [1,2] dom [2,3] → true   (strict win both, dominates)
 *   [1,2] dom [1,3] → true   (tied on 0, strict win on 1)
 *   [1,2] dom [1,2] → false  (no strict win → no dominance)
 *   [1,3] dom [2,2] → false  (win on 0, lose on 1 → mutually non-dominated)
 *
 * Hand-checked frontier example:
 *   candidates [{fast:[100, 0.5]}, {safe:[120, 0.2]}, {bad:[150, 0.7]}], all-min
 *   - fast vs safe: 100<120 (fast wins) BUT 0.5>0.2 (safe wins) → mutual non-dom
 *   - bad: dominated by both (150>100 AND 0.7>0.5; 150>120 AND 0.7>0.2)
 *   frontier = [fast, safe], dominatedCount = 1
 *
 * Hand-checked select (lex-min-primary on frontier above):
 *   fast.obj[0]=100 < safe.obj[0]=120 → picked = fast
 *
 * Hand-checked select (weighted-sum, weights=[1, 100]):
 *   fast: 1·100 + 100·0.5 = 100 + 50 = 150
 *   safe: 1·120 + 100·0.2 = 120 + 20 = 140 ← min
 *   picked = safe
 */

import { describe, it } from "node:test";
import { strict as assert } from "node:assert";

import {
  PARETO_FRONTIER_EMIT_SCHEMA_VERSION,
  DEFAULT_DECIMAL_PLACES,
  MAX_OBJECTIVES,
  SUPPORTED_STRATEGIES,
  SUPPORTED_DIALECTS,
  formatComment,
  dominatesDirected,
  dominates,
  computeFrontier,
  selectRecommended,
  formatObjectives,
  buildFrontierEmitBlock,
  emitWithParetoFrontier,
} from "./pareto-frontier-emit.mjs";

describe("constants", () => {
  it("PARETO_FRONTIER_EMIT_SCHEMA_VERSION = 1", () => {
    assert.strictEqual(PARETO_FRONTIER_EMIT_SCHEMA_VERSION, 1);
  });
  it("DEFAULT_DECIMAL_PLACES = 3", () => {
    assert.strictEqual(DEFAULT_DECIMAL_PLACES, 3);
  });
  it("MAX_OBJECTIVES = 8", () => {
    assert.strictEqual(MAX_OBJECTIVES, 8);
  });
  it("SUPPORTED_STRATEGIES = [lex-min-primary, weighted-sum]", () => {
    assert.deepStrictEqual(SUPPORTED_STRATEGIES, ["lex-min-primary", "weighted-sum"]);
  });
  it("SUPPORTED_DIALECTS has 5 entries", () => {
    assert.deepStrictEqual(SUPPORTED_DIALECTS, [
      "fanuc", "haas", "heidenhain", "mitsubishi", "siemens",
    ]);
  });
});

describe("formatComment", () => {
  it("fanuc wraps + strips parens (nesting-illegal)", () => {
    assert.strictEqual(formatComment("fanuc", "PARETO chosen=fast"), "( PARETO chosen=fast )");
  });
  it("fanuc strips inner parens from text", () => {
    assert.strictEqual(formatComment("fanuc", "x(1)y"), "( x1y )");
  });
  it("haas matches fanuc behavior", () => {
    assert.strictEqual(formatComment("haas", "ALT safe"), "( ALT safe )");
  });
  it("mitsubishi matches fanuc behavior", () => {
    assert.strictEqual(formatComment("mitsubishi", "x"), "( x )");
  });
  it("heidenhain uses '; ' prefix and preserves parens", () => {
    assert.strictEqual(formatComment("heidenhain", "x(1)"), "; x(1)");
  });
  it("siemens uses '; ' prefix and preserves parens", () => {
    assert.strictEqual(formatComment("siemens", "x(1)"), "; x(1)");
  });
  it("returns null on unsupported dialect", () => {
    assert.strictEqual(formatComment("makino", "x"), null);
  });
  it("returns null on non-string text", () => {
    assert.strictEqual(formatComment("fanuc", 42), null);
  });
});

describe("dominatesDirected — all-minimize default", () => {
  it("[1,2] strictly dominates [2,3]", () => {
    assert.strictEqual(dominatesDirected([1, 2], [2, 3], null), true);
  });
  it("[1,2] weakly+strictly dominates [1,3] (tie on 0, strict on 1)", () => {
    assert.strictEqual(dominatesDirected([1, 2], [1, 3], null), true);
  });
  it("[1,2] does NOT dominate [1,2] (no strict win)", () => {
    assert.strictEqual(dominatesDirected([1, 2], [1, 2], null), false);
  });
  it("[1,3] does NOT dominate [2,2] (win on 0, lose on 1)", () => {
    assert.strictEqual(dominatesDirected([1, 3], [2, 2], null), false);
  });
  it("[2,3] does NOT dominate [1,2] (worse in both)", () => {
    assert.strictEqual(dominatesDirected([2, 3], [1, 2], null), false);
  });
  it("dim mismatch → false", () => {
    assert.strictEqual(dominatesDirected([1], [1, 2], null), false);
  });
  it("non-array input → false", () => {
    assert.strictEqual(dominatesDirected("nope", [1, 2], null), false);
  });
  it("non-finite element → false", () => {
    assert.strictEqual(dominatesDirected([1, Number.NaN], [2, 3], null), false);
  });
  it("empty arrays → false", () => {
    assert.strictEqual(dominatesDirected([], [], null), false);
  });
});

describe("dominatesDirected — directional (mix of min/max)", () => {
  it("max obj0 + min obj1: [10,5] dominates [8,6] (better in both under directions)", () => {
    // directions=[-1,1] means obj0 maximize, obj1 minimize.
    // After sign-flip: a*=[-10,5], b*=[-8,6]. -10<-8 (better), 5<6 (better) → strict dom
    assert.strictEqual(dominatesDirected([10, 5], [8, 6], [-1, 1]), true);
  });
  it("max obj0 + min obj1: [10,7] does NOT dominate [8,6] (max wins but min loses)", () => {
    // a*=[-10, 7], b*=[-8, 6]. -10<-8 (better) but 7>6 (worse) → not dominate
    assert.strictEqual(dominatesDirected([10, 7], [8, 6], [-1, 1]), false);
  });
  it("all-maximize: [5,5] dominates [3,4]", () => {
    // directions=[-1,-1]. a*=[-5,-5], b*=[-3,-4]. -5<-3, -5<-4 → strict dom
    assert.strictEqual(dominatesDirected([5, 5], [3, 4], [-1, -1]), true);
  });
});

describe("dominates (all-minimize shortcut)", () => {
  it("[1,2] dom [2,3] → true (same as dominatesDirected with null)", () => {
    assert.strictEqual(dominates([1, 2], [2, 3]), true);
  });
  it("[1,2] dom [1,2] → false", () => {
    assert.strictEqual(dominates([1, 2], [1, 2]), false);
  });
});

describe("computeFrontier", () => {
  const fastSafeBad = [
    { id: "fast", objectives: [100, 0.5] },
    { id: "safe", objectives: [120, 0.2] },
    { id: "bad", objectives: [150, 0.7] },
  ];

  it("frontier of [fast, safe, bad] all-min = [fast, safe], dom=1", () => {
    const r = computeFrontier(fastSafeBad);
    assert.strictEqual(r.frontier.length, 2);
    assert.strictEqual(r.dominatedCount, 1);
    assert.deepStrictEqual(r.frontierIndices, [0, 1]);
    assert.strictEqual(r.frontier[0].id, "fast");
    assert.strictEqual(r.frontier[1].id, "safe");
  });
  it("two identical candidates → both on frontier (no strict dominance)", () => {
    const r = computeFrontier([
      { id: "X", objectives: [1, 1] },
      { id: "Y", objectives: [1, 1] },
    ]);
    assert.strictEqual(r.frontier.length, 2);
    assert.strictEqual(r.dominatedCount, 0);
  });
  it("one strictly dominates the other → frontier = [winner]", () => {
    const r = computeFrontier([
      { id: "X", objectives: [1, 1] },
      { id: "Y", objectives: [2, 2] },
    ]);
    assert.strictEqual(r.frontier.length, 1);
    assert.strictEqual(r.frontier[0].id, "X");
    assert.strictEqual(r.dominatedCount, 1);
  });
  it("single candidate → frontier=[single], dom=0", () => {
    const r = computeFrontier([{ id: "solo", objectives: [5] }]);
    assert.strictEqual(r.frontier.length, 1);
    assert.strictEqual(r.dominatedCount, 0);
    assert.strictEqual(r.frontier[0].id, "solo");
  });
  it("3D minimize — fully ordered chain: [1,1,1] dominates rest", () => {
    const r = computeFrontier([
      { id: "best", objectives: [1, 1, 1] },
      { id: "mid", objectives: [2, 2, 2] },
      { id: "worst", objectives: [3, 3, 3] },
    ]);
    assert.strictEqual(r.frontier.length, 1);
    assert.strictEqual(r.frontier[0].id, "best");
    assert.strictEqual(r.dominatedCount, 2);
  });
  it("respects directions=[-1, 1] (max obj0, min obj1)", () => {
    // [10, 5] dominates [8, 6] under [max, min] (as verified above)
    const r = computeFrontier([
      { id: "high-fast", objectives: [10, 5] },
      { id: "low-slow", objectives: [8, 6] },
    ], { directions: [-1, 1] });
    assert.strictEqual(r.frontier.length, 1);
    assert.strictEqual(r.frontier[0].id, "high-fast");
  });
  it("returns null on empty candidates", () => {
    assert.strictEqual(computeFrontier([]), null);
  });
  it("returns null on null input", () => {
    assert.strictEqual(computeFrontier(null), null);
  });
  it("returns null on dim mismatch", () => {
    assert.strictEqual(computeFrontier([
      { id: "A", objectives: [1] },
      { id: "B", objectives: [1, 2] },
    ]), null);
  });
  it("returns null on candidate missing id", () => {
    assert.strictEqual(computeFrontier([{ objectives: [1] }, { id: "B", objectives: [2] }]), null);
  });
  it("returns null on non-finite objective", () => {
    assert.strictEqual(computeFrontier([
      { id: "A", objectives: [Number.NaN] },
      { id: "B", objectives: [1] },
    ]), null);
  });
  it("returns null on dim=0 objectives", () => {
    assert.strictEqual(computeFrontier([{ id: "A", objectives: [] }]), null);
  });
  it("returns null on dim > MAX_OBJECTIVES (9)", () => {
    const obj = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    assert.strictEqual(computeFrontier([{ id: "A", objectives: obj }, { id: "B", objectives: obj }]), null);
  });
  it("returns null on bad directions length", () => {
    assert.strictEqual(
      computeFrontier([{ id: "A", objectives: [1, 2] }, { id: "B", objectives: [2, 1] }], { directions: [1] }),
      null,
    );
  });
  it("returns null on directions containing non-±1", () => {
    assert.strictEqual(
      computeFrontier([{ id: "A", objectives: [1, 2] }, { id: "B", objectives: [2, 1] }], { directions: [1, 2] }),
      null,
    );
  });
});

describe("selectRecommended", () => {
  const frontierABC = [
    { id: "A", objectives: [3, 1] },
    { id: "B", objectives: [1, 3] },
    { id: "C", objectives: [2, 2] },
  ];

  it("lex-min-primary: picks lowest obj[0] (B, obj=[1,3])", () => {
    const r = selectRecommended(frontierABC, "lex-min-primary", null);
    assert.strictEqual(r.candidate.id, "B");
    assert.strictEqual(r.index, 1);
    assert.strictEqual(r.strategy, "lex-min-primary");
  });
  it("lex-min-primary default (strategy=null)", () => {
    const r = selectRecommended(frontierABC, null, null);
    assert.strictEqual(r.candidate.id, "B");
  });
  it("lex-min-primary lex tiebreak on second obj", () => {
    const r = selectRecommended([
      { id: "P", objectives: [1, 5] },
      { id: "Q", objectives: [1, 3] },
      { id: "R", objectives: [1, 4] },
    ], "lex-min-primary", null);
    assert.strictEqual(r.candidate.id, "Q");
  });
  it("weighted-sum equal weights=[1,1] — all tied at 4 → first wins (A)", () => {
    // A: 3+1=4, B: 1+3=4, C: 2+2=4 — all tie → first (A)
    const r = selectRecommended(frontierABC, "weighted-sum", { weights: [1, 1] });
    assert.strictEqual(r.candidate.id, "A");
    assert.strictEqual(r.score, 4);
  });
  it("weighted-sum weights=[1, 2] — min is A (3+2=5)", () => {
    // A: 3·1+1·2=5, B: 1+6=7, C: 2+4=6 → A
    const r = selectRecommended(frontierABC, "weighted-sum", { weights: [1, 2] });
    assert.strictEqual(r.candidate.id, "A");
    assert.strictEqual(r.score, 5);
  });
  it("weighted-sum weights=[2, 1] — min is B (1·2+3·1=5)", () => {
    // A: 6+1=7, B: 2+3=5, C: 4+2=6 → B
    const r = selectRecommended(frontierABC, "weighted-sum", { weights: [2, 1] });
    assert.strictEqual(r.candidate.id, "B");
    assert.strictEqual(r.score, 5);
  });
  it("weighted-sum defaults weights=[1,1,1,...] when absent", () => {
    const r = selectRecommended(frontierABC, "weighted-sum", null);
    assert.strictEqual(r.candidate.id, "A");
    assert.strictEqual(r.score, 4);
  });
  it("returns null on empty frontier", () => {
    assert.strictEqual(selectRecommended([], "lex-min-primary", null), null);
  });
  it("returns null on unsupported strategy", () => {
    assert.strictEqual(selectRecommended(frontierABC, "random", null), null);
  });
  it("returns null on non-finite weight", () => {
    assert.strictEqual(
      selectRecommended(frontierABC, "weighted-sum", { weights: [1, Number.NaN] }),
      null,
    );
  });
  it("returns null on negative weight", () => {
    assert.strictEqual(
      selectRecommended(frontierABC, "weighted-sum", { weights: [1, -1] }),
      null,
    );
  });
});

describe("formatObjectives", () => {
  it("default decimal places (3) + named objectives", () => {
    assert.strictEqual(
      formatObjectives([1, 0.5], ["cycle", "wear"], undefined),
      "cycle=1.000 wear=0.500",
    );
  });
  it("explicit decimalPlaces=1", () => {
    assert.strictEqual(
      formatObjectives([1.25, 0.55], ["cycle", "wear"], 1),
      "cycle=1.3 wear=0.6",
    );
  });
  it("decimalPlaces=0 → integer-rounded", () => {
    assert.strictEqual(
      formatObjectives([1.7, 2.4], ["a", "b"], 0),
      "a=2 b=2",
    );
  });
  it("auto-names o0/o1 when objectiveNames absent", () => {
    assert.strictEqual(formatObjectives([1, 2], null, 0), "o0=1 o1=2");
  });
  it("partial objectiveNames falls back to o<i> for missing", () => {
    // (Array.isArray check + typeof check per impl — if names[i] not string, fall back to o<i>)
    assert.strictEqual(formatObjectives([1, 2], ["cycle"], 0), "cycle=1 o1=2");
  });
  it("empty objectives → empty string", () => {
    assert.strictEqual(formatObjectives([], null, 2), "");
  });
  it("returns null on non-array input", () => {
    assert.strictEqual(formatObjectives(null, null, 0), null);
  });
});

describe("buildFrontierEmitBlock", () => {
  const fastSafeBad = [
    { id: "fast", objectives: [100, 0.5] },
    { id: "safe", objectives: [120, 0.2] },
    { id: "bad", objectives: [150, 0.7] },
  ];

  it("fanuc header summarizes frontier+dominated counts (lex-min-primary picks fast)", () => {
    const r = buildFrontierEmitBlock({ candidates: fastSafeBad, dialect: "fanuc" });
    assert.strictEqual(r.headerLine, "( PARETO chosen=fast strategy=lex-min-primary frontier=2 of 3 dom=1 )");
    assert.strictEqual(r.picked.id, "fast");
    assert.strictEqual(r.frontierCount, 2);
    assert.strictEqual(r.dominatedCount, 1);
    assert.strictEqual(r.totalCount, 3);
  });
  it("fanuc alt-lines: PICK fast, ALT safe (frontier=2)", () => {
    const r = buildFrontierEmitBlock({ candidates: fastSafeBad, dialect: "fanuc" });
    assert.strictEqual(r.altLines.length, 2);
    assert.strictEqual(r.altLines[0], "( PICK fast  o0=100.000 o1=0.500 )");
    assert.strictEqual(r.altLines[1], "( ALT safe  o0=120.000 o1=0.200 )");
  });
  it("heidenhain uses '; ' prefix on header + alts", () => {
    const r = buildFrontierEmitBlock({ candidates: fastSafeBad, dialect: "heidenhain" });
    assert.strictEqual(r.headerLine, "; PARETO chosen=fast strategy=lex-min-primary frontier=2 of 3 dom=1");
    assert.strictEqual(r.altLines[0], "; PICK fast  o0=100.000 o1=0.500");
  });
  it("weighted-sum strategy with weights=[1, 100] picks safe (sum 100+50 vs 120+20=140)", () => {
    const r = buildFrontierEmitBlock({
      candidates: fastSafeBad,
      dialect: "fanuc",
      options: { strategy: "weighted-sum", weights: [1, 100] },
    });
    assert.strictEqual(r.picked.id, "safe");
    assert.strictEqual(r.pickedIndex, 1);
  });
  it("named objectives appear in alt-lines", () => {
    const r = buildFrontierEmitBlock({
      candidates: fastSafeBad,
      dialect: "fanuc",
      options: { objectiveNames: ["cycle", "wear"], decimalPlaces: 1 },
    });
    assert.strictEqual(r.altLines[0], "( PICK fast  cycle=100.0 wear=0.5 )");
    assert.strictEqual(r.altLines[1], "( ALT safe  cycle=120.0 wear=0.2 )");
  });
  it("returns null on bad dialect", () => {
    assert.strictEqual(buildFrontierEmitBlock({ candidates: fastSafeBad, dialect: "x" }), null);
  });
  it("returns null on bad candidates", () => {
    assert.strictEqual(buildFrontierEmitBlock({ candidates: [], dialect: "fanuc" }), null);
  });
});

describe("emitWithParetoFrontier", () => {
  const fastSafeBad = [
    { id: "fast", objectives: [100, 0.5] },
    { id: "safe", objectives: [120, 0.2] },
    { id: "bad", objectives: [150, 0.7] },
  ];

  it("full emit pipeline with default lex-min-primary picks fast", () => {
    const r = emitWithParetoFrontier({
      candidates: fastSafeBad,
      dialect: "fanuc",
      programLines: ["G0 X10", "G1 Z-5 F100"],
    });
    assert.strictEqual(r.allowed, true);
    assert.strictEqual(r.picked.id, "fast");
    assert.strictEqual(r.headerLine, "( PARETO chosen=fast strategy=lex-min-primary frontier=2 of 3 dom=1 )");
    assert.strictEqual(r.altLines.length, 2);
    assert.deepStrictEqual(r.programLines, ["G0 X10", "G1 Z-5 F100"]);
    assert.strictEqual(r.summary.dialect, "fanuc");
    assert.strictEqual(r.summary.schemaVersion, 1);
    assert.strictEqual(r.summary.strategy, "lex-min-primary");
    assert.strictEqual(r.summary.frontierCount, 2);
    assert.strictEqual(r.summary.dominatedCount, 1);
    assert.strictEqual(r.summary.totalCount, 3);
  });
  it("emitAltLines=false suppresses alt-lines from output", () => {
    const r = emitWithParetoFrontier({
      candidates: fastSafeBad,
      dialect: "fanuc",
      programLines: ["G0"],
      options: { emitAltLines: false },
    });
    assert.deepStrictEqual(r.altLines, []);
  });
  it("filters non-string entries in programLines", () => {
    const r = emitWithParetoFrontier({
      candidates: fastSafeBad,
      dialect: "fanuc",
      programLines: ["G0", 42, null, "G1 X5"],
    });
    assert.deepStrictEqual(r.programLines, ["G0", "G1 X5"]);
  });
  it("missing programLines → empty []", () => {
    const r = emitWithParetoFrontier({ candidates: fastSafeBad, dialect: "fanuc" });
    assert.deepStrictEqual(r.programLines, []);
  });
  it("returns null on null request", () => {
    assert.strictEqual(emitWithParetoFrontier(null), null);
  });
  it("returns null on bad candidates", () => {
    assert.strictEqual(emitWithParetoFrontier({ candidates: null, dialect: "fanuc" }), null);
  });
  it("returns null on unsupported dialect", () => {
    assert.strictEqual(emitWithParetoFrontier({ candidates: fastSafeBad, dialect: "makino" }), null);
  });
});

describe("regression: directional dominance round-trip", () => {
  it("max+min mixed directions through full pipeline (high-fast over low-slow)", () => {
    const r = emitWithParetoFrontier({
      candidates: [
        { id: "high-fast", objectives: [10, 5] },
        { id: "low-slow", objectives: [8, 6] },
      ],
      dialect: "fanuc",
      options: { directions: [-1, 1], objectiveNames: ["mrr", "wear"], decimalPlaces: 1 },
    });
    assert.strictEqual(r.picked.id, "high-fast");
    assert.strictEqual(r.summary.frontierCount, 1);
    assert.strictEqual(r.summary.dominatedCount, 1);
    assert.strictEqual(r.altLines[0], "( PICK high-fast  mrr=10.0 wear=5.0 )");
  });
  it("all-maximize: largest in both wins", () => {
    const r = emitWithParetoFrontier({
      candidates: [
        { id: "big", objectives: [5, 5] },
        { id: "small", objectives: [3, 4] },
      ],
      dialect: "fanuc",
      options: { directions: [-1, -1] },
    });
    assert.strictEqual(r.picked.id, "big");
    assert.strictEqual(r.summary.frontierCount, 1);
  });
});

describe("regression: schema + dialect invariants", () => {
  const fastSafeBad = [
    { id: "fast", objectives: [100, 0.5] },
    { id: "safe", objectives: [120, 0.2] },
    { id: "bad", objectives: [150, 0.7] },
  ];

  it("every dialect produces non-null block with header + alt lines", () => {
    for (const dialect of SUPPORTED_DIALECTS) {
      const r = buildFrontierEmitBlock({ candidates: fastSafeBad, dialect });
      assert.ok(typeof r.headerLine === "string", `dialect=${dialect} null header`);
      assert.strictEqual(r.altLines.length, 2);
    }
  });
  it("schemaVersion=1 on every summary", () => {
    const r = emitWithParetoFrontier({ candidates: fastSafeBad, dialect: "fanuc" });
    assert.strictEqual(r.summary.schemaVersion, PARETO_FRONTIER_EMIT_SCHEMA_VERSION);
  });
});
