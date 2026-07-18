# MCP-FLEET-CAPACITY-MS0/U-FTH-DEFERRED-PARTITION — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [MCP-FLEET-CAPACITY-MS0]/U-FTH-DEFERRED-PARTITION (slot:sierra): fleet-task-health — partition deliberate deferrals out of `missing` + drift-sync charlie's WSL guard

**Commit:** `3d796dcf5cab` · **By:** markjvillanueva3-cloud · **At:** 2026-06-08T15:32:37-05:00
**Tags:** mcp-fleet-capacity-ms0, u-fth-deferred-partition, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [MCP-FLEET-CAPACITY-MS0]/U-FTH-DEFERRED-PARTITION (slot:sierra): fleet-task-health — partition deliberate deferrals out of `missing` + drift-sync charlie's WSL guard

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [MCP-FLEET-CAPACITY-MS0]/U-FTH-DEFERRED-PARTITION (slot:sierra): fleet-task-health — partition deliberate deferrals out of `missing` + drift-sync charlie's WSL guard

Two findings closed in one change (the second caught by the live E2E drift test):

1. BANNER NOISE FIX — `aggregateHealth` now partitions absent KNOWN tasks into
   real `missing` (escalates → warn) vs `expectedUnregistered` (operator-
   acknowledged deferral → surfaced informationally, NEVER escalates). The 2
   vault crons I shipped UNARMED under the 47-task migration freeze were each
   emitting `MISSING — not registered` every audit, holding the fleet at WARN +
   firing chat-bus advisories for a state the operator already chose. Now they
   report `deferred (informational)`. Mirrors the existing benign `pressure`
   pattern exactly. R12 preserved: the deferral is still surfaced in reasons +
   row + fmtSummary, just de-alarmed. A genuinely-missing (non-deferred) task
   STILL warns; a degraded MUST_EXIST STILL criticals. New `EXPECTED_UNREGISTERED_TASKS`
   set — WHEN THE FREEZE LIFTS, register the task AND remove its name here in the
   same change (so a vanished task re-surfaces as real missing).

2. DRIFT-SYNC (R12 fail-loud catch) — the live E2E drift test fail-loud caught
   `PRISM WSL Memory Guard` (charlie, 2026-06-08, install-wsl-memory-guard-task.ps1)
   shipped but unwatched. Added to KNOWN_PRISM_TASKS + CRASH_CRITICAL_TASKS — a
   vmmemWSL commit-cap relief guard in the same commit-pressure-relief family as
   Cleanup Orchestrator / Memory Pressure Auto-Relief (vmmemWSL ballooning to
   ~96GB committed was a host-spawn-refusal cause, same class as the 0x800710E0
   false-alarm this watchdog now handles). The task is NOT registered on this
   host (freeze) so it correctly surfaces as real `missing` per operator
   decision — not auto-deferred.

VALIDATED LIVE: commit charge holding at 70.5% (was 92.5% pre-Phase-1-cap,
-50GB). Live audit: vault crons now `deferred(2)`, WSL guard `missing` (honest),
installerDrift.hasDrift=false. 62/62 tests (4 partition + 1 adversarial-absence
+ 1 now-green E2E drift). Per-file 2-arm scrutiny PASS/PASS, 0 P0/P1; reviewer-B
mutation-tested each new test fails under the precise bug it guards (R9). Closed
both P3s: adversarial present-task-not-deferred test + stale "39"→44 comment.
```

## Files touched (3)
- scripts/__tests__/fleet-task-health-watch.test.mjs | 55 +++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/fleet-task-health-watch.mjs                | 74 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++--------
- 2 files changed, 121 insertions(+), 8 deletions(-)

## Lessons surfaced in commit body
- till surfaced in reasons +
- TILL warns; a degraded MUST_EXIST STILL criticals. New `EXPECTED_UNREGISTERED_TASKS`

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 3d796dcf5cab`
- Milestone envelope: `mcp-server/data/milestones/MCP-FLEET-CAPACITY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._