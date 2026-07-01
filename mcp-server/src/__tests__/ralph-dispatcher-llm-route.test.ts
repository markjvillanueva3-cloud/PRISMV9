/**
 * ralphDispatcher LLM-route migration test (FREE-AI-MIGRATION/U-RALPH-DISPATCHER-LLM-ROUTE, slot:india).
 *
 * Verifies prism_ralph's validation/assessment chokepoint `callClaudeApi` was migrated from a
 * DIRECT paid Claude fetch (api.anthropic.com) to the free Ollama-first llmEngine substrate.
 * Under VITEST, llmEngine's test-hermeticity guard disables both default provider paths -> the
 * substrate returns its deterministic OFFLINE response. ralph's whole purpose is a REAL provider
 * review, so an offline stub is NOT a valid validation/assessment -- callClaudeApi THROWS on
 * offline (R12 fail-loud), and the dispatcher's try/catch surfaces it via dispatcherError.
 *
 * Three properties are proven:
 *  1. ROUTING -- callClaudeApi throws the ladder-exhausted "no AI provider available" error
 *     (reachable only via the llmEngine offline path), NOT the OLD "ANTHROPIC_API_KEY not set"
 *     pre-fetch gate message. The old direct fetch would have thrown the key-gate error (no key)
 *     or attempted a real api.anthropic.com call; neither yields the new message.
 *  2. SEAM FIX -- the old inline `if(!getApiKey()) throw "ANTHROPIC_API_KEY not set"` gate is gone;
 *     the free path runs with no Claude key.
 *  3. R12 HONESTY -- every action (scrutinize/assess/loop) surfaces the no-provider state as an
 *     honest error (success:false), never a fabricated validation/assessment from a stub.
 *
 * Actions are exercised THROUGH the real registered dispatcher handler (mock-server capture),
 * not only the callClaudeApi singleton -- a round-trip assertion per CLAUDE.md.
 */
import { describe, it, expect } from "vitest";
import { callClaudeApi, registerRalphDispatcher } from "../tools/dispatchers/ralphDispatcher.js";

type ToolResult = { content: Array<{ type: string; text: string }> };
type Handler = (args: { action: string; params?: Record<string, any> }) => Promise<ToolResult>;

// The exact R12 fail-loud message the migrated chokepoint throws when no provider answers.
const NO_PROVIDER = /no AI provider available \(Ollama down and no Claude backup key\)/i;
// The OLD pre-fetch key-gate message that must NEVER appear post-migration.
const OLD_KEY_GATE = /ANTHROPIC_API_KEY not set/;

function captureRalphHandler(): Handler {
  let handler: Handler | null = null;
  registerRalphDispatcher({ tool: (_n: string, _d: string, _s: unknown, h: Handler) => { handler = h; } });
  if (!handler) throw new Error("registerRalphDispatcher did not register a prism_ralph handler");
  return handler;
}

const handler = captureRalphHandler();

async function call(action: string, params: Record<string, any> = {}): Promise<any> {
  const res = await handler({ action, params });
  return JSON.parse(res.content[0].text);
}

describe("ralphDispatcher.callClaudeApi -> free llmEngine substrate (routing + R12 throw)", () => {
  it("throws the ladder-exhausted no-provider error under hermeticity (routes through llmEngine)", async () => {
    let msg = "";
    try {
      await callClaudeApi("You are a safety auditor.", "Review: const ap = 0.5; // depth of cut");
    } catch (e: any) {
      msg = String(e?.message ?? e);
    }
    // R12: offline (no provider) is a fail-loud throw, not a returned stub.
    expect(msg).toMatch(NO_PROVIDER);
    // SEAM: the old inline ANTHROPIC_API_KEY pre-fetch gate is gone.
    expect(msg).not.toMatch(OLD_KEY_GATE);
  });

  it("ignores the advisory model arg (provider chosen by the ladder, still offline -> throws)", async () => {
    // The 3rd arg was the model id; it is advisory now. Passing an opus id must not change the
    // routed outcome under hermeticity (the ladder, not the arg, selects the provider).
    await expect(callClaudeApi("s", "u", "claude-opus-4-8")).rejects.toThrow(NO_PROVIDER);
  });
});

describe("ralph actions surface the no-provider state honestly through the real handler (R12)", () => {
  it("scrutinize returns success:false with the no-provider error (round-trip via dispatcherError)", async () => {
    const res = await call("scrutinize", { content: "function feed(x){return x*2;}", validator: "CODE_REVIEWER" });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(NO_PROVIDER);
    expect(String(res.error)).not.toMatch(OLD_KEY_GATE);
  });

  it("scrutinize with the SAFETY_AUDITOR validator is also offline-honest (validator variability)", async () => {
    const res = await call("scrutinize", { content: "G1 X10 F500 ; rapid into stock", validator: "SAFETY_AUDITOR" });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(NO_PROVIDER);
  });

  it("assess returns success:false with the no-provider error (round-trip)", async () => {
    const res = await call("assess", { content: "A milling cycle that ramps at 0.5mm/rev.", context: "production readiness" });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(NO_PROVIDER);
  });

  it("loop (valid content) fails loud at phase 1 with the no-provider error (round-trip)", async () => {
    const res = await call("loop", { content: "A complete CNC program for a 4140 steel bracket with 6 features." });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(NO_PROVIDER);
  });
});

describe("ralph early-validation guard is independent of the provider (no llmEngine call)", () => {
  it("loop with too-short content returns the content guard error, never a provider error", async () => {
    // content.length < 10 hits the early guard BEFORE any callClaudeApi -- proves the guard is
    // unchanged and the free path is not invoked for invalid input.
    const res = await call("loop", { content: "short" });
    expect(res.error).toMatch(/No content provided/i);
    expect(String(res.error)).not.toMatch(NO_PROVIDER);
  });

  it("loop with empty params hits the same content guard (adversarial empty input)", async () => {
    const res = await call("loop", {});
    expect(res.error).toMatch(/No content provided/i);
    expect(String(res.error)).not.toMatch(NO_PROVIDER);
  });
});
