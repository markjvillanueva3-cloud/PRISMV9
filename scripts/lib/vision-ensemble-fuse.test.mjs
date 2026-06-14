// scripts/lib/vision-ensemble-fuse.test.mjs
// Tests for U-XRAY-VISION-ENSEMBLE pure fusion core. Reference values + algebraic
// invariants — no toBeDefined() stubs. The fusion decides a real, costly thing: which
// extracted dimensions are trusted as consensus ground truth vs flagged as hallucination
// candidates for the operator-confirm gate. Each test encodes WHY a verdict matters.

import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";

import {
  combineConfidenceNoisyOr,
  normalizeModelDim,
  clusterAcrossModels,
  fuseEnsemble,
  runEnsembleOverImage,
  NOISY_OR_CAP,
  DEFAULT_DIM_CONF,
} from "./vision-ensemble-fuse.mjs";

// ── combineConfidenceNoisyOr ────────────────────────────────────────────────

test("noisy-OR: empty → 0 (no evidence)", () => {
  assert.equal(combineConfidenceNoisyOr([]), 0);
  assert.equal(combineConfidenceNoisyOr(null), 0);
  assert.equal(combineConfidenceNoisyOr("nope"), 0);
});

test("noisy-OR: single source returns its own confidence", () => {
  assert.equal(combineConfidenceNoisyOr([0.9]), 0.9);
});

test("noisy-OR: independent corroboration BOOSTS above any single source", () => {
  // 1-(1-0.8)(1-0.8) = 1-0.04 = 0.96 — two independent 0.8s are MORE trustworthy than one.
  assert.equal(combineConfidenceNoisyOr([0.8, 0.8]), 0.96);
  // monotonic: a third corroborator never lowers it.
  assert.ok(combineConfidenceNoisyOr([0.8, 0.8, 0.8]) >= combineConfidenceNoisyOr([0.8, 0.8]));
});

test("noisy-OR: clean reference 0.5+0.5 → 0.75", () => {
  assert.equal(combineConfidenceNoisyOr([0.5, 0.5]), 0.75);
});

test("noisy-OR: never reaches certainty (capped at NOISY_OR_CAP)", () => {
  const v = combineConfidenceNoisyOr([0.99, 0.99, 0.99, 0.99]);
  assert.equal(v, NOISY_OR_CAP);
  assert.ok(v < 1);
});

test("noisy-OR: clamps out-of-range, drops non-finite", () => {
  // 1.5→1 clamp, -0.3→0 clamp, NaN dropped, 0.5 kept. With a clamped 1.0 present, result hits cap.
  assert.equal(combineConfidenceNoisyOr([1.5, -0.3, NaN, 0.5]), NOISY_OR_CAP);
  // only finite-in-range survive: [0, 0.5] → 1-(1)(0.5)=0.5
  assert.equal(combineConfidenceNoisyOr([0, 0.5]), 0.5);
});

// ── normalizeModelDim ───────────────────────────────────────────────────────

test("normalizeModelDim: bare number → value-only (type null)", () => {
  assert.deepEqual(normalizeModelDim(25.4), { type: null, mm: 25.4, confidence: null, raw_text: null });
});

test("normalizeModelDim: rich object preserves type/conf/raw", () => {
  const n = normalizeModelDim({ nominal_mm: 10, type: "diameter", confidence: 0.9, raw_text: "Ø10" });
  assert.equal(n.mm, 10);
  assert.equal(n.type, "diameter");
  assert.equal(n.confidence, 0.9);
  assert.equal(n.raw_text, "Ø10");
});

test("normalizeModelDim: 'unknown' sentinel type collapses to null (value-only fallback)", () => {
  assert.equal(normalizeModelDim({ nominal_mm: 5, type: "unknown" }).type, null);
});

test("normalizeModelDim: no resolvable mm → null", () => {
  assert.equal(normalizeModelDim(null), null);
  assert.equal(normalizeModelDim({ type: "diameter" }), null);     // no value
  assert.equal(normalizeModelDim({ nominal_mm: null }), null);     // explicit null mm
  assert.equal(normalizeModelDim({ nominal_mm: "abc" }), null);    // non-numeric
});

test("normalizeModelDim: out-of-range confidence clamped to [0,1]", () => {
  assert.equal(normalizeModelDim({ mm: 1, confidence: 1.7 }).confidence, 1);
  assert.equal(normalizeModelDim({ mm: 1, confidence: -2 }).confidence, 0);
});

// ── clusterAcrossModels ─────────────────────────────────────────────────────

test("cluster: 3 models agreeing on one value → 1 cluster, 3 distinct members", () => {
  const clusters = clusterAcrossModels([
    { model: "qwen3-vl", dims: [{ nominal_mm: 10, type: "diameter" }] },
    { model: "qwen2.5vl", dims: [{ nominal_mm: 10.02, type: "diameter" }] },
    { model: "llama-vision", dims: [{ nominal_mm: 9.98, type: "diameter" }] },
  ]);
  assert.equal(clusters.length, 1);
  assert.equal(clusters[0].members.length, 3);
  assert.deepEqual(clusters[0].members.map((m) => m.model).sort(), ["llama-vision", "qwen2.5vl", "qwen3-vl"]);
});

test("cluster: one-vote-per-model — same model's two equal dims do NOT self-corroborate", () => {
  // Model A reports the same 10mm twice (two real features of equal size). They must land in
  // SEPARATE clusters, never inflate a single cluster's corroboration to 2 from one model.
  const clusters = clusterAcrossModels([
    { model: "A", dims: [{ nominal_mm: 10, type: "linear" }, { nominal_mm: 10, type: "linear" }] },
  ]);
  assert.equal(clusters.length, 2);
  assert.ok(clusters.every((c) => c.members.length === 1));
});

test("cluster: type-aware — diameter 45 and linear 45 do NOT merge", () => {
  const clusters = clusterAcrossModels([
    { model: "A", dims: [{ nominal_mm: 45, type: "diameter" }] },
    { model: "B", dims: [{ nominal_mm: 45, type: "linear" }] },
  ]);
  assert.equal(clusters.length, 2);
});

test("cluster: value tolerance gate — close merges, far splits", () => {
  // tol = max(0.05mm, 1% of mag). 10.0 vs 10.05 → tol≈0.1005 → merge. 10.0 vs 10.5 → split.
  const merged = clusterAcrossModels([
    { model: "A", dims: [{ nominal_mm: 10.0, type: "linear" }] },
    { model: "B", dims: [{ nominal_mm: 10.05, type: "linear" }] },
  ]);
  assert.equal(merged.length, 1);
  const split = clusterAcrossModels([
    { model: "A", dims: [{ nominal_mm: 10.0, type: "linear" }] },
    { model: "B", dims: [{ nominal_mm: 10.5, type: "linear" }] },
  ]);
  assert.equal(split.length, 2);
});

test("cluster: unknown-type dim merges with a typed dim and inherits the concrete type", () => {
  const clusters = clusterAcrossModels([
    { model: "A", dims: [{ nominal_mm: 10 }] },                       // type null
    { model: "B", dims: [{ nominal_mm: 10, type: "diameter" }] },
  ]);
  assert.equal(clusters.length, 1);
  assert.equal(clusters[0].resolvedType, "diameter");
});

// ── fuseEnsemble ────────────────────────────────────────────────────────────

const ext = (dims) => ({ dimensions: dims });

test("fuse: 3 models agree → corroborated consensus, noisy-OR confidence gain > 0", () => {
  const out = fuseEnsemble([
    { model: "qwen3-vl", extraction: ext([{ nominal_mm: 10, type: "diameter", confidence: 0.8 }]) },
    { model: "qwen2.5vl", extraction: ext([{ nominal_mm: 10.01, type: "diameter", confidence: 0.8 }]) },
    { model: "llama-vision", extraction: ext([{ nominal_mm: 9.99, type: "diameter", confidence: 0.8 }]) },
  ]);
  assert.equal(out.dimensions.length, 1);
  const d = out.dimensions[0];
  assert.equal(d.corroboration, 3);
  assert.equal(d.status, "corroborated");
  assert.equal(d.hallucination_candidate, false);
  assert.equal(d.low_corroboration, false);
  assert.ok(Math.abs(d.value_mm - 10) < 0.02);              // consensus ≈ the agreed value
  assert.ok(d.agreement_confidence > 0.8);                  // corroboration lifted it above any single 0.8
  assert.ok(d.confidence_gain > 0);                          // the explicit lift signal is positive
  assert.equal(out.summary.n_corroborated, 1);
  assert.equal(out.summary.n_hallucination_candidates, 0);
});

test("fuse: 2 agree + 1 phantom → consensus kept, phantom flagged hallucination candidate", () => {
  const out = fuseEnsemble([
    { model: "A", extraction: ext([{ nominal_mm: 10, type: "diameter", confidence: 0.9 }]) },
    { model: "B", extraction: ext([{ nominal_mm: 10, type: "diameter", confidence: 0.9 }]) },
    { model: "C", extraction: ext([{ nominal_mm: 99, type: "linear", confidence: 0.9 }]) }, // phantom
  ]);
  const consensus = out.dimensions.find((d) => Math.abs(d.value_mm - 10) < 0.1);
  const phantom = out.dimensions.find((d) => Math.abs(d.value_mm - 99) < 0.1);
  assert.equal(consensus.corroboration, 2);
  assert.equal(consensus.status, "corroborated");
  assert.equal(phantom.corroboration, 1);
  assert.equal(phantom.status, "singleton");
  assert.equal(phantom.hallucination_candidate, true);      // only 1 of 3 models saw it
  assert.equal(out.summary.n_hallucination_candidates, 1);
  assert.equal(out.summary.n_corroborated, 1);
});

test("fuse: single-model ensemble never false-flags a hallucination (needs ≥2 models)", () => {
  const out = fuseEnsemble([
    { model: "A", extraction: ext([{ nominal_mm: 10, type: "diameter", confidence: 0.8 }]) },
  ]);
  assert.equal(out.dimensions.length, 1);
  assert.equal(out.dimensions[0].corroboration, 1);
  assert.equal(out.dimensions[0].hallucination_candidate, false); // can't corroborate with 1 model — not a hallucination claim
  assert.equal(out.summary.n_hallucination_candidates, 0);
});

test("fuse: empty input → empty, well-formed summary (no throw)", () => {
  const out = fuseEnsemble([]);
  assert.equal(out.dimensions.length, 0);
  assert.equal(out.summary.n_models, 0);
  assert.equal(out.summary.n_corroborated, 0);
  assert.deepEqual(out.ambiguous_pairs, []);
});

test("fuse: ambiguous pair flagged for near same-type values, NOT for distinct ones", () => {
  // Ø10 (A,B agree) vs Ø12 (C alone): rel 2/12≈0.167 ≤ 0.30 → ambiguous (one feature disputed OR two similar features).
  const near = fuseEnsemble([
    { model: "A", extraction: ext([{ nominal_mm: 10, type: "diameter", confidence: 0.8 }]) },
    { model: "B", extraction: ext([{ nominal_mm: 10, type: "diameter", confidence: 0.8 }]) },
    { model: "C", extraction: ext([{ nominal_mm: 12, type: "diameter", confidence: 0.8 }]) },
  ]);
  assert.equal(near.ambiguous_pairs.length, 1);
  assert.equal(near.ambiguous_pairs[0].type, "diameter");
  // Ø10 vs Ø50: rel 0.8 > 0.30 → genuinely distinct, NOT flagged.
  const far = fuseEnsemble([
    { model: "A", extraction: ext([{ nominal_mm: 10, type: "diameter", confidence: 0.8 }]) },
    { model: "B", extraction: ext([{ nominal_mm: 50, type: "diameter", confidence: 0.8 }]) },
  ]);
  assert.equal(far.ambiguous_pairs.length, 0);
});

test("fuse: missing per-dim confidence defaults to DEFAULT_DIM_CONF in the combine", () => {
  // Two models, no confidences → both use DEFAULT_DIM_CONF (0.5) → noisy-OR = 1-0.5^2 = 0.75.
  const out = fuseEnsemble([
    { model: "A", extraction: ext([{ nominal_mm: 7, type: "linear" }]) },
    { model: "B", extraction: ext([{ nominal_mm: 7, type: "linear" }]) },
  ]);
  assert.equal(DEFAULT_DIM_CONF, 0.5);
  assert.equal(out.dimensions[0].agreement_confidence, 0.75);
});

test("fuse: deterministic — result is independent of model/dim input order", () => {
  const runsA = [
    { model: "A", extraction: ext([{ nominal_mm: 10, type: "diameter", confidence: 0.8 }, { nominal_mm: 25, type: "linear", confidence: 0.7 }]) },
    { model: "B", extraction: ext([{ nominal_mm: 25, type: "linear", confidence: 0.6 }, { nominal_mm: 10, type: "diameter", confidence: 0.9 }]) },
  ];
  const runsB = [runsA[1], runsA[0]]; // models swapped
  const a = fuseEnsemble(runsA);
  const b = fuseEnsemble(runsB);
  assert.deepEqual(
    a.dimensions.map((d) => [d.type, d.value_mm, d.corroboration]),
    b.dimensions.map((d) => [d.type, d.value_mm, d.corroboration]),
  );
});

test("fuse: quorum scales with model count (3 of 4 = corroborated, below quorum = partial)", () => {
  // 4 models, quorum = max(2, ceil(4/2)) = 2. A dim with 3 corroborators is well above quorum.
  const out = fuseEnsemble([
    { model: "A", extraction: ext([{ nominal_mm: 8, type: "linear", confidence: 0.7 }]) },
    { model: "B", extraction: ext([{ nominal_mm: 8, type: "linear", confidence: 0.7 }]) },
    { model: "C", extraction: ext([{ nominal_mm: 8, type: "linear", confidence: 0.7 }]) },
    { model: "D", extraction: ext([{ nominal_mm: 200, type: "linear", confidence: 0.7 }]) }, // outlier
  ]);
  assert.equal(out.summary.quorum, 2);
  const main = out.dimensions.find((d) => Math.abs(d.value_mm - 8) < 0.1);
  assert.equal(main.corroboration, 3);
  assert.equal(main.status, "corroborated");
});

// ── runEnsembleOverImage (impure shell, fully dependency-injected — no GPU/Ollama) ──

// Fake curl spawn returning a canned {status,out} per call, in invocation order. Emits on a
// microtask so the Promise-based curlAsync settles asynchronously, exercising the real path.
function fakeSpawnSeq(responses) {
  let i = 0;
  return () => {
    const r = responses[i++] || { code: 1, out: "" };
    const child = new EventEmitter();
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.kill = () => {};
    queueMicrotask(() => {
      if (r.out) child.stdout.emit("data", Buffer.from(r.out));
      child.emit("close", r.code);
    });
    return child;
  };
}
// One model's Ollama reply: outer {response:<innerJSON>}; inner is the VLM's print extraction.
function okReply(diaIn, conf) {
  const inner = JSON.stringify({ title_block: { units: "in" }, dimensions: [{ type: "diameter", nominal: diaIn, unit: "in", confidence: conf }] });
  return { code: 0, out: JSON.stringify({ response: inner }) };
}
const noopFs = { writeFile: () => {}, unlink: () => {}, readFile: () => Buffer.from("fake-png-bytes") };

test("runEnsembleOverImage: concurrent run, one model fails → ensemble still fuses survivors", async () => {
  let t = 0;
  const deps = {
    ...noopFs,
    now: () => (t += 10),                                   // deterministic ms
    spawn: fakeSpawnSeq([okReply(0.5, 0.9), okReply(0.5, 0.9), { code: 7, out: "" }]), // m3 = curl fail
  };
  const res = await runEnsembleOverImage({
    png: "C:/fake/print.png",
    models: ["m1", "m2", "m3-fails"],
    assumeUnits: "in",
    deps,
  });
  assert.equal(res.models_ok, 2);                            // two survivors
  assert.equal(res.models_failed, 1);                        // failure isolated, did NOT abort
  assert.equal(res.fused.summary.n_models, 2);               // fuse runs over survivors only
  // 0.5 in → 12.7 mm; both survivors agree → corroborated consensus.
  const d = res.fused.dimensions.find((x) => Math.abs(x.value_mm - 12.7) < 0.05);
  assert.ok(d, "expected a ~12.7mm consensus dimension");
  assert.equal(d.corroboration, 2);
  assert.equal(d.status, "corroborated");
  // the failing model is surfaced with its error, never silently dropped (R12).
  const failRun = res.per_model_runs.find((r) => r.model === "m3-fails");
  assert.equal(failRun.ok, false);
  assert.ok(failRun.error && /curl exit=7/.test(failRun.error));
});

test("runEnsembleOverImage: no models → well-formed empty result, no throw", async () => {
  const res = await runEnsembleOverImage({ png: "C:/fake/print.png", models: [], deps: noopFs });
  assert.equal(res.models_ok, 0);
  assert.equal(res.fused.summary.n_models, 0);
  assert.equal(res.error, "no models");
});
