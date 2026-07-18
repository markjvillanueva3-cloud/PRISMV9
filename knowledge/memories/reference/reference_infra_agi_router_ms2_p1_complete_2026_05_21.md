---
name: reference-infra-agi-router-ms2-p1-complete-2026-05-21
description: INFRA-AGI-ROUTER-MS2 P1 phase COMPLETE 2026-05-21 — kit + 3 per-engine retrofits; whole milestone done (P0 5/5 + P1 4/4 = 9 units)
aliases: reference_infra_agi_router_ms2_p1_complete_2026_05_21
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.622Z
---


# INFRA-AGI-ROUTER-MS2 P1 phase COMPLETE — milestone fully done

2026-05-21, slot charlie /loop iter 5-6. P1 phase eliminates the contract-adapter scaffolding duplication that P0 deliberately left as TIE-UP debt. **The whole INFRA-AGI-ROUTER-MS2 milestone is now complete: P0 5/5 + P1 4/4 = 9 units.**

**P1 ship chain:**
| Unit | SHA | Description | Tests |
|------|-----|-------------|-------|
| P1-U01 | `7aa913ef26` | `domainAGIAdapterKit.ts` — 8 shared primitives (+323 LOC engine, +313 LOC test) | 21/21 |
| P1-U04 | `382fd49aa3` | WireEDMAGIOrchestrator retrofit (−52 net) | 84/85 (1 pre-existing) |
| P1-U02 | `3c48c070b2` | MillingAGIMasterEngine retrofit (−62 net) | 68/68 |
| P1-U03 | `b896074b43` | LatheAGIKnowledgeUnificationEngine retrofit (−66 net) | 63/63 |
| P1-U05 | `ee2ce44dd1` | wire router into `prism_intelligence:process_orchestrate` (+235 LOC, dispatcher + test) | 10/10 |

**P1-U05 dispatcher wiring** — the P0-U05 router (`ProcessIntelligenceRouterEngine.orchestrate`) was a static method reachable only by direct import. P1-U05 exposes it as the `process_orchestrate` MCP action on `prism_intelligence` — the structured-contract sibling of the pre-existing `process_route` (which calls the old free-text `route()`). Callers hand a full `DomainAGIIntent`; the router schema-gates + dispatches; the `DomainAGIResult` round-trips through the MCP content envelope. Malformed intents round-trip as typed `INVALID_INTENT` failures (the router never throws out of the dispatcher). No per-action schema entry — matches the `process_route` precedent (router owns validation; `validateActionParams` passes unschema'd actions through). 10/10 dispatcher round-trip tests cover mill/lathe/wedm dispatch + 3 schema-gate failures + nested-vs-flat param tolerance + the `process_route`-still-registered no-regression check.

**This closes the "completed AND wired" criterion** — the unified router is now invokable as an MCP tool, not just a direct-import static method. INFRA-AGI-ROUTER-MS2 total: **P0 5/5 + P1 5/5 = 10 units.**

Retrofit order: WEDM first (kit was designed from its surface — validates kit coverage before touching the other two), then mill, then lathe. **Net −176 lines** across the 3 engines after the kit's +323 — the dedup math: 3× ~80-line scaffolding blocks collapsed to one shared module + thin per-engine wrappers.

**Retrofit recipe (identical for all 3 engines):**
1. Import block — drop the now-unused `feedbackBusEngine` import (lathe only — mill/wedm already didn't import it post-edit), add the kit import: `makeDefaultConsensusVote, publishOutcomeToFeedbackBus, makeFailResult, makeOutcomeEvent, rollupJointConfidence`. KEEP `DOMAIN_AGI_CONTRACT_VERSION` (still used by the success-return path), `OutcomeEvent` type (still used by `outcomes: OutcomeEvent[]` + the `*PublishOutcomeFn` type), `randomUUID` (still used for jobId + per-decision lineageId).
2. Delete local `const ORCHESTRATE_OUTCOME_TOPIC` + `const ORCHESTRATE_STAGE` — kit owns them; the engine never references them directly (`makeOutcomeEvent` + `publishOutcomeToFeedbackBus` consume them internally).
3. Replace `const defaultConsensusDecide` body — `const <domain>ConsensusKitSeam = makeDefaultConsensusVote({engineName, callerEngine})` at module scope, then `const defaultConsensusDecide: <Domain>ConsensusFn = async (query) => <domain>ConsensusKitSeam({question, options, decisionKind: query.decisionKind})`. The thin wrapper adapts the per-domain `*ConsensusQuery` (narrow `decisionKind` enum) to the kit's `ConsensusVoteQuery` (`decisionKind: string`).
4. Replace `const defaultPublishOutcome` — `= publishOutcomeToFeedbackBus` directly (signatures identical: `(event: OutcomeEvent) => void`).
5. Replace every `return this.failResult(CODE, MSG, STAGE)` → `return makeFailResult({code: CODE, message: MSG, stage: STAGE})`. (4 sites mill, 5 sites lathe, 5 sites wedm.)
6. Replace the 1 `this.buildOutcomeEvent(v, lineageId, jobId, kind, value, conf, auditId)` → `makeOutcomeEvent({intent: v, lineageId, jobId, engineName, domain, decisionKind: kind, value, confidence: conf, ...(auditId ? {consensusAuditId: auditId} : {})})`.
7. Replace inline `const confidence = decisions.reduce((acc, d) => acc * d.confidence, 1)` → `rollupJointConfidence(decisions)`.
8. Delete the private `failResult` + `buildOutcomeEvent` methods (leave a 2-line breadcrumb comment pointing at the kit).

**TS gotcha** — `DOMAIN_AGI_CONTRACT_VERSION` MUST stay imported: the success-path `return { schemaVersion: DOMAIN_AGI_CONTRACT_VERSION, ... }` still uses it even after `failResult`/`buildOutcomeEvent` (the other two consumers) are deleted. WEDM's first retrofit pass dropped it from the import and a stale incremental-tsc cache masked the break — caught on a clean re-run, re-added. **Lesson: after removing private methods, grep the file for every symbol the deleted methods used; some are still live in the surviving code.** Verified all 3 with a clean `tsc --noEmit` → "No errors found".

**Behavior preservation** — every existing adapter test suite stayed green through its retrofit (mill 68/68, lathe 63/63, wedm 84/85 — the 1 wedm fail at test:675 is the documented pre-existing `process()` strategy-logic failure, present since before P0-U04, unrelated). No test was weakened; no assertion touched. The kit's seam signatures are structurally identical to the inline ones, so the retrofit is semantically transparent — exactly the "pure refactor, no contract change" the P0 TIE-UP note predicted.

**Why per-engine units (not one 3-engine commit)** — each retrofit is its own commit touching ONE engine, so the shared-tree git-add window race ([[reference_p0_u05_tests_misattribution_2026_05_21]]) can swallow at most one engine's diff, not all three. In practice all 3 committed cleanly with pathspec-scoped `git commit -- <file>` and zero misattribution this iteration.

**Milestone close-out** — INFRA-AGI-ROUTER-MS2 is DONE. The router (`ProcessIntelligenceRouterEngine.orchestrate`) dispatches mill/lathe/wedm uniformly; all 3 adapters now share one `domainAGIAdapterKit`; ~240 lines of triplicated scaffolding eliminated. Downstream: new domains (5-axis, grinding, edm-sinker) plug in by (a) adding to `DomainKind` enum, (b) writing a thin orchestrate adapter that imports the kit, (c) adding a router dispatch case — the kit means the adapter is now ~60% smaller than the P0 adapters were.

**Predecessors** — [[reference_infra_agi_router_ms2_p1_u01_2026_05_21]] (kit) · [[reference_infra_agi_router_ms2_p0_complete_2026_05_21]] (P0 phase) · [[reference_infra_agi_router_ms2_p0_u04_2026_05_21]] · [[reference_infra_agi_router_ms2_p0_u03_2026_05_20]] · [[reference_infra_agi_router_ms2_p0_u02_2026_05_20]] · [[reference_infra_agi_router_ms2_p0_u01_2026_05_20]] · [[reference_p0_u05_tests_misattribution_2026_05_21]].

**Next** — INFRA-AGI-ROUTER-MS2 is fully done (P0 5/5 + P1 5/5 = 10 units, dispatcher-wired). /loop iter 8+ picks a fresh milestone — no INFRA-AGI-ROUTER work remains. The router is now reachable three ways: direct import (`ProcessIntelligenceRouterEngine.orchestrate`), the `prism_intelligence:process_orchestrate` MCP action, and via the contract any new domain adapter implements. A future milestone could add the remaining domains (5-axis, grinding, edm-sinker) — each is now ~60% less code than the P0 adapters thanks to the kit.
