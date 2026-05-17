/**
 * dispatcher.infiniteConditionCombinator.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-ICC (InfiniteConditionCombinatorEngine).
 *
 * 5 pure-read surfaces driven through real `prism_dev`:
 *   icc_calculate_similarity      → pure math on 2 condition vectors
 *   icc_find_similar              → read knowledge map, filter+sort+cap
 *   icc_interpolate               → weighted-average / hierarchical-bayes
 *   icc_get_coverage_statistics   → aggregate counts
 *   icc_export                    → snapshot of all entries
 *
 * DEFERRED:
 *   - recordKnowledge(): mutates singleton knowledge Map; ML-training-
 *     data-corruption class (LLM-callable would let any chat poison
 *     the condition→parameter base with crafted outcomes).
 *   - import(): replaces the whole knowledge base; same risk class.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { infiniteConditionCombinatorEngine } from "../engines/InfiniteConditionCombinatorEngine.js";

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

const VEC_4140 = {
  material: "4140", geometry: "shaft", machine: "VTC-800",
  tool: "carbide_endmill", operation: "roughing",
};
const VEC_4340 = {
  material: "4340", geometry: "shaft", machine: "VTC-800",
  tool: "carbide_endmill", operation: "roughing",
};
const VEC_DIFF = {
  material: "6061", geometry: "block", machine: "VF-2",
  tool: "hsm_endmill", operation: "finishing",
};

beforeAll(() => {
  const srv = makeStubServer();
  registerDevDispatcher(srv as unknown as Parameters<typeof registerDevDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_dev");
  if (!t) throw new Error("prism_dev not registered");
  devHandler = t.handler;
});

describe("WIRE-UNWIRED-MS0/U-WIRE-ICC — Zod schemas", () => {
  it("icc_calculate_similarity requires v1 + v2 with all 5 string dims", () => {
    expect(ACTION_DEV_SCHEMAS["icc_calculate_similarity"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["icc_calculate_similarity"].safeParse({
      v1: VEC_4140, v2: VEC_4340,
    }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["icc_calculate_similarity"].safeParse({
      v1: { ...VEC_4140, material: "" }, v2: VEC_4340,
    }).success).toBe(false);
  });

  it("icc_find_similar caps limit at 100 (DoS)", () => {
    expect(ACTION_DEV_SCHEMAS["icc_find_similar"].safeParse({
      vector: VEC_4140, limit: 101,
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["icc_find_similar"].safeParse({
      vector: VEC_4140, limit: 100,
    }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["icc_find_similar"].safeParse({
      vector: VEC_4140,
    }).success).toBe(true);
  });

  it("icc_interpolate + icc_get_coverage_statistics + icc_export schemas accept canonical inputs", () => {
    expect(ACTION_DEV_SCHEMAS["icc_interpolate"].safeParse({
      targetVector: VEC_4140,
    }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["icc_get_coverage_statistics"].safeParse({}).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["icc_export"].safeParse({}).success).toBe(true);
  });

  it("icc_calculate_similarity rejects oversize string fields (>128 chars; DoS)", () => {
    expect(ACTION_DEV_SCHEMAS["icc_calculate_similarity"].safeParse({
      v1: { ...VEC_4140, material: "x".repeat(129) }, v2: VEC_4340,
    }).success).toBe(false);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-ICC — prism_dev :: icc_calculate_similarity", () => {
  it("identical vectors -> similarity 1.0 (engine line 158 = matches/5)", async () => {
    const r = await invokeHandler(devHandler, "icc_calculate_similarity", { v1: VEC_4140, v2: VEC_4140 });
    expect(r.similarity).toBe(1.0);
  });

  it("same-family materials (4140<->4340 carbon steels) raise similarity above pure-mismatch (engine line 167)", async () => {
    const r = await invokeHandler(devHandler, "icc_calculate_similarity", { v1: VEC_4140, v2: VEC_4340 });
    // Same family on material (0.5/5=0.1) + identical geometry/machine/tool/operation (4/5=0.8)
    // -> total 0.9. NOT exact 1.0 because material strings differ.
    const sim = r.similarity as number;
    expect(sim).toBeGreaterThan(0.85);
    expect(sim).toBeLessThan(1.0);
  });

  it("completely different vectors -> low similarity in [0, 0.5]", async () => {
    const r = await invokeHandler(devHandler, "icc_calculate_similarity", { v1: VEC_4140, v2: VEC_DIFF });
    const sim = r.similarity as number;
    expect(sim).toBeGreaterThanOrEqual(0);
    expect(sim).toBeLessThanOrEqual(0.5);
  });

  it("VARIABILITY — 3 distinct vector pairs all produce similarity in [0,1]", async () => {
    const pairs = [
      [VEC_4140, VEC_4140],
      [VEC_4140, VEC_4340],
      [VEC_4140, VEC_DIFF],
    ];
    for (const [a, b] of pairs) {
      const r = await invokeHandler(devHandler, "icc_calculate_similarity", { v1: a, v2: b });
      const sim = r.similarity as number;
      expect(sim).toBeGreaterThanOrEqual(0);
      expect(sim).toBeLessThanOrEqual(1);
    }
  });

  it("ROUTING PROOF — wire similarity exactly equals engine-direct calculateSimilarity()", async () => {
    const r = await invokeHandler(devHandler, "icc_calculate_similarity", { v1: VEC_4140, v2: VEC_4340 });
    const direct = infiniteConditionCombinatorEngine.calculateSimilarity(VEC_4140, VEC_4340);
    expect(r.similarity).toBe(direct);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-ICC — prism_dev :: icc_find_similar", () => {
  it("returns matches array + count parity (typically empty in fresh test env)", async () => {
    const r = await invokeHandler(devHandler, "icc_find_similar", { vector: VEC_4140, limit: 5 });
    const matches = (r.matches as unknown[] | undefined) ?? [];
    expect((r.count as number | undefined) ?? 0).toBe(matches.length);
  });

  it("ROUTING PROOF — wire count equals engine-direct findSimilar().length", async () => {
    const r = await invokeHandler(devHandler, "icc_find_similar", { vector: VEC_4140, limit: 5 });
    const direct = infiniteConditionCombinatorEngine.findSimilar(VEC_4140, 5);
    expect((r.count as number | undefined) ?? 0).toBe(direct.length);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-ICC — prism_dev :: icc_interpolate", () => {
  it("returns interpolation with method discriminator + parameter_count + based_on_count", async () => {
    const r = await invokeHandler(devHandler, "icc_interpolate", { targetVector: VEC_4140 });
    expect(["weighted_average", "hierarchical_bayes"]).toContain(r.method);
    const interp = (r as { interpolation: { predictedParameters: Record<string, unknown>; basedOn: unknown[] } }).interpolation;
    expect((r.parameter_count as number | undefined) ?? 0).toBe(Object.keys(interp.predictedParameters).length);
    const basedOn = interp.basedOn ?? [];
    expect((r.based_on_count as number | undefined) ?? 0).toBe(basedOn.length);
  });

  it("empty knowledge base -> hierarchical_bayes method (engine line 218-219 fallback)", async () => {
    const r = await invokeHandler(devHandler, "icc_interpolate", { targetVector: VEC_4140 });
    // When findSimilar returns 0 matches, engine falls back to
    // hierarchicalInterpolate which returns method='hierarchical_bayes'.
    // In a fresh test env knowledge base is empty so this is what should fire.
    const directSim = infiniteConditionCombinatorEngine.findSimilar(VEC_4140, 10);
    if (directSim.length === 0) {
      expect(r.method).toBe("hierarchical_bayes");
    }
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-ICC — prism_dev :: icc_get_coverage_statistics + icc_export", () => {
  it("get_coverage_statistics returns 4 count fields + hierarchyCoverage record", async () => {
    const r = await invokeHandler(devHandler, "icc_get_coverage_statistics", {});
    const stats = (r as { stats: { totalCombinations: number; uniqueMaterials: number; uniqueMachines: number; uniqueOperations: number; hierarchyCoverage: Record<string, number> } }).stats;
    expect(typeof stats.totalCombinations).toBe("number");
    expect(typeof stats.uniqueMaterials).toBe("number");
    expect(typeof stats.uniqueMachines).toBe("number");
    expect(typeof stats.uniqueOperations).toBe("number");
    expect(typeof stats.hierarchyCoverage).toBe("object");
    expect(stats.totalCombinations).toBeGreaterThanOrEqual(0);
  });

  it("export returns entries array + count parity", async () => {
    const r = await invokeHandler(devHandler, "icc_export", {});
    const entries = (r.entries as unknown[] | undefined) ?? [];
    expect((r.count as number | undefined) ?? 0).toBe(entries.length);
  });

  it("ROUTING PROOF — export.count equals get_coverage_statistics.totalCombinations (cross-method invariant)", async () => {
    const stats = await invokeHandler(devHandler, "icc_get_coverage_statistics", {});
    const exp = await invokeHandler(devHandler, "icc_export", {});
    const totalCombos = (stats as { stats: { totalCombinations: number } }).stats.totalCombinations;
    const exportCount = (exp.count as number | undefined) ?? 0;
    expect(exportCount).toBe(totalCombos);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-ICC — error envelope", () => {
  it("icc_calculate_similarity without v2 → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "icc_calculate_similarity", { v1: VEC_4140 });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("icc_find_similar with limit > 100 → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "icc_find_similar", { vector: VEC_4140, limit: 9999 });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("icc_interpolate with empty material → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "icc_interpolate", {
      targetVector: { ...VEC_4140, material: "" },
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });
});
