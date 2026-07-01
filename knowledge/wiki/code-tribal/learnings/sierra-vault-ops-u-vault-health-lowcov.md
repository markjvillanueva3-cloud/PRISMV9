# SIERRA-VAULT-OPS/U-VAULT-HEALTH-LOWCOV — [MAIN-FORCE] [SIERRA-VAULT-OPS]/U-VAULT-HEALTH-LOWCOV (slot:sierra): flag LOW COVERAGE so a clean-0 contradiction scan never reads as a clean bill of health.

**Commit:** `8bf854f94b41` · **By:** markjvillanueva3-cloud · **At:** 2026-06-18T00:10:58-05:00
**Tags:** sierra-vault-ops, u-vault-health-lowcov, auto-distilled

## Subject
[MAIN-FORCE] [SIERRA-VAULT-OPS]/U-VAULT-HEALTH-LOWCOV (slot:sierra): flag LOW COVERAGE so a clean-0 contradiction scan never reads as a clean bill of health.

## Body
```
[MAIN-FORCE] [SIERRA-VAULT-OPS]/U-VAULT-HEALTH-LOWCOV (slot:sierra): flag LOW COVERAGE so a clean-0 contradiction scan never reads as a clean bill of health.

The doctrine-contradiction NLI lint caps candidate pairs, so a live run checks only ~8/1105 pairs (0.7% coverage). Previously vault-health mapped any clean (contradictions=0) result to OK(green) regardless of coverage -- so a 0-found over 0.7% scanned would falsely certify 'doctrine consistent' when 99.3% was never looked at (the same R12 false-confidence class as the existing needsScan guard for the 0-pairs-checked case).

Fix: contradiction headline gains a LOW_COVERAGE guard (0.5). After needsScan, a real contradiction still WARNs; a clean v===0 is OK only when recomputed cov (checked/total) >= 0.5, else severity 'info' + lowCoverage:true + a 'LOW COVERAGE, not a clean bill' detail. aggregateHealth carries lowCoverage per-row + in counts; it is INFO and deliberately does NOT escalate overall (the capped scan is the lint's steady state -> escalating would peg the dashboard perpetually STALE; the row detail + the 'vault is healthy' guard carry the honest signal). Decision uses recomputed cov, never the report's display-only coverage field.

Fixture healthy() moved 8/1105 -> 1105/1105 (it was itself low-coverage); +3 tests (17 total: clean-low-cov->info, real-contradiction-at-low-cov->WARN, 0.5 boundary). Per-file 2-arm scrutiny PASS (reviewer + code-analyzer, 0 P0/P1).
```

## Files touched (3)
- scripts/vault-health.mjs      | 33 +++++++++++++++++++++++++--------
- scripts/vault-health.test.mjs | 40 +++++++++++++++++++++++++++++++++++++---
- 2 files changed, 62 insertions(+), 11 deletions(-)

## Lessons surfaced in commit body
- till WARNs; a clean v===0 is OK only when recomputed cov (checked/total) >= 0.5, else severity 'info' + lowCoverage:true + a 'LOW COVERAGE, not a clean bill' detail. aggregateHealth carries lowCoverage per-row + in counts; it is INFO and deliberately does NOT escalate overall (the capped scan is the lint's steady state -> escalating would peg the dashboard perpetually STALE; the row detail + the 'vau

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 8bf854f94b41`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-VAULT-OPS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._