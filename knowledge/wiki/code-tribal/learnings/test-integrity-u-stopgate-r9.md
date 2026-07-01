# TEST-INTEGRITY/U-STOPGATE-R9 — [MAIN-FORCE] [TEST-INTEGRITY]/U-STOPGATE-R9 (slot:alpha): land stop_on_failing_tests stale-green freshness block (net-new vs HEAD) + extract pure pickStaleTestFromStatus + main-guard + first R9 test (17/17). Behavior verified preserved via live subprocess; 2-arm scrutiny PASS. KNOWN-OPEN: whole-tree git-status scan thrashes under concurrent fleet build (ref reference_test_freshness_gate_thrash_concurrent_fleet_2026_06_24); correct fix is caller-layer per-slot input scoping (golf/sierra/zulu infra lane) -- this R9 test is the regression net for that fix. Does NOT loosen the gate.

**Commit:** `ab2b3bc84a8e` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T10:10:49-05:00
**Tags:** test-integrity, u-stopgate-r9, auto-distilled

## Subject
[MAIN-FORCE] [TEST-INTEGRITY]/U-STOPGATE-R9 (slot:alpha): land stop_on_failing_tests stale-green freshness block (net-new vs HEAD) + extract pure pickStaleTestFromStatus + main-guard + first R9 test (17/17). Behavior verified preserved via live subprocess; 2-arm scrutiny PASS. KNOWN-OPEN: whole-tree git-status scan thrashes under concurrent fleet build (ref reference_test_freshness_gate_thrash_concurrent_fleet_2026_06_24); correct fix is caller-layer per-slot input scoping (golf/sierra/zulu infra lane) -- this R9 test is the regression net for that fix. Does NOT loosen the gate.

## Body
```
[MAIN-FORCE] [TEST-INTEGRITY]/U-STOPGATE-R9 (slot:alpha): land stop_on_failing_tests stale-green freshness block (net-new vs HEAD) + extract pure pickStaleTestFromStatus + main-guard + first R9 test (17/17). Behavior verified preserved via live subprocess; 2-arm scrutiny PASS. KNOWN-OPEN: whole-tree git-status scan thrashes under concurrent fleet build (ref reference_test_freshness_gate_thrash_concurrent_fleet_2026_06_24); correct fix is caller-layer per-slot input scoping (golf/sierra/zulu infra lane) -- this R9 test is the regression net for that fix. Does NOT loosen the gate.
```

## Files touched (3)
- .claude/hooks/__tests__/stop_on_failing_tests.test.mjs | 133 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- .claude/hooks/stop_on_failing_tests.mjs                | 107 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++----------
- 2 files changed, 230 insertions(+), 10 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ab2b3bc84a8e`
- Milestone envelope: `mcp-server/data/milestones/TEST-INTEGRITY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._