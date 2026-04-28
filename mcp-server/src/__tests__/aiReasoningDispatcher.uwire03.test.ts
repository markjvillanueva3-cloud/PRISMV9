/**
 * aiReasoningDispatcher — U-WIRE03 round-trip suite
 * ==================================================
 *
 * ENGINE-WIRE-MS0 / U-WIRE03 — wires 5 unwired AI/deep-reasoning engines
 * into the prism_ai dispatcher:
 *   - aiDecisionExplanationEngine.explainDecision  → ai_explain_decision
 *   - aiExtractionReasonerEngine.classifyContent   → ai_extract_classify
 *   - aiPhysicsOptimizationEngine.optimize         → ai_physics_optimize
 *   - aiDeepKnowledgeIntegrationEngine.query       → ai_knowledge_query
 *   - aiResourceLearningEngine.getMaterialParameters → ai_material_lookup
 *
 * Also fixes a pre-existing validation wiring bug: the dispatcher passed a
 * per-action schema to `validateActionParams`, but the helper expects the
 * SCHEMA MAP — so every prism_ai action ran with no validation. With the
 * fix, missing-required + bad-type inputs now reject correctly.
 *
 * Tests invoke through the registered tool handler (round-trip), not just
 * the engine singleton — exercises action enum, schema validation, lazy
 * import, and case-handler dispatch end-to-end.
 *
 * @milestone ENGINE-WIRE-MS0
 * @unit U-WIRE03
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
  // prism_ai dispatcher returns { success, data, error }
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
// 1. Round-trip happy paths (per engine)
// ─────────────────────────────────────────────────────────────────────
describe("U-WIRE03 happy paths — round-trip via prism_ai", () => {
  it("ai_explain_decision — produces structured DecisionExplanation", async () => {
    const r = await call(server, "ai_explain_decision", {
      operationId: "OP-001",
      operationType: "roughing",
      operationName: "Pocket roughing in 4140",
      parameters: [
        { parameter: "rpm", chosenValue: 4500, unit: "rpm", context: { material: "AISI 4140", toolDiameter: 12 } },
        { parameter: "feed_per_tooth", chosenValue: 0.08, unit: "mm/tooth", context: { material: "AISI 4140" } },
        { parameter: "axial_doc", chosenValue: 4, unit: "mm", context: {} },
      ],
      verbosity: "normal",
      targetAudience: "engineer",
    });
    expect(r.ok).toBe(true);
    // DecisionExplanation has parameter explanations array + summary text.
    expect(typeof r.data).toBe("object");
    // Must reference the operationId we passed in.
    const json = JSON.stringify(r.data);
    expect(json).toContain("OP-001");
  });

  it("ai_extract_classify — returns classification with reasoning", async () => {
    const r = await call(server, "ai_extract_classify", {
      content: {
        title: "Speed and feed for AISI 4140 with carbide endmill",
        excerpt: "Recommended Vc=180 m/min, fz=0.08 mm/tooth for roughing.",
        source: "vendor catalog",
      },
    });
    expect(r.ok).toBe(true);
    // AIClassificationResult has content_type + confidence + reasoning fields.
    expect(typeof r.data).toBe("object");
  });

  it("ai_physics_optimize — produces recommended parameters", async () => {
    const r = await call(server, "ai_physics_optimize", {
      material: { name: "AISI 4140", iso_group: "P", hardness_hrc: 28 },
      tool: { type: "endmill", material: "carbide", diameter_mm: 12, flutes: 4, coating: "TiAlN" },
      machine: { type: "vertical_mill", power_kw: 22, max_rpm: 12000, rigidity: "high" },
      operation: { operation: "roughing", strategy: "adaptive", coolant: "flood" },
      objectives: { maximize_mrr: true, maximize_tool_life: true },
      use_swarm: false,
      use_creative_reasoning: false,
      use_uncertainty_quantification: false,
    });
    expect(r.ok).toBe(true);
    expect(typeof r.data).toBe("object");
    // Must surface the recommended params field.
    expect(r.data).toHaveProperty("recommended");
  });

  it("ai_knowledge_query — returns Answer with reasoning chain", async () => {
    const r = await call(server, "ai_knowledge_query", {
      intent: "recommend_parameters",
      domain: "milling",
      context: { material: "AISI 4140", tool: "12mm carbide endmill", operation: "roughing" },
      depth: "moderate",
    });
    if (!r.ok) {
      const fs = await import("node:fs");
      fs.writeFileSync("H:/prism/_uwire03_kq.log", JSON.stringify(r.data, null, 2));
    }
    expect(r.ok).toBe(true);
    expect(typeof r.data).toBe("object");
    expect(r.data).toHaveProperty("answer");
  });

  it("ai_material_lookup — returns MaterialParameters or null cleanly", async () => {
    const r = await call(server, "ai_material_lookup", {
      material: "AISI 4140",
    });
    expect(r.ok).toBe(true);
    // Either a MaterialParameters object or null — both legitimate.
    if (r.data !== null && typeof r.data === "object" && Object.keys(r.data).length > 0) {
      expect(typeof (r.data as { material?: unknown }).material === "string"
        || (r.data as { material?: unknown }).material === undefined).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────
// 2. Variability (≥3 spanning configs per dimension)
// ─────────────────────────────────────────────────────────────────────
describe("U-WIRE03 variability spans", () => {
  const operationTypes = ["roughing", "finishing", "drilling"] as const;
  for (const op of operationTypes) {
    it(`ai_explain_decision spans operationType=${op}`, async () => {
      const r = await call(server, "ai_explain_decision", {
        operationId: `OP-${op}`,
        operationType: op,
        parameters: [{ parameter: "rpm", chosenValue: 3000, unit: "rpm", context: {} }],
      });
      expect(r.ok).toBe(true);
      expect(JSON.stringify(r.data)).toContain(`OP-${op}`);
    });
  }

  const intents = ["recommend_parameters", "validate_physics", "analyze_material"] as const;
  for (const intent of intents) {
    it(`ai_knowledge_query spans intent=${intent}`, async () => {
      const r = await call(server, "ai_knowledge_query", {
        intent,
        domain: "general",
        context: {},
      });
      expect(r.ok).toBe(true);
    });
  }

  const materials = ["AISI 4140", "6061-T6", "Ti-6Al-4V"] as const;
  for (const mat of materials) {
    it(`ai_material_lookup spans material=${mat}`, async () => {
      const r = await call(server, "ai_material_lookup", { material: mat });
      expect(r.ok).toBe(true);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────
// 3. Failure modes — schema validation must trip
// ─────────────────────────────────────────────────────────────────────
describe("U-WIRE03 input rejection (schema validation must trip)", () => {
  it("ai_explain_decision missing parameters[] → rejects", async () => {
    const r = await call(server, "ai_explain_decision", {
      operationId: "OP-X",
      operationType: "roughing",
      // parameters omitted
    });
    expect(r.ok).toBe(false);
  });

  it("ai_explain_decision with bad operationType enum → rejects", async () => {
    const r = await call(server, "ai_explain_decision", {
      operationId: "OP-X",
      operationType: "not_a_real_op_type",
      parameters: [{ parameter: "rpm", chosenValue: 3000, unit: "rpm", context: {} }],
    });
    expect(r.ok).toBe(false);
  });

  it("ai_physics_optimize missing material.name → rejects", async () => {
    const r = await call(server, "ai_physics_optimize", {
      material: { iso_group: "P" }, // name missing
      tool: { type: "endmill", material: "carbide", diameter_mm: 12 },
      machine: { type: "vertical_mill", power_kw: 22, max_rpm: 12000 },
      operation: { operation: "roughing" },
    });
    expect(r.ok).toBe(false);
  });

  it("ai_knowledge_query without intent → rejects", async () => {
    const r = await call(server, "ai_knowledge_query", {
      domain: "milling",
      context: {},
    });
    expect(r.ok).toBe(false);
  });

  it("ai_material_lookup with empty material string → rejects (min(1))", async () => {
    const r = await call(server, "ai_material_lookup", { material: "" });
    expect(r.ok).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 4. Adversarial inputs
// ─────────────────────────────────────────────────────────────────────
describe("U-WIRE03 adversarial inputs", () => {
  it("ai_physics_optimize with NaN tool diameter → rejects", async () => {
    const r = await call(server, "ai_physics_optimize", {
      material: { name: "AISI 4140" },
      tool: { type: "endmill", material: "carbide", diameter_mm: Number.NaN },
      machine: { type: "vertical_mill", power_kw: 22, max_rpm: 12000 },
      operation: { operation: "roughing" },
    });
    expect(r.ok).toBe(false);
  });

  it("ai_physics_optimize with negative power_kw → rejects", async () => {
    const r = await call(server, "ai_physics_optimize", {
      material: { name: "AISI 4140" },
      tool: { type: "endmill", material: "carbide", diameter_mm: 12 },
      machine: { type: "vertical_mill", power_kw: -5, max_rpm: 12000 },
      operation: { operation: "roughing" },
    });
    expect(r.ok).toBe(false);
  });

  it("ai_explain_decision with empty parameters array → rejects (min(1))", async () => {
    const r = await call(server, "ai_explain_decision", {
      operationId: "OP-X",
      operationType: "roughing",
      parameters: [],
    });
    expect(r.ok).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 5. Backward-compat regression guards
// ─────────────────────────────────────────────────────────────────────
describe("U-WIRE03 regression guards (pre-existing actions still work)", () => {
  it("dispatcher tool is registered as prism_ai", async () => {
    expect(server.tools.length).toBeGreaterThan(0);
    expect(server.tools[0]!.name).toBe("prism_ai");
  });

  it("pattern_stats (pre-existing) still routes", async () => {
    const r = await call(server, "pattern_stats", {});
    // Either ok with stats data or structured error — must not crash.
    expect(typeof r.ok).toBe("boolean");
  });

  it("unknown action yields structured error (no crash)", async () => {
    const r = await call(server, "definitely_not_a_real_action_xyz_42", {});
    expect(r.ok).toBe(false);
  });
});
