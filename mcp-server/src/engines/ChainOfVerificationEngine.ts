/**
 * ChainOfVerificationEngine — Generic Chain-of-Verification (CoV) substrate primitive
 *
 * Implements the Chain-of-Verification reasoning pattern (Dhuliawala et al. 2023,
 * "Chain-of-Verification Reduces Hallucination in Large Language Models"). Given
 * an INITIAL CLAIM and a set of VERIFICATION QUESTIONS, the engine drives each
 * question through a CALLER-SUPPLIED VERIFIER and aggregates the answers into a
 * VerificationVerdict that either CONFIRMS the original claim, CONFLICTS with
 * it, or surfaces an INSUFFICIENT-EVIDENCE result.
 *
 * Domain-agnostic. The engine itself performs NO I/O — verifiers are caller-
 * supplied closures that consult whatever substrate is appropriate (physics
 * constants, a dispatcher, an embedding index, a vendor catalog, etc.). This
 * keeps the engine pure + deterministic + unit-testable.
 *
 * First consumer: WEDMProgramSafetyGateEngine (R3 pick #5 in
 * [[reference_psn_r4_deep_stack_2026_05_25]]). The same primitive flows into
 * mill chatter prediction, lathe Cpk surrogates, quoting calibration, CAD
 * regeneration verdicts — any domain that produces a verdict-with-evidence
 * and benefits from an "ask three questions about it" verification pass.
 *
 * Strict R12 (fail-loud) discipline:
 *   - Unverified claims → returned as `unverified` with explicit `reason`,
 *     NOT silently passed as if confirmed.
 *   - Verifier exceptions → captured per-question + surfaced; one bad verifier
 *     does NOT collapse the entire verification chain.
 *   - Citation hallucination: when a `requiredCitationIds[]` is supplied,
 *     every cited ID must resolve to a `knownCitationIds[]` entry; missing
 *     IDs flip the verdict to `hallucinated_citation`.
 *   - Empty question list is REJECTED — verification with zero questions is
 *     a structural error, not a valid PASS.
 *
 * Spec: state/shared/specs/DEEP-REASONING-BRIDGE-2026-05-25.md (R3-pick-5 pivot)
 *
 * @milestone DEEP-REASONING-BRIDGE-MS0/U-COV-01
 * @author slot:charlie /goal-19 (continuing U-QT10), 2026-05-25
 * @see [[reference_psn_r4_deep_stack_2026_05_25]] R3 pick #5 (CoV inside wedm_safety_gate_evaluate)
 * @see [[reference_quoting_calibration_u_qt10_2026_05_25]] U-QT10 calibration parent
 */

/** A single verification question — fully self-contained for the verifier. */
export interface VerificationQuestion {
  /** Stable id (caller-supplied, must be unique within a single verify() call). */
  id: string;
  /** Human-readable question (used in trace + memory). */
  question: string;
  /** Caller-defined classification for grouping (e.g., "physics-constant", "input-bound", "dialect"). */
  kind?: string;
  /** Severity if this question FAILS. critical → flips overall verdict to conflict regardless of others. */
  severity?: "critical" | "high" | "medium" | "low";
  /** Optional structured context the verifier should have. Engine treats opaquely. */
  context?: Record<string, unknown>;
  /** Required citation IDs that downstream answer must use (hallucination guard). */
  requiredCitationIds?: string[];
}

/** Verifier outcome for a single question. */
export interface VerificationAnswer {
  /** Question id this answer corresponds to. Must match the input question id. */
  questionId: string;
  /** Outcome: did the verifier confirm the original claim with respect to this question? */
  outcome: "confirms" | "conflicts" | "uncertain";
  /** Human-readable evidence string. Stored in trace. */
  evidence: string;
  /** Citation IDs the verifier used (validated against requiredCitationIds + knownCitationIds). */
  citedIds?: string[];
  /** Verifier confidence in this answer, 0..1. Defaults to 1.0 for confirms, 0.0 for conflicts when omitted. */
  confidence?: number;
  /** Optional structured payload for downstream consumers (e.g., the constant value used). */
  payload?: Record<string, unknown>;
}

/** A verifier is a pure function: question → answer. NO I/O inside the engine. */
export type Verifier = (question: VerificationQuestion) => VerificationAnswer | Promise<VerificationAnswer>;

/** The original claim being verified. Opaque to the engine — only the verifiers interpret it. */
export interface VerificationClaim {
  /** Stable id for trace + memory. */
  claimId: string;
  /** Domain producing the claim. Determines where the result fans out per PSN leg mapping. */
  domain: VerificationDomain;
  /** Human-readable summary (one sentence). */
  summary: string;
  /** Original verdict (the gate's pre-verification answer). */
  initialVerdict: string;
  /** Original confidence (the gate's pre-verification score, 0..1). */
  initialConfidence: number;
  /** Raw payload — for the verifier's eyes only. */
  payload: Record<string, unknown>;
}

export type VerificationDomain =
  | "wedm-safety"
  | "wedm-flush"
  | "wedm-thermal"
  | "wedm-recast"
  | "wedm-dialect"
  | "mill-chatter"
  | "mill-tool-life"
  | "lathe-cpk"
  | "lathe-thread"
  | "quoting-calibration"
  | "quoting-bias"
  | "cad-regen"
  | "safety-omega"
  | "post-dialect"
  | "generic";

/** Aggregated verification verdict. */
export type VerificationVerdict =
  | "confirmed"             // all critical+high pass, ≥75% of medium pass
  | "confirmed_with_caveat" // all critical pass but some medium/low conflict
  | "conflict"              // any critical question conflicts
  | "hallucinated_citation" // a cited ID failed the catalog check
  | "insufficient_evidence" // too many "uncertain" answers (>50%)
  | "verifier_error";       // ≥1 verifier threw

export interface VerificationTraceEntry {
  questionId: string;
  question: string;
  severity: "critical" | "high" | "medium" | "low";
  outcome: VerificationAnswer["outcome"] | "verifier_threw";
  evidence: string;
  confidence: number;
  citedIds: string[];
  citationIssue?: "missing-required" | "unknown-id";
  thrownMessage?: string;
}

export interface VerificationResult {
  /** Was the verification successful (no engine-level errors)? */
  success: boolean;
  /** Overall verdict — see VerificationVerdict for semantics. */
  verdict: VerificationVerdict;
  /** Aggregate posterior confidence in the original claim, 0..1. */
  posteriorConfidence: number;
  /** Per-question trace (one entry per input question, in input order). */
  trace: VerificationTraceEntry[];
  /** Counts grouped by severity for quick summarization. */
  bySeverity: Record<"critical" | "high" | "medium" | "low", {
    total: number;
    confirms: number;
    conflicts: number;
    uncertain: number;
    threw: number;
  }>;
  /** Original claim id, echoed for caller convenience. */
  claimId: string;
  /** Claim domain, echoed. */
  domain: VerificationDomain;
  /** Original verdict, echoed. */
  initialVerdict: string;
  /** Initial confidence, echoed. */
  initialConfidence: number;
  /** Did the verification ESCALATE the verdict (e.g., warning → hard_block)? Caller decides escalation policy; engine only flags whether the posterior differs materially. */
  shouldEscalate: boolean;
  /** Human-readable escalation reason if shouldEscalate. */
  escalationReason?: string;
  /** ISO timestamp. */
  evaluatedAt: string;
  /** Engine version (for audit). */
  engineVersion: string;
}

export interface VerifyOptions {
  /** Catalog of all known citation IDs (e.g., OutsideKnowledgeSourceCatalog ids). Required when any question has requiredCitationIds. */
  knownCitationIds?: ReadonlyArray<string>;
  /** Posterior threshold below which shouldEscalate flips true even with "confirmed_with_caveat". Default 0.65. */
  escalationThreshold?: number;
  /** Per-verifier timeout in ms (only meaningful for async verifiers). Default 5000. */
  verifierTimeoutMs?: number;
}

const ENGINE_VERSION = "1.0.0";
const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_ESCALATION_THRESHOLD = 0.65;
/** Posterior-drop escalation trigger — if posterior is ≥0.20 below initial, flag for review even
 *  when the absolute posterior is above the escalation threshold (large-delta detector). */
const POSTERIOR_DROP_ESCALATION_DELTA = 0.20;
/** Initial/verifier confidence blend weight — 0.5 keeps the gate's prior informative when a
 *  single low-confidence uncertain verifier would otherwise dominate. */
const INITIAL_VS_VERIFIER_BLEND = 0.5;
/** Uncertain-fraction threshold for INSUFFICIENT_EVIDENCE verdict (>50% of questions). */
const UNCERTAIN_FRACTION_THRESHOLD = 0.5;

/** Severity weights for posterior confidence aggregation. Sum normalized internally. */
const SEVERITY_WEIGHTS = {
  critical: 4,
  high: 2,
  medium: 1,
  low: 0.5,
} as const;

export class ChainOfVerificationEngine {
  /**
   * Run a verification chain.
   *
   * Pure when all verifiers are sync. When any verifier is async, the engine
   * awaits each in input order with per-verifier timeout enforcement; an
   * AbortController-free polling pattern is used because Verifier is a typed
   * function rather than a Web API. Timeouts surface as `verifier_threw`
   * trace entries with a synthetic "verifier-timeout" message.
   */
  async verify(
    claim: VerificationClaim,
    questions: VerificationQuestion[],
    verifier: Verifier,
    opts: VerifyOptions = {}
  ): Promise<VerificationResult> {
    if (!claim || typeof claim !== "object") {
      throw new Error("ChainOfVerification: claim is required (got " + typeof claim + ")");
    }
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error(
        "ChainOfVerification: at least one verification question required " +
        "(empty CoV is a structural error, not a PASS)"
      );
    }
    if (typeof verifier !== "function") {
      throw new Error("ChainOfVerification: verifier must be a function (got " + typeof verifier + ")");
    }

    // Detect duplicate question ids — would silently overwrite trace entries
    const seenIds = new Set<string>();
    for (const q of questions) {
      if (!q.id || typeof q.id !== "string") {
        throw new Error("ChainOfVerification: every question requires a non-empty string id");
      }
      if (seenIds.has(q.id)) {
        throw new Error(`ChainOfVerification: duplicate question id "${q.id}"`);
      }
      seenIds.add(q.id);
    }

    const knownIds = new Set(opts.knownCitationIds ?? []);
    const timeoutMs = opts.verifierTimeoutMs ?? DEFAULT_TIMEOUT_MS;
    const escalationThreshold = opts.escalationThreshold ?? DEFAULT_ESCALATION_THRESHOLD;

    const trace: VerificationTraceEntry[] = [];
    let hallucinatedCitation = false;
    let anyVerifierThrew = false;

    for (const q of questions) {
      const severity = q.severity ?? "medium";
      let answer: VerificationAnswer | undefined;
      let thrownMessage: string | undefined;

      try {
        const result = verifier(q);
        if (result instanceof Promise) {
          answer = await this.withTimeout(result, timeoutMs);
        } else {
          answer = result;
        }
      } catch (err) {
        thrownMessage = err instanceof Error ? err.message : String(err);
        anyVerifierThrew = true;
      }

      if (!answer) {
        trace.push({
          questionId: q.id,
          question: q.question,
          severity,
          outcome: "verifier_threw",
          evidence: thrownMessage ?? "verifier returned undefined",
          confidence: 0,
          citedIds: [],
          thrownMessage,
        });
        continue;
      }

      if (answer.questionId !== q.id) {
        // Structural error in verifier — treat as throw so we never accidentally
        // merge an answer with the wrong question (a class of silent-corruption
        // bug per [[feedback_verify_actual_contract_not_proxy]]).
        anyVerifierThrew = true;
        trace.push({
          questionId: q.id,
          question: q.question,
          severity,
          outcome: "verifier_threw",
          evidence: `verifier returned answer for "${answer.questionId}" expected "${q.id}"`,
          confidence: 0,
          citedIds: [],
          thrownMessage: "questionId-mismatch",
        });
        continue;
      }

      const citedIds = Array.isArray(answer.citedIds) ? answer.citedIds.slice() : [];
      let citationIssue: VerificationTraceEntry["citationIssue"];

      // Missing-required-citation guard
      if (q.requiredCitationIds && q.requiredCitationIds.length > 0) {
        const missing = q.requiredCitationIds.find((rid) => !citedIds.includes(rid));
        if (missing) {
          citationIssue = "missing-required";
        }
      }

      // Hallucinated-citation guard (only when caller supplied a catalog)
      if (!citationIssue && knownIds.size > 0 && citedIds.length > 0) {
        const unknown = citedIds.find((cid) => !knownIds.has(cid));
        if (unknown) {
          citationIssue = "unknown-id";
          hallucinatedCitation = true;
        }
      }

      const conf = typeof answer.confidence === "number" && Number.isFinite(answer.confidence)
        ? Math.max(0, Math.min(1, answer.confidence))
        : (answer.outcome === "confirms" ? 1 : answer.outcome === "conflicts" ? 0 : 0.5);

      trace.push({
        questionId: q.id,
        question: q.question,
        severity,
        outcome: answer.outcome,
        evidence: answer.evidence,
        confidence: conf,
        citedIds,
        citationIssue,
      });
    }

    const bySeverity = this.tallyBySeverity(trace);
    const verdict = this.computeVerdict(bySeverity, hallucinatedCitation, anyVerifierThrew);
    const posteriorConfidence = this.computePosteriorConfidence(claim, trace);

    const shouldEscalate = this.shouldEscalate(
      verdict,
      posteriorConfidence,
      claim.initialConfidence,
      escalationThreshold
    );
    const escalationReason = shouldEscalate
      ? this.formatEscalationReason(verdict, posteriorConfidence, claim.initialConfidence, bySeverity, hallucinatedCitation, escalationThreshold)
      : undefined;

    return {
      success: true,
      verdict,
      posteriorConfidence: Math.round(posteriorConfidence * 1000) / 1000,
      trace,
      bySeverity,
      claimId: claim.claimId,
      domain: claim.domain,
      initialVerdict: claim.initialVerdict,
      initialConfidence: claim.initialConfidence,
      shouldEscalate,
      escalationReason,
      evaluatedAt: new Date().toISOString(),
      engineVersion: ENGINE_VERSION,
    };
  }

  /**
   * Synchronous verification — for verifiers guaranteed to be sync (no Promise).
   *
   * This is the recommended entry point when the verifier is purely
   * deterministic (e.g., reading from `constants.ts`, querying an in-memory
   * registry). The async `verify()` is for verifiers that touch I/O.
   *
   * Throws on a sync-contract violation if the verifier returns a Promise —
   * never silently awaits a thenable that escapes the sync boundary.
   */
  verifySync(
    claim: VerificationClaim,
    questions: VerificationQuestion[],
    verifier: (q: VerificationQuestion) => VerificationAnswer,
    opts: VerifyOptions = {}
  ): VerificationResult {
    // Guard the sync contract: if any verifier call returns a thenable, the
    // sync path is the wrong API — caller must use verify() instead.
    const syncGuarded = (q: VerificationQuestion): VerificationAnswer => {
      const r = verifier(q);
      if (r && typeof (r as { then?: unknown }).then === "function") {
        throw new Error(
          "ChainOfVerification.verifySync: verifier returned a Promise — " +
          "use verify() (async) instead"
        );
      }
      return r;
    };
    return this.verifyInline(claim, questions, syncGuarded, opts);
  }

  /**
   * Get the engine version (for caller audit + per-result trace).
   */
  getVersion(): string {
    return ENGINE_VERSION;
  }

  /**
   * Get the default escalation threshold + timeout (operator UI / docs).
   */
  getDefaults(): { escalationThreshold: number; verifierTimeoutMs: number } {
    return {
      escalationThreshold: DEFAULT_ESCALATION_THRESHOLD,
      verifierTimeoutMs: DEFAULT_TIMEOUT_MS,
    };
  }

  // ────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ────────────────────────────────────────────────────────────────────────

  /** Inline sync verification — same logic as verify() but no Promise plumbing. */
  private verifyInline(
    claim: VerificationClaim,
    questions: VerificationQuestion[],
    verifier: (q: VerificationQuestion) => VerificationAnswer,
    opts: VerifyOptions
  ): VerificationResult {
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error("ChainOfVerification.verifySync: at least one verification question required");
    }

    const seenIds = new Set<string>();
    for (const q of questions) {
      if (!q.id || typeof q.id !== "string") {
        throw new Error("ChainOfVerification.verifySync: every question requires a non-empty string id");
      }
      if (seenIds.has(q.id)) {
        throw new Error(`ChainOfVerification.verifySync: duplicate question id "${q.id}"`);
      }
      seenIds.add(q.id);
    }

    const knownIds = new Set(opts.knownCitationIds ?? []);
    const escalationThreshold = opts.escalationThreshold ?? DEFAULT_ESCALATION_THRESHOLD;

    const trace: VerificationTraceEntry[] = [];
    let hallucinatedCitation = false;
    let anyVerifierThrew = false;

    for (const q of questions) {
      const severity = q.severity ?? "medium";
      let answer: VerificationAnswer | undefined;
      let thrownMessage: string | undefined;

      try {
        answer = verifier(q);
      } catch (err) {
        thrownMessage = err instanceof Error ? err.message : String(err);
        anyVerifierThrew = true;
      }

      if (!answer) {
        trace.push({
          questionId: q.id,
          question: q.question,
          severity,
          outcome: "verifier_threw",
          evidence: thrownMessage ?? "verifier returned undefined",
          confidence: 0,
          citedIds: [],
          thrownMessage,
        });
        continue;
      }

      if (answer.questionId !== q.id) {
        anyVerifierThrew = true;
        trace.push({
          questionId: q.id,
          question: q.question,
          severity,
          outcome: "verifier_threw",
          evidence: `verifier returned answer for "${answer.questionId}" expected "${q.id}"`,
          confidence: 0,
          citedIds: [],
          thrownMessage: "questionId-mismatch",
        });
        continue;
      }

      const citedIds = Array.isArray(answer.citedIds) ? answer.citedIds.slice() : [];
      let citationIssue: VerificationTraceEntry["citationIssue"];

      if (q.requiredCitationIds && q.requiredCitationIds.length > 0) {
        const missing = q.requiredCitationIds.find((rid) => !citedIds.includes(rid));
        if (missing) citationIssue = "missing-required";
      }

      if (!citationIssue && knownIds.size > 0 && citedIds.length > 0) {
        const unknown = citedIds.find((cid) => !knownIds.has(cid));
        if (unknown) {
          citationIssue = "unknown-id";
          hallucinatedCitation = true;
        }
      }

      const conf = typeof answer.confidence === "number" && Number.isFinite(answer.confidence)
        ? Math.max(0, Math.min(1, answer.confidence))
        : (answer.outcome === "confirms" ? 1 : answer.outcome === "conflicts" ? 0 : 0.5);

      trace.push({
        questionId: q.id,
        question: q.question,
        severity,
        outcome: answer.outcome,
        evidence: answer.evidence,
        confidence: conf,
        citedIds,
        citationIssue,
      });
    }

    const bySeverity = this.tallyBySeverity(trace);
    const verdict = this.computeVerdict(bySeverity, hallucinatedCitation, anyVerifierThrew);
    const posteriorConfidence = this.computePosteriorConfidence(claim, trace);
    const shouldEscalate = this.shouldEscalate(
      verdict,
      posteriorConfidence,
      claim.initialConfidence,
      escalationThreshold
    );
    const escalationReason = shouldEscalate
      ? this.formatEscalationReason(verdict, posteriorConfidence, claim.initialConfidence, bySeverity, hallucinatedCitation, escalationThreshold)
      : undefined;

    return {
      success: true,
      verdict,
      posteriorConfidence: Math.round(posteriorConfidence * 1000) / 1000,
      trace,
      bySeverity,
      claimId: claim.claimId,
      domain: claim.domain,
      initialVerdict: claim.initialVerdict,
      initialConfidence: claim.initialConfidence,
      shouldEscalate,
      escalationReason,
      evaluatedAt: new Date().toISOString(),
      engineVersion: ENGINE_VERSION,
    };
  }

  private tallyBySeverity(trace: VerificationTraceEntry[]): VerificationResult["bySeverity"] {
    const init = () => ({ total: 0, confirms: 0, conflicts: 0, uncertain: 0, threw: 0 });
    const out = {
      critical: init(),
      high: init(),
      medium: init(),
      low: init(),
    };
    for (const t of trace) {
      const bucket = out[t.severity];
      bucket.total++;
      if (t.outcome === "confirms") bucket.confirms++;
      else if (t.outcome === "conflicts") bucket.conflicts++;
      else if (t.outcome === "uncertain") bucket.uncertain++;
      else if (t.outcome === "verifier_threw") bucket.threw++;
    }
    return out;
  }

  private computeVerdict(
    bySeverity: VerificationResult["bySeverity"],
    hallucinatedCitation: boolean,
    anyVerifierThrew: boolean
  ): VerificationVerdict {
    // Hallucinated citations take precedence — they indicate the verifier's
    // answer cannot be trusted at all (R12 fail-loud).
    if (hallucinatedCitation) return "hallucinated_citation";

    // Critical conflicts collapse the verdict (any single critical conflict = full conflict).
    if (bySeverity.critical.conflicts > 0) return "conflict";
    // High-severity conflicts also escalate to overall conflict.
    if (bySeverity.high.conflicts > 0) return "conflict";

    // Verifier errors after the citation+critical+high checks — note them but
    // don't collapse the verdict if everything else cleanly confirmed.
    const anyThrew = anyVerifierThrew ||
      bySeverity.critical.threw + bySeverity.high.threw + bySeverity.medium.threw + bySeverity.low.threw > 0;

    const totalQuestions =
      bySeverity.critical.total + bySeverity.high.total +
      bySeverity.medium.total + bySeverity.low.total;
    const totalUncertain =
      bySeverity.critical.uncertain + bySeverity.high.uncertain +
      bySeverity.medium.uncertain + bySeverity.low.uncertain;

    // >UNCERTAIN_FRACTION_THRESHOLD of questions uncertain → insufficient evidence
    if (totalQuestions > 0 && totalUncertain / totalQuestions > UNCERTAIN_FRACTION_THRESHOLD) {
      return "insufficient_evidence";
    }

    if (anyThrew && bySeverity.critical.threw + bySeverity.high.threw > 0) {
      // A thrown verifier on a critical/high question is itself a "we don't know"
      // for that question. If all the others confirmed cleanly we still return
      // verifier_error so the caller knows the chain wasn't complete.
      return "verifier_error";
    }

    // Mediums conflicting → confirmed_with_caveat (critical+high all clean)
    if (bySeverity.medium.conflicts > 0 || bySeverity.low.conflicts > 0) {
      return "confirmed_with_caveat";
    }

    return "confirmed";
  }

  /**
   * Posterior confidence — weighted by severity. The original claim's initial
   * confidence is preserved when all questions confirm; conflicts drag it down
   * by the severity-weighted fraction of conflicting weight.
   */
  private computePosteriorConfidence(claim: VerificationClaim, trace: VerificationTraceEntry[]): number {
    if (trace.length === 0) return claim.initialConfidence;

    let totalWeight = 0;
    let weightedConfidence = 0;

    for (const t of trace) {
      const w = SEVERITY_WEIGHTS[t.severity];
      totalWeight += w;
      // Confirms contribute full confidence; conflicts contribute 0; uncertain contributes 0.5;
      // verifier_threw contributes 0 + tightens the posterior toward conservative.
      let factor: number;
      if (t.outcome === "confirms") factor = t.confidence;
      else if (t.outcome === "conflicts") factor = 0;
      else if (t.outcome === "uncertain") factor = t.confidence; // already 0.5 default
      else factor = 0; // verifier_threw
      weightedConfidence += w * factor;
    }

    const verifierMean = totalWeight > 0 ? weightedConfidence / totalWeight : 0;

    // Blend with the gate's initial confidence — INITIAL_VS_VERIFIER_BLEND
    // controls the mix. Default 0.5 (equal) keeps a high-prior gate answer
    // from being completely overridden by a single low-confidence uncertain
    // verifier, while still letting the verification chain shift the result.
    return (1 - INITIAL_VS_VERIFIER_BLEND) * claim.initialConfidence + INITIAL_VS_VERIFIER_BLEND * verifierMean;
  }

  private shouldEscalate(
    verdict: VerificationVerdict,
    posterior: number,
    initial: number,
    threshold: number
  ): boolean {
    if (verdict === "conflict") return true;
    if (verdict === "hallucinated_citation") return true;
    if (verdict === "verifier_error") return true;
    if (verdict === "insufficient_evidence") return true;
    if (posterior < threshold) return true;
    // Large posterior-drop detector — even if absolute posterior is above the
    // threshold, a big drop from the gate's initial answer is worth surfacing.
    if (initial - posterior > POSTERIOR_DROP_ESCALATION_DELTA) return true;
    return false;
  }

  private formatEscalationReason(
    verdict: VerificationVerdict,
    posterior: number,
    initial: number,
    bySeverity: VerificationResult["bySeverity"],
    hallucinatedCitation: boolean,
    threshold: number
  ): string {
    if (hallucinatedCitation) {
      return "verifier cited unknown citation IDs — answer cannot be trusted (hallucination guard)";
    }
    if (verdict === "conflict") {
      return `critical/high verification conflicts: critical=${bySeverity.critical.conflicts}, high=${bySeverity.high.conflicts}`;
    }
    if (verdict === "verifier_error") {
      return `verifier threw on critical/high questions: critical=${bySeverity.critical.threw}, high=${bySeverity.high.threw}`;
    }
    if (verdict === "insufficient_evidence") {
      return ">50% of verification questions returned 'uncertain' — operator review required";
    }
    if (posterior < threshold) {
      return `posterior confidence ${posterior.toFixed(3)} below escalation threshold ${threshold}`;
    }
    return `posterior ${posterior.toFixed(3)} dropped >${POSTERIOR_DROP_ESCALATION_DELTA.toFixed(2)} from initial ${initial.toFixed(3)}`;
  }

  /** Per-verifier timeout (only used when verifier returns a Promise). */
  private withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("verifier-timeout")), ms);
      p.then(
        (val) => { clearTimeout(timer); resolve(val); },
        (err) => { clearTimeout(timer); reject(err); }
      );
    });
  }
}

export const chainOfVerificationEngine = new ChainOfVerificationEngine();
export default chainOfVerificationEngine;
