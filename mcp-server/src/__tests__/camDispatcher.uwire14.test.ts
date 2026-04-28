/**
 * camDispatcher — U-WIRE14 round-trip suite
 * ===========================================
 *
 * ENGINE-WIRE-MS0 / U-WIRE14 — wires 5 Mastercam engines into prism_cam:
 *   - mastercamAIOrchestrationEngine.orchestrate          → mastercam_ai_orchestrate
 *   - mastercamCycleCatalogEngine.{search,lookupByCode,stats}
 *                                                         → mastercam_cycle_search/_lookup_code/_stats
 *   - mastercamDeepLearningEngine.selectOptimalStrategy   → mastercam_deep_select_strategy
 *   - MastercamFunctionIndexEngine.getSummary (static)    → mastercam_function_index_summary
 *   - mastercamMultiAxisEngine.{calculate,listStrategies} → mastercam_multiaxis_recommend / _list_strategies
 *
 * @milestone ENGINE-WIRE-MS0
 * @unit U-WIRE14
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerCamDispatcher } from "../tools/dispatchers/camDispatcher.js";

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
): Promise<{ ok: boolean; data: unknown }> {
  const tool = server.tools.find(t => t.name === "prism_cam");
  if (!tool) throw new Error("prism_cam not registered");
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw };
  }
  const envelope = raw as { content: { type: string; text: string }[] };
  const text = envelope.content[0]!.text;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, data: { rawText: text } };
  }
  if (parsed && typeof parsed === "object" && "error" in (parsed as Record<string, unknown>)) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

let server: MockMCPServer;

beforeEach(() => {
  server = new MockMCPServer();
  registerCamDispatcher(server as unknown as { tool: (...args: unknown[]) => void });
});

// ─────────────────────────────────────────────────────────────────────
// 1. Happy paths — one per engine
// ─────────────────────────────────────────────────────────────────────
describe("U-WIRE14 happy paths — round-trip via prism_cam", () => {
  it("mastercam_ai_orchestrate — returns AI response with reasoning chain", async () => {
    const r = await call(server, "mastercam_ai_orchestrate", {
      request_type: "strategy",
      reasoning_mode: "chain_of_thought",
      feature_type: "closed_pocket",
      material_iso: "P",
      tool_diameter_mm: 12,
      tool_flutes: 4,
      operation: "roughing",
      machine_type: "3axis",
      priority: "balanced",
      include_chain: true,
    });
    expect(r.ok).toBe(true);
    expect(typeof r.data).toBe("object");
    const d = r.data as Record<string, unknown>;
    // MastercamAIResponse exposes reasoning_chain (array) + confidence (number 0..1)
    expect(Array.isArray(d.reasoning_chain)).toBe(true);
    expect(typeof d.confidence).toBe("number");
    expect((d.confidence as number) >= 0 && (d.confidence as number) <= 1).toBe(true);
  });

  it("mastercam_cycle_search — returns cycle catalog matches for 'dynamic'", async () => {
    const r = await call(server, "mastercam_cycle_search", { query: "dynamic" });
    expect(r.ok).toBe(true);
    expect(Array.isArray(r.data)).toBe(true);
  });

  it("mastercam_cycle_lookup_code — returns null or cycle for unknown code", async () => {
    const r = await call(server, "mastercam_cycle_lookup_code", { code: "NON_EXISTENT_CODE_XYZ" });
    expect(r.ok).toBe(true);
    // null is a legitimate return for unknown code; otherwise a cycle object
    expect(r.data === null || typeof r.data === "object").toBe(true);
  });

  it("mastercam_cycle_stats — returns category counts + total", async () => {
    const r = await call(server, "mastercam_cycle_stats", {});
    expect(r.ok).toBe(true);
    expect(typeof r.data).toBe("object");
    const d = r.data as Record<string, unknown>;
    // stats() return type includes a `total` summary field
    expect(typeof d.total === "number" || Object.keys(d).length > 0).toBe(true);
  });

  it("mastercam_deep_select_strategy — picks primary strategy + alternatives", async () => {
    const r = await call(server, "mastercam_deep_select_strategy", {
      feature_type: "closed_pocket",
      material_group: "P",
      machine_type: "3axis_mill",
      tool_diameter_mm: 12,
      depth_mm: 15,
      width_mm: 50,
      tolerance_mm: 0.05,
      surface_finish_Ra_um: 1.6,
      prefer_high_speed: true,
    });
    expect(r.ok).toBe(true);
    const d = r.data as Record<string, unknown>;
    expect(typeof d.primary_strategy).toBe("object");
    expect(Array.isArray(d.reasoning_chain)).toBe(true);
    expect(typeof d.confidence).toBe("number");
  });

  it("mastercam_function_index_summary — returns module/parameter counts", async () => {
    const r = await call(server, "mastercam_function_index_summary", {});
    expect(r.ok).toBe(true);
    const d = r.data as Record<string, unknown>;
    // MastercamIndexQueryResult wraps { value: { moduleCount, totalParams, ... }, source, module_count }
    expect(typeof d.module_count).toBe("number");
    expect(d.source).toBe("mastercam_function_index");
    const inner = d.value as Record<string, unknown>;
    expect(typeof inner.moduleCount).toBe("number");
    expect((inner.moduleCount as number) >= 0).toBe(true);
  });

  it("mastercam_multiaxis_recommend — returns recommendation for impeller blade", async () => {
    const r = await call(server, "mastercam_multiaxis_recommend", {
      geometry: "impeller",
      goal: "finishing",
      materialGroup: "S",
      toolDiameterMm: 6,
      toolType: "ballnose",
      bladeCount: 11,
      hasSplitterBlades: true,
      hubShroudRatio: 0.4,
      partToleranceMm: 0.02,
    });
    expect(r.ok).toBe(true);
    expect(typeof r.data).toBe("object");
  });

  it("mastercam_multiaxis_list_strategies — returns array of strategy descriptors", async () => {
    const r = await call(server, "mastercam_multiaxis_list_strategies", {});
    expect(r.ok).toBe(true);
    expect(Array.isArray(r.data)).toBe(true);
    expect((r.data as unknown[]).length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 2. Variability spans (≥3 configs per dimension)
// ─────────────────────────────────────────────────────────────────────
describe("U-WIRE14 variability spans", () => {
  const requestTypes = ["strategy", "physics", "tribal"] as const;
  for (const rt of requestTypes) {
    it(`mastercam_ai_orchestrate spans request_type=${rt}`, async () => {
      const r = await call(server, "mastercam_ai_orchestrate", {
        request_type: rt,
        feature_type: "closed_pocket",
        material_iso: "P",
        tool_diameter_mm: 10,
        operation: "roughing",
      });
      expect(r.ok).toBe(true);
    });
  }

  const reasoningModes = ["chain_of_thought", "tree_of_thought", "abductive"] as const;
  for (const mode of reasoningModes) {
    it(`mastercam_ai_orchestrate spans reasoning_mode=${mode}`, async () => {
      const r = await call(server, "mastercam_ai_orchestrate", {
        request_type: "strategy",
        reasoning_mode: mode,
        material_iso: "P",
        tool_diameter_mm: 10,
        operation: "roughing",
      });
      expect(r.ok).toBe(true);
    });
  }

  const features = ["closed_pocket", "freeform_surface", "deep_cavity"] as const;
  for (const f of features) {
    it(`mastercam_deep_select_strategy spans feature_type=${f}`, async () => {
      const r = await call(server, "mastercam_deep_select_strategy", {
        feature_type: f,
        material_group: "P",
        machine_type: "3axis_mill",
        tool_diameter_mm: 10,
        depth_mm: 10,
        width_mm: 30,
        tolerance_mm: 0.05,
      });
      expect(r.ok).toBe(true);
    });
  }

  const geometries = ["blade", "impeller", "blisk"] as const;
  for (const g of geometries) {
    it(`mastercam_multiaxis_recommend spans geometry=${g}`, async () => {
      const r = await call(server, "mastercam_multiaxis_recommend", {
        geometry: g,
        goal: "finishing",
        materialGroup: "S",
        toolDiameterMm: 6,
        toolType: "ballnose",
      });
      expect(r.ok).toBe(true);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────
// 3. Schema rejection — Zod validation must trip
// ─────────────────────────────────────────────────────────────────────
describe("U-WIRE14 input rejection", () => {
  it("mastercam_ai_orchestrate without request_type → rejects", async () => {
    const r = await call(server, "mastercam_ai_orchestrate", {
      feature_type: "closed_pocket",
      material_iso: "P",
    });
    expect(r.ok).toBe(false);
  });

  it("mastercam_ai_orchestrate with bad request_type enum → rejects", async () => {
    const r = await call(server, "mastercam_ai_orchestrate", {
      request_type: "fictional_request",
    });
    expect(r.ok).toBe(false);
  });

  it("mastercam_ai_orchestrate with bad reasoning_mode → rejects", async () => {
    const r = await call(server, "mastercam_ai_orchestrate", {
      request_type: "strategy",
      reasoning_mode: "wisdom_of_the_ancients",
    });
    expect(r.ok).toBe(false);
  });

  it("mastercam_cycle_search with empty query → rejects (min 1)", async () => {
    const r = await call(server, "mastercam_cycle_search", { query: "" });
    expect(r.ok).toBe(false);
  });

  it("mastercam_cycle_lookup_code without code → rejects", async () => {
    const r = await call(server, "mastercam_cycle_lookup_code", {});
    expect(r.ok).toBe(false);
  });

  it("mastercam_deep_select_strategy missing required fields → rejects", async () => {
    const r = await call(server, "mastercam_deep_select_strategy", {
      feature_type: "closed_pocket",
      material_group: "P",
      // machine_type / tool_diameter_mm / depth_mm / width_mm / tolerance_mm omitted
    });
    expect(r.ok).toBe(false);
  });

  it("mastercam_deep_select_strategy with bad feature_type → rejects", async () => {
    const r = await call(server, "mastercam_deep_select_strategy", {
      feature_type: "made_up_feature",
      material_group: "P",
      machine_type: "3axis_mill",
      tool_diameter_mm: 10,
      depth_mm: 10,
      width_mm: 30,
      tolerance_mm: 0.05,
    });
    expect(r.ok).toBe(false);
  });

  it("mastercam_multiaxis_recommend missing geometry → rejects", async () => {
    const r = await call(server, "mastercam_multiaxis_recommend", {
      goal: "finishing",
    });
    expect(r.ok).toBe(false);
  });

  it("mastercam_multiaxis_recommend with bad goal → rejects", async () => {
    const r = await call(server, "mastercam_multiaxis_recommend", {
      geometry: "blade",
      goal: "warp_machining",
    });
    expect(r.ok).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 4. Adversarial inputs — bounds + NaN
// ─────────────────────────────────────────────────────────────────────
describe("U-WIRE14 adversarial inputs", () => {
  it("mastercam_deep_select_strategy with negative depth → rejects (positive)", async () => {
    const r = await call(server, "mastercam_deep_select_strategy", {
      feature_type: "closed_pocket",
      material_group: "P",
      machine_type: "3axis_mill",
      tool_diameter_mm: 10,
      depth_mm: -5,
      width_mm: 30,
      tolerance_mm: 0.05,
    });
    expect(r.ok).toBe(false);
  });

  it("mastercam_multiaxis_recommend with hubShroudRatio > 1 → rejects", async () => {
    const r = await call(server, "mastercam_multiaxis_recommend", {
      geometry: "impeller",
      goal: "finishing",
      hubShroudRatio: 1.5,
    });
    expect(r.ok).toBe(false);
  });

  it("mastercam_multiaxis_recommend with wallAngleDeg > 90 → rejects", async () => {
    const r = await call(server, "mastercam_multiaxis_recommend", {
      geometry: "blade",
      goal: "finishing",
      wallAngleDeg: 120,
    });
    expect(r.ok).toBe(false);
  });

  it("mastercam_ai_orchestrate with negative spindle_rpm → rejects", async () => {
    const r = await call(server, "mastercam_ai_orchestrate", {
      request_type: "physics",
      spindle_rpm: -3000,
    });
    expect(r.ok).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 5. Backward-compat regression guards
// ─────────────────────────────────────────────────────────────────────
describe("U-WIRE14 regression guards", () => {
  it("dispatcher tool registered as prism_cam", () => {
    const tool = server.tools.find(t => t.name === "prism_cam");
    expect(tool?.name).toBe("prism_cam");
    expect(typeof tool?.handler).toBe("function");
  });

  it("U-WIRE12 mastercam_5axis_list_strategies still routes", async () => {
    const r = await call(server, "mastercam_5axis_list_strategies", {});
    expect(r.ok).toBe(true);
  });

  it("U-WIRE12 hypercads_mock_stock still routes", async () => {
    const r = await call(server, "hypercads_mock_stock", {});
    expect(r.ok).toBe(true);
  });

  it("unknown action returns structured error", async () => {
    const r = await call(server, "definitely_not_a_real_cam_action_xyz", {});
    expect(r.ok).toBe(false);
  });
});
