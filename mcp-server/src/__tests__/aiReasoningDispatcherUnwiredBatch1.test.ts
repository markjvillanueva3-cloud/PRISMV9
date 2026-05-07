/**
 * E2E test for ENGINE-WIRE-AI-MS0/U-WIRE-AI-BATCH1 — 12 newly-wired AI engines.
 *
 * Verifies round-trip through the prism_ai dispatcher for each new action,
 * with concrete assertions on engine output shape and values.
 */
import { describe, it, expect } from "vitest";
import { executeAIReasoningAction } from "../tools/dispatchers/aiReasoningDispatcher.js";

const KIENZLE_KC11_P_GROUP_MPA = 2100;
const TEST_FZ_MM_PER_TOOTH = 0.15;
const PREDICTION_M1 = 245.0;
const PREDICTION_M2 = 240.0;
const ANALOGY_LIMIT = 3;
const QUERY_LIMIT = 10;

describe("prism_ai — U-WIRE-AI-BATCH1 newly-wired engines", () => {
  it("cognitive_budget_allocate returns BudgetAllocation with depth tier and token cap", async () => {
    const r = await executeAIReasoningAction("cognitive_budget_allocate", {
      kind: "create",
      riskLevel: "high",
      touchesCriticalFile: true,
      expectedDependents: 5,
    });
    expect(r.success).toBe(true);
    const data = r.data as {
      depth: string;
      maxTokens: number;
      allowSimulation: boolean;
      allowMultiAgent: boolean;
      score: number;
    };
    expect(["shallow", "medium", "deep"]).toContain(data.depth);
    expect(data.maxTokens).toBeGreaterThan(0);
    // create + high risk + criticalFile = base 3 + risk 2 + criticalFileBoost 3 + 5*0.1 = 8.5
    expect(data.score).toBeGreaterThanOrEqual(8);
    // Critical-file high-risk create work should land in "deep" tier
    expect(data.depth).toBe("deep");
    expect(data.allowSimulation).toBe(true);
  });

  it("ensemble_register_member + ensemble_predict round-trip with weighted average check", async () => {
    const reg1 = await executeAIReasoningAction("ensemble_register_member", {
      member: { id: "m1", name: "MLP", type: "neural", domain: "force", weight: 1, active: true },
    });
    expect(reg1.success).toBe(true);
    const reg1d = reg1.data as { registered: boolean; total_members: number };
    expect(reg1d.registered).toBe(true);
    expect(reg1d.total_members).toBeGreaterThanOrEqual(1);

    const reg2 = await executeAIReasoningAction("ensemble_register_member", {
      member: { id: "m2", name: "Kienzle", type: "physics", domain: "force", weight: 1, active: true },
    });
    expect(reg2.success).toBe(true);

    const pred = await executeAIReasoningAction("ensemble_predict", {
      input: { m1: PREDICTION_M1, m2: PREDICTION_M2 },
      domain: "force",
    });
    expect(pred.success).toBe(true);
    const data = pred.data as {
      value: number;
      uncertainty: number;
      member_contributions: Array<{ member_id: string; prediction: number; weight: number }>;
    };
    expect(data.value).toBeGreaterThanOrEqual(PREDICTION_M2);
    expect(data.value).toBeLessThanOrEqual(PREDICTION_M1);
    expect(data.member_contributions.length).toBe(2);
    expect(data.uncertainty).toBeGreaterThanOrEqual(0);
  });

  it("neural_model_register + neural_model_list round-trip with valid ModelCheckpoint", async () => {
    const uniqueId = `test-model-batch1-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const reg = await executeAIReasoningAction("neural_model_register", {
      checkpoint: {
        modelId: uniqueId,
        version: "1.0.0",
        schemaVersion: 1,
        architecture: "MLP",
        parameterCount: 12345,
        weights: [],
        config: { layers: [16, 8, 1] },
        trainingMetadata: {
          datasetSize: 1000,
          epochs: 50,
          finalLoss: 0.02,
          trainedAt: new Date().toISOString(),
        },
        deploymentStatus: "candidate",
      },
    });
    expect(reg.success).toBe(true);
    const regData = reg.data as { ok: boolean; checkpoint?: { modelId: string; version: string }; error?: string };
    expect(regData.ok).toBe(true);
    expect(regData.checkpoint?.modelId).toBe(uniqueId);
    expect(regData.checkpoint?.version).toBe("1.0.0");

    const list = await executeAIReasoningAction("neural_model_list", { filter: {} });
    expect(list.success).toBe(true);
    const models = list.data as Array<{ modelId: string }>;
    expect(Array.isArray(models)).toBe(true);
    const found = models.find((m) => m.modelId === uniqueId);
    expect(found?.modelId).toBe(uniqueId);
  });

  it("reasoning_chain_register + reasoning_chain_query finds chains within confidence floor", async () => {
    const chain = {
      chain_id: "rc-batch1-feed",
      problem: "Compute optimal feed for steel roughing in batch1 test",
      goal: "Determine fz given Kienzle force model and spindle limits",
      steps: [
        {
          step_id: "s1",
          step_number: 1,
          type: "deduction" as const,
          content: `Look up Kienzle kc1.1 for P-group (${KIENZLE_KC11_P_GROUP_MPA} MPa)`,
          premises: ["material is P-group steel"],
          confidence: 0.9,
          timestamp: new Date().toISOString(),
        },
      ],
      current_confidence: 0.85,
      dead_ends: [],
      total_time_ms: 150,
      meta: {
        strategy: "linear" as const,
        max_depth: 3,
        backtrack_count: 0,
        branch_count: 1,
        pruned_branches: 0,
      },
    };
    const reg = await executeAIReasoningAction("reasoning_chain_register", {
      chain,
      createdBy: "test-agent-batch1",
      domain: "mill",
      tags: ["roughing", "steel"],
    });
    expect(reg.success).toBe(true);
    const regData = reg.data as { chain_id?: string; confidence?: number; agent_id?: string };
    expect(typeof regData.confidence === "number" || typeof regData.agent_id === "string").toBe(true);

    const MIN_CONFIDENCE_FLOOR = 0.5;
    const query = await executeAIReasoningAction("reasoning_chain_query", {
      problem: "feed",
      minConfidence: MIN_CONFIDENCE_FLOOR,
      limit: QUERY_LIMIT,
    });
    expect(query.success).toBe(true);
    const matches = query.data as Array<{ confidence: number }>;
    expect(Array.isArray(matches)).toBe(true);
    for (const m of matches) {
      expect(m.confidence).toBeGreaterThanOrEqual(MIN_CONFIDENCE_FLOOR);
    }
  });

  it("reasoning_explain returns a structured Explanation with non-empty summary", async () => {
    const r = await executeAIReasoningAction("reasoning_explain", {
      question: `Why feed=${TEST_FZ_MM_PER_TOOTH} mm/tooth?`,
      context: {
        recommendation: `Use fz=${TEST_FZ_MM_PER_TOOTH} mm/tooth for steel roughing`,
        calculation: {
          formula: "Fc = kc1_1 * ap * fz^(1-mc)",
          inputs: { kc1_1: KIENZLE_KC11_P_GROUP_MPA, ap: 3, fz: TEST_FZ_MM_PER_TOOTH },
          result: 850,
          unit: "N",
          source: "kienzle",
        },
      },
      audience: "machinist",
    });
    expect(r.success).toBe(true);
    const data = r.data as { summary: string; sections: Array<unknown>; wordCount: number };
    expect(data.summary.length).toBeGreaterThan(0);
    expect(Array.isArray(data.sections)).toBe(true);
    expect(data.wordCount).toBeGreaterThanOrEqual(0);
  });

  it("transfer_bridge_register + transfer_bridge_find_analogies returns ranked matches in score-desc order", async () => {
    const reg = await executeAIReasoningAction("transfer_bridge_register", {
      problem: {
        id: "tb-p1-batch1",
        domain: "milling",
        title: "chatter in deep pocket",
        description: "deep pocket roughing produced regenerative chatter at 6000 rpm",
        solution: "raised rpm into next stability lobe; reduced ap by 20%",
        tags: ["chatter", "pocket", "stability", "rpm"],
      },
    });
    expect(reg.success).toBe(true);
    const regData = reg.data as { registered: boolean; total: number };
    expect(regData.registered).toBe(true);
    expect(regData.total).toBeGreaterThanOrEqual(1);

    const ana = await executeAIReasoningAction("transfer_bridge_find_analogies", {
      query: "chatter in lathe boring bar at high spindle rpm",
      limit: ANALOGY_LIMIT,
    });
    expect(ana.success).toBe(true);
    const matches = ana.data as Array<{ score: number; rationale: string }>;
    expect(Array.isArray(matches)).toBe(true);
    expect(matches.length).toBeLessThanOrEqual(ANALOGY_LIMIT);
    for (let i = 1; i < matches.length; i++) {
      expect(matches[i - 1].score).toBeGreaterThanOrEqual(matches[i].score);
    }
  });

  it("memory_pressure_sample returns heapUtilization in [0,1] and a band tier", async () => {
    const s1 = await executeAIReasoningAction("memory_pressure_sample", {});
    expect(s1.success).toBe(true);
    const sample = s1.data as { heapUtilization: number; band: string; heapUsedMB: number };
    expect(typeof sample.heapUtilization).toBe("number");
    expect(sample.heapUtilization).toBeGreaterThanOrEqual(0);
    expect(sample.heapUtilization).toBeLessThanOrEqual(1);
    expect(["healthy", "warn", "critical"]).toContain(sample.band);
    expect(sample.heapUsedMB).toBeGreaterThan(0);
  });

  it("memory_pressure_trend returns aggregate stats with sample count after sampling", async () => {
    await executeAIReasoningAction("memory_pressure_sample", {});
    const trend = await executeAIReasoningAction("memory_pressure_trend", {});
    expect(trend.success).toBe(true);
    const t = trend.data as { average: number; rising: boolean; samples: number };
    expect(typeof t.average).toBe("number");
    expect(t.average).toBeGreaterThanOrEqual(0);
    expect(typeof t.rising).toBe("boolean");
    expect(t.samples).toBeGreaterThanOrEqual(1);
  });

  // ── Failure modes ────────────────────────────────────────────────
  it("rejects unknown action with descriptive error message", async () => {
    // @ts-expect-error - intentionally invalid for adversarial test
    const r = await executeAIReasoningAction("totally_made_up_action_xyz", {});
    expect(r.success).toBe(false);
    expect(typeof r.error).toBe("string");
    expect((r.error ?? "").length).toBeGreaterThan(0);
  });

  it("rejects cognitive_budget_allocate with missing description (schema validation)", async () => {
    const r = await executeAIReasoningAction("cognitive_budget_allocate", {});
    expect(r.success).toBe(false);
    expect(typeof r.error).toBe("string");
  });

  it("rejects ensemble_register_member with missing member field (schema validation)", async () => {
    const r = await executeAIReasoningAction("ensemble_register_member", {});
    expect(r.success).toBe(false);
  });

  it("rejects transfer_bridge_find_analogies with missing query field (schema validation)", async () => {
    const r = await executeAIReasoningAction("transfer_bridge_find_analogies", {});
    expect(r.success).toBe(false);
  });
});
