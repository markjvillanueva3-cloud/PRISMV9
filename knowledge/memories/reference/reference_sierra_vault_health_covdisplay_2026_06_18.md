---
name: reference_sierra_vault_health_covdisplay_2026_06_18
description: "Sierra shipped U-VAULT-HEALTH-COVDISPLAY (commit 37fb7cf84b, 2026-06-18, branch cad-fusion-live-ms0) -- vault-health's doctrine-contradiction detail now displays the CHECKED coverage (checked/total) instead of the report's pairsConsidered/pairsTotal SELECTION coverage, closing a P3 that TWO independent scrutiny reviews flagged across the prior NLI units: the headline printed '16/1105 pairs (cov 0.136)' where 0.136 contradicted both its 16/1105 numerator AND the lowCoverage gate (which uses checked/total). Fix displays (checked/total).toFixed(3) -- the exact `cov` variable the judgment already consumes -- so display+numerator+verdict are mutually consistent; plus a ', budget-partial (N not attempted)' note when r.budgetExceeded (explains WHY a budgeted run's coverage is low: bounded, not failed). Display-only: severity/lowCoverage/needsScan/WARN byte-identical. +2 tests (23 green), 2-arm scrutiny PASS 0 findings. ALSO records the deliberate DECISION (anti-drift): the contradiction-honesty arc (needsScan+lowCoverage+reasongate+vote+budget+this display fix) is COMPLETE and the vault is overall=OK; the queued coverage-ACCUMULATOR unit is DEFERRED -- done right it is medium-large (content-based freshness to avoid regressing high-shared-pair re-checks + sidecar + merge + eviction + report reshape) for MODEST marginal value (the uncovered pairs are LOW-shared = low contradiction probability; ~0 real contradictions found all arc). Not over-built per Karpathy simplicity. Bash gotcha logged: backticks in a double-quoted git -m body trigger command substitution (cov: command not found) -- harmless here but avoid."
type: reference
galaxy: system-viz
source: prism-memory
synced: 2026-06-27T20:30:47.201Z
aliases: reference_sierra_vault_health_covdisplay_2026_06_18
---


# Sierra: vault-health coverage-display honesty fix + accumulator-deferral decision (2026-06-18)

Autonomous vault-ops cron tick. After the 5-unit contradiction-honesty arc, the vault is healthy
(overall=OK). This tick: ship the small real improvement, and DECIDE (not drift) on the queued
accumulator.

## The fix (commit 37fb7cf84b)
`vault-health.mjs` contradiction headline printed `(cov ${t.coverage})` where `t.coverage` =
the report's pairsConsidered/pairsTotal (candidate-SELECTION coverage). Under a budget-partial
run that diverges from checked/total -> "16/1105 pairs (cov 0.136)": the printed 0.136
contradicted its own 16/1105 numerator AND the lowCoverage gate (`cov = checked/total = 0.014`).
TWO prior scrutiny reviews independently flagged it (P3). Fix: display
`(checked/total).toFixed(3)` -- the SAME `cov` variable the judgment uses -- so display, numerator
and verdict agree. Added a budget-partial note (`, budget-partial (N not attempted)`) reading
`r.budgetExceeded` + `t.notAttempted` at the levels the producer writes them
(`lint-wiki-contradictions.mjs` budget block). Live: "16/1105 pairs (cov 0.014), gpt-oss:20b,
budget-partial (134 not attempted)". Display-only; judgment byte-identical.

## The decision: accumulator DEFERRED (anti-drift, not laziness)
The handoff queued "coverage-accumulation" (push past cov 0.5 -> clean OK). Reassessed the ROI
honestly before building a 6th increment on one detector:
- Done RIGHT it is medium-large: pure-rotation REGRESSES (rotates away from high-shared, most-
  likely-to-contradict pairs); a correct version needs content-based freshness (re-check a pair
  only when a memo changed) + a verdict accumulator sidecar + merge + eviction + a report reshape
  (pairsChecked becomes cumulative).
- Marginal value is MODEST: the uncovered pairs (151..1105) share exactly 2 topic tokens (low
  relation -> low contradiction probability); the whole arc found ~0 real contradictions; the
  top-shared pairs (highest risk) are already checked.
- Value it WOULD add: a clean-bill doctrine-consistency GUARANTEE + catching rare low-shared drift
  -- real but not urgent.
Per Karpathy simplicity ("am I over-engineering?") + the operator's "if dry, refresh + stop
gracefully": deferred with this design sketch so a future tick/operator picks it up deliberately,
not rushed in a LOW-effort tick. Full design lives in the handoff RESUME.

## State
vault-health overall=OK: rot OK, supersession OK(149), contradiction INFO(0 found, 16/1105
lowCoverage, fresh + now honestly displayed), ambiguous INFO(95, ~80 owned by business/quoting
generator dup-bug). The contradiction-honesty arc is COMPLETE.

## Siblings
[[reference_sierra_vault_health_lowcov_2026_06_18]] (the lowCoverage unit this display belongs to)
· [[reference_sierra_vault_health_reasongate_2026_06_18]] · [[reference_sierra_nli_vote_stabilization_2026_06_18]]
· [[reference_sierra_nli_budget_2026_06_18]] (the budget feature whose partial-report this note explains).
