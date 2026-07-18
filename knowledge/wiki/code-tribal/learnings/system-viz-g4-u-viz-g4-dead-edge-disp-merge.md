# SYSTEM-VIZ-G4/U-VIZ-G4-DEAD-EDGE-DISP-MERGE — [MAIN] [SYSTEM-VIZ-G4]/U-VIZ-G4-DEAD-EDGE-DISP-MERGE: unify merge canon to also fix accumulated dispatcher.* dead edges (~2.7K dead->live)

**Commit:** `7b755d52c31b` · **By:** markjvillanueva3-cloud · **At:** 2026-05-31T01:49:26-05:00
**Tags:** system-viz-g4, u-viz-g4-dead-edge-disp-merge, auto-distilled

## Subject
[MAIN] [SYSTEM-VIZ-G4]/U-VIZ-G4-DEAD-EDGE-DISP-MERGE: unify merge canon to also fix accumulated dispatcher.* dead edges (~2.7K dead->live)

## Body
```
[MAIN] [SYSTEM-VIZ-G4]/U-VIZ-G4-DEAD-EDGE-DISP-MERGE: unify merge canon to also fix accumulated dispatcher.* dead edges (~2.7K dead->live)

The merged graph is CUMULATIVE (merge reads persistent system-graph.json + adds, never removes stale-target edges), so the Half-A producer fix alone cannot clear the ~2676 dispatcher.prism_* edges accumulated from prior merges. canonicalizeGraphEdgeTargets now does engine.* (graph-alias) AND dispatcher.* (mcpToolToDispNodeId + node-existence gate) in one pass; stale dispatcher.* remaps onto the canonical disp.* and dedup-drops. +4 SSOT table keys (prism_data/validation/machinelive/multiop, nodes verified to exist) recover ~14 more edges. Strictly dead->live (node-existence gated); PRISM_VIZ_ENGINE_CANON_DISABLE=1 = no-op. 19 canon + 8 dispatcher + 36 from-unwired-parity tests; per-file 2-reviewer PASS/PASS. NOTE: engine.* class stays ~0 remap on current graph (the 20 dead engine targets have no eng.* node — bridge gap-surfacing, not a prefix bug; honest finding).
```

## Files touched (6)
- scripts/lib/viz-dispatcher-node-id.mjs        |  8 ++++++++
- scripts/lib/viz-dispatcher-node-id.test.mjs   |  4 ++++
- scripts/lib/viz-engine-node-id-canon.mjs      | 79 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/viz-engine-node-id-canon.test.mjs | 74 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++-
- scripts/merge-augmentations.mjs               | 31 ++++++++++++++++---------------
- 5 files changed, 180 insertions(+), 16 deletions(-)

## Lessons surfaced in commit body
- NOTE: engine.* class stays ~0 remap on current graph (the 20 dead engine targets have no eng.* node — bridge gap-surfacing, not a prefix bug; honest finding).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 7b755d52c31b`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-VIZ-G4.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._