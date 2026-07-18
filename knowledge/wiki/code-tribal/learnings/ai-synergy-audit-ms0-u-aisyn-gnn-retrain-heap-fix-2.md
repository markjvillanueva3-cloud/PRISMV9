# AI-SYNERGY-AUDIT-MS0/U-AISYN-GNN-RETRAIN-HEAP-FIX-2 — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [AI-SYNERGY-AUDIT-MS0]/U-AISYN-GNN-RETRAIN-HEAP-FIX-2 (slot:charlie): the validating retrain (HEAP-FIX-1) ran to completion but surfaced a SIBLING OOM -- step 2c's galaxy-node-features child (build-galaxy-node-embeddings.mjs, spawned line ~605) crashed exit 134 (SIGABRT + GC dump at ~380MB) because that spawn had NO --max-old-space-size either. It embeds 34 galaxies' doctrine + reads/rewrites the multi-hundred-row source; under concurrent fleet RAM pressure it hit the default heap ceiling. Fail-soft meant the retrain continued on the PRIOR run's galaxy features (so unit #6 substrate still exercised), but the fresh merge silently never ran. Fix: prepend --max-old-space-size (reuses PRISM_NN_RETRAIN_LIFECYCLE_HEAP_MB / LIFECYCLE_DEFAULTS.heapMb=8192) to the 2c spawn. VALIDATED: 'node --max-old-space-size=8192 build-galaxy-node-embeddings.mjs --dry' now exits 0, embeds all 34 galaxies (4 docs each), merges 34 ghost.galaxy.<g> rows (was OOM). Completes HEAP-FIX-1 (R15 build-it-whole: every heavy spawn in the lifecycle now heap-bumped: trainer L288, lifecycle self-reexec, 2c child).

**Commit:** `15123dff67bf` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T20:55:12-05:00
**Tags:** ai-synergy-audit-ms0, u-aisyn-gnn-retrain-heap-fix-2, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [AI-SYNERGY-AUDIT-MS0]/U-AISYN-GNN-RETRAIN-HEAP-FIX-2 (slot:charlie): the validating retrain (HEAP-FIX-1) ran to completion but surfaced a SIBLING OOM -- step 2c's galaxy-node-features child (build-galaxy-node-embeddings.mjs, spawned line ~605) crashed exit 134 (SIGABRT + GC dump at ~380MB) because that spawn had NO --max-old-space-size either. It embeds 34 galaxies' doctrine + reads/rewrites the multi-hundred-row source; under concurrent fleet RAM pressure it hit the default heap ceiling. Fail-soft meant the retrain continued on the PRIOR run's galaxy features (so unit #6 substrate still exercised), but the fresh merge silently never ran. Fix: prepend --max-old-space-size (reuses PRISM_NN_RETRAIN_LIFECYCLE_HEAP_MB / LIFECYCLE_DEFAULTS.heapMb=8192) to the 2c spawn. VALIDATED: 'node --max-old-space-size=8192 build-galaxy-node-embeddings.mjs --dry' now exits 0, embeds all 34 galaxies (4 docs each), merges 34 ghost.galaxy.<g> rows (was OOM). Completes HEAP-FIX-1 (R15 build-it-whole: every heavy spawn in the lifecycle now heap-bumped: trainer L288, lifecycle self-reexec, 2c child).

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [AI-SYNERGY-AUDIT-MS0]/U-AISYN-GNN-RETRAIN-HEAP-FIX-2 (slot:charlie): the validating retrain (HEAP-FIX-1) ran to completion but surfaced a SIBLING OOM -- step 2c's galaxy-node-features child (build-galaxy-node-embeddings.mjs, spawned line ~605) crashed exit 134 (SIGABRT + GC dump at ~380MB) because that spawn had NO --max-old-space-size either. It embeds 34 galaxies' doctrine + reads/rewrites the multi-hundred-row source; under concurrent fleet RAM pressure it hit the default heap ceiling. Fail-soft meant the retrain continued on the PRIOR run's galaxy features (so unit #6 substrate still exercised), but the fresh merge silently never ran. Fix: prepend --max-old-space-size (reuses PRISM_NN_RETRAIN_LIFECYCLE_HEAP_MB / LIFECYCLE_DEFAULTS.heapMb=8192) to the 2c spawn. VALIDATED: 'node --max-old-space-size=8192 build-galaxy-node-embeddings.mjs --dry' now exits 0, embeds all 34 galaxies (4 docs each), merges 34 ghost.galaxy.<g> rows (was OOM). Completes HEAP-FIX-1 (R15 build-it-whole: every heavy spawn in the lifecycle now heap-bumped: trainer L288, lifecycle self-reexec, 2c child).
```

## Files touched (2)
- scripts/nn-graph-retrain-lifecycle.mjs | 6 +++++-
- 1 file changed, 5 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- till exercised), but the fresh merge silently never ran. Fix: prepend --max-old-space-size (reuses PRISM_NN_RETRAIN_LIFECYCLE_HEAP_MB / LIFECYCLE_DEFAULTS.heapMb=8192) to the 2c spawn. VALIDATED: 'node --max-old-space-size=8192 build-galaxy-node-embeddings.mjs --dry' now exits 0, embeds all 34 galaxies (4 docs each), merges 34 ghost.galaxy.<g> rows (was OOM). Completes HEAP-FIX-1 (R15 build-it-whole:

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 15123dff67bf`
- Milestone envelope: `mcp-server/data/milestones/AI-SYNERGY-AUDIT-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._