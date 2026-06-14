/**
 * TwoPassCascadeEngine — cheap-then-strong two-pass execution with a quality gate.
 *
 * COST-CASCADE-MS0 / U-DISPATCHER-ACTION-TWO-PASS.
 *
 * Many tasks are solved correctly by a cheap tentacle on the first pass; only
 * escalate to an expensive tentacle when a quality gate fails. FrugalGPT
 * (Chen et al., arXiv:2305.05176) reports 50-98% cost reduction at constant
 * quality with exactly this cascade.
 *
 * This engine is the *control primitive* — pure, deterministic, and fully
 * injectable. The tentacle/judge functions are parameters so the cascade logic
 * can be tested without a model server; production callers (the
 * `prism_ai:two_pass` dispatcher action) wire the local Ollama client as the
 * default cheap/strong tentacle and a rule-based judge.
 *
 * Consumed by U-CASCADE-FALLBACK-CHAIN (the multi-tier fallback chain this
 * unit `blocks`) — this is the single-step (cheap→strong) base case.
 *
 * Safety / R12: a thrown tentacle is never silently swallowed into a fake
 * success. A cheap failure escalates; a judge failure (throw OR non-finite
 * score) conservatively escalates AND records a `judgeError`; a both-passes
 * failure throws a typed `TwoPassCascadeError` carrying BOTH failure surfaces.
 */

export interface TwoPassTentacleResult {
  /** The model/tentacle answer text. */
  text: string;
  /** Optional measured cost of this single tentacle call, in USD. */
  costUSD?: number;
}

/** A tentacle: prompt in, answer (+optional measured cost) out. May be async. */
export type TentacleFn = (
  prompt: string,
) => Promise<TwoPassTentacleResult> | TwoPassTentacleResult;

/** A judge: scores an answer for a prompt in [0,1]. May be async. */
export type JudgeFn = (
  prompt: string,
  answer: string,
) => Promise<number> | number;

export interface TwoPassOptions {
  prompt: string;
  /** Quality gate. Cheap pass is accepted when score >= threshold. Default 0.7, clamped to [0,1]. */
  qualityThreshold?: number;
  /** Skip the cheap pass entirely and go straight to strong. */
  forceStrong?: boolean;
  /** Cheap tentacle. Required unless a production default is supplied by the caller. */
  invokeCheap?: TentacleFn;
  /** Strong tentacle. Required unless a production default is supplied by the caller. */
  invokeStrong?: TentacleFn;
  /** Quality judge. Defaults to the built-in deterministic rule-based scorer. */
  judge?: JudgeFn;
  /**
   * Per-pass cost estimate, in USD. Used only as a FALLBACK when a tentacle
   * does not return its own measured `costUSD`. A measured tentacle cost
   * always takes precedence over these estimates.
   */
  costModel?: { cheapUSD?: number; strongUSD?: number };
}

export interface TwoPassResult {
  /** Which pass produced `result`. */
  pass: "cheap" | "strong";
  /** The accepted answer text. */
  result: string;
  /** Quality score (0..1) of the accepted answer per the judge. */
  qualityScore: number;
  /** Total USD cost across the passes actually executed (measured cost preferred over estimate). */
  costUSD: number;
  /**
   * True when the cheap pass was rejected (or skipped via forceStrong) and the
   * strong pass was attempted — regardless of whether strong then succeeded.
   * `escalated:true` with `pass:"cheap"` means strong was attempted but failed
   * and the (sub-threshold) cheap answer is returned as a degraded fallback —
   * see `degraded`.
   */
  escalated: boolean;
  /**
   * True ONLY when `result` is a known sub-threshold answer surfaced because
   * the escalation target failed (strong threw after cheap was rejected).
   * Consumers (e.g. the fallback-chain unit) should treat a degraded result as
   * best-effort, not gate-passing. Never true for an accepted cheap pass or a
   * successful strong pass.
   */
  degraded: boolean;
  /**
   * True when at least one executed pass had a finite cost (measured tentacle
   * cost OR a supplied cost-model estimate). `costRecorded:true` with
   * `costUSD:0` means telemetry was present and the genuine cost was zero;
   * `costRecorded:false` means no cost telemetry/estimate was available.
   */
  costRecorded: boolean;
  /** Effective threshold after clamping. */
  threshold: number;
  /** Present when the cheap tentacle threw — its message. */
  cheapError?: string;
  /** Present when the strong tentacle threw — its message. */
  strongError?: string;
  /** Present when the judge threw OR returned a non-finite score (then treated as a fail). */
  judgeError?: string;
}

const DEFAULT_THRESHOLD = 0.7;
const REFUSAL_PENALTY_PER_MARKER = 0.35;
const REFUSAL_PENALTY_CAP = 0.7;
const SUBSTANCE_MIN_LEN = 8;
const SUBSTANCE_RAMP_LEN = 40;
const SUBSTANCE_PLATEAU_LEN = 600;
const GIBBERISH_SANE_FLOOR = 0.55;

/**
 * Typed error for a cascade that produced no answer. Carries BOTH failure
 * surfaces so the dispatcher can emit an error envelope without untyped casts
 * (the R12 "carry both surfaces" contract is type-enforced here).
 */
export class TwoPassCascadeError extends Error {
  readonly cheapError?: string;
  readonly strongError?: string;
  constructor(message: string, surfaces: { cheapError?: string; strongError?: string }) {
    super(message);
    this.name = "TwoPassCascadeError";
    this.cheapError = surfaces.cheapError;
    this.strongError = surfaces.strongError;
  }
}

/** Clamp to a finite number in [0,1]; non-finite → fallback. */
function clamp01(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : NaN;
  if (!Number.isFinite(n)) return fallback;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

const ERROR_MARKERS = [
  "i don't know",
  "i do not know",
  "as an ai",
  "i cannot",
  "i can't",
  "unable to",
  "no answer",
  "error:",
];

const STOP = new Set([
  "the", "a", "an", "of", "to", "in", "is", "and", "or", "for", "on", "with",
  "what", "how", "why", "when", "which", "this", "that", "are", "be", "it",
]);

function tokens(s: string): string[] {
  return (s.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter(
    (t) => t.length > 1 && !STOP.has(t),
  );
}

/**
 * Deterministic rule-based quality scorer in [0,1]. No model, no cost.
 *
 * Heuristic blend:
 *  - 0 for an empty / whitespace-only answer.
 *  - relevance: content-token overlap between prompt & answer.
 *  - substance: a length sweet-spot (too short = thin, absurdly long = padded).
 *  - penalty: refusal / non-answer markers, cumulative + bounded.
 *  - gibberish guard: very low printable ratio → near-zero. The printable set
 *    includes common technical punctuation (`/=+*%[]{}_@<>|&^~$#`) so a
 *    legitimate code/math answer is NOT mistaken for gibberish (that
 *    false-escalation would defeat the engine's cost-reduction purpose).
 *
 * Exported so callers/tests can use it directly or compose it.
 */
export function ruleBasedQualityScore(prompt: string, answer: string): number {
  const a = (answer ?? "").trim();
  if (a.length === 0) return 0;

  // Printable ratio. Technical punctuation is printable — a code/math answer
  // like `a = b * c / d` must not register as gibberish.
  const printable =
    (a.match(/[a-zA-Z0-9\s.,;:!?'"()\-/=+*%[\]{}_@<>|&^~$#\\]/g) ?? []).length /
    a.length;
  if (printable < GIBBERISH_SANE_FLOOR) {
    return Math.max(0, printable * 0.3);
  }

  const pTok = tokens(prompt);
  const aTok = tokens(a);
  if (aTok.length === 0) return 0.05;

  const aSet = new Set(aTok);
  const overlap =
    pTok.length === 0
      ? 0.5 // no content tokens in prompt → relevance indeterminate, neutral
      : pTok.filter((t) => aSet.has(t)).length / pTok.length;

  const len = a.length;
  let substance: number;
  if (len < SUBSTANCE_MIN_LEN) substance = 0.1;
  else if (len < SUBSTANCE_RAMP_LEN)
    substance =
      0.4 + (len - SUBSTANCE_MIN_LEN) * (0.4 / (SUBSTANCE_RAMP_LEN - SUBSTANCE_MIN_LEN));
  else if (len <= SUBSTANCE_PLATEAU_LEN) substance = 0.85;
  else substance = Math.max(0.4, 0.85 - (len - SUBSTANCE_PLATEAU_LEN) / 4000);

  const lower = a.toLowerCase();
  let markerHits = 0;
  for (const m of ERROR_MARKERS) {
    if (lower.includes(m)) markerHits += 1;
  }
  let penalty = Math.min(REFUSAL_PENALTY_CAP, markerHits * REFUSAL_PENALTY_PER_MARKER);
  if (/^(.)\1{6,}$/.test(a.replace(/\s/g, ""))) {
    penalty = Math.min(REFUSAL_PENALTY_CAP, penalty + 0.5); // "aaaaaaaa"
  }

  const raw = 0.55 * overlap + 0.45 * substance - penalty;
  return clamp01(raw, 0);
}

interface TentacleCall {
  text: string;
  costUSD?: number;
  error?: string;
}

export class TwoPassCascadeEngine {
  /**
   * Run the cheap→(gate)→strong cascade.
   *
   * @throws Error if `prompt`/`invokeStrong`/`invokeCheap` are missing
   *         (caller-contract violations).
   * @throws TwoPassCascadeError if BOTH passes fail, OR if a forced strong
   *         pass fails — no answer can be produced; the error carries both
   *         failure surfaces.
   */
  async run(opts: TwoPassOptions): Promise<TwoPassResult> {
    if (!opts || typeof opts.prompt !== "string" || opts.prompt.trim() === "") {
      throw new Error("two_pass: 'prompt' is required and must be non-empty");
    }
    const prompt = opts.prompt;
    const threshold = clamp01(opts.qualityThreshold, DEFAULT_THRESHOLD);
    const judge: JudgeFn = opts.judge ?? ruleBasedQualityScore;

    const cheapEstimate = finiteOrUndef(opts.costModel?.cheapUSD);
    const strongEstimate = finiteOrUndef(opts.costModel?.strongUSD);

    if (typeof opts.invokeStrong !== "function") {
      throw new Error(
        "two_pass: 'invokeStrong' tentacle is required (the dispatcher wires the production default)",
      );
    }

    // ── forceStrong: skip the cheap pass entirely ───────────────────────────
    if (opts.forceStrong === true) {
      const sres = await this.callTentacle(opts.invokeStrong, prompt, "strong");
      if (sres.error) {
        throw new TwoPassCascadeError(
          `two_pass: forced strong pass failed: ${sres.error}`,
          { strongError: sres.error },
        );
      }
      const j = await this.scoreWithJudge(judge, prompt, sres.text);
      return this.finalize({
        pass: "strong",
        result: sres.text,
        qualityScore: j.score,
        escalated: true,
        degraded: false,
        threshold,
        costParts: [effectiveCost(sres.costUSD, strongEstimate)],
        judgeError: j.judgeError,
      });
    }

    if (typeof opts.invokeCheap !== "function") {
      throw new Error(
        "two_pass: 'invokeCheap' tentacle is required (the dispatcher wires the production default)",
      );
    }

    // ── Pass 1: cheap ───────────────────────────────────────────────────────
    const cheap = await this.callTentacle(opts.invokeCheap, prompt, "cheap");

    let cheapScore = 0;
    let judgeError: string | undefined;
    if (!cheap.error) {
      const j = await this.scoreWithJudge(judge, prompt, cheap.text);
      cheapScore = j.score;
      judgeError = j.judgeError;
    }

    const acceptCheap = !cheap.error && !judgeError && cheapScore >= threshold;
    if (acceptCheap) {
      return this.finalize({
        pass: "cheap",
        result: cheap.text,
        qualityScore: cheapScore,
        escalated: false,
        degraded: false,
        threshold,
        costParts: [effectiveCost(cheap.costUSD, cheapEstimate)],
        judgeError,
      });
    }

    // ── Pass 2: escalate to strong ─────────────────────────────────────────
    const strong = await this.callTentacle(opts.invokeStrong, prompt, "strong");
    if (strong.error) {
      if (cheap.error) {
        // Both passes failed — no answer can be produced. R12: fail loud,
        // carry BOTH surfaces in a typed error.
        throw new TwoPassCascadeError(
          `two_pass: both passes failed — cheap: ${cheap.error}; strong: ${strong.error}`,
          { cheapError: cheap.error, strongError: strong.error },
        );
      }
      // Strong failed but cheap produced a (sub-threshold) answer — return it
      // explicitly flagged as a degraded best-effort fallback rather than
      // discarding a usable result.
      return this.finalize({
        pass: "cheap",
        result: cheap.text,
        qualityScore: cheapScore,
        escalated: true,
        degraded: true,
        threshold,
        costParts: [effectiveCost(cheap.costUSD, cheapEstimate)],
        strongError: strong.error,
        judgeError,
      });
    }

    const sj = await this.scoreWithJudge(judge, prompt, strong.text);
    return this.finalize({
      pass: "strong",
      result: strong.text,
      qualityScore: sj.score,
      escalated: true,
      degraded: false,
      threshold,
      costParts: [
        effectiveCost(cheap.costUSD, cheapEstimate),
        effectiveCost(strong.costUSD, strongEstimate),
      ],
      cheapError: cheap.error,
      // `judgeError` reflects the scoring of the RETURNED answer (the strong
      // one here). A stale cheap-pass judge error is NOT carried — it would
      // wrongly tell a consumer the strong answer's score is untrustworthy.
      judgeError: sj.judgeError,
    });
  }

  /**
   * Score an answer via the judge. A throw OR a non-finite return is treated
   * as a conservative fail (score 0) AND surfaces a `judgeError` — a malformed
   * judge result is never silently laundered into a legitimate-looking 0.
   */
  private async scoreWithJudge(
    judge: JudgeFn,
    prompt: string,
    answer: string,
  ): Promise<{ score: number; judgeError?: string }> {
    let raw: unknown;
    try {
      raw = await judge(prompt, answer);
    } catch (err) {
      return {
        score: 0,
        judgeError: err instanceof Error ? err.message : String(err),
      };
    }
    if (typeof raw !== "number" || !Number.isFinite(raw)) {
      return {
        score: 0,
        judgeError: `judge returned a non-finite score (${String(raw)})`,
      };
    }
    return { score: clamp01(raw, 0) };
  }

  /** Invoke a tentacle, normalizing throw → {error}. Never throws itself. */
  private async callTentacle(
    fn: TentacleFn,
    prompt: string,
    which: "cheap" | "strong",
  ): Promise<TentacleCall> {
    try {
      const r = await fn(prompt);
      if (!r || typeof r.text !== "string") {
        return {
          text: "",
          error: `${which} tentacle returned a malformed result (no .text string)`,
        };
      }
      return { text: r.text, costUSD: finiteOrUndef(r.costUSD) };
    } catch (err) {
      return {
        text: "",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private finalize(p: {
    pass: "cheap" | "strong";
    result: string;
    qualityScore: number;
    escalated: boolean;
    degraded: boolean;
    threshold: number;
    costParts: Array<number | undefined>;
    cheapError?: string;
    strongError?: string;
    judgeError?: string;
  }): TwoPassResult {
    const finiteParts = p.costParts.filter(
      (c): c is number => typeof c === "number" && Number.isFinite(c),
    );
    const out: TwoPassResult = {
      pass: p.pass,
      result: p.result,
      qualityScore: p.qualityScore,
      costUSD: finiteParts.reduce((s, c) => s + c, 0),
      escalated: p.escalated,
      degraded: p.degraded,
      costRecorded: finiteParts.length > 0,
      threshold: p.threshold,
    };
    if (p.cheapError) out.cheapError = p.cheapError;
    if (p.strongError) out.strongError = p.strongError;
    if (p.judgeError) out.judgeError = p.judgeError;
    return out;
  }
}

/** Finite number → itself; anything else → undefined. */
function finiteOrUndef(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

/**
 * Prefer a measured tentacle cost; fall back to the cost-model estimate.
 * A negative measured cost is nonsensical telemetry — it is rejected (falls
 * through to the estimate) rather than understating the total.
 */
function effectiveCost(
  measured: number | undefined,
  estimate: number | undefined,
): number | undefined {
  if (typeof measured === "number" && Number.isFinite(measured) && measured >= 0) {
    return measured;
  }
  if (typeof estimate === "number" && Number.isFinite(estimate) && estimate >= 0) {
    return estimate;
  }
  return undefined;
}

export const twoPassCascadeEngine = new TwoPassCascadeEngine();

/**
 * Production default tentacle factory — wraps the local Ollama client so the
 * `prism_ai:two_pass` dispatcher works with no caller-supplied functions.
 *
 * cheap = a small fast model; strong = a larger model. Both default via env,
 * overridable per-call from the dispatcher params. A model failure throws
 * (R12) — the cascade then escalates (cheap) or surfaces a typed error
 * (strong), never a fabricated answer.
 */
export function makeOllamaTentacle(
  modelId: string,
  generate: (o: { model: string; prompt: string }) => Promise<{
    ok: boolean;
    data?: string;
    error?: string;
  }>,
): TentacleFn {
  return async (prompt: string): Promise<TwoPassTentacleResult> => {
    const r = await generate({ model: modelId, prompt });
    if (!r.ok || typeof r.data !== "string") {
      throw new Error(
        `ollama tentacle '${modelId}' failed: ${r.error ?? "no data"}`,
      );
    }
    return { text: r.data };
  };
}
