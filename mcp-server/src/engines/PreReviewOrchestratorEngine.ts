/**
 * PreReviewOrchestratorEngine — DeepSeek-R1 drafts → Claude refines
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / P22-U01
 *
 * For medium-complex tasks (refactors, multi-file edits, debugging hypotheses)
 * we run a chain-of-thought draft on `deepseek-r1:14b` first, then hand the
 * draft to Claude as context. Claude refines for correctness, safety, and
 * PRISM-domain integration. Saves ~60% of Claude tokens on tasks where the
 * R1 draft is mostly right and Claude's job is to polish, not to start fresh.
 *
 * Routing is done via `ModelRouterEngine` so threshold tuning (P23) flows
 * through the same surface as everything else.
 *
 * Engine is stateless. The Ollama call is the only I/O; everything else is
 * pure orchestration. Errors are returned as structured `PreReviewResult`
 * with `ok: false` — never thrown — so callers (hooks, dispatchers) can
 * gracefully fall back to direct-Claude.
 *
 * @module engines/PreReviewOrchestratorEngine
 */

import { ollamaClientEngine } from "./OllamaClientEngine.js";
import { modelRouterEngine, type TaskInput } from "./ModelRouterEngine.js";

export interface PreReviewInput {
  prompt: string;                 // The task description / refactor goal / debug question
  context?: string;                // Surrounding code, error trace, etc.
  domain?: string;                 // Pass through to router (safety domains escalate)
  promptTokens?: number;           // Estimated; lets router pick complex/medium tier
  maxTokens?: number;              // Cap deepseek-r1 output (default 1024)
  temperature?: number;            // Default 0.2 — drafts should be deterministic
}

export interface PreReviewDraft {
  reasoning_chain: string;         // R1's <think>…</think> block, if present
  draft: string;                   // R1's final answer outside <think>
  confidence: number;              // Heuristic 0..1 from chain length + answer length
}

export interface PreReviewResult {
  ok: boolean;
  used: boolean;                   // true if we actually called R1; false if router escalated/skipped
  reason: string;                  // Why used / why skipped
  tier: number;
  model: string;
  draft: PreReviewDraft | null;
  latencyMs: number;
  error: string | null;
}

const DEFAULT_MAX_TOKENS = 1024;
const DEFAULT_TEMPERATURE = 0.2;
const PRE_REVIEW_SYSTEM = [
  "You are a careful first-pass reviewer producing a draft for a senior engineer to refine.",
  "Wrap your reasoning in <think>…</think>; put your final draft answer below the closing tag.",
  "Be concise. Do not invent file paths or APIs you have not been given. Flag uncertainty explicitly.",
].join(" ");

export class PreReviewOrchestratorEngine {
  async draftReview(input: PreReviewInput): Promise<PreReviewResult> {
    const start = Date.now();
    this.validate(input);

    // Build router input — if caller provided promptTokens/domain, pass through.
    const routerInput: TaskInput = {
      kind: "review",
      complexity: "medium",
      promptTokens: input.promptTokens,
      domain: input.domain,
      needsChainOfThought: true, // pre-review is the prototypical CoT use case
    };

    let decision;
    try {
      decision = modelRouterEngine.routeForTask(routerInput);
    } catch (e) {
      return this.fail(start, "router error", `routing failed: ${(e as Error).message}`);
    }

    // If router escalates to Claude (tier 5) or auto-consensus (tier 6) we
    // skip pre-review — those paths already cover the reasoning we'd draft.
    if (decision.tier >= 5) {
      const why = decision.tier === 6 ? "auto-consensus owns this" : "Claude leads";
      return {
        ok: true,
        used: false,
        reason: `router escalated to tier ${decision.tier} (${decision.reason}); pre-review skipped — ${why}`,
        tier: decision.tier,
        model: decision.model,
        draft: null,
        latencyMs: Date.now() - start,
        error: null,
      };
    }

    // For pre-review we always use the reasoning tier (3) — even if router
    // suggested simpler. Drafting needs CoT regardless of prompt size.
    const targetModel = decision.tier === 3 ? decision.model : "deepseek-r1:14b";

    // Connect Ollama client lazily (idempotent).
    if (!ollamaClientEngine.isConnected()) {
      const conn = await ollamaClientEngine.connect();
      if (!conn.ok) {
        return this.fail(start, `ollama connect failed: ${conn.error}`, "tier-5 escalation recommended");
      }
    }

    const fullPrompt = input.context
      ? `${input.prompt}\n\n=== CONTEXT ===\n${input.context}`
      : input.prompt;

    const r = await ollamaClientEngine.generate({
      model: targetModel,
      prompt: fullPrompt,
      system: PRE_REVIEW_SYSTEM,
      temperature: input.temperature ?? DEFAULT_TEMPERATURE,
      maxTokens: input.maxTokens ?? DEFAULT_MAX_TOKENS,
    });

    if (!r.ok || r.value === null) {
      return this.fail(start, `deepseek generate failed: ${r.error}`, "tier-5 escalation recommended");
    }

    const draft = this.parseDraft(r.value);

    return {
      ok: true,
      used: true,
      reason: `pre-review draft via ${targetModel} (${decision.reason})`,
      tier: decision.tier,
      model: targetModel,
      draft,
      latencyMs: Date.now() - start,
      error: null,
    };
  }

  // Deterministic parser — caller cannot rely on R1 always returning a <think>
  // block, but it usually does. We make confidence reflect that.
  parseDraft(raw: string): PreReviewDraft {
    const thinkMatch = raw.match(/<think>([\s\S]*?)<\/think>/);
    const reasoning_chain = thinkMatch ? thinkMatch[1].trim() : "";
    const draft = thinkMatch
      ? raw.slice(thinkMatch.index! + thinkMatch[0].length).trim()
      : raw.trim();

    // Confidence heuristic:
    //   - has <think> block: +0.4
    //   - reasoning_chain >= 200 chars: +0.3
    //   - draft >= 50 chars: +0.3
    let confidence = 0;
    if (thinkMatch) confidence += 0.4;
    if (reasoning_chain.length >= 200) confidence += 0.3;
    if (draft.length >= 50) confidence += 0.3;
    confidence = Math.min(1, Math.max(0, confidence));

    return { reasoning_chain, draft, confidence };
  }

  // ---- internals ----

  private fail(start: number, reason: string, error: string): PreReviewResult {
    return {
      ok: false,
      used: false,
      reason,
      tier: -1,
      model: "",
      draft: null,
      latencyMs: Date.now() - start,
      error,
    };
  }

  private validate(input: PreReviewInput): void {
    if (!input || typeof input !== "object") throw new Error("PreReviewInput required");
    if (typeof input.prompt !== "string" || input.prompt.length === 0) {
      throw new Error("prompt must be a non-empty string");
    }
    if (input.context !== undefined && typeof input.context !== "string") {
      throw new Error("context must be a string when provided");
    }
    if (input.maxTokens !== undefined) {
      if (!Number.isInteger(input.maxTokens) || input.maxTokens <= 0) {
        throw new Error("maxTokens must be a positive integer");
      }
    }
    if (input.temperature !== undefined) {
      if (!Number.isFinite(input.temperature) || input.temperature < 0 || input.temperature > 2) {
        throw new Error("temperature must be in [0, 2]");
      }
    }
  }
}

export const preReviewOrchestratorEngine = new PreReviewOrchestratorEngine();
