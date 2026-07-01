---
name: reference-infra-agi-router-ms2-p1-u01-2026-05-21
description: INFRA-AGI-ROUTER-MS2/P1-U01 — domainAGIAdapterKit.ts extracted 2026-05-21 slot charlie /loop iter 5, factors ~80 lines of triplicated scaffolding out of Mill/Lathe/WEDM AGI adapters
aliases: reference_infra_agi_router_ms2_p1_u01_2026_05_21
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.622Z
---


# INFRA-AGI-ROUTER-MS2/P1-U01 — domainAGIAdapterKit extracted

2026-05-21, slot charlie /loop iter 5, commit `7aa913ef26`. First unit of INFRA-AGI-ROUTER-MS2 P1 phase. Closes the TIE-UP debt named in [[reference_infra_agi_router_ms2_p0_complete_2026_05_21]] (~80 lines of contract-adapter scaffolding QUADRUPLICATED across P0-U02 mill / P0-U03 lathe / P0-U04 wedm).

**What shipped** — `mcp-server/src/engines/domainAGIAdapterKit.ts` (323 LOC) + companion test (313 LOC, 21/21 PASS). Pure ADDITION — no P0 adapter retrofitted yet; that's P1-U02/U03/U04 (per-engine, see "retrofit deferred" below).

**8 exports** —
| Symbol | Replaces in adapters | Description |
|--------|---------------------|-------------|
| `ORCHESTRATE_OUTCOME_TOPIC` | const `"outcome.recorded"` | Canonical feedback-bus topic for the domain-AGI surface |
| `ORCHESTRATE_STAGE` | const `"domain_agi_orchestrate"` | Pipeline-stage token threaded through outcome events |
| `vitestConsensusGuard(engineName)` | inline VITEST/NODE_ENV guard | Throws fail-loud if a test uses `consensusRequired: true` without an injected fake (R12) |
| `makeDefaultConsensusVote({engineName, callerEngine})` | per-adapter `defaultConsensusDecide` | Factory closing over engine name + caller-engine attribution; lazy-imports MultiModelConsensusEngine on first call |
| `publishOutcomeToFeedbackBus(event)` | per-adapter `defaultPublishOutcome` | Trivial delegation; factored so future bus-target migration touches one site |
| `makeFailResult({code, message, stage})` | per-adapter private `failResult()` | Uniform DomainAGIResult failure constructor; contract's `success=false ⇒ error` invariant impossible to forget |
| `makeOutcomeEvent({intent, lineageId, jobId, engineName, domain, decisionKind, value, confidence, consensusAuditId?})` | per-adapter private `buildOutcomeEvent()` | Uniform v1.1.0 `cross_process_decision` event constructor; auditId omitted unless provided (R12 — never fabricate pointers) |
| `rollupJointConfidence(decisions)` | per-adapter `decisions.reduce((a,d)=>a*d.confidence,1)` | Joint-probability rollup for serial decisions; vacuous-truth (empty=1.0) + absorbing-zero edges handled |

**Design seams (why a factory, not a single shared function)** — the consensus seam closes over BOTH (a) the engine name (interpolated into VITEST guard error) AND (b) `callerEngine` (attribution string passed to `MultiModelConsensusEngine.ask` so `ConsensusAuditLog` can attribute the vote correctly). A non-factory shared function would either lose the attribution OR require a `callerEngine` arg on every call. Factory closes attribution once → call site is clean.

**Engine NAME vs contract DOMAIN decoupling** — `makeOutcomeEvent` takes BOTH `engineName` and `domain` as parameters (not inferred from each other). Reason: engine name (e.g. `"WireEDMAGIOrchestrator"`) and contract domain (e.g. `"wedm"`) are two different fields with two different consumers — OutcomeCaptureBus subscribers route on `domain`; debugging traces route on `engine`. Coupling would break the lathe AGI's planned future split into "lathe" vs "swiss" sub-domains.

**21 tests** — 2 constant invariants + 2 VITEST-guard cases + 2 factory closure cases + 2 `makeFailResult` (shape + contract validation) + 7 `makeOutcomeEvent` (v1.1.0 fields, context shape, optional auditId presence/absence, engine/domain decoupling, schema validation, unique event_id) + 5 `rollupJointConfidence` (product math, vacuous truth, single-decision, monotonicity, absorbing zero) + 1 publishOutcomeToFeedbackBus delegation (subscriber + microtask-fan-out + FeedbackEvent.payload unwrap). All assertions are concrete-value checks against real behavior (no `toBeDefined()`-style stubs — pre-empted the TEST-LEGITIMACY gate on iteration 1 of the writeup).

**Test-implementation lessons** — `feedbackBusEngine.subscribe(topic, cb)` returns a `SubscriptionHandle` (NOT an unsubscribe function — needs `feedbackBusEngine.unsubscribe(handle)` to detach). `feedbackBusEngine.publish(topic, payload)` uses `queueMicrotask` for async fan-out → subscriber callback fires on next microtask, so test must `await new Promise(r => setImmediate(r))` before asserting receipt. Bus wraps payload in `FeedbackEvent: { topic, ts, payload }` — published event lives in `.payload`, not at the top level. Caught all three on the first vitest run (1 FAIL of 21 → fixed → 21/21 PASS).

**Retrofit deferred to P1-U02 / U03 / U04 (per-engine)** — each retrofit touches ONE engine (mill / lathe / wedm) so:
1. Misattribution risk per retrofit drops 3× vs a single 3-engine commit (per [[reference_p0_u05_tests_misattribution_2026_05_21]] this session, shared-tree git-add windows reliably swallow concurrent edits).
2. Each engine can be retrofitted in its own slot (mill→alpha, lathe→bravo, wedm→charlie) when the per-domain chat is active, no cross-slot file-claim hazard.
3. Existing per-domain tests stay valid through the retrofit (the kit's seam signatures are identical to the inline ones — typed `ConsensusVoteQuery` ↔ per-domain `*ConsensusQuery`, `ConsensusVoteVerdict` ↔ per-domain `*ConsensusVerdict`). Retrofit is a pure-mechanical search-replace of the constants + private methods.

**TS strictness considerations** — the kit's `ConsensusVoteQuery.decisionKind` is `string` (not a union) because the per-domain decision-kind enums (`MillConsensusDecisionKind`, `LatheConsensusDecisionKind`, `WedmConsensusDecisionKind`) live in their respective engines and forcing a closed enum here would pull all 3 enums into a shared module — exactly the kind of cross-domain coupling the contract was DESIGNED to avoid. Adapters preserve type-safety at their own boundary by typing their `*ConsensusFn` with the per-domain kind enum, then casting to the kit's `ConsensusVoteQuery` at the seam call site (one cast per adapter, ≤2 lines).

**Predecessors** — [[reference_infra_agi_router_ms2_p0_complete_2026_05_21]] (P0 phase ship) · [[reference_infra_agi_router_ms2_p0_u04_2026_05_21]] · [[reference_infra_agi_router_ms2_p0_u03_2026_05_20]] · [[reference_infra_agi_router_ms2_p0_u02_2026_05_20]] · [[reference_infra_agi_router_ms2_p0_u01_2026_05_20]] · [[reference_p0_u05_tests_misattribution_2026_05_21]] (per-file scrutiny + slot-worktree discipline) · [[feedback_no_git_stash_for_test_investigation_2026_05_21]] (recovery doctrine).

**Next** — P1-U02 (mill retrofit) or P1-U03 (lathe retrofit) or P1-U04 (wedm retrofit) — any order, each ~50-line surgical edit per engine. The kit-import pattern: replace per-adapter constants → import from kit; replace per-adapter `defaultConsensusDecide` → `const defaultConsensusDecide = makeDefaultConsensusVote({engineName: "<adapter>", callerEngine: "<adapter>"})`; replace private `failResult` / `buildOutcomeEvent` → kit `makeFailResult` / `makeOutcomeEvent`; replace inline `decisions.reduce(...)` joint-confidence → `rollupJointConfidence(decisions)`. Each retrofit closes one engine; the kit's tests guarantee semantic preservation.
