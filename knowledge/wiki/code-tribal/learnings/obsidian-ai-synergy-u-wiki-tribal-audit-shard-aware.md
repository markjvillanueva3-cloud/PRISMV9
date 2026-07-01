# OBSIDIAN-AI-SYNERGY/U-WIKI-TRIBAL-AUDIT-SHARD-AWARE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-AI-SYNERGY]/U-WIKI-TRIBAL-AUDIT-SHARD-AWARE (slot:india): cross-ref audit reads canonical shards not the orphan monolith

**Commit:** `35acfb15b428` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T13:42:32-05:00
**Tags:** obsidian-ai-synergy, u-wiki-tribal-audit-shard-aware, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-AI-SYNERGY]/U-WIKI-TRIBAL-AUDIT-SHARD-AWARE (slot:india): cross-ref audit reads canonical shards not the orphan monolith

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-AI-SYNERGY]/U-WIKI-TRIBAL-AUDIT-SHARD-AWARE (slot:india): cross-ref audit reads canonical shards not the orphan monolith

The monolith-only reader the 2026-06-08 shard migration missed. readFileSync(TRIBAL_INDEX_PATH) read the stale orphan monolith (understating embedded set -> wrong coverage headline + overstated embed work-list) and now ENOENT-FATALs since the orphan was deleted. Switch to streamTribalEntries (manifest-first, O(1)-heap; projects only id/source/kind/path, never the 768-float embedding). LIVE re-run: coverage 69.2 -> 77.1 pct; tribal wiki entries 33499; missing 13228 -> 9965 (the ~3263 overcount = already-sharded files the monolith read could not see -> embed-driver skip-waste). 26/26 tests pass.
```

## Files touched (2)
- scripts/wiki-tribal-cross-ref-audit.mjs | 20 +++++++++++++++++---
- 1 file changed, 17 insertions(+), 3 deletions(-)

## Lessons surfaced in commit body
- wrong coverage headline + overstated embed work-list) and now ENOENT-FATALs since the orphan was deleted. Switch to streamTribalEntries (manifest-first, O(1)-heap; projects only id/source/kind/path, never the 768-float embedding). LIVE re-run: coverage 69.2 -> 77.1 pct; tribal wiki entries 33499; missing 13228 -> 9965 (the ~3263 overcount = already-sharded files the monolith read could not see -> embed

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 35acfb15b428`
- Milestone envelope: `mcp-server/data/milestones/OBSIDIAN-AI-SYNERGY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._