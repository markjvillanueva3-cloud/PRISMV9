/**
 * MultiModelConsensusEngine — fan a prompt out to Claude + Codex + Ollama-deepseek-r1
 * in parallel, score agreement, recommend an answer.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / OCTOPUS-CONSENSUS.
 *
 * Goal (per user): "more eyes on a task to hopefully cover all possible gaps
 * more efficiently". Three independent reasoners — Claude (deep, Anthropic),
 * gpt-5.5 xhigh (deep, OpenAI), deepseek-r1:14b (CoT, local) — give us
 * cross-vendor cross-architecture coverage. When they agree, confidence is
 * high. When they disagree, the disagreement itself is the signal: that's
 * where the gap is.
 *
 * Two consensus modes:
 *   - `compare`: each model answers independently; agreement scored on token
 *     overlap (Jaccard) + a normalized cosine on simple bag-of-words.
 *   - `vote`: each model is asked to choose from N options; majority wins.
 *
 * Caller drives the prompt — engine is a pure orchestrator. Each underlying
 * call is wrapped in its own timeout so a single slow model can't block the
 * caller. If only 1 of 3 succeeds, the result is still returned (with a low
 * confidence) so callers can decide whether to retry or escalate.
 *
 * Claude is invoked here ONLY via subprocess (`claude -p ...`) when run from
 * outside an active Claude Code session. Inside an active session, callers
 * usually want to use Claude themselves and only fan out to Codex+Ollama.
 * The `includeClaude` flag controls this.
 *
 * @module engines/MultiModelConsensusEngine
 */

import { spawn } from "node:child_process";
import { codexClientEngine, type CodexResult } from "./CodexClientEngine.js";
import { grokClientEngine, type GrokResult } from "./GrokClientEngine.js";
import { geminiClientEngine, type GeminiResult } from "./GeminiClientEngine.js";
import { ollamaClientEngine } from "./OllamaClientEngine.js";
import { prismContextInjectorEngine } from "./PRISMContextInjectorEngine.js";
import { consensusFactCheckerEngine, type FactCheckResult } from "./ConsensusFactCheckerEngine.js";
import { consensusObsidianPersistenceEngine } from "./ConsensusObsidianPersistenceEngine.js";
import { consensusModelPerformanceEngine } from "./ConsensusModelPerformanceEngine.js";
import { feedbackBusEngine } from "./FeedbackBusEngine.js";

/**
 * Bus topic broadcast after every ask() invocation. NN-STACK-INTEG-MS0/U-NN-INTEG-03+05.
 *
 * Payload shape (FeedbackEvent.payload):
 * ```
 * {
 *   prompt:        string;          // input.prompt (verbatim)
 *   taskType:      string;          // input.taskType
 *   sourceSession: string;          // resolvedSession (input.sourceSession ?? CLAUDE_SESSION_ID ?? "unknown")
 *   result:        ConsensusResult; // the full ask() return value — includes .ok=false for failed runs
 * }
 * ```
 *
 * Fires for EVERY ask() — successful AND failed (subscribers need failures to
 * calibrate confidence). Disable with `PRISM_NN_INTEG_DISABLE=1` to revert
 * the stack to its pre-integration behavior (no publish, no subscriber).
 */
export const CONSENSUS_COMPLETED_TOPIC = "consensus.completed";

export interface ConsensusInput {
  prompt: string;
  context?: string;
  includeClaude?: boolean;          // default true — set false when caller IS Claude
  /** Set false to skip Grok (e.g. when XAI_API_KEY isn't set). Default true. */
  includeGrok?: boolean;
  /** Set false to skip Gemini (e.g. when GEMINI_API_KEY isn't set). Default true. */
  includeGemini?: boolean;
  /** Default `gemini-3-pro-preview` (env override `PRISM_GEMINI_MODEL`). Falls back to `gemini-2.5-flash` for unpaid API tier. */
  geminiModel?: string;
  /** low/medium/high/xhigh — maps to thinkingBudget. Default medium. */
  geminiReasoning?: "low" | "medium" | "high" | "xhigh";
  /**
   * When Grok is unavailable (no XAI_API_KEY), automatically add a second
   * Ollama model (qwen2.5-coder:32b by default) so the consensus pool
   * still gets 4-way independent coverage. Costs $0 — different model
   * trained by a different team gives genuine independent signal.
   * Default: true.
   */
  dualOllama?: boolean;
  /** Default qwen2.5-coder:32b — secondary Ollama voice when dualOllama=true. */
  secondaryOllamaModel?: string;
  claudeBin?: string;               // override claude CLI path
  ollamaModel?: string;             // default deepseek-r1:14b
  codexModel?: string;              // default gpt-5.5
  codexEffort?: "low" | "medium" | "high" | "xhigh";  // default xhigh
  grokModel?: string;               // default grok-4
  grokReasoning?: "low" | "medium" | "high";  // default medium
  timeoutMs?: number;               // per-model timeout, default 90s
  mode?: "compare" | "vote";
  voteOptions?: readonly string[];  // required when mode=vote
  /**
   * Auto-inject PRISM context (CLAUDE.md, GSD, master index, top-relevant
   * engines) into each model's prompt so they reason WITH PRISM knowledge,
   * not generic. Default true. Suppress with prismContext=false for tasks
   * that don't need PRISM-aware reasoning (saves ~12K tokens per model).
   */
  prismContext?: boolean;
  /** Per-model context budget cap. Default {claude:100k, codex:100k, grok:50k, ollama:24k}. */
  contextBudgets?: { claude?: number; codex?: number; grok?: number; ollama?: number };
  /**
   * Persist the ConsensusResult to the wiki second-brain after computing it.
   * Default true — every consensus run becomes a permanent memory the next
   * session can recall via prism_memory:consensus_recall. Suppress with
   * persist=false for ephemeral / one-shot calls (e.g. internal probes).
   */
  persist?: boolean;
  /** Optional task-type tag (e.g. "plan", "build", "review") forwarded to persistence. */
  taskType?: string;
  /** Source session id forwarded to persistence (default: process.env.CLAUDE_SESSION_ID or "unknown"). */
  sourceSession?: string;
  /**
   * Consult ConsensusModelPerformanceEngine to skip vendors with low historical
   * reward EMA on this taskType. Always keeps a floor of 2 vendors so consensus
   * can never collapse to a single voice. Default false (legacy fan-out-everyone
   * behavior). Setting true requires `taskType` to be meaningful.
   */
  usePerformanceWeights?: boolean;
  /** Override performance-engine state file (tests). */
  performanceStateFilePath?: string;
}

export interface ModelResponse {
  model: string;
  vendor: "anthropic" | "openai" | "ollama" | "xai" | "google";
  ok: boolean;
  answer: string;
  latencyMs: number;
  tokens: number | null;
  error: string | null;
}

export interface ConsensusResult {
  ok: boolean;                      // true if at least 1 model succeeded
  mode: "compare" | "vote";
  responses: ModelResponse[];
  successCount: number;
  agreementScore: number;           // 0..1
  consensus: {
    answer: string;                 // majority/winning answer
    voters: string[];               // model names that produced this answer
    confidence: number;             // 0..1 — successCount * agreement
  } | null;
  recommendation: "accept" | "review" | "escalate";
  totalLatencyMs: number;
  /**
   * Per-model fact-check against the live PRISM knowledge base. Catches
   * hallucinated engine names + dispatcher actions. Each entry is keyed by
   * the model name. Empty when factCheck is not loaded or input.factCheck=false.
   */
  factCheck: Record<string, FactCheckResult>;
}

const DEFAULT_TIMEOUT_MS = 90_000;
const DEFAULT_OLLAMA_MODEL = "deepseek-r1:14b";
// 14b chosen over 32b so deepseek-r1:14b (9GB) + qwen-coder:14b (9GB) can
// coexist in memory on machines with ~24GB. The 32b variant (20GB) caused
// HTTP 500 OOM on the smoke test machine when paired with deepseek-r1.
// Override via secondaryOllamaModel option for hosts with more memory.
const DEFAULT_SECONDARY_OLLAMA_MODEL = "qwen2.5-coder:14b";
const DEFAULT_CODEX_MODEL = "gpt-5.5";
const DEFAULT_CODEX_EFFORT = "xhigh" as const;
const DEFAULT_CLAUDE_BIN = process.env.PRISM_CLAUDE_BIN ?? "claude";

const ACCEPT_THRESHOLD = 0.70;     // ≥ → accept
const REVIEW_THRESHOLD = 0.40;     // ≥ → review (caller picks); < → escalate

export class MultiModelConsensusEngine {
  async ask(input: ConsensusInput): Promise<ConsensusResult> {
    this.validate(input);
    const start = Date.now();
    const userPrompt = input.context
      ? `${input.prompt}\n\n=== CALLER CONTEXT ===\n${input.context}`
      : input.prompt;
    const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const includeClaude = input.includeClaude !== false;

    // PRISM context injection — each external model gets a model-budgeted
    // bundle of CLAUDE.md / GSD / master index / top-relevant engines so they
    // reason WITH PRISM knowledge instead of generic.
    const injectPrism = input.prismContext !== false;
    const budgets = {
      claude: input.contextBudgets?.claude ?? 100_000,
      codex:  input.contextBudgets?.codex  ?? 100_000,
      grok:   input.contextBudgets?.grok   ?? 50_000,
      ollama: input.contextBudgets?.ollama ?? 24_000,
    };
    const buildPrompt = async (modelKey: keyof typeof budgets): Promise<string> => {
      if (!injectPrism) return userPrompt;
      try {
        const ctx = await prismContextInjectorEngine.buildContext(input.prompt, { modelBudget: budgets[modelKey] });
        return `${ctx.text}\n\n=== TASK ===\n${userPrompt}`;
      } catch {
        return userPrompt; // fail open — if injection fails, ship the raw prompt
      }
    };

    let includeGrok = input.includeGrok !== false && Boolean(process.env.XAI_API_KEY);
    let includeGemini = input.includeGemini !== false && Boolean(process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY);
    let weightedClaude = includeClaude;

    // Performance-weighted vendor filtering — opt-in via usePerformanceWeights.
    // Drops vendors with historically low reward EMA on this task_type while
    // preserving a floor of 2 vendors so consensus never collapses to a single
    // voice. The full pool is still considered "available"; we only down-select.
    if (input.usePerformanceWeights === true && typeof input.taskType === "string" && input.taskType.length > 0) {
      const available: string[] = [];
      if (weightedClaude) available.push("anthropic");
      available.push("openai"); // codex always in pool
      if (includeGrok) available.push("xai");
      if (includeGemini) available.push("google");
      available.push("ollama"); // primary ollama always in pool
      try {
        const perfState = consensusModelPerformanceEngine.loadState(input.performanceStateFilePath);
        const rec = consensusModelPerformanceEngine.recommendVendors(perfState, input.taskType, available, { floor: 2 });
        const keep = new Set(rec.ranked.map((r) => r.vendor));
        if (!keep.has("anthropic")) weightedClaude = false;
        if (!keep.has("xai")) includeGrok = false;
        if (!keep.has("google")) includeGemini = false;
        // Note: openai (codex) and ollama-primary are always called regardless;
        // dropping them would require a deeper refactor of the call sites below.
      } catch {
        // Fail open — bad state file should never break consensus delivery.
      }
    }

    // Dual-Ollama auto-fires when neither Grok nor Gemini is available to keep
    // the pool at ≥4 voices. With Gemini configured we already have 4-way
    // (Claude + Codex + Gemini + Ollama) so we don't need the dual.
    const dualOllama = input.dualOllama !== false && !includeGrok && !includeGemini;
    const primaryOllama = input.ollamaModel ?? DEFAULT_OLLAMA_MODEL;
    const secondaryOllama = input.secondaryOllamaModel ?? DEFAULT_SECONDARY_OLLAMA_MODEL;

    // Each call returns ONE or MORE ModelResponses (dual-Ollama returns 2).
    // We flatten after Promise.all so the rest of the engine treats them uniformly.
    // Per-model prompts are built lazily so each model gets a context sized to
    // its own context window.
    const calls: Array<Promise<ModelResponse[]>> = [];
    if (weightedClaude) {
      calls.push(buildPrompt("claude").then((p) => this.callClaude(p, input.claudeBin ?? DEFAULT_CLAUDE_BIN, timeoutMs)).then((r) => [r]));
    }
    calls.push(buildPrompt("codex").then((p) => this.callCodex(p, input.codexModel, input.codexEffort, timeoutMs)).then((r) => [r]));
    if (includeGrok) {
      calls.push(buildPrompt("grok").then((p) => this.callGrok(p, input.grokModel, input.grokReasoning, timeoutMs)).then((r) => [r]));
    }
    if (includeGemini) {
      // Gemini gets the codex-tier budget by default — it has 1M+ context so
      // we don't need to compress for it. Reuses the codex budget bucket.
      calls.push(buildPrompt("codex").then((p) => this.callGemini(p, input.geminiModel, input.geminiReasoning, timeoutMs)).then((r) => [r]));
    }
    if (dualOllama && secondaryOllama !== primaryOllama) {
      // Ollama swaps models on demand; parallel requests to two different
      // models trigger OOM/HTTP 500 on memory-constrained hosts. Serialize
      // the two Ollama calls inside a single Promise so they run in parallel
      // with codex/claude/grok but not with each other.
      calls.push((async (): Promise<ModelResponse[]> => {
        const ollamaPrompt = await buildPrompt("ollama");
        const first = await this.callOllama(ollamaPrompt, primaryOllama, timeoutMs);
        const second = await this.callOllama(ollamaPrompt, secondaryOllama, timeoutMs);
        return [first, second];
      })());
    } else {
      calls.push(buildPrompt("ollama").then((p) => this.callOllama(p, primaryOllama, timeoutMs)).then((r) => [r]));
    }

    const responses = (await Promise.all(calls)).flat();

    // Fact-check each successful answer against PRISM truth — flags
    // hallucinated engines / dispatcher actions before they propagate into
    // a roadmap or refactor. Only runs if a knowledge base has been loaded
    // (caller responsibility — caller usually does it once at startup).
    const factCheck: Record<string, FactCheckResult> = {};
    if (consensusFactCheckerEngine.getKnowledgeBase() !== null) {
      for (const r of responses) {
        if (!r.ok || r.answer.length === 0) continue;
        try {
          factCheck[r.model] = consensusFactCheckerEngine.check(r.answer, r.model);
        } catch {
          // never let fact-check failure break consensus delivery
        }
      }
    }
    const successCount = responses.filter((r) => r.ok).length;
    const mode = input.mode ?? "compare";

    const consensus = mode === "vote"
      ? this.voteConsensus(responses, input.voteOptions ?? [])
      : this.compareConsensus(responses);

    const agreementScore = consensus?.confidence ?? 0;
    const recommendation: "accept" | "review" | "escalate" =
      successCount === 0 ? "escalate"
      : agreementScore >= ACCEPT_THRESHOLD ? "accept"
      : agreementScore >= REVIEW_THRESHOLD ? "review"
      : "escalate";

    const finalResult: ConsensusResult = {
      ok: successCount > 0,
      mode,
      responses,
      successCount,
      agreementScore,
      consensus,
      recommendation,
      totalLatencyMs: Date.now() - start,
      factCheck,
    };

    // Resolve session id once — shared by the persist + publish blocks below.
    // Lifting this expression out of both call sites (Reviewer A P1, DRY) means
    // that any future change to session-id resolution (e.g. a slot-aware
    // fallback) applies uniformly to both the wiki write and the bus broadcast,
    // and the persisted record + the bus payload always agree on which session
    // produced the consensus.
    const resolvedSession =
      input.sourceSession ?? process.env.CLAUDE_SESSION_ID ?? "unknown";

    // Persist to the wiki second-brain. Fire-and-forget — persistence failure
    // must NEVER break consensus delivery. The next session can recall this
    // exact prompt's answer via prism_memory:consensus_recall instead of
    // re-paying the 4-way fan-out cost.
    if (input.persist !== false && finalResult.ok) {
      try {
        consensusObsidianPersistenceEngine.persist({
          prompt: input.prompt,
          taskType: input.taskType,
          sourceSession: resolvedSession,
          result: finalResult,
        });
      } catch {
        // swallowed — see fire-and-forget contract above
      }
    }

    // Broadcast `consensus.completed` so the rest of the neural stack (the
    // ConsensusNeuralFeedbackEngine subscriber, future audit loggers, etc.)
    // sees every consensus run — both bridge-mediated AND direct callers.
    // NN-STACK-INTEG-MS0/U-NN-INTEG-03 (combined with U-NN-INTEG-05).
    // Fire-and-forget under the same contract as the persist block above:
    // a subscriber failure / bus error must NEVER break consensus delivery.
    // The disable knob (PRISM_NN_INTEG_DISABLE=1) reverts the stack to its
    // pre-integration behavior — no publish, no subscriber.
    if (process.env.PRISM_NN_INTEG_DISABLE !== "1") {
      try {
        feedbackBusEngine.publish(CONSENSUS_COMPLETED_TOPIC, {
          prompt: input.prompt,
          taskType: input.taskType,
          sourceSession: resolvedSession,
          result: finalResult,
        });
      } catch {
        // swallowed — see fire-and-forget contract above
      }
    }

    return finalResult;
  }

  // ---- consensus scoring ----

  /**
   * Bag-of-words Jaccard agreement across successful answers.
   * Normalize: lowercase, strip punctuation, split on whitespace, drop empty.
   * Returns the answer with the highest mean Jaccard against its peers, plus
   * a confidence equal to (successCount/total) * (mean Jaccard of the winner).
   */
  compareConsensus(responses: ModelResponse[]): ConsensusResult["consensus"] {
    const ok = responses.filter((r) => r.ok && r.answer.length > 0);
    if (ok.length === 0) return null;
    if (ok.length === 1) {
      return {
        answer: ok[0].answer,
        voters: [ok[0].model],
        confidence: 1 / responses.length,  // single voter — confidence reflects sparsity
      };
    }

    const tokens = ok.map((r) => this.normalize(r.answer));
    let bestIdx = 0;
    let bestMean = -1;
    for (let i = 0; i < ok.length; i++) {
      let sum = 0;
      let n = 0;
      for (let j = 0; j < ok.length; j++) {
        if (i === j) continue;
        sum += this.jaccard(tokens[i], tokens[j]);
        n++;
      }
      const mean = n === 0 ? 0 : sum / n;
      if (mean > bestMean) {
        bestMean = mean;
        bestIdx = i;
      }
    }

    // Voters = all responses with Jaccard ≥ 0.5 against the best
    const voters: string[] = [ok[bestIdx].model];
    for (let i = 0; i < ok.length; i++) {
      if (i === bestIdx) continue;
      if (this.jaccard(tokens[bestIdx], tokens[i]) >= 0.5) {
        voters.push(ok[i].model);
      }
    }

    return {
      answer: ok[bestIdx].answer,
      voters,
      confidence: Number(((ok.length / responses.length) * bestMean).toFixed(3)),
    };
  }

  /**
   * Each successful response is matched against `voteOptions` by case-insensitive
   * containment. The option with the most votes wins. Confidence = winner-votes / total-attempts.
   */
  voteConsensus(responses: ModelResponse[], options: readonly string[]): ConsensusResult["consensus"] {
    if (options.length === 0) return null;
    const ok = responses.filter((r) => r.ok && r.answer.length > 0);
    if (ok.length === 0) return null;

    const votes = new Map<string, string[]>();  // option → voter models
    for (const opt of options) votes.set(opt, []);
    for (const r of ok) {
      const ans = r.answer.toLowerCase();
      // Pick the longest matching option to handle near-substring overlaps deterministically
      let pick: string | null = null;
      for (const opt of options) {
        if (ans.includes(opt.toLowerCase())) {
          if (pick === null || opt.length > pick.length) pick = opt;
        }
      }
      if (pick) votes.get(pick)!.push(r.model);
    }

    let winner: string | null = null;
    let winnerVoters: string[] = [];
    for (const [opt, voters] of votes) {
      if (voters.length > winnerVoters.length) {
        winner = opt;
        winnerVoters = voters;
      }
    }
    if (winner === null || winnerVoters.length === 0) return null;
    return {
      answer: winner,
      voters: winnerVoters,
      confidence: Number((winnerVoters.length / responses.length).toFixed(3)),
    };
  }

  // ---- per-model invocations ----

  private async callCodex(prompt: string, model?: string, effort?: ConsensusInput["codexEffort"], timeoutMs?: number): Promise<ModelResponse> {
    try {
      const r: CodexResult = await codexClientEngine.exec({
        prompt,
        model: model ?? DEFAULT_CODEX_MODEL,
        reasoningEffort: effort ?? DEFAULT_CODEX_EFFORT,
        timeoutMs,
        sandbox: "read-only",
        skipGitCheck: true,
      });
      return {
        model: r.model || (model ?? DEFAULT_CODEX_MODEL),
        vendor: "openai",
        ok: r.ok,
        answer: r.answer,
        latencyMs: r.latencyMs,
        tokens: r.tokens,
        error: r.error,
      };
    } catch (e) {
      return this.errResponse(model ?? DEFAULT_CODEX_MODEL, "openai", (e as Error).message);
    }
  }

  private async callGemini(prompt: string, model?: string, reasoning?: "low" | "medium" | "high" | "xhigh", timeoutMs?: number): Promise<ModelResponse> {
    const target = model ?? process.env.PRISM_GEMINI_MODEL ?? "gemini-3-pro-preview";
    try {
      const r: GeminiResult = await geminiClientEngine.exec({
        prompt,
        model: target,
        reasoningEffort: reasoning ?? "medium",
        timeoutMs,
      });
      return {
        model: r.model || target,
        vendor: "google",
        ok: r.ok,
        answer: r.answer,
        latencyMs: r.latencyMs,
        tokens: r.totalTokens,
        error: r.error,
      };
    } catch (e) {
      return this.errResponse(target, "google", (e as Error).message);
    }
  }

  private async callGrok(prompt: string, model?: string, reasoning?: "low" | "medium" | "high", timeoutMs?: number): Promise<ModelResponse> {
    const target = model ?? "grok-4";
    try {
      const r: GrokResult = await grokClientEngine.exec({
        prompt,
        model: target,
        reasoningEffort: reasoning ?? "medium",
        timeoutMs,
      });
      return {
        model: r.model || target,
        vendor: "xai",
        ok: r.ok,
        answer: r.answer,
        latencyMs: r.latencyMs,
        tokens: r.totalTokens,
        error: r.error,
      };
    } catch (e) {
      return this.errResponse(target, "xai", (e as Error).message);
    }
  }

  private async callOllama(prompt: string, model: string, timeoutMs: number): Promise<ModelResponse> {
    const start = Date.now();
    if (!ollamaClientEngine.isConnected()) {
      const conn = await ollamaClientEngine.connect();
      if (!conn.ok) {
        return { model, vendor: "ollama", ok: false, answer: "", latencyMs: Date.now() - start, tokens: null, error: `connect: ${conn.error}` };
      }
    }

    // Race the generate call against a timer; if timer wins, abort the
    // underlying daemon request via the running model's load (best we can do
    // without a request-cancel API on the ollama client). The clearTimeout
    // in finally ensures we don't leak the timer when generate wins.
    let timerHandle: ReturnType<typeof setTimeout> | null = null;
    try {
      const gen = ollamaClientEngine.generate({
        model,
        prompt,
        system: "Answer concisely. If you need to think, wrap reasoning in <think>...</think> and put the final answer below.",
        temperature: 0.2,
        maxTokens: 1024,
      });
      const timer = new Promise<{ ok: false; error: "timeout" }>((resolve) => {
        timerHandle = setTimeout(() => resolve({ ok: false, error: "timeout" } as const), timeoutMs);
      });
      const r = await Promise.race([gen, timer]);
      if (!("value" in r) || !r.ok) {
        const err = "error" in r ? r.error : "unknown";
        return { model, vendor: "ollama", ok: false, answer: "", latencyMs: Date.now() - start, tokens: null, error: String(err) };
      }
      const raw = String(r.value ?? "");
      const stripped = raw.replace(/<think>[\s\S]*?<\/think>/g, "").trim() || raw.trim();
      return { model, vendor: "ollama", ok: true, answer: stripped, latencyMs: r.wallMs, tokens: null, error: null };
    } finally {
      if (timerHandle !== null) clearTimeout(timerHandle);
    }
  }

  private callClaude(prompt: string, claudeBin: string, timeoutMs: number): Promise<ModelResponse> {
    return new Promise((resolve) => {
      const start = Date.now();
      let stdout = "";
      let stderr = "";
      let settled = false;
      const settle = (r: ModelResponse) => { if (!settled) { settled = true; resolve(r); } };
      let child;
      try {
        child = spawn(claudeBin, ["-p", "--output-format", "text", "--bare"], {
          stdio: ["pipe", "pipe", "pipe"],
          windowsHide: true,
        });
      } catch (e) {
        return settle({ model: "claude", vendor: "anthropic", ok: false, answer: "", latencyMs: Date.now() - start, tokens: null, error: `spawn: ${(e as Error).message}` });
      }
      const timer = setTimeout(() => {
        try { child.kill(); } catch { /* ignore */ }
        settle({ model: "claude", vendor: "anthropic", ok: false, answer: "", latencyMs: Date.now() - start, tokens: null, error: "timeout" });
      }, timeoutMs);
      child.stdout.setEncoding("utf-8");
      child.stderr.setEncoding("utf-8");
      child.stdout.on("data", (c) => { stdout += c; });
      child.stderr.on("data", (c) => { stderr += c; });
      child.on("error", (e) => {
        clearTimeout(timer);
        settle({ model: "claude", vendor: "anthropic", ok: false, answer: "", latencyMs: Date.now() - start, tokens: null, error: `process: ${e.message}` });
      });
      child.on("exit", (code) => {
        clearTimeout(timer);
        if (code !== 0) {
          return settle({ model: "claude", vendor: "anthropic", ok: false, answer: "", latencyMs: Date.now() - start, tokens: null, error: `exit ${code}: ${stderr.slice(-500)}` });
        }
        settle({ model: "claude", vendor: "anthropic", ok: true, answer: stdout.trim(), latencyMs: Date.now() - start, tokens: null, error: null });
      });
      try {
        child.stdin.write(prompt);
        child.stdin.end();
      } catch (e) {
        clearTimeout(timer);
        settle({ model: "claude", vendor: "anthropic", ok: false, answer: "", latencyMs: Date.now() - start, tokens: null, error: `stdin: ${(e as Error).message}` });
      }
    });
  }

  // ---- helpers ----

  private errResponse(model: string, vendor: ModelResponse["vendor"], error: string): ModelResponse {
    return { model, vendor, ok: false, answer: "", latencyMs: 0, tokens: null, error };
  }

  private normalize(s: string): Set<string> {
    const tokens = s.toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((t) => t.length >= 2);
    return new Set(tokens);
  }

  private jaccard(a: Set<string>, b: Set<string>): number {
    if (a.size === 0 && b.size === 0) return 1;
    let inter = 0;
    for (const t of a) if (b.has(t)) inter++;
    const union = a.size + b.size - inter;
    return union === 0 ? 0 : inter / union;
  }

  private validate(input: ConsensusInput): void {
    if (!input || typeof input !== "object") throw new Error("ConsensusInput required");
    if (typeof input.prompt !== "string" || input.prompt.length === 0) {
      throw new Error("prompt must be a non-empty string");
    }
    if (input.mode === "vote" && (!Array.isArray(input.voteOptions) || input.voteOptions.length === 0)) {
      throw new Error("vote mode requires non-empty voteOptions[]");
    }
    if (input.timeoutMs !== undefined && (!Number.isFinite(input.timeoutMs) || input.timeoutMs <= 0)) {
      throw new Error("timeoutMs must be a positive number");
    }
  }
}

export const multiModelConsensusEngine = new MultiModelConsensusEngine();
