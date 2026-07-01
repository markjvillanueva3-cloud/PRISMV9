# SYSTEM-BUG-FIX-MS0/U-SBF-4-FINDCACHE-VISIBLE — [SYSTEM-BUG-FIX-MS0]/U-SBF-4-FINDCACHE-VISIBLE (slot:sierra): regen-viz verifies the find-cache ARTIFACT is fresh (mtime>=graph) not just the spawn exit code, retries once on transient failure, surfaces persistent staleness as findCacheDegraded in the run summary -- closes the silent rot that left find-cache STALE while the graph went FRESH (audit P1-2 durable follow-up). syntax-clean + freshness predicate validated on live data. +audit doc Round 4

**Commit:** `01575121329c` · **By:** markjvillanueva3-cloud · **At:** 2026-06-15T01:20:38-05:00
**Tags:** system-bug-fix-ms0, u-sbf-4-findcache-visible, auto-distilled

## Subject
[SYSTEM-BUG-FIX-MS0]/U-SBF-4-FINDCACHE-VISIBLE (slot:sierra): regen-viz verifies the find-cache ARTIFACT is fresh (mtime>=graph) not just the spawn exit code, retries once on transient failure, surfaces persistent staleness as findCacheDegraded in the run summary -- closes the silent rot that left find-cache STALE while the graph went FRESH (audit P1-2 durable follow-up). syntax-clean + freshness predicate validated on live data. +audit doc Round 4

## Body
```
[SYSTEM-BUG-FIX-MS0]/U-SBF-4-FINDCACHE-VISIBLE (slot:sierra): regen-viz verifies the find-cache ARTIFACT is fresh (mtime>=graph) not just the spawn exit code, retries once on transient failure, surfaces persistent staleness as findCacheDegraded in the run summary -- closes the silent rot that left find-cache STALE while the graph went FRESH (audit P1-2 durable follow-up). syntax-clean + freshness predicate validated on live data. +audit doc Round 4
```

## Files touched (3)
- scripts/regen-viz.mjs                             |  34 ++++++++++++++++++++++++++++------
- state/shared/specs/SYSTEM-BUG-AUDIT-2026-06-14.md | 122 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 150 insertions(+), 6 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 01575121329c`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-BUG-FIX-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._