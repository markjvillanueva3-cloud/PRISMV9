# PDF-TRIBAL-HERMES/U-TRIBAL-DRAIN-LOCK-PIDLIVE — [MAIN-FORCE] [PDF-TRIBAL-HERMES]/U-TRIBAL-DRAIN-LOCK-PIDLIVE (slot:zulu): fix dead-lock that froze the overnight drain -- PID-liveness + SIGTERM release

**Commit:** `5dc91d9cbc76` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T23:10:56-05:00
**Tags:** pdf-tribal-hermes, u-tribal-drain-lock-pidlive, auto-distilled

## Subject
[MAIN-FORCE] [PDF-TRIBAL-HERMES]/U-TRIBAL-DRAIN-LOCK-PIDLIVE (slot:zulu): fix dead-lock that froze the overnight drain -- PID-liveness + SIGTERM release

## Body
```
[MAIN-FORCE] [PDF-TRIBAL-HERMES]/U-TRIBAL-DRAIN-LOCK-PIDLIVE (slot:zulu): fix dead-lock that froze the overnight drain -- PID-liveness + SIGTERM release

LIVE: the drain stalled (attempted stuck 14, tips frozen) -- a prior run killed by
the 28-min task limit left its run-lock held (pid 77620 DEAD but lock 48min old);
since 48min < 45min-stale at the time, every tick saw a 'fresh' lock + skipped.
SIGTERM does not fire the finally release. Fix: acquireLock steals IMMEDIATELY on a
DEAD pid (process.kill(pid,0) probe), only honoring a lock whose pid is ALIVE and
fresh; + SIGTERM/SIGINT handler releases on a task-limit/reaper kill. 7/7 tests
(pidAlive). Cleared the stuck lock; drain resuming the 1709-node backlog.
```

## Files touched (3)
- scripts/drain-resources-tribal.mjs      | 26 +++++++++++++++++++++++---
- scripts/drain-resources-tribal.test.mjs | 10 +++++++++-
- 2 files changed, 32 insertions(+), 4 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 5dc91d9cbc76`
- Milestone envelope: `mcp-server/data/milestones/PDF-TRIBAL-HERMES.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._