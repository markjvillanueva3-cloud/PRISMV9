/**
 * manusDispatcher LLM-route migration test (FREE-AI-MIGRATION/U-MANUS-DISPATCHER-LLM-ROUTE, slot:india).
 *
 * Verifies prism_manus's Claude-task actions were migrated from a DIRECT paid Claude fetch
 * (api.anthropic.com) to the free Ollama-first llmEngine substrate. Under VITEST, llmEngine's
 * test-hermeticity guard disables both default provider paths -> the substrate returns its
 * deterministic OFFLINE response with NO network. Three independent properties are proven:
 *  1. ROUTING -- callClaude resolving to model:"offline" with the deterministic offline message
 *     proves it now goes through the llmEngine provider ladder; the OLD direct fetch would have
 *     attempted a real api.anthropic.com call (throwing, not returning the offline text).
 *  2. SEAM FIX -- create_task / knowledge_lookup / code_reasoning being REACHABLE without an
 *     ANTHROPIC_API_KEY proves the three hasValidApiKey() hard-gates were relaxed (pre-migration
 *     each returned {error:"ANTHROPIC_API_KEY not configured..."}).
 *  3. R12 HONESTY -- an offline result is marked FAILED (create_task) / success:false
 *     (knowledge_lookup, code_reasoning), never a stub presented as completed work.
 *
 * Actions are exercised THROUGH the real registered dispatcher handler (captured via a mock
 * server), not only the callClaude singleton -- a round-trip assertion per CLAUDE.md.
 */
import { describe, it, expect } from "vitest";
import { callClaude, registerManusDispatcher } from "../tools/dispatchers/manusDispatcher.js";

type ToolResult = { content: Array<{ type: string; text: string }> };
type Handler = (args: { action: string; params?: Record<string, any> }) => Promise<ToolResult>;

// The deterministic offline body llmEngine returns when no provider answers (both context
// branches of _generateOfflineResponse are covered: "No ANTHROPIC_API_KEY configured..." with
// no context, "[Offline Mode ...]" with context).
const OFFLINE_TEXT = /offline mode|no anthropic_api_key configured/i;
// The exact genTaskId() shape: `manus_${counter}_${Date.now()}`.
const TASK_ID = /^manus_\d+_\d+$/;
// The exact R12 degraded-result message the migrated sites emit on an offline provider.
const NO_PROVIDER = /no AI provider available \(Ollama down and no Claude backup key\)/i;

/** Capture the inline handler registered with server.tool("prism_manus", ...). */
function captureManusHandler(): Handler {
  let handler: Handler | null = null;
  // registerManusDispatcher(server: any) -- a minimal object with .tool satisfies the call.
  registerManusDispatcher({ tool: (_n: string, _d: string, _s: unknown, h: Handler) => { handler = h; } });
  if (!handler) throw new Error("registerManusDispatcher did not register a prism_manus handler");
  return handler;
}

const handler = captureManusHandler();

async function call(action: string, params: Record<string, any> = {}): Promise<any> {
  const res = await handler({ action, params });
  return JSON.parse(res.content[0].text);
}

/** Poll task_result until the task leaves pending/running (offline settles in ms under hermeticity). */
async function pollTask(taskId: string, attempts = 100, intervalMs = 10): Promise<any> {
  let last = await call("task_result", { task_id: taskId });
  for (let i = 0; i < attempts && (last.status === "pending" || last.status === "running"); i++) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    last = await call("task_result", { task_id: taskId });
  }
  return last;
}

describe("manusDispatcher.callClaude -> free llmEngine substrate (routing)", () => {
  it("routes through llmEngine (offline under test hermeticity) and maps the return shape", async () => {
    const res = await callClaude(
      "You are a PRISM build agent. Execute the unit.",
      "Summarize the Kienzle cutting-force model in one paragraph.",
      "sonnet",
      2048,
    );
    // offline is ONLY reachable via llmEngine's provider ladder; the old fetch would have thrown.
    expect(res.model).toBe("offline");
    // mapping: tokens come straight from LLMResponse.tokens_used (free/offline -> exactly 0/0).
    expect(res.tokens).toEqual({ input: 0, output: 0 });
    // the body is llmEngine's deterministic offline message, not a thrown network error.
    expect(res.text).toMatch(OFFLINE_TEXT);
  });

  it("does not throw on a degraded provider state (graceful, unlike the old direct fetch)", async () => {
    // The old fetch threw `Claude API <status>` on any non-ok response; the migrated path
    // degrades to the offline body instead -> an honest answer, never an uncaught throw.
    const res = await callClaude("system", "user prompt", undefined, undefined);
    expect(res.model).toBe("offline");
    expect(res.text).toMatch(OFFLINE_TEXT);
    expect(res.tokens).toEqual({ input: 0, output: 0 });
  });

  it("accepts the advisory model arg for call-site compatibility (provider chosen by the ladder)", async () => {
    const withModel = await callClaude("s", "u", "claude-sonnet-4-6", 1024);
    const withoutModel = await callClaude("s", "u", undefined, 1024);
    // the 3rd arg is advisory now -- it must not change which provider the ladder selects.
    expect(withModel.model).toBe("offline");
    expect(withoutModel.model).toBe("offline");
  });
});

describe("create_task seam fix + R12 (reachable without a Claude key; offline -> FAILED)", () => {
  it("create_task is reachable WITHOUT a Claude key (the hasValidApiKey hard-gate is gone)", async () => {
    // Pre-migration with no key this returned {error:"ANTHROPIC_API_KEY not configured. Add to .env file."}.
    const res = await call("create_task", { prompt: "Implement a feed-rate validator.", mode: "quality" });
    expect(res.success).toBe(true);
    expect(res.status).toBe("pending");
    expect(res.task_id).toMatch(TASK_ID);
    expect(res.message).toMatch(/task queued/i);
  });

  it("an offline task is marked FAILED (R12), never completed with a stub body", async () => {
    const created = await call("create_task", { prompt: "Offline-honesty probe.", mode: "speed" });
    expect(created.success).toBe(true);
    const settled = await pollTask(created.task_id);
    expect(settled.status).toBe("failed");
    expect(settled.error).toMatch(NO_PROVIDER);
    // a failed offline task must NOT surface a result body as if it were real delegated work.
    expect(settled).not.toHaveProperty("output");
  });
});

describe("knowledge_lookup + code_reasoning seam fix + R12", () => {
  it("knowledge_lookup is reachable without a key and reports offline honestly (success:false)", async () => {
    const res = await call("knowledge_lookup", { query: "ISO 513 turning insert grades", depth: "deep" });
    expect(res.success).toBe(false);
    expect(res.model).toBe("offline");
    expect(res.error).toMatch(NO_PROVIDER);
    // the old ANTHROPIC_API_KEY refusal must be gone, and no real research payload is emitted offline.
    expect(String(res.error)).not.toMatch(/ANTHROPIC_API_KEY not configured/);
    expect(res).not.toHaveProperty("research");
  });

  it("code_reasoning is reachable without a key and reports offline honestly (success:false)", async () => {
    const res = await call("code_reasoning", {
      language: "python",
      code: "print(2 + 2)",
      task_description: "expected output",
    });
    expect(res.success).toBe(false);
    expect(res.model).toBe("offline");
    expect(res.error).toMatch(NO_PROVIDER);
    expect(String(res.error)).not.toMatch(/ANTHROPIC_API_KEY not configured/);
    expect(res).not.toHaveProperty("analysis");
  });
});

describe("R12 visibility + variability + adversarial coverage", () => {
  it("task_status (not just task_result) reports the offline task as failed with no result", async () => {
    // The OTHER status-reading action must also reflect the honest failed state.
    const created = await call("create_task", { prompt: "Status-visibility probe.", mode: "balanced" });
    await pollTask(created.task_id);
    const st = await call("task_status", { task_id: created.task_id });
    expect(st.status).toBe("failed");
    expect(st.has_result).toBe(false); // !!task.result -> no stub body recorded
    expect(st.error).toMatch(NO_PROVIDER);
  });

  it("knowledge_lookup with the default 'standard' depth (haiku-tier advisory) is still offline-honest", async () => {
    // Variability: the 'standard' branch maps to a different advisory tier than 'deep'; the free
    // ladder still answers, and offline is reported honestly regardless of the advisory model.
    const res = await call("knowledge_lookup", { query: "carbide grade for 4140 turning", depth: "standard" });
    expect(res.success).toBe(false);
    expect(res.model).toBe("offline");
    expect(res.error).toMatch(NO_PROVIDER);
  });

  it("code_reasoning with an empty code string (adversarial) still routes and fails honestly", async () => {
    // Empty code satisfies the z.string() schema; the migrated path must route it, not crash,
    // and report offline honestly rather than emitting a fabricated analysis.
    const res = await call("code_reasoning", { language: "python", code: "" });
    expect(res.success).toBe(false);
    expect(res.model).toBe("offline");
    expect(res.error).toMatch(NO_PROVIDER);
    expect(res).not.toHaveProperty("analysis");
  });
});
