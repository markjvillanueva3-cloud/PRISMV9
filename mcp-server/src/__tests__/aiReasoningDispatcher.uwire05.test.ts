/**
 * aiReasoningDispatcher — U-WIRE05 round-trip suite
 * ==================================================
 *
 * ENGINE-WIRE-MS0 / U-WIRE05 — wires 5 heavy AI orchestrator engines:
 *   - millingAGIOrchestrationEngine.analyzeWithAGI    → ai_milling_agi
 *   - millingDigitalTwinEngine.simulate               → ai_milling_twin_simulate
 *   - wireEDMMasterAIEngine.analyze                   → ai_wedm_master
 *   - wireEDMNeuralOrchestrationEngine.orchestrate    → ai_wedm_neural_orchestrate
 *   - latheAITrainingEngine.trainFromPrograms         → ai_lathe_train
 *
 * Together with U-WIRE03 + U-WIRE04 these surface the full AI orchestration
 * stack (15 engines) on prism_ai.
 *
 * @milestone ENGINE-WIRE-MS0
 * @unit U-WIRE05
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
describe("U-WIRE05 happy paths — round-trip via prism_ai", () => {
  it("ai_milling_agi — produces AGI recommendations + optimal parameters", async () => {
    const r = await call(server, "ai_milling_agi", {
      material: "AISI 4140",
      tool_diameter_mm: 12,
      tool_flutes: 4,
      cutting_speed_m_min: 200,
      feed_per_tooth_mm: 0.1,
      axial_depth_mm: 5,
      radial_depth_mm: 6,
      operation: "roughing",
      coolant_type: "flood",
      tool_coating: "TiAlN",
    });
    expect(r.ok).toBe(true);
    expect(typeof r.data).toBe("object");
    // AGIOrchestratorResult exposes recommendations + optimal_parameters
    expect(r.data).toHaveProperty("recommendations");
    expect(r.data).toHaveProperty("optimal_parameters");
  });

  it("ai_milling_twin_simulate — forward-simulates process state", async () => {
    const r = await call(server, "ai_milling_twin_simulate", {
      duration_s: 30,
    });
    expect(r.ok).toBe(true);
    expect(typeof r.data).toBe("object");
  });

  it("ai_wedm_master — analyzes WEDM decision domain at standard depth", async () => {
    const r = await call(server, "ai_wedm_master", {
      domain: "parameter_selection",
      depth: "standard",
      material: "D2",
      thickness_mm: 12.7,
      target_ra_um: 1.2,
      wire_diameter_mm: 0.25,
    });
    expect(r.ok).toBe(true);
    expect(typeof r.data).toBe("object");
  });

  it("ai_wedm_neural_orchestrate — evaluates strategies with priority", async () => {
    const r = await call(server, "ai_wedm_neural_orchestrate", {
      material: "D2",
      thickness_mm: 25,
      target_ra_um: 0.8,
      geometry: "complex",
      priority: "balanced",
    });
    expect(r.ok).toBe(true);
    expect(typeof r.data).toBe("object");
  });

  it("ai_lathe_train — accepts a batch of programs and returns stats", async () => {
    const r = await call(server, "ai_lathe_train", {
      programs: [
        { content: "G50 S2500\nG96 S180 M03\nG00 X50 Z2\nG01 X-1 F0.2\nM30", filepath: "test/sample1.MIN" },
        { content: "G97 S1500\nG00 X25\nG01 Z-50 F0.15\nM30", filepath: "test/sample2.MIN" },
      ],
    });
    expect(r.ok).toBe(true);
    expect(typeof r.data).toBe("object");
    // TrainingStats has program-count + extracted-parameter counters
    const json = JSON.stringify(r.data);
    expect(json.length).toBeGreaterThan(2);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 2. Variability — span domains / depths / priorities
// ─────────────────────────────────────────────────────────────────────
describe("U-WIRE05 variability spans (≥3 configs per dimension)", () => {
  const domains = ["parameter_selection", "troubleshooting", "cost_estimation"] as const;
  for (const domain of domains) {
    it(`ai_wedm_master spans domain=${domain}`, async () => {
      const r = await call(server, "ai_wedm_master", {
        domain,
        depth: "quick",
        material: "D2",
        thickness_mm: 6,
      });
      expect(r.ok).toBe(true);
    });
  }

  const priorities = ["speed", "quality", "cost"] as const;
  for (const priority of priorities) {
    it(`ai_wedm_neural_orchestrate spans priority=${priority}`, async () => {
      const r = await call(server, "ai_wedm_neural_orchestrate", {
        material: "D2",
        thickness_mm: 12,
        priority,
      });
      expect(r.ok).toBe(true);
    });
  }

  const operations = ["roughing", "finishing", "drilling"] as const;
  for (const operation of operations) {
    it(`ai_milling_agi spans operation=${operation}`, async () => {
      const r = await call(server, "ai_milling_agi", {
        material: "6061-T6",
        tool_diameter_mm: 10,
        tool_flutes: 3,
        cutting_speed_m_min: 300,
        feed_per_tooth_mm: 0.08,
        axial_depth_mm: 3,
        radial_depth_mm: 5,
        operation,
      });
      expect(r.ok).toBe(true);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────
// 3. Schema rejection
// ─────────────────────────────────────────────────────────────────────
describe("U-WIRE05 input rejection (validation must trip)", () => {
  it("ai_milling_agi missing material → rejects", async () => {
    const r = await call(server, "ai_milling_agi", {
      tool_diameter_mm: 12,
      tool_flutes: 4,
      cutting_speed_m_min: 200,
      feed_per_tooth_mm: 0.1,
      axial_depth_mm: 5,
      radial_depth_mm: 6,
      operation: "roughing",
    });
    expect(r.ok).toBe(false);
  });

  it("ai_milling_twin_simulate without duration_s → rejects", async () => {
    const r = await call(server, "ai_milling_twin_simulate", {});
    expect(r.ok).toBe(false);
  });

  it("ai_wedm_master with bad domain enum → rejects", async () => {
    const r = await call(server, "ai_wedm_master", {
      domain: "definitely_not_a_real_domain",
      depth: "standard",
    });
    expect(r.ok).toBe(false);
  });

  it("ai_wedm_master with bad depth enum → rejects", async () => {
    const r = await call(server, "ai_wedm_master", {
      domain: "parameter_selection",
      depth: "ultra_deep",
    });
    expect(r.ok).toBe(false);
  });

  it("ai_lathe_train with empty programs array → rejects (min(1))", async () => {
    const r = await call(server, "ai_lathe_train", { programs: [] });
    expect(r.ok).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 4. Adversarial inputs
// ─────────────────────────────────────────────────────────────────────
describe("U-WIRE05 adversarial inputs", () => {
  it("ai_milling_twin_simulate with NaN duration → rejects", async () => {
    const r = await call(server, "ai_milling_twin_simulate", {
      duration_s: Number.NaN,
    });
    expect(r.ok).toBe(false);
  });

  it("ai_milling_twin_simulate with negative duration → rejects", async () => {
    const r = await call(server, "ai_milling_twin_simulate", {
      duration_s: -10,
    });
    expect(r.ok).toBe(false);
  });

  it("ai_milling_agi with negative cutting speed → rejects", async () => {
    const r = await call(server, "ai_milling_agi", {
      material: "AISI 4140",
      tool_diameter_mm: 12,
      tool_flutes: 4,
      cutting_speed_m_min: -200,
      feed_per_tooth_mm: 0.1,
      axial_depth_mm: 5,
      radial_depth_mm: 6,
      operation: "roughing",
    });
    expect(r.ok).toBe(false);
  });

  it("ai_lathe_train with empty content string → rejects", async () => {
    const r = await call(server, "ai_lathe_train", {
      programs: [{ content: "", filepath: "test.MIN" }],
    });
    expect(r.ok).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 5. Backward-compat regression guards
// ─────────────────────────────────────────────────────────────────────
describe("U-WIRE05 regression guards (U-WIRE01-04 still work)", () => {
  it("ai_lathe_reason (U-WIRE04) still routes", async () => {
    const r = await call(server, "ai_lathe_reason", {
      operation_type: "turning",
      material_iso: "P",
    });
    expect(r.ok).toBe(true);
  });

  it("ai_material_lookup (U-WIRE03) still routes", async () => {
    const r = await call(server, "ai_material_lookup", { material: "AISI 4140" });
    expect(r.ok).toBe(true);
  });

  it("dispatcher tool name unchanged", () => {
    expect(server.tools[0]!.name).toBe("prism_ai");
  });
});
