# PSN-SYNERGY-COLLECT-MS2/U-OBSIDIAN-TRIBAL-EDGES — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PSN-SYNERGY-COLLECT-MS2]/U-OBSIDIAN-TRIBAL-EDGES (slot:alpha): obsidian_brain synergy blind-spot fix (3->10 peers, coverage 40->100%) + tribal mis-path/parse fix (0->33049 via bounded streaming count)

**Commit:** `511c6b2fa296` · **By:** markjvillanueva3-cloud · **At:** 2026-06-02T18:52:55-05:00
**Tags:** psn-synergy-collect-ms2, u-obsidian-tribal-edges, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PSN-SYNERGY-COLLECT-MS2]/U-OBSIDIAN-TRIBAL-EDGES (slot:alpha): obsidian_brain synergy blind-spot fix (3->10 peers, coverage 40->100%) + tribal mis-path/parse fix (0->33049 via bounded streaming count)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PSN-SYNERGY-COLLECT-MS2]/U-OBSIDIAN-TRIBAL-EDGES (slot:alpha): obsidian_brain synergy blind-spot fix (3->10 peers, coverage 40->100%) + tribal mis-path/parse fix (0->33049 via bounded streaming count)

The synergy collector that feeds PSNSynergyInspectorEngine under-measured the Obsidian
PSN node: it only counted obsidian -> {wiki,engines,memories}, so the inspector flagged
obsidian_brain as the most-isolated leg despite live bridges to tribal/system_viz/
prism_ai/nn_gnn/prism_os. Added scanObsidianOutEdges (single bounded pass) -> obsidian
now wired to all 10 peers (coverage 40->100%, refs_out 8191->26918); symmetric fix on
the memories leg.

Also fixed collectTribalLeg: read a nonexistent mcp-server/data/state path and
JSON.parse'd the 530MB state/shared/tribal-embed-index.json counting Object.keys(~5).
Now correct path + countNeedleStreaming (chunked, never slurps) + entries[] shape:
tribal 0->33049. Total PSN nodes 40556->73605. Verified real-data E2E via
psnSynergyInspectorEngine.inspect. Honest caveat: residual P0 ROI bands are a
density-floor artifact (uniform across high-node-count legs), out of scope.
Docs: knowledge/wiki/lessons/psn-synergy-obsidian-tribal-blindspot.md + memory.
```

## Files touched (5)
- knowledge/wiki/lessons/psn-synergy-obsidian-tribal-blindspot.md |  55 +++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/psn-synergy-collect.mjs                                 | 114 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++-----------
- state/shared/psn-synergy-snapshot.json                          |  58 ++++++++++++++++++++++++++++++++++++----------------------
- state/shared/psn-synergy-snapshot.md                            |  20 ++++++++++----------
- 4 files changed, 204 insertions(+), 43 deletions(-)

## Lessons surfaced in commit body
- lessons/psn-synergy-obsidian-tribal-blindspot.md + memory.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 511c6b2fa296`
- Milestone envelope: `mcp-server/data/milestones/PSN-SYNERGY-COLLECT-MS2.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._