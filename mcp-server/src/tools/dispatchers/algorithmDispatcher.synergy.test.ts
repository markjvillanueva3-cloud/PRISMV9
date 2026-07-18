/**
 * algorithmDispatcher — synergy test for the 3 new ALGO-SYNERGY-MS0 actions:
 *   opt_lbfgsb        (U-ALGO-MAT-01)
 *   opt_hypervolume   (U-ALGO-MAT-10)
 *   graph_pagerank    (U-ALGO-RET-04)
 *
 * Tests bypass the MCP-server registration boilerplate and exercise the
 * algorithm modules directly through the same import paths the dispatcher
 * uses — proving the algorithms are reachable from /system-viz + prism-app
 * domain features via `prism_algorithm`.
 *
 * @module dispatchers/algorithmDispatcher.synergy.test
 */

import { describe, it, expect } from "vitest";
import { LBFGSBOptimizer } from "../../algorithms/LBFGSBOptimizer.js";
import { HypervolumeIndicator } from "../../algorithms/HypervolumeIndicator.js";
import { PersonalizedPageRank } from "../../algorithms/PersonalizedPageRank.js";
import { HeterophilyAwareAggregator } from "../../algorithms/HeterophilyAwareAggregator.js";
import { ALGORITHM_ACTIONS } from "./algorithmDispatcher.js";

describe("algorithmDispatcher — opt_lbfgsb reachability", () => {
  it("dispatcher path imports LBFGSBOptimizer and produces a valid result", () => {
    const out = LBFGSBOptimizer.calculate({
      fun: (x) => ({ f: x[0] * x[0], g: [2 * x[0]] }),
      x0: [5],
      maxIter: 100,
    });
    expect(out.status).toMatch(/^converged_/);
    expect(out.x[0]).toBeCloseTo(0, 4);
    expect(out.f).toBeLessThan(1e-8);
  });
});

describe("algorithmDispatcher — opt_hypervolume reachability", () => {
  it("dispatcher path imports HypervolumeIndicator and computes HV", () => {
    const out = HypervolumeIndicator.calculate({
      points: [[1, 2], [2, 1]],
      reference: [3, 3],
    });
    expect(out.hypervolume).toBeCloseTo(3, 10);
    expect(out.algorithm).toBe("2d_sweep");
    expect(out.non_dominated_count).toBe(2);
  });
});

describe("algorithmDispatcher — graph_pagerank reachability", () => {
  it("dispatcher path imports PersonalizedPageRank and computes ranks", () => {
    const out = PersonalizedPageRank.calculate({
      graph: {
        nodes: ["a", "b", "c"],
        edges: [
          { from: "a", to: "b" },
          { from: "b", to: "c" },
          { from: "c", to: "a" },
        ],
      },
      seed: ["a"],
    });
    expect(out.status).toBe("converged");
    expect(out.scores.a).toBeGreaterThan(0);
    expect(out.scores.b).toBeGreaterThan(0);
    expect(out.scores.c).toBeGreaterThan(0);
    const total = out.scores.a + out.scores.b + out.scores.c;
    expect(total).toBeCloseTo(1, 6);
  });

  it("supports weighted edges and Record-style seed", () => {
    const out = PersonalizedPageRank.calculate({
      graph: {
        nodes: ["x", "y", "z"],
        edges: [
          { from: "x", to: "y", weight: 3 },
          { from: "x", to: "z", weight: 1 },
          { from: "y", to: "x" },
          { from: "z", to: "x" },
        ],
      },
      seed: { x: 1 },
    });
    // y receives 3x the outflow from x → outranks z.
    expect(out.scores.y).toBeGreaterThan(out.scores.z);
  });
});

describe("algorithmDispatcher — graph_heterophily_aggregate reachability (2026-05-29 slot:tango)", () => {
  // Closes the MS1 false-green gap: a mock MCP server bypasses the z.enum(ACTIONS)
  // gate, so the action MUST be asserted present in the real exported enum.
  it("action is registered in the real z.enum(ACTIONS) — not just the case block", () => {
    expect(ALGORITHM_ACTIONS).toContain("graph_heterophily_aggregate");
  });

  it("dispatcher path imports HeterophilyAwareAggregator and produces a valid embedding", () => {
    // Path graph 0-1-2 — same shape the dispatcher would receive via params.
    const out = HeterophilyAwareAggregator.calculate({
      features: [[1, 0], [0, 1], [2, 2]],
      edges: [[0, 1], [1, 2]],
      maxHops: 2,
    });
    expect(out.embeddingDim).toBe(6); // d*(1+maxHops)
    // node0: ego[1,0] | hop1 mean{n1=[0,1]} | hop2 mean{n2=[2,2]}
    expect(out.embeddings[0]).toEqual([1, 0, 0, 1, 2, 2]);
    expect(out.isolatedNodes).toEqual([]);
  });

  it("validate-then-calculate gate rejects malformed params the dispatcher would pass", () => {
    const v = HeterophilyAwareAggregator.validate({ features: [[1, 2]], edges: [[0, 9]] });
    expect(v.valid).toBe(false); // edge index out of range — dispatcher returns err() not a crash
  });
});

describe("algorithmDispatcher — ml_* group: 5 newly-wired Algorithm<I,O> classes (2026-05-29 slot:tango)", () => {
  const NEW_ML = [
    "ml_neural_infer",
    "ml_regression",
    "ml_decision_tree",
    "ml_clustering",
    "ml_ensemble_predict",
  ] as const;

  it("all 5 ml_* actions are in the real z.enum(ACTIONS) — closes the MS1 mock-bypass gap", () => {
    for (const a of NEW_ML) expect(ALGORITHM_ACTIONS).toContain(a);
  });

  it("each wired class is importable, instantiable, and exposes the Algorithm<I,O> contract", async () => {
    const mods = await Promise.all([
      import("../../algorithms/NeuralInference.js"),
      import("../../algorithms/RegressionEngine.js"),
      import("../../algorithms/DecisionTreeClassifier.js"),
      import("../../algorithms/ClusteringEngine.js"),
      import("../../algorithms/EnsemblePredictorModel.js"),
    ]);
    const ctors = [
      mods[0].NeuralInference,
      mods[1].RegressionEngine,
      mods[2].DecisionTreeClassifier,
      mods[3].ClusteringEngine,
      mods[4].EnsemblePredictorModel,
    ];
    for (const Ctor of ctors) {
      const inst = new Ctor();
      expect(typeof inst.validate).toBe("function");
      expect(typeof inst.calculate).toBe("function");
      expect(typeof inst.getMetadata).toBe("function");
      // validate must be a guard (returns {valid:boolean}) so the dispatcher can err() not crash.
      const v = inst.validate({} as Parameters<typeof inst.calculate>[0]);
      expect(typeof v.valid).toBe("boolean");
    }
  });
});

describe("algorithmDispatcher — ml_* clustering primitives (2026-05-29 slot:tango)", () => {
  it("ml_dbscan + ml_kmedoids actions are in the real z.enum(ACTIONS)", () => {
    expect(ALGORITHM_ACTIONS).toContain("ml_dbscan");
    expect(ALGORITHM_ACTIONS).toContain("ml_kmedoids");
  });

  it("DBSCAN groups two dense clusters + flags noise (real reachability)", async () => {
    const { DBSCANAlgorithm } = await import("../../algorithms/DBSCANAlgorithm.js");
    // two tight clusters near (0,0) and (10,10) + one far outlier
    const pts = [[0, 0], [0.1, 0], [0, 0.1], [10, 10], [10.1, 10], [10, 10.1], [50, 50]];
    const labels = DBSCANAlgorithm.cluster(pts, 1, 2);
    expect(labels).toHaveLength(7);
    expect(labels[6]).toBe(0); // far outlier = noise
    expect(labels[0]).toBe(labels[1]); // same cluster
    expect(labels[0]).not.toBe(labels[3]); // different clusters
  });

  it("KMedoids partitions into k groups (deterministic via seeded rng)", async () => {
    const { KMedoidsAlgorithm } = await import("../../algorithms/KMedoidsAlgorithm.js");
    let s = 42;
    const rng = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    const pts = [[0, 0], [0, 1], [10, 10], [10, 11]];
    const res = KMedoidsAlgorithm.cluster(pts, 2, { rng });
    expect(res.labels).toHaveLength(4);
    expect(res.medoids).toHaveLength(2); // k selected medoids
    expect(new Set(res.labels).size).toBe(2); // exactly 2 clusters
  });

  it("dispatcher try/catch contract: static cluster THROWS on bad input (→ dispatcher err())", async () => {
    const { DBSCANAlgorithm } = await import("../../algorithms/DBSCANAlgorithm.js");
    expect(() => DBSCANAlgorithm.cluster([[1, 2], [3]], 1, 2)).toThrow(/ragged/i);
  });
});

describe("algorithmDispatcher — ml_activation neural activation library (2026-05-29 slot:tango)", () => {
  it("ml_activation action is in the real z.enum(ACTIONS)", () => {
    expect(ALGORITHM_ACTIONS).toContain("ml_activation");
  });

  it("relu/sigmoid/tanh compute correctly (element-wise apply)", async () => {
    const { ActivationFunctionsAlgorithm: A } = await import("../../algorithms/ActivationFunctionsAlgorithm.js");
    expect(A.apply([-2, 0, 3], "relu")).toEqual([0, 0, 3]);
    expect(A.apply(0, "sigmoid")).toBeCloseTo(0.5, 12);
    expect(A.apply(0, "tanh")).toBeCloseTo(0, 12);
  });

  it("softmax is a normalized probability distribution (sums to 1, all positive)", async () => {
    const { ActivationFunctionsAlgorithm: A } = await import("../../algorithms/ActivationFunctionsAlgorithm.js");
    const out = A.softmax([1, 2, 3]);
    expect(out.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    expect(out.every((p) => p > 0)).toBe(true);
    expect(out[2]).toBeGreaterThan(out[0]); // larger logit → larger prob
  });

  it("dispatcher try/catch contract: apply THROWS on unknown activation name (→ err())", async () => {
    const { ActivationFunctionsAlgorithm: A } = await import("../../algorithms/ActivationFunctionsAlgorithm.js");
    expect(() => A.apply(1, "not_a_real_activation" as Parameters<typeof A.apply>[1])).toThrow(/unknown activation/i);
  });
});

describe("algorithmDispatcher — ml_attention scaled dot-product attention (2026-05-29 slot:tango)", () => {
  it("ml_attention action is in the real z.enum(ACTIONS)", () => {
    expect(ALGORITHM_ACTIONS).toContain("ml_attention");
  });

  it("dispatcher path imports ScaledDotProductAttention and produces row-stochastic weights", async () => {
    const { ScaledDotProductAttention } = await import("../../algorithms/ScaledDotProductAttention.js");
    const out = ScaledDotProductAttention.calculate({
      query: [[0, 0]],
      key: [[0, 0], [0, 0]],
      value: [[1, 2], [3, 4]],
    });
    expect(out.output[0]).toEqual([2, 3]); // uniform attention → mean of values
    expect(out.attentionWeights[0].reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
  });

  it("validate gate rejects malformed params the dispatcher would pass (d_k mismatch → err)", async () => {
    const { ScaledDotProductAttention } = await import("../../algorithms/ScaledDotProductAttention.js");
    expect(ScaledDotProductAttention.validate({ query: [[1, 2, 3]], key: [[1, 2]], value: [[1]] }).valid).toBe(false);
  });
});

describe("algorithmDispatcher — ml_lowrank truncated SVD (2026-05-29 slot:tango)", () => {
  it("ml_lowrank action is in the real z.enum(ACTIONS)", () => {
    expect(ALGORITHM_ACTIONS).toContain("ml_lowrank");
  });

  it("dispatcher path imports LowRankApproximation and recovers a rank-1 matrix", async () => {
    const { LowRankApproximation } = await import("../../algorithms/LowRankApproximation.js");
    const out = LowRankApproximation.calculate({ matrix: [[1, 1], [2, 2], [3, 3]], rank: 1 });
    expect(out.S[0]).toBeCloseTo(Math.sqrt(28), 6);
    expect(out.relativeError).toBeLessThan(1e-8); // exact rank-1 recovery
  });

  it("validate gate rejects rank<1 the dispatcher would pass (→ err)", async () => {
    const { LowRankApproximation } = await import("../../algorithms/LowRankApproximation.js");
    expect(LowRankApproximation.validate({ matrix: [[1, 2]], rank: 0 }).valid).toBe(false);
  });
});

describe("algorithmDispatcher — ml_viterbi HMM decoding (2026-05-29 slot:tango)", () => {
  it("ml_viterbi action is in the real z.enum(ACTIONS)", () => {
    expect(ALGORITHM_ACTIONS).toContain("ml_viterbi");
  });

  it("dispatcher path imports ViterbiDecoder and decodes the canonical HMM", async () => {
    const { ViterbiDecoder } = await import("../../algorithms/ViterbiDecoder.js");
    const out = ViterbiDecoder.calculate({
      startProb: [0.6, 0.4],
      transitionProb: [[0.7, 0.3], [0.4, 0.6]],
      emissionProb: [[0.5, 0.4, 0.1], [0.1, 0.3, 0.6]],
      observations: [0, 1, 2],
    });
    expect(out.path).toEqual([0, 0, 1]); // Healthy, Healthy, Fever
    expect(out.prob).toBeCloseTo(0.01512, 8);
  });

  it("validate gate rejects out-of-range observation (→ err)", async () => {
    const { ViterbiDecoder } = await import("../../algorithms/ViterbiDecoder.js");
    expect(ViterbiDecoder.validate({
      startProb: [1], transitionProb: [[1]], emissionProb: [[1]], observations: [3],
    }).valid).toBe(false);
  });
});

describe("algorithmDispatcher — ml_dtw dynamic time warping (2026-05-29 slot:tango)", () => {
  it("ml_dtw action is in the real z.enum(ACTIONS)", () => {
    expect(ALGORITHM_ACTIONS).toContain("ml_dtw");
  });

  it("dispatcher path imports DynamicTimeWarping and warps a shifted series to zero cost", async () => {
    const { DynamicTimeWarping } = await import("../../algorithms/DynamicTimeWarping.js");
    const out = DynamicTimeWarping.calculate({
      a: [[1], [2], [3], [4]],
      b: [[1], [2], [2], [3], [4]], // value held an extra step
    });
    expect(out.distance).toBe(0); // warp absorbs the time stretch
    expect(out.path[0]).toEqual([0, 0]);
    expect(out.path[out.path.length - 1]).toEqual([3, 4]);
  });

  it("validate gate rejects feature-dim mismatch the dispatcher would pass (→ err)", async () => {
    const { DynamicTimeWarping } = await import("../../algorithms/DynamicTimeWarping.js");
    expect(DynamicTimeWarping.validate({ a: [[1, 2]], b: [[1]] }).valid).toBe(false);
  });
});

describe("algorithmDispatcher — ml_pca dimensionality reduction (2026-05-29 slot:tango)", () => {
  it("ml_pca action is in the real z.enum(ACTIONS)", () => {
    expect(ALGORITHM_ACTIONS).toContain("ml_pca");
  });

  it("dispatcher path imports PCA (composing LowRankApproximation) — collinear → PC1 ~100%", async () => {
    const { PrincipalComponentAnalysis } = await import("../../algorithms/PrincipalComponentAnalysis.js");
    const out = PrincipalComponentAnalysis.calculate({
      data: [[0, 0], [1, 2], [2, 4], [3, 6], [4, 8]],
      components: 2,
    });
    expect(out.explainedVarianceRatio[0]).toBeGreaterThan(0.999);
    expect(out.k).toBe(2);
  });

  it("validate gate rejects <2 samples the dispatcher would pass (→ err)", async () => {
    const { PrincipalComponentAnalysis } = await import("../../algorithms/PrincipalComponentAnalysis.js");
    expect(PrincipalComponentAnalysis.validate({ data: [[1, 2]], components: 1 }).valid).toBe(false);
  });
});

describe("algorithmDispatcher — ml_knn retrieval (2026-05-29 slot:tango)", () => {
  it("ml_knn action is in the real z.enum(ACTIONS)", () => {
    expect(ALGORITHM_ACTIONS).toContain("ml_knn");
  });

  it("dispatcher path imports KNearestNeighbors — cosine retrieval ranks by direction", async () => {
    const { KNearestNeighbors } = await import("../../algorithms/KNearestNeighbors.js");
    const out = KNearestNeighbors.calculate({
      queries: [[1, 0]],
      corpus: [[100, 0], [0, 5], [-3, 0]],
      k: 1,
      metric: "cosine",
    });
    expect(out.results[0].indices[0]).toBe(0); // same direction → nearest
    expect(out.results[0].distances[0]).toBeCloseTo(0, 12);
  });

  it("validate gate rejects classify-without-labels the dispatcher would pass (→ err)", async () => {
    const { KNearestNeighbors } = await import("../../algorithms/KNearestNeighbors.js");
    expect(KNearestNeighbors.validate({ queries: [[1]], corpus: [[1], [2]], k: 1, task: "classify" }).valid).toBe(false);
  });
});

describe("algorithmDispatcher — signal_savgol smoothing (2026-05-29 slot:tango)", () => {
  it("signal_savgol action is in the real z.enum(ACTIONS)", () => {
    expect(ALGORITHM_ACTIONS).toContain("signal_savgol");
  });

  it("dispatcher path imports SavitzkyGolayFilter — reproduces a quadratic exactly", async () => {
    const { SavitzkyGolayFilter } = await import("../../algorithms/SavitzkyGolayFilter.js");
    const y = [0, 1, 4, 9, 16, 25, 36]; // x²
    const out = SavitzkyGolayFilter.calculate({ signal: y, windowSize: 5, polyOrder: 2 });
    for (let i = 0; i < y.length; i++) expect(out.filtered[i]).toBeCloseTo(y[i], 8);
  });

  it("validate gate rejects an even window the dispatcher would pass (→ err)", async () => {
    const { SavitzkyGolayFilter } = await import("../../algorithms/SavitzkyGolayFilter.js");
    expect(SavitzkyGolayFilter.validate({ signal: [1, 2, 3, 4], windowSize: 4 }).valid).toBe(false);
  });
});

describe("algorithmDispatcher — ml_gmm soft clustering (2026-05-29 slot:tango)", () => {
  it("ml_gmm action is in the real z.enum(ACTIONS)", () => {
    expect(ALGORITHM_ACTIONS).toContain("ml_gmm");
  });

  it("dispatcher path imports GaussianMixtureModel — recovers two separated blobs", async () => {
    const { GaussianMixtureModel } = await import("../../algorithms/GaussianMixtureModel.js");
    const data = [
      [0, 0], [0.1, 0.1], [-0.1, 0.1], [0.1, -0.1],
      [10, 10], [10.1, 10.1], [9.9, 10.1], [10.1, 9.9],
    ];
    const out = GaussianMixtureModel.calculate({ data, k: 2, seed: 1 });
    expect(out.converged).toBe(true);
    const sorted = out.means.slice().sort((a, b) => a[0] - b[0]);
    expect(sorted[0][0]).toBeCloseTo(0, 1);
    expect(sorted[1][0]).toBeCloseTo(10, 1);
    expect(out.weights[0] + out.weights[1]).toBeCloseTo(1, 10);
  });

  it("validate gate rejects k>n the dispatcher would pass (→ err)", async () => {
    const { GaussianMixtureModel } = await import("../../algorithms/GaussianMixtureModel.js");
    expect(GaussianMixtureModel.validate({ data: [[1], [2]], k: 5 }).valid).toBe(false);
  });
});

describe("algorithmDispatcher — ml_layernorm normalization (2026-05-29 slot:tango)", () => {
  it("ml_layernorm action is in the real z.enum(ACTIONS)", () => {
    expect(ALGORITHM_ACTIONS).toContain("ml_layernorm");
  });

  it("dispatcher path imports LayerNormalization — row normalizes to ~zero-mean/unit-var", async () => {
    const { LayerNormalization } = await import("../../algorithms/LayerNormalization.js");
    const out = LayerNormalization.calculate({ data: [[1, 2, 3]], epsilon: 1e-12 });
    const row = out.normalized[0];
    const mean = row.reduce((a, b) => a + b, 0) / row.length;
    expect(mean).toBeCloseTo(0, 8);
    expect(row[0]).toBeCloseTo(-1.224744871, 6);
    expect(row[2]).toBeCloseTo(1.224744871, 6);
  });

  it("validate gate rejects gamma length mismatch the dispatcher would pass (→ err)", async () => {
    const { LayerNormalization } = await import("../../algorithms/LayerNormalization.js");
    expect(LayerNormalization.validate({ data: [[1, 2, 3]], gamma: [1, 1] }).valid).toBe(false);
  });
});

describe("algorithmDispatcher — ml_beam_search decoding (2026-05-29 slot:tango)", () => {
  it("ml_beam_search action is in the real z.enum(ACTIONS)", () => {
    expect(ALGORITHM_ACTIONS).toContain("ml_beam_search");
  });

  it("dispatcher path imports BeamSearchDecoder — top path is the argmax, exact when B≥V", async () => {
    const { BeamSearchDecoder } = await import("../../algorithms/BeamSearchDecoder.js");
    const L = Math.log;
    const out = BeamSearchDecoder.calculate({
      emissions: [[L(0.9), L(0.1)], [L(0.9), L(0.1)]],
      beamWidth: 2,
    });
    expect(out.sequences[0]).toEqual([0, 0]);
    expect(out.exact).toBe(true);
    expect(out.scores[0]).toBeCloseTo(2 * L(0.9), 10);
  });

  it("validate gate rejects a non-square transition the dispatcher would pass (→ err)", async () => {
    const { BeamSearchDecoder } = await import("../../algorithms/BeamSearchDecoder.js");
    expect(BeamSearchDecoder.validate({ emissions: [[0, 0], [0, 0]], transition: [[0, 0, 0]], beamWidth: 2 }).valid).toBe(false);
  });
});

describe("algorithmDispatcher — ml_multihead_attention (2026-05-29 slot:tango)", () => {
  it("ml_multihead_attention action is in the real z.enum(ACTIONS)", () => {
    expect(ALGORITHM_ACTIONS).toContain("ml_multihead_attention");
  });

  it("dispatcher path imports MultiHeadAttention — h=1 reduces to ml_attention", async () => {
    const { MultiHeadAttention } = await import("../../algorithms/MultiHeadAttention.js");
    const { ScaledDotProductAttention } = await import("../../algorithms/ScaledDotProductAttention.js");
    const query = [[1, 0], [0, 1]], key = [[1, 0], [0, 1]], value = [[1, 2], [3, 4]];
    const mha = MultiHeadAttention.calculate({ query, key, value, numHeads: 1 });
    const sdpa = ScaledDotProductAttention.calculate({ query, key, value });
    expect(mha.output[0][0]).toBeCloseTo(sdpa.output[0][0], 12);
    expect(mha.output[1][1]).toBeCloseTo(sdpa.output[1][1], 12);
  });

  it("validate gate rejects d_model%h≠0 the dispatcher would pass (→ err)", async () => {
    const { MultiHeadAttention } = await import("../../algorithms/MultiHeadAttention.js");
    expect(MultiHeadAttention.validate({ query: [[1, 2, 3]], key: [[1, 2, 3]], value: [[1, 2, 3]], numHeads: 2 }).valid).toBe(false);
  });
});

describe("algorithmDispatcher — ml_transformer_block (2026-05-29 slot:tango)", () => {
  it("ml_transformer_block action is in the real z.enum(ACTIONS)", () => {
    expect(ALGORITHM_ACTIONS).toContain("ml_transformer_block");
  });

  it("dispatcher path imports TransformerBlock — composes MHA+LN+FFN with the residual invariant", async () => {
    const { TransformerBlock } = await import("../../algorithms/TransformerBlock.js");
    const out = TransformerBlock.calculate({
      x: [[1, 1]], numHeads: 1,
      wv: [[0, 0], [0, 0]],                  // zero attention
      w1: [[1, 0], [0, 1]], b1: [1, -1], w2: [[1, 0], [0, 1]], b2: [0, 0],
      activation: "relu",
    });
    // pre-LN residual: out = x + attn(0) + ffn([1,0]) = [2,1]
    expect(out.output[0][0]).toBeCloseTo(2, 8);
    expect(out.output[0][1]).toBeCloseTo(1, 8);
  });

  it("validate gate rejects missing FFN weights the dispatcher would pass (→ err)", async () => {
    const { TransformerBlock } = await import("../../algorithms/TransformerBlock.js");
    expect(TransformerBlock.validate({ x: [[1, 2]], numHeads: 1, w2: [[1, 0], [0, 1]], b2: [0, 0] } as unknown as Parameters<typeof TransformerBlock.validate>[0]).valid).toBe(false);
  });
});

describe("algorithmDispatcher — spatial_ransac_fit (2026-05-29 slot:tango)", () => {
  it("spatial_ransac_fit action is in the real z.enum(ACTIONS)", () => {
    expect(ALGORITHM_ACTIONS).toContain("spatial_ransac_fit");
  });

  it("dispatcher path imports RANSACHyperplane — rejects an outlier off a clean line", async () => {
    const { RANSACHyperplane } = await import("../../algorithms/RANSACHyperplane.js");
    const out = RANSACHyperplane.calculate({
      points: [[0, 1], [1, 3], [2, 5], [3, 7], [4, 9], [2, -10]],
      threshold: 0.05, seed: 1, iterations: 200,
    });
    expect(out.inlierCount).toBe(5);
    expect(out.outliers).toEqual([5]);
  });

  it("validate gate rejects too-few-points the dispatcher would pass (→ err)", async () => {
    const { RANSACHyperplane } = await import("../../algorithms/RANSACHyperplane.js");
    expect(RANSACHyperplane.validate({ points: [[0, 1]], threshold: 0.1 }).valid).toBe(false);
  });
});
