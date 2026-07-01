# OBSIDIAN-VAULT-SYNERGY/U-OBS-MEMDIR-FEED-UNIFY — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-SYNERGY]/U-OBS-MEMDIR-FEED-UNIFY (slot:alpha): route the C:->H: Obsidian feed through resolveObsidianMemDir() + capture pre-existing uncommitted resilience block

**Commit:** `e1b95b05a8a7` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T04:35:29-05:00
**Tags:** obsidian-vault-synergy, u-obs-memdir-feed-unify, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-SYNERGY]/U-OBS-MEMDIR-FEED-UNIFY (slot:alpha): route the C:->H: Obsidian feed through resolveObsidianMemDir() + capture pre-existing uncommitted resilience block

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-SYNERGY]/U-OBS-MEMDIR-FEED-UNIFY (slot:alpha): route the C:->H: Obsidian feed through resolveObsidianMemDir() + capture pre-existing uncommitted resilience block

PRIMARY (this unit): obsidian-memory-sync.mjs hardcoded MEMORY_SOURCE='C:/Users/
wompu/...' with NO env override, while the rest of the recall pipeline honors
PRISM_MEMORY_DIR. A set PRISM_MEMORY_DIR would have re-created the split-brain
U-OBS-MEMDIR-HOMEDIR just fixed. Now single-sourced via resolveObsidianMemDir()
(honors PRISM_OBSIDIAN_MEM_DIR>PRISM_MEMORY_DIR, homedir default). Default
byte-identical on this box (proven normalized-equal to the old literal). Closes
the U-OBS-MEMDIR-HOMEDIR reviewer-C P1.

ALSO CAPTURED (honest attribution, R12): this commit additionally lands a
pre-existing UNCOMMITTED block that was sitting in this shared working tree —
syncSleep/TRANSIENT_WRITE_CODES/writeWithRetry, i.e. sierra's already-doctrine
U-VAULT-SYNC-RESILIENT per-file-retry fix (ref 168c20264). It was uncommitted
+ at risk; committing it is net-positive. Credit: slot:sierra. Verified coherent
+ tested: 21/21 (galaxy-mirror + resilience) pass post-change.

Remaining (P2, separate batch): ~25 other scripts hardcode the wompu path —
portability hardening via the same resolver.
```

## Files touched (2)
- scripts/obsidian-memory-sync.mjs | 80 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++-----
- 1 file changed, 75 insertions(+), 5 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e1b95b05a8a7`
- Milestone envelope: `mcp-server/data/milestones/OBSIDIAN-VAULT-SYNERGY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._