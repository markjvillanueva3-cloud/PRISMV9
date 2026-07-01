# SYSTEM-VIZ-OBSIDIAN/U-VIZ-BRAIN-COVERAGE — [MAIN] [SYSTEM-VIZ-OBSIDIAN]/U-VIZ-BRAIN-COVERAGE: 3D viewer brain-coverage stat + filter

**Commit:** `4e90c011c746` · **By:** markjvillanueva3-cloud · **At:** 2026-06-01T09:24:13-05:00
**Tags:** system-viz-obsidian, u-viz-brain-coverage, auto-distilled

## Subject
[MAIN] [SYSTEM-VIZ-OBSIDIAN]/U-VIZ-BRAIN-COVERAGE: 3D viewer brain-coverage stat + filter

## Body
```
[MAIN] [SYSTEM-VIZ-OBSIDIAN]/U-VIZ-BRAIN-COVERAGE: 3D viewer brain-coverage stat + filter

Turns the deep-link data into a system-wide brain-coverage map. updateStats adds
'🧠 N% brain (count)' (sampled nodes with >=1 Obsidian note, via node.noteCount).
applySearch adds reserved filter words: 'brain'/'notes'/'covered' highlights
documented nodes; 'gap'/'no:notes'/'uncovered' highlights knowledge-gap nodes
(no brain coverage) - so the operator can SEE which regions of the system lack
wiki/memory docs. Search placeholder updated. Viewer-only, leverages noteCount
already in /api/graph-snapshot (no regen, no new server field). node --check clean.
Sierra.
```

## Files touched (2)
- state/shared/system-viz/viz3d.html | 16 ++++++++++++++--
- 1 file changed, 14 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4e90c011c746`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-VIZ-OBSIDIAN.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._