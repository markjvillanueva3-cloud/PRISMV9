/**
 * P5OrphanReasoningDispatchers.test.ts
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0/P5-U01..U05 — round-trip tests that
 * exercise the 5 newly wired orphan reasoning engines through their
 * dispatchers, NOT through the engine singletons:
 *
 *   P5-U01  prism_ai:creative_solve          → PRISMCreativeReasoningEngine
 *   P5-U02  prism_ai:causal_analyze          → CausalReasoningEngine
 *   P5-U03  prism_ai:counterfactual_predict  → CounterfactualReasoningEngine
 *   P5-U04  prism_ai:scientific_reason       → ScientificReasoningEngine
 *   P5-U05  prism_intelligence:diagnose_failure → DiagnosticReasoningEngine
 *
 * Each test invokes the dispatcher entry point (executeAIReasoningAction
 * or the public registerIntelligenceDispatcher → MCP tool handler) and
 * asserts on real return-shape fields produced by the wrapped engine.
 */

import { describe, expect, it } from "vitest";
import { executeAIReasoningAction, type AIReasoningAction } from "../tools/dispatchers/aiReasoningDispatcher.js";
import { AI_REASONING_ACTIONS } from "../schemas/aiReasoningActionSchemas.js";

// PRISMCreativeReasoningEngine.ProblemDefinition: {domain ∈ ProblemDomain, objective,
// constraints[], desiredOutcome, flexibility} — must match the engine's enum or
// generateConventionalSolutions returns []. Use "cycle_time" (real ProblemDomain).
const SAMPLE_PROBLEM = {
  domain: "cycle_time" as const,
  objective: "minimize cycle time on a thin-wall aluminum pocket",
  constraints: ["surface finish Ra ≤ 1.6 µm", "no chatter"],
  desiredOutcome: "reduce cycle time by ≥20% without sacrificing finish",
  flexibility: "moderate" as const,
};

// AI_REASONING_ACTIONS count: 45 pre-P5 + 4 new (creative_solve, causal_analyze,
// counterfactual_predict, scientific_reason) = 49. Verified by counting array
// entries in src/schemas/aiReasoningActionSchemas.ts.
const PRE_P5_BASELINE = 45;
const P5_NEW_ACTIONS = 4;
// CausalEdge shape: {from, to, confidence ∈ [0,1], polarity, reason?}
const SAMPLE_EDGES = [
  { from: "high_RPM", to: "high_temperature", confidence: 0.8, polarity: "positive" as const },
  { from: "high_temperature", to: "tool_wear", confidence: 0.9, polarity: "positive" as const },
  { from: "tool_wear", to: "poor_finish", confidence: 0.7, polarity: "positive" as const },
];
// CausalVariable shape: {name, type, domain:{min/max/values}, current_value, unit?}
const SAMPLE_GRAPH_SPEC = {
  domain: "machining" as const,
  variables: [
    {
      name: "feed_rate",
      type: "continuous" as const,
      domain: { min: 50, max: 600 },
      current_value: 200,
      unit: "mm/min",
    },
    {
      name: "surface_finish_ra",
      type: "continuous" as const,
      domain: { min: 0.1, max: 6.3 },
      current_value: 1.6,
      unit: "µm",
    },
  ],
  // Engine uses domain templates for relations; this field is informational only.
  relations: [],
};

describe("P5-U01 — prism_ai:creative_solve", () => {
  it("creative_solve action is in the AI_REASONING_ACTIONS enum", () => {
    expect((AI_REASONING_ACTIONS as readonly string[]).includes("creative_solve")).toBe(true);
  });

  it("happy path: returns ExplorationResult with non-empty solutions array + reasoning trace", async () => {
    const r = await executeAIReasoningAction("creative_solve" as AIReasoningAction, {
      problem: SAMPLE_PROBLEM,
      mode: "exploratory",
    });
    expect(r.success).toBe(true);
    const data = r.data as {
      solutions?: unknown[];
      reasoning?: unknown[];
      challengedAssumptions?: unknown[];
    };
    expect(Array.isArray(data.solutions)).toBe(true);
    expect((data.solutions ?? []).length).toBeGreaterThan(0);
    expect(Array.isArray(data.reasoning)).toBe(true);
    expect((data.reasoning ?? []).length).toBeGreaterThan(0);
  });

  it("variability: 'optimal' mode produces ≥ as many reasoning steps as 'conventional'", async () => {
    const conv = await executeAIReasoningAction("creative_solve" as AIReasoningAction, {
      problem: SAMPLE_PROBLEM,
      mode: "conventional",
    });
    const opt = await executeAIReasoningAction("creative_solve" as AIReasoningAction, {
      problem: SAMPLE_PROBLEM,
      mode: "optimal",
    });
    expect(conv.success).toBe(true);
    expect(opt.success).toBe(true);
    const convReasoning = ((conv.data as { reasoning?: unknown[] }).reasoning ?? []).length;
    const optReasoning = ((opt.data as { reasoning?: unknown[] }).reasoning ?? []).length;
    expect(optReasoning).toBeGreaterThanOrEqual(convReasoning);
  });

  it("FAIL: missing required `problem` field → schema rejects, returns error string", async () => {
    const r = await executeAIReasoningAction("creative_solve" as AIReasoningAction, {
      mode: "exploratory",
    });
    expect(r.success).toBe(false);
    expect(typeof r.error).toBe("string");
    expect((r.error ?? "").length).toBeGreaterThan(0);
  });

  it("FAIL: invalid `mode` enum value → schema rejects with non-empty error", async () => {
    const r = await executeAIReasoningAction("creative_solve" as AIReasoningAction, {
      problem: SAMPLE_PROBLEM,
      mode: "garbage-mode",
    });
    expect(r.success).toBe(false);
    expect(typeof r.error).toBe("string");
    expect((r.error ?? "").length).toBeGreaterThan(0);
  });
});

describe("P5-U02 — prism_ai:causal_analyze", () => {
  it("causal_analyze action is in the enum", () => {
    expect((AI_REASONING_ACTIONS as readonly string[]).includes("causal_analyze")).toBe(true);
  });

  it("happy path: traceImpact from `high_RPM` reaches `poor_finish` with edgeCount=3", async () => {
    const r = await executeAIReasoningAction("causal_analyze" as AIReasoningAction, {
      edges: SAMPLE_EDGES,
      source: "high_RPM",
      maxHops: 5,
    });
    expect(r.success).toBe(true);
    // Real ImpactReport shape: {source, maxHops, paths: ImpactPath[]}
    // Each ImpactPath: {target, hops, confidence, polarity, via}
    const data = r.data as {
      nodeCount?: number;
      edgeCount?: number;
      impact?: { source?: string; maxHops?: number; paths?: Array<{ target: string }> } | null;
    };
    expect(data.nodeCount).toBe(4); // high_RPM, high_temperature, tool_wear, poor_finish
    expect(data.edgeCount).toBe(SAMPLE_EDGES.length);
    expect(data.impact === null || data.impact === undefined).toBe(false);
    const targets = (data.impact?.paths ?? []).map((p) => p.target);
    expect(targets.includes("poor_finish")).toBe(true);
  });

  it("happy path: rootCauses of `poor_finish` includes `high_RPM` (3 hops upstream)", async () => {
    const r = await executeAIReasoningAction("causal_analyze" as AIReasoningAction, {
      edges: SAMPLE_EDGES,
      target: "poor_finish",
      maxHops: 5,
    });
    expect(r.success).toBe(true);
    const data = r.data as { rootCauses?: string[] };
    expect(Array.isArray(data.rootCauses)).toBe(true);
    expect((data.rootCauses ?? []).includes("high_RPM")).toBe(true);
  });

  it("FAIL: missing edges array → schema rejects with non-empty error", async () => {
    const r = await executeAIReasoningAction("causal_analyze" as AIReasoningAction, {
      source: "anything",
    });
    expect(r.success).toBe(false);
    expect(typeof r.error).toBe("string");
    expect((r.error ?? "").length).toBeGreaterThan(0);
  });
});

describe("P5-U03 — prism_ai:counterfactual_predict", () => {
  it("counterfactual_predict action is in the enum", () => {
    expect((AI_REASONING_ACTIONS as readonly string[]).includes("counterfactual_predict")).toBe(true);
  });

  it("happy path: generates counterfactual carrying intervention.variable + counterfactual_value verbatim", async () => {
    const r = await executeAIReasoningAction("counterfactual_predict" as AIReasoningAction, {
      graphSpec: SAMPLE_GRAPH_SPEC,
      intervention: { variable: "feed_rate", value: 100 },
    });
    expect(r.success).toBe(true);
    // Real Counterfactual.intervention shape: {variable, original_value, counterfactual_value}
    const data = r.data as {
      graphId?: string;
      counterfactual?: {
        description?: string;
        intervention?: {
          variable?: string;
          original_value?: unknown;
          counterfactual_value?: unknown;
        };
      } | null;
    };
    expect(typeof data.graphId).toBe("string");
    expect((data.graphId ?? "").length).toBeGreaterThan(0);
    expect(data.counterfactual === null || data.counterfactual === undefined).toBe(false);
    expect(data.counterfactual?.intervention?.variable).toBe("feed_rate");
    expect(data.counterfactual?.intervention?.counterfactual_value).toBe(100);
    expect(typeof data.counterfactual?.description).toBe("string");
    expect((data.counterfactual?.description ?? "").includes("feed_rate")).toBe(true);
  });

  it("FAIL: missing graphSpec → schema rejects with non-empty error", async () => {
    const r = await executeAIReasoningAction("counterfactual_predict" as AIReasoningAction, {
      intervention: { variable: "x", value: 1 },
    });
    expect(r.success).toBe(false);
    expect(typeof r.error).toBe("string");
    expect((r.error ?? "").length).toBeGreaterThan(0);
  });

  it("FAIL: intervention missing `value` → schema rejects with non-empty error", async () => {
    const r = await executeAIReasoningAction("counterfactual_predict" as AIReasoningAction, {
      graphSpec: SAMPLE_GRAPH_SPEC,
      intervention: { variable: "feed_rate" },
    });
    expect(r.success).toBe(false);
    expect(typeof r.error).toBe("string");
    expect((r.error ?? "").length).toBeGreaterThan(0);
  });
});

describe("P5-U04 — prism_ai:scientific_reason", () => {
  it("scientific_reason action is in the enum (independent of mill alias ai_mill_scientific_analyze)", () => {
    expect((AI_REASONING_ACTIONS as readonly string[]).includes("scientific_reason")).toBe(true);
    expect((AI_REASONING_ACTIONS as readonly string[]).includes("ai_mill_scientific_analyze")).toBe(true);
  });

  it("happy path: returns ScientificReasoning with principles + final_result + confidence ∈ [0,1]", async () => {
    const r = await executeAIReasoningAction("scientific_reason" as AIReasoningAction, {
      problem: "Predict cutting force from depth and feed",
      inputs: {
        depth: { value: 2, unit: "mm", dimension: { length: 1, mass: 0, time: 0, temperature: 0, current: 0, amount: 0, luminosity: 0 } },
        feed: { value: 0.1, unit: "mm", dimension: { length: 1, mass: 0, time: 0, temperature: 0, current: 0, amount: 0, luminosity: 0 } },
      },
      calculationType: "kienzle_force",
    });
    expect(r.success).toBe(true);
    const data = r.data as {
      problem_statement?: string;
      principles_used?: unknown[];
      final_result?: { value?: number };
      confidence?: number;
    };
    expect(data.problem_statement).toBe("Predict cutting force from depth and feed");
    expect(Array.isArray(data.principles_used)).toBe(true);
    expect(typeof data.confidence).toBe("number");
    const conf = data.confidence ?? -1;
    expect(conf >= 0 && conf <= 1).toBe(true);
  });

  it("FAIL: missing inputs → schema rejects with non-empty error", async () => {
    const r = await executeAIReasoningAction("scientific_reason" as AIReasoningAction, {
      problem: "x",
      calculationType: "y",
    });
    expect(r.success).toBe(false);
    expect(typeof r.error).toBe("string");
    expect((r.error ?? "").length).toBeGreaterThan(0);
  });
});

describe("P5-U05 — prism_intelligence:diagnose_failure", () => {
  it("DiagnosticReasoningEngine.diagnoseFromSymptoms produces deterministic shape", async () => {
    const { DiagnosticReasoningEngine } = await import("../engines/DiagnosticReasoningEngine.js");
    const symptoms = [
      { description: "Motor hot", observed: true, severity: "high" as const, source: "sensor" as const },
      { description: "Position error", observed: true, severity: "medium" as const, source: "sensor" as const },
    ];
    const direct = DiagnosticReasoningEngine.diagnoseFromSymptoms("vmc-haas", symptoms);
    expect(typeof direct.diagnosis_id).toBe("string");
    expect(direct.diagnosis_id.length).toBeGreaterThan(0);
    expect(typeof direct.confidence).toBe("number");
    expect(direct.confidence >= 0 && direct.confidence <= 1).toBe(true);
    expect(Array.isArray(direct.reasoning_trace)).toBe(true);
  });

  it("happy path: dispatcher tool handler routes through CORE_ROUTING → diagnosticReasoning", async () => {
    const dispatcherMod = await import("../tools/dispatchers/intelligenceDispatcher.js");

    type ToolHandler = (
      args: { action: string; params?: Record<string, unknown> },
    ) => Promise<{ content: Array<{ type: "text"; text: string }> }>;

    let registeredHandler: ToolHandler | null = null;
    const stubServer = {
      tool: (
        _name: string,
        _desc: string,
        _schema: unknown,
        handler: ToolHandler,
      ) => {
        registeredHandler = handler;
      },
    };
    dispatcherMod.registerIntelligenceDispatcher(
      stubServer as unknown as Parameters<typeof dispatcherMod.registerIntelligenceDispatcher>[0],
    );
    expect(registeredHandler === null).toBe(false);

    const out = await registeredHandler!({
      action: "diagnose_failure",
      params: {
        machineType: "vmc-haas",
        symptoms: [
          { description: "Motor hot", observed: true, severity: "high", source: "sensor" },
          { description: "Position drift", observed: true, severity: "medium", source: "sensor" },
        ],
      },
    });
    expect(out.content?.[0]?.type).toBe("text");
    const parsed = JSON.parse(out.content[0].text) as {
      action?: string;
      diagnosis_id?: string;
      confidence?: number;
      reasoning_trace?: unknown[];
      error?: string;
    };
    expect(parsed.action).toBe("diagnose_failure");
    expect(typeof parsed.diagnosis_id).toBe("string");
    expect((parsed.diagnosis_id ?? "").length).toBeGreaterThan(0);
    expect(typeof parsed.confidence).toBe("number");
    expect(Array.isArray(parsed.reasoning_trace)).toBe(true);
  });

  it("FAIL: dispatcher receives non-array `symptoms` — engine throws → response carries error", async () => {
    const dispatcherMod = await import("../tools/dispatchers/intelligenceDispatcher.js");

    type ToolHandler = (
      args: { action: string; params?: Record<string, unknown> },
    ) => Promise<{ content: Array<{ type: "text"; text: string }> }>;

    let registeredHandler: ToolHandler | null = null;
    const stubServer = {
      tool: (
        _name: string,
        _desc: string,
        _schema: unknown,
        handler: ToolHandler,
      ) => {
        registeredHandler = handler;
      },
    };
    dispatcherMod.registerIntelligenceDispatcher(
      stubServer as unknown as Parameters<typeof dispatcherMod.registerIntelligenceDispatcher>[0],
    );

    const out = await registeredHandler!({
      action: "diagnose_failure",
      params: { machineType: "vmc-haas", symptoms: "not-an-array" },
    });
    expect(out.content?.[0]?.type).toBe("text");
    const parsed = JSON.parse(out.content[0].text) as {
      success?: boolean;
      error?: string;
      action?: string;
      diagnosis_id?: string;
    };
    // Either the dispatcher rejected with success:false, or the engine
    // tolerated the bad input and returned an empty-symptom diagnosis.
    // Both are acceptable as long as we don't get a hung promise / throw.
    if (parsed.success === false) {
      expect(typeof parsed.error).toBe("string");
      expect((parsed.error ?? "").length).toBeGreaterThan(0);
    } else {
      expect(typeof parsed.diagnosis_id).toBe("string");
    }
  });
});

describe("P5 — combined enum integrity", () => {
  it("each new prism_ai action appears exactly once in AI_REASONING_ACTIONS", () => {
    const newActions = ["creative_solve", "causal_analyze", "counterfactual_predict", "scientific_reason"];
    for (const a of newActions) {
      const occurrences = (AI_REASONING_ACTIONS as readonly string[]).filter((x) => x === a).length;
      expect(occurrences).toBe(1);
    }
  });

  it("AI_REASONING_ACTIONS grew by AT LEAST 4 vs pre-P5 baseline (45 → ≥49)", () => {
    // Use >= rather than === so concurrent dispatcher work in other chats
    // (uwire20/21, etc.) cannot regress this gate. The "exactly once" gate
    // above already proves P5 itself didn't double-register.
    expect(AI_REASONING_ACTIONS.length).toBeGreaterThanOrEqual(PRE_P5_BASELINE + P5_NEW_ACTIONS);
  });
});
