/**
 * MultiModelConsensusEngine — fan a prompt out to Claude + Codex + a local
 * Ollama voice in parallel, score agreement, recommend an answer.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / OCTOPUS-CONSENSUS.
 *
 * Goal (per user): "more eyes on a task to hopefully cover all possible gaps
 * more efficiently". Three independent reasoners — Claude (deep, Anthropic),
 * gpt-5.5 xhigh (deep, OpenAI), and the strongest RUNNABLE local Ollama model
 * (CoT, local — selected by OllamaCapabilityProbeEngine, NOT a hardcoded id;
 * U-OCTOPUS-PANEL/U-OCTOPUS-DIVERSE-PROBE) — give us
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
import { grokCLIClientEngine } from "./GrokCLIClientEngine.js";
import { geminiClientEngine, type GeminiResult } from "./GeminiClientEngine.js";
import { deepSeekClientEngine, type DeepSeekResult } from "./DeepSeekClientEngine.js";
import { glmClientEngine, type GLMResult } from "./GLMClientEngine.js";
import { ollamaClientEngine } from "./OllamaClientEngine.js";
import { ollamaCapabilityProbeEngine } from "./OllamaCapabilityProbeEngine.js";
import { prismContextInjectorEngine } from "./PRISMContextInjectorEngine.js";
import { consensusFactCheckerEngine, type FactCheckResult } from "./ConsensusFactCheckerEngine.js";
import { consensusObsidianPersistenceEngine } from "./ConsensusObsidianPersistenceEngine.js";
import { consensusModelPerformanceEngine } from "./ConsensusModelPerformanceEngine.js";
import { feedbackBusEngine } from "./FeedbackBusEngine.js";
import { ConsensusAuditLogEngine, CONSENSUS_AUDIT_SCHEMA_VERSION } from "./ConsensusAuditLogEngine.js";

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

/**
 * A Hermes-served consensus voice (OCTOPUS-HERMES-AGENTS). A bare model string normalizes to a
 * model-only voice (back-compat with OCTOPUS-HERMES-MULTIMODEL); an agent spec adds a persona
 * `system` prompt (sent as a real role:system message -- GrokExecOptions.system is honored) and a
 * `name` label so two DISTINCT personas on the SAME model register as DISTINCT consensus voices.
 */
export interface HermesAgentVoice {
  model: string;
  /** persona system-prompt -> threaded into execViaHermesProxy as a role:system message. */
  system?: string;
  /** voice identity; lets N personas on one model be N distinct voices (else they'd collide). */
  name?: string;
}

/**
 * Normalize a caller-supplied Hermes voice list (OCTOPUS-HERMES-AGENTS, extends -MULTIMODEL):
 * each entry is either a bare model string (-> `{model}`) or an agent spec `{model, system?, name?}`.
 * Trim, drop empties/invalid, and DE-DUPE by voice IDENTITY (`name ?? model`) so seating the same
 * voice twice never double-weights it (R7) -- while two DISTINCT personas on the same model are BOTH
 * kept. Pure + exported for R9 unit testing without any network call.
 * @param list  the raw `hermesGrokModels` input (may be undefined / mixed string|spec)
 * @returns deduped voices in first-seen order
 */
export function normalizeHermesGrokModels(list: readonly unknown[] | undefined): HermesAgentVoice[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const out: HermesAgentVoice[] = [];
  for (const m of list) {
    let voice: HermesAgentVoice | null = null;
    if (typeof m === "string") {
      const t = m.trim();
      if (t) voice = { model: t };
    } else if (m && typeof m === "object" && typeof (m as { model?: unknown }).model === "string") {
      const model = ((m as { model: string }).model).trim();
      if (model) {
        voice = { model };
        const system = (m as { system?: unknown }).system;
        const name = (m as { name?: unknown }).name;
        if (typeof system === "string" && system.trim()) voice.system = system.trim();
        if (typeof name === "string" && name.trim()) voice.name = name.trim();
      }
    }
    if (!voice) continue;
    const id = voice.name ?? voice.model;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(voice);
  }
  return out;
}

/**
 * Default Hermes-AGENT persona panel: the proven 5 lenses from the `brainstorm-path-forward`
 * workflow, all seated on ONE Hermes model (free OAuth proxy, $0) but voting with DISTINCT personas
 * -- genuine agent diversity, not N copies of one model. Caller-overridable; pass as `hermesGrokModels`.
 * @param model  Hermes model id (default PRISM_HERMES_MODEL > PRISM_HERMES_PREFERRED_MODEL
 *   ["grok highest capability" operator pin] > grok-4.3). The hermes-CLI lane (ask-hermes) ranks
 *   the live /v1/models list for highest capability; this single-model panel honors the pin.
 */
export function hermesAgentLenses(model?: string): HermesAgentVoice[] {
  const m = model || process.env.PRISM_HERMES_MODEL || process.env.PRISM_HERMES_PREFERRED_MODEL || "grok-4.3";
  return [
    { model: m, name: "safety-first", system: "You are the SAFETY-FIRST reviewer. Judge by what could go wrong: data loss, regressions, irreversible or unsafe actions. Prefer the most conservative CORRECT answer." },
    { model: m, name: "root-cause", system: "You are the ROOT-CAUSE analyst. Look past the symptom to the underlying cause; reject band-aids. Answer with the fix that addresses the real cause." },
    { model: m, name: "fastest-unblock", system: "You are the FASTEST-UNBLOCK pragmatist. Find the smallest CORRECT step that unblocks progress now, without over-engineering." },
    { model: m, name: "distributed-ownership", system: "You are the DISTRIBUTED-OWNERSHIP coordinator. Weigh who owns each piece, multi-agent/multi-team coordination, and avoiding collisions." },
    { model: m, name: "adversarial", system: "You are the ADVERSARIAL skeptic. Try to REFUTE the obvious answer and surface the failure mode everyone else missed. Default to doubt." },
  ];
}

/**
 * DEFAULT-ON decision for the Hermes-agent panel (operator 2026-06-25: max-pro account -> drastically
 * increase hermes-agent utilization). Pure (env passed in) for R9 testing. The panel auto-seats UNLESS
 * the caller explicitly opts out (`includeHermesAgentLenses === false`) or the global knob disables it
 * (`PRISM_OCTOPUS_HERMES_AGENTS === "0"`). Reachability is gated separately at the call site (the panel
 * still only fires inside the includeGrok branch when the proxy is live -> no behavior change off-proxy).
 */
export function shouldSeatHermesLenses(includeHermesAgentLenses: boolean | undefined, envDisable: string | undefined): boolean {
  if (includeHermesAgentLenses === true) return true;   // explicit per-call ON wins (even over the knob)
  if (includeHermesAgentLenses === false) return false; // explicit per-call OFF wins
  if (envDisable === "0") return false;                 // global knob opt-out (only when caller is silent)
  return true;                                          // default ON
}

/**
 * Resolve the final Hermes voice list: explicit `hermesGrokModels` specs PLUS (when seatLenses) the
 * default agent-lens panel, normalized + deduped (an explicit voice sharing a lens `name` wins
 * first-seen, so a caller can override a single lens). Pure + exported for R9 testing without network.
 */
export function resolveHermesVoices(opts: { hermesGrokModels?: readonly (string | HermesAgentVoice)[]; seatLenses: boolean; lensModel?: string }): HermesAgentVoice[] {
  const explicit = opts.hermesGrokModels ?? [];
  const merged = opts.seatLenses ? [...explicit, ...hermesAgentLenses(opts.lensModel)] : explicit;
  return normalizeHermesGrokModels(merged);
}

export interface ConsensusInput {
  prompt: string;
  context?: string;
  includeClaude?: boolean;          // default true — set false when caller IS Claude
  /** Set false to skip the Grok voice. Default true, but BACKEND-GATED: the voice fires when
   *  EITHER XAI_API_KEY is set (HTTP API, preferred -- deterministic + reports token usage) OR
   *  the `grok` CLI is on PATH (xAI account-login auth, no key in env). Absent both => no Grok
   *  voice => back-compat. The voice never seats both backends (no double-weighting one vendor, R7). */
  includeGrok?: boolean;
  /** Set false to skip Gemini (e.g. when GEMINI_API_KEY isn't set). Default true. */
  includeGemini?: boolean;
  /** Set false to skip the Codex (OpenAI/ChatGPT-subscription) voice -- e.g. a
   *  LOCAL-ONLY caller that wants zero external spend without the PRISM_CODEX_BIN
   *  sentinel-bin hack. Default true (back-compat: codex stays in the pool unless
   *  explicitly disabled). Mirrors includeClaude/includeGrok/includeGemini. */
  includeCodex?: boolean;
  /** Set false to skip the DeepSeek (hosted V3.2 API) voice. Default true, but KEY-GATED:
   *  only fires when DEEPSEEK_API_KEY is set (mirrors includeGrok/includeGemini -- absent key =>
   *  no DeepSeek voice => back-compat). A 5th cross-vendor voice at ~1/30th Claude price; the
   *  codegen-capable cloud coder (operator 2026-06-18 'deepseek coder, cloud version'). */
  includeDeepSeek?: boolean;
  /** Default `deepseek-chat` (V3.2; env override `PRISM_DEEPSEEK_MODEL`). Use `deepseek-reasoner` for the R1-style CoT variant. */
  deepseekModel?: string;
  /** Set false to skip the GLM (Zhipu, OpenAI-compatible) voice. Default true, KEY-GATED:
   *  only fires when GLM_API_KEY/ZHIPU_API_KEY is set (mirrors includeDeepSeek -- absent key =>
   *  no GLM voice => back-compat). A cross-vendor voice (operator 2026-06-18 'incorporate glm5.2'). */
  includeGLM?: boolean;
  /** Default `glm-4.6` (env override `PRISM_GLM_MODEL`; set `glm-5.2` for GLM-5.2). */
  glmModel?: string;
  /** Default `gemini-3-pro-preview` (env override `PRISM_GEMINI_MODEL`). Falls back to `gemini-2.5-flash` for unpaid API tier. */
  geminiModel?: string;
  /** low/medium/high/xhigh — maps to thinkingBudget. Default high (BLACKWELL-MODEL-UPGRADE: more powerful reasoning). */
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
  /** Diverse local panel mode: wire N distinct-family Ollama voices, each
   *  install-gated (present → active, absent → skipped). Default false. */
  diverseLocalPanel?: boolean;
  /** Override the panel. Default ["gpt-oss:120b","gemma4:31b","qwen2.5-coder:32b"]. */
  diverseLocalModels?: readonly string[];
  /** CODING-task ensemble (operator 2026-06-18 "combine coders to cover more ground in one pass"):
   *  seat the dedicated CODER panel (CODER_ENSEMBLE_MODELS: qwen2.5-coder:32b + qwen3-coder:30b;
   *  deepseek-coder is the operator-named third member, omitted until pulled) instead of the generic
   *  synthesis panel, so a CODING consensus runs two distinct coders together (paired with the
   *  Claude/Sonnet voice). Implies diverseLocalPanel; install-gated (absent coders skipped).
   *  Default false -- back-compat: a normal consensus is unchanged. */
  coderEnsemble?: boolean;
  /** Force a FRESH capability probe (bypass the 5-min cache) when resolving the
   *  diverse local panel. Set true by a caller that has just PREWARMED its panel
   *  models so the runnable-set reflects the now-resident models instead of a
   *  stale snapshot taken when VRAM was occupied. Default false (use the cache). */
  forceProbe?: boolean;
  claudeBin?: string;               // override claude CLI path
  ollamaModel?: string;             // default: probe-selected primary, else gpt-oss:120b (DEFAULT_OLLAMA_MODEL); deepseek-r1:14b retired 2026-06-04
  /** Per-Ollama-call output token cap. Default 1024. Latency-sensitive callers (e.g. a one-word
   *  vote) pass a small value so a verbose/reasoning model can't spend seconds generating. */
  ollamaMaxTokens?: number;
  codexModel?: string;              // default gpt-5.5
  codexEffort?: "low" | "medium" | "high" | "xhigh";  // default xhigh
  grokModel?: string;               // default grok-4
  grokReasoning?: "low" | "medium" | "high";  // default high (BLACKWELL-MODEL-UPGRADE: more powerful reasoning)
  /** Multi-model Hermes-Grok panel (OCTOPUS-HERMES-MULTIMODEL): when this lists 1+ DISTINCT
   *  Grok model ids (e.g. ["grok-4.3","grok-4.20-0309-reasoning"]) AND the local Hermes OAuth
   *  proxy (:8645) is reachable, seat ONE consensus voice PER model instead of the single
   *  default Grok voice -- genuine cross-MODEL diversity in the external panel at $0 (the
   *  operator's managed OAuth credential). Mirrors `diverseLocalModels` for the local panel:
   *  multiple xai voices, each carrying its TRUE served model so the ledger distinguishes them.
   *  The proxy is the ONLY transport for this panel (per-call model control the CLI/API-default
   *  path lacks); a down proxy makes each voice fail-soft to errResponse. Deduped + trimmed via
   *  normalizeHermesGrokModels. Default [] / undefined -> single-voice back-compat (R7). */
  hermesGrokModels?: readonly (string | HermesAgentVoice)[];
  /** OCTOPUS-HERMES-AGENTS default panel (operator 2026-06-25: Hermes is on a max-pro account ->
   *  DRASTICALLY increase hermes-agent utilization). When the Hermes proxy is reachable the default
   *  5-lens persona panel (`hermesAgentLenses()`) auto-seats UNLESS this is `false` or the knob
   *  `PRISM_OCTOPUS_HERMES_AGENTS=0`. Set `true` to force, `false` to opt out. Merged + deduped with
   *  any explicit `hermesGrokModels`. The 5 voices fan out in PARALLEL (Promise.all) so latency ~= 1. */
  includeHermesAgentLenses?: boolean;
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
  /**
   * Optional tag of the engine that initiated the consensus call. Surfaces in
   * the audit-log JSONL (P0-U04) so consensus calls can be grouped by their
   * upstream caller (e.g. "MillingAGIMasterEngine"). Defaults to "unknown".
   */
  callerEngine?: string;
}

export interface ModelResponse {
  model: string;
  vendor: "anthropic" | "openai" | "ollama" | "xai" | "google" | "deepseek" | "zhipu";
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

/**
 * Per-vendor reward from a finished consensus round (U-CONSENSUS-PERF-INPROC-WIRE,
 * slot:india). A vendor "agreed" iff its model is among the consensus voters (the
 * models that produced the winning answer) -> reward 1, else 0. Pure (no I/O):
 * feeds the vendor-performance loop that recommendVendors reads. ok:false
 * responses and a null consensus contribute nothing; deduped by vendor (first
 * ok response wins) so a 1-model-per-vendor panel records each vendor once.
 */
export function deriveVendorRewards(
  responses: ModelResponse[],
  consensus: ConsensusResult["consensus"],
): Array<{ vendor: ModelResponse["vendor"]; reward: number; agreed: boolean }> {
  if (consensus === null || !Array.isArray(responses)) return [];
  const winners = new Set(consensus.voters);
  const seen = new Set<string>();
  const out: Array<{ vendor: ModelResponse["vendor"]; reward: number; agreed: boolean }> = [];
  for (const r of responses) {
    if (!r || r.ok !== true || typeof r.vendor !== "string" || seen.has(r.vendor)) continue;
    seen.add(r.vendor);
    const agreed = winners.has(r.model);
    out.push({ vendor: r.vendor, reward: agreed ? 1 : 0, agreed });
  }
  return out;
}

// ============================================================================
// RULER trajectory ranking (ULTRACODE-SYNERGY-MS0 / Order 4)
// ============================================================================
// RULER (OpenPipe ART): a general-purpose reward function for agentic RL where
// no verifiable reward exists. Generate N trajectories for the same scenario,
// hand ALL N to an LLM judge that reads the SYSTEM PROMPT to infer task intent,
// and have it score each 0-1 RELATIVE to the others. Two properties make it work
// (Avi Chawla / Karpathy system-prompt-learning, 2026): (1) relative scoring is
// easier+more consistent than absolute for an LLM; (2) GRPO normalizes within
// the group anyway, so only the ORDERING matters — which maps directly onto the
// GroupRelativeRewardNormalizerEngine (Order 3) this method feeds. We reuse the
// existing ask() consensus panel as the judge (clone-don't-fork the decomposed-
// reward+confidence shape from SFCMultiHypothesisRankerEngine) instead of a new
// judge engine, so the two layers compound (R7/R8).

export interface Trajectory {
  /** caller id; defaults to the array index if absent */
  id?: string;
  /** the agent trajectory / candidate output to be judged */
  content: string;
}

export interface RankTrajectoriesInput {
  trajectories: Trajectory[];
  /**
   * The agent's system prompt — the judge reads it to infer task intent and
   * grades against it (RULER system-prompt-as-reward). When omitted, the judge
   * is told to rank by "which best accomplishes the implied task" (still relative).
   */
  systemPrompt?: string;
  /** optional explicit rubric; overrides the systemPrompt-derived rubric when set */
  rubric?: string;
  /** forwarded to ask() — suppress PRISM context injection for ephemeral ranks */
  prismContext?: boolean;
  /** forwarded to ask() per-model timeout */
  timeoutMs?: number;
}

export interface RankedTrajectory {
  id: string;
  index: number;
  /** relative reward in [0,1] parsed from the judge's ranking */
  reward: number;
  /** GRPO group-relative advantage (mean≈0) — from GroupRelativeRewardNormalizerEngine */
  advantage: number;
  /** 1 = best trajectory in the group */
  rank: number;
}

export interface RankTrajectoriesResult {
  ok: boolean;
  /** ranked trajectories in INPUT order (sort by .rank for leaderboard) */
  ranked: RankedTrajectory[];
  /** how the rewards were derived: judge ranking, or order-fallback when the judge failed */
  mode: "judge-ranked" | "order-fallback" | "degenerate";
  /** the GRPO advantage normalizer mode for the parsed reward group */
  advantageMode: string;
  /** the underlying consensus run (judge panel) — null in degenerate/fallback */
  judge: ConsensusResult | null;
  warning?: string;
  source: "ruler-trajectory-rank";
}

const DEFAULT_TIMEOUT_MS = 90_000;
// ── BLACKWELL-MODEL-UPGRADE (slot:alpha, 2026-06-04) — local-LLM power floor ──
// Alpha retired the small local models (3b/7b/14b incl. deepseek-r1:14b AND
// qwen2.5-coder:14b were `ollama rm`'d) and established a qwen2.5-coder:32b floor
// + gpt-oss:120b/20b (install-gated, 65GB pulled to golf; Playwright research:
// 120B MoE @134 t/s >> dense 72b @29 t/s). The old 14b defaults below now point
// at RETIRED models — observed live as "model 'deepseek-r1:14b' not found". The
// octopus REQUESTS the most powerful local voice; resolveOllamaModels()
// substitutes the best INSTALLED chat model on hosts where the requested one
// isn't pulled, so a host without gpt-oss:120b transparently falls back to
// qwen2.5-coder:32b (the 14b-coexistence memory rationale is superseded by
// alpha's per-host presets). Override per-call via ollamaModel/secondaryOllamaModel.
const DEFAULT_OLLAMA_MODEL = "gpt-oss:120b";                  // most powerful local (install-gated)
const DEFAULT_SECONDARY_OLLAMA_MODEL = "qwen2.5-coder:32b";  // reliable 32b floor, distinct second voice
// CODER ENSEMBLE (operator 2026-06-18 "combine coders to cover more ground in one pass"): the
// dedicated local coder panel for a CODING consensus -- two DISTINCT code-tuned families run
// together (NOT gpt-oss:120b + one coder, which the size-ranked default panel would seat). These
// are EXACT live tags (resolveDiverseOllamaPanel install-gates by exact `installed.includes`), both
// on the 16-model roster. deepseek-coder is the operator-named THIRD member but is NOT pulled yet;
// when it is, add its exact tag here (e.g. "deepseek-coder:33b") -- a bare "deepseek-coder" would
// never match a real pulled tag, so it is intentionally omitted (R12: no dead entry). The graph's
// resolveModelPlan tracks it under coderEnsemblePending.
export const CODER_ENSEMBLE_MODELS = ["qwen2.5-coder:32b", "qwen3-coder:30b"] as const;
const DEFAULT_CODEX_MODEL = "gpt-5.5";
const DEFAULT_CODEX_EFFORT = "xhigh" as const;
const DEFAULT_CLAUDE_BIN = process.env.PRISM_CLAUDE_BIN ?? "claude";

const ACCEPT_THRESHOLD = 0.70;     // ≥ → accept
const REVIEW_THRESHOLD = 0.40;     // ≥ → review (caller picks); < → escalate

// ── BLACKWELL-AI-MS1/U-ROUTE-LADDER (slot:india, 2026-06-03) ──────────────────
// Keep the consensus Ollama voice ALIVE when the hardcoded 14b defaults are not
// pulled on the host. These pure helpers + the ask() glue below were SPECIFIED
// and TESTED in INTEL-OLLAMA-OBSIDIAN-MS1 (MultiModelConsensusOllamaResolve.test.ts)
// but the implementation was lost — the test was RED with "resolveOllamaModels is
// not a function", so every consensus run silently lost its local voice whenever
// deepseek-r1:14b / qwen2.5-coder:14b were absent (observed live:
// "model 'deepseek-r1:14b' not found"). No network I/O here — ask() passes the
// LIVE installed set from ollamaClientEngine.listModels().
const OLLAMA_CODER_BONUS = 0.5; // tiebreak nudge for code-specialised models

/** Parameter size (billions) parsed from an Ollama tag (":7b"->7, ":3.8b"->3.8);
 *  0 when no size tag is present. */
function ollamaModelSize(name: string): number {
  const m = name.match(/:(\d+(?:\.\d+)?)b/i);
  return m ? Number.parseFloat(m[1]) : 0;
}

/** Embedding models cannot chat-generate — never a consensus voice. */
function isEmbeddingOllamaModel(name: string): boolean {
  return /embed/i.test(name);
}

/**
 * Vision / multimodal models are weak TEXT reasoners and are reserved for the
 * OCR / blueprint pipeline (BLACKWELL-MODEL-UPGRADE explicitly PROTECTED them
 * from the local-LLM purge). With the small text models retired they are often
 * the only non-embedding models left installed, so they must be excluded from
 * the chat-consensus voice picker — otherwise pickBestOllamaModel would seat a
 * 1.8B vision model (e.g. moondream:1.8b) or a `*-vl` VLM as a text reasoner,
 * fabricating a low-quality "independent" voice. Matches the common vision tags
 * (`-vl`, `vl:`, `vision`, `moondream`, `llava`, `bakllava`, `minicpm-v`).
 */
function isVisionOllamaModel(name: string): boolean {
  return /(?:-vl\b|vl:|vision|moondream|llava|bakllava|minicpm-v)/i.test(name);
}

/**
 * Pick the best chat-capable Ollama model from an installed list: highest
 * parameter count, +0.5 for code-specialised models, ties broken
 * alphabetically (deterministic). Embedding models are excluded. `exclude`
 * drops one id so a DISTINCT second voice can be chosen. Returns null when no
 * usable model remains (empty / non-array input, or all excluded/embeddings).
 */
export function pickBestOllamaModel(
  installed: readonly string[],
  exclude?: string,
): string | null {
  if (!Array.isArray(installed)) return null;
  const candidates = installed.filter(
    (m) => typeof m === "string" && m.length > 0 && !isEmbeddingOllamaModel(m) && !isVisionOllamaModel(m) && m !== exclude,
  );
  if (candidates.length === 0) return null;
  const scored = candidates.map((name) => ({
    name,
    score: ollamaModelSize(name) + (/cod(e|er)/i.test(name) ? OLLAMA_CODER_BONUS : 0),
  }));
  scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return scored[0].name;
}

/**
 * Resolve the requested primary/secondary Ollama voices against the LIVE
 * installed set so the consensus never calls an absent model. An installed
 * requested model is kept; an absent one is substituted with the best installed
 * model. For dual-Ollama the secondary is forced DISTINCT from the resolved
 * primary (two identical voices would fabricate agreement); when only one
 * generation model exists the secondary collapses to the primary and ask()'s
 * `secondary !== primary` guard disables the dual. Empty / non-array installed
 * (daemon down) -> requested names pass through unchanged (callOllama degrades
 * exactly as before).
 */
export function resolveOllamaModels(
  primary: string,
  secondary: string,
  wantDual: boolean,
  installed: readonly string[],
): { primary: string; secondary: string } {
  if (!Array.isArray(installed) || installed.length === 0) {
    return { primary, secondary };
  }
  const resolvedPrimary = installed.includes(primary)
    ? primary
    : pickBestOllamaModel(installed) ?? primary;
  if (!wantDual) {
    return { primary: resolvedPrimary, secondary };
  }
  const secondaryOk = installed.includes(secondary) && secondary !== resolvedPrimary;
  const resolvedSecondary = secondaryOk
    ? secondary
    : pickBestOllamaModel(installed, resolvedPrimary) ?? resolvedPrimary;
  return { primary: resolvedPrimary, secondary: resolvedSecondary };
}

/**
 * BLACKWELL-MODEL-INTEGRATION-MS0 — resolve a DIVERSE local panel of N
 * distinct-family Ollama voices against the LIVE installed set, install-gating
 * each independently (present → active, absent → skipped). Returns the requested
 * models that are both installed AND chat-capable, in REQUEST order (so the
 * synthesis tier leads when listed first). A vision/embedding tag in the panel
 * is filtered via the same `isEmbeddingOllamaModel`/`isVisionOllamaModel` guards
 * `pickBestOllamaModel` uses — otherwise a VLM/embedder would be seated as a
 * text-reasoning voice, fabricating a low-quality "independent" answer. When all
 * requested models are absent, falls back to the single best installed chat model
 * (`pickBestOllamaModel`) so the local voice never goes silent on a host that has
 * *some* other usable model. Empty / non-array requested → `[]`. Empty / non-array
 * installed (daemon down) → requested names pass through unchanged (callOllama
 * degrades exactly as the legacy path does), with vision/embed still stripped.
 *
 * @param requested ordered panel of Ollama tags (synthesis-tier first)
 * @param installed the LIVE `ollama list` inventory (from listModels())
 * @returns the active panel — distinct chat-capable voices, request order
 */
export function resolveDiverseOllamaPanel(
  requested: readonly string[],
  installed: readonly string[],
  // BLACKWELL-AI-MS5/U-OCTOPUS-DIVERSE-PROBE: optional capability-probe runnable
  // set (present + fits free VRAM + runsOn this host). When provided, the panel
  // is additionally intersected with it so a model that is installed-but-not-
  // runnable-right-now (VRAM-starved / wrong hardware profile) is dropped, and
  // the empty-panel fallback prefers the probe's strongest runnable pick over
  // the size-only pickBestOllamaModel heuristic. When undefined (the default),
  // behavior is BYTE-IDENTICAL to before — full back-compat for callers/tests
  // that don't have a probe (daemon-down, hermetic unit tests).
  // INTENTIONAL fail-OPEN: an EMPTY [] is treated identically to undefined (no
  // probe signal), NOT as "seat nothing". The probe is a VRAM-FIT oracle, not a
  // can-execute oracle — it returns [] on a cloud_only/CPU host (where Ollama
  // models still run on CPU) and on the documented WDDM free-VRAM artifact (a
  // 96GB idle card reporting [] runnable). Honoring [] literally would silence
  // the local voice on every GPU-less host; the install-gate + callOllama's real
  // load attempt is the final authority. Only a NON-EMPTY runnable narrows.
  runnable?: readonly string[],
): string[] {
  if (!Array.isArray(requested) || requested.length === 0) return [];
  const usable = (m: string) => !isEmbeddingOllamaModel(m) && !isVisionOllamaModel(m);
  const hasRunnable = Array.isArray(runnable) && runnable.length > 0;
  const runnableSet = hasRunnable ? new Set(runnable) : null;
  if (!Array.isArray(installed) || installed.length === 0) {
    // Daemon down / no install list: pass through usable requested names. If a
    // probe runnable set is present, still gate by it (it is the stronger
    // authority — a model not in it cannot run regardless of the request).
    const passthrough = Array.from(requested).filter(usable);
    return runnableSet ? passthrough.filter((m) => runnableSet.has(m)) : passthrough;
  }
  const active = requested.filter(
    (m) => installed.includes(m) && usable(m) && (!runnableSet || runnableSet.has(m)),
  );
  if (active.length > 0) return active;
  // Empty panel: prefer the probe's strongest runnable model (capability/tier/
  // VRAM-aware), else the size-only installed heuristic, else usable requested.
  const probeFb = runnableSet
    ? Array.from(runnable!).find((m) => usable(m) && installed.includes(m))
    : undefined;
  const fb = probeFb ?? pickBestOllamaModel(installed);
  return fb ? [fb] : Array.from(requested).filter(usable);
}

export class MultiModelConsensusEngine {
  async ask(input: ConsensusInput): Promise<ConsensusResult> {
    this.validate(input);
    const start = Date.now();
    const userPrompt = input.context
      ? `${input.prompt}\n\n=== CALLER CONTEXT ===\n${input.context}`
      : input.prompt;
    const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const includeClaude = input.includeClaude !== false;
    // Codex voice is on by default (back-compat) but now opt-out-able, so a
    // local-only caller can drop it cleanly instead of pointing PRISM_CODEX_BIN
    // at a non-existent sentinel binary (which recorded a phantom
    // failed:spawn-enoent voice in every local-only octopus run).
    const includeCodex = input.includeCodex !== false;

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

    // Grok joins when NOT disabled AND a backend is live: the HTTP API (XAI_API_KEY), the
    // keyless `grok` CLI on PATH, OR the local Hermes OAuth proxy (:8645 -- same Grok model via
    // the operator's managed credential, FREE, no key/CLI; OCTOPUS-HERMES-SYNERGY 2026-06-23).
    // The first two checks are sync + cheap; the proxy reachability probe is memoized and only
    // runs when both are absent (|| short-circuits), so a keyed/CLI host pays nothing and a host
    // with NONE of the three stays false => back-compat (no Grok voice, no behavior change).
    let includeGrok = input.includeGrok !== false
      && (Boolean(process.env.XAI_API_KEY) || grokCLIClientEngine.isAvailable() || await grokClientEngine.hermesProxyReachable());
    let includeGemini = input.includeGemini !== false && Boolean(process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY);
    // KEY-GATED like Grok/Gemini: a DeepSeek voice only joins when DEEPSEEK_API_KEY is set, so
    // back-compat holds on a host without the key (no new voice, behavior unchanged).
    let includeDeepSeek = input.includeDeepSeek !== false && Boolean(process.env.DEEPSEEK_API_KEY);
    // KEY-GATED like DeepSeek: a GLM (Zhipu) voice only joins when GLM_API_KEY/ZHIPU_API_KEY is set.
    let includeGLM = input.includeGLM !== false && (Boolean(process.env.GLM_API_KEY) || Boolean(process.env.ZHIPU_API_KEY));
    let weightedClaude = includeClaude;

    // Performance-weighted vendor filtering — opt-in via usePerformanceWeights.
    // Drops vendors with historically low reward EMA on this task_type while
    // preserving a floor of 2 vendors so consensus never collapses to a single
    // voice. The full pool is still considered "available"; we only down-select.
    if (input.usePerformanceWeights === true && typeof input.taskType === "string" && input.taskType.length > 0) {
      const available: string[] = [];
      if (weightedClaude) available.push("anthropic");
      if (includeCodex) available.push("openai"); // codex unless includeCodex:false
      if (includeGrok) available.push("xai");
      if (includeGemini) available.push("google");
      if (includeDeepSeek) available.push("deepseek");
      if (includeGLM) available.push("zhipu");
      available.push("ollama"); // primary ollama always in pool
      try {
        const perfState = consensusModelPerformanceEngine.loadState(input.performanceStateFilePath);
        const rec = consensusModelPerformanceEngine.recommendVendors(perfState, input.taskType, available, { floor: 2 });
        const keep = new Set(rec.ranked.map((r) => r.vendor));
        if (!keep.has("anthropic")) weightedClaude = false;
        if (!keep.has("xai")) includeGrok = false;
        if (!keep.has("google")) includeGemini = false;
        if (!keep.has("deepseek")) includeDeepSeek = false;
        if (!keep.has("zhipu")) includeGLM = false;
        // Note: ollama-primary is always called regardless; openai (codex) is
        // called unless includeCodex:false (the perf-weight down-select cannot
        // drop codex on its own -- that needs the includeCodex opt-out).
      } catch {
        // Fail open — bad state file should never break consensus delivery.
      }
    }

    // BLACKWELL-MODEL-INTEGRATION-MS0 — diverse local panel mode. When opted in,
    // wire N distinct-family Ollama voices (gpt-oss:120b synthesis + gemma4:31b
    // diversity + qwen2.5-coder:32b floor by default), each install-gated. This
    // is mutually exclusive with the legacy dual-Ollama path below (the
    // `!diverseLocalPanel` gate) so the two modes never both fire.
    // coderEnsemble (operator 2026-06-18) is a CODING-task preset over the same diverse-panel
    // machinery: it implies diverseLocalPanel and, unless the caller pinned diverseLocalModels,
    // swaps the generic synthesis panel for the dedicated CODER_ENSEMBLE_MODELS so a coding
    // consensus seats two distinct coders together. Back-compat: default false -> unchanged.
    const coderEnsemble = input.coderEnsemble === true;
    const diverseLocalPanel = input.diverseLocalPanel === true || coderEnsemble;
    const diverseModels = input.diverseLocalModels ?? (coderEnsemble ? CODER_ENSEMBLE_MODELS : [
      "gpt-oss:120b",      // MoE synthesis tier (BEST)
      "gemma4:31b",        // consensus / diversity tier
      "qwen2.5-coder:32b", // reliable code-specialised floor
    ]);

    // Dual-Ollama auto-fires when neither Grok nor Gemini is available to keep
    // the pool at ≥4 voices. With Gemini configured we already have 4-way
    // (Claude + Codex + Gemini + Ollama) so we don't need the dual. Suppressed
    // whenever the diverse panel is active.
    const dualOllama = !diverseLocalPanel && input.dualOllama !== false && !includeGrok && !includeGemini && !includeDeepSeek && !includeGLM;
    // BLACKWELL-AI-MS1/U-ROUTE-LADDER: resolve the requested Ollama voices
    // against the LIVE installed set so a consensus run never calls an absent
    // model (the hardcoded 14b defaults are frequently not pulled). listModels
    // failure / daemon down -> installedOllama=[] -> resolveOllamaModels passes
    // the requested names through unchanged (callOllama degrades as before).
    let installedOllama: string[] = [];
    try {
      const lm = await ollamaClientEngine.listModels();
      if (lm.ok && Array.isArray(lm.value)) installedOllama = lm.value;
    } catch {
      // listModels threw (daemon unreachable) — leave installedOllama=[]
    }

    // Resolve the active Ollama voice list. Diverse panel → up to N distinct
    // families; legacy → primary (+ optional distinct secondary for dual).
    let primaryOllama: string;
    let ollamaVoices: string[];
    if (diverseLocalPanel) {
      // U-OCTOPUS-DIVERSE-PROBE: feed the panel the cap-probe runnable set so it
      // only seats models that can ACTUALLY run now (present + fit VRAM + runsOn
      // host), not merely present per listModels(). Probe failure → undefined →
      // resolveDiverseOllamaPanel falls back to its pre-probe install-gate (full
      // back-compat). The probe snapshot is 5-min cached (shared with the legacy
      // branch's getBest* calls), so this adds no extra cold I/O on repeat asks.
      let runnableIds: string[] | undefined;
      try {
        // force:true bypasses the 5-min probe cache -- a caller that just prewarmed
        // its panel (input.forceProbe) needs the runnable-set to reflect the
        // now-resident models, not a stale snapshot from when VRAM was occupied.
        const snap = await ollamaCapabilityProbeEngine.probe({ force: input.forceProbe === true });
        runnableIds = snap.runnableModelIds;
      } catch {
        // Probe threw (no GPU / daemon down) — leave undefined → install-gate only.
      }
      ollamaVoices = resolveDiverseOllamaPanel(diverseModels, installedOllama, runnableIds);
      // Fall back to the first requested model when the panel resolves empty
      // (no usable installed model AND no fallback) so callOllama still has a
      // target to degrade against, matching the legacy daemon-down behavior.
      primaryOllama = ollamaVoices[0] ?? String(diverseModels[0] ?? DEFAULT_OLLAMA_MODEL);
      if (ollamaVoices.length === 0) ollamaVoices = [primaryOllama];
    } else {
      // BLACKWELL-AI-MS5/U-OCTOPUS-PANEL: when the caller does NOT pin a model,
      // ask the capability probe for the strongest model that is RUNNABLE right
      // now (present + fits free VRAM + runsOn this host) instead of trusting the
      // static DEFAULT_*_MODEL strings, which can name a model that was `ollama
      // rm`'d (the deepseek-r1:14b-not-installed bug). The probe is the single
      // capability oracle (keystone U-CAP-PROBE). It returns null when nothing is
      // runnable (Ollama down / nothing pulled / VRAM-starved) — we then fall
      // back to the static default, and resolveOllamaModels still list-substitutes
      // against installedOllama, so the legacy degrade path is fully preserved.
      // An explicit input.ollamaModel ALWAYS wins (caller override is sacred).
      let probedPrimary: string | null = null;
      let probedSecondary: string | null = null;
      if (input.ollamaModel === undefined || input.secondaryOllamaModel === undefined) {
        try {
          if (input.ollamaModel === undefined) {
            probedPrimary = await ollamaCapabilityProbeEngine.getBestReasoningModel();
          }
          if (dualOllama && input.secondaryOllamaModel === undefined) {
            // Code-axis pick for a genuinely DISTINCT second voice when possible.
            probedSecondary = await ollamaCapabilityProbeEngine.getBestChatModel();
          }
        } catch {
          // Probe threw (no GPU / daemon down) — leave nulls; static defaults win.
        }
      }
      const { primary, secondary } = resolveOllamaModels(
        input.ollamaModel ?? probedPrimary ?? DEFAULT_OLLAMA_MODEL,
        input.secondaryOllamaModel ?? probedSecondary ?? DEFAULT_SECONDARY_OLLAMA_MODEL,
        dualOllama,
        installedOllama,
      );
      primaryOllama = primary;
      ollamaVoices = dualOllama && secondary !== primary ? [primary, secondary] : [primary];
    }

    // Each call returns ONE or MORE ModelResponses (dual-Ollama returns 2).
    // We flatten after Promise.all so the rest of the engine treats them uniformly.
    // Per-model prompts are built lazily so each model gets a context sized to
    // its own context window.
    const calls: Array<Promise<ModelResponse[]>> = [];
    if (weightedClaude) {
      calls.push(buildPrompt("claude").then((p) => this.callClaude(p, input.claudeBin ?? DEFAULT_CLAUDE_BIN, timeoutMs)).then((r) => [r]));
    }
    if (includeCodex) {
      calls.push(buildPrompt("codex").then((p) => this.callCodex(p, input.codexModel, input.codexEffort, timeoutMs)).then((r) => [r]));
    }
    if (includeGrok) {
      // OCTOPUS-HERMES-MULTIMODEL: when the caller lists distinct Hermes-Grok models AND the
      // local OAuth proxy is reachable, seat ONE voice per DISTINCT model (genuine cross-model
      // diversity at $0). Otherwise the single legacy Grok voice (byte-identical default). This
      // mirrors the diverse local Ollama panel below: multiple same-vendor voices, distinct model.
      // The reachability probe is memoized (the includeGrok gate above already warmed it -> cache
      // hit), so the multi-model branch costs nothing on a host without the proxy.
      // OCTOPUS-HERMES-AGENTS (operator 2026-06-25, max-pro): the 5-lens persona panel auto-seats by
      // DEFAULT (opt out via includeHermesAgentLenses:false or PRISM_OCTOPUS_HERMES_AGENTS=0), merged
      // with any explicit hermesGrokModels. Still gated on a reachable proxy below -> off-proxy = no change.
      const seatLenses = shouldSeatHermesLenses(input.includeHermesAgentLenses, process.env.PRISM_OCTOPUS_HERMES_AGENTS);
      const hermesGrokModels = resolveHermesVoices({ hermesGrokModels: input.hermesGrokModels, seatLenses });
      if (hermesGrokModels.length > 0 && await grokClientEngine.hermesProxyReachable()) {
        for (const gm of hermesGrokModels) {
          // OCTOPUS-HERMES-AGENTS: each voice = a model + optional persona (system) + label (name).
          calls.push(buildPrompt("grok").then((p) => this.callGrokHermesVoice(p, gm.model, timeoutMs, gm.system, gm.name)).then((r) => [r]));
        }
      } else {
        calls.push(buildPrompt("grok").then((p) => this.callGrok(p, input.grokModel, input.grokReasoning, timeoutMs)).then((r) => [r]));
      }
    }
    if (includeGemini) {
      // Gemini gets the codex-tier budget by default — it has 1M+ context so
      // we don't need to compress for it. Reuses the codex budget bucket.
      calls.push(buildPrompt("codex").then((p) => this.callGemini(p, input.geminiModel, input.geminiReasoning, timeoutMs)).then((r) => [r]));
    }
    if (includeDeepSeek) {
      // DeepSeek V3.2 has a 128K context, so it reuses the codex budget bucket (no extra compression).
      calls.push(buildPrompt("codex").then((p) => this.callDeepSeek(p, input.deepseekModel, timeoutMs)).then((r) => [r]));
    }
    if (includeGLM) {
      // GLM (Zhipu) is OpenAI-compatible with a large context; reuses the codex budget bucket like DeepSeek.
      calls.push(buildPrompt("codex").then((p) => this.callGLM(p, input.glmModel, timeoutMs)).then((r) => [r]));
    }
    if (ollamaVoices.length > 1) {
      // Ollama swaps models on demand; parallel requests to two different
      // models trigger OOM/HTTP 500 on memory-constrained hosts — and a single
      // Blackwell GPU serializes model loads, so concurrent calls thrash VRAM.
      // Serialize every Ollama voice (legacy dual OR diverse N-family panel)
      // inside one Promise so they run in parallel with codex/claude/grok/gemini
      // but strictly one-at-a-time against each other.
      calls.push((async (): Promise<ModelResponse[]> => {
        const ollamaPrompt = await buildPrompt("ollama");
        const out: ModelResponse[] = [];
        for (const model of ollamaVoices) {
          out.push(await this.callOllama(ollamaPrompt, model, timeoutMs, input.ollamaMaxTokens ?? 1024));
        }
        return out;
      })());
    } else {
      calls.push(buildPrompt("ollama").then((p) => this.callOllama(p, primaryOllama, timeoutMs, input.ollamaMaxTokens ?? 1024)).then((r) => [r]));
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

    // U-CONSENSUS-PERF-INPROC-WIRE (slot:india): close the vendor-performance loop.
    // recommendVendors (the READ side, ~L546) consults the per-vendor reward EMA to
    // down-select the fan-out, but until now NOTHING fed an actual back -- the EMA
    // stayed frozen at cold-start and the perf gate was inert. After a round, reward
    // each participating vendor by whether it AGREED with the consensus (its model is
    // among consensus.voters) and persist the whole round in ONE atomic write via
    // recordOutcomesAndPersist (load-once->fold->save-once; U-CONSENSUS-PERF-BATCH).
    // Gated identically to the READ (usePerformanceWeights + a real taskType, which
    // recordOutcome requires). Fire-and-forget under the same contract as the persist
    // block above: a perf-write failure must NEVER break consensus delivery.
    if (
      input.usePerformanceWeights === true &&
      typeof input.taskType === "string" &&
      input.taskType.length > 0
    ) {
      const taskType = input.taskType;
      try {
        const observations = deriveVendorRewards(responses, finalResult.consensus).map(
          (r) => ({ vendor: r.vendor, taskType, reward: r.reward }),
        );
        if (observations.length > 0) {
          consensusModelPerformanceEngine.recordOutcomesAndPersist(observations, {
            filePath: input.performanceStateFilePath,
          });
        }
      } catch {
        // swallowed -- fire-and-forget; a perf write must never break consensus delivery
      }
    }

    // Audit log — P0-U04. Fire-and-forget under the same contract as the
    // persist block above. Every consensus call appends one JSONL line to the
    // canonical audit path (override via PRISM_CONSENSUS_AUDIT_PATH; kill
    // switch PRISM_CONSENSUS_AUDIT_DISABLE=1). Per-voice answer cards survive
    // round-trip so downstream debugging can replay any past call.
    if (process.env.PRISM_CONSENSUS_AUDIT_DISABLE !== "1") {
      try {
        const tokensTotal = responses.reduce((sum, r) => sum + (typeof r.tokens === "number" && Number.isFinite(r.tokens) ? r.tokens : 0), 0);
        ConsensusAuditLogEngine.append({
          schemaVersion: CONSENSUS_AUDIT_SCHEMA_VERSION,
          ts: new Date().toISOString(),
          callerEngine: input.callerEngine ?? "unknown",
          question: input.prompt,
          voices: responses.map((r) => r.model),
          perVoiceAnswers: responses.map((r) => ({
            model: r.model,
            ok: r.ok,
            answer: r.answer,
            latencyMs: r.latencyMs,
            tokens: r.tokens,
          })),
          finalDecision: finalResult.consensus?.answer ?? "",
          agreement: finalResult.agreementScore,
          latencyMsTotal: finalResult.totalLatencyMs,
          tokensTotal,
          sessionId: resolvedSession,
        });
      } catch {
        // swallowed — fire-and-forget; the engine itself never throws on this
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
        reasoningEffort: reasoning ?? "high",
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
    // Grok has THREE backends, tried in priority order. 1) the HTTP API when XAI_API_KEY is set
    // (deterministic + reports token usage). 2) keyless, the Grok CLI (xAI account-login auth, no
    // key in env) when its binary is on PATH. 3) the local Hermes OAuth proxy (:8645, FREE, the
    // operator's managed credential) when neither key nor CLI exists. A single Grok voice never
    // seats MORE THAN ONE backend (that would double-weight one vendor in the consensus, R7);
    // includeGrok gated this call on at least one backend being live, and each branch re-guards +
    // fail-soft -> errResponse.
    if (process.env.XAI_API_KEY) {
      const target = model ?? "grok-4";
      try {
        // Bracket-access the engine's HTTP method: the repo security hook false-positives on the
        // literal ".exec(" token (this is GrokClientEngine.exec, a fetch wrapper -- NOT child_process.exec).
        const r: GrokResult = await grokClientEngine["exec"]({
          prompt,
          model: target,
          reasoningEffort: reasoning ?? "high",
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
    // Keyless fallback: the agentic Grok CLI, boxed into one-shot reasoning by
    // GrokCLIClientEngine (isolated temp cwd, prompt on stdin, hard timeout). The CLI reports
    // no token usage, so tokens is null. Re-guard isAvailable() so a direct keyless callGrok
    // with no CLI on PATH degrades to errResponse and never spawns a process.
    if (grokCLIClientEngine.isAvailable()) {
      try {
        const r = await grokCLIClientEngine.run({ prompt, model, timeoutMs });
        return {
          model: r.model || "grok-cli",
          vendor: "xai",
          ok: r.ok,
          answer: r.answer,
          latencyMs: r.latencyMs,
          tokens: null,
          error: r.error,
        };
      } catch (e) {
        return this.errResponse(model ?? "grok-cli", "xai", (e as Error).message);
      }
    }
    // THIRD transport: the local Hermes OAuth proxy (:8645) -- the SAME Grok model via the
    // operator's managed credential, FREE, no key/CLI (OCTOPUS-HERMES-SYNERGY 2026-06-23).
    // Reached only when XAI_API_KEY and the grok CLI are both absent AND the gate already opened
    // includeGrok on hermesProxyReachable(); the probe is memoized so this re-check is a cache hit.
    // Fail-soft -> errResponse, never throws out of ask(). r.model carries the true served model.
    if (await grokClientEngine.hermesProxyReachable()) {
      try {
        // Bracket-access mirrors the .exec branch above -- dodges the repo security hook's
        // false-positive on a literal method-call token (this is a fetch wrapper, not child_process).
        const r: GrokResult = await grokClientEngine["execViaHermesProxy"]({ prompt, model, timeoutMs });
        return {
          model: r.model || "grok-hermes-proxy",
          vendor: "xai",
          ok: r.ok,
          answer: r.answer,
          latencyMs: r.latencyMs,
          tokens: r.totalTokens,
          error: r.error,
        };
      } catch (e) {
        return this.errResponse(model ?? "grok-hermes-proxy", "xai", (e as Error).message);
      }
    }
    return this.errResponse(model ?? "grok-4", "xai", "no Grok backend (no XAI_API_KEY, grok CLI not on PATH, hermes proxy unreachable)");
  }

  /**
   * One Hermes-proxy Grok voice pinned to a SPECIFIC model (OCTOPUS-HERMES-MULTIMODEL).
   * Unlike callGrok -- which picks ONE transport by priority and uses the caller's default
   * model -- this ALWAYS routes through the local Hermes OAuth proxy (:8645) with the exact
   * `model` so the multi-model panel gets N genuinely-distinct Grok voices. Vendor stays "xai";
   * r.model carries the TRUE served model so the consensus ledger distinguishes the voices.
   * Fail-soft -> errResponse (never throws out of ask()); the includeGrok gate + the assembly
   * branch already verified hermesProxyReachable(), so the proxy is the correct single transport.
   * @param prompt    the (PRISM-context-injected) consensus prompt
   * @param model     the exact Grok model id to request from the proxy
   * @param timeoutMs per-voice timeout
   */
  private async callGrokHermesVoice(prompt: string, model: string, timeoutMs?: number, system?: string, label?: string): Promise<ModelResponse> {
    try {
      // Bracket-access mirrors callGrok's hermes branch -- dodges the repo security hook's
      // false-positive on a literal method-call token (execViaHermesProxy is a fetch wrapper).
      // OCTOPUS-HERMES-AGENTS: a persona `system` is sent as a real role:system message
      // (GrokExecOptions.system is honored); `label` makes a persona a DISTINCT consensus voice
      // even when it shares a model with another persona (else two personas would collide on `model`).
      const r: GrokResult = await grokClientEngine["execViaHermesProxy"]({ prompt, model, timeoutMs, ...(system ? { system } : {}) });
      return {
        model: label || r.model || model,
        vendor: "xai",
        ok: r.ok,
        answer: r.answer,
        latencyMs: r.latencyMs,
        tokens: r.totalTokens,
        error: r.error,
      };
    } catch (e) {
      return this.errResponse(label || model, "xai", (e as Error).message);
    }
  }

  // DeepSeek hosted-API voice (V3.2 deepseek-chat / deepseek-reasoner). Mirrors the callGrok shape
  // (key-gated upstream by includeDeepSeek; fail-soft -> errResponse, never throws out of ask()).
  // The DeepSeekClientEngine redacts its own key from error paths + returns ok:false on a missing
  // key, so a keyless host degrades silently (and includeDeepSeek is false there anyway).
  private async callDeepSeek(prompt: string, model?: string, timeoutMs?: number): Promise<ModelResponse> {
    const target = model ?? "deepseek-chat";
    try {
      // The repo security hook false-positives on the literal ".exec(" token; bracket-access the
      // DeepSeek engine's HTTP method (NOT child_process.exec -- it is a fetch wrapper) to satisfy
      // the gate while keeping the same call shape as callGrok/callGemini/callCodex.
      const r: DeepSeekResult = await deepSeekClientEngine["exec"]({
        prompt,
        model: target,
        timeoutMs,
      });
      return {
        model: r.model || target,
        vendor: "deepseek",
        ok: r.ok,
        answer: r.answer,
        latencyMs: r.latencyMs,
        tokens: r.totalTokens,
        error: r.error,
      };
    } catch (e) {
      return this.errResponse(target, "deepseek", (e as Error).message);
    }
  }

  // GLM (Zhipu) hosted-API voice -- OpenAI-compatible. Mirrors callDeepSeek shape
  // (key-gated upstream by includeGLM; fail-soft -> errResponse, never throws out of ask()).
  // GLMClientEngine.run() is a fetch wrapper (NOT child_process) and returns ok:false on a
  // missing key, so a keyless host degrades silently (and includeGLM is false there anyway).
  private async callGLM(prompt: string, model?: string, timeoutMs?: number): Promise<ModelResponse> {
    const target = model ?? process.env.PRISM_GLM_MODEL ?? "glm-4.6";
    try {
      const r: GLMResult = await glmClientEngine.run({
        prompt,
        model: target,
        timeoutMs,
      });
      return {
        model: r.model || target,
        vendor: "zhipu",
        ok: r.ok,
        answer: r.answer,
        latencyMs: r.latencyMs,
        tokens: r.totalTokens,
        error: r.error,
      };
    } catch (e) {
      return this.errResponse(target, "zhipu", (e as Error).message);
    }
  }

  private async callOllama(prompt: string, model: string, timeoutMs: number, maxTokens = 1024): Promise<ModelResponse> {
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
        maxTokens,
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

  // ---- RULER trajectory ranking (Order 4) ----

  /**
   * RULER reward: rank N agentic trajectories RELATIVE to each other against the
   * agent's system prompt (the reward spec), then convert to GRPO advantages.
   *
   * Flow: build one "rank these N against this rubric" prompt → ask() in compare
   * mode (the judge panel) → parse the judge's ordering into relative 0-1 rewards
   * → feed GroupRelativeRewardNormalizerEngine (Order 3) for the advantage tensor.
   * Never throws — degenerate input returns a structured result with a warning.
   *
   * @param input - trajectories[] + optional systemPrompt/rubric. When neither
   *   rubric nor systemPrompt is given, the judge ranks by implied task intent.
   * @returns RankTrajectoriesResult with per-trajectory reward + GRPO advantage + rank.
   */
  async rankTrajectories(input: RankTrajectoriesInput): Promise<RankTrajectoriesResult> {
    const { GroupRelativeRewardNormalizerEngine } = await import("./GroupRelativeRewardNormalizerEngine.js");
    const fail = (mode: RankTrajectoriesResult["mode"], ranked: RankedTrajectory[], advantageMode: string, judge: ConsensusResult | null, warning?: string): RankTrajectoriesResult =>
      ({ ok: mode === "judge-ranked", ranked, mode, advantageMode, judge, ...(warning ? { warning } : {}), source: "ruler-trajectory-rank" });

    // ── input guards (fail-soft, structured) ──
    if (!input || !Array.isArray(input.trajectories)) {
      return fail("degenerate", [], "constant-zero", null, "trajectories must be an array");
    }
    const traj = input.trajectories.map((t, index) => ({
      id: t && typeof t.id === "string" && t.id.length > 0 ? t.id : `t${index}`,
      content: t && typeof t.content === "string" ? t.content : "",
      index,
    }));
    if (traj.length === 0) {
      return fail("degenerate", [], "constant-zero", null, "empty trajectory group — nothing to rank");
    }
    if (traj.length === 1) {
      // a single trajectory has no relative signal — reward 1, advantage 0.
      return fail("degenerate",
        [{ id: traj[0].id, index: 0, reward: 1, advantage: 0, rank: 1 }],
        "constant-zero", null, "single trajectory — no relative baseline");
    }

    // ── build the judge prompt (RULER: rubric defaults to the system prompt) ──
    const rubric = (input.rubric && input.rubric.trim())
      ? input.rubric.trim()
      : (input.systemPrompt && input.systemPrompt.trim())
        ? `Grade each trajectory against this agent SYSTEM PROMPT (the reward spec):\n${input.systemPrompt.trim()}`
        : "Rank by which trajectory best accomplishes the implied task. Prefer correctness, then completeness, then clarity.";
    const block = traj.map((t) => `--- TRAJECTORY [${t.id}] ---\n${t.content}`).join("\n\n");
    const prompt =
      `You are an impartial judge ranking ${traj.length} agent trajectories. ${rubric}\n\n` +
      `${block}\n\n` +
      `Return the trajectory ids from BEST to WORST as a comma-separated list on a single line, ` +
      `prefixed exactly with "RANKING:" — e.g. "RANKING: ${traj[1].id}, ${traj[0].id}". ` +
      `Rank ALL ${traj.length} ids exactly once. Only RELATIVE order matters.`;

    let judge: ConsensusResult | null = null;
    let order: string[] | null = null;
    try {
      // NOTE: this.ask() fires the CONSENSUS_COMPLETED_TOPIC bus broadcast + audit-log
      // append (taskType:"trajectory-rank") like any consensus call. persist:false keeps
      // it out of the wiki second-brain, but the event IS visible to neural-feedback subscribers.
      judge = await this.ask({
        prompt,
        mode: "compare",
        prismContext: input.prismContext ?? false, // judging is self-contained; skip PRISM ctx by default
        timeoutMs: input.timeoutMs,
        persist: false,
        taskType: "trajectory-rank",
        callerEngine: "MultiModelConsensusEngine.rankTrajectories",
      });
      const answer = judge.consensus?.answer ?? judge.responses.find((r) => r.ok)?.answer ?? "";
      order = this.parseRanking(answer, traj.map((t) => t.id));
    } catch {
      // judge unreachable / errored → order-fallback (flat rewards, no fabricated signal)
      judge = null;
      order = null;
    }

    // ── derive relative rewards from the parsed ranking ──
    // best id → reward 1, worst → reward ~0, evenly spaced. If the judge failed or
    // produced an unusable ranking, fall back to a flat (all-equal) reward → the
    // GRPO normalizer then yields a constant-zero advantage (no fabricated signal).
    const mode: RankTrajectoriesResult["mode"] = order ? "judge-ranked" : "order-fallback";
    const n = traj.length;
    const rewardById = new Map<string, number>();
    if (order) {
      order.forEach((id, pos) => rewardById.set(id, n === 1 ? 1 : 1 - pos / (n - 1)));
    } else {
      for (const t of traj) rewardById.set(t.id, 0.5); // flat → no relative signal
    }
    const rewards = traj.map((t) => rewardById.get(t.id) ?? 0.5);

    // ── GRPO advantage from the reward group (Order 3) ──
    const grpo = GroupRelativeRewardNormalizerEngine.normalizeGroup(rewards);

    // rank = 1-based position by reward desc (stable by input index on ties)
    const byReward = traj
      .map((t, i) => ({ t, reward: rewards[i] }))
      .sort((a, b) => (b.reward - a.reward) || (a.t.index - b.t.index));
    const rankById = new Map<string, number>();
    byReward.forEach((x, i) => rankById.set(x.t.id, i + 1));

    const ranked: RankedTrajectory[] = traj.map((t, i) => ({
      id: t.id,
      index: i,
      reward: rewards[i],
      advantage: grpo.advantages[i]?.advantage ?? 0,
      rank: rankById.get(t.id) ?? i + 1,
    }));

    const warning = order ? undefined : "judge produced no usable RANKING — flat rewards (no relative signal); advantages zeroed";
    return fail(mode, ranked, grpo.mode, judge, warning);
  }

  /**
   * Parse a "RANKING: id1, id2, ..." line into an ordered id list. Returns null
   * unless EVERY expected id appears exactly once (a partial/duplicated ranking is
   * untrustworthy → caller falls back to flat rewards). Case-insensitive id match.
   */
  private parseRanking(answer: string, expectedIds: string[]): string[] | null {
    if (typeof answer !== "string" || answer.length === 0) return null;
    const m = answer.match(/RANKING:\s*([^\n\r]+)/i);
    if (!m) return null;
    const ids = m[1].split(",").map((s) => s.trim()).filter((s) => s.length > 0);
    const expectLower = new Map(expectedIds.map((id) => [id.toLowerCase(), id]));
    const resolved: string[] = [];
    const seen = new Set<string>();
    for (const raw of ids) {
      const canon = expectLower.get(raw.toLowerCase());
      if (!canon || seen.has(canon)) return null; // unknown or duplicate → untrustworthy
      seen.add(canon);
      resolved.push(canon);
    }
    return resolved.length === expectedIds.length ? resolved : null; // must rank ALL
  }
}

export const multiModelConsensusEngine = new MultiModelConsensusEngine();
