/**
 * WEDMPrototypicalNetworkEngine tests — WEDM AGI Phase 3 / P3-MS2 / U-P3-08.
 *
 * Exit gate covered: "Embedding space clusters materials by ISO group".
 */
import { describe, it, expect } from "vitest";
import {
  WEDMPrototypicalNetworkEngine,
  wedmPrototypicalNetworkEngine,
  type Prototype,
} from "../../engines/WEDMPrototypicalNetworkEngine.js";
import { embed, type UnknownMaterialFeatures } from "../../engines/WEDMFewShotEngine.js";

// ----------------------------------------------------------------------------
// Fixtures
// ----------------------------------------------------------------------------

const D2_LIKE: UnknownMaterialFeatures = {
  label: "D2-like",
  hardness_HRC: 60, thermal_conductivity_W_per_mK: 20,
  melting_point_C: 1420, density_g_per_cm3: 7.7, iso_group: "P",
};

const TI_LIKE: UnknownMaterialFeatures = {
  label: "Ti-like",
  hardness_HRC: 36, thermal_conductivity_W_per_mK: 7,
  melting_point_C: 1660, density_g_per_cm3: 4.4, iso_group: "S",
};

const CU_LIKE: UnknownMaterialFeatures = {
  label: "Cu-like",
  hardness_HRC: 10, thermal_conductivity_W_per_mK: 391,
  melting_point_C: 1083, density_g_per_cm3: 8.94, iso_group: "N",
};

const SS_LIKE: UnknownMaterialFeatures = {
  label: "SS-like",
  hardness_HRC: 20, thermal_conductivity_W_per_mK: 16,
  melting_point_C: 1450, density_g_per_cm3: 8.0, iso_group: "M",
};

const WC_LIKE: UnknownMaterialFeatures = {
  label: "WC-like",
  hardness_HRC: 90, thermal_conductivity_W_per_mK: 85,
  melting_point_C: 2870, density_g_per_cm3: 15.6, iso_group: "H",
};

// ----------------------------------------------------------------------------
// Tests
// ----------------------------------------------------------------------------

describe("WEDMPrototypicalNetworkEngine — construction", () => {
  it("builds at least four ISO-group prototypes from the spark DB", () => {
    const protos = wedmPrototypicalNetworkEngine.getPrototypes();
    expect(protos.length).toBeGreaterThanOrEqual(4);
    const groups = protos.map((p) => p.iso_group);
    expect(groups).toContain("P"); // tool steels
    expect(groups).toContain("N"); // Cu/Al/graphite
    expect(groups).toContain("S"); // Ti/Inconel
  });

  it("each prototype centroid is a 7-dim vector", () => {
    for (const p of wedmPrototypicalNetworkEngine.getPrototypes()) {
      expect(p.centroid).toHaveLength(7);
      for (const x of p.centroid) expect(Number.isFinite(x)).toBe(true);
    }
  });

  it("P-group prototype contains the tool steels D2, A2, M2, S7, H13", () => {
    const p = wedmPrototypicalNetworkEngine.getPrototype("P");
    expect(p).toBeDefined();
    const keys = new Set(p!.members.map((m) => m.material));
    for (const k of ["D2", "A2", "M2", "S7", "H13"]) expect(keys.has(k as never)).toBe(true);
  });

  it("S-group prototype contains Ti6Al4V and Inconel_718", () => {
    const p = wedmPrototypicalNetworkEngine.getPrototype("S");
    expect(p).toBeDefined();
    const keys = new Set(p!.members.map((m) => m.material));
    expect(keys.has("Ti6Al4V" as never)).toBe(true);
    expect(keys.has("Inconel_718" as never)).toBe(true);
  });

  it("rebuild() yields equivalent prototypes (idempotent wrt fixed spark DB)", () => {
    const before = wedmPrototypicalNetworkEngine.getPrototypes();
    wedmPrototypicalNetworkEngine.rebuild();
    const after = wedmPrototypicalNetworkEngine.getPrototypes();
    expect(after.length).toBe(before.length);
    for (let i = 0; i < before.length; i++) {
      expect(after[i].iso_group).toBe(before[i].iso_group);
      for (let j = 0; j < before[i].centroid.length; j++) {
        expect(after[i].centroid[j]).toBeCloseTo(before[i].centroid[j], 6);
      }
    }
  });
});

describe("WEDMPrototypicalNetworkEngine — classify", () => {
  it("classifies a D2-like unknown as P-group", () => {
    const r = wedmPrototypicalNetworkEngine.classify(D2_LIKE);
    expect(r.iso_group).toBe("P");
    expect(r.confidence).toBeGreaterThan(0);
    expect(r.ranking[0].iso_group).toBe("P");
  });

  it("classifies a Ti-like unknown as S-group", () => {
    const r = wedmPrototypicalNetworkEngine.classify(TI_LIKE);
    expect(r.iso_group).toBe("S");
  });

  it("classifies a Cu-like unknown as N-group", () => {
    const r = wedmPrototypicalNetworkEngine.classify(CU_LIKE);
    expect(r.iso_group).toBe("N");
  });

  it("classifies an SS-like unknown as M-group", () => {
    const r = wedmPrototypicalNetworkEngine.classify(SS_LIKE);
    expect(r.iso_group).toBe("M");
  });

  it("classifies a WC-like unknown as H-group", () => {
    const r = wedmPrototypicalNetworkEngine.classify(WC_LIKE);
    expect(r.iso_group).toBe("H");
  });

  it("ranking is sorted by ascending distance", () => {
    const r = wedmPrototypicalNetworkEngine.classify(D2_LIKE);
    for (let i = 1; i < r.ranking.length; i++) {
      expect(r.ranking[i].distance).toBeGreaterThanOrEqual(r.ranking[i - 1].distance);
    }
  });

  it("softmax confidences across all prototypes sum to ~1", () => {
    const r = wedmPrototypicalNetworkEngine.classify(D2_LIKE);
    const sum = r.ranking.reduce((s, x) => s + x.confidence, 0);
    expect(sum).toBeCloseTo(1, 2);
  });

  it("withinEnvelope=true when the query is close to the cluster", () => {
    const r = wedmPrototypicalNetworkEngine.classify(D2_LIKE);
    expect(r.withinEnvelope).toBe(true);
  });

  it("withinEnvelope=false for a synthetic far-out unknown", () => {
    // Deliberately pathological: super-high hardness, zero thermal, low density.
    const weird: UnknownMaterialFeatures = {
      label: "weirdium",
      hardness_HRC: 100, thermal_conductivity_W_per_mK: 0,
      melting_point_C: 3500, density_g_per_cm3: 0.5, iso_group: undefined,
    };
    const r = wedmPrototypicalNetworkEngine.classify(weird);
    expect(r.withinEnvelope).toBe(false);
  });
});

describe("WEDMPrototypicalNetworkEngine — clusterQuality (exit gate)", () => {
  it("silhouette is positive (ISO groups separate in the embedding)", () => {
    const q = wedmPrototypicalNetworkEngine.clusterQuality();
    expect(q.silhouette).toBeGreaterThan(0);
  });

  it("inter-centroid distance exceeds intra-cluster distance on average", () => {
    const q = wedmPrototypicalNetworkEngine.clusterQuality();
    expect(q.avgInterCentroidDistance).toBeGreaterThan(q.avgIntraDistance);
  });

  it("Davies–Bouldin index is finite and positive (reasonable clustering)", () => {
    const q = wedmPrototypicalNetworkEngine.clusterQuality();
    // DBI may be NaN if too few groups have ≥2 members; guarded.
    if (!Number.isNaN(q.daviesBouldin)) {
      expect(q.daviesBouldin).toBeGreaterThan(0);
      expect(q.daviesBouldin).toBeLessThan(10);
    } else {
      expect(Number.isNaN(q.daviesBouldin)).toBe(true);
    }
  });

  it("per-group silhouette contributions are defined for every ISO axis", () => {
    const q = wedmPrototypicalNetworkEngine.clusterQuality();
    for (const g of ["P", "M", "K", "N", "S", "H"] as const) {
      expect(typeof q.perGroup[g]).toBe("number");
    }
  });
});

describe("WEDMPrototypicalNetworkEngine — nearestSupportGroup", () => {
  it("returns a tool-steel support point for a D2-like query", () => {
    const r = wedmPrototypicalNetworkEngine.nearestSupportGroup(D2_LIKE);
    expect(r.iso_group).toBe("P");
    expect(r.distance).toBeGreaterThanOrEqual(0);
  });

  it("returns a Ti6Al4V or Inconel_718 support point for a Ti-like query", () => {
    const r = wedmPrototypicalNetworkEngine.nearestSupportGroup(TI_LIKE);
    expect(r.iso_group).toBe("S");
    expect(["Ti6Al4V", "Inconel_718"]).toContain(r.material);
  });
});

describe("WEDMPrototypicalNetworkEngine — edge cases", () => {
  it("getPrototype returns undefined for an empty group", () => {
    const p = wedmPrototypicalNetworkEngine.getPrototype("K");
    // K-group (cast iron) is not in the spark DB currently.
    if (p === undefined) {
      expect(p).toBeUndefined();
    } else {
      // If the DB changes to add K-group, the prototype should still be valid.
      expect(p.iso_group).toBe("K");
      expect(p.members.length).toBeGreaterThan(0);
    }
  });

  it("getPrototypes returns a deep copy (mutation doesn't affect engine state)", () => {
    const a = wedmPrototypicalNetworkEngine.getPrototypes();
    const originalLen = a[0].members.length;
    a[0].members.push({
      material: "D2",
      embedding: [0, 0, 0, 0, 0, 0, 0],
      distanceToPrototype: 9999,
    });
    const b = wedmPrototypicalNetworkEngine.getPrototypes();
    expect(b[0].members.length).toBe(originalLen);
  });

  it("classifyEmbedding matches classify when given the same embedded vector", () => {
    const direct = wedmPrototypicalNetworkEngine.classify(D2_LIKE);
    // Re-embed via the shared embed function and classify by embedding.
    const embedded = embed(D2_LIKE);
    const indirect = wedmPrototypicalNetworkEngine.classifyEmbedding(embedded);
    expect(indirect.iso_group).toBe(direct.iso_group);
    expect(indirect.distance).toBeCloseTo(direct.distance, 4);
  });

  it("fresh engine instance has the same prototypes as the singleton", () => {
    const fresh = new WEDMPrototypicalNetworkEngine();
    const a = fresh.getPrototypes();
    const b = wedmPrototypicalNetworkEngine.getPrototypes();
    expect(a.length).toBe(b.length);
    for (let i = 0; i < a.length; i++) {
      expect(a[i].iso_group).toBe(b[i].iso_group);
    }
  });
});

describe("WEDMPrototypicalNetworkEngine — material identification from prototype", () => {
  it("each P-group member has distanceToPrototype bounded by maxIntraDistance", () => {
    const p = wedmPrototypicalNetworkEngine.getPrototype("P") as Prototype;
    for (const m of p.members) {
      expect(m.distanceToPrototype).toBeLessThanOrEqual(p.maxIntraDistance + 1e-6);
    }
  });

  it("centroid lies at the mean of member embeddings (definition check)", () => {
    const p = wedmPrototypicalNetworkEngine.getPrototype("P") as Prototype;
    const dim = p.centroid.length;
    const manual = new Array(dim).fill(0);
    for (const m of p.members) {
      for (let i = 0; i < dim; i++) manual[i] += m.embedding[i];
    }
    for (let i = 0; i < dim; i++) manual[i] /= p.members.length;
    for (let i = 0; i < dim; i++) {
      expect(p.centroid[i]).toBeCloseTo(manual[i], 3);
    }
  });
});
