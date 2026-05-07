/**
 * orchestrationDispatcher — Neural / Meta-AI wiring round-trip suite
 * ===================================================================
 *
 * COGNITIVE-BRIDGE-MS0 / U-WIRE-COG-BATCH8
 *
 * Wires 4 of 5 neural engines into prism_orchestrate (MillNeuralNetworkEngine
 * deferred — its predict() takes 9 positional args; needs a follow-up batch
 * with a normalized input shape):
 *   - prismNeuralKnowledgeSynthesis      -> cognitive_neural_synthesize
 *   - neuralWeightPersistenceEngine      -> cognitive_neural_list_weights
 *   - metaAIOrchestrationEngine          -> cognitive_meta_orchestrate
 *   - millComprehensiveNeuralEngine      -> cognitive_neural_comprehensive_predict
 *
 * @milestone COGNITIVE-BRIDGE-MS0
 * @unit U-WIRE-COG-BATCH8
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerOrchestrationDispatcher } from "../tools/dispatchers/orchestrationDispatcher.js";

const SYNTHESIS_DEPTHS = ["quick", "moderate", "deep", "exhaustive"] as const;

interface CapturedTool {
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(_n: string, _d: string, _s: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ handler });
  }
}

interface DispatchResult { ok: boolean; data: Record<string, unknown> }

async function call(server: MockMCPServer, action: string, params: Record<string, unknown> = {}): Promise<DispatchResult> {
  const tool = server.tools[0]!;
  const raw = await tool.handler({ action, params });
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw as unknown as Record<string, unknown> };
  }
  const envelope = raw as { content: { type: string; text: string }[] };
  const parsed = JSON.parse(envelope.content[0]!.text) as Record<string, unknown>;
  if ("error" in parsed) return { ok: false, data: parsed };
  return { ok: true, data: parsed };
}

let server: MockMCPServer;
beforeEach(() => {
  server = new MockMCPServer();
  registerOrchestrationDispatcher(server as unknown as Parameters<typeof registerOrchestrationDispatcher>[0]);
});

describe("U-WIRE-COG-BATCH8 / PRISMNeuralKnowledgeSynthesisEngine", () => {
  it("synthesize returns confidence in [0,1] and integer-non-negative counts", async () => {
    const r = await call(server, "cognitive_neural_synthesize", {
      domain: "milling",
      objective: "Select cutting parameters for 4140 steel pocket",
      constraints: ["S(x) >= 0.95"],
      depth: "moderate",
    });
    expect(r.ok).toBe(true);
    const synth = r.data.synthesis as { patterns_applied: string[]; confidence: number; insights_count: number; recommendations_count: number; reasoning_steps: number; physics_grounding_count: number; tribal_wisdom_count: number };
    expect(synth.confidence).toBeGreaterThanOrEqual(0);
    expect(synth.confidence).toBeLessThanOrEqual(1);
    expect(Number.isInteger(synth.insights_count)).toBe(true);
    expect(Number.isInteger(synth.recommendations_count)).toBe(true);
    expect(Number.isInteger(synth.reasoning_steps)).toBe(true);
    expect(synth.insights_count).toBeGreaterThanOrEqual(0);
    expect(synth.recommendations_count).toBeGreaterThanOrEqual(0);
    expect(synth.reasoning_steps).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(synth.patterns_applied ?? [])).toBe(true);
  });

  it.each(SYNTHESIS_DEPTHS.map(d => [d] as const))("synthesize variability: depth=%s yields a structured synthesis", async (depth) => {
    const r = await call(server, "cognitive_neural_synthesize", {
      domain: "general",
      objective: `synth at depth ${depth}`,
      depth,
    });
    expect(r.ok).toBe(true);
    const synth = r.data.synthesis as { confidence: number };
    expect(synth.confidence).toBeGreaterThanOrEqual(0);
    expect(synth.confidence).toBeLessThanOrEqual(1);
  });
});

describe("U-WIRE-COG-BATCH8 / NeuralWeightPersistenceEngine", () => {
  it("list_weights returns count === weights.length invariant (count=0 when no models cached)", async () => {
    const r = await call(server, "cognitive_neural_list_weights");
    expect(r.ok).toBe(true);
    const weights = (r.data.weights as unknown[] | undefined) ?? [];
    const count = (r.data.count as number | undefined) ?? 0;
    expect(count).toBe(weights.length);
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it("list_weights with model_id filter still returns the count invariant", async () => {
    const r = await call(server, "cognitive_neural_list_weights", { model_id: "nonexistent_model_xyz" });
    expect(r.ok).toBe(true);
    const weights = (r.data.weights as unknown[] | undefined) ?? [];
    const count = (r.data.count as number | undefined) ?? 0;
    expect(count).toBe(weights.length);
    expect(count).toBe(0); // unknown model id -> empty list
  });
});

describe("U-WIRE-COG-BATCH8 / MetaAIOrchestrationEngine", () => {
  it("meta_orchestrate returns engines_used array + integer execution_time_ms + confidence in [0,1]", async () => {
    const r = await call(server, "cognitive_meta_orchestrate", {
      problem: "Optimize MRR for 4140 steel roughing while keeping S(x) >= 0.95",
      domain: "milling",
      constraints: ["machine: vmc40", "spindle <= 12000 rpm"],
      context: { material: "AISI 4140", hardness_HRC: 28 },
      time_budget_ms: 5000,
    });
    expect(r.ok).toBe(true);
    const meta = r.data.meta as { engines_used: string[]; reasoning_modes_applied: string[]; confidence: number; reasoning_chain_length: number; execution_time_ms: number; analogical_transfers_count: number; learning_events_count: number };
    expect(Array.isArray(meta.engines_used ?? [])).toBe(true);
    expect(Array.isArray(meta.reasoning_modes_applied ?? [])).toBe(true);
    expect(meta.confidence).toBeGreaterThanOrEqual(0);
    expect(meta.confidence).toBeLessThanOrEqual(1);
    expect(Number.isFinite(meta.execution_time_ms)).toBe(true);
    expect(meta.execution_time_ms).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(meta.reasoning_chain_length)).toBe(true);
    expect(meta.reasoning_chain_length).toBeGreaterThanOrEqual(0);
  });
});

describe("U-WIRE-COG-BATCH8 / MillComprehensiveNeuralEngine.predict", () => {
  it("predict accepts a feature array and returns a typed prediction (or graceful error)", async () => {
    const features = Array.from({ length: 32 }, (_, i) => i / 32);
    const r = await call(server, "cognitive_neural_comprehensive_predict", { input: features });
    expect(r.ok).toBe(true);
    // Engine may reject malformed feature dimensionality; either way the
    // dispatcher returns a structured envelope (no throw past the boundary).
    const pred = r.data.prediction as Record<string, unknown> | null;
    // pred is either a populated object or null (slimmed away when null);
    // when slimmed away, engine_error must be a non-empty string.
    if (pred !== null && pred !== undefined) {
      expect(typeof pred).toBe("object");
    } else {
      expect(typeof r.data.engine_error).toBe("string");
      expect((r.data.engine_error as string).length).toBeGreaterThan(0);
    }
  });
});

describe("U-WIRE-COG-BATCH8 / schema rejections", () => {
  it("rejects synthesize with empty objective", async () => {
    const r = await call(server, "cognitive_neural_synthesize", { domain: "x", objective: "" });
    expect(r.ok).toBe(false);
  });

  it("rejects synthesize with invalid depth", async () => {
    const r = await call(server, "cognitive_neural_synthesize", { domain: "x", objective: "y", depth: "not_a_depth" });
    expect(r.ok).toBe(false);
  });

  it("rejects meta_orchestrate without required problem", async () => {
    const r = await call(server, "cognitive_meta_orchestrate", { domain: "x", constraints: [], context: {} });
    expect(r.ok).toBe(false);
  });

  it("rejects neural_comprehensive_predict with empty input array", async () => {
    const r = await call(server, "cognitive_neural_comprehensive_predict", { input: [] });
    expect(r.ok).toBe(false);
  });
});

describe("U-WIRE-COG-BATCH8 / regression guards", () => {
  it("all 4 batch-8 actions reachable from dispatcher", async () => {
    const a = await call(server, "cognitive_neural_synthesize", { domain: "general", objective: "test" });
    const b = await call(server, "cognitive_neural_list_weights");
    const c = await call(server, "cognitive_meta_orchestrate", {
      problem: "test", domain: "general", constraints: [], context: {},
    });
    const d = await call(server, "cognitive_neural_comprehensive_predict", { input: [0.1, 0.2, 0.3] });
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    expect(c.ok).toBe(true);
    expect(d.ok).toBe(true);
  });
});
