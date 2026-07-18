# GOLF-QUEUE/U-GOLF-G10-FREEZE-GATE-FIX — [MAIN] [GOLF-QUEUE]/U-GOLF-G10-FREEZE-GATE-FIX (slot:golf): remove blanket freeze suppression - it made the guard a LIVE no-op

**Commit:** `fbf34bb3a9d8` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T18:27:28-05:00
**Tags:** golf-queue, u-golf-g10-freeze-gate-fix, auto-distilled

## Subject
[MAIN] [GOLF-QUEUE]/U-GOLF-G10-FREEZE-GATE-FIX (slot:golf): remove blanket freeze suppression - it made the guard a LIVE no-op

## Body
```
[MAIN] [GOLF-QUEUE]/U-GOLF-G10-FREEZE-GATE-FIX (slot:golf): remove blanket freeze suppression - it made the guard a LIVE no-op

R12 + live-validation self-correction. G10's selectReenableTargets had
`if (migrationFreezeActive) return []` -- a blanket gate that the 3-of-3 arms
ENDORSED as 'correct' reasoning abstractly. LIVE VALIDATION on a real disabled
PRISM Zombie Reaper v2 proved it WRONG: the HW-migration freeze has been active
for weeks, so the guard fired NOTHING -- a complete no-op for its entire purpose.

Root cause: the freeze gate is the wrong category. aggregateHealth excuses a
disabled task under the freeze ONLY when NON-load-bearing (line ~764:
`migrationFreezeActive && !loadBearing.has(name)`). A crash-critical task IS
load-bearing, so aggregateHealth NEVER freeze-excuses it -- it stays
crashCritDegraded (the live WARN). selectReenableTargets must MATCH that: the
only 'operator chose this' signal for a crash-critical task is
EXPECTED_DISABLED_TASKS, NOT the freeze. Removed the freeze gate + the unused
param from the runOnce call; rewrote the freeze test to assert the corrected
intent (regression guard).

LIVE PROOF: re-ran the watchdog -> autoReenable.healed=['PRISM Zombie Reaper v2']
-> Get-ScheduledTask State flipped Disabled->Ready. The guard now actually
self-heals. Tests 85/86 (only the pre-existing orthogonal #69 drift fails).
Ref: reference_golf_g10_autoreenable_guard_2026_06_09.
```

## Files touched (3)
- scripts/__tests__/fleet-task-health-watch.test.mjs | 14 +++++++++-----
- scripts/fleet-task-health-watch.mjs                | 21 ++++++++++++++-------
- 2 files changed, 23 insertions(+), 12 deletions(-)

## Lessons surfaced in commit body
- WRONG: the HW-migration freeze has been active
- wrong category. aggregateHealth excuses a

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show fbf34bb3a9d8`
- Milestone envelope: `mcp-server/data/milestones/GOLF-QUEUE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._