// scripts/lib/lora-training-pipeline.test.mjs
//
// Tests for lora-training-pipeline.mjs — generic LoRA fine-tune pipeline
// that collapses the 67 forked LoRA engines per Agent M's audit.
//
// Run: node --test H:/prism/scripts/lib/lora-training-pipeline.test.mjs
//
// Coverage:
//   1. validateAdapter — contract enforcement
//   2. buildDataset — partition + validation + rejection accounting
//   3. hyperparameterGrid — combinatorial expansion
//   4. trainOnce — harness wraps innerTrain + lock + EWC + holdout + audit
//   5. ensembleVote — top-k + domain-adapter dispatch
//   6. deployGate — safety + drift gates
//   7. createLoRATrainingPipeline — full pipeline binding
//   8. runFullPipeline — end-to-end with deterministic mock innerTrain
//   9. Domain adapter stubs — latheAdapterStub / millAdapterStub / wedmAdapterStub

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  PIPELINE_VERSION,
  validateAdapter,
  buildDataset,
  hyperparameterGrid,
  trainOnce,
  ensembleVote,
  deployGate,
  createLoRATrainingPipeline,
  latheAdapterStub,
  millAdapterStub,
  wedmAdapterStub,
} from "./lora-training-pipeline.mjs";

// ---------------------------------------------------------------------------
// Helper — minimal valid adapter for harness tests
// ---------------------------------------------------------------------------

function makeFakeAdapter(domain) {
  return {
    domainTag: () => domain,
    extractFeatures: (raw) => [raw.x ?? 0, raw.y ?? 0],
    validateExample: (raw) =>
      raw && typeof raw.x === "number" ? { valid: true } : { valid: false, reason: "missing-x" },
    mergeAdapters: (adapters) => ({ domain, n: adapters.length, mean: adapters.reduce((s, a) => s + a.score, 0) / adapters.length }),
  };
}

function fakeCorpus(n) {
  return Array.from({ length: n }, (_, i) => ({ x: i, y: i * 2 }));
}

// ---------------------------------------------------------------------------
// validateAdapter
// ---------------------------------------------------------------------------

describe("validateAdapter", () => {
  it("accepts a valid adapter", () => {
    validateAdapter(makeFakeAdapter("lathe"), "lathe");
  });

  it("rejects null adapter", () => {
    assert.throws(() => validateAdapter(null, "lathe"), /must be an object/);
  });

  it("rejects invalid domain", () => {
    assert.throws(() => validateAdapter(makeFakeAdapter("lathe"), "grinder"), /invalid domain/);
  });

  it("rejects adapter missing a required method", () => {
    const broken = { ...makeFakeAdapter("lathe") };
    delete broken.mergeAdapters;
    assert.throws(() => validateAdapter(broken, "lathe"), /missing required method 'mergeAdapters'/);
  });

  it("rejects when domainTag returns mismatched domain", () => {
    const a = makeFakeAdapter("lathe");
    a.domainTag = () => "mill"; // intentional mismatch
    assert.throws(() => validateAdapter(a, "lathe"), /mismatch/);
  });
});

// ---------------------------------------------------------------------------
// buildDataset
// ---------------------------------------------------------------------------

describe("buildDataset", () => {
  it("partitions valid examples train/holdout by trainSplit", () => {
    const adapter = makeFakeAdapter("lathe");
    const ds = buildDataset(fakeCorpus(100), adapter, { minExamples: 10, trainSplit: 0.8 });
    assert.equal(ds.train.length, 80);
    assert.equal(ds.holdout.length, 20);
    assert.equal(ds.rejected, 0);
  });

  it("counts rejected examples + groups by reason", () => {
    const adapter = makeFakeAdapter("lathe");
    const corpus = [...fakeCorpus(20), { y: 1 }, { z: 2 }]; // 2 invalid (missing x)
    const ds = buildDataset(corpus, adapter, { minExamples: 5 });
    assert.equal(ds.rejected, 2);
    assert.equal(ds.reasons["missing-x"], 2);
  });

  it("throws when too few valid examples after validation", () => {
    const adapter = makeFakeAdapter("lathe");
    assert.throws(() => buildDataset(fakeCorpus(3), adapter, { minExamples: 10 }), /only 3 valid examples/);
  });

  it("rejects examples with empty feature vectors", () => {
    const a = makeFakeAdapter("lathe");
    a.extractFeatures = () => []; // always returns empty
    assert.throws(() => buildDataset(fakeCorpus(20), a, { minExamples: 5 }), /empty-features/);
  });

  it("throws on non-array corpus", () => {
    assert.throws(() => buildDataset("not an array", makeFakeAdapter("lathe")), /must be an array/);
  });

  it("throws on invalid trainSplit", () => {
    assert.throws(() => buildDataset(fakeCorpus(20), makeFakeAdapter("lathe"), { trainSplit: 1.5 }), /trainSplit/);
    assert.throws(() => buildDataset(fakeCorpus(20), makeFakeAdapter("lathe"), { trainSplit: 0 }), /trainSplit/);
  });
});

// ---------------------------------------------------------------------------
// hyperparameterGrid
// ---------------------------------------------------------------------------

describe("hyperparameterGrid", () => {
  it("returns default 4×4×4×4 = 256 combinations", () => {
    const grid = hyperparameterGrid();
    assert.equal(grid.length, 4 * 4 * 4 * 4);
  });

  it("respects custom search space", () => {
    const grid = hyperparameterGrid({ rank: [8, 16], alpha: [16], dropout: [0.1], lr: [3e-4, 1e-3] });
    assert.equal(grid.length, 2 * 1 * 1 * 2);
  });

  it("every combo has all 4 hyperparameters", () => {
    const grid = hyperparameterGrid({ rank: [8], alpha: [16], dropout: [0.1], lr: [3e-4] });
    assert.equal(grid.length, 1);
    assert.deepEqual(Object.keys(grid[0]).sort(), ["alpha", "dropout", "lr", "rank"]);
  });

  it("falls back to defaults if search space is missing axes", () => {
    const grid = hyperparameterGrid({ rank: [8] }); // missing alpha/dropout/lr
    assert.ok(grid.length > 0, "should default missing axes, not crash");
  });
});

// ---------------------------------------------------------------------------
// trainOnce
// ---------------------------------------------------------------------------

describe("trainOnce", () => {
  const dataset = { train: [{ x: 1, y: 2 }, { x: 3, y: 4 }], holdout: [{ x: 5, y: 6 }] };
  const hyper = { rank: 16, alpha: 16, dropout: 0.1, lr: 3e-4 };
  const innerTrain = async () => ({ weights: [0.1, 0.2], loss: 0.42 });

  it("returns weights + loss + metadata", async () => {
    const r = await trainOnce({ dataset, hyperparameters: hyper, innerTrain });
    assert.deepEqual(r.weights, [0.1, 0.2]);
    assert.equal(r.loss, 0.42);
    assert.equal(r.hyperparameters, hyper);
    assert.ok(typeof r.timestamp === "string" && r.timestamp.includes("T"));
  });

  it("invokes lockAcquire + release with lockKey", async () => {
    let acquired = null;
    let released = false;
    const r = await trainOnce({
      dataset, hyperparameters: hyper, innerTrain,
      lockAcquire: async (key) => {
        acquired = key;
        return async () => { released = true; };
      },
      lockKey: "lora-lathe",
    });
    assert.equal(acquired, "lora-lathe");
    assert.equal(released, true);
    assert.equal(r.loss, 0.42);
  });

  it("throws if lockAcquire provided without lockKey", async () => {
    await assert.rejects(
      trainOnce({ dataset, hyperparameters: hyper, innerTrain, lockAcquire: async () => async () => {} }),
      /lockKey required/
    );
  });

  it("releases lock even if innerTrain throws", async () => {
    let released = false;
    await assert.rejects(
      trainOnce({
        dataset, hyperparameters: hyper,
        innerTrain: async () => { throw new Error("train failure"); },
        lockAcquire: async () => async () => { released = true; },
        lockKey: "lora-lathe",
      }),
      /train failure/
    );
    assert.equal(released, true, "lock must release on inner failure");
  });

  it("invokes ewcConsolidate with trained weights", async () => {
    let consolidated = null;
    await trainOnce({
      dataset, hyperparameters: hyper, innerTrain,
      ewcConsolidate: async (w) => { consolidated = w; },
    });
    assert.deepEqual(consolidated, [0.1, 0.2]);
  });

  it("invokes evalHoldout and attaches metrics", async () => {
    const r = await trainOnce({
      dataset, hyperparameters: hyper, innerTrain,
      evalHoldout: (_weights, holdout) => ({ mae: 0.05, n: holdout.length }),
    });
    assert.deepEqual(r.holdoutMetrics, { mae: 0.05, n: 1 });
  });

  it("invokes auditLog with structured entry", async () => {
    let logged = null;
    await trainOnce({
      dataset, hyperparameters: hyper, innerTrain,
      auditLog: (entry) => { logged = entry; },
    });
    assert.equal(logged.loss, 0.42);
    assert.equal(logged.n_train, 2);
    assert.equal(logged.n_holdout, 1);
    assert.ok(logged.timestamp);
  });

  it("rejects non-finite loss from innerTrain (R12 fail-loud)", async () => {
    await assert.rejects(
      trainOnce({ dataset, hyperparameters: hyper, innerTrain: async () => ({ weights: [], loss: NaN }) }),
      /must return finite loss/
    );
    await assert.rejects(
      trainOnce({ dataset, hyperparameters: hyper, innerTrain: async () => ({ weights: [], loss: Infinity }) }),
      /must return finite loss/
    );
  });
});

// ---------------------------------------------------------------------------
// ensembleVote
// ---------------------------------------------------------------------------

describe("ensembleVote", () => {
  const adapter = makeFakeAdapter("lathe");
  const trained = [
    { weights: [1], loss: 0.5 },
    { weights: [2], loss: 0.1 },  // best
    { weights: [3], loss: 0.3 },
    { weights: [4], loss: 0.9 },  // worst
  ];

  it("selects top-k by score ascending (lower-is-better)", () => {
    const r = ensembleVote(trained, adapter, { topK: 2 });
    // The 2 lowest losses are 0.1, 0.3 → those should be top-2
    assert.deepEqual(r.scores, [0.1, 0.3]);
    assert.equal(r.topK, 2);
  });

  it("caps topK at length(trained)", () => {
    const r = ensembleVote(trained, adapter, { topK: 99 });
    assert.equal(r.topK, 4);
  });

  it("delegates merge to domain adapter", () => {
    const r = ensembleVote(trained, adapter, { topK: 3 });
    assert.equal(r.merged.domain, "lathe");
    assert.equal(r.merged.n, 3);
  });

  it("throws on empty trained array", () => {
    assert.throws(() => ensembleVote([], adapter), /non-empty/);
  });

  it("throws if adapter.mergeAdapters returns falsy", () => {
    const a = makeFakeAdapter("lathe");
    a.mergeAdapters = () => null;
    assert.throws(() => ensembleVote(trained, a), /returned falsy/);
  });
});

// ---------------------------------------------------------------------------
// deployGate
// ---------------------------------------------------------------------------

describe("deployGate", () => {
  const merged = { domain: "lathe" };

  it("deploys when no gates provided", () => {
    const r = deployGate({ merged });
    assert.equal(r.deployed, true);
    assert.equal(r.reason, "all-gates-passed");
  });

  it("blocks deploy when S(x) below safetyFloor", () => {
    const r = deployGate({
      merged,
      safetyCheck: () => ({ sx: 0.80, omega: 0.85 }),
      safetyFloor: 0.95,
    });
    assert.equal(r.deployed, false);
    assert.match(r.reason, /safety-floor/);
    assert.equal(r.gates.safety.sx, 0.80);
  });

  it("allows deploy when S(x) at or above safetyFloor", () => {
    const r = deployGate({
      merged,
      safetyCheck: () => ({ sx: 0.96, omega: 0.96 }),
      safetyFloor: 0.95,
    });
    assert.equal(r.deployed, true);
  });

  it("blocks deploy when drift exceeds floor", () => {
    const r = deployGate({
      merged,
      driftCheck: () => ({ mae_delta: 0.10 }),
      baseline: { mae: 0.5 },
      driftFloor: 0.05,
    });
    assert.equal(r.deployed, false);
    assert.match(r.reason, /drift-floor/);
  });

  it("checks safety FIRST then drift (short-circuit)", () => {
    let driftCalled = false;
    const r = deployGate({
      merged,
      safetyCheck: () => ({ sx: 0.50 }),
      safetyFloor: 0.95,
      driftCheck: () => { driftCalled = true; return { mae_delta: 0 }; },
      baseline: { mae: 0.5 },
    });
    assert.equal(r.deployed, false);
    assert.equal(driftCalled, false, "drift should not be checked once safety fails");
  });
});

// ---------------------------------------------------------------------------
// createLoRATrainingPipeline + runFullPipeline
// ---------------------------------------------------------------------------

describe("createLoRATrainingPipeline", () => {
  it("exposes version + 5 stages + runFullPipeline", () => {
    const pipeline = createLoRATrainingPipeline({ domain: "lathe", adapter: makeFakeAdapter("lathe") });
    assert.equal(pipeline.version, PIPELINE_VERSION);
    assert.equal(typeof pipeline.buildDataset, "function");
    assert.equal(typeof pipeline.hyperparameterGrid, "function");
    assert.equal(typeof pipeline.trainOnce, "function");
    assert.equal(typeof pipeline.ensembleVote, "function");
    assert.equal(typeof pipeline.deployGate, "function");
    assert.equal(typeof pipeline.runFullPipeline, "function");
  });

  it("throws if domain + adapter mismatch (R8 read-before-write protection)", () => {
    assert.throws(() => createLoRATrainingPipeline({ domain: "lathe", adapter: makeFakeAdapter("mill") }), /mismatch/);
  });

  it("runFullPipeline runs all 5 stages end-to-end with mock innerTrain", async () => {
    const pipeline = createLoRATrainingPipeline({ domain: "lathe", adapter: makeFakeAdapter("lathe") });
    const result = await pipeline.runFullPipeline({
      corpus: fakeCorpus(50),
      innerTrain: async (_train, hyper) => ({
        weights: [hyper.rank, hyper.alpha],
        // synthetic loss decreases as rank increases (deterministic for test)
        loss: 1 - hyper.rank / 64,
      }),
      options: {
        dataset: { minExamples: 5 },
        searchSpace: { rank: [8, 16], alpha: [16], dropout: [0.1], lr: [3e-4] },
        ensemble: { topK: 2 },
        safetyCheck: () => ({ sx: 0.98 }),
        safetyFloor: 0.95,
      },
    });
    assert.equal(result.dataset.n_train + result.dataset.n_holdout, 50);
    assert.equal(result.n_trained, 2, "should have trained 2 hyperparameter combos");
    assert.equal(result.ensemble.topK, 2);
    assert.equal(result.deploy.deployed, true);
  });

  it("runFullPipeline blocks deploy when safety fails", async () => {
    const pipeline = createLoRATrainingPipeline({ domain: "mill", adapter: makeFakeAdapter("mill") });
    const result = await pipeline.runFullPipeline({
      corpus: fakeCorpus(50),
      innerTrain: async () => ({ weights: [1], loss: 0.5 }),
      options: {
        searchSpace: { rank: [8], alpha: [16], dropout: [0.1], lr: [3e-4] },
        safetyCheck: () => ({ sx: 0.50 }),
        safetyFloor: 0.95,
      },
    });
    assert.equal(result.deploy.deployed, false);
    assert.match(result.deploy.reason, /safety-floor/);
  });
});

// ---------------------------------------------------------------------------
// Domain adapter stubs — reference shape verification
// ---------------------------------------------------------------------------

describe("latheAdapterStub", () => {
  it("declares lathe domain", () => {
    assert.equal(latheAdapterStub.domainTag(), "lathe");
  });

  it("extracts 5 lathe features", () => {
    const f = latheAdapterStub.extractFeatures({
      tool_diameter: 12.7, depth_of_cut: 2.0, feed_rate: 0.2, spindle_rpm: 2400, material_hardness_hb: 250,
    });
    assert.equal(f.length, 5);
    assert.deepEqual(f, [12.7, 2.0, 0.2, 2400, 250]);
  });

  it("validates spindle RPM and tool diameter", () => {
    assert.equal(latheAdapterStub.validateExample({ spindle_rpm: 2000, tool_diameter: 10 }).valid, true);
    assert.equal(latheAdapterStub.validateExample({ spindle_rpm: 0, tool_diameter: 10 }).valid, false);
    assert.equal(latheAdapterStub.validateExample({ spindle_rpm: 2000, tool_diameter: -1 }).valid, false);
    assert.equal(latheAdapterStub.validateExample(null).valid, false);
  });

  it("merges by inverse-loss weighting", () => {
    const merged = latheAdapterStub.mergeAdapters([
      { weights: [1, 2], score: 0.1 },  // best (lowest loss)
      { weights: [3, 4], score: 0.5 },
    ]);
    assert.equal(merged.domain, "lathe");
    assert.equal(merged.composition, "weighted-by-inverse-loss");
    assert.equal(merged.n_components, 2);
    // weight for first should be larger (inverse of smaller loss)
    assert.ok(merged.weights_ref[0].weight > merged.weights_ref[1].weight);
    // weights sum to 1
    const sum = merged.weights_ref.reduce((s, w) => s + w.weight, 0);
    assert.ok(Math.abs(sum - 1.0) < 1e-9, `weights must sum to 1, got ${sum}`);
  });

  it("returns null on empty adapter list", () => {
    assert.equal(latheAdapterStub.mergeAdapters([]), null);
  });
});

describe("millAdapterStub", () => {
  it("declares mill domain + extracts 6 features", () => {
    assert.equal(millAdapterStub.domainTag(), "mill");
    const f = millAdapterStub.extractFeatures({
      engagement_radial_pct: 30, engagement_axial_mm: 5, tool_diameter: 12,
      feed_per_tooth: 0.05, rpm: 8000, flute_count: 4,
    });
    assert.equal(f.length, 6);
  });

  it("merges by top-k-average with equal weights", () => {
    const merged = millAdapterStub.mergeAdapters([
      { weights: [1], score: 0.1 },
      { weights: [2], score: 0.3 },
      { weights: [3], score: 0.5 },
    ]);
    assert.equal(merged.composition, "top-k-average");
    assert.equal(merged.n_components, 3);
    // each weight = 1/3
    for (const w of merged.weights_ref) {
      assert.ok(Math.abs(w.weight - 1 / 3) < 1e-9);
    }
  });
});

describe("wedmAdapterStub", () => {
  it("declares wedm domain + extracts 5 EDM-specific features", () => {
    assert.equal(wedmAdapterStub.domainTag(), "wedm");
    const f = wedmAdapterStub.extractFeatures({
      pulse_on_us: 20, pulse_off_us: 40, wire_speed_mm_min: 8,
      dielectric_pressure_mpa: 0.5, servo_voltage_v: 70,
    });
    assert.equal(f.length, 5);
  });

  it("validates pulse_on_us", () => {
    assert.equal(wedmAdapterStub.validateExample({ pulse_on_us: 20 }).valid, true);
    assert.equal(wedmAdapterStub.validateExample({ pulse_on_us: 0 }).valid, false);
  });

  it("merges as best-of-k (single weight=1.0)", () => {
    const merged = wedmAdapterStub.mergeAdapters([
      { weights: [1], score: 0.1 },
      { weights: [2], score: 0.3 },
    ]);
    assert.equal(merged.composition, "best-of-k");
    assert.equal(merged.weights_ref.length, 1);
    assert.equal(merged.weights_ref[0].weight, 1.0);
  });
});

// ---------------------------------------------------------------------------
// Anti-regression — invariants that must hold across the 67-engine collapse
// ---------------------------------------------------------------------------

describe("collapse invariants", () => {
  it("all 3 domain stubs pass validateAdapter against their declared domain", () => {
    validateAdapter(latheAdapterStub, "lathe");
    validateAdapter(millAdapterStub, "mill");
    validateAdapter(wedmAdapterStub, "wedm");
  });

  it("each domain stub rejects cross-domain registration", () => {
    assert.throws(() => validateAdapter(latheAdapterStub, "mill"), /mismatch/);
    assert.throws(() => validateAdapter(millAdapterStub, "wedm"), /mismatch/);
    assert.throws(() => validateAdapter(wedmAdapterStub, "lathe"), /mismatch/);
  });

  it("PIPELINE_VERSION follows semver", () => {
    assert.match(PIPELINE_VERSION, /^\d+\.\d+\.\d+$/);
  });

  it("end-to-end pipeline is deterministic for the same input", async () => {
    const make = () => createLoRATrainingPipeline({ domain: "lathe", adapter: makeFakeAdapter("lathe") });
    const seedInner = async (_train, hyper) => ({ weights: [hyper.rank], loss: 0.5 - hyper.rank / 100 });
    const opts = {
      corpus: fakeCorpus(30),
      innerTrain: seedInner,
      options: { searchSpace: { rank: [8, 16], alpha: [16], dropout: [0.1], lr: [3e-4] } },
    };
    const a = await make().runFullPipeline(opts);
    const b = await make().runFullPipeline(opts);
    assert.equal(a.n_trained, b.n_trained);
    assert.equal(a.ensemble.scores[0], b.ensemble.scores[0]);
    assert.equal(a.deploy.deployed, b.deploy.deployed);
  });
});
