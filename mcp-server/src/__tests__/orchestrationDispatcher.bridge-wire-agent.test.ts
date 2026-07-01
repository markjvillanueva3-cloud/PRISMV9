/**
 * orchestrationDispatcher — U-BRIDGE-WIRE-AGENT round-trip suite
 * ================================================================
 *
 * Wires 3 previously-unwired Agent engines into prism_orchestrate
 * with deterministic structural assertions:
 *   - HardenedAgentCapabilitiesEngine.validatePhysicsGrounding -> agent_hardened_validate
 *   - AgentAutoUpdateEngine.getKnowledgeSnapshot               -> agent_auto_update_snapshot
 *   - AgentWorkflowEngine.getWorkflows/getWorkflow             -> agent_workflow_list
 *
 * @milestone BRIDGE-WIRING
 * @unit U-BRIDGE-WIRE-AGENT
 * @slot mike
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerOrchestrationDispatcher } from "../tools/dispatchers/orchestrationDispatcher.js";

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

// ── agent_hardened_validate ──────────────────────────────────────────────
describe("U-BRIDGE-WIRE-AGENT / agent_hardened_validate", () => {
  const validGrounding = {
    formula_id: "kienzle_cutting_force",
    formula_name: "Kienzle Cutting Force",
    formula_latex: "F_c = k_{c1.1} \\cdot b \\cdot h^{1-m_c}",
    input_values: { kc11: 1800, b: 5, h: 0.2 },
    output_value: 4500,
    output_unit: "N",
    uncertainty: 0.1,
    source: "Kienzle",
  };

  it("rejects empty groundings array (schema or handler-level)", async () => {
    const r = await call(server, "agent_hardened_validate", { output: { force_n: 4500 }, groundings: [] });
    expect(r.ok).toBe(false);
    // Either the schema's .min(1) rejects first (Too small / expected >=1) OR the handler
    // guard fires (non-empty 'groundings'). Both prove the empty path is blocked.
    expect(String(r.data.error)).toMatch(/groundings|Too small|>=1/i);
  });

  it("rejects when groundings field is missing entirely", async () => {
    const r = await call(server, "agent_hardened_validate", { output: { force_n: 4500 } });
    expect(r.ok).toBe(false);
    expect(String(r.data.error).length).toBeGreaterThan(0);
  });

  it("returns validation envelope shape on valid input", async () => {
    const r = await call(server, "agent_hardened_validate", {
      output: { force_n: 4500 },
      groundings: [validGrounding],
    });
    expect(r.ok).toBe(true);
    expect(r.data.success).toBe(true);
    const v = r.data.validation as Record<string, unknown>;
    expect(v).not.toBeNull();
    expect(typeof v).toBe("object");
    // Engine contract: validation result is a structured object (not a primitive).
    expect(Object.keys(v).length).toBeGreaterThan(0);
  });
});

// ── agent_auto_update_snapshot ───────────────────────────────────────────
describe("U-BRIDGE-WIRE-AGENT / agent_auto_update_snapshot", () => {
  it("returns success envelope with a non-empty snapshot object", async () => {
    const r = await call(server, "agent_auto_update_snapshot", {});
    expect(r.ok).toBe(true);
    expect(r.data.success).toBe(true);
    const snap = r.data.snapshot as Record<string, unknown>;
    expect(snap).not.toBeNull();
    expect(typeof snap).toBe("object");
    expect(Object.keys(snap).length).toBeGreaterThan(0);
  });

  it("snapshot carries at least one positive numeric asset count (live repo)", async () => {
    const r = await call(server, "agent_auto_update_snapshot", {});
    const snap = r.data.snapshot as Record<string, unknown>;
    const numericPairs = Object.entries(snap).filter(([, v]) => typeof v === "number" && Number.isFinite(v as number));
    expect(numericPairs.length).toBeGreaterThan(0);
    const total = numericPairs.reduce((s, [, v]) => s + (v as number), 0);
    // Live PRISM has >2500 engines + >100 dispatchers etc. — total must be substantial.
    expect(total).toBeGreaterThan(10);
  });
});

// ── agent_workflow_list ──────────────────────────────────────────────────
describe("U-BRIDGE-WIRE-AGENT / agent_workflow_list", () => {
  it("returns count === workflows.length invariant", async () => {
    const r = await call(server, "agent_workflow_list", {});
    expect(r.ok).toBe(true);
    expect(r.data.success).toBe(true);
    const workflows = (r.data.workflows as unknown[] | undefined) ?? [];
    expect(r.data.count).toBe(workflows.length);
    expect(r.data.count).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(workflows)).toBe(true);
  });

  it("returns explicit not-found error for unknown workflow_id", async () => {
    const r = await call(server, "agent_workflow_list", { workflow_id: "definitely-not-a-real-workflow-id-xyz" });
    expect(r.ok).toBe(false);
    expect(String(r.data.error)).toMatch(/not found/i);
    expect(String(r.data.error)).toContain("definitely-not-a-real-workflow-id-xyz");
  });
});

// ── action enum + schema gap-scan ────────────────────────────────────────
describe("U-BRIDGE-WIRE-AGENT / wiring invariants", () => {
  it("all 3 actions are recognized by the switch (never 'Unknown action')", async () => {
    const validGrounding = {
      formula_id: "k", formula_name: "k", formula_latex: "k",
      input_values: { x: 1 }, output_value: 1, output_unit: "N",
      uncertainty: 0.1, source: "test",
    };
    const cases = [
      { action: "agent_hardened_validate", params: { output: {}, groundings: [validGrounding] } },
      { action: "agent_auto_update_snapshot", params: {} },
      { action: "agent_workflow_list", params: {} },
    ];
    const results = await Promise.all(cases.map(c => call(server, c.action, c.params)));
    for (const r of results) {
      const msg = String(r.data.error ?? "");
      // The forbidden outcome is `Unknown action: …` — proves the case is missing from the switch.
      expect(msg).not.toMatch(/^Unknown action:/);
    }
    expect(results.length).toBe(3);
  });
});
