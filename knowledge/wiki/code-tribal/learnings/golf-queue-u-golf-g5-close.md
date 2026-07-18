# GOLF-QUEUE/U-GOLF-G5-CLOSE — [MAIN] [GOLF-QUEUE]/U-GOLF-G5-CLOSE (slot:golf): close G5 boost-stamp janitor as REDUNDANT — decay.mjs already TTL-sweeps orphans

**Commit:** `c78faa5a7398` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T15:06:16-05:00
**Tags:** golf-queue, u-golf-g5-close, auto-distilled

## Subject
[MAIN] [GOLF-QUEUE]/U-GOLF-G5-CLOSE (slot:golf): close G5 boost-stamp janitor as REDUNDANT — decay.mjs already TTL-sweeps orphans

## Body
```
[MAIN] [GOLF-QUEUE]/U-GOLF-G5-CLOSE (slot:golf): close G5 boost-stamp janitor as REDUNDANT — decay.mjs already TTL-sweeps orphans

G5 verify-gate verdict = CLOSE. active-chat-priority-decay.mjs (Stop hook,
fleet-wide) already TTL-sweeps every .active-chat-boost stamp with
expiresAt<=now incl. pid-less crashed-chat orphans; boost.mjs:102 always
writes a finite expiresAt (ttlSec clamp [60,1800]) so the lone malformed-
stamp leak cannot occur. A second janitor would duplicate decay.mjs. The
FLEET-REAPER-MS4 boost-stamp-janitor CLOSE-OUT-DEFERRED premise was stale.

Per user G5->G1->G10 sequence. G1 (noise-filter 22,301 untracked) next.
Ref: reference_golf_g5_boost_janitor_redundant_2026_06_09.
```

## Files touched (3)
- mcp-server/src/__tests__/baselineHssEntries.test.ts         | 72 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/SpeedFeedBaselineComparatorEngine.ts | 62 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++----
- 2 files changed, 130 insertions(+), 4 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c78faa5a7398`
- Milestone envelope: `mcp-server/data/milestones/GOLF-QUEUE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._