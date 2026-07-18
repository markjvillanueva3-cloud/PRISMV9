# FLEET-REAPER/U-RECLAIM-PREVIEW — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-REAPER]/U-RECLAIM-PREVIEW (slot:golf): kill the stale-slot cry-wolf advisory. The reaper 'N slot(s) with dead PID -- run reclaim' keys on the recorded pid (dies across /compact while the chat+window live on) so it OVER-reports -- verified live: 11 dead-recorded-pid -> 0 actually reclaimable (foxtrot correctly kept via window_pid_alive). Add read-only previewReclaimable() to chat-slots.mjs (reuses the canonical classifySlot+shouldKeepSlotAlive, no mutation/no lock -- R8 no reinvention) + reclaim-preview CLI; wire the reaper advisory (fail-soft) to report the ACTUALLY-reclaimable subset instead of the weaker pid count. +5 hermetic tests (read-only invariant + crashed-window-dead->reclaimable + fresh->neither + env-disable + empty). 60/61 chat-slots tests green (1 pre-existing transcriptAgeMs env-flake, untouched by this additive change).

**Commit:** `c7d44e0dd1e3` · **By:** markjvillanueva3-cloud · **At:** 2026-06-04T13:20:26-05:00
**Tags:** fleet-reaper, u-reclaim-preview, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-REAPER]/U-RECLAIM-PREVIEW (slot:golf): kill the stale-slot cry-wolf advisory. The reaper 'N slot(s) with dead PID -- run reclaim' keys on the recorded pid (dies across /compact while the chat+window live on) so it OVER-reports -- verified live: 11 dead-recorded-pid -> 0 actually reclaimable (foxtrot correctly kept via window_pid_alive). Add read-only previewReclaimable() to chat-slots.mjs (reuses the canonical classifySlot+shouldKeepSlotAlive, no mutation/no lock -- R8 no reinvention) + reclaim-preview CLI; wire the reaper advisory (fail-soft) to report the ACTUALLY-reclaimable subset instead of the weaker pid count. +5 hermetic tests (read-only invariant + crashed-window-dead->reclaimable + fresh->neither + env-disable + empty). 60/61 chat-slots tests green (1 pre-existing transcriptAgeMs env-flake, untouched by this additive change).

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-REAPER]/U-RECLAIM-PREVIEW (slot:golf): kill the stale-slot cry-wolf advisory. The reaper 'N slot(s) with dead PID -- run reclaim' keys on the recorded pid (dies across /compact while the chat+window live on) so it OVER-reports -- verified live: 11 dead-recorded-pid -> 0 actually reclaimable (foxtrot correctly kept via window_pid_alive). Add read-only previewReclaimable() to chat-slots.mjs (reuses the canonical classifySlot+shouldKeepSlotAlive, no mutation/no lock -- R8 no reinvention) + reclaim-preview CLI; wire the reaper advisory (fail-soft) to report the ACTUALLY-reclaimable subset instead of the weaker pid count. +5 hermetic tests (read-only invariant + crashed-window-dead->reclaimable + fresh->neither + env-disable + empty). 60/61 chat-slots tests green (1 pre-existing transcriptAgeMs env-flake, untouched by this additive change).
```

## Files touched (4)
- .claude/helpers/chat-slots-preview-reclaimable.test.mjs | 110 ++++++++++++++++++++++++++++++++++++++
- .claude/helpers/chat-slots.mjs                          |  41 +++++++++++++-
- scripts/fleet-reaper-sweep.mjs                          |  30 +++++++++--
- 3 files changed, 177 insertions(+), 4 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c7d44e0dd1e3`
- Milestone envelope: `mcp-server/data/milestones/FLEET-REAPER.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._