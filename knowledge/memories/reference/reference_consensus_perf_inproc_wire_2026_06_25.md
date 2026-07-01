---
name: reference_consensus_perf_inproc_wire_2026_06_25
description: India shipped U-CONSENSUS-PERF-INPROC-WIRE (3c459180b2, 2026-06-25) -- closed the octopus vendor-performance loop END-TO-END. ask() now feeds an actual back per vendor via consensusModelPerformanceEngine.recordOutcomeAndPersist, so the recommendVendors READ (which down-selects the fan-out by reward EMA) finally has a WRITE feeding it. The in-process completion of U-CONSENSUS-PERF-PERSIST. 3-of-3 PASS.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.530Z
aliases: reference_consensus_perf_inproc_wire_2026_06_25
---


# U-CONSENSUS-PERF-INPROC-WIRE -- india 2026-06-25 (3c459180b2)

## The gap (the one genuinely-open india unit; sibling of [[reference_consensus_perf_persist_2026_06_25]])
`MultiModelConsensusEngine.ask()` consults `consensusModelPerformanceEngine.recommendVendors` (~L546) to
down-select the consensus fan-out by a per-vendor reward EMA -- but NOTHING fed an actual reward back. The EMA
stayed frozen at cold-start and the `usePerformanceWeights` gate was inert. U-CONSENSUS-PERF-PERSIST added the
WRITE primitives (`saveState` + `recordOutcomeAndPersist`) on the WIRE-EXEMPT `ConsensusModelPerformanceEngine`
but left the in-process caller unwired -- the loop's feedback arrow was still missing.

## Closure (WIRE-EXEMPT -> in-process, NOT a dispatcher action)
- New pure exported helper `deriveVendorRewards(responses, consensus)` (MultiModelConsensusEngine.ts:214): a
  vendor "agreed" iff its MODEL is among `consensus.voters` -> reward 1, else 0. Keyed on `.model` for
  agreement, recorded by `.vendor`. `ok:false` responses + a null consensus contribute nothing; deduped by
  vendor (first ok response wins). Pure (no I/O) -> R9-testable without mocking the ask() fan-out.
- `ask()` now iterates `deriveVendorRewards(responses, finalResult.consensus)` after a round and persists each
  via `recordOutcomeAndPersist(vendor, taskType, reward, {filePath})`. Gated IDENTICALLY to the READ
  (`usePerformanceWeights === true && typeof taskType === "string" && taskType.length > 0`). Fire-and-forget
  under the same contract as the persist/audit/publish blocks: a perf-write failure NEVER breaks consensus
  delivery (double fail-soft -- recordOutcomeAndPersist is itself never-throws, plus the outer try/catch).
- 58/58 file (+7 R9 deriveVendorRewards: voter->1/dissenter->0; null consensus->[]; ok:false-voter excluded;
  dedup-by-vendor first-wins both-ways; agreement keyed on MODEL not VENDOR; agreed<->reward invariant;
  empty/non-array->[]). Changed files tsc-clean. 3-of-3 PASS (A holistic + B test-integrity + C analyst).

## P2 follow-up (reviewer-flagged, NON-blocking -- deferred, exact fix recorded)
Arm C: `recordOutcomeAndPersist` does loadState->recordOutcome->saveState PER vendor, so an N-vendor panel
re-reads+re-writes the whole state file N times per round (I/O amplification) AND two CONCURRENT rounds (separate
processes) can last-writer-wins clobber each other's update on the shared default path. SAFE within a single
synchronous round (each load sees the prior vendor's committed write -> same final EMA), bounded by the
recommendVendors cold-start vendor floor; rated "not a blocker, acceptable for low call volume". FIX when
accuracy matters: add a batch `recordOutcomesAndPersist(observations[], opts)` (loadState once -> fold
recordOutcome over all vendors -> saveState once = one read+write, atomic for the whole round) and/or route
through `DistributedLockManager.withLock` on the state path for cross-process safety.

## Session arc (india open-loop scan -- the repeatable mandate pattern)
This closes the consensus loop end-to-end. The open-loop scan (grep recordOutcome|updateWeights|trainFromBuffer
over src/engines, R8-verify NOT-wired by READING the dispatcher case) shipped this arc: blueprint loop
end-to-end, consensus-perf persist (WRITE primitives) + this in-process wire, engine-acc record. KEY: grep alone
is unreliable (misses aliased/destructured callers) -- always READ the case. Siblings:
[[reference_consensus_perf_persist_2026_06_25]] (the WRITE primitives this consumes) ·
[[reference_engacc_record_wire_2026_06_25]] · [[reference_open_learning_loops_backlog_2026_06_22]].
