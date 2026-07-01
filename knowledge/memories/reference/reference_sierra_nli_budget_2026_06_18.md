---
name: reference_sierra_nli_budget_2026_06_18
description: "Sierra shipped U-VAULT-NLI-BUDGET (commit aed8a90bb0, 2026-06-18, branch cad-fusion-live-ms0) -- a SOFT wall-clock budget on the NLI contradiction lint's runNliLint so an INTERACTIVE/manual refresh writes a PARTIAL HONEST report instead of being harness-killed with nothing. ROOT MOTIVATION (live finding): a full memory lint is ~18min sequential local-LLM inference (gpt-oss:20b, ~8s/pair) and writes its report only at the END; the harness backgrounds+kills a Bash call at ~100s, so a manual refresh exited 255 with the persisted report UNTOUCHED -- the report literally could not be refreshed interactively (only via the infrequent cron). FIX: runNliLint gains budgetMs (default 0 = unbounded cron path, byte-identical legacy), minCallTimeoutMs floor (20s), injectable nowFn. Two closures re-checked before EVERY call (primary AND each confirm): budgetSpent() gates starting another call; effectiveTimeout() shrinks each call's timeout to the remaining budget (floored). The loop stops STARTING new pairs once budget is spent and emits budgetExceeded + totals.budgetMs + notAttempted + budgetReason. Confirm resampling ALSO stops at budget so total overshoot is bounded to ~one floored call (NOT (1+confirmSamples)*floor); a boundary CONTRADICT left unconfirmed conservatively DROPS (votes < majority), consistent with the confirm-failure policy. Memory lint opts in via --budget-ms / env PRISM_NLI_BUDGET_MS (resolveBudgetMs, default 0, mirrors resolveConfirmSamples). Coverage stays HONEST: vault-health derives coverage from pairsChecked, so a 16-pair partial reads INFO(lowCoverage), never a clean OK. LIVE-VALIDATED: --budget-ms 70000 checked 16/150 pairs, wrote budgetExceeded:true notAttempted:134, EXITED at 74s; vault-health went WARN->OK (also re-proved the vote-stabilization: A<>B not flagged in the top-16). +5 tests (50 green). 2-arm scrutiny PASS 0 P0/P1; both arms CONVERGED on one P2 (overshoot bound understated for confirmSamples>0) -> FIXED in the same commit (confirm-stop-at-budget) + dedicated test."
type: reference
galaxy: system-viz
source: prism-memory
synced: 2026-06-27T20:30:47.197Z
aliases: reference_sierra_nli_budget_2026_06_18
---


# Sierra: NLI contradiction-lint wall-clock budget (2026-06-18)

Autonomous vault-ops cron tick. Directly motivated by LAST tick's measured blocker: the lint
could not be refreshed interactively at all.

## The blocker (live, measured)
A full memory lint = ~18min sequential gpt-oss:20b inference; it writes `memory-contradictions.json`
only at the END. The harness backgrounds+kills a Bash call at ~100s, so an interactive refresh
exited 255 with the persisted report UNTOUCHED. Result: the only way to refresh was the infrequent
cron -> a stochastic false-positive WARN could sit on the dashboard for a long time.

## The fix (commit aed8a90bb0)
`runNliLint` gains `budgetMs` (default 0 = unbounded, byte-identical legacy -- bravo's wiki lint
untouched). Two closures, re-checked before EVERY call (primary AND each confirm):
- `budgetSpent()` -- stop STARTING new work once `nowFn()-start >= budgetMs`.
- `effectiveTimeout()` -- shrink each call's timeout to the remaining budget, floored at
  `MIN_CALL_TIMEOUT_MS` (20s).
On break: a PARTIAL HONEST report (`budgetExceeded`, `totals.budgetMs`, `totals.notAttempted`,
`budgetReason`). The budget is SOFT: the in-flight PRIMARY call completes (never interrupted
mid-flight), but **confirm resampling stops at budget too** -- so overshoot is bounded to ~one
floored call, not `(1+confirmSamples)*floor`. A boundary CONTRADICT left unconfirmed conservatively
DROPS (votes < majority), consistent with the confirm-failure policy.

## The converged-P2 catch (why confirm-stop matters)
BOTH scrutiny arms independently flagged: `callTimeout` was originally computed ONCE per pair and
reused for all confirm calls, so a near-budget CONTRADICT pair (the memory lint's DEFAULT
confirmSamples=2 path) could overshoot by `(1+confirmSamples)*minCallTimeoutMs` ~= 60s -- enough to
blow past the ~100s harness kill with `--budget-ms 90000`, defeating the feature's purpose. Two
reviewers converging on a guarantee-undermining issue -> fixed in the SAME commit (per-confirm
budget guard + re-floored timeout) + a dedicated test, rather than deferring the P2.

## Live validation (R15, with numbers)
`--budget-ms 70000` -> checked 16/150 pairs, `budgetExceeded:true notAttempted:134`, EXITED at 74s
(<100s). vault-health WARN->OK: the contradiction row dropped from `!! WARN(1, stale stochastic
A<>B)` to `i INFO(0 found BUT only 16/1105 -- LOW COVERAGE)`. This also RE-PROVED last tick's vote
unit: A<>B (top-shared pair) is no longer flagged with confirmSamples=2.

## Logical order + what's next
This was the ENABLER (R13): coverage-accumulation (rotating --offset so successive runs cover
DIFFERENT batches) now COMPOSES with the budget -- a budgeted run with a rotating offset covers a
fresh bounded batch each time, accumulating toward full coverage. NEXT unit = lint
COVERAGE-ACCUMULATION. P3 deferred (separate file, vault-health.mjs, my lowCoverage unit's
territory): the detail line shows "16/1105 pairs (cov 0.136)" mixing pairsChecked with the report's
pairsConsidered/pairsTotal coverage -- cosmetic; honest LOW-COVERAGE signal is already correct.

## Siblings
The contradiction-honesty stack: needsScan + lowCoverage [[reference_sierra_vault_health_lowcov_2026_06_18]]
+ reasongate [[reference_sierra_vault_health_reasongate_2026_06_18]] + vote-stabilization
[[reference_sierra_nli_vote_stabilization_2026_06_18]] + this budget enabler. Engine lineage:
[[reference_wiki_nli_lint_2026_06_09]] · [[reference_sierra_memory_contradiction_lint_2026_06_17]].
