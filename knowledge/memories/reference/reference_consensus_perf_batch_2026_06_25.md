---
name: reference_consensus_perf_batch_2026_06_25
description: India shipped U-CONSENSUS-PERF-BATCH (af718f021c, 2026-06-25) -- R16 gap-close on U-CONSENSUS-PERF-INPROC-WIRE. New ConsensusModelPerformanceEngine.recordOutcomesAndPersist(observations[]) batches the per-round vendor-perf write into load-once->fold->save-once, eliminating the per-vendor N-write amplification + shrinking the cross-process last-writer-wins surface to one rename/round. Closes both reviewer-flagged P2s. 3-of-3 PASS.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.529Z
aliases: reference_consensus_perf_batch_2026_06_25
---


# U-CONSENSUS-PERF-BATCH -- india 2026-06-25 (af718f021c)

## What + why (R16 loop-until-gaps-closed)
The 3-of-3 reviewers of U-CONSENSUS-PERF-INPROC-WIRE ([[reference_consensus_perf_inproc_wire_2026_06_25]],
3c459180b2) flagged two NON-blocking P2s: `recordOutcomeAndPersist` did loadState->recordOutcome->saveState
PER vendor, so ask() re-read+re-wrote the whole state file N times per consensus round (I/O amplification) and
two concurrent rounds could last-writer-wins clobber each other on the shared default path. Safe within a
single synchronous round but the within-round N-write window is avoidable. This unit closes both.

## Fix
- New `ConsensusModelPerformanceEngine.recordOutcomesAndPersist(observations: {vendor,taskType,reward}[], opts)`:
  loadState ONCE -> fold the pure `recordOutcome` over every observation (threading state in-memory) -> saveState
  ONCE. Folding through the pure (state-in/state-out) recordOutcome makes the final EMA IDENTICAL to N sequential
  singles (each load-sees-prior-write), but the single atomic save closes the within-round N-write window and
  shrinks the cross-process race to ONE rename/round. Fail-soft (never throws); empty/non-array/all-invalid ->
  {ok:true,count:0}; `count` = rows that actually mutated state (recordOutcome returns the SAME ref on blank
  vendor / non-finite reward, so the ref-compare both skips + counts).
- `ask()` switched from the per-vendor recordOutcomeAndPersist loop to ONE recordOutcomesAndPersist call (maps
  deriveVendorRewards -> {vendor,taskType,reward}[]); same gating + fire-and-forget. `recordOutcomeAndPersist`
  retained for back-compat / single-observation callers (now 0 production callers -- a tested library API).
- +6 R9 tests incl THE invariant (batch EMA == N-sequential singles, toBeCloseTo 12dp -- genuinely discriminates
  a broken fold). 31/31 perf engine + 58/58 consensus = 89/89. Changed files tsc-clean. 3-of-3 PASS.

## Honest scope (do NOT overclaim)
Reduces N writes -> 1 and tightens the within-round window, but the cross-process race is REDUCED not REMOVED
(loadState->fold->saveState is still a read-modify-write; only a lockfile/atomic-RMW via DistributedLockManager
fully closes it -- out of scope, low-value for a private fail-soft governance EMA). The octopus vendor-performance
loop is now CLOSED end-to-end AND optimized. Sibling: [[reference_consensus_perf_persist_2026_06_25]] (WRITE primitives).
