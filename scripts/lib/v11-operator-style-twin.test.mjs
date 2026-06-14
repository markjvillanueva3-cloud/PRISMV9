/**
 * v11-operator-style-twin.test.mjs — concrete-value tests for the
 * per-operator EWMA preference fingerprint.
 *
 * EWMA hand-checks (alpha = 0.3, neutral=100):
 *   start 100, observe 80 → 0.7×100 + 0.3×80 = 70 + 24 = 94
 *   then observe 80 again → 0.7×94 + 0.3×80 = 65.8 + 24 = 89.8
 *   then observe 80 again → 0.7×89.8 + 0.3×80 = 62.86 + 24 = 86.86
 *
 * @milestone POST-BRIDGE-SYNERGY-MS0/U-NOVEL-OPERATOR-STYLE-TWIN
 * @slot echo · @iter 32 · @date 2026-05-27
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  STYLE_TWIN_SCHEMA_VERSION,
  DEFAULT_EWMA_ALPHA,
  FEED_OVERRIDE_NEUTRAL,
  RAPID_OVERRIDE_NEUTRAL,
  DEFAULT_DWELL_MS,
  CHATTER_TOLERANCE_NEUTRAL,
  MIN_OBSERVATIONS_FOR_STABLE,
  createOperatorTwin,
  reportOverrideEvent,
  isStable,
  deviationFromNeutral,
  applyStyleToPost,
  renderTwinAdvisory,
  summarizeTwin,
} from "./v11-operator-style-twin.mjs";

describe("constants", () => {
  it("STYLE_TWIN_SCHEMA_VERSION = 1", () => {
    assert.equal(STYLE_TWIN_SCHEMA_VERSION, 1);
  });
  it("DEFAULT_EWMA_ALPHA = 0.3 (3-observation half-life)", () => {
    assert.equal(DEFAULT_EWMA_ALPHA, 0.3);
  });
  it("FEED_OVERRIDE_NEUTRAL = 100", () => {
    assert.equal(FEED_OVERRIDE_NEUTRAL, 100);
  });
  it("RAPID_OVERRIDE_NEUTRAL = 100", () => {
    assert.equal(RAPID_OVERRIDE_NEUTRAL, 100);
  });
  it("DEFAULT_DWELL_MS = 0", () => {
    assert.equal(DEFAULT_DWELL_MS, 0);
  });
  it("CHATTER_TOLERANCE_NEUTRAL = 0.5", () => {
    assert.equal(CHATTER_TOLERANCE_NEUTRAL, 0.5);
  });
  it("MIN_OBSERVATIONS_FOR_STABLE = 5", () => {
    assert.equal(MIN_OBSERVATIONS_FOR_STABLE, 5);
  });
});

describe("createOperatorTwin", () => {
  it("operatorId='mark' → twin created with neutral defaults", () => {
    const t = createOperatorTwin({ operatorId: "mark" });
    assert.equal(t.operatorId, "mark");
    assert.equal(t.feedOverridePct, 100);
    assert.equal(t.rapidOverridePct, 100);
    assert.equal(t.observationCount, 0);
  });
  it("default ewmaAlpha = 0.3", () => {
    assert.equal(createOperatorTwin({ operatorId: "mark" }).ewmaAlpha, 0.3);
  });
  it("custom ewmaAlpha=0.5 honored", () => {
    assert.equal(createOperatorTwin({ operatorId: "mark", ewmaAlpha: 0.5 }).ewmaAlpha, 0.5);
  });
  it("invalid ewmaAlpha=0 → falls back to default 0.3", () => {
    assert.equal(createOperatorTwin({ operatorId: "mark", ewmaAlpha: 0 }).ewmaAlpha, 0.3);
  });
  it("invalid ewmaAlpha=1.5 → falls back to default 0.3", () => {
    assert.equal(createOperatorTwin({ operatorId: "mark", ewmaAlpha: 1.5 }).ewmaAlpha, 0.3);
  });
  it("null args → null", () => {
    assert.equal(createOperatorTwin(null), null);
  });
  it("missing operatorId → null", () => {
    assert.equal(createOperatorTwin({}), null);
  });
  it("empty operatorId → null", () => {
    assert.equal(createOperatorTwin({ operatorId: "" }), null);
  });
  it("schemaVersion = 1", () => {
    assert.equal(createOperatorTwin({ operatorId: "mark" }).schemaVersion, 1);
  });
  it("chatterRiskTolerance starts at neutral 0.5", () => {
    assert.equal(createOperatorTwin({ operatorId: "mark" }).chatterRiskTolerance, 0.5);
  });
  it("preferPeckDrill starts false", () => {
    assert.equal(createOperatorTwin({ operatorId: "mark" }).preferPeckDrill, false);
  });
});

describe("reportOverrideEvent: EWMA update math", () => {
  it("hand-check: 100 → observe 80, alpha=0.3 → 94", () => {
    const t0 = createOperatorTwin({ operatorId: "mark" });
    const t1 = reportOverrideEvent(t0, { feedOverridePct: 80 });
    assert.equal(Math.abs(t1.feedOverridePct - 94) < 1e-9, true);
  });
  it("hand-check: chain 100→80→80, alpha=0.3 → 89.8", () => {
    let t = createOperatorTwin({ operatorId: "mark" });
    t = reportOverrideEvent(t, { feedOverridePct: 80 });
    t = reportOverrideEvent(t, { feedOverridePct: 80 });
    assert.equal(Math.abs(t.feedOverridePct - 89.8) < 1e-9, true);
  });
  it("hand-check: alpha=0.5, 100→80 → 90", () => {
    const t0 = createOperatorTwin({ operatorId: "mark", ewmaAlpha: 0.5 });
    const t1 = reportOverrideEvent(t0, { feedOverridePct: 80 });
    assert.equal(t1.feedOverridePct, 90);
  });
  it("observationCount increments from 0 → 1", () => {
    const t0 = createOperatorTwin({ operatorId: "mark" });
    const t1 = reportOverrideEvent(t0, { feedOverridePct: 80 });
    assert.equal(t1.observationCount, 1);
  });
  it("immutable: original twin unchanged", () => {
    const t0 = createOperatorTwin({ operatorId: "mark" });
    reportOverrideEvent(t0, { feedOverridePct: 80 });
    assert.equal(t0.feedOverridePct, 100);
    assert.equal(t0.observationCount, 0);
  });
  it("preferPeckDrill boolean event applied directly", () => {
    const t0 = createOperatorTwin({ operatorId: "mark" });
    const t1 = reportOverrideEvent(t0, { preferPeckDrill: true });
    assert.equal(t1.preferPeckDrill, true);
  });
  it("addM1AtToolChange boolean applied directly", () => {
    const t0 = createOperatorTwin({ operatorId: "mark" });
    const t1 = reportOverrideEvent(t0, { addM1AtToolChange: true });
    assert.equal(t1.addM1AtToolChange, true);
  });
  it("rapidOverridePct EWMA: 100→50, alpha=0.3 → 85", () => {
    const t0 = createOperatorTwin({ operatorId: "mark" });
    const t1 = reportOverrideEvent(t0, { rapidOverridePct: 50 });
    assert.equal(Math.abs(t1.rapidOverridePct - 85) < 1e-9, true);
  });
  it("chatterRiskTolerance EWMA: 0.5→0.0, alpha=0.3 → 0.35", () => {
    const t0 = createOperatorTwin({ operatorId: "mark" });
    const t1 = reportOverrideEvent(t0, { chatterRiskTolerance: 0.0 });
    assert.equal(Math.abs(t1.chatterRiskTolerance - 0.35) < 1e-9, true);
  });
  it("chatterRiskTolerance out-of-range 1.5 ignored", () => {
    const t0 = createOperatorTwin({ operatorId: "mark" });
    const t1 = reportOverrideEvent(t0, { chatterRiskTolerance: 1.5 });
    assert.equal(t1.chatterRiskTolerance, 0.5);
  });
  it("dwellMsAfterToolChange EWMA: 0→1000, alpha=0.3 → 300", () => {
    const t0 = createOperatorTwin({ operatorId: "mark" });
    const t1 = reportOverrideEvent(t0, { dwellMsAfterToolChange: 1000 });
    assert.equal(t1.dwellMsAfterToolChange, 300);
  });
  it("negative dwell ignored", () => {
    const t0 = createOperatorTwin({ operatorId: "mark" });
    const t1 = reportOverrideEvent(t0, { dwellMsAfterToolChange: -50 });
    assert.equal(t1.dwellMsAfterToolChange, 0);
  });
  it("null event → twin unchanged (same ref OK)", () => {
    const t0 = createOperatorTwin({ operatorId: "mark" });
    assert.equal(reportOverrideEvent(t0, null), t0);
  });
  it("event with no actionable fields → twin unchanged", () => {
    const t0 = createOperatorTwin({ operatorId: "mark" });
    const t1 = reportOverrideEvent(t0, { foo: "bar" });
    assert.equal(t1.observationCount, 0);
  });
  it("timestampIso flows through", () => {
    const t0 = createOperatorTwin({ operatorId: "mark" });
    const t1 = reportOverrideEvent(t0, { feedOverridePct: 80, timestampIso: "2026-05-27T20:00:00Z" });
    assert.equal(t1.lastUpdatedIso, "2026-05-27T20:00:00Z");
  });
});

describe("isStable", () => {
  it("0 observations → false", () => {
    const t = createOperatorTwin({ operatorId: "mark" });
    assert.equal(isStable(t), false);
  });
  it("4 observations → false (below threshold 5)", () => {
    let t = createOperatorTwin({ operatorId: "mark" });
    for (let i = 0; i < 4; i++) t = reportOverrideEvent(t, { feedOverridePct: 80 });
    assert.equal(isStable(t), false);
  });
  it("5 observations → true (at threshold)", () => {
    let t = createOperatorTwin({ operatorId: "mark" });
    for (let i = 0; i < 5; i++) t = reportOverrideEvent(t, { feedOverridePct: 80 });
    assert.equal(isStable(t), true);
  });
  it("null → false", () => {
    assert.equal(isStable(null), false);
  });
});

describe("deviationFromNeutral", () => {
  it("fresh twin → all deltas zero", () => {
    const t = createOperatorTwin({ operatorId: "mark" });
    const d = deviationFromNeutral(t);
    assert.equal(d.feedOverridePctDelta, 0);
    assert.equal(d.rapidOverridePctDelta, 0);
    assert.equal(d.chatterToleranceDelta, 0);
    assert.equal(d.dwellMsDelta, 0);
  });
  it("after 100→80 EWMA → feedOverridePctDelta = 94 - 100 = -6", () => {
    const t0 = createOperatorTwin({ operatorId: "mark" });
    const t1 = reportOverrideEvent(t0, { feedOverridePct: 80 });
    assert.equal(Math.abs(deviationFromNeutral(t1).feedOverridePctDelta - (-6)) < 1e-9, true);
  });
  it("null twin → null", () => {
    assert.equal(deviationFromNeutral(null), null);
  });
});

describe("applyStyleToPost", () => {
  function buildStableTwin() {
    let t = createOperatorTwin({ operatorId: "mark" });
    // 5 observations of feed=80 + rapid=50 + addM1=true → stable
    for (let i = 0; i < 5; i++) {
      t = reportOverrideEvent(t, { feedOverridePct: 80, rapidOverridePct: 50, addM1AtToolChange: true, dwellMsAfterToolChange: 1000 });
    }
    return t;
  }
  it("stable twin applies adjustedFeedrate = baseFeedrate × (twin.feedOverridePct/100)", () => {
    const t = buildStableTwin();
    const out = applyStyleToPost(t, { baseFeedrate: 1000 });
    const expected = 1000 * (t.feedOverridePct / 100);
    assert.equal(Math.abs(out.adjustedFeedrate - expected) < 1e-9, true);
  });
  it("stable twin applies adjustedRapidrate proportionally", () => {
    const t = buildStableTwin();
    const out = applyStyleToPost(t, { baseRapidrate: 10000 });
    const expected = 10000 * (t.rapidOverridePct / 100);
    assert.equal(Math.abs(out.adjustedRapidrate - expected) < 1e-9, true);
  });
  it("stable twin adds M1 to toolChangeMcodes when addM1AtToolChange=true", () => {
    const t = buildStableTwin();
    const out = applyStyleToPost(t, { toolChangeMcodes: ["M6", "T01"] });
    assert.deepEqual(out.toolChangeMcodes, ["M6", "T01", "M1"]);
  });
  it("stable twin sets toolChangeDwellMs from twin.dwellMsAfterToolChange (when > 0)", () => {
    const t = buildStableTwin();
    const out = applyStyleToPost(t, {});
    assert.equal(out.toolChangeDwellMs > 0, true);
  });
  it("stable twin sets styleApplied=true", () => {
    const t = buildStableTwin();
    assert.equal(applyStyleToPost(t, { baseFeedrate: 1000 }).styleApplied, true);
  });
  it("stable twin echoes operatorId", () => {
    const t = buildStableTwin();
    assert.equal(applyStyleToPost(t, {}).operatorId, "mark");
  });
  it("undertrained twin: styleApplied=false, reason='twin_undertrained'", () => {
    const t = createOperatorTwin({ operatorId: "mark" });
    const out = applyStyleToPost(t, { baseFeedrate: 1000 });
    assert.equal(out.styleApplied, false);
    assert.equal(out.styleReason, "twin_undertrained");
  });
  it("undertrained twin does NOT alter baseFeedrate (no adjustedFeedrate)", () => {
    const t = createOperatorTwin({ operatorId: "mark" });
    const out = applyStyleToPost(t, { baseFeedrate: 1000 });
    assert.equal(out.adjustedFeedrate, undefined);
  });
  it("null canonicalPost → returns input unchanged (null)", () => {
    const t = createOperatorTwin({ operatorId: "mark" });
    assert.equal(applyStyleToPost(t, null), null);
  });
});

describe("renderTwinAdvisory", () => {
  it("twin: includes header 'PRISM OPERATOR STYLE TWIN'", () => {
    const t = createOperatorTwin({ operatorId: "mark" });
    assert.equal(renderTwinAdvisory(t).includes("PRISM OPERATOR STYLE TWIN"), true);
  });
  it("twin: includes operator id", () => {
    const t = createOperatorTwin({ operatorId: "mark" });
    assert.equal(renderTwinAdvisory(t).includes("operator: mark"), true);
  });
  it("fresh twin: 'stable: no'", () => {
    const t = createOperatorTwin({ operatorId: "mark" });
    assert.equal(renderTwinAdvisory(t).includes("stable: no"), true);
  });
  it("null twin: 'no twin'", () => {
    assert.equal(renderTwinAdvisory(null).includes("no twin"), true);
  });
});

describe("summarizeTwin", () => {
  it("fresh twin: stable=false, observationCount=0", () => {
    const t = createOperatorTwin({ operatorId: "mark" });
    const s = summarizeTwin(t);
    assert.equal(s.stable, false);
    assert.equal(s.observationCount, 0);
  });
  it("operatorId echoed", () => {
    const t = createOperatorTwin({ operatorId: "mark" });
    assert.equal(summarizeTwin(t).operatorId, "mark");
  });
  it("ewmaAlpha echoed", () => {
    const t = createOperatorTwin({ operatorId: "mark", ewmaAlpha: 0.5 });
    assert.equal(summarizeTwin(t).ewmaAlpha, 0.5);
  });
  it("deviation object present", () => {
    const t = createOperatorTwin({ operatorId: "mark" });
    assert.equal(typeof summarizeTwin(t).deviation, "object");
  });
  it("schemaVersion = 1", () => {
    const t = createOperatorTwin({ operatorId: "mark" });
    assert.equal(summarizeTwin(t).schemaVersion, 1);
  });
  it("null twin → null", () => {
    assert.equal(summarizeTwin(null), null);
  });
});
