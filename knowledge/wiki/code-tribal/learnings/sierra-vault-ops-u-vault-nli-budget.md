# SIERRA-VAULT-OPS/U-VAULT-NLI-BUDGET — [MAIN-FORCE] [SIERRA-VAULT-OPS]/U-VAULT-NLI-BUDGET (slot:sierra): wall-clock budget on runNliLint -- an interactive lint writes a PARTIAL honest report instead of being harness-killed with nothing

**Commit:** `aed8a90bb051` · **By:** markjvillanueva3-cloud · **At:** 2026-06-18T04:27:10-05:00
**Tags:** sierra-vault-ops, u-vault-nli-budget, auto-distilled

## Subject
[MAIN-FORCE] [SIERRA-VAULT-OPS]/U-VAULT-NLI-BUDGET (slot:sierra): wall-clock budget on runNliLint -- an interactive lint writes a PARTIAL honest report instead of being harness-killed with nothing

## Body
```
[MAIN-FORCE] [SIERRA-VAULT-OPS]/U-VAULT-NLI-BUDGET (slot:sierra): wall-clock budget on runNliLint -- an interactive lint writes a PARTIAL honest report instead of being harness-killed with nothing

Motivation (live finding 2026-06-18): a full memory lint is ~18min sequential local-LLM inference and writes its report only at the END; the harness kills an interactive Bash call at ~100s, so a manual refresh exited 255 with the persisted report untouched -- the report could NOT be refreshed interactively at all. Fix: runNliLint gains budgetMs (default 0 = unbounded cron path, byte-identical legacy), minCallTimeoutMs floor, injectable nowFn. budgetSpent()/effectiveTimeout() are re-checked before EVERY call (primary AND each confirm): the loop stops starting new pairs once the budget is spent and writes a PARTIAL honest report (budgetExceeded + pairsChecked + notAttempted + budgetReason); per-call timeout shrinks to remaining budget (floored). Confirm resampling also stops at budget so overshoot is bounded to ~one floored call (not (1+confirmSamples)*floor) -- a boundary CONTRADICT left unconfirmed conservatively drops. Memory lint opts in via --budget-ms / env PRISM_NLI_BUDGET_MS (resolveBudgetMs, default 0). Coverage stays honest: vault-health derives coverage from pairsChecked, so a partial reads INFO(lowCoverage), never a clean OK. LIVE-VALIDATED: --budget-ms 70000 checked 16/150 pairs, wrote budgetExceeded:true notAttempted:134, EXITED at 74s; vault-health WARN->OK (also re-proves vote-stabilization: A<>B no longer flagged in the top-16). +5 tests (50 green). 2-arm scrutiny PASS 0 P0/P1; both arms converged on one P2 (overshoot bound understated for confirmSamples>0) -- FIXED in this commit (confirm-stop-at-budget + per-confirm re-floor) + dedicated test.
```

## Files touched (5)
- scripts/__tests__/lint-wiki-contradictions.test.mjs | 69 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lint-memory-contradictions.mjs              | 23 +++++++++++++++++++--
- scripts/lint-memory-contradictions.test.mjs         | 20 +++++++++++++++++-
- scripts/lint-wiki-contradictions.mjs                | 55 +++++++++++++++++++++++++++++++++++++++++++++---
- 4 files changed, 161 insertions(+), 6 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show aed8a90bb051`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-VAULT-OPS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._