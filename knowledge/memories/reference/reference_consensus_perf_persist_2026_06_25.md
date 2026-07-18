---
name: reference_consensus_perf_persist_2026_06_25
description: India shipped U-CONSENSUS-PERF-PERSIST (5bbaac1503, 2026-06-25) -- closed the octopus vendor-performance learning loop's missing WRITE side. ConsensusModelPerformanceEngine had loadState + recordOutcome but NO saveState, so the EMA the consensus reads (recommendVendors down-select) was frozen forever. Added saveState + recordOutcomeAndPersist. R8 catch: the naive fix (a dispatcher action) was WRONG -- the engine is WIRE-EXEMPT (private governance signal); the closure is in-process.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.530Z
aliases: reference_consensus_perf_persist_2026_06_25
---


# U-CONSENSUS-PERF-PERSIST -- india 2026-06-25 (5bbaac1503)

## The gap (found via the proven open-loop scan; R8-verified)
Re-ran the Mill/Ensemble frozen-loop scan (`grep updateWeights|trainFromBuffer|recordOutcome`
over src/engines) and verified one with the false-gap guard. `ConsensusModelPerformanceEngine`
(the octopus's per-vendor reward-EMA tracker) had `loadState` + `recommendVendors` (the
prediction/down-select side the octopus USES at `MultiModelConsensusEngine:521-522`) +
`recordOutcome` (pure EMA update) -- but **NO saveState**. So:
- recordOutcome returned a new state that NOTHING could persist, and
- recordOutcome was never CALLED by anyone (false-gap guard: 0 callers in src),
so `recommendVendors` read a permanently FROZEN file. The octopus consults vendor
performance to skip low-EMA vendors but never feeds actuals back -> the loop is open.

## The R8 catch (read-the-body saved a wrong build)
My first plan was a `prism_ai` dispatcher action. The engine's HEADER (lines 1-5) is a
`// WIRE-EXEMPT` tag: "consumed exclusively by MultiModelConsensusEngine ... No user-facing
dispatcher action; the perf state is a private governance signal." So a dispatcher action
would VIOLATE the documented design. The correct closure is IN-PROCESS (the consensus owner
calls it), keeping the engine wire-exempt.

## What shipped
Two engine methods (additive, build-safe, WIRE-EXEMPT-respecting):
- `saveState(state, filePath?)` -- atomic tmp+rename write, fail-SOFT (returns {ok:false,error},
  never throws -- mirrors loadState's fail-open; a failed perf write must never break consensus).
- `recordOutcomeAndPersist(vendor, taskType, reward, {filePath?,alpha?})` -- load -> recordOutcome
  -> save, the single in-process call the consensus OWNER makes after a round.
25/25 tests (+7 R9: durable round-trip, fail-soft ENOTDIR, closure persist+reload, **end-to-end
recommendVendors-now-ranks-by-persisted-feedback**, EMA accumulation low->high, bad-input no-op).
tsc clean on changed files.

## NEXT UNIT (documented, designed)
Wire `MultiModelConsensusEngine` to CALL `recordOutcomeAndPersist` after a consensus round, with
`reward = vendor agreement-with-consensus` (a proxy for "was this vendor right"). This needs the
consensus result structure (vendor votes vs final answer) + the reward definition; if the actual
is only known LATER (operator override), it is a 2-PHASE design like CAM #4
([[reference_open_learning_loops_backlog_2026_06_22]]). The persistence foundation (this unit) is now in place.

## Lesson
The proven open-loop scan (`grep feedback-method` + verify-not-wired) keeps finding real frozen
loops -- but R8 read-the-header first: a `// WIRE-EXEMPT` engine wants an IN-PROCESS closure, not
a dispatcher action. Sibling: [[reference_open_learning_loops_backlog_2026_06_22]] (Mill/Ensemble pattern).
