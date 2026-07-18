import { describe, it, expect, vi, afterEach } from "vitest";
import { ollamaClientEngine } from "../engines/OllamaClientEngine.js";
import { FanoutPlanRequestSchema } from "../engines/HermesParallelFanoutPlannerEngine.js";

/**
 * Dispatcher round-trip E2E for the C1 goal decomposer (U-HERMES-GOAL-DECOMPOSE, slot:bravo).
 * The R15-WIRE proof that prism_session:hermes_decompose_goal actually routes to
 * HermesGoalDecomposerEngine THROUGH the dispatcher (the C3 "built but not wired together" seam is
 * only refuted by driving the case). The full LLM-backed decompose path is unit-tested with a fake
 * llm in HermesGoalDecomposerEngine.test.ts; THESE drive the WIRING hermetically via prompt_only,
 * which builds + returns the decomposition prompt with NO Ollama call -- so the suite never depends
 * on a running daemon, plus the empty-goal/no-candidate fail-loud paths exercised through the case.
 */
import { registerSessionDispatcher } from "../tools/dispatchers/sessionDispatcher.js";

type McpHandler = (args: { action: string; params?: Record<string, unknown> }) => Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}>;

function captureHandler(): McpHandler {
  let handler: McpHandler | null = null;
  const server = {
    tool(_name: string, _description: string, _schema: Record<string, unknown>, cb: McpHandler) { handler = cb; },
  };
  registerSessionDispatcher(server as unknown as Parameters<typeof registerSessionDispatcher>[0]);
  if (!handler) throw new Error("registerSessionDispatcher did not register a handler");
  return handler;
}

async function invoke(handler: McpHandler, action: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  const result = await handler({ action, params });
  const raw = (result as { content: Array<{ text: string }> }).content[0]?.text ?? "";
  return JSON.parse(raw);
}

const cand = (slot: string, primary_domain: string | null) => ({ slot, hermes_role: "specialist", primary_domain, score: 5 });

describe("prism_session:hermes_decompose_goal -- C1 decomposer round-trip (hermetic via prompt_only)", () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it("LIVE path: the returned request survives slimResponse + re-parses via FanoutPlanRequestSchema (leaf depends_on intact)", async () => {
    // Drive the REAL decompose path hermetically by stubbing the Ollama singleton the dispatcher
    // lazy-imports (same module instance). This is the round-trip the prompt_only/fail-loud tests
    // could NOT exercise: the produced FanoutPlanRequest goes back through ok()->slimResponse (which
    // DROPS empty arrays) and must still re-parse, or the C1 executor's next step
    // (project_governed_schedule -> FanoutPlanRequestSchema.parse) throws "Required" on every leaf.
    vi.spyOn(ollamaClientEngine, "isConnected").mockReturnValue(true);
    vi.spyOn(ollamaClientEngine, "generate").mockResolvedValue({
      ok: true,
      value: JSON.stringify({ subtasks: [
        { subtask_id: "core", description: "build the core", domain: "mill", depends_on: [], size_hint: "short" },
        { subtask_id: "wire", description: "wire it", domain: "mill", depends_on: ["core"], size_hint: "short" },
      ] }),
      wallMs: 5,
    } as Awaited<ReturnType<typeof ollamaClientEngine.generate>>);

    const handler = captureHandler();
    const r = await invoke(handler, "hermes_decompose_goal", { goal: "build x", candidates: [cand("alpha", "mill")] });
    expect(r.success).toBe(true);
    // r.request is the post-slimResponse JSON (invoke parses content[0].text = JSON.stringify(slimResponse(...))).
    // It MUST re-parse cleanly -- pre-fix the leaf "core" lost depends_on and this threw.
    const reparsed = FanoutPlanRequestSchema.parse(r.request);
    expect(reparsed.subtasks.find((s) => s.subtask_id === "core")?.depends_on).toEqual([]); // leaf survives slim
    expect(reparsed.subtasks.find((s) => s.subtask_id === "wire")?.depends_on).toEqual(["core"]); // non-leaf intact
    expect(reparsed.parent_task_id).toBe("goal-build-x");
  });

  it("prompt_only builds + returns the decomposition prompt THROUGH the dispatcher (no Ollama)", async () => {
    const handler = captureHandler();
    const r = await invoke(handler, "hermes_decompose_goal", {
      goal: "ship the lathe wizard",
      candidates: [cand("alpha", "mill"), cand("charlie", "lathe")],
      max_subtasks: 5,
      prompt_only: true,
    });
    expect(r.success).toBe(true);
    const prompt = String(r.prompt);
    expect(prompt).toContain("ship the lathe wizard");      // goal embedded
    expect(prompt).toContain("mill, lathe");                // candidate domains embedded
    expect(prompt).toMatch(/2\.\.5 subtasks/);              // max_subtasks honored through the dispatcher
    expect(prompt).toMatch(/STRICT JSON/i);
  });

  it("FAIL-LOUD through the dispatcher: an empty goal returns success:false with the engine's exact error", async () => {
    const handler = captureHandler();
    // No prompt_only -> the case reaches decompose(), which throws on an empty goal BEFORE any LLM
    // call. The dispatcher's catch -> dispatcherError() returns { success:false, error:<message> } --
    // the error envelope, NOT a fabricated { success:true, request } plan.
    const r = await invoke(handler, "hermes_decompose_goal", { goal: "   ", candidates: [cand("alpha", "mill")] });
    expect(r.success).toBe(false);                          // explicit failure, not a silent pass / not a plan
    expect(String(r.error)).toMatch(/non-empty/i);          // the engine's exact throw reason propagated
  });

  it("FAIL-LOUD through the dispatcher: no candidates returns success:false with the candidate-required error", async () => {
    const handler = captureHandler();
    const r = await invoke(handler, "hermes_decompose_goal", { goal: "build something", candidates: [] });
    expect(r.success).toBe(false);
    expect(String(r.error)).toMatch(/candidate/i);
  });
});
