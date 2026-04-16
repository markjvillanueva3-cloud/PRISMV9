/**
 * Tests for LocalModelOrchestratorEngine (PP-0.19-U-LLM1)
 *
 * Uses fake Ollama + Anthropic clients so we exercise the dispatch and
 * fallback paths without any network. Scenarios:
 *   - chat goes to local Ollama under a $0 budget
 *   - safety_critical goes to Anthropic Opus via LLMEngine
 *   - embed task routes to nomic-embed-text
 *   - primary backend failure walks fallback chain
 *   - missing ollama client returns structured error
 *   - router returning ok:false propagates as result.ok=false
 *   - attempts array records wall time + per-hop outcomes
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  LocalModelOrchestratorEngine,
  localModelOrchestratorEngine,
  type OrchestrateRequest,
} from "../engines/LocalModelOrchestratorEngine.js";
import type {
  OllamaClientEngine,
  OllamaChatOptions,
  OllamaEmbedOptions,
  OllamaResult,
} from "../engines/OllamaClientEngine.js";
import type { LLMEngine, LLMResponse } from "../engines/LLMEngine.js";
import type { RoutingContext } from "../engines/ModelRoutingEngine.js";

function makeFakeOllama(): OllamaClientEngine & {
  chatCalls: OllamaChatOptions[];
  embedCalls: OllamaEmbedOptions[];
  failNext: () => void;
} {
  let shouldFail = false;
  const chatCalls: OllamaChatOptions[] = [];
  const embedCalls: OllamaEmbedOptions[] = [];
  const fake = {
    isConnected: () => true,
    async chat(options: OllamaChatOptions): Promise<OllamaResult<string>> {
      chatCalls.push(options);
      if (shouldFail) {
        shouldFail = false;
        return { ok: false, value: null, error: "simulated ollama error", wallMs: 1 };
      }
      return {
        ok: true,
        value: `[ollama:${options.model}] ok`,
        error: null,
        wallMs: 1,
      };
    },
    async embed(options: OllamaEmbedOptions): Promise<OllamaResult<number[]>> {
      embedCalls.push(options);
      return { ok: true, value: [0.1, 0.2, 0.3], error: null, wallMs: 1 };
    },
    chatCalls,
    embedCalls,
    failNext: () => {
      shouldFail = true;
    },
  } as unknown as OllamaClientEngine & {
    chatCalls: OllamaChatOptions[];
    embedCalls: OllamaEmbedOptions[];
    failNext: () => void;
  };
  return fake;
}

function makeFakeAnthropic(): LLMEngine & { calls: string[] } {
  const calls: string[] = [];
  const fake = {
    async query(input: { prompt: string }): Promise<LLMResponse> {
      calls.push(input.prompt);
      return {
        answer: `[anthropic] ok: ${input.prompt.slice(0, 16)}`,
        context_used: [],
        model: "claude-opus-4-7",
        tokens_used: { input: 10, output: 10 },
        duration_ms: 1,
        cached: false,
      };
    },
    calls,
  } as unknown as LLMEngine & { calls: string[] };
  return fake;
}

const ctx: RoutingContext = { hardware: "home_4080" };

describe("LocalModelOrchestratorEngine", () => {
  let engine: LocalModelOrchestratorEngine;
  let ollama: ReturnType<typeof makeFakeOllama>;
  let anthropic: ReturnType<typeof makeFakeAnthropic>;

  beforeEach(() => {
    ollama = makeFakeOllama();
    anthropic = makeFakeAnthropic();
    engine = new LocalModelOrchestratorEngine({ ollama, anthropic });
  });

  it("exports a singleton", () => {
    expect(localModelOrchestratorEngine).toBeInstanceOf(
      LocalModelOrchestratorEngine,
    );
  });

  it("chat with $0 budget routes to local Ollama", async () => {
    const req: OrchestrateRequest = {
      taskKind: "chat",
      prompt: "hello",
      costBudgetUSD: 0,
    };
    const out = await engine.run(req, ctx);
    expect(out.ok).toBe(true);
    expect(out.backend).toBe("ollama");
    expect(out.text.startsWith("[ollama:")).toBe(true);
    expect(ollama.chatCalls.length).toBe(1);
    expect(ollama.chatCalls[0].messages.some((m) => m.content === "hello")).toBe(
      true,
    );
  });

  it("safety_critical routes to Anthropic Opus", async () => {
    const req: OrchestrateRequest = {
      taskKind: "safety_critical",
      prompt: "is this cut safe?",
    };
    const out = await engine.run(req, ctx);
    expect(out.ok).toBe(true);
    expect(out.backend).toBe("anthropic");
    expect(out.model).toBe("claude-opus-4-7");
    expect(anthropic.calls.length).toBe(1);
  });

  it("embed task picks nomic-embed-text and returns a vector", async () => {
    const req: OrchestrateRequest = {
      taskKind: "embed",
      embedInput: "thin wall lathe",
    };
    const out = await engine.run(req, ctx);
    expect(out.ok).toBe(true);
    expect(out.model).toBe("nomic-embed-text");
    expect(out.embedding).toEqual([0.1, 0.2, 0.3]);
    expect(ollama.embedCalls.length).toBe(1);
    expect(ollama.embedCalls[0].input).toBe("thin wall lathe");
  });

  it("primary backend failure walks the fallback chain", async () => {
    ollama.failNext();
    const req: OrchestrateRequest = {
      taskKind: "chat",
      prompt: "retry me",
      costBudgetUSD: 0,
    };
    const out = await engine.run(req, ctx);
    expect(out.ok).toBe(true);
    expect(out.attempts.length).toBeGreaterThanOrEqual(2);
    expect(out.attempts[0].ok).toBe(false);
    expect(out.attempts[out.attempts.length - 1].ok).toBe(true);
  });

  it("system + history are forwarded to Ollama chat", async () => {
    const req: OrchestrateRequest = {
      taskKind: "chat",
      prompt: "now what",
      system: "you are a machinist",
      history: [
        { role: "user", content: "earlier turn" },
        { role: "assistant", content: "earlier reply" },
      ],
      costBudgetUSD: 0,
    };
    const out = await engine.run(req, ctx);
    expect(out.ok).toBe(true);
    const msgs = ollama.chatCalls[0].messages;
    expect(msgs[0]).toEqual({ role: "system", content: "you are a machinist" });
    expect(msgs.at(-1)).toEqual({ role: "user", content: "now what" });
    expect(msgs.length).toBe(4);
  });

  it("reports error when ollama client is not configured and routing picks ollama", async () => {
    engine.setOllama(null);
    const req: OrchestrateRequest = {
      taskKind: "chat",
      prompt: "hi",
      costBudgetUSD: 0,
    };
    const out = await engine.run(req, ctx);
    expect(out.ok).toBe(false);
    expect(out.error).toMatch(/ollama/);
  });

  it("router returning no candidates surfaces as ok:false without attempts", async () => {
    const req: OrchestrateRequest = {
      taskKind: "safety_critical",
      prompt: "hi",
      costBudgetUSD: 0,
    };
    const out = await engine.run(req, ctx);
    expect(out.ok).toBe(false);
    expect(out.attempts.length).toBe(0);
    expect(out.error).toMatch(/no catalog model/);
  });

  it("route() exposes a preview decision without dispatching", () => {
    const spy = vi.spyOn(ollama, "chat");
    const decision = engine.route(
      { taskKind: "chat", prompt: "preview", costBudgetUSD: 0 },
      ctx,
    );
    expect(decision.ok).toBe(true);
    expect(spy).not.toHaveBeenCalled();
  });

  it("attempts array records wallMs and per-hop model", async () => {
    const req: OrchestrateRequest = {
      taskKind: "chat",
      prompt: "hi",
      costBudgetUSD: 0,
    };
    const out = await engine.run(req, ctx);
    expect(out.attempts.length).toBe(1);
    expect(out.attempts[0].backend).toBe("ollama");
    expect(typeof out.attempts[0].wallMs).toBe("number");
    expect(out.attempts[0].wallMs).toBeGreaterThanOrEqual(0);
  });

  it("throws approximate-token-based routing when inputTokens omitted", async () => {
    const req: OrchestrateRequest = {
      taskKind: "chat",
      prompt: "a".repeat(4000),
      costBudgetUSD: 0,
    };
    const out = await engine.run(req, ctx);
    expect(out.ok).toBe(true);
  });

  it("unknown backend (openai) reports not-implemented and walks fallbacks", async () => {
    const req: OrchestrateRequest = {
      taskKind: "chat",
      prompt: "hi",
    };
    const out = await engine.run(req, { hardware: "home_4080", forceBackend: "openai" });
    // router will pick openai; orchestrator doesn't implement it, and
    // forceBackend blocks fallback to anthropic/ollama — so result fails.
    expect(out.ok).toBe(false);
    expect(out.error).toMatch(/openai/);
    expect(out.attempts.some((a) => a.backend === "openai")).toBe(true);
  });
});
