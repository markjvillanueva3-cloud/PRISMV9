#!/usr/bin/env node
/**
 * seed-ghost-gnn-classify.test.mjs — node:test suite for the GNN tier-5
 * dispatcher classifier (NN-GRAPH-MS0 / U-NNG-INFERENCE-FIFTH-TIER, U6).
 *
 * Real-value assertions only — no stubs. Covers: happy path, the failure modes
 * (disabled / no-checkpoint / no-references / embed mismatch / bad graph), the
 * adversarial inputs (__proto__ dispatcher labels, NaN confidence, duplicate
 * labels, label-less nodes), and the variability floor (>=3 distinct
 * dispatchers). The end-to-end paths use a REAL GraphSAGE model from
 * createModel — untrained but seeded, so the embeddings + votes are
 * deterministic and the voting mechanics are exercised for real.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  GNN_DEFAULTS,
  GHOST_KIND,
  DEFAULT_CHECKPOINT,
  isValidDispatcher,
  resolveGnnConfig,
  loadGnnCheckpoint,
  partitionGhosts,
  buildGhostSubgraph,
  voteDispatcher,
  fitIsotonic,
  applyIsotonic,
  fitDirectConfidenceCalibrator,
  classifyUnknownGhosts,
  gnnClassifyUnknowns,
  applyGnnClassifications,
  parseArgs,
  main,
} from "./seed-ghost-gnn-classify.mjs";
import { createModel } from "./lib/graphsage-model.mjs";
import { saveCheckpoint } from "./lib/graphsage-checkpoint.mjs";

// --- fixtures --------------------------------------------------------------

/** A realistic ghost.unwired-engine node, mirroring the live graph shape. */
function makeGhost(id, label, wiring, confidence, extra = {}) {
  return {
    id,
    label,
    kind: GHOST_KIND,
    layer: "L13",
    subgroup: "unwired-engine",
    tier: 2,
    size: 2,
    ghost: true,
    status: "proposed",
    proposed_wiring: wiring,
    ...(confidence !== undefined ? { confidence } : {}),
    enginePath: `mcp-server/src/engines/${label}.ts`,
    ...extra,
  };
}

/** A predictor handle wrapping a real (untrained, seeded) GraphSAGE model. */
function makePredictor({ inputDim = 8, seed = 7, calibrator = null } = {}) {
  return {
    model: createModel({ inputDim, hiddenDim: 12, embedDim: 8, seed }),
    calibrator,
    metadata: null,
  };
}

/** Graph with `unknownN` UNKNOWN targets + references across 3 dispatchers. */
function makeGraph({ unknownN = 2 } = {}) {
  const nodes = [];
  for (let i = 0; i < unknownN; i++) {
    nodes.push(makeGhost(`ghost.unwired.Tgt${i}`, `Tgt${i}Engine`, "UNKNOWN"));
  }
  // 6 high-confidence references spanning prism_cam / prism_calc / prism_turning
  const refSpec = [
    ["Cam1", "prism_cam", 0.85], ["Cam2", "prism_cam", 0.82],
    ["Calc1", "prism_calc", 0.88], ["Calc2", "prism_calc", 0.81],
    ["Turn1", "prism_turning", 0.86], ["Turn2", "prism_turning", 0.84],
  ];
  for (const [label, wiring, conf] of refSpec) {
    nodes.push(makeGhost(`ghost.unwired.${label}`, `${label}Engine`, wiring, conf));
  }
  // a non-ghost node + a low-confidence ghost — neither should become a reference
  nodes.push({ id: "eng.real", kind: "engine", label: "RealEngine" });
  nodes.push(makeGhost("ghost.unwired.Weak", "WeakEngine", "prism_dev", 0.4));
  return { nodes, edges: [] };
}

function tmpFile(name, content) {
  const p = path.join(os.tmpdir(), `nng-test-${process.pid}-${Date.now()}-${name}`);
  fs.writeFileSync(p, content);
  return p;
}

// --- isValidDispatcher -----------------------------------------------------

test("isValidDispatcher accepts canonical prism_* dispatcher names", () => {
  for (const d of ["prism_cam", "prism_calc", "prism_turning", "prism_5axis", "prism_skill_script"]) {
    assert.equal(isValidDispatcher(d), true, d);
  }
});

test("isValidDispatcher rejects prototype-pollution + non-dispatcher strings", () => {
  for (const bad of ["__proto__", "constructor", "prototype", "UNKNOWN", "", "prism_", "Prism_cam", "prism_Cam", "prism cam"]) {
    assert.equal(isValidDispatcher(bad), false, bad);
  }
});

test("isValidDispatcher rejects non-string inputs", () => {
  for (const bad of [null, undefined, 42, {}, [], true]) {
    assert.equal(isValidDispatcher(bad), false, String(bad));
  }
});

// --- resolveGnnConfig ------------------------------------------------------

test("resolveGnnConfig returns the documented defaults for an empty env", () => {
  const cfg = resolveGnnConfig({}, {});
  assert.equal(cfg.disabled, false);
  assert.equal(cfg.minConf, GNN_DEFAULTS.minConf);
  assert.equal(cfg.refMinConf, GNN_DEFAULTS.refMinConf);
  assert.equal(cfg.topK, GNN_DEFAULTS.topK);
  assert.equal(cfg.checkpointPath, DEFAULT_CHECKPOINT);
});

test("resolveGnnConfig honors PRISM_NNG_DISABLE=1", () => {
  assert.equal(resolveGnnConfig({ PRISM_NNG_DISABLE: "1" }, {}).disabled, true);
  assert.equal(resolveGnnConfig({ PRISM_NNG_DISABLE: "0" }, {}).disabled, false);
  assert.equal(resolveGnnConfig({}, { disabled: true }).disabled, true);
});

test("resolveGnnConfig reads env knobs and clamps confidences to [0,1]", () => {
  const cfg = resolveGnnConfig({ PRISM_NNG_MIN_CONF: "0.9", PRISM_NNG_TOPK: "30" }, {});
  assert.equal(cfg.minConf, 0.9);
  assert.equal(cfg.topK, 30);
  assert.equal(resolveGnnConfig({ PRISM_NNG_MIN_CONF: "5" }, {}).minConf, 1, "clamps high");
  assert.equal(resolveGnnConfig({ PRISM_NNG_MIN_CONF: "-2" }, {}).minConf, 0, "clamps low");
});

test("resolveGnnConfig falls back to defaults on garbage env values (never crashes)", () => {
  const cfg = resolveGnnConfig({ PRISM_NNG_MIN_CONF: "abc", PRISM_NNG_TOPK: "1.5", PRISM_NNG_REF_MIN_CONF: "" }, {});
  assert.equal(cfg.minConf, GNN_DEFAULTS.minConf);
  assert.equal(cfg.topK, GNN_DEFAULTS.topK, "non-integer topK rejected");
  assert.equal(cfg.refMinConf, GNN_DEFAULTS.refMinConf);
});

test("resolveGnnConfig overrides win over env", () => {
  const cfg = resolveGnnConfig({ PRISM_NNG_MIN_CONF: "0.6" }, { minConf: 0.95 });
  assert.equal(cfg.minConf, 0.95);
});

// --- loadGnnCheckpoint -----------------------------------------------------

test("loadGnnCheckpoint reports no-checkpoint for a missing file", () => {
  const r = loadGnnCheckpoint(path.join(os.tmpdir(), "definitely-not-here-xyz.json"));
  assert.equal(r.ok, false);
  assert.equal(r.reason, "no-checkpoint");
});

test("loadGnnCheckpoint reports checkpoint-load-failed for malformed JSON", () => {
  const p = tmpFile("bad.json", "{ this is not json");
  try {
    const r = loadGnnCheckpoint(p);
    assert.equal(r.ok, false);
    assert.match(r.reason, /^checkpoint-load-failed:/);
  } finally { fs.unlinkSync(p); }
});

test("loadGnnCheckpoint round-trips a real saved checkpoint", () => {
  const model = createModel({ inputDim: 8, hiddenDim: 12, embedDim: 8, seed: 3 });
  const p = tmpFile("ok.json", JSON.stringify(saveCheckpoint(model)));
  try {
    const r = loadGnnCheckpoint(p);
    assert.equal(r.ok, true);
    assert.ok(r.predictor && r.predictor.model && r.predictor.model.config);
    assert.equal(r.predictor.model.config.inputDim, 8);
  } finally { fs.unlinkSync(p); }
});

test("loadGnnCheckpoint honors an injected readFileImpl", () => {
  const model = createModel({ inputDim: 8, hiddenDim: 12, embedDim: 8, seed: 4 });
  const json = JSON.stringify(saveCheckpoint(model));
  const r = loadGnnCheckpoint("virtual/path.json", { readFileImpl: () => json });
  assert.equal(r.ok, true);
  assert.equal(r.predictor.model.config.embedDim, 8);
});

test("loadGnnCheckpoint surfaces a non-ENOENT read error distinctly", () => {
  const r = loadGnnCheckpoint("x", {
    readFileImpl: () => { const e = new Error("EACCES denied"); e.code = "EACCES"; throw e; },
  });
  assert.equal(r.ok, false);
  assert.match(r.reason, /^checkpoint-read-failed:/);
});

// --- partitionGhosts -------------------------------------------------------

test("partitionGhosts splits UNKNOWN targets from valid references", () => {
  const { targets, references } = partitionGhosts(makeGraph({ unknownN: 2 }), { refMinConf: 0.8 });
  assert.equal(targets.length, 2);
  assert.equal(references.length, 6, "6 high-conf refs; the 0.4 ghost + the engine node excluded");
  assert.ok(references.every((r) => isValidDispatcher(r.proposed_wiring)));
  assert.ok(references.every((r) => r.confidence >= 0.8));
});

test("partitionGhosts ignores non-ghost nodes entirely", () => {
  const graph = { nodes: [{ id: "x", kind: "engine", proposed_wiring: "prism_cam", confidence: 0.9 }], edges: [] };
  const { targets, references } = partitionGhosts(graph, { refMinConf: 0.8 });
  assert.equal(targets.length, 0);
  assert.equal(references.length, 0);
});

test("partitionGhosts excludes a reference with a __proto__ proposed_wiring", () => {
  const graph = {
    nodes: [
      makeGhost("g.t", "TEngine", "UNKNOWN"),
      makeGhost("g.evil", "EvilEngine", "__proto__", 0.95),
      makeGhost("g.ok", "OkEngine", "prism_cam", 0.9),
    ],
    edges: [],
  };
  const { references } = partitionGhosts(graph, { refMinConf: 0.8 });
  assert.deepEqual(references.map((r) => r.label), ["OkEngine"]);
});

test("partitionGhosts excludes a reference with NaN / missing confidence", () => {
  const graph = {
    nodes: [
      makeGhost("g.t", "TEngine", "UNKNOWN"),
      makeGhost("g.nan", "NanEngine", "prism_cam", NaN),
      makeGhost("g.missing", "MissingEngine", "prism_calc"), // no confidence field
      makeGhost("g.ok", "OkEngine", "prism_turning", 0.9),
    ],
    edges: [],
  };
  const { references } = partitionGhosts(graph, { refMinConf: 0.8 });
  assert.deepEqual(references.map((r) => r.label), ["OkEngine"]);
});

test("partitionGhosts with targetNames selects targets by label", () => {
  const graph = {
    nodes: [
      makeGhost("g.a", "AEngine", "prism_cam", 0.9),
      makeGhost("g.b", "BEngine", "prism_calc", 0.9),
    ],
    edges: [],
  };
  const { targets, references } = partitionGhosts(graph, {
    refMinConf: 0.8, targetNames: new Set(["AEngine"]),
  });
  assert.deepEqual(targets.map((t) => t.label), ["AEngine"]);
  assert.deepEqual(references.map((r) => r.label), ["BEngine"]);
});

test("partitionGhosts P0 regression — a duplicate-label ghost never becomes its target's reference", () => {
  const graph = {
    nodes: [
      makeGhost("g.foo", "FooEngine", "UNKNOWN"),
      makeGhost("g.foo.dup", "FooEngine", "prism_cam", 0.95), // same label, distinct id
      makeGhost("g.bar", "BarEngine", "prism_calc", 0.9),
    ],
    edges: [],
  };
  const { targets, references } = partitionGhosts(graph, {
    refMinConf: 0.8, targetNames: new Set(["FooEngine"]),
  });
  // both FooEngine nodes are targets; the only reference is BarEngine
  assert.equal(targets.length, 2);
  assert.deepEqual(references.map((r) => r.id), ["g.bar"]);
});

test("partitionGhosts tolerates a graph with no nodes array", () => {
  const r = partitionGhosts({}, { refMinConf: 0.8 });
  assert.deepEqual(r, { targets: [], references: [] });
});

// --- buildGhostSubgraph ----------------------------------------------------

test("buildGhostSubgraph unions targets + references and is always edgeless", () => {
  const t = [makeGhost("g.t", "T", "UNKNOWN")];
  const r = [makeGhost("g.r", "R", "prism_cam", 0.9)];
  const sub = buildGhostSubgraph(t, r);
  assert.equal(sub.nodes.length, 2);
  assert.deepEqual(sub.edges, []);
});

test("buildGhostSubgraph dedups by node id", () => {
  const shared = makeGhost("g.x", "X", "prism_cam", 0.9);
  const sub = buildGhostSubgraph([shared], [shared]);
  assert.equal(sub.nodes.length, 1);
});

test("buildGhostSubgraph tolerates empty / nullish inputs", () => {
  assert.deepEqual(buildGhostSubgraph(undefined, null), { nodes: [], edges: [] });
});

// --- voteDispatcher --------------------------------------------------------

const emb = (...xs) => new Float64Array(xs);

test("voteDispatcher picks the dispatcher of the nearest references", () => {
  const target = { id: "t", label: "TEngine" };
  const refs = [
    { id: "c1", label: "C1", proposed_wiring: "prism_cam", confidence: 0.9 },
    { id: "c2", label: "C2", proposed_wiring: "prism_cam", confidence: 0.9 },
    { id: "k1", label: "K1", proposed_wiring: "prism_calc", confidence: 0.9 },
  ];
  const embeddings = new Map([
    ["t", emb(1, 0)], ["c1", emb(1, 0)], ["c2", emb(1, 0)], ["k1", emb(-1, 0)],
  ]);
  const v = voteDispatcher(target, embeddings, refs, { topK: 5 });
  assert.equal(v.dispatcher, "prism_cam");
  assert.ok(v.voteShare > 0.5);
  assert.equal(v.k, 3);
});

test("voteDispatcher caps confidence at confidenceCap even on a unanimous vote", () => {
  const target = { id: "t", label: "T" };
  const refs = [
    { id: "c1", label: "C1", proposed_wiring: "prism_cam", confidence: 1 },
    { id: "c2", label: "C2", proposed_wiring: "prism_cam", confidence: 1 },
  ];
  const embeddings = new Map([["t", emb(1, 0)], ["c1", emb(1, 0)], ["c2", emb(1, 0)]]);
  const v = voteDispatcher(target, embeddings, refs, { topK: 5, confidenceCap: 0.8 });
  assert.equal(v.voteShare, 1, "unanimous");
  assert.equal(v.confidence, 0.8, "capped");
});

test("voteDispatcher topK actually bounds which references vote", () => {
  // 3 cam refs scored LOW, 2 calc refs scored HIGH. topK:2 => only calc votes.
  const target = { id: "t", label: "T" };
  const refs = [
    { id: "m1", label: "M1", proposed_wiring: "prism_cam", confidence: 0.9 },
    { id: "m2", label: "M2", proposed_wiring: "prism_cam", confidence: 0.9 },
    { id: "m3", label: "M3", proposed_wiring: "prism_cam", confidence: 0.9 },
    { id: "k1", label: "K1", proposed_wiring: "prism_calc", confidence: 0.9 },
    { id: "k2", label: "K2", proposed_wiring: "prism_calc", confidence: 0.9 },
  ];
  const embeddings = new Map([
    ["t", emb(1, 0)],
    ["m1", emb(-1, 0)], ["m2", emb(-1, 0)], ["m3", emb(-1, 0)],
    ["k1", emb(1, 0)], ["k2", emb(1, 0)],
  ]);
  const v = voteDispatcher(target, embeddings, refs, { topK: 2 });
  assert.equal(v.dispatcher, "prism_calc", "only the 2 highest-scoring refs voted");
  assert.equal(v.k, 2);
});

test("voteDispatcher excludes the target itself by id (self-vote guard)", () => {
  const target = { id: "t", label: "TEngine" };
  const refs = [{ id: "t", label: "TEngine", proposed_wiring: "prism_cam", confidence: 0.9 }];
  const embeddings = new Map([["t", emb(1, 0)]]);
  assert.equal(voteDispatcher(target, embeddings, refs, {}), null);
});

test("voteDispatcher excludes a duplicate-label distinct-id node (self-vote guard)", () => {
  const target = { id: "t", label: "Dup" };
  const refs = [{ id: "t2", label: "Dup", proposed_wiring: "prism_cam", confidence: 0.9 }];
  const embeddings = new Map([["t", emb(1, 0)], ["t2", emb(1, 0)]]);
  assert.equal(voteDispatcher(target, embeddings, refs, {}), null);
});

test("voteDispatcher P1 regression — two label-less nodes do not collide via undefined===undefined", () => {
  const target = { id: "t" }; // no label
  const refs = [
    { id: "r1", proposed_wiring: "prism_cam", confidence: 0.9 }, // no label
    { id: "r2", proposed_wiring: "prism_cam", confidence: 0.9 }, // no label
  ];
  const embeddings = new Map([["t", emb(1, 0)], ["r1", emb(1, 0)], ["r2", emb(1, 0)]]);
  const v = voteDispatcher(target, embeddings, refs, { topK: 5 });
  assert.ok(v, "label-less references must still be scored");
  assert.equal(v.k, 2, "both label-less refs counted");
});

test("voteDispatcher returns null when no reference can be scored", () => {
  const target = { id: "t", label: "T" };
  const refs = [{ id: "r", label: "R", proposed_wiring: "prism_cam", confidence: 0.9 }];
  assert.equal(voteDispatcher(target, new Map(), refs, {}), null, "empty embeddings");
  assert.equal(voteDispatcher(target, new Map([["t", emb(1, 0)]]), [], {}), null, "empty references");
});

test("voteDispatcher is deterministic across repeated calls", () => {
  const target = { id: "t", label: "T" };
  const refs = [
    { id: "a", label: "A", proposed_wiring: "prism_cam", confidence: 0.9 },
    { id: "b", label: "B", proposed_wiring: "prism_calc", confidence: 0.9 },
  ];
  const embeddings = new Map([["t", emb(0.5, 0.5)], ["a", emb(1, 0)], ["b", emb(0, 1)]]);
  const v1 = voteDispatcher(target, embeddings, refs, { topK: 5 });
  const v2 = voteDispatcher(target, embeddings, refs, { topK: 5 });
  assert.deepEqual(v1, v2);
});

// --- voteDispatcher: opt-in separabilityWeights hook (U-GNN-SEP-VOTE-WEIGHT) ---
// Shared fixture: target [1,0]; cam ref aligned (highest cosine) wins by default, calc ref off-axis.
const sepTarget = { id: "t", label: "T" };
const sepRefs = [
  { id: "cam", label: "C", proposed_wiring: "prism_cam", confidence: 1 },
  { id: "calc", label: "K", proposed_wiring: "prism_calc", confidence: 1 },
];
const sepEmb = new Map([["t", emb(1, 0)], ["cam", emb(1, 0)], ["calc", emb(0.6, 0.8)]]);

test("voteDispatcher -- separabilityWeights: boosting a class flips the winner", () => {
  const base = voteDispatcher(sepTarget, sepEmb, sepRefs, { baseRateDisabled: true });
  assert.equal(base.dispatcher, "prism_cam", "default: the higher-cosine class wins");
  // Boost calc 5x: any monotone link score f has 5*f(0.6) > f(1.0), so calc takes the ballot.
  const boosted = voteDispatcher(sepTarget, sepEmb, sepRefs, { baseRateDisabled: true, separabilityWeights: new Map([["prism_calc", 5]]) });
  assert.equal(boosted.dispatcher, "prism_calc", "boosting a separable class surfaces it over the default winner");
});

test("voteDispatcher -- separabilityWeights: absent / non-Map / empty are byte-identical to legacy", () => {
  const legacy = voteDispatcher(sepTarget, sepEmb, sepRefs, { baseRateDisabled: true });
  assert.deepEqual(voteDispatcher(sepTarget, sepEmb, sepRefs, { baseRateDisabled: true, separabilityWeights: undefined }), legacy, "absent");
  assert.deepEqual(voteDispatcher(sepTarget, sepEmb, sepRefs, { baseRateDisabled: true, separabilityWeights: {} }), legacy, "non-Map ignored");
  assert.deepEqual(voteDispatcher(sepTarget, sepEmb, sepRefs, { baseRateDisabled: true, separabilityWeights: new Map() }), legacy, "empty Map = factor 1 everywhere");
});

test("voteDispatcher -- separabilityWeights: a 0 factor damps a class; an all-zero map yields null", () => {
  // Zero the default winner -> calc takes the whole (transform-independent) ballot.
  const v = voteDispatcher(sepTarget, sepEmb, sepRefs, { baseRateDisabled: true, separabilityWeights: new Map([["prism_cam", 0]]) });
  assert.equal(v.dispatcher, "prism_calc");
  assert.equal(v.voteShare, 1, "the surviving class holds the entire normalized ballot");
  // Every class zeroed -> empty ballot -> null (never a fabricated winner).
  assert.equal(voteDispatcher(sepTarget, sepEmb, sepRefs, { baseRateDisabled: true, separabilityWeights: new Map([["prism_cam", 0], ["prism_calc", 0]]) }), null, "all-zero map -> null");
});

test("voteDispatcher -- separabilityWeights: a non-finite / negative factor is guarded to 1", () => {
  const legacy = voteDispatcher(sepTarget, sepEmb, sepRefs, { baseRateDisabled: true });
  for (const bad of [NaN, -5, Infinity]) {
    const v = voteDispatcher(sepTarget, sepEmb, sepRefs, { baseRateDisabled: true, separabilityWeights: new Map([["prism_calc", bad]]) });
    assert.equal(v.dispatcher, legacy.dispatcher, `factor ${bad} -> guarded to 1, winner unchanged`);
  }
});

// --- classifyUnknownGhosts -------------------------------------------------

test("classifyUnknownGhosts skips when disabled (hybrid is the floor)", () => {
  const r = classifyUnknownGhosts(makeGraph(), { env: { PRISM_NNG_DISABLE: "1" }, predictor: makePredictor() });
  assert.equal(r.skipped, true);
  assert.equal(r.reason, "disabled");
  assert.deepEqual(r.classifications, []);
});

test("classifyUnknownGhosts skips when no checkpoint exists", () => {
  const r = classifyUnknownGhosts(makeGraph(), {
    env: {}, checkpoint: path.join(os.tmpdir(), "no-such-checkpoint-abc.json"),
  });
  assert.equal(r.skipped, true);
  assert.equal(r.reason, "no-checkpoint");
});

test("classifyUnknownGhosts skips with no-references when references are absent", () => {
  const graph = { nodes: [makeGhost("g.t", "TEngine", "UNKNOWN")], edges: [] };
  const r = classifyUnknownGhosts(graph, { env: {}, predictor: makePredictor() });
  assert.equal(r.skipped, true);
  assert.equal(r.reason, "no-references");
});

test("classifyUnknownGhosts standalone no-UNKNOWN returns skipped:false reason:no-targets", () => {
  const graph = { nodes: [makeGhost("g.r", "REngine", "prism_cam", 0.9)], edges: [] };
  const r = classifyUnknownGhosts(graph, { env: {}, predictor: makePredictor() });
  assert.equal(r.skipped, false, "standalone empty-UNKNOWN is a benign no-op");
  assert.equal(r.reason, "no-targets");
});

test("classifyUnknownGhosts scoped + zero-match returns skipped:true reason:no-targets-matched", () => {
  const r = classifyUnknownGhosts(makeGraph(), {
    env: {}, predictor: makePredictor(), targetNames: new Set(["NoSuchEngine"]),
  });
  assert.equal(r.skipped, true, "a gate-path label mismatch must surface as a skip");
  assert.equal(r.reason, "no-targets-matched");
});

test("classifyUnknownGhosts skips embed-failed when the checkpoint feature dim mismatches", () => {
  const r = classifyUnknownGhosts(makeGraph(), {
    env: {}, predictor: makePredictor({ inputDim: 16 }), // projector dim is 8
  });
  assert.equal(r.skipped, true);
  assert.match(r.reason, /^embed-failed:/);
});

// U-NN-PREDICTOR-EMBED-WIRE follow-up (2026-05-24, slot papa): the
// 768-d-checkpoint regression that defeated tier-5 promotion was that a
// model trained on a non-projected feature source had its inputDim baked into
// the checkpoint, but the seed-ghost classifier called embedGraph WITHOUT
// passing the source forward — so the predictor fell back to the 8-d projected
// features and the inputDim guard threw. The fix forwards predictor.metadata
// .embeddingSource so the predictor uses the SAME layout the trainer did.
test("classifyUnknownGhosts forwards predictor.metadata.embeddingSource to embedGraph (U-NN-PREDICTOR-EMBED-WIRE)", () => {
  // Build a tiny embedding-source JSONL the predictor will pick up. Header
  // line declares dim, body rows quantize int8 vectors. Predictor's
  // loadEmbeddingFeatures expects rows keyed by node id `n`.
  const FAKE_DIM = 4; // small enough to keep the test fast + obviously not 8
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), "embedwire-"));
  const embedPath = path.join(tmpdir, "embeddings.jsonl");
  const lines = [JSON.stringify({ __meta: true, dim: FAKE_DIM })];
  const graph = makeGraph({ unknownN: 1 });
  for (const node of graph.nodes) {
    // Deterministic int8 quantization of a constant vector so every node gets
    // a non-zero embedding (predictor sets miss when the row is absent).
    lines.push(JSON.stringify({ n: node.id, q: new Array(FAKE_DIM).fill(7) }));
  }
  fs.writeFileSync(embedPath, lines.join("\n") + "\n", "utf8");

  // Predictor whose model was "trained" on FAKE_DIM features + whose metadata
  // names the source. Without the fix, embedGraph would default to projected
  // 8-d features and throw the inputDim guard.
  const predictor = {
    model: createModel({ inputDim: FAKE_DIM, hiddenDim: 12, embedDim: 8, seed: 7 }),
    calibrator: null,
    metadata: { embeddingSource: embedPath },
  };
  const r = classifyUnknownGhosts(graph, { env: {}, predictor, minConf: 0 });
  assert.equal(r.skipped, false, "with embeddingSource forwarded, eval must not skip");
  assert.equal(r.classifications.length, 1, "the 1 UNKNOWN target should be classified");
  for (const c of r.classifications) {
    assert.ok(isValidDispatcher(c.dispatcher), c.dispatcher);
    assert.match(c.reason, /GNN tier-5/);
  }

  // Regression preserved: when metadata.embeddingSource is absent, the same
  // 768-d-style mismatch must still embed-fail (not silently pass).
  const blindPredictor = {
    model: createModel({ inputDim: FAKE_DIM, hiddenDim: 12, embedDim: 8, seed: 7 }),
    calibrator: null,
    metadata: null,
  };
  const rBlind = classifyUnknownGhosts(graph, { env: {}, predictor: blindPredictor });
  assert.equal(rBlind.skipped, true, "without source, mismatch must still surface");
  assert.match(rBlind.reason, /^embed-failed:/);

  fs.rmSync(tmpdir, { recursive: true, force: true });
});

test("classifyUnknownGhosts opts.embeddingSource overrides predictor.metadata.embeddingSource (test seam)", () => {
  const FAKE_DIM = 4;
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), "embedwire-override-"));
  const goodPath = path.join(tmpdir, "good.jsonl");
  const badPath = "/nonexistent/path/bad.jsonl";
  const lines = [JSON.stringify({ __meta: true, dim: FAKE_DIM })];
  const graph = makeGraph({ unknownN: 1 });
  for (const node of graph.nodes) {
    lines.push(JSON.stringify({ n: node.id, q: new Array(FAKE_DIM).fill(5) }));
  }
  fs.writeFileSync(goodPath, lines.join("\n") + "\n", "utf8");

  const predictor = {
    model: createModel({ inputDim: FAKE_DIM, hiddenDim: 12, embedDim: 8, seed: 7 }),
    calibrator: null,
    metadata: { embeddingSource: badPath }, // would fail
  };
  // Caller override wins — the bad metadata path is ignored.
  const r = classifyUnknownGhosts(graph, {
    env: {}, predictor, minConf: 0, embeddingSource: goodPath,
  });
  assert.equal(r.skipped, false, "caller-override embeddingSource must win over metadata");
  fs.rmSync(tmpdir, { recursive: true, force: true });
});

test("classifyUnknownGhosts classifies UNKNOWN targets with a valid predictor", () => {
  const r = classifyUnknownGhosts(makeGraph({ unknownN: 2 }), {
    env: {}, predictor: makePredictor(), minConf: 0, // gate open — assert mechanics
  });
  assert.equal(r.skipped, false);
  assert.equal(r.classifications.length, 2);
  for (const c of r.classifications) {
    assert.ok(typeof c.engine === "string" && c.engine.length > 0);
    assert.ok(isValidDispatcher(c.dispatcher), c.dispatcher);
    assert.ok(c.confidence >= 0 && c.confidence <= GNN_DEFAULTS.confidenceCap);
    assert.match(c.reason, /GNN tier-5/);
  }
  assert.equal(r.stats.targets, 2);
  assert.equal(r.stats.references, 6);
});

test("classifyUnknownGhosts only emits a winner drawn from the reference dispatcher set", () => {
  const r = classifyUnknownGhosts(makeGraph(), { env: {}, predictor: makePredictor(), minConf: 0 });
  const allowed = new Set(["prism_cam", "prism_calc", "prism_turning"]);
  for (const c of r.classifications) assert.ok(allowed.has(c.dispatcher), c.dispatcher);
});

test("classifyUnknownGhosts minConf gate filters out low-confidence votes", () => {
  const r = classifyUnknownGhosts(makeGraph(), { env: {}, predictor: makePredictor(), minConf: 0.999 });
  assert.equal(r.skipped, false);
  assert.equal(r.classifications.length, 0, "an impossibly-high gate clears nothing");
  assert.equal(r.reason, "below-threshold");
});

test("classifyUnknownGhosts --limit bounds the target set (work + stats)", () => {
  const r = classifyUnknownGhosts(makeGraph({ unknownN: 5 }), {
    env: {}, predictor: makePredictor(), minConf: 0, limit: 2,
  });
  assert.equal(r.stats.targets, 2, "limit caps targets, not just output");
  assert.ok(r.classifications.length <= 2);
});

test("classifyUnknownGhosts is deterministic for a fixed graph + predictor", () => {
  const a = classifyUnknownGhosts(makeGraph(), { env: {}, predictor: makePredictor({ seed: 11 }), minConf: 0 });
  const b = classifyUnknownGhosts(makeGraph(), { env: {}, predictor: makePredictor({ seed: 11 }), minConf: 0 });
  assert.deepEqual(a.classifications, b.classifications);
});

test("classifyUnknownGhosts works with a calibrated predictor (variability — calibrator present)", () => {
  const calibrator = { breakpoints: [{ x: 0, y: 0 }, { x: 1, y: 1 }] };
  const r = classifyUnknownGhosts(makeGraph(), {
    env: {}, predictor: makePredictor({ calibrator }), minConf: 0,
  });
  assert.equal(r.skipped, false);
  assert.equal(r.stats.calibrated, true);
});

test("classifyUnknownGhosts handles an empty graph", () => {
  const r = classifyUnknownGhosts({ nodes: [], edges: [] }, { env: {}, predictor: makePredictor() });
  assert.equal(r.skipped, false);
  assert.equal(r.reason, "no-targets");
});

// --- gnnClassifyUnknowns (gate entry point) --------------------------------

test("gnnClassifyUnknowns returns no-unknowns for an empty list", () => {
  const r = gnnClassifyUnknowns([], {});
  assert.equal(r.reason, "no-unknowns");
  assert.deepEqual(r.classifications, []);
  assert.equal(r.skipped, false);
});

test("gnnClassifyUnknowns degrades to skipped on a graph-load failure", () => {
  const r = gnnClassifyUnknowns([{ id: "x", name: "XEngine" }], {
    graphPath: path.join(os.tmpdir(), "no-graph-here-xyz.json"),
  });
  assert.equal(r.skipped, true);
  assert.match(r.reason, /^graph-load-failed:/);
});

test("gnnClassifyUnknowns classifies exactly the named unknowns from a graph file", () => {
  const graph = makeGraph({ unknownN: 3 });
  const gp = tmpFile("graph.json", JSON.stringify(graph));
  try {
    const unknowns = [{ id: "ghost.unwired.Tgt0", name: "Tgt0Engine" }];
    const r = gnnClassifyUnknowns(unknowns, { graphPath: gp, predictor: makePredictor(), minConf: 0 });
    assert.equal(r.skipped, false);
    assert.equal(r.stats.targets, 1, "scoped to just the one named unknown");
    assert.ok(r.classifications.every((c) => c.engine === "Tgt0Engine"));
  } finally { fs.unlinkSync(gp); }
});

test("gnnClassifyUnknowns is read-only — it never mutates the graph file", () => {
  const graph = makeGraph({ unknownN: 2 });
  const gp = tmpFile("graph-ro.json", JSON.stringify(graph));
  try {
    const before = fs.readFileSync(gp, "utf8");
    gnnClassifyUnknowns([{ id: "ghost.unwired.Tgt0", name: "Tgt0Engine" }],
      { graphPath: gp, predictor: makePredictor(), minConf: 0 });
    assert.equal(fs.readFileSync(gp, "utf8"), before, "graph file unchanged");
  } finally { fs.unlinkSync(gp); }
});

// --- applyGnnClassifications -----------------------------------------------

test("applyGnnClassifications updates a ghost node + appends a proposed-wire edge", () => {
  const graph = { nodes: [makeGhost("g.x", "XEngine", "UNKNOWN")], edges: [] };
  const res = applyGnnClassifications(graph, [
    { engine: "XEngine", dispatcher: "prism_cam", confidence: 0.78, reason: "GNN tier-5 test" },
  ]);
  assert.equal(res.nodesUpdated, 1);
  assert.equal(res.edgesAdded, 1);
  const node = graph.nodes[0];
  assert.equal(node.proposed_wiring, "prism_cam");
  assert.equal(node.confidence, 0.78);
  assert.equal(node.reason, "GNN tier-5 test");
  assert.match(node.info, /prism_cam/);
  // U-VIZ-G4-DEAD-EDGE (2026-05-30 sierra): canonical disp node id, not the dead
  // dispatcher.prism_cam — prism_cam resolves to the file-derived camdispatcher.
  assert.deepEqual(graph.edges[0], {
    from: "g.x", to: "disp.camdispatcher", type: "ghost-wire",
    relation: "proposed-wire", status: "proposed", intensity: 0.78,
  });
});

test("applyGnnClassifications does not duplicate an existing edge", () => {
  const graph = {
    nodes: [makeGhost("g.x", "XEngine", "UNKNOWN")],
    // Pre-seed the canonical target so the dedup guard is exercised correctly.
    edges: [{ from: "g.x", to: "disp.camdispatcher", type: "ghost-wire" }],
  };
  const res = applyGnnClassifications(graph, [
    { engine: "XEngine", dispatcher: "prism_cam", confidence: 0.8, reason: "r" },
  ]);
  assert.equal(res.nodesUpdated, 1);
  assert.equal(res.edgesAdded, 0, "edge already present");
  assert.equal(graph.edges.length, 1);
});

test("applyGnnClassifications P1 regression — rejects an invalid / __proto__ dispatcher", () => {
  const graph = { nodes: [makeGhost("g.x", "XEngine", "UNKNOWN")], edges: [] };
  const res = applyGnnClassifications(graph, [
    { engine: "XEngine", dispatcher: "__proto__", confidence: 0.9, reason: "r" },
  ]);
  assert.equal(res.nodesUpdated, 0, "an unvalidated dispatcher must never be written");
  assert.equal(graph.nodes[0].proposed_wiring, "UNKNOWN", "node untouched");
});

test("applyGnnClassifications rejects a classification with non-finite confidence", () => {
  const graph = { nodes: [makeGhost("g.x", "XEngine", "UNKNOWN")], edges: [] };
  const res = applyGnnClassifications(graph, [
    { engine: "XEngine", dispatcher: "prism_cam", confidence: NaN, reason: "r" },
  ]);
  assert.equal(res.nodesUpdated, 0);
});

test("applyGnnClassifications skips a classification whose engine is not in the graph", () => {
  const graph = { nodes: [makeGhost("g.x", "XEngine", "UNKNOWN")], edges: [] };
  const res = applyGnnClassifications(graph, [
    { engine: "GhostNotHere", dispatcher: "prism_cam", confidence: 0.8, reason: "r" },
  ]);
  assert.equal(res.nodesUpdated, 0);
  assert.equal(res.edgesAdded, 0);
});

// --- parseArgs / main ------------------------------------------------------

test("parseArgs defaults to dry-run when neither flag is given", () => {
  const a = parseArgs([]);
  assert.equal(a.dryRun, true);
  assert.equal(a.apply, false);
  assert.equal(a.limit, Infinity);
});

test("parseArgs reads --apply, --limit, --checkpoint, --min-conf", () => {
  const a = parseArgs(["--apply", "--limit", "25", "--checkpoint", "c.json", "--min-conf", "0.8"]);
  assert.equal(a.apply, true);
  assert.equal(a.limit, 25);
  assert.equal(a.checkpoint, "c.json");
  assert.equal(a.minConf, 0.8);
});

test("parseArgs throws on an unknown argument", () => {
  assert.throws(() => parseArgs(["--bogus"]), /unknown argument/);
});

test("parseArgs sets help and rejects a garbage --limit gracefully", () => {
  assert.equal(parseArgs(["--help"]).help, true);
  assert.equal(parseArgs(["--limit", "abc"]).limit, Infinity, "garbage limit => no limit");
});

test("main returns 0 for --help and 2 for an unknown argument", () => {
  assert.equal(main(["--help"]), 0);
  assert.equal(main(["--nope"]), 2);
});

// GNN-F0/2d: direct-embed path (raw nomic cosine k-NN, bypasses the model).
import { loadDirectEmbeddings } from "./seed-ghost-gnn-classify.mjs";
test("loadDirectEmbeddings dequantizes q*s and filters by neededIds (fail-soft on missing)", () => {
  const file = '{"__meta":true}\n' +
    JSON.stringify({ id: "a", q: [127, 0], s: 0.5 }) + "\n" +
    JSON.stringify({ id: "b", q: [0, 127], s: 0.25 }) + "\n";
  const m = loadDirectEmbeddings("x", new Set(["a"]), { readFileImpl: () => file });
  assert.deepEqual(m.get("a"), [63.5, 0], "a dequantized to q*s");
  assert.equal(m.has("b"), false, "b filtered out by neededIds");
  const all = loadDirectEmbeddings("x", null, { readFileImpl: () => file });
  assert.equal(all.size, 2, "null neededIds → all records");
  assert.equal(loadDirectEmbeddings("x", null, { readFileImpl: () => { throw new Error("ENOENT"); } }).size, 0, "missing file → empty (fail-soft)");
});

test("direct-embed breaks the constant-vote: distinct targets get distinct dispatchers", () => {
  const g = (id, label, pw) => ({ id, label, kind: "ghost.unwired-engine", proposed_wiring: pw, confidence: 0.9 });
  const graph = { nodes: [
    g("c1", "C1", "prism_cam"), g("c2", "C2", "prism_cam"),
    g("k1", "K1", "prism_calc"), g("k2", "K2", "prism_calc"),
    g("t1", "T1", "prism_cam"), g("t2", "T2", "prism_calc"), // truth labels (held out as targets)
  ], edges: [] };
  // Embeddings: UNIT vectors (like real nomic q*s) so sigmoid(dot) stays in its
  // discriminating range — T1 near the cam axis, T2 near the calc axis. (Magnitude-
  // 127 vectors would saturate sigmoid to 1.0 and erase the ranking — a test bug,
  // not a code bug: real nomic vectors are L2-unit.)
  const emb = [
    { id: "c1", q: [1, 0], s: 1 }, { id: "c2", q: [0.98, 0.2], s: 1 },
    { id: "k1", q: [0, 1], s: 1 }, { id: "k2", q: [0.2, 0.98], s: 1 },
    { id: "t1", q: [0.97, 0.24], s: 1 }, { id: "t2", q: [0.24, 0.97], s: 1 },
  ].map((r) => JSON.stringify(r)).join("\n");
  const res = classifyUnknownGhosts(graph, {
    directEmbed: true,
    readFileImpl: () => emb,
    targetNames: new Set(["T1", "T2"]),
    minConf: 0,
    env: {},
  });
  assert.equal(res.skipped, false, "direct-embed ran without a checkpoint");
  assert.equal(res.stats.mode, "direct-embed");
  const byEngine = new Map(res.classifications.map((c) => [c.engine, c.dispatcher]));
  assert.equal(byEngine.get("T1"), "prism_cam", "T1 (near cam) → prism_cam");
  assert.equal(byEngine.get("T2"), "prism_calc", "T2 (near calc) → prism_calc");
  // The crux: NOT a constant vote — two targets, two different dispatchers.
  assert.equal(new Set([...byEngine.values()]).size, 2, "distinct predictions (degeneracy broken)");
});

// GNN-F0: leak-free confidence calibration (isotonic + leave-one-out). Richer
// source-signal embeddings lifted the argmax but left voteShare UNDERconfident
// (Brier/AUROC regressed); this realigns confidence to empirical P(correct).
test("fitIsotonic: null on empty/invalid input", () => {
  assert.equal(fitIsotonic([]), null);
  assert.equal(fitIsotonic(null), null);
  assert.equal(fitIsotonic([{ x: NaN, y: 1 }, { x: 1, y: Infinity }]), null);
});

test("fitIsotonic: PAV produces a non-decreasing fit (pools violators)", () => {
  const m = fitIsotonic([{ x: 0.1, y: 0 }, { x: 0.2, y: 1 }, { x: 0.3, y: 0 }, { x: 0.4, y: 1 }, { x: 0.5, y: 1 }]);
  assert.ok(m && m.ys.length > 0);
  for (let i = 1; i < m.ys.length; i++) assert.ok(m.ys[i] >= m.ys[i - 1] - 1e-9, "ys non-decreasing");
});

test("fitIsotonic: single point → constant map", () => {
  const m = fitIsotonic([{ x: 0.5, y: 1 }]);
  assert.equal(applyIsotonic(m, 0.1), 1);
  assert.equal(applyIsotonic(m, 0.9), 1);
});

test("applyIsotonic: null model is identity; interpolates; flat-extrapolates", () => {
  assert.equal(applyIsotonic(null, 0.42), 0.42, "null model → identity (fail-soft)");
  const m = { xs: [0.2, 0.8], ys: [0.0, 1.0] };
  assert.ok(Math.abs(applyIsotonic(m, 0.5) - 0.5) < 1e-9, "midpoint interpolation");
  assert.equal(applyIsotonic(m, 0.0), 0.0, "below range → first y");
  assert.equal(applyIsotonic(m, 1.0), 1.0, "above range → last y");
});

test("fitDirectConfidenceCalibrator: null on a tiny pool (fail-soft)", () => {
  assert.equal(fitDirectConfidenceCalibrator([], new Map()), null);
  assert.equal(fitDirectConfidenceCalibrator([{ id: "a" }, { id: "b" }], new Map()), null, "<3 refs");
});

test("fitDirectConfidenceCalibrator: fits a leak-free LOO map from references only", () => {
  // 12 references in two clean clusters (cam on x-axis, calc on y-axis) → ≥10 LOO votes.
  const refs = [];
  const emb = new Map();
  for (let i = 0; i < 6; i++) { const id = `c${i}`; refs.push({ id, label: id, proposed_wiring: "prism_cam", confidence: 0.9 }); emb.set(id, [1, i * 0.01, 0, 0]); }
  for (let i = 0; i < 6; i++) { const id = `k${i}`; refs.push({ id, label: id, proposed_wiring: "prism_calc", confidence: 0.9 }); emb.set(id, [i * 0.01, 1, 0, 0]); }
  const m = fitDirectConfidenceCalibrator(refs, emb, {});
  assert.ok(m && Array.isArray(m.xs) && m.xs.length > 0, "fits a model from the reference pool");
  const p = applyIsotonic(m, 0.5);
  assert.ok(p >= 0 && p <= 1, "calibrated output is a valid probability");
});

test("fitDirectConfidenceCalibrator: a MIXED-correctness pool stays a valid monotone map (non-degenerate)", () => {
  // Clean cam/calc clusters PLUS 'confusable' refs on the 45° line whose LOO votes
  // are sometimes wrong → the fit is NOT the trivial constant-1 map of clean data.
  const refs = [];
  const emb = new Map();
  const add = (id, pw, v) => { refs.push({ id, label: id, proposed_wiring: pw, confidence: 0.9 }); emb.set(id, v); };
  for (let i = 0; i < 5; i++) add(`c${i}`, "prism_cam", [1, 0.02 * i, 0, 0]);
  for (let i = 0; i < 5; i++) add(`k${i}`, "prism_calc", [0.02 * i, 1, 0, 0]);
  for (let i = 0; i < 4; i++) add(`x${i}`, i % 2 ? "prism_cam" : "prism_calc", [0.7, 0.7, 0, 0]);
  const m = fitDirectConfidenceCalibrator(refs, emb, {});
  assert.ok(m && m.xs.length > 0, "fits a model from the mixed pool");
  for (const y of m.ys) assert.ok(y >= 0 && y <= 1, "all calibrated values are valid probabilities");
  for (let i = 1; i < m.ys.length; i++) assert.ok(m.ys[i] >= m.ys[i - 1] - 1e-9, "calibrated map is monotone non-decreasing");
  for (const x of [0, 0.25, 0.5, 0.75, 1]) { const p = applyIsotonic(m, x); assert.ok(p >= 0 && p <= 1, `applyIsotonic(${x}) in range`); }
});

test("calibration preserves the argmax (only confidence moves) and plumbs the flag", () => {
  const g = (id, label, pw) => ({ id, label, kind: "ghost.unwired-engine", proposed_wiring: pw, confidence: 0.9 });
  const nodes = [];
  const recs = [];
  for (let i = 0; i < 6; i++) { nodes.push(g(`c${i}`, `C${i}`, "prism_cam")); recs.push({ id: `c${i}`, q: [1, i * 0.01], s: 1 }); }
  for (let i = 0; i < 6; i++) { nodes.push(g(`k${i}`, `K${i}`, "prism_calc")); recs.push({ id: `k${i}`, q: [i * 0.01, 1], s: 1 }); }
  nodes.push(g("t1", "T1", "prism_cam")); recs.push({ id: "t1", q: [0.97, 0.2], s: 1 });
  nodes.push(g("t2", "T2", "prism_calc")); recs.push({ id: "t2", q: [0.2, 0.97], s: 1 });
  const graph = { nodes, edges: [] };
  const emb = recs.map((r) => JSON.stringify(r)).join("\n");
  const run = (cal) => classifyUnknownGhosts(graph, { directEmbed: true, calibrateDirect: cal, readFileImpl: () => emb, targetNames: new Set(["T1", "T2"]), minConf: 0, env: {} });
  const on = run(true);
  const off = run(false);
  assert.equal(on.stats.confidenceCalibrated, true, "calibrated run sets the flag");
  assert.equal(off.stats.confidenceCalibrated, false, "uncalibrated run clears the flag");
  const dispOn = on.classifications.map((c) => [c.engine, c.dispatcher]).sort();
  const dispOff = off.classifications.map((c) => [c.engine, c.dispatcher]).sort();
  assert.deepEqual(dispOn, dispOff, "argmax identical with/without calibration (calibration must not change predictions)");
});
