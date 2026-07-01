# FLEET-REAPER/U-FR-STUCK-HUNT-SELFGUARD — [MAIN] [FLEET-REAPER]/U-FR-STUCK-HUNT-SELFGUARD (slot:golf): scrutiny BLOCKER fix — self-kill + fsmonitor-blind

**Commit:** `f7d5ebca3eb1` · **By:** markjvillanueva3-cloud · **At:** 2026-05-21T15:59:00-05:00
**Tags:** fleet-reaper, u-fr-stuck-hunt-selfguard, auto-distilled

## Subject
[MAIN] [FLEET-REAPER]/U-FR-STUCK-HUNT-SELFGUARD (slot:golf): scrutiny BLOCKER fix — self-kill + fsmonitor-blind

## Body
```
[MAIN] [FLEET-REAPER]/U-FR-STUCK-HUNT-SELFGUARD (slot:golf): scrutiny BLOCKER fix — self-kill + fsmonitor-blind

3-of-3 reviewer C caught 2 P0 blockers in U-FR-STUCK-HUNT:
 - BLOCKER 1: hunters fed PIDs straight to reapProcesses, bypassing the
   classifyProc self-protection layer. The sweep runs FROM a bash.exe hook —
   findStuckBashes could match + kill its own parent shell mid-sweep.
 - BLOCKER 2: findFsmonitorOrphans reaped on age alone, ignoring livePidSet —
   a fsmonitor whose spawning git is still alive could be killed mid-op.

Fix: new buildProtectedPidSet(procs, selfPid) collects self + ancestors +
descendants (cycle-guarded, only real tracked procs); both kill-emitting
hunters now exclude every protected PID. findFsmonitorOrphans now requires a
DEAD parent (fsmonitor --detach orphans normally; a live parent = git still
attached → spare it). Reason string names the actual parent via procByPid
instead of blind-asserting claude.exe (reviewer B P2). 33/33 node:test
(10 new: protected-pid guard, dead-parent gate, cycle safety, build-set tree).
```

## Files touched (4)
- scripts/fleet-reaper-sweep.mjs                  |  10 +-
- scripts/lib/fleet-reaper-stuck-hunters.mjs      | 112 ++++++++++++++++++++--
- scripts/lib/fleet-reaper-stuck-hunters.test.mjs | 118 ++++++++++++++++++++++++
- 3 files changed, 233 insertions(+), 7 deletions(-)

## Lessons surfaced in commit body
- till alive could be killed mid-op.
- till

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show f7d5ebca3eb1`
- Milestone envelope: `mcp-server/data/milestones/FLEET-REAPER.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._