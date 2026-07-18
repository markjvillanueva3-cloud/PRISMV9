/**
 * conformal-pi-emit.test.mjs — concrete-value tests for conformal PI
 * emit (R12 fail-loud win). Wraps iter31 ConformalState in dialect-
 * aware comment lines.
 *
 * Hand-checked calibration:
 *   state α=0.1, residuals [0.5, 1.0, 1.5, 2.0, 2.5]
 *   N=5, rawIndex = ceil(6·0.9) - 1 = 5 → clamped to 4
 *   quantile = sorted[4] = 2.5
 *
 *   predictInterval(state, 10) →
 *     lower = max(0, 10 - 2.5) = 7.5
 *     upper = 10 + 2.5 = 12.5
 *     coverage = 0.9
 *
 *   formatBandText(10, interval, {decimalPlaces:2}) →
 *     "cycle 10.00 min  [7.50 - 12.50 min  P=90%]"
 *
 *   Fanuc comment: "( PROGRAM cycle 10.00 min  [7.50 - 12.50 min  P=90%] )"
 *   Heidenhain comment: "; PROGRAM cycle 10.00 min  [7.50 - 12.50 min  P=90%]"
 *
 * @milestone POST-BRIDGE-SYNERGY-MS0/U-EMIT-CONFORMAL-PI-BANDS
 * @slot echo · @date 2026-05-27
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CONFORMAL_PI_EMIT_SCHEMA_VERSION,
  DEFAULT_DECIMAL_PLACES,
  SUPPORTED_DIALECTS,
  formatComment,
  formatBandText,
  buildProgramHeaderComment,
  buildOpHeaderComment,
  emitConformalPIProgram,
} from "./conformal-pi-emit.mjs";
import {
  createConformalState,
  recordOutcome,
  predictInterval,
} from "./v11-cycle-time-conformal.mjs";

// ---------- helpers ----------
function calibratedState() {
  // Inject 5 residuals via recordOutcome so the conformal-state shape
  // matches what iter31 actually builds:
  let s = createConformalState({ alpha: 0.1, windowSize: 50 });
  s = recordOutcome(s, { predictedMin: 10, actualMin: 10.5 });  // residual 0.5
  s = recordOutcome(s, { predictedMin: 10, actualMin: 11.0 });  // residual 1.0
  s = recordOutcome(s, { predictedMin: 10, actualMin: 11.5 });  // residual 1.5
  s = recordOutcome(s, { predictedMin: 10, actualMin: 12.0 });  // residual 2.0
  s = recordOutcome(s, { predictedMin: 10, actualMin: 12.5 });  // residual 2.5
  return s;
}

describe("constants", () => {
  it("CONFORMAL_PI_EMIT_SCHEMA_VERSION = 1", () => {
    assert.equal(CONFORMAL_PI_EMIT_SCHEMA_VERSION, 1);
  });
  it("DEFAULT_DECIMAL_PLACES = 2", () => {
    assert.equal(DEFAULT_DECIMAL_PLACES, 2);
  });
  it("SUPPORTED_DIALECTS has 5 entries", () => {
    assert.equal(SUPPORTED_DIALECTS.length, 5);
    for (const d of ["fanuc", "haas", "heidenhain", "mitsubishi", "siemens"]) {
      assert.equal(SUPPORTED_DIALECTS.includes(d), true);
    }
  });
});

describe("formatComment — dialect comment delimiters", () => {
  it("fanuc → '( text )'", () => {
    assert.equal(formatComment("fanuc", "test"), "( test )");
  });
  it("haas → '( text )'", () => {
    assert.equal(formatComment("haas", "test"), "( test )");
  });
  it("mitsubishi → '( text )'", () => {
    assert.equal(formatComment("mitsubishi", "test"), "( test )");
  });
  it("heidenhain → '; text'", () => {
    assert.equal(formatComment("heidenhain", "test"), "; test");
  });
  it("siemens → '; text'", () => {
    assert.equal(formatComment("siemens", "test"), "; test");
  });
  it("fanuc strips embedded parens (illegal nesting): '( a (b) c )' input → '( a b c )'", () => {
    const r = formatComment("fanuc", "a (b) c");
    assert.equal(r, "( a b c )");
  });
  it("heidenhain preserves parens (legal in ; comments)", () => {
    const r = formatComment("heidenhain", "a (b) c");
    assert.equal(r, "; a (b) c");
  });
  it("unknown dialect → null", () => {
    assert.equal(formatComment("mazak", "test"), null);
  });
  it("non-string text → null", () => {
    assert.equal(formatComment("fanuc", null), null);
    assert.equal(formatComment("fanuc", 123), null);
  });
});

describe("formatBandText — calibrated vs undertrained", () => {
  it("calibrated state + pred=10 → 'cycle 10.00 min  [7.50 - 12.50 min  P=90%]'", () => {
    const s = calibratedState();
    const interval = predictInterval(s, 10);
    assert.equal(
      formatBandText(10, interval, { decimalPlaces: 2 }),
      "cycle 10.00 min  [7.50 - 12.50 min  P=90%]"
    );
  });

  it("calibrated state + pred=20 → upper=22.5 lower=17.5", () => {
    const s = calibratedState();
    const interval = predictInterval(s, 20);
    assert.equal(
      formatBandText(20, interval, { decimalPlaces: 2 }),
      "cycle 20.00 min  [17.50 - 22.50 min  P=90%]"
    );
  });

  it("lower clamps at 0: pred=2 with q=2.5 → lower=0 not -0.5", () => {
    const s = calibratedState();
    const interval = predictInterval(s, 2);
    assert.equal(interval.lower, 0);
    assert.equal(
      formatBandText(2, interval, { decimalPlaces: 2 }),
      "cycle 2.00 min  [0.00 - 4.50 min  P=90%]"
    );
  });

  it("undertrained state (no residuals) → '[PI: undertrained, point-only]'", () => {
    const s = createConformalState({ alpha: 0.1 });
    const interval = predictInterval(s, 10);
    assert.equal(
      formatBandText(10, interval, { decimalPlaces: 2 }),
      "cycle 10.00 min  [PI: undertrained, point-only]"
    );
  });

  it("invalid pred (negative) → '[PI: invalid input]'", () => {
    const s = calibratedState();
    const interval = predictInterval(s, -1);
    // formatBandText is called on a negative pred — should also return null
    // because precondition checks predictedMin >= 0. But the iter31 interval
    // already returned source='invalid_input'. We give back null at the
    // formatter level when pred itself is invalid.
    assert.equal(formatBandText(-1, interval, { decimalPlaces: 2 }), null);
  });

  it("custom decimalPlaces=0 → integer rounding 'cycle 10 min  [8 - 13 min  P=90%]'", () => {
    const s = calibratedState();
    const interval = predictInterval(s, 10);
    assert.equal(
      formatBandText(10, interval, { decimalPlaces: 0 }),
      "cycle 10 min  [8 - 13 min  P=90%]"
    );
  });

  it("default decimalPlaces=2 when not provided", () => {
    const s = calibratedState();
    const interval = predictInterval(s, 10);
    const r = formatBandText(10, interval);
    assert.equal(r.includes("10.00"), true);
  });

  it("null interval → null", () => {
    assert.equal(formatBandText(10, null), null);
  });

  it("non-finite pred → null", () => {
    const s = calibratedState();
    const interval = predictInterval(s, 10);
    assert.equal(formatBandText(NaN, interval), null);
    assert.equal(formatBandText(Infinity, interval), null);
  });
});

describe("buildProgramHeaderComment — dialect parity", () => {
  it("fanuc, total=10 calibrated → '( PROGRAM cycle 10.00 min  [7.50 - 12.50 min  P=90%] )'", () => {
    const s = calibratedState();
    const r = buildProgramHeaderComment({
      totalPredictedMin: 10,
      conformalState: s,
      dialect: "fanuc",
      options: { decimalPlaces: 2 },
    });
    assert.equal(r, "( PROGRAM cycle 10.00 min  [7.50 - 12.50 min  P=90%] )");
  });

  it("fanuc preserves brackets (only ( and ) stripped): includes '[' and ']'", () => {
    const s = calibratedState();
    const r = buildProgramHeaderComment({
      totalPredictedMin: 10,
      conformalState: s,
      dialect: "fanuc",
      options: { decimalPlaces: 2 },
    });
    assert.equal(r.includes("[7.50"), true);
    assert.equal(r.includes("12.50 min  P=90%]"), true);
  });

  it("heidenhain → '; PROGRAM cycle 10.00 min  [7.50 - 12.50 min  P=90%]'", () => {
    const s = calibratedState();
    const r = buildProgramHeaderComment({
      totalPredictedMin: 10,
      conformalState: s,
      dialect: "heidenhain",
      options: { decimalPlaces: 2 },
    });
    assert.equal(r, "; PROGRAM cycle 10.00 min  [7.50 - 12.50 min  P=90%]");
  });

  it("siemens → '; PROGRAM cycle 10.00 min  [7.50 - 12.50 min  P=90%]'", () => {
    const s = calibratedState();
    const r = buildProgramHeaderComment({
      totalPredictedMin: 10,
      conformalState: s,
      dialect: "siemens",
      options: { decimalPlaces: 2 },
    });
    assert.equal(r, "; PROGRAM cycle 10.00 min  [7.50 - 12.50 min  P=90%]");
  });

  it("undertrained state → emits PI-undertrained advisory in comment", () => {
    const s = createConformalState({ alpha: 0.1 });
    const r = buildProgramHeaderComment({
      totalPredictedMin: 10,
      conformalState: s,
      dialect: "fanuc",
      options: { decimalPlaces: 2 },
    });
    assert.equal(r.includes("undertrained"), true);
  });

  it("unknown dialect → null", () => {
    const s = calibratedState();
    assert.equal(
      buildProgramHeaderComment({
        totalPredictedMin: 10,
        conformalState: s,
        dialect: "mazak",
      }),
      null
    );
  });

  it("negative totalPredictedMin → null", () => {
    const s = calibratedState();
    assert.equal(
      buildProgramHeaderComment({
        totalPredictedMin: -1,
        conformalState: s,
        dialect: "fanuc",
      }),
      null
    );
  });

  it("null conformalState → null", () => {
    assert.equal(
      buildProgramHeaderComment({
        totalPredictedMin: 10,
        conformalState: null,
        dialect: "fanuc",
      }),
      null
    );
  });
});

describe("buildOpHeaderComment", () => {
  it("fanuc + op1 + 5 min → '( OP op1 cycle 5.00 min  [2.50 - 7.50 min  P=90%] )'", () => {
    const s = calibratedState();
    const r = buildOpHeaderComment({
      opId: "op1",
      predictedMin: 5,
      conformalState: s,
      dialect: "fanuc",
      options: { decimalPlaces: 2 },
    });
    assert.equal(r, "( OP op1 cycle 5.00 min  [2.50 - 7.50 min  P=90%] )");
  });

  it("fanuc op1 + 5 min: brackets ARE preserved (not stripped)", () => {
    const s = calibratedState();
    const r = buildOpHeaderComment({
      opId: "op1",
      predictedMin: 5,
      conformalState: s,
      dialect: "fanuc",
      options: { decimalPlaces: 2 },
    });
    assert.equal(r.includes("[2.50"), true);
    assert.equal(r.includes("7.50 min  P=90%]"), true);
  });

  it("heidenhain op_finish_2 + 12 min", () => {
    const s = calibratedState();
    const r = buildOpHeaderComment({
      opId: "op_finish_2",
      predictedMin: 12,
      conformalState: s,
      dialect: "heidenhain",
      options: { decimalPlaces: 2 },
    });
    assert.equal(r, "; OP op_finish_2 cycle 12.00 min  [9.50 - 14.50 min  P=90%]");
  });

  it("missing opId → null", () => {
    const s = calibratedState();
    assert.equal(
      buildOpHeaderComment({
        opId: "",
        predictedMin: 5,
        conformalState: s,
        dialect: "fanuc",
      }),
      null
    );
  });

  it("non-string opId → null", () => {
    const s = calibratedState();
    assert.equal(
      buildOpHeaderComment({
        opId: 123,
        predictedMin: 5,
        conformalState: s,
        dialect: "fanuc",
      }),
      null
    );
  });

  it("negative predictedMin → null", () => {
    const s = calibratedState();
    assert.equal(
      buildOpHeaderComment({
        opId: "op1",
        predictedMin: -1,
        conformalState: s,
        dialect: "fanuc",
      }),
      null
    );
  });
});

describe("emitConformalPIProgram — end-to-end", () => {
  const sampleOps = [
    { id: "op_face", predictedMin: 3, rawLines: ["T1 M06", "M03 S3000", "G00 X0 Y0 Z5", "G01 Z-1 F200"] },
    { id: "op_pocket", predictedMin: 5, rawLines: ["T2 M06", "M03 S6000", "G00 X10 Y10 Z5"] },
    { id: "op_drill", predictedMin: 2, rawLines: ["T3 M06", "G81 X20 Y20 Z-5 F500"] },
  ];

  it("happy path: 3 ops, fanuc, calibrated → annotatedLines non-empty", () => {
    const s = calibratedState();
    const r = emitConformalPIProgram({
      operations: sampleOps,
      conformalState: s,
      dialect: "fanuc",
    });
    assert.notEqual(r, null);
    assert.equal(r.annotatedLines.length > 0, true);
  });

  it("totalPredictedMin = 10 (3+5+2)", () => {
    const s = calibratedState();
    const r = emitConformalPIProgram({
      operations: sampleOps,
      conformalState: s,
      dialect: "fanuc",
    });
    assert.equal(r.summary.totalPredictedMin, 10);
  });

  it("programInterval matches predictInterval(state, 10)", () => {
    const s = calibratedState();
    const r = emitConformalPIProgram({
      operations: sampleOps,
      conformalState: s,
      dialect: "fanuc",
    });
    assert.equal(r.summary.programInterval.lower, 7.5);
    assert.equal(r.summary.programInterval.upper, 12.5);
  });

  it("annotatedLines starts with program header comment containing 'PROGRAM cycle'", () => {
    const s = calibratedState();
    const r = emitConformalPIProgram({
      operations: sampleOps,
      conformalState: s,
      dialect: "fanuc",
    });
    assert.equal(r.annotatedLines[0].includes("PROGRAM cycle 10.00 min"), true);
  });

  it("annotatedLines contains 3 OP header comments (one per op)", () => {
    const s = calibratedState();
    const r = emitConformalPIProgram({
      operations: sampleOps,
      conformalState: s,
      dialect: "fanuc",
    });
    const opCount = r.annotatedLines.filter((l) => l.includes("OP op_")).length;
    assert.equal(opCount, 3);
    assert.equal(r.summary.opAdvisoryCount, 3);
  });

  it("annotatedLines includes ALL original rawLines (preserves G-code)", () => {
    const s = calibratedState();
    const r = emitConformalPIProgram({
      operations: sampleOps,
      conformalState: s,
      dialect: "fanuc",
    });
    const allRaw = sampleOps.flatMap((o) => o.rawLines);
    for (const rl of allRaw) {
      assert.equal(r.annotatedLines.includes(rl), true);
    }
  });

  it("emitProgramHeader=false → no PROGRAM line", () => {
    const s = calibratedState();
    const r = emitConformalPIProgram({
      operations: sampleOps,
      conformalState: s,
      dialect: "fanuc",
      options: { emitProgramHeader: false },
    });
    const hasProgram = r.annotatedLines.some((l) => l.includes("PROGRAM cycle"));
    assert.equal(hasProgram, false);
  });

  it("emitOpHeaders=false → no OP lines", () => {
    const s = calibratedState();
    const r = emitConformalPIProgram({
      operations: sampleOps,
      conformalState: s,
      dialect: "fanuc",
      options: { emitOpHeaders: false },
    });
    assert.equal(r.summary.opAdvisoryCount, 0);
  });

  it("dialect parity: fanuc/heidenhain/siemens all produce non-null output", () => {
    const s = calibratedState();
    for (const dia of ["fanuc", "heidenhain", "siemens"]) {
      const r = emitConformalPIProgram({
        operations: sampleOps,
        conformalState: s,
        dialect: dia,
      });
      assert.notEqual(r, null);
      assert.equal(r.summary.totalPredictedMin, 10);
    }
  });

  it("undertrained state → annotates 'undertrained' but still emits G-code", () => {
    const s = createConformalState({ alpha: 0.1 });
    const r = emitConformalPIProgram({
      operations: sampleOps,
      conformalState: s,
      dialect: "fanuc",
    });
    const hasUndertrained = r.annotatedLines.some((l) => l.includes("undertrained"));
    assert.equal(hasUndertrained, true);
    // Raw G-code is still preserved:
    assert.equal(r.annotatedLines.includes("T1 M06"), true);
  });

  it("empty operations → null", () => {
    const s = calibratedState();
    assert.equal(
      emitConformalPIProgram({
        operations: [],
        conformalState: s,
        dialect: "fanuc",
      }),
      null
    );
  });

  it("unknown dialect → null", () => {
    const s = calibratedState();
    assert.equal(
      emitConformalPIProgram({
        operations: sampleOps,
        conformalState: s,
        dialect: "mazak",
      }),
      null
    );
  });

  it("null conformalState → null", () => {
    assert.equal(
      emitConformalPIProgram({
        operations: sampleOps,
        conformalState: null,
        dialect: "fanuc",
      }),
      null
    );
  });

  it("op with missing predictedMin → skipped from totals but rawLines preserved", () => {
    const s = calibratedState();
    const r = emitConformalPIProgram({
      operations: [
        { id: "op1", predictedMin: 5, rawLines: ["G01 X10 F250"] },
        { id: "op2", rawLines: ["G01 X20 F250"] }, // no predictedMin
      ],
      conformalState: s,
      dialect: "fanuc",
    });
    assert.equal(r.summary.totalPredictedMin, 5);
    assert.equal(r.summary.opAdvisoryCount, 1);
    assert.equal(r.annotatedLines.includes("G01 X20 F250"), true);
  });
});

describe("REGRESSION: conformal interval respects coverage probability", () => {
  it("90% coverage state: pred ± quantile covers 9 of 10 actuals (probabilistic)", () => {
    // Build a state with 10 outcomes; quantile at α=0.1 should yield an
    // interval that brackets ≥90% of those 10 residuals (by construction).
    let s = createConformalState({ alpha: 0.1, windowSize: 50 });
    const residuals = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 5.0];
    for (const r of residuals) {
      s = recordOutcome(s, { predictedMin: 10, actualMin: 10 + r });
    }
    const interval = predictInterval(s, 10);
    // The interval should be wide enough to cover at least 9 of the 10 outcomes
    // (i.e., upper >= 10 + 0.9-percentile residual)
    // 10 residuals sorted: [0.1,0.2,...,0.9, 5.0]
    // rawIndex = ceil(11·0.9) - 1 = ceil(9.9) - 1 = 9 → clamped to 9
    // quantile = sorted[9] = 5.0 → upper = 15.0
    assert.equal(interval.quantile, 5.0);
    assert.equal(interval.upper, 15.0);
  });
});

describe("REGRESSION: emit annotates EVERY op AND preserves G-code line order", () => {
  it("emit interleaves OP-header before each op's first rawLine", () => {
    const s = calibratedState();
    const ops = [
      { id: "A", predictedMin: 1, rawLines: ["L1A", "L2A"] },
      { id: "B", predictedMin: 2, rawLines: ["L1B"] },
    ];
    const r = emitConformalPIProgram({
      operations: ops,
      conformalState: s,
      dialect: "fanuc",
    });
    // Expected order: PROGRAM-header, OP A header, L1A, L2A, OP B header, L1B
    const lines = r.annotatedLines;
    const idxPROG = lines.findIndex((l) => l.includes("PROGRAM"));
    const idxA = lines.findIndex((l) => l.includes("OP A"));
    const idxL1A = lines.findIndex((l) => l === "L1A");
    const idxL2A = lines.findIndex((l) => l === "L2A");
    const idxB = lines.findIndex((l) => l.includes("OP B"));
    const idxL1B = lines.findIndex((l) => l === "L1B");
    assert.equal(idxPROG < idxA, true);
    assert.equal(idxA < idxL1A, true);
    assert.equal(idxL1A < idxL2A, true);
    assert.equal(idxL2A < idxB, true);
    assert.equal(idxB < idxL1B, true);
  });
});
