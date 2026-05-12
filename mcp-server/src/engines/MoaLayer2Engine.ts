/**
 * MoaLayer2Engine — Mixture-of-Agents Layer-2 aggregator over N proposer outputs.
 *
 * Milestone: OCTOPUS-NEURAL-MS0 / U-OCN02.
 *
 * Reference: Wang et al. "Mixture-of-Agents Enhances Large Language Model
 * Capabilities" (2406.04692). MoA-Layer-2 takes a set of "proposer" outputs
 * (independent answers from heterogeneous models) and distills them via a
 * "senior aggregator" model into a single calibrated answer that consistently
 * outperforms any individual proposer by 10%+ on rubric (per the paper).
 *
 * PRISM's existing 3-of-3 scrutiny gate (Codex + Claude-A + Claude-B) produces
 * exactly the proposer set MoA wants. The gap before U-OCN02 was the *aggregation
 * layer*: scrutiny-3way.mjs records 3 verdicts but does not distill them into a
 * single calibrated decision with rationale + dissent + confidence. This engine
 * is that distillation layer.
 *
 * Failure modes covered (per atomized spec):
 *   - senior aggregator down → fall back to majority vote (verdict-only, lower confidence)
 *   - Self-MoA dilution (2502.00674) → flag suspicious unanimous + low entropy in rationale
 *   - oversize aggregation → truncate per-proposer rationale to maxProposerChars
 *   - all proposers failed (transport ok=false) → return all_fail
 *
 * Adversarial cases:
 *   - 2-of-3 proposers return identical rationale (possible collusion / shared training
 *     data over-fitting) → recorded in `rationale` as warning, but does NOT block
 *     consensus (the engine is an aggregator, not an integrity gate; the integrity
 *     gate is the 3-of-3 scrutiny ledger itself, which decides which proposers to
 *     trust).
 *
 * @module engines/MoaLayer2Engine
 * @milestone OCTOPUS-NEURAL-MS0/U-OCN02
 */

/** Verdict space — matches scrutiny-ledger.mjs's pass/fail axis plus a middle. */
export type MoaVerdict = "pass" | "conditional" | "fail";

/** A single proposer's contribution to the aggregation. */
export interface ProposerOutput {
  /** Stable identifier — 'codex', 'claude-a', 'claude-b', 'kimi-k2', etc. */
  proposer: string;
  /** True iff this proposer responded at all (transport ok). False = treat as missing. */
  ok: boolean;
  /** Verdict from this proposer when ok=true. Ignored when ok=false. */
  verdict: MoaVerdict;
  /** Free-text rationale supporting the verdict. */
  notes: string;
  /** Optional confidence in [0, 1]. Defaults to 0.5 when omitted. */
  confidence?: number;
  /** Optional error message when ok=false. */
  error?: string;
}

/** Optional callable for senior-model aggregation (LLM call). */
export type AggregatorCall = (prompt: string) => Promise<{
  ok: boolean;
  answer: string;
  error: string | null;
}>;

export interface MoaAggregateOptions {
  /** Proposer outputs. Length ≥ 1. Typical: 3 (codex + claude-a + claude-b). */
  proposers: ProposerOutput[];
  /** Optional task description fed to the senior aggregator for context. */
  task?: string;
  /**
   * If provided, the engine calls this with the assembled aggregation prompt.
   * If omitted (or it returns ok:false), the engine falls back to majority vote.
   * In production this would wrap a Claude or Kimi invocation; in tests it's a stub.
   */
  aggregatorCall?: AggregatorCall;
  /** Aggregator model id for traceability (default 'majority-vote' when no call provided). */
  seniorAggregator?: string;
  /** Per-proposer rationale truncation budget (chars). Default 2000. 0 = unlimited. */
  maxProposerChars?: number;
}

export interface MoaAggregateResult {
  ok: boolean;
  /** Aggregated verdict. Falls back to 'fail' when all proposers failed transport. */
  verdict: MoaVerdict;
  /** Aggregated confidence in [0, 1]. */
  confidence: number;
  /** Distilled rationale (from senior aggregator or majority-vote synthesis). */
  rationale: string;
  /** Proposers whose verdict differs from the aggregated verdict. */
  dissent: ProposerOutput[];
  /** How the verdict was determined. */
  fallback: "aggregator" | "majority_vote" | "all_fail" | "single_proposer";
  /** Shannon entropy over the proposer verdict distribution in [0, log2(3)]. */
  entropy: number;
  /** Senior aggregator id (or 'majority-vote' if no aggregator was used). */
  aggregatedBy: string;
  /** True if any proposer rationale was truncated to fit the budget. */
  truncated: boolean;
  /** Engine error (validation, not aggregation failure). null when ok=true. */
  error: string | null;
}

const DEFAULT_MAX_PROPOSER_CHARS = 2000;
const DEFAULT_CONFIDENCE = 0.5;
const ALL_VERDICTS: MoaVerdict[] = ["pass", "conditional", "fail"];

/**
 * U-OCN02: Two response-shape regexes used to parse the senior aggregator's
 * answer back into a structured verdict + rationale. The aggregator is asked to
 * produce a final block `VERDICT: pass|conditional|fail` followed by free-form
 * rationale; both compact and verbose forms are accepted.
 */
const VERDICT_LINE_RE = /^\s*VERDICT\s*[:=]\s*(pass|conditional|fail)\s*$/im;

export class MoaLayer2Engine {
  /**
   * Aggregate N proposer outputs into a single distilled verdict. Returns a
   * result object — never throws on aggregation failure (only on input
   * validation failure, e.g. zero proposers).
   */
  async aggregate(options: MoaAggregateOptions): Promise<MoaAggregateResult> {
    this.validate(options);
    const maxChars = options.maxProposerChars ?? DEFAULT_MAX_PROPOSER_CHARS;

    const live = options.proposers.filter((p) => p.ok);
    const failed = options.proposers.filter((p) => !p.ok);
    const aggregatedBy = options.seniorAggregator ?? (options.aggregatorCall ? "unspecified-aggregator" : "majority-vote");

    // All proposers failed transport — short-circuit to all_fail.
    if (live.length === 0) {
      return {
        ok: true, // engine ran fine — the outcome is just "everyone is offline"
        verdict: "fail",
        confidence: 0,
        rationale: `All ${options.proposers.length} proposer(s) failed transport: ${failed.map((p) => `${p.proposer}=${p.error ?? "no detail"}`).join("; ")}`,
        dissent: [],
        fallback: "all_fail",
        entropy: 0,
        aggregatedBy,
        truncated: false,
        error: null,
      };
    }

    const entropy = this.shannonEntropy(live.map((p) => p.verdict));

    // Degenerate: a single live proposer — return its verdict but mark as low-confidence.
    if (live.length === 1) {
      const only = live[0];
      const conf = (only.confidence ?? DEFAULT_CONFIDENCE) * 0.7; // single-source penalty
      return {
        ok: true,
        verdict: only.verdict,
        confidence: this.clamp01(conf),
        rationale: `Only one live proposer (${only.proposer}); ${failed.length} failed. Single-source confidence penalty applied. Rationale: ${this.truncate(only.notes, maxChars)}`,
        dissent: [],
        fallback: "single_proposer",
        entropy: 0,
        aggregatedBy,
        truncated: only.notes.length > maxChars && maxChars > 0,
        error: null,
      };
    }

    // Build aggregation prompt + per-proposer rationale truncation tracking.
    let anyTruncated = false;
    const prompt = this.buildAggregationPrompt(options.task ?? "", live, maxChars, (didTruncate) => {
      if (didTruncate) anyTruncated = true;
    });

    // Try senior-model aggregation if a callable was provided.
    if (options.aggregatorCall) {
      try {
        const r = await options.aggregatorCall(prompt);
        if (r.ok && r.answer.length > 0) {
          const parsed = this.parseAggregatorAnswer(r.answer);
          // Compute confidence: weighted mean over proposers whose verdict matches the aggregator.
          const winningVerdict = parsed.verdict ?? this.majorityVerdict(live);
          const agreeingConfs = live.filter((p) => p.verdict === winningVerdict).map((p) => p.confidence ?? DEFAULT_CONFIDENCE);
          const meanAgreeConf = agreeingConfs.length > 0 ? agreeingConfs.reduce((a, b) => a + b, 0) / agreeingConfs.length : DEFAULT_CONFIDENCE;
          // Aggregator-bonus: agreement among proposers boosts confidence; bonus capped at +0.15.
          const agreementBonus = Math.min(0.15, (agreeingConfs.length / live.length) * 0.15);
          // Dilution check (Self-MoA): if entropy is very low AND >=3 proposers agree,
          // gently downweight (the unanimity may be over-fitting/collusion).
          const dilutionPenalty = (entropy < 0.1 && agreeingConfs.length >= 3) ? 0.05 : 0;
          const finalConf = this.clamp01(meanAgreeConf + agreementBonus - dilutionPenalty);
          const dissent = live.filter((p) => p.verdict !== winningVerdict);
          return {
            ok: true,
            verdict: winningVerdict,
            confidence: finalConf,
            rationale: parsed.rationale.length > 0 ? parsed.rationale : r.answer,
            dissent,
            fallback: "aggregator",
            entropy,
            aggregatedBy,
            truncated: anyTruncated,
            error: null,
          };
        }
        // Aggregator returned ok:false or empty answer — fall through to majority vote.
      } catch {
        // Aggregator threw — fall through to majority vote.
      }
    }

    // Fallback: majority vote.
    const winning = this.majorityVerdict(live);
    const agreeing = live.filter((p) => p.verdict === winning);
    const dissent = live.filter((p) => p.verdict !== winning);
    const meanConf = agreeing.reduce((s, p) => s + (p.confidence ?? DEFAULT_CONFIDENCE), 0) / agreeing.length;
    // Majority-vote confidence is bounded: no aggregator means we can't synthesize a
    // distilled rationale, so cap at 0.85 regardless of proposer self-reports.
    const cappedConf = Math.min(0.85, meanConf);

    let rationale = `Majority vote (no aggregator): ${agreeing.length}/${live.length} voted "${winning}". ` +
      `${dissent.length > 0 ? `Dissent from: ${dissent.map((p) => `${p.proposer}=${p.verdict}`).join(", ")}. ` : ""}` +
      `Proposer summaries:\n` +
      live.map((p) => `- ${p.proposer} (${p.verdict}, c=${(p.confidence ?? DEFAULT_CONFIDENCE).toFixed(2)}): ${this.truncate(p.notes, maxChars)}`).join("\n");

    // Self-MoA dilution warning (per 2502.00674).
    if (entropy < 0.1 && agreeing.length === live.length && live.length >= 3) {
      rationale += `\n\n[Self-MoA dilution warning: ${live.length}/${live.length} proposers agree with entropy=${entropy.toFixed(3)}. Watch for shared-training-data over-fitting.]`;
    }
    // Collusion-check note when ≥2 proposers' notes are identical.
    if (this.hasIdenticalNotes(live)) {
      rationale += `\n\n[Collusion-check: 2+ proposers returned identical rationale text. Aggregated verdict still trusted but mark for ledger review.]`;
    }

    return {
      ok: true,
      verdict: winning,
      confidence: this.clamp01(cappedConf),
      rationale,
      dissent,
      fallback: "majority_vote",
      entropy,
      aggregatedBy,
      truncated: anyTruncated,
      error: null,
    };
  }

  // ---- internals ----

  private validate(options: MoaAggregateOptions): void {
    if (!options || typeof options !== "object") throw new Error("MoaAggregateOptions required");
    if (!Array.isArray(options.proposers) || options.proposers.length === 0) {
      throw new Error("proposers must be a non-empty array");
    }
    for (const p of options.proposers) {
      if (!p || typeof p !== "object") throw new Error("each proposer must be an object");
      if (typeof p.proposer !== "string" || p.proposer.length === 0) throw new Error("proposer.proposer must be a non-empty string");
      if (typeof p.ok !== "boolean") throw new Error("proposer.ok must be boolean");
      if (p.ok && !ALL_VERDICTS.includes(p.verdict)) {
        throw new Error(`proposer.verdict must be one of ${ALL_VERDICTS.join("/")} when ok=true (got ${String(p.verdict)} for ${p.proposer})`);
      }
      if (p.confidence !== undefined) {
        if (!Number.isFinite(p.confidence) || p.confidence < 0 || p.confidence > 1) {
          throw new Error(`proposer.confidence must be in [0,1] (got ${p.confidence} for ${p.proposer})`);
        }
      }
    }
    if (options.maxProposerChars !== undefined) {
      if (!Number.isInteger(options.maxProposerChars) || options.maxProposerChars < 0) {
        throw new Error("maxProposerChars must be a non-negative integer");
      }
    }
  }

  /** Shannon entropy over the verdict distribution; range [0, log2(3)]. */
  private shannonEntropy(verdicts: MoaVerdict[]): number {
    if (verdicts.length === 0) return 0;
    const counts: Record<MoaVerdict, number> = { pass: 0, conditional: 0, fail: 0 };
    for (const v of verdicts) counts[v]++;
    let h = 0;
    for (const k of ALL_VERDICTS) {
      const p = counts[k] / verdicts.length;
      if (p > 0) h -= p * Math.log2(p);
    }
    return h;
  }

  /** Majority verdict; ties resolved toward 'conditional' (conservative). */
  private majorityVerdict(live: ProposerOutput[]): MoaVerdict {
    const counts: Record<MoaVerdict, number> = { pass: 0, conditional: 0, fail: 0 };
    for (const p of live) counts[p.verdict]++;
    const max = Math.max(counts.pass, counts.conditional, counts.fail);
    const winners = ALL_VERDICTS.filter((v) => counts[v] === max);
    if (winners.length === 1) return winners[0];
    // Tie → conservative middle ground (lean conditional rather than pass/fail).
    if (winners.includes("conditional")) return "conditional";
    // Tie between pass and fail → conditional.
    return "conditional";
  }

  private buildAggregationPrompt(
    task: string,
    live: ProposerOutput[],
    maxChars: number,
    onTruncate: (didTruncate: boolean) => void,
  ): string {
    const lines: string[] = [];
    lines.push("You are an MoA-Layer-2 senior aggregator. Distill the proposers' verdicts into a single calibrated answer.");
    if (task.length > 0) lines.push(`\nTask: ${task}`);
    lines.push(`\n${live.length} proposers responded:`);
    for (const p of live) {
      const truncated = maxChars > 0 && p.notes.length > maxChars;
      onTruncate(truncated);
      const notes = this.truncate(p.notes, maxChars);
      lines.push(`\n- ${p.proposer} | verdict=${p.verdict} | confidence=${(p.confidence ?? DEFAULT_CONFIDENCE).toFixed(2)}\n  ${notes}`);
    }
    lines.push(`\nReply with a final block:\nVERDICT: <pass|conditional|fail>\n<one or two paragraphs of rationale citing the proposers by name>`);
    return lines.join("\n");
  }

  private parseAggregatorAnswer(answer: string): { verdict: MoaVerdict | null; rationale: string } {
    const match = answer.match(VERDICT_LINE_RE);
    if (!match) return { verdict: null, rationale: answer.trim() };
    const verdict = match[1].toLowerCase() as MoaVerdict;
    // Strip the VERDICT: line from the rationale so the caller doesn't get a duplicated header.
    const rationale = answer.replace(match[0], "").trim();
    return { verdict, rationale };
  }

  private truncate(s: string, maxChars: number): string {
    if (maxChars <= 0 || s.length <= maxChars) return s;
    return s.slice(0, maxChars) + `… [truncated; ${s.length - maxChars} more chars]`;
  }

  private clamp01(n: number): number {
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(1, n));
  }

  private hasIdenticalNotes(live: ProposerOutput[]): boolean {
    const seen = new Map<string, number>();
    for (const p of live) {
      const norm = p.notes.trim().toLowerCase();
      if (norm.length < 20) continue; // ignore trivially-short notes
      seen.set(norm, (seen.get(norm) ?? 0) + 1);
    }
    for (const c of seen.values()) if (c >= 2) return true;
    return false;
  }
}

export const moaLayer2Engine = new MoaLayer2Engine();
