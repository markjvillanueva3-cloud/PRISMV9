/**
 * CrossProcessAGIBridge.test.ts — unified routing+risk composer over
 * keyword classification + neural outcome distribution.
 *
 * Milestone: INFRA-NEURAL-LEDGER-MS1 / U-XPROC-NEURAL-T1-05.
 */
import { describe, it, expect, beforeEach } from "vitest";

import {
  CrossProcessAGIBridge,
  crossProcessAGIBridge,
  AGI_SCHEMA_VERSION,
} from "../engines/CrossProcessAGIBridge.js";
import { CrossProcessNeuralLearningEngine } from "../engines/CrossProcessNeuralLearningEngine.js";
import type { OutcomeRecord } from "../engines/CrossProcessOutcomeStore.js";

const DONOR_SEED = 1357;

function rec(partial: {
  process?: OutcomeRecord["process"];
  bridge?: OutcomeRecord["bridge"];
  outcome?: OutcomeRecord["outcome"];
  request?: OutcomeRecord["request_summary"];
  id?: string;
}): OutcomeRecord {
  return {
    schemaVersion: "1.0",
    id: partial.id ?? "evt-agi",
    ts: "2026-05-05T18:00:00.000Z",
    bridge: partial.bridge ?? "sf",
    process: partial.process ?? "mill",
    request_summary: partial.request ?? {},
    response_summary: {},
    outcome: partial.outcome ?? { kind: "pending" },
  };
}

function trainedDonor(): CrossProcessNeuralLearningEngine {
  const eng = new CrossProcessNeuralLearningEngine({ seed: DONOR_SEED });
  const data: OutcomeRecord[] = [];
  const PER_CLASS = 12;
  for (let i = 0; i < PER_CLASS; i++) {
    data.push(rec({ id: `s${i}`, process: "mill", outcome: { kind: "success" } }));
    data.push(rec({ id: `f${i}`, process: "lathe", outcome: { kind: "failure" } }));
    data.push(rec({ id: `o${i}`, process: "wedm", outcome: { kind: "operator_override" } }));
  }
  eng.train(data, { epochs: 30, shuffle: false });
  return eng;
}

describe("CrossProcessAGIBridge", () => {
  let bridge: CrossProcessAGIBridge;
  let donor: CrossProcessNeuralLearningEngine;

  beforeEach(() => {
    bridge = new CrossProcessAGIBridge();
    donor = trainedDonor();
  });

  // ───── happy path / shape ─────

  it("compose returns a populated ComposeResult envelope", () => {
    const out = bridge.compose(donor, { intent: "mill a part from 4140" });
    expect(out.schemaVersion).toBe(AGI_SCHEMA_VERSION);
    expect(["mill", "lathe", "wedm"]).toContain(out.routedProcess);
    expect(["proceed", "review", "reject"]).toContain(out.recommendation);
    expect(typeof out.recommendationReason).toBe("string");
    expect(out.recommendationReason.length).toBeGreaterThan(0);
  });

  it("blended distribution is a valid probability distribution", () => {
    const out = bridge.compose(donor, { intent: "mill a part" });
    const sum = out.blended.mill + out.blended.lathe + out.blended.wedm;
    expect(sum).toBeCloseTo(1, 6);
    expect(out.blended.mill).toBeGreaterThanOrEqual(0);
    expect(out.blended.mill).toBeLessThanOrEqual(1);
  });

  it("keyword distribution is a valid probability distribution", () => {
    const out = bridge.compose(donor, { intent: "mill a part" });
    const sum = out.keyword.mill + out.keyword.lathe + out.keyword.wedm;
    expect(sum).toBeCloseTo(1, 6);
  });

  it("neural distribution is a valid probability distribution", () => {
    const out = bridge.compose(donor, { intent: "mill" });
    const sum = out.neural.mill + out.neural.lathe + out.neural.wedm;
    expect(sum).toBeCloseTo(1, 6);
  });

  it("outcomeRisk sums to ~1 (softmax over 3 classes)", () => {
    const out = bridge.compose(donor, { intent: "mill" });
    const sum =
      out.outcomeRisk.success + out.outcomeRisk.failure + out.outcomeRisk.operator_override;
    expect(sum).toBeCloseTo(1, 6);
  });

  // ───── routedProcess = blended argmax ─────

  it("routedProcess matches blended argmax", () => {
    const out = bridge.compose(donor, { intent: "mill the part with end mill" });
    const max = Math.max(out.blended.mill, out.blended.lathe, out.blended.wedm);
    if (out.blended.mill === max) expect(out.routedProcess).toBe("mill");
    else if (out.blended.lathe === max) expect(out.routedProcess).toBe("lathe");
    else expect(out.routedProcess).toBe("wedm");
  });

  // ───── mixWeight extremes ─────

  it("mixWeight=0 → blended equals keyword distribution", () => {
    const out = bridge.compose(donor, { intent: "mill" }, { mixWeight: 0 });
    expect(out.blended.mill).toBeCloseTo(out.keyword.mill, 9);
    expect(out.blended.lathe).toBeCloseTo(out.keyword.lathe, 9);
    expect(out.blended.wedm).toBeCloseTo(out.keyword.wedm, 9);
  });

  it("mixWeight=1 → blended equals neural distribution", () => {
    const out = bridge.compose(donor, { intent: "mill" }, { mixWeight: 1 });
    expect(out.blended.mill).toBeCloseTo(out.neural.mill, 9);
    expect(out.blended.lathe).toBeCloseTo(out.neural.lathe, 9);
    expect(out.blended.wedm).toBeCloseTo(out.neural.wedm, 9);
  });

  it("mixWeight clamped to [0,1] (NaN → 0.5)", () => {
    const out = bridge.compose(donor, { intent: "mill" }, { mixWeight: Number.NaN });
    expect(out.mixWeight).toBe(0.5);
  });

  it("mixWeight clamped to [0,1] (>1 → 1)", () => {
    const out = bridge.compose(donor, { intent: "mill" }, { mixWeight: 5 });
    expect(out.mixWeight).toBe(1);
  });

  // ───── recommendation logic ─────

  it("recommendation = reject when neural P(failure) > failThreshold", () => {
    // Force a fail-heavy donor by training only on failure outcomes.
    const failOnly = new CrossProcessNeuralLearningEngine({ seed: 1 });
    const data: OutcomeRecord[] = [];
    for (let i = 0; i < 30; i++) {
      data.push(rec({ id: `f${i}`, process: "lathe", outcome: { kind: "failure" } }));
    }
    failOnly.train(data, { epochs: 50, shuffle: false });
    const out = bridge.compose(failOnly, { intent: "lathe a part" }, { failThreshold: 0.4 });
    expect(out.outcomeRisk.failure).toBeGreaterThan(0.4);
    expect(out.recommendation).toBe("reject");
    expect(out.recommendationReason).toContain("P(failure)");
  });

  it("recommendation = review when blended confidence < proceedThreshold", () => {
    // Use mixWeight=1 and a fresh-init donor so neural distribution is near uniform (~1/3 each).
    const fresh = new CrossProcessNeuralLearningEngine({ seed: 2 });
    const out = bridge.compose(
      fresh,
      { intent: "ambiguous-intent" },
      { mixWeight: 1, proceedThreshold: 0.9, failThreshold: 0.99, overrideThreshold: 0.99 },
    );
    expect(out.recommendation).toBe("review");
    expect(out.recommendationReason).toContain("blended top confidence");
  });

  it("recommendation = proceed for a confident, low-failure case", () => {
    // Trained donor + proceed-permissive thresholds.
    const out = bridge.compose(
      donor,
      { intent: "mill a part with end mill on aluminum" },
      { failThreshold: 0.99, overrideThreshold: 0.99, proceedThreshold: 0.0 },
    );
    expect(out.recommendation).toBe("proceed");
    expect(out.recommendationReason).toContain("routed to");
  });

  it("recommendation reason is a non-empty descriptive string", () => {
    const out = bridge.compose(donor, { intent: "mill a part" });
    expect(out.recommendationReason.length).toBeGreaterThan(10);
  });

  // ───── classification surfaced for audit ─────

  it("compose result includes the verbatim ProcessClassification", () => {
    const out = bridge.compose(donor, { intent: "mill a part" });
    expect(["mill", "lathe", "wedm"]).toContain(out.classification.process);
    expect(typeof out.classification.confidence).toBe("number");
    expect(out.classification.confidence).toBeGreaterThanOrEqual(0);
    expect(out.classification.confidence).toBeLessThanOrEqual(1);
    expect(Array.isArray(out.classification.matched_signals)).toBe(true);
    expect(Array.isArray(out.classification.alternative_processes)).toBe(true);
  });

  // ───── 3-process variability ─────

  it("intent strongly favoring mill → routed mill (with mixWeight=0)", () => {
    const out = bridge.compose(
      donor,
      { intent: "endmill chip evacuation through hole" },
      { mixWeight: 0 },
    );
    expect(out.routedProcess).toBe("mill");
  });

  it("intent strongly favoring lathe → routed lathe (with mixWeight=0)", () => {
    const out = bridge.compose(
      donor,
      { intent: "turning facing lathe spindle thread cutting" },
      { mixWeight: 0 },
    );
    expect(out.routedProcess).toBe("lathe");
  });

  it("intent strongly favoring wedm → routed wedm (with mixWeight=0)", () => {
    const out = bridge.compose(
      donor,
      { intent: "wire EDM tight tolerance carbide die" },
      { mixWeight: 0 },
    );
    expect(out.routedProcess).toBe("wedm");
  });

  // ───── threshold parameter clamping ─────

  it("failThreshold clamped to [0,1]", () => {
    // Pass an out-of-range fail threshold; make sure no crash.
    const out = bridge.compose(donor, { intent: "mill" }, { failThreshold: 5 });
    expect(["proceed", "review", "reject"]).toContain(out.recommendation);
  });

  it("overrideThreshold clamped to [0,1]", () => {
    const out = bridge.compose(donor, { intent: "mill" }, { overrideThreshold: -1 });
    expect(["proceed", "review", "reject"]).toContain(out.recommendation);
  });

  it("proceedThreshold clamped to [0,1]", () => {
    const out = bridge.compose(donor, { intent: "mill" }, { proceedThreshold: Number.POSITIVE_INFINITY });
    expect(["proceed", "review", "reject"]).toContain(out.recommendation);
  });

  // ───── singleton ─────

  it("singleton export is a working instance", () => {
    expect(crossProcessAGIBridge).toBeInstanceOf(CrossProcessAGIBridge);
    const out = crossProcessAGIBridge.compose(donor, { intent: "mill" });
    expect(out.schemaVersion).toBe(AGI_SCHEMA_VERSION);
  });

  it("schema version constant is exported", () => {
    expect(AGI_SCHEMA_VERSION).toBe("1.0.0");
  });

  // ───── pure / no-mutation ─────

  it("compose does not mutate donor weights", () => {
    const before = donor.serialize();
    bridge.compose(donor, { intent: "mill a part" });
    const after = donor.serialize();
    expect(after.W1).toEqual(before.W1);
    expect(after.W2).toEqual(before.W2);
  });
});
