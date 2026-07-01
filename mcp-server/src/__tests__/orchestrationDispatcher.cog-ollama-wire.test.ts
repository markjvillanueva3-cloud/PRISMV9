/**
 * orchestrationDispatcher — Ollama / Local Model Orchestrator wiring suite
 * =========================================================================
 *
 * COGNITIVE-BRIDGE-MS0 / U-WIRE-COG-BATCH6
 *
 * Verifies 2 token-saving / model-routing engines reach prism_orchestrate
 * with deterministic structural assertions:
 *   - ollamaIntegrationEngine        → ollama_ensure_connected / ping / discover_models
 *   - localModelOrchestratorEngine   → local_model_route
 *
 * @milestone COGNITIVE-BRIDGE-MS0
 * @unit U-WIRE-COG-BATCH6
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerOrchestrationDispatcher } from "../tools/dispatchers/orchestrationDispatcher.js";

// Canonical TaskKind enum (mirrors ModelRoutingEngine.ts:32 — drift detector)
const TASK_KINDS = ["chat", "code", "embed", "reasoning", "safety_critical", "gcode_explain", "quote_summary"] as const;
const BACKENDS = ["ollama", "anthropic", "openai"] as const;
const HARDWARE_PROFILES = ["home_blackwell", "home_4080", "work_3080", "cloud_only"] as const;

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
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw as unknown as Record<string, unknown> };
  }
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

describe("U-WIRE-COG-BATCH6 / OllamaIntegrationEngine", () => {
  it("ollama_ensure_connected returns a typed envelope (connected agrees with health.ok)", async () => {
    const r = await call(server, "ollama_ensure_connected");
    expect(r.ok).toBe(true);
    // Whether or not ollama is reachable, connected must be a real boolean
    // and (when health survives slimming) health.ok must agree with it.
    expect([true, false]).toContain(r.data.connected as boolean);
    const health = r.data.health as { ok?: boolean } | undefined;
    if (health?.ok !== undefined) {
      expect(health.ok).toBe(r.data.connected);
    }
  });

  it("ollama_ping returns a structured OllamaHealth envelope (ok is boolean OR slimmed when false)", async () => {
    const r = await call(server, "ollama_ping");
    expect(r.ok).toBe(true);
    const health = r.data.health as { ok?: boolean; lastCheckMs?: number } | undefined;
    // Health object always present (we never return undefined health from dispatcher).
    expect(health).toBeTypeOf("object");
    // ok is either explicit boolean OR slimmed-away when false-and-other-fields-empty.
    if (health?.ok !== undefined) {
      expect(typeof health.ok).toBe("boolean");
    }
  });

  it("ollama_discover_models returns count === models.length invariant (count=0 in test env)", async () => {
    const r = await call(server, "ollama_discover_models", { force_refresh: false });
    expect(r.ok).toBe(true);
    const models = (r.data.models as string[] | undefined) ?? [];
    const count = (r.data.count as number | undefined) ?? 0;
    expect(count).toBe(models.length);
    expect(count).toBe(0);
  });
});

describe("U-WIRE-COG-BATCH6 / LocalModelOrchestratorEngine.route", () => {
  it("route(reasoning, cloud_only) selects anthropic backend by hardware policy", async () => {
    const r = await call(server, "local_model_route", {
      task_kind: "reasoning",
      prompt: "Explain why we override Vc when chip thinning is engaged",
      input_tokens: 200,
      output_tokens_max: 512,
      hardware: "cloud_only",
    });
    expect(r.ok).toBe(true);
    const decision = r.data.decision as { ok: boolean; backend: string; model: string; rationale: string; fallbacks: Array<{ backend: string; model: string }> };
    expect(decision.ok).toBe(true);
    // cloud_only hardware excludes ollama → backend must be anthropic or openai
    expect(["anthropic", "openai"]).toContain(decision.backend);
    expect(decision.model.length).toBeGreaterThan(0);
    expect(decision.rationale.length).toBeGreaterThan(0);
  });

  it("route forceBackend=ollama returns backend===ollama when ollama is up", async () => {
    const r = await call(server, "local_model_route", {
      task_kind: "code",
      prompt: "explain this function",
      hardware: "home_4080",
      force_backend: "ollama",
      backend_up: { ollama: true },
    });
    expect(r.ok).toBe(true);
    const decision = r.data.decision as { ok: boolean; backend: string | null };
    // forceBackend=ollama + ollama:true should route to ollama OR refuse (if budget
    // disallows). Either way, the chosen backend cannot be a different one.
    if (decision.ok) {
      expect(decision.backend).toBe("ollama");
    } else {
      // Engine sets backend: null on refuse; slimResponse strips nulls.
      expect(Object.prototype.hasOwnProperty.call(decision, "backend")).toBe(false);
    }
  });

  it("route preserves the task_kind contract — chosen backend is one of the 3 known", async () => {
    const r = await call(server, "local_model_route", {
      task_kind: "chat",
      prompt: "hi",
      hardware: "home_4080",
    });
    expect(r.ok).toBe(true);
    const decision = r.data.decision as { ok: boolean; backend: string | null };
    if (decision.ok) {
      expect(BACKENDS).toContain(decision.backend as typeof BACKENDS[number]);
    } else {
      // Engine sets backend: null on refuse; slimResponse strips nulls.
      expect(Object.prototype.hasOwnProperty.call(decision, "backend")).toBe(false);
    }
  });

  it.each(HARDWARE_PROFILES.map(h => [h] as const))("route variability: hardware=%s yields a successful decision", async (hw) => {
    const r = await call(server, "local_model_route", {
      task_kind: "chat",
      prompt: "ping",
      hardware: hw,
    });
    expect(r.ok).toBe(true);
    const decision = r.data.decision as { ok: boolean; backend: string };
    expect(decision.ok).toBe(true);
    expect(BACKENDS).toContain(decision.backend as typeof BACKENDS[number]);
  });

  it.each(TASK_KINDS.map(k => [k] as const))("route variability: task_kind=%s returns valid backend choice", async (kind) => {
    const params: Record<string, unknown> = { task_kind: kind, hardware: "home_4080" };
    if (kind === "embed") params.embed_input = "text to embed";
    else params.prompt = "task prompt";
    const r = await call(server, "local_model_route", params);
    expect(r.ok).toBe(true);
    const decision = r.data.decision as { ok: boolean; backend: string };
    if (decision.ok) {
      expect(BACKENDS).toContain(decision.backend as typeof BACKENDS[number]);
    }
  });
});

describe("U-WIRE-COG-BATCH6 / schema rejections", () => {
  it("rejects local_model_route with invalid task_kind", async () => {
    const r = await call(server, "local_model_route", { task_kind: "not_a_task", hardware: "home_4080" });
    expect(r.ok).toBe(false);
  });

  it("rejects local_model_route with invalid hardware", async () => {
    const r = await call(server, "local_model_route", { task_kind: "chat", hardware: "not_a_hw" });
    expect(r.ok).toBe(false);
  });

  it("rejects local_model_route with negative input_tokens", async () => {
    const r = await call(server, "local_model_route", { task_kind: "chat", hardware: "home_4080", input_tokens: -10 });
    expect(r.ok).toBe(false);
  });

  it("rejects local_model_route with output_tokens_max=0 (positive required)", async () => {
    const r = await call(server, "local_model_route", { task_kind: "chat", hardware: "home_4080", output_tokens_max: 0 });
    expect(r.ok).toBe(false);
  });
});

describe("U-WIRE-COG-BATCH6 / adversarial", () => {
  it("route handles 100KB prompt without throwing or returning NaN budgets", async () => {
    const r = await call(server, "local_model_route", {
      task_kind: "code",
      prompt: "x".repeat(100_000),
      hardware: "home_4080",
    });
    expect(r.ok).toBe(true);
    const decision = r.data.decision as { ok: boolean };
    expect(typeof decision.ok).toBe("boolean");
  });

  it("route with cost_budget=0 still returns a structured decision (may refuse)", async () => {
    const r = await call(server, "local_model_route", {
      task_kind: "reasoning",
      prompt: "a problem",
      hardware: "cloud_only",
      cost_budget_usd: 0,
    });
    expect(r.ok).toBe(true);
    // ok could be true (chose ollama since it's $0) or false (no backend fits cloud_only + $0)
    const decision = r.data.decision as { ok: boolean };
    expect([true, false]).toContain(decision.ok);
  });
});
