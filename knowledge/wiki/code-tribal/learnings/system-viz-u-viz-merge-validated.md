# SYSTEM-VIZ/U-VIZ-MERGE-VALIDATED — [MAIN] [SYSTEM-VIZ]/U-VIZ-MERGE-VALIDATED (slot:sierra): doc-reflect golf's merge bug RESOLVED + LIVE-VALIDATED. Full regen-viz run (430.3s, driftFail=false) folded 557.9MB augmentations into a 660MB graph (>golf's 630MB failure point, >512MiB V8 cap) and SUCCEEDED (obsidian:yes, build-graph-index 335,482 nodes, sidecar rebuilt fresh). golf's 630MB exit-1 does NOT reproduce -- it was the truncation cascade closed by writeGraphStreamingAtomic (153887a519); loadOptional now cap-safe (628aaa51f5). system-viz green end-to-end at >512MiB.

**Commit:** `7a1f52061b0b` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T02:47:07-05:00
**Tags:** system-viz, u-viz-merge-validated, auto-distilled

## Subject
[MAIN] [SYSTEM-VIZ]/U-VIZ-MERGE-VALIDATED (slot:sierra): doc-reflect golf's merge bug RESOLVED + LIVE-VALIDATED. Full regen-viz run (430.3s, driftFail=false) folded 557.9MB augmentations into a 660MB graph (>golf's 630MB failure point, >512MiB V8 cap) and SUCCEEDED (obsidian:yes, build-graph-index 335,482 nodes, sidecar rebuilt fresh). golf's 630MB exit-1 does NOT reproduce -- it was the truncation cascade closed by writeGraphStreamingAtomic (153887a519); loadOptional now cap-safe (628aaa51f5). system-viz green end-to-end at >512MiB.

## Body
```
[MAIN] [SYSTEM-VIZ]/U-VIZ-MERGE-VALIDATED (slot:sierra): doc-reflect golf's merge bug RESOLVED + LIVE-VALIDATED. Full regen-viz run (430.3s, driftFail=false) folded 557.9MB augmentations into a 660MB graph (>golf's 630MB failure point, >512MiB V8 cap) and SUCCEEDED (obsidian:yes, build-graph-index 335,482 nodes, sidecar rebuilt fresh). golf's 630MB exit-1 does NOT reproduce -- it was the truncation cascade closed by writeGraphStreamingAtomic (153887a519); loadOptional now cap-safe (628aaa51f5). system-viz green end-to-end at >512MiB.
```

## Files touched (2)
- scripts/system-viz-on-commit.mjs | 22 ++++++++++++----------
- 1 file changed, 12 insertions(+), 10 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 7a1f52061b0b`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-VIZ.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._