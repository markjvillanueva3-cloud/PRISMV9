/**
 * PRISMConsensusGateEngine — N-of-5 quorum gate over independent LLM providers
 *
 * Runs ≤5 providers in parallel with a per-provider 45 s deadline, tallies
 * verdicts, and emits a structured quorum decision. The gate is the safety
 * substrate for shop-floor edits where a single-provider review cannot reach
 * five-sigma confidence (Ω≥0.95, S(x)≥0.98). Independent error sampling across
 * different model families is the only mechanism that lifts a code review past
 * "this provider's blind spots".
 *
 * Hard rules (enforced in code, asserted by the test suite):
 *   - At least one CLOUD provider (Claude OR Codex) must be in the active set.
 *     A 4-ollama-only call is REFUSED. Local-only quorum has correlated error
 *     modes and cannot stand in for cloud diversity.
 *   - Each provider gets exactly one 45 s window. A timed-out provider is
 *     marked invalid and counts toward partial quorum.
 *   - At least 3 valid verdicts are required. Fewer than 3 valid → FAIL with
 *     `reason: "insufficient-quorum"`.
 *   - Partial quorum (3 or 4 valid out of 5) downgrades a winning PASS to
 *     CONDITIONAL with `partialQuorum: true`. A winning FAIL stays FAIL.
 *   - Unanimous-wrong detection: dissent.flags from EVERY valid verdict are
 *     surfaced on the result, so a flagged risk in any rationale escapes
 *     even a unanimous PASS. Callers MUST inspect `flagsSurfaced` and
 *     downgrade further if any flag is shop-floor-relevant.
 *   - Cache by SHA-256(input || sorted-provider-ids). Re-running the gate
 *     with no input change AND no provider-set change returns the cached
 *     decision. Prevents quorum-gaming retries until the input or panel
 *     actually moves. LRU-bounded; no concurrent duplicate work.
 *
 * Codex chunking is provider-level — see `createCodexChunkingProvider()` —
 * so the engine never has to touch token windows itself. Per-chunk verdicts
 * merge by majority within the provider's vote.
 *
 * P4-U01, INTEL-OLLAMA-OBSIDIAN-MS1.
 */

import { createHash } from "node:crypto";

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export type ProviderKind = "cloud" | "ollama";
export type Decision = "PASS" | "CONDITIONAL" | "FAIL";
export type QuorumDecision = Decision | "REFUSED";

export interface ProviderVerdict {
  decision: Decision;
  rationale: string;
  /** Free-form risk flags from the rationale. Surfaced even on unanimous PASS. */
  flags?: string[];
  /** Provider self-reported confidence in [0, 1]. */
  confidence?: number;
}

export interface QuorumProvider {
  id: string;
  kind: ProviderKind;
  /**
   * Invoke the provider on the input. MUST honour `signal` — the engine
   * fires AbortController.abort() at the per-provider timeout. Providers
   * that ignore the signal will be marked invalid and their result discarded
   * if it eventually settles, but the engine cannot stop their compute.
   */
  invoke(input: string, signal: AbortSignal): Promise<ProviderVerdict>;
}

export interface ProviderCallResult {
  providerId: string;
  kind: ProviderKind;
  valid: boolean;
  verdict?: ProviderVerdict;
  error?: string;
  durationMs: number;
}

export interface QuorumResult {
  decision: QuorumDecision;
  reason: string;
  votes: { PASS: number; CONDITIONAL: number; FAIL: number };
  validProviders: number;
  totalProviders: number;
  partialQuorum: boolean;
  cloudPresent: boolean;
  results: ProviderCallResult[];
  /** Verdicts whose decision differs from the winning majority. */
  dissent: ProviderVerdict[];
  /** Union of `flags[]` across every valid verdict. */
  flagsSurfaced: string[];
  cacheKey: string;
  cacheHit: boolean;
  durationMs: number;
}

export interface ConsensusGateOptions {
  /** Per-provider hard deadline in ms. Default 45_000. */
  perProviderTimeoutMs?: number;
  /** Cache capacity (LRU). Default 256. */
  cacheCapacity?: number;
}

// ─────────────────────────────────────────────────────────────────
// Codex chunking
// ─────────────────────────────────────────────────────────────────

/**
 * OpenAI-style token estimator: ~4 chars per token for English text. The real
 * BPE tokenizer is not in the dependency tree, so this heuristic is the
 * canonical surrogate used elsewhere in the codebase.
 */
export function estimateTokens(s: string): number {
  if (!s) return 0;
  return Math.ceil(s.length / 4);
}

const DEFAULT_CODEX_CHUNK_LIMIT_TOKENS = 16_000;
const DEFAULT_CODEX_CHUNK_TRIGGER_TOKENS = 18_000;

/**
 * Split `input` so each chunk is ≤ `maxTokens` (default 16K). Splits on
 * paragraph boundaries first, then sentences, then hard char-windows. Inputs
 * below `triggerTokens` (default 18K) return as a single chunk untouched.
 */
export function chunkForCodex(
  input: string,
  opts: { maxTokens?: number; triggerTokens?: number } = {}
): string[] {
  const maxTokens = opts.maxTokens ?? DEFAULT_CODEX_CHUNK_LIMIT_TOKENS;
  const triggerTokens = opts.triggerTokens ?? DEFAULT_CODEX_CHUNK_TRIGGER_TOKENS;
  if (estimateTokens(input) <= triggerTokens) return [input];

  const maxChars = maxTokens * 4;
  const out: string[] = [];

  const paragraphs = input.split(/\n{2,}/);
  let buf = "";
  for (const para of paragraphs) {
    if (estimateTokens(para) > maxTokens) {
      // Paragraph alone overflows — fall back to sentence split.
      if (buf) {
        out.push(buf);
        buf = "";
      }
      const sentences = para.split(/(?<=[.!?])\s+/);
      let sBuf = "";
      for (const sent of sentences) {
        if (estimateTokens(sent) > maxTokens) {
          // Sentence alone still overflows — hard slice on chars.
          if (sBuf) {
            out.push(sBuf);
            sBuf = "";
          }
          for (let i = 0; i < sent.length; i += maxChars) {
            out.push(sent.slice(i, i + maxChars));
          }
        } else if (estimateTokens(sBuf + " " + sent) > maxTokens) {
          out.push(sBuf);
          sBuf = sent;
        } else {
          sBuf = sBuf ? `${sBuf} ${sent}` : sent;
        }
      }
      if (sBuf) out.push(sBuf);
      continue;
    }
    if (estimateTokens(buf + "\n\n" + para) > maxTokens) {
      out.push(buf);
      buf = para;
    } else {
      buf = buf ? `${buf}\n\n${para}` : para;
    }
  }
  if (buf) out.push(buf);
  return out;
}

/**
 * Wrap a per-chunk Codex `invoke` function so the resulting `QuorumProvider`
 * automatically chunks oversized inputs and merges per-chunk verdicts via
 * majority within its own vote. Pass-through for inputs below the trigger.
 */
export function createCodexChunkingProvider(opts: {
  id?: string;
  invokeChunk: (chunk: string, signal: AbortSignal) => Promise<ProviderVerdict>;
  maxTokens?: number;
  triggerTokens?: number;
}): QuorumProvider {
  const id = opts.id ?? "codex";
  return {
    id,
    kind: "cloud",
    async invoke(input: string, signal: AbortSignal): Promise<ProviderVerdict> {
      const chunks = chunkForCodex(input, {
        maxTokens: opts.maxTokens,
        triggerTokens: opts.triggerTokens,
      });
      if (chunks.length === 1) return opts.invokeChunk(chunks[0], signal);

      const verdicts: ProviderVerdict[] = [];
      for (const chunk of chunks) {
        if (signal.aborted) {
          throw new Error("aborted before all chunks reviewed");
        }
        verdicts.push(await opts.invokeChunk(chunk, signal));
      }
      // Majority within the provider's own vote — ties degrade to CONDITIONAL.
      const counts = { PASS: 0, CONDITIONAL: 0, FAIL: 0 };
      for (const v of verdicts) counts[v.decision] += 1;
      const winner = pickWinner(counts) ?? "CONDITIONAL";
      const flags = uniqueStrings(verdicts.flatMap((v) => v.flags ?? []));
      const rationale =
        `chunked-review (${chunks.length} chunks): ` +
        verdicts.map((v, i) => `#${i + 1}=${v.decision}`).join(", ");
      const confidence =
        verdicts.reduce((s, v) => s + (v.confidence ?? 0.5), 0) / verdicts.length;
      return { decision: winner, rationale, flags, confidence };
    },
  };
}

// ─────────────────────────────────────────────────────────────────
// Engine
// ─────────────────────────────────────────────────────────────────

const DEFAULT_PER_PROVIDER_TIMEOUT_MS = 45_000;
const DEFAULT_CACHE_CAPACITY = 256;
const MIN_VALID_QUORUM = 3;
const FULL_QUORUM_SIZE = 5;
/**
 * Supermajority threshold for a non-FAIL decision to stand without downgrade.
 * The P4 phase description specifies "75% N-of-5 quorum" — 4/5 = 80% clears it,
 * 3/5 = 60% does not. Bare-majority PASS (3-of-5) downgrades to CONDITIONAL;
 * bare-majority FAIL stays FAIL because failure is the safer default.
 */
const SUPERMAJORITY_RATIO = 0.75;

export class PRISMConsensusGateEngine {
  private readonly perProviderTimeoutMs: number;
  private readonly cacheCapacity: number;
  private readonly cache = new Map<string, QuorumResult>();
  private readonly inflight = new Map<string, Promise<QuorumResult>>();

  constructor(opts: ConsensusGateOptions = {}) {
    this.perProviderTimeoutMs =
      opts.perProviderTimeoutMs ?? DEFAULT_PER_PROVIDER_TIMEOUT_MS;
    this.cacheCapacity = opts.cacheCapacity ?? DEFAULT_CACHE_CAPACITY;
  }

  /**
   * Run a quorum vote over `providers`. Cached results are returned with
   * `cacheHit: true`. Throws synchronously on argument errors (empty provider
   * list, duplicate provider ids).
   */
  async vote(input: string, providers: QuorumProvider[]): Promise<QuorumResult> {
    if (typeof input !== "string") throw new Error("input must be a string");
    if (!Array.isArray(providers) || providers.length === 0) {
      throw new Error("providers must be a non-empty array");
    }
    const idSet = new Set<string>();
    for (const p of providers) {
      if (!p || typeof p.id !== "string") throw new Error("provider missing id");
      if (idSet.has(p.id)) throw new Error(`duplicate provider id: ${p.id}`);
      idSet.add(p.id);
    }
    if (providers.length > FULL_QUORUM_SIZE) {
      throw new Error(`provider set capped at ${FULL_QUORUM_SIZE}`);
    }

    const cacheKey = this.computeCacheKey(input, providers);

    const cached = this.cache.get(cacheKey);
    if (cached) {
      // Refresh LRU recency.
      this.cache.delete(cacheKey);
      this.cache.set(cacheKey, cached);
      return { ...cached, cacheHit: true };
    }
    const inflight = this.inflight.get(cacheKey);
    if (inflight) return inflight.then((r) => ({ ...r, cacheHit: true }));

    const job = this.runVote(input, providers, cacheKey).finally(() => {
      this.inflight.delete(cacheKey);
    });
    this.inflight.set(cacheKey, job);
    return job;
  }

  clearCache(): void {
    this.cache.clear();
  }

  // ─── internals ─────────────────────────────────────────────────

  private computeCacheKey(input: string, providers: QuorumProvider[]): string {
    const sortedIds = providers.map((p) => p.id).sort().join(",");
    return createHash("sha256").update(`${sortedIds} ${input}`, "utf8").digest("hex");
  }

  private async runVote(
    input: string,
    providers: QuorumProvider[],
    cacheKey: string
  ): Promise<QuorumResult> {
    const start = Date.now();
    const cloudPresent = providers.some((p) => p.kind === "cloud");
    if (!cloudPresent) {
      const refused: QuorumResult = {
        decision: "REFUSED",
        reason: "no-cloud-provider — quorum requires ≥1 Claude or Codex",
        votes: { PASS: 0, CONDITIONAL: 0, FAIL: 0 },
        validProviders: 0,
        totalProviders: providers.length,
        partialQuorum: false,
        cloudPresent: false,
        results: providers.map((p) => ({
          providerId: p.id,
          kind: p.kind,
          valid: false,
          error: "skipped: cloud-provider-mandatory",
          durationMs: 0,
        })),
        dissent: [],
        flagsSurfaced: [],
        cacheKey,
        cacheHit: false,
        durationMs: Date.now() - start,
      };
      this.storeCache(cacheKey, refused);
      return refused;
    }

    const settled = await Promise.all(
      providers.map((p) => this.invokeOne(p, input))
    );

    const valid = settled.filter((r) => r.valid);
    const votes = { PASS: 0, CONDITIONAL: 0, FAIL: 0 };
    for (const r of valid) {
      if (r.verdict) votes[r.verdict.decision] += 1;
    }
    const partialQuorum = valid.length < providers.length;
    const flagsSurfaced = uniqueStrings(
      valid.flatMap((r) => r.verdict?.flags ?? [])
    );

    let decision: QuorumDecision;
    let reason: string;

    let popularVote: Decision | null = null;
    if (valid.length < MIN_VALID_QUORUM) {
      decision = "FAIL";
      reason = `insufficient-quorum: ${valid.length} valid of ${providers.length}`;
    } else {
      const winner = pickWinner(votes);
      popularVote = winner;
      const winnerCount = winner ? votes[winner] : 0;
      const supermajority = valid.length > 0 && winnerCount / valid.length >= SUPERMAJORITY_RATIO;
      if (winner === null) {
        decision = "CONDITIONAL";
        reason = "split-vote — no clear majority";
      } else if (winner === "FAIL") {
        // Failure is sticky: bare-majority FAIL stays FAIL — safer default
        // than downgrading to CONDITIONAL on a contested but flagged review.
        decision = "FAIL";
        reason =
          partialQuorum
            ? `majority-fail with partial quorum (${valid.length}/${providers.length})`
            : "majority-fail";
      } else if (!supermajority) {
        // Bare-majority PASS / CONDITIONAL (e.g., 3-of-5 = 60%) does NOT
        // clear the 75% supermajority bar — downgrade with explicit reason.
        decision = "CONDITIONAL";
        reason = `bare-majority-downgrade: original=${winner}, ${winnerCount}/${valid.length} below 75%`;
      } else if (partialQuorum) {
        // Partial quorum downgrades a non-FAIL supermajority to CONDITIONAL
        // regardless of the winning label — explicit downgrade flag.
        decision = "CONDITIONAL";
        reason = `partial-quorum-downgrade: original=${winner}, valid=${valid.length}/${providers.length}`;
      } else {
        decision = winner;
        reason = `majority-${winner.toLowerCase()}`;
      }
    }

    // Dissent is computed against the POPULAR vote, not the downgraded label —
    // a 3-PASS / 2-FAIL outcome that downgrades to CONDITIONAL still has the
    // 2 FAIL voters as dissenters (not the 3 PASS voters who agreed with the
    // popular winner). When there is no clear winner (split-vote), every
    // valid verdict is its own dissent.
    const dissent: ProviderVerdict[] = popularVote
      ? valid
          .map((r) => r.verdict!)
          .filter((v) => v.decision !== popularVote)
      : valid.map((r) => r.verdict!);

    const result: QuorumResult = {
      decision,
      reason,
      votes,
      validProviders: valid.length,
      totalProviders: providers.length,
      partialQuorum,
      cloudPresent,
      results: settled,
      dissent,
      flagsSurfaced,
      cacheKey,
      cacheHit: false,
      durationMs: Date.now() - start,
    };

    this.storeCache(cacheKey, result);
    return result;
  }

  private async invokeOne(provider: QuorumProvider, input: string): Promise<ProviderCallResult> {
    const ac = new AbortController();
    const start = Date.now();
    const timer = setTimeout(() => ac.abort(), this.perProviderTimeoutMs);
    try {
      const verdict = await provider.invoke(input, ac.signal);
      return {
        providerId: provider.id,
        kind: provider.kind,
        valid: true,
        verdict: validateVerdict(verdict),
        durationMs: Date.now() - start,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        providerId: provider.id,
        kind: provider.kind,
        valid: false,
        error: ac.signal.aborted ? "timeout" : message,
        durationMs: Date.now() - start,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  private storeCache(key: string, result: QuorumResult): void {
    if (this.cache.size >= this.cacheCapacity) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    this.cache.set(key, result);
  }
}

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

function pickWinner(votes: { PASS: number; CONDITIONAL: number; FAIL: number }): Decision | null {
  const entries = Object.entries(votes) as [Decision, number][];
  entries.sort((a, b) => b[1] - a[1]);
  if (entries[0][1] === 0) return null;
  if (entries[0][1] === entries[1][1]) return null;
  return entries[0][0];
}

function uniqueStrings(items: string[]): string[] {
  return Array.from(new Set(items.filter((s) => typeof s === "string" && s.length > 0)));
}

function validateVerdict(v: unknown): ProviderVerdict {
  if (!v || typeof v !== "object") {
    throw new Error("provider returned non-object verdict");
  }
  const obj = v as Partial<ProviderVerdict>;
  if (obj.decision !== "PASS" && obj.decision !== "CONDITIONAL" && obj.decision !== "FAIL") {
    throw new Error(`invalid verdict.decision: ${String(obj.decision)}`);
  }
  if (typeof obj.rationale !== "string") {
    throw new Error("verdict.rationale must be a string");
  }
  return {
    decision: obj.decision,
    rationale: obj.rationale,
    flags: Array.isArray(obj.flags) ? obj.flags.filter((f): f is string => typeof f === "string") : [],
    confidence: typeof obj.confidence === "number" ? obj.confidence : 0.5,
  };
}

export const prismConsensusGateEngine = new PRISMConsensusGateEngine();
