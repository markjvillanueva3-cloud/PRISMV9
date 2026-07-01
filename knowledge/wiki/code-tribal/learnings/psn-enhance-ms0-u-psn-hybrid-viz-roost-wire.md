# PSN-ENHANCE-MS0/U-PSN-HYBRID-VIZ-ROOST-WIRE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PSN-ENHANCE-MS0]/U-PSN-HYBRID-VIZ-ROOST-WIRE (slot:sierra iter22 2026-05-25): wire iter-21 hybrid-retrieval augmentation into regen-viz pipeline. Splices: regen-viz FAST[] adds generate-hybrid-retrieval-features.mjs after episode-store entry (line 115); merge-augmentations.mjs adds loader (line 107), versions entry (line 199), and 30-line merger block deduped by id+edgeKey patterned on iter-12 episodeStore merger. Both files node --check valid. ghost.hybrid_retrieval roost will materialize on next successful regen-viz pass (currently gated by V8 max-string-length OOM, pre-existing). Closes iter-21 R12 follow-up (peer file-claim cleared).

**Commit:** `d207f39235a6` · **By:** markjvillanueva3-cloud · **At:** 2026-05-24T23:23:37-05:00
**Tags:** psn-enhance-ms0, u-psn-hybrid-viz-roost-wire, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PSN-ENHANCE-MS0]/U-PSN-HYBRID-VIZ-ROOST-WIRE (slot:sierra iter22 2026-05-25): wire iter-21 hybrid-retrieval augmentation into regen-viz pipeline. Splices: regen-viz FAST[] adds generate-hybrid-retrieval-features.mjs after episode-store entry (line 115); merge-augmentations.mjs adds loader (line 107), versions entry (line 199), and 30-line merger block deduped by id+edgeKey patterned on iter-12 episodeStore merger. Both files node --check valid. ghost.hybrid_retrieval roost will materialize on next successful regen-viz pass (currently gated by V8 max-string-length OOM, pre-existing). Closes iter-21 R12 follow-up (peer file-claim cleared).

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PSN-ENHANCE-MS0]/U-PSN-HYBRID-VIZ-ROOST-WIRE (slot:sierra iter22 2026-05-25): wire iter-21 hybrid-retrieval augmentation into regen-viz pipeline. Splices: regen-viz FAST[] adds generate-hybrid-retrieval-features.mjs after episode-store entry (line 115); merge-augmentations.mjs adds loader (line 107), versions entry (line 199), and 30-line merger block deduped by id+edgeKey patterned on iter-12 episodeStore merger. Both files node --check valid. ghost.hybrid_retrieval roost will materialize on next successful regen-viz pass (currently gated by V8 max-string-length OOM, pre-existing). Closes iter-21 R12 follow-up (peer file-claim cleared).
```

## Files touched (3)
- scripts/merge-augmentations.mjs | 32 ++++++++++++++++++++++++++++++++
- scripts/regen-viz.mjs           |  1 +
- 2 files changed, 33 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d207f39235a6`
- Milestone envelope: `mcp-server/data/milestones/PSN-ENHANCE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._