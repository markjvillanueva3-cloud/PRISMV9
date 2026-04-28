/**
 * aiReasoningDispatcher — U-WIRE04 round-trip suite
 * ==================================================
 *
 * ENGINE-WIRE-MS0 / U-WIRE04 — wires 5 deep-learning / deep-reasoning
 * engines into prism_ai:
 *   - millingDeepReasoningEngine.reason             → ai_milling_deep_reason
 *   - wireEDMDeepLogicEngine.reason                 → ai_wedm_deep_logic
 *   - wireEDMDeepNeuralReasoningEngine.reason       → ai_wedm_deep_neural
 *   - millingDeepKnowledgeSynthesisEngine.synthesize → ai_milling_synthesize
 *   - latheAIReasoningEngine.reason                 → ai_lathe_reason
 *
 * Together with U-WIRE03 these surface the full deep-reasoning stack
 * (decision-explain, classify, physics-optimize, knowledge-query,
 * material-lookup + the 5 above) as first-class MCP actions.
 *
 * Tests invoke through the registered tool handler — round-trip via
 * MockMCPServer.  Schema validation is exercised via missing-required
 * + bad-enum + adversarial paths.
 *
 * @milestone ENGINE-WIRE-MS0
 * @unit U-WIRE04
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerAIReasoningDispatcher } from "../tools/dispatchers/aiReasoningDispatcher.js";

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ name, description, schema, handler });
  }
}

async function call(
  server: MockMCPServer,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const tool = server.tools[0]!;
  const raw = (await tool.handler({ action, params })) as { content: { type: string; text: string }[] };
  const text = raw.content[0]!.text;
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, data: { rawText: text } };
  }
  if (parsed.success === false) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: (parsed.data ?? parsed) as Record<string, unknown> };
}

let server: MockMCPServer;

beforeEach(() => {
  server = new MockMCPServer();
  registerAIReasoningDispatcher(
    server as unknown as { tool: (...args: unknown[]) => void },
  );
});

// ─────────────────────────────────────────────────────────────────────
// 1. Happy paths — one per engine
// ─────────────────────────────────────────────────────────────────────
describe("U-WIRE04 happy paths — round-trip via prism_ai", () => {
  it("ai_milling_deep_reason — produces reasoning result for D2 thin-wall", async () => {
    const r = await call(server, "ai_milling_deep_reason", {
      query: "What is the safest feed rate for thin-wall D2 milling?",
      context: {
        material: "D2",
        material_iso: "H",
        hardness_hrc: 58,
        operation: "finishing",
        tool_diameter_mm: 6,
        is_thin_wall: true,
      },
      mode: "analytical",
    });
    expect(r.ok).toBe(true);
    expect(typeof r.data).toBe("object");
    // MillingReasoningResult exposes reasoning_chain + recommendations + confidence.
    expect(r.data).toHaveProperty("reasoning_chain");
    expect(r.data).toHaveProperty("confidence");
  });

  it("ai_wedm_deep_logic — produces symbolic reasoning result", async () => {
    const r = await call(server, "ai_wedm_deep_logic", {
      query: "Why does my D2 cut surface show recast layer?",
      context: { material: "D2", thickness_mm: 12.7 },
    });
    expect(r.ok).toBe(true);
    expect(typeof r.data).toBe("object");
  });

  it("ai_wedm_deep_neural — multi-hop neural reasoning", async () => {
    const r = await call(server, "ai_wedm_deep_neural", {
      question: "What E-code family fits a 6mm D2 part with 0.8µm Ra target?",
      context: {
        material: "D2",
        thickness_mm: 6,
        target_ra_um: 0.8,
        machine: "Makino DUO-43",
        wire_diameter_mm: 0.25,
      },
      reasoning_depth: "standard",
    });
    expect(r.ok).toBe(true);
    expect(typeof r.data).toBe("object");
  });

  it("ai_milling_synthesize — fuses tribal + physics + program sources", async () => {
    const r = await call(server, "ai_milling_synthesize", {
      material: "D2",
      material_iso: "H",
      hardness_hrc: 58,
      operation: "roughing",
      tool_diameter_mm: 12,
      tool_type: "endmill",
      tolerance_mm: 0.025,
      surface_finish_ra: 1.6,
      machine: "Hurco VM10i",
      controller: "WinMax",
      prefer_conservative: true,
      require_physics_validation: true,
    });
    expect(r.ok).toBe(true);
    expect(typeof r.data).toBe("object");
  });

  it("ai_lathe_reason — diagnostic reasoning for turning op", async () => {
    const r = await call(server, "ai_lathe_reason", {
      operation_type: "turning",
      material_iso: "P",
      material_name: "AISI 4140",
      diameter_mm: 50,
      length_mm: 100,
      depth_mm: 2,
      tolerance_mm: 0.05,
      surface_finish_Ra_um: 1.6,
      controller: "OSP-P300L",
      machine_brand: "Okuma",
      optimization_target: "balanced",
    });
    expect(r.ok).toBe(true);
    expect(typeof r.data).toBe("object");
    // LatheAIReasoningResult exposes reasoning_steps + recommendations.
    expect(r.data).toHaveProperty("reasoning_steps");
  });
});

// ─────────────────────────────────────────────────────────────────────
// 2. Variability — span reasoning modes / depths / materials
// ─────────────────────────────────────────────────────────────────────
describe("U-WIRE04 variability spans (≥3 configs per dimension)", () => {
  const modes = ["analytical", "diagnostic", "predictive"] as const;
  for (const mode of modes) {
    it(`ai_milling_deep_reason spans mode=${mode}`, async () => {
      const r = await call(server, "ai_milling_deep_reason", {
        query: "Recommend optimal parameters",
        context: { material: "AISI 4140", operation: "roughing" },
        mode,
      });
      expect(r.ok).toBe(true);
    });
  }

  const depths = ["quick", "standard", "deep"] as const;
  for (const depth of depths) {
    it(`ai_wedm_deep_neural spans reasoning_depth=${depth}`, async () => {
      const r = await call(server, "ai_wedm_deep_neural", {
        question: "What pass count for 25mm D2?",
        context: { material: "D2", thickness_mm: 25 },
        reasoning_depth: depth,
      });
      expect(r.ok).toBe(true);
    });
  }

  const isoGroups = ["P", "M", "K"] as const;
  for (const iso of isoGroups) {
    it(`ai_lathe_reason spans material_iso=${iso}`, async () => {
      const r = await call(server, "ai_lathe_reason", {
        operation_type: "turning",
        material_iso: iso,
        diameter_mm: 25,
        depth_mm: 1.5,
      });
      expect(r.ok).toBe(true);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────
// 3. Schema rejection
// ─────────────────────────────────────────────────────────────────────
describe("U-WIRE04 input rejection (validation must trip)", () => {
  it("ai_milling_deep_reason without query → rejects", async () => {
    const r = await call(server, "ai_milling_deep_reason", {
      context: { material: "AISI 4140" },
    });
    expect(r.ok).toBe(false);
  });

  it("ai_milling_deep_reason with empty query → rejects (min(1))", async () => {
    const r = await call(server, "ai_milling_deep_reason", {
      query: "",
      context: {},
    });
    expect(r.ok).toBe(false);
  });

  it("ai_wedm_deep_neural without question → rejects", async () => {
    const r = await call(server, "ai_wedm_deep_neural", {
      context: { material: "D2" },
    });
    expect(r.ok).toBe(false);
  });

  it("ai_milling_synthesize missing material → rejects", async () => {
    const r = await call(server, "ai_milling_synthesize", {
      material_iso: "P",
      operation: "roughing",
    });
    expect(r.ok).toBe(false);
  });

  it("ai_lathe_reason with bad material_iso enum → rejects", async () => {
    const r = await call(server, "ai_lathe_reason", {
      operation_type: "turning",
      material_iso: "Z" as unknown as "P",
    });
    expect(r.ok).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 4. Adversarial inputs
// ─────────────────────────────────────────────────────────────────────
describe("U-WIRE04 adversarial inputs", () => {
  it("ai_lathe_reason with NaN diameter → rejects", async () => {
    const r = await call(server, "ai_lathe_reason", {
      operation_type: "turning",
      material_iso: "P",
      diameter_mm: Number.NaN,
    });
    expect(r.ok).toBe(false);
  });

  it("ai_wedm_deep_neural with negative thickness → rejects", async () => {
    const r = await call(server, "ai_wedm_deep_neural", {
      question: "How fast can I cut?",
      context: { material: "D2", thickness_mm: -1 },
    });
    expect(r.ok).toBe(false);
  });

  it("ai_milling_synthesize with min_confidence > 1 → rejects (max 1)", async () => {
    const r = await call(server, "ai_milling_synthesize", {
      material: "D2",
      material_iso: "H",
      operation: "roughing",
      min_confidence: 1.5,
    });
    expect(r.ok).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 5. Backward-compat regression guards
// ─────────────────────────────────────────────────────────────────────
describe("U-WIRE04 regression guards (U-WIRE03 + pre-existing still work)", () => {
  it("ai_material_lookup (U-WIRE03) still routes", async () => {
    const r = await call(server, "ai_material_lookup", { material: "AISI 4140" });
    expect(r.ok).toBe(true);
  });

  it("ai_explain_decision (U-WIRE03) still validates", async () => {
    const r = await call(server, "ai_explain_decision", {
      operationId: "OP-X",
      operationType: "roughing",
      parameters: [{ parameter: "rpm", chosenValue: 3000, unit: "rpm", context: {} }],
    });
    expect(r.ok).toBe(true);
  });

  it("dispatcher tool name unchanged", () => {
    expect(server.tools[0]!.name).toBe("prism_ai");
  });
});
