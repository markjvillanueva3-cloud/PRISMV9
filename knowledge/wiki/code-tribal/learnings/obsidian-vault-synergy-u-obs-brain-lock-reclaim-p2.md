# OBSIDIAN-VAULT-SYNERGY/U-OBS-BRAIN-LOCK-RECLAIM-P2 — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-SYNERGY]/U-OBS-BRAIN-LOCK-RECLAIM-P2 (slot:alpha): close the scrutiny B+C torn-write P2. The corrupt-reclaim could, in the microsecond window between a peer's openSync('wx') (empty entry) and its writeSync(JSON), read 0 bytes -> treat the peer's just-created lock as corrupt -> reclaim it -> break single-writer. Fix: distinguish EMPTY (0-byte = live peer mid-creation -> DEFER, the old-safe behavior) from non-empty-unparseable (genuine corruption like the 32-NUL incident -> reclaim). A single small writeSync makes a partial non-empty body unreachable, so empty-vs-non-empty is the exact safe boundary; the 32-NUL live-incident fix is preserved (non-empty). +1 test (empty->defer, untouched), 59/59. Single-writer invariant now holds even against the open->write race.

**Commit:** `c68794664461` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T10:15:57-05:00
**Tags:** obsidian-vault-synergy, u-obs-brain-lock-reclaim-p2, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-SYNERGY]/U-OBS-BRAIN-LOCK-RECLAIM-P2 (slot:alpha): close the scrutiny B+C torn-write P2. The corrupt-reclaim could, in the microsecond window between a peer's openSync('wx') (empty entry) and its writeSync(JSON), read 0 bytes -> treat the peer's just-created lock as corrupt -> reclaim it -> break single-writer. Fix: distinguish EMPTY (0-byte = live peer mid-creation -> DEFER, the old-safe behavior) from non-empty-unparseable (genuine corruption like the 32-NUL incident -> reclaim). A single small writeSync makes a partial non-empty body unreachable, so empty-vs-non-empty is the exact safe boundary; the 32-NUL live-incident fix is preserved (non-empty). +1 test (empty->defer, untouched), 59/59. Single-writer invariant now holds even against the open->write race.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-SYNERGY]/U-OBS-BRAIN-LOCK-RECLAIM-P2 (slot:alpha): close the scrutiny B+C torn-write P2. The corrupt-reclaim could, in the microsecond window between a peer's openSync('wx') (empty entry) and its writeSync(JSON), read 0 bytes -> treat the peer's just-created lock as corrupt -> reclaim it -> break single-writer. Fix: distinguish EMPTY (0-byte = live peer mid-creation -> DEFER, the old-safe behavior) from non-empty-unparseable (genuine corruption like the 32-NUL incident -> reclaim). A single small writeSync makes a partial non-empty body unreachable, so empty-vs-non-empty is the exact safe boundary; the 32-NUL live-incident fix is preserved (non-empty). +1 test (empty->defer, untouched), 59/59. Single-writer invariant now holds even against the open->write race.
```

## Files touched (3)
- scripts/brain-refresh.mjs      | 21 ++++++++++++++++-----
- scripts/brain-refresh.test.mjs |  9 +++++++++
- 2 files changed, 25 insertions(+), 5 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c68794664461`
- Milestone envelope: `mcp-server/data/milestones/OBSIDIAN-VAULT-SYNERGY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._