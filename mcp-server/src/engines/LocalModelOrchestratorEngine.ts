/**
 * LocalModelOrchestratorEngine — Phase 0.19 U-LLM1
 *
 * Take a user request (chat prompt or embedding input), ask
 * `ModelRoutingEngine` which backend+model should service it, then
 * dispatch the actual call to the right client:
 *
 *   - ollama     → OllamaClientEngine (local, free)
 *   - anthropic  → LLMEngine (Claude API)
 *   - openai     → not yet wired; returns structured error so the caller
 *                  can fall back to a cheaper cloud option
 *
 * On backend failure we walk the `RoutingDecision.fallbacks` list until
 * one succeeds or the chain is exhausted. Each attempt records its
 * backend, model, wall-time, and outcome so downstream learning (U-LLM5)
 * has honest execution telemetry.
 *
 * This engine is intentionally thin — routing policy lives in
 * `ModelRoutingEngine`, context building lives in `LLMEngine`, network
 * I/O lives in `OllamaClientEngine`. We just glue them together.
 *
 * @module engines/LocalModelOrchestratorEngine
 * @milestone PP-0.19-U-LLM1
 */

import {
  ModelRoutingEngine,
  modelRoutingEngine,
  type Backend,
  type RoutingContext,
  type RoutingDecision,
  type RoutingRequest,
  type TaskKind,
} from "./ModelRoutingEngine.js";
import type { OllamaClientEngine, OllamaMessage } from "./OllamaClientEngine.js";
import type { LLMEngine, LLMQuery, LLMResponse } from "./LLMEngine.js";

export interface OrchestrateRequest {
  /** Task classification for routing. */
  taskKind: TaskKind;
  /** User prompt (for chat/reasoning/code/safety_critical/gcode_explain/quote_summary). */
  prompt?: string;
  /** Optional system message prepended for chat-style requests. */
  system?: string;
  /** Prior conversation turns (when the caller manages state). */
  history?: OllamaMessage[];
  /** Text to embed (for taskKind==="embed"). */
  embedInput?: string;
  /** Rough input-token estimate. Defaults to prompt length / 4. */
  inputTokens?: number;
  /** Max output tokens. Default 512. */
  outputTokensMax?: number;
  /** Optional hard budgets + flags forwarded to the router. */
  latencyBudgetMs?: number;
  costBudgetUSD?: number;
  needsTools?: boolean;
  requireSafety?: boolean;
}

export interface OrchestrateAttempt {
  backend: Backend;
  model: string;
  wallMs: number;
  ok: boolean;
  error?: string;
}

export interface OrchestrateResult {
  ok: boolean;
  backend: Backend | null;
  model: string | null;
  /** Completion text (chat/code/reasoning tasks). Empty string for embed. */
  text: string;
  /** Embedding vector (embed tasks). Empty array for chat tasks. */
  embedding: number[];
  attempts: OrchestrateAttempt[];
  rationale: string[];
  error: string | null;
}

export interface OrchestratorDeps {
  router?: ModelRoutingEngine;
  ollama?: OllamaClientEngine | null;
  anthropic?: LLMEngine | null;
}

const APPROX_CHARS_PER_TOKEN = 4;

export class LocalModelOrchestratorEngine {
  private router: ModelRoutingEngine;
  private ollama: OllamaClientEngine | null;
  private anthropic: LLMEngine | null;

  constructor(deps: OrchestratorDeps = {}) {
    this.router = deps.router ?? modelRoutingEngine;
    this.ollama = deps.ollama ?? null;
    this.anthropic = deps.anthropic ?? null;
  }

  /** Swap out the Ollama client at runtime (tests + late-binding). */
  setOllama(client: OllamaClientEngine | null): void {
    this.ollama = client;
  }

  setAnthropic(llm: LLMEngine | null): void {
    this.anthropic = llm;
  }

  /**
   * Main entry point. Routes, dispatches, and walks fallbacks until one
   * succeeds. Always returns a populated `OrchestrateResult` — callers
   * don't need to catch.
   */
  async run(
    req: OrchestrateRequest,
    ctx: RoutingContext,
  ): Promise<OrchestrateResult> {
    const attempts: OrchestrateAttempt[] = [];
    const routing = this.route(req, ctx);
    if (!routing.ok || !routing.backend || !routing.model) {
      return {
        ok: false,
        backend: null,
        model: null,
        text: "",
        embedding: [],
        attempts,
        rationale: routing.rationale,
        error: routing.error ?? "router returned no decision",
      };
    }

    const chain: Array<{ backend: Backend; model: string }> = [
      { backend: routing.backend, model: routing.model },
      ...routing.fallbacks.map((f) => ({ backend: f.backend, model: f.model })),
    ];

    let lastError = "all backends failed";
    for (const hop of chain) {
      const started = Date.now();
      try {
        if (req.taskKind === "embed") {
          const vec = await this.dispatchEmbed(hop.backend, hop.model, req);
          attempts.push({
            backend: hop.backend,
            model: hop.model,
            wallMs: Date.now() - started,
            ok: true,
          });
          return {
            ok: true,
            backend: hop.backend,
            model: hop.model,
            text: "",
            embedding: vec,
            attempts,
            rationale: routing.rationale,
            error: null,
          };
        }
        const text = await this.dispatchChat(hop.backend, hop.model, req);
        attempts.push({
          backend: hop.backend,
          model: hop.model,
          wallMs: Date.now() - started,
          ok: true,
        });
        return {
          ok: true,
          backend: hop.backend,
          model: hop.model,
          text,
          embedding: [],
          attempts,
          rationale: routing.rationale,
          error: null,
        };
      } catch (e) {
        const msg = (e as Error)?.message ?? String(e);
        lastError = msg;
        attempts.push({
          backend: hop.backend,
          model: hop.model,
          wallMs: Date.now() - started,
          ok: false,
          error: msg,
        });
      }
    }

    return {
      ok: false,
      backend: null,
      model: null,
      text: "",
      embedding: [],
      attempts,
      rationale: routing.rationale,
      error: lastError,
    };
  }

  /** Expose the routing decision for callers that want to preview without executing. */
  route(req: OrchestrateRequest, ctx: RoutingContext): RoutingDecision {
    return this.router.route(this.toRoutingRequest(req), ctx);
  }

  // ── dispatch ─────────────────────────────────────────────────────────

  private async dispatchChat(
    backend: Backend,
    model: string,
    req: OrchestrateRequest,
  ): Promise<string> {
    if (backend === "ollama") {
      if (!this.ollama) throw new Error("ollama client not configured");
      if (!this.ollama.isConnected()) {
        throw new Error("ollama client not connected — call connect() first");
      }
      const messages = this.buildMessages(req);
      const result = await this.ollama.chat({
        model,
        messages,
        maxTokens: req.outputTokensMax ?? 512,
      });
      if (!result.ok || result.value === null) {
        throw new Error(result.error ?? "ollama chat failed");
      }
      return result.value;
    }

    if (backend === "anthropic") {
      if (!this.anthropic) throw new Error("anthropic client not configured");
      const prompt = req.prompt ?? "";
      if (!prompt) throw new Error("empty prompt for anthropic call");
      const query: LLMQuery = {
        prompt,
        max_tokens: req.outputTokensMax ?? 512,
      };
      const resp: LLMResponse = await this.anthropic.query(query);
      return resp.answer;
    }

    throw new Error(`backend ${backend} not implemented in orchestrator`);
  }

  private async dispatchEmbed(
    backend: Backend,
    model: string,
    req: OrchestrateRequest,
  ): Promise<number[]> {
    if (backend !== "ollama") {
      throw new Error(`embed requires ollama backend, got ${backend}`);
    }
    if (!this.ollama) throw new Error("ollama client not configured");
    if (!this.ollama.isConnected()) {
      throw new Error("ollama client not connected — call connect() first");
    }
    const input = req.embedInput ?? req.prompt ?? "";
    if (!input) throw new Error("embed input is empty");
    const result = await this.ollama.embed({ model, input });
    if (!result.ok || result.value === null) {
      throw new Error(result.error ?? "ollama embed failed");
    }
    return result.value;
  }

  // ── helpers ──────────────────────────────────────────────────────────

  private buildMessages(req: OrchestrateRequest): OllamaMessage[] {
    const messages: OllamaMessage[] = [];
    if (req.system) messages.push({ role: "system", content: req.system });
    if (req.history) messages.push(...req.history);
    if (req.prompt) messages.push({ role: "user", content: req.prompt });
    if (messages.length === 0) {
      throw new Error("no prompt, system, or history provided");
    }
    return messages;
  }

  private toRoutingRequest(req: OrchestrateRequest): RoutingRequest {
    const promptLen = (req.prompt?.length ?? 0) + (req.system?.length ?? 0);
    const historyLen = (req.history ?? []).reduce(
      (n, m) => n + m.content.length,
      0,
    );
    const embedLen = req.embedInput?.length ?? 0;
    const approxIn =
      req.inputTokens ??
      Math.max(
        1,
        Math.ceil((promptLen + historyLen + embedLen) / APPROX_CHARS_PER_TOKEN),
      );
    return {
      taskKind: req.taskKind,
      inputTokens: approxIn,
      outputTokensMax: req.outputTokensMax ?? 512,
      latencyBudgetMs: req.latencyBudgetMs,
      costBudgetUSD: req.costBudgetUSD,
      needsTools: req.needsTools,
      requireSafety: req.requireSafety,
    };
  }
}

export const localModelOrchestratorEngine = new LocalModelOrchestratorEngine();
