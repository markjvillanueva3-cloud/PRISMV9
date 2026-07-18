/**
 * Domain AGI Adapter Kit — INFRA-AGI-ROUTER-MS2/P1-U01
 * =====================================================
 *
 * Shared contract-adapter scaffolding factored out of the 3 domain
 * orchestrate() adapters shipped in P0-U02/U03/U04. Prior to this kit, ~80
 * lines of identical helper code were quadruplicated across:
 *
 *   - mcp-server/src/engines/MillingAGIMasterEngine.ts     (P0-U02, 58345a0a74)
 *   - mcp-server/src/engines/LatheAGIKnowledgeUnificationEngine.ts (P0-U03, e7883b0360)
 *   - mcp-server/src/engines/WireEDMAGIOrchestrator.ts     (P0-U04, 6d9430f27e)
 *
 * The kit exports the 8 shared primitives every adapter needs:
 *
 *   constants:    ORCHESTRATE_OUTCOME_TOPIC, ORCHESTRATE_STAGE
 *   guards:       vitestConsensusGuard(engineName)
 *   seam stubs:   makeDefaultConsensusVote({engineName, callerEngine})
 *                 publishOutcomeToFeedbackBus(event)
 *   result helpers: makeFailResult({code, message, stage})
 *                   makeOutcomeEvent({...})
 *                   rollupJointConfidence(decisions)
 *
 * Each helper is a PURE FUNCTION — no module-level state, no dispatcher
 * imports (engines must not depend on the dispatcher layer; the kit is
 * lower-layer than every adapter that uses it). The kit re-exports nothing
 * from the contract schema; consumers import `DomainAGIResult` etc. from
 * `domainAGIContract.js` themselves.
 *
 * ─── DESIGN NOTES ───────────────────────────────────────────────────────────
 *
 * Why a factory for the consensus seam (not a single shared function):
 *   The engine NAME is interpolated into the VITEST guard's error message AND
 *   into MultiModelConsensusEngine.ask's `callerEngine` field (so the
 *   ConsensusAuditLog can attribute the vote). A single shared function would
 *   either lose that attribution or require a `callerEngine` arg on every
 *   call. Factory closes over engineName once → call site is clean.
 *
 * Why outcome events carry `domain` as a parameter (not inferred from engine):
 *   The engine NAME (e.g. "WireEDMAGIOrchestrator") and the contract DOMAIN
 *   (e.g. "wedm") are two different fields with two different consumers. The
 *   OutcomeCaptureBus subscribers route on `domain`; debugging traces route
 *   on `engine`. Coupling them in the kit would break the lathe AGI's planned
 *   future split into "lathe" vs "swiss" sub-domains.
 *
 * Why `failResult` does not accept warnings[]:
 *   In all 3 current adapters, the failure path is reached BEFORE any
 *   warnings accumulate (failures happen in stages 1-4: validation, intent
 *   mapping, AGI reasoning, safety gate). If a future adapter needs to
 *   surface warnings on a failure, it can spread them in at the call site:
 *   `{...kit.makeFailResult(...), warnings: collected}`.
 *
 * Why rollup is product (joint-probability), not min or geometric mean:
 *   Mill/Lathe/Wedm picks (strategy, param, safety) are SERIAL — each
 *   decision conditioned on the prior. Joint probability of independent
 *   decisions is the product. Min would under-weight strong picks; geometric
 *   mean would under-penalize a weak pick on a critical decision. The
 *   domainAGIContract design note pins this as joint-probability for serial,
 *   max-of-parallel; this kit implements the serial case.
 *
 * ─── TIE-UP for later iteration ──────────────────────────────────────────────
 *
 * This kit ships in P1-U01 as a pure addition — the 3 P0 adapters are NOT
 * retrofitted yet. Retrofit is P1-U02 (mill), P1-U03 (lathe), P1-U04 (wedm),
 * each touching only its own engine. Splitting the retrofit per-engine
 * avoids the 3-engine cross-claim collision class that bit P0-U05-TESTS
 * (see reference_p0_u05_tests_misattribution_2026_05_21).
 *
 * @module engines/domainAGIAdapterKit
 * @milestone INFRA-AGI-ROUTER-MS2/P1-U01
 * @version 1.0.0
 */

import { randomUUID } from "node:crypto";

import type { DomainAGIIntent, DomainAGIResult, DomainKindT } from "../schemas/domainAGIContract.js";
import { DOMAIN_AGI_CONTRACT_VERSION } from "../schemas/domainAGIContract.js";
import type { OutcomeEvent } from "../schemas/outcomeEventSchema.js";
import { feedbackBusEngine } from "./FeedbackBusEngine.js";

// ─── Shared constants ────────────────────────────────────────────────────────

/**
 * Topic name on the OutcomeCaptureBus that every domain AGI's outcome events
 * publish to. Subscribers (PhysicsOutcomeCalibrator, PolicyExperienceLedger,
 * CrossProcessNeuralLearningEngine) subscribe to this topic and discriminate
 * by event.domain. Pinned by the domainAGIContract; do not change without
 * notifying every downstream consumer.
 */
export const ORCHESTRATE_OUTCOME_TOPIC = "outcome.recorded" as const;

/**
 * Pipeline-stage token threaded through outcome events so subscribers can
 * filter to just the domain-AGI dispatch path (vs the legacy per-domain
 * orchestrate() surfaces). Used as `event.context.pipeline_stage`.
 */
export const ORCHESTRATE_STAGE = "domain_agi_orchestrate" as const;

// ─── Shared types ────────────────────────────────────────────────────────────

/**
 * Shape of a consensus vote question fanned out to MultiModelConsensusEngine.
 * Mirrors the per-domain ConsensusQuery types in U02/U03/U04 — those types
 * carry the per-domain `decisionKind` enum locally; the kit takes that as a
 * stringly-typed param so it doesn't pull the per-domain enums into a
 * shared module.
 */
export interface ConsensusVoteQuery {
  question: string;
  options: string[];
  /** Stringly-typed kind (e.g. "strategy", "tool", "safety") — adapter's own enum. */
  decisionKind: string;
}

/** Shape of the verdict adapters expect back from the seam. */
export interface ConsensusVoteVerdict {
  answer: string;
  confidence: number;
  voters: string[];
  /** Optional pointer into consensus-decisions.jsonl (UNSET unless the seam returns one — R12). */
  auditId?: string;
}

/** Shape of a single outcome event the kit constructs. */
export interface OutcomeEventInput {
  intent: DomainAGIIntent;
  /** Per-decision lineage id (random uuid). */
  lineageId: string;
  /** Per-orchestrate-call shared job id. */
  jobId: string;
  /** Engine that emitted the event (e.g. "WireEDMAGIOrchestrator"). */
  engineName: string;
  /** Contract domain (e.g. "wedm"). Distinct from engineName by design. */
  domain: DomainKindT;
  /** Stringly-typed decision kind from the adapter's own enum. */
  decisionKind: string;
  /** The recommended value (selected pick, after consensus gating if applied). */
  value: unknown;
  /** Per-decision confidence in [0, 1]. */
  confidence: number;
  /** Optional consensus audit pointer (only present if the seam returned one). */
  consensusAuditId?: string;
}

/** Shape of a uniform failure result. */
export interface FailResultInput {
  code: string;
  message: string;
  stage: string;
}

// ─── Guards ──────────────────────────────────────────────────────────────────

/**
 * Test-env footgun guard for the default consensus seam.
 *
 * The real seam fans out to Claude / Codex / Gemini / Ollama subprocess + HTTP
 * calls. A unit test that sets `consensusRequired: true` and forgets to inject
 * a fake would silently hit the network — that's an R12 violation (silent
 * non-determinism). This guard fails loud instead.
 *
 * Throws when `process.env.VITEST !== undefined || process.env.NODE_ENV === "test"`.
 * Adapter calls this as the first line of its `defaultConsensusVote` factory
 * so the throw happens BEFORE the lazy MultiModelConsensusEngine import.
 *
 * @param engineName Engine identifier interpolated into the error (e.g. "MillingAGIMasterEngine")
 * @throws Error with a deterministic message naming the engine + remediation
 */
export function vitestConsensusGuard(engineName: string): void {
  if (process.env.VITEST !== undefined || process.env.NODE_ENV === "test") {
    throw new Error(
      `${engineName}.orchestrate: consensusRequired=true under a test runner ` +
        `without an injected consensusDecide fake — pass opts.consensusDecide to avoid a real model call.`,
    );
  }
}

// ─── Default seams ───────────────────────────────────────────────────────────

/**
 * Factory producing the default consensus-vote seam for one adapter.
 *
 * The factory closes over engineName (used in the VITEST guard + the
 * MultiModelConsensusEngine `callerEngine` attribution). Returned function
 * is async-lazy: it imports `MultiModelConsensusEngine` on first call so
 * adapters that never set `consensusRequired` don't pay its load cost.
 *
 * Fails soft on a null consensus (all voices down) — returns the engine's
 * first option as `answer` so `orchestrate()` degrades gracefully instead
 * of throwing. Adapters can override by injecting `opts.consensusDecide`.
 *
 * @example
 * const defaultConsensusVote = makeDefaultConsensusVote({
 *   engineName: "MillingAGIMasterEngine",
 *   callerEngine: "MillingAGIMasterEngine",
 * });
 *
 * @param engineName Engine identifier for the VITEST guard
 * @param callerEngine Attribution string passed to MultiModelConsensusEngine.ask
 * @returns Async function matching the adapter's `*ConsensusFn` shape
 */
export function makeDefaultConsensusVote(opts: {
  engineName: string;
  callerEngine: string;
}): (query: ConsensusVoteQuery) => Promise<ConsensusVoteVerdict> {
  return async (query: ConsensusVoteQuery): Promise<ConsensusVoteVerdict> => {
    vitestConsensusGuard(opts.engineName);
    const { multiModelConsensusEngine } = await import("./MultiModelConsensusEngine.js");
    const result = await multiModelConsensusEngine.ask({
      prompt: query.question,
      mode: "vote",
      voteOptions: query.options,
      persist: true,
      callerEngine: opts.callerEngine,
    });
    const winner = result.consensus;
    // auditId intentionally UNSET — ConsensusAuditLogEngine.append() returns
    // void and the persisted row carries no retrievable id. Fabricating a
    // "pointer into consensus-decisions.jsonl" that dereferences to nothing
    // would violate R12. See the per-domain ConsensusVerdict.auditId docs.
    return {
      answer: winner?.answer ?? query.options[0],
      confidence: winner?.confidence ?? result.agreementScore ?? 0,
      voters: winner?.voters ?? [],
    };
  };
}

/**
 * Default outcome-event seam — publish to the in-process MS1 feedback bus.
 *
 * Pure delegation, but factored to the kit so:
 *   (a) the topic constant lives in one place
 *   (b) future migration of the bus target (e.g. to an out-of-process queue)
 *       changes ONE call site instead of three
 *
 * @param event Outcome event built by makeOutcomeEvent
 */
export function publishOutcomeToFeedbackBus(event: OutcomeEvent): void {
  feedbackBusEngine.publish(ORCHESTRATE_OUTCOME_TOPIC, event);
}

// ─── Result builders ─────────────────────────────────────────────────────────

/**
 * Construct a uniform failure DomainAGIResult.
 *
 * Replaces 3 identical private `failResult()` methods (one per adapter).
 * The contract guarantees: `success=false` MUST populate `error` (enforced
 * by DomainAGIResultSchema.superRefine); this helper makes that impossible
 * to forget.
 *
 * @returns DomainAGIResult with success=false, empty decisions/outcomes,
 *          confidence=0, no warnings (per design note in the kit doc)
 */
export function makeFailResult(input: FailResultInput): DomainAGIResult {
  return {
    schemaVersion: DOMAIN_AGI_CONTRACT_VERSION,
    success: false,
    decisions: [],
    confidence: 0,
    outcomes: [],
    error: { code: input.code, message: input.message, stage: input.stage },
    warnings: [],
  };
}

/**
 * Construct a v1.1.0 `cross_process_decision` outcome event for one decision.
 *
 * Replaces 3 identical private `buildOutcomeEvent()` methods. The event
 * targets OutcomeCaptureBus 1.1.0 (cross_process_decision kind +
 * consensus_audit_id context field were both added in
 * INFRA-NEURAL-LEDGER-MS1/P0-U01 specifically to support this surface).
 *
 * @returns OutcomeEvent ready to publish via publishOutcomeToFeedbackBus
 */
export function makeOutcomeEvent(input: OutcomeEventInput): OutcomeEvent {
  const context: OutcomeEvent["context"] = {
    engine: input.engineName,
    action: input.intent.action,
    material: input.intent.material,
    operation: input.decisionKind,
    pipeline_stage: ORCHESTRATE_STAGE,
    job_id: input.jobId,
  };
  if (input.consensusAuditId) context.consensus_audit_id = input.consensusAuditId;
  return {
    schemaVersion: "1.1.0",
    event_id: randomUUID(),
    lineage_id: input.lineageId,
    domain: input.domain,
    kind: "cross_process_decision",
    severity: "info",
    source: "system",
    timestamp: new Date().toISOString(),
    context,
    recommended: input.value,
    confidence: input.confidence,
  };
}

/**
 * Roll a sequence of per-decision confidences into the pipeline-level
 * confidence the DomainAGIResult contract requires.
 *
 * Uses joint probability (product) for serial decisions, per the
 * domainAGIContract design note ("joint-probability for serial,
 * max-of-parallel"). Mill/Lathe/Wedm picks are serial (strategy → param →
 * safety, each conditioned on the prior).
 *
 * Edge cases:
 *   - empty decisions → 1.0 (vacuous truth; no decisions = no uncertainty)
 *   - any confidence outside [0,1] → clamped at the call site by Zod;
 *     this helper assumes valid input
 *
 * @param decisions Per-decision confidences to roll up
 * @returns Joint probability in [0, 1]
 */
export function rollupJointConfidence(
  decisions: ReadonlyArray<{ confidence: number }>,
): number {
  return decisions.reduce((acc, d) => acc * d.confidence, 1);
}
