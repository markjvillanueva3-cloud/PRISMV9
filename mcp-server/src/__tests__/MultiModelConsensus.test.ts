/**
 * MultiModelConsensusEngine — agreement scoring + voting + recommendation tests.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / OCTOPUS-CONSENSUS.
 *
 * Subprocess + Ollama HTTP are mocked. The pure scoring methods (compareConsensus,
 * voteConsensus) are tested directly; orchestration is tested by stubbing the
 * codex/claude/ollama clients to return fixed responses.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  MultiModelConsensusEngine,
  multiModelConsensusEngine,
  type ConsensusInput,
  type ModelResponse,
} from "../engines/MultiModelConsensusEngine.js";
import { codexClientEngine } from "../engines/CodexClientEngine.js";
import { ollamaClientEngine } from "../engines/OllamaClientEngine.js";

const mkResp = (override: Partial<ModelResponse>): ModelResponse => ({
  model: "test",
  vendor: "ollama",
  ok: true,
  answer: "",
  latencyMs: 100,
  tokens: null,
  error: null,
  ...override,
});

describe("MultiModelConsensusEngine — compareConsensus scoring", () => {
  const engine = new MultiModelConsensusEngine();

  it("returns null when all responses failed", () => {
    const c = engine.compareConsensus([
      mkResp({ ok: false, error: "x" }),
      mkResp({ ok: false, error: "y" }),
    ]);
    expect(c).toBeNull();
  });

  it("returns the single voter when only 1 model succeeded", () => {
    const c = engine.compareConsensus([
      mkResp({ ok: false, error: "x" }),
      mkResp({ ok: true, answer: "answer is 42", model: "deepseek" }),
      mkResp({ ok: false, error: "y" }),
    ]);
    expect(c).not.toBeNull();
    expect(c!.answer).toBe("answer is 42");
    expect(c!.voters).toEqual(["deepseek"]);
    // confidence = 1/3 (single voter out of 3 attempted)
    expect(c!.confidence).toBeCloseTo(0.333, 2);
  });

  it("scores three identical answers at confidence ≈ 1.0", () => {
    const c = engine.compareConsensus([
      mkResp({ model: "claude", answer: "the answer is forty two" }),
      mkResp({ model: "gpt-5.5", answer: "the answer is forty two" }),
      mkResp({ model: "deepseek", answer: "the answer is forty two" }),
    ]);
    expect(c).not.toBeNull();
    expect(c!.voters).toHaveLength(3);
    expect(c!.confidence).toBe(1);
  });

  it("scores fully-disjoint answers at low confidence", () => {
    const c = engine.compareConsensus([
      mkResp({ model: "claude", answer: "alpha bravo charlie" }),
      mkResp({ model: "gpt-5.5", answer: "delta echo foxtrot" }),
      mkResp({ model: "deepseek", answer: "golf hotel india" }),
    ]);
    expect(c).not.toBeNull();
    expect(c!.confidence).toBe(0); // no overlap → mean Jaccard = 0
    expect(c!.voters).toHaveLength(1); // best is alone (no peer ≥ 0.5 Jaccard)
  });

  it("picks the answer with highest mean Jaccard against peers", () => {
    // claude and deepseek share many tokens; gpt-5.5 is the outlier
    const c = engine.compareConsensus([
      mkResp({ model: "claude",   answer: "the auth middleware should validate jwt tokens before issuing session cookies" }),
      mkResp({ model: "gpt-5.5",  answer: "use bcrypt for password hashing and rotate keys every 90 days" }),
      mkResp({ model: "deepseek", answer: "the auth middleware should validate jwt tokens then issue session cookies" }),
    ]);
    expect(c).not.toBeNull();
    // Winner should be claude or deepseek (both have ~0.75 Jaccard with each other)
    expect(["claude", "deepseek"]).toContain(c!.voters[0]);
    expect(c!.voters).toHaveLength(2); // both pass the 0.5 threshold
    expect(c!.confidence).toBeGreaterThan(0.3); // 3/3 success * mean Jaccard ≈ 0.35
  });

  it("ignores empty-answer responses even if ok=true", () => {
    const c = engine.compareConsensus([
      mkResp({ model: "claude",   answer: "the right answer" }),
      mkResp({ model: "gpt-5.5",  answer: "", ok: true }),  // ok but empty — drop
      mkResp({ model: "deepseek", answer: "the right answer" }),
    ]);
    expect(c).not.toBeNull();
    expect(c!.voters).toHaveLength(2);
  });
});

describe("MultiModelConsensusEngine — voteConsensus", () => {
  const engine = new MultiModelConsensusEngine();

  it("returns null with empty options array", () => {
    const c = engine.voteConsensus([mkResp({ ok: true, answer: "yes" })], []);
    expect(c).toBeNull();
  });

  it("returns null when no responses match any option", () => {
    const c = engine.voteConsensus([
      mkResp({ ok: true, answer: "the moon is blue", model: "claude" }),
      mkResp({ ok: true, answer: "the sun is red", model: "gpt-5.5" }),
    ], ["yes", "no"]);
    expect(c).toBeNull();
  });

  it("picks the option with the most matching responses", () => {
    const c = engine.voteConsensus([
      mkResp({ ok: true, answer: "I think the answer is YES", model: "claude" }),
      mkResp({ ok: true, answer: "Definitely yes — proceed", model: "gpt-5.5" }),
      mkResp({ ok: true, answer: "No, this would break things", model: "deepseek" }),
    ], ["yes", "no"]);
    expect(c).not.toBeNull();
    expect(c!.answer).toBe("yes");
    expect(c!.voters).toEqual(["claude", "gpt-5.5"]);
    expect(c!.confidence).toBeCloseTo(0.667, 2);
  });

  it("prefers the longest matching option (containment tiebreak)", () => {
    const c = engine.voteConsensus([
      mkResp({ ok: true, answer: "Use approach B-revised", model: "claude" }),
      mkResp({ ok: true, answer: "approach B-revised wins", model: "gpt-5.5" }),
    ], ["approach b", "approach b-revised"]);
    expect(c).not.toBeNull();
    expect(c!.answer).toBe("approach b-revised");
    expect(c!.voters).toEqual(["claude", "gpt-5.5"]);
  });

  it("case-insensitive matching", () => {
    const c = engine.voteConsensus([
      mkResp({ ok: true, answer: "YES", model: "claude" }),
      mkResp({ ok: true, answer: "Yes please", model: "gpt-5.5" }),
    ], ["yes"]);
    expect(c).not.toBeNull();
    expect(c!.voters).toHaveLength(2);
  });
});

describe("MultiModelConsensusEngine — input validation", () => {
  const engine = new MultiModelConsensusEngine();

  it("rejects null input", async () => {
    await expect(engine.ask(null as unknown as ConsensusInput))
      .rejects.toThrow(/ConsensusInput required/);
  });

  it("rejects empty prompt", async () => {
    await expect(engine.ask({ prompt: "" })).rejects.toThrow(/prompt/);
  });

  it("rejects vote mode without options", async () => {
    await expect(engine.ask({ prompt: "x", mode: "vote" }))
      .rejects.toThrow(/voteOptions/);
  });

  it("rejects vote mode with empty options array", async () => {
    await expect(engine.ask({ prompt: "x", mode: "vote", voteOptions: [] }))
      .rejects.toThrow(/voteOptions/);
  });

  it("rejects non-positive timeoutMs", async () => {
    await expect(engine.ask({ prompt: "x", timeoutMs: 0 })).rejects.toThrow(/timeoutMs/);
    await expect(engine.ask({ prompt: "x", timeoutMs: -1 })).rejects.toThrow(/timeoutMs/);
  });
});

describe("MultiModelConsensusEngine — dual-Ollama 4-way coverage (no XAI_API_KEY)", () => {
  const ORIGINAL_KEY = process.env.XAI_API_KEY;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(ollamaClientEngine, "isConnected").mockReturnValue(true);
    delete process.env.XAI_API_KEY;
  });

  afterEach(() => {
    if (ORIGINAL_KEY === undefined) delete process.env.XAI_API_KEY;
    else process.env.XAI_API_KEY = ORIGINAL_KEY;
    vi.restoreAllMocks();
  });

  it("auto-fires both Ollama models when Grok is unavailable (default)", async () => {
    const calls: Array<{ model: string }> = [];
    vi.spyOn(ollamaClientEngine, "generate").mockImplementation(async (opts) => {
      calls.push({ model: opts.model });
      return { ok: true, value: "agree", error: null, wallMs: 1 };
    });
    vi.spyOn(codexClientEngine, "exec").mockResolvedValue({
      ok: true, answer: "agree", tokens: 10, model: "gpt-5.5", latencyMs: 1, error: null, rawStderrTail: "",
    });

    const r = await multiModelConsensusEngine.ask({ prompt: "Plan X", includeClaude: false });
    expect(r.responses).toHaveLength(3); // codex + 2 ollama
    const ollamaModelsCalled = calls.map((c) => c.model).sort();
    expect(ollamaModelsCalled).toEqual(["deepseek-r1:14b", "qwen2.5-coder:14b"]);
  });

  it("only one Ollama call when dualOllama=false explicitly disabled", async () => {
    const calls: Array<{ model: string }> = [];
    vi.spyOn(ollamaClientEngine, "generate").mockImplementation(async (opts) => {
      calls.push({ model: opts.model });
      return { ok: true, value: "agree", error: null, wallMs: 1 };
    });
    vi.spyOn(codexClientEngine, "exec").mockResolvedValue({
      ok: true, answer: "agree", tokens: 10, model: "gpt-5.5", latencyMs: 1, error: null, rawStderrTail: "",
    });

    const r = await multiModelConsensusEngine.ask({ prompt: "Plan X", includeClaude: false, dualOllama: false });
    expect(r.responses).toHaveLength(2);
    expect(calls.map((c) => c.model)).toEqual(["deepseek-r1:14b"]);
  });

  it("respects custom secondaryOllamaModel override", async () => {
    const calls: Array<{ model: string }> = [];
    vi.spyOn(ollamaClientEngine, "generate").mockImplementation(async (opts) => {
      calls.push({ model: opts.model });
      return { ok: true, value: "agree", error: null, wallMs: 1 };
    });
    vi.spyOn(codexClientEngine, "exec").mockResolvedValue({
      ok: true, answer: "agree", tokens: 10, model: "gpt-5.5", latencyMs: 1, error: null, rawStderrTail: "",
    });

    const r = await multiModelConsensusEngine.ask({
      prompt: "Plan X",
      includeClaude: false,
      secondaryOllamaModel: "llama3.2-vision:11b",
    });
    expect(r.responses).toHaveLength(3);
    expect(calls.map((c) => c.model).sort()).toEqual(["deepseek-r1:14b", "llama3.2-vision:11b"]);
  });

  it("dualOllama suppressed when Grok is available (Grok takes the 4th slot)", async () => {
    process.env.XAI_API_KEY = `synthetic-${process.pid}`;
    const ollamaCalls: Array<{ model: string }> = [];
    vi.spyOn(ollamaClientEngine, "generate").mockImplementation(async (opts) => {
      ollamaCalls.push({ model: opts.model });
      return { ok: true, value: "agree", error: null, wallMs: 1 };
    });
    vi.spyOn(codexClientEngine, "exec").mockResolvedValue({
      ok: true, answer: "agree", tokens: 10, model: "gpt-5.5", latencyMs: 1, error: null, rawStderrTail: "",
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: "agree" } }], usage: { total_tokens: 100 } }), { status: 200 }),
    );

    const r = await multiModelConsensusEngine.ask({ prompt: "Plan X", includeClaude: false });
    expect(r.responses).toHaveLength(3); // codex + grok + 1 ollama (no dual)
    expect(ollamaCalls).toHaveLength(1);
    expect(ollamaCalls[0].model).toBe("deepseek-r1:14b");
    const vendors = r.responses.map((x) => x.vendor).sort();
    expect(vendors).toEqual(["ollama", "openai", "xai"]);
  });

  it("does not duplicate when secondaryOllamaModel === ollamaModel", async () => {
    const calls: Array<{ model: string }> = [];
    vi.spyOn(ollamaClientEngine, "generate").mockImplementation(async (opts) => {
      calls.push({ model: opts.model });
      return { ok: true, value: "agree", error: null, wallMs: 1 };
    });
    vi.spyOn(codexClientEngine, "exec").mockResolvedValue({
      ok: true, answer: "agree", tokens: 10, model: "gpt-5.5", latencyMs: 1, error: null, rawStderrTail: "",
    });

    const r = await multiModelConsensusEngine.ask({
      prompt: "Plan X",
      includeClaude: false,
      ollamaModel: "qwen2.5-coder:32b",
      secondaryOllamaModel: "qwen2.5-coder:32b",
    });
    // dedup — only one ollama call even though dualOllama would normally add a second
    expect(calls).toHaveLength(1);
    expect(r.responses).toHaveLength(2);
  });
});

describe("MultiModelConsensusEngine — PRISM context auto-injection", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(ollamaClientEngine, "isConnected").mockReturnValue(true);
  });

  it("default behavior: each model receives PRISM context prepended to the user prompt", async () => {
    const promptsSeen: string[] = [];
    vi.spyOn(codexClientEngine, "exec").mockImplementation(async (opts) => {
      promptsSeen.push(`codex:${opts.prompt}`);
      return { ok: true, answer: "ok", tokens: 1, model: "gpt-5.5", latencyMs: 1, error: null, rawStderrTail: "" };
    });
    vi.spyOn(ollamaClientEngine, "generate").mockImplementation(async (opts) => {
      promptsSeen.push(`ollama:${opts.prompt}`);
      return { ok: true, value: "ok", error: null, wallMs: 1 };
    });

    await multiModelConsensusEngine.ask({
      prompt: "Plan how to add a new dispatcher action for cutting force lookups",
      includeClaude: false,
      dualOllama: false,
    });
    expect(promptsSeen).toHaveLength(2);
    for (const p of promptsSeen) {
      expect(p).toContain("=== PRISM CONTEXT");
      expect(p).toContain("=== END PRISM CONTEXT ===");
      expect(p).toContain("=== TASK ===");
      expect(p).toContain("Plan how to add a new dispatcher action for cutting force lookups");
    }
  });

  it("prismContext=false skips injection (each model gets raw user prompt)", async () => {
    let codexPrompt = "";
    vi.spyOn(codexClientEngine, "exec").mockImplementation(async (opts) => {
      codexPrompt = opts.prompt;
      return { ok: true, answer: "ok", tokens: 1, model: "gpt-5.5", latencyMs: 1, error: null, rawStderrTail: "" };
    });
    vi.spyOn(ollamaClientEngine, "generate").mockResolvedValue({ ok: true, value: "ok", error: null, wallMs: 1 });

    await multiModelConsensusEngine.ask({
      prompt: "raw question",
      includeClaude: false,
      dualOllama: false,
      prismContext: false,
    });
    expect(codexPrompt).toBe("raw question");
    expect(codexPrompt).not.toContain("PRISM CONTEXT");
  });

  it("custom contextBudgets shrink Ollama prompt vs Codex prompt", async () => {
    let codexPrompt = "";
    let ollamaPrompt = "";
    vi.spyOn(codexClientEngine, "exec").mockImplementation(async (opts) => {
      codexPrompt = opts.prompt;
      return { ok: true, answer: "ok", tokens: 1, model: "gpt-5.5", latencyMs: 1, error: null, rawStderrTail: "" };
    });
    vi.spyOn(ollamaClientEngine, "generate").mockImplementation(async (opts) => {
      ollamaPrompt = opts.prompt;
      return { ok: true, value: "ok", error: null, wallMs: 1 };
    });

    await multiModelConsensusEngine.ask({
      prompt: "Plan migration involving cutting force kienzle taylor and engine routing",
      includeClaude: false,
      dualOllama: false,
      contextBudgets: { codex: 100_000, ollama: 800 }, // ollama tiny → trimmed
    });
    expect(ollamaPrompt.length).toBeLessThan(codexPrompt.length);
    // Ollama context should be heavily truncated; Codex gets the full bundle
    expect(codexPrompt).toContain("### TOP RELEVANT ENGINES");
  });

  it("user-supplied input.context is included as a CALLER CONTEXT block alongside PRISM context", async () => {
    let codexPrompt = "";
    vi.spyOn(codexClientEngine, "exec").mockImplementation(async (opts) => {
      codexPrompt = opts.prompt;
      return { ok: true, answer: "ok", tokens: 1, model: "gpt-5.5", latencyMs: 1, error: null, rawStderrTail: "" };
    });
    vi.spyOn(ollamaClientEngine, "generate").mockResolvedValue({ ok: true, value: "ok", error: null, wallMs: 1 });

    await multiModelConsensusEngine.ask({
      prompt: "review this code",
      context: "function foo() { return 42; }",
      includeClaude: false,
      dualOllama: false,
    });
    expect(codexPrompt).toContain("=== PRISM CONTEXT");
    expect(codexPrompt).toContain("=== CALLER CONTEXT ===");
    expect(codexPrompt).toContain("function foo() { return 42; }");
    expect(codexPrompt).toContain("review this code");
  });
});

describe("MultiModelConsensusEngine — orchestration with stubs", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(ollamaClientEngine, "isConnected").mockReturnValue(true);
  });

  it("includeClaude=false skips Claude path; only Codex+Ollama called", async () => {
    vi.spyOn(codexClientEngine, "exec").mockResolvedValue({
      ok: true, answer: "consensus answer XYZ", tokens: 100, model: "gpt-5.5", latencyMs: 1000, error: null, rawStderrTail: "",
    });
    vi.spyOn(ollamaClientEngine, "generate").mockResolvedValue({
      ok: true, value: "consensus answer XYZ", error: null, wallMs: 500,
    });
    const r = await multiModelConsensusEngine.ask({
      prompt: "best answer to question",
      includeClaude: false,
      dualOllama: false,
    });
    expect(r.responses).toHaveLength(2);
    expect(r.responses.map((x) => x.vendor).sort()).toEqual(["ollama", "openai"]);
    expect(r.successCount).toBe(2);
    expect(r.recommendation).toBe("accept");
    expect(r.consensus).not.toBeNull();
    expect(r.consensus!.confidence).toBe(1);
  });

  it("recommendation=accept when ≥0.70 agreement", async () => {
    vi.spyOn(codexClientEngine, "exec").mockResolvedValue({
      ok: true, answer: "rename foo to bar", tokens: 50, model: "gpt-5.5", latencyMs: 1, error: null, rawStderrTail: "",
    });
    vi.spyOn(ollamaClientEngine, "generate").mockResolvedValue({
      ok: true, value: "rename foo to bar", error: null, wallMs: 1,
    });
    const r = await multiModelConsensusEngine.ask({ prompt: "x", includeClaude: false, dualOllama: false });
    expect(r.recommendation).toBe("accept");
  });

  it("recommendation=escalate when all models fail", async () => {
    vi.spyOn(codexClientEngine, "exec").mockResolvedValue({
      ok: false, answer: "", tokens: null, model: "gpt-5.5", latencyMs: 1, error: "spawn error", rawStderrTail: "",
    });
    vi.spyOn(ollamaClientEngine, "generate").mockResolvedValue({
      ok: false, value: null, error: "ECONNREFUSED", wallMs: 1,
    });
    const r = await multiModelConsensusEngine.ask({ prompt: "x", includeClaude: false, dualOllama: false });
    expect(r.successCount).toBe(0);
    expect(r.recommendation).toBe("escalate");
    expect(r.consensus).toBeNull();
    expect(r.ok).toBe(false);
  });

  it("recommendation=escalate when models disagree wildly", async () => {
    vi.spyOn(codexClientEngine, "exec").mockResolvedValue({
      ok: true, answer: "alpha bravo charlie delta", tokens: 1, model: "gpt-5.5", latencyMs: 1, error: null, rawStderrTail: "",
    });
    vi.spyOn(ollamaClientEngine, "generate").mockResolvedValue({
      ok: true, value: "echo foxtrot golf hotel", error: null, wallMs: 1,
    });
    const r = await multiModelConsensusEngine.ask({ prompt: "x", includeClaude: false, dualOllama: false });
    expect(r.recommendation).toBe("escalate");
    expect(r.agreementScore).toBe(0);
  });

  it("strips <think>...</think> from Ollama answers before scoring", async () => {
    vi.spyOn(codexClientEngine, "exec").mockResolvedValue({
      ok: true, answer: "the final answer", tokens: 1, model: "gpt-5.5", latencyMs: 1, error: null, rawStderrTail: "",
    });
    vi.spyOn(ollamaClientEngine, "generate").mockResolvedValue({
      ok: true, value: "<think>let me reason step by step about totally unrelated stuff</think>the final answer", error: null, wallMs: 1,
    });
    const r = await multiModelConsensusEngine.ask({ prompt: "x", includeClaude: false, dualOllama: false });
    // After stripping <think>, both answers match → high confidence
    expect(r.recommendation).toBe("accept");
    const ollama = r.responses.find((x) => x.vendor === "ollama");
    expect(ollama!.answer).toBe("the final answer");
  });

  it("vote mode picks majority across model responses", async () => {
    vi.spyOn(codexClientEngine, "exec").mockResolvedValue({
      ok: true, answer: "I'd go with option A", tokens: 1, model: "gpt-5.5", latencyMs: 1, error: null, rawStderrTail: "",
    });
    vi.spyOn(ollamaClientEngine, "generate").mockResolvedValue({
      ok: true, value: "Option A is correct", error: null, wallMs: 1,
    });
    const r = await multiModelConsensusEngine.ask({
      prompt: "A or B?",
      includeClaude: false,
      mode: "vote",
      voteOptions: ["option a", "option b"],
    });
    expect(r.mode).toBe("vote");
    expect(r.consensus).not.toBeNull();
    expect(r.consensus!.answer).toBe("option a");
  });

  it("propagates Ollama not-connected error gracefully", async () => {
    vi.spyOn(ollamaClientEngine, "isConnected").mockReturnValue(false);
    vi.spyOn(ollamaClientEngine, "connect").mockResolvedValue({
      ok: false, value: null, error: "ECONNREFUSED", wallMs: 1,
    });
    vi.spyOn(codexClientEngine, "exec").mockResolvedValue({
      ok: true, answer: "from codex", tokens: 1, model: "gpt-5.5", latencyMs: 1, error: null, rawStderrTail: "",
    });
    const r = await multiModelConsensusEngine.ask({ prompt: "x", includeClaude: false, dualOllama: false });
    expect(r.successCount).toBe(1);
    const ollama = r.responses.find((x) => x.vendor === "ollama");
    expect(ollama!.ok).toBe(false);
    expect(ollama!.error).toContain("ECONNREFUSED");
  });
});
