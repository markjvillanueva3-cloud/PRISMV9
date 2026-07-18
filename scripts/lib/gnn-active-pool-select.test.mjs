#!/usr/bin/env node
/**
 * gnn-active-pool-select.test.mjs -- GNN active-learning ghost selector (AI-SYSTEMS #4)
 *
 * Pins the acquisition math + class-balance + diversity re-rank + the R15
 * selectFromClassifications seam (R9: real reference values, no `typeof x` stubs). Runs
 * via `node --test` (the scripts/lib convention -- vitest only globs src/__tests__).
 *
 * Coverage axes (comprehensive-build-enforce floor):
 *   - HAPPY x3   (zero-ref-class wins; inverse-frequency rarity; weight knobs)
 *   - FAILURE >=3 (malformed entries; empty inputs; UNKNOWN ref excluded; skipped classifier)
 *   - ADVERSARIAL >=2 (all-confident -> rarity-driven; single-class -> no monopoly/loop;
 *                      heterophily hook; input non-mutation)
 *   - WIRING: selectActivePool end-to-end via an injected classifier (minConf:0 forwarded);
 *             writeWorklist via DI hooks (no real disk).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  ACTIVE_POOL_DEFAULTS,
  referenceClassDistribution,
  extractReferences,
  computeAcquisition,
  diversityRerank,
  selectFromClassifications,
  selectActivePool,
  writeWorklist,
} from "./gnn-active-pool-select.mjs";

const ref = (cls, conf = 0.9, id = cls + Math.round(conf * 100)) =>
  ({ kind: "ghost.unwired-engine", id, confidence: conf, proposed_wiring: cls });

describe("referenceClassDistribution", () => {
  it("counts references per dispatcher class", () => {
    const dist = referenceClassDistribution([
      { proposed_wiring: "prism_cam" }, { proposed_wiring: "prism_cam" },
      { proposed_wiring: "prism_calc" },
    ]);
    assert.equal(dist.get("prism_cam"), 2);
    assert.equal(dist.get("prism_calc"), 1);
    assert.equal(dist.size, 2);
  });
  it("returns an empty Map for non-array / skips entries without a class", () => {
    assert.equal(referenceClassDistribution(null).size, 0);
    assert.equal(referenceClassDistribution([{}, { proposed_wiring: 5 }]).size, 0);
  });
});

describe("extractReferences", () => {
  it("keeps ghost.unwired-engine nodes at/above refMinConf with a VALID dispatcher", () => {
    const graph = { nodes: [
      ref("prism_cam", 0.9), ref("prism_cam", 0.85), ref("prism_calc", 0.95),
    ] };
    const refs = extractReferences(graph, 0.8);
    assert.equal(refs.length, 3);
  });
  it("FAILURE: excludes UNKNOWN / uppercase proposed_wiring (P1-1 fix -- not a valid dispatcher)", () => {
    const graph = { nodes: [
      ref("prism_cam", 0.9),
      ref("UNKNOWN", 0.95),     // invalid dispatcher -> excluded even though confident
      ref("PRISM_CALC", 0.9),   // uppercase -> excluded
    ] };
    const refs = extractReferences(graph, 0.8);
    assert.deepEqual(refs.map((r) => r.proposed_wiring), ["prism_cam"]);
  });
  it("FAILURE: excludes below-confidence and non-ghost kinds; null graph -> []", () => {
    const graph = { nodes: [
      ref("prism_cam", 0.5),                                    // below cut
      { kind: "engine", confidence: 0.9, proposed_wiring: "prism_cam" }, // wrong kind
    ] };
    assert.equal(extractReferences(graph, 0.8).length, 0);
    assert.equal(extractReferences(null).length, 0);
  });
});

describe("computeAcquisition", () => {
  const dist = new Map([["prism_cam", 3], ["prism_calc", 1]]); // maxRef = 3

  it("HAPPY: a ZERO-reference class ranks above a higher-uncertainty common class (macro-F1 lever)", () => {
    const scored = computeAcquisition([
      { engine: "A", dispatcher: "prism_cam", confidence: 0.95 },    // common, confident
      { engine: "B", dispatcher: "prism_calc", confidence: 0.55 },   // rare, uncertain
      { engine: "C", dispatcher: "prism_safety", confidence: 0.60 }, // ZERO-ref, uncertain
    ], dist);
    assert.deepEqual(scored.map((s) => s.engine), ["C", "B", "A"]);
    // exact reference values: acq = 0.6*uncertainty + 0.4*classRarity
    assert.equal(scored[0].acquisition, 0.64);   // C: 0.6*0.40 + 0.4*1.0
    assert.equal(scored[1].acquisition, 0.5367); // B: 0.6*0.45 + 0.4*0.6667
    assert.equal(scored[2].acquisition, 0.03);   // A: 0.6*0.05 + 0.4*0
    assert.equal(scored[2].classRarity, 0);      // prism_cam: 1 - 3/3
    assert.equal(scored[1].classRarity, 0.6667); // prism_calc: 1 - 1/3
    assert.equal(scored[0].classRarity, 1);      // prism_safety: absent from pool
  });

  it("HAPPY: rarity is inverse-frequency against the most-represented class", () => {
    const d = new Map([["a", 4], ["b", 2], ["c", 1]]); // maxRef 4
    const s = computeAcquisition([
      { engine: "x", dispatcher: "a", confidence: 0.5 },
      { engine: "y", dispatcher: "b", confidence: 0.5 },
      { engine: "z", dispatcher: "c", confidence: 0.5 },
    ], d);
    const byEngine = Object.fromEntries(s.map((r) => [r.engine, r.classRarity]));
    assert.equal(byEngine.x, 0);      // 1 - 4/4
    assert.equal(byEngine.y, 0.5);    // 1 - 2/4
    assert.equal(byEngine.z, 0.75);   // 1 - 1/4
  });

  it("HAPPY: weight knobs -- wB:0 => pure uncertainty; wU:0 => pure class-rarity", () => {
    const cls = [
      { engine: "lowU_rare", dispatcher: "prism_safety", confidence: 0.9 },  // unc 0.1, rarity 1
      { engine: "highU_common", dispatcher: "prism_cam", confidence: 0.1 },  // unc 0.9, rarity 0
    ];
    const uOnly = computeAcquisition(cls, dist, { weightUncertainty: 1, weightClassRarity: 0 });
    assert.equal(uOnly[0].engine, "highU_common"); // uncertainty wins
    const bOnly = computeAcquisition(cls, dist, { weightUncertainty: 0, weightClassRarity: 1 });
    assert.equal(bOnly[0].engine, "lowU_rare");    // rarity wins
  });

  it("FAILURE: malformed entries are skipped and counted, never NaN-propagated", () => {
    const s = computeAcquisition([
      { engine: "ok", dispatcher: "prism_cam", confidence: 0.5 },
      { dispatcher: "prism_cam", confidence: 0.5 },           // no engine
      { engine: "x", dispatcher: "prism_cam", confidence: "nope" }, // non-finite conf
      null,
    ], dist);
    assert.equal(s.length, 1);
    assert.equal(s._skippedMalformed, 3);
    assert.ok(Number.isFinite(s[0].acquisition));
  });

  it("FAILURE: empty classifications -> []; non-Map refDist -> rarity 1 for all (cold start)", () => {
    assert.equal(computeAcquisition([], new Map()).length, 0);
    const s = computeAcquisition([{ engine: "a", dispatcher: "prism_cam", confidence: 0.5 }], "not-a-map");
    assert.equal(s[0].classRarity, 1); // maxRef 0 -> every class is maximally rare
  });

  it("ADVERSARIAL: all-confident inputs -> ranking driven by class-rarity, not input order", () => {
    const s = computeAcquisition([
      { engine: "common", dispatcher: "prism_cam", confidence: 1 },   // unc 0, rarity 0
      { engine: "rare", dispatcher: "prism_calc", confidence: 1 },    // unc 0, rarity 0.6667
    ], dist);
    assert.equal(s[0].engine, "rare");
    assert.equal(s[0].uncertainty, 0);
  });

  it("ADVERSARIAL: heterophilyOf hook skips nodes above the threshold (counted)", () => {
    const s = computeAcquisition([
      { engine: "keep", dispatcher: "prism_cam", confidence: 0.5 },
      { engine: "drop", dispatcher: "prism_cam", confidence: 0.5 },
    ], dist, { heterophilyOf: (e) => (e === "drop" ? 0.99 : 0), heterophilySkipAbove: 0.5 });
    assert.deepEqual(s.map((r) => r.engine), ["keep"]);
    assert.equal(s._skippedHetero, 1);
  });

  it("determinism: equal acquisition breaks ties by engine name", () => {
    const d = new Map([["prism_cam", 1]]);
    const s = computeAcquisition([
      { engine: "zeta", dispatcher: "prism_cam", confidence: 0.5 },
      { engine: "alpha", dispatcher: "prism_cam", confidence: 0.5 },
    ], d);
    assert.deepEqual(s.map((r) => r.engine), ["alpha", "zeta"]);
  });

  it("INTENT: class-rarity is DATA-DRIVEN -- identical-uncertainty items flip order with the pool (proves the macro-F1 term is load-bearing)", () => {
    const cls = [
      { engine: "camEng", dispatcher: "prism_cam", confidence: 0.5 },
      { engine: "calcEng", dispatcher: "prism_calc", confidence: 0.5 }, // SAME uncertainty
    ];
    // pool heavy in prism_cam -> calcEng is rarer -> ranks first
    const a = computeAcquisition(cls, new Map([["prism_cam", 10], ["prism_calc", 1]]));
    assert.equal(a[0].engine, "calcEng");
    // flip the pool -> prism_cam is now rarer -> camEng ranks first. Uncertainty is
    // identical, so ONLY the class-rarity term can change the order. If classRarity were
    // dropped, both would tie and the engine-name tie-break would put calcEng first in
    // BOTH cases -> this assertion fails. So it pins the macro-F1 lever, not just behavior.
    const b = computeAcquisition(cls, new Map([["prism_cam", 1], ["prism_calc", 10]]));
    assert.equal(b[0].engine, "camEng");
  });
});

describe("diversityRerank", () => {
  it("HAPPY: spreads the top across classes instead of stacking one", () => {
    // 4 prism_cam (high acq) + 1 prism_calc (lower acq). Without diversity the calc
    // item would sink; the gamma decay lifts it above the 2nd same-class cam item.
    const scored = [
      { engine: "cam1", predictedDispatcher: "prism_cam", acquisition: 0.90 },
      { engine: "cam2", predictedDispatcher: "prism_cam", acquisition: 0.88 },
      { engine: "cam3", predictedDispatcher: "prism_cam", acquisition: 0.86 },
      { engine: "calc1", predictedDispatcher: "prism_calc", acquisition: 0.70 },
    ];
    const out = diversityRerank(scored, { diversityDecay: 0.5 });
    assert.equal(out[0].engine, "cam1");
    // after picking cam1, cam2 eff = 0.88*0.5 = 0.44 < calc1 eff 0.70 -> calc1 is #2
    assert.equal(out[1].engine, "calc1");
    assert.deepEqual(out.map((o) => o.rank), [1, 2, 3, 4]);
  });

  it("ADVERSARIAL: a single dominant class still ranks (no monopoly crash / no infinite loop)", () => {
    const scored = Array.from({ length: 6 }, (_, i) =>
      ({ engine: "e" + i, predictedDispatcher: "prism_cam", acquisition: 1 - i * 0.1 }));
    const out = diversityRerank(scored, { diversityDecay: 0.6 });
    assert.equal(out.length, 6);
    assert.deepEqual(out.map((o) => o.rank), [1, 2, 3, 4, 5, 6]);
  });

  it("ADVERSARIAL: does NOT mutate the input array", () => {
    const scored = [{ engine: "a", predictedDispatcher: "p", acquisition: 0.5 }];
    const snapshot = JSON.stringify(scored);
    diversityRerank(scored);
    assert.equal(JSON.stringify(scored), snapshot);
  });

  it("INTENT: the top-K spans multiple classes when one class hogs the highest base scores", () => {
    // class A holds the 3 highest base scores; without the decay the top-3 would be all-A.
    const scored = [
      { engine: "a1", predictedDispatcher: "A", acquisition: 0.95 },
      { engine: "a2", predictedDispatcher: "A", acquisition: 0.93 },
      { engine: "a3", predictedDispatcher: "A", acquisition: 0.91 },
      { engine: "b1", predictedDispatcher: "B", acquisition: 0.80 },
      { engine: "c1", predictedDispatcher: "C", acquisition: 0.78 },
    ];
    const top3 = diversityRerank(scored, { diversityDecay: 0.4 }).slice(0, 3);
    const classes = new Set(top3.map((t) => t.predictedDispatcher));
    assert.ok(classes.size >= 2, `top-3 should span >=2 classes, got ${[...classes].join(",")}`);
  });

  it("rerankPoolCap bounds the greedy; the tail keeps base order and is appended", () => {
    const scored = Array.from({ length: 5 }, (_, i) =>
      ({ engine: "e" + i, predictedDispatcher: "c" + i, acquisition: 1 - i * 0.1 }));
    const out = diversityRerank(scored, { rerankPoolCap: 2 });
    assert.equal(out.length, 5);
    assert.deepEqual(out.slice(2).map((o) => o.engine), ["e2", "e3", "e4"]); // tail untouched order
  });
});

describe("selectFromClassifications (R15 seam -- pure, pre-computed inputs)", () => {
  it("HAPPY: assembles worklist + poolStats with no classifier", () => {
    const refs = [ref("prism_cam"), ref("prism_cam"), ref("prism_calc")];
    const r = selectFromClassifications({
      classifications: [
        { engine: "X", dispatcher: "prism_cam", confidence: 0.9 },
        { engine: "Y", dispatcher: "prism_safety", confidence: 0.55 }, // zero-ref -> #1
      ],
      references: refs,
      classifierStats: { targets: 2, classified: 2, mode: "direct-embed" },
    });
    assert.equal(r.worklist[0].engine, "Y");
    assert.equal(r.poolStats.references, 3);
    assert.equal(r.poolStats.labelledClasses, 2);
    assert.equal(r.poolStats.unlabeledTargets, 2);
    assert.equal(r.poolStats.unvoted, 0);
    assert.deepEqual(r.poolStats.classDistribution, { prism_cam: 2, prism_calc: 1 });
  });

  it("FAILURE: empty inputs -> empty worklist + sane zeroed poolStats", () => {
    const r = selectFromClassifications({ classifications: [], references: [] });
    assert.equal(r.worklist.length, 0);
    assert.equal(r.poolStats.references, 0);
    assert.equal(r.poolStats.scored, 0);
  });

  it("FAILURE: no-args call -> empty + deterministic (no throw)", () => {
    const r = selectFromClassifications();
    assert.equal(r.worklist.length, 0);
    assert.equal(r.poolStats.references, 0);
    assert.equal(r.poolStats.unlabeledTargets, 0);
  });

  it("WIRING: unvoted = targets - classified when the classifier returns fewer votes than targets (the live no-neighbour count)", () => {
    const r = selectFromClassifications({
      classifications: [{ engine: "A", dispatcher: "prism_cam", confidence: 0.5 }],
      references: [ref("prism_cam")],
      classifierStats: { targets: 5, classified: 1, mode: "direct-embed" }, // 4 ghosts got no vote
    });
    assert.equal(r.poolStats.unlabeledTargets, 5);
    assert.equal(r.poolStats.voted, 1);
    assert.equal(r.poolStats.unvoted, 4);
  });

  it("WIRING: classifierSkipped + stats fallback are surfaced", () => {
    const r = selectFromClassifications({
      classifications: [{ engine: "A", dispatcher: "prism_cam", confidence: 0.5 }],
      references: [],
      classifierSkipped: true,
      classifierReason: "direct-embed-no-vectors",
    });
    assert.equal(r.poolStats.classifierSkipped, true);
    assert.equal(r.poolStats.classifierReason, "direct-embed-no-vectors");
    assert.equal(r.poolStats.unlabeledTargets, 1); // falls back to classifications.length
  });
});

describe("selectActivePool (integration via injected classifier)", () => {
  const graph = { nodes: [ref("prism_cam"), ref("prism_cam"), ref("prism_calc")] };

  it("WIRING: forwards minConf:0 and produces an end-to-end worklist", () => {
    let seenOpts = null;
    const mockClassify = (g, o) => {
      seenOpts = o;
      return {
        classifications: [
          { engine: "A", dispatcher: "prism_cam", confidence: 0.9 },
          { engine: "B", dispatcher: "prism_safety", confidence: 0.5 },
        ],
        stats: { targets: 2, classified: 2, mode: "direct-embed" },
        skipped: false, reason: "classified",
      };
    };
    const r = selectActivePool({ graph, classifyImpl: mockClassify });
    assert.equal(seenOpts.minConf, 0);          // deploy gate disabled so low-conf survive
    assert.equal(r.worklist[0].engine, "B");    // zero-ref prism_safety
    assert.equal(r.poolStats.references, 3);
  });

  it("FAILURE: a non-function classifyImpl throws TypeError", () => {
    assert.throws(() => selectActivePool({ graph, classifyImpl: null }), TypeError);
  });

  it("FAILURE: a skipped classifier yields an empty worklist with the reason surfaced", () => {
    const r = selectActivePool({
      graph,
      classifyImpl: () => ({ classifications: [], stats: { targets: 0, classified: 0 }, skipped: true, reason: "no-references" }),
    });
    assert.equal(r.worklist.length, 0);
    assert.equal(r.poolStats.classifierSkipped, true);
  });

  it("WIRING: UNKNOWN refs in the graph are excluded from rarity even via the public entry", () => {
    const g = { nodes: [ref("prism_cam"), ref("UNKNOWN", 0.95)] };
    const r = selectActivePool({
      graph: g,
      classifyImpl: () => ({ classifications: [{ engine: "A", dispatcher: "prism_cam", confidence: 0.5 }], stats: { targets: 1, classified: 1 } }),
    });
    assert.equal(r.poolStats.references, 1); // UNKNOWN dropped
    assert.deepEqual(r.poolStats.classDistribution, { prism_cam: 1 });
  });
});

describe("writeWorklist (DI hooks, no real disk)", () => {
  it("writes schema-versioned JSON + markdown, honoring topK and a fixed generatedAt", () => {
    const result = selectFromClassifications({
      classifications: [
        { engine: "A", dispatcher: "prism_cam", confidence: 0.9 },
        { engine: "B", dispatcher: "prism_safety", confidence: 0.5 },
        { engine: "C", dispatcher: "prism_calc", confidence: 0.4 },
      ],
      references: [ref("prism_cam")],
      classifierStats: { targets: 3, classified: 3 },
    });
    const writes = new Map();
    const out = writeWorklist(result, {
      topK: 2,
      generatedAt: "2026-06-10T00:00:00.000Z",
      jsonPath: "/virt/wl.json",
      mdPath: "/virt/wl.md",
      writeFileImpl: (p, c) => writes.set(p, c),
      mkdirImpl: () => {},
    });
    assert.equal(out.written, 2);
    const json = JSON.parse(writes.get("/virt/wl.json"));
    assert.equal(json.schemaVersion, "1.0.0");
    assert.equal(json.generatedAt, "2026-06-10T00:00:00.000Z");
    assert.equal(json.worklist.length, 2); // topK slice
    assert.ok(writes.get("/virt/wl.md").includes("GNN active-learning label worklist"));
  });
});

describe("ACTIVE_POOL_DEFAULTS", () => {
  it("is frozen with the documented knobs", () => {
    assert.ok(Object.isFrozen(ACTIVE_POOL_DEFAULTS));
    assert.equal(ACTIVE_POOL_DEFAULTS.weightUncertainty + ACTIVE_POOL_DEFAULTS.weightClassRarity, 1);
    assert.equal(ACTIVE_POOL_DEFAULTS.heterophilySkipAbove, 1);
  });
});
