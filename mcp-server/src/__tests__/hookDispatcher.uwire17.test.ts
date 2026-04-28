/**
 * hookDispatcher — U-WIRE17 round-trip suite
 * ============================================
 *
 * ENGINE-WIRE-MS0 / U-WIRE17 — wires 5 hook orchestration engines into prism_hook:
 *   - hookOrchestratorEngine.plan              → hook_orch_plan
 *   - hookCoverageMaximizerEngine.analyze      → hook_coverage_analyze
 *   - hookBanditEngine.select                  → hook_bandit_select
 *   - hookTelemetryEngine.getSystemMetrics     → hook_telemetry_metrics
 *   - hookEfficiencyEngine.getROI              → hook_efficiency_roi
 *
 * @milestone ENGINE-WIRE-MS0
 * @unit U-WIRE17
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerHookDispatcher } from "../tools/dispatchers/hookDispatcher.js";

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
  const tool = server.tools.find(t => t.name === "prism_hook");
  if (!tool) throw new Error("prism_hook not registered");
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw };
  }
  const envelope = raw as { content?: { type: string; text: string }[] };
  if (!envelope.content || envelope.content.length === 0) {
    return { ok: false, data: { rawEnvelope: raw } };
  }
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
  registerHookDispatcher(server as unknown as { tool: (...args: unknown[]) => void });
});

// ─────────────────────────────────────────────────────────────────────
// 1. Happy paths — one per engine
// ─────────────────────────────────────────────────────────────────────
describe("U-WIRE17 happy paths — round-trip via prism_hook", () => {
  it("hook_orch_plan — returns PlanResult for PreTool phase", async () => {
    const r = await call(server, "hook_orch_plan", { phase: "PreTool" });
    expect(r.ok).toBe(true);
    expect(typeof r.data).toBe("object");
  });

  it("hook_coverage_analyze — returns CoverageAnalysis", async () => {
    const r = await call(server, "hook_coverage_analyze", {});
    expect(r.ok).toBe(true);
    expect(typeof r.data).toBe("object");
  });

  it("hook_bandit_select — returns HookSelection with selected hooks", async () => {
    const r = await call(server, "hook_bandit_select", { k: 3, time_budget_ms: 1000 });
    expect(r.ok).toBe(true);
    expect(typeof r.data).toBe("object");
  });

  it("hook_telemetry_metrics — returns SystemMetrics", async () => {
    const r = await call(server, "hook_telemetry_metrics", {});
    expect(r.ok).toBe(true);
    const d = r.data as Record<string, unknown>;
    // SystemMetrics exposes counts/health
    expect(typeof d).toBe("object");
    expect(Object.keys(d).length).toBeGreaterThan(0);
  });

  it("hook_efficiency_roi — returns ROI breakdown", async () => {
    const r = await call(server, "hook_efficiency_roi", { session_budget: 200000 });
    expect(r.ok).toBe(true);
    const d = r.data as Record<string, unknown>;
    // ROI shape: { tokensSaved, budgetPercent, callsBlocked }
    expect(typeof d.tokensSaved === "number" || typeof d.tokens_saved === "number").toBe(true);
    expect(typeof d.callsBlocked === "number" || typeof d.calls_blocked === "number").toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 2. Variability spans (≥3 configs per dimension)
// ─────────────────────────────────────────────────────────────────────
describe("U-WIRE17 variability spans", () => {
  const phases = ["PreTool", "PostTool", "UserPromptSubmit"] as const;
  for (const ph of phases) {
    it(`hook_orch_plan spans phase=${ph}`, async () => {
      const r = await call(server, "hook_orch_plan", { phase: ph });
      expect(r.ok).toBe(true);
    });
  }

  const ks = [1, 5, 10] as const;
  for (const k of ks) {
    it(`hook_bandit_select spans k=${k}`, async () => {
      const r = await call(server, "hook_bandit_select", { k });
      expect(r.ok).toBe(true);
    });
  }

  const budgets = [50000, 150000, 500000] as const;
  for (const b of budgets) {
    it(`hook_efficiency_roi spans session_budget=${b}`, async () => {
      const r = await call(server, "hook_efficiency_roi", { session_budget: b });
      expect(r.ok).toBe(true);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────
// 3. Schema rejection — Zod validation must trip
// ─────────────────────────────────────────────────────────────────────
describe("U-WIRE17 input rejection", () => {
  it("hook_orch_plan without phase → rejects", async () => {
    const r = await call(server, "hook_orch_plan", {});
    expect(r.ok).toBe(false);
  });

  it("hook_orch_plan with bad phase enum → rejects", async () => {
    const r = await call(server, "hook_orch_plan", { phase: "WizardCast" });
    expect(r.ok).toBe(false);
  });

  it("hook_orch_plan lowercase 'pretool' → rejects (case-sensitive)", async () => {
    const r = await call(server, "hook_orch_plan", { phase: "pretool" });
    expect(r.ok).toBe(false);
  });

  it("hook_bandit_select without k → rejects", async () => {
    const r = await call(server, "hook_bandit_select", {});
    expect(r.ok).toBe(false);
  });

  it("hook_bandit_select with k=0 → rejects (positive)", async () => {
    const r = await call(server, "hook_bandit_select", { k: 0 });
    expect(r.ok).toBe(false);
  });

  it("hook_bandit_select with k > 50 → rejects (max)", async () => {
    const r = await call(server, "hook_bandit_select", { k: 100 });
    expect(r.ok).toBe(false);
  });

  it("hook_efficiency_roi with zero session_budget → rejects (positive)", async () => {
    const r = await call(server, "hook_efficiency_roi", { session_budget: 0 });
    expect(r.ok).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 4. Adversarial inputs
// ─────────────────────────────────────────────────────────────────────
describe("U-WIRE17 adversarial inputs", () => {
  it("hook_bandit_select with non-integer k → rejects", async () => {
    const r = await call(server, "hook_bandit_select", { k: 3.7 });
    expect(r.ok).toBe(false);
  });

  it("hook_bandit_select with negative time_budget_ms → rejects (positive)", async () => {
    const r = await call(server, "hook_bandit_select", { k: 3, time_budget_ms: -100 });
    expect(r.ok).toBe(false);
  });

  it("hook_bandit_select with time_budget_ms > 60s → rejects (max 60000)", async () => {
    const r = await call(server, "hook_bandit_select", { k: 3, time_budget_ms: 90000 });
    expect(r.ok).toBe(false);
  });

  it("hook_efficiency_roi with negative session_budget → rejects (positive)", async () => {
    const r = await call(server, "hook_efficiency_roi", { session_budget: -1000 });
    expect(r.ok).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 5. Backward-compat regression guards
// ─────────────────────────────────────────────────────────────────────
describe("U-WIRE17 regression guards", () => {
  it("dispatcher tool registered as prism_hook", () => {
    const tool = server.tools.find(t => t.name === "prism_hook");
    expect(tool?.name).toBe("prism_hook");
    expect(typeof tool?.handler).toBe("function");
  });

  it("pre-existing list action still routes", async () => {
    const r = await call(server, "list", {});
    expect(r.ok).toBe(true);
  });

  it("pre-existing reactive_chains still routes", async () => {
    const r = await call(server, "reactive_chains", {});
    expect(r.ok).toBe(true);
  });

  it("unknown action returns structured error", async () => {
    const r = await call(server, "definitely_not_a_real_hook_action_xyz", {});
    expect(r.ok).toBe(false);
  });
});
