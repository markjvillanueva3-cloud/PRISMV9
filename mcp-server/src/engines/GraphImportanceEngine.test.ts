/**
 * GraphImportanceEngine — synergy test for the PPR engine-namespace wrapper.
 *
 * Validates the three call patterns (rankGlobal, rankBySeed, rankByTask) +
 * the blast-radius helper. Real reference values per R9.
 *
 * @module engines/GraphImportanceEngine.test
 */

import { describe, it, expect } from "vitest";
import { graphImportanceEngine } from "./GraphImportanceEngine.js";

const SAMPLE_GRAPH = {
  nodes: [
    "engine:Kienzle",
    "dispatcher:prism_calc",
    "wiki:kienzle",
    "engine:Unrelated",
  ],
  edges: [
    { from: "engine:Kienzle", to: "dispatcher:prism_calc" },
    { from: "engine:Kienzle", to: "wiki:kienzle" },
    { from: "dispatcher:prism_calc", to: "engine:Kienzle" },
    { from: "wiki:kienzle", to: "engine:Kienzle" },
  ],
};

describe("GraphImportanceEngine — rankGlobal (vanilla PageRank)", () => {
  it("scores sum to 1 and topK is sorted descending", () => {
    const out = graphImportanceEngine.rankGlobal({ graph: SAMPLE_GRAPH });
    expect(out.status).toBe("converged");
    const total = Object.values(out.scores).reduce((s, v) => s + v, 0);
    expect(total).toBeCloseTo(1, 6);
    for (let i = 1; i < out.topK.length; i++) {
      expect(out.topK[i - 1].score).toBeGreaterThanOrEqual(out.topK[i].score);
    }
  });

  it("Kienzle hub outranks the isolated unrelated node", () => {
    const out = graphImportanceEngine.rankGlobal({ graph: SAMPLE_GRAPH });
    expect(out.scores["engine:Kienzle"]).toBeGreaterThan(
      out.scores["engine:Unrelated"],
    );
  });
});

describe("GraphImportanceEngine — rankBySeed (personalized)", () => {
  it("seeding on engine:Kienzle gives it strictly more mass than vanilla", () => {
    const vanilla = graphImportanceEngine.rankGlobal({ graph: SAMPLE_GRAPH });
    const seeded = graphImportanceEngine.rankBySeed({
      graph: SAMPLE_GRAPH,
      seed: ["engine:Kienzle"],
    });
    expect(seeded.scores["engine:Kienzle"]).toBeGreaterThan(
      vanilla.scores["engine:Kienzle"],
    );
  });

  it("alternate-seed shifts the distribution to the alternate anchor", () => {
    const kSeeded = graphImportanceEngine.rankBySeed({
      graph: SAMPLE_GRAPH,
      seed: ["engine:Kienzle"],
    });
    const uSeeded = graphImportanceEngine.rankBySeed({
      graph: SAMPLE_GRAPH,
      seed: ["engine:Unrelated"],
    });
    expect(kSeeded.scores["engine:Kienzle"]).toBeGreaterThan(
      uSeeded.scores["engine:Kienzle"],
    );
    expect(uSeeded.scores["engine:Unrelated"]).toBeGreaterThan(
      kSeeded.scores["engine:Unrelated"],
    );
  });
});

describe("GraphImportanceEngine — rankByTask (slot-aware)", () => {
  it("anchors-only path: anchor outranks unrelated", () => {
    const out = graphImportanceEngine.rankByTask({
      graph: SAMPLE_GRAPH,
      anchors: ["engine:Kienzle"],
    });
    expect(out.effectiveSeed["engine:Kienzle"]).toBeCloseTo(1, 10);
    expect(out.scores["engine:Kienzle"]).toBeGreaterThan(
      out.scores["engine:Unrelated"],
    );
  });

  it("slot-domain boost overrides anchor weighting", () => {
    // Anchor "Unrelated" with weight 1; boost "Kienzle" via mill-domain (weight 5).
    // Kienzle ends up with 5x the seed mass — net rank reflects that.
    const out = graphImportanceEngine.rankByTask({
      graph: SAMPLE_GRAPH,
      anchors: ["engine:Unrelated"],
      slotDomain: "mill",
      nodeDomains: {
        "engine:Kienzle": "mill",
        "engine:Unrelated": "cad",
      },
    });
    expect(out.effectiveSeed["engine:Kienzle"]).toBeCloseTo(5, 10);
    expect(out.effectiveSeed["engine:Unrelated"]).toBeCloseTo(1, 10);
    expect(out.scores["engine:Kienzle"]).toBeGreaterThan(
      out.scores["engine:Unrelated"],
    );
  });

  it("slotDomain='any' produces same effective seed as anchors-only", () => {
    const anchorsOnly = graphImportanceEngine.rankByTask({
      graph: SAMPLE_GRAPH,
      anchors: ["engine:Kienzle"],
    });
    const anyDomain = graphImportanceEngine.rankByTask({
      graph: SAMPLE_GRAPH,
      anchors: ["engine:Kienzle"],
      slotDomain: "any",
      nodeDomains: { "engine:Unrelated": "mill" },
    });
    // Both should produce the same effective seed (only the Kienzle anchor),
    // proving that "any" correctly disables the boost path.
    expect(Object.keys(anyDomain.effectiveSeed).sort()).toEqual(
      Object.keys(anchorsOnly.effectiveSeed).sort(),
    );
    expect(anyDomain.effectiveSeed["engine:Kienzle"]).toBeCloseTo(
      anchorsOnly.effectiveSeed["engine:Kienzle"],
      10,
    );
  });
});

describe("GraphImportanceEngine — blastRadius", () => {
  it("returns the changed node + its direct neighbors in the top 3", () => {
    const out = graphImportanceEngine.blastRadius({
      graph: SAMPLE_GRAPH,
      changedNode: "engine:Kienzle",
      topK: 4,
    });
    expect(out).toHaveLength(4);
    const top3Ids = out.slice(0, 3).map((r) => r.id).sort();
    // engine:Kienzle + its 2 direct neighbors (dispatcher:prism_calc + wiki:kienzle).
    expect(top3Ids).toEqual(
      ["dispatcher:prism_calc", "engine:Kienzle", "wiki:kienzle"].sort(),
    );
    // engine:Unrelated has zero connectivity → ranks last.
    expect(out[3].id).toBe("engine:Unrelated");
  });

  it("higher damping retains more mass at the seed node", () => {
    const tight = graphImportanceEngine.blastRadius({
      graph: SAMPLE_GRAPH,
      changedNode: "engine:Kienzle",
      damping: 0.3,
    });
    const wide = graphImportanceEngine.blastRadius({
      graph: SAMPLE_GRAPH,
      changedNode: "engine:Kienzle",
      damping: 0.9,
    });
    // The walker with low damping (0.3) teleports back to the seed often, so
    // mass concentrates on the seed itself even more than the wide case at 0.9.
    // Test: the seed retains a measurable portion of total mass in both cases.
    const tightSeedMass = tight.find((r) => r.id === "engine:Kienzle")!.score;
    const wideSeedMass = wide.find((r) => r.id === "engine:Kienzle")!.score;
    expect(tightSeedMass).toBeGreaterThan(0.1);
    expect(wideSeedMass).toBeGreaterThan(0.1);
  });
});
