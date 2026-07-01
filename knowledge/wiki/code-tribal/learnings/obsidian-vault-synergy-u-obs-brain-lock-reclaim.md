# OBSIDIAN-VAULT-SYNERGY/U-OBS-BRAIN-LOCK-RECLAIM — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-SYNERGY]/U-OBS-BRAIN-LOCK-RECLAIM (slot:alpha): corrupt brain-refresh lock froze the dense recall arm 27h (R3-C1, ultracode round-2 wp9xijq9b top finding). acquireLockAt's catch{return false} on an unparseable lock ('conservative, never run blind') meant a 32-NUL-byte .brain-refresh.lock dead-locked ALL 5 refresh pipelines (BM25/dense/AMP2/wiki-tribal/viz) fleet-wide — dense sidecar frozen at 11402/builtAt-Jun8 while BM25 advanced to today (1946-memo lag, growing per-session). A corrupt lock is BY DEFINITION not a live holder -> now routed into the SAME race-safe rename-aside reclaim path as stale/dead-PID holders, fail-LOUD to stderr. Removed the live 32-NUL lock for immediate unblock (next Stop-hook brain-refresh re-embeds). Rewrote the test that ENCODED the bug (garbage-lock->false) to the corrected intent + the 32-NUL live-incident case + a no-over-reach regression (live lock still blocks). 58/58. Single-writer invariant preserved (parseable+alive+recent still defers; reclaim still rename-aside race-guarded).

**Commit:** `afc65402424e` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T10:08:46-05:00
**Tags:** obsidian-vault-synergy, u-obs-brain-lock-reclaim, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-SYNERGY]/U-OBS-BRAIN-LOCK-RECLAIM (slot:alpha): corrupt brain-refresh lock froze the dense recall arm 27h (R3-C1, ultracode round-2 wp9xijq9b top finding). acquireLockAt's catch{return false} on an unparseable lock ('conservative, never run blind') meant a 32-NUL-byte .brain-refresh.lock dead-locked ALL 5 refresh pipelines (BM25/dense/AMP2/wiki-tribal/viz) fleet-wide — dense sidecar frozen at 11402/builtAt-Jun8 while BM25 advanced to today (1946-memo lag, growing per-session). A corrupt lock is BY DEFINITION not a live holder -> now routed into the SAME race-safe rename-aside reclaim path as stale/dead-PID holders, fail-LOUD to stderr. Removed the live 32-NUL lock for immediate unblock (next Stop-hook brain-refresh re-embeds). Rewrote the test that ENCODED the bug (garbage-lock->false) to the corrected intent + the 32-NUL live-incident case + a no-over-reach regression (live lock still blocks). 58/58. Single-writer invariant preserved (parseable+alive+recent still defers; reclaim still rename-aside race-guarded).

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-SYNERGY]/U-OBS-BRAIN-LOCK-RECLAIM (slot:alpha): corrupt brain-refresh lock froze the dense recall arm 27h (R3-C1, ultracode round-2 wp9xijq9b top finding). acquireLockAt's catch{return false} on an unparseable lock ('conservative, never run blind') meant a 32-NUL-byte .brain-refresh.lock dead-locked ALL 5 refresh pipelines (BM25/dense/AMP2/wiki-tribal/viz) fleet-wide — dense sidecar frozen at 11402/builtAt-Jun8 while BM25 advanced to today (1946-memo lag, growing per-session). A corrupt lock is BY DEFINITION not a live holder -> now routed into the SAME race-safe rename-aside reclaim path as stale/dead-PID holders, fail-LOUD to stderr. Removed the live 32-NUL lock for immediate unblock (next Stop-hook brain-refresh re-embeds). Rewrote the test that ENCODED the bug (garbage-lock->false) to the corrected intent + the 32-NUL live-incident case + a no-over-reach regression (live lock still blocks). 58/58. Single-writer invariant preserved (parseable+alive+recent still defers; reclaim still rename-aside race-guarded).
```

## Files touched (3)
- scripts/brain-refresh.mjs      | 13 +++++++++++--
- scripts/brain-refresh.test.mjs | 27 +++++++++++++++++++++++++--
- 2 files changed, 36 insertions(+), 4 deletions(-)

## Lessons surfaced in commit body
- till blocks). 58/58. Single-writer invariant preserved (parseable+alive+recent still defers; reclaim still rename-aside race-guarded).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show afc65402424e`
- Milestone envelope: `mcp-server/data/milestones/OBSIDIAN-VAULT-SYNERGY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._