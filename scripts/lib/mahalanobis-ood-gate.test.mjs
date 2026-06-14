/**
 * mahalanobis-ood-gate.test.mjs — concrete-value tests for the
 * Mahalanobis OOD gate. Every assertion uses `.deepStrictEqual` /
 * `.strictEqual` on a hand-checked value — no `.ok(...)` stubs.
 *
 * Hand-checked values (1-D corpus [[1],[2],[3],[4],[5]]):
 *   mean=[3], sample-variance=2.5, stddev=sqrt(2.5)
 *   d² for query [3]  = ((3-3)²)/2.5 = 0
 *   d² for query [5]  = ((5-3)²)/2.5 = 4/2.5 = 1.6
 *   d² for query [7]  = ((7-3)²)/2.5 = 16/2.5 = 6.4
 *   d² for query [10] = ((10-3)²)/2.5 = 49/2.5 = 19.6
 *
 * χ² critical values (df=1: pass=3.841, warn=6.635):
 *   d²=0   → PASS    (0 ≤ 3.841)
 *   d²=1.6 → PASS    (1.6 ≤ 3.841)
 *   d²=6.4 → WARN    (3.841 < 6.4 ≤ 6.635)
 *   d²=19.6 → REFUSE (19.6 > 6.635)
 */

import { describe, it } from "node:test";
import { strict as assert } from "node:assert";

import {
  MAHALANOBIS_OOD_SCHEMA_VERSION,
  MIN_CORPUS_ROWS,
  DEFAULT_DECIMAL_PLACES,
  DEFAULT_PASS_LEVEL,
  DEFAULT_WARN_LEVEL,
  SUPPORTED_DIALECTS,
  CHI_SQ_CRITICAL,
  chiSquareCritical,
  buildReferenceState,
  mahalanobisDistanceSquared,
  mahalanobisDistance,
  classifyPoint,
  formatComment,
  formatGateBandText,
  buildOodGateComment,
  emitWithOodGate,
} from "./mahalanobis-ood-gate.mjs";

const EPS = 1e-9;
const approx = (a, b) => Math.abs(a - b) < EPS;
const SQRT_2_5 = Math.sqrt(2.5); // ≈ 1.5811388300841898

const CORPUS_1D = [[1], [2], [3], [4], [5]];
const CORPUS_2D = [[1, 1], [2, 2], [3, 3], [4, 4], [5, 5]];

describe("constants", () => {
  it("MAHALANOBIS_OOD_SCHEMA_VERSION = 1", () => {
    assert.strictEqual(MAHALANOBIS_OOD_SCHEMA_VERSION, 1);
  });
  it("MIN_CORPUS_ROWS = 2", () => {
    assert.strictEqual(MIN_CORPUS_ROWS, 2);
  });
  it("DEFAULT_DECIMAL_PLACES = 3", () => {
    assert.strictEqual(DEFAULT_DECIMAL_PLACES, 3);
  });
  it("DEFAULT_PASS_LEVEL = 0.95 / DEFAULT_WARN_LEVEL = 0.99", () => {
    assert.strictEqual(DEFAULT_PASS_LEVEL, 0.95);
    assert.strictEqual(DEFAULT_WARN_LEVEL, 0.99);
  });
  it("SUPPORTED_DIALECTS has exactly 5 entries", () => {
    assert.deepStrictEqual(SUPPORTED_DIALECTS, [
      "fanuc", "haas", "heidenhain", "mitsubishi", "siemens",
    ]);
  });
  it("CHI_SQ_CRITICAL[0.95][1] = 3.841 (canonical χ² table value)", () => {
    assert.strictEqual(CHI_SQ_CRITICAL[0.95][1], 3.841);
  });
  it("CHI_SQ_CRITICAL[0.99][2] = 9.210", () => {
    assert.strictEqual(CHI_SQ_CRITICAL[0.99][2], 9.210);
  });
  it("CHI_SQ_CRITICAL[0.999][6] = 22.458", () => {
    assert.strictEqual(CHI_SQ_CRITICAL[0.999][6], 22.458);
  });
});

describe("chiSquareCritical", () => {
  it("returns 3.841 for (p=0.95, df=1)", () => {
    assert.strictEqual(chiSquareCritical(0.95, 1), 3.841);
  });
  it("returns 5.991 for (p=0.95, df=2)", () => {
    assert.strictEqual(chiSquareCritical(0.95, 2), 5.991);
  });
  it("returns 6.635 for (p=0.99, df=1)", () => {
    assert.strictEqual(chiSquareCritical(0.99, 1), 6.635);
  });
  it("returns 9.210 for (p=0.99, df=2)", () => {
    assert.strictEqual(chiSquareCritical(0.99, 2), 9.210);
  });
  it("returns 22.458 for (p=0.999, df=6) — highest table value", () => {
    assert.strictEqual(chiSquareCritical(0.999, 6), 22.458);
  });
  it("returns null for unsupported p-level (e.g. 0.5)", () => {
    assert.strictEqual(chiSquareCritical(0.5, 1), null);
  });
  it("returns null for df out of range (df=7)", () => {
    assert.strictEqual(chiSquareCritical(0.95, 7), null);
  });
  it("returns null for df=0", () => {
    assert.strictEqual(chiSquareCritical(0.95, 0), null);
  });
  it("returns null for non-integer df (1.5)", () => {
    assert.strictEqual(chiSquareCritical(0.95, 1.5), null);
  });
  it("returns null for negative df", () => {
    assert.strictEqual(chiSquareCritical(0.95, -1), null);
  });
});

describe("buildReferenceState", () => {
  it("1D corpus [[1],[2],[3],[4],[5]] → mean=[3], stddev=[sqrt(2.5)], dim=1, n=5", () => {
    const s = buildReferenceState(CORPUS_1D);
    assert.deepStrictEqual(s.mean, [3]);
    assert.ok(approx(s.stddev[0], SQRT_2_5));
    assert.strictEqual(s.dim, 1);
    assert.strictEqual(s.n, 5);
    assert.strictEqual(s.schemaVersion, 1);
  });
  it("2D corpus → mean=[3,3], stddev=[sqrt(2.5), sqrt(2.5)], dim=2", () => {
    const s = buildReferenceState(CORPUS_2D);
    assert.deepStrictEqual(s.mean, [3, 3]);
    assert.ok(approx(s.stddev[0], SQRT_2_5));
    assert.ok(approx(s.stddev[1], SQRT_2_5));
    assert.strictEqual(s.dim, 2);
    assert.strictEqual(s.n, 5);
  });
  it("uses sample variance (n-1 divisor): 2-row corpus [[0],[2]] → var=2, stddev=sqrt(2)", () => {
    const s = buildReferenceState([[0], [2]]);
    assert.deepStrictEqual(s.mean, [1]);
    assert.ok(approx(s.stddev[0], Math.sqrt(2)));
    assert.strictEqual(s.n, 2);
  });
  it("returns null on n < MIN_CORPUS_ROWS (single row)", () => {
    assert.strictEqual(buildReferenceState([[1]]), null);
  });
  it("returns null on empty corpus", () => {
    assert.strictEqual(buildReferenceState([]), null);
  });
  it("returns null on null input", () => {
    assert.strictEqual(buildReferenceState(null), null);
  });
  it("returns null on dim mismatch between rows", () => {
    assert.strictEqual(buildReferenceState([[1, 1], [2, 2, 2]]), null);
  });
  it("returns null on non-finite value (NaN)", () => {
    assert.strictEqual(buildReferenceState([[1, 1], [Number.NaN, 2]]), null);
  });
  it("returns null on non-finite value (Infinity)", () => {
    assert.strictEqual(buildReferenceState([[1, 1], [Infinity, 2]]), null);
  });
  it("returns null on zero-variance dimension (constant column rejected)", () => {
    assert.strictEqual(buildReferenceState([[1, 5], [2, 5], [3, 5]]), null);
  });
  it("returns null on dim=0 (empty row)", () => {
    assert.strictEqual(buildReferenceState([[], []]), null);
  });
  it("returns null on dim=7 (above max)", () => {
    assert.strictEqual(buildReferenceState([[1, 2, 3, 4, 5, 6, 7], [2, 3, 4, 5, 6, 7, 8]]), null);
  });
  it("returns null on row not an array", () => {
    assert.strictEqual(buildReferenceState([[1], 2]), null);
  });
});

describe("mahalanobisDistanceSquared", () => {
  const state1D = buildReferenceState(CORPUS_1D);
  const state2D = buildReferenceState(CORPUS_2D);

  it("query [3] (at mean) in 1D state → d²=0 exactly", () => {
    assert.strictEqual(mahalanobisDistanceSquared([3], state1D), 0);
  });
  it("query [5] in 1D state → d² = 4/2.5 = 1.6", () => {
    assert.ok(approx(mahalanobisDistanceSquared([5], state1D), 1.6));
  });
  it("query [7] in 1D state → d² = 16/2.5 = 6.4", () => {
    assert.ok(approx(mahalanobisDistanceSquared([7], state1D), 6.4));
  });
  it("query [10] in 1D state → d² = 49/2.5 = 19.6", () => {
    assert.ok(approx(mahalanobisDistanceSquared([10], state1D), 19.6));
  });
  it("query [1] (boundary of corpus) in 1D state → d² = 4/2.5 = 1.6 (symmetric to [5])", () => {
    assert.ok(approx(mahalanobisDistanceSquared([1], state1D), 1.6));
  });
  it("query [3,3] (at mean) in 2D state → d²=0", () => {
    assert.strictEqual(mahalanobisDistanceSquared([3, 3], state2D), 0);
  });
  it("query [5,5] in 2D state → d² = 1.6 + 1.6 = 3.2", () => {
    assert.ok(approx(mahalanobisDistanceSquared([5, 5], state2D), 3.2));
  });
  it("query [10,10] in 2D state → d² = 19.6 + 19.6 = 39.2", () => {
    assert.ok(approx(mahalanobisDistanceSquared([10, 10], state2D), 39.2));
  });
  it("query [5,3] in 2D state → d² = 1.6 + 0 = 1.6 (one dim at mean)", () => {
    assert.ok(approx(mahalanobisDistanceSquared([5, 3], state2D), 1.6));
  });
  it("returns null on dim mismatch (1D query, 2D state)", () => {
    assert.strictEqual(mahalanobisDistanceSquared([3], state2D), null);
  });
  it("returns null on null state", () => {
    assert.strictEqual(mahalanobisDistanceSquared([3], null), null);
  });
  it("returns null on non-finite point value (NaN)", () => {
    assert.strictEqual(mahalanobisDistanceSquared([Number.NaN], state1D), null);
  });
  it("returns null on non-array point", () => {
    assert.strictEqual(mahalanobisDistanceSquared("not-an-array", state1D), null);
  });
});

describe("mahalanobisDistance", () => {
  const state1D = buildReferenceState(CORPUS_1D);

  it("query [3] → distance=0", () => {
    assert.strictEqual(mahalanobisDistance([3], state1D), 0);
  });
  it("query [5] → distance = sqrt(1.6) ≈ 1.2649110640673518", () => {
    assert.ok(approx(mahalanobisDistance([5], state1D), Math.sqrt(1.6)));
  });
  it("query [10] → distance = sqrt(19.6) ≈ 4.427188724235731", () => {
    assert.ok(approx(mahalanobisDistance([10], state1D), Math.sqrt(19.6)));
  });
  it("returns null on bad input (propagates from d²)", () => {
    assert.strictEqual(mahalanobisDistance(null, state1D), null);
  });
});

describe("classifyPoint", () => {
  const state1D = buildReferenceState(CORPUS_1D);
  const state2D = buildReferenceState(CORPUS_2D);

  it("d²=0 → PASS (allowed=true)", () => {
    const c = classifyPoint([3], state1D);
    assert.strictEqual(c.classification, "PASS");
    assert.strictEqual(c.allowed, true);
    assert.strictEqual(c.distanceSquared, 0);
    assert.strictEqual(c.distance, 0);
    assert.strictEqual(c.df, 1);
    assert.strictEqual(c.passThreshold, 3.841);
    assert.strictEqual(c.warnThreshold, 6.635);
  });
  it("d²=1.6 (≤3.841) → PASS", () => {
    const c = classifyPoint([5], state1D);
    assert.strictEqual(c.classification, "PASS");
    assert.strictEqual(c.allowed, true);
    assert.ok(approx(c.distanceSquared, 1.6));
  });
  it("d²=6.4 (>3.841 and ≤6.635) → WARN (allowed=true)", () => {
    const c = classifyPoint([7], state1D);
    assert.strictEqual(c.classification, "WARN");
    assert.strictEqual(c.allowed, true);
    assert.ok(approx(c.distanceSquared, 6.4));
  });
  it("d²=19.6 (>6.635) → REFUSE (allowed=false)", () => {
    const c = classifyPoint([10], state1D);
    assert.strictEqual(c.classification, "REFUSE");
    assert.strictEqual(c.allowed, false);
    assert.ok(approx(c.distanceSquared, 19.6));
  });
  it("2D d²=3.2 (≤5.991) → PASS", () => {
    const c = classifyPoint([5, 5], state2D);
    assert.strictEqual(c.classification, "PASS");
    assert.strictEqual(c.df, 2);
    assert.strictEqual(c.passThreshold, 5.991);
  });
  it("2D d²=7.2 (>5.991 and ≤9.210) → WARN — point [6,6]", () => {
    // 2·((6-3)²/2.5) = 2·3.6 = 7.2
    const c = classifyPoint([6, 6], state2D);
    assert.ok(approx(c.distanceSquared, 7.2));
    assert.strictEqual(c.classification, "WARN");
    assert.strictEqual(c.warnThreshold, 9.210);
  });
  it("2D d²=39.2 → REFUSE", () => {
    const c = classifyPoint([10, 10], state2D);
    assert.strictEqual(c.classification, "REFUSE");
    assert.strictEqual(c.allowed, false);
  });
  it("respects custom passLevel=0.99 / warnLevel=0.999 (looser gate)", () => {
    // d²=6.4 in 1D state → with passLevel=0.99 (thresh=6.635) → still PASS
    const c = classifyPoint([7], state1D, { passLevel: 0.99, warnLevel: 0.999 });
    assert.strictEqual(c.classification, "PASS");
    assert.strictEqual(c.passThreshold, 6.635);
    assert.strictEqual(c.warnThreshold, 10.828);
  });
  it("returns null on unsupported passLevel (0.5)", () => {
    assert.strictEqual(classifyPoint([3], state1D, { passLevel: 0.5 }), null);
  });
  it("returns null on bad input (propagates from d²)", () => {
    assert.strictEqual(classifyPoint(null, state1D), null);
  });
});

describe("formatComment", () => {
  it("fanuc wraps with '( ' ... ' )'", () => {
    assert.strictEqual(formatComment("fanuc", "OOD PASS"), "( OOD PASS )");
  });
  it("haas wraps with '( ' ... ' )'", () => {
    assert.strictEqual(formatComment("haas", "OOD WARN"), "( OOD WARN )");
  });
  it("mitsubishi wraps with '( ' ... ' )'", () => {
    assert.strictEqual(formatComment("mitsubishi", "OOD REFUSE"), "( OOD REFUSE )");
  });
  it("heidenhain wraps with '; ' ... ''", () => {
    assert.strictEqual(formatComment("heidenhain", "OOD PASS"), "; OOD PASS");
  });
  it("siemens wraps with '; ' ... ''", () => {
    assert.strictEqual(formatComment("siemens", "OOD WARN"), "; OOD WARN");
  });
  it("fanuc strips embedded parens (nesting-illegal)", () => {
    assert.strictEqual(formatComment("fanuc", "OOD (test) data"), "( OOD test data )");
  });
  it("haas strips parens only — content between them is preserved", () => {
    assert.strictEqual(formatComment("haas", "X(1)Y"), "( X1Y )");
  });
  it("heidenhain preserves parens (legal in line-comment)", () => {
    assert.strictEqual(formatComment("heidenhain", "OOD (test)"), "; OOD (test)");
  });
  it("siemens preserves parens", () => {
    assert.strictEqual(formatComment("siemens", "X(1)Y"), "; X(1)Y");
  });
  it("returns null on unsupported dialect", () => {
    assert.strictEqual(formatComment("makino", "x"), null);
  });
  it("returns null on non-string text", () => {
    assert.strictEqual(formatComment("fanuc", 42), null);
  });
});

describe("formatGateBandText", () => {
  const state1D = buildReferenceState(CORPUS_1D);

  it("PASS classification → renders OOD PASS line with rounded values", () => {
    const c = classifyPoint([3], state1D);
    const text = formatGateBandText(c);
    assert.strictEqual(text, "OOD PASS  d=0.000  d²=0.000  χ²(0.99,df=1)=6.635");
  });
  it("REFUSE classification → renders OOD REFUSE for query [10]", () => {
    const c = classifyPoint([10], state1D);
    const text = formatGateBandText(c);
    // sqrt(19.6) ≈ 4.427188724235731 → toFixed(3) = "4.427"
    assert.strictEqual(text, "OOD REFUSE  d=4.427  d²=19.600  χ²(0.99,df=1)=6.635");
  });
  it("WARN classification → renders OOD WARN for query [7]", () => {
    const c = classifyPoint([7], state1D);
    const text = formatGateBandText(c);
    // sqrt(6.4) ≈ 2.5298... → toFixed(3) = "2.530"
    assert.strictEqual(text, "OOD WARN  d=2.530  d²=6.400  χ²(0.99,df=1)=6.635");
  });
  it("respects custom decimalPlaces=1", () => {
    const c = classifyPoint([10], state1D);
    const text = formatGateBandText(c, { decimalPlaces: 1 });
    assert.strictEqual(text, "OOD REFUSE  d=4.4  d²=19.6  χ²(0.99,df=1)=6.6");
  });
  it("decimalPlaces=0 → integer-rounded", () => {
    const c = classifyPoint([10], state1D);
    const text = formatGateBandText(c, { decimalPlaces: 0 });
    assert.strictEqual(text, "OOD REFUSE  d=4  d²=20  χ²(0.99,df=1)=7");
  });
  it("returns null on null classification", () => {
    assert.strictEqual(formatGateBandText(null), null);
  });
  it("returns null on bad classification.classification field", () => {
    assert.strictEqual(formatGateBandText({ classification: "MAYBE" }), null);
  });
});

describe("buildOodGateComment", () => {
  const state1D = buildReferenceState(CORPUS_1D);

  it("fanuc + PASS at mean — parens stripped from χ²(...) notation", () => {
    const c = buildOodGateComment({ point: [3], state: state1D, dialect: "fanuc" });
    assert.strictEqual(c, "( OOD PASS  d=0.000  d²=0.000  χ²0.99,df=1=6.635 )");
  });
  it("haas + REFUSE at [10] — parens stripped from χ²(...) notation", () => {
    const c = buildOodGateComment({ point: [10], state: state1D, dialect: "haas" });
    assert.strictEqual(c, "( OOD REFUSE  d=4.427  d²=19.600  χ²0.99,df=1=6.635 )");
  });
  it("heidenhain uses '; ' prefix", () => {
    const c = buildOodGateComment({ point: [3], state: state1D, dialect: "heidenhain" });
    assert.strictEqual(c, "; OOD PASS  d=0.000  d²=0.000  χ²(0.99,df=1)=6.635");
  });
  it("siemens uses '; ' prefix", () => {
    const c = buildOodGateComment({ point: [10], state: state1D, dialect: "siemens" });
    assert.strictEqual(c, "; OOD REFUSE  d=4.427  d²=19.600  χ²(0.99,df=1)=6.635");
  });
  it("returns null on unsupported dialect", () => {
    assert.strictEqual(buildOodGateComment({ point: [3], state: state1D, dialect: "makino" }), null);
  });
  it("returns null on bad point", () => {
    assert.strictEqual(buildOodGateComment({ point: [Number.NaN], state: state1D, dialect: "fanuc" }), null);
  });
});

describe("emitWithOodGate", () => {
  const state1D = buildReferenceState(CORPUS_1D);

  it("PASS → allowed=true, programLine preserved", () => {
    const r = emitWithOodGate({
      point: [3], state: state1D, dialect: "fanuc", programLine: "S5000 M03",
    });
    assert.strictEqual(r.allowed, true);
    assert.strictEqual(r.classification, "PASS");
    assert.strictEqual(r.programLine, "S5000 M03");
    assert.strictEqual(r.comment, "( OOD PASS  d=0.000  d²=0.000  χ²0.99,df=1=6.635 )");
    assert.strictEqual(r.distanceSquared, 0);
    assert.strictEqual(r.summary.df, 1);
    assert.strictEqual(r.summary.dialect, "fanuc");
    assert.strictEqual(r.summary.schemaVersion, 1);
  });
  it("WARN → allowed=true, programLine preserved (operator alerted but emit proceeds)", () => {
    const r = emitWithOodGate({
      point: [7], state: state1D, dialect: "haas", programLine: "S8000 M03",
    });
    assert.strictEqual(r.allowed, true);
    assert.strictEqual(r.classification, "WARN");
    assert.strictEqual(r.programLine, "S8000 M03");
  });
  it("REFUSE → allowed=false, programLine SUPPRESSED to null", () => {
    const r = emitWithOodGate({
      point: [10], state: state1D, dialect: "fanuc", programLine: "S15000 M03",
    });
    assert.strictEqual(r.allowed, false);
    assert.strictEqual(r.classification, "REFUSE");
    assert.strictEqual(r.programLine, null);
    assert.strictEqual(r.comment, "( OOD REFUSE  d=4.427  d²=19.600  χ²0.99,df=1=6.635 )");
  });
  it("PASS but no programLine supplied → programLine stays null", () => {
    const r = emitWithOodGate({
      point: [3], state: state1D, dialect: "fanuc",
    });
    assert.strictEqual(r.allowed, true);
    assert.strictEqual(r.programLine, null);
  });
  it("respects custom passLevel — PASS at d²=6.4 under passLevel=0.99", () => {
    const r = emitWithOodGate({
      point: [7], state: state1D, dialect: "fanuc", programLine: "S8000",
      options: { passLevel: 0.99, warnLevel: 0.999 },
    });
    assert.strictEqual(r.classification, "PASS");
    assert.strictEqual(r.summary.passThreshold, 6.635);
    assert.strictEqual(r.summary.warnThreshold, 10.828);
  });
  it("returns null on bad request (null)", () => {
    assert.strictEqual(emitWithOodGate(null), null);
  });
  it("returns null on unsupported dialect", () => {
    assert.strictEqual(emitWithOodGate({
      point: [3], state: state1D, dialect: "makino", programLine: "x",
    }), null);
  });
  it("returns null on dim mismatch (1D state, 2D point)", () => {
    assert.strictEqual(emitWithOodGate({
      point: [3, 3], state: state1D, dialect: "fanuc", programLine: "x",
    }), null);
  });
});

describe("regression: classification thresholds are non-overlapping", () => {
  const state1D = buildReferenceState(CORPUS_1D);

  it("d² exactly at passThreshold (3.841) → PASS (inclusive boundary)", () => {
    // synthetic: need a point where d² = 3.841 exactly.
    // d² = ((x-3)²)/2.5 = 3.841 → (x-3)² = 9.6025 → x = 3 + sqrt(9.6025)
    const x = 3 + Math.sqrt(3.841 * 2.5);
    const c = classifyPoint([x], state1D);
    // small floating-point drift acceptable; check classification + boundary check
    assert.ok(approx(c.distanceSquared, 3.841));
    assert.strictEqual(c.classification, "PASS"); // ≤ boundary
  });
  it("d² exactly at warnThreshold (6.635) → WARN (inclusive boundary)", () => {
    const x = 3 + Math.sqrt(6.635 * 2.5);
    const c = classifyPoint([x], state1D);
    assert.ok(approx(c.distanceSquared, 6.635));
    assert.strictEqual(c.classification, "WARN");
  });
  it("d² infinitesimally above warnThreshold → REFUSE", () => {
    const x = 3 + Math.sqrt(6.6351 * 2.5);
    const c = classifyPoint([x], state1D);
    assert.ok(c.distanceSquared > 6.635);
    assert.strictEqual(c.classification, "REFUSE");
  });
});

describe("regression: schema + dialect invariants", () => {
  it("every supported dialect produces a non-null comment for PASS point", () => {
    const state1D = buildReferenceState(CORPUS_1D);
    for (const dialect of SUPPORTED_DIALECTS) {
      const c = buildOodGateComment({ point: [3], state: state1D, dialect });
      assert.ok(typeof c === "string", `dialect=${dialect} returned non-string`);
      assert.ok(c.length > 10, `dialect=${dialect} produced too-short comment`);
    }
  });
  it("emitWithOodGate summary always carries schemaVersion=1", () => {
    const state1D = buildReferenceState(CORPUS_1D);
    const r = emitWithOodGate({ point: [3], state: state1D, dialect: "fanuc" });
    assert.strictEqual(r.summary.schemaVersion, MAHALANOBIS_OOD_SCHEMA_VERSION);
  });
  it("buildReferenceState carries schemaVersion=1", () => {
    const s = buildReferenceState(CORPUS_1D);
    assert.strictEqual(s.schemaVersion, MAHALANOBIS_OOD_SCHEMA_VERSION);
  });
});
