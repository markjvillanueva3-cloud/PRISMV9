// scripts/lib/nn-graph-confusion-analysis.test.mjs
// U-GNN-CONFUSION-ANALYSIS: macroF1 failure-mode decomposition from eval samples.
// Run: node scripts/lib/nn-graph-confusion-analysis.test.mjs

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  perClassStats, macroF1, macroF1Sensitivity, tailHistogram,
  topConfusionPairs, absorptionStats, analyzeEval,
  phantomPredictions, labelHealthReport,
  starvedClassTargets, retrainTargetManifest,
} from "./nn-graph-confusion-analysis.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Hand-computable reference set:
//   A: truth x3 -> 2 correct (A,A) + 1 miss (->B). predicted-A also once for a C.
//      tp=2 fn=1 fp=1 -> P=2/3, R=2/3, F1=0.667
//   B: truth x1 -> correct. predicted-B also once for an A miss. tp=1 fp=1 -> P=0.5 R=1 F1=0.667
//   C: truth x1 -> miss (->A). tp=0 -> F1=0
const SAMPLES = [
  { truth: "A", predicted: "A", correct: true },
  { truth: "A", predicted: "B", correct: false },
  { truth: "A", predicted: "A", correct: true },
  { truth: "B", predicted: "B", correct: true },
  { truth: "C", predicted: "A", correct: false },
];

describe("perClassStats", () => {
  const stats = perClassStats(SAMPLES);
  it("computes tp/fp/fn + precision/recall/f1 per truth class", () => {
    const a = stats.get("A");
    assert.equal(a.n, 3); assert.equal(a.tp, 2); assert.equal(a.fn, 1); assert.equal(a.fp, 1);
    assert.ok(Math.abs(a.f1 - 0.6667) < 1e-3);
    const b = stats.get("B");
    assert.equal(b.tp, 1); assert.equal(b.fp, 1); assert.ok(Math.abs(b.precision - 0.5) < 1e-9);
    assert.ok(Math.abs(b.f1 - 0.6667) < 1e-3);
    const c = stats.get("C");
    assert.equal(c.n, 1); assert.equal(c.f1, 0);
  });
  it("records confusedWith (truth's misses) most-frequent first", () => {
    assert.deepEqual(stats.get("A").confusedWith, [{ predicted: "B", count: 1 }]);
    assert.deepEqual(stats.get("C").confusedWith, [{ predicted: "A", count: 1 }]);
  });
  it("adversarial: empty / non-array -> empty map (never throws)", () => {
    assert.doesNotThrow(() => {
      assert.equal(perClassStats([]).size, 0);
      assert.equal(perClassStats(null).size, 0);
      assert.equal(perClassStats("x").size, 0);
    });
  });
});

describe("macroF1 + sensitivity (the binding-failure decomposition)", () => {
  const stats = perClassStats(SAMPLES);
  it("macroF1 averages F1 over the 3 truth classes", () => {
    assert.ok(Math.abs(macroF1(stats) - (0.6667 + 0.6667 + 0) / 3) < 1e-3); // ~0.444
  });
  it("excluding tail classes (n<2) isolates starvation drag: 0.444 -> 0.667", () => {
    const s = macroF1Sensitivity(stats, 2);
    assert.equal(s.includedClasses, 1);   // only A has n>=2
    assert.equal(s.excludedClasses, 2);   // B,C dropped
    assert.ok(Math.abs(s.macroF1 - 0.6667) < 1e-3);
  });
});

describe("tailHistogram / topConfusionPairs / absorption", () => {
  it("tail histogram counts classes by held-example count", () => {
    assert.deepEqual(tailHistogram(perClassStats(SAMPLES)), { 3: 1, 1: 2 });
  });
  it("top confusion pairs are the off-diagonal truth->predicted by count", () => {
    const pairs = topConfusionPairs(SAMPLES);
    assert.ok(pairs.some((p) => p.pair === "A -> B" && p.count === 1));
    assert.ok(pairs.some((p) => p.pair === "C -> A" && p.count === 1));
  });
  it("absorption flags OVER-predicted labels (predicted>truth)", () => {
    const ab = absorptionStats(SAMPLES);
    // B predicted twice (rows 2,4), true once -> surplus 1. A predicted 3 / true 3 -> surplus 0 (filtered).
    assert.deepEqual(ab, [{ class: "B", predicted: 2, truth: 1, surplus: 1 }]);
  });
});

describe("phantomPredictions + labelHealthReport (label-space prune hygiene)", () => {
  // Z is predicted but NEVER a true label -> phantom (prune candidate).
  const PH = [
    { truth: "X", predicted: "X", correct: true },
    { truth: "X", predicted: "Z", correct: false },
    { truth: "Y", predicted: "Z", correct: false },
  ];
  it("flags classes predicted with true-count 0 as phantom prune candidates", () => {
    const ph = phantomPredictions(PH);
    assert.deepEqual(ph, [{ class: "Z", predicted: 2, truth: 0 }]);
  });
  it("SAMPLES has no phantom (every predicted class has >=1 true example)", () => {
    assert.deepEqual(phantomPredictions(SAMPLES), []);
  });
  it("labelHealthReport quantifies phantom prediction mass + prune list", () => {
    const lh = labelHealthReport(PH);
    assert.equal(lh.phantomClasses, 1);
    assert.equal(lh.phantomPredictionMass, 2);
    assert.ok(Math.abs(lh.phantomMassPct - (2 / 3) * 100) < 0.2); // 2 of 3 predictions are phantom
    assert.deepEqual(lh.pruneCandidates, ["Z"]);
  });
  it("adversarial: empty / null -> zeros, never throws", () => {
    assert.doesNotThrow(() => {
      assert.deepEqual(phantomPredictions(null), []);
      assert.equal(labelHealthReport([]).phantomClasses, 0);
    });
  });
});

describe("starvedClassTargets (FINDING 1 -- actionable tail-class growth list)", () => {
  const stats = perClassStats(SAMPLES); // A:n=3, B:n=1, C:n=1
  it("lists truth classes below threshold with deficit = threshold - n, worst-first", () => {
    // threshold 5: B(1,+4), C(1,+4), A(3,+2). tie on n=1 -> class name asc (B before C).
    assert.deepEqual(starvedClassTargets(stats, 5), [
      { class: "B", n: 1, deficit: 4 },
      { class: "C", n: 1, deficit: 4 },
      { class: "A", n: 3, deficit: 2 },
    ]);
  });
  it("respects a custom threshold (classes at/above it drop out)", () => {
    // threshold 2: only n<2 -> B,C. A (n=3) excluded.
    assert.deepEqual(starvedClassTargets(stats, 2), [
      { class: "B", n: 1, deficit: 1 },
      { class: "C", n: 1, deficit: 1 },
    ]);
  });
  it("invalid threshold (0 / negative / non-int) falls back to 5", () => {
    const at5 = starvedClassTargets(stats, 5);
    assert.deepEqual(starvedClassTargets(stats, 0), at5);
    assert.deepEqual(starvedClassTargets(stats, -3), at5);
    assert.deepEqual(starvedClassTargets(stats, 2.5), at5);
    assert.deepEqual(starvedClassTargets(stats), at5); // default arg
  });
  it("excludes phantom (true-count-0) labels -- they are NOT starved truth classes", () => {
    // Z is predicted but never a truth -> perClassStats gives it n=0; must not appear.
    const ph = perClassStats([
      { truth: "X", predicted: "X", correct: true },
      { truth: "X", predicted: "Z", correct: false },
      { truth: "Y", predicted: "Z", correct: false },
    ]);
    const out = starvedClassTargets(ph, 5);
    assert.ok(!out.some((r) => r.class === "Z"), "Z (phantom, n=0) must be excluded");
    assert.deepEqual(out, [ { class: "Y", n: 1, deficit: 4 }, { class: "X", n: 2, deficit: 3 } ]);
  });
  it("adversarial: non-Map / empty -> [] (never throws)", () => {
    assert.doesNotThrow(() => {
      assert.deepEqual(starvedClassTargets(null), []);
      assert.deepEqual(starvedClassTargets("x"), []);
      assert.deepEqual(starvedClassTargets(new Map()), []);
    });
  });
});

describe("retrainTargetManifest (consolidated NO-GPU retrain targets, FINDINGS 1/2/4)", () => {
  it("bundles starved growth + absorption sinks + phantom prune with a summary", () => {
    const m = retrainTargetManifest({ samples: SAMPLES });
    assert.equal(m.holdoutN, 5);
    assert.equal(m.starveThreshold, 5);
    assert.deepEqual(m.starvedClasses, [
      { class: "B", n: 1, deficit: 4 },
      { class: "C", n: 1, deficit: 4 },
      { class: "A", n: 3, deficit: 2 },
    ]);
    assert.deepEqual(m.absorptionSinks, [{ class: "B", predicted: 2, truth: 1, surplus: 1 }]);
    assert.deepEqual(m.phantomPrune, []); // SAMPLES has no phantom
    assert.deepEqual(m.summary, { starvedCount: 3, totalExamplesNeeded: 10, sinkCount: 1, phantomCount: 0 });
  });
  it("surfaces phantom prune list when present", () => {
    const m = retrainTargetManifest({ samples: [
      { truth: "X", predicted: "X", correct: true },
      { truth: "X", predicted: "Z", correct: false },
      { truth: "Y", predicted: "Z", correct: false },
    ] });
    assert.deepEqual(m.phantomPrune, ["Z"]);
    assert.equal(m.summary.phantomCount, 1);
    assert.equal(m.summary.totalExamplesNeeded, 7); // Y:+4, X:+3
  });
  it("honors opts.starveThreshold override", () => {
    const m = retrainTargetManifest({ samples: SAMPLES }, { starveThreshold: 2 });
    assert.equal(m.starveThreshold, 2);
    assert.deepEqual(m.starvedClasses, [
      { class: "B", n: 1, deficit: 1 },
      { class: "C", n: 1, deficit: 1 },
    ]);
  });
  it("adversarial: null / no samples -> empty arrays + zero summary, never throws", () => {
    assert.doesNotThrow(() => {
      const m = retrainTargetManifest(null);
      assert.equal(m.holdoutN, 0);
      assert.deepEqual(m.starvedClasses, []);
      assert.deepEqual(m.summary, { starvedCount: 0, totalExamplesNeeded: 0, sinkCount: 0, phantomCount: 0 });
    });
  });
});

describe("LIVE NN-EVAL.json invariants (R15 validate -- skip-loud if absent)", () => {
  const evalPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "state", "shared", "nn-graph", "NN-EVAL.json");
  it("real eval manifest holds the structural invariants", { skip: !fs.existsSync(evalPath) }, () => {
    const ev = JSON.parse(fs.readFileSync(evalPath, "utf8"));
    const m = retrainTargetManifest(ev);
    // Every starved row is a genuine below-threshold truth class with the correct deficit.
    for (const s of m.starvedClasses) {
      assert.ok(s.n >= 1 && s.n < m.starveThreshold, `${s.class}: n=${s.n} must be in [1, ${m.starveThreshold})`);
      assert.equal(s.deficit, m.starveThreshold - s.n, `${s.class}: deficit must equal threshold - n`);
    }
    // A phantom (prune) label can never also be a starved truth class (disjoint defects).
    const starvedNames = new Set(m.starvedClasses.map((s) => s.class));
    for (const p of m.phantomPrune) assert.ok(!starvedNames.has(p), `${p} cannot be both phantom and starved`);
    // Summary totals are consistent with the arrays.
    assert.equal(m.summary.starvedCount, m.starvedClasses.length);
    assert.equal(m.summary.totalExamplesNeeded, m.starvedClasses.reduce((a, s) => a + s.deficit, 0));
    assert.equal(m.summary.phantomCount, m.phantomPrune.length);
  });
});

describe("analyzeEval (full bundle)", () => {
  it("produces the bundle from an eval doc with samples", () => {
    const a = analyzeEval({ samples: SAMPLES });
    assert.equal(a.holdoutN, 5);
    assert.equal(a.truthClasses, 3);
    assert.ok(Math.abs(a.accuracy - 3 / 5) < 1e-9);
    assert.ok(Array.isArray(a.macroF1Sensitivity) && a.macroF1Sensitivity.length === 4);
    // starvedTargets is wired into the bundle and matches the standalone export.
    assert.deepEqual(a.starvedTargets, starvedClassTargets(perClassStats(SAMPLES), 5));
  });
  it("adversarial: no samples -> zeros, never throws", () => {
    assert.doesNotThrow(() => {
      const a = analyzeEval({});
      assert.equal(a.holdoutN, 0);
      assert.equal(a.macroF1, 0);
    });
  });
});
