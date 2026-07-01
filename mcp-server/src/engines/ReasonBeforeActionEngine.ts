/**
 * ReasonBeforeActionEngine -- the "reason before any action" control-plane core.
 *
 * PRISM's AI substrate (octopus consensus, Ollama-local panel, Claude) was, until
 * this engine, only ever invoked CALLER-EXPLICITLY. Nothing fired a multi-model
 * sanity check BEFORE a consequential action (a shell command, a file overwrite,
 * a git push). This engine closes that gap: given a proposed action it returns a
 * typed verdict (PROCEED | REVISE | BLOCK) by routing to the CHEAPEST sufficient
 * reasoner:
 *
 *   kill-switch raised -> deterministic BLOCK (the human interrupt; no model call)
 *   low-risk           -> deterministic PROCEED, ZERO model calls (read/search ops)
 *   medium-risk        -> a cheap 2-model LOCAL Ollama vote ($0, ~1-2s)
 *   high-risk          -> a diverse LOCAL Ollama panel vote ($0; still local-only)
 *
 * This is the ENGINE only (governance-neutral -- it computes a verdict, it does not
 * gate anything). The PreToolUse hook that actuates it across the fleet is a
 * SEPARATE, default-OFF, governance-gated artifact.
 *
 * It REUSES (does not replicate -- dedup verdict):
 *   - CorrigibilityGateEngine (the human kill switch) as the cheap pre-gate, but
 *     ONLY honors the explicit kill-switch, never the heartbeat dimension: a fresh
 *     process has no heartbeat so `evaluate()` would fail-CLOSED (permitted:false)
 *     and block every action -- which would violate the fail-OPEN invariant below.
 *   - MultiModelConsensusEngine.ask (the octopus voices), constrained to LOCAL
 *     Ollama voices only.
 *
 * Design invariants (a fleet-wide reasoner MUST obey all of these):
 *  - FAIL-OPEN: any fault in the reasoner (Ollama down, timeout, parse failure,
 *    empty panel) yields PROCEED with `ok:false`, NEVER a BLOCK. A safety check
 *    must not halt legitimate work because its OWN infrastructure hiccuped.
 *  - CORROBORATED-BLOCK (C5): a BLOCK requires positive evidence -- the panel
 *    actually voted BLOCK AND >=2 voices succeeded AND agreement >= the accept
 *    floor. A weak/uncorroborated block-lean softens to REVISE (surface to a
 *    human), never a hard BLOCK that could strand a slot.
 *  - NO-RECURSION: while consulting, the engine sets a process sentinel
 *    (PRISM_RBA_IN_FLIGHT) AND forces PRISM_LOCAL_LLM_VIA_MCP=0 so its own Ollama
 *    call goes direct HTTP (127.0.0.1:11434), never via an MCP tool call that
 *    would re-enter the PreToolUse gate.
 *  - $0 / LOCAL-ONLY: every cloud voice (Claude/Codex/Grok/Gemini/DeepSeek/GLM) is
 *    hard-set false as an engine-owned literal (never spread caller flags -- they
 *    default true in ConsensusInput). A non-Ollama voice observed at runtime trips
 *    a circuit breaker (log loud + self-disable to fail-open for the session).
 *  - NEVER THROWS: edge cases return a structured verdict, not an exception.
 */

import {
  multiModelConsensusEngine,
  type ConsensusInput,
  type ConsensusResult,
} from "./MultiModelConsensusEngine.js";
import { corrigibilityGateEngine } from "./CorrigibilityGateEngine.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RiskTier = "low" | "medium" | "high";
export type RBAVerdict = "PROCEED" | "REVISE" | "BLOCK";

/** Process-env sentinel the PreToolUse hook checks to break gate->model->gate recursion. */
export const REASON_GATE_INFLIGHT_ENV = "PRISM_RBA_IN_FLIGHT";
/** Forced to "0" during the consult so the gate's own Ollama call is direct HTTP, not via MCP. */
export const LOCAL_LLM_VIA_MCP_ENV = "PRISM_LOCAL_LLM_VIA_MCP";

/** Agreement (0..1) below which a non-BLOCK panel is treated as "disagreed" -> REVISE. */
export const REVIEW_AGREEMENT_FLOOR = 0.4;
/** A BLOCK is honored only at/above this agreement (the consensus ACCEPT threshold). */
export const BLOCK_CONFIRM_FLOOR = 0.7;
/** A BLOCK is honored only with at least this many succeeding voices (corroboration). */
export const BLOCK_MIN_VOICES = 2;
/** Default per-consult timeout for the cheap medium-risk Ollama vote (ms). */
export const MEDIUM_RISK_TIMEOUT_MS = 8_000;
/** Default per-consult timeout for the high-risk diverse-local-panel vote (ms). */
export const HIGH_RISK_TIMEOUT_MS = 12_000;

/** The vote options handed to the consensus panel. */
export const VOTE_OPTIONS: readonly string[] = ["PROCEED", "REVISE", "BLOCK"];

/**
 * Output-token cap for the one-word vote. A verdict is PROCEED|REVISE|BLOCK (~2 tokens),
 * so a tiny cap keeps each vote FAST -- without it a model can spend seconds emitting up
 * to 1024 tokens of prose/reasoning before the answer (verified: uncapped warm votes ran
 * ~6s; the serialized 3-voice high-risk panel then blew its 12s budget -> fail-open).
 */
export const RBA_VOTE_MAX_TOKENS = 32;

// ---------------------------------------------------------------------------
// Pinned FAST local models (latency-bounded vote)
// ---------------------------------------------------------------------------
//
// The shared MultiModelConsensusEngine defaults its local panel to HEAVY models
// (gpt-oss:120b 65GB synthesis + qwen2.5-coder:32b floor). Those are correct for
// a deep, latency-tolerant consensus -- but FATAL for a pre-action gate: a 65GB
// cold-load hangs tens of seconds, and even warm a 32B votes in ~9s, so under the
// PreToolUse hook's sub-second race cap the gate would fail-open on EVERY call --
// a silent no-op that never actually reasons (verified live 2026-06-28: 0/4
// medium/high scenarios reached the panel; all fail-opened). A pre-action vote is
// a ONE-WORD classification; a small warm model nails it FAST (live: qwen2.5-coder:7b
// /qwen3-vl:8b warm vote ~0.5-2s, and `rm -rf` correctly -> BLOCK/REVISE). So the
// RBA engine PINS small, fast, distinct-family LOCAL models (still $0, still
// Ollama-only). These VL tags are FAST classifiers on this Blackwell box but are
// host-specific: on a host MISSING them the shared engine substitutes a NON-vision
// text model (its picker excludes VLMs) which may be slow -> the gate fail-opens
// (SAFE, but a silent no-op). So on other hosts SET `PRISM_RBA_OLLAMA_MODEL[_2]` to
// the fast models that host actually has. (Pinned VLMs are deliberately seated as the
// vote here -- the shared picker would reject them as "weak text reasoners", but for a
// one-word PROCEED|REVISE|BLOCK classification they are live-verified correct + fast.)

// Two PROVEN fast local voices (live-measured on the Blackwell box, 2026-06-28):
// qwen3-vl:8b-instruct ~0.6-0.9s, qwen2.5vl:7b ~0.6s, both correct (rm -rf -> REVISE).
// NOT qwen2.5-coder:7b -- it reproducibly HANGS to the timeout here. Because the shared
// engine SERIALIZES Ollama voices on the single GPU, both tiers use a 2-voice corroborated
// vote (a 3rd voice just adds its full latency in series and blows the budget); the
// CORROBORATED-BLOCK invariant needs exactly >=2 voices, which this satisfies.

/** Primary fast LOCAL vote model. Override: PRISM_RBA_OLLAMA_MODEL. */
export const RBA_PRIMARY_OLLAMA_MODEL_DEFAULT = "qwen3-vl:8b-instruct";
/** Secondary (distinct) fast LOCAL vote model -- 2-voice corroboration. Override: PRISM_RBA_OLLAMA_MODEL_2. */
export const RBA_SECONDARY_OLLAMA_MODEL_DEFAULT = "qwen2.5vl:7b";

export const RBA_OLLAMA_MODEL_ENV = "PRISM_RBA_OLLAMA_MODEL";
export const RBA_OLLAMA_MODEL_2_ENV = "PRISM_RBA_OLLAMA_MODEL_2";

export interface RBAPinnedModels {
  primary: string;
  secondary: string;
}

/**
 * Resolve the pinned fast LOCAL vote models, honoring env overrides.
 * Pure (reads env, no I/O) -- resolved per-call so an env override applies at runtime.
 *
 * @param env process env (injectable for tests)
 * @returns the primary + secondary fast vote model ids
 */
export function rbaPinnedModels(env: NodeJS.ProcessEnv = process.env): RBAPinnedModels {
  const primary = (env[RBA_OLLAMA_MODEL_ENV] || RBA_PRIMARY_OLLAMA_MODEL_DEFAULT).trim();
  const secondary = (env[RBA_OLLAMA_MODEL_2_ENV] || RBA_SECONDARY_OLLAMA_MODEL_DEFAULT).trim();
  return { primary, secondary };
}

export interface RBAPlanInput {
  /** Free-text description of the action's intent. Required. */
  intent: string;
  /** The tool being invoked, e.g. "Bash", "Write", "Edit". */
  tool_name?: string;
  /** The tool's arguments (command / file_path / content / ...). Scanned by the classifier. */
  tool_input?: Record<string, unknown>;
  /** Caller HINT. The engine may PROMOTE the tier, never DEMOTE it (ratchet). */
  risk_level?: RiskTier;
}

export interface RiskAssessment {
  tier: RiskTier;
  /** The specific signals that drove the tier (for the rationale + audit). */
  reasons: string[];
}

export interface RBAPlanResult {
  /** false ONLY on an internal/infra fault -> caller MUST treat as PROCEED (fail-open). */
  ok: boolean;
  verdict: RBAVerdict;
  /** 0..1 inter-model agreement; 1.0 on the deterministic + fail-open paths. */
  agreementScore: number;
  rationale: string;
  /** Model names that voted (empty for the deterministic paths). */
  voices: string[];
  path: "session-gate" | "deterministic" | "fast-path" | "full-octopus" | "fail-open";
  /** Post-ratchet tier actually used. */
  riskTier: RiskTier;
  totalLatencyMs: number;
  /** The raw consensus -- included only on REVISE/BLOCK (token discipline). */
  raw?: ConsensusResult;
}

/** Injectable consensus fn so tests never spawn real models. Defaults to the live octopus. */
export type ConsensusFn = (input: ConsensusInput) => Promise<ConsensusResult>;

export interface PlanOptions {
  /** Override the consensus backend (tests). Defaults to multiModelConsensusEngine.ask. */
  consensusFn?: ConsensusFn;
  /** Override the medium-risk timeout. */
  mediumTimeoutMs?: number;
  /** Override the high-risk timeout. */
  highTimeoutMs?: number;
}

// ---------------------------------------------------------------------------
// Pure risk classifier (no I/O -- independently unit-testable)
// ---------------------------------------------------------------------------

/** HIGH-risk: irreversible / external-facing / credential / real-machine. Case-insensitive. */
const HIGH_RISK_PATTERNS: ReadonlyArray<{ re: RegExp; why: string }> = [
  { re: /\brm\s+-[a-z]*r[a-z]*f|\brm\s+-[a-z]*f[a-z]*r/i, why: "recursive force delete (rm -rf)" },
  { re: /\bgit\s+push\b.*(--force|-f\b)|--force-with-lease/i, why: "git force-push" },
  { re: /\bgit\s+reset\s+--hard\b/i, why: "git reset --hard (discards work)" },
  { re: /\bgit\s+clean\s+-[a-z]*f/i, why: "git clean -f (deletes untracked)" },
  { re: /--no-verify\b/i, why: "bypasses git hooks (--no-verify)" },
  { re: /\bDROP\s+(TABLE|DATABASE|SCHEMA)\b|\bTRUNCATE\b|\bDELETE\s+FROM\b/i, why: "destructive SQL" },
  { re: /\b(npm|pnpm|yarn)\s+publish\b|\bgh\s+release\s+create\b/i, why: "package/release publish" },
  { re: /\b(deploy|go-live|production)\b/i, why: "deployment / go-live" },
  { re: /\bgit\b.*\bmerge\b.*\b(main|master)\b/i, why: "merge to main/master" },
  { re: /\b(api[_-]?key|secret|token|password|credential)s?\b\s*[=:]/i, why: "credential assignment" },
  { re: /\bcurl\b.*\b-X\s*(POST|PUT|DELETE)\b|\bfetch\(.*method:\s*['"](POST|PUT|DELETE)/i, why: "outbound mutating HTTP" },
  { re: /\bg-?code\b|\bm30\b|post.*\bmachine\b/i, why: "G-code to a real machine" },
  { re: /\b(shutdown|reboot|diskpart|mkfs)\b|\bformat\s+[a-z]:/i, why: "host-level destructive op" },
  { re: /\bchmod\b|\bchown\b/i, why: "permission change" },
];

/** MEDIUM-risk tool names: mutating editors. */
const MEDIUM_RISK_TOOLS = new Set(["write", "edit", "multiedit", "notebookedit", "applypatch"]);
/** MEDIUM-risk payload signals: source mutation / commit / subprocess spawn. */
const MEDIUM_RISK_PATTERNS: ReadonlyArray<{ re: RegExp; why: string }> = [
  { re: /\bgit\s+(commit|add|stash|rebase|cherry-pick|revert)\b/i, why: "git history mutation" },
  { re: /\b(npm|pnpm|yarn)\s+(install|i|add|remove|uninstall)\b/i, why: "dependency mutation" },
  { re: /\bmv\b|\bcp\b|\bmkdir\b|\bset-content\b|\bout-file\b/i, why: "filesystem write" },
  { re: /\b(spawn|exec|execsync|child_process)\b/i, why: "subprocess spawn" },
];

/** LOW-risk tool names: read-only / search / inspection. */
const LOW_RISK_TOOLS = new Set([
  "read", "grep", "glob", "ls", "find", "cat", "head", "tail",
  "taskget", "tasklist", "webfetch", "websearch",
]);

const TIER_RANK: Record<RiskTier, number> = { low: 0, medium: 1, high: 2 };
const RANK_TIER: RiskTier[] = ["low", "medium", "high"];

/** The stronger of two tiers (used for the promote-only caller-hint ratchet). */
function tierMax(a: RiskTier, b: RiskTier): RiskTier {
  return RANK_TIER[Math.max(TIER_RANK[a], TIER_RANK[b])];
}

/** Build the scan haystack from the intent + the tool input fields. */
function haystackOf(input: RBAPlanInput): string {
  const ti = input?.tool_input ?? {};
  const fields = [
    input?.intent,
    typeof ti.command === "string" ? ti.command : undefined,
    typeof ti.file_path === "string" ? ti.file_path : undefined,
    typeof ti.content === "string" ? ti.content : undefined,
    typeof ti.new_string === "string" ? ti.new_string : undefined,
  ].filter((s): s is string => typeof s === "string" && s.length > 0);
  // Catch-all: serialize the remaining input so an unanticipated field is still scanned.
  let serialized = "";
  try {
    serialized = JSON.stringify(ti).slice(0, 20_000);
  } catch {
    serialized = "";
  }
  return [...fields, serialized].join("\n");
}

/**
 * Classify a proposed action's risk tier from its tool name + input.
 * Pure (no I/O). Conservative: a destructive payload is HIGH regardless of tool;
 * an unknown tool with no destructive signal defaults to MEDIUM (vet, don't trust).
 *
 * @param input the proposed action
 * @returns the risk tier + the signals that drove it
 */
export function classifyActionRisk(input: RBAPlanInput): RiskAssessment {
  const reasons: string[] = [];
  const tool = (input?.tool_name ?? "").trim().toLowerCase();
  const haystack = haystackOf(input ?? ({ intent: "" } as RBAPlanInput));

  // 1. HIGH-risk payload signals dominate regardless of tool name.
  for (const { re, why } of HIGH_RISK_PATTERNS) {
    if (re.test(haystack)) reasons.push(why);
  }
  if (reasons.length > 0) return { tier: "high", reasons };

  // 2. MEDIUM by tool name (mutating editors) or payload signal.
  if (MEDIUM_RISK_TOOLS.has(tool)) reasons.push(`mutating tool: ${tool}`);
  for (const { re, why } of MEDIUM_RISK_PATTERNS) {
    if (re.test(haystack)) reasons.push(why);
  }
  if (reasons.length > 0) return { tier: "medium", reasons };

  // 3. LOW by explicit read-only tool name.
  if (LOW_RISK_TOOLS.has(tool)) return { tier: "low", reasons: [`read-only tool: ${tool}`] };

  // 4. Unknown tool, no destructive signal -> MEDIUM (vet, don't trust an unknown).
  return { tier: "medium", reasons: [`unknown tool '${tool || "(empty)"}' -- defaulting to MEDIUM`] };
}

/** Parse a free-text consensus answer into a verdict; null when no token is present. */
export function parseVote(answer: string | undefined | null): RBAVerdict | null {
  if (typeof answer !== "string") return null;
  const a = answer.toUpperCase();
  // BLOCK and REVISE are checked before PROCEED so "do not PROCEED, BLOCK it"
  // resolves to the stronger directive rather than the embedded "PROCEED".
  if (/\bBLOCK\b|\bSTOP\b|\bABORT\b|\bDO ?NOT PROCEED\b/.test(a)) return "BLOCK";
  if (/\bREVISE\b|\bREVIEW\b|\bCAUTION\b|\bUNSURE\b/.test(a)) return "REVISE";
  if (/\bPROCEED\b|\bALLOW\b|\bSAFE\b|\bOK\b|\bYES\b/.test(a)) return "PROCEED";
  return null;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

/** Circuit breaker: once a paid cloud voice is observed, the engine self-disables for the session. */
let cloudVoiceObserved = false;

export class ReasonBeforeActionEngine {
  /** True iff a consult is in flight (the PreToolUse hook reads this to skip re-gating). */
  static isInflight(): boolean {
    return process.env[REASON_GATE_INFLIGHT_ENV] === "1";
  }

  /** Test-only reset of the cloud-voice circuit breaker. */
  static __resetCircuitBreaker(): void {
    cloudVoiceObserved = false;
  }

  /**
   * Reason about a proposed action and return a PROCEED | REVISE | BLOCK verdict.
   * Never throws; fails open to PROCEED (ok:false) on any reasoner fault.
   *
   * @param input the proposed action (intent + tool_name + tool_input + risk hint)
   * @param opts  optional injection (consensusFn, timeouts) -- tests inject a fake panel
   * @returns a typed verdict; `ok:false` flags a default-PROCEED forced by a fault
   */
  async plan(input: RBAPlanInput, opts: PlanOptions = {}): Promise<RBAPlanResult> {
    const t0 = Date.now();
    const safe = input ?? ({ intent: "" } as RBAPlanInput);

    // 0. Cheap deterministic pre-gate: the human kill switch ONLY (never the
    //    heartbeat dimension, which fails-closed in a fresh process).
    try {
      if (corrigibilityGateEngine.snapshot().killSwitchRaised) {
        return this.deterministic("BLOCK", "high", "session-gate", "kill switch raised -- human interrupt active", t0);
      }
    } catch {
      // a fault reading the gate must not block -- fall through (fail-open posture).
    }

    // 1. Risk tier: classifier output, ratcheted UP by the caller hint (never down).
    const risk = classifyActionRisk(safe);
    const tier = safe.risk_level ? tierMax(risk.tier, safe.risk_level) : risk.tier;

    // 2. Low-risk: deterministic PROCEED, zero model calls (the common, hot path).
    if (tier === "low") {
      return this.deterministic("PROCEED", "low", "deterministic", `low-risk (${risk.reasons.join("; ")})`, t0);
    }

    // 3. Cloud-voice circuit breaker tripped earlier this session -> fail-open.
    if (cloudVoiceObserved) {
      return this.failOpen(tier, t0, "cloud-voice circuit breaker tripped earlier -- failing OPEN");
    }

    const consensusFn: ConsensusFn = opts.consensusFn ?? ((i) => multiModelConsensusEngine.ask(i));
    const isHigh = tier === "high";
    const timeoutMs = isHigh
      ? (opts.highTimeoutMs ?? HIGH_RISK_TIMEOUT_MS)
      : (opts.mediumTimeoutMs ?? MEDIUM_RISK_TIMEOUT_MS);

    // PIN fast small LOCAL models so the vote is feasible under the latency cap --
    // NEVER inherit the consensus engine's heavy gpt-oss:120b/qwen-32b defaults.
    const pinned = rbaPinnedModels();

    const consensusInput: ConsensusInput = {
      prompt: this.buildPrompt(safe, risk, tier),
      mode: "vote",
      voteOptions: VOTE_OPTIONS,
      // ALL cloud voices hard-OFF (engine-owned literals, never spread caller flags):
      // recursion safety (no `claude -p` subprocess) + $0 (no paid frontier voice).
      includeClaude: false,
      includeCodex: false,
      includeGrok: false,
      includeGemini: false,
      includeDeepSeek: false,
      includeGLM: false,
      // BOTH tiers: a 2-voice corroborated vote. Voices serialize on the single GPU,
      // so a 3rd voice only adds latency; >=2 already satisfies CORROBORATED-BLOCK.
      // High-risk differs by a longer timeout (more headroom), not more voices.
      dualOllama: true,
      // Pinned FAST models -- an explicit ollamaModel also SKIPS the capability
      // probe latency (consensus only probes when the caller did not pin a model).
      ollamaModel: pinned.primary,
      secondaryOllamaModel: pinned.secondary,
      // One-word vote -> tiny output cap so a model can't spend seconds rambling.
      ollamaMaxTokens: RBA_VOTE_MAX_TOKENS,
      prismContext: false,
      persist: false, // ephemeral pre-action probe -- do not pollute the consensus wiki
      timeoutMs, // defense-in-depth; the PreToolUse hook's own race is the real cap
      taskType: "reason_before_action",
      callerEngine: "ReasonBeforeActionEngine",
    };

    // NO-RECURSION: set the in-flight sentinel AND force direct-HTTP Ollama so the
    // gate's own model call cannot re-enter the PreToolUse gate via an MCP tool call.
    const hadInflight = process.env[REASON_GATE_INFLIGHT_ENV] === "1";
    const priorViaMcp = process.env[LOCAL_LLM_VIA_MCP_ENV];
    process.env[REASON_GATE_INFLIGHT_ENV] = "1";
    process.env[LOCAL_LLM_VIA_MCP_ENV] = "0";
    let result: ConsensusResult | null = null;
    let faultReason = "";
    try {
      result = await consensusFn(consensusInput);
    } catch (err) {
      faultReason = err instanceof Error ? err.message : String(err);
    } finally {
      if (!hadInflight) delete process.env[REASON_GATE_INFLIGHT_ENV];
      if (priorViaMcp === undefined) delete process.env[LOCAL_LLM_VIA_MCP_ENV];
      else process.env[LOCAL_LLM_VIA_MCP_ENV] = priorViaMcp;
    }

    // C7 circuit breaker: a non-Ollama voice must never appear (all cloud flags are
    // false). If one does, trip the breaker, log loud, and fail-open this call.
    if (result && Array.isArray(result.responses)) {
      // Trip on ANY non-Ollama vendor (ok or not): the local-only contract means a
      // cloud voice must never even be ATTEMPTED, so its mere presence is the defect.
      const leaked = result.responses.find((r) => r && typeof r.vendor === "string" && r.vendor !== "ollama");
      if (leaked) {
        cloudVoiceObserved = true;
        // Loud-by-design: a paid cloud voice in a local-only panel is a real defect
        // (never silentCatch). console.error is the engine's only side channel here.
        console.error(`[ReasonBeforeActionEngine] CLOUD VOICE LEAK: vendor='${leaked.vendor}' model='${leaked.model}' -- self-disabling (fail-open) for the session.`);
        return this.failOpen(tier, t0, `cloud voice '${leaked.vendor}' leaked into the local-only panel -- failing OPEN + self-disabled`);
      }
    }

    // FAIL-OPEN: reasoner could not run or produced nothing usable -> PROCEED.
    if (!result || result.ok !== true || result.successCount === 0 || result.consensus === null) {
      return this.failOpen(tier, t0, faultReason
        ? `consultation failed (${faultReason}) -- failing OPEN (gate must not block on its own fault)`
        : "consensus produced no usable verdict -- failing OPEN");
    }

    const parsed = parseVote(result.consensus.answer);
    if (parsed === null) {
      // Could not read a decision out of the panel -> do not trust -> fail-open.
      return this.failOpen(tier, t0, `panel answer '${result.consensus.answer}' did not parse to a decision -- failing OPEN`);
    }

    let verdict: RBAVerdict = parsed;
    const reasonParts = [`${tier}-risk (${risk.reasons.join("; ")})`, `agreement ${result.agreementScore.toFixed(2)}`, `${result.successCount} voices`];

    // C5 -- CORROBORATED-BLOCK: a hard BLOCK requires real, agreed evidence. A weak
    // or thinly-voiced BLOCK softens to REVISE (surface to a human, never strand a slot).
    if (verdict === "BLOCK" && (result.successCount < BLOCK_MIN_VOICES || result.agreementScore < BLOCK_CONFIRM_FLOOR)) {
      verdict = "REVISE";
      reasonParts.push("BLOCK softened to REVISE (insufficient corroboration)");
    } else if (verdict === "PROCEED" && result.agreementScore < REVIEW_AGREEMENT_FLOOR) {
      // Panel disagreed on a PROCEED -> surface to a human (a REVISE is already surfaced).
      verdict = "REVISE";
      reasonParts.push("downgraded to REVISE (panel disagreed)");
    }

    return {
      ok: true,
      verdict,
      agreementScore: result.agreementScore,
      rationale: reasonParts.join("; "),
      voices: result.consensus.voters,
      path: isHigh ? "full-octopus" : "fast-path",
      riskTier: tier,
      totalLatencyMs: Date.now() - t0,
      // Token discipline: attach the raw consensus only when the caller must act on it.
      raw: verdict === "PROCEED" ? undefined : result,
    };
  }

  /** Deterministic verdict (no model call) -- corrigibility block or low-risk pass. */
  private deterministic(
    verdict: RBAVerdict,
    riskTier: RiskTier,
    path: RBAPlanResult["path"],
    rationale: string,
    t0: number,
  ): RBAPlanResult {
    return {
      ok: true,
      verdict,
      agreementScore: 1,
      rationale,
      voices: [],
      path,
      riskTier,
      totalLatencyMs: Date.now() - t0,
    };
  }

  /** Fail-open verdict: PROCEED with ok:false (the caller treats it as proceed-but-uncertain). */
  private failOpen(tier: RiskTier, t0: number, rationale: string): RBAPlanResult {
    return {
      ok: false,
      verdict: "PROCEED",
      agreementScore: 1,
      rationale,
      voices: [],
      path: "fail-open",
      riskTier: tier,
      totalLatencyMs: Date.now() - t0,
    };
  }

  /** Build the consensus prompt for a proposed action. */
  private buildPrompt(input: RBAPlanInput, risk: RiskAssessment, tier: RiskTier): string {
    const ti = input.tool_input ?? {};
    let snapshot = "";
    try {
      snapshot = JSON.stringify(ti).slice(0, 2000);
    } catch {
      snapshot = "(unserializable)";
    }
    return [
      "You are a pre-action safety reviewer for an autonomous coding/manufacturing agent.",
      "Decide whether the agent should take the following action. Reply with EXACTLY one word: PROCEED, REVISE, or BLOCK.",
      "PROCEED = clearly safe and correct. REVISE = unsafe/ambiguous as written, needs a human or a safer form. BLOCK = destructive/irreversible/out-of-scope, must not run.",
      `Risk tier (heuristic): ${tier} -- ${risk.reasons.join("; ")}`,
      `Intent: ${input.intent}`,
      `Tool: ${input.tool_name ?? "(unspecified)"}`,
      `Input: ${snapshot}`,
    ].join("\n");
  }
}

/** Singleton -- mirrors the engine-export convention (cf. multiModelConsensusEngine). */
export const reasonBeforeActionEngine = new ReasonBeforeActionEngine();
