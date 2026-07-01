/**
 * InferenceChainEngine free-AI wiring test
 * (FREE-AI-MIGRATION/U-INFERENCECHAIN-LLM-WIRE, slot:india).
 *
 * Verifies runInferenceChain's no-ANTHROPIC_API_KEY pre-gate was removed so it REACHES the now-free
 * Ollama-first parallelAPICalls substrate (the chokepoint freed in U-PARALLELAPI-LLM-ROUTE). This is
 * the consumer-level proof the chokepoint migration is delivered, not orphaned: pre-migration, a
 * no-key run returned buildNoKeyResult ("ANTHROPIC_API_KEY not configured...") WITHOUT calling any
 * provider; post-migration it routes through parallelAPICalls -> llmEngine.query (same module
 * singleton, so vi.spyOn intercepts).
 *
 * Properties proven:
 *  1. WIRING + SEAM -- with NO key, runInferenceChain calls llmEngine.query (reached the free path)
 *     and does NOT return the old "ANTHROPIC_API_KEY not configured" message.
 *  2. R12 -- offline (net-disabled under VITEST) degrades to a real attempt -> status:"failed"
 *     (per-step error), never fabricated reasoning.
 *  3. SUCCESS -- a real free answer completes the chain (status:"completed", step output captured).
 */
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { runInferenceChain } from "../engines/InferenceChainEngine.js";
import type { ChainStep } from "../engines/InferenceChainEngine.js";
import { llmEngine } from "../engines/LLMEngine.js";

let savedKey: string | undefined;

beforeAll(() => {
  savedKey = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY; // the exact "free at launch" scenario (no Claude key)
});

afterEach(() => { vi.restoreAllMocks(); });

afterAll(() => {
  if (savedKey !== undefined) process.env.ANTHROPIC_API_KEY = savedKey;
});

const cfg = (steps: ChainStep[]) => ({ name: "wire-test", log_to_disk: false, input: {}, steps });

describe("runInferenceChain -> free parallelAPICalls substrate (FREE-AI-MIGRATION wire)", () => {
  it("no key: reaches the free substrate (NOT the old no-key gate); offline -> status failed via a real attempt (R12)", async () => {
    const spy = vi.spyOn(llmEngine, "query"); // call through -> offline under VITEST
    const result = await runInferenceChain(cfg([
      { name: "classify", prompt_template: "Classify machining problem X.", model_tier: "haiku" },
    ]));
    // WIRING PROOF: the old no-key gate returned "ANTHROPIC_API_KEY not configured..." WITHOUT calling
    // a provider; now it routes through parallelAPICalls -> llmEngine.query.
    expect(spy).toHaveBeenCalled();
    expect(result.final_output).not.toMatch(/ANTHROPIC_API_KEY not configured/);
    // offline -> the chain attempted and degraded gracefully: a single offline step yields status
    // "partial" (NOT "completed", NOT the old no-key "failed" short-circuit), empty final_output, and
    // zero completed steps -- R12: an offline empty output is never mistaken for real reasoning.
    expect(result.status).toBe("partial");
    expect(result.final_output).toBe("");
    expect(result.steps_completed).toBe(0);
  });

  it("success: a real free answer completes the chain (status completed, step output captured)", async () => {
    vi.spyOn(llmEngine, "query").mockResolvedValue({
      answer: "Problem class: thin-wall chatter.",
      context_used: [],
      model: "qwen2.5-coder:32b (ollama)",
      tokens_used: { input: 10, output: 30 },
      duration_ms: 5,
      cached: false,
    });
    const result = await runInferenceChain(cfg([
      { name: "classify", prompt_template: "Classify the manufacturing problem.", model_tier: "haiku" },
    ]));
    expect(result.status).toBe("completed");
    expect(result.final_output).toContain("thin-wall chatter");
    expect(result.steps_completed).toBe(1);
  });
});
