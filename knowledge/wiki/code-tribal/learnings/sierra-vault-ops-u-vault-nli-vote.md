# SIERRA-VAULT-OPS/U-VAULT-NLI-VOTE — [MAIN-FORCE] [SIERRA-VAULT-OPS]/U-VAULT-NLI-VOTE (slot:sierra): stochastic-verdict stabilization -- majority-confirm CONTRADICT kills gpt-oss:20b single-sample false positives

**Commit:** `9f5ef3d70192` · **By:** markjvillanueva3-cloud · **At:** 2026-06-18T03:52:38-05:00
**Tags:** sierra-vault-ops, u-vault-nli-vote, auto-distilled

## Subject
[MAIN-FORCE] [SIERRA-VAULT-OPS]/U-VAULT-NLI-VOTE (slot:sierra): stochastic-verdict stabilization -- majority-confirm CONTRADICT kills gpt-oss:20b single-sample false positives

## Body
```
[MAIN-FORCE] [SIERRA-VAULT-OPS]/U-VAULT-NLI-VOTE (slot:sierra): stochastic-verdict stabilization -- majority-confirm CONTRADICT kills gpt-oss:20b single-sample false positives

runNliLint gains confirmSamples (default 0 = byte-identical legacy; bravo's wiki lint untouched). On a CONTRADICT primary it re-samples confirmSamples more times and records ONLY on a strict majority of (1+confirmSamples) votes -- a flaky single judge becomes a stable majority judge. Confirm fires only on contradict (cost asymmetry: a missed contradiction is cheap, a spurious WARN drives an operator memo-decision). Conservative drop on confirm-failure; circuit breaker untouched; votes{} + totals.confirmCalls surfaced when active. Memory lint opts into 2 (=> 2-of-3; env PRISM_NLI_CONFIRM_SAMPLES / --confirm N). resolveConfirmSamples extracted + unit-tested (empty-env footgun guarded: Number('')===0 no longer silently disables). +9 tests (43 green). Root cause: the edit-tool A<>B memo pair re-measured 0/3 CONTRADICT yet a cron run flagged it -> spurious vault-health WARN. 2-arm scrutiny PASS 0 P0/P1 (arm B mutation-tested the majority math).
```

## Files touched (5)
- scripts/__tests__/lint-wiki-contradictions.test.mjs | 53 +++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lint-memory-contradictions.mjs              | 23 +++++++++++++++++++++--
- scripts/lint-memory-contradictions.test.mjs         | 26 +++++++++++++++++++++++++-
- scripts/lint-wiki-contradictions.mjs                | 44 +++++++++++++++++++++++++++++++++++++++++---
- 4 files changed, 140 insertions(+), 6 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 9f5ef3d70192`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-VAULT-OPS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._