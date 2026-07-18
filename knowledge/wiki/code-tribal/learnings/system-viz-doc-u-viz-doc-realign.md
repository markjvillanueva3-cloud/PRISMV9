# SYSTEM-VIZ-DOC/U-VIZ-DOC-REALIGN — [MAIN] [SYSTEM-VIZ-DOC]/U-VIZ-DOC-REALIGN: realign tracked viz directive + wiki to live server/viewer reality

**Commit:** `730a11e46ccf` · **By:** markjvillanueva3-cloud · **At:** 2026-05-31T21:26:59-05:00
**Tags:** system-viz-doc, u-viz-doc-realign, auto-distilled

## Subject
[MAIN] [SYSTEM-VIZ-DOC]/U-VIZ-DOC-REALIGN: realign tracked viz directive + wiki to live server/viewer reality

## Body
```
[MAIN] [SYSTEM-VIZ-DOC]/U-VIZ-DOC-REALIGN: realign tracked viz directive + wiki to live server/viewer reality

Companion to the (gitignored, local-only) /system-viz skill-doc realign. Both
surfaces taught the same dangerous staleness now that system-graph.json is ~570MB
(>V8 ~512MB string cap): cat/JSON.parse(readFileSync utf8) of the graph silently
fails (the bug that left the Obsidian augmentation 8 days stale) -> readGraphStreaming;
system-viz.html (gone) -> dashboard.html + viz3d.html; generator split regen-viz /
generate-system-viz(arch-only) / merge-augmentations(single writer); endpoints
realigned to _server.cjs route table; 'opens in VS Code' -> click=side-panel
showNode; 174KB/334-node -> ~570MB/~300k; fictional overlay keys 2/4 removed.
Directive newly tracked (was untracked, not ignored). Ground-truthed vs _server.cjs
+ viz3d.html + dashboard.html. Sierra.
```

## Files touched (3)
- knowledge/wiki/architecture/system-viz.md  |  13 ++++++++-----
- state/shared/PRISM-SYSTEM-VIZ-DIRECTIVE.md | 145 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 153 insertions(+), 5 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 730a11e46ccf`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-VIZ-DOC.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._