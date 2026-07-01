# OBSIDIAN-BRAIN/U-TRIBAL-INDEX-LOCK — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-BRAIN]/U-TRIBAL-INDEX-LOCK: atomic exclusive-file-lock primitive + tribal-index-lock adapter (rank 12 foundation); scrutiny caught+fixed stale-steal rename race; 20 tests

**Commit:** `27d8ee723500` · **By:** markjvillanueva3-cloud · **At:** 2026-05-30T22:05:39-05:00
**Tags:** obsidian-brain, u-tribal-index-lock, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-BRAIN]/U-TRIBAL-INDEX-LOCK: atomic exclusive-file-lock primitive + tribal-index-lock adapter (rank 12 foundation); scrutiny caught+fixed stale-steal rename race; 20 tests

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-BRAIN]/U-TRIBAL-INDEX-LOCK: atomic exclusive-file-lock primitive + tribal-index-lock adapter (rank 12 foundation); scrutiny caught+fixed stale-steal rename race; 20 tests
```

## Files touched (7)
- knowledge/wiki/architecture/exclusive-file-lock.md             |  74 +++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/exclusive-file-lock.mjs                            | 140 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/exclusive-file-lock.test.mjs                       | 200 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/tribal-index-lock.mjs                              |  86 ++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/tribal-index-lock.test.mjs                         | 115 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- state/shared/specs/TRIBAL-INDEX-WRITER-LOCK-PLAN-2026-05-30.md |  35 ++++++++++++++++++++-
- 6 files changed, 649 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 27d8ee723500`
- Milestone envelope: `mcp-server/data/milestones/OBSIDIAN-BRAIN.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._