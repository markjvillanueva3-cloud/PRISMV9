/**
 * atcsDispatcher LLM-route migration test (FREE-AI-MIGRATION/U-ATCS-DISPATCHER-LLM-ROUTE, slot:india).
 *
 * Verifies prism_atcs's delegated-unit executor `callClaudeForUnit` was migrated from a DIRECT
 * paid Claude fetch (api.anthropic.com) to the free Ollama-first llmEngine substrate. Under
 * VITEST, llmEngine's test-hermeticity guard disables both default provider paths -> the
 * substrate returns its deterministic OFFLINE response with NO network. Because a delegated build
 * unit's offline stub is NOT a real result, callClaudeForUnit THROWS on offline (R12); the
 * delegate_to_manus per-unit .catch then marks the unit FAILED rather than COMPLETED.
 *
 * Three properties are proven:
 *  1. ROUTING -- callClaudeForUnit throws the ladder-exhausted "no AI provider available" error
 *     (reachable only via the llmEngine offline path). The OLD direct fetch would have thrown a
 *     network error or "Claude API <status>", never this message -> each test fails on revert.
 *  2. SEAM FIX -- delegate_to_manus reaches the task-load step WITHOUT an ANTHROPIC_API_KEY,
 *     proving the `if(!hasValidApiKey()) return err("ANTHROPIC_API_KEY not configured")` gate was
 *     removed (pre-migration it returned the key error before ever loading the task).
 *  3. R12 HONESTY -- the offline path is a fail-loud throw, never a stub returned as a result.
 *
 * The seam is exercised THROUGH the real registered dispatcher handler (mock-server capture).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { callClaudeForUnit, registerAtcsDispatcher } from "../tools/dispatchers/atcsDispatcher.js";

// Make the seam test's revert-detection environment-independent: with no ANTHROPIC_API_KEY in
// the process env, a REVERTED key-gate would return "ANTHROPIC_API_KEY not configured" before
// loading the task -> the seam assertions below would fail (as they must on revert). Without this
// guard, a CI runner that exports a real key would let a reverted gate fall through and silently
// pass. Saved/restored so we never leak the mutation to other test files in the same worker.
let savedKey: string | undefined;
beforeAll(() => { savedKey = process.env.ANTHROPIC_API_KEY; delete process.env.ANTHROPIC_API_KEY; });
afterAll(() => { if (savedKey !== undefined) process.env.ANTHROPIC_API_KEY = savedKey; });

type ToolResult = { content: Array<{ type: string; text: string }>; isError?: boolean };
type Handler = (args: { action: string; params?: Record<string, any> }) => Promise<ToolResult>;

// The exact R12 fail-loud message the migrated chokepoint throws when no provider answers.
const NO_PROVIDER = /no AI provider available \(Ollama down and no Claude backup key\)/i;
// The OLD direct-fetch / key-gate error fragments that must NOT appear post-migration.
const OLD_FETCH = /Claude API \d/;          // old: `Claude API ${status}: ...`
const OLD_KEY_GATE = /ANTHROPIC_API_KEY/;   // old gate: "ANTHROPIC_API_KEY not configured"

function captureAtcsHandler(): Handler {
  let handler: Handler | null = null;
  registerAtcsDispatcher({ tool: (_n: string, _d: string, _s: unknown, h: Handler) => { handler = h; } });
  if (!handler) throw new Error("registerAtcsDispatcher did not register a prism_atcs handler");
  return handler;
}

const handler = captureAtcsHandler();

async function call(action: string, params: Record<string, any> = {}): Promise<any> {
  const res = await handler({ action, params });
  return JSON.parse(res.content[0].text);
}

describe("atcsDispatcher.callClaudeForUnit -> free llmEngine substrate (routing + R12 throw)", () => {
  it("throws the ladder-exhausted no-provider error under hermeticity (routes through llmEngine)", async () => {
    let msg = "";
    try {
      await callClaudeForUnit(
        "You are a manufacturing data expert for PRISM. Output valid JSON only.",
        "Generate the tool list for unit U-7 (4140 steel bracket).",
        "claude-sonnet-4-6",
        4096,
      );
    } catch (e: any) {
      msg = String(e?.message ?? e);
    }
    // R12: offline (no provider) is a fail-loud throw, not a returned stub.
    expect(msg).toMatch(NO_PROVIDER);
    // routing proof: the old direct fetch path is gone (no "Claude API <status>", no key error).
    expect(msg).not.toMatch(OLD_FETCH);
    expect(msg).not.toMatch(OLD_KEY_GATE);
  });

  it("ignores the advisory model arg (provider chosen by the ladder, still offline -> throws)", async () => {
    // The 3rd arg was the model id; it is advisory now. An opus id must not change the routed
    // outcome under hermeticity -- the ladder, not the arg, selects the provider.
    await expect(
      callClaudeForUnit("s", "u", "claude-opus-4-8"),
    ).rejects.toThrow(NO_PROVIDER);
  });

  it("routes regardless of the maxTokens override (param passthrough does not change the ladder)", async () => {
    // A custom maxTokens is forwarded to llmEngine.query; under hermeticity the provider ladder
    // still exhausts to offline and throws -- the token cap does not affect routing.
    await expect(
      callClaudeForUnit("s", "u", "claude-sonnet-4-6", 256),
    ).rejects.toThrow(NO_PROVIDER);
  });
});

describe("delegate_to_manus seam fix (free path reachable without a Claude key)", () => {
  it("reaches the task-load step with no Claude key, NOT the removed ANTHROPIC_API_KEY gate", async () => {
    // Pre-migration this returned {error:"ANTHROPIC_API_KEY not configured. Add to .env file."}
    // at the top of the case, BEFORE loading the task. Post-migration the gate is gone, so a
    // non-existent task_id falls through to readJSON -> "File not found: ...TASK_MANIFEST.json".
    const res = await call("delegate_to_manus", { task_id: "nonexistent-fake-task-xyz-99999" });
    expect(res.error).toMatch(/File not found.*TASK_MANIFEST/i); // proves execution passed the (removed) gate
    expect(String(res.error)).not.toMatch(OLD_KEY_GATE);          // the old key gate is gone
  });
});
