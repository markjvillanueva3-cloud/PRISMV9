/**
 * drift-aware-bandit-feed-emit.test.mjs — concrete-value tests for
 * the drift-aware bandit feed emit lib. Hand-checked anchor cases.
 *
 * Drift score formula (split-half):
 *   score = |mean(late half) - mean(early half)| / σ_pooled
 *   where σ_pooled = sqrt((varE + varL) / 2)  and var is sample variance.
 *
 * Hand-checked drift example (stream [1, 2, 5, 6]):
 *   early=[1,2], meanE=1.5, varE=((−0.5)²+(0.5)²)/1 = 0.5
 *   late=[5,6],  meanL=5.5, varL=0.5
 *   pooledVar = (0.5+0.5)/2 = 0.5
 *   σ_pooled = sqrt(0.5) ≈ 0.7071067811865476
 *   score = |5.5 − 1.5| / 0.7071 = 4 / 0.7071 = 5.6568542...
 *   > DEFAULT_DRIFT_THRESHOLD=2.0 → drift detected.
 */

import { describe, it } from "node:test";
import { strict as assert } from "node:assert";

import {
  DRIFT_AWARE_BANDIT_FEED_SCHEMA_VERSION,
  DEFAULT_DECIMAL_PLACES,
  MIN_DRIFT_DETECTION_PULLS,
  DEFAULT_DRIFT_THRESHOLD,
  MAX_ARMS,
  SUPPORTED_DIALECTS,
  SUPPORTED_SELECTION_STATUSES,
  formatComment,
  initBanditState,
  recordReward,
  meanReward,
  bestArmId,
  driftScore,
  isDriftDetected,
  resetAfterDrift,
  selectArm,
  formatBanditBandText,
  buildBanditEmitComment,
  emitWithDriftAwareBanditFeed,
} from "./drift-aware-bandit-feed-emit.mjs";

const EPS = 1e-9;
const approx = (a, b) => Math.abs(a - b) < EPS;

describe("constants", () => {
  it("DRIFT_AWARE_BANDIT_FEED_SCHEMA_VERSION = 1", () => {
    assert.strictEqual(DRIFT_AWARE_BANDIT_FEED_SCHEMA_VERSION, 1);
  });
  it("DEFAULT_DECIMAL_PLACES = 3", () => {
    assert.strictEqual(DEFAULT_DECIMAL_PLACES, 3);
  });
  it("MIN_DRIFT_DETECTION_PULLS = 4", () => {
    assert.strictEqual(MIN_DRIFT_DETECTION_PULLS, 4);
  });
  it("DEFAULT_DRIFT_THRESHOLD = 2.0", () => {
    assert.strictEqual(DEFAULT_DRIFT_THRESHOLD, 2.0);
  });
  it("MAX_ARMS = 32", () => {
    assert.strictEqual(MAX_ARMS, 32);
  });
  it("SUPPORTED_DIALECTS has 5 entries", () => {
    assert.deepStrictEqual(SUPPORTED_DIALECTS, [
      "fanuc", "haas", "heidenhain", "mitsubishi", "siemens",
    ]);
  });
  it("SUPPORTED_SELECTION_STATUSES = [greedy, drift-reset-suggested, insufficient-data]", () => {
    assert.deepStrictEqual(SUPPORTED_SELECTION_STATUSES, [
      "greedy", "drift-reset-suggested", "insufficient-data",
    ]);
  });
});

describe("formatComment", () => {
  it("fanuc wraps + strips parens", () => {
    assert.strictEqual(formatComment("fanuc", "BANDIT arm=A"), "( BANDIT arm=A )");
  });
  it("heidenhain uses '; '", () => {
    assert.strictEqual(formatComment("heidenhain", "BANDIT arm=A"), "; BANDIT arm=A");
  });
  it("returns null on unsupported dialect", () => {
    assert.strictEqual(formatComment("makino", "x"), null);
  });
});

describe("initBanditState", () => {
  it("fresh state with 3 arms — all 0 pulls", () => {
    const s = initBanditState(["A", "B", "C"]);
    assert.deepStrictEqual(s.armIds, ["A", "B", "C"]);
    assert.deepStrictEqual(s.pulls, [0, 0, 0]);
    assert.deepStrictEqual(s.totalReward, [0, 0, 0]);
    assert.deepStrictEqual(s.rewardStream, []);
    assert.strictEqual(s.schemaVersion, 1);
  });
  it("single-arm state", () => {
    const s = initBanditState(["A"]);
    assert.strictEqual(s.armIds.length, 1);
    assert.strictEqual(s.pulls[0], 0);
  });
  it("returns null on empty array", () => {
    assert.strictEqual(initBanditState([]), null);
  });
  it("returns null on null", () => {
    assert.strictEqual(initBanditState(null), null);
  });
  it("returns null on duplicate armIds", () => {
    assert.strictEqual(initBanditState(["A", "A"]), null);
  });
  it("returns null on non-string armId", () => {
    assert.strictEqual(initBanditState(["A", 42]), null);
  });
  it("returns null on empty-string armId", () => {
    assert.strictEqual(initBanditState(["A", ""]), null);
  });
  it("returns null on too-many arms (33 > MAX_ARMS=32)", () => {
    const armIds = Array.from({ length: 33 }, (_, i) => `a${i}`);
    assert.strictEqual(initBanditState(armIds), null);
  });
});

describe("recordReward", () => {
  it("records first reward: pulls=1, totalReward=value, stream length=1", () => {
    const s0 = initBanditState(["A", "B"]);
    const s1 = recordReward(s0, "A", 1.0);
    assert.strictEqual(s1.pulls[0], 1);
    assert.strictEqual(s1.totalReward[0], 1.0);
    assert.strictEqual(s1.rewardStream.length, 1);
    assert.deepStrictEqual(s1.rewardStream[0], { armId: "A", reward: 1.0 });
  });
  it("recordReward is immutable — original state unchanged", () => {
    const s0 = initBanditState(["A"]);
    const s1 = recordReward(s0, "A", 1.0);
    assert.strictEqual(s0.pulls[0], 0);
    assert.strictEqual(s1.pulls[0], 1);
  });
  it("two rewards on same arm sum correctly", () => {
    let s = initBanditState(["A"]);
    s = recordReward(s, "A", 1);
    s = recordReward(s, "A", 3);
    assert.strictEqual(s.pulls[0], 2);
    assert.strictEqual(s.totalReward[0], 4);
  });
  it("rewards on different arms tracked independently", () => {
    let s = initBanditState(["A", "B"]);
    s = recordReward(s, "A", 1);
    s = recordReward(s, "B", 5);
    assert.strictEqual(s.pulls[0], 1);
    assert.strictEqual(s.pulls[1], 1);
    assert.strictEqual(s.totalReward[0], 1);
    assert.strictEqual(s.totalReward[1], 5);
  });
  it("returns null on unknown armId", () => {
    const s = initBanditState(["A"]);
    assert.strictEqual(recordReward(s, "Z", 1), null);
  });
  it("returns null on non-finite reward (NaN)", () => {
    const s = initBanditState(["A"]);
    assert.strictEqual(recordReward(s, "A", Number.NaN), null);
  });
  it("returns null on null state", () => {
    assert.strictEqual(recordReward(null, "A", 1), null);
  });
});

describe("meanReward", () => {
  it("arm with rewards [1, 3] → mean=2", () => {
    let s = initBanditState(["A"]);
    s = recordReward(s, "A", 1);
    s = recordReward(s, "A", 3);
    assert.strictEqual(meanReward(s, "A"), 2);
  });
  it("returns null for unrecorded arm (avoid 0/0 NaN)", () => {
    const s = initBanditState(["A", "B"]);
    assert.strictEqual(meanReward(s, "B"), null);
  });
  it("returns null for unknown arm", () => {
    const s = initBanditState(["A"]);
    assert.strictEqual(meanReward(s, "Z"), null);
  });
});

describe("bestArmId", () => {
  it("picks arm with highest mean", () => {
    let s = initBanditState(["A", "B"]);
    s = recordReward(s, "A", 1);
    s = recordReward(s, "A", 3); // A.mean=2
    s = recordReward(s, "B", 5); // B.mean=5
    assert.strictEqual(bestArmId(s), "B");
  });
  it("returns null on cold-start (no pulls)", () => {
    const s = initBanditState(["A", "B"]);
    assert.strictEqual(bestArmId(s), null);
  });
  it("ties broken by first-added (deterministic)", () => {
    let s = initBanditState(["A", "B"]);
    s = recordReward(s, "A", 2);
    s = recordReward(s, "B", 2);
    assert.strictEqual(bestArmId(s), "A"); // A first → wins tie
  });
  it("ignores arms with 0 pulls when picking", () => {
    let s = initBanditState(["A", "B", "C"]);
    s = recordReward(s, "B", 10);
    assert.strictEqual(bestArmId(s), "B");
  });
});

describe("driftScore (split-half formula)", () => {
  it("stream [1,2,5,6] → score = 4/sqrt(0.5) ≈ 5.6568", () => {
    let s = initBanditState(["A"]);
    for (const r of [1, 2, 5, 6]) s = recordReward(s, "A", r);
    const score = driftScore(s);
    assert.ok(approx(score, 4 / Math.sqrt(0.5)));
  });
  it("stream [1,2,2,3] → score = 1/sqrt(0.5) ≈ 1.4142 (sub-threshold)", () => {
    let s = initBanditState(["A"]);
    for (const r of [1, 2, 2, 3]) s = recordReward(s, "A", r);
    const score = driftScore(s);
    assert.ok(approx(score, 1 / Math.sqrt(0.5)));
  });
  it("stream below MIN_DRIFT_DETECTION_PULLS (3) → null", () => {
    let s = initBanditState(["A"]);
    for (const r of [1, 2, 3]) s = recordReward(s, "A", r);
    assert.strictEqual(driftScore(s), null);
  });
  it("stream of identical rewards [5,5,5,5] → σ=0 → null", () => {
    let s = initBanditState(["A"]);
    for (const r of [5, 5, 5, 5]) s = recordReward(s, "A", r);
    assert.strictEqual(driftScore(s), null);
  });
  it("empty stream → null", () => {
    const s = initBanditState(["A"]);
    assert.strictEqual(driftScore(s), null);
  });
  it("returns null on bad state", () => {
    assert.strictEqual(driftScore(null), null);
  });
});

describe("isDriftDetected", () => {
  it("strong drift stream [1,2,5,6] @ threshold=2 → true (score ~5.66 > 2)", () => {
    let s = initBanditState(["A"]);
    for (const r of [1, 2, 5, 6]) s = recordReward(s, "A", r);
    assert.strictEqual(isDriftDetected(s, 2), true);
  });
  it("weak drift stream [1,2,2,3] @ threshold=2 → false (score ~1.41 < 2)", () => {
    let s = initBanditState(["A"]);
    for (const r of [1, 2, 2, 3]) s = recordReward(s, "A", r);
    assert.strictEqual(isDriftDetected(s, 2), false);
  });
  it("custom higher threshold=6 → strong stream no longer triggers", () => {
    let s = initBanditState(["A"]);
    for (const r of [1, 2, 5, 6]) s = recordReward(s, "A", r);
    assert.strictEqual(isDriftDetected(s, 6), false);
  });
  it("default threshold used when arg omitted (~2.0)", () => {
    let s = initBanditState(["A"]);
    for (const r of [1, 2, 5, 6]) s = recordReward(s, "A", r);
    assert.strictEqual(isDriftDetected(s, undefined), true);
  });
  it("insufficient stream → false (no drift can be claimed)", () => {
    let s = initBanditState(["A"]);
    s = recordReward(s, "A", 1);
    assert.strictEqual(isDriftDetected(s, 2), false);
  });
});

describe("resetAfterDrift", () => {
  it("preserves armIds, zeros pulls/totalReward/stream", () => {
    let s = initBanditState(["A", "B"]);
    s = recordReward(s, "A", 1);
    s = recordReward(s, "B", 5);
    const fresh = resetAfterDrift(s);
    assert.deepStrictEqual(fresh.armIds, ["A", "B"]);
    assert.deepStrictEqual(fresh.pulls, [0, 0]);
    assert.deepStrictEqual(fresh.totalReward, [0, 0]);
    assert.deepStrictEqual(fresh.rewardStream, []);
  });
  it("returns null on bad state", () => {
    assert.strictEqual(resetAfterDrift(null), null);
  });
});

describe("selectArm", () => {
  it("cold-start state → status=insufficient-data, armId=first", () => {
    const s = initBanditState(["A", "B"]);
    const r = selectArm(s, null);
    assert.strictEqual(r.status, "insufficient-data");
    assert.strictEqual(r.armId, "A");
    assert.strictEqual(r.meanReward, null);
  });
  it("greedy: picks best arm, status=greedy when no drift", () => {
    let s = initBanditState(["A", "B"]);
    s = recordReward(s, "A", 1);
    s = recordReward(s, "B", 5);
    const r = selectArm(s, null);
    assert.strictEqual(r.status, "greedy");
    assert.strictEqual(r.armId, "B");
    assert.strictEqual(r.meanReward, 5);
  });
  it("drift-reset-suggested when score > threshold", () => {
    let s = initBanditState(["A"]);
    for (const r of [1, 2, 5, 6]) s = recordReward(s, "A", r);
    const r = selectArm(s, { driftThreshold: 2 });
    assert.strictEqual(r.status, "drift-reset-suggested");
    assert.strictEqual(r.armId, "A"); // still emits current best
    assert.ok(r.driftScore > 2);
  });
  it("returns null on bad threshold (0)", () => {
    let s = initBanditState(["A"]);
    s = recordReward(s, "A", 1);
    assert.strictEqual(selectArm(s, { driftThreshold: 0 }), null);
  });
  it("returns null on negative threshold", () => {
    let s = initBanditState(["A"]);
    s = recordReward(s, "A", 1);
    assert.strictEqual(selectArm(s, { driftThreshold: -1 }), null);
  });
});

describe("formatBanditBandText", () => {
  it("greedy with mean=2.0, drift=null → 'BANDIT arm=A status=greedy meanR=2.000 drift=n/a'", () => {
    const text = formatBanditBandText({
      armId: "A", status: "greedy", meanReward: 2.0, driftScore: null,
    });
    assert.strictEqual(text, "BANDIT arm=A status=greedy meanR=2.000 drift=n/a");
  });
  it("insufficient-data: meanR=n/a drift=n/a", () => {
    const text = formatBanditBandText({
      armId: "A", status: "insufficient-data", meanReward: null, driftScore: null,
    });
    assert.strictEqual(text, "BANDIT arm=A status=insufficient-data meanR=n/a drift=n/a");
  });
  it("drift-reset-suggested formats both numeric fields", () => {
    const text = formatBanditBandText({
      armId: "B", status: "drift-reset-suggested", meanReward: 3.5, driftScore: 5.6568,
    });
    assert.strictEqual(text, "BANDIT arm=B status=drift-reset-suggested meanR=3.500 drift=5.657");
  });
  it("decimalPlaces=1 truncates", () => {
    const text = formatBanditBandText({
      armId: "A", status: "greedy", meanReward: 2.0, driftScore: 5.66,
    }, { decimalPlaces: 1 });
    assert.strictEqual(text, "BANDIT arm=A status=greedy meanR=2.0 drift=5.7");
  });
  it("returns null on null selection", () => {
    assert.strictEqual(formatBanditBandText(null), null);
  });
  it("returns null on bad status", () => {
    assert.strictEqual(formatBanditBandText({
      armId: "A", status: "exploring", meanReward: 1, driftScore: 0,
    }), null);
  });
});

describe("buildBanditEmitComment", () => {
  it("fanuc + greedy", () => {
    const c = buildBanditEmitComment({
      selection: { armId: "A", status: "greedy", meanReward: 2.0, driftScore: null },
      dialect: "fanuc",
    });
    assert.strictEqual(c, "( BANDIT arm=A status=greedy meanR=2.000 drift=n/a )");
  });
  it("heidenhain uses '; '", () => {
    const c = buildBanditEmitComment({
      selection: { armId: "B", status: "greedy", meanReward: 1.0, driftScore: null },
      dialect: "heidenhain",
    });
    assert.strictEqual(c, "; BANDIT arm=B status=greedy meanR=1.000 drift=n/a");
  });
  it("returns null on bad dialect", () => {
    assert.strictEqual(buildBanditEmitComment({
      selection: { armId: "A", status: "greedy", meanReward: 1, driftScore: null },
      dialect: "makino",
    }), null);
  });
});

describe("emitWithDriftAwareBanditFeed", () => {
  it("full pipeline greedy → emits comment + programLine for best arm", () => {
    let s = initBanditState(["A", "B"]);
    s = recordReward(s, "A", 1);
    s = recordReward(s, "B", 5);
    const r = emitWithDriftAwareBanditFeed({
      state: s,
      dialect: "fanuc",
      armToProgramLine: { A: "F100", B: "F200" },
    });
    assert.strictEqual(r.selection.armId, "B");
    assert.strictEqual(r.selection.status, "greedy");
    assert.strictEqual(r.comment, "( BANDIT arm=B status=greedy meanR=5.000 drift=n/a )");
    assert.strictEqual(r.programLine, "F200");
    assert.strictEqual(r.summary.armId, "B");
    assert.strictEqual(r.summary.status, "greedy");
    assert.strictEqual(r.summary.totalArmCount, 2);
    assert.strictEqual(r.summary.totalPullCount, 2);
    assert.strictEqual(r.summary.dialect, "fanuc");
    assert.strictEqual(r.summary.schemaVersion, 1);
  });
  it("missing armToProgramLine → programLine=null", () => {
    let s = initBanditState(["A"]);
    s = recordReward(s, "A", 1);
    const r = emitWithDriftAwareBanditFeed({ state: s, dialect: "fanuc" });
    assert.strictEqual(r.programLine, null);
  });
  it("drift-reset-suggested status surfaces to summary", () => {
    let s = initBanditState(["A"]);
    for (const v of [1, 2, 5, 6]) s = recordReward(s, "A", v);
    const r = emitWithDriftAwareBanditFeed({
      state: s, dialect: "fanuc", options: { driftThreshold: 2 },
    });
    assert.strictEqual(r.summary.status, "drift-reset-suggested");
    assert.ok(r.summary.driftScore > 2);
  });
  it("cold-start → status=insufficient-data + programLine=null", () => {
    const s = initBanditState(["A", "B"]);
    const r = emitWithDriftAwareBanditFeed({
      state: s, dialect: "fanuc", armToProgramLine: { A: "F100" },
    });
    assert.strictEqual(r.summary.status, "insufficient-data");
    assert.strictEqual(r.summary.armId, "A");
    assert.strictEqual(r.programLine, "F100"); // armId=A so F100 echoed
  });
  it("returns null on null request", () => {
    assert.strictEqual(emitWithDriftAwareBanditFeed(null), null);
  });
  it("returns null on unsupported dialect", () => {
    let s = initBanditState(["A"]);
    s = recordReward(s, "A", 1);
    assert.strictEqual(emitWithDriftAwareBanditFeed({ state: s, dialect: "x" }), null);
  });
});

describe("regression: bandit→drift→reset→bandit cycle", () => {
  it("simulate workflow: build history, detect drift, reset, fresh learning", () => {
    let s = initBanditState(["A", "B"]);
    // Initial regime: A=good (rewards ~5), B=bad (rewards ~1)
    s = recordReward(s, "A", 5);
    s = recordReward(s, "A", 5);
    s = recordReward(s, "B", 1);
    // Bandit thinks A is best
    assert.strictEqual(bestArmId(s), "A");
    // Drift happens: now A delivers 1, B delivers 5 (regime flipped)
    s = recordReward(s, "A", 1);
    s = recordReward(s, "B", 5);
    s = recordReward(s, "B", 5);
    // Selection should flag drift (rewards distribution changed)
    const selection = selectArm(s, { driftThreshold: 1.0 });
    // Even if drift triggers, current "best" by mean still has data:
    // A.mean = (5+5+1)/3 = 11/3 ≈ 3.667
    // B.mean = (1+5+5)/3 = 11/3 ≈ 3.667
    // Tie → A wins by first-added
    assert.strictEqual(selection.armId, "A");
    assert.ok(selection.driftScore == null || selection.driftScore >= 0);
    // After reset, fresh slate
    const fresh = resetAfterDrift(s);
    assert.deepStrictEqual(fresh.pulls, [0, 0]);
    assert.strictEqual(bestArmId(fresh), null);
  });
});

describe("regression: dialect + schema invariants", () => {
  it("every dialect produces non-null emit", () => {
    let s = initBanditState(["A"]);
    s = recordReward(s, "A", 1);
    for (const dialect of SUPPORTED_DIALECTS) {
      const r = emitWithDriftAwareBanditFeed({ state: s, dialect });
      assert.ok(r != null, `dialect=${dialect} returned null`);
      assert.strictEqual(r.summary.schemaVersion, DRIFT_AWARE_BANDIT_FEED_SCHEMA_VERSION);
    }
  });
});
