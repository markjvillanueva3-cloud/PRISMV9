# SIERRA-VAULT-OPS/U-VAULT-HEALTH-COVDISPLAY — [MAIN-FORCE] [SIERRA-VAULT-OPS]/U-VAULT-HEALTH-COVDISPLAY (slot:sierra): contradiction detail shows CHECKED coverage (matches its numerator + the lowCoverage judgment) + budget-partial note

**Commit:** `37fb7cf84b1c` · **By:** markjvillanueva3-cloud · **At:** 2026-06-18T04:43:36-05:00
**Tags:** sierra-vault-ops, u-vault-health-covdisplay, auto-distilled

## Subject
[MAIN-FORCE] [SIERRA-VAULT-OPS]/U-VAULT-HEALTH-COVDISPLAY (slot:sierra): contradiction detail shows CHECKED coverage (matches its numerator + the lowCoverage judgment) + budget-partial note

## Body
```
[MAIN-FORCE] [SIERRA-VAULT-OPS]/U-VAULT-HEALTH-COVDISPLAY (slot:sierra): contradiction detail shows CHECKED coverage (matches its numerator + the lowCoverage judgment) + budget-partial note

Closes a P3 two independent scrutiny reviews flagged: the contradiction headline printed '16/1105 pairs (cov 0.136)' -- mixing pairsChecked (16) with the report's pairsConsidered/pairsTotal SELECTION coverage (0.136), so the displayed cov contradicted both its own numerator and the lowCoverage gate (which uses checked/total). Fix: display (checked/total).toFixed(3) -- the exact same  variable the judgment already consumes, so display + numerator + verdict are now mutually consistent. Also surfaces a budget-partial note (', budget-partial (N not attempted)') when r.budgetExceeded, reading budgetExceeded/notAttempted at the levels the producer writes them (lint-wiki-contradictions.mjs:383-384) -- explains WHY a budgeted run's coverage is low (bounded, not failed). Display-only: severity/lowCoverage/needsScan/WARN logic byte-identical. +2 tests (23 green); live: '16/1105 pairs (cov 0.014), gpt-oss:20b, budget-partial (134 not attempted)'. 2-arm scrutiny PASS 0 findings (both verified judgment invariance + revert-failure + rounding).
```

## Files touched (3)
- scripts/vault-health.mjs      |  8 +++++++-
- scripts/vault-health.test.mjs | 19 +++++++++++++++++++
- 2 files changed, 26 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 37fb7cf84b1c`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-VAULT-OPS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._