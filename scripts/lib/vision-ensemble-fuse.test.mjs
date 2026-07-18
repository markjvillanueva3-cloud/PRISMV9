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
  ocrImageWithModelAsync,
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

// -- per-call curl --max-time cap (regression: the overnight-hang bug, 2026-06-16) --
// The training loop passes maxTimeSec = the 5h run WINDOW (18000s). Before the cap that 5h
// leaked into the per-CALL curl --max-time, so a single wedged Ollama call (VRAM contention)
// froze the whole overnight run instead of dropping that one page. These pin the contract:
// the per-call timeout is ALWAYS bounded to a sane ceiling, never the run window.

// Capturing spawn: records the curl args of the first call, then returns one ok reply.
function capturingSpawn() {
  const calls = [];
  const fn = (_cmd, args) => {
    calls.push(args);
    const child = new EventEmitter();
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.kill = () => {};
    queueMicrotask(() => {
      child.stdout.emit("data", Buffer.from(okReply(0.5, 0.9).out));
      child.emit("close", 0);
    });
    return child;
  };
  fn.maxTimeOf = (i = 0) => {
    const args = calls[i] || [];
    const k = args.indexOf("--max-time");
    return k >= 0 ? Number(args[k + 1]) : null;
  };
  return fn;
}

test("ocrImageWithModelAsync: caps the per-call --max-time at 600s even when the 5h window is passed", async () => {
  const spawn = capturingSpawn();
  await ocrImageWithModelAsync({
    imageBase64: "ZmFrZS1wbmc=", model: "qwen3-vl:8b-instruct",
    maxTimeSec: 18000, // the run window the loop passes through -- must NOT reach the curl call
    deps: { spawn, writeFile: () => {}, unlink: () => {} },
  });
  assert.equal(spawn.maxTimeOf(0), 600, "18000s window capped to the 600s per-call ceiling");
});

test("ocrImageWithModelAsync: unset maxTimeSec -> DEFAULT 300s per call", async () => {
  const spawn = capturingSpawn();
  await ocrImageWithModelAsync({
    imageBase64: "ZmFrZS1wbmc=", model: "m",
    deps: { spawn, writeFile: () => {}, unlink: () => {} },
  });
  assert.equal(spawn.maxTimeOf(0), 300, "no override -> DEFAULT_MAX_TIME_SEC");
});

test("ocrImageWithModelAsync: a caller-requested SHORTER timeout passes through (cap is a ceiling, not a floor)", async () => {
  const spawn = capturingSpawn();
  await ocrImageWithModelAsync({
    imageBase64: "ZmFrZS1wbmc=", model: "m",
    maxTimeSec: 120, // below the ceiling -- honored, not raised
    deps: { spawn, writeFile: () => {}, unlink: () => {} },
  });
  assert.equal(spawn.maxTimeOf(0), 120, "120s < 600s ceiling -> honored verbatim");
});

// -- format:"json" grammar-constrained decode threading (recovers the qwen2.5vl runaway-JSON dropout) --
// The training loop sets opts.format = "json" when --format-json is passed, then threads it
// loop -> runEnsembleOverImage -> ocrImageWithModelAsync -> buildOllamaRequestBody, which adds a
// top-level `format` key to the Ollama request. Default-OFF: unset -> the body omits the key
// (byte-identical legacy request). These pin the full thread + the byte-identical-when-unset
// contract end-to-end (no GPU/Ollama). Capture the body via the writeFile dep (the loop writes
// JSON.stringify(body) to the per-call reqFile that curl then POSTs with -d @reqFile).
function capturingWriteFile() {
  const bodies = [];
  const fn = (_path, data) => { bodies.push(String(data)); };
  fn.parsed = (i = 0) => { try { return JSON.parse(bodies[i]); } catch { return null; } };
  fn.count = () => bodies.length;
  return fn;
}

test("format threading: --format-json -> EVERY ensemble request body carries format:'json'", async () => {
  const writeFile = capturingWriteFile();
  const deps = { writeFile, unlink: () => {}, readFile: () => Buffer.from("fake-png-bytes"), spawn: fakeSpawnSeq([okReply(0.5, 0.9), okReply(0.5, 0.9)]) };
  await runEnsembleOverImage({ png: "C:/fake/print.png", models: ["m1", "m2"], assumeUnits: "in", format: "json", deps });
  assert.equal(writeFile.count(), 2, "one request body written per model");
  assert.equal(writeFile.parsed(0).format, "json", "model-1 body constrained to JSON");
  assert.equal(writeFile.parsed(1).format, "json", "model-2 body constrained to JSON");
});

test("format threading: unset -> NO `format` key in the request body (byte-identical legacy)", async () => {
  const writeFile = capturingWriteFile();
  const deps = { writeFile, unlink: () => {}, readFile: () => Buffer.from("fake-png-bytes"), spawn: fakeSpawnSeq([okReply(0.5, 0.9)]) };
  await runEnsembleOverImage({ png: "C:/fake/print.png", models: ["m1"], assumeUnits: "in", deps }); // no format
  const body = writeFile.parsed(0);
  assert.ok(body, "a request body was written");
  assert.ok(!("format" in body), "no `format` key when opts.format is unset (legacy body)");
});

test("ocrImageWithModelAsync: format passes straight through to the request body", async () => {
  const writeFile = capturingWriteFile();
  await ocrImageWithModelAsync({
    imageBase64: "ZmFrZS1wbmc=", model: "m", format: "json",
    deps: { writeFile, unlink: () => {}, spawn: capturingSpawn() },
  });
  assert.equal(writeFile.parsed(0).format, "json", "format threaded ocrImageWithModelAsync -> body");
});

// -- U-XRAY-READING-KNOWLEDGE: reading-guidance threads the live ensemble path (loop ->
// runEnsembleOverImage -> ocrImageWithModelAsync -> buildVisionPrompt). The block must appear in
// EVERY model's request prompt when opted in, and be ABSENT (byte-identical proven prompt) when not.
test("reading-guidance threading: injectReadingGuidance -> every ensemble request prompt carries the guidance block", async () => {
  const writeFile = capturingWriteFile();
  const deps = { writeFile, unlink: () => {}, readFile: () => Buffer.from("fake-png-bytes"), spawn: fakeSpawnSeq([okReply(0.5, 0.9), okReply(0.5, 0.9)]) };
  await runEnsembleOverImage({ png: "C:/fake/print.png", models: ["m1", "m2"], assumeUnits: "in", injectReadingGuidance: true, deps });
  assert.equal(writeFile.count(), 2, "one request body per model");
  assert.match(writeFile.parsed(0).prompt, /DOMAIN READING GUIDANCE/, "model-1 prompt carries the guidance block");
  assert.match(writeFile.parsed(1).prompt, /DOMAIN READING GUIDANCE/, "model-2 prompt carries the guidance block");
});

test("reading-guidance threading: unset -> prompt is byte-identical (NO guidance) through the live ensemble path", async () => {
  const writeFile = capturingWriteFile();
  const deps = { writeFile, unlink: () => {}, readFile: () => Buffer.from("fake-png-bytes"), spawn: fakeSpawnSeq([okReply(0.5, 0.9)]) };
  await runEnsembleOverImage({ png: "C:/fake/print.png", models: ["m1"], assumeUnits: "in", deps }); // no flag
  assert.ok(!writeFile.parsed(0).prompt.includes("DOMAIN READING GUIDANCE"), "no guidance when unset (proven path unchanged)");
});

// -- non-dimension field union (gdt / notes / profiles / surface_finishes) ------
// The fuse used to keep ONLY dimensions and DROP these. WHY each test matters: the ensemble
// extracts GD&T / notes / profiles / finish per model; dropping them at fuse means the
// closed-loop corpus can never capture them. The union is recall-first + corroboration-tagged.

function mkExt(fields) {
  return { dimensions: [], gdt: [], notes: [], profiles: [], surface_finishes: [], ...fields };
}

test("union gdt: 2 models agree on an FCF -> 1 entry, corroboration 2, NOT a hallucination candidate", () => {
  const frame = { symbol: "position", tolerance_value: 0.1, material_condition: "MMC", datum_references: ["A", "B"], applied_to: "hole", raw_text: "pos 0.1 MMC A B", confidence: 0.8 };
  const out = fuseEnsemble([
    { model: "m1", extraction: mkExt({ gdt: [frame] }) },
    { model: "m2", extraction: mkExt({ gdt: [{ ...frame, confidence: 0.6 }] }) },
  ]);
  assert.equal(out.gdt.length, 1, "identical FCF de-dupes to one entry");
  assert.equal(out.gdt[0].corroboration, 2);
  assert.deepEqual(out.gdt[0].models, ["m1", "m2"]);
  assert.equal(out.gdt[0].hallucination_candidate, false, "2-model agreement is not a hallucination candidate");
  assert.equal(out.gdt[0].symbol, "position", "representative fields preserved");
  assert.equal(out.summary.n_gdt, 1);
  assert.equal(out.summary.n_gdt_hallucination_candidates, 0);
});

test("union gdt: datum_references are order-insensitive -- [A,B] and [B,A] are ONE frame", () => {
  const out = fuseEnsemble([
    { model: "m1", extraction: mkExt({ gdt: [{ symbol: "position", tolerance_value: 0.1, datum_references: ["A", "B"], applied_to: "hole" }] }) },
    { model: "m2", extraction: mkExt({ gdt: [{ symbol: "position", tolerance_value: 0.1, datum_references: ["B", "A"], applied_to: "hole" }] }) },
  ]);
  assert.equal(out.gdt.length, 1, "A,B == B,A -> same FCF identity");
  assert.equal(out.gdt[0].corroboration, 2);
});

test("union gdt: a 1-of-2 frame is KEPT (recall-first) and flagged hallucination_candidate", () => {
  const out = fuseEnsemble([
    { model: "m1", extraction: mkExt({ gdt: [{ symbol: "flatness", tolerance_value: 0.05, datum_references: [], applied_to: "top" }] }) },
    { model: "m2", extraction: mkExt({ gdt: [] }) },
  ]);
  assert.equal(out.gdt.length, 1, "the singleton frame is never dropped");
  assert.equal(out.gdt[0].corroboration, 1);
  assert.equal(out.gdt[0].hallucination_candidate, true, "1 of 2 models -> hallucination candidate");
  assert.equal(out.summary.n_gdt_hallucination_candidates, 1);
});

test("union: single-model run never false-flags a hallucination (needs >=2 models)", () => {
  const out = fuseEnsemble([
    { model: "m1", extraction: mkExt({ gdt: [{ symbol: "flatness", tolerance_value: 0.05, datum_references: [], applied_to: "top" }], notes: [{ category: "process", text: "deburr all edges" }] }) },
  ]);
  assert.equal(out.gdt[0].corroboration, 1);
  assert.equal(out.gdt[0].hallucination_candidate, false, "1 of 1 is the only reader, not a hallucination");
  assert.equal(out.notes[0].hallucination_candidate, false);
});

test("union: higher-confidence member is the representative for a de-duped group", () => {
  // same identity key but different raw_text + confidence -> the higher-confidence read wins
  const out = fuseEnsemble([
    { model: "m1", extraction: mkExt({ gdt: [{ symbol: "position", tolerance_value: 0.1, datum_references: ["A"], applied_to: "hole", raw_text: "low-conf read", confidence: 0.4 }] }) },
    { model: "m2", extraction: mkExt({ gdt: [{ symbol: "position", tolerance_value: 0.1, datum_references: ["A"], applied_to: "hole", raw_text: "high-conf read", confidence: 0.9 }] }) },
  ]);
  assert.equal(out.gdt.length, 1);
  assert.equal(out.gdt[0].raw_text, "high-conf read", "the most-confident member is kept as the representative");
});

test("union notes / profiles / surface_finishes: de-dupe across models, counts in summary", () => {
  const out = fuseEnsemble([
    { model: "m1", extraction: mkExt({
      notes: [{ category: "finish", text: "Black oxide" }],
      profiles: [{ name: "bore", type: "hole", diameter_mm: 12.7 }],
      surface_finishes: [{ ra_um: 0.8, location: "all machined surfaces", raw_text: "Ra 0.8" }],
    }) },
    { model: "m2", extraction: mkExt({
      notes: [{ category: "finish", text: "black  oxide" }],   // case/whitespace variant -> same note
      profiles: [{ name: "bore", type: "hole", diameter_mm: 12.7 }],
      surface_finishes: [{ ra_um: 0.8, location: "all machined surfaces", raw_text: "Ra 0.8" }],
    }) },
  ]);
  assert.equal(out.notes.length, 1, "case/whitespace-variant note de-dupes");
  assert.equal(out.notes[0].corroboration, 2);
  assert.equal(out.profiles.length, 1);
  assert.equal(out.surface_finishes.length, 1);
  assert.equal(out.summary.n_notes, 1);
  assert.equal(out.summary.n_profiles, 1);
  assert.equal(out.summary.n_surface_finishes, 1);
});

test("union surface_finishes: same ra at DIFFERENT locations stay separate (distinct callouts)", () => {
  const out = fuseEnsemble([
    { model: "m1", extraction: mkExt({ surface_finishes: [
      { ra_um: 0.8, location: "all surfaces", raw_text: "Ra 0.8" },
      { ra_um: 0.8, location: "bore", raw_text: "Ra 0.8" },
    ] }) },
  ]);
  assert.equal(out.surface_finishes.length, 2, "same ra, different location -> two distinct finishes");
});

test("union: malformed inputs (null items, non-array fields) are dropped, no throw", () => {
  const out = fuseEnsemble([
    { model: "m1", extraction: { dimensions: [], gdt: [null, "garbage"], notes: undefined, profiles: "notarray", surface_finishes: [null, 42] } },
  ]);
  assert.equal(out.gdt.length, 0, "null/string items dropped");
  assert.equal(out.notes.length, 0, "undefined field -> [] (no throw)");
  assert.equal(out.profiles.length, 0, "non-array field -> [] (no throw)");
  assert.equal(out.surface_finishes.length, 0, "null/number items dropped");
  assert.equal(out.summary.n_gdt, 0);
});

test("union: deterministic -- result independent of model input order", () => {
  const g1 = { symbol: "position", tolerance_value: 0.1, datum_references: ["A"], applied_to: "hole", confidence: 0.7 };
  const g2 = { symbol: "flatness", tolerance_value: 0.05, datum_references: [], applied_to: "top", confidence: 0.6 };
  const proj = (o) => o.gdt.map((x) => x.symbol + ":" + x.corroboration + ":" + x.models.join(","));
  const a = fuseEnsemble([
    { model: "m1", extraction: mkExt({ gdt: [g1] }) },
    { model: "m2", extraction: mkExt({ gdt: [g1, g2] }) },
  ]);
  const b = fuseEnsemble([
    { model: "m2", extraction: mkExt({ gdt: [g2, g1] }) },
    { model: "m1", extraction: mkExt({ gdt: [g1] }) },
  ]);
  assert.deepEqual(proj(a), proj(b), "union is order-independent (sorted models, corroboration-desc, stable ties)");
});

test("union: EQUAL-corroboration entries order by identity key, not model input order", () => {
  // two singleton notes, each from a different model -> equal corroboration (1). The output order
  // must be content-deterministic (identity-key sort), NOT dependent on which model came first.
  const nA = { category: "process", text: "anodize black" };
  const nZ = { category: "process", text: "zinc plate" };
  const order1 = fuseEnsemble([
    { model: "m1", extraction: mkExt({ notes: [nA] }) },
    { model: "m2", extraction: mkExt({ notes: [nZ] }) },
  ]).notes.map((n) => n.text);
  const order2 = fuseEnsemble([
    { model: "m2", extraction: mkExt({ notes: [nZ] }) },
    { model: "m1", extraction: mkExt({ notes: [nA] }) },
  ]).notes.map((n) => n.text);
  assert.deepEqual(order1, order2, "equal-corroboration order is input-order-independent");
  assert.deepEqual(order1, ["anodize black", "zinc plate"], "ordered by identity key (process|anodize... < process|zinc...)");
});

test("union is additive: dimensions still fuse normally alongside the non-dim union", () => {
  const out = fuseEnsemble([
    { model: "m1", extraction: mkExt({ dimensions: [{ nominal_mm: 25.4, type: "linear", confidence: 0.9 }], gdt: [{ symbol: "position", tolerance_value: 0.1, datum_references: ["A"], applied_to: "hole" }] }) },
    { model: "m2", extraction: mkExt({ dimensions: [{ nominal_mm: 25.4, type: "linear", confidence: 0.8 }], gdt: [{ symbol: "position", tolerance_value: 0.1, datum_references: ["A"], applied_to: "hole" }] }) },
  ]);
  assert.equal(out.dimensions.length, 1, "the 25.4 linear dim still fuses to one corroborated cluster");
  assert.equal(out.dimensions[0].corroboration, 2);
  assert.equal(out.gdt.length, 1, "and the gdt union runs in the same fuse");
  assert.equal(out.gdt[0].corroboration, 2);
});
