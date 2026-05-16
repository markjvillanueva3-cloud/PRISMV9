#!/usr/bin/env node
/**
 * graphsage-checkpoint.test.mjs — node:test suite for U4 component (c) of
 * NN-GRAPH-MS0 (GraphSAGE checkpoint serialization).
 *
 * Load-bearing invariants this suite pins:
 *  - a save -> JSON.stringify -> JSON.parse -> load round trip reconstructs a
 *    model whose forward pass yields BYTE-IDENTICAL embeddings (the contract
 *    U5's frozen-weight link predictor depends on);
 *  - every corruption path the loader is meant to guard fails LOUDLY, never
 *    silently — a dropped `activation`, a non-finite weight, a schema-version
 *    mismatch, a config/geometry mismatch, corrupt JSON;
 *  - bundled calibrator/metadata round-trip intact, are decoupled deep copies,
 *    and cannot smuggle a prototype-pollution key or a JSON-uncarryable value.
 * Deterministic, no stubs (CLAUDE.md R9).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createModel, forward } from "./graphsage-model.mjs";
import {
  CHECKPOINT_SCHEMA_VERSION,
  SCHEMA_VERSION,
  saveCheckpoint,
  loadCheckpoint,
} from "./graphsage-checkpoint.mjs";

/** A small, fully-determined 2-layer model: inputDim 4 / hidden 3 / embed 2. */
function tinyModel() {
  return createModel({ inputDim: 4, hiddenDim: 3, embedDim: 2, seed: 7 });
}

/** A tiny deterministic graph (4 nodes) + length-4 feature vectors. */
function tinyGraph() {
  const adjacency = new Map([
    ["a", ["b", "c"]],
    ["b", ["a", "d"]],
    ["c", ["a"]],
    ["d", ["b"]],
  ]);
  const features = new Map([
    ["a", [0.10, -0.20, 0.30, 0.40]],
    ["b", [-0.50, 0.60, 0.70, -0.80]],
    ["c", [0.90, 0.11, -0.12, 0.13]],
    ["d", [-0.14, 0.15, 0.16, -0.17]],
  ]);
  return { adjacency, features };
}

/** Assert two embedding maps (Map<id,Float64Array>) are bit-for-bit equal. */
function assertEmbeddingsIdentical(a, b, label) {
  assert.equal(a.size, b.size, `${label}: embedding count differs`);
  for (const [id, va] of a) {
    const vb = b.get(id);
    assert.ok(vb, `${label}: node ${id} missing from second set`);
    assert.equal(va.length, vb.length, `${label}: node ${id} length differs`);
    for (let i = 0; i < va.length; i++) {
      assert.ok(Object.is(va[i], vb[i]), `${label}: node ${id}[${i}] ${va[i]} != ${vb[i]}`);
    }
  }
}

/** A fresh, deeply-copied checkpoint object safe to mutate in a test. */
function freshCheckpoint(model = tinyModel()) {
  return JSON.parse(JSON.stringify(saveCheckpoint(model)));
}

describe("saveCheckpoint", () => {
  it("produces a JSON-safe object carrying schema, config, layers", () => {
    const cp = saveCheckpoint(tinyModel(), { savedAt: "2026-05-16T00:00:00.000Z" });
    assert.equal(cp.schemaVersion, CHECKPOINT_SCHEMA_VERSION);
    assert.equal(cp.savedAt, "2026-05-16T00:00:00.000Z");
    assert.deepEqual(cp.config, { inputDim: 4, hiddenDim: 3, embedDim: 2, seed: 7 });
    assert.equal(cp.layers.length, 2);
    assert.equal(cp.layers[0].activation, "relu");
    assert.equal(cp.layers[1].activation, "linear");
    // Weights persist as plain number[] (Float64Array is not JSON-safe).
    assert.ok(Array.isArray(cp.layers[0].W));
    assert.equal(cp.layers[0].W.length, 3 * 8);
    assert.equal(cp.layers[1].W.length, 2 * 6);
  });

  it("defaults savedAt to a parseable ISO timestamp when not given", () => {
    const cp = saveCheckpoint(tinyModel());
    assert.equal(typeof cp.savedAt, "string");
    assert.ok(Number.isFinite(Date.parse(cp.savedAt)), "savedAt must be a real timestamp");
  });

  it("defaults calibrator and metadata to null when not bundled", () => {
    const cp = saveCheckpoint(tinyModel());
    assert.equal(cp.calibrator, null);
    assert.equal(cp.metadata, null);
  });

  it("throws on a non-finite weight (would JSON.stringify to null)", () => {
    const m = tinyModel();
    m.layers[0].W[5] = NaN;
    assert.throws(() => saveCheckpoint(m), /non-finite/);
    const m2 = tinyModel();
    m2.layers[1].W[0] = Infinity;
    assert.throws(() => saveCheckpoint(m2), /non-finite/);
  });

  it("throws on a missing/unknown layer activation", () => {
    const m = tinyModel();
    delete m.layers[1].activation;
    assert.throws(() => saveCheckpoint(m), /activation/);
    const m2 = tinyModel();
    m2.layers[0].activation = "tanh";
    assert.throws(() => saveCheckpoint(m2), /activation/);
  });

  it("throws on a model that is not 2-layer", () => {
    const m = tinyModel();
    m.layers.push({ ...m.layers[1] });
    assert.throws(() => saveCheckpoint(m), /2-layer/);
  });

  it("throws when layer geometry disagrees with config", () => {
    const m = tinyModel();
    m.config.hiddenDim = 99; // layer0.rows (3) no longer matches
    assert.throws(() => saveCheckpoint(m), /geometry/);
  });

  it("throws on a structurally invalid model", () => {
    assert.throws(() => saveCheckpoint(null), /must be an object/);
    assert.throws(() => saveCheckpoint({ layers: [] }), /2-layer/);
  });
});

describe("loadCheckpoint", () => {
  it("accepts a JSON string", () => {
    const json = JSON.stringify(saveCheckpoint(tinyModel()));
    const out = loadCheckpoint(json);
    assert.equal(out.model.layers.length, 2);
    assert.equal(out.schemaVersion, CHECKPOINT_SCHEMA_VERSION);
  });

  it("accepts an already-parsed object", () => {
    const obj = saveCheckpoint(tinyModel());
    const out = loadCheckpoint(obj);
    assert.equal(out.model.config.inputDim, 4);
  });

  it("rebuilds layer weights as Float64Array with the correct shape", () => {
    const out = loadCheckpoint(saveCheckpoint(tinyModel()));
    assert.ok(out.model.layers[0].W instanceof Float64Array);
    assert.equal(out.model.layers[0].W.length, 24);
    assert.equal(out.model.k, 2);
    assert.equal(out.model.layers[0].activation, "relu");
    assert.equal(out.model.layers[1].activation, "linear");
  });

  it("throws TypeError on a non-string, non-object input", () => {
    assert.throws(() => loadCheckpoint(42), TypeError);
    assert.throws(() => loadCheckpoint(null), TypeError);
    assert.throws(() => loadCheckpoint(undefined), TypeError);
  });

  it("throws on corrupt JSON with a clear message", () => {
    assert.throws(() => loadCheckpoint("{not valid json"), /corrupt checkpoint JSON/);
  });

  it("throws on a schema-version mismatch — numeric", () => {
    const cp = freshCheckpoint();
    cp.schemaVersion = CHECKPOINT_SCHEMA_VERSION + 1;
    assert.throws(() => loadCheckpoint(cp), /schema-version mismatch/);
  });

  it("throws on a schema-version mismatch — string '1' is not number 1", () => {
    const cp = freshCheckpoint();
    cp.schemaVersion = String(CHECKPOINT_SCHEMA_VERSION);
    assert.throws(() => loadCheckpoint(cp), /schema-version mismatch/);
  });

  it("throws when the layers array is absent", () => {
    assert.throws(() => loadCheckpoint({ schemaVersion: CHECKPOINT_SCHEMA_VERSION }), /no .?layers/);
  });

  it("throws on a missing layer activation (silent ReLU-revert guard)", () => {
    const cp = freshCheckpoint();
    delete cp.layers[1].activation;
    assert.throws(() => loadCheckpoint(cp), /activation/);
  });

  it("throws on a non-finite weight (JSON null = was NaN/Infinity)", () => {
    const cp = freshCheckpoint();
    cp.layers[0].W[0] = null; // a JSON null is exactly how a former NaN deserializes
    assert.throws(() => loadCheckpoint(cp), /non-finite/);
  });

  it("throws when a layer weight value is not an array", () => {
    const cp = freshCheckpoint();
    cp.layers[0].W = { 0: 1, 1: 2 }; // object, not array
    assert.throws(() => loadCheckpoint(cp), /weight array is missing/);
  });

  it("throws when layer rows/cols are not positive integers", () => {
    const cp = freshCheckpoint();
    cp.layers[0].rows = 0;
    assert.throws(() => loadCheckpoint(cp), /rows\/cols/);
    const cp2 = freshCheckpoint();
    cp2.layers[0].cols = 2.5;
    assert.throws(() => loadCheckpoint(cp2), /rows\/cols/);
  });

  it("throws when a weight array length disagrees with rows*cols", () => {
    const cp = freshCheckpoint();
    cp.layers[0].W.push(0.0); // 25 elements, expected 24
    assert.throws(() => loadCheckpoint(cp), /weight length/);
  });

  it("throws when layer geometry disagrees with config", () => {
    const cp = freshCheckpoint();
    cp.config.hiddenDim = 99; // internally consistent layers, config mismatch
    assert.throws(() => loadCheckpoint(cp), /geometry/);
  });

  it("substitutes null (not 0) for a missing seed — mirrors saveCheckpoint", () => {
    const cp = freshCheckpoint();
    delete cp.config.seed;
    const out = loadCheckpoint(cp);
    assert.equal(out.model.config.seed, null);
  });
});

describe("round-trip determinism", () => {
  it("save -> stringify -> parse -> load yields byte-identical embeddings", () => {
    const original = tinyModel();
    const { adjacency, features } = tinyGraph();
    const before = forward(original, adjacency, features, { buildCache: false }).embeddings;

    const reloaded = loadCheckpoint(JSON.stringify(saveCheckpoint(original))).model;
    const after = forward(reloaded, adjacency, features, { buildCache: false }).embeddings;

    assertEmbeddingsIdentical(before, after, "round-trip");
  });

  it("preserves every weight bit-exactly through the JSON round trip", () => {
    const original = tinyModel();
    const reloaded = loadCheckpoint(JSON.stringify(saveCheckpoint(original))).model;
    for (let L = 0; L < 2; L++) {
      const wa = original.layers[L].W;
      const wb = reloaded.layers[L].W;
      assert.equal(wa.length, wb.length);
      for (let i = 0; i < wa.length; i++) {
        assert.ok(Object.is(wa[i], wb[i]), `layer ${L} weight ${i} drifted`);
      }
    }
  });

  it("round-trips config exactly, including a finite seed", () => {
    const out = loadCheckpoint(JSON.stringify(saveCheckpoint(tinyModel())));
    assert.deepEqual(out.model.config, { inputDim: 4, hiddenDim: 3, embedDim: 2, seed: 7 });
  });

  it("a seedless model round-trips to a byte-identical (null-seed) config", () => {
    const m = tinyModel();
    m.config.seed = undefined; // non-finite -> save writes null -> load reads null
    const out = loadCheckpoint(JSON.stringify(saveCheckpoint(m)));
    assert.equal(out.model.config.seed, null);
  });

  it("round-trips an explicit seed of 0 (0 is finite — preserved, not nulled)", () => {
    const m = tinyModel();
    m.config.seed = 0; // 0 is finite: the null sentinel must NOT swallow it
    const out = loadCheckpoint(JSON.stringify(saveCheckpoint(m)));
    assert.equal(out.model.config.seed, 0);
  });

  it("preserves savedAt across the round trip; non-string savedAt loads as null", () => {
    const out = loadCheckpoint(JSON.stringify(saveCheckpoint(tinyModel(), { savedAt: "2026-01-02T03:04:05.000Z" })));
    assert.equal(out.savedAt, "2026-01-02T03:04:05.000Z");
    const cp = freshCheckpoint();
    cp.savedAt = 12345; // not a string
    assert.equal(loadCheckpoint(cp).savedAt, null);
  });
});

describe("bundled calibrator / metadata", () => {
  it("round-trips a calibrator bundle intact", () => {
    const calibrator = { breakpoints: [0.1, 0.5, 0.9], fitted: [0.05, 0.4, 0.95], n: 120, dropped: 3, reliable: true };
    const out = loadCheckpoint(JSON.stringify(saveCheckpoint(tinyModel(), { calibrator })));
    assert.deepEqual(out.calibrator, calibrator);
  });

  it("round-trips an arbitrary metadata bundle intact", () => {
    const metadata = { auroc: 0.913, macroF1: 0.58, epochs: 40, notes: "U4d run" };
    const out = loadCheckpoint(JSON.stringify(saveCheckpoint(tinyModel(), { metadata })));
    assert.deepEqual(out.metadata, metadata);
  });

  it("returns deep copies — mutating the saved bundle cannot corrupt the source", () => {
    const calibrator = { breakpoints: [0.2, 0.8] };
    const cp = saveCheckpoint(tinyModel(), { calibrator });
    cp.calibrator.breakpoints.push(999);
    assert.deepEqual(calibrator.breakpoints, [0.2, 0.8], "source calibrator must be untouched");
  });

  it("strips a __proto__ pollution key from a bundled object", () => {
    const evil = JSON.parse('{"__proto__":{"pwned":1},"breakpoints":[0.5]}');
    const cp = saveCheckpoint(tinyModel(), { calibrator: evil });
    assert.equal(({}).pwned, undefined, "global Object.prototype must not be polluted");
    assert.deepEqual(Object.keys(cp.calibrator), ["breakpoints"], "__proto__ key must be dropped");
  });

  it("throws on a non-finite number inside a calibrator bundle (save)", () => {
    assert.throws(() => saveCheckpoint(tinyModel(), { calibrator: { breakpoints: [0.1, NaN] } }), /non-finite/);
  });

  it("throws on a non-finite number in a bundle passed as a parsed object", () => {
    // A JSON file cannot literally carry NaN, but loadCheckpoint also accepts an
    // already-parsed object — an in-memory NaN must still be rejected on load.
    const cp = freshCheckpoint();
    cp.calibrator = { breakpoints: [0.1, NaN] };
    assert.throws(() => loadCheckpoint(cp), /non-finite/);
  });

  it("loads a JSON null inside a bundle as null (JSON has no NaN literal)", () => {
    // Calibrator semantic validity (sorted, finite breakpoints) is the isotonic
    // module's contract; this module only guarantees JSON-safety + no pollution.
    const cp = freshCheckpoint();
    cp.calibrator = { breakpoints: [0.1, null] };
    const out = loadCheckpoint(JSON.parse(JSON.stringify(cp)));
    assert.equal(out.calibrator.breakpoints[1], null);
  });

  it("throws on a non-JSON-safe value (function) in a bundle", () => {
    assert.throws(() => saveCheckpoint(tinyModel(), { metadata: { fn: () => 1 } }), /non-JSON-safe/);
  });

  it("throws on a pathologically deep / cyclic bundle", () => {
    let root = {};
    let cur = root;
    for (let i = 0; i < 80; i++) { // 80 nesting levels > MAX_BUNDLE_DEPTH (64)
      cur.n = {};
      cur = cur.n;
    }
    assert.throws(() => saveCheckpoint(tinyModel(), { metadata: root }), /nesting depth/);
  });

  it("preserves nested arrays and primitives in a bundle", () => {
    const metadata = { tags: ["mill", "lathe"], flags: [true, false], counts: [[1, 2], [3, 4]] };
    const out = loadCheckpoint(JSON.stringify(saveCheckpoint(tinyModel(), { metadata })));
    assert.deepEqual(out.metadata, metadata);
  });

  it("strips __proto__ from a bundle on the LOAD path (the attacker-reachable surface)", () => {
    // saveCheckpoint produces a checkpoint; loadCheckpoint PARSES a possibly
    // hostile file — so the load path is the primary prototype-pollution guard.
    const cp = freshCheckpoint();
    cp.calibrator = JSON.parse('{"__proto__":{"pwnedOnLoad":1},"breakpoints":[0.5]}');
    const out = loadCheckpoint(JSON.stringify(cp));
    assert.equal(({}).pwnedOnLoad, undefined, "Object.prototype must not be polluted on load");
    assert.deepEqual(Object.keys(out.calibrator), ["breakpoints"], "__proto__ key must be dropped on load");
  });

  it("strips constructor and prototype keys, not only __proto__", () => {
    const metadata = { constructor: { evil: 1 }, prototype: { evil: 2 }, kept: "ok" };
    const cpSave = saveCheckpoint(tinyModel(), { metadata });
    assert.deepEqual(Object.keys(cpSave.metadata), ["kept"], "save must drop constructor/prototype");
    const cpLoad = freshCheckpoint();
    cpLoad.metadata = { constructor: { evil: 1 }, prototype: { evil: 2 }, kept: "ok" };
    const out = loadCheckpoint(JSON.stringify(cpLoad));
    assert.deepEqual(Object.keys(out.metadata), ["kept"], "load must drop constructor/prototype");
  });

  it("returns deep copies on LOAD — mutating the result cannot corrupt the input object", () => {
    const cp = freshCheckpoint();
    cp.calibrator = { breakpoints: [0.2, 0.8] };
    const out = loadCheckpoint(cp);
    out.calibrator.breakpoints.push(999);
    assert.deepEqual(cp.calibrator.breakpoints, [0.2, 0.8], "input checkpoint must be untouched");
  });

  it("throws on a bigint in a bundle (JSON cannot serialize it)", () => {
    assert.throws(() => saveCheckpoint(tinyModel(), { metadata: { big: 10n } }), /non-JSON-safe/);
  });
});

describe("schema constant", () => {
  it("SCHEMA_VERSION aliases CHECKPOINT_SCHEMA_VERSION", () => {
    assert.equal(SCHEMA_VERSION, CHECKPOINT_SCHEMA_VERSION);
    assert.equal(typeof CHECKPOINT_SCHEMA_VERSION, "number");
  });
});
