#!/usr/bin/env node
/**
 * systemviz-node-feature-projector.test.mjs — node:test suite for U3c of
 * NN-GRAPH-MS0.
 *
 * Load-bearing invariants:
 *  - every one of the 8 features, for every node (including adversarial /
 *    out-of-range input), lands in [0,1] — a GNN input contract;
 *  - fit/transform is honest: normalizing graph B with stats fitted on graph
 *    A genuinely changes B's projection;
 *  - P99 scaling resists a single complexity outlier (the reason it is P99,
 *    not max).
 * All deterministic, no stubs (CLAUDE.md R9).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  FEATURE_DIM,
  DIM,
  FEATURE_NAMES,
  LAYER_ORDER,
  DEFAULT_PERCENTILE,
  parseLayerOrdinal,
  statusScore,
  roiScore,
  computeFeatureStats,
  projectNodeFeatures,
  projectGraphFeatures,
} from "./systemviz-node-feature-projector.mjs";

/**
 * A fully-populated node. `over` SHALLOW-overrides top-level fields — an
 * `over.awareness` REPLACES the whole base awareness object (sub-fields not
 * named in the override vanish). A test that overrides `awareness` must
 * include every awareness sub-field it later asserts on.
 */
function node(over = {}) {
  return {
    id: "n",
    layer: "L5",
    subgroup: "engines",
    label: "Demo",
    status: "built",
    size: 1,
    tier: 2,
    awareness: { svi: 0.875, testCount: 3, complexity: 10, coverage: 0.6, actionCount: 4, registryEntries: 1 },
    businessValue: { tags: [], roi: "medium", rationale: "" },
    ...over,
  };
}

describe("module constants", () => {
  it("FEATURE_DIM is 8 and DIM aliases it", () => {
    assert.equal(FEATURE_DIM, 8);
    assert.equal(DIM, FEATURE_DIM);
  });
  it("FEATURE_NAMES is a frozen length-8 list in projection order", () => {
    assert.equal(Object.isFrozen(FEATURE_NAMES), true);
    assert.equal(FEATURE_NAMES.length, FEATURE_DIM);
    assert.deepEqual(FEATURE_NAMES, [
      "layer", "tier", "svi", "coverage", "complexity", "actionCount", "status", "roi",
    ]);
  });
  it("LAYER_ORDER is frozen and holds the 16 known layers", () => {
    assert.equal(Object.isFrozen(LAYER_ORDER), true);
    assert.equal(LAYER_ORDER.length, 16);
    assert.equal(LAYER_ORDER[0], "L0");
    assert.equal(LAYER_ORDER[LAYER_ORDER.length - 1], "Lgit");
  });
  it("DEFAULT_PERCENTILE is 0.99", () => {
    assert.equal(DEFAULT_PERCENTILE, 0.99);
  });
});

describe("parseLayerOrdinal", () => {
  it("maps known layers to their normalized ordinal", () => {
    assert.equal(parseLayerOrdinal("L0"), 0);
    assert.equal(parseLayerOrdinal("L5"), 6 / 15);   // index 6 of 16
    assert.equal(parseLayerOrdinal("L4a"), 5 / 15);  // exact match wins over regex
    assert.equal(parseLayerOrdinal("Lgit"), 1);      // index 15 of 16
  });
  it("falls back to a clamped parsed number for an unknown L<n> layer", () => {
    assert.equal(parseLayerOrdinal("L42"), 1); // 42 clamps to 15 -> 15/15
  });
  it("returns 0 for garbage / empty / non-string input", () => {
    assert.equal(parseLayerOrdinal("weird"), 0);
    assert.equal(parseLayerOrdinal(""), 0);
    assert.equal(parseLayerOrdinal(null), 0);
    assert.equal(parseLayerOrdinal(7), 0);
  });
  it("uses the case-insensitive regex fallback for a lowercase layer", () => {
    // Exact match against LAYER_ORDER is case-sensitive; the L<n> regex
    // fallback is not. So lowercase "l5" misses the exact "L5" (index 6) and
    // parses as the number 5 -> 5/15 — a real, documented asymmetry.
    assert.equal(parseLayerOrdinal("l5"), 5 / 15);
    assert.equal(parseLayerOrdinal("L5"), 6 / 15);
  });
  it("always returns a value in [0,1]", () => {
    for (const l of [...LAYER_ORDER, "L99", "Lx", "", null]) {
      const v = parseLayerOrdinal(l);
      assert.ok(v >= 0 && v <= 1, `${l} -> ${v}`);
    }
  });
});

describe("statusScore", () => {
  it("scores built / wired as 1", () => {
    assert.equal(statusScore("built"), 1);
    assert.equal(statusScore("Built"), 1);
    assert.equal(statusScore("wired"), 1);
  });
  it("scores unwired / needs-wiring as 0.5", () => {
    assert.equal(statusScore("unwired"), 0.5);
    assert.equal(statusScore("needs-wiring"), 0.5);
    assert.equal(statusScore("needs_wiring"), 0.5);
  });
  it("scores ghost / planned / stub / unknown as 0", () => {
    assert.equal(statusScore("ghost"), 0);
    assert.equal(statusScore("planned"), 0);
    assert.equal(statusScore("stub"), 0);
    assert.equal(statusScore(null), 0);
    assert.equal(statusScore(undefined), 0);
  });
});

describe("roiScore", () => {
  it("maps high / medium / low", () => {
    assert.equal(roiScore("high"), 1);
    assert.equal(roiScore("HIGH"), 1);
    assert.equal(roiScore("medium"), 0.5);
    assert.equal(roiScore("med"), 0.5);
    assert.equal(roiScore("low"), 0);
  });
  it("maps unknown / nullish to 0", () => {
    assert.equal(roiScore("bogus"), 0);
    assert.equal(roiScore(null), 0);
    assert.equal(roiScore(undefined), 0);
  });
});

describe("computeFeatureStats", () => {
  it("returns safe defaults for an empty / non-graph input", () => {
    const s = computeFeatureStats({ nodes: [] });
    assert.equal(s.complexityScale, 1);
    assert.equal(s.actionCountScale, 1);
    assert.equal(s.nodeCount, 0);
    assert.equal(s.missingAwareness, 0);
    assert.equal(s.missingBusinessValue, 0);
    assert.equal(computeFeatureStats(null).nodeCount, 0);
  });
  it("defaults percentile to 0.99 when omitted", () => {
    assert.equal(computeFeatureStats({ nodes: [] }).percentile, 0.99);
  });
  it("throws RangeError on an explicitly out-of-range percentile", () => {
    assert.throws(() => computeFeatureStats({ nodes: [] }, { percentile: 1.5 }), /percentile/);
    assert.throws(() => computeFeatureStats({ nodes: [] }, { percentile: 0 }), /percentile/);
    assert.throws(() => computeFeatureStats({ nodes: [] }, { percentile: -0.1 }), /percentile/);
    assert.throws(() => computeFeatureStats({ nodes: [] }, { percentile: NaN }), /percentile/);
  });
  it("counts nodes missing awareness / businessValue", () => {
    const g = { nodes: [
      node(),
      { id: "x", layer: "L1" },                       // no awareness, no businessValue
      { id: "y", layer: "L1", awareness: { svi: 1 } }, // no businessValue
    ] };
    const s = computeFeatureStats(g);
    assert.equal(s.missingAwareness, 1);
    assert.equal(s.missingBusinessValue, 2);
    assert.equal(s.nodeCount, 3);
  });
  it("derives complexityScale as log1p of the P99 complexity", () => {
    // complexities 1..100 -> P99 (nearest-rank, n=100) is the 99th value = 99.
    const nodes = [];
    for (let c = 1; c <= 100; c++) nodes.push(node({ id: `c${c}`, awareness: { complexity: c } }));
    const s = computeFeatureStats({ nodes });
    assert.ok(Math.abs(s.complexityScale - Math.log1p(99)) < 1e-9, `scale ${s.complexityScale}`);
  });
});

describe("projectNodeFeatures", () => {
  it("returns a Float32Array of FEATURE_DIM length", () => {
    const f = projectNodeFeatures(node());
    assert.ok(f instanceof Float32Array);
    assert.equal(f.length, FEATURE_DIM);
  });
  it("returns an all-zero vector for a null / non-object node", () => {
    for (const bad of [null, undefined, 42, "node"]) {
      const f = projectNodeFeatures(bad);
      assert.equal(f.length, FEATURE_DIM);
      for (const x of f) assert.equal(x, 0);
    }
  });
  it("places each feature at its FEATURE_NAMES index", () => {
    const stats = { complexityScale: Math.log1p(100), actionCountScale: Math.log1p(50) };
    const f = projectNodeFeatures(node({
      layer: "L5", tier: 3, status: "built",
      awareness: { svi: 0.8, coverage: 0.5, complexity: 10, actionCount: 4 },
      businessValue: { roi: "high" },
    }), stats);
    assert.ok(Math.abs(f[0] - 6 / 15) < 1e-6);                   // layer L5 (Float32-stored)
    assert.ok(Math.abs(f[1] - 3 / 5) < 1e-6);                    // tier 3/5
    assert.ok(Math.abs(f[2] - 0.8) < 1e-6);                      // svi
    assert.ok(Math.abs(f[3] - 0.5) < 1e-6);                      // coverage
    assert.ok(Math.abs(f[4] - Math.log1p(10) / Math.log1p(100)) < 1e-6); // complexity
    assert.ok(Math.abs(f[5] - Math.log1p(4) / Math.log1p(50)) < 1e-6);   // actionCount
    assert.equal(f[6], 1);                                       // status built
    assert.equal(f[7], 1);                                       // roi high
  });
  it("projects missing awareness / businessValue fields to 0", () => {
    const f = projectNodeFeatures({ id: "bare", layer: "L3", tier: 1 });
    assert.equal(f[2], 0); // svi
    assert.equal(f[3], 0); // coverage
    assert.equal(f[4], 0); // complexity
    assert.equal(f[5], 0); // actionCount
    assert.equal(f[7], 0); // roi
  });
  it("saturates the log1p features under DEFAULT_STATS (no stats arg)", () => {
    // With no stats the scale is 1, so log1p(10)=2.40 and log1p(4)=1.61 both
    // exceed 1 and clamp — the documented single-node-call behaviour.
    const f = projectNodeFeatures(node({
      awareness: { svi: 0.5, coverage: 0.5, complexity: 10, actionCount: 4 },
    }));
    assert.equal(f[4], 1); // complexity saturates
    assert.equal(f[5], 1); // actionCount saturates
    assert.ok(Math.abs(f[2] - 0.5) < 1e-6); // svi passes through untouched
  });
  it("coerces a string tier and clamps out-of-range numeric input", () => {
    const f = projectNodeFeatures(node({
      tier: "4",
      awareness: { svi: 5, coverage: -1, complexity: -3, actionCount: 2 },
    }));
    assert.ok(Math.abs(f[1] - 4 / 5) < 1e-6); // "4" coerced
    assert.equal(f[2], 1);                    // svi 5 -> clamp 1
    assert.equal(f[3], 0);                    // coverage -1 -> clamp 0
    assert.equal(f[4], 0);                    // complexity -3 -> max(0,..) -> 0
  });
});

describe("[0,1] invariant — every feature of every node is bounded", () => {
  const variedGraph = {
    nodes: [
      { id: "a", layer: "L0", tier: 0, status: "built",
        awareness: { svi: 1, coverage: 1, complexity: 0, actionCount: 0 }, businessValue: { roi: "high" } },
      { id: "b", layer: "Lgit", tier: 5, status: "unwired",
        awareness: { svi: 0.5, coverage: 0.3, complexity: 9999, actionCount: 500 }, businessValue: { roi: "low" } },
      { id: "c", layer: "L8", tier: 3, status: "ghost",
        awareness: { svi: 0, coverage: 0, complexity: 50, actionCount: 12 } },
      { id: "d", layer: "weird", tier: 99, status: "???",
        awareness: { svi: 5, coverage: -1, complexity: -3, actionCount: 7 }, businessValue: { roi: "medium" } },
      { id: "e" }, // bare node — every field defaults
    ],
  };
  it("bounds all 8 features in [0,1] across an adversarial graph", () => {
    const { features } = projectGraphFeatures(variedGraph);
    assert.equal(features.size, 5);
    for (const [id, vec] of features) {
      assert.equal(vec.length, FEATURE_DIM);
      for (let i = 0; i < vec.length; i++) {
        assert.ok(
          vec[i] >= 0 && vec[i] <= 1 && Number.isFinite(vec[i]),
          `node ${id} feature ${FEATURE_NAMES[i]} out of [0,1]: ${vec[i]}`
        );
      }
    }
  });
});

describe("projectGraphFeatures", () => {
  it("returns { features, stats, dim, nodeCount } with a Map of Float32Arrays", () => {
    const r = projectGraphFeatures({ nodes: [node({ id: "a" }), node({ id: "b" })] });
    assert.ok(r.features instanceof Map);
    assert.equal(r.dim, FEATURE_DIM);
    assert.equal(r.nodeCount, 2);
    assert.equal(r.features.size, 2);
    for (const v of r.features.values()) assert.ok(v instanceof Float32Array);
  });
  it("skips nodes with no id and keeps the last of a duplicate id", () => {
    const r = projectGraphFeatures({ nodes: [
      node({ id: "keep" }),
      { layer: "L1" },                              // no id -> skipped
      node({ id: "dup", tier: 0 }),
      node({ id: "dup", tier: 5 }),                 // last dup wins
    ] });
    assert.equal(r.features.has("keep"), true);
    assert.equal(r.nodeCount, 2);
    assert.ok(Math.abs(r.features.get("dup")[1] - 5 / 5) < 1e-6); // tier 5 from the last node
  });
  it("returns an empty result for a non-graph input", () => {
    const r = projectGraphFeatures(null);
    assert.equal(r.features.size, 0);
    assert.equal(r.nodeCount, 0);
  });
  it("is deterministic — identical output across runs", () => {
    const g = { nodes: [node({ id: "a" }), node({ id: "b", tier: 4 }), node({ id: "c", layer: "L9" })] };
    const r1 = projectGraphFeatures(g);
    const r2 = projectGraphFeatures(g);
    for (const id of r1.features.keys()) {
      const v1 = r1.features.get(id), v2 = r2.features.get(id);
      for (let i = 0; i < v1.length; i++) assert.equal(v1[i], v2[i]);
    }
  });
});

describe("fit/transform discipline", () => {
  it("normalizes a graph with stats fitted on a different graph", () => {
    // Graph A: complexities 1..100 -> P99 = 99.
    const aNodes = [];
    for (let c = 1; c <= 100; c++) aNodes.push(node({ id: `a${c}`, awareness: { complexity: c } }));
    const statsA = computeFeatureStats({ nodes: aNodes });

    // Graph B: a single node, complexity 50.
    const graphB = { nodes: [node({ id: "b", awareness: { complexity: 50 } })] };

    const fitOnA = projectGraphFeatures(graphB, { stats: statsA }).features.get("b")[4];
    const fitOnB = projectGraphFeatures(graphB).features.get("b")[4];

    // Fit-on-B: B's only complexity (50) IS its own P99 -> feature saturates at 1.
    assert.ok(Math.abs(fitOnB - 1) < 1e-6, `fit-on-B complexity ${fitOnB}`);
    // Fit-on-A: 50 is below A's P99 of 99 -> feature is strictly less than 1.
    assert.ok(fitOnA < 0.95, `fit-on-A complexity ${fitOnA} should be < fit-on-B`);
    assert.ok(fitOnA !== fitOnB, "opts.stats must change the projection");
  });

  it("P99 scaling resists a single complexity outlier (vs max scaling)", () => {
    // 99 nodes with complexity 1..99 + one extreme outlier.
    const nodes = [];
    for (let c = 1; c <= 99; c++) nodes.push(node({ id: `n${c}`, awareness: { complexity: c } }));
    nodes.push(node({ id: "outlier", awareness: { complexity: 1_000_000 } }));

    const { features, stats } = projectGraphFeatures({ nodes });
    // P99 (nearest-rank, n=100) = the 99th sorted value = 99 — the outlier is excluded.
    assert.ok(Math.abs(stats.complexityScale - Math.log1p(99)) < 1e-9);

    // A mid-range node keeps a meaningful feature value — it is NOT crushed
    // toward 0 the way max-scaling (divisor log1p(1e6) ≈ 13.8) would crush it.
    const mid = features.get("n50")[4];
    const maxScaled = Math.log1p(50) / Math.log1p(1_000_000);
    assert.ok(mid > 0.5, `P99-scaled mid-node complexity ${mid} must stay meaningful`);
    assert.ok(mid > maxScaled * 2, `P99 (${mid}) must dominate max-scaling (${maxScaled})`);
    // The P99 node itself saturates at 1; the outlier clamps at 1.
    assert.ok(Math.abs(features.get("n99")[4] - 1) < 1e-6);
    assert.equal(features.get("outlier")[4], 1);
  });
});
