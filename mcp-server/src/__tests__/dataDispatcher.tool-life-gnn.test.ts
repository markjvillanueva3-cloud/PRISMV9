/**
 * dataDispatcher — GNN tool-life prediction round-trip suite
 * ==========================================================
 *
 * Wires ToolLifeGnnEngine into prism_data:
 *   ToolLifeGnnEngine.predict(graph, conditions) → prism_data:tool_life_gnn_predict
 *
 * Tests invoke THROUGH the dispatcher (verifies enum + case + 2-arg param split +
 * import path). Assertions encode INTENT (R9): tool life is positive, the Weibull
 * CI is ordered, and Taylor monotonicity holds (↑cutting speed ⇒ ↓life) — not bare
 * toBeDefined() stubs.
 *
 * @milestone DB-COVERAGE-GAPFILL-MS0
 * @unit U-ROMEO-TOOL-LIFE-GNN-WIRE
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerDataDispatcher } from "../tools/dispatchers/dataDispatcher.js";

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
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw as unknown as Record<string, unknown> };
  }
  const envelope = raw as { content: { type: string; text: string }[] };
  const text = envelope.content[0]!.text;
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, data: { rawText: text } };
  }
  if (parsed && typeof parsed === "object" && "error" in parsed) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

// A representative 4-node assembly: carbide end mill → CAT40 holder → spindle → machine.
function assembly() {
  return {
    nodes: [
      { id: "tool", type: "tool", features: { length_mm: 80, diameter_mm: 12, material: "carbide", flute_count: 4, coating: "AlTiN", runout_um: 3, wear_state: 0.1, edge_radius_um: 8 } },
      { id: "holder", type: "holder", features: { length_mm: 100, diameter_mm: 30, stiffness_n_per_um: 50, runout_um: 2 } },
      { id: "spindle", type: "spindle", features: { stiffness_n_per_um: 200, runout_um: 1 } },
      { id: "machine", type: "machine", features: {} },
    ],
    edges: [
      { from: "tool", to: "holder", features: { interface_stiffness_n_per_um: 80, taper_type: "CAT40", runout_contribution_um: 1 } },
      { from: "holder", to: "spindle", features: { interface_stiffness_n_per_um: 150, taper_type: "CAT40" } },
      { from: "spindle", to: "machine", features: { interface_stiffness_n_per_um: 300 } },
    ],
  };
}
function conditions(cuttingSpeedMpm = 120) {
  return {
    cuttingSpeedMpm,
    feedPerToothMm: 0.1,
    axialDepthMm: 2,
    radialDepthMm: 6,
    materialIsoGroup: "P" as const,
    coolant: "flood" as const,
  };
}

type Pred = {
  meanLifeMinutes: number;
  medianLifeMinutes: number;
  taylorPrediction: number;
  graphCorrection: number;
  effectiveStiffness: number;
  confidence95: [number, number];
  weibullShape: number;
  weibullScale: number;
  dominantFailureMode: string;
  modelVersion: string;
};

let server: MockMCPServer;
beforeEach(() => {
  server = new MockMCPServer();
  registerDataDispatcher(server as unknown as { tool: (...args: unknown[]) => void });
});

describe("U-ROMEO-TOOL-LIFE-GNN-WIRE — round-trip via prism_data:tool_life_gnn_predict", () => {
  it("wire is live — action resolves and returns a tool-life prediction", async () => {
    const r = await call(server, "tool_life_gnn_predict", { graph: assembly(), conditions: conditions() });
    expect(r.ok).toBe(true);
    expect(r.data).toHaveProperty("meanLifeMinutes");
    expect(r.data).toHaveProperty("taylorPrediction");
  });

  it("predicts a positive, physically-plausible tool life", async () => {
    const r = await call(server, "tool_life_gnn_predict", { graph: assembly(), conditions: conditions() });
    const p = r.data as unknown as Pred;
    expect(p.meanLifeMinutes).toBeGreaterThan(0);
    expect(p.medianLifeMinutes).toBeGreaterThan(0);
    expect(p.taylorPrediction).toBeGreaterThan(0);
    expect(Number.isFinite(p.graphCorrection)).toBe(true);
    expect(p.graphCorrection).toBeGreaterThan(0);
    expect(p.effectiveStiffness).toBeGreaterThan(0);
    expect(typeof p.dominantFailureMode).toBe("string");
    expect(p.dominantFailureMode.length).toBeGreaterThan(0);
  });

  it("returns an ordered, positive 95% Weibull confidence interval", async () => {
    const r = await call(server, "tool_life_gnn_predict", { graph: assembly(), conditions: conditions() });
    const p = r.data as unknown as Pred;
    expect(Array.isArray(p.confidence95)).toBe(true);
    expect(p.confidence95.length).toBe(2);
    const [lo, hi] = p.confidence95;
    expect(lo).toBeGreaterThan(0);
    expect(hi).toBeGreaterThan(lo);
    expect(p.weibullShape).toBeGreaterThan(0);
    expect(p.weibullScale).toBeGreaterThan(0);
  });

  it("obeys Taylor monotonicity: ↑cutting speed ⇒ ↓tool life", async () => {
    const slow = await call(server, "tool_life_gnn_predict", { graph: assembly(), conditions: conditions(80) });
    const fast = await call(server, "tool_life_gnn_predict", { graph: assembly(), conditions: conditions(200) });
    const tSlow = (slow.data as unknown as Pred).meanLifeMinutes;
    const tFast = (fast.data as unknown as Pred).meanLifeMinutes;
    expect(tFast).toBeLessThan(tSlow);
  });

  it("is deterministic — identical inputs yield identical mean life", async () => {
    const a = await call(server, "tool_life_gnn_predict", { graph: assembly(), conditions: conditions() });
    const b = await call(server, "tool_life_gnn_predict", { graph: assembly(), conditions: conditions() });
    expect((a.data as unknown as Pred).meanLifeMinutes).toBe((b.data as unknown as Pred).meanLifeMinutes);
  });
});
