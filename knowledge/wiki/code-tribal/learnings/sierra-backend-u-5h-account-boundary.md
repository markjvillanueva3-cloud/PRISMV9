# SIERRA-BACKEND/U-5H-ACCOUNT-BOUNDARY — [MAIN-FORCE] [SIERRA-BACKEND]/U-5H-ACCOUNT-BOUNDARY (slot:sierra): per-account 5h window floor -- true real-time tracking across account switches

**Commit:** `56b018b985ff` · **By:** markjvillanueva3-cloud · **At:** 2026-06-18T14:52:01-05:00
**Tags:** sierra-backend, u-5h-account-boundary, auto-distilled

## Subject
[MAIN-FORCE] [SIERRA-BACKEND]/U-5H-ACCOUNT-BOUNDARY (slot:sierra): per-account 5h window floor -- true real-time tracking across account switches

## Body
```
[MAIN-FORCE] [SIERRA-BACKEND]/U-5H-ACCOUNT-BOUNDARY (slot:sierra): per-account 5h window floor -- true real-time tracking across account switches

Operator: "i just switched accounts, we need true real time tracking of session limits."

ROOT CAUSE: liveStatus/fiveHourTokenSum sum [now-5h, now] with NO account boundary, so after a manual
account switch the rolling sum still counts the OLD account's tokens -> the banner falsely reads
~100%/0min while the NEW account has a fresh 5h budget (live monitor showed 144M weighted -> 100%).

FIX: floor the 5h window at the last account-switch instant so only the CURRENT account's usage counts.
Boundary from TWO sources (max = most-recent): a manual marker written by the new --mark-switch CLI, AND
the auto-switch coordinator's status:"switched" ledger events (account-switch-monitor.jsonl) -- so an
AUTO swap also resets with no manual step. New pure effectiveWindowMs + readSwitchBoundaryMs/
writeSwitchBoundary (fail-soft, fs-injectable). liveStatus floors BOTH the 5h sum and the burn window
+ reports windowFlooredToSwitch / accountSwitchBoundaryAt.

AUTO-PROPAGATES to the operator banner: fleet-survival-status calls liveStatus with default boundary
paths -> fleet-survival-advisory. No consumer change needed.

VALIDATED LIVE (operator just switched): --mark-switch then --status -> windowFlooredToSwitch true,
0.0% used (was 100%); fleet-survival-status -> "zone=ok 1.3% of ceiling" (was 100% / 0 min). +9 tests
(47 green). Backward-compatible: a null/older boundary returns the full window unchanged.
```

## Files touched (3)
- scripts/five-hour-limit-tracker.mjs      | 128 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++--
- scripts/five-hour-limit-tracker.test.mjs |  89 +++++++++++++++++++++++++++++++++++++++++++++++--
- 2 files changed, 212 insertions(+), 5 deletions(-)

## Lessons surfaced in commit body
- till counts the OLD account's tokens -> the banner falsely reads

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 56b018b985ff`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-BACKEND.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._