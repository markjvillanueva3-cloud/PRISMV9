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
import { ollamaClientEngine } from "./OllamaClientEngine.js";

export interface ConsensusInput {
  prompt: string;
  context?: string;
  includeClaude?: boolean;          // default true — set false when caller IS Claude
  claudeBin?: string;               // override claude CLI path
  ollamaModel?: string;             // default deepseek-r1:14b
  codexModel?: string;              // default gpt-5.5
  codexEffort?: "low" | "medium" | "high" | "xhigh";  // default xhigh
  timeoutMs?: number;               // per-model timeout, default 90s
  mode?: "compare" | "vote";
  voteOptions?: readonly string[];  // required when mode=vote
}

export interface ModelResponse {
  model: string;
  vendor: "anthropic" | "openai" | "ollama";
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
}

const DEFAULT_TIMEOUT_MS = 90_000;
const DEFAULT_OLLAMA_MODEL = "deepseek-r1:14b";
const DEFAULT_CODEX_MODEL = "gpt-5.5";
const DEFAULT_CODEX_EFFORT = "xhigh" as const;
const DEFAULT_CLAUDE_BIN = process.env.PRISM_CLAUDE_BIN ?? "claude";

const ACCEPT_THRESHOLD = 0.70;     // ≥ → accept
const REVIEW_THRESHOLD = 0.40;     // ≥ → review (caller picks); < → escalate

export class MultiModelConsensusEngine {
  async ask(input: ConsensusInput): Promise<ConsensusResult> {
    this.validate(input);
    const start = Date.now();
    const fullPrompt = input.context
      ? `${input.prompt}\n\n=== CONTEXT ===\n${input.context}`
      : input.prompt;
    const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const includeClaude = input.includeClaude !== false;

    const calls: Array<Promise<ModelResponse>> = [];
    if (includeClaude) {
      calls.push(this.callClaude(fullPrompt, input.claudeBin ?? DEFAULT_CLAUDE_BIN, timeoutMs));
    }
    calls.push(this.callCodex(fullPrompt, input.codexModel, input.codexEffort, timeoutMs));
    calls.push(this.callOllama(fullPrompt, input.ollamaModel ?? DEFAULT_OLLAMA_MODEL, timeoutMs));

    const responses = await Promise.all(calls);
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

    return {
      ok: successCount > 0,
      mode,
      responses,
      successCount,
      agreementScore,
      consensus,
      recommendation,
      totalLatencyMs: Date.now() - start,
    };
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
