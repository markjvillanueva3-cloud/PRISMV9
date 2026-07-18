/**
 * ManusATCSBridge.callClaude migration test (FREE-AI-MIGRATION/U-MANUS-ATCS-LLM-ROUTE, slot:india).
 *
 * Verifies the delegated-unit executor was migrated from a DIRECT paid Claude fetch to the
 * free Ollama-first llmEngine substrate. Under VITEST, llmEngine's test-hermeticity guard
 * disables both default provider paths -> the substrate returns its deterministic OFFLINE
 * response with NO network. So callClaude resolving to model:"offline" (and never throwing a
 * network error) is positive proof it now routes through llmEngine, not the old direct fetch
 * (which would have attempted a real api.anthropic.com call). Also asserts the LLMResponse ->
 * {text, tokens, duration_ms, model} mapping is correct (R9: real reference values).
 */
import { describe, it, expect } from "vitest";
import { callClaude, delegateUnits, pollResults } from "../engines/ManusATCSBridge.js";

/** Poll until the given task ids leave "running", or a bounded number of attempts.
 *  Background execution under test hermeticity (offline) resolves in ms, so this settles
 *  in the first few attempts; the cap just prevents an unbounded test hang. */
const POLL_ATTEMPTS = 100;     // x 10ms = up to ~1s, far beyond the ms-scale offline settle
const POLL_INTERVAL_MS = 10;
async function pollUntilSettled(taskIds: string[]): Promise<ReturnType<typeof pollResults>> {
  let last = pollResults(taskIds);
  for (let i = 0; i < POLL_ATTEMPTS && last.still_running > 0; i++) {
    await new Promise((res) => setTimeout(res, POLL_INTERVAL_MS));
    last = pollResults(taskIds);
  }
  return last;
}

describe("ManusATCSBridge.callClaude -> free llmEngine substrate", () => {
  it("routes through llmEngine (offline under test hermeticity) and maps the return shape", async () => {
    const res = await callClaude(
      "You are an autonomous PRISM build agent. Complete the delegated unit.",
      "Implement unit U-EXAMPLE: add a feed-rate validator.",
      "sonnet",
      2048,
    );

    // Proof of routing: offline is ONLY reachable via llmEngine's provider ladder.
    // The OLD direct fetch would have thrown a network/API error, not returned "offline".
    expect(res.model).toBe("offline");
    // Mapping correctness: tokens from LLMResponse.tokens_used (free/offline -> 0/0).
    expect(res.tokens).toEqual({ input: 0, output: 0 });
    // duration_ms is computed locally and is a real number.
    expect(typeof res.duration_ms).toBe("number");
    expect(res.duration_ms).toBeGreaterThanOrEqual(0);
    // The offline response is a real, non-empty grounded string (not a stub).
    expect(typeof res.text).toBe("string");
    expect(res.text.length).toBeGreaterThan(0);
  });

  it("does not throw on a degraded provider state (graceful, unlike the old fetch)", async () => {
    // The old direct fetch threw `Claude API <status>` on any non-ok response; the migrated
    // path degrades to offline instead -> a delegated unit gets an honest degraded answer,
    // never an uncaught throw out of callClaude.
    const res = await callClaude("system", "user prompt", undefined, undefined);
    expect(res.model).toBe("offline");
    expect(res.text.length).toBeGreaterThan(0);
    expect(res.tokens).toEqual({ input: 0, output: 0 });
  });

  it("accepts the advisory model arg for call-site compatibility (provider chosen by the ladder)", async () => {
    // executeUnitTask calls callClaude(system, user, getModelForTier('sonnet'), 4096).
    // The 3rd arg is advisory now; passing it must not change the routed result shape.
    const withModel = await callClaude("s", "u", "claude-sonnet-4-6", 1024);
    const withoutModel = await callClaude("s", "u", undefined, 1024);
    expect(withModel.model).toBe(withoutModel.model); // both "offline" under test -> ladder decides, not the arg
    expect(withModel.model).toBe("offline");
  });
});

describe("delegateUnits seam fix (free path reachable without a Claude key; offline -> honest fail)", () => {
  it("delegates WITHOUT requiring a Claude key (the old hasValidApiKey hard-gate is gone)", async () => {
    // Pre-migration this returned {success:false, errors:["ANTHROPIC_API_KEY not configured"]}
    // when no key was set. The free Ollama-first path must now be reachable regardless.
    const res = await delegateUnits([
      { unit_id: 9001, type: "research", description: "free-path reachability probe" },
    ]);
    expect(res.success).toBe(true);
    expect(res.delegated).toBe(1);
    expect(res.task_ids).toHaveLength(1);
    expect(res.errors ?? []).toEqual([]); // no "ANTHROPIC_API_KEY not configured" refusal
  });

  it("R12: an offline result (no provider under test) marks the unit FAILED, not completed", async () => {
    const res = await delegateUnits([
      { unit_id: 9002, type: "code_review", description: "offline-honesty probe" },
    ]);
    const settled = await pollUntilSettled(res.task_ids.map((t) => t.task_id));

    // Under test hermeticity no real provider answers -> offline -> the unit must be FAILED,
    // never reported as a completed delegated result with a stub body.
    expect(settled.completed).toHaveLength(0);
    expect(settled.failed).toHaveLength(1);
    expect(settled.failed[0].error).toMatch(/no AI provider available/i);
  });
});
