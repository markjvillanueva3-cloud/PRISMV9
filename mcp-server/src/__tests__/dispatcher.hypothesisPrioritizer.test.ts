/**
 * dispatcher.hypothesisPrioritizer.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-HYP (HypothesisPrioritizerEngine).
 *
 * 3 read-only Bayesian-prior actions through real `prism_dev`:
 *   hyp_get_prior, hyp_prioritize, hyp_get_tribal_endorsements
 *
 * Engine-pair test pre-exists at HypothesisPrioritizerEngine.test.ts.
 *
 * DEFER (2 mutating methods):
 *   - updatePrior (class=ML-training-data-corruption — caller can
 *     poison Bayesian priors with fake outcome feedback)
 *   - resetForTests (test-only state-clear footgun)
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { hypothesisPrioritizerEngine } from "../engines/HypothesisPrioritizerEngine.js";

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

// 3 canonical hypotheses spanning conservative/aggressive/experimental styles.
const HYPOTHESES = [
  {
    id: "conservative_finish",
    description: "Conservative finishing pass with high stepover ratio",
    category: "strategy" as const,
    predicted_outcome: 0.7,
  },
  {
    id: "trochoidal_roughing",
    description: "Trochoidal roughing — high MRR, tool-friendly",
    category: "strategy" as const,
    predicted_outcome: 0.85,
  },
  {
    id: "aggressive_aluminum",
    description: "Aggressive feed rates for aluminum",
    category: "feed" as const,
    predicted_outcome: 0.9,
  },
];

beforeAll(() => {
  const srv = makeStubServer();
  registerDevDispatcher(srv as unknown as Parameters<typeof registerDevDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_dev");
  if (!t) throw new Error("prism_dev not registered");
  devHandler = t.handler;
});

describe("WIRE-UNWIRED-MS0/U-WIRE-HYP — Zod schemas", () => {
  it("hyp_get_prior requires id + material_iso_group + operation", () => {
    expect(ACTION_DEV_SCHEMAS["hyp_get_prior"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["hyp_get_prior"].safeParse({
      hypothesisId: "x", material_iso_group: "P", operation: "roughing",
    }).success).toBe(true);
  });

  it("hyp_get_prior rejects bad ISO group + operation enums", () => {
    expect(ACTION_DEV_SCHEMAS["hyp_get_prior"].safeParse({
      hypothesisId: "x", material_iso_group: "X", operation: "roughing",
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["hyp_get_prior"].safeParse({
      hypothesisId: "x", material_iso_group: "P", operation: "INVALID",
    }).success).toBe(false);
  });

  it("hyp_prioritize requires hypotheses[] (1-100) + context", () => {
    expect(ACTION_DEV_SCHEMAS["hyp_prioritize"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["hyp_prioritize"].safeParse({
      hypotheses: [], context: { material_iso_group: "P", operation: "roughing" },
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["hyp_prioritize"].safeParse({
      hypotheses: HYPOTHESES, context: { material_iso_group: "P", operation: "roughing" },
    }).success).toBe(true);
  });

  it("hyp_prioritize caps hypotheses at 100 (DoS)", () => {
    const huge = new Array(101).fill(HYPOTHESES[0]);
    expect(ACTION_DEV_SCHEMAS["hyp_prioritize"].safeParse({
      hypotheses: huge, context: { material_iso_group: "P", operation: "roughing" },
    }).success).toBe(false);
  });

  it("hyp_prioritize rejects predicted_outcome outside [0,1]", () => {
    expect(ACTION_DEV_SCHEMAS["hyp_prioritize"].safeParse({
      hypotheses: [{ ...HYPOTHESES[0], predicted_outcome: 1.5 }],
      context: { material_iso_group: "P", operation: "roughing" },
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["hyp_prioritize"].safeParse({
      hypotheses: [{ ...HYPOTHESES[0], predicted_outcome: -0.1 }],
      context: { material_iso_group: "P", operation: "roughing" },
    }).success).toBe(false);
  });

  it("hyp_get_tribal_endorsements is strict (rejects extra params)", () => {
    expect(ACTION_DEV_SCHEMAS["hyp_get_tribal_endorsements"].safeParse({
      hypothesisId: "x", extra: 1,
    }).success).toBe(false);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-HYP — prism_dev :: hyp_get_prior", () => {
  it("returns prior with probability ∈ [0.01, 0.99] (engine line 118 clamp)", async () => {
    const r = await invokeHandler(devHandler, "hyp_get_prior", {
      hypothesisId: "conservative_finish",
      material_iso_group: "P",
      operation: "roughing",
    });
    expect(r.found).toBe(true);
    const res = (r as { result: { prior_probability: number; confidence_interval: [number, number]; sources: string[] } }).result;
    expect(res.prior_probability).toBeGreaterThanOrEqual(0.01);
    expect(res.prior_probability).toBeLessThanOrEqual(0.99);
    expect(res.confidence_interval[0]).toBeLessThanOrEqual(res.confidence_interval[1]);
  });

  it("VARIABILITY — 3 ISO groups (P/S/H) yield distinct conservative prior values", async () => {
    const groups = ["P", "S", "H"];
    const priors: number[] = [];
    for (const g of groups) {
      const r = await invokeHandler(devHandler, "hyp_get_prior", {
        hypothesisId: "conservative_finish",
        material_iso_group: g,
        operation: "semi-finishing",
      });
      const res = (r as { result: { prior_probability: number } }).result;
      priors.push(res.prior_probability);
    }
    // DEFAULT_PRIORS (engine line 82-89): P.conservative=0.6, S.conservative=0.75, H.conservative=0.8
    // S and H should be higher than P for conservative style (harder mats favor conservative).
    expect(priors[1]).toBeGreaterThan(priors[0]);
    expect(priors[2]).toBeGreaterThanOrEqual(priors[1]);
  });

  it("ROUTING PROOF — wire prior_probability equals engine-direct getPrior()", async () => {
    const r = await invokeHandler(devHandler, "hyp_get_prior", {
      hypothesisId: "conservative_finish",
      material_iso_group: "P",
      operation: "roughing",
    });
    const direct = hypothesisPrioritizerEngine.getPrior("conservative_finish", {
      material_iso_group: "P",
      operation: "roughing",
    });
    const res = (r as { result: { prior_probability: number } }).result;
    expect(res.prior_probability).toBeCloseTo(direct?.prior_probability ?? -1, 6);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-HYP — prism_dev :: hyp_prioritize", () => {
  it("returns 3 ranked hypotheses sorted DESC by posterior_probability", async () => {
    const r = await invokeHandler(devHandler, "hyp_prioritize", {
      hypotheses: HYPOTHESES,
      context: { material_iso_group: "P", operation: "semi-finishing" },
    });
    const res = (r as { result: { ranked_hypotheses: Array<{ id: string; rank: number; posterior_probability: number }>; top_recommendation: string } }).result;
    expect(res.ranked_hypotheses.length).toBe(3);
    // Engine line 208: ranked.sort((a, b) => b.posterior_probability - a.posterior_probability);
    for (let i = 1; i < res.ranked_hypotheses.length; i++) {
      expect(res.ranked_hypotheses[i].posterior_probability)
        .toBeLessThanOrEqual(res.ranked_hypotheses[i - 1].posterior_probability);
    }
  });

  it("rank field is 1-indexed (engine line 209)", async () => {
    const r = await invokeHandler(devHandler, "hyp_prioritize", {
      hypotheses: HYPOTHESES,
      context: { material_iso_group: "P", operation: "roughing" },
    });
    const ranks = (r as { result: { ranked_hypotheses: Array<{ rank: number }> } }).result.ranked_hypotheses.map((h) => h.rank);
    expect(ranks).toEqual([1, 2, 3]);
  });

  it("top_recommendation matches ranked_hypotheses[0].description", async () => {
    const r = await invokeHandler(devHandler, "hyp_prioritize", {
      hypotheses: HYPOTHESES,
      context: { material_iso_group: "P", operation: "roughing" },
    });
    const res = (r as { result: { ranked_hypotheses: Array<{ description: string }>; top_recommendation: string } }).result;
    expect(res.top_recommendation).toBe(res.ranked_hypotheses[0].description);
    expect(r.top_recommendation).toBe(res.top_recommendation);
  });

  it("wire discriminators mirror engine result counts", async () => {
    const r = await invokeHandler(devHandler, "hyp_prioritize", {
      hypotheses: HYPOTHESES,
      context: { material_iso_group: "P", operation: "roughing" },
    });
    const res = (r as { result: { ranked_hypotheses: unknown[]; disagreement_flags: unknown[]; consensus_confidence: number } }).result;
    expect(r.ranked_count).toBe(res.ranked_hypotheses.length);
    expect(r.disagreement_count).toBe((res.disagreement_flags ?? []).length);
    expect(r.consensus_confidence).toBe(res.consensus_confidence);
  });

  it("VARIABILITY — 3 operations (roughing/semi/finishing) yield distinct top rankings or scores", async () => {
    const ops = ["roughing", "semi-finishing", "finishing"];
    const tops: Array<{ id: string; score: number }> = [];
    for (const op of ops) {
      const r = await invokeHandler(devHandler, "hyp_prioritize", {
        hypotheses: HYPOTHESES,
        context: { material_iso_group: "P", operation: op },
      });
      const res = (r as { result: { ranked_hypotheses: Array<{ id: string; posterior_probability: number }> } }).result;
      tops.push({ id: res.ranked_hypotheses[0].id, score: res.ranked_hypotheses[0].posterior_probability });
    }
    // Operation modifiers (engine line 91-95) shift conservative/aggressive priors.
    // Some op should yield a different top OR a meaningfully different score.
    const distinctScores = new Set(tops.map((t) => Math.round(t.score * 1000)));
    const distinctIds = new Set(tops.map((t) => t.id));
    expect(distinctScores.size >= 2 || distinctIds.size >= 2).toBe(true);
  });

  it("ROUTING PROOF — wire ranked_count equals engine-direct prioritize()", async () => {
    const r = await invokeHandler(devHandler, "hyp_prioritize", {
      hypotheses: HYPOTHESES,
      context: { material_iso_group: "P", operation: "roughing" },
    });
    const direct = hypothesisPrioritizerEngine.prioritize({
      hypotheses: HYPOTHESES,
      context: { material_iso_group: "P", operation: "roughing" },
    });
    expect(r.ranked_count).toBe(direct.ranked_hypotheses.length);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-HYP — prism_dev :: hyp_get_tribal_endorsements", () => {
  it("returns endorsements for known hypothesis (trochoidal_roughing has JM-MILL-004 + MIT-2.008-DYN)", async () => {
    const r = await invokeHandler(devHandler, "hyp_get_tribal_endorsements", {
      hypothesisId: "trochoidal_roughing",
    });
    expect(r.has_endorsements).toBe(true);
    expect((r.endorsement_count as number)).toBeGreaterThanOrEqual(2);
    const endorsements = (r as { endorsements: string[] }).endorsements;
    expect(endorsements).toContain("JM-MILL-004");
    expect(endorsements).toContain("MIT-2.008-DYN");
  });

  it("returns 0 endorsements for unknown hypothesis", async () => {
    const r = await invokeHandler(devHandler, "hyp_get_tribal_endorsements", {
      hypothesisId: "totally_unknown_hypothesis",
    });
    expect(r.has_endorsements).toBe(false);
    expect(r.endorsement_count).toBe(0);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-HYP — error envelope", () => {
  it("hyp_get_prior without hypothesisId → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "hyp_get_prior", {
      material_iso_group: "P", operation: "roughing",
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("hyp_get_prior with bad ISO group → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "hyp_get_prior", {
      hypothesisId: "x", material_iso_group: "Q", operation: "roughing",
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("hyp_prioritize with empty hypotheses array → schema rejects (min 1)", async () => {
    const r = await invokeHandler(devHandler, "hyp_prioritize", {
      hypotheses: [],
      context: { material_iso_group: "P", operation: "roughing" },
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("hyp_prioritize with predicted_outcome > 1 → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "hyp_prioritize", {
      hypotheses: [{ ...HYPOTHESES[0], predicted_outcome: 1.5 }],
      context: { material_iso_group: "P", operation: "roughing" },
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });
});
