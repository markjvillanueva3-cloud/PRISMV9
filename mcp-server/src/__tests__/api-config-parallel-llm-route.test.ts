/**
 * parallelAPICalls LLM-route migration test
 * (FREE-AI-MIGRATION/U-PARALLELAPI-LLM-ROUTE, slot:india).
 *
 * Verifies the shared paid-call chokepoint `parallelAPICalls` (api-config.ts) was migrated from a
 * direct PAID Anthropic call (getAnthropicClient().messages.create, gated by a hasValidApiKey()
 * throw) to the free Ollama-first llmEngine.query substrate. The function dynamic-imports the SAME
 * llmEngine singleton, so vi.spyOn(llmEngine, "query") intercepts. Return shape is byte-identical
 * ({text, tokens, duration_ms, model, error?}) so the 5 consumers are unaffected.
 *
 * Properties proven:
 *  1. SEAM FIX -- with NO key the function no longer THROWS "ANTHROPIC_API_KEY required"; it routes
 *     to the free substrate and returns per-prompt results.
 *  2. ROUTING + R12 -- offline (net-disabled under VITEST) -> each result carries model:"offline"
 *     and a populated `error` field (never a silent empty success), text:"".
 *  3. SUCCESS MAPPING -- a real answer maps to {text:res.answer, tokens:res.tokens_used, model:res.model}
 *     with no error key; query is called with {prompt, system, complexity:"high", max_tokens, temperature}.
 *  4. PER-PROMPT ERROR ISOLATION -- one failing prompt yields its own error without failing the batch
 *     (Promise.all per-prompt try/catch), order preserved.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { parallelAPICalls } from "../config/api-config.js";
import { llmEngine } from "../engines/LLMEngine.js";

let savedKey: string | undefined;

beforeAll(() => {
  savedKey = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY; // no Claude key -> the old throw would have fired pre-migration
});

afterEach(() => { vi.restoreAllMocks(); });

afterAll(() => {
  if (savedKey !== undefined) process.env.ANTHROPIC_API_KEY = savedKey;
});

describe("parallelAPICalls -> free llmEngine.query substrate", () => {
  it("no key: does NOT throw (seam removed); offline -> per-prompt model:offline + error (R12), text empty", async () => {
    // call through (no mock) -> query is net-disabled under VITEST -> model:"offline".
    const results = await parallelAPICalls([
      { system: "You are an analyst.", user: "Prompt A" },
      { system: "You are an analyst.", user: "Prompt B" },
    ]);
    expect(results).toHaveLength(2);
    for (const r of results) {
      expect(r.model).toBe("offline");
      expect(r.text).toBe("");
      expect(r.error).toMatch(/no reasoning provider available/i);
      expect(r.duration_ms).toBeGreaterThanOrEqual(0);
    }
  });

  it("success: maps res.answer/tokens_used/model with no error key, and calls query with the migrated shape", async () => {
    const spy = vi.spyOn(llmEngine, "query").mockResolvedValue({
      answer: "structured analysis result",
      context_used: [],
      model: "qwen2.5-coder:32b (ollama)",
      tokens_used: { input: 7, output: 21 },
      duration_ms: 4,
      cached: false,
    });
    const results = await parallelAPICalls([
      { system: "SYS", user: "reason about X", maxTokens: 512, temperature: 0.1 },
    ]);
    expect(results).toHaveLength(1);
    expect(results[0].text).toBe("structured analysis result");
    expect(results[0].tokens).toEqual({ input: 7, output: 21 });
    expect(results[0].model).toBe("qwen2.5-coder:32b (ollama)");
    expect(results[0]).not.toHaveProperty("error"); // success path must not set an error
    // routed through query with the migrated contract (free substrate, high complexity, caller's system+limits)
    const arg = spy.mock.calls[0][0];
    expect(arg.prompt).toBe("reason about X");
    expect(arg.system).toBe("SYS");
    expect(arg.complexity).toBe("high");
    expect(arg.max_tokens).toBe(512);
    expect(arg.temperature).toBe(0.1);
  });

  it("per-prompt error isolation: one failing prompt does not fail the batch; order preserved", async () => {
    vi.spyOn(llmEngine, "query").mockImplementation(async (q: any) => {
      if (q.prompt === "BAD") throw new Error("provider boom");
      return {
        answer: "ok", context_used: [], model: "qwen (ollama)",
        tokens_used: { input: 1, output: 1 }, duration_ms: 1, cached: false,
      };
    });
    const results = await parallelAPICalls([
      { system: "s", user: "GOOD" },
      { system: "s", user: "BAD" },
    ]);
    expect(results).toHaveLength(2);
    expect(results[0].text).toBe("ok");
    expect(results[0]).not.toHaveProperty("error");
    expect(results[1].text).toBe("");
    expect(results[1].error).toMatch(/provider boom/);
  });
});
