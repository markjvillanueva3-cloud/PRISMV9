/**
 * camDispatcher — CATIAMachiningAIOrchestrationEngine wiring suite
 * ================================================================
 *
 * WIRE-UNWIRED (foxtrot 2026-05-17) — wires the validator-confirmed
 * TRULY-UNWIRED CATIAMachiningAIOrchestrationEngine (421-line real engine,
 * NOT a stub) into prism_cam with 3 actions mirroring the cam_hypermill_ai_*
 * / powermill_ai_* trio:
 *   - orchestrate(request)   → catia_ai_orchestrate
 *   - getReasoningModes()    → catia_ai_get_reasoning_modes
 *   - getStats()             → catia_ai_get_stats
 *
 * Deterministic + no external I/O (orchestrate composes in-process CATIA
 * bridges, never throws — sub-engine failures surface via warnings[]).
 * Includes the z.enum-membership guard for the RGS-TOOL-AUTOINVOKE-MS1
 * false-green class (MockMCPServer bypasses the SDK z.enum).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerCamDispatcher, ACTIONS } from "../tools/dispatchers/camDispatcher.js";

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

describe("catia AI-orch — enum registration", () => {
  it("all 3 actions are in the prism_cam z.enum ACTIONS list", () => {
    expect(ACTIONS).toContain("catia_ai_orchestrate");
    expect(ACTIONS).toContain("catia_ai_get_reasoning_modes");
    expect(ACTIONS).toContain("catia_ai_get_stats");
  });
  it("no duplicate ACTIONS keys introduced (anti-regression)", () => {
    expect(new Set(ACTIONS).size).toBe(ACTIONS.length);
  });
});

describe("catia_ai_get_stats — integration metadata", () => {
  it("reports 8 reasoning modes + the integrated engines + 5 signature features", async () => {
    const r = await call(server, "catia_ai_get_stats", {});
    expect(r.ok).toBe(true);
    const d = r.data as Record<string, unknown>;
    expect(d.success).toBe(true);
    expect(d.reasoning_modes).toBe(8);
    expect(typeof d.tribal_tips).toBe("number");
    expect((d.tribal_tips as number) >= 0).toBe(true);
    expect(d.engines_integrated).toEqual([
      "CATIAStrategyEngine",
      "CATIACodeGeneratorEngine",
      "KienzleForceModel",
    ]);
    // Engine source pins exactly 5 signature features — assert count so a
    // regression dropping 4 fails loudly (not just a single toContain).
    expect((d.signature_features as string[]).length).toBe(5);
    expect((d.signature_features as string[])).toContain("DELMIA Manufacturing integration");
  });
});

describe("catia_ai_get_reasoning_modes — mode catalog", () => {
  it("returns the 8 CATIAReasoningMode values with matching count", async () => {
    const r = await call(server, "catia_ai_get_reasoning_modes", {});
    expect(r.ok).toBe(true);
    const d = r.data as Record<string, unknown>;
    expect(d.success).toBe(true);
    expect(d.count).toBe(8);
    const modes = d.modes as string[];
    expect(modes.length).toBe(8);
    expect(modes).toContain("chain_of_thought");
    expect(modes).toContain("tree_of_thought");
    expect(modes).toContain("analogical");
  });
});

describe("catia_ai_orchestrate — AGI orchestration round-trip", () => {
  it("returns a reasoning chain echoing the requested mode + request_type", async () => {
    const r = await call(server, "catia_ai_orchestrate", {
      request_type: "strategy",
      reasoning_mode: "chain_of_thought",
      feature_type: "closed_pocket",
      material_iso: "P",
      tool_diameter_mm: 12,
      tool_flutes: 4,
      operation: "roughing",
      machine_type: "3axis",
    });
    expect(r.ok).toBe(true);
    const d = r.data as Record<string, unknown>;
    expect(d.success).toBe(true);
    const resp = d.response as Record<string, unknown>;
    expect(resp.request_type).toBe("strategy");
    expect(resp.reasoning_mode).toBe("chain_of_thought");
    expect(Array.isArray(resp.reasoning_chain)).toBe(true);
    expect((resp.reasoning_chain as unknown[]).length).toBeGreaterThan(0);
  });

  it("a request_type with no specialized handler returns a degraded response, not a throw", async () => {
    // Real contract: 'diagnose' has no dedicated path so orchestrate() returns
    // the minimal fallback (engines_invoked + confidence + timestamp) WITHOUT
    // a reasoning_chain (empty array stripped by the transport slimmer). Pin
    // the degraded shape so a regression that throws / drops fields fails loud.
    const r = await call(server, "catia_ai_orchestrate", {
      request_type: "diagnose",
      feature_type: "rib",
      machine_type: "5axis",
    });
    expect(r.ok).toBe(true);
    const d = r.data as Record<string, unknown>;
    expect(d.success).toBe(true);
    const resp = d.response as Record<string, unknown>;
    expect(resp.request_type).toBe("diagnose");
    expect(typeof resp.reasoning_mode).toBe("string");
    expect(Array.isArray(resp.engines_invoked)).toBe(true);
    expect((resp.engines_invoked as string[]).length).toBeGreaterThan(0);
    expect(typeof resp.confidence).toBe("number");
    expect((resp.confidence as number) >= 0 && (resp.confidence as number) <= 1).toBe(true);
  });
});
