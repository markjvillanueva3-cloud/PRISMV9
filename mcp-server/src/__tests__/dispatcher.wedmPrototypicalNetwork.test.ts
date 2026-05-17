/**
 * dispatcher.wedmPrototypicalNetwork.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-WPN (WEDMPrototypicalNetworkEngine).
 *
 * 4 pure-compute actions through real `prism_dev`:
 *   wpn_classify         → classify(features) — softmax ISO-group match
 *   wpn_cluster_quality  → clusterQuality() — silhouette + DBI diagnostics
 *   wpn_get_prototypes   → getPrototypes() — copy of prototype set
 *   wpn_nearest_support  → nearestSupportGroup(features) — OOD signal
 *
 * No state mutation in any wired path.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { wedmPrototypicalNetworkEngine } from "../engines/WEDMPrototypicalNetworkEngine.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

function makeStubServer(): {
  tools: CapturedTool[];
  tool: (name: string, desc: string, schema: unknown, h: CapturedTool["handler"]) => void;
} {
  const tools: CapturedTool[] = [];
  return {
    tools,
    tool(name, _desc, _schema, handler) { tools.push({ name, handler }); },
  };
}

async function invokeHandler(
  handler: CapturedTool["handler"],
  action: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const res = (await handler({ action, params })) as Record<string, unknown>;
  if (Array.isArray((res as { content?: unknown[] }).content)) {
    const text = ((res as { content: Array<{ text?: string }> }).content[0]?.text) ?? "";
    return JSON.parse(text) as Record<string, unknown>;
  }
  return res;
}

let devHandler: CapturedTool["handler"];

const D2_FEATURES = {
  label: "unknown-tool-steel",
  hardness_HRC: 60,
  thermal_conductivity_W_per_mK: 24,
  melting_point_C: 1420,
  density_g_per_cm3: 7.7,
};

const CU_FEATURES = {
  label: "unknown-copper",
  hardness_HRC: 10,
  thermal_conductivity_W_per_mK: 400,
  melting_point_C: 1085,
  density_g_per_cm3: 8.9,
};

const TI_FEATURES = {
  label: "unknown-titanium",
  hardness_HRC: 36,
  thermal_conductivity_W_per_mK: 7,
  melting_point_C: 1668,
  density_g_per_cm3: 4.43,
};

beforeAll(() => {
  const srv = makeStubServer();
  registerDevDispatcher(srv as unknown as Parameters<typeof registerDevDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_dev");
  if (!t) throw new Error("prism_dev not registered");
  devHandler = t.handler;
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WPN — Zod schemas", () => {
  it("wpn_classify requires label (other fields optional)", () => {
    expect(ACTION_DEV_SCHEMAS["wpn_classify"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["wpn_classify"].safeParse({ label: "x" }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["wpn_classify"].safeParse(D2_FEATURES).success).toBe(true);
  });

  it("wpn_classify caps physical dimensions (DoS guards)", () => {
    expect(ACTION_DEV_SCHEMAS["wpn_classify"].safeParse({
      ...D2_FEATURES, hardness_HRC: 101,
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["wpn_classify"].safeParse({
      ...D2_FEATURES, thermal_conductivity_W_per_mK: 1001,
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["wpn_classify"].safeParse({
      ...D2_FEATURES, melting_point_C: 5001,
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["wpn_classify"].safeParse({
      ...D2_FEATURES, density_g_per_cm3: 51,
    }).success).toBe(false);
  });

  it("wpn_classify rejects bad iso_group enum", () => {
    expect(ACTION_DEV_SCHEMAS["wpn_classify"].safeParse({
      ...D2_FEATURES, iso_group: "X",
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["wpn_classify"].safeParse({
      ...D2_FEATURES, iso_group: "P",
    }).success).toBe(true);
  });

  it("wpn_cluster_quality + wpn_get_prototypes accept empty object only (strict)", () => {
    expect(ACTION_DEV_SCHEMAS["wpn_cluster_quality"].safeParse({}).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["wpn_cluster_quality"].safeParse({ extra: 1 }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["wpn_get_prototypes"].safeParse({}).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["wpn_get_prototypes"].safeParse({ extra: 1 }).success).toBe(false);
  });

  it("wpn_nearest_support requires label (mirrors classify schema)", () => {
    expect(ACTION_DEV_SCHEMAS["wpn_nearest_support"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["wpn_nearest_support"].safeParse({ label: "x" }).success).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WPN — prism_dev :: wpn_classify", () => {
  it("returns iso_group + distance + confidence + ranking[] + withinEnvelope", async () => {
    const r = await invokeHandler(devHandler, "wpn_classify", D2_FEATURES);
    const res = (r as { result: { iso_group: string; distance: number; confidence: number; ranking: unknown[]; withinEnvelope: boolean } }).result;
    expect(["P", "M", "K", "N", "S", "H"]).toContain(res.iso_group);
    expect(res.distance).toBeGreaterThanOrEqual(0);
    expect(res.confidence).toBeGreaterThanOrEqual(0);
    expect(res.confidence).toBeLessThanOrEqual(1);
    expect(Array.isArray(res.ranking)).toBe(true);
    expect(typeof res.withinEnvelope).toBe("boolean");
  });

  it("softmax invariant — ranking probabilities sum to 1.0 ± 1e-3", async () => {
    const r = await invokeHandler(devHandler, "wpn_classify", D2_FEATURES);
    const ranking = (r as { result: { ranking: Array<{ confidence: number }> } }).result.ranking;
    const sum = ranking.reduce((s, x) => s + x.confidence, 0);
    expect(sum).toBeCloseTo(1.0, 3);
  });

  it("ranking is pre-sorted ascending by distance (engine line 223)", async () => {
    const r = await invokeHandler(devHandler, "wpn_classify", D2_FEATURES);
    const ranking = (r as { result: { ranking: Array<{ distance: number }> } }).result.ranking;
    for (let i = 1; i < ranking.length; i++) {
      expect(ranking[i].distance).toBeGreaterThanOrEqual(ranking[i - 1].distance);
    }
  });

  it("wire-level discriminators mirror engine result", async () => {
    const r = await invokeHandler(devHandler, "wpn_classify", D2_FEATURES);
    const res = (r as { result: { iso_group: string; ranking: unknown[]; withinEnvelope: boolean } }).result;
    expect(r.ranking_count).toBe(res.ranking.length);
    expect(r.within_envelope).toBe(res.withinEnvelope);
    expect(r.best_iso_group).toBe(res.iso_group);
  });

  it("DETERMINISM — same input twice returns identical iso_group + distance", async () => {
    const r1 = await invokeHandler(devHandler, "wpn_classify", D2_FEATURES);
    const r2 = await invokeHandler(devHandler, "wpn_classify", D2_FEATURES);
    const a = (r1 as { result: { iso_group: string; distance: number } }).result;
    const b = (r2 as { result: { iso_group: string; distance: number } }).result;
    expect(a.iso_group).toBe(b.iso_group);
    expect(a.distance).toBeCloseTo(b.distance, 6);
  });

  it("ROUTING PROOF — wire iso_group equals engine-direct classify().iso_group", async () => {
    const r = await invokeHandler(devHandler, "wpn_classify", D2_FEATURES);
    const direct = wedmPrototypicalNetworkEngine.classify(D2_FEATURES);
    expect((r as { result: { iso_group: string } }).result.iso_group).toBe(direct.iso_group);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WPN — prism_dev :: wpn_cluster_quality", () => {
  it("returns silhouette + perGroup + avgIntra + avgInter + daviesBouldin", async () => {
    const r = await invokeHandler(devHandler, "wpn_cluster_quality", {});
    const res = (r as { result: { silhouette: number; perGroup: Record<string, number>; avgIntraDistance: number; avgInterCentroidDistance: number; daviesBouldin: number | string } }).result;
    expect(res.silhouette).toBeGreaterThanOrEqual(-1);
    expect(res.silhouette).toBeLessThanOrEqual(1);
    expect(res.avgIntraDistance).toBeGreaterThanOrEqual(0);
    expect(res.avgInterCentroidDistance).toBeGreaterThanOrEqual(0);
    expect(typeof res.perGroup).toBe("object");
  });

  it("perGroup covers all 6 ISO groups (P/M/K/N/S/H)", async () => {
    const r = await invokeHandler(devHandler, "wpn_cluster_quality", {});
    const perGroup = (r as { result: { perGroup: Record<string, number> } }).result.perGroup;
    expect(Object.keys(perGroup).sort()).toEqual(["H", "K", "M", "N", "P", "S"]);
    expect(r.per_group_count).toBe(6);
  });

  it("dbi_is_finite discriminator matches daviesBouldin payload shape (NaN→'NaN' string)", async () => {
    const r = await invokeHandler(devHandler, "wpn_cluster_quality", {});
    const res = (r as { result: { daviesBouldin: number | string } }).result;
    if (r.dbi_is_finite === true) {
      expect(typeof res.daviesBouldin).toBe("number");
      expect(Number.isFinite(res.daviesBouldin as number)).toBe(true);
    } else {
      expect(res.daviesBouldin).toBe("NaN");
    }
  });

  it("ROUTING PROOF — wire silhouette equals engine-direct clusterQuality().silhouette", async () => {
    const r = await invokeHandler(devHandler, "wpn_cluster_quality", {});
    const direct = wedmPrototypicalNetworkEngine.clusterQuality();
    expect((r as { result: { silhouette: number } }).result.silhouette).toBeCloseTo(direct.silhouette, 4);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WPN — prism_dev :: wpn_get_prototypes", () => {
  it("returns prototype list + counts matching member structure", async () => {
    const r = await invokeHandler(devHandler, "wpn_get_prototypes", {});
    const protos = (r as { prototypes: Array<{ iso_group: string; centroid: number[]; members: unknown[]; maxIntraDistance: number }> }).prototypes;
    expect(Array.isArray(protos)).toBe(true);
    expect(protos.length).toBeGreaterThan(0);
    expect(r.prototype_count).toBe(protos.length);
    const total = protos.reduce((n, p) => n + p.members.length, 0);
    expect(r.total_member_count).toBe(total);
    expect(total).toBeGreaterThan(0);
  });

  it("each prototype has non-empty centroid + at least one member", async () => {
    const r = await invokeHandler(devHandler, "wpn_get_prototypes", {});
    const protos = (r as { prototypes: Array<{ centroid: number[]; members: Array<{ embedding: number[] }>; maxIntraDistance: number }> }).prototypes;
    for (const p of protos) {
      expect(p.centroid.length).toBeGreaterThan(0);
      expect(p.members.length).toBeGreaterThan(0);
      expect(p.maxIntraDistance).toBeGreaterThanOrEqual(0);
      for (const m of p.members) {
        expect(m.embedding.length).toBe(p.centroid.length);
      }
    }
  });

  it("ROUTING PROOF — wire prototype_count equals engine-direct getPrototypes().length", async () => {
    const r = await invokeHandler(devHandler, "wpn_get_prototypes", {});
    const direct = wedmPrototypicalNetworkEngine.getPrototypes();
    expect(r.prototype_count).toBe(direct.length);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WPN — prism_dev :: wpn_nearest_support", () => {
  it("returns iso_group + material + distance ≥ 0", async () => {
    const r = await invokeHandler(devHandler, "wpn_nearest_support", D2_FEATURES);
    const res = (r as { result: { iso_group: string; material: string; distance: number } }).result;
    expect(["P", "M", "K", "N", "S", "H"]).toContain(res.iso_group);
    expect(res.material.length).toBeGreaterThan(0);
    expect(res.distance).toBeGreaterThanOrEqual(0);
    expect(r.distance_non_negative).toBe(true);
  });

  it("VARIABILITY — D2/Cu/Ti yield ≥ 2 distinct material winners (7-dim embedding)", async () => {
    const inputs = [D2_FEATURES, CU_FEATURES, TI_FEATURES];
    const winners: string[] = [];
    for (const inp of inputs) {
      const r = await invokeHandler(devHandler, "wpn_nearest_support", inp);
      winners.push((r as { result: { material: string } }).result.material);
    }
    const distinct = new Set(winners);
    expect(distinct.size).toBeGreaterThanOrEqual(2);
  });

  it("DETERMINISM — same input twice returns identical triple", async () => {
    const r1 = await invokeHandler(devHandler, "wpn_nearest_support", D2_FEATURES);
    const r2 = await invokeHandler(devHandler, "wpn_nearest_support", D2_FEATURES);
    const a = (r1 as { result: { material: string; iso_group: string; distance: number } }).result;
    const b = (r2 as { result: { material: string; iso_group: string; distance: number } }).result;
    expect(a.material).toBe(b.material);
    expect(a.iso_group).toBe(b.iso_group);
    expect(a.distance).toBeCloseTo(b.distance, 6);
  });

  it("ROUTING PROOF — wire material equals engine-direct nearestSupportGroup().material", async () => {
    const r = await invokeHandler(devHandler, "wpn_nearest_support", D2_FEATURES);
    const direct = wedmPrototypicalNetworkEngine.nearestSupportGroup(D2_FEATURES);
    expect((r as { result: { material: string } }).result.material).toBe(direct.material);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WPN — error envelope", () => {
  it("wpn_classify without label → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "wpn_classify", {
      hardness_HRC: 60,
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("wpn_classify with oversize hardness_HRC → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "wpn_classify", {
      ...D2_FEATURES, hardness_HRC: 9999,
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("wpn_cluster_quality with extra params → strict schema rejects", async () => {
    const r = await invokeHandler(devHandler, "wpn_cluster_quality", {
      bogus_param: true,
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("wpn_nearest_support with invalid iso_group → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "wpn_nearest_support", {
      ...D2_FEATURES, iso_group: "INVALID",
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });
});
