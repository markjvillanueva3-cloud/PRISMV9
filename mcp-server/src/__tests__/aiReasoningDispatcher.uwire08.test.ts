/**
 * aiReasoningDispatcher — U-WIRE08 round-trip suite
 * ==================================================
 *
 * ENGINE-WIRE-MS0 / U-WIRE08 — wires 5 Wire EDM AI specialist engines:
 *   - wireEDMAdvancedNeuralEngine.predictParameters  → ai_wedm_advanced_neural
 *   - wireEDMAGIOrchestrator.process                 → ai_wedm_agi_orchestrate
 *   - wireEDMAIPrintToProgramEngine.generate         → ai_wedm_print_to_program
 *   - wireEDMCAMKnowledgeEngine.searchKnowledge      → ai_wedm_cam_knowledge
 *   - wireEDMKnowledgeSynthesisEngine.synthesize     → ai_wedm_synthesize_knowledge
 *
 * @milestone ENGINE-WIRE-MS0
 * @unit U-WIRE08
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
describe("U-WIRE08 happy paths — round-trip via prism_ai", () => {
  it("ai_wedm_advanced_neural — predicts WEDM parameters from feature vector", async () => {
    const r = await call(server, "ai_wedm_advanced_neural", {
      material: "D2",
      thickness_mm: 25.4,
      target_ra_um: 0.8,
      target_accuracy_mm: 0.005,
      wire_diameter_mm: 0.25,
      machine: "Mitsubishi FA-S",
    });
    expect(r.ok).toBe(true);
    expect(typeof r.data).toBe("object");
    // MultiTargetPrediction has peak_current_A + predicted_mrr + predicted_ra
    expect(r.data).toHaveProperty("peak_current_A");
    expect(r.data).toHaveProperty("predicted_mrr");
    expect(r.data).toHaveProperty("predicted_ra");
  });

  it("ai_wedm_agi_orchestrate — full AGI reasoning chain produces decision", async () => {
    const r = await call(server, "ai_wedm_agi_orchestrate", {
      query: "What parameters should I use for cutting D2 at 25mm thickness?",
      material: "D2",
      thickness_mm: 25.0,
      wire_diameter_mm: 0.25,
      target_ra_um: 0.8,
      mode: "full_agi",
      include_counterfactuals: true,
      include_causal_analysis: true,
    });
    expect(r.ok).toBe(true);
    expect(typeof r.data).toBe("object");
    // AGIDecision has decision_id + reasoning_chain + final_recommendation
    expect(r.data).toHaveProperty("decision_id");
    expect(r.data).toHaveProperty("reasoning_chain");
    expect(r.data).toHaveProperty("final_recommendation");
  });

  it("ai_wedm_print_to_program — generates NC program with pass recommendations", async () => {
    const r = await call(server, "ai_wedm_print_to_program", {
      material: "D2",
      thickness_mm: 50.8,
      target_ra_um: 1.6,
      wire_type: "plain_brass",
      wire_diameter_mm: 0.25,
      controller: "mitsubishi",
      program_number: 1001,
      part_name: "Die Insert",
    });
    expect(r.ok).toBe(true);
    expect(typeof r.data).toBe("object");
    // AIProgramResult has pass_recommendations + g_code_program
    const json = JSON.stringify(r.data);
    expect(json.length).toBeGreaterThan(10);
  });

  it("ai_wedm_cam_knowledge — returns relevant CAM knowledge records", async () => {
    const r = await call(server, "ai_wedm_cam_knowledge", {
      query: "taper cutting D2 die",
    });
    expect(r.ok).toBe(true);
    expect(Array.isArray(r.data)).toBe(true);
  });

  it("ai_wedm_synthesize_knowledge — synthesizes answer with evidence fusion", async () => {
    const r = await call(server, "ai_wedm_synthesize_knowledge", {
      question: "How many passes are needed for D2 at 0.4 Ra?",
      material: "D2",
      thickness_mm: 30.0,
      target_ra_um: 0.4,
      urgency: "normal",
    });
    expect(r.ok).toBe(true);
    expect(typeof r.data).toBe("object");
    // SynthesisResponse has synthesized_answer + meta
    expect(r.data).toHaveProperty("synthesized_answer");
    expect(r.data).toHaveProperty("meta");
  });
});

// ─────────────────────────────────────────────────────────────────────
// 2. Variability spans — 3 dims × 3 values = 9 tests
// ─────────────────────────────────────────────────────────────────────
describe("U-WIRE08 variability spans (≥3 configs per dimension)", () => {
  const materials = ["D2", "M2", "carbide"] as const;
  for (const material of materials) {
    it(`ai_wedm_advanced_neural spans material=${material}`, async () => {
      const r = await call(server, "ai_wedm_advanced_neural", {
        material,
        thickness_mm: 20,
        target_ra_um: 1.6,
      });
      expect(r.ok).toBe(true);
    });
  }

  const modes = ["analytical", "ensemble", "physics"] as const;
  for (const mode of modes) {
    it(`ai_wedm_agi_orchestrate spans mode=${mode}`, async () => {
      const r = await call(server, "ai_wedm_agi_orchestrate", {
        query: "Optimize parameters for M2 at 15mm",
        material: "M2",
        thickness_mm: 15,
        wire_diameter_mm: 0.20,
        mode,
      });
      expect(r.ok).toBe(true);
    });
  }

  const categories = ["toolpath", "parameter", "workflow"] as const;
  for (const category of categories) {
    it(`ai_wedm_cam_knowledge spans category=${category}`, async () => {
      const r = await call(server, "ai_wedm_cam_knowledge", {
        query: "wire EDM setup",
        category,
      });
      expect(r.ok).toBe(true);
      expect(Array.isArray(r.data)).toBe(true);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────
// 3. Schema rejection — 5 tests
// ─────────────────────────────────────────────────────────────────────
describe("U-WIRE08 input rejection (validation must trip)", () => {
  it("ai_wedm_advanced_neural missing material → rejects", async () => {
    const r = await call(server, "ai_wedm_advanced_neural", {
      thickness_mm: 25,
      target_ra_um: 0.8,
    });
    expect(r.ok).toBe(false);
  });

  it("ai_wedm_advanced_neural missing thickness_mm → rejects", async () => {
    const r = await call(server, "ai_wedm_advanced_neural", {
      material: "D2",
      target_ra_um: 0.8,
    });
    expect(r.ok).toBe(false);
  });

  it("ai_wedm_agi_orchestrate missing query → rejects", async () => {
    const r = await call(server, "ai_wedm_agi_orchestrate", {
      material: "D2",
      thickness_mm: 25,
      wire_diameter_mm: 0.25,
    });
    expect(r.ok).toBe(false);
  });

  it("ai_wedm_cam_knowledge missing query → rejects", async () => {
    const r = await call(server, "ai_wedm_cam_knowledge", {});
    expect(r.ok).toBe(false);
  });

  it("ai_wedm_synthesize_knowledge missing question → rejects", async () => {
    const r = await call(server, "ai_wedm_synthesize_knowledge", {
      material: "D2",
    });
    expect(r.ok).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 4. Adversarial inputs — 3 tests
// ─────────────────────────────────────────────────────────────────────
describe("U-WIRE08 adversarial inputs", () => {
  it("ai_wedm_advanced_neural with negative thickness → rejects", async () => {
    const r = await call(server, "ai_wedm_advanced_neural", {
      material: "D2",
      thickness_mm: -10,
      target_ra_um: 0.8,
    });
    expect(r.ok).toBe(false);
  });

  it("ai_wedm_agi_orchestrate with invalid mode enum → rejects", async () => {
    const r = await call(server, "ai_wedm_agi_orchestrate", {
      query: "test query",
      material: "D2",
      thickness_mm: 25,
      wire_diameter_mm: 0.25,
      mode: "hallucination_mode",
    });
    expect(r.ok).toBe(false);
  });

  it("ai_wedm_print_to_program with negative thickness → rejects", async () => {
    const r = await call(server, "ai_wedm_print_to_program", {
      material: "D2",
      thickness_mm: -5,
    });
    expect(r.ok).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 5. Backward-compat regression guards — 2 tests
// ─────────────────────────────────────────────────────────────────────
describe("U-WIRE08 regression guards (U-WIRE03/04/05 still work)", () => {
  it("ai_wedm_master (U-WIRE05) still routes", async () => {
    const r = await call(server, "ai_wedm_master", {
      domain: "parameter_selection",
      depth: "quick",
      material: "D2",
      thickness_mm: 12,
    });
    expect(r.ok).toBe(true);
  });

  it("ai_material_lookup (U-WIRE03) still routes", async () => {
    const r = await call(server, "ai_material_lookup", { material: "D2" });
    expect(r.ok).toBe(true);
  });

  it("dispatcher tool name unchanged", () => {
    expect(server.tools[0]!.name).toBe("prism_ai");
  });
});
