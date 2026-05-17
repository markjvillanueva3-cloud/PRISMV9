/**
 * camDispatcher — NXCAMAIOrchestrationEngine wiring suite
 * =======================================================
 *
 * WIRE-UNWIRED (foxtrot 2026-05-17) — wires the validator-confirmed
 * TRULY-UNWIRED NXCAMAIOrchestrationEngine (423-line real engine, NOT a
 * stub) into prism_cam with 3 actions mirroring the cam_hypermill_ai_* /
 * powermill_ai_* / catia_ai_* trio:
 *   - orchestrate(request)   → nx_ai_orchestrate
 *   - getReasoningModes()    → nx_ai_get_reasoning_modes
 *   - getStats()             → nx_ai_get_stats
 *
 * All three surfaces are deterministic + no external I/O (orchestrate
 * composes in-process NX bridges and never throws — its one sub-engine call
 * is wrapped in a silent try/catch that degrades to a fallback strategy;
 * note the engine's catch is silent and does NOT populate warnings[], a
 * pre-existing engine concern out of scope for this wiring suite). Includes
 * the z.enum-membership guard for the RGS-TOOL-AUTOINVOKE-MS1 false-green
 * class (MockMCPServer bypasses z.enum).
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

// ─────────────────────────────────────────────────────────────────────
// 1. z.enum gate membership (RGS-TOOL-AUTOINVOKE-MS1 false-green guard)
// ─────────────────────────────────────────────────────────────────────
describe("nx AI-orch — enum registration", () => {
  it("all 3 actions are in the prism_cam z.enum ACTIONS list", () => {
    expect(ACTIONS).toContain("nx_ai_orchestrate");
    expect(ACTIONS).toContain("nx_ai_get_reasoning_modes");
    expect(ACTIONS).toContain("nx_ai_get_stats");
  });
  it("no duplicate ACTIONS keys introduced (anti-regression)", () => {
    expect(new Set(ACTIONS).size).toBe(ACTIONS.length);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 2. nx_ai_get_stats — deterministic engine metadata
// ─────────────────────────────────────────────────────────────────────
describe("nx_ai_get_stats — integration metadata", () => {
  it("reports 8 reasoning modes + the integrated engines + 5 signature features", async () => {
    const r = await call(server, "nx_ai_get_stats", {});
    expect(r.ok).toBe(true);
    const d = r.data as Record<string, unknown>;
    expect(d.success).toBe(true);
    expect(d.reasoning_modes).toBe(8);
    expect(typeof d.tribal_tips).toBe("number");
    expect((d.tribal_tips as number) >= 0).toBe(true);
    // Engine source pins these EXACT integrated engines (getStats()).
    expect(d.engines_integrated).toEqual([
      "NXCAMStrategyEngine",
      "NXCAMCodeGeneratorEngine",
      "KienzleForceModel",
    ]);
    // Engine source pins exactly 5 signature features — assert the count so a
    // regression dropping 4 fails loudly (not just a single toContain).
    expect((d.signature_features as string[]).length).toBe(5);
    expect((d.signature_features as string[])).toContain("Feature-Based Machining (FBM)");
  });
});

// ─────────────────────────────────────────────────────────────────────
// 3. nx_ai_get_reasoning_modes — exactly the 8 documented modes
// ─────────────────────────────────────────────────────────────────────
describe("nx_ai_get_reasoning_modes — mode catalog", () => {
  it("returns the 8 NXReasoningMode values with matching count", async () => {
    const r = await call(server, "nx_ai_get_reasoning_modes", {});
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

// ─────────────────────────────────────────────────────────────────────
// 4. nx_ai_orchestrate — round-trip, never throws
// ─────────────────────────────────────────────────────────────────────
describe("nx_ai_orchestrate — AGI orchestration round-trip", () => {
  it("returns a reasoning chain echoing the requested mode + request_type", async () => {
    const r = await call(server, "nx_ai_orchestrate", {
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
    // the minimal fallback (engines_invoked + confidence + timestamp) — it
    // never throws. The reasoning_chain may be an empty array, which the MCP
    // transport slimmer strips entirely, so do NOT assert its presence. Pin
    // the degraded shape so a regression that throws / drops the fallback
    // fields fails loudly.
    const r = await call(server, "nx_ai_orchestrate", {
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
    expect((resp.engines_invoked as string[])).toContain("NXCAMAIOrchestrationEngine");
    expect(typeof resp.confidence).toBe("number");
    expect((resp.confidence as number) >= 0 && (resp.confidence as number) <= 1).toBe(true);
  });
});
