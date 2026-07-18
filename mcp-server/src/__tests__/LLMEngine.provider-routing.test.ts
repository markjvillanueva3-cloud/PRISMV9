/**
 * LLMEngine provider-routing tests (FREE-AI-MIGRATION/U-LLM-OLLAMA-FIRST, slot:india).
 *
 * Verifies the Ollama-first runtime routing that makes product AI features cost $0
 * at launch (operator goal). Both providers are INJECTED via the deps param so the
 * test exercises real routing logic with no network (R9: verifies intent).
 *
 * Loss-function coverage:
 *  - Ollama up   -> routes to Ollama (free), model tagged "(ollama)", Claude NOT called
 *  - Ollama down + key -> adaptive fallback to Claude (paid)
 *  - Ollama down + no key -> deterministic offline response
 *  - prefer:"ollama" (strict-free) -> Ollama down never pays Claude even with a key
 *  - prefer:"claude" -> Ollama never tried
 *  - adaptive cooldown -> after one Ollama failure, subsequent queries skip Ollama
 *  - LLMResponse contract preserved + 5-min cache
 */
import { describe, it, expect, vi } from "vitest";
import { LLMEngine, type LLMDeps } from "../engines/LLMEngine.js";

const KEY = "test-key-not-a-secret";

function okOllama(text = "OLLAMA-ANSWER"): LLMDeps["ollamaGenerate"] {
  return vi.fn(async () => ({ ok: true, value: text, error: null }));
}
function downOllama(): LLMDeps["ollamaGenerate"] {
  return vi.fn(async () => ({ ok: false, value: null, error: "not connected" }));
}
function okClaude(text = "CLAUDE-ANSWER"): LLMDeps["claudeCall"] {
  return vi.fn(async () => ({ text, usage: { input: 11, output: 22 } }));
}

describe("LLMEngine provider routing (Ollama-first, free-at-launch)", () => {
  it("routes to Ollama when up; Claude is never called; model tagged (ollama); free tokens", async () => {
    const ollamaGenerate = okOllama("milling feed 0.1mm/tooth");
    const claudeCall = okClaude();
    const eng = new LLMEngine({ api_key: KEY }, { ollamaGenerate, claudeCall });

    const res = await eng.query({ prompt: "what feed for 6061?" });

    expect(res.answer).toBe("milling feed 0.1mm/tooth");
    expect(res.model).toBe("qwen2.5-coder:32b (ollama)");
    expect(res.tokens_used).toEqual({ input: 0, output: 0 });
    expect(ollamaGenerate).toHaveBeenCalledTimes(1);
    expect(claudeCall).not.toHaveBeenCalled();
    // the system prompt + user prompt reach Ollama
    expect((ollamaGenerate as any).mock.calls[0][0].model).toBe("qwen2.5-coder:32b");
    expect((ollamaGenerate as any).mock.calls[0][0].prompt).toBe("what feed for 6061?");
  });

  it("falls back to Claude when Ollama is down and an api_key is set", async () => {
    const ollamaGenerate = downOllama();
    const claudeCall = okClaude("claude fallback answer");
    const eng = new LLMEngine({ api_key: KEY }, { ollamaGenerate, claudeCall });

    const res = await eng.query({ prompt: "explain this quote" });

    expect(res.answer).toBe("claude fallback answer");
    expect(res.model).toBe("claude-sonnet-4-6");
    expect(res.tokens_used).toEqual({ input: 11, output: 22 });
    expect(ollamaGenerate).toHaveBeenCalledTimes(1);
    expect(claudeCall).toHaveBeenCalledTimes(1);
  });

  it("returns the deterministic offline response when Ollama is down and there is no api_key", async () => {
    const ollamaGenerate = downOllama();
    const claudeCall = okClaude();
    const eng = new LLMEngine({ api_key: undefined }, { ollamaGenerate, claudeCall });

    const res = await eng.query({ prompt: "process advice" });

    expect(res.model).toBe("offline");
    expect(res.answer).toContain("No ANTHROPIC_API_KEY");
    expect(claudeCall).not.toHaveBeenCalled();
  });

  it('prefer:"ollama" (strict-free) NEVER pays Claude even with a key when Ollama is down', async () => {
    const ollamaGenerate = downOllama();
    const claudeCall = okClaude();
    const eng = new LLMEngine({ api_key: KEY, prefer: "ollama" }, { ollamaGenerate, claudeCall });

    const res = await eng.query({ prompt: "anything" });

    expect(res.model).toBe("offline");
    expect(claudeCall).not.toHaveBeenCalled();
  });

  it('prefer:"claude" never tries Ollama', async () => {
    const ollamaGenerate = okOllama();
    const claudeCall = okClaude("forced claude");
    const eng = new LLMEngine({ api_key: KEY, prefer: "claude" }, { ollamaGenerate, claudeCall });

    const res = await eng.query({ prompt: "force frontier" });

    expect(res.answer).toBe("forced claude");
    expect(res.model).toBe("claude-sonnet-4-6");
    expect(ollamaGenerate).not.toHaveBeenCalled();
  });

  it("adaptive cooldown: after one Ollama failure, the next query skips Ollama and uses Claude", async () => {
    const ollamaGenerate = downOllama();
    const claudeCall = okClaude("claude-2");
    const eng = new LLMEngine({ api_key: KEY }, { ollamaGenerate, claudeCall });

    await eng.query({ prompt: "q1 distinct" });
    await eng.query({ prompt: "q2 distinct" });

    // Ollama probed once (q1), then skipped during cooldown (q2 went straight to Claude)
    expect(ollamaGenerate).toHaveBeenCalledTimes(1);
    expect(claudeCall).toHaveBeenCalledTimes(2);
  });

  it("treats an empty Ollama string as a failure and falls back", async () => {
    const ollamaGenerate = vi.fn(async () => ({ ok: true, value: "", error: null }));
    const claudeCall = okClaude("claude after empty");
    const eng = new LLMEngine({ api_key: KEY }, { ollamaGenerate, claudeCall });

    const res = await eng.query({ prompt: "empty-then-claude" });

    expect(res.model).toBe("claude-sonnet-4-6");
    expect(res.answer).toBe("claude after empty");
  });

  it("bounds a hung Ollama call by the timeout and falls back (robust/adaptive)", async () => {
    // ollamaGenerate never resolves -> the timeout must trip and route to Claude.
    const ollamaGenerate = vi.fn(() => new Promise<{ ok: boolean; value: string | null; error: string | null }>(() => {}));
    const claudeCall = okClaude("claude after ollama timeout");
    const eng = new LLMEngine({ api_key: KEY, ollama_timeout_ms: 30 }, { ollamaGenerate, claudeCall });

    const t0 = Date.now();
    const res = await eng.query({ prompt: "hung ollama" });
    const elapsed = Date.now() - t0;

    expect(res.model).toBe("claude-sonnet-4-6");
    expect(res.answer).toBe("claude after ollama timeout");
    expect(elapsed).toBeLessThan(5000); // did NOT hang on the never-resolving Ollama
    expect(ollamaGenerate).toHaveBeenCalledTimes(1);
    expect(claudeCall).toHaveBeenCalledTimes(1);
  });

  it("preserves the LLMResponse contract and caches identical repeat queries", async () => {
    const eng = new LLMEngine({ api_key: KEY }, { ollamaGenerate: okOllama("cached-me") });

    const first = await eng.query({ prompt: "same prompt" });
    expect(first.cached).toBe(false);
    expect(Array.isArray(first.context_used)).toBe(true);
    expect(typeof first.duration_ms).toBe("number");

    const second = await eng.query({ prompt: "same prompt" });
    expect(second.cached).toBe(true);
    expect(second.answer).toBe("cached-me");
  });
});

describe("LLMEngine capability escalation (Claude backup when Ollama can't handle it)", () => {
  it("escalates to Claude when the local answer is a refusal/incapacity + a backup exists", async () => {
    const ollamaGenerate = okOllama("I cannot help with that complex toolpath problem.");
    const claudeCall = okClaude("Claude's expert toolpath answer");
    const eng = new LLMEngine({ api_key: KEY }, { ollamaGenerate, claudeCall });

    const res = await eng.query({ prompt: "hard 5-axis problem" });

    expect(res.model).toBe("claude-sonnet-4-6");
    expect(res.answer).toBe("Claude's expert toolpath answer");
    expect(ollamaGenerate).toHaveBeenCalledTimes(1); // tried local first (free)
    expect(claudeCall).toHaveBeenCalledTimes(1); // escalated to backup
  });

  it("escalates a too-short answer to Claude for a complexity:high task", async () => {
    const ollamaGenerate = okOllama("Maybe."); // 6 chars < 40 floor for high complexity
    const claudeCall = okClaude("Claude detailed high-complexity answer");
    const eng = new LLMEngine({ api_key: KEY }, { ollamaGenerate, claudeCall });

    const res = await eng.query({ prompt: "deep reasoning", complexity: "high" });

    expect(res.model).toBe("claude-sonnet-4-6");
    expect(claudeCall).toHaveBeenCalledTimes(1);
  });

  it("does NOT escalate an adequate high-complexity local answer (no needless paid call)", async () => {
    const good = "Use a 12mm 3-flute carbide at 0.1mm/tooth, 8000 rpm, climb milling, with HSM trochoidal entry to manage heat.";
    const ollamaGenerate = okOllama(good);
    const claudeCall = okClaude();
    const eng = new LLMEngine({ api_key: KEY }, { ollamaGenerate, claudeCall });

    const res = await eng.query({ prompt: "milling strategy", complexity: "high" });

    expect(res.model).toBe("qwen2.5-coder:32b (ollama)");
    expect(res.answer).toBe(good);
    expect(claudeCall).not.toHaveBeenCalled();
  });

  it("keeps the best-effort free answer when inadequate but NO backup exists (strict-free)", async () => {
    const weak = "I cannot help."; // refusal, but prefer:ollama has no Claude backup
    const ollamaGenerate = okOllama(weak);
    const claudeCall = okClaude();
    const eng = new LLMEngine({ api_key: KEY, prefer: "ollama" }, { ollamaGenerate, claudeCall });

    const res = await eng.query({ prompt: "anything" });

    expect(res.model).toBe("qwen2.5-coder:32b (ollama)"); // returned, not dropped to offline
    expect(res.answer).toBe(weak);
    expect(claudeCall).not.toHaveBeenCalled(); // strict-free never pays
  });

  it("honors an injected adequacy predicate (caller-specific, e.g. must-be-JSON)", async () => {
    const ollamaGenerate = okOllama("not json at all");
    const claudeCall = okClaude('{"valid":true}');
    const adequate = (answer: string) => answer.trim().startsWith("{");
    const eng = new LLMEngine({ api_key: KEY }, { ollamaGenerate, claudeCall, adequate });

    const res = await eng.query({ prompt: "give me json" });

    expect(res.model).toBe("claude-sonnet-4-6");
    expect(res.answer).toBe('{"valid":true}');
  });

  it("capability escalation does NOT open the availability cooldown (Ollama still probed next call)", async () => {
    const ollamaGenerate = vi.fn(async () => ({ ok: true, value: "I cannot help.", error: null }));
    const claudeCall = okClaude("claude backup");
    const eng = new LLMEngine({ api_key: KEY }, { ollamaGenerate, claudeCall });

    await eng.query({ prompt: "q1 distinct" });
    await eng.query({ prompt: "q2 distinct" });

    // Ollama is UP (just inadequate) -> it is re-probed on the 2nd call, NOT cooled down
    expect(ollamaGenerate).toHaveBeenCalledTimes(2);
    expect(claudeCall).toHaveBeenCalledTimes(2);
  });

  it("a THROWING adequacy predicate does not crash -> treated as inadequate -> escalates", async () => {
    const ollamaGenerate = okOllama("some local answer");
    const claudeCall = okClaude("claude after predicate throw");
    const adequate = () => { throw new Error("predicate boom"); };
    const eng = new LLMEngine({ api_key: KEY }, { ollamaGenerate, claudeCall, adequate });

    const res = await eng.query({ prompt: "predicate throws" });

    expect(res.model).toBe("claude-sonnet-4-6");
    expect(res.answer).toBe("claude after predicate throw");
  });

  it("does NOT escalate a usable answer that merely contains a refusal phrase mid-sentence (cost-correct)", async () => {
    const usable = "Reduce DOC to 0.5mm; I cannot guarantee zero chatter on the thin wall otherwise.";
    const ollamaGenerate = okOllama(usable);
    const claudeCall = okClaude();
    const eng = new LLMEngine({ api_key: KEY }, { ollamaGenerate, claudeCall });

    const res = await eng.query({ prompt: "thin wall advice" });

    expect(res.model).toBe("qwen2.5-coder:32b (ollama)"); // stayed free, no needless paid call
    expect(res.answer).toBe(usable);
    expect(claudeCall).not.toHaveBeenCalled();
  });

  it("cache key isolates complexity: a low-complexity cached answer does NOT skip a later high-complexity escalation", async () => {
    const ollamaGenerate = okOllama("Short."); // adequate at low (>=1), inadequate at high (<40)
    const claudeCall = okClaude("claude high-complexity answer");
    const eng = new LLMEngine({ api_key: KEY }, { ollamaGenerate, claudeCall });

    const low = await eng.query({ prompt: "same q", complexity: "low" });
    expect(low.model).toBe("qwen2.5-coder:32b (ollama)"); // accepted free at low bar

    const high = await eng.query({ prompt: "same q", complexity: "high" });
    expect(high.model).toBe("claude-sonnet-4-6"); // NOT served the cached low answer -> escalated
    expect(claudeCall).toHaveBeenCalledTimes(1);
  });
});

describe("LLMEngine system-prompt override (lets any caller route through the free substrate)", () => {
  it("passes a caller system prompt to Ollama instead of the default PRISM prompt", async () => {
    const ollamaGenerate = okOllama("delegated-task answer");
    const eng = new LLMEngine({ api_key: KEY }, { ollamaGenerate });

    const res = await eng.query({ prompt: "do unit X", system: "You are an autonomous build agent. Complete the unit." });

    expect(res.answer).toBe("delegated-task answer");
    const sentSystem = (ollamaGenerate as any).mock.calls[0][0].system as string;
    expect(sentSystem).toContain("autonomous build agent");
    expect(sentSystem).not.toContain("AI manufacturing intelligence assistant"); // default replaced
  });

  it("passes the caller system prompt to Claude on capability escalation", async () => {
    const ollamaGenerate = okOllama("I cannot help."); // refusal -> escalate
    const claudeCall = okClaude("claude delegated answer");
    const eng = new LLMEngine({ api_key: KEY }, { ollamaGenerate, claudeCall });

    const res = await eng.query({ prompt: "hard unit", system: "You are an autonomous build agent." });

    expect(res.model).toBe("claude-sonnet-4-6");
    const sentSystem = (claudeCall as any).mock.calls[0][0] as string;
    expect(sentSystem).toContain("autonomous build agent");
  });

  it("cache key isolates the system override (different system -> not a cache hit)", async () => {
    const ollamaGenerate = vi.fn(async (o: any) => ({ ok: true, value: `ans:${o.system}`, error: null }));
    const eng = new LLMEngine({ api_key: KEY }, { ollamaGenerate });

    const a = await eng.query({ prompt: "p", system: "System Alpha here" });
    const b = await eng.query({ prompt: "p", system: "System Bravo here" });

    expect(a.answer).not.toBe(b.answer); // distinct systems -> distinct cache entries, both computed
    expect(ollamaGenerate).toHaveBeenCalledTimes(2);
  });

  it("cache key isolates systems that share a long boilerplate PREFIX (full-string hash, not a slice)", async () => {
    const ollamaGenerate = vi.fn(async (o: any) => ({ ok: true, value: `ans:${o.system}`, error: null }));
    const eng = new LLMEngine({ api_key: KEY }, { ollamaGenerate });
    const prefix = "You are an autonomous PRISM build agent operating in slot ";

    const a = await eng.query({ prompt: "same task", system: `${prefix}india executing unit A` });
    const b = await eng.query({ prompt: "same task", system: `${prefix}whiskey executing unit B` });

    // First 40+ chars identical -> a prefix-slice key would COLLIDE; the FNV hash must not.
    expect(a.answer).not.toBe(b.answer);
    expect(ollamaGenerate).toHaveBeenCalledTimes(2);
  });

  it("cache key isolates prompts that share a long prefix (full-prompt hash)", async () => {
    const ollamaGenerate = vi.fn(async (o: any) => ({ ok: true, value: `ans:${o.prompt}`, error: null }));
    const eng = new LLMEngine({ api_key: KEY }, { ollamaGenerate });
    const pre = "Implement the following roadmap unit with full tests and dispatcher wiring, then report: ";

    const a = await eng.query({ prompt: `${pre}unit-ALPHA distinct tail` });
    const b = await eng.query({ prompt: `${pre}unit-BRAVO distinct tail` });

    expect(a.answer).not.toBe(b.answer); // >100-char shared prefix would collide under the old slice
    expect(ollamaGenerate).toHaveBeenCalledTimes(2);
  });
});
