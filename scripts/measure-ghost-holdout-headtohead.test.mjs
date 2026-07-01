#!/usr/bin/env node
/**
 * Tests for measure-ghost-holdout-headtohead.mjs (slot:india 2026-06-21).
 *
 * Real reference-value coverage (R9): hand-computed sample sets + metrics (AUROC via the
 * rank-sum identity, macro-F1 over union(predicted,truth), Brier as MSE), happy + >=3
 * failure + >=2 adversarial per exported pure function. Graph-free (main() owns the 542MB
 * graph; the pure arm/score/decide logic is tested with synthetic holdouts). node:test.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  neighborArmSamples, hybridArmSamples, scoreArm, decideHeadToHead,
} from "./measure-ghost-holdout-headtohead.mjs";
import { GATE_THRESHOLDS } from "./lib/nn-graph-eval.mjs";

// Two wired voters; a ghost-aware neighbour index keyed by lowercased ghost stem.
const STEM_TO_CLASS = () => new Map([["w1", "prism_cam"], ["w2", "prism_calc"]]);
const GHOST_INDEX = () => new Map([
  ["g1", new Map([["w1", 2], ["w2", 1]])], // cam 2 vs calc 1 -> cam @ 2/3
  ["g2", new Map([["w2", 3]])],            // calc @ 1.0
]);
const HOLDOUT = () => ([
  { label: "G1", proposed_wiring: "prism_cam" },   // neighbour HIT (cam)
  { label: "G2", proposed_wiring: "prism_calc" },  // neighbour HIT (calc)
  { label: "G3", proposed_wiring: "prism_cam" },   // no index entry -> abstain
]);

// ---------------------------------------------------------------------------
// neighborArmSamples
// ---------------------------------------------------------------------------

test("neighborArmSamples: happy -- votes, purity confidence, abstention", () => {
  const s = neighborArmSamples(HOLDOUT(), GHOST_INDEX(), STEM_TO_CLASS());
  assert.equal(s.length, 3);
  assert.deepEqual(s[0], { engine: "G1", predicted: "prism_cam", truth: "prism_cam", confidence: 0.6667, correct: true, source: "neighbor" });
  assert.deepEqual(s[1], { engine: "G2", predicted: "prism_calc", truth: "prism_calc", confidence: 1, correct: true, source: "neighbor" });
  assert.deepEqual(s[2], { engine: "G3", predicted: "(none)", truth: "prism_cam", confidence: 0, correct: false, source: "abstain" });
});

test("neighborArmSamples: failure -- a wrong vote is correct:false (not silently dropped)", () => {
  // g1 truth flipped to calc; neighbour vote still says cam -> miss recorded, not hidden.
  const holdout = [{ label: "G1", proposed_wiring: "prism_calc" }];
  const s = neighborArmSamples(holdout, GHOST_INDEX(), STEM_TO_CLASS());
  assert.equal(s[0].correct, false);
  assert.equal(s[0].predicted, "prism_cam");
});

test("neighborArmSamples: failure -- empty / non-array holdout -> []", () => {
  assert.deepEqual(neighborArmSamples([], GHOST_INDEX(), STEM_TO_CLASS()), []);
  assert.deepEqual(neighborArmSamples(null, GHOST_INDEX(), STEM_TO_CLASS()), []);
});

test("neighborArmSamples: failure -- malformed holdout entries skipped", () => {
  const s = neighborArmSamples([null, { proposed_wiring: "prism_cam" }, { label: "G2", proposed_wiring: "prism_calc" }], GHOST_INDEX(), STEM_TO_CLASS());
  assert.equal(s.length, 1); // only the well-formed G2
  assert.equal(s[0].engine, "G2");
});

test("neighborArmSamples: adversarial -- a '(none)' truth can never be a false HIT", () => {
  // an abstaining ghost predicts "(none)"; even if truth were literally "(none)" the
  // predicted!=="(none)" guard makes correct:false (abstention is never scored a hit).
  const s = neighborArmSamples([{ label: "G9", proposed_wiring: "(none)" }], GHOST_INDEX(), STEM_TO_CLASS());
  assert.equal(s[0].predicted, "(none)");
  assert.equal(s[0].correct, false);
});

test("neighborArmSamples: adversarial -- uppercase label lowercased to hit the index", () => {
  // index key is "g1"; label "G1" must lowercase to match (else silent 0-coverage).
  const s = neighborArmSamples([{ label: "G1", proposed_wiring: "prism_cam" }], GHOST_INDEX(), STEM_TO_CLASS());
  assert.equal(s[0].source, "neighbor");
  assert.equal(s[0].predicted, "prism_cam");
});

// ---------------------------------------------------------------------------
// hybridArmSamples
// ---------------------------------------------------------------------------

test("hybridArmSamples: happy -- purity-gate at tau=0.7 (neighbor when >=tau, else direct)", () => {
  const direct = new Map([
    ["G1", { predicted: "prism_calc", confidence: 0.9 }], // neighbour purity 0.667 < 0.7 -> use direct
    ["G2", { predicted: "prism_calc", confidence: 0.5 }], // neighbour purity 1.0 >= 0.7 -> use neighbour
    ["G3", { predicted: "prism_cam", confidence: 0.8 }],  // neighbour abstains -> direct covers it
  ]);
  const s = hybridArmSamples(HOLDOUT(), GHOST_INDEX(), STEM_TO_CLASS(), direct, 0.7);
  assert.deepEqual(s[0], { engine: "G1", predicted: "prism_calc", truth: "prism_cam", confidence: 0.9, correct: false, source: "direct" });
  assert.deepEqual(s[1], { engine: "G2", predicted: "prism_calc", truth: "prism_calc", confidence: 1, correct: true, source: "neighbor" });
  assert.deepEqual(s[2], { engine: "G3", predicted: "prism_cam", truth: "prism_cam", confidence: 0.8, correct: true, source: "direct" });
});

test("hybridArmSamples: failure -- neither arm -> '(none)'/0/false", () => {
  // G3 abstains (no index) AND has no direct vote -> total abstention.
  const s = hybridArmSamples([{ label: "G3", proposed_wiring: "prism_cam" }], GHOST_INDEX(), STEM_TO_CLASS(), new Map(), 0.7);
  assert.deepEqual(s[0], { engine: "G3", predicted: "(none)", truth: "prism_cam", confidence: 0, correct: false, source: "abstain" });
});

test("hybridArmSamples: failure -- non-Map directByEngine tolerated (falls back to neighbour/abstain)", () => {
  const s = hybridArmSamples(HOLDOUT(), GHOST_INDEX(), STEM_TO_CLASS(), null, 0.7);
  assert.equal(s[1].source, "neighbor");        // G2 purity 1.0 still used
  assert.equal(s[2].predicted, "(none)");        // G3 abstains, no direct fallback available
});

test("hybridArmSamples: failure -- empty holdout -> []", () => {
  assert.deepEqual(hybridArmSamples([], GHOST_INDEX(), STEM_TO_CLASS(), new Map(), 0.7), []);
});

test("hybridArmSamples: adversarial -- tau>1 forces pure direct; neighbour-fallback only when direct is null", () => {
  // tau=1.01 can never be cleared by purity -> direct preferred; G1 has direct -> direct,
  // but with NO direct vote a present neighbour is the last-resort (neighbor-fallback), and
  // its confidence is the neighbour purity.
  const s = hybridArmSamples([{ label: "G1", proposed_wiring: "prism_cam" }], GHOST_INDEX(), STEM_TO_CLASS(), new Map(), 1.01);
  assert.equal(s[0].source, "neighbor-fallback");
  assert.equal(s[0].predicted, "prism_cam");
  assert.equal(s[0].confidence, 0.6667); // neighbour purity, not a direct cosine
});

test("hybridArmSamples: adversarial -- direct '(none)'/0 vote is a valid (covering) direct source", () => {
  // an embedding-less ghost: arm-1 emits {predicted:'(none)',confidence:0}; the hybrid
  // takes it as source 'direct' (predicted is a string) -> records the miss honestly.
  const direct = new Map([["G3", { predicted: "(none)", confidence: 0 }]]);
  const s = hybridArmSamples([{ label: "G3", proposed_wiring: "prism_cam" }], GHOST_INDEX(), STEM_TO_CLASS(), direct, 0.7);
  assert.equal(s[0].source, "direct");
  assert.equal(s[0].predicted, "(none)");
  assert.equal(s[0].correct, false);
});

// ---------------------------------------------------------------------------
// scoreArm
// ---------------------------------------------------------------------------

const SCORED_SAMPLES = () => ([
  { predicted: "prism_cam", truth: "prism_cam", confidence: 0.9, correct: true },
  { predicted: "prism_calc", truth: "prism_calc", confidence: 0.8, correct: true },
  { predicted: "prism_cam", truth: "prism_calc", confidence: 0.6, correct: false },
  { predicted: "(none)", truth: "prism_cam", confidence: 0, correct: false },
]);

test("scoreArm: happy -- hand-computed AUROC / macroF1 / Brier / accuracy / coverage", () => {
  const r = scoreArm(SCORED_SAMPLES(), GATE_THRESHOLDS, 0.7);
  // AUROC: positives {0.9,0.8} all above negatives {0.6,0} -> perfect 1.0
  assert.equal(r.metrics.auroc, 1);
  // macroF1 over {cam,calc,(none)}: cam f1=0.5, calc f1=0.6667, (none) f1=0 -> 1.1667/3
  assert.equal(r.metrics.macroF1, 0.3889);
  // Brier: (0.01+0.04+0.36+0)/4 = 0.1025
  assert.equal(r.metrics.brier, 0.1025);
  assert.equal(r.metrics.accuracy, 0.5);
  assert.equal(r.covered, 3);
  assert.equal(r.coverage, 0.75);
});

test("scoreArm: happy -- selective deploy at the production gate (emitted set)", () => {
  const r = scoreArm(SCORED_SAMPLES(), GATE_THRESHOLDS, 0.7);
  const dg = r.selective.deployGrade;
  // emitted at conf>=0.7: the two correct cam/calc -> Brier 0.025, macroF1 1.0, 2 classes
  assert.equal(dg.pass, true);
  assert.equal(dg.operatingPoint.coverage, 0.5);
  assert.equal(dg.operatingPoint.classesEmitted, 2);
  assert.equal(dg.operatingPoint.totalClasses, 2);
});

test("scoreArm: failure -- empty samples -> null metrics, null coverage", () => {
  const r = scoreArm([], GATE_THRESHOLDS, 0.7);
  assert.equal(r.n, 0);
  assert.equal(r.coverage, null);
  assert.equal(r.metrics.auroc, null);
  assert.equal(r.metrics.macroF1, null);
});

test("scoreArm: failure -- all abstain (one class of labels) -> AUROC null, coverage 0", () => {
  const s = [
    { predicted: "(none)", truth: "prism_cam", confidence: 0, correct: false },
    { predicted: "(none)", truth: "prism_calc", confidence: 0, correct: false },
  ];
  const r = scoreArm(s, GATE_THRESHOLDS, 0.7);
  assert.equal(r.metrics.auroc, null); // only label class 0 present -> AUROC undefined
  assert.equal(r.covered, 0);
  assert.equal(r.coverage, 0);
});

test("scoreArm: failure -- non-array samples -> n 0", () => {
  assert.equal(scoreArm(null, GATE_THRESHOLDS, 0.7).n, 0);
});

test("scoreArm: adversarial -- a perfect-but-concentrated emitted set is flagged concentrated", () => {
  // 3 truth classes total, but only cam clears the gate -> macroF1 over a 1-class subset.
  const s = [
    { predicted: "prism_cam", truth: "prism_cam", confidence: 0.95, correct: true },
    { predicted: "prism_cam", truth: "prism_cam", confidence: 0.9, correct: true },
    { predicted: "prism_calc", truth: "prism_calc", confidence: 0.3, correct: true },
    { predicted: "prism_dev", truth: "prism_dev", confidence: 0.2, correct: true },
  ];
  const r = scoreArm(s, GATE_THRESHOLDS, 0.7);
  const dg = r.selective.deployGrade;
  assert.equal(dg.operatingPoint.classesEmitted, 1);  // only cam emitted at >=0.7
  assert.equal(dg.operatingPoint.totalClasses, 3);
  assert.equal(dg.concentrated, true);
});

// ---------------------------------------------------------------------------
// decideHeadToHead
// ---------------------------------------------------------------------------

const arm = (pass, coverage, classesEmitted, totalClasses, robust) => ({
  selective: { deployGrade: { pass, robustAboveGate: robust, operatingPoint: pass ? { coverage, classesEmitted, totalClasses } : null } },
});

test("decideHeadToHead: happy -- hybrid passes + more classes + robust -> WIRE", () => {
  const d = decideHeadToHead({
    direct: arm(true, 0.27, 2, 13, true),
    hybrid: arm(true, 0.40, 5, 13, true),
  });
  assert.equal(d.wireEdges, true);
  assert.match(d.recommendation, /WIRE/);
});

test("decideHeadToHead: happy -- hybrid passes + more coverage (same classes) + robust -> WIRE", () => {
  const d = decideHeadToHead({
    direct: arm(true, 0.27, 2, 13, true),
    hybrid: arm(true, 0.45, 2, 13, true),
  });
  assert.equal(d.wireEdges, true);
});

test("decideHeadToHead: failure -- hybrid below the selective gate -> KEEP direct", () => {
  const d = decideHeadToHead({
    direct: arm(true, 0.27, 2, 13, true),
    hybrid: arm(false, 0, 0, 13, false),
  });
  assert.equal(d.wireEdges, false);
  assert.match(d.recommendation, /hybrid below gate/);
});

test("decideHeadToHead: failure -- hybrid passes but no better than direct -> KEEP direct", () => {
  const d = decideHeadToHead({
    direct: arm(true, 0.50, 5, 13, true),
    hybrid: arm(true, 0.40, 3, 13, true),
  });
  assert.equal(d.wireEdges, false);
  assert.match(d.recommendation, /not better/);
});

test("decideHeadToHead: failure -- missing arm -> inconclusive", () => {
  const d = decideHeadToHead({ direct: arm(true, 0.27, 2, 13, true) });
  assert.equal(d.wireEdges, false);
  assert.equal(d.recommendation, "inconclusive");
});

test("decideHeadToHead: adversarial -- more classes but NOT robust -> do NOT wire", () => {
  const d = decideHeadToHead({
    direct: arm(true, 0.27, 2, 13, true),
    hybrid: arm(true, 0.40, 5, 13, false), // wins on classes but unstable above the gate
  });
  assert.equal(d.wireEdges, false);
  assert.match(d.recommendation, /not better/);
});

test("decideHeadToHead: adversarial -- both pass, identical posture -> KEEP (no strict improvement)", () => {
  const d = decideHeadToHead({
    direct: arm(true, 0.30, 3, 13, true),
    hybrid: arm(true, 0.30, 3, 13, true),
  });
  assert.equal(d.wireEdges, false);
});
